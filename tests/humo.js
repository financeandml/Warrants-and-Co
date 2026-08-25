/* ============================================================================
   Comprobación de humo.

   Recorre las secciones navegables en los dos idiomas y verifica cuatro cosas: que
   la sección se pinta, que `lang` sigue al idioma elegido, que la página no
   desborda a lo ancho y que no llega ninguna clave de diccionario sin traducir
   a la pantalla.

   No sustituye a las baterías completas: es la red mínima que se ejecuta en
   segundos después de cada cambio.

       npm test                       · contra el servidor local
       BASE_PRUEBA=http://…:4174 npm test   · contra otra instancia

   Requiere Playwright, que NO es dependencia del proyecto. Si no está
   instalado la comprobación no se ejecuta y termina con error: una prueba que
   no corre no acredita nada.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('comprobación de humo');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';
/* Rutas navegables. Las de las áreas ocultas —radar, mercado y opciones— no
   figuran: su sección sigue en el documento, pero el enrutador ya no las admite
   y `irA()` cae en la portada, de modo que afirmar que se ven sería afirmar lo
   contrario de lo que ahora debe pasar. `tests/areas.js` cubre ese lado. */
const RUTAS = [
  ['inicio', '#seccion-inicio'],
  ['repositorio', '#seccion-repositorio'], ['companias', '#seccion-companias'],
  ['catalizadores', '#seccion-catalizadores'],
  ['cartera', '#seccion-cartera'],
  ['noticias', '#seccion-noticias'],
];
(async () => {
  const b = await chromium.launch();
  let fallos = 0;
  for (const idioma of ['es', 'en']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const err = [];
    p.on('pageerror', e => err.push(e.message));
    p.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
    await p.goto(`${B}/#/inicio`);
    await p.waitForTimeout(2500);
    await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
    await p.reload(); await p.waitForTimeout(3000);

    const lang = await p.evaluate(() => document.documentElement.lang);
    console.log(`\n  ── idioma ${idioma} (lang="${lang}") ──`);
    if (lang !== idioma) { console.log('    ✗ lang no coincide'); fallos++; }

    for (const [ruta, sel] of RUTAS) {
      await p.goto(`${B}/#/${ruta}`);
      await p.waitForTimeout(2200);
      const visible = await p.locator(sel).isVisible();
      const desborde = await p.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      // Ninguna clave cruda debe llegar a pantalla.
      const claves = await p.evaluate(() =>
        (document.body.innerText.match(/\b[a-z]+\.[a-z][a-zA-Z.]{3,}\b/g) ?? [])
          .filter(x => !/\.(com|es|org|net|js|json|io)$/.test(x)).slice(0, 3));
      const ok = visible && !desborde && claves.length === 0;
      if (!ok) fallos++;
      console.log(`    ${ok ? 'OK  ' : 'FALLO'} /${ruta.padEnd(14)}` +
        (visible ? '' : ' no visible') + (desborde ? ' DESBORDA' : '') +
        (claves.length ? ' claves sin traducir: ' + claves.join(',') : ''));
    }
    if (err.length) { console.log('    errores: ' + err.slice(0, 2).join(' | ')); fallos++; }
    else console.log('    sin errores de consola');
    await ctx.close();
  }
  await b.close();
  console.log(fallos ? `\n  ${fallos} problemas\n` : '\n  18/18 correctas\n');
  process.exit(fallos ? 1 : 0);
})();
