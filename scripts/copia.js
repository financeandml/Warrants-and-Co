'use strict';

/**
 * Copia de seguridad de la base de datos.
 *
 * Emplea VACUUM INTO en lugar de copiar el fichero: con el diario en modo WAL,
 * una copia directa puede capturar un estado incoherente. La copia resultante es
 * un fichero SQLite completo y consistente.
 *
 *   npm run copia
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ORIGEN = process.env.WARRANTS_DB
  ? path.resolve(process.env.WARRANTS_DB)
  : path.join(DATA_DIR, 'warrants.db');
const DESTINO_DIR = path.join(DATA_DIR, 'copias');

if (!fs.existsSync(ORIGEN)) {
  console.error(`No existe la base de datos en ${ORIGEN}`);
  process.exit(1);
}

fs.mkdirSync(DESTINO_DIR, { recursive: true });

const marca = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const destino = path.join(DESTINO_DIR, `warrants-${marca}.db`);

const db = new DatabaseSync(ORIGEN);
try {
  db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  const copia = new DatabaseSync(destino);
  const informes = copia.prepare('SELECT COUNT(*) AS c FROM informes').get().c;
  const noticias = copia.prepare('SELECT COUNT(*) AS c FROM noticias').get().c;
  copia.close();
  console.log(`Copia creada: ${path.relative(process.cwd(), destino)}`);
  console.log(`  ${informes} informe(s) · ${noticias} noticia(s) · ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);
} finally {
  db.close();
}
