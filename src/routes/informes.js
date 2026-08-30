'use strict';

/** Repositorio documental: alta, catalogacion, busqueda y distribucion de informes. */

const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const { db, UPLOAD_DIR } = require('../db');
const { cuerpoError } = require('../errores');
const sincronizacion = require('../noticias/sincronizacion');
const { validarInforme, ErrorValidacion, TIPOS_INFORME, RECOMENDACIONES, NIVELES_ACCESO, ETIQUETAS_ACCESO, SECTORES, DIVISAS } = require('../validacion');
const { leerPdf, ErrorLectura, CODIGOS_LECTURA } = require('../extraccion/pdf');
const { extraerFicha, CAMPOS, CAMPOS_FUERA_DE_EXTRACCION } = require('../extraccion/ficha');
const { MOTIVOS_PETICION } = require('../extraccion/motivos');

const router = express.Router();

const LIMITE_BYTES = 25 * 1024 * 1024;
const MAX_FICHEROS = 10;

// Documentacion admitida: PDF, hoja de calculo y documento de texto.
const EXT_PERMITIDAS = new Set(['.pdf', '.xls', '.xlsx', '.xlsm', '.doc', '.docx']);

const FORMATOS = new Map([
  ['application/pdf', ['.pdf']],
  ['application/vnd.ms-excel', ['.xls']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
  ['application/vnd.ms-excel.sheet.macroEnabled.12', ['.xlsm']],
  ['application/msword', ['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  // Algunos navegadores no rotulan el tipo; la extension decide en ese caso.
  ['application/octet-stream', [...EXT_PERMITIDAS]],
  ['', [...EXT_PERMITIDAS]],
]);

/** Denominacion del formato a partir de la extension, para mostrarla en la ficha. */
function formatoDeExtension(ext) {
  if (ext === '.pdf') return 'PDF';
  if (ext === '.doc' || ext === '.docx') return 'Word';
  return 'Excel';
}

const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // El nombre en disco se genera en servidor: nunca se confia en el remitido.
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const subida = multer({
  storage: almacenamiento,
  limits: { fileSize: LIMITE_BYTES, files: MAX_FICHEROS, fields: 60 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extensionesDelTipo = FORMATOS.get(file.mimetype ?? '');
    // Se exige coherencia entre la extension y el tipo declarado: una extension
    // admitida con un tipo que no le corresponde se rechaza.
    if (!EXT_PERMITIDAS.has(ext) || !extensionesDelTipo || !extensionesDelTipo.includes(ext)) {
      const err = new Error('Formato no admitido. Únicamente se aceptan ficheros PDF, Word y Excel.');
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

/** Elimina del disco los ficheros de una peticion abortada. */
function descartarFicheros(ficheros) {
  for (const f of ficheros ?? []) fs.promises.unlink(f.path).catch(() => {});
}

function mapearInforme(fila) {
  if (!fila) return null;
  let etiquetas = [];
  try { etiquetas = JSON.parse(fila.etiquetas ?? '[]'); } catch { etiquetas = []; }
  return {
    ...fila,
    etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
    destacado: Boolean(fila.destacado),
    en_cartera: Boolean(fila.en_cartera),
  };
}

function adjuntosDe(informeId) {
  return db
    .prepare('SELECT id, nombre_original, formato, bytes, tipo_mime, creado_en FROM adjuntos WHERE informe_id = ? ORDER BY id')
    .all(informeId);
}

function informeCompleto(id) {
  const fila = db.prepare('SELECT * FROM informes WHERE id = ?').get(id);
  if (!fila) return null;
  const informe = mapearInforme(fila);
  informe.adjuntos = adjuntosDe(id);
  return informe;
}

/**
 * Traduce texto libre a una expresion FTS5 segura.
 * Se entrecomilla cada termino para neutralizar los operadores del motor y se
 * aplica prefijo para permitir busquedas incrementales.
 */
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

// ------------------------------------------------------------ vocabularios

router.get('/vocabularios', (req, res) => {
  const distintos = (columna) =>
    db.prepare(`SELECT DISTINCT ${columna} AS v FROM informes WHERE ${columna} IS NOT NULL AND ${columna} <> '' ORDER BY v`)
      .all().map((r) => r.v);

  let etiquetas = [];
  try {
    const filas = db.prepare("SELECT etiquetas FROM informes WHERE etiquetas <> '[]'").all();
    const cuenta = new Map();
    for (const f of filas) {
      let lista = [];
      try { lista = JSON.parse(f.etiquetas); } catch { continue; }
      for (const e of lista) cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
    }
    etiquetas = [...cuenta].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([e, n]) => ({ etiqueta: e, usos: n }));
  } catch { etiquetas = []; }

  res.json({
    tipos: TIPOS_INFORME,
    recomendaciones: RECOMENDACIONES,
    nivelesAcceso: NIVELES_ACCESO,
    etiquetasAcceso: ETIQUETAS_ACCESO,
    sectoresSugeridos: SECTORES,
    divisas: DIVISAS,
    sectores: distintos('sector'),
    paises: distintos('pais'),
    analistas: distintos('analista'),
    // El periodo se ofrece como valor por defecto del formulario cuando toda la
    // casa usa el mismo; sin esta lista no hay forma de saber si lo es.
    periodos: distintos('periodo'),
    tickers: distintos('ticker'),
    etiquetas,
  });
});

// -------------------------------------------------------------- listado

router.get('/', (req, res) => {
  const { q, sector, pais, tipo, recomendacion, analista, nivel, ticker, etiqueta, destacado, desde, hasta } = req.query;

  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 20, 1), 100);
  const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
  const desplazamiento = (pagina - 1) * limite;

  const ordenPermitido = {
    recientes: 'i.fecha_publicacion DESC, i.id DESC',
    antiguos: 'i.fecha_publicacion ASC, i.id ASC',
    empresa: 'i.empresa COLLATE NOCASE ASC',
    potencial: 'i.precio_objetivo DESC',
  };
  const orden = ordenPermitido[req.query.orden] ?? ordenPermitido.recientes;

  const condiciones = [];
  const parametros = [];
  let desdeFts = '';
  let ordenFinal = orden;

  if (q && String(q).trim()) {
    const expresion = consultaFts(q);
    if (expresion) {
      desdeFts = 'JOIN informes_fts f ON f.rowid = i.id';
      condiciones.push('informes_fts MATCH ?');
      parametros.push(expresion);
      // Relevancia primero cuando la consulta es textual y no se pidio otro orden.
      if (!req.query.orden) ordenFinal = 'f.rank, i.fecha_publicacion DESC';
    } else {
      // Terminos demasiado cortos para el indice: se recurre a coincidencia directa.
      condiciones.push('(i.empresa LIKE ? OR i.ticker LIKE ?)');
      const patron = `%${String(q).trim()}%`;
      parametros.push(patron, patron);
    }
  }

  for (const [columna, valor] of [
    ['i.sector', sector], ['i.pais', pais], ['i.tipo_informe', tipo],
    ['i.recomendacion', recomendacion], ['i.analista', analista], ['i.nivel_acceso', nivel],
  ]) {
    if (valor && String(valor).trim()) {
      condiciones.push(`${columna} = ?`);
      parametros.push(String(valor).trim());
    }
  }

  if (ticker && String(ticker).trim()) {
    condiciones.push('i.ticker = ?');
    parametros.push(String(ticker).trim().toUpperCase().replace(/^\$/, ''));
  }
  if (etiqueta && String(etiqueta).trim()) {
    // Coincidencia sobre el elemento serializado, evitando falsos positivos parciales.
    condiciones.push('EXISTS (SELECT 1 FROM json_each(i.etiquetas) je WHERE lower(je.value) = lower(?))');
    parametros.push(String(etiqueta).trim());
  }
  if (destacado === 'true' || destacado === '1') condiciones.push('i.destacado = 1');
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) { condiciones.push('i.fecha_publicacion >= ?'); parametros.push(desde); }
  if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) { condiciones.push('i.fecha_publicacion <= ?'); parametros.push(hasta); }

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM informes i ${desdeFts} ${donde}`).get(...parametros);
    const filas = db
      .prepare(`SELECT i.* FROM informes i ${desdeFts} ${donde} ORDER BY ${ordenFinal} LIMIT ? OFFSET ?`)
      .all(...parametros, limite, desplazamiento);

    const informes = filas.map((f) => {
      const m = mapearInforme(f);
      m.adjuntos = adjuntosDe(f.id);
      return m;
    });

    res.json({
      informes,
      paginacion: { total, pagina, limite, paginas: Math.max(Math.ceil(total / limite), 1) },
    });
  } catch (err) {
    // Una expresion FTS malformada no debe traducirse en error de servidor.
    if (/fts5|MATCH|malformed/i.test(err.message)) {
      return res.status(422).json(cuerpoError('VALIDACION', { detalle: 'La consulta de búsqueda no es válida.' }));
    }
    throw err;
  }
});

// ------------------------------------------------------------ destacados

router.get('/destacados', (req, res) => {
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 6, 1), 24);
  const destacados = db
    .prepare('SELECT * FROM informes WHERE destacado = 1 ORDER BY fecha_publicacion DESC, id DESC LIMIT ?')
    .all(limite).map(mapearInforme);
  const recientes = db
    .prepare('SELECT * FROM informes ORDER BY fecha_publicacion DESC, id DESC LIMIT ?')
    .all(limite).map(mapearInforme);

  for (const lista of [destacados, recientes]) for (const i of lista) i.adjuntos = adjuntosDe(i.id);

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM informes').get();
  const { cubiertas } = db
    .prepare("SELECT COUNT(DISTINCT ticker) AS cubiertas FROM informes WHERE ticker IS NOT NULL AND ticker <> ''")
    .get();
  const { analistas } = db
    .prepare("SELECT COUNT(DISTINCT analista) AS analistas FROM informes WHERE analista IS NOT NULL AND analista <> ''")
    .get();
  const { sectores } = db
    .prepare("SELECT COUNT(DISTINCT sector) AS sectores FROM informes WHERE sector IS NOT NULL AND sector <> ''")
    .get();

  res.json({ destacados, recientes, metricas: { total, cubiertas, analistas, sectores } });
});

// ---------------------------------------------------------------- detalle

router.get('/:id(\\d+)', (req, res) => {
  const informe = informeCompleto(Number(req.params.id));
  if (!informe) return res.status(404).json(cuerpoError('RECURSO_NO_ENCONTRADO', { detalle: 'El informe solicitado no existe.' }));
  res.json(informe);
});

// ------------------------------------------------------------ extraccion

/**
 * Analisis de un PDF para proponer la ficha.
 *
 * El documento se recibe en memoria y se descarta al terminar: **no baja a
 * disco**. Lo que se guarda en `data/uploads` es el adjunto del informe, y eso
 * solo ocurre cuando el informe se guarda de verdad. Analizar no es archivar.
 *
 * La respuesta no crea ni modifica nada. Es una propuesta: cada campo llega con
 * su estado —propuesto, ambiguo, referencia o ausente—, la pagina de la que
 * sale y el rotulo que lo respalda, y nada de ello cuenta como valido hasta que
 * el analista lo acepte en el formulario. El guardado sigue pasando por
 * `validarInforme` sin excepcion alguna.
 */
const analisis = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITE_BYTES, files: 1, fields: 4 },
  fileFilter: (req, file, cb) => {
    // Solo PDF: es el unico formato del que esta plataforma sabe leer texto.
    // Un .docx se aceptaria como adjunto, pero de el no se propone nada.
    const ext = path.extname(file.originalname).toLowerCase();
    const tipo = file.mimetype ?? '';
    if (ext !== '.pdf' || !['application/pdf', 'application/octet-stream', ''].includes(tipo)) {
      const err = new Error(MOTIVOS_PETICION.FORMATO_NO_ANALIZABLE);
      err.status = 415;
      err.codigo = 'FORMATO_NO_ANALIZABLE';
      return cb(err);
    }
    cb(null, true);
  },
});

router.post('/extraccion', analisis.single('documento'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: MOTIVOS_PETICION.DOCUMENTO_AUSENTE, codigo: 'DOCUMENTO_AUSENTE' });
  }

  let lectura;
  try {
    lectura = leerPdf(req.file.buffer);
  } catch (err) {
    /* Los fallos de lectura se responden aqui y no en el manejador general
       porque el codigo tiene que llegar al cliente: un PDF cifrado y uno
       escaneado se rotulan distinto, y la interfaz los traduce por codigo. */
    if (err instanceof ErrorLectura) return res.status(422).json({ error: err.message, codigo: err.codigo });
    throw err;
  }

  const { campos, bloques, avisos } = extraerFicha(lectura.paginas);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    documento: {
      nombre: path.basename(req.file.originalname).slice(0, 200),
      paginas: lectura.paginas.length,
      truncado: lectura.truncado,
    },
    bloques,
    campos,
    avisos,
    // Lo que el formulario rellena por su cuenta, para que se distinga de lo leido.
    fueraDeExtraccion: CAMPOS_FUERA_DE_EXTRACCION,
    orden: CAMPOS,
  });
}, (err, req, res, next) => {
  /* Manejador acotado a esta ruta. El general de `server.js` responde solo con
     la frase castellana, y aqui el codigo tiene que llegar al cliente para que
     lo rotule en el idioma de quien mira: es la unica pantalla donde el motivo
     del rechazo es la informacion util. No se toca el general, que sirve al
     resto de rutas y tiene su propia pendiente anotada en `errores.js`. */
  if (err instanceof multer.MulterError) {
    const codigo = err.code === 'LIMIT_FILE_SIZE' ? 'PDF_DEMASIADO_GRANDE' : null;
    if (codigo) return res.status(413).json({ error: CODIGOS_LECTURA[codigo], codigo });
  }
  if (err.codigo && err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message, codigo: err.codigo });
  }
  return next(err);
});

// ------------------------------------------------------------------ alta

router.post('/', subida.array('ficheros', MAX_FICHEROS), (req, res) => {
  let datos;
  try {
    datos = validarInforme(req.body ?? {});
  } catch (err) {
    descartarFicheros(req.files);
    throw err;
  }

  const columnas = Object.keys(datos);
  const marcadores = columnas.map(() => '?').join(', ');

  try {
    // Alta e indexacion de adjuntos en una unica transaccion.
    db.exec('BEGIN IMMEDIATE');
    const info = db
      .prepare(`INSERT INTO informes (${columnas.join(', ')}) VALUES (${marcadores})`)
      .run(...columnas.map((c) => datos[c]));
    const id = Number(info.lastInsertRowid);

    const insertarAdjunto = db.prepare(
      'INSERT INTO adjuntos (informe_id, nombre_fichero, nombre_original, tipo_mime, formato, bytes) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const f of req.files ?? []) {
      const ext = path.extname(f.filename).toLowerCase();
      insertarAdjunto.run(id, f.filename, path.basename(f.originalname).slice(0, 200), f.mimetype, formatoDeExtension(ext), f.size);
    }
    db.exec('COMMIT');
    const noticiasReetiquetadas = datos.ticker
      ? sincronizacion.vincularNoticiasACompania(datos.ticker, datos.empresa)
      : 0;
    res.status(201).json({ ...informeCompleto(id), noticiasReetiquetadas });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* la transaccion ya no estaba abierta */ }
    descartarFicheros(req.files);
    throw err;
  }
});

// -------------------------------------------------------- actualizacion

router.put('/:id(\\d+)', subida.array('ficheros', MAX_FICHEROS), (req, res) => {
  const id = Number(req.params.id);
  const existe = db.prepare('SELECT id, empresa FROM informes WHERE id = ?').get(id);
  if (!existe) {
    descartarFicheros(req.files);
    return res.status(404).json(cuerpoError('RECURSO_NO_ENCONTRADO', { detalle: 'El informe solicitado no existe.' }));
  }

  let datos;
  try {
    datos = validarInforme(req.body ?? {}, { parcial: true });
  } catch (err) {
    descartarFicheros(req.files);
    throw err;
  }

  const columnas = Object.keys(datos);
  try {
    db.exec('BEGIN IMMEDIATE');
    if (columnas.length) {
      const asignaciones = columnas.map((c) => `${c} = ?`).join(', ');
      db.prepare(`UPDATE informes SET ${asignaciones}, actualizado_en = datetime('now') WHERE id = ?`)
        .run(...columnas.map((c) => datos[c]), id);
    }
    const insertarAdjunto = db.prepare(
      'INSERT INTO adjuntos (informe_id, nombre_fichero, nombre_original, tipo_mime, formato, bytes) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const f of req.files ?? []) {
      const ext = path.extname(f.filename).toLowerCase();
      insertarAdjunto.run(id, f.filename, path.basename(f.originalname).slice(0, 200), f.mimetype, formatoDeExtension(ext), f.size);
    }
    db.exec('COMMIT');
    const noticiasReetiquetadas = datos.ticker
      ? sincronizacion.vincularNoticiasACompania(datos.ticker, datos.empresa ?? existe.empresa)
      : 0;
    res.json({ ...informeCompleto(id), noticiasReetiquetadas });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* la transaccion ya no estaba abierta */ }
    descartarFicheros(req.files);
    throw err;
  }
});

// --------------------------------------------------------------- borrado

router.delete('/:id(\\d+)', (req, res) => {
  const id = Number(req.params.id);
  const existente = db.prepare('SELECT ticker FROM informes WHERE id = ?').get(id);
  if (!existente) return res.status(404).json(cuerpoError('RECURSO_NO_ENCONTRADO', { detalle: 'El informe solicitado no existe.' }));

  const ficheros = db.prepare('SELECT nombre_fichero FROM adjuntos WHERE informe_id = ?').all(id);
  db.prepare('DELETE FROM informes WHERE id = ?').run(id);
  // Los registros caen por ON DELETE CASCADE; el soporte fisico se retira aqui.
  for (const f of ficheros) fs.promises.unlink(path.join(UPLOAD_DIR, f.nombre_fichero)).catch(() => {});

  // Con la tesis ya borrada, si ninguna otra la respalda el ticker deja de
  // estar en cartera: se retira de las noticias que lo llevaban.
  const noticiasDesvinculadas = existente.ticker
    ? sincronizacion.desvincularNoticiasDeCompania(existente.ticker)
    : 0;
  res.json({ eliminado: id, noticiasDesvinculadas });
});

router.delete('/:id(\\d+)/adjuntos/:adjuntoId(\\d+)', (req, res) => {
  const { id, adjuntoId } = req.params;
  const fila = db.prepare('SELECT nombre_fichero FROM adjuntos WHERE id = ? AND informe_id = ?').get(Number(adjuntoId), Number(id));
  if (!fila) return res.status(404).json(cuerpoError('RECURSO_NO_ENCONTRADO', { detalle: 'El documento solicitado no existe.' }));
  db.prepare('DELETE FROM adjuntos WHERE id = ?').run(Number(adjuntoId));
  fs.promises.unlink(path.join(UPLOAD_DIR, fila.nombre_fichero)).catch(() => {});
  res.json({ eliminado: Number(adjuntoId) });
});

// ------------------------------------------------------------- descarga

router.get('/:id(\\d+)/adjuntos/:adjuntoId(\\d+)', (req, res) => {
  const fila = db
    .prepare('SELECT * FROM adjuntos WHERE id = ? AND informe_id = ?')
    .get(Number(req.params.adjuntoId), Number(req.params.id));
  if (!fila) return res.status(404).json(cuerpoError('RECURSO_NO_ENCONTRADO', { detalle: 'El documento solicitado no existe.' }));

  // El nombre procede de la base de datos, nunca de la URL: no hay travesia de rutas.
  const ruta = path.join(UPLOAD_DIR, path.basename(fila.nombre_fichero));
  if (!fs.existsSync(ruta)) return res.status(404).json(cuerpoError('RECURSO_NO_ENCONTRADO', { detalle: 'El soporte documental ya no está disponible.' }));

  res.setHeader('Content-Type', fila.tipo_mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(ruta, fila.nombre_original, (err) => {
    if (err && !res.headersSent) res.status(500).end();
  });
});

module.exports = { router, subida, LIMITE_BYTES };