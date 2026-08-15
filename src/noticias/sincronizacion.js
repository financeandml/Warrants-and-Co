'use strict';

/**
 * Incorporacion automatica de noticias desde Investing.com.
 *
 * Se ejecuta al arrancar y despues a intervalo regular. Cada pieza se identifica
 * por su enlace de origen, de modo que una resincronizacion nunca duplica lo ya
 * incorporado. Las noticias redactadas por el equipo no se ven afectadas.
 */

const { db } = require('../db');
const investing = require('./investing');

const INTERVALO_MS = Number(process.env.INTERVALO_NOTICIAS_MS ?? 15 * 60_000);
const MAX_POR_SINCRONIZACION = 60;
const DIAS_RETENCION = Number(process.env.RETENCION_NOTICIAS_DIAS ?? 60);

const estado = {
  ultimaEjecucion: null,
  ultimoResultado: null,
  incorporadas: 0,
  ejecuciones: 0,
  enCurso: false,
  incidencias: [],
  automatica: true,
  intervaloMs: INTERVALO_MS,
  diasRetencion: DIAS_RETENCION,
};

let temporizador = null;

/** Valores en cobertura, para vincular cada pieza con la cartera. */
function valoresEnCobertura() {
  return db
    .prepare(
      `SELECT DISTINCT ticker, empresa FROM informes
       WHERE ticker IS NOT NULL AND ticker <> ''`
    )
    .all()
    .map((f) => {
      // Se compara contra el nucleo de la denominacion social, sin formas juridicas.
      const nucleo = String(f.empresa || '')
        .replace(/[.,]/g, ' ')
        .replace(/\b(inc|corp|corporation|plc|ltd|limited|sa|s\.a|nv|ag|co|company|holdings|group|incorporated)\b/gi, ' ')
        .trim();
      return { ticker: f.ticker.toUpperCase(), nucleo: nucleo.length >= 4 ? nucleo.toLowerCase() : null };
    });
}

/**
 * Detecta que valores de la cartera menciona un titular.
 * El ticker exige limites de palabra para no confundir siglas dentro de otra voz.
 */
function detectarValores(titular, cobertura) {
  const texto = titular.toLowerCase();
  const encontrados = [];
  for (const { ticker, nucleo } of cobertura) {
    const porTicker = new RegExp(`(^|[^a-z0-9])\\$?${ticker.toLowerCase()}([^a-z0-9]|$)`).test(texto);
    const porNombre = nucleo ? texto.includes(nucleo) : false;
    if ((porTicker || porNombre) && !encontrados.includes(ticker)) encontrados.push(ticker);
  }
  return encontrados;
}

/**
 * Retira la sindicacion caducada para que el archivo no crezca sin limite.
 * Nunca afecta a las piezas redactadas por el equipo ni a las destacadas.
 */
function aplicarRetencion() {
  if (DIAS_RETENCION <= 0) return 0;
  const corte = new Date(Date.now() - DIAS_RETENCION * 86400000).toISOString().slice(0, 10);
  const info = db
    .prepare(
      `DELETE FROM noticias
       WHERE origen = 'Investing.com' AND destacada = 0 AND fecha_publicacion < ?`
    )
    .run(corte);
  return info.changes;
}

/** Recorta un titular excesivamente largo sin partir palabras. */
function limitar(texto, max) {
  if (!texto) return null;
  if (texto.length <= max) return texto;
  const corte = texto.lastIndexOf(' ', max - 1);
  return `${texto.slice(0, corte > 40 ? corte : max - 1)}…`;
}

/**
 * Ejecuta una sincronizacion.
 * @param {object} opciones { canales }
 */
async function sincronizar({ canales } = {}) {
  if (estado.enCurso) {
    return { ...estado.ultimoResultado, enCurso: true, mensaje: 'Ya hay una sincronización en curso.' };
  }
  estado.enCurso = true;
  const arranque = Date.now();

  try {
    const { piezas, incidencias, canalesConsultados } = await investing.obtenerPiezas(
      Array.isArray(canales) && canales.length ? canales : undefined
    );

    const cobertura = valoresEnCobertura();
    const hoy = new Date().toISOString().slice(0, 10);

    const existe = db.prepare('SELECT id FROM noticias WHERE url_fuente = ?');
    const insertar = db.prepare(
      `INSERT INTO noticias
         (titular, entradilla, cuerpo, categoria, tickers, etiquetas, fuente, url_fuente,
          autor, relevancia, destacada, fecha_publicacion, origen, imagen, feed_origen, momento_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let incorporadas = 0;
    let vinculadas = 0;
    const candidatas = piezas.slice(0, MAX_POR_SINCRONIZACION);

    db.exec('BEGIN IMMEDIATE');
    try {
      for (const pieza of candidatas) {
        if (existe.get(pieza.enlace)) continue;

        const valores = detectarValores(pieza.titular, cobertura);
        if (valores.length) vinculadas++;

        const momento = pieza.publicado ?? new Date();
        // El repositorio no admite fechas futuras: un desfase horario del canal se acota a hoy.
        const fecha = Math.min(momento.getTime(), Date.now());
        const fechaISO = new Date(fecha).toISOString();

        insertar.run(
          limitar(pieza.titular, 220),
          null,
          null,
          // Una pieza que menciona un valor en cartera se clasifica como noticia de compañía.
          valores.length ? 'Compañía' : pieza.categoria,
          JSON.stringify(valores),
          JSON.stringify([]),
          'Investing.com',
          pieza.enlace,
          pieza.autor ? limitar(pieza.autor, 120) : 'Investing.com',
          valores.length ? 'alta' : 'normal',
          0,
          fechaISO.slice(0, 10) > hoy ? hoy : fechaISO.slice(0, 10),
          'Investing.com',
          pieza.imagen,
          pieza.canalNombre,
          fechaISO
        );
        incorporadas++;
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const retiradas = aplicarRetencion();

    estado.ultimaEjecucion = new Date().toISOString();
    estado.ejecuciones++;
    estado.incorporadas += incorporadas;
    estado.incidencias = incidencias;
    estado.ultimoResultado = {
      incorporadas,
      vinculadas,
      retiradas,
      revisadas: candidatas.length,
      canalesConsultados,
      incidencias,
      duracionMs: Date.now() - arranque,
      momento: estado.ultimaEjecucion,
    };
    return estado.ultimoResultado;
  } catch (err) {
    estado.incidencias = [err.message];
    estado.ultimaEjecucion = new Date().toISOString();
    estado.ultimoResultado = {
      incorporadas: 0, vinculadas: 0, revisadas: 0, canalesConsultados: 0,
      incidencias: [err.message], duracionMs: Date.now() - arranque, momento: estado.ultimaEjecucion,
    };
    throw err;
  } finally {
    estado.enCurso = false;
  }
}

/** Arranca la sincronizacion periodica. La primera pasada no bloquea el arranque del servidor. */
function iniciarSincronizacionPeriodica() {
  if (process.env.NOTICIAS_AUTOMATICAS === 'false') {
    estado.automatica = false;
    return;
  }

  const ejecutar = () => {
    sincronizar().catch((err) => {
      console.warn(`  [noticias] sincronización fallida: ${err.message}`);
    });
  };

  setTimeout(ejecutar, 1500).unref();
  temporizador = setInterval(ejecutar, INTERVALO_MS);
  temporizador.unref();
}

function detenerSincronizacion() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

function estadoSincronizacion() {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM noticias WHERE origen = 'Investing.com'").get();
  const { propias } = db.prepare("SELECT COUNT(*) AS propias FROM noticias WHERE origen = 'manual'").get();
  return {
    ...estado,
    ultimoResultado: estado.ultimoResultado,
    noticiasSindicadas: total,
    noticiasPropias: propias,
    canales: investing.CANALES.map((c) => ({ id: c.id, nombre: c.nombre, categoria: c.categoria })),
    canalesActivos: investing.CANALES_POR_DEFECTO,
  };
}

module.exports = {
  sincronizar, iniciarSincronizacionPeriodica, detenerSincronizacion,
  estadoSincronizacion, detectarValores, valoresEnCobertura,
};
