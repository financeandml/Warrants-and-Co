'use strict';

/**
 * Restauracion de una copia de seguridad.
 *
 * Existe como script y no como instrucciones en el README porque restaurar a
 * mano es justo donde se cometen los errores: dejar un `-wal` viejo junto a una
 * base nueva, restaurar los adjuntos con enlaces que luego la aplicacion borra,
 * o descubrir a mitad que la copia elegida estaba incompleta.
 *
 *   npm run restaurar                                  lista y no toca nada
 *   npm run restaurar -- --ultima --a /tmp/ensayo      ensayo, sin riesgo
 *   npm run restaurar -- 2026-08-24T10-30-00 --forzar  sobre el directorio de trabajo
 *
 * Codigos de salida:
 *   0  restauracion completa, o listado
 *   1  no se ha restaurado nada
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const {
  ORIGEN_BASE, ORIGEN_UPLOADS, DIR_COPIAS,
  NOMBRE_BASE, DIR_ADJUNTOS, RE_SUELTA,
  marcaAhora, tamano, rutaLegible, sincronizarDirectorio, inventario, verificar,
} = require('./copias-comunes');

const argv = process.argv.slice(2);
const opciones = { marca: null, destino: null, forzar: false, ultima: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--ultima') opciones.ultima = true;
  else if (a === '--forzar') opciones.forzar = true;
  else if (a === '--a') opciones.destino = argv[++i];
  else if (a.startsWith('--')) fallar(`Opcion desconocida: ${a}`);
  else if (!opciones.marca) opciones.marca = a;
  else fallar(`Sobra el argumento: ${a}`);
}

function fallar(motivo, detalle) {
  console.error(`\n  NO SE HA RESTAURADO NADA.\n\n  ${motivo}`);
  if (detalle) console.error(`  ${detalle}`);
  console.error('');
  process.exit(1);
}

const inv = inventario(DIR_COPIAS);

/* ── Listado ─────────────────────────────────────────────────────────────── */

function listar() {
  console.log(`\n  Copias en ${rutaLegible(DIR_COPIAS)}\n`);

  if (!inv.copias.length) console.log('    (ninguna copia del esquema actual)');
  for (const c of inv.copias) {
    const { manifiesto, problemas } = verificar(c.ruta);
    if (!manifiesto) { console.log(`    ✗ ${c.marca}  ilegible: ${problemas[0]}`); continue; }
    const estado = problemas.length ? '✗' : '·';
    const avisos = [];
    if (manifiesto.faltantes.length) avisos.push(`${manifiesto.faltantes.length} adjunto(s) faltaban ya al copiar`);
    if (manifiesto.discordantes.length) avisos.push(`${manifiesto.discordantes.length} adjunto(s) discordantes`);
    console.log(`    ${estado} ${c.marca}  ${String(manifiesto.base.informes).padStart(4)} informe(s) · ` +
      `${String(manifiesto.adjuntos.length).padStart(3)} adjunto(s) · ` +
      `${tamano(manifiesto.base.bytes + manifiesto.bytes_totales)}`);
    if (problemas.length) for (const p of problemas.slice(0, 3)) console.log(`        NO RESTAURABLE: ${p}`);
    else if (avisos.length) console.log(`        ${avisos.join(' · ')}`);
  }

  if (inv.sueltas.length) {
    console.log('\n  Copias del esquema anterior — solo base, SIN adjuntos:\n');
    for (const s of inv.sueltas) {
      console.log(`    · ${s.nombre}  ${tamano(fs.statSync(s.ruta).size)}`);
    }
  }

  /* Los restos de una copia interrumpida se nombran, pero nunca se ofrecen: que
     esten a la vista es lo que evita que alguien los confunda con una copia. */
  if (inv.parciales.length) {
    console.log('\n  Restos de copias interrumpidas — NO son copias, no se pueden restaurar:\n');
    for (const p of inv.parciales) console.log(`    ! ${p.nombre}`);
    console.log('\n    Se pueden borrar sin miedo: ninguna copia buena depende de ellos.');
  }
  if (inv.huerfanas.length) {
    console.log('\n  Directorios fechados sin manifiesto — NO se pueden restaurar:\n');
    for (const h of inv.huerfanas) console.log(`    ! ${h.marca}`);
  }

  if (!inv.copias.length) {
    console.log('\n  Todavia no hay ninguna copia con adjuntos. Para hacer la primera:');
    console.log('    npm run copia\n');
    return;
  }
  console.log('\n  Para restaurar sin riesgo, a un directorio aparte:');
  console.log('    npm run restaurar -- --ultima --a /tmp/ensayo-restauracion\n');
}

if (!opciones.marca && !opciones.ultima) {
  listar();
  process.exit(0);
}

/* ── Eleccion de la copia ────────────────────────────────────────────────── */

let elegida = null;
let suelta = null;

if (opciones.ultima) {
  if (opciones.marca) fallar('--ultima y una marca concreta son excluyentes.');
  if (!inv.copias.length) fallar('No hay ninguna copia del esquema actual.', 'Ejecuta `npm run copia` primero.');
  elegida = inv.copias[inv.copias.length - 1];
} else if (RE_SUELTA.test(opciones.marca)) {
  suelta = inv.sueltas.find((s) => s.nombre === opciones.marca);
  if (!suelta) fallar(`No existe la copia suelta ${opciones.marca}.`);
} else {
  elegida = inv.copias.find((c) => c.marca === opciones.marca);
  if (!elegida) {
    /* Se distingue "no existe" de "existe pero no es una copia": el segundo caso
       es el resto de una ejecucion interrumpida, y decirlo ahorra el susto. */
    const parcial = inv.parciales.find((p) => p.nombre === opciones.marca || p.nombre.includes(opciones.marca));
    if (parcial) {
      fallar(`${parcial.nombre} es el resto de una copia interrumpida, no una copia.`,
        'Nunca llego a completarse ni a verificarse: no se restaura. Bórralo si estorba.');
    }
    const huerfana = inv.huerfanas.find((h) => h.marca === opciones.marca);
    if (huerfana) fallar(`${opciones.marca} no tiene manifiesto: no se puede saber que contiene.`);
    fallar(`No existe la copia ${opciones.marca}.`, 'Ejecuta `npm run restaurar` sin argumentos para ver las que hay.');
  }
}

/* ── Verificacion previa ─────────────────────────────────────────────────── */

let manifiesto = null;
if (elegida) {
  const resultado = verificar(elegida.ruta);
  manifiesto = resultado.manifiesto;
  if (resultado.problemas.length) {
    console.error(`\n  La copia ${elegida.marca} NO es integra:\n`);
    for (const p of resultado.problemas.slice(0, 10)) console.error(`    · ${p}`);
    if (resultado.problemas.length > 10) console.error(`    · … y ${resultado.problemas.length - 10} mas`);
    fallar('No se restaura una copia que no verifica.');
  }
}

/* ── Destino ─────────────────────────────────────────────────────────────── */

const ensayo = Boolean(opciones.destino);
const destinoBase = ensayo ? path.join(path.resolve(opciones.destino), NOMBRE_BASE) : ORIGEN_BASE;
const destinoUploads = ensayo ? path.join(path.resolve(opciones.destino), DIR_ADJUNTOS) : ORIGEN_UPLOADS;

if (elegida && path.resolve(destinoUploads) === path.join(elegida.ruta, DIR_ADJUNTOS)) {
  fallar('El destino es la propia copia.');
}

const habiaBase = fs.existsSync(destinoBase);
const habiaAdjuntos = fs.existsSync(destinoUploads)
  && fs.readdirSync(destinoUploads).some((n) => !n.startsWith('.'));

if ((habiaBase || habiaAdjuntos) && !opciones.forzar) {
  console.error('\n  El destino ya tiene datos:\n');
  if (habiaBase) console.error(`    · base     ${destinoBase}`);
  if (habiaAdjuntos) console.error(`    · adjuntos ${destinoUploads}`);
  console.error('\n  Anade --forzar para sustituirlos. Lo actual no se borra: se aparta con');
  console.error('  el sufijo .previo-<fecha> al lado, por si hiciera falta volver.\n');
  console.error('  Si solo quieres comprobar la copia, restaura a otro sitio:');
  console.error('    npm run restaurar -- --ultima --a /tmp/ensayo-restauracion\n');
  process.exit(1);
}

if (!ensayo) {
  console.log('\n  Restauracion sobre el directorio de trabajo.');
  console.log('  DETEN EL SERVIDOR antes de continuar: una base sustituida bajo un');
  console.log('  proceso vivo deja a ese proceso escribiendo sobre lo que ya no es.\n');
}

/* ── Construccion aparte ─────────────────────────────────────────────────── */

/* Se construye entero al lado y solo despues se sustituye. Si algo falla a
   mitad, el destino sigue exactamente como estaba. */
const sufijo = `.restaurando-${process.pid}`;
const baseEnObra = `${destinoBase}${sufijo}`;
const uploadsEnObra = `${destinoUploads}${sufijo}`;
const apartados = [];

function retirarObra() {
  try { fs.rmSync(baseEnObra, { force: true }); } catch { /* nada */ }
  try { fs.rmSync(uploadsEnObra, { recursive: true, force: true }); } catch { /* nada */ }
}

process.on('SIGINT', () => { retirarObra(); console.error('\n  Restauracion interrumpida. El destino no se ha tocado.'); process.exit(1); });

let restaurados = 0;
try {
  fs.mkdirSync(path.dirname(destinoBase), { recursive: true });
  retirarObra();

  const origenBaseCopia = elegida ? path.join(elegida.ruta, NOMBRE_BASE) : suelta.ruta;
  fs.copyFileSync(origenBaseCopia, baseEnObra);

  if (elegida) {
    fs.mkdirSync(uploadsEnObra, { recursive: true });
    /* Se copia, nunca se enlaza. Un adjunto restaurado que compartiera inodo con
       el respaldo convertiria el primer borrado hecho desde la aplicacion en un
       borrado dentro de la copia de seguridad. */
    for (const a of manifiesto.adjuntos) {
      const origen = path.join(elegida.ruta, DIR_ADJUNTOS, a.nombre);
      const destino = path.join(uploadsEnObra, a.nombre);
      fs.copyFileSync(origen, destino);
      const datos = fs.statSync(origen);
      fs.utimesSync(destino, datos.atime, datos.mtime);
      if (fs.statSync(destino).size !== a.bytes) {
        throw new Error(`el adjunto ${a.nombre} no se ha copiado entero`);
      }
      restaurados++;
    }
    sincronizarDirectorio(uploadsEnObra);
  }

  /* La base restaurada tiene que abrir y cuadrar antes de sustituir nada. */
  const comprobacion = new DatabaseSync(baseEnObra, { readOnly: true });
  try {
    const enBase = comprobacion.prepare('SELECT COUNT(*) AS c FROM adjuntos').get().c;
    if (elegida && enBase !== manifiesto.base.adjuntos) {
      throw new Error(`la base restaurada declara ${enBase} adjunto(s) y el manifiesto ${manifiesto.base.adjuntos}`);
    }
  } finally {
    comprobacion.close();
  }

  /* ── Sustitucion ───────────────────────────────────────────────────────── */

  const marca = marcaAhora();
  if (habiaBase) {
    const aparte = `${destinoBase}.previo-${marca}`;
    fs.renameSync(destinoBase, aparte);
    apartados.push(aparte);
    /* El diario viejo se aparta con su base. Dejarlo junto a una base nueva es
       la forma mas silenciosa de estropear una restauracion. */
    for (const ext of ['-wal', '-shm']) {
      if (fs.existsSync(`${destinoBase}${ext}`)) fs.renameSync(`${destinoBase}${ext}`, `${aparte}${ext}`);
    }
  }
  fs.renameSync(baseEnObra, destinoBase);

  if (elegida) {
    if (fs.existsSync(destinoUploads)) {
      const aparte = `${destinoUploads}.previo-${marca}`;
      fs.renameSync(destinoUploads, aparte);
      apartados.push(aparte);
    }
    fs.renameSync(uploadsEnObra, destinoUploads);
  }
  sincronizarDirectorio(path.dirname(destinoBase));
} catch (err) {
  retirarObra();
  fallar(`${err && err.message ? err.message : err}`,
    apartados.length ? `Lo anterior quedo apartado en: ${apartados.join(', ')}` : undefined);
}

/* ── Informe ─────────────────────────────────────────────────────────────── */

const origen = elegida ? elegida.marca : suelta.nombre;
console.log(`\n  Restaurada la copia ${origen}\n`);
console.log(`    base      ${destinoBase}  (${tamano(fs.statSync(destinoBase).size)})`);
if (elegida) {
  console.log(`    adjuntos  ${destinoUploads}  (${restaurados} fichero(s))`);
  if (manifiesto.faltantes.length) {
    console.log(`\n    ${manifiesto.faltantes.length} adjunto(s) ya faltaban cuando se hizo la copia,`);
    console.log('    de modo que siguen sin estar. Estan listados en su copia.json.');
  }
} else {
  console.log(`    adjuntos  SIN RESTAURAR — ${origen} es del esquema anterior y no los`);
  console.log(`              contiene. ${destinoUploads} se ha dejado intacto.`);
}
for (const a of apartados) console.log(`\n    Lo anterior quedo apartado en ${a}`);

if (ensayo) {
  console.log('\n  Para comprobar que la copia sirve de verdad, levanta la plataforma');
  console.log('  contra lo restaurado y abre un informe con adjunto:\n');
  console.log(`    WARRANTS_DB=${destinoBase} \\`);
  console.log(`    WARRANTS_UPLOADS=${destinoUploads} npm start\n`);
} else {
  console.log('\n  Arranca de nuevo el servidor: npm start\n');
}
