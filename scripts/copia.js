'use strict';

/**
 * Copia de seguridad de la base de datos y de los adjuntos.
 *
 * Emplea VACUUM INTO en lugar de copiar el fichero: con el diario en modo WAL,
 * una copia directa puede capturar un estado incoherente. La copia resultante es
 * un fichero SQLite completo y consistente.
 *
 * Los adjuntos van al lado, en `uploads/`. Los que ya estaban en la copia
 * anterior se incorporan por enlace duro: el directorio se ve y se restaura como
 * una copia completa e independiente, pero esos ficheros no ocupan disco otra
 * vez. Se puede borrar cualquier copia vieja sin danar a las demas, porque el
 * contenido vive mientras quede un enlace apuntandolo.
 *
 * La copia se construye en un directorio parcial y solo al final recibe su
 * nombre definitivo, con un renombrado que es atomico. Un directorio fechado o
 * existe entero o no existe: nunca queda una copia a medias con aspecto de
 * completa.
 *
 *   npm run copia
 *
 * Codigos de salida:
 *   0  copia completa
 *   1  la copia ha fallado y no se ha creado nada
 *   2  copia completa, pero hay informes que apuntan a adjuntos que no estan
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const {
  ORIGEN_BASE, ORIGEN_UPLOADS, DIR_COPIAS,
  MANIFIESTO, VERSION_MANIFIESTO, PREFIJO_PARCIAL,
  NOMBRE_BASE, DIR_ADJUNTOS,
  marcaAhora, tamano, rutaLegible, sincronizarDirectorio, inventario,
} = require('./copias-comunes');

const SALIDA_FALLO = 1;
const SALIDA_FALTANTES = 2;

let parcial = null;

/** Retira el directorio en construccion. Nada a medias sobrevive a un fallo. */
function retirarParcial() {
  if (parcial && fs.existsSync(parcial)) {
    try { fs.rmSync(parcial, { recursive: true, force: true }); } catch { /* se avisa aparte */ }
  }
}

function abortar(motivo, detalle) {
  const habia = parcial && fs.existsSync(parcial);
  retirarParcial();
  console.error('\n  LA COPIA HA FALLADO. No se ha creado ninguna copia.\n');
  console.error(`  ${motivo}`);
  if (detalle) console.error(`  ${detalle}`);
  if (habia) console.error(`  El directorio en construccion se ha retirado: ${rutaLegible(parcial)}`);
  process.exit(SALIDA_FALLO);
}

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    retirarParcial();
    console.error(`\n  Copia interrumpida (${senal}). No queda nada a medias.`);
    process.exit(SALIDA_FALLO);
  });
}

/** Copia un fichero conservando su fecha: la copia es un registro, no un original. */
function copiarConFecha(origen, destino, datos) {
  fs.copyFileSync(origen, destino);
  fs.utimesSync(destino, datos.atime, datos.mtime);
  // Solo lo copiado de verdad necesita fsync; lo enlazado ya estaba en disco.
  let fd;
  try { fd = fs.openSync(destino, 'r'); fs.fsyncSync(fd); } catch { /* mejor esfuerzo */ }
  finally { if (fd !== undefined) try { fs.closeSync(fd); } catch { /* nada */ } }
}

if (!fs.existsSync(ORIGEN_BASE)) {
  console.error(`No existe la base de datos en ${ORIGEN_BASE}`);
  process.exit(SALIDA_FALLO);
}

fs.mkdirSync(DIR_COPIAS, { recursive: true });

const marca = marcaAhora();
const definitiva = path.join(DIR_COPIAS, marca);
if (fs.existsSync(definitiva)) {
  console.error(`Ya existe una copia de este mismo segundo en ${rutaLegible(definitiva)}`);
  process.exit(SALIDA_FALLO);
}

// El pid en el nombre evita que dos ejecuciones simultaneas se pisen el parcial.
parcial = path.join(DIR_COPIAS, `${PREFIJO_PARCIAL}${marca}-${process.pid}`);

let informes = 0, noticias = 0;
let filasAdjuntos = [];
const registrados = [];
const faltantes = [];
const discordantes = [];
const huerfanos = [];
const ignorados = [];
let enlazados = 0, copiados = 0, bytesNuevos = 0, bytesTotales = 0;
let copiaPrevia = null;

try {
  retirarParcial();
  fs.mkdirSync(path.join(parcial, DIR_ADJUNTOS), { recursive: true });

  /* La base primero y los ficheros despues, no al reves: un adjunto se escribe
     en disco antes de que exista su fila, de modo que toda fila de esta base ya
     tiene su fichero. Al reves habria filas nuevas sin fichero copiado. */
  const destinoBase = path.join(parcial, NOMBRE_BASE);
  const origen = new DatabaseSync(ORIGEN_BASE, { readOnly: true });
  try {
    origen.prepare('VACUUM INTO ?').run(destinoBase);
  } finally {
    origen.close();
  }

  let fd;
  try { fd = fs.openSync(destinoBase, 'r'); fs.fsyncSync(fd); } catch { /* mejor esfuerzo */ }
  finally { if (fd !== undefined) try { fs.closeSync(fd); } catch { /* nada */ } }

  const copiaBase = new DatabaseSync(destinoBase, { readOnly: true });
  try {
    informes = copiaBase.prepare('SELECT COUNT(*) AS c FROM informes').get().c;
    noticias = copiaBase.prepare('SELECT COUNT(*) AS c FROM noticias').get().c;
    filasAdjuntos = copiaBase.prepare(`
      SELECT a.id, a.informe_id, a.nombre_fichero, a.nombre_original, a.bytes, i.empresa
      FROM adjuntos a LEFT JOIN informes i ON i.id = a.informe_id
      ORDER BY a.id
    `).all();
  } finally {
    copiaBase.close();
  }

  /* Copia anterior de la que enlazar. Los parciales quedan fuera del inventario:
     enlazar de una copia interrumpida seria heredar lo que no se llego a validar. */
  const previas = inventario(DIR_COPIAS).copias;
  copiaPrevia = previas.length ? previas[previas.length - 1] : null;

  const entradas = fs.existsSync(ORIGEN_UPLOADS)
    ? fs.readdirSync(ORIGEN_UPLOADS, { withFileTypes: true })
    : [];

  for (const entrada of entradas) {
    // Los ficheros ocultos son andamiaje del repositorio, no documentos.
    if (entrada.name.startsWith('.')) continue;
    if (!entrada.isFile()) { ignorados.push(entrada.name); continue; }

    const rutaOrigen = path.join(ORIGEN_UPLOADS, entrada.name);
    const datos = fs.statSync(rutaOrigen);
    const destino = path.join(parcial, DIR_ADJUNTOS, entrada.name);

    /* Se enlaza solo si el candidato de la copia anterior coincide en nombre,
       tamano y fecha. Si la comparacion falla se copia: el error posible es
       copiar de mas, nunca enlazar algo distinto. Y el enlace es siempre contra
       la copia anterior, jamas contra el almacen vivo, para que la aplicacion
       pueda borrar un adjunto sin tocar ningun respaldo. */
    let via = 'copiado';
    const candidato = copiaPrevia && path.join(copiaPrevia.ruta, DIR_ADJUNTOS, entrada.name);
    if (candidato && fs.existsSync(candidato)) {
      const previo = fs.statSync(candidato);
      if (previo.size === datos.size && Math.abs(previo.mtimeMs - datos.mtimeMs) < 2) {
        try { fs.linkSync(candidato, destino); via = 'enlazado'; } catch { /* EXDEV, EMLINK, EPERM: se copia */ }
      }
    }
    if (via === 'copiado') {
      copiarConFecha(rutaOrigen, destino, datos);
      copiados++;
      bytesNuevos += datos.size;
    } else {
      enlazados++;
    }
    bytesTotales += datos.size;
    registrados.push({ nombre: entrada.name, bytes: datos.size, via });
  }

  /* Verificacion contra la base, no contra el directorio: una copia hecha con el
     almacen mal apuntado tendria el directorio coherente consigo mismo y aun asi
     estaria vacia de documentos. */
  const enDisco = new Map(registrados.map((r) => [r.nombre, r]));
  const referidos = new Set();
  for (const fila of filasAdjuntos) {
    referidos.add(fila.nombre_fichero);
    const presente = enDisco.get(fila.nombre_fichero);
    if (!presente) {
      faltantes.push({
        nombre: fila.nombre_fichero, nombre_original: fila.nombre_original,
        informe_id: fila.informe_id, empresa: fila.empresa, bytes_declarados: fila.bytes,
      });
    } else if (presente.bytes !== fila.bytes) {
      discordantes.push({
        nombre: fila.nombre_fichero, nombre_original: fila.nombre_original,
        informe_id: fila.informe_id, empresa: fila.empresa,
        bytes_declarados: fila.bytes, bytes_en_disco: presente.bytes,
      });
    }
  }
  for (const r of registrados) if (!referidos.has(r.nombre)) huerfanos.push(r.nombre);

  const manifiesto = {
    version: VERSION_MANIFIESTO,
    marca,
    creada_en: new Date().toISOString(),
    origen: { base: ORIGEN_BASE, uploads: ORIGEN_UPLOADS },
    base: {
      fichero: NOMBRE_BASE, bytes: fs.statSync(destinoBase).size,
      informes, noticias, adjuntos: filasAdjuntos.length,
    },
    adjuntos: registrados,
    enlazados_de: copiaPrevia ? copiaPrevia.marca : null,
    bytes_totales: bytesTotales,
    bytes_nuevos: bytesNuevos,
    faltantes,
    discordantes,
    huerfanos,
    ignorados,
  };

  const rutaManifiesto = path.join(parcial, MANIFIESTO);
  fs.writeFileSync(rutaManifiesto, `${JSON.stringify(manifiesto, null, 2)}\n`);
  let fdm;
  try { fdm = fs.openSync(rutaManifiesto, 'r'); fs.fsyncSync(fdm); } catch { /* mejor esfuerzo */ }
  finally { if (fdm !== undefined) try { fs.closeSync(fdm); } catch { /* nada */ } }

  sincronizarDirectorio(path.join(parcial, DIR_ADJUNTOS));
  sincronizarDirectorio(parcial);

  // Publicacion: hasta esta linea no existe ninguna copia con nombre de copia.
  fs.renameSync(parcial, definitiva);
  parcial = null;
  sincronizarDirectorio(DIR_COPIAS);
} catch (err) {
  if (err && err.code === 'ENOSPC') {
    abortar('No queda espacio en el disco.', 'No se ha publicado nada: la copia anterior sigue siendo la ultima buena.');
  }
  abortar(`${err && err.message ? err.message : err}`);
}

const bytesBase = fs.statSync(path.join(definitiva, NOMBRE_BASE)).size;
console.log(`\nCopia creada: ${rutaLegible(definitiva)}`);
console.log(`  ${informes} informe(s) · ${noticias} noticia(s) · base ${tamano(bytesBase)}`);

if (registrados.length) {
  const detalle = [];
  if (enlazados) detalle.push(`${enlazados} enlazado(s) de ${copiaPrevia.marca}`);
  if (copiados) detalle.push(`${copiados} copiado(s)`);
  console.log(`  ${registrados.length} adjunto(s): ${detalle.join(' · ')}`);
  console.log(`  Ocupa ${tamano(bytesBase + bytesNuevos)} de los ${tamano(bytesBase + bytesTotales)} que aparenta.`);
} else {
  console.log('  Sin adjuntos en el almacen.');
}
if (huerfanos.length) console.log(`  ${huerfanos.length} fichero(s) en el almacen sin informe que los referencie: se copian igual.`);
if (ignorados.length) console.log(`  ${ignorados.length} entrada(s) que no son ficheros, no copiadas: ${ignorados.join(', ')}`);

const problemas = faltantes.length + discordantes.length;
if (!problemas) process.exit(0);

/* El aviso va por el canal de error y con codigo distinto de cero, porque un
   informe que apunta a un documento ausente tiene que llegar. Pero se dice sin
   ambiguedad que la copia esta hecha: es un problema de los datos, anterior a
   esta ejecucion, no un fallo del respaldo. */
const raya = '─'.repeat(68);
console.error(`\n  ${raya}`);
console.error('  LA COPIA ESTA COMPLETA Y ES VALIDA. El aviso es sobre los datos.\n');
if (faltantes.length) {
  console.error(`  ${faltantes.length} adjunto(s) que los informes referencian y no estan en el almacen:`);
  for (const f of faltantes) {
    console.error(`    · informe ${f.informe_id} · ${f.empresa ?? 'sin informe'} · ${f.nombre_original} (${f.nombre})`);
  }
}
if (discordantes.length) {
  if (faltantes.length) console.error('');
  console.error(`  ${discordantes.length} adjunto(s) que no pesan lo que la base declara:`);
  for (const d of discordantes) {
    console.error(`    · informe ${d.informe_id} · ${d.empresa ?? 'sin informe'} · ${d.nombre_original}: ` +
      `${d.bytes_declarados} declarados, ${d.bytes_en_disco} en disco`);
  }
}
console.error('\n  Ya faltaban antes de copiar. La copia recoge fielmente lo que hay,');
console.error(`  y el detalle queda en ${MANIFIESTO}.`);
console.error(`  ${raya}\n`);
process.exit(SALIDA_FALTANTES);
