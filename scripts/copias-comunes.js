'use strict';

/**
 * Piezas compartidas por `copia.js` y `restaurar.js`.
 *
 * Viven juntas por un motivo concreto, no por ahorrar lineas: quien escribe una
 * copia y quien la lee tienen que coincidir en que es una copia y que no lo es.
 * Si el prefijo de los directorios parciales o el patron de las marcas se
 * decidieran por separado, bastaria con que uno de los dos cambiase para que una
 * copia interrumpida empezara a parecer buena a ojos del restaurador.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Las tres rutas se redirigen por entorno. La base y el almacen de documentos
// por lo que ya explica src/db.js; el directorio de copias, para que la bateria
// de pruebas no escriba entre las copias de trabajo.
const ORIGEN_BASE = process.env.WARRANTS_DB
  ? path.resolve(process.env.WARRANTS_DB)
  : path.join(DATA_DIR, 'warrants.db');
const ORIGEN_UPLOADS = process.env.WARRANTS_UPLOADS
  ? path.resolve(process.env.WARRANTS_UPLOADS)
  : path.join(DATA_DIR, 'uploads');
const DIR_COPIAS = process.env.WARRANTS_COPIAS
  ? path.resolve(process.env.WARRANTS_COPIAS)
  : path.join(DATA_DIR, 'copias');

/* El manifiesto es lo que convierte un directorio en una copia: se escribe el
   ultimo, dentro del parcial, y solo despues el parcial recibe su nombre
   definitivo. Un directorio fechado sin manifiesto no deberia existir jamas. */
const MANIFIESTO = 'copia.json';
const VERSION_MANIFIESTO = 1;

/* El punto inicial lo esconde de un `ls` y, sobre todo, lo deja fuera de
   RE_MARCA: un parcial no puede llamarse como una copia. */
const PREFIJO_PARCIAL = '.parcial-';
const RE_MARCA = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;

/* Copias del esquema anterior, anteriores a que existieran los adjuntos. */
const RE_SUELTA = /^warrants-.+\.db$/;

const NOMBRE_BASE = 'warrants.db';
const DIR_ADJUNTOS = 'uploads';

/** Marca temporal de una copia: ordenable alfabeticamente y legible. */
function marcaAhora() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function esParcial(nombre) {
  return nombre.startsWith(PREFIJO_PARCIAL);
}

/** Ruta relativa si cae dentro del proyecto; absoluta si no. Una ristra de
    `../..` no le dice a nadie donde esta su copia. */
function rutaLegible(ruta) {
  const relativa = path.relative(process.cwd(), ruta);
  return relativa && !relativa.startsWith('..') ? relativa : ruta;
}

function tamano(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024).toLocaleString('es-ES')} KB`;
}

/**
 * Fuerza a disco lo escrito en un directorio. Sin esto, un corte de corriente
 * puede deshacer el renombrado que publica la copia. Es mejor esfuerzo: si el
 * sistema de ficheros no lo admite, la copia sigue siendo correcta.
 */
function sincronizarDirectorio(ruta) {
  let fd;
  try {
    fd = fs.openSync(ruta, 'r');
    fs.fsyncSync(fd);
  } catch {
    /* Sin fsync la copia vale; solo pierde garantia ante un corte electrico. */
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch { /* nada que hacer */ }
  }
}

/**
 * Inventario del directorio de copias, con cada cosa en su sitio y sin mezclar:
 * las copias buenas, los restos de una copia interrumpida y las copias sueltas
 * del esquema anterior son tres categorias distintas.
 */
function inventario(dir = DIR_COPIAS) {
  const vacio = { copias: [], parciales: [], sueltas: [], huerfanas: [] };
  if (!fs.existsSync(dir)) return vacio;

  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (esParcial(entrada.name)) { vacio.parciales.push({ nombre: entrada.name, ruta }); continue; }
      if (!RE_MARCA.test(entrada.name)) continue;
      // Un directorio fechado sin manifiesto no se ofrece: no se sabe que hay dentro.
      if (!fs.existsSync(path.join(ruta, MANIFIESTO))) { vacio.huerfanas.push({ marca: entrada.name, ruta }); continue; }
      vacio.copias.push({ marca: entrada.name, ruta });
    } else if (entrada.isFile() && RE_SUELTA.test(entrada.name)) {
      vacio.sueltas.push({ nombre: entrada.name, ruta });
    }
  }
  /* Comparacion simple, no `localeCompare`: las marcas son ASCII de anchura
     fija, de modo que el orden alfabetico ya es el cronologico, y asi no depende
     de la configuracion regional de quien ejecute la copia. */
  const porNombre = (campo) => (a, b) => (a[campo] < b[campo] ? -1 : a[campo] > b[campo] ? 1 : 0);
  vacio.copias.sort(porNombre('marca'));
  vacio.sueltas.sort(porNombre('nombre'));
  vacio.parciales.sort(porNombre('nombre'));
  return vacio;
}

/** Lee el manifiesto de una copia. Devuelve null si falta o no es legible. */
function leerManifiesto(ruta) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(ruta, MANIFIESTO), 'utf8'));
    return m && m.version === VERSION_MANIFIESTO ? m : null;
  } catch {
    return null;
  }
}

/**
 * Comprueba que una copia es integra contra su propio manifiesto: la base esta y
 * pesa lo que decia, cada adjunto esta y pesa lo que decia, y la base abre y
 * declara los mismos adjuntos que el manifiesto.
 *
 * Devuelve la lista de problemas. Vacia significa restaurable.
 */
function verificar(ruta) {
  const problemas = [];
  const manifiesto = leerManifiesto(ruta);
  if (!manifiesto) return { manifiesto: null, problemas: ['sin manifiesto legible: no es una copia'] };

  const rutaBase = path.join(ruta, NOMBRE_BASE);
  if (!fs.existsSync(rutaBase)) {
    problemas.push('falta la base de datos');
  } else {
    const bytes = fs.statSync(rutaBase).size;
    if (bytes !== manifiesto.base.bytes) {
      problemas.push(`la base pesa ${bytes} y el manifiesto declara ${manifiesto.base.bytes}`);
    }
  }

  for (const a of manifiesto.adjuntos) {
    const rutaAdj = path.join(ruta, DIR_ADJUNTOS, a.nombre);
    if (!fs.existsSync(rutaAdj)) { problemas.push(`falta el adjunto ${a.nombre}`); continue; }
    const bytes = fs.statSync(rutaAdj).size;
    if (bytes !== a.bytes) problemas.push(`el adjunto ${a.nombre} pesa ${bytes} y el manifiesto declara ${a.bytes}`);
  }

  if (fs.existsSync(rutaBase) && !problemas.length) {
    let base;
    try {
      base = new DatabaseSync(rutaBase, { readOnly: true });
      const enBase = base.prepare('SELECT COUNT(*) AS c FROM adjuntos').get().c;
      if (enBase !== manifiesto.base.adjuntos) {
        problemas.push(`la base declara ${enBase} adjunto(s) y el manifiesto ${manifiesto.base.adjuntos}`);
      }
    } catch (err) {
      problemas.push(`la base no se deja abrir: ${err.message}`);
    } finally {
      if (base) try { base.close(); } catch { /* ya cerrada */ }
    }
  }

  return { manifiesto, problemas };
}

module.exports = {
  DATA_DIR, ORIGEN_BASE, ORIGEN_UPLOADS, DIR_COPIAS,
  MANIFIESTO, VERSION_MANIFIESTO, PREFIJO_PARCIAL, RE_MARCA, RE_SUELTA,
  NOMBRE_BASE, DIR_ADJUNTOS,
  marcaAhora, esParcial, tamano, rutaLegible, sincronizarDirectorio,
  inventario, leerManifiesto, verificar,
};
