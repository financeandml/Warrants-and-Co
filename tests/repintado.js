/* ============================================================================
   Repintado al cambiar de idioma.

   La pasada sobre el DOM solo alcanza a los nodos con `data-i18n`. Todo lo que
   el cliente construye en JavaScript —tablas, cuadros de mando, desplegables—
   se quedaría en el idioma anterior si nadie lo repintara, y una sección
   traducida que no se repinta está a medias: se ve en inglés al entrar, y en
   castellano en cuanto se pulsa el conmutador.

   Esta prueba pulsa el conmutador sin recargar la página y comprueba que lo
   construido en JavaScript sigue al idioma, en las dos direcciones. Verifica
   además dos cosas que el repintado no debe romper: que el porcentaje sigue la
   convención del idioma —«12,50 %» frente a «12.50%»— y que la selección que
   el usuario tenga hecha en un filtro sobrevive.

       BASE_PRUEBA=http://127.0.0.1:4174 npm run test:repintado

   Escribe nada en la base: solo lee. Requiere Playwright y servidor levantado.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('repintado al cambiar de idioma');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

  let ok = 0, fallos = 0;

  // Varios rótulos llevan `text-transform: uppercase`, e `innerText` devuelve
  // el texto ya transformado: la comparación ignora las mayúsculas.
  const norm = (x) => (typeof x === 'string' ? x.toLocaleLowerCase().trim() : x);
  const comp = (nombre, real, esperado) => {
    const bien = typeof esperado === 'function' ? esperado(real) : norm(real) === norm(esperado);
    if (bien) ok++; else fallos++;
    console.log(`    ${bien ? 'OK   ' : 'FALLO'} ${nombre}` +
      (bien ? '' : `  → ${JSON.stringify(real)}`));
  };
  const txt = (sel) => p.locator(sel).first().innerText().catch(() => null);
  const opcion = (sel, n) => p.locator(`${sel} option`).nth(n).innerText().catch(() => null);
  const idioma = async (clave) => {
    await p.click(`.conmutador-idioma button[data-idioma="${clave}"]`);
    await p.waitForTimeout(500);
  };

  await p.goto(`${B}/#/cartera`, { waitUntil: 'networkidle' });
  await idioma('es');
  await p.waitForTimeout(800);

  console.log('\n  ── cartera · castellano de partida ──');
  comp('titular', await txt('#seccion-cartera h1'), 'Evolución de posiciones');
  comp('columna de la tabla', await txt('.tabla-posiciones th:nth-child(2)'), 'Peso');
  comp('cuadro de mando', await txt('#cuadro-mando .indicador__etiqueta'), 'Rentabilidad acumulada');
  comp('porcentaje con espacio duro',
    await txt('#cuerpo-posiciones tr:first-child td:nth-child(2)'), (v) => v && / %$/.test(v));

  await idioma('en');
  console.log('\n  ── cartera · repintada al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-cartera h1'), 'Position performance');
  comp('columna de la tabla', await txt('.tabla-posiciones th:nth-child(2)'), 'Weight');
  comp('cuadro de mando', await txt('#cuadro-mando .indicador__etiqueta'), 'Cumulative return');
  comp('estadísticos', await txt('#rejilla-estadisticos .estadistico__etiqueta'), 'Total return');
  comp('subtítulo del gráfico', await txt('#subtitulo-grafico'), (v) => v && /^Indexed value/.test(v));
  comp('leyenda del gráfico', await txt('#leyenda-grafico'), (v) => v && /Warrants & Co\. portfolio/.test(v));
  comp('periodo de estadísticos', await txt('#sub-estadisticos'), (v) => v && /^Period /.test(v));
  comp('porcentaje sin espacio',
    await txt('#cuerpo-posiciones tr:first-child td:nth-child(2)'), (v) => v && /\d%$/.test(v));

  await p.goto(`${B}/#/repositorio`);
  await p.waitForTimeout(1000);
  console.log('\n  ── repositorio · en inglés ──');
  comp('titular', await txt('#seccion-repositorio h1'), 'Research catalogue');
  comp('columna de la tabla', await txt('#tabla-informes thead th:nth-child(1)'), 'Company');
  comp('rótulo de filtro', await txt('.panel-filtros__campos label:first-child span'), 'Sector');
  comp('opción vacía', await opcion('#filtro-sector', 0), 'All');
  comp('recuento con plural', await txt('#resumen-resultados'),
    (v) => v && /^Showing .+ of \d+ reports?$/.test(v));
  comp('nivel de acceso', await opcion('#filtro-nivel', 1),
    (v) => ['Public', 'Client', 'Institutional', 'Internal'].includes(v));

  await idioma('es');
  console.log('\n  ── repositorio · repintado de vuelta a castellano ──');
  comp('titular', await txt('#seccion-repositorio h1'), 'Catálogo de informes');
  comp('columna de la tabla', await txt('#tabla-informes thead th:nth-child(1)'), 'Compañía');
  // El castellano concuerda en género donde el inglés dice «All» dos veces.
  comp('opción vacía masculina', await opcion('#filtro-sector', 0), 'Todos');
  comp('opción vacía femenina', await opcion('#filtro-recomendacion', 0), 'Todas');
  comp('recuento con plural', await txt('#resumen-resultados'),
    (v) => v && /^Mostrando .+ informes?$/.test(v));
  comp('nivel de acceso', await opcion('#filtro-nivel', 1),
    (v) => ['Público', 'Cliente', 'Institucional', 'Interno'].includes(v));

  // Repintar no es recargar: lo que el usuario tenga elegido sigue elegido.
  await p.selectOption('#filtro-sector', { index: 1 });
  const elegido = await p.locator('#filtro-sector').inputValue();
  await idioma('en');
  comp('el filtro elegido sobrevive al repintado',
    await p.locator('#filtro-sector').inputValue(), elegido);

  // ── Noticias ──
  // El listado, las tarjetas y la línea de sindicación se construyen enteros en
  // JavaScript; la categoría y la relevancia llegan del servidor con su rótulo
  // castellano y se traducen desde la clave, como los niveles de acceso.
  await p.goto(`${B}/#/noticias`);
  await p.waitForTimeout(1200);
  await idioma('es');
  await p.waitForTimeout(400);

  console.log('\n  ── noticias · castellano de partida ──');
  comp('titular', await txt('#seccion-noticias h1'), 'Noticias de mercado');
  comp('rótulo de filtro',
    await txt('#form-filtros-noticias .panel-filtros__campos label:first-child span'), 'Categoría');
  comp('opción vacía femenina', await opcion('#filtro-noticias-categoria', 0), 'Todas');
  comp('opción vacía masculina', await opcion('#filtro-noticias-ticker', 0), 'Todos');
  comp('recuento con plural', await txt('#resumen-noticias'),
    (v) => v && /^Mostrando .+ noticias?$/.test(v));
  comp('línea de sindicación', await txt('#estado-sincronizacion'),
    (v) => v && /de Investing\.com/.test(v));

  // La categoría elegida ha de sobrevivir al repintado, igual que en el catálogo.
  await p.selectOption('#filtro-noticias-categoria', { index: 1 });
  await p.waitForTimeout(700);
  const categoria = await p.locator('#filtro-noticias-categoria').inputValue();

  await idioma('en');
  console.log('\n  ── noticias · repintadas al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-noticias h1'), 'Market news');
  comp('botón de sindicación', await txt('#btn-sincronizar'), 'Refresh now');
  comp('rótulo de filtro',
    await txt('#form-filtros-noticias .panel-filtros__campos label:first-child span'), 'Category');
  comp('las dos opciones vacías caen en la misma palabra',
    await opcion('#filtro-noticias-categoria', 0), await opcion('#filtro-noticias-ticker', 0));
  comp('categoría traducida desde su clave', await opcion('#filtro-noticias-categoria', 1),
    (v) => v && !/Mercados|Compañía|Macroeconomía|Regulación/.test(v));
  comp('recuento con plural', await txt('#resumen-noticias'),
    (v) => v && /^Showing .+ stor(y|ies)$/.test(v));
  comp('línea de sindicación', await txt('#estado-sincronizacion'),
    (v) => v && /from Investing\.com/.test(v));
  comp('la categoría elegida sobrevive al repintado',
    await p.locator('#filtro-noticias-categoria').inputValue(), categoria);

  // La tarjeta la construye `construirTarjetaNoticia()`: nada de `data-i18n`.
  const tarjetas = await p.locator('.noticia').count();
  if (tarjetas) {
    comp('categoría de la tarjeta', await txt('.noticia .noticia__superior span'),
      (v) => v && !/Mercados|Compañía|Macroeconomía|Regulación/.test(v));
  }

  if (errores.length) {
    fallos++;
    console.log('\n  errores de consola:');
    for (const e of errores.slice(0, 5)) console.log(`    ${e}`);
  }

  await navegador.close();
  console.log(fallos ? `\n  ${fallos} problemas\n` : `\n  ${ok}/${ok} correctas\n`);
  process.exit(fallos ? 1 : 0);
})();
