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
  comp('columna de la tabla', await txt('.tabla-posiciones th:nth-child(2)'), 'Peso actual');
  // Pintado en JavaScript: la liquidez de la composición y la nota del total de la
  // conciliación. Se afirman en los dos idiomas —la nota, por la palabra que cambia—
  // porque una tabla que no se repintara conservaría el castellano de partida.
  comp('liquidez en la composición',
    await txt('#exposicion-sectorial .exposicion__linea--liquidez .exposicion__cabecera span'), 'Liquidez');
  comp('nota del total de la conciliación',
    await txt('#pie-conciliacion .celda-total small'), (x) => /\btramos?\b/.test(x ?? ''));
  comp('cuadro de mando', await txt('#cuadro-mando .indicador__etiqueta'), 'Rentabilidad acumulada');
  /* Con el rango completo, la leyenda mide desde el capital invertido y su cifra
     ES la del titular. Rebasando la serie a su primer punto salían dos números
     distintos en la misma pantalla —+62,68 % frente a +67,85 %—, que es justo lo
     que se lee como un fallo. Se compara con lo que la propia página publica, no
     con un valor fijo, para que la afirmación no dependa de los datos del día. */
  comp('la leyenda mide lo mismo que el titular',
    await txt('#leyenda-grafico .leyenda__elemento:first-child .leyenda__valor'),
    await txt('#cuadro-mando .indicador--principal .indicador__valor'));
  comp('la leyenda dice desde dónde mide',
    await txt('#leyenda-grafico .leyenda__medida'), (v) => v && /capital invertido/.test(v));
  comp('porcentaje con espacio duro',
    await txt('#cuerpo-posiciones tr:first-child td:nth-child(2)'), (v) => v && / %$/.test(v));

  // El conmutador de la tabla del gráfico lleva `data-i18n`, que la pasada
  // sobre el DOM devolvería a «Ver datos». Se deja la tabla abierta antes de
  // conmutar: así el repintado ha de acertar con el estado vigente y no con
  // el de partida, que es justo lo que fallaba.
  comp('conmutador de la tabla, cerrada', await txt('#btn-tabla-serie'), 'Ver datos');
  await p.click('#btn-tabla-serie');
  await p.waitForTimeout(200);
  comp('conmutador de la tabla, abierta', await txt('#btn-tabla-serie'), 'Ocultar datos');

  await idioma('en');
  console.log('\n  ── cartera · repintada al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-cartera h1'), 'Position performance');
  comp('columna de la tabla', await txt('.tabla-posiciones th:nth-child(2)'), 'Current weight');
  comp('liquidez en la composición',
    await txt('#exposicion-sectorial .exposicion__linea--liquidez .exposicion__cabecera span'), 'Cash');
  comp('nota del total de la conciliación',
    await txt('#pie-conciliacion .celda-total small'), (x) => /\btranches?\b/.test(x ?? ''));
  comp('cuadro de mando', await txt('#cuadro-mando .indicador__etiqueta'), 'Cumulative return');
  comp('la leyenda mide lo mismo que el titular',
    await txt('#leyenda-grafico .leyenda__elemento:first-child .leyenda__valor'),
    await txt('#cuadro-mando .indicador--principal .indicador__valor'));
  comp('la leyenda dice desde dónde mide',
    await txt('#leyenda-grafico .leyenda__medida'), (v) => v && /invested capital/.test(v));
  comp('estadísticos', await txt('#rejilla-estadisticos .estadistico__etiqueta'), 'Total return');
  comp('subtítulo del gráfico', await txt('#subtitulo-grafico'), (v) => v && /^Indexed value/.test(v));
  comp('leyenda del gráfico', await txt('#leyenda-grafico'), (v) => v && /Warrants & Co\. portfolio/.test(v));
  comp('periodo de estadísticos', await txt('#sub-estadisticos'), (v) => v && /^Period /.test(v));
  comp('porcentaje sin espacio',
    await txt('#cuerpo-posiciones tr:first-child td:nth-child(2)'), (v) => v && /\d%$/.test(v));

  comp('el conmutador sigue al estado de la tabla, no al de partida',
    await txt('#btn-tabla-serie'), 'Hide data');

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

  // ── Radar ──
  // Los seis bloques se construyen en JavaScript salvo sus cabeceras. Se
  // comprueban las dos mitades: los rótulos del documento y lo que pintan los
  // pintores de `home.js` desde lo que el radar guardó.
  await p.goto(`${B}/#/radar`);
  // El radar resuelve seis fuentes y la agenda tarda segundos. Hay que esperar a
  // que TODAS hayan pintado antes de conmutar: un bloque que llegue después del
  // cambio pinta ya con el diccionario nuevo, y entonces la prueba pasaría sin
  // que nadie haya repintado nada. Se espera por condición, no por reloj.
  const radarPintado = () => p.waitForFunction(() => {
    const lleno = (sel) => (document.querySelector(sel)?.textContent ?? '').trim().length > 0;
    return ['#snapshot-mercado', '#rejilla-radar', '#tarjeta-signal', '#agenda-catalizadores',
      '#rejilla-research', '#lista-titulares', '#panel-cartera'].every(lleno);
  }, null, { timeout: 60000 });
  await radarPintado();
  await idioma('es');
  await radarPintado();

  console.log('\n  ── radar · castellano de partida ──');
  comp('antetítulo', await txt('#seccion-radar .etiqueta-superior'), 'Inteligencia de mercado');
  comp('cabecera de cartera', await txt('#titulo-panel-cartera'), 'Cartera');
  comp('cabecera de análisis', await txt('#titulo-top-research'), 'Análisis destacado');
  comp('cabecera de catalizadores', await txt('#titulo-catalizadores'), 'Próximos catalizadores');
  comp('cabecera de noticias', await txt('#titulo-ultimas-noticias'), 'Últimas noticias');
  comp('rótulo de Signal', await txt('#tarjeta-signal .signal__etiqueta'), 'Signal agregado');
  if (await p.locator('#panel-cartera .indicador__etiqueta').count()) {
    comp('métrica del panel', await txt('#panel-cartera .indicador__etiqueta'),
      'Rentabilidad de la cartera');
  }
  if (await p.locator('#aportaciones h2').count()) {
    comp('columna de aportaciones', await txt('#aportaciones h2'), 'Las que más suman');
  }
  const recuentoEs = await txt('#estado-radar');
  if (recuentoEs) {
    comp('recuento de señales con plural', recuentoEs,
      (v) => v && /^\d+ de \d+ señales? operativas?$/.test(v));
  }

  await idioma('en');
  console.log('\n  ── radar · repintado al conmutar, sin recargar ──');
  comp('antetítulo', await txt('#seccion-radar .etiqueta-superior'), 'Market intelligence');
  comp('cabecera de cartera', await txt('#titulo-panel-cartera'), 'Portfolio');
  comp('cabecera de análisis', await txt('#titulo-top-research'), 'Top research');
  comp('cabecera de catalizadores', await txt('#titulo-catalizadores'), 'Upcoming catalysts');
  comp('cabecera de noticias', await txt('#titulo-ultimas-noticias'), 'Latest news');
  comp('rótulo de Signal', await txt('#tarjeta-signal .signal__etiqueta'), 'Aggregate Signal');

  // Los nombres de producto no se traducen, y nadie les puso `data-i18n`.
  comp('«W&C Radar» sigue siendo «W&C Radar»', await txt('#titulo-radar'), 'W&C Radar');
  comp('«W&C Signal» sigue siendo «W&C Signal»', await txt('#titulo-signal'), 'W&C Signal');

  // Lo que pintan los pintores desde lo guardado, no el documento.
  if (await p.locator('#panel-cartera .indicador__etiqueta').count()) {
    comp('métrica del panel', await txt('#panel-cartera .indicador__etiqueta'), 'Portfolio return');
  }
  if (await p.locator('#aportaciones h2').count()) {
    comp('columna de aportaciones', await txt('#aportaciones h2'), 'Top contributors');
  }
  const recuento = await txt('#estado-radar');
  if (recuento) {
    comp('recuento de señales con plural', recuento,
      (v) => v && /^\d+ of \d+ signals? live$/.test(v));
  }

  // ── Compañías ──
  // Listado y ficha comparten sección. Se comprueban las dos, y en los dos
  // idiomas: lo pintado en JavaScript puede coincidir por casualidad con el
  // idioma de partida si solo se mira un lado.
  await p.goto(`${B}/#/companias`);
  // «Cargado» se mide sobre las tarjetas, que solo existen con datos pintados:
  // el armazón de la sección ya la hace no vacía antes de que llegue nada.
  const companiasPintadas = () => p.waitForFunction(
    () => document.querySelectorAll('#rejilla-companias .tarjeta-compania').length > 0,
    null, { timeout: 60000 });
  await companiasPintadas();
  await idioma('es');
  await companiasPintadas();

  console.log('\n  ── compañías · castellano de partida ──');
  comp('titular', await txt('#seccion-companias h1'), 'Compañías');
  comp('antetítulo', await txt('#seccion-companias .etiqueta-superior'), 'Análisis');
  comp('opción vacía de sectores', await opcion('#filtro-sector-compania', 0), 'Todos los sectores');
  comp('recuento con plural', await txt('#estado-companias'),
    (v) => v && /^\d+ compañías? bajo cobertura$/.test(v));
  comp('rótulo de dato en la tarjeta',
    await txt('#rejilla-companias .tarjeta-compania .dato__etiqueta'), 'Recomendación');

  // ── Ficha ──
  await p.locator('#rejilla-companias .tarjeta-compania').first().click();
  const fichaPintada = () => p.waitForFunction(
    () => document.querySelectorAll('#ficha-compania .bloque-ficha').length > 0,
    null, { timeout: 60000 });
  await fichaPintada();

  const SELLOS_ES = ['Tiempo real', 'Con retraso', 'Histórico', 'Calculado', 'Inferido', 'No disponible'];
  const SELLOS_EN = ['Real time', 'Delayed', 'Historical', 'Calculated', 'Inferred', 'Unavailable'];
  const esSello = (lista) => (v) =>
    Boolean(v) && lista.some((s) => s.toLocaleLowerCase() === String(v).trim().toLocaleLowerCase());

  comp('bloque de tesis', await txt('#ficha-compania .bloque-ficha__titulo'), 'Tesis vigente');
  // El sello venía crudo del servidor —«UNAVAILABLE» en mitad del castellano—;
  // ahora sale de `vocabulario.js`.
  if (await p.locator('#ficha-compania .sello').count()) {
    comp('sello de calidad traducido', await txt('#ficha-compania .sello'), esSello(SELLOS_ES));
  }

  await idioma('en');
  console.log('\n  ── compañías · repintadas al conmutar, sin recargar ──');
  comp('bloque de tesis', await txt('#ficha-compania .bloque-ficha__titulo'), 'Current thesis');
  if (await p.locator('#ficha-compania .sello').count()) {
    comp('sello de calidad traducido', await txt('#ficha-compania .sello'), esSello(SELLOS_EN));
  }

  // La lista está oculta tras la ficha: se repinta igual, y al volver ha de
  // aparecer ya en el idioma nuevo sin pedir nada.
  await p.locator('#btn-volver-companias').click();
  await p.waitForTimeout(300);
  console.log('\n  ── compañías · la lista oculta también se repintó ──');
  comp('titular', await txt('#seccion-companias h1'), 'Companies');
  comp('antetítulo', await txt('#seccion-companias .etiqueta-superior'), 'Research');
  comp('opción vacía de sectores', await opcion('#filtro-sector-compania', 0), 'All sectors');
  comp('recuento con plural', await txt('#estado-companias'),
    (v) => v && /^\d+ companies? under coverage$/.test(v));
  comp('rótulo de dato en la tarjeta',
    await txt('#rejilla-companias .tarjeta-compania .dato__etiqueta'), 'Recommendation');

  // ── Catalizadores ──
  // La agenda pinta vocabulario del servidor —tipos y prioridades— que antes
  // salía crudo en inglés. Todo se construye en JavaScript salvo las cabeceras.
  await p.goto(`${B}/#/catalizadores`);
  // «Cargado» se mide sobre los grupos de la agenda, que solo existen con datos.
  const agendaPintada = () => p.waitForFunction(
    () => document.querySelectorAll('#agenda-completa .grupo-agenda, #agenda-completa .vacio').length > 0,
    null, { timeout: 60000 });
  await agendaPintada();
  await idioma('es');
  await agendaPintada();

  console.log('\n  ── catalizadores · castellano de partida ──');
  comp('titular', await txt('#seccion-catalizadores h1'), 'Catalizadores');
  comp('conmutador de horizonte',
    await txt('#conmutador-horizonte [data-horizonte="UPCOMING"]'), 'Próximos');
  comp('opción vacía de compañías',
    await opcion('#filtro-compania-catalizador', 0), 'Todas las compañías');
  comp('recuento con plural', await txt('#estado-catalizadores'),
    (v) => v && /^\d+ próximos? · \d+ pasados?/.test(v));

  const TIPOS_CRUDOS = /OPTIONS EXPIRY|EARNINGS|GUIDANCE|INVESTOR DAY|PRODUCT|REGULATORY|PRESS/;
  const PRIORIDADES_CRUDAS = /^(HIGH|MEDIUM|LOW|UNKNOWN)$/;
  if (await p.locator('#agenda-completa .evento__tipo').count()) {
    // Antes salía «OPTIONS EXPIRY» en mitad del castellano.
    comp('tipo de evento traducido', await txt('#agenda-completa .evento__tipo'),
      (v) => Boolean(v) && !TIPOS_CRUDOS.test(v));
    comp('prioridad traducida', await txt('#agenda-completa .evento__prioridad-texto'),
      (v) => Boolean(v) && !PRIORIDADES_CRUDAS.test(String(v).trim()));
  }

  await idioma('en');
  console.log('\n  ── catalizadores · repintados al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-catalizadores h1'), 'Catalysts');
  comp('conmutador de horizonte',
    await txt('#conmutador-horizonte [data-horizonte="UPCOMING"]'), 'Upcoming');
  comp('opción vacía de compañías',
    await opcion('#filtro-compania-catalizador', 0), 'All companies');
  comp('recuento con plural', await txt('#estado-catalizadores'),
    (v) => v && /^\d+ upcoming · \d+ past/.test(v));
  comp('cabecera de carencias', await txt('#titulo-sin-calendario'), 'No connected source');
  // El tipo y la prioridad NO se afirman en inglés, y no es un olvido: la hoja de
  // estilo los pone en mayúsculas de bloque, de modo que «Options expiry» ya
  // traducido y el código crudo «OPTIONS EXPIRY» son el mismo texto y la
  // comprobación no distinguiría nada. La prueba de que se traducen la da el lado
  // castellano, donde «PRENSA» y «PRESS» sí se separan.

  // ── Mercado ──
  // Todo el panorama se construye en JavaScript salvo la cabecera. Incluye dos
  // cosas que antes solo sabían castellano: el sello de calidad, que se pintaba
  // con su código crudo, y la antigüedad del dato, que era una escalera de
  // condiciones y ahora la redacta `Intl.RelativeTimeFormat`.
  await p.goto(`${B}/#/mercado`);
  // «Cargado» se mide sobre las tarjetas, que solo existen con datos pintados.
  const mercadoPintado = () => p.waitForFunction(
    () => document.querySelectorAll('#panorama-mercado .tarjeta-mercado').length > 0,
    null, { timeout: 60000 });
  await mercadoPintado();
  await idioma('es');
  await mercadoPintado();

  console.log('\n  ── mercado · castellano de partida ──');
  comp('titular', await txt('#seccion-mercado h1'), 'Mercados');
  comp('antetítulo', await txt('#seccion-mercado .etiqueta-superior'), 'Mercado');
  comp('cobertura con plural', await txt('#estado-mercado'),
    (v) => v && /^\d+ de \d+ instrumentos? resueltos?/.test(v));
  comp('leyenda de calidades',
    await txt('#panorama-mercado .rejilla-leyenda'), (v) => Boolean(v));

  // Las listas de sellos y `esSello()` los declara el bloque de compañías: es el
  // mismo vocabulario, y duplicarlo aquí solo daría dos sitios que mantener.
  // El sello se pintaba con su código: «UNAVAILABLE» en mitad del castellano.
  comp('sello de calidad traducido',
    await txt('#panorama-mercado .sello'), esSello(SELLOS_ES));
  // «hace 5 min» lo redacta el navegador, no una plantilla.
  if (await p.locator('#panorama-mercado .tarjeta-mercado__pie span').count()) {
    comp('antigüedad en castellano',
      await txt('#panorama-mercado .tarjeta-mercado__pie span:nth-child(2)'),
      (v) => Boolean(v) && !/\bago\b/.test(String(v)));
  }

  await idioma('en');
  console.log('\n  ── mercado · repintado al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-mercado h1'), 'Markets');
  comp('cobertura con plural', await txt('#estado-mercado'),
    (v) => v && /^\d+ of \d+ instruments? resolved/.test(v));
  comp('sello de calidad traducido',
    await txt('#panorama-mercado .sello'), esSello(SELLOS_EN));
  comp('cabecera de la leyenda',
    await txt('#panorama-mercado .bloque-panel:last-child h2'), 'Data quality');

  // ── Opciones (tanda A: flujo y actividad inusual) ──
  // La tabla, las destacadas y la ficha se construyen enteras en JavaScript. Las
  // cabeceras de columna son el caso delicado: `COLUMNAS` es una constante de
  // módulo, así que si guardara el rótulo en vez de la clave se congelaría en el
  // idioma de arranque y ningún repintado la alcanzaría.
  await p.goto(`${B}/#/opciones`);
  const contratosPintados = () => p.waitForFunction(
    () => document.querySelectorAll('#tabla-inusual .tabla-opciones tbody tr').length > 0
      || document.querySelectorAll('#tabla-inusual .vacio').length > 0,
    null, { timeout: 60000 });
  await contratosPintados();
  await idioma('es');
  await contratosPintados();

  console.log('\n  ── opciones · castellano de partida ──');
  comp('titular', await txt('#seccion-opciones h1'), 'Opciones');
  comp('pestaña', await txt('#pestana-inusual'), 'Actividad inusual');
  comp('cabecera de destacadas', await txt('#titulo-destacadas'), 'Mayor actividad inusual');
  comp('rótulo de filtro traducible',
    await txt('#filtros-opciones label:nth-child(4) span'), 'Premium mín.');

  const hayFilas = await p.locator('#tabla-inusual .tabla-opciones tbody tr').count();
  if (hayFilas) {
    // Se traduce: un analista dice «Volumen» hablando en castellano.
    comp('columna traducida',
      await txt('#tabla-inusual .tabla-opciones th:nth-child(6)'), 'Volumen');
    // No se traduce: lo diría en inglés aunque hable en castellano.
    comp('columna que se queda en inglés',
      await txt('#tabla-inusual .tabla-opciones th:nth-child(3)'), 'Strike');
    comp('sigla intacta',
      await txt('#tabla-inusual .tabla-opciones th:nth-child(9)'), 'IV');
    comp('recuento con plural', await txt('#tabla-inusual .barra-resultados p'),
      (v) => v && /^Mostrando .+ de \d+ contratos?$/.test(v));
  }

  // ── Cadena de opciones (tanda B) ──
  // Se cambia de pestaña sin recargar: la cadena la pinta su propio módulo, y su
  // cabecera mezcla lo que se traduce con lo que no.
  await p.locator('#pestana-cadena').click();
  const cadenaPintada = () => p.waitForFunction(
    () => document.querySelectorAll('#tabla-cadena .tabla-opciones thead tr').length > 0
      || document.querySelectorAll('#tabla-cadena .vacio, #tabla-cadena .pendiente-bloque').length > 0,
    null, { timeout: 60000 });
  await cadenaPintada();

  const hayCadena = await p.locator('#tabla-cadena .tabla-opciones thead tr').count();
  if (hayCadena) {
    comp('columna traducida de la cadena',
      await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(3)'), 'Último');
    comp('columna que se queda en inglés',
      await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(1)'), 'Bid');
    comp('griega intacta',
      await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(7)'), 'Delta');
  }
  comp('cabecera del mapa de OI', await txt('#titulo-mapa-oi'), 'Interés abierto por strike');

  await idioma('en');
  console.log('\n  ── opciones · repintadas al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-opciones h1'), 'Options');
  comp('pestaña', await txt('#pestana-inusual'), 'Unusual activity');
  comp('cabecera de destacadas', await txt('#titulo-destacadas'), 'Top unusual activity');
  comp('rótulo de filtro traducible',
    await txt('#filtros-opciones label:nth-child(4) span'), 'Min. premium');
  if (hayFilas) {
    comp('columna traducida',
      await txt('#tabla-inusual .tabla-opciones th:nth-child(6)'), 'Volume');
    comp('columna que se queda en inglés',
      await txt('#tabla-inusual .tabla-opciones th:nth-child(3)'), 'Strike');
    comp('recuento con plural', await txt('#tabla-inusual .barra-resultados p'),
      (v) => v && /^Showing .+ of \d+ contracts?$/.test(v));
  }

  console.log('\n  ── opciones · cadena repintada ──');
  if (hayCadena) {
    comp('columna traducida de la cadena',
      await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(3)'), 'Last');
    comp('columna que se queda en inglés',
      await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(1)'), 'Bid');
  }
  comp('cabecera del mapa de OI', await txt('#titulo-mapa-oi'), 'Open interest by strike');
  comp('cabecera de la cadena', await txt('#titulo-cadena'), 'Option chain');

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
