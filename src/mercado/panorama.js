'use strict';

/**
 * Panorama de mercado — la sección MARKET.
 *
 * Se apoya íntegramente en la cascada de proveedores existente (Yahoo → CNBC →
 * Nasdaq) y hereda su caché. Añade dos cosas que la lista de índices del cuadro
 * de mando no daba: **cobertura más amplia** (renta variable, volatilidad y curva
 * de tipos) y **calidad declarada por dato**.
 *
 * ═══ Sobre la calidad ═══
 * Ninguna cotización se rotula REAL_TIME. No tenemos contrato de tiempo real con
 * ningún mercado: lo que sirve la cascada es dato consolidado con retraso. Se
 * marca DELAYED durante la sesión y HISTORICAL fuera de ella, porque entonces el
 * último precio es el cierre de la sesión anterior y no una cotización viva.
 *
 * ═══ Sobre los símbolos ═══
 * Cada símbolo está verificado uno a uno contra el proveedor. Varios candidatos
 * aparentemente equivalentes resuelven a instrumentos distintos: `DJIA` devuelve
 * un ETF de covered call y `COMP` una inmobiliaria. Por eso el Dow Jones figura
 * como no disponible en lugar de sustituirse por un aproximado.
 */

const mercado = require('../market');
const { CLAVES_GRUPO } = require('./motivos');

const CALIDAD = {
  TIEMPO_REAL: 'REAL_TIME',
  DIFERIDO: 'DELAYED',
  HISTORICO: 'HISTORICAL',
  NO_DISPONIBLE: 'UNAVAILABLE',
};

/** Instrumentos verificados que la cascada resuelve. */
const INSTRUMENTOS = [
  // ── Renta variable ──
  { clave: 'sp500', simbolo: 'SPX', nombre: 'S&P 500', grupo: 'renta-variable', formato: 'indice', decimales: 2 },
  { clave: 'nasdaq100', simbolo: 'NDX', nombre: 'Nasdaq 100', grupo: 'renta-variable', formato: 'indice', decimales: 2 },
  { clave: 'russell2000', simbolo: 'RUT', nombre: 'Russell 2000', grupo: 'renta-variable', formato: 'indice', decimales: 2 },

  // ── Volatilidad ──
  { clave: 'vix', simbolo: 'VIX', nombre: 'VIX', grupo: 'volatilidad', formato: 'indice', decimales: 2,
    nota: 'VIX_VOLATILIDAD_IMPLICITA' },

  // ── Curva de tipos ──
  { clave: 'us3m', simbolo: 'US3M', nombre: 'EE. UU. 3 meses', grupo: 'tipos', formato: 'tipo', decimales: 3, plazoAnios: 0.25 },
  { clave: 'us2y', simbolo: 'US2Y', nombre: 'EE. UU. 2 años', grupo: 'tipos', formato: 'tipo', decimales: 3, plazoAnios: 2 },
  { clave: 'us5y', simbolo: 'US5Y', nombre: 'EE. UU. 5 años', grupo: 'tipos', formato: 'tipo', decimales: 3, plazoAnios: 5 },
  { clave: 'us10y', simbolo: 'US10Y', nombre: 'EE. UU. 10 años', grupo: 'tipos', formato: 'tipo', decimales: 3, plazoAnios: 10 },
  { clave: 'us30y', simbolo: 'US30Y', nombre: 'EE. UU. 30 años', grupo: 'tipos', formato: 'tipo', decimales: 3, plazoAnios: 30 },
];

/**
 * Instrumentos que la sección reconoce pero que ningún proveedor conectado
 * resuelve. Se publican con su motivo para que la ausencia sea explícita: es
 * preferible un hueco declarado a un sucedáneo silencioso.
 */
const SIN_FUENTE = [
  {
    clave: 'dowjones',
    nombre: 'Dow Jones Industrial Average',
    grupo: 'renta-variable',
    motivo: 'DOW_JONES_SIN_PROVEEDOR',
  },
];

// El título y la descripción de cada grupo viven en el diccionario del
// cliente, no aquí: son tres claves cerradas, iguales en cada carga, y
// `src/mercado/motivos.js` es su única fuente — mismo criterio que el resto
// de vocabularios cerrados de la plataforma (`public/vocabulario.js`).
const GRUPOS = CLAVES_GRUPO.map((clave) => ({ clave }));

/** Sesiones en las que el último precio ya no es una cotización viva. */
const FUERA_DE_SESION = new Set(['CLOSED', 'PRE_MKT', 'POST_MKT', 'AFTER_HOURS']);

/**
 * Calidad de una cotización.
 * Nunca devuelve REAL_TIME: no hay entitlement de tiempo real en la plataforma.
 */
function calidadDe(q) {
  const estado = String(q.estadoMercado ?? '').toUpperCase();
  if (FUERA_DE_SESION.has(estado)) {
    return { calidad: CALIDAD.HISTORICO, explicacion: 'CALIDAD_FUERA_DE_SESION' };
  }
  return { calidad: CALIDAD.DIFERIDO, explicacion: 'CALIDAD_DIFERIDO' };
}

/** Antigüedad del dato en segundos, para que la interfaz pueda rotularla. */
function antiguedad(momento) {
  if (!momento) return null;
  const t = new Date(momento).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}

/** Dirección del movimiento, sin convertir la ausencia de dato en «plano». */
function direccion(variacion) {
  if (!Number.isFinite(variacion)) return 'UNKNOWN';
  if (variacion > 0) return 'UP';
  if (variacion < 0) return 'DOWN';
  return 'FLAT';
}

/**
 * Reconstruye el cierre anterior y, a partir de él, la variación.
 *
 * Ninguno de los campos del proveedor es fiable por sí solo, y lo son de forma
 * complementaria según el instrumento:
 *
 *   · En los índices, `cierreAnterior` llega igualado al precio —no es un cierre
 *     real— pero `variacion` sí es correcta: SPX 7.798,99 con variación +50,49.
 *   · En la curva de tipos ocurre al revés: `cierreAnterior` es un cierre real
 *     pero el porcentaje no concuerda con él. Se observó US2Y a 4,123 sobre un
 *     cierre de 4,140 —un −0,41 %— publicado como +0,03 %.
 *
 * De modo que se toma el cierre anterior cuando difiere del precio y, si no, se
 * deduce restando la variación. Todo lo que sale de aquí es cálculo propio y se
 * rotula como tal.
 */
function reconstruirVariacion(q) {
  const cierre =
    Number.isFinite(q.cierreAnterior) && q.cierreAnterior !== q.precio
      ? q.cierreAnterior
      : Number.isFinite(q.precio) && Number.isFinite(q.variacion)
        ? q.precio - q.variacion
        : null;

  if (!Number.isFinite(q.precio) || !Number.isFinite(cierre) || cierre === 0) {
    return {
      cierreAnterior: Number.isFinite(q.cierreAnterior) ? q.cierreAnterior : null,
      variacion: null,
      variacionPct: null,
      calidad: CALIDAD.NO_DISPONIBLE,
    };
  }

  return {
    cierreAnterior: cierre,
    variacion: q.precio - cierre,
    variacionPct: Number(((q.precio / cierre - 1) * 100).toFixed(2)),
    calidad: 'CALCULATED',
    derivadoDe: ['precio', 'cierreAnterior'],
  };
}

/**
 * Resuelve el panorama completo.
 * Cada instrumento se pide por separado: uno que falle no arrastra a los demás.
 */
async function obtenerPanorama() {
  const resultados = await Promise.allSettled(
    INSTRUMENTOS.map((i) => mercado.obtenerCotizacion(i.simbolo))
  );

  const instrumentos = INSTRUMENTOS.map((definicion, i) => {
    const r = resultados[i];

    if (r.status !== 'fulfilled') {
      return {
        ...definicion,
        disponible: false,
        calidad: CALIDAD.NO_DISPONIBLE,
        // El valor ausente es null, nunca cero.
        valor: null,
        variacion: null,
        variacionPct: null,
        direccion: 'UNKNOWN',
        // El motivo fijo se traduce; lo que diga el proveedor es texto ajeno
        // y viaja aparte, sin traducir — misma doctrina que `PROVEEDOR_NO_RESPONDE`.
        motivo: 'SIN_DATOS',
        detalle: r.reason?.message ?? null,
      };
    }

    const q = r.value;
    const { calidad, explicacion } = calidadDe(q);
    const v = reconstruirVariacion(q);

    return {
      ...definicion,
      disponible: true,
      calidad,
      explicacionCalidad: explicacion,
      valor: q.precio,
      variacion: Number.isFinite(v.variacion)
        ? Number(v.variacion.toFixed(definicion.decimales ?? 2))
        : null,
      variacionPct: v.variacionPct,
      calidadVariacion: v.calidad,
      direccion: direccion(v.variacion),
      cierreAnterior: v.cierreAnterior,
      nombreProveedor: q.nombre,
      estadoMercado: q.estadoMercado ?? null,
      fuente: q.fuente,
      momento: q.momento,
      antiguedadSegundos: antiguedad(q.momento),
    };
  });

  const disponibles = instrumentos.filter((i) => i.disponible);

  return {
    grupos: GRUPOS.map((g) => ({
      ...g,
      instrumentos: instrumentos.filter((i) => i.grupo === g.clave),
      sinFuente: SIN_FUENTE.filter((s) => s.grupo === g.clave),
    })),
    curvaTipos: construirCurva(instrumentos),
    sinFuente: SIN_FUENTE,
    cobertura: {
      solicitados: INSTRUMENTOS.length + SIN_FUENTE.length,
      resueltos: disponibles.length,
      // Lo que no se resuelve se enumera, no se esconde.
      ausentes: [
        ...instrumentos.filter((i) => !i.disponible).map((i) => ({ nombre: i.nombre, motivo: i.motivo })),
        ...SIN_FUENTE.map((s) => ({ nombre: s.nombre, motivo: s.motivo })),
      ],
    },
    // La leyenda de cada sello es un texto fijo y cerrado: vive en el
    // diccionario del cliente (`mercado.calidad.leyenda.*`), no aquí.
    proveedores: mercado.estado?.().proveedoresCotizacion ?? [],
    generadoEn: new Date().toISOString(),
  };
}

/**
 * Curva de tipos ordenada por plazo.
 * La pendiente 10 años − 2 años es un cálculo propio sobre dos observaciones, y
 * solo se emite si ambas existen.
 */
function construirCurva(instrumentos) {
  const puntos = instrumentos
    .filter((i) => i.grupo === 'tipos' && i.disponible && Number.isFinite(i.valor))
    .sort((a, b) => a.plazoAnios - b.plazoAnios)
    .map((i) => ({ nombre: i.nombre, plazoAnios: i.plazoAnios, valor: i.valor, variacion: i.variacion }));

  const dosAnios = puntos.find((p) => p.plazoAnios === 2);
  const diezAnios = puntos.find((p) => p.plazoAnios === 10);

  const pendiente =
    dosAnios && diezAnios
      ? {
          disponible: true,
          calidad: 'CALCULATED',
          puntosBasicos: Number(((diezAnios.valor - dosAnios.valor) * 100).toFixed(1)),
          invertida: diezAnios.valor < dosAnios.valor,
          derivadoDe: ['US10Y', 'US2Y'],
        }
      : { disponible: false, calidad: CALIDAD.NO_DISPONIBLE, motivo: 'CURVA_INCOMPLETA' };

  return { puntos, pendiente, disponible: puntos.length >= 2 };
}

module.exports = { obtenerPanorama, INSTRUMENTOS, SIN_FUENTE, GRUPOS, CALIDAD, calidadDe };
