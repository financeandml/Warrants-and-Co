'use strict';

/**
 * Panorama de mercado: los indices de referencia que encabezan el cuadro de mando.
 *
 * Se apoya integramente en la capa de mercado existente, de modo que hereda su
 * cascada de proveedores y su cache. Un indice que no resuelve no interrumpe al
 * resto: se devuelve marcado como no disponible y la interfaz lo rotula «N/A».
 */

const mercado = require('../market');

/**
 * Simbolos verificados uno a uno contra el proveedor. No deben sustituirse a la
 * ligera: varios candidatos aparentemente equivalentes (COMP, DJIA) resuelven a
 * valores distintos de los indices que representan.
 *
 * `simboloHistorico` es el ticker que reconoce el endpoint de graficos de
 * Yahoo Finance para el propio indice —lleva el circunflejo de su convencion,
 * distinto del que usa la cotizacion en vivo—. Sin el, `/api/mercado/serie`
 * pedia el historico con el simbolo de cotizacion y el proveedor nunca lo
 * reconocia como una serie de indice.
 */
const INDICES = [
  { clave: 'sp500', simbolo: 'SPX', simboloHistorico: '^GSPC', nombre: 'S&P 500', formato: 'indice' },
  { clave: 'nasdaq', simbolo: 'NDX', simboloHistorico: '^NDX', nombre: 'Nasdaq 100', formato: 'indice' },
  { clave: 'vix', simbolo: 'VIX', simboloHistorico: '^VIX', nombre: 'VIX', formato: 'indice', nota: 'Volatilidad implícita' },
  { clave: 'treasury10', simbolo: 'US10Y', simboloHistorico: '^TNX', nombre: 'Bono EE. UU. 10 años', formato: 'tipo' },
];

/**
 * Resuelve el panorama completo.
 * @returns {Promise<{indices: Array, generadoEn: string}>}
 */
async function obtenerIndices() {
  const resultados = await Promise.allSettled(
    INDICES.map((i) => mercado.obtenerCotizacion(i.simbolo))
  );

  const indices = INDICES.map((definicion, i) => {
    const r = resultados[i];
    if (r.status !== 'fulfilled') {
      return {
        ...definicion,
        disponible: false,
        motivo: r.reason?.message ?? 'No disponible',
        valor: null,
        variacion: null,
        variacionPct: null,
      };
    }
    const q = r.value;
    return {
      ...definicion,
      disponible: true,
      valor: q.precio,
      variacion: q.variacion,
      variacionPct: q.variacionPct,
      cierreAnterior: q.cierreAnterior,
      nombreProveedor: q.nombre,
      fuente: q.fuente,
      momento: q.momento,
      // Igual que en la cartera: `momento` no significa lo mismo en todos los
      // proveedores, y quien lo enseñe necesita saber cual tiene delante.
      momentoDeMercado: Boolean(q.momentoDeMercado),
      estadoMercado: q.estadoMercado ?? null,
    };
  });

  return { indices, generadoEn: new Date().toISOString() };
}

module.exports = { obtenerIndices, INDICES };
