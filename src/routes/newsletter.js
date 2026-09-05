'use strict';

/** Alta y baja de la newsletter. Sin credencial: es un formulario público. */

const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { cuerpoError } = require('../errores');

const router = express.Router();

// Validación deliberadamente simple: basta para descartar errores de tecleo,
// no pretende ser el estándar RFC 5322 completo. Elastic Email es quien de
// verdad comprueba si la dirección existe al intentar entregar el correo.
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/suscribir', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const idioma = req.body?.idioma === 'en' ? 'en' : 'es';

  if (!PATRON_EMAIL.test(email) || email.length > 254) {
    return res.status(422).json(cuerpoError('EMAIL_NO_VALIDO'));
  }

  const existente = db.prepare('SELECT id, activo, token_baja FROM suscriptores_newsletter WHERE email = ?').get(email);
  if (existente) {
    // Reactiva sin duplicar: quien se dio de baja y vuelve a apuntarse no
    // necesita una segunda fila ni un segundo enlace de baja.
    if (!existente.activo) {
      db.prepare('UPDATE suscriptores_newsletter SET activo = 1, idioma = ?, dado_baja_en = NULL WHERE id = ?').run(idioma, existente.id);
    }
    return res.json({ suscrito: true, yaExistia: true });
  }

  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO suscriptores_newsletter (email, idioma, token_baja) VALUES (?, ?, ?)').run(email, idioma, token);
  res.status(201).json({ suscrito: true, yaExistia: false });
});

router.get('/baja', (req, res) => {
  const token = String(req.query.token ?? '');
  const fila = db.prepare('SELECT id FROM suscriptores_newsletter WHERE token_baja = ? AND activo = 1').get(token);
  if (!fila) {
    return res.status(404).json(cuerpoError('TOKEN_BAJA_NO_VALIDO'));
  }
  db.prepare("UPDATE suscriptores_newsletter SET activo = 0, dado_baja_en = datetime('now') WHERE id = ?").run(fila.id);
  res.json({ baja: true });
});

module.exports = { router };
