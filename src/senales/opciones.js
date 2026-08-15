'use strict';

/**
 * Señal de derivados: actividad inusual en opciones sobre los valores en cobertura.
 *
 * Se apoya en el subsistema de opciones ya existente, de modo que hereda su
 * proveedor, su metodología de puntuación y su prudencia: la lectura destacada es
 * la del contrato con mayor puntuación, y solo se emite si alcanza la cobertura
 * mínima exigida por el score.
 *
 * No es «options flow»: el flujo de operaciones individuales sigue sin fuente. Esta
 * señal describe la concentración de actividad por contrato en la sesión.
 */

const opciones = require('../opciones');

const definicion = {
  clave: 'opciones',
  titulo: 'Options activity',
  familia: 'Derivados',
  descripcion: 'Contratos con actividad destacada en la sesión',
  destino: '#/opciones',
};

async function calcular({ universo = [] } = {}) {
  if (!universo.length) {
    return { disponible: false, motivo: 'Sin valores bajo cobertura', lecturas: [] };
  }

  let resultado;
  try {
    // Un margen corto basta: solo interesa el encabezado del ranking.
    resultado = await opciones.getUnusualActivity(universo, { limite: 6, minimoVolumen: 1 });
  } catch (err) {
    return { disponible: false, motivo: `Cadena de opciones no disponible: ${err.message}`, lecturas: [] };
  }

  const puntuados = (resultado.contratos ?? []).filter((c) => c.puntuacionDisponible);
  if (!puntuados.length) {
    return {
      disponible: false,
      motivo: resultado.incidencias?.[0] ?? 'Ningún contrato alcanza la cobertura mínima del score',
      lecturas: [],
    };
  }

  const lecturas = puntuados.map((c) => ({
    ticker: c.simbolo,
    valor: c.puntuacion,
    unidad: '',
    detalle: `${c.lado} ${c.strike} · ${c.senales?.[0]?.texto ?? 'actividad destacada'}`,
    // La puntuación mide lo llamativo de la actividad, no su dirección: un contrato
    // muy puntuado no es una apuesta alcista ni bajista, porque el sentido de la
    // operación sigue siendo desconocido.
    sentido: c.puntuacion >= 70 ? 'aviso' : 'neutro',
  }));

  return {
    disponible: true,
    evaluados: resultado.evaluados,
    lecturas,
    destacada: lecturas[0],
  };
}

module.exports = { ...definicion, calcular };
