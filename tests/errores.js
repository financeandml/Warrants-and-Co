/* ============================================================================
   Rótulos de los códigos del catálogo.

   Ésta es la prueba que promete la cabecera de `src/errores.js`. No abre
   navegador ni necesita servidor: coteja dos listas y corre en un parpadeo.

   El servidor manda su reparo en castellano y, al lado, un código. El cliente
   prefiere el código —`rotuloError()` en `app.js`— y solo cae al castellano
   cuando el código no tiene rótulo. Esa reserva es justo lo que hace invisible
   la ausencia: un código sin traducir no se ve como una clave cruda en pantalla,
   se ve como una frase en castellano en mitad de la interfaz inglesa, que es
   exactamente el fallo que cerró en falso la etapa anterior.

   De ahí que haga falta cotejarlo aquí y no en la pantalla. Comprueba:

     1. Todo código de validación tiene entrada, y no vacía, en TODOS los
        idiomas. Es la comprobación que da nombre a la prueba.
     2. Toda clave «codigo.…» declarada corresponde a un código vivo del
        catálogo. Caza el rótulo que sobrevive al código que lo justificaba.

   Informa además, sin fallar, de dos cosas que conviene ver:

     · Los códigos de API que aún no tienen rótulo. Son E1b —las rutas todavía
       no mandan su código— y hasta entonces caen a la frase del servidor. Al
       cablearlos, esta lista se vacía y pasan a exigirse por el paso 1.
     · Los rótulos castellanos que no coinciden con el mensaje del servidor. No
       es un fallo —el mensaje del API y el rótulo de pantalla pueden divergir a
       propósito— pero una divergencia involuntaria hace que la frase cambie
       según haya resuelto el código o no, y eso no se ve a ojo.

       node tests/errores.js
   ========================================================================= */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { API, VALIDACION, cuerpoError } = require('../src/errores');
const { MOTIVOS_PETICION } = require('../src/extraccion/motivos');

const ORIGEN = path.join(__dirname, '..', 'public', 'idiomas');
const RUTAS_DIR = path.join(__dirname, '..', 'src', 'routes');

const PREFIJO = 'codigo.';

/* Mismo rodeo que en `tests/idiomas.js`: los diccionarios son módulos ES y el
   proyecto se declara CommonJS. Se copian a un directorio temporal con su
   propio `package.json` para importar el registro de verdad, el mismo que carga
   el navegador, y no una lista paralela que hubiera que mantener a mano. */
async function cargarRegistro() {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-errores-'));
  try {
    fs.cpSync(ORIGEN, temporal, { recursive: true });
    fs.writeFileSync(path.join(temporal, 'package.json'), '{"type":"module"}');
    return await import(pathToFileURL(path.join(temporal, 'index.js')).href);
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

(async () => {
  const { IDIOMAS, BASE } = await cargarRegistro();

  const fallos = [];
  const avisos = [];
  let comprobaciones = 0;

  const codigosValidacion = Object.keys(VALIDACION);
  const codigosApi = Object.keys(API);
  const delCatalogo = new Set([...codigosValidacion, ...codigosApi]);

  console.log(`\n  Catálogo: ${codigosValidacion.length} de validación · ${codigosApi.length} de API`);
  console.log(`  Idiomas: ${IDIOMAS.map((i) => i.clave).join(', ')}\n`);

  // ── 1 · Todo código de validación, rotulado en todos los idiomas ──
  for (const codigo of codigosValidacion) {
    for (const idioma of IDIOMAS) {
      comprobaciones++;
      const entrada = idioma.diccionario[PREFIJO + codigo];

      if (entrada === undefined) {
        fallos.push(`[${idioma.clave}] «${codigo}» no tiene rótulo: se verá en castellano`);
      } else if (typeof entrada !== 'string' || !entrada.trim()) {
        // Un rótulo de código es una frase entera y sin marcadores: ni lista
        // —no se parte por tipografía— ni juego de plurales —no depende de
        // ningún número—. Cualquier otra forma es un error de declaración.
        fallos.push(`[${idioma.clave}] «${codigo}» no es una cadena con texto`);
      }
    }
  }

  // ── 2 · Ningún rótulo huérfano ──
  for (const idioma of IDIOMAS) {
    for (const clave of Object.keys(idioma.diccionario)) {
      if (!clave.startsWith(PREFIJO)) continue;
      comprobaciones++;
      const codigo = clave.slice(PREFIJO.length);
      if (!delCatalogo.has(codigo)) {
        fallos.push(`[${idioma.clave}] «${clave}» no corresponde a ningún código del catálogo`);
      }
    }
  }

  // ── Caso E1b: un error real, con el cliente en inglés, no debe verse
  //    en castellano ──
  //
  // `cuerpoError()` es el mismo constructor que usan las rutas: se llama tal
  // cual lo haría `src/routes/mercado.js` u `opciones.js` al rechazar un
  // símbolo. Lo que se compara no es la teoría de `rotuloError()` sino su
  // misma regla —preferir `codigo.<CODIGO>` del diccionario activo y solo caer
  // al `error` que redactó el servidor cuando el código no tiene rótulo—
  // aplicada al cuerpo JSON real que el servidor mandaría.
  {
    const CODIGO_PRUEBA = 'SIMBOLO_INVALIDO';
    comprobaciones++;
    const cuerpoServidor = cuerpoError(CODIGO_PRUEBA, { datos: { simbolo: 'ZXY123' } });
    const en = IDIOMAS.find((i) => i.clave === 'en');
    const rotuloIngles = en.diccionario[PREFIJO + cuerpoServidor.codigo];
    const textoQuePintaria =
      typeof rotuloIngles === 'string' && rotuloIngles.trim() ? rotuloIngles : cuerpoServidor.error;

    if (textoQuePintaria === cuerpoServidor.error) {
      fallos.push(
        `E1b: con idioma «en», un error de «${CODIGO_PRUEBA}» se vería en castellano ` +
        `(«${cuerpoServidor.error}») porque el código no tiene rótulo en el diccionario inglés`
      );
    }
  }

  // ── Pendientes: códigos de API sin rótulo (E1b) ──
  const base = IDIOMAS.find((i) => i.clave === BASE);
  const apiSinRotulo = codigosApi.filter((c) => base.diccionario[PREFIJO + c] === undefined);
  if (apiSinRotulo.length) {
    avisos.push(
      `${apiSinRotulo.length} códigos de API sin rótulo (E1b): ${apiSinRotulo.join(', ')}`
    );
  }

  // ── 3 · Ninguna ruta manda un código que el catálogo no reconozca, ni un
  //       `.status` sin `.codigo` que lo acompañe ──
  //
  // Los dos bugs que cerró esta misma sesión —el 415 de `informes.js` sin
  // código en absoluto, y el `COMPANIA_NO_CUBIERTA` de `companias.js` que no
  // vivía en ningún catálogo— pasaron desapercibidos porque las comprobaciones
  // de arriba solo recorren `Object.keys(API)`: nunca miran lo que las rutas
  // escriben de verdad. Esta es una prueba estática sobre el texto fuente,
  // no un análisis sintáctico —coherente con el resto de pruebas estáticas
  // del proyecto (cláusula 8 de CLAUDE.md)—, así que solo caza los dos
  // patrones concretos que ya fallaron una vez, no cualquier forma de error.
  {
    const codigosConocidos = new Set([...codigosApi, ...Object.keys(MOTIVOS_PETICION)]);
    const ficheros = fs.readdirSync(RUTAS_DIR).filter((f) => f.endsWith('.js'));

    for (const fichero of ficheros) {
      const ruta = path.join(RUTAS_DIR, fichero);
      const texto = fs.readFileSync(ruta, 'utf8');
      const lineas = texto.split('\n');

      // 3a · `codigo: 'X'` (propiedad de objeto) o `.codigo = 'X'` (asignación)
      // con un código que no está ni en el catálogo de API ni en el de motivos
      // de extracción —el otro catálogo legítimo que una ruta puede citar—.
      const patronCodigo = /(?:\bcodigo\s*:|\.codigo\s*=)\s*['"]([A-Za-z0-9_]+)['"]/g;
      lineas.forEach((linea, i) => {
        for (const m of linea.matchAll(patronCodigo)) {
          comprobaciones++;
          const codigo = m[1];
          if (!codigosConocidos.has(codigo)) {
            fallos.push(
              `[${fichero}:${i + 1}] manda codigo «${codigo}», que no está registrado ` +
              `ni en API (errores.js) ni en MOTIVOS_PETICION (extraccion/motivos.js)`
            );
          }
        }
      });

      // 3b · `<variable>.status = <número>` sin que esa misma variable reciba
      // también `.codigo = …` cerca. Sin código, el cliente no tiene nada que
      // traducir y cae siempre al castellano del servidor —el bug exacto del
      // fileFilter de `informes.js`—.
      //
      // La búsqueda del `.codigo` se acota a una ventana de líneas alrededor,
      // no al fichero entero: `err` es el nombre de variable más repetido de
      // este proyecto, y mirar el fichero completo encontraría el `.codigo`
      // de un bloque ajeno sin relación —así es como este mismo caso pasó en
      // verde la primera vez que se probó esta prueba, antes de acotarlo—.
      const VENTANA = 8;
      const patronStatus = /\b(\w+)\.status\s*=\s*\d+/g;
      lineas.forEach((linea, i) => {
        for (const m of linea.matchAll(patronStatus)) {
          comprobaciones++;
          const variable = m[1];
          const desde = Math.max(0, i - VENTANA);
          const hasta = Math.min(lineas.length, i + VENTANA + 1);
          const entorno = lineas.slice(desde, hasta).join('\n');
          const tieneCodigo = new RegExp(`\\b${variable}\\.codigo\\s*=`).test(entorno);
          if (!tieneCodigo) {
            fallos.push(
              `[${fichero}:${i + 1}] «${variable}.status» se fija sin que «${variable}.codigo» ` +
              `se fije cerca (±${VENTANA} líneas): el cliente no tendría nada que traducir`
            );
          }
        }
      });
    }
  }

  // ── Divergencias entre el rótulo base y el mensaje del servidor ──
  for (const codigo of codigosValidacion) {
    const rotulo = base.diccionario[PREFIJO + codigo];
    if (typeof rotulo === 'string' && rotulo !== VALIDACION[codigo]) {
      avisos.push(
        `[${BASE}] «${codigo}» difiere del mensaje del servidor\n` +
        `        servidor: ${VALIDACION[codigo]}\n` +
        `        rótulo:   ${rotulo}`
      );
    }
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
