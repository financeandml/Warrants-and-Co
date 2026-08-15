'use strict';

/**
 * Clasificación de actividad en opciones.
 *
 * Dos principios rigen este módulo:
 *
 *   1. Una inferencia nunca se presenta como un hecho. Cada resultado viaja con su
 *      grado de certeza —CONOCIDO, INFERIDO o DESCONOCIDO— y con el motivo por el
 *      que no se puede afirmar más.
 *   2. Que un contrato sea CALL no implica que alguien lo haya comprado. Determinar
 *      el sentido exige el precio de ejecución frente al bid/ask vigente en ese
 *      instante, y eso requiere un feed de operaciones que hoy no tenemos.
 *
 * Mientras el proveedor activo no publique operaciones individuales, el sentido y
 * el carácter de apertura o cierre se devuelven como DESCONOCIDO.
 */

/** Grados de certeza. */
const CERTEZA = {
  CONOCIDO: 'KNOWN',
  INFERIDO: 'INFERRED',
  DESCONOCIDO: 'UNKNOWN',
};

const SENTIDO = {
  COMPRA_CALL: 'BUY CALL',
  VENTA_CALL: 'SELL CALL',
  COMPRA_PUT: 'BUY PUT',
  VENTA_PUT: 'SELL PUT',
  DESCONOCIDO: 'UNKNOWN',
};

const MODALIDAD = {
  BARRIDO: 'SWEEP',
  BLOQUE: 'BLOCK',
  SIMPLE: 'SINGLE',
  MULTIPATA: 'MULTI-LEG',
  DESCONOCIDA: 'UNKNOWN',
};

const POSICION = {
  APERTURA: 'OPENING',
  CIERRE: 'CLOSING',
  DESCONOCIDA: 'UNKNOWN',
};

/**
 * Sentido de una operación a partir de su precio de ejecución frente a la horquilla.
 *
 * Solo puede afirmarse con el precio de la operación y el bid/ask **de ese instante**.
 * Con datos agregados de sesión —un último precio y una horquilla de cierre— la
 * comparación no significa nada: el último precio pudo cruzarse horas antes con una
 * horquilla distinta. Por eso se exige `contextoInstantaneo`.
 *
 * @param {object} operacion { precio, compra, venta, lado, contextoInstantaneo }
 */
function clasificarSentido(operacion = {}) {
  const { precio, compra, venta, lado, contextoInstantaneo = false } = operacion;

  if (!contextoInstantaneo) {
    return {
      sentido: SENTIDO.DESCONOCIDO,
      certeza: CERTEZA.DESCONOCIDO,
      motivo:
        'Determinar el sentido exige el precio de la operación frente al bid/ask vigente ' +
        'en ese mismo instante. El proveedor actual publica agregados de sesión.',
      confianza: 0,
    };
  }

  if (![precio, compra, venta].every(Number.isFinite) || venta <= compra) {
    return {
      sentido: SENTIDO.DESCONOCIDO,
      certeza: CERTEZA.DESCONOCIDO,
      motivo: 'Horquilla o precio de ejecución no utilizables.',
      confianza: 0,
    };
  }

  const horquilla = venta - compra;
  const medio = (compra + venta) / 2;
  // Posición del cruce dentro de la horquilla: 0 en la demanda, 1 en la oferta.
  const posicion = (precio - compra) / horquilla;

  const esCall = lado === 'CALL';
  let sentido = SENTIDO.DESCONOCIDO;
  let certeza = CERTEZA.DESCONOCIDO;
  let confianza = 0;
  let motivo = 'El cruce se produce en mitad de la horquilla: no es concluyente.';

  if (posicion >= 0.85) {
    sentido = esCall ? SENTIDO.COMPRA_CALL : SENTIDO.COMPRA_PUT;
    certeza = posicion >= 0.99 ? CERTEZA.CONOCIDO : CERTEZA.INFERIDO;
    confianza = Math.min(1, posicion);
    motivo = 'La operación se cruza contra la oferta: iniciativa compradora.';
  } else if (posicion <= 0.15) {
    sentido = esCall ? SENTIDO.VENTA_CALL : SENTIDO.VENTA_PUT;
    certeza = posicion <= 0.01 ? CERTEZA.CONOCIDO : CERTEZA.INFERIDO;
    confianza = Math.min(1, 1 - posicion);
    motivo = 'La operación se cruza contra la demanda: iniciativa vendedora.';
  }

  return { sentido, certeza, confianza: Number(confianza.toFixed(2)), motivo, posicionEnHorquilla: Number(posicion.toFixed(3)), precioMedio: medio };
}

/**
 * Modalidad de la operación: barrido, bloque, simple o multipata.
 * Exige el detalle de ejecuciones —número de parciales, mercados tocados, patas—
 * que un agregado de sesión no contiene.
 */
function clasificarModalidad(operacion = {}) {
  const { ejecuciones = null, patas = null } = operacion;

  if (!Array.isArray(ejecuciones)) {
    return {
      modalidad: MODALIDAD.DESCONOCIDA,
      certeza: CERTEZA.DESCONOCIDO,
      motivo:
        'Distinguir un barrido de un bloque exige el desglose de ejecuciones por mercado ' +
        'y marca temporal. El proveedor actual no lo publica.',
    };
  }

  if (Array.isArray(patas) && patas.length > 1) {
    return { modalidad: MODALIDAD.MULTIPATA, certeza: CERTEZA.CONOCIDO, motivo: `Operación de ${patas.length} patas.` };
  }
  if (ejecuciones.length > 1) {
    return { modalidad: MODALIDAD.BARRIDO, certeza: CERTEZA.CONOCIDO, motivo: `Ejecutada en ${ejecuciones.length} parciales.` };
  }
  return { modalidad: MODALIDAD.SIMPLE, certeza: CERTEZA.CONOCIDO, motivo: 'Ejecución única.' };
}

/**
 * Carácter de apertura o cierre de la posición.
 *
 * Que el volumen supere al interés abierto **no demuestra** que se abra posición:
 * el interés abierto se publica con el cierre de la sesión anterior, y un volumen
 * elevado puede corresponder a cierres, rolos o intradía que no deja posición.
 * La única confirmación llega con el interés abierto de la sesión siguiente.
 *
 * Se devuelve DESCONOCIDO, acompañado —cuando procede— de una hipótesis rotulada
 * como tal, jamás de una afirmación.
 */
function clasificarPosicion({ volumen = null, interesAbierto = null, interesAbiertoSiguiente = null } = {}) {
  // Con el interés abierto del día siguiente sí puede afirmarse.
  if (Number.isFinite(interesAbiertoSiguiente) && Number.isFinite(interesAbierto)) {
    const variacion = interesAbiertoSiguiente - interesAbierto;
    if (variacion > 0) {
      return {
        posicion: POSICION.APERTURA, certeza: CERTEZA.CONOCIDO, confianza: 1,
        motivo: `El interés abierto creció en ${variacion.toLocaleString('es-ES')} contratos en la sesión siguiente.`,
      };
    }
    if (variacion < 0) {
      return {
        posicion: POSICION.CIERRE, certeza: CERTEZA.CONOCIDO, confianza: 1,
        motivo: `El interés abierto se redujo en ${Math.abs(variacion).toLocaleString('es-ES')} contratos.`,
      };
    }
  }

  if (!Number.isFinite(volumen) || !Number.isFinite(interesAbierto) || interesAbierto <= 0) {
    return {
      posicion: POSICION.DESCONOCIDA, certeza: CERTEZA.DESCONOCIDO, confianza: 0,
      motivo: 'Sin volumen e interés abierto utilizables no cabe pronunciarse.',
    };
  }

  if (volumen > interesAbierto) {
    return {
      posicion: POSICION.DESCONOCIDA,
      certeza: CERTEZA.INFERIDO,
      confianza: 0.35,
      hipotesis: 'Posible apertura de posición',
      motivo:
        'El volumen supera al interés abierto, lo que es compatible con apertura de posición, ' +
        'pero también con cierres o negociación intradía. Solo el interés abierto de la sesión ' +
        'siguiente lo confirma.',
    };
  }

  return {
    posicion: POSICION.DESCONOCIDA, certeza: CERTEZA.DESCONOCIDO, confianza: 0,
    motivo: 'El volumen no excede al interés abierto: no hay indicio en ningún sentido.',
  };
}

/** Sesgo direccional agregado de un subyacente, a partir del volumen de calls y puts. */
function clasificarSesgo({ volumenCalls = null, volumenPuts = null } = {}) {
  if (!Number.isFinite(volumenCalls) || !Number.isFinite(volumenPuts)) {
    return { sesgo: 'UNKNOWN', certeza: CERTEZA.DESCONOCIDO, motivo: 'Sin volumen agregado por lado.' };
  }
  const total = volumenCalls + volumenPuts;
  if (total <= 0) {
    return { sesgo: 'UNKNOWN', certeza: CERTEZA.DESCONOCIDO, motivo: 'Sin actividad en la sesión.' };
  }

  const proporcionCalls = volumenCalls / total;
  // El sesgo describe dónde se concentra la actividad, no quién compra: sin sentido
  // de operación, «alcista» solo puede afirmarse como concentración, no como apuesta.
  if (proporcionCalls >= 0.65) {
    return {
      sesgo: 'CALL-WEIGHTED', certeza: CERTEZA.INFERIDO,
      proporcionCalls: Number(proporcionCalls.toFixed(3)),
      motivo: `El ${(proporcionCalls * 100).toFixed(0)} % del volumen se concentra en calls.`,
    };
  }
  if (proporcionCalls <= 0.35) {
    return {
      sesgo: 'PUT-WEIGHTED', certeza: CERTEZA.INFERIDO,
      proporcionCalls: Number(proporcionCalls.toFixed(3)),
      motivo: `El ${((1 - proporcionCalls) * 100).toFixed(0)} % del volumen se concentra en puts.`,
    };
  }
  return {
    sesgo: 'BALANCED', certeza: CERTEZA.INFERIDO,
    proporcionCalls: Number(proporcionCalls.toFixed(3)),
    motivo: 'El volumen se reparte entre calls y puts sin predominio claro.',
  };
}

module.exports = {
  clasificarSentido, clasificarModalidad, clasificarPosicion, clasificarSesgo,
  CERTEZA, SENTIDO, MODALIDAD, POSICION,
};
