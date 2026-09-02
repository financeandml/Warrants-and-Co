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

/* ── Hallazgo conocido, no fallo intermitente ──
   Los cuatro índices de la cinta —S&P 500, Nasdaq 100, VIX, el bono a 10
   años— no tienen histórico en el proveedor conectado hoy: `inicio.js`
   documenta junto a `obtenerSerieSparkline()` que fallan con «crumb
   inválido». Cada carga de la portada pide su serie y recibe un 404, sin que
   eso sea intermitente ni corregible desde aquí.

   No es un error sin manejar: `serieSimple()` cae al respaldo —una recta de
   dos puntos con el precio y la variación reales, nunca una curva
   inventada— y `tests/cinta.js` ya prueba que ese respaldo funciona ("los
   índices caen al respaldo: recta de dos puntos, nunca una curva
   inventada"). Visto en el navegador: la celda muestra precio, variación con
   su signo y color, y el trazo — nada vacío, nada roto en pantalla.

   Solo estos cuatro símbolos, y solo esta ruta exacta: cualquier OTRO 404 —de
   estos símbolos en otro endpoint, o de cualquier símbolo que no esté en esta
   lista— sigue contando como fallo real. Ampliar la lista sin repetir la
   comprobación en `tests/cinta.js` sería la misma trampa que este comentario
   existe para evitar. */
const SIMBOLOS_SIN_HISTORICO = ['^GSPC', '^VIX', '^NDX', '^TNX'];
const esSerieTolerada = (url) => SIMBOLOS_SIN_HISTORICO.some((s) =>
  url.includes(`/api/mercado/serie/${encodeURIComponent(s)}`));

/* ── La misma excepción de `tests/repintado.js`, aplicada donde faltaba ──
   No es un hallazgo nuevo: `src/noticias/investing.js` ya documenta en su
   cabecera que investing.com responde 403 a peticiones automatizadas —web y
   `api.investing.com` incluidas—, y `repintado.js` ya declara pendiente,
   nunca fallo, el mismo 403 al cargar la imagen de una noticia en directo
   desde el navegador ("el mismo bloqueo anti-scraping que ese fichero ya
   documenta en su cabecera"). Aquí llega con el host real de la respuesta
   —`content-media.investing.com`, un subdominio de la misma casa— en vez del
   texto genérico de consola que usa `repintado.js`, así que se afirma sobre
   el host y no sobre un mensaje que no lleva esa información. */
const esImagenInvestingBloqueada = (url, status) => {
  if (status !== 403) return false;
  try { return /(^|\.)investing\.com$/.test(new URL(url).hostname); }
  catch { return false; }
};

(async () => {
  const b = await chromium.launch();
  let fallos = 0;
  for (const idioma of ['es', 'en']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const err = [];
    p.on('pageerror', e => err.push(e.message));
    /* Un 404/4xx/5xx llega DOS veces: como respuesta de red y como el mensaje
       genérico de consola «Failed to load resource: ...», que no lleva la URL
       y por tanto no se puede confrontar con la lista tolerada. Se afirma
       sobre la respuesta —que sí la lleva— y se ignora aquí ese eco genérico
       para no contar el mismo fallo dos veces ni perder la que sí importa. */
    p.on('console', m => {
      if (m.type() === 'error' && !/^Failed to load resource:/.test(m.text())) err.push(m.text());
    });
    p.on('response', (r) => {
      if (r.status() < 400) return;
      if (esSerieTolerada(r.url())) return;
      if (esImagenInvestingBloqueada(r.url(), r.status())) return;
      err.push(`${r.status()} ${r.url()}`);
    });
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
    else console.log('    sin errores de consola ni respuestas fallidas sin tolerar');
    await ctx.close();
  }
  await b.close();
  console.log(fallos ? `\n  ${fallos} problemas\n` : '\n  18/18 correctas\n');
  process.exit(fallos ? 1 : 0);
})();
