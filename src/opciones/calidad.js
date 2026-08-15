'use strict';

/**
 * Capa de calidad y procedencia del dato.
 *
 * Todo valor que atraviesa el subsistema de opciones viaja etiquetado con **cómo
 * se ha obtenido**. Es la garantía de que la plataforma nunca presente una
 * inferencia o un cálculo propio como si fuera una observación del mercado.
 *
 * La distinción esencial es entre lo OBSERVADO y lo DERIVADO:
 *
 *   OBSERVADO   REAL_TIME · DELAYED · HISTORICAL
 *               El mercado lo publicó. Nosotros lo transportamos.
 *
 *   DERIVADO    CALCULATED · INFERRED
 *               Lo hemos producido nosotros. CALCULATED es aritmética exacta
 *               sobre datos observados; INFERRED es una hipótesis que podría
 *               ser falsa y por eso lleva confianza.
 *
 *   AUSENTE     UNAVAILABLE
 *               No hay dato. Nunca es cero.
 */

const CALIDAD = {
  TIEMPO_REAL: 'REAL_TIME',
  DIFERIDO: 'DELAYED',
  HISTORICO: 'HISTORICAL',
  CALCULADO: 'CALCULATED',
  INFERIDO: 'INFERRED',
  NO_DISPONIBLE: 'UNAVAILABLE',
};

/** Calidades que proceden de una observación del mercado. */
const OBSERVADAS = new Set([CALIDAD.TIEMPO_REAL, CALIDAD.DIFERIDO, CALIDAD.HISTORICO]);
/** Calidades producidas por la plataforma. */
const DERIVADAS = new Set([CALIDAD.CALCULADO, CALIDAD.INFERIDO]);

/**
 * Dato etiquetado.
 * @typedef {object} Dato
 * @property {*} valor            null cuando no hay dato
 * @property {string} calidad     una de CALIDAD
 * @property {string|null} fuente proveedor o módulo que lo produjo
 * @property {string[]} derivadoDe  claves de los datos de los que procede
 * @property {number|null} confianza  0–1, solo para inferencias
 * @property {string|null} nota   explicación legible
 */

/** Constructor base. No se usa directamente: prefiera los ayudantes de abajo. */
function marcar(valor, calidad, { fuente = null, derivadoDe = [], confianza = null, nota = null, momento = null } = {}) {
  const hayValor = valor !== null && valor !== undefined &&
    (typeof valor !== 'number' || Number.isFinite(valor));

  return {
    valor: hayValor ? valor : null,
    // Un valor ausente es siempre UNAVAILABLE, se pida la calidad que se pida:
    // así ninguna vía puede etiquetar de «tiempo real» algo que no existe.
    calidad: hayValor ? calidad : CALIDAD.NO_DISPONIBLE,
    fuente,
    derivadoDe,
    confianza,
    nota,
    momento,
  };
}

/** Observación en vivo del mercado. */
const enTiempoReal = (valor, fuente, opciones = {}) =>
  marcar(valor, CALIDAD.TIEMPO_REAL, { fuente, ...opciones });

/** Observación con retardo declarado, en minutos. */
const diferido = (valor, fuente, minutos = null, opciones = {}) =>
  marcar(valor, CALIDAD.DIFERIDO, {
    fuente,
    nota: minutos ? `Retardo de ${minutos} minutos` : 'Dato diferido',
    ...opciones,
  });

/** Observación de una sesión ya cerrada. */
const historico = (valor, fuente, opciones = {}) =>
  marcar(valor, CALIDAD.HISTORICO, { fuente, ...opciones });

/**
 * Resultado de aritmética exacta sobre datos observados.
 * `derivadoDe` debe enumerar de qué datos procede, para poder rastrearlo.
 */
const calculado = (valor, derivadoDe = [], opciones = {}) =>
  marcar(valor, CALIDAD.CALCULADO, { fuente: 'Warrants & Co.', derivadoDe, ...opciones });

/**
 * Hipótesis. Exige confianza explícita: sin ella no se distingue de un hecho.
 * Una inferencia sin confianza declarada se degrada a no disponible.
 */
function inferido(valor, { confianza = null, derivadoDe = [], nota = null } = {}) {
  if (!Number.isFinite(confianza)) {
    return noDisponible('Inferencia sin grado de confianza declarado');
  }
  return marcar(valor, CALIDAD.INFERIDO, {
    fuente: 'Warrants & Co.',
    derivadoDe,
    confianza: Number(Math.max(0, Math.min(1, confianza)).toFixed(2)),
    nota,
  });
}

/** Ausencia de dato, con su motivo. */
const noDisponible = (motivo) => ({
  valor: null,
  calidad: CALIDAD.NO_DISPONIBLE,
  fuente: null,
  derivadoDe: [],
  confianza: null,
  nota: motivo ?? 'Dato no disponible',
  momento: null,
});

// ------------------------------------------------------------ comprobaciones

const esDato = (d) => Boolean(d) && typeof d === 'object' && 'calidad' in d;
const tieneValor = (d) => esDato(d) && d.valor !== null && d.calidad !== CALIDAD.NO_DISPONIBLE;
const esObservado = (d) => esDato(d) && OBSERVADAS.has(d.calidad);
const esDerivado = (d) => esDato(d) && DERIVADAS.has(d.calidad);
const esInferencia = (d) => esDato(d) && d.calidad === CALIDAD.INFERIDO;

/** Valor bruto, o el sustituto indicado si no hay dato. */
const valorDe = (d, sustituto = null) => (tieneValor(d) ? d.valor : sustituto);

/**
 * Calidad resultante de combinar varios datos.
 * Prevalece la más débil: un cálculo sobre una inferencia sigue siendo inferencia,
 * y cualquier ausencia hace inservible el conjunto.
 */
function calidadCombinada(datos) {
  const lista = Object.values(datos ?? {}).filter(esDato);
  if (!lista.length) return CALIDAD.NO_DISPONIBLE;
  if (lista.some((d) => d.calidad === CALIDAD.NO_DISPONIBLE)) return CALIDAD.NO_DISPONIBLE;
  if (lista.some((d) => d.calidad === CALIDAD.INFERIDO)) return CALIDAD.INFERIDO;
  if (lista.some((d) => d.calidad === CALIDAD.CALCULADO)) return CALIDAD.CALCULADO;
  if (lista.some((d) => d.calidad === CALIDAD.HISTORICO)) return CALIDAD.HISTORICO;
  if (lista.some((d) => d.calidad === CALIDAD.DIFERIDO)) return CALIDAD.DIFERIDO;
  return CALIDAD.TIEMPO_REAL;
}

/**
 * Ficha de procedencia de un conjunto de datos: qué se observó, qué se calculó y
 * qué se infirió. Alimenta la trazabilidad sin obligar a mostrarla.
 */
function procedencia(datos) {
  const ficha = { observado: [], calculado: [], inferido: [], ausente: [], fuentes: new Set() };
  for (const [clave, d] of Object.entries(datos ?? {})) {
    if (!esDato(d)) continue;
    if (d.fuente) ficha.fuentes.add(d.fuente);
    if (d.calidad === CALIDAD.NO_DISPONIBLE) ficha.ausente.push(clave);
    else if (d.calidad === CALIDAD.INFERIDO) ficha.inferido.push(clave);
    else if (d.calidad === CALIDAD.CALCULADO) ficha.calculado.push(clave);
    else ficha.observado.push(clave);
  }
  return { ...ficha, fuentes: [...ficha.fuentes] };
}

/**
 * Reduce un mapa de datos a sus valores brutos, para los cálculos internos que no
 * necesitan la etiqueta. La etiqueta se conserva aparte, nunca se pierde.
 */
function valores(datos) {
  const salida = {};
  for (const [clave, d] of Object.entries(datos ?? {})) {
    salida[clave] = esDato(d) ? valorDe(d) : d;
  }
  return salida;
}

module.exports = {
  CALIDAD, OBSERVADAS, DERIVADAS,
  enTiempoReal, diferido, historico, calculado, inferido, noDisponible,
  esDato, tieneValor, esObservado, esDerivado, esInferencia,
  valorDe, valores, calidadCombinada, procedencia, marcar,
};
