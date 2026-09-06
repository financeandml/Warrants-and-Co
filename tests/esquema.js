'use strict';

/* ============================================================================
   El esquema de plataforma — que las restricciones RESTRINJAN.

   ═══ Qué comprueba y por qué así ═══

   Un `CREATE TABLE` que se ejecuta sin error no demuestra nada. SQLite acepta
   encantado una clave ajena que no se aplica —basta con que `foreign_keys` esté
   apagado—, un `CHECK` mal escrito que siempre pasa, o un índice único parcial
   cuya condición no cubre lo que se creía. Las tres cosas se ven idénticas a un
   esquema correcto hasta el día en que entra la fila que debía rechazarse.

   De modo que esta batería no comprueba que las tablas existan. Comprueba que
   RECHAZAN: cada caso intenta escribir algo que el modelo prohíbe y falla si la
   escritura entra. Es la única forma de saber que la restricción está viva.

   No abre navegador, no necesita servidor y no toca ninguna base del equipo:
   crea la suya en un fichero temporal, aplica las migraciones sobre ella y la
   borra al terminar.

   ═══ Vista fallar ═══

   Como pide CLAUDE.md, no vale hasta habérsela visto fallar. Se le
   reintrodujeron cinco defectos, uno a uno, restaurando entre cada dos:

     1. `PRAGMA foreign_keys = OFF`  ...................  5 fallos
     2. índice de posiciones sin su `WHERE estado <> 'CERRADA'`  1 fallo
     3. `origen` admitiendo 'SIMULADO'  ................  1 fallo
     4. catalizadores sin el CHECK de fecha  ...........  1 fallo
     5. `valor_total` como columna normal, no generada  .  6 fallos

   Los cinco se denunciaron. Con el esquema íntegro vuelve a 58/58.
   ========================================================================= */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { cargarMigraciones, prepararRegistro } = require('../scripts/migrar');

let ok = 0;
let fallos = 0;

const acierto = (n) => { ok++; console.log(`    OK    ${n}`); };
const fallo = (n, d = '') => { fallos++; console.log(`    ✗     ${n}${d ? ` — ${d}` : ''}`); };

/** Afirma que `fn` escribe sin problema. */
function admite(nombre, fn) {
  try { fn(); acierto(nombre); }
  catch (err) { fallo(nombre, `debía admitirse y se rechazó: ${err.message}`); }
}

/**
 * Afirma que `fn` es RECHAZADA por la base. Si entra, es un fallo: significa que
 * la restricción no existe o no se aplica.
 */
function rechaza(nombre, fn) {
  try {
    fn();
    fallo(nombre, 'la escritura entró y debía rechazarse');
  } catch {
    acierto(nombre);
  }
}

// ───────────────────────────────────────────────── base desechable

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-esquema-'));
const RUTA = path.join(DIR, 'esquema.db');

const db = new DatabaseSync(RUTA);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
prepararRegistro(db);

console.log('\n  Esquema de plataforma — las restricciones\n');
console.log(`  Base desechable: ${RUTA}\n`);

for (const m of cargarMigraciones()) {
  db.exec('BEGIN');
  m.arriba(db);
  db.prepare('INSERT INTO migraciones (id, nombre, huella) VALUES (?, ?, ?)').run(m.id, m.nombre, m.huella);
  db.exec('COMMIT');
}

const ejec = (sql, ...args) => db.prepare(sql).run(...args);

// ───────────────────────────────────────────────── 1 · las tablas

console.log('  ── Las nueve tablas existen');
const ESPERADAS = [
  'carteras', 'usuarios', 'companias', 'tesis', 'posiciones',
  'transacciones', 'precios', 'instantaneas_cartera', 'catalizadores_tesis',
];
const presentes = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name)
);
for (const t of ESPERADAS) {
  if (presentes.has(t)) acierto(`tabla ${t}`);
  else fallo(`tabla ${t}`, 'no se ha creado');
}

// ───────────────────────────────────────────────── 2 · datos base

console.log('\n  ── Semilla mínima');
admite('carteras admite una cartera bien formada', () =>
  ejec(`INSERT INTO carteras (nombre, capital_inicial, divisa_base, fecha_inicio)
        VALUES ('Prueba', 100, 'USD', '2026-01-30')`));

rechaza('carteras rechaza capital_inicial <= 0', () =>
  ejec(`INSERT INTO carteras (nombre, capital_inicial, divisa_base, fecha_inicio)
        VALUES ('Mala', 0, 'USD', '2026-01-30')`));

admite('companias admite una compañía', () =>
  ejec(`INSERT INTO companias (ticker, nombre, sector, divisa)
        VALUES ('UBER', 'Uber Technologies', 'Industriales', 'USD')`));

rechaza('companias rechaza ticker duplicado', () =>
  ejec(`INSERT INTO companias (ticker, nombre) VALUES ('UBER', 'Otra')`));

rechaza('companias rechaza estado_cobertura fuera del catálogo', () =>
  ejec(`INSERT INTO companias (ticker, nombre, estado_cobertura)
        VALUES ('NFLX', 'Netflix', 'INVENTADO')`));

admite('tesis admite una tesis publicada', () =>
  ejec(`INSERT INTO tesis (compania_id, titulo, estado, fecha_publicacion)
        VALUES (1, 'Uber — apalancamiento operativo', 'PUBLICADA', '2026-01-30')`));

rechaza('tesis rechaza estado fuera del catálogo', () =>
  ejec(`INSERT INTO tesis (compania_id, titulo, estado) VALUES (1, 'X', 'PENDIENTE_DE_NADA')`));

rechaza('tesis rechaza valoracion_metodo fuera del catálogo', () =>
  ejec(`INSERT INTO tesis (compania_id, titulo, valoracion_metodo) VALUES (1, 'X', 'OJIMETRO')`));

// ───────────────────────────────────────────────── 3 · claves ajenas

console.log('\n  ── Las claves ajenas se aplican');
rechaza('tesis rechaza compania_id inexistente', () =>
  ejec(`INSERT INTO tesis (compania_id, titulo) VALUES (9999, 'Huérfana')`));

rechaza('posiciones rechaza cartera_id inexistente', () =>
  ejec(`INSERT INTO posiciones (cartera_id, compania_id, abierta_en) VALUES (9999, 1, '2026-01-30')`));

rechaza('transacciones rechaza posicion_id inexistente', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio)
        VALUES (9999, 'COMPRA', '2026-01-30', 10, 50)`));

// ───────────────────────────────────────────────── 4 · posiciones

console.log('\n  ── Posiciones: una sola abierta por compañía');
admite('posiciones admite abrir una posición', () =>
  ejec(`INSERT INTO posiciones (cartera_id, compania_id, tesis_id, abierta_en, estado, divisa)
        VALUES (1, 1, 1, '2026-01-30', 'ABIERTA', 'USD')`));

rechaza('posiciones rechaza una SEGUNDA abierta de la misma compañía', () =>
  ejec(`INSERT INTO posiciones (cartera_id, compania_id, abierta_en, estado)
        VALUES (1, 1, '2026-02-15', 'ABIERTA')`));

rechaza('posiciones rechaza cerrada_en sin estado CERRADA', () =>
  ejec(`INSERT INTO posiciones (cartera_id, compania_id, abierta_en, estado, cerrada_en)
        VALUES (1, 1, '2026-03-01', 'ABIERTA', '2026-03-02')`));

rechaza('posiciones rechaza estado fuera del catálogo', () =>
  ejec(`INSERT INTO posiciones (cartera_id, compania_id, abierta_en, estado)
        VALUES (1, 1, '2026-03-01', 'MEDIO_ABIERTA')`));

// La reentrada sí debe poder existir: cerrada + nueva abierta.
db.exec("UPDATE posiciones SET estado = 'CERRADA', cerrada_en = '2026-04-01' WHERE id = 1");
admite('posiciones admite reentrada cuando la anterior está CERRADA', () =>
  ejec(`INSERT INTO posiciones (cartera_id, compania_id, abierta_en, estado)
        VALUES (1, 1, '2026-05-01', 'ABIERTA')`));
/* Se retira la reentrada ANTES de reabrir la primera: con las dos abiertas a la
   vez el índice parcial salta —y es lo correcto—, así que el orden de esta
   limpieza no es cosmético. */
db.exec('DELETE FROM posiciones WHERE id = 2');
db.exec("UPDATE posiciones SET estado = 'ABIERTA', cerrada_en = NULL WHERE id = 1");

// ───────────────────────────────────────────────── 5 · transacciones

console.log('\n  ── Transacciones: solo operaciones bien formadas');
admite('transacciones admite una COMPRA completa', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, comisiones, divisa)
        VALUES (1, 'COMPRA', '2026-01-30', 100, 60.0, 1.5, 'USD')`));

rechaza('transacciones rechaza COMPRA sin cantidad', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, precio) VALUES (1, 'COMPRA', '2026-02-01', 60)`));

rechaza('transacciones rechaza COMPRA sin precio', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad) VALUES (1, 'COMPRA', '2026-02-01', 10)`));

rechaza('transacciones rechaza VENTA con cantidad negativa', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio)
        VALUES (1, 'VENTA', '2026-02-01', -10, 60)`));

rechaza('transacciones rechaza tipo fuera del catálogo', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio)
        VALUES (1, 'PERMUTA', '2026-02-01', 10, 60)`));

rechaza('transacciones rechaza tipo_cambio <= 0', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, tipo_cambio)
        VALUES (1, 'COMPRA', '2026-02-01', 10, 60, 0)`));

rechaza('transacciones rechaza comisiones NULL', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, comisiones)
        VALUES (1, 'COMPRA', '2026-02-01', 10, 60, NULL)`));

/* El origen SIMULADO no existe: decisión de D2 —el histórico de modelo no entra
   en esta tabla ni siquiera etiquetado—. Que el catálogo lo rechace es lo que
   convierte esa decisión en algo que la base sostiene, y no en una convención
   que alguien tiene que recordar. */
rechaza('transacciones rechaza origen SIMULADO (el modelo no vive aquí)', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, origen)
        VALUES (1, 'VENTA', '2026-02-01', 10, 70, 'SIMULADO')`));

admite('transacciones admite referencia_externa única', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, referencia_externa)
        VALUES (1, 'COMPRA', '2026-02-02', 50, 61, 'BROKER-0001')`));

rechaza('transacciones rechaza referencia_externa repetida (importación idempotente)', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, referencia_externa)
        VALUES (1, 'COMPRA', '2026-02-03', 10, 62, 'BROKER-0001')`));

admite('transacciones admite varias manuales sin referencia', () => {
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio) VALUES (1,'COMPRA','2026-02-04',5,63)`);
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio) VALUES (1,'COMPRA','2026-02-05',5,64)`);
});

rechaza('posiciones no se puede borrar si tiene transacciones (RESTRICT)', () =>
  ejec('DELETE FROM posiciones WHERE id = 1'));

// ───────────────────────────────────────────────── 6 · columna generada

console.log('\n  ── valor_total se calcula solo y con el signo correcto');
db.exec('DELETE FROM transacciones');
ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, comisiones)
      VALUES (1, 'COMPRA', '2026-01-30', 100, 60, 1.5)`);
ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, comisiones)
      VALUES (1, 'VENTA', '2026-03-30', 40, 75, 1.0)`);
ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio)
      VALUES (1, 'DIVIDENDO', '2026-04-15', 60, 0.25)`);
ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, comisiones)
      VALUES (1, 'COMISION', '2026-04-30', 12)`);
ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, tipo_cambio)
      VALUES (1, 'COMPRA', '2026-05-02', 10, 50, 1.10)`);

const casos = [
  ['COMPRA sale de caja con la comisión sumada', 'COMPRA', '2026-01-30', -(100 * 60) - 1.5],
  ['VENTA entra en caja con la comisión restada', 'VENTA', '2026-03-30', (40 * 75) - 1.0],
  ['DIVIDENDO entra entero', 'DIVIDENDO', '2026-04-15', 60 * 0.25],
  ['COMISION suelta solo resta', 'COMISION', '2026-04-30', -12],
  ['COMPRA en otra divisa aplica el tipo de cambio', 'COMPRA', '2026-05-02', -(10 * 50 * 1.10)],
];
for (const [nombre, tipo, fecha, esperado] of casos) {
  const fila = db.prepare('SELECT valor_total FROM transacciones WHERE tipo = ? AND fecha = ?').get(tipo, fecha);
  if (fila && Math.abs(fila.valor_total - esperado) < 1e-9) acierto(`${nombre} · ${esperado}`);
  else fallo(nombre, `esperado ${esperado}, obtenido ${fila?.valor_total}`);
}

rechaza('valor_total no se puede escribir a mano (es generada)', () =>
  ejec(`INSERT INTO transacciones (posicion_id, tipo, fecha, cantidad, precio, valor_total)
        VALUES (1, 'COMPRA', '2026-06-01', 1, 1, 999)`));

// ───────────────────────────────────────────────── 7 · precios e instantáneas

console.log('\n  ── Precios e instantáneas: una fila por fecha');
admite('precios admite una sesión', () =>
  ejec(`INSERT INTO precios (simbolo, sesion, cierre, maximo, minimo, proveedor)
        VALUES ('UBER', '2026-01-30', 60.1, 61.0, 59.4, 'yahoo')`));

rechaza('precios rechaza (simbolo, sesion) duplicado', () =>
  ejec(`INSERT INTO precios (simbolo, sesion, cierre, proveedor)
        VALUES ('UBER', '2026-01-30', 60.5, 'nasdaq')`));

admite('precios admite el mismo símbolo en otra sesión', () =>
  ejec(`INSERT INTO precios (simbolo, sesion, cierre, proveedor)
        VALUES ('UBER', '2026-02-02', 62.0, 'yahoo')`));

admite('instantaneas_cartera admite una fecha', () =>
  ejec(`INSERT INTO instantaneas_cartera (cartera_id, fecha, nav, caja, capital_desplegado)
        VALUES (1, '2026-01-30', 100, 40, 60)`));

rechaza('instantaneas_cartera rechaza (cartera, fecha) duplicada', () =>
  ejec(`INSERT INTO instantaneas_cartera (cartera_id, fecha, nav, caja, capital_desplegado)
        VALUES (1, '2026-01-30', 101, 39, 62)`));

// ───────────────────────────────────────────────── 8 · catalizadores

console.log('\n  ── Catalizadores: sin fecha aproximada disfrazada de exacta');
admite('catalizadores admite uno sin fecha', () =>
  ejec(`INSERT INTO catalizadores_tesis (tesis_id, titulo, certeza_fecha)
        VALUES (1, 'Reorganización de la unidad de reparto', 'SIN_FECHA')`));

admite('catalizadores admite uno con fecha confirmada', () =>
  ejec(`INSERT INTO catalizadores_tesis (tesis_id, titulo, certeza_fecha, fecha_estimada)
        VALUES (1, 'Resultados del primer trimestre', 'CONFIRMADA', '2026-05-07')`));

rechaza('catalizadores rechaza CONFIRMADA sin fecha', () =>
  ejec(`INSERT INTO catalizadores_tesis (tesis_id, titulo, certeza_fecha)
        VALUES (1, 'Algo seguro pero sin día', 'CONFIRMADA')`));

rechaza('catalizadores rechaza certeza fuera del catálogo', () =>
  ejec(`INSERT INTO catalizadores_tesis (tesis_id, titulo, certeza_fecha)
        VALUES (1, 'X', 'MAS_O_MENOS')`));

// ───────────────────────────────────────────────── 9 · usuarios

console.log('\n  ── Usuarios: esquema listo, sin autenticación todavía');
admite('usuarios admite un alta sin credencial (aún no hay login)', () =>
  ejec(`INSERT INTO usuarios (email, nombre, rol) VALUES ('analista@ejemplo.test', 'Analista', 'ANALISTA')`));

rechaza('usuarios rechaza email duplicado sin distinguir mayúsculas', () =>
  ejec(`INSERT INTO usuarios (email, nombre) VALUES ('ANALISTA@EJEMPLO.TEST', 'Otro')`));

rechaza('usuarios rechaza rol fuera del catálogo', () =>
  ejec(`INSERT INTO usuarios (email, nombre, rol) VALUES ('x@ejemplo.test', 'X', 'ADMINISTRADOR')`));

// ───────────────────────────────────────────────── 10 · aislamiento

console.log('\n  ── Aislamiento: no se ha tocado nada de lo existente');
for (const vieja of ['informes', 'adjuntos', 'noticias']) {
  if (presentes.has(vieja)) fallo(`${vieja} no debería existir en una base recién migrada`, 'la migración la creó');
  else acierto(`${vieja} no la crea esta migración — sigue siendo cosa de src/db.js`);
}

// ───────────────────────────────────────────────── cierre

db.close();
fs.rmSync(DIR, { recursive: true, force: true });

console.log(`\n  ${ok}/${ok + fallos} correctas${fallos ? ` · ${fallos} FALLOS` : ''}\n`);
process.exit(fallos ? 1 : 0);
