'use strict';

/**
 * Proveedor primario: Yahoo Finance.
 *
 * Yahoo no publica una API oficial. El acceso exige una sesion valida:
 *   1. Cookies de consentimiento (obligatorio para IPs de la UE, via guce/consent).
 *   2. Un "crumb" ligado a esas cookies que acompaña a cada peticion.
 *
 * Este modulo reproduce ese flujo completo, cachea la sesion y la renueva sola
 * cuando caduca. Si Yahoo responde 429 (limitacion por IP, frecuente en rangos
 * residenciales y de centros de datos) la peticion se marca como fallida y la
 * capa superior degrada al siguiente proveedor sin interrumpir el servicio.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TIMEOUT_MS = 8000;
const SESSION_TTL_MS = 30 * 60 * 1000;

let session = null; // { cookie, crumb, obtenidaEn }
let sessionPromise = null;

class ProveedorError extends Error {
  constructor(mensaje, { status = null, proveedor = 'yahoo' } = {}) {
    super(mensaje);
    this.name = 'ProveedorError';
    this.status = status;
    this.proveedor = proveedor;
  }
}

function nuevoTarro() {
  const jar = new Map();
  return {
    guardar(res) {
      const crudas = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
      for (const c of crudas) {
        const [par] = c.split(';');
        const i = par.indexOf('=');
        if (i > 0) jar.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
      }
    },
    cabecera() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    get tamano() {
      return jar.size;
    },
  };
}

async function pedir(url, { jar, metodo = 'GET', cuerpo = null, cabeceras = {} } = {}) {
  const res = await fetch(url, {
    method: metodo,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(jar && jar.tamano ? { Cookie: jar.cabecera() } : {}),
      ...cabeceras,
    },
    ...(cuerpo ? { body: cuerpo } : {}),
  });
  if (jar) jar.guardar(res);
  return res;
}

async function seguirRedirecciones(url, jar, max = 8) {
  let actual = url;
  for (let i = 0; i < max; i++) {
    const res = await pedir(actual, { jar });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      actual = new URL(loc, actual).href;
      continue;
    }
    return res;
  }
  throw new ProveedorError('Cadena de redirecciones demasiado larga');
}

/** Acepta el consentimiento de Yahoo (necesario desde la UE) y devuelve las cookies. */
async function establecerSesion() {
  const jar = nuevoTarro();

  // Ruta directa: suficiente fuera del ambito RGPD.
  await pedir('https://fc.yahoo.com', { jar }).catch(() => {});

  let crumb = await pedirCrumb(jar);
  if (crumb) return { cookie: jar.cabecera(), crumb, obtenidaEn: Date.now() };

  // Ruta RGPD: aceptar el formulario de consentimiento para liberar A1/A3.
  const res = await seguirRedirecciones('https://finance.yahoo.com/quote/AAPL/', jar);
  const html = await res.text();
  const csrf = html.match(/name="csrfToken"\s+value="([^"]+)"/)?.[1];
  const sid = html.match(/name="sessionId"\s+value="([^"]+)"/)?.[1];

  if (csrf && sid) {
    const cuerpo = new URLSearchParams();
    cuerpo.append('csrfToken', csrf);
    cuerpo.append('sessionId', sid);
    cuerpo.append('originalDoneUrl', 'https://finance.yahoo.com/');
    cuerpo.append('namespace', 'yahoo');
    cuerpo.append('agree', 'agree');
    await pedir(`https://consent.yahoo.com/v2/collectConsent?sessionId=${encodeURIComponent(sid)}`, {
      jar,
      metodo: 'POST',
      cuerpo: cuerpo.toString(),
      cabeceras: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    await seguirRedirecciones(
      `https://guce.yahoo.com/copyConsent?sessionId=${encodeURIComponent(sid)}`,
      jar
    ).catch(() => {});
    crumb = await pedirCrumb(jar);
  }

  if (!crumb) throw new ProveedorError('No ha sido posible obtener un crumb valido', { status: 429 });
  return { cookie: jar.cabecera(), crumb, obtenidaEn: Date.now() };
}

async function pedirCrumb(jar) {
  const res = await pedir('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    jar,
    cabeceras: { Accept: '*/*', Referer: 'https://finance.yahoo.com/' },
  });
  const texto = (await res.text()).trim();
  // Yahoo devuelve el mensaje de error en el cuerpo con status 200 en algunos casos;
  // un crumb legitimo es corto y nunca contiene espacios.
  if (!res.ok || !texto || texto.includes(' ') || texto.length > 32) return null;
  return texto;
}

async function obtenerSesion(forzar = false) {
  if (!forzar && session && Date.now() - session.obtenidaEn < SESSION_TTL_MS) return session;
  if (sessionPromise) return sessionPromise;
  sessionPromise = establecerSesion()
    .then((s) => {
      session = s;
      return s;
    })
    .finally(() => {
      sessionPromise = null;
    });
  return sessionPromise;
}

/** Llama a un endpoint de datos reintentando una vez con la sesion renovada. */
async function llamarApi(ruta, params) {
  for (const intento of [0, 1]) {
    const s = await obtenerSesion(intento === 1);
    const url = new URL(`https://query2.finance.yahoo.com${ruta}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('crumb', s.crumb);

    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        Cookie: s.cookie,
        Referer: 'https://finance.yahoo.com/',
      },
    });

    if (res.status === 401 && intento === 0) continue; // crumb caducado
    if (!res.ok) throw new ProveedorError(`Yahoo respondio ${res.status}`, { status: res.status });
    return res.json();
  }
  throw new ProveedorError('Yahoo rechazo la peticion tras renovar la sesion', { status: 401 });
}

async function obtenerCotizacion(simbolo) {
  const datos = await llamarApi(`/v8/finance/chart/${encodeURIComponent(simbolo)}`, {
    range: '5d',
    interval: '1d',
  });
  const r = datos?.chart?.result?.[0];
  if (!r?.meta) throw new ProveedorError(`Sin datos para ${simbolo}`);
  const m = r.meta;
  const precio = m.regularMarketPrice;
  const cierreAnterior = m.chartPreviousClose ?? m.previousClose;
  if (typeof precio !== 'number') throw new ProveedorError(`Cotizacion no numerica para ${simbolo}`);

  return {
    simbolo: m.symbol || simbolo,
    nombre: m.longName || m.shortName || simbolo,
    precio,
    cierreAnterior: typeof cierreAnterior === 'number' ? cierreAnterior : null,
    variacion: typeof cierreAnterior === 'number' ? precio - cierreAnterior : null,
    variacionPct:
      typeof cierreAnterior === 'number' && cierreAnterior !== 0
        ? ((precio - cierreAnterior) / cierreAnterior) * 100
        : null,
    divisa: m.currency || 'USD',
    mercado: m.fullExchangeName || m.exchangeName || null,
    estadoMercado: m.marketState || null,
    momento: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    /* Que `momento` sea la hora a la que el MERCADO imprimio este precio, y no la
       hora a la que nosotros lo preguntamos. La diferencia no es cosmetica: con el
       mercado cerrado, la de mercado se queda quieta y la de consulta avanza en
       cada peticion. Quien enseñe frescura al lector necesita saber cual de las
       dos tiene delante, porque «hace 8 s» sobre una hora de consulta es falso.
       Aqui es de mercado siempre que el proveedor publique `regularMarketTime`. */
    momentoDeMercado: Boolean(m.regularMarketTime),
    fuente: 'Yahoo Finance',
  };
}

async function obtenerHistorico(simbolo, desdeISO) {
  const desde = Math.floor(new Date(desdeISO).getTime() / 1000);
  const hasta = Math.floor(Date.now() / 1000) + 86400;
  const datos = await llamarApi(`/v8/finance/chart/${encodeURIComponent(simbolo)}`, {
    period1: desde,
    period2: hasta,
    interval: '1d',
    events: 'div,split',
  });

  const r = datos?.chart?.result?.[0];
  const marcas = r?.timestamp;
  const cotiz = r?.indicators?.quote?.[0];
  const ajustado = r?.indicators?.adjclose?.[0]?.adjclose;
  if (!Array.isArray(marcas) || !cotiz) throw new ProveedorError(`Sin historico para ${simbolo}`);

  const filas = [];
  for (let i = 0; i < marcas.length; i++) {
    const cierre = ajustado?.[i] ?? cotiz.close?.[i];
    if (typeof cierre !== 'number' || !Number.isFinite(cierre)) continue; // sesiones sin cruce
    filas.push({
      fecha: new Date(marcas[i] * 1000).toISOString().slice(0, 10),
      apertura: cotiz.open?.[i] ?? cierre,
      maximo: cotiz.high?.[i] ?? cierre,
      minimo: cotiz.low?.[i] ?? cierre,
      cierre,
      volumen: cotiz.volume?.[i] ?? 0,
    });
  }
  if (!filas.length) throw new ProveedorError(`Historico vacio para ${simbolo}`);
  return filas;
}

/**
 * Autocompletado de tickers para el buscador de benchmarks de Cartera.
 * Reutiliza `llamarApi()` —misma sesión, mismo crumb— contra el buscador
 * de Yahoo, que no exige un endpoint distinto del resto del proveedor.
 * Solo `EQUITY` y `ETF`: son los únicos tipos que `obtenerHistorico()`
 * sabe servir después con una serie diaria comparable a la cartera; un
 * índice o una divisa en la lista invitaría a un clic que luego falla.
 */
async function buscarSimbolos(consulta) {
  const datos = await llamarApi('/v1/finance/search', {
    q: consulta,
    quotesCount: 8,
    newsCount: 0,
  });
  const quotes = Array.isArray(datos?.quotes) ? datos.quotes : [];
  return quotes
    .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
    .map((q) => ({
      simbolo: q.symbol,
      nombre: q.shortname || q.longname || q.symbol,
      tipo: q.quoteType,
      mercado: q.exchange || null,
    }));
}

module.exports = {
  nombre: 'Yahoo Finance', obtenerCotizacion, obtenerHistorico, buscarSimbolos, ProveedorError,
};
