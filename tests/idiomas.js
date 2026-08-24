/* ============================================================================
   Paridad de diccionarios.

   No abre navegador ni necesita servidor ni Playwright: es aritmética sobre los
   diccionarios y corre en menos de un segundo.

   Comprueba lo que la comprobación de humo no puede ver, porque un rótulo que en
   esa pasada no llega a pintarse tampoco delata su ausencia:

     1. Los dos idiomas declaran EXACTAMENTE las mismas claves.
     2. Una misma clave lleva los mismos marcadores {…} en todos los idiomas. A
        una plantilla a la que le falte {ticker} el dato se le cae en silencio, y
        es el fallo más difícil de ver a ojo.
     3. Las formas de plural son categorías reales del idioma —no `single` ni
        `plural` inventados, ni las del idioma vecino— y siempre existe `other`,
        que es la reserva del motor.
     4. Una entrada declarada como lista lo es en todos los idiomas: si en uno es
        lista y en otro cadena, el titular se pinta en una sola línea sin avisar.
     5. Toda clave que el documento o el código piden existe en el diccionario.
        Una clave mal escrita se pinta tal cual en pantalla —«inicio.pulse.titulo»
        en mitad de la portada—, y esta pasada la caza antes de que se vea.

   Informa además, sin fallar, de las categorías de plural que el idioma define y
   la entrada no cubre: casi siempre es deliberado —el castellano reserva `many`
   para «un millón de»— y conviene verlo antes que obligar a rellenarlas.

       node tests/idiomas.js
   ========================================================================= */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PUBLICO = path.join(__dirname, '..', 'public');
const ORIGEN = path.join(PUBLICO, 'idiomas');

/* Los comentarios se retiran antes de buscar claves: la cabecera de `i18n.js`
   documenta el mecanismo con ejemplos —`t('companias.total')`— que no son uso
   real y aparecerían como claves ausentes. */
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** Módulos del cliente, con sus comentarios ya retirados. */
function fuentes() {
  const lista = [['index.html', fs.readFileSync(path.join(PUBLICO, 'index.html'), 'utf8')]];
  for (const nombre of fs.readdirSync(PUBLICO)) {
    if (nombre.endsWith('.js')) {
      lista.push([nombre, sinComentarios(fs.readFileSync(path.join(PUBLICO, nombre), 'utf8'))]);
    }
  }
  for (const nombre of fs.readdirSync(ORIGEN)) {
    if (nombre.endsWith('.js')) {
      lista.push([`idiomas/${nombre}`, sinComentarios(fs.readFileSync(path.join(ORIGEN, nombre), 'utf8'))]);
    }
  }
  return lista;
}

/**
 * Claves que el documento o el código piden de forma explícita.
 *
 * Del documento, `data-i18n` y `data-i18n-attr`; del código, las llamadas a
 * `t()`, `tLista()` y `tNodos()` con clave literal. Una clave compuesta al vuelo
 * —`t('nav.' + area)`— no se ve desde aquí, y por eso el motor devuelve la clave
 * cruda cuando falta: lo que esta pasada no alcance lo delata la pantalla.
 */
function clavesPedidas(archivos) {
  const pedidas = new Map(); // clave → ficheros que la piden

  const anotar = (clave, fichero) => {
    if (!pedidas.has(clave)) pedidas.set(clave, new Set());
    pedidas.get(clave).add(fichero);
  };

  for (const [nombre, src] of archivos) {
    if (nombre === 'index.html') {
      for (const m of src.matchAll(/data-i18n="([^"]+)"/g)) anotar(m[1].trim(), nombre);
      for (const m of src.matchAll(/data-i18n-attr="([^"]+)"/g)) {
        // Formato: «placeholder:clave.uno; aria-label:clave.dos»
        for (const par of m[1].split(';')) {
          const clave = par.split(':')[1]?.trim();
          if (clave) anotar(clave, nombre);
        }
      }
      continue;
    }
    if (nombre.startsWith('idiomas/')) continue; // el diccionario no se pide a sí mismo
    for (const m of src.matchAll(/\bt(?:Lista|Nodos)?\(\s*'([\w.]+)'/g)) anotar(m[1], nombre);
  }

  return pedidas;
}

/**
 * Claves nombradas en algún sitio, sea como llamada o como dato.
 *
 * La navegación guarda las suyas en una tabla —`{ titulo: 'nav.market.radar' }`—
 * y las traduce después con `t(entrada.titulo)`. Esa clave se usa de verdad, así
 * que para decidir si una entrada del diccionario sobra basta con ver si alguien
 * la nombra, sin exigir que lo haga dentro de un `t()`.
 */
function clavesMencionadas(archivos) {
  const vistas = new Set();
  for (const [nombre, src] of archivos) {
    // El diccionario no se nombra a sí mismo: incluirlo daba por usada toda
    // clave declarada —su propia declaración la mencionaba— y dejaba la
    // comprobación sin poder saltar nunca.
    if (nombre.startsWith('idiomas/')) continue;
    for (const m of src.matchAll(/['"]([a-z][\w]*(?:\.[\w]+)+)['"]/gi)) vistas.add(m[1]);
    for (const m of src.matchAll(/data-i18n(?:-attr)?="([^"]+)"/g)) {
      for (const trozo of m[1].split(';')) {
        const partes = trozo.split(':').map((x) => x.trim());
        vistas.add(partes.length > 1 ? partes[1] : partes[0]);
      }
    }
  }
  return vistas;
}

/**
 * Carga el registro de idiomas.
 *
 * Los diccionarios son módulos ES y el proyecto se declara CommonJS, de modo que
 * `import()` los leería como CommonJS y tropezaría con `export default`. Se
 * copian a un directorio temporal con su propio `package.json` para que Node los
 * lea como lo que son. Así la prueba importa el registro de verdad —el mismo
 * fichero que carga el navegador— en lugar de una lista paralela que habría que
 * mantener a mano, que es precisamente el tipo de duplicado que busca evitar.
 */
async function cargarRegistro() {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-idiomas-'));
  try {
    fs.cpSync(ORIGEN, temporal, { recursive: true });
    fs.writeFileSync(path.join(temporal, 'package.json'), '{"type":"module"}');
    return await import(pathToFileURL(path.join(temporal, 'index.js')).href);
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

const marcadores = (texto) =>
  new Set([...String(texto).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

/** Todos los textos de una entrada, sea cadena, lista o juego de plurales. */
function textosDe(entrada) {
  if (Array.isArray(entrada)) return entrada;
  if (entrada !== null && typeof entrada === 'object') return Object.values(entrada);
  return [entrada];
}

/** Marcadores de una entrada, reunidos de todas sus formas. */
function marcadoresDe(entrada) {
  const todos = new Set();
  for (const texto of textosDe(entrada)) {
    for (const m of marcadores(texto)) todos.add(m);
  }
  return todos;
}

const forma = (entrada) =>
  Array.isArray(entrada) ? 'lista'
    : entrada !== null && typeof entrada === 'object' ? 'plural'
      : 'cadena';

const ordenado = (conjunto) => [...conjunto].sort().join(', ');

(async () => {
  const { IDIOMAS, BASE, CLAVES } = await cargarRegistro();

  const fallos = [];
  const avisos = [];
  let comprobaciones = 0;

  const base = IDIOMAS.find((i) => i.clave === BASE);
  if (!base) {
    console.error(`  ✗ el idioma base «${BASE}» no está en el registro`);
    process.exit(1);
  }

  console.log(`\n  Diccionarios: ${CLAVES.join(', ')} · base «${BASE}»`);
  console.log(`  Claves en «${BASE}»: ${Object.keys(base.diccionario).length}\n`);

  // ── 1 · Mismo juego de claves en todos los idiomas ──
  const clavesBase = new Set(Object.keys(base.diccionario));
  for (const idioma of IDIOMAS) {
    if (idioma.clave === BASE) continue;
    const suyas = new Set(Object.keys(idioma.diccionario));

    for (const clave of clavesBase) {
      comprobaciones++;
      if (!suyas.has(clave)) fallos.push(`[${idioma.clave}] falta la clave «${clave}»`);
    }
    for (const clave of suyas) {
      comprobaciones++;
      if (!clavesBase.has(clave)) {
        fallos.push(`[${idioma.clave}] «${clave}» no existe en «${BASE}»: sobra o falta allí`);
      }
    }
  }

  // ── 2, 3 y 4 · Marcadores, forma y plurales, clave a clave ──
  for (const clave of clavesBase) {
    const entradaBase = base.diccionario[clave];
    const marcadoresBase = marcadoresDe(entradaBase);

    for (const idioma of IDIOMAS) {
      const entrada = idioma.diccionario[clave];
      if (entrada === undefined) continue; // ya lo denunció el paso 1

      // ── Marcadores ──
      comprobaciones++;
      const suyos = marcadoresDe(entrada);
      const faltan = [...marcadoresBase].filter((m) => !suyos.has(m));
      const sobran = [...suyos].filter((m) => !marcadoresBase.has(m));
      if (faltan.length || sobran.length) {
        fallos.push(
          `[${idioma.clave}] «${clave}» descuadra en marcadores` +
          (faltan.length ? ` · le faltan {${faltan.join('} {')}}` : '') +
          (sobran.length ? ` · le sobran {${sobran.join('} {')}}` : '')
        );
      }

      // ── Forma: cadena, lista o plural ──
      comprobaciones++;
      if (forma(entrada) !== forma(entradaBase)) {
        fallos.push(
          `[${idioma.clave}] «${clave}» es ${forma(entrada)} y en «${BASE}» es ${forma(entradaBase)}`
        );
      }

      // ── Categorías de plural declaradas ──
      if (forma(entrada) !== 'plural') continue;
      const admitidas = new Intl.PluralRules(idioma.locale).resolvedOptions().pluralCategories;
      const declaradas = Object.keys(entrada);

      comprobaciones++;
      const invalidas = declaradas.filter((f) => !admitidas.includes(f));
      if (invalidas.length) {
        fallos.push(
          `[${idioma.clave}] «${clave}» declara formas que ${idioma.locale} no usa: ` +
          `${invalidas.join(', ')} · admite ${admitidas.join(', ')}`
        );
      }

      comprobaciones++;
      if (!declaradas.includes('other')) {
        fallos.push(`[${idioma.clave}] «${clave}» no declara «other», que es la reserva del motor`);
      }

      const sinCubrir = admitidas.filter((f) => !declaradas.includes(f));
      if (sinCubrir.length) {
        avisos.push(
          `[${idioma.clave}] «${clave}» no cubre ${sinCubrir.join(', ')} ` +
          `(${idioma.locale} las define; se resolverán con «other»)`
        );
      }
    }
  }

  // ── 5 · Toda clave pedida existe; toda clave declarada se usa ──
  const archivos = fuentes();
  const pedidas = clavesPedidas(archivos);
  const mencionadas = clavesMencionadas(archivos);

  for (const [clave, ficheros] of pedidas) {
    for (const idioma of IDIOMAS) {
      comprobaciones++;
      if (idioma.diccionario[clave] === undefined) {
        fallos.push(
          `[${idioma.clave}] «${clave}» se pide en ${[...ficheros].join(', ')} y no está declarada`
        );
      }
    }
  }

  /* Los rótulos de los códigos del catálogo no los nombra nadie a la vista:
     `rotuloError()` arma la clave al vuelo con el código que manda el servidor.
     Quien decide si sobra uno es `src/errores.js`, y eso lo comprueba
     `tests/errores.js`, que falla ante un «codigo.…» sin código vivo detrás. La
     excepción se acota al prefijo para no eximir a `error.red` ni a
     `error.solicitud`, que sí se nombran a pelo y deben seguir vigiladas.

     Los motivos de la extracción se resuelven igual, con la clave armada al
     vuelo desde el código que manda el servidor, y quien decide si sobra uno es
     `src/extraccion/motivos.js`. Su cotejo vive en `tests/extraccion-rotulos.js`
     por la misma razón que el de los errores: aquí no se puede distinguir el
     rótulo que sobra del que nadie ha cableado todavía. */
  const RESUELTAS_POR_CODIGO = ['codigo.', 'extraccion.motivo.'];

  for (const clave of clavesBase) {
    if (RESUELTAS_POR_CODIGO.some((prefijo) => clave.startsWith(prefijo))) continue;
    if (!mencionadas.has(clave)) avisos.push(`«${clave}» está declarada y nadie la nombra`);
  }

  for (const aviso of avisos) console.log(`    · ${aviso}`);
  if (avisos.length) console.log('');

  for (const fallo of fallos) console.log(`    ✗ ${fallo}`);

  console.log(fallos.length
    ? `\n  ${fallos.length} problemas sobre ${comprobaciones} comprobaciones\n`
    : `\n  ${comprobaciones}/${comprobaciones} correctas · ${avisos.length} avisos\n`);

  process.exit(fallos.length ? 1 : 0);
})().catch((err) => {
  console.error(`\n  ✗ la prueba no ha podido ejecutarse: ${err.message}\n`);
  process.exit(2);
});
