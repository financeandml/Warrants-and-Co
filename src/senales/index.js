'use strict';

/**
 * W&C Radar — arquitectura de señales.
 *
 * Cada señal es un módulo independiente que declara si dispone de fuente de datos.
 * Las que la tienen devuelven una lectura derivada de precios o registros reales;
 * las que todavía no, devuelven `disponible: false` con el motivo, y la interfaz
 * las rotula como pendientes. En ningún caso se fabrica una lectura.
 *
 * Incorporar una señal nueva consiste en añadir su módulo al registro: no hay que
 * tocar la ruta, ni el cliente, ni las demás señales.
 */

const opcionesSenal = require('./opciones');
const momentum = require('./momentum');
const volatilidad = require('./volatilidad');
const noticias = require('./noticias');
const pendientes = require('./pendientes');

/** Orden de presentación en el radar. */
const REGISTRO = [
  opcionesSenal,
  pendientes.institucional,
  momentum,
  volatilidad,
  pendientes.catalizador,
  noticias,
];

/**
 * Resuelve todas las señales. Un módulo que falle se degrada a «no disponible»
 * en lugar de tumbar el radar completo.
 *
 * @param {object} contexto  { universo } tickers bajo cobertura
 */
async function obtenerSenales(contexto = {}) {
  const resultados = await Promise.allSettled(
    REGISTRO.map((s) => (typeof s.calcular === 'function' ? s.calcular(contexto) : null))
  );

  return REGISTRO.map((definicion, i) => {
    const base = {
      clave: definicion.clave,
      titulo: definicion.titulo,
      familia: definicion.familia,
      descripcion: definicion.descripcion,
      destino: definicion.destino ?? null,
    };

    const r = resultados[i];
    if (r.status !== 'fulfilled' || !r.value) {
      return { ...base, disponible: false, motivo: r.reason?.message ?? 'Sin fuente de datos', lecturas: [] };
    }
    return { ...base, ...r.value };
  });
}

module.exports = { obtenerSenales, REGISTRO };
