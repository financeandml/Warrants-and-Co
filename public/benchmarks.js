/* ============================================================================
   Alineado y rebase de series de benchmark contra la cartera.

   Dos responsabilidades, y solo dos:

     1. Alinear temporalmente una serie de benchmark contra el calendario de la
        cartera. La cartera es la maestra —un LEFT JOIN con ella como tabla de
        la izquierda—: para cada fecha de la cartera se toma el precio del
        benchmark de ese mismo día o, si ese día no cotizó, el último precio
        válido anterior. Si no hay ningún precio anterior tampoco, ese punto
        queda SIN valor de ese benchmark — nunca en cero, nunca interpolado.

     2. Rebasar una serie a 100 en su primer punto CON valor, para comparar
        series que arrancan en niveles distintos.

   Pintar el gráfico, pedir series por red o decidir qué benchmarks están
   activos es cosa de `app.js`; este módulo no conoce el DOM ni `fetch`.
   ========================================================================= */
'use strict';

/**
 * @param {Array<{fecha: string, valor: number}>} serieCartera La maestra.
 * @param {Array<{fecha: string, valor: number}>} serieBenchmark Crudo, sin alinear.
 * @returns {Array<{fecha: string, valor: number|null}>} Misma longitud y mismas
 *   fechas que `serieCartera`. `valor` es `null` cuando ni ese día ni ninguno
 *   anterior tienen precio del benchmark.
 */
export function alinearContraMaestra(serieCartera, serieBenchmark) {
  const puntos = (serieBenchmark ?? [])
    .filter((p) => p?.fecha && Number.isFinite(p.valor))
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  let cursor = 0;
  let ultimoValido = null;
  const resultado = [];
  for (const { fecha } of serieCartera ?? []) {
    // Avanza el cursor mientras la siguiente cotización del benchmark no sea
    // posterior a `fecha`: es el "último precio válido anterior o igual".
    while (cursor < puntos.length && puntos[cursor].fecha <= fecha) {
      ultimoValido = puntos[cursor].valor;
      cursor++;
    }
    resultado.push({ fecha, valor: Number.isFinite(ultimoValido) ? ultimoValido : null });
  }
  return resultado;
}

/**
 * Rebasa una serie a 100 en su primer punto con valor. Los puntos anteriores a
 * ese primer valor —si los hubiera— y los que ya llegaban sin valor se dejan
 * en `null`: no hay base contra la que expresarlos.
 */
export function rebasarBase100(serie) {
  if (!serie?.length) return [];
  const base = serie.find((p) => Number.isFinite(p.valor))?.valor;
  if (!Number.isFinite(base) || base === 0) {
    return serie.map((p) => ({ fecha: p.fecha, valor: null }));
  }
  return serie.map((p) => ({
    fecha: p.fecha,
    valor: Number.isFinite(p.valor) ? (p.valor / base) * 100 : null,
  }));
}
