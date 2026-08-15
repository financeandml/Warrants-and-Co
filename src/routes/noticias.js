'use strict';

/** Servicio de noticias: mercados, macroeconomía y compañías bajo cobertura. */

const express = require('express');
const { db } = require('../db');
const { validarNoticia, CATEGORIAS_NOTICIA, RELEVANCIAS, ETIQUETAS_RELEVANCIA } = require('../validacion');
const sincronizacion = require('../noticias/sincronizacion');

const router = express.Router();

function mapear(fila) {
  if (!fila) return null;
  const lista = (v) => {
    try {
      const x = JSON.parse(v ?? '[]');
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  };
  return {
    ...fila,
    tickers: lista(fila.tickers),
    etiquetas: lista(fila.etiquetas),
    destacada: Boolean(fila.destacada),
  };
}

/** Traduce texto libre a una expresion FTS5 segura (mismos criterios que el repositorio). */
function consultaFts(texto) {
  const terminos = String(texto)
    .toLowerCase()
    .replace(/["^*():{}[\]~+\-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 12);
  if (!terminos.length) return null;
  return terminos.map((t) => `"${t}"*`).join(' AND ');
}

router.get('/vocabularios', (req, res) => {
  const distintos = (columna) =>
    db.prepare(`SELECT DISTINCT ${columna} AS v FROM noticias WHERE ${columna} IS NOT NULL AND ${columna} <> '' ORDER BY v`)
      .all().map((r) => r.v);

  res.json({
    categorias: CATEGORIAS_NOTICIA,
    relevancias: RELEVANCIAS,
    etiquetasRelevancia: ETIQUETAS_RELEVANCIA,
    fuentes: distintos('fuente'),
    autores: distintos('autor'),
    origenes: distintos('origen'),
  });
});

router.get('/', (req, res) => {
  const { q, categoria, ticker, relevancia, origen, destacada, desde, hasta } = req.query;

  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 12, 1), 60);
  const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
  const desplazamiento = (pagina - 1) * limite;

  const condiciones = [];
  const parametros = [];
  let desdeFts = '';
  // El momento exacto ordena mejor que la fecha cuando llegan muchas piezas el mismo dia.
  let orden = 'COALESCE(n.momento_publicacion, n.fecha_publicacion) DESC, n.id DESC';

  if (q && String(q).trim()) {
    const expresion = consultaFts(q);
    if (expresion) {
      desdeFts = 'JOIN noticias_fts f ON f.rowid = n.id';
      condiciones.push('noticias_fts MATCH ?');
      parametros.push(expresion);
      orden = 'f.rank, COALESCE(n.momento_publicacion, n.fecha_publicacion) DESC';
    } else {
      condiciones.push('n.titular LIKE ?');
      parametros.push(`%${String(q).trim()}%`);
    }
  }

  if (categoria && String(categoria).trim()) {
    condiciones.push('n.categoria = ?');
    parametros.push(String(categoria).trim());
  }
  if (relevancia && String(relevancia).trim()) {
    condiciones.push('n.relevancia = ?');
    parametros.push(String(relevancia).trim());
  }
  if (origen && String(origen).trim()) {
    condiciones.push('n.origen = ?');
    parametros.push(String(origen).trim());
  }
  if (ticker && String(ticker).trim()) {
    // Coincidencia sobre el elemento serializado, no sobre la cadena completa.
    condiciones.push('EXISTS (SELECT 1 FROM json_each(n.tickers) je WHERE upper(je.value) = upper(?))');
    parametros.push(String(ticker).trim().replace(/^\$/, ''));
  }
  if (destacada === 'true' || destacada === '1') condiciones.push('n.destacada = 1');
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) { condiciones.push('n.fecha_publicacion >= ?'); parametros.push(desde); }
  if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) { condiciones.push('n.fecha_publicacion <= ?'); parametros.push(hasta); }

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM noticias n ${desdeFts} ${donde}`).get(...parametros);
    const filas = db
      .prepare(`SELECT n.* FROM noticias n ${desdeFts} ${donde} ORDER BY ${orden} LIMIT ? OFFSET ?`)
      .all(...parametros, limite, desplazamiento);

    res.json({
      noticias: filas.map(mapear),
      paginacion: { total, pagina, limite, paginas: Math.max(Math.ceil(total / limite), 1) },
    });
  } catch (err) {
    if (/fts5|MATCH|malformed/i.test(err.message)) {
      return res.status(400).json({ error: 'La consulta de búsqueda no es válida.' });
    }
    throw err;
  }
});

/** Titulares para la portada, con las noticias destacadas en primer lugar. */
router.get('/portada', (req, res) => {
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 5, 1), 20);
  const porMomento = 'COALESCE(momento_publicacion, fecha_publicacion) DESC, id DESC';
  const destacadas = db
    .prepare(`SELECT * FROM noticias WHERE destacada = 1 ORDER BY ${porMomento} LIMIT ?`)
    .all(limite).map(mapear);
  const recientes = db
    .prepare(`SELECT * FROM noticias ORDER BY ${porMomento} LIMIT ?`)
    .all(limite).map(mapear);
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM noticias').get();
  res.json({ destacadas, recientes, total });
});

/** Diagnostico de la sindicacion automatica. */
router.get('/sincronizacion', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(sincronizacion.estadoSincronizacion());
});

/** Fuerza una incorporacion inmediata. Reservada al equipo. */
router.post('/sincronizar', async (req, res, next) => {
  try {
    const canales = Array.isArray(req.body?.canales) ? req.body.canales : undefined;
    const resultado = await sincronizacion.sincronizar({ canales });
    res.json({ ...resultado, estado: sincronizacion.estadoSincronizacion() });
  } catch (err) {
    res.status(502).json({
      error: `No ha sido posible sincronizar con Investing.com: ${err.message}`,
      estado: sincronizacion.estadoSincronizacion(),
    });
  }
});

router.get('/:id(\\d+)', (req, res) => {
  const fila = db.prepare('SELECT * FROM noticias WHERE id = ?').get(Number(req.params.id));
  if (!fila) return res.status(404).json({ error: 'La noticia solicitada no existe.' });
  res.json(mapear(fila));
});

router.post('/', (req, res) => {
  const datos = validarNoticia(req.body ?? {});
  const columnas = Object.keys(datos);
  const info = db
    .prepare(`INSERT INTO noticias (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`)
    .run(...columnas.map((c) => datos[c]));
  const fila = db.prepare('SELECT * FROM noticias WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json(mapear(fila));
});

router.put('/:id(\\d+)', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM noticias WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'La noticia solicitada no existe.' });
  }
  const datos = validarNoticia(req.body ?? {}, { parcial: true });
  const columnas = Object.keys(datos);
  if (columnas.length) {
    db.prepare(`UPDATE noticias SET ${columnas.map((c) => `${c} = ?`).join(', ')}, actualizado_en = datetime('now') WHERE id = ?`)
      .run(...columnas.map((c) => datos[c]), id);
  }
  res.json(mapear(db.prepare('SELECT * FROM noticias WHERE id = ?').get(id)));
});

router.delete('/:id(\\d+)', (req, res) => {
  const info = db.prepare('DELETE FROM noticias WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'La noticia solicitada no existe.' });
  res.json({ eliminado: Number(req.params.id) });
});

module.exports = { router };
