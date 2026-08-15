'use strict';

/**
 * Options Flow — normalización de operaciones individuales.
 *
 * Esta pieza define la forma canónica de una operación y cómo se enriquece, para
 * que el día que un proveedor publique *time & sales* baste con volcar sus datos
 * aquí. Hoy ningún proveedor registrado las publica, de modo que el servicio
 * declara la carencia en lugar de devolver una lista vacía.
 *
 * ═══ La regla que gobierna este módulo ═══
 * CALL no significa compra. PUT no significa venta. El sentido de una operación
 * solo puede establecerse comparando su precio de ejecución con la horquilla
 * vigente **en ese mismo instante**, y el resultado es siempre una INFERENCIA con
 * su grado de confianza, nunca un hecho observado.
 */

const calidad = require('./calidad');
const clasificacion = require('./clasificacion');

/**
 * Forma canónica de una operación. Todo proveedor debe entregar sus operaciones
 * traducidas a esta estructura; el resto del sistema no conoce otra.
 *
 * @typedef {object} OperacionOpcion
 * @property {string} marcaTemporal   ISO 8601 con milisegundos
 * @property {string} simbolo         subyacente
 * @property {string} contrato        identificador OCC del contrato
 * @property {'CALL'|'PUT'} lado
 * @property {number} strike
 * @property {string} vencimiento     ISO
 * @property {number} precio          precio de ejecución
 * @property {number} tamano          contratos cruzados
 * @property {number|null} compra     bid vigente en el instante
 * @property {number|null} venta      ask vigente en el instante
 * @property {string|null} mercado    mercado de ejecución
 * @property {number|null} multiplicador
 */

/** Campos que una operación necesita para poder clasificarse por completo. */
const CAMPOS_REQUERIDOS = [
  'marcaTemporal', 'simbolo', 'contrato', 'lado', 'strike', 'vencimiento', 'precio', 'tamano',
];
const CAMPOS_PARA_SENTIDO = ['precio', 'compra', 'venta'];
const CAMPOS_PARA_MODALIDAD = ['mercado', 'marcaTemporal', 'tamano'];

const MULTIPLICADOR_POR_DEFECTO = 100;

/**
 * Enriquece una operación con prima, sentido y procedencia.
 *
 * @param {OperacionOpcion} operacion
 * @param {object} contexto { proveedor, calidadPrecio }
 */
function normalizarOperacion(operacion, { proveedor = null, calidadPrecio = calidad.CALIDAD.TIEMPO_REAL } = {}) {
  const faltan = CAMPOS_REQUERIDOS.filter((c) => operacion[c] === null || operacion[c] === undefined);
  if (faltan.length) {
    return { valida: false, motivo: `Faltan campos obligatorios: ${faltan.join(', ')}`, operacion };
  }

  const nombreProveedor = proveedor?.nombre ?? null;
  const marcar = (valor, campo) => {
    const c = proveedor?.calidadDe?.(campo) ?? calidadPrecio;
    return valor === null || valor === undefined
      ? calidad.noDisponible(`${nombreProveedor ?? 'El proveedor'} no publica ${campo}`)
      : calidad.marcar(valor, c, { fuente: nombreProveedor });
  };

  // ── Prima: aritmética exacta sobre datos observados ──
  const multiplicador = Number.isFinite(operacion.multiplicador)
    ? operacion.multiplicador
    : MULTIPLICADOR_POR_DEFECTO;
  const prima = operacion.precio * multiplicador * operacion.tamano;

  // ── Sentido: solo con horquilla del instante, y siempre como inferencia ──
  const hayContexto = CAMPOS_PARA_SENTIDO.every((c) => Number.isFinite(operacion[c]));
  const sentido = clasificacion.clasificarSentido({
    precio: operacion.precio,
    compra: operacion.compra,
    venta: operacion.venta,
    lado: operacion.lado,
    contextoInstantaneo: hayContexto,
  });

  // ── Modalidad: exige el desglose de ejecuciones, que se resuelve por lotes ──
  const modalidad = clasificacion.clasificarModalidad({
    ejecuciones: operacion.ejecuciones ?? null,
    patas: operacion.patas ?? null,
  });

  const procedencia = {
    marcaTemporal: marcar(operacion.marcaTemporal, 'marcaTemporal'),
    precio: marcar(operacion.precio, 'precioOperacion'),
    tamano: marcar(operacion.tamano, 'tamanoOperacion'),
    compra: marcar(operacion.compra, 'compra'),
    venta: marcar(operacion.venta, 'venta'),
    mercado: marcar(operacion.mercado, 'mercadoEjecucion'),

    // Producidos por la plataforma: nunca pueden presentarse como dato de mercado.
    prima: calidad.calculado(prima, ['precio', 'tamano', 'multiplicador'],
      { nota: 'Precio × multiplicador × contratos' }),
    sentido: sentido.sentido === clasificacion.SENTIDO.DESCONOCIDO
      ? calidad.noDisponible(sentido.motivo)
      : calidad.inferido(sentido.sentido, {
          confianza: sentido.confianza,
          derivadoDe: ['precio', 'compra', 'venta'],
          nota: sentido.motivo,
        }),
    modalidad: modalidad.modalidad === clasificacion.MODALIDAD.DESCONOCIDA
      ? calidad.noDisponible(modalidad.motivo)
      : calidad.inferido(modalidad.modalidad, {
          confianza: modalidad.certeza === clasificacion.CERTEZA.CONOCIDO ? 1 : 0.5,
          derivadoDe: ['ejecuciones', 'mercado'],
          nota: modalidad.motivo,
        }),
  };

  return {
    valida: true,
    marcaTemporal: operacion.marcaTemporal,
    simbolo: operacion.simbolo,
    contrato: operacion.contrato,
    lado: operacion.lado,
    strike: operacion.strike,
    vencimiento: operacion.vencimiento,
    precio: operacion.precio,
    tamano: operacion.tamano,
    compra: operacion.compra ?? null,
    venta: operacion.venta ?? null,
    mercado: operacion.mercado ?? null,
    prima,
    multiplicadorAplicado: multiplicador,
    multiplicadorDeclarado: Number.isFinite(operacion.multiplicador),
    sentido,
    modalidad,
    procedencia,
    resumenProcedencia: calidad.procedencia(procedencia),
  };
}

/**
 * Agrupa operaciones para detectar barridos y bloques.
 *
 * Un barrido es una misma intención ejecutada contra varios mercados en un
 * instante; un bloque, una única ejecución de tamaño muy superior al habitual.
 * Distinguirlos exige el mercado de ejecución y marca temporal de milisegundos:
 * mientras falten, se declara la carencia en lugar de adivinar.
 *
 * @param {Array} operaciones  ya normalizadas
 * @param {object} opciones { ventanaMs, umbralBloque }
 */
function agruparEjecuciones(operaciones, { ventanaMs = 100, umbralBloque = 100 } = {}) {
  if (!Array.isArray(operaciones) || !operaciones.length) {
    return { grupos: [], disponible: false, motivo: 'Sin operaciones que agrupar' };
  }

  const conMercado = operaciones.filter((o) => o.mercado);
  if (!conMercado.length) {
    return {
      grupos: [],
      disponible: false,
      motivo:
        'Distinguir un barrido de un bloque exige el mercado de ejecución de cada ' +
        'operación. El proveedor activo no lo publica.',
      requiere: ['mercadoEjecucion', 'marcaTemporal con milisegundos'],
    };
  }

  // Agrupación por contrato y ventana temporal.
  const porContrato = new Map();
  for (const o of operaciones) {
    const clave = `${o.contrato}`;
    if (!porContrato.has(clave)) porContrato.set(clave, []);
    porContrato.get(clave).push(o);
  }

  const grupos = [];
  for (const [contrato, lista] of porContrato) {
    lista.sort((a, b) => new Date(a.marcaTemporal) - new Date(b.marcaTemporal));

    let actual = [lista[0]];
    for (let i = 1; i < lista.length; i++) {
      const delta = new Date(lista[i].marcaTemporal) - new Date(actual[actual.length - 1].marcaTemporal);
      if (delta <= ventanaMs) {
        actual.push(lista[i]);
      } else {
        grupos.push(construirGrupo(contrato, actual, umbralBloque));
        actual = [lista[i]];
      }
    }
    grupos.push(construirGrupo(contrato, actual, umbralBloque));
  }

  return { grupos, disponible: true, ventanaMs, umbralBloque };
}

function construirGrupo(contrato, ejecuciones, umbralBloque) {
  const mercados = new Set(ejecuciones.map((e) => e.mercado).filter(Boolean));
  const tamanoTotal = ejecuciones.reduce((a, e) => a + e.tamano, 0);
  const primaTotal = ejecuciones.reduce((a, e) => a + e.prima, 0);

  // Varios mercados en la misma ventana: barrido. Una sola ejecución grande: bloque.
  let modalidad = clasificacion.MODALIDAD.SIMPLE;
  let motivo = 'Ejecución única en un solo mercado.';
  if (mercados.size > 1) {
    modalidad = clasificacion.MODALIDAD.BARRIDO;
    motivo = `Ejecutada contra ${mercados.size} mercados en ${ejecuciones.length} parciales.`;
  } else if (ejecuciones.length === 1 && tamanoTotal >= umbralBloque) {
    modalidad = clasificacion.MODALIDAD.BLOQUE;
    motivo = `Ejecución única de ${tamanoTotal} contratos.`;
  }

  return {
    contrato,
    ejecuciones: ejecuciones.length,
    mercados: [...mercados],
    tamanoTotal,
    primaTotal,
    modalidad,
    // La agrupación es una interpretación nuestra, no un dato del mercado.
    procedencia: {
      modalidad: calidad.inferido(modalidad, {
        confianza: mercados.size > 1 ? 0.8 : 0.6,
        derivadoDe: ['mercado', 'marcaTemporal', 'tamano'],
        nota: motivo,
      }),
      primaTotal: calidad.calculado(primaTotal, ['precio', 'tamano', 'multiplicador']),
    },
    motivo,
  };
}

/** Requisitos de datos de cada capacidad del flujo, para explicar qué falta. */
const REQUISITOS = {
  sentido: {
    titulo: 'BUY / SELL / MID',
    campos: CAMPOS_PARA_SENTIDO,
    explicacion:
      'Exige el precio de ejecución y la horquilla vigente en ese instante. ' +
      'El resultado es siempre una inferencia con grado de confianza.',
  },
  modalidad: {
    titulo: 'SWEEP / BLOCK / MULTI-LEG',
    campos: CAMPOS_PARA_MODALIDAD,
    explicacion:
      'Exige el mercado de ejecución y marca temporal de milisegundos para agrupar ' +
      'parciales de una misma intención.',
  },
};

module.exports = {
  normalizarOperacion, agruparEjecuciones,
  CAMPOS_REQUERIDOS, CAMPOS_PARA_SENTIDO, CAMPOS_PARA_MODALIDAD,
  REQUISITOS, MULTIPLICADOR_POR_DEFECTO,
};
