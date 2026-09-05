'use strict';

/**
 * Envío de correo vía Elastic Email — API REST v2, sin SDK: es una sola
 * llamada `fetch` con el cuerpo en `application/x-www-form-urlencoded`,
 * mismo criterio que ya sigue `src/market/yahoo.js` para no sumar una
 * dependencia por un proveedor que solo hace falta pedir así de vez en cuando.
 */

const ENDPOINT = 'https://api.elasticemail.com/v2/email/send';
const TIMEOUT_MS = 15_000;

class ErrorElasticEmail extends Error {
  constructor(mensaje, { detalle = null } = {}) {
    super(mensaje);
    this.name = 'ErrorElasticEmail';
    this.detalle = detalle;
  }
}

/**
 * @param {object} correo
 * @param {string} correo.para        destinatario
 * @param {string} correo.asunto
 * @param {string} correo.html
 * @param {string} [correo.texto]     alternativa en texto plano
 */
async function enviarCorreo({ para, asunto, html, texto }) {
  const clave = process.env.ELASTIC_EMAIL_API_KEY;
  if (!clave) {
    throw new ErrorElasticEmail('Falta ELASTIC_EMAIL_API_KEY: no se puede enviar correo.');
  }
  const remitente = process.env.NEWSLETTER_REMITENTE || 'newsletter@warrantsandco.com';
  const nombreRemitente = process.env.NEWSLETTER_REMITENTE_NOMBRE || 'Warrants & Co.';

  const cuerpo = new URLSearchParams();
  cuerpo.set('apikey', clave);
  cuerpo.set('from', remitente);
  cuerpo.set('fromName', nombreRemitente);
  cuerpo.set('to', para);
  cuerpo.set('subject', asunto);
  cuerpo.set('bodyHtml', html);
  if (texto) cuerpo.set('bodyText', texto);
  cuerpo.set('isTransactional', 'false');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new ErrorElasticEmail(`Elastic Email respondió ${res.status}`, { detalle: await res.text().catch(() => null) });
  }
  const datos = await res.json().catch(() => null);
  // La API v2 responde 200 incluso ante fallo propio del envío; el éxito real
  // va en `success`, y confundir las dos cosas dejaría un correo "enviado" que
  // nunca salió sin que nada lo declarase.
  if (!datos || datos.success !== true) {
    throw new ErrorElasticEmail('Elastic Email rechazó el envío.', { detalle: datos?.error ?? null });
  }
  return datos;
}

module.exports = { enviarCorreo, ErrorElasticEmail };
