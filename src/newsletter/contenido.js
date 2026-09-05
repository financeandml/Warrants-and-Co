'use strict';

/**
 * Contenido de la newsletter: se lee de la MISMA tabla `noticias` que ya
 * alimenta la sección de Noticias de la plataforma (regla 9 — un hecho, una
 * fuente). No hay una segunda incorporación de noticias propia de este
 * módulo: si no hay nada sincronizado, la newsletter no tiene nada que
 * publicar, y lo declara así en vez de inventar un resumen.
 */

const { db } = require('../db');

const ORDEN_RELEVANCIA = "CASE relevancia WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 ELSE 2 END";

/** Noticias sincronizadas en las últimas `horas`, más relevantes primero. */
function noticiasDesde(horas, limite) {
  return db
    .prepare(
      `SELECT titular, entradilla, categoria, fuente, url_fuente, momento_publicacion
       FROM noticias
       WHERE momento_publicacion >= datetime('now', ?)
       ORDER BY ${ORDEN_RELEVANCIA} ASC, destacada DESC, momento_publicacion DESC
       LIMIT ?`
    )
    .all(`-${horas} hours`, limite);
}

function escaparHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function filaHtml(n) {
  const fuente = [n.fuente, n.categoria].filter(Boolean).join(' · ');
  const enlace = n.url_fuente
    ? `<a href="${escaparHtml(n.url_fuente)}" style="color:#4F46E5;text-decoration:none;">${escaparHtml(n.titular)}</a>`
    : escaparHtml(n.titular);
  return `
    <tr>
      <td style="padding:14px 0;border-top:1px solid #e5e5e5;">
        <div style="font-size:15px;font-weight:600;color:#101011;line-height:1.4;">${enlace}</div>
        ${n.entradilla ? `<div style="font-size:13px;color:#5a5a5f;margin-top:4px;line-height:1.5;">${escaparHtml(n.entradilla)}</div>` : ''}
        ${fuente ? `<div style="font-size:11px;color:#8a8a8f;margin-top:6px;text-transform:uppercase;letter-spacing:.04em;">${escaparHtml(fuente)}</div>` : ''}
      </td>
    </tr>`;
}

function plantilla({ titulo, introduccion, noticias, urlBaja }) {
  const filas = noticias.length
    ? noticias.map(filaHtml).join('')
    : `<tr><td style="padding:24px 0;color:#5a5a5f;font-size:14px;">Sin noticias sincronizadas en este periodo.</td></tr>`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f2f2f0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f0;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;">
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8f;">Warrants &amp; Co.</div>
          <h1 style="font-size:22px;margin:6px 0 4px;color:#101011;">${escaparHtml(titulo)}</h1>
          <p style="font-size:14px;color:#5a5a5f;margin:0 0 12px;">${escaparHtml(introduccion)}</p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e5e5;">
          <p style="font-size:11px;color:#8a8a8f;line-height:1.6;margin:0;">
            Esto es análisis, no recomendación de inversión.
            <a href="${escaparHtml(urlBaja)}" style="color:#8a8a8f;">Darse de baja</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Newsletter diaria: sincronizado en las últimas 24 horas, hasta 10 piezas. */
function digestDiario(urlBaja) {
  const noticias = noticiasDesde(24, 10);
  return {
    asunto: `Resumen del día · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`,
    html: plantilla({
      titulo: 'Resumen diario',
      introduccion: 'Lo más relevante de los mercados en las últimas 24 horas.',
      noticias,
      urlBaja,
    }),
  };
}

/** Newsletter semanal: sincronizado en los últimos 7 días, hasta 15 piezas. */
function digestSemanal(urlBaja) {
  const noticias = noticiasDesde(24 * 7, 15);
  return {
    asunto: 'Resumen semanal de mercados',
    html: plantilla({
      titulo: 'Resumen semanal',
      introduccion: 'Los eventos y noticias más importantes de la semana.',
      noticias,
      urlBaja,
    }),
  };
}

module.exports = { digestDiario, digestSemanal };
