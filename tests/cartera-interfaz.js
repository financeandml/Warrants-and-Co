/* ============================================================================
   El catálogo de índices de referencia: una sola fuente.

   Qué índices se ofrecen y cómo se llaman lo declara `src/routes/mercado.js` y
   nadie más. Antes estaba escrito TRES veces —el conjunto de símbolos en el
   servidor, un mapa de nombres en `app.js` y las opciones del `<select>` a mano
   en `index.html`— y nada afirmaba que concordasen.

   El fallo que eso permitía es invisible navegando: añades un índice al
   servidor, el selector no lo ofrece, y las tres pantallas siguen pareciendo
   correctas por separado. Nadie mira las tres a la vez.

   Se afirman dos cosas, y la segunda es la que importa:

     1. EL RÓTULO SIGUE AL DATO. Elegir otro índice cambia lo que dicen la
        leyenda del gráfico y los sub-estadísticos, y lo cambia al nombre que
        publica el servidor, no a uno guardado aquí.

     2. EL SELECTOR SE DERIVA, NO SE COPIA. Se intercepta la respuesta del
        servidor y se le añade un índice que no existe en ninguna parte del
        cliente. Si aparece en el selector, es que el selector lo lee de ahí.
        Con la lista escrita en el documento —como estaba— esto NO aparece, que
        es exactamente el fallo que nadie podía detectar.

       BASE_PRUEBA=http://127.0.0.1:4173 node tests/cartera-interfaz.js

   No escribe en la base: solo lee. Requiere Playwright y servidor levantado.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('catálogo de índices de referencia');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

(async () => {
  const navegador = await chromium.launch();
  let ok = 0, fallos = 0;
  const errores = [];

  const comp = (nombre, real, esperado) => {
    const bien = typeof esperado === 'function' ? esperado(real) : real === esperado;
    if (bien) { ok++; console.log(`  ✓ ${nombre}`); return; }
    fallos++;
    console.log(`  ✗ ${nombre}`);
    console.log(`      esperado: ${typeof esperado === 'function' ? '(predicado)' : esperado}`);
    console.log(`      real:     ${real}`);
  };

  /* El selector solo existe pintado: `poblarBenchmarks()` lo llena cuando la
     cartera contesta, y el `<select>` del documento llega vacío a propósito.
     Esperar «que la sección tenga contenido» daría por buena una lista vacía. */
  const selectorPoblado = (p) => p.waitForFunction(
    () => document.querySelectorAll('#selector-benchmark option').length > 0,
    null, { timeout: 60000 });

  const opciones = (p) => p.$$eval('#selector-benchmark option',
    (os) => os.map((o) => ({ valor: o.value, rotulo: o.textContent.trim() })));

  // ── 1 · El catálogo que publica el servidor ──
  const catalogo = await (await fetch(`${B}/api/mercado/cartera`)).json()
    .then((d) => d.benchmarks);

  console.log('\n  ── el selector es el catálogo del servidor ──');
  comp('el servidor publica un catálogo con nombre y símbolo',
    Array.isArray(catalogo) && catalogo.length > 0
      && catalogo.every((b) => b.simbolo && b.nombre),
    true);

  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    await p.goto(`${B}/#/cartera`);
    await selectorPoblado(p);
    const ops = await opciones(p);

    comp('el selector ofrece exactamente los del catálogo',
      ops.map((o) => o.valor).join(','), catalogo.map((b) => b.simbolo).join(','));
    /* El rótulo compuesto es el mismo hecho que el de las cifras y el de la
       leyenda, y sale de la misma clave de diccionario. Se afirma aquí para que
       no puedan separarse sin que se note. */
    comp('y los rotula con su nombre y su símbolo',
      ops.map((o) => o.rotulo).join(' | '),
      catalogo.map((b) => `${b.nombre} · ${b.simbolo}`).join(' | '));
    await ctx.close();
  }

  // ── 2 · Añadir uno en el servidor basta ──
  /* Se intercepta la respuesta y se le añade un índice que NO existe en ningún
     sitio del cliente. Es el equivalente exacto a añadirlo al catálogo del
     servidor, sin tener que reiniciar nada. */
  console.log('\n  ── añadir uno al servidor lo hace aparecer solo ──');
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));

    const INVENTADO = { simbolo: 'ZZTEST', nombre: 'Índice de prueba' };
    /* El servidor simulado no solo OFRECE el índice nuevo: cuando se lo piden,
       contesta con él. Hace falta para la segunda mitad de esta tanda —que el
       rótulo también salga del servidor—, porque un nombre que el cliente
       tuviera guardado coincidiría con los cuatro reales y solo se delata con
       uno que no puede conocer. */
    await p.route('**/api/mercado/cartera*', async (ruta) => {
      const respuesta = await ruta.fetch();
      const cuerpo = await respuesta.json();
      cuerpo.benchmarks = [...(cuerpo.benchmarks ?? []), INVENTADO];
      if (new URL(ruta.request().url()).searchParams.get('benchmark') === INVENTADO.simbolo) {
        cuerpo.benchmark = INVENTADO.simbolo;
        cuerpo.benchmarkNombre = INVENTADO.nombre;
      }
      await ruta.fulfill({ response: respuesta, json: cuerpo });
    });

    await p.goto(`${B}/#/cartera`);
    await selectorPoblado(p);
    const ops = await opciones(p);

    comp('el índice añadido aparece en el selector',
      ops.some((o) => o.valor === INVENTADO.simbolo), true);
    comp('y con el nombre que le puso el servidor',
      ops.find((o) => o.valor === INVENTADO.simbolo)?.rotulo ?? null,
      `${INVENTADO.nombre} · ${INVENTADO.simbolo}`);
    comp('y va el último, en el orden en que lo publica el servidor',
      ops[ops.length - 1].valor, INVENTADO.simbolo);
    comp('sin que el cliente pierda los que ya había',
      ops.length, catalogo.length + 1);

    /* Y el rótulo del índice nuevo también sale del servidor. Esta es la mitad
       que caza la SEGUNDA copia —un mapa de nombres en el cliente—: con ella,
       los cuatro reales se rotulan bien por casualidad y solo un índice que el
       cliente no puede conocer revela de dónde sale el nombre. */
    const rotuloNuevo = `${INVENTADO.nombre} · ${INVENTADO.simbolo}`;
    await p.selectOption('#selector-benchmark', INVENTADO.simbolo);
    await p.waitForFunction((r) => {
      const l = document.querySelector('#leyenda-grafico')?.textContent ?? '';
      const s = document.querySelector('#sub-estadisticos')?.textContent ?? '';
      // Basta con que cualquiera de los dos haya repintado: se afirman aparte.
      return l.includes(r) || s.includes(r) || l.includes('ZZTEST') || s.includes('ZZTEST');
    }, rotuloNuevo, { timeout: 60000 });

    comp('la leyenda rotula el índice nuevo con el nombre del servidor',
      await p.$eval('#leyenda-grafico', (e) => e.textContent), (v) => v.includes(rotuloNuevo));
    comp('y los sub-estadísticos también',
      await p.$eval('#sub-estadisticos', (e) => e.textContent), (v) => v.includes(rotuloNuevo));
    await ctx.close();
  }

  // ── 3 · El rótulo sigue al índice elegido ──
  console.log('\n  ── elegir otro índice arrastra su rótulo ──');
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

    /* Se prueba con el ÚLTIMO del catálogo y no con el segundo: el de por
       defecto es el primero, y elegir el vecino dejaría pasar un fuera-de-uno
       en el índice de la lista. */
    const otro = catalogo[catalogo.length - 1];
    const rotulo = `${otro.nombre} · ${otro.simbolo}`;

    await p.goto(`${B}/#/cartera`);
    await selectorPoblado(p);
    // La leyenda se pinta con el gráfico; se espera al nombre nuevo, que solo
    // aparece cuando la cartera del índice nuevo ha resuelto y repintado.
    await p.selectOption('#selector-benchmark', otro.simbolo);
    await p.waitForFunction((r) => document.querySelector('#leyenda-grafico')
      ?.textContent.includes(r), rotulo, { timeout: 60000 });

    comp('la leyenda del gráfico nombra el índice elegido',
      await p.$eval('#leyenda-grafico', (e) => e.textContent), (v) => v.includes(rotulo));
    comp('los sub-estadísticos también',
      await p.$eval('#sub-estadisticos', (e) => e.textContent), (v) => v.includes(rotulo));
    /* Y no queda rastro del de por defecto: si alguna de las dos mitades siguiera
       leyendo una lista propia, aquí saldría el nombre viejo. */
    comp('y ninguno de los dos se quedó con el anterior',
      (await p.$eval('#leyenda-grafico', (e) => e.textContent))
        + (await p.$eval('#sub-estadisticos', (e) => e.textContent)),
      (v) => !v.includes(catalogo[0].nombre));
    await ctx.close();
  }

  // ── 4 · Los nombres de índice no se traducen ──
  /* Son nombres propios y siglas: «S&P 500» y «SPY» se escriben igual en los dos
     idiomas. Se afirma porque la clave del rótulo SÍ vive en el diccionario, y
     traducirla un día sería el error que CLAUDE.md prohíbe explícitamente. */
  console.log('\n  ── los nombres de índice son los mismos en los dos idiomas ──');
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    const porIdioma = {};
    for (const idioma of ['es', 'en']) {
      await p.goto(`${B}/#/cartera`);
      await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
      await p.reload();
      await selectorPoblado(p);
      porIdioma[idioma] = (await opciones(p)).map((o) => o.rotulo).join(' | ');
    }
    comp('el selector dice lo mismo en castellano y en inglés',
      porIdioma.es, porIdioma.en);
    await ctx.close();
  }

  comp('sin errores de consola', errores.length === 0, true);

  console.log(`\n  ${ok} conformes · ${fallos} fallos\n`);
  await navegador.close();
  process.exit(fallos ? 1 : 0);
})();
