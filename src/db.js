'use strict';

/**
 * Capa de persistencia — SQLite nativo (node:sqlite) con indice de texto completo FTS5.
 * No requiere dependencias compiladas: forma parte del runtime de Node 22+.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// La ruta puede redirigirse por entorno. Se usa para ejecutar las baterías de
// prueba contra una base desechable, de modo que los datos de trabajo del equipo
// nunca queden expuestos a una ejecución de pruebas.
const DB_PATH = process.env.WARRANTS_DB
  ? path.resolve(process.env.WARRANTS_DB)
  : path.join(DATA_DIR, 'warrants.db');

// El almacén de documentos se redirige por lo mismo y hace falta por separado:
// redirigir solo la base deja los adjuntos cayendo en el directorio de trabajo.
// No es hipotético —una prueba de publicación dejó ahí un PDF—, y a diferencia
// de una fila en una base desechable, un fichero suelto no se distingue de los
// del equipo más que por la fecha.
const UPLOAD_DIR = process.env.WARRANTS_UPLOADS
  ? path.resolve(process.env.WARRANTS_UPLOADS)
  : path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Durabilidad y concurrencia: WAL permite lecturas simultaneas a la escritura.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS informes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa           TEXT    NOT NULL,
    ticker            TEXT,
    sector            TEXT,
    pais              TEXT,
    tipo_informe      TEXT,
    periodo           TEXT,
    analista          TEXT,
    recomendacion     TEXT,
    precio_objetivo   REAL,
    divisa            TEXT    NOT NULL DEFAULT 'USD',
    resumen_ejecutivo TEXT,
    etiquetas         TEXT    NOT NULL DEFAULT '[]',
    nivel_acceso      TEXT    NOT NULL DEFAULT 'publico',
    destacado         INTEGER NOT NULL DEFAULT 0,
    en_cartera        INTEGER NOT NULL DEFAULT 1,
    peso_cartera      REAL,
    fecha_publicacion TEXT    NOT NULL,
    creado_en         TEXT    NOT NULL DEFAULT (datetime('now')),
    actualizado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS adjuntos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    informe_id    INTEGER NOT NULL REFERENCES informes(id) ON DELETE CASCADE,
    nombre_fichero TEXT   NOT NULL,
    nombre_original TEXT  NOT NULL,
    tipo_mime     TEXT    NOT NULL,
    formato       TEXT    NOT NULL,
    bytes         INTEGER NOT NULL,
    creado_en     TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

/**
 * Migraciones incrementales. Cada columna se anade solo si falta, de modo que la
 * base existente evoluciona sin perder informes ni documentacion.
 */
function anadirColumna(tabla, columna, definicion) {
  const existe = db.prepare(`PRAGMA table_info(${tabla})`).all().some((c) => c.name === columna);
  if (!existe) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
}

// Precio efectivamente pagado y nivel de toma de beneficios de cada posicion.
anadirColumna('informes', 'precio_compra', 'REAL');
anadirColumna('informes', 'take_profit', 'REAL');
anadirColumna('informes', 'stop_loss', 'REAL');

// Juicio narrativo del analista sobre los riesgos de la tesis. A diferencia de
// un precio o una cotizacion, esto no se deriva de ningun proveedor: es
// texto que el propio analista escribe, y por eso vive como columna, no como
// calculo. Opcional: sin el, la ficha declara N/A, nunca una cadena vacia.
anadirColumna('informes', 'riesgos_clave', 'TEXT');

db.exec(`
  CREATE TABLE IF NOT EXISTS noticias (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    titular           TEXT    NOT NULL,
    entradilla        TEXT,
    cuerpo            TEXT,
    categoria         TEXT    NOT NULL DEFAULT 'Mercados',
    tickers           TEXT    NOT NULL DEFAULT '[]',
    etiquetas         TEXT    NOT NULL DEFAULT '[]',
    fuente            TEXT,
    url_fuente        TEXT,
    autor             TEXT,
    relevancia        TEXT    NOT NULL DEFAULT 'normal',
    destacada         INTEGER NOT NULL DEFAULT 0,
    fecha_publicacion TEXT    NOT NULL,
    creado_en         TEXT    NOT NULL DEFAULT (datetime('now')),
    actualizado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// Procedencia de cada pieza y datos propios de la sindicacion.
anadirColumna('noticias', 'origen', "TEXT NOT NULL DEFAULT 'manual'");
anadirColumna('noticias', 'imagen', 'TEXT');
anadirColumna('noticias', 'feed_origen', 'TEXT');
anadirColumna('noticias', 'momento_publicacion', 'TEXT');

// El enlace de origen identifica la pieza: impide que una resincronizacion
// duplique noticias ya incorporadas. Las piezas propias no llevan enlace y
// SQLite admite multiples NULL bajo una restriccion de unicidad.
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_noticias_url ON noticias(url_fuente) WHERE url_fuente IS NOT NULL');
db.exec('CREATE INDEX IF NOT EXISTS idx_noticias_origen ON noticias(origen)');
db.exec('CREATE INDEX IF NOT EXISTS idx_noticias_momento ON noticias(momento_publicacion DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_noticias_fecha ON noticias(fecha_publicacion DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON noticias(categoria)');
db.exec('CREATE INDEX IF NOT EXISTS idx_noticias_destacada ON noticias(destacada)');

db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS noticias_fts USING fts5(
    titular, entradilla, cuerpo, categoria, tickers, etiquetas, fuente, autor,
    content = 'noticias',
    content_rowid = 'id',
    tokenize = "unicode61 remove_diacritics 2"
  )
`);

const CAMPOS_FTS_NOTICIAS = 'titular, entradilla, cuerpo, categoria, tickers, etiquetas, fuente, autor';
const VALORES_FTS_NOTICIAS = (p) =>
  `${p}.titular, ${p}.entradilla, ${p}.cuerpo, ${p}.categoria, ${p}.tickers, ${p}.etiquetas, ${p}.fuente, ${p}.autor`;

db.exec(`
  CREATE TRIGGER IF NOT EXISTS noticias_ai AFTER INSERT ON noticias BEGIN
    INSERT INTO noticias_fts(rowid, ${CAMPOS_FTS_NOTICIAS})
    VALUES (new.id, ${VALORES_FTS_NOTICIAS('new')});
  END
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS noticias_ad AFTER DELETE ON noticias BEGIN
    INSERT INTO noticias_fts(noticias_fts, rowid, ${CAMPOS_FTS_NOTICIAS})
    VALUES ('delete', old.id, ${VALORES_FTS_NOTICIAS('old')});
  END
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS noticias_au AFTER UPDATE ON noticias BEGIN
    INSERT INTO noticias_fts(noticias_fts, rowid, ${CAMPOS_FTS_NOTICIAS})
    VALUES ('delete', old.id, ${VALORES_FTS_NOTICIAS('old')});
    INSERT INTO noticias_fts(rowid, ${CAMPOS_FTS_NOTICIAS})
    VALUES (new.id, ${VALORES_FTS_NOTICIAS('new')});
  END
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_informes_ticker ON informes(ticker)');
db.exec('CREATE INDEX IF NOT EXISTS idx_informes_fecha ON informes(fecha_publicacion DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_informes_destacado ON informes(destacado)');
db.exec('CREATE INDEX IF NOT EXISTS idx_adjuntos_informe ON adjuntos(informe_id)');

// Indice de texto completo. Se mantiene sincronizado mediante disparadores para
// que no exista ninguna via de escritura capaz de dejarlo desalineado.
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS informes_fts USING fts5(
    empresa, ticker, sector, pais, tipo_informe, analista,
    resumen_ejecutivo, etiquetas, periodo,
    content = 'informes',
    content_rowid = 'id',
    tokenize = "unicode61 remove_diacritics 2"
  )
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS informes_ai AFTER INSERT ON informes BEGIN
    INSERT INTO informes_fts(rowid, empresa, ticker, sector, pais, tipo_informe, analista, resumen_ejecutivo, etiquetas, periodo)
    VALUES (new.id, new.empresa, new.ticker, new.sector, new.pais, new.tipo_informe, new.analista, new.resumen_ejecutivo, new.etiquetas, new.periodo);
  END
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS informes_ad AFTER DELETE ON informes BEGIN
    INSERT INTO informes_fts(informes_fts, rowid, empresa, ticker, sector, pais, tipo_informe, analista, resumen_ejecutivo, etiquetas, periodo)
    VALUES ('delete', old.id, old.empresa, old.ticker, old.sector, old.pais, old.tipo_informe, old.analista, old.resumen_ejecutivo, old.etiquetas, old.periodo);
  END
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS informes_au AFTER UPDATE ON informes BEGIN
    INSERT INTO informes_fts(informes_fts, rowid, empresa, ticker, sector, pais, tipo_informe, analista, resumen_ejecutivo, etiquetas, periodo)
    VALUES ('delete', old.id, old.empresa, old.ticker, old.sector, old.pais, old.tipo_informe, old.analista, old.resumen_ejecutivo, old.etiquetas, old.periodo);
    INSERT INTO informes_fts(rowid, empresa, ticker, sector, pais, tipo_informe, analista, resumen_ejecutivo, etiquetas, periodo)
    VALUES (new.id, new.empresa, new.ticker, new.sector, new.pais, new.tipo_informe, new.analista, new.resumen_ejecutivo, new.etiquetas, new.periodo);
  END
`);

module.exports = { db, DATA_DIR, UPLOAD_DIR };
