'use strict';

/**
 * Sindicacion de noticias de Investing.com.
 *
 * Investing.com no ofrece API publica —asi lo indica su propio servicio de
 * soporte— y tanto su web como api.investing.com responden 403 a las peticiones
 * automatizadas. La via publica que la propia casa mantiene son sus canales RSS,
 * y sobre ellos se construye esta integracion.
 *
 * De cada pieza se toma exclusivamente titular, fecha, autor, imagen y enlace al
 * original: no se reproduce el cuerpo del articulo, de modo que la plataforma
 * actua como indice y remite siempre a la fuente.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TIMEOUT_MS = 12_000;
const BASE = 'https://es.investing.com/rss';

/** Canales publicados por Investing.com, con la categoria del repositorio a la que alimentan. */
const CANALES = [
  { id: 'ultima-hora', fichero: 'news_356.rss', nombre: 'Bolsa · última hora', categoria: 'Mercados' },
  { id: 'bolsa', fichero: 'news_25.rss', nombre: 'Noticias de bolsa', categoria: 'Mercados' },
  { id: 'general', fichero: 'news.rss', nombre: 'Todas las noticias', categoria: 'Mercados' },
  { id: 'analisis', fichero: 'stock_Stocks.rss', nombre: 'Análisis de acciones', categoria: 'Sector' },
  { id: 'panorama', fichero: 'market_overview.rss', nombre: 'Visión general del mercado', categoria: 'Macroeconomía' },
  { id: 'divisas', fichero: 'news_1.rss', nombre: 'Divisas', categoria: 'Macroeconomía' },
  { id: 'materias', fichero: 'news_11.rss', nombre: 'Materias primas y futuros', categoria: 'Sector' },
  { id: 'cripto', fichero: 'news_301.rss', nombre: 'Criptomonedas', categoria: 'Sector' },
];

const CANALES_POR_DEFECTO = ['ultima-hora', 'bolsa', 'general', 'panorama', 'analisis'];

// Validadores condicionales por canal: evitan descargar un feed que no ha cambiado.
const validadores = new Map();

// ------------------------------------------------------------ analisis XML

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', euro: '€',
};

/** Decodifica entidades XML y numericas, y retira los envoltorios CDATA. */
function decodificar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (coincidencia, nombre) => ENTIDADES[nombre] ?? coincidencia)
    .replace(/<[^>]*>/g, '') // ningun titular debe arrastrar marcado
    .replace(/\s+/g, ' ')
    .trim();
}

function extraer(bloque, etiqueta) {
  const m = bloque.match(new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</${etiqueta}>`, 'i'));
  return m ? decodificar(m[1]) : null;
}

/**
 * Interpreta las dos formas de fecha que emplea Investing.com:
 *   "2026-08-13 17:05:30"      y      "Aug 13, 2026 11:19 GMT"
 * @returns {Date|null}
 */
function interpretarFecha(bruto) {
  if (!bruto) return null;
  const texto = bruto.trim();

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    const [, a, m, d, h, min, s] = iso;
    // El canal publica en horario del servidor, tratado como UTC para no desplazar el dia.
    const fecha = new Date(Date.UTC(+a, +m - 1, +d, +h, +min, +(s ?? 0)));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Extrae los elementos <item> de un documento RSS. */
function analizarRss(xml) {
  const piezas = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const bloque = m[1];
    const titular = extraer(bloque, 'title');
    const enlace = extraer(bloque, 'link');
    if (!titular || !enlace) continue;

    const imagenBruta = bloque.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1] ?? null;

    piezas.push({
      titular,
      enlace,
      autor: extraer(bloque, 'author'),
      publicado: interpretarFecha(extraer(bloque, 'pubDate')),
      imagen: imagenBruta && /^https?:\/\//i.test(imagenBruta) ? imagenBruta : null,
    });
  }
  return piezas;
}

// ------------------------------------------------------------- descarga

class ErrorSindicacion extends Error {
  constructor(mensaje, { status = null, canal = null } = {}) {
    super(mensaje);
    this.name = 'ErrorSindicacion';
    this.status = status;
    this.canal = canal;
  }
}

/**
 * Descarga un canal. Emplea peticion condicional: si el canal no ha cambiado
 * desde la ultima consulta, Investing responde 304 y no se transfiere nada.
 */
async function descargarCanal(canal) {
  const url = `${BASE}/${canal.fichero}`;
  const validador = validadores.get(canal.id);

  const cabeceras = {
    'User-Agent': UA,
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'es-ES,es;q=0.9',
  };
  if (validador?.etag) cabeceras['If-None-Match'] = validador.etag;
  else if (validador?.modificado) cabeceras['If-Modified-Since'] = validador.modificado;

  const res = await fetch(url, { headers: cabeceras, signal: AbortSignal.timeout(TIMEOUT_MS) });

  if (res.status === 304) return { sinCambios: true, piezas: [] };
  if (!res.ok) {
    throw new ErrorSindicacion(`El canal respondió ${res.status}`, { status: res.status, canal: canal.id });
  }

  const etag = res.headers.get('etag');
  const modificado = res.headers.get('last-modified');
  if (etag || modificado) validadores.set(canal.id, { etag, modificado });

  const xml = await res.text();
  if (!/<rss[\s>]|<channel[\s>]/i.test(xml)) {
    throw new ErrorSindicacion('La respuesta no es un documento RSS válido', { canal: canal.id });
  }

  return { sinCambios: false, piezas: analizarRss(xml) };
}

/**
 * Recupera las piezas de los canales indicados.
 * Un canal caido no interrumpe al resto.
 *
 * @param {string[]} ids  identificadores de canal; por defecto, la seleccion habitual
 * @returns {Promise<{piezas: Array, incidencias: Array, canalesConsultados: number}>}
 */
async function obtenerPiezas(ids = CANALES_POR_DEFECTO) {
  const seleccion = CANALES.filter((c) => ids.includes(c.id));
  if (!seleccion.length) return { piezas: [], incidencias: ['Ningún canal seleccionado'], canalesConsultados: 0 };

  const resultados = await Promise.allSettled(seleccion.map((c) => descargarCanal(c)));

  const piezas = [];
  const incidencias = [];
  const vistos = new Set();

  resultados.forEach((r, i) => {
    const canal = seleccion[i];
    if (r.status !== 'fulfilled') {
      incidencias.push(`${canal.nombre}: ${r.reason?.message ?? 'error desconocido'}`);
      return;
    }
    for (const pieza of r.value.piezas) {
      // Un mismo titular puede aparecer en varios canales: prevalece el primero.
      if (vistos.has(pieza.enlace)) continue;
      vistos.add(pieza.enlace);
      piezas.push({ ...pieza, canal: canal.id, canalNombre: canal.nombre, categoria: canal.categoria });
    }
  });

  return { piezas, incidencias, canalesConsultados: seleccion.length };
}

module.exports = {
  obtenerPiezas, CANALES, CANALES_POR_DEFECTO, ErrorSindicacion,
  // Expuestos para las pruebas del analizador.
  analizarRss, interpretarFecha, decodificar,
};
