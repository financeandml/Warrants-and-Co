/* ============================================================================
   Dependencias externas de las pruebas.

   Playwright NO es dependencia del proyecto: quien no vaya a ejecutar las
   pruebas de navegador no tiene por qué descargarse un Chromium entero.

   Pero su ausencia tampoco es un aprobado. Una prueba que no se ejecuta no
   acredita nada, y darla por buena es el mismo defecto que la plataforma evita
   con los datos de mercado: presentar como bueno un resultado que nadie puede
   justificar. Un dato que no se ha podido obtener se declara pendiente; una
   prueba que no se ha podido ejecutar, también.

   De modo que cuando falta la dependencia se sale con código 2 —distinguible
   del 1 de una prueba que sí corrió y falló— y se dice sin ambigüedad.
   ========================================================================= */

/** Código de salida reservado a «no se ha podido ejecutar». */
const SIN_EJECUTAR = 2;

/**
 * Devuelve Playwright, o termina el proceso dejando claro que no se ha
 * verificado nada.
 *
 * @param {string} prueba  Nombre de la comprobación, para el mensaje.
 */
function exigirPlaywright(prueba) {
  try {
    return require('playwright');
  } catch {
    // A stderr: esto es un fallo, no la salida de la prueba.
    console.error('');
    console.error(`  LA PRUEBA NO SE HA EJECUTADO — ${prueba}`);
    console.error('');
    console.error('  Falta Playwright, que no es dependencia del proyecto.');
    console.error('  Esto NO es un aprobado: no se ha verificado nada.');
    console.error('');
    console.error('  Para ejecutarla:  npm i -D playwright && npx playwright install chromium');
    console.error('');
    process.exit(SIN_EJECUTAR);
  }
}

module.exports = { exigirPlaywright, SIN_EJECUTAR };
