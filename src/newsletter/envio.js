'use strict';

/**
 * Programador de la newsletter: diaria y semanal, sin depender de una
 * dependencia de cron — mismo patrón de `setInterval` + comprobación de reloj
 * que ya usa `src/noticias/sincronizacion.js`, comprobado cada minuto.
 *
 * Nunca reintenta el mismo hueco dos veces: guarda la última fecha (día para
 * la diaria, semana ISO para la semanal) en la que YA se envió, en memoria.
 * Un reinicio del proceso puede perder ese estado y reenviar dentro del mismo
 * minuto de coincidencia — riesgo aceptado, documentado, y del mismo orden que
 * ya asume `sincronizacion.js` para su propio intervalo.
 */

const { db } = require('../db');
const { enviarCorreo, ErrorElasticEmail } = require('./elasticEmail');
const { digestDiario, digestSemanal } = require('./contenido');

const COMPROBACION_MS = 60_000;
const HORA_DIARIA = process.env.NEWSLETTER_HORA_DIARIA ?? '07:00';
const HORA_SEMANAL = process.env.NEWSLETTER_HORA_SEMANAL ?? '07:30';
const DIA_SEMANAL = Number(process.env.NEWSLETTER_DIA_SEMANAL ?? 1); // 0=domingo, 1=lunes

const estado = {
  ultimoDiaEnviado: null, // 'AAAA-MM-DD'
  ultimaSemanaEnviada: null, // 'AAAA-Www'
  ultimoResultado: null,
  incidencias: [],
};

let temporizador = null;

function suscriptoresActivos() {
  return db.prepare('SELECT id, email, token_baja FROM suscriptores_newsletter WHERE activo = 1').all();
}

function urlBajaDe(token) {
  const base = process.env.URL_PUBLICA || `http://127.0.0.1:${process.env.PORT ?? 4173}`;
  return `${base.replace(/\/$/, '')}/api/newsletter/baja?token=${encodeURIComponent(token)}`;
}

function semanaIso(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d - inicioAno) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

async function enviarATodos(construirDigest) {
  const suscriptores = suscriptoresActivos();
  let enviados = 0;
  const fallidos = [];
  for (const s of suscriptores) {
    const { asunto, html } = construirDigest(urlBajaDe(s.token_baja));
    try {
      // Uno a uno, no en lote: cada correo lleva su propio enlace de baja, y
      // Elastic Email no acepta cuerpos distintos por destinatario en un
      // único envío por lista.
      await enviarCorreo({ para: s.email, asunto, html });
      enviados++;
    } catch (err) {
      fallidos.push({ email: s.email, motivo: err instanceof ErrorElasticEmail ? err.message : String(err) });
    }
  }
  return { enviados, fallidos, total: suscriptores.length };
}

async function comprobarReloj() {
  const ahora = new Date();
  const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const hoy = ahora.toISOString().slice(0, 10);

  if (hhmm === HORA_DIARIA && estado.ultimoDiaEnviado !== hoy) {
    estado.ultimoDiaEnviado = hoy; // se marca ANTES de enviar: un fallo de red no debe reabrir la ventana del minuto
    const resultado = await enviarATodos(digestDiario).catch((err) => ({ error: err.message }));
    estado.ultimoResultado = { tipo: 'diaria', momento: ahora.toISOString(), ...resultado };
  }

  const semana = semanaIso(ahora);
  if (ahora.getDay() === DIA_SEMANAL && hhmm === HORA_SEMANAL && estado.ultimaSemanaEnviada !== semana) {
    estado.ultimaSemanaEnviada = semana;
    const resultado = await enviarATodos(digestSemanal).catch((err) => ({ error: err.message }));
    estado.ultimoResultado = { tipo: 'semanal', momento: ahora.toISOString(), ...resultado };
  }
}

function iniciarProgramador() {
  if (temporizador) return;
  temporizador = setInterval(() => {
    comprobarReloj().catch((err) => {
      estado.incidencias.unshift({ mensaje: err.message, momento: new Date().toISOString() });
      estado.incidencias.length = Math.min(estado.incidencias.length, 20);
    });
  }, COMPROBACION_MS);
  temporizador.unref();
}

function detenerProgramador() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

module.exports = {
  iniciarProgramador, detenerProgramador, enviarATodos, urlBajaDe,
  estado: () => ({ ...estado, horaDiaria: HORA_DIARIA, horaSemanal: HORA_SEMANAL, diaSemanal: DIA_SEMANAL }),
};
