'use strict';

/** Datos de mercado y analitica de la cartera de Warrants & Co. */

const express = require('express');
const { db } = require('../db');
const mercado = require('../market');
const { calcularCartera } = require('../cartera');
const { obtenerPanorama } = require('../mercado/panorama');

const router = express.Router();

const BENCHMARKS = new Set(['SPY', 'QQQ', 'DIA', 'IWM']);

/** Lineas de cartera: tesis con ticker marcadas para consolidar. */
function lineasDeCartera() {
  return db
    .prepare(
      `SELECT id, empresa, ticker, sector, pais, recomendacion, precio_objetivo, peso_cartera,
              precio_compra, take_profit, stop_loss, divisa, fecha_publicacion
       FROM informes
       WHERE en_cartera = 1 AND ticker IS NOT NULL AND ticker <> ''
       ORDER BY fecha_publicacion ASC, id ASC`
    )
    .all();
}

/** Panorama de mercado: índices, volatilidad y curva de tipos con calidad declarada. */
router.get('/panorama', async (req, res, next) => {
  try {
    const datos = await obtenerPanorama();
    res.setHeader('Cache-Control', 'no-store');
    res.json(datos);
  } catch (err) {
    next(err);
  }
});

/**
 * Serie histórica de un instrumento, para los gráficos de la portada.
 *
 * Ningún proveedor conectado publica series de índices —Nasdaq solo sirve
 * valores negociables—, de modo que un símbolo sin serie devuelve 404 con su
 * motivo en lugar de una lista vacía que la interfaz interpretaría como «cero».
 */
router.get('/serie/:simbolo', async (req, res, next) => {
  const simbolo = String(req.params.simbolo ?? '').toUpperCase();
  const dias = Math.min(Math.max(Number(req.query.dias) || 180, 20), 400);
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);

  try {
    const crudo = await mercado.obtenerHistorico(simbolo, desde);
    const serie = (Array.isArray(crudo) ? crudo : crudo?.serie ?? [])
      .filter((p) => p && p.fecha && Number.isFinite(p.cierre))
      .map((p) => ({ fecha: p.fecha, valor: p.cierre }));

    if (serie.length < 2) {
      return res.status(404).json({
        error: 'Sin serie histórica utilizable para el instrumento.',
        codigo: 'SIN_SERIE',
        simbolo,
        disponible: false,
      });
    }

    const primero = serie[0].valor;
    const ultimo = serie[serie.length - 1].valor;

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      simbolo,
      serie,
      puntos: serie.length,
      desde: serie[0].fecha,
      hasta: serie[serie.length - 1].fecha,
      // Variación del periodo: aritmética sobre dos observaciones.
      variacionPeriodoPct: Number(((ultimo / primero - 1) * 100).toFixed(2)),
      minimo: Math.min(...serie.map((p) => p.valor)),
      maximo: Math.max(...serie.map((p) => p.valor)),
      calidad: 'HISTORICAL',
      disponible: true,
      generadoEn: new Date().toISOString(),
    });
  } catch (err) {
    if (/Sin datos de mercado|Fecha de inicio/i.test(err?.message ?? '')) {
      return res.status(404).json({
        error: 'Ningún proveedor conectado publica la serie de este instrumento.',
        codigo: 'SIN_SERIE',
        simbolo,
        disponible: false,
        detalle: err.message,
      });
    }
    next(err);
  }
});

router.get('/cartera', async (req, res, next) => {
  try {
    const benchmark = BENCHMARKS.has(String(req.query.benchmark ?? '').toUpperCase())
      ? String(req.query.benchmark).toUpperCase()
      : 'SPY';

    const rfBruto = Number(req.query.rf);
    const tasaLibreRiesgo = Number.isFinite(rfBruto) && rfBruto >= 0 && rfBruto <= 25 ? rfBruto : 4;

    const lineas = lineasDeCartera();
    if (!lineas.length) {
      return res.json({
        vacia: true,
        mensaje: 'La cartera se constituye automáticamente a partir de las tesis publicadas con ticker asignado.',
        posiciones: [], cerradas: [], serie: [], serieIndice: [], estadisticos: null,
        benchmark, generadoEn: new Date().toISOString(),
      });
    }

    const cartera = await calcularCartera(lineas, { benchmark, tasaLibreRiesgo });
    // Cada recarga debe reflejar la ultima cotizacion disponible.
    res.setHeader('Cache-Control', 'no-store');
    res.json({ vacia: false, ...cartera });
  } catch (err) {
    next(err);
  }
});

router.get('/cotizacion/:simbolo', async (req, res, next) => {
  try {
    const q = await mercado.obtenerCotizacion(req.params.simbolo);
    res.setHeader('Cache-Control', 'no-store');
    res.json(q);
  } catch (err) {
    if (err.codigo === 'SIMBOLO_INVALIDO') return res.status(400).json({ error: err.message });
    if (err.codigo === 'SIN_DATOS_MERCADO') return res.status(502).json({ error: err.message });
    next(err);
  }
});

router.get('/estado', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ mercado: mercado.estado(), momento: new Date().toISOString() });
});

module.exports = { router, lineasDeCartera };
