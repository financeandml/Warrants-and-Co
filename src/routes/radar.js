'use strict';

/**
 * W&C Radar, W&C Signal y agenda de catalizadores.
 *
 * Solo agrega: la lectura de cada señal la produce su módulo y los datos de cartera
 * e informes proceden de los servicios ya existentes, sin duplicar su lógica.
 */

const express = require('express');
const { db } = require('../db');
const { obtenerSenales } = require('../senales');
const { evaluar, DIMENSIONES } = require('../signal');
const { obtenerIndices } = require('../mercado/indices');
const catalizadores = require('../catalizadores');

const router = express.Router();

/** Valores bajo cobertura: los que sostienen una tesis con ticker. */
function universoCobertura() {
  return db
    .prepare(
      `SELECT DISTINCT ticker FROM informes
       WHERE ticker IS NOT NULL AND ticker <> ''
       ORDER BY ticker`
    )
    .all()
    .map((f) => f.ticker);
}

router.get('/', async (req, res, next) => {
  try {
    const universo = universoCobertura();
    const senales = await obtenerSenales({ universo });

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      senales,
      universo,
      operativas: senales.filter((s) => s.disponible).length,
      total: senales.length,
      generadoEn: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * W&C Signal. Reaprovecha las lecturas del radar para no recalcular series ya
 * descargadas por la cascada de mercado.
 */
router.get('/signal', async (req, res, next) => {
  try {
    const universo = universoCobertura();
    const senales = await obtenerSenales({ universo });

    const porClave = new Map(senales.map((s) => [s.clave, s]));
    const lecturaDe = (clave, ticker) =>
      (porClave.get(clave)?.lecturas ?? []).find((l) => l.ticker === ticker) ?? null;

    const valores = universo.map((ticker) =>
      evaluar(ticker, {
        momentum: lecturaDe('momentum', ticker),
        volatilidad: lecturaDe('volatilidad', ticker),
      })
    );

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      valores,
      dimensiones: DIMENSIONES,
      // El agregado de cartera solo se emite cuando todos los valores puntúan.
      agregado: valores.length && valores.every((v) => v.disponible)
        ? Number((valores.reduce((a, v) => a + v.puntuacion, 0) / valores.length).toFixed(1))
        : null,
      disponible: valores.length > 0 && valores.every((v) => v.disponible),
      motivo: 'Modelo en construcción: faltan fuentes por conectar',
      generadoEn: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Agenda de catalizadores para el cuadro de mando: los próximos eventos con
 * fecha verificable. Es la misma agenda de la sección Catalysts, recortada a lo
 * inmediato; las categorías sin fuente viajan aparte para que el panel pueda
 * seguir declarando lo que no cubre.
 */
router.get('/catalizadores', async (req, res, next) => {
  try {
    const agenda = await catalizadores.agenda({ horizonte: 'UPCOMING' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      eventos: agenda.proximos.slice(0, 6).map((e) => ({
        fecha: e.fecha,
        evento: e.titulo,
        ticker: e.ticker,
        tipo: e.tipo,
        prioridad: e.prioridad,
        motivo: e.motivo,
        dias: e.dias,
      })),
      total: agenda.resumen.proximos,
      disponible: agenda.proximos.length > 0,
      // Lo que la agenda no cubre se sigue declarando.
      sinFuente: agenda.sinFuente,
      motivo: 'Resultados, guidance y eventos corporativos requieren un calendario no conectado',
      tipos: agenda.sinFuente.map((c) => c.tipo),
      universo: universoCobertura(),
      generadoEn: agenda.generadoEn,
    });
  } catch (err) {
    next(err);
  }
});

/** Panorama de índices para el encabezado del cuadro de mando. */
router.get('/indices', async (req, res, next) => {
  try {
    const datos = await obtenerIndices();
    res.setHeader('Cache-Control', 'no-store');
    res.json(datos);
  } catch (err) {
    next(err);
  }
});

module.exports = { router, universoCobertura };
