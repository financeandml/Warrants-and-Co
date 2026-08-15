'use strict';

/**
 * Histórico de actividad en opciones.
 *
 * Reutiliza la base SQLite del proyecto: no se introduce un motor nuevo. Cada
 * consulta de cadena deja una instantánea por contrato, de modo que con el tiempo
 * se acumula la serie que hoy falta para los factores de volumen relativo y de
 * actividad histórica del score.
 *
 * Una instantánea por contrato y sesión: repetir la consulta el mismo día actualiza
 * la fila en lugar de duplicarla.
 */

const { db } = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS opciones_historico (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    simbolo              TEXT    NOT NULL,
    lado                 TEXT    NOT NULL,
    strike               REAL    NOT NULL,
    vencimiento          TEXT    NOT NULL,
    sesion               TEXT    NOT NULL,
    volumen              INTEGER,
    interes_abierto      INTEGER,
    ultimo               REAL,
    compra               REAL,
    venta                REAL,
    volatilidad_implicita REAL,
    importe_negociado    REAL,
    precio_subyacente    REAL,
    proveedor            TEXT,
    creado_en            TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// Un contrato solo puede tener una instantánea por sesión.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_opciones_contrato_sesion
  ON opciones_historico(simbolo, lado, strike, vencimiento, sesion)
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_opciones_simbolo ON opciones_historico(simbolo, sesion DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_opciones_sesion ON opciones_historico(sesion DESC)');

const RETENCION_DIAS = Number(process.env.RETENCION_OPCIONES_DIAS ?? 180);

const guardar = db.prepare(`
  INSERT INTO opciones_historico
    (simbolo, lado, strike, vencimiento, sesion, volumen, interes_abierto, ultimo,
     compra, venta, volatilidad_implicita, importe_negociado, precio_subyacente, proveedor)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(simbolo, lado, strike, vencimiento, sesion) DO UPDATE SET
    volumen = excluded.volumen,
    interes_abierto = excluded.interes_abierto,
    ultimo = excluded.ultimo,
    compra = excluded.compra,
    venta = excluded.venta,
    volatilidad_implicita = excluded.volatilidad_implicita,
    importe_negociado = excluded.importe_negociado,
    precio_subyacente = excluded.precio_subyacente
`);

/**
 * Registra una instantánea de la cadena.
 * @returns {{guardados: number, sesion: string}}
 */
function registrarInstantanea(simbolo, contratos, { precioSubyacente = null, proveedor = null } = {}) {
  if (!Array.isArray(contratos) || !contratos.length) return { guardados: 0, sesion: null };

  const sesion = new Date().toISOString().slice(0, 10);
  let guardados = 0;

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const c of contratos) {
      // Solo se archiva lo que aporta serie: un contrato sin actividad ni posición
      // abierta ocuparía espacio sin sostener ningún cálculo posterior.
      if (!Number.isFinite(c.volumen) && !Number.isFinite(c.interesAbierto)) continue;

      guardar.run(
        simbolo, c.lado, c.strike, c.vencimiento, sesion,
        Number.isFinite(c.volumen) ? Math.round(c.volumen) : null,
        Number.isFinite(c.interesAbierto) ? Math.round(c.interesAbierto) : null,
        Number.isFinite(c.ultimo) ? c.ultimo : null,
        Number.isFinite(c.compra) ? c.compra : null,
        Number.isFinite(c.venta) ? c.venta : null,
        Number.isFinite(c.volatilidadImplicita) ? c.volatilidadImplicita : null,
        Number.isFinite(c.importeNegociado) ? c.importeNegociado : null,
        Number.isFinite(precioSubyacente) ? precioSubyacente : null,
        proveedor
      );
      guardados++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { guardados, sesion };
}

/**
 * Estadísticos históricos por contrato, para alimentar los factores del score que
 * dependen de la serie propia. Excluye la sesión en curso para no comparar el dato
 * contra sí mismo.
 */
function estadisticosPorContrato(simbolo, { sesionesMinimas = 3 } = {}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const filas = db
    .prepare(
      `SELECT lado, strike, vencimiento,
              COUNT(*) AS sesiones,
              AVG(volumen) AS volumen_medio,
              MAX(volumen) AS volumen_maximo
       FROM opciones_historico
       WHERE simbolo = ? AND sesion < ? AND volumen IS NOT NULL
       GROUP BY lado, strike, vencimiento
       HAVING sesiones >= ?`
    )
    .all(simbolo, hoy, sesionesMinimas);

  const mapa = new Map();
  for (const f of filas) {
    mapa.set(`${f.lado}|${f.strike}|${f.vencimiento}`, {
      sesiones: f.sesiones,
      volumenMedio: f.volumen_medio,
      volumenMaximo: f.volumen_maximo,
    });
  }
  return mapa;
}

/** Serie archivada de un contrato concreto. */
function serieContrato({ simbolo, lado, strike, vencimiento, limite = 60 }) {
  return db
    .prepare(
      `SELECT sesion, volumen, interes_abierto AS interesAbierto, ultimo,
              importe_negociado AS importeNegociado, precio_subyacente AS precioSubyacente
       FROM opciones_historico
       WHERE simbolo = ? AND lado = ? AND strike = ? AND vencimiento = ?
       ORDER BY sesion DESC LIMIT ?`
    )
    .all(simbolo, lado, strike, vencimiento, limite)
    .reverse();
}

/** Cobertura acumulada: cuántas sesiones y contratos hay archivados. */
function coberturaHistorica(simbolo = null) {
  const donde = simbolo ? 'WHERE simbolo = ?' : '';
  const parametros = simbolo ? [simbolo] : [];

  const resumen = db
    .prepare(
      `SELECT COUNT(*) AS registros,
              COUNT(DISTINCT sesion) AS sesiones,
              COUNT(DISTINCT simbolo) AS simbolos,
              MIN(sesion) AS desde,
              MAX(sesion) AS hasta
       FROM opciones_historico ${donde}`
    )
    .get(...parametros);

  return {
    ...resumen,
    // Los factores que dependen del histórico exigen un mínimo de sesiones.
    suficienteParaComparar: (resumen?.sesiones ?? 0) >= 3,
    sesionesNecesarias: 3,
    retencionDias: RETENCION_DIAS,
  };
}

/** Retira las instantáneas más antiguas que la ventana de retención. */
function aplicarRetencion() {
  if (RETENCION_DIAS <= 0) return 0;
  const corte = new Date(Date.now() - RETENCION_DIAS * 86400000).toISOString().slice(0, 10);
  return db.prepare('DELETE FROM opciones_historico WHERE sesion < ?').run(corte).changes;
}

module.exports = {
  registrarInstantanea, estadisticosPorContrato, serieContrato,
  coberturaHistorica, aplicarRetencion, RETENCION_DIAS,
};
