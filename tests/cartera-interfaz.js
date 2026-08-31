/* ============================================================================
   El catálogo de benchmarks: una sola fuente, y ahora multi-selección.

   Qué benchmarks se ofrecen y cómo se llaman lo declara `src/routes/mercado.js`
   y nadie más. Las píldoras de `#pastillas-benchmark` —`poblarBenchmarks()`—
   sustituyen al `<select>` de selección única: cada una es un
   `aria-pressed`, la cartera es siempre la serie protagonista y varios
   benchmarks pueden estar activos a la vez.

   Se afirman tres cosas:

     1. LAS PÍLDORAS SE DERIVAN, NO SE COPIAN. Se intercepta la respuesta del
        servidor y se le añade un benchmark que no existe en ninguna parte del
        cliente. Si aparece como píldora, es que se lee de ahí.

     2. ENCENDER Y APAGAR PÍLDORAS MUEVE LA LEYENDA Y LA TABLA DE RENDIMIENTO.
        Un benchmark apagado no aparece en ninguna de las dos; encendido, sí,
        con el nombre que publica el servidor.

     3. EL PRINCIPAL —el que fija beta, correlación y rentabilidadIndice, que
        el servidor calcula contra uno solo— es el primero del catálogo que
        esté activo, y cambiarlo dispara una recarga que actualiza esos
        sub-estadísticos.

       BASE_PRUEBA=http://127.0.0.1:4173 node tests/cartera-interfaz.js

   No escribe en la base: solo lee. Requiere Playwright y servidor levantado.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');
const { crearTercerEstado } = require('./tercer-estado');

const { chromium } = exigirPlaywright('catálogo de benchmarks');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

(async () => {
  const navegador = await chromium.launch();
  const E = crearTercerEstado(B);
  const errores = [];

  const comp = (nombre, real, esperado) => {
    const bien = typeof esperado === 'function' ? esperado(real) : real === esperado;
    if (bien) { E.acierto(nombre); return; }
    E.fallo(nombre,
      `esperado ${typeof esperado === 'function' ? '(predicado)' : JSON.stringify(esperado)} · ` +
      `real ${JSON.stringify(real)}`);
  };

  /* Las píldoras solo existen pintadas: `poblarBenchmarks()` las llena cuando
     la cartera contesta, y `#pastillas-benchmark` llega vacío a propósito.
     Esperar «que la sección tenga contenido» daría por buena una lista vacía. */
  const pastillasPobladas = (p) => E.esperarDatos(p,
    () => document.querySelectorAll('#pastillas-benchmark .pastilla-benchmark').length > 0,
    null, { nombre: 'las píldoras de benchmark se pueblan',
            motivo: 'la cartera no devolvió catálogo, así que el contenedor quedó vacío',
            plazo: 60000 });

  const pildoras = (p) => p.$$eval('#pastillas-benchmark .pastilla-benchmark',
    (bs) => bs.map((b) => ({
      valor: b.dataset.simbolo, rotulo: b.textContent.trim(),
      activo: b.getAttribute('aria-pressed') === 'true',
    })));

  const pulsarPildora = (p, simbolo) => p.click(`.pastilla-benchmark[data-simbolo="${simbolo}"]`);

  /* ── La puerta de arriba ──
     Todo lo que sigue mide una cartera: las píldoras se llenan cuando la
     cartera contesta, la leyenda se pinta con el gráfico, el anillo reparte
     posiciones. Contra una base sin tesis publicadas no hay NADA de eso, y la
     batería se caía con un plantón de sesenta segundos y un volcado de pila
     que no decía ni qué se perdía ni contra qué base estaba.

     Se pregunta primero, y si no hay cartera se declara entero pendiente. No es
     un aprobado: sale con código 2. */
  const cartera = await (await fetch(`${B}/api/mercado/cartera`)).json();

  if (cartera.vacia) {
    E.pendiente('la batería entera',
      'la base no tiene ninguna tesis publicada con ticker: no hay cartera que medir');
    console.log(`\n  Siembra una base con posiciones abiertas y vuelve a apuntar aquí.\n`);
    await navegador.close();
    process.exit(E.cerrar('catálogo de benchmarks'));
  }

  const catalogo = cartera.benchmarks;

  console.log('\n  ── las píldoras son el catálogo del servidor ──');
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
    await pastillasPobladas(p);
    const ops = await pildoras(p);

    comp('las píldoras ofrecen exactamente los del catálogo',
      ops.map((o) => o.valor).join(','), catalogo.map((b) => b.simbolo).join(','));
    /* El rótulo compuesto es el mismo hecho que el de las cifras y el de la
       leyenda, y sale de la misma clave de diccionario. Se afirma aquí para que
       no puedan separarse sin que se note. */
    comp('y las rotula con su nombre y su símbolo',
      ops.map((o) => o.rotulo).join(' | '),
      catalogo.map((b) => `${b.nombre} · ${b.simbolo}`).join(' | '));
    comp('cada botón es un aria-pressed real, operable por teclado',
      await p.$$eval('#pastillas-benchmark button[aria-pressed]', (bs) => bs.length),
      catalogo.length);
    await ctx.close();
  }

  // ── 2 · Añadir uno en el servidor basta ──
  /* Se intercepta la respuesta y se le añade un benchmark que NO existe en
     ningún sitio del cliente. Es el equivalente exacto a añadirlo al catálogo
     del servidor, sin tener que reiniciar nada. */
  console.log('\n  ── añadir uno al servidor lo hace aparecer solo ──');
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));

    const INVENTADO = { simbolo: 'ZZTEST', nombre: 'Índice de prueba' };
    await p.route('**/api/mercado/cartera*', async (ruta) => {
      const respuesta = await ruta.fetch();
      const cuerpo = await respuesta.json();
      cuerpo.benchmarks = [...(cuerpo.benchmarks ?? []), INVENTADO];
      await ruta.fulfill({ response: respuesta, json: cuerpo });
    });
    /* El servidor simulado no solo OFRECE el benchmark nuevo: cuando se pide su
       serie histórica, contesta con una. Hace falta para la segunda mitad de
       esta tanda —que el rótulo también salga del servidor en la leyenda—,
       porque sin serie el gráfico no dibuja un benchmark sin datos (regla de
       «nunca inventar»: no se rellena, se omite). */
    await p.route('**/api/mercado/serie/ZZTEST*', async (ruta) => {
      const hoy = new Date();
      const serie = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(hoy); d.setDate(d.getDate() - (29 - i));
        return { fecha: d.toISOString().slice(0, 10), valor: 100 + i };
      });
      await ruta.fulfill({ json: { simbolo: 'ZZTEST', serie, disponible: true } });
    });

    await p.goto(`${B}/#/cartera`);
    await pastillasPobladas(p);
    const ops = await pildoras(p);

    comp('el benchmark añadido aparece como píldora',
      ops.some((o) => o.valor === INVENTADO.simbolo), true);
    comp('y con el nombre que le puso el servidor',
      ops.find((o) => o.valor === INVENTADO.simbolo)?.rotulo ?? null,
      `${INVENTADO.nombre} · ${INVENTADO.simbolo}`);
    comp('y va la última, en el orden en que lo publica el servidor',
      ops[ops.length - 1].valor, INVENTADO.simbolo);
    comp('sin que el cliente pierda las que ya había',
      ops.length, catalogo.length + 1);
    comp('y llega apagada: encender benchmarks nuevos es decisión del usuario',
      ops.find((o) => o.valor === INVENTADO.simbolo)?.activo, false);

    const rotuloNuevo = `${INVENTADO.nombre} · ${INVENTADO.simbolo}`;
    await pulsarPildora(p, INVENTADO.simbolo);
    await p.waitForFunction((r) => {
      const l = document.querySelector('#leyenda-grafico')?.textContent ?? '';
      const t = document.querySelector('#tabla-rendimiento')?.textContent ?? '';
      return l.includes(r) || t.includes(r);
    }, rotuloNuevo, { timeout: 60000 });

    comp('la leyenda rotula el benchmark nuevo con el nombre del servidor',
      await p.$eval('#leyenda-grafico', (e) => e.textContent), (v) => v.includes(rotuloNuevo));
    comp('y la tabla de rendimiento también',
      await p.$eval('#tabla-rendimiento', (e) => e.textContent), (v) => v.includes(rotuloNuevo));

    // Apagarlo lo retira de la leyenda: no queda un fantasma pintado antes.
    await pulsarPildora(p, INVENTADO.simbolo);
    await E.esperarDatos(p,
      (r) => !(document.querySelector('#leyenda-grafico')?.textContent ?? '').includes(r),
      rotuloNuevo, { nombre: 'apagar la píldora retira el benchmark de la leyenda',
                     motivo: 'la leyenda no repintó al apagar la píldora', plazo: 60000 });
    comp('apagar la píldora retira el benchmark de la leyenda',
      await p.$eval('#leyenda-grafico', (e) => e.textContent), (v) => !v.includes(rotuloNuevo));
    await ctx.close();
  }

  // ── 3 · El PRINCIPAL sigue al primero activo del catálogo ──
  console.log('\n  ── apagar los primeros benchmarks arrastra el principal ──');
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

    /* Se apagan todos menos el ÚLTIMO del catálogo: así el principal pasa de
       ser el primero por defecto a ser justo ese, y se prueba el extremo de la
       lista en vez del vecino inmediato. */
    const otro = catalogo[catalogo.length - 1];
    const rotulo = `${otro.nombre} · ${otro.simbolo}`;

    await p.goto(`${B}/#/cartera`);
    await pastillasPobladas(p);

    const activasAlPrincipio = (await pildoras(p)).filter((o) => o.activo).map((o) => o.valor);
    for (const simbolo of activasAlPrincipio) {
      if (simbolo === otro.simbolo) continue;
      await pulsarPildora(p, simbolo);
    }
    if (!activasAlPrincipio.includes(otro.simbolo)) await pulsarPildora(p, otro.simbolo);

    // La leyenda se pinta con el gráfico; se espera al nombre nuevo, que solo
    // aparece cuando la cartera del principal nuevo ha resuelto y repintado.
    const repintoLeyenda = await E.esperarDatos(p,
      (r) => document.querySelector('#leyenda-grafico')?.textContent.includes(r),
      rotulo, { nombre: 'la leyenda repinta al cambiar el principal',
                motivo: 'el gráfico no llegó a pintar: la cartera no tiene serie que dibujar',
                plazo: 60000 });

    if (repintoLeyenda) {
      comp('la leyenda del gráfico nombra el nuevo benchmark principal',
        await p.$eval('#leyenda-grafico', (e) => e.textContent), (v) => v.includes(rotulo));
      comp('los sub-estadísticos también', await p.$eval('#sub-estadisticos', (e) => e.textContent),
        (v) => v.includes(rotulo));
    }
    await ctx.close();
  }

  // ── 4 · Los nombres de benchmark no se traducen ──
  /* Son nombres propios y siglas: «S&P 500» y «SPY» se escriben igual en los dos
     idiomas. Se afirma porque la clave del rótulo SÍ vive en el diccionario, y
     traducirla un día sería el error que CLAUDE.md prohíbe explícitamente. */
  console.log('\n  ── los nombres de benchmark son los mismos en los dos idiomas ──');
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    const porIdioma = {};
    for (const idioma of ['es', 'en']) {
      await p.goto(`${B}/#/cartera`);
      await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
      await p.reload();
      await pastillasPobladas(p);
      porIdioma[idioma] = (await pildoras(p)).map((o) => o.rotulo).join(' | ');
    }
    comp('las píldoras dicen lo mismo en castellano y en inglés',
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
    const arcos = [...a.querySelectorAll('.anillo__arco')];
    return {
      /* La identidad de cada sector la lleva la LISTA, no el dibujo: a 140 px no
         caben rótulos sobre los arcos. El anillo responde a «cuánto hay
         invertido» y la lista a «qué y cuánto». */
      sectores: [...a.querySelectorAll('.anillo__fila')].map((f) => ({
        nombre: f.querySelector('.anillo__nombre').textContent.trim(),
        peso: num(f.querySelector('.anillo__cifra').textContent),
      })),
      arcos: arcos.length,
      // El arco de la caja y su trazo: `url(#…-trama)` frente a un tono.
      trazoCaja: arcos.find((x) => x.classList.contains('anillo__arco--caja'))
        ?.getAttribute('stroke') ?? null,
      // Largo de cada arco, para saber cuál manda sin leer la cifra.
      largos: arcos.map((x) => ({
        caja: x.classList.contains('anillo__arco--caja'),
        largo: parseFloat(x.getAttribute('stroke-dasharray')) })),
      // Cada fila ha de llevar su nombre ESCRITO: es lo que impide que el tono
      // del cuadrito sea el único portador de la identidad.
      conNombre: [...a.querySelectorAll('.anillo__fila')]
        .filter((f) => (f.querySelector('.anillo__nombre')?.textContent ?? '').trim().length > 0).length,
      descripcion: a.querySelector('title')?.textContent ?? '',
      pie: a.querySelector('.anillo__pie')?.textContent.trim() ?? null,
    };
  });

  const leerTabla = (p) => p.evaluate(() => {
    const num = (x) => Number(String(x).replace(/[^\d,.-]/g, '').replace(',', '.'));
    /* La tabla fusiona abiertas y cerradas, más una fila de detalle oculta por
       cada una (`.fila-cartera__detalle`). El anillo solo reparte lo que sigue
       en cartera hoy: se filtran las cerradas y los paneles de detalle, que no
       llevan ni ticker ni peso propio que comparar. */
    return [...document.querySelectorAll('#cuerpo-posiciones tr:not(.cerrada):not(.fila-cartera__detalle)')].map((tr) => ({
      /* La primera celda lleva el NOMBRE de la empresa y, en un `small`, el
         ticker con su sector: «Oracle» / «ORCL · Tecnología…». El anillo rotula
         con el ticker, así que se emparejan por ahí. */
      ticker: tr.querySelector('.celda-valor small')?.textContent.split('·')[0].trim(),
      peso: num(tr.children[2]?.textContent),
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

    /* El contenedor ha de existir siempre: si falta, la vista dejó de pintarse
       y eso es regresión. Las FILAS, en cambio, solo existen con posiciones
       abiertas —y una base cuyas tesis estén todas cerradas es legítima—. */
    if (!await E.exigirContenedor(p, '#cuerpo-posiciones', `[${idioma}] la tabla de posiciones`)) {
      await ctx.close(); continue;
    }
    if (!await E.esperarDatos(p,
      () => document.querySelectorAll('#cuerpo-posiciones tr').length > 0, null,
      { nombre: `[${idioma}] el anillo contra la tabla de posiciones`,
        motivo: 'la tabla existe y está vacía: la base no tiene ninguna posición ABIERTA',
        plazo: 60000 })) {
      await ctx.close(); continue;
    }

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

    // El color no porta la identidad: cada fila escribe su nombre.
    comp(`[${idioma}] cada sector lleva su nombre escrito`,
      anillo.conNombre, anillo.sectores.length);

    // La descripción alternativa enumera lo mismo que se ve.
    comp(`[${idioma}] la descripción nombra los cuatro sectores`,
      anillo.sectores.every((s) => anillo.descripcion.includes(s.nombre)), true);

    /* La nota que reconcilia el peso sobre patrimonio con el de capital se movió
       al plegable de metodología: bajo el anillo repetía lo que la propia casilla
       ya dice. Se afirma allí, que es donde vive ahora. */
    const enPlegable = await p.evaluate(() =>
      [...document.querySelectorAll('#metodologia-dinamica p')].map((x) => x.textContent).join(' '));
    comp(`[${idioma}] la nota de la caja está en el plegable de metodología`,
      /(patrimonio|portfolio value)/i.test(enPlegable), true);
    comp(`[${idioma}] y ya no cuelga del anillo`, anillo.pie, null);

    await ctx.close();
  }

  /* ── Los casos degenerados ──
     Con una sola posición, con ninguna, con la caja a cero y con la caja
     desconocida. Los cuatro han existido o van a existir, y ninguno puede
     romper la maqueta ni, peor, afirmar algo falso.

     `necesita` es cuántas posiciones ABIERTAS da por supuestas la mutación del
     caso. No es adorno: «caja al 0 %» reparte `[40, 35, 25]` sobre las que haya,
     de modo que contra una base con menos de tres montaba un caso distinto del
     que decía montar y fallaba afirmando que el anillo estaba roto. El anillo
     estaba bien; era el montaje el que dependía de la base sin declararlo. */
  console.log('\n  ── el anillo en los casos degenerados ──');
  const casos = [
    { n: 'una sola posición', necesita: 1,
      mutar: (c) => { c.posiciones = c.posiciones.slice(0, 1); c.liquidez.pesoActual = 85.55; },
      espera: (a) => a.sectores.length === 2 && a.arcos === 2 },
    { n: 'ninguna viva · todo caja', necesita: 0,
      mutar: (c) => { c.posiciones = []; c.liquidez.pesoActual = 100; },
      // Un solo sector: un anillo entero y una sola fila en la lista.
      espera: (a) => a.arcos === 1 && a.sectores.length === 1 && a.sectores[0].peso === 100 },
    { n: 'caja al 0 %', necesita: 3,
      mutar: (c) => { c.liquidez.pesoActual = 0;
        c.posiciones.forEach((p, i) => { p.pesoVigente = [40, 35, 25][i]; }); },
      /* Cero NO es lo mismo que ausente: sin arco —0° es invisible— pero CON
         etiqueta, de modo que «invertido al 100 %» se afirma y no se deduce. */
      espera: (a) => a.arcos === 3 && a.sectores.length === 4
        && a.sectores.some((s) => s.peso === 0) },
    { n: 'caja desconocida', necesita: 0,
      mutar: (c) => { delete c.liquidez; },
      // Sin la caja no se cierra la composición: no se dibuja nada.
      espera: (a) => Boolean(a.vacio) },
  ];

  const abiertas = (cartera.posiciones ?? []).length;
  for (const caso of casos) {
    if (abiertas < caso.necesita) {
      E.pendiente(`${caso.n} · el anillo responde como debe`,
        `el caso monta ${caso.necesita} posición(es) abiertas y la base trae ${abiertas}`);
      continue;
    }
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

    /* Y el anillo no crece con la tarjeta. Escalaba, y a 1440 px salía un disco
       de 478 px de diámetro. El tamaño se fija en la hoja de estilos, así que
       esto afirma que sigue fijado. */
    if (!a.vacio) {
      const lado = await p.evaluate(() => {
        const r = document.querySelector('.anillo__svg').getBoundingClientRect();
        return { ancho: Math.round(r.width), alto: Math.round(r.height) };
      });
      comp(`${caso.n} · el anillo mide 140 px y no escala`,
        lado.ancho === 140 && lado.alto === 140, true);
    }
    await ctx.close();
  }

  comp('sin errores de consola', errores.length === 0, true);

  await navegador.close();
  process.exit(E.cerrar('catálogo de índices'));
})();
