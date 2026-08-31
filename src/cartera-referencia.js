'use strict';

/**
 * Resultado de `calcularCartera()`, calculado UNA vez por petición.
 *
 * Varias rutas necesitan cruzar contra el estado real de la cartera —compañías
 * para `portfolioStatus`, catalizadores para lo mismo por evento— y ninguna
 * debe traer su propia copia de "cómo se llama a calcularCartera()": eso sería
 * el mismo hecho calculado en dos sitios, la regla 9 al revés. Se extrajo aquí
 * cuando el segundo consumidor (catalizadores) iba a duplicar exactamente lo
 * que ya existía en `routes/companias.js`.
 */

const { calcularCartera } = require('./cartera');
const { lineasDeCartera } = require('./routes/mercado');

/**
 * @returns {Promise<object|null>} el resultado de `calcularCartera()`, o
 *   `null` si no hay cartera que calcular o el motor falla —nunca tumba a
 *   quien lo llama por un fallo ajeno a su propia responsabilidad.
 */
async function carteraDeReferencia() {
  const lineas = lineasDeCartera();
  if (!lineas.length) return null;
  try {
    return await calcularCartera(lineas);
  } catch {
    return null;
  }
}

module.exports = { carteraDeReferencia };
