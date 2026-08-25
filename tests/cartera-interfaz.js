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

  /* ══════════════════ El anillo de composición ══════════════════
     Un anillo AFIRMA que sus partes son el todo. De ahí que estas
     comprobaciones no sean sobre el dibujo sino sobre lo que el dibujo dice:

       · que la caja es un sector más, porque sin ella el anillo diría que la
         cartera está invertida al 100 % —el fallo que se quitó del motor,
         dibujado—;
       · que cada sector dice lo mismo que su fila de la tabla y que el cuadro de
         mando, porque las tres cifras salen del mismo campo y discrepar sería
         invisible mirando una sola;
       · que el color no informa solo: la caja lleva trama, no un gris más. */
  console.log('\n  ── el anillo: la caja es un sector más ──');

  const leerAnillo = (p) => p.evaluate(() => {
    const a = document.getElementById('anillo-composicion');
    const vacio = a.querySelector('.anillo__vacio');
    if (vacio) return { vacio: vacio.querySelector('strong').textContent.trim() };
    const num = (x) => Number(String(x).replace(/[^\d,.-]/g, '').replace(',', '.'));
    // El rótulo es «NOMBRE12,34 %»: se parte por el último tramo numérico.
    const partir = (txt) => {
      const m = txt.trim().match(/^(.*?)(-?[\d.,]+)\s*%$/);
      return m ? { nombre: m[1].trim(), peso: num(m[2]) } : { nombre: txt.trim(), peso: null };
    };
    const arcos = [...a.querySelectorAll('.anillo__arco')];
    return {
      sectores: [...a.querySelectorAll('.anillo__etiqueta')].map((e) => partir(e.textContent)),
      centro: a.querySelector('.anillo__centro')
        ? { nombre: a.querySelector('.anillo__centro').textContent.trim(),
            peso: num(a.querySelector('.anillo__centro-cifra').textContent) }
        : null,
      arcos: arcos.length,
      // El arco de la caja y su trazo: `url(#…-trama)` frente a un tono.
      trazoCaja: arcos.find((x) => x.classList.contains('anillo__arco--caja'))
        ?.getAttribute('stroke') ?? null,
      // Largo de cada arco, para saber cuál manda sin leer la cifra.
      largos: arcos.map((x) => ({
        caja: x.classList.contains('anillo__arco--caja'),
        largo: parseFloat(x.getAttribute('stroke-dasharray')) })),
      guias: a.querySelectorAll('.anillo__guia').length,
      descripcion: a.querySelector('title')?.textContent ?? '',
      pie: a.querySelector('.anillo__pie')?.textContent.trim() ?? null,
    };
  });

  const leerTabla = (p) => p.evaluate(() => {
    const num = (x) => Number(String(x).replace(/[^\d,.-]/g, '').replace(',', '.'));
    return [...document.querySelectorAll('#cuerpo-posiciones tr')].map((tr) => ({
      /* La primera celda lleva el NOMBRE de la empresa y, en un `small`, el
         ticker con su sector: «Oracle» / «ORCL · Tecnología…». El anillo rotula
         con el ticker, así que se emparejan por ahí. */
      ticker: tr.querySelector('.celda-valor small')?.textContent.split('·')[0].trim(),
      peso: num(tr.children[1]?.textContent),
    }));
  });

  const anilloPintado = (p) => p.waitForFunction(() => {
    const a = document.getElementById('anillo-composicion');
    return a && (a.querySelector('svg') || a.querySelector('.anillo__vacio'));
  }, null, { timeout: 60000 });

  for (const idioma of ['es', 'en']) {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    await p.goto(`${B}/#/cartera`);
    await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
    await p.reload();
    await anilloPintado(p);
    await p.waitForFunction(() => document.querySelectorAll('#cuerpo-posiciones tr').length > 0,
      null, { timeout: 60000 });

    const anillo = await leerAnillo(p);
    const tabla = await leerTabla(p);
    const caja = anillo.sectores.find((s) => !tabla.some((f) => f.ticker === s.nombre));

    comp(`[${idioma}] el anillo reparte una casilla por posición MÁS la caja`,
      anillo.sectores.length, tabla.length + 1);
    comp(`[${idioma}] la caja está entre los sectores`, Boolean(caja), true);

    /* Regla 9 · cada sector dice lo mismo que su fila. Se emparejan por ticker,
       no por posición: el anillo ordena por peso y la tabla también, pero
       depender de eso haría pasar la prueba por casualidad. */
    for (const fila of tabla) {
      const sector = anillo.sectores.find((s) => s.nombre === fila.ticker);
      comp(`[${idioma}] «${fila.ticker}» pesa lo mismo en el anillo que en la tabla`,
        sector?.peso ?? null, fila.peso);
    }

    /* Y la caja, lo mismo que el indicador del cuadro de mando. Es la tercera
       cara del mismo hecho y la que el usuario tiene más lejos en pantalla. */
    const indicadorCaja = await p.evaluate(() => {
      const ind = [...document.querySelectorAll('#cuadro-mando .indicador')]
        .find((i) => /liquidez|cash/i.test(i.querySelector('.indicador__etiqueta')?.textContent ?? ''));
      if (!ind) return null;
      return Number(String(ind.querySelector('.indicador__valor').textContent)
        .replace(/[^\d,.-]/g, '').replace(',', '.'));
    });
    comp(`[${idioma}] la caja pesa lo mismo en el anillo que en el cuadro de mando`,
      caja?.peso ?? null, indicadorCaja);

    /* Las partes son el todo: es lo que un anillo afirma con su forma, y si no
       sumase 100 el dibujo estaría mintiendo sobre su propia geometría. */
    const suma = anillo.sectores.reduce((a, s) => a + (s.peso ?? 0), 0);
    comp(`[${idioma}] los sectores suman 100`, Math.abs(suma - 100) < 0.5,
      true);

    /* Con la caja mayoritaria, su arco ha de ser el mayor. Esta es la
       afirmación que caza un anillo que reparta solo lo invertido: ahí la caja
       no tendría arco, y el mayor sería una posición. */
    if (caja && caja.peso > 50) {
      const mayor = anillo.largos.reduce((a, x) => (x.largo > a.largo ? x : a));
      comp(`[${idioma}] con la caja mayoritaria, su arco es el mayor`, mayor.caja, true);
    }

    // El color no informa solo: la caja va con trama, no con un gris más.
    comp(`[${idioma}] el arco de la caja lleva trama y no un tono`,
      /^url\(#.*trama\)$/.test(anillo.trazoCaja ?? ''), true);

    // Etiqueta directa: una línea guía por sector, no una leyenda aparte.
    comp(`[${idioma}] cada sector lleva su línea guía`, anillo.guias, anillo.sectores.length);

    // La descripción alternativa enumera lo mismo que se ve.
    comp(`[${idioma}] la descripción nombra los cuatro sectores`,
      anillo.sectores.every((s) => anillo.descripcion.includes(s.nombre)), true);

    comp(`[${idioma}] el pie de la caja reconcilia patrimonio y capital`,
      /(patrimonio|portfolio value)/i.test(anillo.pie ?? ''), true);

    await ctx.close();
  }

  /* ── Los casos degenerados ──
     Con una sola posición, con ninguna, con la caja a cero y con la caja
     desconocida. Los cuatro han existido o van a existir, y ninguno puede
     romper la maqueta ni, peor, afirmar algo falso. */
  console.log('\n  ── el anillo en los casos degenerados ──');
  const casos = [
    { n: 'una sola posición',
      mutar: (c) => { c.posiciones = c.posiciones.slice(0, 1); c.liquidez.pesoActual = 85.55; },
      espera: (a) => a.sectores.length === 2 && a.arcos === 2 },
    { n: 'ninguna viva · todo caja',
      mutar: (c) => { c.posiciones = []; c.liquidez.pesoActual = 100; },
      // Un anillo entero no tiene a dónde apuntar: la etiqueta va al hueco.
      espera: (a) => a.arcos === 1 && a.guias === 0 && a.centro?.peso === 100 },
    { n: 'caja al 0 %',
      mutar: (c) => { c.liquidez.pesoActual = 0;
        c.posiciones.forEach((p, i) => { p.pesoVigente = [40, 35, 25][i]; }); },
      /* Cero NO es lo mismo que ausente: sin arco —0° es invisible— pero CON
         etiqueta, de modo que «invertido al 100 %» se afirma y no se deduce. */
      espera: (a) => a.arcos === 3 && a.sectores.length === 4
        && a.sectores.some((s) => s.peso === 0) },
    { n: 'caja desconocida',
      mutar: (c) => { delete c.liquidez; },
      // Sin la caja no se cierra la composición: no se dibuja nada.
      espera: (a) => Boolean(a.vacio) },
  ];

  for (const caso of casos) {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.route('**/api/mercado/cartera*', async (ruta) => {
      const res = await ruta.fetch();
      const cuerpo = await res.json();
      caso.mutar(cuerpo);
      await ruta.fulfill({ response: res, json: cuerpo });
    });
    await p.goto(`${B}/#/cartera`);
    await anilloPintado(p);
    const a = await leerAnillo(p);
    comp(`${caso.n} · el anillo responde como debe`, caso.espera(a), true);

    // Y en ningún caso dos etiquetas del mismo lado se pisan.
    if (!a.vacio) {
      const solapan = await p.evaluate(() => {
        const lados = {};
        for (const e of document.querySelectorAll('#anillo-composicion .anillo__etiqueta')) {
          (lados[e.getAttribute('text-anchor')] ||= []).push(Number(e.getAttribute('y')));
        }
        return Object.values(lados).some((ys) => {
          ys.sort((x, y) => x - y);
          return ys.some((v, i) => i > 0 && v - ys[i - 1] < 18);
        });
      });
      comp(`${caso.n} · ninguna etiqueta se pisa con otra`, solapan, false);
    }
    await ctx.close();
  }

  comp('sin errores de consola', errores.length === 0, true);

  console.log(`\n  ${ok} conformes · ${fallos} fallos\n`);
  await navegador.close();
  process.exit(fallos ? 1 : 0);
})();
