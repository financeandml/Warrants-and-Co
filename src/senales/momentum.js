'use strict';

/**
 * Señal de momento: fuerza relativa de los valores en cobertura frente al índice.
 *
 * La lectura se deriva por completo de series de precios reales —las mismas que
 * alimentan el gráfico de la cartera—, no de una estimación. Se calcula el
 * rendimiento del valor y el del índice sobre la misma ventana y se compara.
 */

const mercado = require('../market');

const VENTANA_DIAS = 90;
const BENCHMARK = 'SPY';

const definicion = {
  clave: 'momentum',
  titulo: 'Momentum',
  familia: 'Precio',
  descripcion: 'Fuerza relativa a 3 meses frente al S&P 500',
  destino: '#/cartera',
};

/** Rendimiento porcentual entre el primer y el último cierre de una serie. */
function rendimiento(serie) {
  if (!Array.isArray(serie) || serie.length < 2) return null;
  const primero = serie[0].cierre;
  const ultimo = serie[serie.length - 1].cierre;
  if (!(primero > 0)) return null;
  return (ultimo / primero - 1) * 100;
}

async function calcular({ universo = [] } = {}) {
  if (!universo.length) {
    return { disponible: false, motivo: 'Sin valores bajo cobertura', lecturas: [] };
  }

  const desde = new Date(Date.now() - VENTANA_DIAS * 86400000).toISOString().slice(0, 10);

  const [resIndice, ...resValores] = await Promise.allSettled([
    mercado.obtenerHistorico(BENCHMARK, desde),
    ...universo.map((t) => mercado.obtenerHistorico(t, desde)),
  ]);

  const rendIndice = resIndice.status === 'fulfilled' ? rendimiento(resIndice.value) : null;
  if (rendIndice === null) {
    return { disponible: false, motivo: 'Índice de referencia no disponible', lecturas: [] };
  }

  const lecturas = [];
  resValores.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const rend = rendimiento(r.value);
    if (rend === null) return;
    lecturas.push({
      ticker: universo[i],
      valor: Number((rend - rendIndice).toFixed(2)),
      unidad: 'pp',
      detalle: `${rend >= 0 ? '+' : '−'}${Math.abs(rend).toFixed(1)} % frente a ${rendIndice >= 0 ? '+' : '−'}${Math.abs(rendIndice).toFixed(1)} % del índice`,
      sentido: rend - rendIndice > 0 ? 'positivo' : rend - rendIndice < 0 ? 'negativo' : 'neutro',
    });
  });

  if (!lecturas.length) {
    return { disponible: false, motivo: 'Sin histórico suficiente', lecturas: [] };
  }

  // Encabeza el valor con mayor fuerza relativa.
  lecturas.sort((a, b) => b.valor - a.valor);
  return {
    disponible: true,
    ventanaDias: VENTANA_DIAS,
    referencia: BENCHMARK,
    lecturas,
    destacada: lecturas[0],
  };
}

module.exports = { ...definicion, calcular };
