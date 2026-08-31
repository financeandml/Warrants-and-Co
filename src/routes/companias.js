'use strict';

/** Compañías bajo cobertura: listado, búsqueda y ficha individual. */

const express = require('express');
const companias = require('../companias');
const { carteraDeReferencia } = require('../cartera-referencia');
const catalizadores = require('../catalizadores');

const router = express.Router();

// Cierra sobre la `cartera` ya calculada de esta petición, para que el
// cruce de portfolioStatus de cada catalizador use el mismo resultado que
// el resto de la ficha, sin recalcular el motor una segunda vez.
const agendaDe = (cartera) => (filtro) => catalizadores.agenda({ ...filtro, cartera });

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
        datos.companias.map((c) => companias.detalle(c.ticker ?? c.clave, { cartera, agendaDe: agendaDe(cartera) }))
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
    const ficha = await companias.detalle(req.params.clave, { cartera, agendaDe: agendaDe(cartera) });
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
