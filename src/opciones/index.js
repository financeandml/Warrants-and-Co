'use strict';

/**
 * Servicio de opciones — lógica de negocio.
 *
 * Media entre el proveedor de datos y la interfaz, sin que ninguno conozca al otro:
 * el proveedor ignora cómo se puntúa y la interfaz ignora de dónde vienen los datos.
 *
 * Expone las cuatro operaciones del contrato acordado:
 *   getOptionChain · getOptionsFlow · getUnusualActivity · getHistoricalOptionsActivity
 */

const mercado = require('../market');
const { proveedorActivo, estadoProveedores, capacidadesPendientes, enRespaldo } = require('./proveedores');
const calidad = require('./calidad');
const { ErrorProveedorOpciones } = require('./proveedor');
const { calculateUnusualActivityScore, FACTORES } = require('./puntuacion');
const clasificacion = require('./clasificacion');
const historico = require('./historico');
const flujo = require('./flujo');

/** Multiplicador por defecto del mercado estadounidense de opciones sobre acciones. */
const MULTIPLICADOR_POR_DEFECTO = 100;

const TTL_CADENA_MS = Number(process.env.TTL_OPCIONES_MS ?? 5 * 60_000);
const cache = new Map();
const enVuelo = new Map();

function leerCache(clave) {
  const e = cache.get(clave);
  if (e && e.expira > Date.now()) return e.valor;
  if (e) cache.delete(clave);
  return null;
}

/** Ejecuta `fn` una sola vez por clave aunque se solicite en paralelo. */
function deduplicar(clave, fn) {
  const activo = enVuelo.get(clave);
  if (activo) return activo;
  const p = fn().finally(() => enVuelo.delete(clave));
  enVuelo.set(clave, p);
  return p;
}

/**
 * Importe nocional negociado en la sesión.
 *
 * No es la prima de una operación concreta —eso exigiría el precio de cada
 * ejecución—, sino el importe agregado del contrato en la sesión. El multiplicador
 * se toma del proveedor cuando lo publica; el valor por defecto solo se aplica si no
 * lo hace, y así queda declarado en el resultado.
 */
function calcularImporte({ ultimo, volumen, multiplicador }) {
  if (!Number.isFinite(ultimo) || !Number.isFinite(volumen) || volumen <= 0) return null;
  const factor = Number.isFinite(multiplicador) ? multiplicador : MULTIPLICADOR_POR_DEFECTO;
  return ultimo * factor * volumen;
}

/**
 * Etiqueta un campo observado con la calidad que declara el proveedor activo.
 * Un valor ausente queda como no disponible con independencia de esa calidad.
 */
function etiquetarObservado(proveedor, valor, campo) {
  const c = proveedor.calidadDe(campo);
  if (valor === null || valor === undefined || (typeof valor === 'number' && !Number.isFinite(valor))) {
    return calidad.noDisponible(
      c === calidad.CALIDAD.NO_DISPONIBLE
        ? `${proveedor.nombre} no publica este campo`
        : 'Sin dato en esta sesión'
    );
  }
  return calidad.marcar(valor, c, { fuente: proveedor.nombre });
}

/**
 * Cadena de opciones normalizada, enriquecida con importe y procedencia del dato.
 * @param {string} simboloBruto
 */
async function getOptionChain(simboloBruto, { archivar = true } = {}) {
  const simbolo = mercado.normalizarSimbolo(simboloBruto);
  if (!simbolo) {
    const e = new Error(`Símbolo no válido: ${simboloBruto}`);
    e.codigo = 'SIMBOLO_INVALIDO';
    throw e;
  }

  const cacheado = leerCache(`c:${simbolo}`);
  if (cacheado) return { ...cacheado, cacheado: true };

  return deduplicar(`c:${simbolo}`, async () => {
    const proveedor = proveedorActivo();
    const cruda = await proveedor.obtenerCadena(simbolo);

    // El precio del subyacente lo aporta la cascada de mercado ya existente; si el
    // proveedor de la cadena trae el suyo, sirve de respaldo.
    let precioSubyacente = cruda.subyacente?.precio ?? null;
    let fuentePrecio = cruda.subyacente?.fuente ?? null;
    try {
      const cotizacion = await mercado.obtenerCotizacion(simbolo);
      if (Number.isFinite(cotizacion?.precio)) {
        precioSubyacente = cotizacion.precio;
        fuentePrecio = cotizacion.fuente;
      }
    } catch {
      // Se conserva el precio del proveedor de la cadena.
    }

    const marcarObservado = (valor, campo) => etiquetarObservado(proveedor, valor, campo);

    const contratos = cruda.contratos.map((c) => {
      const importeNegociado = calcularImporte({
        ultimo: c.ultimo, volumen: c.volumen, multiplicador: c.multiplicador,
      });

      // Un interés abierto de cero no produce un ratio de cero: produce «no calculable».
      const volumenSobreInteres =
        Number.isFinite(c.volumen) && Number.isFinite(c.interesAbierto) && c.interesAbierto > 0
          ? Number((c.volumen / c.interesAbierto).toFixed(3))
          : null;

      return {
        ...c,
        importeNegociado,
        multiplicadorAplicado: Number.isFinite(c.multiplicador) ? c.multiplicador : MULTIPLICADOR_POR_DEFECTO,
        multiplicadorDeclarado: Number.isFinite(c.multiplicador),
        volumenSobreInteres,
        // Procedencia formal de cada campo. La observación conserva la calidad
        // que declara el proveedor; lo que producimos nosotros se marca como
        // derivado, de modo que nunca puede presentarse como dato de mercado.
        procedencia: {
          ultimo: marcarObservado(c.ultimo, 'ultimo'),
          compra: marcarObservado(c.compra, 'compra'),
          venta: marcarObservado(c.venta, 'venta'),
          volumen: marcarObservado(c.volumen, 'volumen'),
          interesAbierto: marcarObservado(c.interesAbierto, 'interesAbierto'),
          volatilidadImplicita: marcarObservado(c.volatilidadImplicita, 'volatilidadImplicita'),
          delta: marcarObservado(c.delta, 'delta'),
          gamma: marcarObservado(c.gamma, 'gamma'),
          theta: marcarObservado(c.theta, 'theta'),
          vega: marcarObservado(c.vega, 'vega'),
          importeNegociado: importeNegociado === null
            ? calidad.noDisponible('Sin precio o volumen para calcular el importe')
            : calidad.calculado(importeNegociado, ['ultimo', 'volumen', 'multiplicador'],
                { nota: 'Volumen × último precio × multiplicador' }),
          volumenSobreInteres: volumenSobreInteres === null
            ? calidad.noDisponible(c.interesAbierto === 0
                ? 'Interés abierto nulo: el cociente no es calculable'
                : 'Sin volumen o interés abierto')
            : calidad.calculado(volumenSobreInteres, ['volumen', 'interesAbierto']),
        },
        // Se conserva el resumen anterior por compatibilidad con la interfaz.
        calidad: {
          volumen: Number.isFinite(c.volumen) ? 'dato' : 'ausente',
          interesAbierto: Number.isFinite(c.interesAbierto) ? 'dato' : 'ausente',
          volumenSobreInteres: volumenSobreInteres !== null
            ? 'dato'
            : (c.interesAbierto === 0 ? 'no_calculable' : 'ausente'),
          volatilidadImplicita: proveedor.admite('volatilidadImplicita') ? 'dato' : 'no_publicado',
          griegas: proveedor.admite('griegas') ? 'dato' : 'no_publicado',
        },
      };
    });

    // Volumen agregado por lado: alimenta el factor de desequilibrio del score.
    const volumenCalls = contratos
      .filter((c) => c.lado === 'CALL' && Number.isFinite(c.volumen))
      .reduce((a, c) => a + c.volumen, 0);
    const volumenPuts = contratos
      .filter((c) => c.lado === 'PUT' && Number.isFinite(c.volumen))
      .reduce((a, c) => a + c.volumen, 0);

    const resultado = {
      simbolo,
      contratos,
      vencimientos: cruda.vencimientos,
      subyacente: { simbolo, precio: precioSubyacente, fuente: fuentePrecio },
      agregados: {
        volumenCalls,
        volumenPuts,
        interesAbiertoCalls: contratos.filter((c) => c.lado === 'CALL').reduce((a, c) => a + (c.interesAbierto ?? 0), 0),
        interesAbiertoPuts: contratos.filter((c) => c.lado === 'PUT').reduce((a, c) => a + (c.interesAbierto ?? 0), 0),
        contratos: contratos.length,
      },
      sesgo: clasificacion.clasificarSesgo({ volumenCalls, volumenPuts }),
      proveedor: { clave: proveedor.clave, nombre: proveedor.nombre, nota: proveedor.nota },
      truncada: cruda.truncada,
      obtenidaEn: cruda.obtenidaEn,
    };

    // La instantánea construye el histórico del que hoy carecen dos factores del score.
    if (archivar) {
      try {
        resultado.archivo = historico.registrarInstantanea(simbolo, contratos, {
          precioSubyacente, proveedor: proveedor.clave,
        });
      } catch (err) {
        resultado.archivo = { guardados: 0, error: err.message };
      }
    }

    cache.set(`c:${simbolo}`, { valor: resultado, expira: Date.now() + TTL_CADENA_MS });
    return { ...resultado, cacheado: false };
  });
}

/**
 * Flujo de operaciones individuales.
 *
 * El proveedor activo no publica time & sales. Se devuelve un resultado explícito de
 * indisponibilidad —con lo que haría falta para activarlo— en lugar de una lista
 * vacía, que se leería como «hoy no ha habido operaciones».
 */
async function getOptionsFlow({ simbolo = null } = {}) {
  const proveedor = proveedorActivo();

  if (!proveedor.admite('operaciones')) {
    return {
      disponible: false,
      operaciones: [],
      motivo:
        'El proveedor activo publica agregados de sesión por contrato, no operaciones ' +
        'individuales. El flujo exige un feed de time & sales de opciones.',
      requiere: [
        'Marca temporal, tamaño y precio de cada ejecución',
        'Bid/ask vigente en el instante de la ejecución',
        'Desglose por mercado para distinguir barridos de bloques',
      ],
      // Contrato de datos que tendría que satisfacer un proveedor de flujo.
      contratoDatos: {
        camposRequeridos: flujo.CAMPOS_REQUERIDOS,
        capacidades: flujo.REQUISITOS,
      },
      proveedor: { clave: proveedor.clave, nombre: proveedor.nombre },
      simbolo,
      generadoEn: new Date().toISOString(),
    };
  }

  const crudas = await proveedor.getTrades(simbolo);
  // Toda operación se normaliza a la forma canónica y se enriquece con su
  // procedencia antes de salir del servicio.
  const normalizadas = (crudas?.operaciones ?? [])
    .map((o) => flujo.normalizarOperacion(o, { proveedor }))
    .filter((o) => o.valida);

  const agrupacion = flujo.agruparEjecuciones(normalizadas);

  return {
    disponible: true,
    operaciones: normalizadas,
    agrupacion,
    proveedor: { clave: proveedor.clave, nombre: proveedor.nombre },
    generadoEn: new Date().toISOString(),
  };
}

/**
 * Actividad inusual sobre uno o varios subyacentes.
 * Puntúa cada contrato con actividad y devuelve los más destacados.
 */
async function getUnusualActivity(simbolos, { limite = 25, minimoVolumen = 1 } = {}) {
  const lista = (Array.isArray(simbolos) ? simbolos : [simbolos]).filter(Boolean);
  if (!lista.length) {
    return { contratos: [], evaluados: 0, incidencias: ['Sin subyacentes que analizar'], generadoEn: new Date().toISOString() };
  }

  const resultados = await Promise.allSettled(lista.map((s) => getOptionChain(s)));

  const contratos = [];
  const incidencias = [];
  let evaluados = 0;

  resultados.forEach((r, i) => {
    if (r.status !== 'fulfilled') {
      incidencias.push(`${lista[i]}: ${r.reason?.message ?? 'error desconocido'}`);
      return;
    }
    const cadena = r.value;
    const estadisticos = historico.estadisticosPorContrato(cadena.simbolo);

    for (const c of cadena.contratos) {
      // Solo se puntúa lo que se ha negociado: un contrato sin volumen no puede
      // ser actividad inusual.
      if (!Number.isFinite(c.volumen) || c.volumen < minimoVolumen) continue;
      evaluados++;

      const propio = estadisticos.get(`${c.lado}|${c.strike}|${c.vencimiento}`);

      const puntuacion = calculateUnusualActivityScore({
        volumen: c.volumen,
        interesAbierto: c.interesAbierto,
        importeNegociado: c.importeNegociado,
        strike: c.strike,
        precioSubyacente: cadena.subyacente.precio,
        lado: c.lado,
        vencimiento: c.vencimiento,
        volumenCallsSubyacente: cadena.agregados.volumenCalls,
        volumenPutsSubyacente: cadena.agregados.volumenPuts,
        volumenMedioHistorico: propio?.volumenMedio ?? null,
        // Sin fuente todavía: los factores correspondientes se declararán ausentes.
        volatilidadImplicita: c.volatilidadImplicita,
        volatilidadImplicitaPrevia: null,
        tamanoOperacion: null,
        tamanoMedio: null,
        percentilHistorico: null,
        posicionEnHorquilla: null,
      });

      contratos.push({
        ...c,
        empresa: cadena.simbolo,
        precioSubyacente: cadena.subyacente.precio,
        puntuacion: puntuacion.puntuacion,
        puntuacionDisponible: puntuacion.disponible,
        cobertura: puntuacion.cobertura,
        senales: puntuacion.senales,
        factores: puntuacion.factores,
        motivoPuntuacion: puntuacion.motivo,
        // El sentido y el carácter de la posición no se afirman: se declaran.
        sentido: clasificacion.clasificarSentido({ lado: c.lado, contextoInstantaneo: false }),
        modalidad: clasificacion.clasificarModalidad({}),
        posicion: clasificacion.clasificarPosicion({ volumen: c.volumen, interesAbierto: c.interesAbierto }),
        sesgoSubyacente: cadena.sesgo,
      });
    }
  });

  // Los que no alcanzan cobertura quedan al final: se muestran, pero sin fingir una nota.
  contratos.sort((a, b) => {
    if (a.puntuacionDisponible !== b.puntuacionDisponible) return a.puntuacionDisponible ? -1 : 1;
    return (b.puntuacion ?? -1) - (a.puntuacion ?? -1);
  });

  return {
    contratos: contratos.slice(0, limite),
    evaluados,
    totalConPuntuacion: contratos.filter((c) => c.puntuacionDisponible).length,
    incidencias,
    metodologia: {
      factores: FACTORES.map((f) => ({
        clave: f.clave, titulo: f.titulo, descripcion: f.descripcion, peso: f.peso, requiere: f.requiere ?? null,
      })),
    },
    generadoEn: new Date().toISOString(),
  };
}

/** Actividad histórica archivada de un contrato o de un subyacente. */
async function getHistoricalOptionsActivity({ simbolo, lado = null, strike = null, vencimiento = null }) {
  const normalizado = mercado.normalizarSimbolo(simbolo);
  if (!normalizado) {
    const e = new Error(`Símbolo no válido: ${simbolo}`);
    e.codigo = 'SIMBOLO_INVALIDO';
    throw e;
  }

  const cobertura = historico.coberturaHistorica(normalizado);
  const serie = lado && strike && vencimiento
    ? historico.serieContrato({ simbolo: normalizado, lado, strike: Number(strike), vencimiento })
    : [];

  return {
    simbolo: normalizado,
    serie,
    cobertura,
    disponible: cobertura.suficienteParaComparar,
    motivo: cobertura.suficienteParaComparar
      ? null
      : `Se han archivado ${cobertura.sesiones ?? 0} sesión(es); hacen falta ${cobertura.sesionesNecesarias} para comparar.`,
    generadoEn: new Date().toISOString(),
  };
}

/** Estado del subsistema: proveedor, capacidades y cobertura del archivo. */
function estado() {
  return {
    proveedores: estadoProveedores(),
    enRespaldo: enRespaldo(),
    capacidadesPendientes: capacidadesPendientes(),
    calidades: calidad.CALIDAD,
    historico: historico.coberturaHistorica(),
    metodologia: {
      factores: FACTORES.map((f) => ({
        clave: f.clave, titulo: f.titulo, descripcion: f.descripcion,
        peso: f.peso, requiere: f.requiere ?? null,
      })),
    },
    multiplicadorPorDefecto: MULTIPLICADOR_POR_DEFECTO,
    ttlCadenaMs: TTL_CADENA_MS,
  };
}

module.exports = {
  getOptionChain, getOptionsFlow, getUnusualActivity, getHistoricalOptionsActivity,
  estado, calcularImporte, etiquetarObservado, MULTIPLICADOR_POR_DEFECTO,
};
