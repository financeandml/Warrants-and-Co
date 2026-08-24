'use strict';

/* ============================================================================
   Rótulos de los motivos de la extracción.

   La promesa que hace la cabecera de `src/extraccion/motivos.js`. No abre
   navegador ni necesita servidor: coteja dos listas.

   El servidor manda su motivo en castellano y, al lado, un código. El cliente
   prefiere el código —`rotuloMotivo()` en `app.js`— y solo cae al castellano
   cuando el código no tiene rótulo. Esa reserva es justo lo que hace invisible
   la ausencia: un motivo sin traducir no se ve como una clave cruda, se ve como
   una frase castellana en mitad de la interfaz inglesa, que es el fallo que ya
   cerró en falso una etapa de este proyecto.

   Comprueba dos cosas:

     1. Todo código del catálogo tiene rótulo, y no vacío, en TODOS los idiomas.
     2. Todo rótulo «extraccion.motivo.…» declarado corresponde a un código vivo.
        Caza el rótulo que sobrevive al código que lo justificaba.

       node tests/extraccion-rotulos.js
   ========================================================================= */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { CODIGOS_EXTRACCION } = require('../src/extraccion/motivos');

const ORIGEN = path.join(__dirname, '..', 'public', 'idiomas');
const PREFIJO = 'extraccion.motivo.';

/* Mismo rodeo que en `tests/errores.js`: los diccionarios son módulos ES y el
   proyecto se declara CommonJS. Se copian a un directorio temporal con su
   propio `package.json` para importar el registro de verdad, el mismo que carga
   el navegador, y no una lista paralela que hubiera que mantener a mano. */
async function cargarRegistro() {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-extraccion-'));
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
  const codigos = Object.keys(CODIGOS_EXTRACCION);
  const fallos = [];
  let comprobaciones = 0;

  console.log(`\n  ${codigos.length} motivos · ${IDIOMAS.length} idiomas\n`);

  for (const idioma of IDIOMAS) {
    const diccionario = idioma.diccionario;
    let faltan = 0;
    for (const codigo of codigos) {
      comprobaciones++;
      const rotulo = diccionario[`${PREFIJO}${codigo}`];
      if (typeof rotulo !== 'string' || !rotulo.trim()) {
        faltan++;
        fallos.push(`«${PREFIJO}${codigo}» no tiene rótulo en ${idioma.clave}`);
      }
    }
    console.log(`  ${faltan ? '✗' : '✓'} ${idioma.clave}: ${codigos.length - faltan}/${codigos.length} motivos con rótulo`);
  }

  // Rótulos que sobreviven a su código.
  const vivos = new Set(codigos);
  for (const idioma of IDIOMAS) {
    for (const clave of Object.keys(idioma.diccionario)) {
      if (!clave.startsWith(PREFIJO)) continue;
      comprobaciones++;
      const codigo = clave.slice(PREFIJO.length);
      if (!vivos.has(codigo)) fallos.push(`«${clave}» está declarada en ${idioma.clave} y no hay ningún motivo «${codigo}»`);
    }
  }

  for (const fallo of fallos) console.log(`    ✗ ${fallo}`);

  console.log(fallos.length
    ? `\n  ${fallos.length} problemas sobre ${comprobaciones} comprobaciones\n`
    : `\n  ${comprobaciones}/${comprobaciones} correctas\n`);

  process.exit(fallos.length ? 1 : 0);
})().catch((err) => {
  console.error(`\n  ✗ la prueba no ha podido ejecutarse: ${err.message}\n`);
  process.exit(1);
});
