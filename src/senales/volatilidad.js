'use strict';

/**
 * Señal de volatilidad: volatilidad realizada de los valores en cobertura.
 *
 * Se calcula sobre rendimientos diarios reales, anualizados a 252 sesiones. Es
 * volatilidad **realizada**, no implícita: la implícita exige una cadena de opciones
 * de la que todavía no se dispone, y el rótulo lo indica para no inducir a error.
 */

const mercado = require('../market');
const { desviacionTipica, rendimientos } = require('../cartera');

const VENTANA_DIAS = 90;
const SESIONES_ANIO = 252;

const definicion = {
  clave: 'volatilidad',
  titulo: 'Volatilidad',
  familia: 'Riesgo',
  descripcion: 'Volatilidad realizada anualizada a 3 meses',
  destino: '#/cartera',
};

async function calcular({ universo = [] } = {}) {
  if (!universo.length) {
    return { disponible: false, motivo: 'Sin valores bajo cobertura', lecturas: [] };
  }

  const desde = new Date(Date.now() - VENTANA_DIAS * 86400000).toISOString().slice(0, 10);
  const resultados = await Promise.allSettled(universo.map((t) => mercado.obtenerHistorico(t, desde)));

  const lecturas = [];
  resultados.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const cierres = r.value.map((f) => f.cierre).filter(Number.isFinite);
    if (cierres.length < 20) return;

    const vol = desviacionTipica(rendimientos(cierres)) * Math.sqrt(SESIONES_ANIO) * 100;
    if (!Number.isFinite(vol)) return;

    lecturas.push({
      ticker: universo[i],
      valor: Number(vol.toFixed(1)),
      unidad: '%',
      detalle: `${cierres.length} sesiones · anualizada`,
      // Una volatilidad elevada es una advertencia, no un juicio de valor.
      sentido: vol >= 60 ? 'aviso' : vol >= 35 ? 'neutro' : 'positivo',
    });
  });

  if (!lecturas.length) {
    return { disponible: false, motivo: 'Sin histórico suficiente', lecturas: [] };
  }

  lecturas.sort((a, b) => b.valor - a.valor);
  return {
    disponible: true,
    ventanaDias: VENTANA_DIAS,
    lecturas,
    destacada: lecturas[0],
  };
}

module.exports = { ...definicion, calcular };
