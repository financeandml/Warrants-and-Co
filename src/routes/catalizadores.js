'use strict';

/** Agenda de catalizadores con fecha verificable. */

const express = require('express');
const catalizadores = require('../catalizadores');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const datos = await catalizadores.agenda({
      ticker: req.query.ticker || null,
      tipo: req.query.tipo || null,
      horizonte: req.query.horizonte || null,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json(datos);
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
