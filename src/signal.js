'use strict';

/**
 * W&C Signal — arquitectura del indicador propietario.
 *
 * El indicador resume en una escala 0–100 la lectura conjunta de siete dimensiones.
 * Esta pieza define **la estructura**, no la puntuación: mientras una dimensión no
 * disponga de fuente contrastada, no se puntúa. El resultado global solo se emite
 * cuando todas las dimensiones con peso están cubiertas, de modo que la plataforma
 * nunca publica un número que no pueda justificar.
 *
 * Activar una dimensión consiste en dotarla de `evaluar(contexto)`, que debe
 * devolver `{ puntuacion: 0..100, detalle }`. El agregado se calcula solo.
 */

const DIMENSIONES = [
  { clave: 'fundamentales', titulo: 'Fundamentals', peso: 0.25, requiere: 'Requiere estados financieros normalizados' },
  { clave: 'opciones', titulo: 'Options flow', peso: 0.15, requiere: 'Requiere un proveedor de cadena de opciones' },
  { clave: 'institucional', titulo: 'Institutional positioning', peso: 0.15, requiere: 'Requiere la fuente de declaraciones 13F' },
  { clave: 'catalizadores', titulo: 'Catalysts', peso: 0.10, requiere: 'Requiere un calendario de eventos corporativos' },
  { clave: 'valoracion', titulo: 'Valuation', peso: 0.15, requiere: 'Requiere múltiplos comparables del sector' },
  { clave: 'momento', titulo: 'Momentum', peso: 0.10, requiere: null },
  { clave: 'riesgo', titulo: 'Risk', peso: 0.10, requiere: null },
];

/**
 * Evalúa el indicador para un valor.
 *
 * @param {string} ticker
 * @param {object} contexto  lecturas ya calculadas por el radar
 * @returns {{ticker, puntuacion: number|null, disponible: boolean, cobertura: number, dimensiones: Array}}
 */
function evaluar(ticker, contexto = {}) {
  const { momentum = null, volatilidad = null } = contexto;

  const dimensiones = DIMENSIONES.map((d) => {
    // Las dos dimensiones derivables de precio ya tienen lectura real; el resto,
    // no. Se expone la lectura sin convertirla en puntuación mientras el modelo
    // completo no esté cerrado.
    if (d.clave === 'momento' && momentum) {
      return {
        ...d, disponible: true, puntuacion: null,
        lectura: momentum.valor, unidad: momentum.unidad, detalle: momentum.detalle,
      };
    }
    if (d.clave === 'riesgo' && volatilidad) {
      return {
        ...d, disponible: true, puntuacion: null,
        lectura: volatilidad.valor, unidad: volatilidad.unidad, detalle: volatilidad.detalle,
      };
    }
    return { ...d, disponible: false, puntuacion: null, lectura: null, detalle: d.requiere };
  });

  const conFuente = dimensiones.filter((d) => d.disponible);
  const cobertura = conFuente.reduce((a, d) => a + d.peso, 0);

  // El agregado exige cobertura completa: un score parcial induciría a error.
  const completo = dimensiones.every((d) => Number.isFinite(d.puntuacion));

  return {
    ticker,
    disponible: completo,
    puntuacion: completo
      ? Number(dimensiones.reduce((a, d) => a + d.puntuacion * d.peso, 0).toFixed(1))
      : null,
    motivo: completo ? null : 'Modelo en construcción: faltan fuentes por conectar',
    cobertura: Number((cobertura * 100).toFixed(0)),
    dimensiones,
    escala: { minimo: 0, maximo: 100 },
  };
}

module.exports = { evaluar, DIMENSIONES };
