'use strict';

/** API de opciones: cadena, flujo, actividad inusual e histórico. */

const express = require('express');
const { db } = require('../db');
const opciones = require('../opciones');

const router = express.Router();

/** Valores bajo cobertura, reutilizando el criterio del resto de la plataforma. */
function universoCobertura() {
  return db
    .prepare(
      `SELECT DISTINCT ticker FROM informes
       WHERE ticker IS NOT NULL AND ticker <> '' ORDER BY ticker`
    )
    .all()
    .map((f) => f.ticker);
}

/** Estado del subsistema: qué publica el proveedor y qué falta. */
router.get('/estado', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ...opciones.estado(), universo: universoCobertura(), momento: new Date().toISOString() });
});

/** Cadena de opciones de un subyacente. */
router.get('/cadena/:simbolo', async (req, res, next) => {
  try {
    const cadena = await opciones.getOptionChain(req.params.simbolo);
    res.setHeader('Cache-Control', 'no-store');
    res.json(cadena);
  } catch (err) {
    if (err.codigo === 'SIMBOLO_INVALIDO') return res.status(400).json({ error: err.message });
    // Una carencia del proveedor no es un fallo del servicio: se distingue del error.
    if (err.name === 'ErrorProveedorOpciones') {
      return res.status(err.transitorio ? 502 : 501).json({
        error: err.message, capacidad: err.capacidad, proveedor: err.proveedor, disponible: false,
      });
    }
    next(err);
  }
});

/** Flujo de operaciones individuales. */
router.get('/flujo', async (req, res, next) => {
  try {
    const flujo = await opciones.getOptionsFlow({ simbolo: req.query.simbolo ?? null });
    res.setHeader('Cache-Control', 'no-store');
    res.json(flujo);
  } catch (err) {
    next(err);
  }
});

/** Actividad inusual sobre el universo en cobertura o sobre los símbolos indicados. */
router.get('/inusual', async (req, res, next) => {
  try {
    const solicitados = String(req.query.simbolos ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const universo = solicitados.length ? solicitados : universoCobertura();

    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 25, 1), 100);
    const minimoVolumen = Math.max(parseInt(req.query.minimoVolumen, 10) || 1, 0);

    const resultado = await opciones.getUnusualActivity(universo, { limite, minimoVolumen });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ...resultado, universo });
  } catch (err) {
    next(err);
  }
});

/** Actividad histórica archivada. */
router.get('/historico/:simbolo', async (req, res, next) => {
  try {
    const { lado, strike, vencimiento } = req.query;
    const datos = await opciones.getHistoricalOptionsActivity({
      simbolo: req.params.simbolo, lado, strike, vencimiento,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json(datos);
  } catch (err) {
    if (err.codigo === 'SIMBOLO_INVALIDO') return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = { router, universoCobertura };
