'use strict';

/**
 * Compañías bajo cobertura.
 *
 * No hay una tabla de compañías: la cobertura **es** el conjunto de informes
 * publicados. Este módulo la deriva de ahí, de modo que dar de alta una tesis da
 * de alta la compañía y retirarla la retira, sin duplicar la verdad en dos sitios.
 *
 * Regla que gobierna el módulo: aquí no nace ningún dato. Todo lo que se publica
 * procede de un informe, de la cotización en vivo o de la cadena de opciones; lo
 * que no exista se declara ausente y jamás se sustituye por un cero ni por una
 * estimación.
 */

const { db } = require('../db');
const mercado = require('../market');

/** Etiquetas de calidad, compartidas con la capa de opciones. */
const CALIDAD = {
  TIEMPO_REAL: 'REAL_TIME',
  DIFERIDO: 'DELAYED',
  HISTORICO: 'HISTORICAL',
  CALCULADO: 'CALCULATED',
  NO_DISPONIBLE: 'UNAVAILABLE',
};

const leerEtiquetas = (crudo) => {
  try {
    const v = JSON.parse(crudo ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/**
 * Agrupa los informes por compañía.
 * La identidad es el ticker cuando existe; si no, el nombre de la empresa, para
 * que una compañía sin cotización no desaparezca de la cobertura.
 */
function agrupar() {
  const filas = db
    .prepare(
      `SELECT i.*,
              (SELECT COUNT(*) FROM adjuntos a WHERE a.informe_id = i.id) AS adjuntos
         FROM informes i
        ORDER BY i.fecha_publicacion DESC, i.id DESC`
    )
    .all();

  const porClave = new Map();

  for (const f of filas) {
    const clave = (f.ticker && f.ticker.trim()) || f.empresa;
    if (!porClave.has(clave)) {
      porClave.set(clave, {
        clave,
        ticker: f.ticker || null,
        empresa: f.empresa,
        sector: f.sector || null,
        pais: f.pais || null,
        etiquetas: new Set(),
        informes: [],
      });
    }
    const c = porClave.get(clave);

    // Los informes llegan del más reciente al más antiguo: el primero manda en
    // los campos descriptivos, que pueden haberse corregido con el tiempo.
    if (!c.sector && f.sector) c.sector = f.sector;
    if (!c.pais && f.pais) c.pais = f.pais;
    for (const e of leerEtiquetas(f.etiquetas)) c.etiquetas.add(e);

    c.informes.push({
      id: f.id,
      tipo: f.tipo_informe || null,
      periodo: f.periodo || null,
      analista: f.analista || null,
      recomendacion: f.recomendacion || null,
      precioObjetivo: Number.isFinite(f.precio_objetivo) ? f.precio_objetivo : null,
      divisa: f.divisa || 'USD',
      fecha: f.fecha_publicacion,
      destacado: Boolean(f.destacado),
      nivelAcceso: f.nivel_acceso,
      adjuntos: f.adjuntos,
      resumen: f.resumen_ejecutivo || null,
      riesgosClave: f.riesgos_clave || null,
      enCartera: Boolean(f.en_cartera),
      pesoCartera: Number.isFinite(f.peso_cartera) ? f.peso_cartera : null,
      precioCompra: Number.isFinite(f.precio_compra) ? f.precio_compra : null,
      takeProfit: Number.isFinite(f.take_profit) ? f.take_profit : null,
      stopLoss: Number.isFinite(f.stop_loss) ? f.stop_loss : null,
    });
  }

  return [...porClave.values()].map(componer);
}

/** Consolida la posición vigente de una compañía a partir de sus informes. */
function componer(c) {
  const informes = c.informes;
  const ultimo = informes[0];

  // La tesis vigente es la del informe más reciente que declara cada campo: un
  // informe de seguimiento puede no repetir el precio objetivo del de inicio.
  const vigente = (campo) => informes.find((i) => i[campo] !== null && i[campo] !== undefined)?.[campo] ?? null;

  const enCartera = informes.some((i) => i.enCartera);
  const precioCompra = vigente('precioCompra');
  const takeProfit = vigente('takeProfit');

  return {
    clave: c.clave,
    ticker: c.ticker,
    empresa: c.empresa,
    sector: c.sector,
    pais: c.pais,
    etiquetas: [...c.etiquetas],
    enCartera,
    pesoCartera: vigente('pesoCartera'),
    recomendacion: vigente('recomendacion'),
    precioObjetivo: vigente('precioObjetivo'),
    divisa: ultimo.divisa,
    precioCompra,
    takeProfit,
    stopLoss: vigente('stopLoss'),
    // Juicio narrativo del analista, no derivado de ningún proveedor. `null`
    // si nadie lo ha escrito todavía —el tercer estado, «no hay dato»—; el
    // cliente lo rotula N/A, igual que el resto de campos opcionales de la
    // ficha. Nunca una cadena vacía.
    riesgosClave: vigente('riesgosClave'),
    // Recorrido pendiente hasta el objetivo: solo si hay ambos extremos.
    informes,
    totalInformes: informes.length,
    totalAdjuntos: informes.reduce((a, i) => a + i.adjuntos, 0),
    ultimaPublicacion: ultimo.fecha,
    destacada: informes.some((i) => i.destacado),
  };
}

/** Listado completo, opcionalmente filtrado por texto. */
function listar({ q = '', sector = null, soloCartera = false } = {}) {
  let companias = agrupar();

  if (sector) {
    companias = companias.filter((c) => c.sector === sector);
  }
  if (soloCartera) {
    companias = companias.filter((c) => c.enCartera);
  }

  const consulta = String(q ?? '').trim().toLowerCase();
  if (consulta) {
    // Búsqueda sobre los campos que el usuario ve: nombre, ticker, sector y etiquetas.
    companias = companias.filter((c) =>
      [c.empresa, c.ticker, c.sector, c.pais, ...c.etiquetas]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(consulta))
    );
  }

  return {
    companias: companias.map(({ informes, ...resto }) => ({
      ...resto,
      // El listado no necesita el detalle de cada informe, solo su recuento.
      ultimoInforme: informes[0] ? { id: informes[0].id, tipo: informes[0].tipo, fecha: informes[0].fecha } : null,
    })),
    total: companias.length,
    sectores: [...new Set(agrupar().map((c) => c.sector).filter(Boolean))].sort(),
    consulta: consulta || null,
    generadoEn: new Date().toISOString(),
  };
}

/**
 * Estado real de la compañía en la cartera: OPEN, CLOSED o NOT_HELD.
 *
 * Es un cruce en el momento de servir la ficha, no un dato guardado: `cartera`
 * es el objeto que ya devuelve `calcularCartera()` (posiciones vivas +
 * liquidadas), la misma fuente que usa la vista de Portfolio. Guardar aquí un
 * estado propio habría sido la regla 9 al revés —dos sitios afirmando lo mismo
 * sobre la misma posición, sin ninguna prueba de que concuerden—. Si no se
 * pasa `cartera` (llamada barata, sin el motor), el estado queda `null`: «no
 * se ha comprobado», no «no está en cartera».
 */
function estadoPortfolio(ticker, cartera) {
  // Sin `cartera` calculada: no se ha comprobado nada, y null lo dice.
  if (!cartera) return null;
  // Sin ticker, la compañía no puede figurar en la cartera —se indexa por
  // ticker—, así que aquí SÍ hay una respuesta firme: nunca estuvo ni podrá
  // estar. Es la misma distinción que entre «no hay dato» y «el dato es cero».
  if (!ticker) return 'NOT_HELD';
  const t = ticker.toUpperCase();
  if (cartera.posiciones?.some((p) => p.ticker === t)) return 'OPEN';
  if (cartera.cerradas?.some((p) => p.ticker === t)) return 'CLOSED';
  return 'NOT_HELD';
}

/**
 * Ficha de una compañía, enriquecida con lo que el resto de la plataforma sepa
 * de ella. Cada fuente se resuelve por separado: una caída deja su bloque
 * declarado como no disponible sin arrastrar a los demás.
 *
 * @param {object} [opciones]
 * @param {object} [opciones.cartera]     resultado ya calculado de calcularCartera(),
 *                                        para derivar el estado de portfolio sin
 *                                        recalcular el motor por cada ficha.
 * @param {Function} [opciones.agendaDe]  `({ ticker }) => Promise<Array>` — inyectado
 *                                        para no acoplar este módulo a catalizadores
 *                                        salvo que de verdad se pidan catalysts.
 */
async function detalle(claveOTicker, { cartera = null, agendaDe = null } = {}) {
  const buscada = String(claveOTicker ?? '').trim().toUpperCase();
  const compania = agrupar().find(
    (c) => c.clave.toUpperCase() === buscada || (c.ticker ?? '').toUpperCase() === buscada
  );
  if (!compania) return null;

  const [cotizacion, noticias, catalysts] = await Promise.all([
    resolverCotizacion(compania.ticker),
    Promise.resolve(mencionesEnNoticias(compania)),
    agendaDe && compania.ticker ? agendaDe({ ticker: compania.ticker }).catch(() => []) : Promise.resolve([]),
  ]);

  return {
    ...compania,
    cotizacion,
    recorridoObjetivo: recorrido(cotizacion, compania.precioObjetivo),
    noticias,
    catalysts,
    portfolioStatus: estadoPortfolio(compania.ticker, cartera),
    generadoEn: new Date().toISOString(),
  };
}

/** Cotización en vivo, con su calidad declarada. */
async function resolverCotizacion(ticker) {
  if (!ticker) {
    return { disponible: false, calidad: CALIDAD.NO_DISPONIBLE, motivo: 'La compañía no tiene ticker asignado' };
  }
  try {
    const q = await mercado.obtenerCotizacion(ticker);
    return {
      disponible: true,
      // La cascada sirve el último cierre consolidado, no una cotización en vivo.
      calidad: CALIDAD.DIFERIDO,
      precio: q.precio,
      variacion: q.variacion,
      variacionPct: q.variacionPct,
      cierreAnterior: q.cierreAnterior,
      divisa: q.divisa,
      mercado: q.mercado,
      estadoMercado: q.estadoMercado ?? null,
      fuente: q.fuente,
      momento: q.momento,
      fundamentales: q.fundamentales ?? null,
    };
  } catch (err) {
    return { disponible: false, calidad: CALIDAD.NO_DISPONIBLE, motivo: err?.message ?? 'Sin cotización disponible' };
  }
}

/** Recorrido pendiente hasta el precio objetivo. Cálculo propio, no dato de mercado. */
function recorrido(cotizacion, objetivo) {
  if (!cotizacion?.disponible || !Number.isFinite(cotizacion.precio) || !Number.isFinite(objetivo)) {
    return { disponible: false, calidad: CALIDAD.NO_DISPONIBLE, motivo: 'Requiere cotización y precio objetivo' };
  }
  return {
    disponible: true,
    calidad: CALIDAD.CALCULADO,
    porcentaje: Number(((objetivo / cotizacion.precio - 1) * 100).toFixed(2)),
    derivadoDe: ['precio', 'precioObjetivo'],
  };
}

/**
 * Noticias que mencionan a la compañía.
 *
 * Los teletipos no vienen etiquetados por ticker, de modo que la vinculación se
 * establece por mención literal del nombre o del ticker en el titular o la
 * entradilla. Se declara como tal —es una coincidencia de texto, no una
 * clasificación editorial— para que nadie la lea como una atribución firme.
 */
function mencionesEnNoticias(compania, limite = 8) {
  const terminos = [compania.empresa, compania.ticker].filter(Boolean);
  // El nombre legal arrastra sufijos que no aparecen en los teletipos.
  const raiz = compania.empresa
    .replace(/,?\s+(inc|corp|corporation|incorporated|plc|s\.a\.|ltd|limited|co)\.?$/i, '')
    .trim();
  if (raiz && raiz.length >= 4) terminos.push(raiz);

  const condiciones = terminos.map(() => '(titular LIKE ? OR entradilla LIKE ?)').join(' OR ');
  const parametros = terminos.flatMap((t) => [`%${t}%`, `%${t}%`]);

  const filas = db
    .prepare(
      `SELECT id, titular, entradilla, fuente, url_fuente, categoria, fecha_publicacion
         FROM noticias
        WHERE ${condiciones}
        ORDER BY fecha_publicacion DESC, id DESC
        LIMIT ?`
    )
    .all(...parametros, limite);

  return {
    disponible: filas.length > 0,
    vinculacion: 'MENCIÓN LITERAL',
    nota: 'Coincidencia del nombre o el ticker en titular o entradilla. Los teletipos no llegan etiquetados por valor.',
    terminos,
    articulos: filas.map((f) => ({
      id: f.id,
      titular: f.titular,
      entradilla: f.entradilla,
      fuente: f.fuente,
      url: f.url_fuente,
      categoria: f.categoria,
      fecha: f.fecha_publicacion,
    })),
    total: filas.length,
  };
}

/** Tickers bajo cobertura, para quien necesite recorrerla. */
function universo() {
  return agrupar()
    .map((c) => c.ticker)
    .filter(Boolean);
}

module.exports = { listar, detalle, universo, agrupar, CALIDAD };
