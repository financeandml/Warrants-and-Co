'use strict';

/**
 * W&C Unusual Activity Score — escala 0–100.
 *
 * ═══ Principio de diseño ═══
 * Cada factor es una pieza independiente que declara si dispone del dato que
 * necesita. La puntuación solo se calcula sobre los factores con dato; sus pesos se
 * renormalizan entre ellos y **la cobertura resultante se publica siempre**. Si la
 * cobertura no alcanza el mínimo exigible, no se emite puntuación: una cifra
 * sostenida por una fracción de la metodología induciría a error.
 *
 * Los pesos son una primera aproximación explícita, no un modelo validado. Están
 * concentrados aquí para poder revisarlos sin tocar nada más.
 *
 * ═══ Estado de los diez factores ═══
 *   1 Volumen frente a interés abierto ....... operativo
 *   2 Importe negociado ...................... operativo (derivado)
 *   3 Volumen relativo ....................... requiere histórico acumulado
 *   4 Variación de volatilidad implícita ..... requiere IV del proveedor
 *   5 Tamaño de la operación ................. requiere operaciones individuales
 *   6 Distancia al precio del subyacente ..... operativo
 *   7 Días hasta el vencimiento .............. operativo
 *   8 Desequilibrio entre calls y puts ....... operativo
 *   9 Actividad histórica del contrato ....... requiere histórico acumulado
 *  10 Agresividad de la ejecución ............ requiere contexto de horquilla
 */

const { CALIDAD } = require('./calidad');

/**
 * Origen del dato que alimenta cada factor. Declara de qué depende y, por tanto,
 * qué haría falta para activarlo.
 */
const ORIGEN = {
  CADENA: 'chain',                    // agregados de la sesión
  HISTORICO: 'historical',            // archivo propio acumulado
  OPERACIONES: 'trades',              // time & sales del proveedor
  COTIZACIONES: 'quotes',             // horquilla con marca temporal
  VOLATILIDAD: 'implied_volatility',  // IV publicada por el proveedor
};

/** Cobertura mínima de pesos para emitir puntuación. */
const COBERTURA_MINIMA = 0.45;

/** Acota un valor al rango 0–100. */
const acotar = (v) => Math.max(0, Math.min(100, v));

/**
 * Interpolación logarítmica entre dos referencias.
 * Las magnitudes de opciones abarcan varios órdenes de magnitud —de miles a decenas
 * de millones—, de modo que una escala lineal aplastaría todo el rango bajo.
 */
function escalaLog(valor, minimo, maximo) {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  if (valor <= minimo) return 0;
  if (valor >= maximo) return 100;
  return acotar(((Math.log(valor) - Math.log(minimo)) / (Math.log(maximo) - Math.log(minimo))) * 100);
}

/** Días naturales hasta una fecha ISO. */
function diasHasta(fechaISO) {
  if (!fechaISO) return null;
  const destino = new Date(`${fechaISO}T00:00:00Z`);
  if (Number.isNaN(destino.getTime())) return null;
  const hoy = new Date();
  const dias = Math.round((destino - Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())) / 86400000);
  return dias;
}

// ══════════════════════════════ Los diez factores ═════════════════════════════

const FACTORES = [
  {
    clave: 'volumenSobreInteres',
    titulo: 'Volume / Open Interest',
    origen: [ORIGEN.CADENA],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Volumen de la sesión frente al interés abierto acumulado.',
    peso: 0.24,
    evaluar({ volumen, interesAbierto }) {
      // Un interés abierto de cero no permite el cociente: no es un ratio infinito,
      // es un dato que no puede calcularse.
      if (!Number.isFinite(volumen) || !Number.isFinite(interesAbierto)) {
        return { disponible: false, motivo: 'Sin volumen o interés abierto publicados.' };
      }
      if (interesAbierto <= 0) {
        return { disponible: false, motivo: 'Interés abierto nulo: el cociente no es calculable.' };
      }
      if (volumen <= 0) {
        return { disponible: true, puntuacion: 0, lectura: 0, unidad: 'x', detalle: 'Sin negociación en la sesión.' };
      }
      const ratio = volumen / interesAbierto;
      // Referencia: la paridad (1x) no llama la atención; diez veces el interés
      // abierto es un desvío marcado.
      return {
        disponible: true,
        puntuacion: escalaLog(ratio, 0.5, 10),
        lectura: Number(ratio.toFixed(2)),
        unidad: 'x',
        detalle: `${volumen.toLocaleString('es-ES')} contratos sobre ${interesAbierto.toLocaleString('es-ES')} abiertos.`,
      };
    },
  },

  {
    clave: 'importeNegociado',
    titulo: 'Premium traded',
    origen: [ORIGEN.CADENA],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Importe nocional negociado en el contrato durante la sesión.',
    peso: 0.22,
    evaluar({ importeNegociado }) {
      if (!Number.isFinite(importeNegociado) || importeNegociado <= 0) {
        return { disponible: false, motivo: 'Sin precio o volumen para calcular el importe.' };
      }
      // Referencia: por debajo de 25.000 USD el contrato es residual; por encima de
      // 10 millones la operación es de tamaño institucional.
      return {
        disponible: true,
        puntuacion: escalaLog(importeNegociado, 25_000, 10_000_000),
        lectura: importeNegociado,
        unidad: 'USD',
        detalle: 'Volumen × último precio × multiplicador.',
      };
    },
  },

  {
    clave: 'distanciaPrecio',
    titulo: 'Distance from current price',
    origen: [ORIGEN.CADENA],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Separación entre el precio de ejercicio y la cotización del subyacente.',
    peso: 0.16,
    evaluar({ strike, precioSubyacente, lado }) {
      if (!Number.isFinite(strike) || !Number.isFinite(precioSubyacente) || precioSubyacente <= 0) {
        return { disponible: false, motivo: 'Sin precio del subyacente o de ejercicio.' };
      }
      const separacion = (strike - precioSubyacente) / precioSubyacente;
      // Se mide cuán fuera del dinero está: la actividad concentrada lejos del precio
      // es más llamativa que la que rodea al dinero, donde siempre hay negociación.
      const fueraDelDinero = lado === 'CALL' ? separacion : -separacion;
      const porcentaje = fueraDelDinero * 100;

      if (porcentaje <= 0) {
        return {
          disponible: true, puntuacion: 5,
          lectura: Number(porcentaje.toFixed(2)), unidad: '%',
          detalle: 'Contrato dentro del dinero.',
        };
      }
      return {
        disponible: true,
        // Entre un 2 % y un 40 % fuera del dinero se recorre toda la escala.
        puntuacion: escalaLog(porcentaje, 2, 40),
        lectura: Number(porcentaje.toFixed(2)),
        unidad: '%',
        detalle: `${porcentaje.toFixed(1)} % fuera del dinero.`,
      };
    },
  },

  {
    clave: 'diasVencimiento',
    titulo: 'Days to expiration',
    origen: [ORIGEN.CADENA],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Plazo restante hasta el vencimiento del contrato.',
    peso: 0.14,
    evaluar({ vencimiento }) {
      const dias = diasHasta(vencimiento);
      if (dias === null) return { disponible: false, motivo: 'Sin fecha de vencimiento.' };
      if (dias < 0) return { disponible: false, motivo: 'Contrato ya vencido.' };
      // Un plazo corto concentra el riesgo: la misma actividad resulta más
      // significativa a una semana que a un año.
      const puntuacion = dias <= 7 ? 100 : dias >= 180 ? 10 : acotar(100 - ((dias - 7) / 173) * 90);
      return {
        disponible: true,
        puntuacion,
        lectura: dias,
        unidad: 'd',
        detalle: dias === 0 ? 'Vence hoy.' : `Vence en ${dias} día${dias === 1 ? '' : 's'}.`,
      };
    },
  },

  {
    clave: 'desequilibrioCallPut',
    titulo: 'Call / Put imbalance',
    origen: [ORIGEN.CADENA],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Concentración del volumen del subyacente en un lado del mercado.',
    peso: 0.10,
    evaluar({ volumenCallsSubyacente, volumenPutsSubyacente }) {
      if (!Number.isFinite(volumenCallsSubyacente) || !Number.isFinite(volumenPutsSubyacente)) {
        return { disponible: false, motivo: 'Sin volumen agregado por lado.' };
      }
      const total = volumenCallsSubyacente + volumenPutsSubyacente;
      if (total <= 0) return { disponible: false, motivo: 'Sin actividad agregada en la sesión.' };

      const proporcion = volumenCallsSubyacente / total;
      // Se puntúa la desviación respecto del reparto equilibrado, en cualquier sentido.
      const desviacion = Math.abs(proporcion - 0.5) * 2;
      return {
        disponible: true,
        puntuacion: acotar(desviacion * 100),
        lectura: Number((proporcion * 100).toFixed(1)),
        unidad: '% calls',
        detalle: `${(proporcion * 100).toFixed(0)} % del volumen en calls.`,
      };
    },
  },

  // ── Factores con arquitectura lista, a la espera de su fuente ──

  {
    clave: 'volumenRelativo',
    titulo: 'Relative volume',
    origen: [ORIGEN.CADENA, ORIGEN.HISTORICO],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Volumen de la sesión frente a la media reciente del propio contrato.',
    peso: 0.05,
    requiere: 'Requiere histórico acumulado de sesiones anteriores',
    evaluar({ volumen, volumenMedioHistorico }) {
      if (!Number.isFinite(volumenMedioHistorico) || volumenMedioHistorico <= 0) {
        return { disponible: false, motivo: 'Aún no hay histórico suficiente del contrato.' };
      }
      if (!Number.isFinite(volumen)) return { disponible: false, motivo: 'Sin volumen de la sesión.' };
      const ratio = volumen / volumenMedioHistorico;
      return {
        disponible: true,
        puntuacion: escalaLog(ratio, 1, 15),
        lectura: Number(ratio.toFixed(2)),
        unidad: 'x',
        detalle: `Frente a una media de ${Math.round(volumenMedioHistorico).toLocaleString('es-ES')} contratos.`,
      };
    },
  },

  {
    clave: 'variacionVolatilidad',
    titulo: 'Implied volatility change',
    origen: [ORIGEN.VOLATILIDAD, ORIGEN.HISTORICO],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Variación de la volatilidad implícita del contrato.',
    peso: 0.05,
    requiere: 'Requiere que el proveedor publique volatilidad implícita',
    evaluar({ volatilidadImplicita, volatilidadImplicitaPrevia }) {
      if (!Number.isFinite(volatilidadImplicita) || !Number.isFinite(volatilidadImplicitaPrevia)) {
        return { disponible: false, motivo: 'El proveedor no publica volatilidad implícita.' };
      }
      const variacion = ((volatilidadImplicita - volatilidadImplicitaPrevia) / volatilidadImplicitaPrevia) * 100;
      return {
        disponible: true,
        puntuacion: escalaLog(Math.abs(variacion), 3, 60),
        lectura: Number(variacion.toFixed(1)),
        unidad: '%',
        detalle: `Volatilidad implícita ${variacion >= 0 ? 'al alza' : 'a la baja'}.`,
      };
    },
  },

  {
    clave: 'tamanoOperacion',
    titulo: 'Trade size',
    origen: [ORIGEN.OPERACIONES],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Tamaño de la operación individual frente al habitual del contrato.',
    peso: 0.02,
    requiere: 'Requiere operaciones individuales (time & sales)',
    evaluar({ tamanoOperacion, tamanoMedio }) {
      if (!Number.isFinite(tamanoOperacion) || !Number.isFinite(tamanoMedio) || tamanoMedio <= 0) {
        return { disponible: false, motivo: 'El proveedor no publica operaciones individuales.' };
      }
      return {
        disponible: true,
        puntuacion: escalaLog(tamanoOperacion / tamanoMedio, 1, 20),
        lectura: tamanoOperacion,
        unidad: 'contratos',
        detalle: `Frente a un tamaño medio de ${Math.round(tamanoMedio)}.`,
      };
    },
  },

  {
    clave: 'actividadHistorica',
    titulo: 'Historical activity',
    origen: [ORIGEN.HISTORICO],
    calidadResultado: CALIDAD.CALCULADO,
    descripcion: 'Comportamiento del contrato frente a su propio historial.',
    peso: 0.01,
    requiere: 'Requiere histórico acumulado de sesiones anteriores',
    evaluar({ percentilHistorico }) {
      if (!Number.isFinite(percentilHistorico)) {
        return { disponible: false, motivo: 'Aún no hay histórico suficiente del contrato.' };
      }
      return {
        disponible: true,
        puntuacion: acotar(percentilHistorico),
        lectura: Number(percentilHistorico.toFixed(0)),
        unidad: 'pct',
        detalle: `Percentil ${percentilHistorico.toFixed(0)} de su propia serie.`,
      };
    },
  },

  {
    clave: 'agresividad',
    titulo: 'Aggressiveness of trade',
    origen: [ORIGEN.OPERACIONES, ORIGEN.COTIZACIONES],
    calidadResultado: CALIDAD.INFERIDO,
    descripcion: 'Posición del cruce dentro de la horquilla vigente.',
    peso: 0.01,
    requiere: 'Requiere el bid/ask vigente en el instante de cada operación',
    evaluar({ posicionEnHorquilla }) {
      if (!Number.isFinite(posicionEnHorquilla)) {
        return { disponible: false, motivo: 'Sin contexto de horquilla en el momento de la operación.' };
      }
      // Los extremos de la horquilla denotan urgencia; el punto medio, negociación.
      return {
        disponible: true,
        puntuacion: acotar(Math.abs(posicionEnHorquilla - 0.5) * 200),
        lectura: Number(posicionEnHorquilla.toFixed(2)),
        unidad: '',
        detalle: 'Distancia del cruce al punto medio de la horquilla.',
      };
    },
  },
];

/**
 * Calcula la puntuación de actividad inusual de un contrato.
 *
 * @param {object} contexto  datos del contrato y de su subyacente
 * @returns {{puntuacion: number|null, disponible: boolean, cobertura: number, factores: Array, senales: Array}}
 */
function calculateUnusualActivityScore(contexto = {}) {
  const evaluados = FACTORES.map((factor) => {
    let resultado;
    try {
      resultado = factor.evaluar(contexto) ?? { disponible: false, motivo: 'Sin resultado.' };
    } catch (err) {
      resultado = { disponible: false, motivo: `Error al evaluar: ${err.message}` };
    }
    const operativo = resultado.disponible && Number.isFinite(resultado.puntuacion);
    return {
      clave: factor.clave,
      titulo: factor.titulo,
      descripcion: factor.descripcion,
      peso: factor.peso,
      requiere: factor.requiere ?? null,
      ...resultado,
      puntuacion: operativo ? Number(acotar(resultado.puntuacion).toFixed(1)) : null,

      // Triada exigida: qué vale, de dónde sale y en qué estado está.
      value: operativo ? (resultado.lectura ?? null) : null,
      source: factor.origen ?? [],
      // El resultado de un factor lo produce la plataforma: nunca es dato de mercado.
      status: operativo ? (factor.calidadResultado ?? CALIDAD.CALCULADO) : CALIDAD.NO_DISPONIBLE,
    };
  });

  const conDato = evaluados.filter((f) => f.disponible && Number.isFinite(f.puntuacion));
  const pesoCubierto = conDato.reduce((a, f) => a + f.peso, 0);
  const cobertura = Number((pesoCubierto * 100).toFixed(0));

  if (!conDato.length || pesoCubierto < COBERTURA_MINIMA) {
    return {
      puntuacion: null,
      disponible: false,
      cobertura,
      coberturaMinima: COBERTURA_MINIMA * 100,
      motivo: conDato.length
        ? `Cobertura insuficiente: ${cobertura} % de la metodología, por debajo del ${COBERTURA_MINIMA * 100} % exigido.`
        : 'Ningún factor dispone de datos.',
      factores: evaluados,
      senales: [],
    };
  }

  // Los pesos se renormalizan entre los factores con dato: la puntuación se expresa
  // siempre en la escala completa, acompañada de su cobertura.
  const puntuacion = conDato.reduce((a, f) => a + f.puntuacion * (f.peso / pesoCubierto), 0);

  return {
    puntuacion: Number(puntuacion.toFixed(1)),
    disponible: true,
    cobertura,
    coberturaMinima: COBERTURA_MINIMA * 100,
    motivo: null,
    factores: evaluados,
    senales: construirSenales(evaluados, contexto),
  };
}

/**
 * Señales legibles. Solo se emiten las que se sostienen sobre un factor con dato:
 * ninguna afirmación se genera sin la cifra que la respalda.
 */
function construirSenales(evaluados, contexto) {
  const senales = [];
  const de = (clave) => evaluados.find((f) => f.clave === clave);

  const vsoi = de('volumenSobreInteres');
  if (vsoi?.disponible && vsoi.lectura >= 1) {
    senales.push({
      texto: `El volumen ${vsoi.lectura >= 2 ? 'supera con holgura' : 'supera'} al interés abierto (${vsoi.lectura}x)`,
      intensidad: vsoi.lectura >= 3 ? 'alta' : 'media',
      factor: vsoi.clave,
    });
  }

  const importe = de('importeNegociado');
  if (importe?.disponible && importe.lectura >= 1_000_000) {
    senales.push({
      texto: `Importe negociado elevado: ${(importe.lectura / 1_000_000).toFixed(1)} M USD`,
      intensidad: importe.lectura >= 5_000_000 ? 'alta' : 'media',
      factor: importe.clave,
    });
  }

  const dte = de('diasVencimiento');
  if (dte?.disponible && dte.lectura <= 14) {
    senales.push({
      texto: `Vencimiento próximo: ${dte.lectura} día${dte.lectura === 1 ? '' : 's'}`,
      intensidad: dte.lectura <= 5 ? 'alta' : 'media',
      factor: dte.clave,
    });
  }

  const distancia = de('distanciaPrecio');
  if (distancia?.disponible && distancia.lectura >= 10) {
    senales.push({
      texto: `Actividad concentrada lejos del dinero (${distancia.lectura.toFixed(0)} %)`,
      intensidad: distancia.lectura >= 25 ? 'alta' : 'media',
      factor: distancia.clave,
    });
  }

  const desequilibrio = de('desequilibrioCallPut');
  if (desequilibrio?.disponible && Math.abs(desequilibrio.lectura - 50) >= 20) {
    const enCalls = desequilibrio.lectura > 50;
    senales.push({
      texto: `La actividad del subyacente se concentra en ${enCalls ? 'calls' : 'puts'} (${desequilibrio.lectura.toFixed(0)} % calls)`,
      intensidad: Math.abs(desequilibrio.lectura - 50) >= 35 ? 'alta' : 'media',
      factor: desequilibrio.clave,
    });
  }

  return senales;
}

module.exports = {
  calculateUnusualActivityScore,
  FACTORES,
  ORIGEN,
  COBERTURA_MINIMA,
  escalaLog,
  diasHasta,
};
