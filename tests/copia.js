'use strict';

/* ============================================================================
   Copia de seguridad y restauracion.

   Una copia que no se ha probado a restaurar no es una copia, asi que esto no
   comprueba que la copia "se haga": hace el viaje entero. Copia, borra el
   origen, restaura a otro sitio y exige que cada fila de `adjuntos` vuelva a
   resolver en un fichero con sus bytes exactos.

   Todo ocurre en un directorio temporal, con `WARRANTS_DB`, `WARRANTS_UPLOADS`
   y `WARRANTS_COPIAS` redirigidos. Ni la base de trabajo ni `data/uploads` ni
   `data/copias` se tocan; al terminar se comprueba que siguen como estaban.

   No necesita navegador.

       npm run test:copia
   ========================================================================= */

const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..');
const BANCO = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-copia-'));
const BASE = path.join(BANCO, 'warrants.db');
const UPLOADS = path.join(BANCO, 'uploads');
const COPIAS = path.join(BANCO, 'copias');

const ENTORNO = {
  ...process.env,
  WARRANTS_DB: BASE,
  WARRANTS_UPLOADS: UPLOADS,
  WARRANTS_COPIAS: COPIAS,
};

let fallos = 0;
let pruebas = 0;

function afirmar(condicion, descripcion, detalle) {
  pruebas++;
  if (condicion) { console.log(`    OK    ${descripcion}`); return true; }
  fallos++;
  console.log(`    FALLO ${descripcion}${detalle ? `  → ${detalle}` : ''}`);
  return false;
}

function titulo(texto) { console.log(`\n  ── ${texto} ──`); }

function copia(...args) {
  return spawnSync(process.execPath, [path.join('scripts', 'copia.js'), ...args],
    { cwd: RAIZ, env: ENTORNO, encoding: 'utf8' });
}
function restaurar(...args) {
  return spawnSync(process.execPath, [path.join('scripts', 'restaurar.js'), ...args],
    { cwd: RAIZ, env: ENTORNO, encoding: 'utf8' });
}

/** Listado ordenado de los ficheros visibles de un directorio. */
function ficherosDe(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => !n.startsWith('.')).sort();
}

function copiasEn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(n)).sort();
}

function manifiestoDe(marca) {
  return JSON.parse(fs.readFileSync(path.join(COPIAS, marca, 'copia.json'), 'utf8'));
}

/* Las marcas tienen resolucion de segundo: sin esto, dos copias seguidas
   chocarian de nombre y la segunda se negaria a existir. Se espera al reloj,
   no a que algo este listo, asi que aqui un plazo fijo es exactamente lo que
   corresponde: lo que se mide es el cambio de segundo. */
function esperarSegundo() {
  const restan = 1000 - (Date.now() % 1000) + 30;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, restan);
}

/* ── Banco de pruebas ────────────────────────────────────────────────────── */

const { DatabaseSync } = require('node:sqlite');

/* El esquema lo levanta el propio modulo de la plataforma, para que el banco no
   sea una version paralela del esquema que pueda quedarse atras. Despues se
   trabaja con manejadores propios: `require` cachea, y el modulo solo se puede
   abrir una vez. */
process.env.WARRANTS_DB = BASE;
process.env.WARRANTS_UPLOADS = UPLOADS;
require('../src/db').db.close();

function conBase(fn) {
  const base = new DatabaseSync(BASE);
  try { return fn(base); } finally { base.close(); }
}

const contenidos = new Map();
let siguienteInforme = 0;

function altaInforme(empresa) {
  return conBase((base) => {
    base.prepare('INSERT INTO informes (empresa, ticker, fecha_publicacion) VALUES (?, ?, ?)')
      .run(empresa, `T${++siguienteInforme}`, '2026-01-15');
    return base.prepare('SELECT last_insert_rowid() AS id').get().id;
  });
}

function altaAdjunto(informeId, nombre, bytes) {
  const contenido = crypto.randomBytes(bytes);
  contenidos.set(nombre, contenido);
  fs.writeFileSync(path.join(UPLOADS, nombre), contenido);
  conBase((base) => base.prepare(
    `INSERT INTO adjuntos (informe_id, nombre_fichero, nombre_original, tipo_mime, formato, bytes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(informeId, nombre, `${nombre.slice(0, 6)}-original.pdf`, 'application/pdf', 'PDF', bytes));
  return nombre;
}

const informeA = altaInforme('Oracle Corporation');
const informeB = altaInforme('QUALCOMM Incorporated');
altaAdjunto(informeA, 'aaaa1111.pdf', 4096);
altaAdjunto(informeA, 'bbbb2222.pdf', 8192);
altaAdjunto(informeB, 'cccc3333.pdf', 2048);

console.log(`\n  Banco: ${BANCO}`);

/* ── 1 · Primera copia ───────────────────────────────────────────────────── */

titulo('primera copia');
let r = copia();
afirmar(r.status === 0, 'termina con codigo 0', `codigo ${r.status}  ${r.stderr}`);

let marcas = copiasEn(COPIAS);
afirmar(marcas.length === 1, 'crea un unico directorio fechado', marcas.join(', '));
const marca1 = marcas[0];
let m = manifiestoDe(marca1);

afirmar(m.adjuntos.length === 3, 'el manifiesto registra los 3 adjuntos', String(m.adjuntos.length));
afirmar(m.enlazados_de === null, 'la primera copia no enlaza de ninguna otra', String(m.enlazados_de));
afirmar(m.adjuntos.every((a) => a.via === 'copiado'), 'todos los adjuntos se copian de verdad');
afirmar(m.faltantes.length === 0 && m.discordantes.length === 0, 'sin faltantes ni discordantes');

const dirAdj1 = path.join(COPIAS, marca1, 'uploads');
afirmar(
  JSON.stringify(ficherosDe(dirAdj1)) === JSON.stringify(['aaaa1111.pdf', 'bbbb2222.pdf', 'cccc3333.pdf']),
  'la copia contiene exactamente los tres ficheros', ficherosDe(dirAdj1).join(', '));
afirmar(
  ficherosDe(dirAdj1).every((n) => fs.readFileSync(path.join(dirAdj1, n)).equals(contenidos.get(n))),
  'cada adjunto copiado es identico byte a byte al original');

/* La copia jamas comparte inodo con el almacen vivo: si lo hiciera, borrar un
   adjunto desde la plataforma lo borraria tambien del respaldo. */
afirmar(
  ficherosDe(dirAdj1).every((n) =>
    fs.statSync(path.join(dirAdj1, n)).ino !== fs.statSync(path.join(UPLOADS, n)).ino),
  'ningun fichero de la copia comparte inodo con el almacen vivo');

/* ── 2 · Segunda copia: lo repetido se enlaza ────────────────────────────── */

titulo('segunda copia — lo que ya estaba no se vuelve a escribir');
esperarSegundo();
altaAdjunto(informeB, 'dddd4444.pdf', 1024);

r = copia();
afirmar(r.status === 0, 'termina con codigo 0', `codigo ${r.status}  ${r.stderr}`);
marcas = copiasEn(COPIAS);
const marca2 = marcas[marcas.length - 1];
afirmar(marcas.length === 2, 'ahora hay dos copias', marcas.join(', '));

m = manifiestoDe(marca2);
afirmar(m.enlazados_de === marca1, 'declara de que copia enlaza', String(m.enlazados_de));
const enlazados = m.adjuntos.filter((a) => a.via === 'enlazado').map((a) => a.nombre).sort();
const copiados = m.adjuntos.filter((a) => a.via === 'copiado').map((a) => a.nombre).sort();
afirmar(
  JSON.stringify(enlazados) === JSON.stringify(['aaaa1111.pdf', 'bbbb2222.pdf', 'cccc3333.pdf']),
  'los tres de antes se enlazan', enlazados.join(', '));
afirmar(JSON.stringify(copiados) === JSON.stringify(['dddd4444.pdf']), 'solo el nuevo se copia', copiados.join(', '));

const dirAdj2 = path.join(COPIAS, marca2, 'uploads');
afirmar(
  enlazados.every((n) =>
    fs.statSync(path.join(dirAdj2, n)).ino === fs.statSync(path.join(dirAdj1, n)).ino),
  'lo enlazado comparte inodo con la copia anterior: no ocupa disco otra vez');
afirmar(m.bytes_nuevos === 1024, 'solo contabiliza como nuevos los bytes del fichero nuevo', String(m.bytes_nuevos));
afirmar(m.bytes_totales === 4096 + 8192 + 2048 + 1024, 'y declara aparte el tamano aparente', String(m.bytes_totales));

/* Borrar una copia vieja no puede danar a la nueva: el contenido vive mientras
   quede un enlace. Se comprueba con una copia de usar y tirar. */
titulo('borrar una copia vieja no dana a las nuevas');
esperarSegundo();
r = copia();
const marcaEfimera = copiasEn(COPIAS).pop();
fs.rmSync(path.join(COPIAS, marca1), { recursive: true, force: true });
afirmar(
  enlazados.every((n) => fs.readFileSync(path.join(dirAdj2, n)).equals(contenidos.get(n))),
  'tras borrar la copia enlazada, la posterior sigue integra');
fs.rmSync(path.join(COPIAS, marcaEfimera), { recursive: true, force: true });

/* ── 3 · Un adjunto que falta: copia completa, aviso y codigo 2 ──────────── */

titulo('adjunto ausente — la copia se hace, pero avisa');
esperarSegundo();
fs.rmSync(path.join(UPLOADS, 'bbbb2222.pdf'));

r = copia();
afirmar(r.status === 2, 'termina con codigo 2, no con 0', `codigo ${r.status}`);
afirmar(r.status !== 1, 'y no con el codigo de fallo');

const marca3 = copiasEn(COPIAS).pop();
m = manifiestoDe(marca3);
afirmar(m.faltantes.length === 1, 'el manifiesto registra un faltante', String(m.faltantes.length));
afirmar(m.faltantes[0] && m.faltantes[0].nombre === 'bbbb2222.pdf', 'y dice cual es');
afirmar(m.faltantes[0] && m.faltantes[0].empresa === 'Oracle Corporation',
  'con el informe al que pertenece, para poder ir a arreglarlo');
afirmar(m.adjuntos.length === 3, 'los demas adjuntos si estan en la copia', String(m.adjuntos.length));

/* El mensaje tiene que distinguirse del de un fallo sin leerlo entero. */
const aviso = r.stderr;
afirmar(/LA COPIA ESTA COMPLETA/.test(aviso), 'el aviso afirma que la copia esta completa');
afirmar(!/LA COPIA HA FALLADO/.test(aviso), 'y no dice en ningun momento que haya fallado');
afirmar(/Copia creada/.test(r.stdout), 'y por la salida normal informa de la copia creada');

/* Una copia con faltantes sigue siendo integra: lo que falta faltaba antes. */
r = restaurar();
afirmar(r.status === 0 && !/NO RESTAURABLE/.test(r.stdout),
  'la copia con faltantes se ofrece como restaurable');

// Se repone el fichero para que el resto del recorrido parta de un estado sano.
fs.writeFileSync(path.join(UPLOADS, 'bbbb2222.pdf'), contenidos.get('bbbb2222.pdf'));

/* ── 4 · Un fallo de verdad no deja nada a medias ────────────────────────── */

titulo('fallo real — ni copia, ni restos');
esperarSegundo();
const copiasAntes = copiasEn(COPIAS);
const baseRota = path.join(BANCO, 'rota.db');
fs.writeFileSync(baseRota, 'esto no es una base de datos');
r = spawnSync(process.execPath, [path.join('scripts', 'copia.js')],
  { cwd: RAIZ, env: { ...ENTORNO, WARRANTS_DB: baseRota }, encoding: 'utf8' });

afirmar(r.status === 1, 'termina con codigo 1', `codigo ${r.status}`);
afirmar(/LA COPIA HA FALLADO/.test(r.stderr), 'lo dice sin rodeos');
afirmar(JSON.stringify(copiasEn(COPIAS)) === JSON.stringify(copiasAntes),
  'no aparece ninguna copia nueva');
afirmar(fs.readdirSync(COPIAS).every((n) => !n.startsWith('.parcial-')),
  'no queda ningun directorio parcial', fs.readdirSync(COPIAS).join(', '));

/* ── 5 · Un parcial abandonado no es una copia ───────────────────────────── */

titulo('parcial abandonado — ni se ofrece ni se confunde');
esperarSegundo();
r = copia();
afirmar(r.status === 0, 'copia de partida en orden', `codigo ${r.status}  ${r.stderr}`);
const ultimaBuena = copiasEn(COPIAS).pop();

/* Se fabrica el resto que quedaria si el proceso muriera justo antes de
   publicar: por dentro es indistinguible de una copia buena —manifiesto
   incluido— y ademas lleva fecha del ano 2099, de modo que si alguien lo
   tomara por copia seria la mas reciente de todas. */
const restoParcial = path.join(COPIAS, '.parcial-2099-01-01T00-00-00-9999');
fs.cpSync(path.join(COPIAS, ultimaBuena), restoParcial, { recursive: true });
afirmar(fs.existsSync(path.join(restoParcial, 'copia.json')),
  'el resto fabricado tiene manifiesto y aspecto de copia buena');

r = restaurar();
afirmar(r.status === 0, 'el listado se produce', `codigo ${r.status}  ${r.stderr}`);
const corte = r.stdout.indexOf('Restos de copias interrumpidas');
afirmar(corte !== -1, 'el listado tiene una seccion aparte para los restos');
const antesDelCorte = corte === -1 ? r.stdout : r.stdout.slice(0, corte);
const trasElCorte = corte === -1 ? '' : r.stdout.slice(corte);
afirmar(!antesDelCorte.includes('2099'), 'el resto no aparece entre las copias restaurables');
afirmar(trasElCorte.includes('.parcial-2099-01-01T00-00-00-9999'),
  'aparece nombrado entre los restos, para que se sepa que esta ahi');

/* La prueba de fuego: --ultima ordena por marca, y la del resto es la mayor. */
const ensayoParcial = path.join(BANCO, 'ensayo-parcial');
r = restaurar('--ultima', '--a', ensayoParcial);
afirmar(r.status === 0, '--ultima restaura', `codigo ${r.status}  ${r.stderr}`);
afirmar(r.stdout.includes(`Restaurada la copia ${ultimaBuena}`),
  '--ultima elige la ultima copia buena', r.stdout.split('\n').find((l) => l.includes('Restaurada')));
afirmar(!r.stdout.includes('2099'), 'y no el resto abandonado, aunque su fecha sea mayor');

/* Pedirlo por su nombre tampoco cuela. */
r = restaurar('.parcial-2099-01-01T00-00-00-9999', '--a', path.join(BANCO, 'no-deberia'));
afirmar(r.status === 1, 'nombrarlo explicitamente no lo restaura', `codigo ${r.status}`);
afirmar(/interrumpida/.test(r.stderr), 'y explica por que', r.stderr.trim().split('\n').slice(0, 3).join(' | '));
afirmar(!fs.existsSync(path.join(BANCO, 'no-deberia', 'warrants.db')),
  'no ha escrito nada en el destino');

/* Y la copia siguiente no enlaza de el: heredaria lo que nunca se valido. */
esperarSegundo();
r = copia();
m = manifiestoDe(copiasEn(COPIAS).pop());
afirmar(m.enlazados_de === ultimaBuena, 'la copia siguiente no enlaza del resto abandonado',
  String(m.enlazados_de));

fs.rmSync(restoParcial, { recursive: true, force: true });

/* ── 6 · El viaje entero: perder el origen y volver ──────────────────────── */

titulo('restauracion — se pierde el origen y se vuelve desde la copia');
esperarSegundo();
r = copia();
afirmar(r.status === 0, 'copia final antes del desastre', `codigo ${r.status}  ${r.stderr}`);
const ultima = copiasEn(COPIAS).pop();
const esperados = ficherosDe(UPLOADS);

// El desastre.
fs.rmSync(BASE, { force: true });
fs.rmSync(`${BASE}-wal`, { force: true });
fs.rmSync(`${BASE}-shm`, { force: true });
fs.rmSync(UPLOADS, { recursive: true, force: true });
afirmar(!fs.existsSync(BASE) && !fs.existsSync(UPLOADS), 'no queda ni base ni almacen');

const rescate = path.join(BANCO, 'rescate');
r = restaurar('--ultima', '--a', rescate);
afirmar(r.status === 0, 'la restauracion termina bien', `codigo ${r.status}  ${r.stderr}`);

const baseRescatada = path.join(rescate, 'warrants.db');
const uploadsRescatados = path.join(rescate, 'uploads');
afirmar(fs.existsSync(baseRescatada), 'la base vuelve');
afirmar(
  JSON.stringify(ficherosDe(uploadsRescatados)) === JSON.stringify(esperados),
  'vuelven exactamente los mismos ficheros, uno a uno',
  `${ficherosDe(uploadsRescatados).join(', ')} vs ${esperados.join(', ')}`);

/* Lo que de verdad se quiere saber: que ningun informe queda apuntando a un
   fichero que no existe, y que el que existe es el que era. */
const rescatada = new DatabaseSync(baseRescatada, { readOnly: true });
const filas = rescatada.prepare('SELECT nombre_fichero, bytes FROM adjuntos ORDER BY id').all();
rescatada.close();

afirmar(filas.length === 4, 'la base rescatada conserva las cuatro fichas de adjunto', String(filas.length));
const resueltos = filas.filter((f) => {
  const ruta = path.join(uploadsRescatados, f.nombre_fichero);
  return fs.existsSync(ruta) && fs.statSync(ruta).size === f.bytes
    && fs.readFileSync(ruta).equals(contenidos.get(f.nombre_fichero));
});
afirmar(resueltos.length === filas.length,
  'cada fila de adjuntos resuelve en un fichero con sus bytes exactos',
  `${resueltos.length} de ${filas.length}`);

/* Lo restaurado tiene que ser suyo: si compartiera inodo con el respaldo, el
   primer borrado hecho desde la plataforma mutilaria la copia de seguridad. */
const dirUltima = path.join(COPIAS, ultima, 'uploads');
afirmar(
  ficherosDe(uploadsRescatados).every((n) =>
    fs.statSync(path.join(uploadsRescatados, n)).ino !== fs.statSync(path.join(dirUltima, n)).ino),
  'ningun fichero restaurado comparte inodo con el respaldo');

/* ── 7 · No sobrescribir sin decirlo ─────────────────────────────────────── */

titulo('el destino ocupado no se pisa por descuido');
r = restaurar('--ultima', '--a', rescate);
afirmar(r.status === 1, 'sin --forzar se niega', `codigo ${r.status}`);
afirmar(/--forzar/.test(r.stderr), 'y dice como seguir si es lo que se quiere');

const inodoAntes = fs.statSync(baseRescatada).ino;
r = restaurar('--ultima', '--a', rescate, '--forzar');
afirmar(r.status === 0, 'con --forzar restaura', `codigo ${r.status}  ${r.stderr}`);
afirmar(fs.statSync(baseRescatada).ino !== inodoAntes, 'la base es realmente la nueva');
const apartados = fs.readdirSync(rescate).filter((n) => n.includes('.previo-'));
afirmar(apartados.length >= 2, 'lo anterior queda apartado, no borrado', apartados.join(', '));

/* ── 8 · Las copias sueltas del esquema anterior ─────────────────────────── */

titulo('copias del esquema anterior');
fs.copyFileSync(path.join(COPIAS, ultima, 'warrants.db'),
  path.join(COPIAS, 'warrants-2020-01-01T00-00-00.db'));
r = restaurar();
afirmar(/esquema anterior/.test(r.stdout) && /warrants-2020-01-01T00-00-00\.db/.test(r.stdout),
  'se listan aparte, avisando de que no llevan adjuntos');

const soloBase = path.join(BANCO, 'solo-base');
r = restaurar('warrants-2020-01-01T00-00-00.db', '--a', soloBase);
afirmar(r.status === 0, 'se pueden restaurar', `codigo ${r.status}  ${r.stderr}`);
afirmar(fs.existsSync(path.join(soloBase, 'warrants.db')), 'la base vuelve');
afirmar(/SIN RESTAURAR/.test(r.stdout), 'y se avisa de que los adjuntos no vienen con ella');

/* ── Cierre ──────────────────────────────────────────────────────────────── */

titulo('el banco de pruebas no ha tocado los datos de trabajo');
afirmar(!fs.existsSync(path.join(RAIZ, 'data', 'copias', '2099-01-01T00-00-00')),
  'no hay rastro del banco en data/copias');
const parcialesReales = fs.existsSync(path.join(RAIZ, 'data', 'copias'))
  ? fs.readdirSync(path.join(RAIZ, 'data', 'copias')).filter((n) => n.startsWith('.parcial-'))
  : [];
afirmar(parcialesReales.length === 0, 'no quedan parciales en data/copias', parcialesReales.join(', '));

fs.rmSync(BANCO, { recursive: true, force: true });

console.log(fallos
  ? `\n  ${fallos} de ${pruebas} comprobaciones han fallado\n`
  : `\n  ${pruebas}/${pruebas} correctas\n`);
process.exit(fallos ? 1 : 0);
