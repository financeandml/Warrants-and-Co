'use strict';

/**
 * Ejecutor de migraciones de esquema.
 *
 * ═══ Por qué existe, teniendo `anadirColumna()` ═══
 *
 * `src/db.js` evoluciona el esquema con `CREATE TABLE IF NOT EXISTS` y
 * `anadirColumna()` idempotentes, que corren al abrir la base. Eso sirve —y
 * seguirá sirviendo— para añadir una columna suelta: la orden es inocua, el
 * orden entre ellas da igual y no hay nada que deshacer.
 *
 * No sirve para lo que viene. Nueve tablas con claves ajenas entre sí tienen un
 * orden obligatorio, hay que poder revertirlas, y sobre todo hay que saber si
 * una máquina las tiene y otra no. Un `CREATE TABLE IF NOT EXISTS` no deja
 * constancia de nada: si dos personas no están seguras de tener el mismo
 * esquema, no hay dónde mirarlo.
 *
 * De ahí las tres propiedades que este ejecutor sí da:
 *
 *   TRAZABLE     la tabla `migraciones` registra qué se aplicó y cuándo.
 *   IDEMPOTENTE  aplicar dos veces no hace nada la segunda.
 *   REVERSIBLE   cada migración trae su `abajo()`, y se prueba que funciona.
 *
 * Y una cuarta que no es del oficio sino de esta casa: la HUELLA. Se guarda el
 * sha256 del fichero aplicado, de modo que editar una migración ya aplicada se
 * detecta en vez de pasar inadvertido. Dos máquinas con la misma fila en el
 * registro y distinto contenido en el fichero es exactamente el fallo que no se
 * ve en pantalla.
 *
 * ═══ Uso ═══
 *
 *   node scripts/migrar.js estado
 *   node scripts/migrar.js aplicar   [--hasta 001] [--confirmar-produccion]
 *   node scripts/migrar.js revertir  [--hasta 001] [--confirmar-produccion]
 *
 * La base se elige con WARRANTS_DB, igual que en el resto del proyecto. Sin
 * ella se apunta a `data/warrants.db`, y entonces hace falta
 * `--confirmar-produccion`: la regla 7 de CLAUDE.md dice que esa base no se
 * toca sin avisar, y una bandera es la forma de que avisar sea obligatorio.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const RAIZ = path.join(__dirname, '..');
const DIR_MIGRACIONES = path.join(RAIZ, 'migraciones');
const BASE_PRODUCCION = path.join(RAIZ, 'data', 'warrants.db');

const DB_PATH = process.env.WARRANTS_DB
  ? path.resolve(process.env.WARRANTS_DB)
  : BASE_PRODUCCION;

// ─────────────────────────────────────────────────────── carga

/** Lee `migraciones/` y devuelve las migraciones ordenadas por identificador. */
function cargarMigraciones() {
  if (!fs.existsSync(DIR_MIGRACIONES)) return [];

  return fs
    .readdirSync(DIR_MIGRACIONES)
    .filter((f) => /^\d{3}-.*\.js$/.test(f))
    .sort()
    .map((fichero) => {
      const ruta = path.join(DIR_MIGRACIONES, fichero);
      const modulo = require(ruta);
      const huella = crypto.createHash('sha256').update(fs.readFileSync(ruta)).digest('hex');

      if (!modulo.id || typeof modulo.arriba !== 'function' || typeof modulo.abajo !== 'function') {
        throw new Error(`${fichero}: una migración necesita 'id', 'arriba()' y 'abajo()'.`);
      }
      if (modulo.id !== fichero.slice(0, 3)) {
        throw new Error(`${fichero}: el id declarado (${modulo.id}) no coincide con el del fichero.`);
      }
      return { ...modulo, fichero, huella };
    });
}

// ─────────────────────────────────────────────────────── registro

/**
 * El registro se crea con `IF NOT EXISTS` a propósito: es la única pieza del
 * sistema que no puede migrarse a sí misma.
 */
function prepararRegistro(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id          TEXT PRIMARY KEY,
      nombre      TEXT NOT NULL,
      huella      TEXT NOT NULL,
      aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

const aplicadas = (db) =>
  new Map(db.prepare('SELECT id, nombre, huella, aplicada_en FROM migraciones').all().map((r) => [r.id, r]));

// ─────────────────────────────────────────────────────── ejecución

function abrir() {
  if (DB_PATH === BASE_PRODUCCION && !process.argv.includes('--confirmar-produccion')) {
    console.error('');
    console.error('  Apunta a data/warrants.db, la base de trabajo del equipo.');
    console.error('');
    console.error('  La regla 7 de CLAUDE.md pide avisar antes de tocarla. Si es lo que');
    console.error('  quiere, repita la orden añadiendo:');
    console.error('');
    console.error('      --confirmar-produccion');
    console.error('');
    console.error('  Para ensayar contra una base desechable, sin tocar nada:');
    console.error('');
    console.error('      WARRANTS_DB=/tmp/ensayo.db node scripts/migrar.js aplicar');
    console.error('');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  prepararRegistro(db);
  return db;
}

/**
 * Aplica en una sola transacción por migración: o entra entera o no entra nada.
 * SQLite es transaccional también para DDL, así que un CREATE TABLE a medias no
 * es un estado posible.
 */
function aplicar(db, migraciones, hasta) {
  const ya = aplicadas(db);
  let hechas = 0;

  for (const m of migraciones) {
    if (hasta && m.id > hasta) break;

    const registro = ya.get(m.id);
    if (registro) {
      // Idempotencia: no se vuelve a aplicar. Pero si el fichero cambió desde
      // que se aplicó, callarse sería peor que fallar.
      if (registro.huella !== m.huella) {
        console.error(`  ✗ ${m.id} ya está aplicada pero su fichero ha cambiado desde entonces.`);
        console.error(`    registrada: ${registro.huella.slice(0, 16)}…`);
        console.error(`    en disco:   ${m.huella.slice(0, 16)}…`);
        console.error('    Una migración aplicada no se edita: haga otra que corrija.');
        process.exit(1);
      }
      console.log(`  ·  ${m.id} ${m.nombre} — ya aplicada`);
      continue;
    }

    db.exec('BEGIN');
    try {
      m.arriba(db);
      db.prepare('INSERT INTO migraciones (id, nombre, huella) VALUES (?, ?, ?)').run(m.id, m.nombre, m.huella);
      db.exec('COMMIT');
      console.log(`  ✓  ${m.id} ${m.nombre}`);
      hechas++;
    } catch (err) {
      db.exec('ROLLBACK');
      console.error(`  ✗  ${m.id} ${m.nombre} — ${err.message}`);
      console.error('     Nada se ha escrito: la transacción se ha deshecho entera.');
      process.exit(1);
    }
  }
  return hechas;
}

/** Revierte en orden inverso. Igual que arriba: una transacción por migración. */
function revertir(db, migraciones, hasta) {
  const ya = aplicadas(db);
  let hechas = 0;

  for (const m of [...migraciones].reverse()) {
    if (!ya.has(m.id)) continue;
    if (hasta && m.id < hasta) break;

    db.exec('BEGIN');
    try {
      m.abajo(db);
      db.prepare('DELETE FROM migraciones WHERE id = ?').run(m.id);
      db.exec('COMMIT');
      console.log(`  ↩  ${m.id} ${m.nombre} — revertida`);
      hechas++;
    } catch (err) {
      db.exec('ROLLBACK');
      console.error(`  ✗  ${m.id} — ${err.message}`);
      process.exit(1);
    }
  }
  return hechas;
}

function estado(db, migraciones) {
  const ya = aplicadas(db);
  console.log(`\n  Base: ${DB_PATH}\n`);
  if (!migraciones.length) {
    console.log('  No hay migraciones declaradas.\n');
    return;
  }
  for (const m of migraciones) {
    const r = ya.get(m.id);
    if (!r) console.log(`  ○  ${m.id}  ${m.nombre}  — pendiente`);
    else if (r.huella !== m.huella) console.log(`  ⚠  ${m.id}  ${m.nombre}  — APLICADA, pero el fichero ha cambiado`);
    else console.log(`  ●  ${m.id}  ${m.nombre}  — aplicada ${r.aplicada_en}`);
  }
  const pendientes = migraciones.filter((m) => !ya.has(m.id)).length;
  console.log(`\n  ${migraciones.length - pendientes} aplicadas · ${pendientes} pendientes\n`);
}

// ─────────────────────────────────────────────────────── entrada

function principal() {
  const orden = process.argv[2] ?? 'estado';
  const iHasta = process.argv.indexOf('--hasta');
  const hasta = iHasta > -1 ? process.argv[iHasta + 1] : null;

  const migraciones = cargarMigraciones();
  const db = abrir();

  try {
    if (orden === 'estado') {
      estado(db, migraciones);
    } else if (orden === 'aplicar') {
      console.log(`\n  Aplicando sobre ${DB_PATH}\n`);
      const n = aplicar(db, migraciones, hasta);
      console.log(`\n  ${n} migraciones aplicadas.\n`);
    } else if (orden === 'revertir') {
      console.log(`\n  Revirtiendo sobre ${DB_PATH}\n`);
      const n = revertir(db, migraciones, hasta);
      console.log(`\n  ${n} migraciones revertidas.\n`);
    } else {
      console.error(`\n  Orden no reconocida: ${orden}`);
      console.error('  Use: estado | aplicar | revertir\n');
      process.exit(1);
    }
  } finally {
    db.close();
  }
}

if (require.main === module) principal();

module.exports = { cargarMigraciones, aplicar, revertir, prepararRegistro, aplicadas };
