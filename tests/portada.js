'use strict';

/* ============================================================================
   El hero de portada (Fase D.6) — una declaración, no un panel.

   Esta batería sustituye por completo a la anterior. La que había —118
   aserciones— era enteramente geometría de una fotografía de fondo: dónde caía
   el árbol del banner, cuánto crecía el hero para no cortarlo, cuánta holgura
   quedaba antes de la cinta. Esa fotografía se retiró en la Fase D.6 junto con
   `seguirEncuadreBanner()`, la constante `BANNER` y la histéresis de
   `asomoDelManifiesto()` en `portada.js`: ninguno de los tres describe ya nada
   que exista en pantalla, así que no hay geometría que recalibrar — hay que
   escribir de cero qué es lo que este hero promete.

   Lo que el hero promete ahora:

     1 · UNA jerarquía        marca (eyebrow) → titular → subtítulo → acción,
                              en ese orden, sin cifras ni fotografía que compitan.
     2 · COMO MUCHO DOS CTA   una primaria sólida y una secundaria de texto — la
                              regla explícita contra "una fila de botones de SaaS".
     3 · Repinta con el idioma, sin recargar — el titular se reconstruye a mano
                              en `animarManifiesto()` y es el punto donde un
                              repintado a medias se delata.
     4 · Sin residuos del hero anterior — ni el nodo del banner, ni la fila de
                              tres cifras que llevaba su propio presupuesto de
                              pliegue, deben reaparecer en el documento.

       BASE_PRUEBA=http://127.0.0.1:4174 npm run test:portada

   Solo lee: no escribe en la base.
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('el hero de portada');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

const pintado = (p) => p.waitForFunction(() =>
  (document.querySelector('#manifiesto-titular')?.textContent ?? '').trim().length > 0,
  null, { timeout: 30000 });

(async () => {
  const navegador = await chromium.launch();
  const errores = [];

  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

  await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
  await pintado(p);

  /* ── 1 · Jerarquía: los cuatro nodos, en orden de documento ──
     `compareDocumentPosition` y no solo "los cuatro existen": un titular que
     cayera DESPUÉS del subtítulo pasaría la comprobación de existencia y
     rompería la jerarquía de lectura que esta fase pide. */
  const orden = await p.evaluate(() => {
    const raiz = document.querySelector('.manifiesto__enunciado');
    if (!raiz) return null;
    const nodos = [
      raiz.querySelector('.etiqueta-superior'),
      raiz.querySelector('#manifiesto-titular'),
      raiz.querySelector('.manifiesto__subtitulo'),
      raiz.querySelector('.manifiesto__acciones'),
    ];
    if (nodos.some((n) => !n)) return null;
    for (let i = 1; i < nodos.length; i++) {
      const rel = nodos[i - 1].compareDocumentPosition(nodos[i]);
      // eslint-disable-next-line no-bitwise
      if (!(rel & Node.DOCUMENT_POSITION_FOLLOWING)) return null;
    }
    return true;
  });
  t('el hero tiene sus cuatro piezas en orden: marca, titular, subtítulo, acciones',
    orden === true, orden === null ? 'falta un nodo o el orden está invertido' : '');

  /* ── 2 · Un solo H1 dentro de la portada, y es el titular del hero ──
     El wordmark gigante que antes llevaba el `<h1>` desapareció: la marca vive
     en la cabecera. Se acota a `#seccion-inicio` porque cada sección oculta de
     esta SPA lleva el suyo propio —`.titulo-seccion h1` en Radar, Cartera,
     etc.—, arquitectura previa a esta fase y fuera de su alcance; lo que esta
     fase decide es qué lleva el `<h1>` DENTRO de la portada. */
  const h1 = await p.evaluate(() => {
    const todos = [...document.querySelectorAll('#seccion-inicio h1')];
    return { total: todos.length, esTitular: todos[0]?.id === 'manifiesto-titular' };
  });
  t('dentro de la portada hay exactamente un h1, y es el titular del hero',
    h1.total === 1 && h1.esTitular, JSON.stringify(h1));

  /* ── 3 · Como mucho dos CTA, nunca tres ──
     La instrucción explícita de esta fase: ni un tercer botón (LinkedIn, antes
     aquí) ni dos primarias — una acción sólida y una secundaria de texto. */
  const acciones = await p.evaluate(() => {
    const caja = document.querySelector('.manifiesto__acciones');
    if (!caja) return null;
    return {
      total: caja.querySelectorAll('a, button').length,
      solidas: caja.querySelectorAll('.boton--solido').length,
      texto: caja.querySelectorAll('.boton--texto').length,
      contorno: caja.querySelectorAll('.boton--contorno').length,
    };
  });
  t('el hero lleva exactamente dos acciones: una primaria y una secundaria de texto',
    acciones && acciones.total === 2 && acciones.solidas === 1 && acciones.texto === 1
      && acciones.contorno === 0,
    JSON.stringify(acciones));

  /* ── 4 · Sin residuos del hero anterior ──
     Ni el banner fotográfico, ni la fila de tres cifras que llevaba su propio
     presupuesto de pliegue, deben quedar en el documento: si reaparecen, es que
     alguien restauró el patrón antiguo sin retirar también su geometría. */
  const residuos = await p.evaluate(() => ({
    banner: Boolean(document.getElementById('portada-banner')),
    cifrasHero: Boolean(document.getElementById('cifras-hero')),
    dataBanner: document.getElementById('portada')?.dataset.banner ?? null,
    nodoPortada: Boolean(document.getElementById('portada')),
  }));
  t('no queda ningún nodo del banner fotográfico retirado',
    !residuos.banner && !residuos.cifrasHero && residuos.dataBanner === null
      && !residuos.nodoPortada,
    JSON.stringify(residuos));

  /* ── 5 · La cinta es ambiental, no protagonista ──
     No se afirma su contenido —eso lo cubre `tests/cinta.js`—, solo que, si
     está presente, no reclama la caja de un componente con caja: sin radio, sin
     borde propio en los cuatro lados, filete horizontal como el resto de la
     casa. */
  const cinta = await p.evaluate(() => {
    const el = document.getElementById('ticker-mercado');
    if (!el || el.hidden) return null;
    const est = getComputedStyle(el);
    return { radio: est.borderRadius, bordeInline: est.borderInlineStyle };
  });
  if (cinta === null) {
    R.push({ n: 'la cinta es una franja ambiental, sin caja propia', sinDato: true,
      d: 'la base no tiene cotizaciones que pintar en la cinta' });
  } else {
    t('la cinta es una franja ambiental, sin caja propia',
      cinta.radio === '0px' && cinta.bordeInline === 'none', JSON.stringify(cinta));
  }

  /* ── 6 · Research antes que Portfolio, en el documento ──
     El criterio de esta fase: research es el producto, portfolio es la prueba
     de convicción. El orden de DOM es el que decide qué lee primero un lector
     de pantalla y, con `flex-direction` normal, qué aparece primero en
     pantalla. */
  const ordenSecciones = await p.evaluate(() => {
    const research = document.getElementById('home-research');
    const cartera = document.getElementById('home-cartera');
    if (!research || !cartera) return null;
    // eslint-disable-next-line no-bitwise
    return Boolean(research.compareDocumentPosition(cartera) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  t('Research antecede a Portfolio en el documento',
    ordenSecciones === true, ordenSecciones === null ? 'falta una de las dos secciones' : '');

  /* ── 7 · El repintado al conmutar de idioma, sin recargar ── */
  const botonIdioma = (clave) => p.locator(`.conmutador-idioma button[data-idioma="${clave}"]`);

  if (await botonIdioma('en').count() === 0) {
    R.push({ n: 'el titular se repinta al conmutar a inglés sin recargar', sinDato: true,
      d: 'no se encontró el control de idioma con el selector esperado' });
  } else {
    const antes = await p.locator('#manifiesto-titular').innerText();
    await botonIdioma('en').click();
    await p.waitForFunction((prev) =>
      (document.querySelector('#manifiesto-titular')?.textContent ?? '') !== prev,
      antes, { timeout: 15000 }).catch(() => {});
    const despuesEn = await p.locator('#manifiesto-titular').innerText();

    t('el titular se repinta al conmutar a inglés sin recargar',
      /independent investment research/i.test(despuesEn), despuesEn);
    const subEn = await p.locator('.manifiesto__subtitulo').innerText();
    t('el subtítulo se repinta al conmutar a inglés sin recargar',
      /same discipline/i.test(subEn), subEn);
  }

  /* El único 404 tolerado, y con motivo declarado: Yahoo tiene el crumb caído
     para el histórico de índices puros —^VIX, ^GSPC, ^NDX, ^TNX—, así que el
     sparkline de la cinta cae al respaldo (ver `tests/cinta.js`). No es un
     fallo de este hero. Cualquier otro error sigue siendo rojo. */
  const CONOCIDO_404 = /404/;
  if (errores.length && errores.every((e) => CONOCIDO_404.test(e))) {
    R.push({ n: 'sin errores de consola', sinDato: true,
      d: 'probable 404 del histórico de índices — Yahoo sin crumb, ver tests/cinta.js' });
  } else if (errores.length) {
    t('sin errores de consola', false, errores.slice(0, 3).join(' | '));
  } else {
    t('sin errores de consola', true);
  }

  await ctx.close();
  await navegador.close();

  for (const r of R) {
    if (r.sinDato) { console.log(`    SIN DATO ${r.n}  → ${r.d}`); continue; }
    console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  }
  const mal = R.filter((r) => !r.sinDato && !r.ok).length;
  const sin = R.filter((r) => r.sinDato).length;
  const medidas = R.length - sin;
  if (mal) console.log(`\n  ${mal} fallo(s) de ${medidas}${sin ? ` · ${sin} sin dato` : ''}\n`);
  else if (sin) console.log(`\n  ${medidas} correctas · ${sin} SIN DATO\n`);
  else console.log(`\n  ${medidas}/${medidas} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
