'use strict';

/**
 * Orquestador de datos de mercado.
 *
 * Ordena los proveedores por prioridad y degrada al siguiente ante cualquier
 * fallo, de forma que una incidencia en un origen no interrumpe el servicio.
 * Incorpora cache con vencimiento corto para que cada recarga del navegador
 * obtenga precio actualizado sin saturar a los proveedores.
 */

const yahoo = require('./yahoo');
const { cnbc, nasdaq } = require('./respaldo');

const TTL_COTIZACION_MS = Number(process.env.TTL_COTIZACION_MS ?? 15_000);
const TTL_HISTORICO_MS = Number(process.env.TTL_HISTORICO_MS ?? 30 * 60_000);

const PROVEEDORES_COTIZACION = [yahoo, cnbc, nasdaq];
const PROVEEDORES_HISTORICO = [yahoo, nasdaq];

const cacheCotizacion = new Map(); // simbolo -> { valor, expira }
const cacheHistorico = new Map(); // clave   -> { valor, expira }
const enVuelo = new Map(); // deduplica peticiones simultaneas del mismo dato

const diagnostico = {
  intentos: 0,
  porProveedor: Object.create(null),
  ultimoError: null,
};

function registrar(proveedor, exito, error) {
  const d = (diagnostico.porProveedor[proveedor] ??= { exitos: 0, fallos: 0 });
  if (exito) d.exitos++;
  else {
    d.fallos++;
    diagnostico.ultimoError = { proveedor, mensaje: error?.message ?? String(error), momento: new Date().toISOString() };
  }
}

/** Ejecuta `fn` una sola vez por clave aunque se solicite en paralelo. */
function deduplicar(clave, fn) {
  const activo = enVuelo.get(clave);
  if (activo) return activo;
  const p = fn().finally(() => enVuelo.delete(clave));
  enVuelo.set(clave, p);
  return p;
}

function leerCache(cache, clave) {
  const e = cache.get(clave);
  if (e && e.expira > Date.now()) return e.valor;
  if (e) cache.delete(clave);
  return null;
}

function normalizarSimbolo(simbolo) {
  if (typeof simbolo !== 'string') return null;
  const s = simbolo.trim().toUpperCase().replace(/^\$/, '');
  // Tickers reales: letras, digitos y los separadores . y - (BRK.B, RDS-A).
  // El circunflejo inicial es opcional y de sintaxis, no de contenido: es la
  // convencion con la que Yahoo Finance nombra el ticker de un indice propio
  // (^GSPC, ^VIX) y no el de un valor negociable.
  return /^\^?[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(s) ? s : null;
}

async function enCascada(proveedores, metodo, args, etiqueta) {
  const errores = [];
  for (const p of proveedores) {
    if (typeof p[metodo] !== 'function') continue;
    diagnostico.intentos++;
    try {
      const valor = await p[metodo](...args);
      registrar(p.nombre, true);
      return valor;
    } catch (err) {
      registrar(p.nombre, false, err);
      errores.push(`${p.nombre}: ${err.message}`);
    }
  }
  const e = new Error(`Sin datos de mercado para ${etiqueta}. ${errores.join(' | ')}`);
  e.codigo = 'SIN_DATOS_MERCADO';
  throw e;
}

async function obtenerCotizacion(simboloBruto) {
  const simbolo = normalizarSimbolo(simboloBruto);
  if (!simbolo) throw Object.assign(new Error(`Símbolo no válido: ${simboloBruto}`), { codigo: 'SIMBOLO_INVALIDO' });

  const cacheado = leerCache(cacheCotizacion, simbolo);
  if (cacheado) return { ...cacheado, cacheado: true };

  return deduplicar(`c:${simbolo}`, async () => {
    const valor = await enCascada(PROVEEDORES_COTIZACION, 'obtenerCotizacion', [simbolo], simbolo);
    cacheCotizacion.set(simbolo, { valor, expira: Date.now() + TTL_COTIZACION_MS });
    return { ...valor, cacheado: false };
  });
}

async function obtenerHistorico(simboloBruto, desdeISO) {
  const simbolo = normalizarSimbolo(simboloBruto);
  if (!simbolo) throw Object.assign(new Error(`Símbolo no válido: ${simboloBruto}`), { codigo: 'SIMBOLO_INVALIDO' });

  const desde = String(desdeISO).slice(0, 10);
  const clave = `${simbolo}:${desde}`;
  const cacheado = leerCache(cacheHistorico, clave);
  if (cacheado) return cacheado;

  return deduplicar(`h:${clave}`, async () => {
    const valor = await enCascada(PROVEEDORES_HISTORICO, 'obtenerHistorico', [simbolo, desde], simbolo);
    cacheHistorico.set(clave, { valor, expira: Date.now() + TTL_HISTORICO_MS });
    return valor;
  });
}

/** Resuelve varios simbolos en paralelo sin que uno fallido tumbe al resto. */
async function obtenerCotizaciones(simbolos) {
  const res = await Promise.allSettled(simbolos.map((s) => obtenerCotizacion(s)));
  const salida = new Map();
  const fallidos = [];
  res.forEach((r, i) => {
    const s = normalizarSimbolo(simbolos[i]) ?? simbolos[i];
    if (r.status === 'fulfilled') salida.set(s, r.value);
    else fallidos.push({ simbolo: s, motivo: r.reason?.message ?? 'desconocido' });
  });
  return { cotizaciones: salida, fallidos };
}

const TTL_BUSQUEDA_MS = Number(process.env.TTL_BUSQUEDA_MS ?? 5 * 60_000);
const cacheBusqueda = new Map(); // consulta -> { valor, expira }

/**
 * Autocompletado de tickers. Solo Yahoo lo sirve —ni cnbc ni nasdaq exponen
 * un buscador de símbolos por texto—, así que no hay cascada de proveedores
 * que orquestar: un fallo aquí se declara tal cual, nunca como lista vacía
 * (que el buscador de Cartera leería como "sin resultados", un hecho
 * distinto de "el proveedor no respondió").
 */
async function buscarSimbolos(consultaBruta) {
  const consulta = String(consultaBruta ?? '').trim();
  if (consulta.length < 1) return [];

  const clave = consulta.toUpperCase();
  const cacheado = leerCache(cacheBusqueda, clave);
  if (cacheado) return cacheado;

  return deduplicar(`b:${clave}`, async () => {
    const valor = await yahoo.buscarSimbolos(consulta);
    cacheBusqueda.set(clave, { valor, expira: Date.now() + TTL_BUSQUEDA_MS });
    return valor;
  });
}

function estado() {
  return {
    ...diagnostico,
    proveedoresCotizacion: PROVEEDORES_COTIZACION.map((p) => p.nombre),
    proveedoresHistorico: PROVEEDORES_HISTORICO.map((p) => p.nombre),
    ttlCotizacionMs: TTL_COTIZACION_MS,
    ttlHistoricoMs: TTL_HISTORICO_MS,
    entradasCache: { cotizaciones: cacheCotizacion.size, historicos: cacheHistorico.size },
  };
}

module.exports = {
  obtenerCotizacion, obtenerCotizaciones, obtenerHistorico, buscarSimbolos, normalizarSimbolo, estado,
};
