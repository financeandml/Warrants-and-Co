'use strict';

/** Compañías bajo cobertura: listado, búsqueda y ficha individual. */

const express = require('express');
const companias = require('../companias');
const { calcularCartera } = require('../cartera');
const { lineasDeCartera } = require('./mercado');
const catalizadores = require('../catalizadores');

const router = express.Router();

/*
 * El estado de portfolio (OPEN/CLOSED/NOT_HELD) y los catalysts de la ficha
 * cruzan con motores que viven en otros módulos —cartera y catalizadores—.
 * Se resuelven UNA vez por petición, no una vez por compañía: `calcularCartera()`
 * trae histórico de mercado de cada posición, y llamarla dentro de un bucle de
 * fichas (el modo `detalle=1` sirve todas a la vez) la habría repetido tantas
 * veces como compañías hay, para un resultado idéntico cada vez.
 */
async function carteraDeReferencia() {
  const lineas = lineasDeCartera();
  if (!lineas.length) return null;
  try {
    return await calcularCartera(lineas);
  } catch {
    // Un fallo del motor de cartera no debe tumbar la ficha de compañía: el
    // estado de portfolio simplemente queda sin comprobar (`null`).
    return null;
  }
}

const agendaDe = (filtro) => catalizadores.agenda(filtro);

router.get('/', async (req, res, next) => {
  try {
    const datos = companias.listar({
      q: req.query.q ?? '',
      sector: req.query.sector || null,
      soloCartera: req.query.cartera === '1' || req.query.cartera === 'true',
    });

    // `detalle=1` devuelve la ficha completa de cada compañía en una sola
    // llamada. La portada las necesita todas y pedirlas una a una multiplicaba
    // los viajes de ida y vuelta sin ganar nada.
    if (req.query.detalle === '1' || req.query.detalle === 'true') {
      const cartera = await carteraDeReferencia();
      const fichas = await Promise.allSettled(
        datos.companias.map((c) => companias.detalle(c.ticker ?? c.clave, { cartera, agendaDe }))
      );
      datos.fichas = fichas
        .filter((f) => f.status === 'fulfilled' && f.value)
        .map((f) => f.value);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(datos);
  } catch (err) {
    next(err);
  }
});

router.get('/:clave', async (req, res, next) => {
  try {
    const cartera = await carteraDeReferencia();
    const ficha = await companias.detalle(req.params.clave, { cartera, agendaDe });
    if (!ficha) {
      return res.status(404).json({
        error: 'La compañía no figura bajo cobertura.',
        codigo: 'COMPANIA_NO_CUBIERTA',
      });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(ficha);
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
