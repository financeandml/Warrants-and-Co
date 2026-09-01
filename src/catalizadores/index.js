'use strict';

/**
 * Agenda de catalizadores.
 *
 * ═══ Qué es y qué no es ═══
 * Esta agenda recoge **únicamente eventos con fecha real procedente de una
 * fuente**. No hay calendario corporativo conectado, de modo que las categorías
 * que dependen de él —resultados, guidance, decisiones regulatorias, días del
 * inversor— se declaran expresamente como pendientes en lugar de rellenarse con
 * fechas estimadas. Una fecha aproximada presentada como exacta sería el peor
 * error que esta sección puede cometer.
 *
 * Fuentes que sí existen hoy:
 *   · Vencimientos de opciones — fecha cierta publicada por el mercado, con el
 *     interés abierto realmente acumulado en cada uno. Es el único evento futuro
 *     con fecha verificable del que dispone la plataforma.
 *   · Publicaciones de análisis propio — fecha de nuestros informes.
 *   · Menciones en prensa — fecha del teletipo.
 */

const companias = require('../companias');
const opciones = require('../opciones');
const { db } = require('../db');

const PRIORIDAD = { ALTA: 'HIGH', MEDIA: 'MEDIUM', BAJA: 'LOW', DESCONOCIDA: 'UNKNOWN' };
const HORIZONTE = { PROXIMO: 'UPCOMING', PASADO: 'PAST', SIN_FECHA: 'UNDATED' };

const TIPOS = {
  VENCIMIENTO: 'OPTIONS EXPIRY',
  INFORME: 'RESEARCH',
  PRENSA: 'PRESS',
};

/**
 * Categorías que la plataforma reconoce pero para las que no existe fuente.
 * Se publican para que la carencia sea explícita y no se confunda con ausencia
 * de eventos.
 */
const CATEGORIAS_SIN_FUENTE = [
  { tipo: 'EARNINGS', titulo: 'Resultados trimestrales' },
  { tipo: 'GUIDANCE', titulo: 'Revisiones de guidance' },
  { tipo: 'REGULATORY', titulo: 'Decisiones regulatorias' },
  { tipo: 'INVESTOR DAY', titulo: 'Días del inversor y conferencias' },
  { tipo: 'PRODUCT', titulo: 'Lanzamientos de producto' },
  { tipo: 'M&A', titulo: 'Operaciones corporativas' },
];

const REQUISITO_CALENDARIO =
  'Requiere un calendario de eventos corporativos. Ningún proveedor de los conectados lo publica.';

const DIA_MS = 86_400_000;

/** Días naturales entre hoy y una fecha, en negativo si ya pasó. */
function diasHasta(fecha, referencia = new Date()) {
  const d = new Date(`${String(fecha).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const hoy = new Date(`${referencia.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((d - hoy) / DIA_MS);
}

/**
 * Prioridad de un evento. La regla se publica junto al resultado: si no puede
 * explicarse, no se emite y el evento queda como UNKNOWN.
 *
 * ALTA   · evento próximo (≤ 14 días) sobre una compañía en cartera.
 * MEDIA  · evento a la vista (≤ 45 días), o próximo sobre compañía cubierta
 *          pero no en cartera.
 * BAJA   · evento lejano o de impacto secundario.
 * UNKNOWN· sin fecha o sin información suficiente para ordenarlo.
 */
/** Cómo se nombra la distancia temporal en el motivo de la prioridad. */
function plazo(dias) {
  if (dias === 0) return 'Ocurre hoy';
  if (dias === 1) return 'Ocurre mañana';
  return `Faltan ${dias} días`;
}

function priorizar({ dias, enCartera, relevante = true }) {
  if (dias === null || dias === undefined) {
    return { prioridad: PRIORIDAD.DESCONOCIDA, motivo: 'El evento no tiene fecha conocida.' };
  }
  if (dias < 0) {
    return { prioridad: PRIORIDAD.DESCONOCIDA, motivo: 'Evento ya ocurrido: la prioridad solo aplica a lo próximo.' };
  }
  if (!relevante) {
    return { prioridad: PRIORIDAD.BAJA, motivo: 'Evento secundario para la tesis.' };
  }
  const cuando = plazo(dias);

  if (dias <= 14 && enCartera) {
    return {
      prioridad: PRIORIDAD.ALTA,
      motivo: `${cuando} y la compañía está en cartera: puede afectar a la tesis vigente.`,
    };
  }
  if (dias <= 45) {
    return {
      prioridad: PRIORIDAD.MEDIA,
      motivo: enCartera
        ? `${cuando}, sobre una posición abierta, pero fuera del horizonte inmediato.`
        : `${cuando}, sobre una compañía cubierta sin posición abierta.`,
    };
  }
  return { prioridad: PRIORIDAD.BAJA, motivo: `${cuando}: fuera del horizonte de seguimiento.` };
}

/**
 * Vencimientos de opciones de una compañía, con el interés abierto acumulado.
 * Es el único evento futuro con fecha cierta del que disponemos.
 */
async function vencimientosDe(compania) {
  if (!compania.ticker) return [];

  let cadena;
  try {
    cadena = await opciones.getOptionChain(compania.ticker);
  } catch {
    return [];
  }
  if (!Array.isArray(cadena?.contratos) || !cadena.contratos.length) return [];

  // Interés abierto y volumen acumulados por vencimiento.
  const porVencimiento = new Map();
  for (const c of cadena.contratos) {
    if (!c.vencimiento) continue;
    if (!porVencimiento.has(c.vencimiento)) {
      porVencimiento.set(c.vencimiento, { interesAbierto: 0, volumen: 0, contratos: 0, conDato: 0, conVolumen: 0 });
    }
    const v = porVencimiento.get(c.vencimiento);
    v.contratos += 1;
    if (Number.isFinite(c.interesAbierto)) { v.interesAbierto += c.interesAbierto; v.conDato += 1; }
    if (Number.isFinite(c.volumen)) { v.volumen += c.volumen; v.conVolumen += 1; }
  }

  const totalOI = [...porVencimiento.values()].reduce((a, v) => a + v.interesAbierto, 0);

  return [...porVencimiento.entries()]
    .map(([fecha, v]) => {
      const dias = diasHasta(fecha);
      // Un vencimiento concentra la tesis cuando acumula parte sustancial del
      // interés abierto del subyacente.
      const cuota = totalOI > 0 ? v.interesAbierto / totalOI : null;
      const concentrado = cuota !== null && cuota >= 0.12;

      const p = priorizar({
        dias,
        enCartera: compania.enCartera,
        relevante: concentrado || (dias !== null && dias >= 0 && dias <= 14),
      });

      return {
        id: `venc-${compania.ticker}-${fecha}`,
        tipo: TIPOS.VENCIMIENTO,
        titulo: `Vencimiento de opciones · ${fecha}`,
        compania: compania.empresa,
        ticker: compania.ticker,
        enCartera: compania.enCartera,
        fecha,
        fechaConocida: true,
        dias,
        horizonte: dias === null ? HORIZONTE.SIN_FECHA : dias >= 0 ? HORIZONTE.PROXIMO : HORIZONTE.PASADO,
        ...p,
        detalle: {
          interesAbierto: v.conDato > 0 ? v.interesAbierto : null,
          volumen: v.conVolumen > 0 ? v.volumen : null,
          contratos: v.contratos,
          cuotaInteresAbierto: cuota === null ? null : Number((cuota * 100).toFixed(1)),
        },
        fuente: cadena.proveedor?.nombre ?? 'Nasdaq',
        calidadFecha: 'EXACTA',
        // La cadena puede venir recortada: entonces el agregado es parcial.
        parcial: Boolean(cadena.truncada),
      };
    })
    .filter((e) => e.dias !== null);
}

/** Publicaciones de análisis propio: fecha cierta, evento ya ocurrido. */
function publicacionesDe(compania) {
  return compania.informes.map((i) => {
    const dias = diasHasta(i.fecha);
    return {
      id: `informe-${i.id}`,
      tipo: TIPOS.INFORME,
      titulo: `${i.tipo ?? 'Informe'}${i.periodo ? ` · ${i.periodo}` : ''}`,
      compania: compania.empresa,
      ticker: compania.ticker,
      enCartera: compania.enCartera,
      fecha: i.fecha,
      fechaConocida: Boolean(i.fecha),
      dias,
      horizonte: dias === null ? HORIZONTE.SIN_FECHA : dias >= 0 ? HORIZONTE.PROXIMO : HORIZONTE.PASADO,
      ...priorizar({ dias, enCartera: compania.enCartera }),
      detalle: {
        recomendacion: i.recomendacion,
        precioObjetivo: i.precioObjetivo,
        divisa: i.divisa,
        analista: i.analista,
        informeId: i.id,
      },
      fuente: 'Warrants & Co.',
      calidadFecha: 'EXACTA',
    };
  });
}

/**
 * Menciones en prensa. La vinculación es una coincidencia literal de texto, y se
 * rotula como tal: los teletipos no llegan etiquetados por valor.
 */
function prensaDe(compania, limite = 4) {
  const terminos = [compania.empresa, compania.ticker].filter(Boolean);
  const raiz = compania.empresa
    .replace(/,?\s+(inc|corp|corporation|incorporated|plc|s\.a\.|ltd|limited|co)\.?$/i, '')
    .trim();
  if (raiz && raiz.length >= 4) terminos.push(raiz);

  const condiciones = terminos.map(() => '(titular LIKE ? OR entradilla LIKE ?)').join(' OR ');
  const parametros = terminos.flatMap((t) => [`%${t}%`, `%${t}%`]);

  const filas = db
    .prepare(
      `SELECT id, titular, fuente, url_fuente, categoria, fecha_publicacion
         FROM noticias WHERE ${condiciones}
        ORDER BY fecha_publicacion DESC, id DESC LIMIT ?`
    )
    .all(...parametros, limite);

  return filas.map((f) => {
    const dias = diasHasta(f.fecha_publicacion);
    return {
      id: `prensa-${f.id}`,
      tipo: TIPOS.PRENSA,
      titulo: f.titular,
      compania: compania.empresa,
      ticker: compania.ticker,
      enCartera: compania.enCartera,
      fecha: String(f.fecha_publicacion).slice(0, 10),
      fechaConocida: true,
      dias,
      horizonte: dias === null ? HORIZONTE.SIN_FECHA : dias >= 0 ? HORIZONTE.PROXIMO : HORIZONTE.PASADO,
      ...priorizar({ dias, enCartera: compania.enCartera }),
      detalle: { categoria: f.categoria, url: f.url_fuente, noticiaId: f.id },
      fuente: f.fuente ?? 'Prensa',
      calidadFecha: 'EXACTA',
      vinculacion: 'MENCIÓN LITERAL',
    };
  });
}

/**
 * Resumen de vencimientos por compañía —Fase 2 del Investment Catalyst
 * Monitor—, derivado de los propios eventos ya calculados por
 * `vencimientosDe()`, nunca un segundo cálculo de interés abierto, volumen o
 * cuota: cada objeto en `vencimientos` es EL MISMO que ya vive en `proximos`,
 * de modo que no hay dos fuentes que puedan discrepar (regla 9).
 *
 * Existe porque un vencimiento semanal de opciones por cada compañía cubierta,
 * durante todo el horizonte que publica la cadena, satura la agenda con
 * decenas de tarjetas casi idénticas. La prioridad (`priorizar()`) ya distingue
 * qué vencimiento importa; este resumen solo reorganiza los que NO fueron
 * seleccionados como tarjeta completa, agrupados por compañía, sin perder
 * ni uno: `total` cuenta exactamente los vencimientos próximos de la compañía,
 * y `vencimientos` los trae todos, HIGH/MEDIUM incluidos, para que "Ver
 * todos" sea siempre el conjunto completo, no un subconjunto.
 *
 * @param {object[]} proximos eventos ya filtrados a horizonte PROXIMO
 */
function resumenVencimientos(proximos) {
  const porTicker = new Map();
  for (const e of proximos) {
    if (e.tipo !== TIPOS.VENCIMIENTO || !e.ticker) continue;
    if (!porTicker.has(e.ticker)) porTicker.set(e.ticker, []);
    porTicker.get(e.ticker).push(e);
  }

  const resumen = [];
  for (const [ticker, lista] of porTicker) {
    // `proximos` ya viene ordenado por `dias` ascendente (ver `agenda()`);
    // filtrar por ticker conserva ese orden, así que `lista[0]` es el más
    // cercano sin necesidad de volver a ordenar.
    let maximaCuota = null;
    for (const e of lista) {
      const cuota = e.detalle?.cuotaInteresAbierto;
      if (Number.isFinite(cuota) && (maximaCuota === null || cuota > maximaCuota.valor)) {
        maximaCuota = { valor: cuota, fecha: e.fecha };
      }
    }
    resumen.push({
      ticker,
      empresa: lista[0].compania,
      total: lista.length,
      // Se publican por si resultan útiles en el cliente, pero no sustituyen a
      // la prioridad de cada evento individual, que sigue viajando intacta en
      // `vencimientos`.
      altos: lista.filter((e) => e.prioridad === PRIORIDAD.ALTA).length,
      medios: lista.filter((e) => e.prioridad === PRIORIDAD.MEDIA).length,
      proximaFecha: lista[0].fecha,
      proximosDias: lista[0].dias,
      maximaCuota,
      // Mismas referencias que en `proximos`: trazable sin transformación.
      vencimientos: lista,
    });
  }
  return resumen;
}

/**
 * Agenda completa.
 *
 * @param {object} opciones { ticker, tipo, horizonte, cartera }
 * @param {object} [opciones.cartera] resultado YA calculado de calcularCartera()
 *   (ver `src/cartera-referencia.js`), para que cada evento lleve el estado
 *   real de portfolio —OPEN/CLOSED/NOT_HELD— en vez del booleano `enCartera`
 *   antiguo, que solo dice si la tesis sigue marcada como vigente, no si la
 *   posición sigue abierta de verdad. Sin `cartera`, `portfolioStatus` queda
 *   `null` en cada evento —«no comprobado», el mismo tercer estado que ya usa
 *   `companias.detalle()`—, nunca se infiere de `enCartera`.
 */
async function agenda({ ticker = null, tipo = null, horizonte = null, cartera = null } = {}) {
  let cobertura = companias.agrupar();
  if (ticker) {
    const t = String(ticker).toUpperCase();
    cobertura = cobertura.filter((c) => (c.ticker ?? '').toUpperCase() === t);
  }

  // Cada compañía se resuelve por separado: una cadena caída no vacía la agenda.
  const porCompania = await Promise.all(
    cobertura.map(async (c) => {
      const vencimientos = await vencimientosDe(c).catch(() => []);
      return [...vencimientos, ...publicacionesDe(c), ...prensaDe(c)];
    })
  );

  let eventos = porCompania.flat();
  // Mismo cruce que `companias.detalle()`, reutilizado, no reimplementado:
  // la regla 9 aplicada al estado de una posición.
  for (const e of eventos) e.portfolioStatus = companias.estadoPortfolio(e.ticker, cartera);
  if (tipo) eventos = eventos.filter((e) => e.tipo === tipo);
  if (horizonte) eventos = eventos.filter((e) => e.horizonte === horizonte);

  const proximos = eventos
    .filter((e) => e.horizonte === HORIZONTE.PROXIMO)
    // Lo más cercano primero.
    .sort((a, b) => a.dias - b.dias || a.compania.localeCompare(b.compania));

  const pasados = eventos
    .filter((e) => e.horizonte === HORIZONTE.PASADO)
    // Lo más reciente primero.
    .sort((a, b) => b.dias - a.dias || a.compania.localeCompare(b.compania));

  const sinFecha = eventos.filter((e) => e.horizonte === HORIZONTE.SIN_FECHA);

  return {
    proximos,
    pasados,
    sinFecha,
    // Fase 2: agregado por compañía de los vencimientos de opciones próximos,
    // derivado de `proximos` sin recalcular ningún campo — ver `resumenVencimientos()`.
    resumenVencimientos: resumenVencimientos(proximos),
    total: eventos.length,
    disponible: eventos.length > 0,
    resumen: {
      proximos: proximos.length,
      pasados: pasados.length,
      sinFecha: sinFecha.length,
      alta: proximos.filter((e) => e.prioridad === PRIORIDAD.ALTA).length,
      media: proximos.filter((e) => e.prioridad === PRIORIDAD.MEDIA).length,
      baja: proximos.filter((e) => e.prioridad === PRIORIDAD.BAJA).length,
    },
    // Lo que la agenda no puede cubrir, dicho sin rodeos.
    sinFuente: CATEGORIAS_SIN_FUENTE.map((c) => ({ ...c, motivo: REQUISITO_CALENDARIO })),
    fuentes: [
      { tipo: TIPOS.VENCIMIENTO, origen: 'Cadena de opciones (Nasdaq)', fechas: 'Exactas, publicadas por el mercado' },
      { tipo: TIPOS.INFORME, origen: 'Repositorio de análisis propio', fechas: 'Exactas' },
      { tipo: TIPOS.PRENSA, origen: 'Teletipos sindicados', fechas: 'Exactas; vinculación por mención literal' },
    ],
    universo: cobertura.map((c) => ({
      ticker: c.ticker, empresa: c.empresa, enCartera: c.enCartera,
      portfolioStatus: companias.estadoPortfolio(c.ticker, cartera),
    })),
    criterioPrioridad: {
      HIGH: 'Evento a ≤ 14 días sobre una compañía en cartera.',
      MEDIUM: 'Evento a ≤ 45 días, o próximo sobre compañía cubierta sin posición abierta.',
      LOW: 'Evento a más de 45 días o de impacto secundario.',
      UNKNOWN: 'Sin fecha conocida o ya ocurrido.',
    },
    generadoEn: new Date().toISOString(),
  };
}

module.exports = { agenda, priorizar, diasHasta, PRIORIDAD, HORIZONTE, TIPOS, CATEGORIAS_SIN_FUENTE };
