/* ============================================================================
   Rótulos del catálogo del panorama de mercado.

   Misma prueba que `tests/errores.js`, sobre el catálogo de
   `src/mercado/motivos.js`: cada motivo fijo, cada estado de sesión, cada
   entrada de la leyenda de calidad y cada grupo tienen que llegar rotulados
   en los dos idiomas del cliente, o el servidor —que redacta en castellano
   para quien llama por `curl`— se ve tal cual en la interfaz inglesa.

   No abre navegador ni necesita servidor: coteja dos listas y corre en un
   parpadeo.

       node tests/mercado-idiomas.js
   ========================================================================= */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { CLAVES_GRUPO, MOTIVOS_MERCADO, ESTADOS_MERCADO, LEYENDA_CALIDAD } = require('../src/mercado/motivos');

const ORIGEN = path.join(__dirname, '..', 'public', 'idiomas');

/* Mismo rodeo que en `tests/errores.js`: los diccionarios son módulos ES y el
   proyecto se declara CommonJS. Se copian a un directorio temporal con su
   propio `package.json` para importar el registro de verdad, el mismo que
   carga el navegador, y no una lista paralela que hubiera que mantener a mano. */
async function cargarRegistro() {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-mercado-idiomas-'));
  try {
    fs.cpSync(ORIGEN, temporal, { recursive: true });
    fs.writeFileSync(path.join(temporal, 'package.json'), '{"type":"module"}');
    return await import(pathToFileURL(path.join(temporal, 'index.js')).href);
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

(async () => {
  const { IDIOMAS } = await cargarRegistro();

  const fallos = [];
  let comprobaciones = 0;

  // ── Las cuatro familias de claves que este catálogo exige ──
  const familias = [
    { prefijo: 'mercado.motivo.', claves: Object.keys(MOTIVOS_MERCADO) },
    { prefijo: 'mercado.estadoMercado.', claves: Object.keys(ESTADOS_MERCADO) },
    { prefijo: 'mercado.calidad.leyenda.', claves: Object.keys(LEYENDA_CALIDAD) },
  ];

  console.log(`\n  Catálogo: ${Object.keys(MOTIVOS_MERCADO).length} motivos · ` +
    `${Object.keys(ESTADOS_MERCADO).length} estados · ${Object.keys(LEYENDA_CALIDAD).length} calidades · ` +
    `${CLAVES_GRUPO.length} grupos`);
  console.log(`  Idiomas: ${IDIOMAS.map((i) => i.clave).join(', ')}\n`);

  // ── 1 · Toda clave del catálogo, rotulada en todos los idiomas ──
  for (const { prefijo, claves } of familias) {
    for (const clave of claves) {
      for (const idioma of IDIOMAS) {
        comprobaciones++;
        const entrada = idioma.diccionario[prefijo + clave];
        if (entrada === undefined) {
          fallos.push(`[${idioma.clave}] «${prefijo}${clave}» no tiene rótulo: se verá en castellano`);
        } else if (typeof entrada !== 'string' || !entrada.trim()) {
          fallos.push(`[${idioma.clave}] «${prefijo}${clave}» no es una cadena con texto`);
        }
      }
    }
  }

  // Los grupos llevan dos claves cada uno: título y descripción.
  for (const clave of CLAVES_GRUPO) {
    for (const sufijo of ['titulo', 'descripcion']) {
      for (const idioma of IDIOMAS) {
        comprobaciones++;
        const entrada = idioma.diccionario[`mercado.grupo.${clave}.${sufijo}`];
        if (entrada === undefined) {
          fallos.push(`[${idioma.clave}] «mercado.grupo.${clave}.${sufijo}» no tiene rótulo: se verá en castellano`);
        } else if (typeof entrada !== 'string' || !entrada.trim()) {
          fallos.push(`[${idioma.clave}] «mercado.grupo.${clave}.${sufijo}» no es una cadena con texto`);
        }
      }
    }
  }

  // ── 2 · Ningún rótulo huérfano: una clave declarada que ya no vive en el catálogo ──
  const delCatalogo = new Set([
    ...Object.keys(MOTIVOS_MERCADO).map((c) => `mercado.motivo.${c}`),
    ...Object.keys(ESTADOS_MERCADO).map((c) => `mercado.estadoMercado.${c}`),
    ...Object.keys(LEYENDA_CALIDAD).map((c) => `mercado.calidad.leyenda.${c}`),
    ...CLAVES_GRUPO.flatMap((c) => [`mercado.grupo.${c}.titulo`, `mercado.grupo.${c}.descripcion`]),
  ]);
  const prefijos = ['mercado.motivo.', 'mercado.estadoMercado.', 'mercado.calidad.leyenda.', 'mercado.grupo.'];

  for (const idioma of IDIOMAS) {
    for (const clave of Object.keys(idioma.diccionario)) {
      if (!prefijos.some((p) => clave.startsWith(p))) continue;
      comprobaciones++;
      if (!delCatalogo.has(clave)) {
        fallos.push(`[${idioma.clave}] «${clave}» no corresponde a ningún código del catálogo`);
      }
    }
  }

  for (const fallo of fallos) console.log(`    ✗ ${fallo}`);

  console.log(fallos.length
    ? `\n  ${fallos.length} problemas sobre ${comprobaciones} comprobaciones\n`
    : `\n  ${comprobaciones}/${comprobaciones} correctas\n`);

  process.exit(fallos.length ? 1 : 0);
})().catch((err) => {
  console.error(`\n  ✗ la prueba no ha podido ejecutarse: ${err.message}\n`);
  process.exit(2);
});
