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

   ═══ Hallazgo conocido, no fallo intermitente ═══

   La tanda de portada declara pendiente, no falla, si la consola trae algún
   `Failed to load resource: ... 403` al cargar la imagen de portada de una
   noticia. Investing.com —único proveedor de noticias, `src/noticias/
   investing.js`— responde 403 a la petición de imagen hecha en directo desde
   el navegador: el mismo bloqueo anti-scraping que ese fichero ya documenta
   en su cabecera y que es la razón de que use RSS y no su API. `img-src` en
   `server.js` ya admite `https://*.investing.com` —la CSP no es la barrera—,
   pero el hotlink al dominio ajeno sigue siéndolo. Arreglarlo de raíz pide
   que el servidor traiga la imagen y la sirva desde `self`; queda para
   entonces, no para un retoque de paso. Cualquier OTRO error de consola
   —uno que no case con ese patrón— sigue contando como fallo real.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');
const { crearTercerEstado } = require('./tercer-estado');

const { chromium } = exigirPlaywright('repintado al cambiar de idioma');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

/* Las tandas de radar, mercado y opciones duermen mientras sus áreas estén
   ocultas: sus rutas ya no se admiten, de modo que `goto()` aterrizaría en la
   portada y las comprobaciones fallarían por una razón que no es la suya.

   NO se borran. Cubren repintado que sigue siendo correcto —`COLUMNAS` como
   constante de módulo, el sello de calidad, la antigüedad relativa— y que
   volvería sin prueba el día que las áreas vuelvan. Reabrirlas es poner esto a
   `true` a la vez que se quita `oculta` en `navegacion.js`. */
const AREAS_OCULTAS = false;

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

  const E = crearTercerEstado(B);

  // Varios rótulos llevan `text-transform: uppercase`, e `innerText` devuelve
  // el texto ya transformado: la comparación ignora las mayúsculas.
  const norm = (x) => (typeof x === 'string' ? x.toLocaleLowerCase().trim() : x);
  /* ── La sección como unidad de «sin dato» ──
     Nueve esperas de esta batería aguardan a que una VISTA pinte, y todas
     dependen de que la base traiga filas. Gatearlas una a una serían diecisiete
     puertas en una secuencia plana, y la decimoctava se olvidaría.

     En vez de eso la batería sabe en qué sección está. Una espera perdida marca
     la sección entera, y a partir de ahí `comp()` declara pendiente en lugar de
     comparar contra los nulos que deja una vista sin pintar —que es justo el
     rojo falso que se quiere evitar—. La marca se levanta en la cabecera
     siguiente, que es donde empieza otra vista. */
  let sinPintar = null;
  const seccion = (titulo) => { sinPintar = null; console.log(titulo); };

  const comp = (nombre, real, esperado) => {
    if (sinPintar) { E.pendiente(nombre, sinPintar); return; }
    const bien = typeof esperado === 'function' ? esperado(real) : norm(real) === norm(esperado);
    if (bien) E.acierto(nombre); else E.fallo(nombre, JSON.stringify(real));
  };

  /** Una espera de vista: no lanza, marca la sección y deja seguir. */
  const vistaPintada = (pagina, condicion, arg, vista) => E.esperarDatos(
    pagina, condicion, arg,
    { nombre: `la vista «${vista}» llega a pintarse`,
      motivo: `la base no trae filas para «${vista}»`,
      plazo: 45000,
      declarar: (n, m) => { sinPintar = m; E.pendiente(n, m); } });
  /* ── El tercer estado: ni bien, ni mal, SIN DATO ──
     `txt()` devuelve `null` ante cualquier nodo que no esté, y con eso una
     comprobación no puede distinguir dos cosas muy distintas: que el dato esté y
     sea el equivocado, o que no haya nada que medir porque la base contra la que
     se corre no tiene esas filas.

     El mecanismo nació aquí y hoy vive en `tests/tercer-estado.js`, porque otras
     tres baterías lo necesitaban y copiarlo habría sido un hecho con cuatro
     fuentes. Allí está escrito el porqué entero. */
  const { pendiente } = E;

  /**
   * Comprueba algo que solo existe cuando la base tiene datos.
   *
   * `contenedor` ha de existir SIEMPRE: si falta, la sección dejó de pintarse y
   * eso es un fallo. `dentro` es lo que solo hay cuando hay filas que medir.
   */
  const compConDatos = async (nombre, contenedor, dentro, sel, esperado, queFalta) => {
    if (await p.locator(contenedor).count() === 0) {
      comp(`${nombre} · el contenedor ${contenedor} existe`, null, () => false);
      return;
    }
    if (await p.locator(dentro).count() === 0) { pendiente(nombre, queFalta); return; }
    comp(nombre, await txt(sel), esperado);
  };

  const txt = (sel) => p.locator(sel).first().innerText().catch(() => null);
  // Los nodos SVG no tienen `innerText`; se leen por `textContent`.
  const txtSvg = (sel) => p.locator(sel).first().textContent().catch(() => null);
  const opcion = (sel, n) => p.locator(`${sel} option`).nth(n).innerText().catch(() => null);
  // aplicarIdioma() (i18n.js) es síncrona de punta a punta: traducir(), el
  // evento `idioma:cambiado` y su listener en app.js (repintarVistas(), no
  // async) corren enteros dentro del mismo tick que este click. Playwright
  // ya espera a que ese tick termine antes de resolver `click()`, así que no
  // hace falta ninguna espera después.
  const idioma = async (clave) => {
    await p.click(`.conmutador-idioma button[data-idioma="${clave}"]`);
  };

  await p.goto(`${B}/#/cartera`, { waitUntil: 'networkidle' });
  // El cuadro de mando y la leyenda dependen del gráfico, pintado tras un
  // fetch async: se espera a que la leyenda tenga cifra, no un plazo fijo.
  const carteraPintada = () => vistaPintada(p,
    () => {
      const v = document.querySelector(
        '#leyenda-grafico .leyenda__elemento:first-child .leyenda__valor');
      return Boolean(v && v.textContent.trim());
    }, null, 'cartera');
  await carteraPintada();
  await idioma('es');

  /* ── La puerta de arriba ──
     Esta batería no comprueba que las vistas existan: comprueba que REPINTAN al
     cambiar de idioma, y para eso hace falta algo pintado que repintar. Contra
     una base sin tesis publicadas no hay ni una fila en ninguna de las ocho
     vistas que recorre.

     Y no basta con no lanzar en las esperas: la batería también ACTÚA —elige en
     un `<select>`, pulsa pestañas—, y una acción sobre un control vacío revienta
     con su propio plantón. `page.selectOption: Timeout 30000ms exceeded` no dice
     que la plataforma esté rota; dice que la lista estaba vacía.

     Gatear cada interacción sería reestructurar la batería. Se pregunta una vez,
     arriba, y si no hay nada que repintar se declara entera pendiente. */
  const hayCartera = await (await fetch(`${B}/api/mercado/cartera`)).json()
    .then((d) => !d.vacia).catch(() => false);

  if (!hayCartera) {
    E.pendiente('la batería entera',
      'la base no tiene ninguna tesis publicada con ticker: no hay nada pintado que repintar');
    await navegador.close();
    process.exit(E.cerrar());
  }

  seccion('\n  ── cartera · castellano de partida ──');
  comp('titular', await txt('#seccion-cartera h1'), 'Evolución de posiciones');
  comp('columna de la tabla', await txt('.tabla-posiciones th:nth-child(2)'), 'Estado');
  // Pintado en JavaScript: la liquidez de la composición y la nota del total de la
  // conciliación. Se afirman en los dos idiomas —la nota, por la palabra que cambia—
  // porque una tabla que no se repintara conservaría el castellano de partida.
  /* El rótulo de la caja lo lleva ahora el anillo, que sustituyó a las barras
     por sector. Se sigue afirmando lo mismo —que sigue al idioma— sobre el nodo
     que hoy lo porta. El anillo lo pinta en JavaScript y sin `data-i18n`, así que
     sin entrada en el repintado se quedaría en el idioma de partida. */
  comp('liquidez en el anillo de composición',
    await txtSvg('#anillo-composicion .anillo__fila--caja .anillo__nombre'), 'Liquidez');
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
  /* Suelo de muestra: la celda retenida no dice «no hay dato», dice cuántas
     sesiones faltan. Se afirma por la palabra que cambia de idioma y por el
     recuento, que ha de ser el que publica el motor. */
  comp('el Sharpe declara lo que le falta',
    await txt('#cuadro-mando .indicador:has-text("Sharpe") .indicador__nota'),
    (v) => v && /^Faltan \d+ sesiones · se publica con \d+ \(3 años\)$/.test(v));
  /* Los suelos son dos y no caducan a la vez: la anualizada espera al año y los
     ratios a los tres. La segunda celda de la rejilla es la anualizada; si alguna
     vez los dos rótulos dijeran lo mismo, sobraría uno de los dos suelos. */
  comp('la anualizada declara un suelo distinto del de los ratios',
    await txt('#rejilla-estadisticos .estadistico:nth-child(2) .estadistico__nota'),
    (v) => v && /\(1 año\)/.test(v) && !/756/.test(v));
  await compConDatos('porcentaje con espacio duro',
    '#cuerpo-posiciones', '#cuerpo-posiciones tr',
    '#cuerpo-posiciones tr:first-child td:nth-child(3)', (v) => v && / %$/.test(v),
    'la cartera de esta base no tiene posiciones abiertas que medir');

  // El conmutador de la tabla del gráfico lleva `data-i18n`, que la pasada
  // sobre el DOM devolvería a «Ver datos». Se deja la tabla abierta antes de
  // conmutar: así el repintado ha de acertar con el estado vigente y no con
  // el de partida, que es justo lo que fallaba.
  comp('conmutador de la tabla, cerrada', await txt('#btn-tabla-serie'), 'Ver datos');
  await p.click('#btn-tabla-serie');
  await p.waitForFunction(
    () => document.querySelector('#btn-tabla-serie')?.textContent.trim() === 'Ocultar datos');
  comp('conmutador de la tabla, abierta', await txt('#btn-tabla-serie'), 'Ocultar datos');

  await idioma('en');
  seccion('\n  ── cartera · repintada al conmutar, sin recargar ──');
  comp('titular', await txt('#seccion-cartera h1'), 'Position performance');
  comp('columna de la tabla', await txt('.tabla-posiciones th:nth-child(2)'), 'Status');
  comp('liquidez en el anillo de composición',
    await txtSvg('#anillo-composicion .anillo__fila--caja .anillo__nombre'), 'Cash');
  comp('nota del total de la conciliación',
    await txt('#pie-conciliacion .celda-total small'), (x) => /\btranches?\b/.test(x ?? ''));
  comp('cuadro de mando', await txt('#cuadro-mando .indicador__etiqueta'), 'Cumulative return');
  comp('la leyenda mide lo mismo que el titular',
    await txt('#leyenda-grafico .leyenda__elemento:first-child .leyenda__valor'),
    await txt('#cuadro-mando .indicador--principal .indicador__valor'));
  comp('la leyenda dice desde dónde mide',
    await txt('#leyenda-grafico .leyenda__medida'), (v) => v && /invested capital/.test(v));
  comp('el Sharpe declara lo que le falta',
    await txt('#cuadro-mando .indicador:has-text("Sharpe") .indicador__nota'),
    (v) => v && /^\d+ sessions short · published from \d+ \(3 years\)$/.test(v));
  comp('la anualizada declara un suelo distinto del de los ratios',
    await txt('#rejilla-estadisticos .estadistico:nth-child(2) .estadistico__nota'),
    (v) => v && /\(1 year\)/.test(v) && !/756/.test(v));
  comp('estadísticos', await txt('#rejilla-estadisticos .estadistico__etiqueta'), 'Total return');
  comp('subtítulo del gráfico', await txt('#subtitulo-grafico'), (v) => v && /^Indexed value/.test(v));
  comp('leyenda del gráfico', await txt('#leyenda-grafico'), (v) => v && /Warrants & Co\. portfolio/.test(v));
  comp('periodo de estadísticos', await txt('#sub-estadisticos'), (v) => v && /^Period /.test(v));
  await compConDatos('porcentaje sin espacio',
    '#cuerpo-posiciones', '#cuerpo-posiciones tr',
    '#cuerpo-posiciones tr:first-child td:nth-child(3)', (v) => v && /\d%$/.test(v),
    'la cartera de esta base no tiene posiciones abiertas que medir');

  comp('el conmutador sigue al estado de la tabla, no al de partida',
    await txt('#btn-tabla-serie'), 'Hide data');

  await p.goto(`${B}/#/repositorio`);
  await vistaPintada(p,
    () => document.querySelectorAll('#cuerpo-tabla-informes tr').length > 0,
    null, 'repositorio');
  seccion('\n  ── repositorio · en inglés ──');
  comp('titular', await txt('#seccion-repositorio h1'), 'Research catalogue');
  comp('columna de la tabla', await txt('#tabla-informes thead th:nth-child(1)'), 'Company');
  comp('rótulo de filtro', await txt('.panel-filtros__campos label:first-child span'), 'Sector');
  comp('opción vacía', await opcion('#filtro-sector', 0), 'All');
  comp('recuento con plural', await txt('#resumen-resultados'),
    (v) => v && /^Showing .+ of \d+ reports?$/.test(v));
  comp('nivel de acceso', await opcion('#filtro-nivel', 1),
    (v) => ['Public', 'Client', 'Institutional', 'Internal'].includes(v));

  await idioma('es');
  seccion('\n  ── repositorio · repintado de vuelta a castellano ──');
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

  if (AREAS_OCULTAS) {  // área Mercado · radar — dormida, no borrada
    // ── Radar ──
    // Los seis bloques se construyen en JavaScript salvo sus cabeceras. Se
    // comprueban las dos mitades: los rótulos del documento y lo que pintan los
    // pintores de `home.js` desde lo que el radar guardó.
    await p.goto(`${B}/#/radar`);
    // El radar resuelve seis fuentes y la agenda tarda segundos. Hay que esperar a
    // que TODAS hayan pintado antes de conmutar: un bloque que llegue después del
    // cambio pinta ya con el diccionario nuevo, y entonces la prueba pasaría sin
    // que nadie haya repintado nada. Se espera por condición, no por reloj.
    const radarPintado = () => vistaPintada(p, () => {
      const lleno = (sel) => (document.querySelector(sel)?.textContent ?? '').trim().length > 0;
      return ['#snapshot-mercado', '#rejilla-radar', '#tarjeta-signal', '#agenda-catalizadores',
        '#rejilla-research', '#lista-titulares', '#panel-cartera'].every(lleno);
    }, null, 'radar');
    await radarPintado();
    await idioma('es');
    await radarPintado();

    seccion('\n  ── radar · castellano de partida ──');
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
    seccion('\n  ── radar · repintado al conmutar, sin recargar ──');
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
  }

  // ── Compañías ──
  // Listado y ficha comparten sección. Se comprueban las dos, y en los dos
  // idiomas: lo pintado en JavaScript puede coincidir por casualidad con el
  // idioma de partida si solo se mira un lado.
  await p.goto(`${B}/#/companias`);
  // «Cargado» se mide sobre las tarjetas, que solo existen con datos pintados:
  // el armazón de la sección ya la hace no vacía antes de que llegue nada.
  const companiasPintadas = () => vistaPintada(p, 
    () => document.querySelectorAll('#rejilla-companias .tarjeta-compania').length > 0,
    null, 'compañías');
  await companiasPintadas();
  await idioma('es');
  await companiasPintadas();

  seccion('\n  ── compañías · castellano de partida ──');
  comp('titular', await txt('#seccion-companias h1'), 'Compañías');
  comp('antetítulo', await txt('#seccion-companias .etiqueta-superior'), 'Análisis');
  comp('opción vacía de sectores', await opcion('#filtro-sector-compania', 0), 'Todos los sectores');
  comp('recuento con plural', await txt('#estado-companias'),
    (v) => v && /^\d+ compañías? bajo cobertura$/.test(v));
  comp('rótulo de dato en la tarjeta',
    await txt('#rejilla-companias .tarjeta-compania .dato__etiqueta'), 'Recomendación');

  // ── Ficha ──
  await p.locator('#rejilla-companias .tarjeta-compania').first().click();
  const fichaPintada = () => vistaPintada(p, 
    () => document.querySelectorAll('#ficha-compania .bloque-ficha').length > 0,
    null, 'ficha de compañía');
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
  seccion('\n  ── compañías · repintadas al conmutar, sin recargar ──');
  comp('bloque de tesis', await txt('#ficha-compania .bloque-ficha__titulo'), 'Current thesis');
  if (await p.locator('#ficha-compania .sello').count()) {
    comp('sello de calidad traducido', await txt('#ficha-compania .sello'), esSello(SELLOS_EN));
  }

  // La lista está oculta tras la ficha: se repinta igual, y al volver ha de
  // aparecer ya en el idioma nuevo sin pedir nada.
  await p.locator('#btn-volver-companias').click();
  await companiasPintadas();
  seccion('\n  ── compañías · la lista oculta también se repintó ──');
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
  const agendaPintada = () => vistaPintada(p, 
    () => document.querySelectorAll('#agenda-completa .grupo-agenda, #agenda-completa .vacio').length > 0,
    null, 'agenda de catalizadores');
  await agendaPintada();
  await idioma('es');
  await agendaPintada();

  seccion('\n  ── catalizadores · castellano de partida ──');
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
  seccion('\n  ── catalizadores · repintados al conmutar, sin recargar ──');
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

  if (AREAS_OCULTAS) {  // área Mercado — dormida, no borrada
    // ── Mercado ──
    // Todo el panorama se construye en JavaScript salvo la cabecera. Incluye dos
    // cosas que antes solo sabían castellano: el sello de calidad, que se pintaba
    // con su código crudo, y la antigüedad del dato, que era una escalera de
    // condiciones y ahora la redacta `Intl.RelativeTimeFormat`.
    await p.goto(`${B}/#/mercado`);
    // «Cargado» se mide sobre las tarjetas, que solo existen con datos pintados.
    const mercadoPintado = () => vistaPintada(p, 
      () => document.querySelectorAll('#panorama-mercado .tarjeta-mercado').length > 0,
      null, 'mercado');
    await mercadoPintado();
    await idioma('es');
    await mercadoPintado();

    seccion('\n  ── mercado · castellano de partida ──');
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
    seccion('\n  ── mercado · repintado al conmutar, sin recargar ──');
    comp('titular', await txt('#seccion-mercado h1'), 'Markets');
    comp('cobertura con plural', await txt('#estado-mercado'),
      (v) => v && /^\d+ of \d+ instruments? resolved/.test(v));
    comp('sello de calidad traducido',
      await txt('#panorama-mercado .sello'), esSello(SELLOS_EN));
    comp('cabecera de la leyenda',
      await txt('#panorama-mercado .bloque-panel:last-child h2'), 'Data quality');
  }

  if (AREAS_OCULTAS) {  // área Opciones — dormida, no borrada
    // ── Opciones (tanda A: flujo y actividad inusual) ──
    // La tabla, las destacadas y la ficha se construyen enteras en JavaScript. Las
    // cabeceras de columna son el caso delicado: `COLUMNAS` es una constante de
    // módulo, así que si guardara el rótulo en vez de la clave se congelaría en el
    // idioma de arranque y ningún repintado la alcanzaría.
    await p.goto(`${B}/#/opciones`);
    const contratosPintados = () => vistaPintada(p, 
      () => document.querySelectorAll('#tabla-inusual .tabla-opciones tbody tr').length > 0
        || document.querySelectorAll('#tabla-inusual .vacio').length > 0,
      null, 'contratos');
    await contratosPintados();
    await idioma('es');
    await contratosPintados();

    seccion('\n  ── opciones · castellano de partida ──');
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
    const cadenaPintada = () => vistaPintada(p, 
      () => document.querySelectorAll('#tabla-cadena .tabla-opciones thead tr').length > 0
        || document.querySelectorAll('#tabla-cadena .vacio, #tabla-cadena .pendiente-bloque').length > 0,
      null, 'cadena de opciones');
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
    seccion('\n  ── opciones · repintadas al conmutar, sin recargar ──');
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

    seccion('\n  ── opciones · cadena repintada ──');
    if (hayCadena) {
      comp('columna traducida de la cadena',
        await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(3)'), 'Last');
      comp('columna que se queda en inglés',
        await txt('#tabla-cadena .tabla-opciones tr:nth-child(2) th:nth-child(1)'), 'Bid');
    }
    comp('cabecera del mapa de OI', await txt('#titulo-mapa-oi'), 'Open interest by strike');
    comp('cabecera de la cadena', await txt('#titulo-cadena'), 'Option chain');
  }

  // ── Noticias ──
  // El listado, las tarjetas y la línea de sindicación se construyen enteros en
  // JavaScript; la categoría y la relevancia llegan del servidor con su rótulo
  // castellano y se traducen desde la clave, como los niveles de acceso.
  await p.goto(`${B}/#/noticias`);
  await vistaPintada(p,
    () => document.querySelectorAll('#rejilla-noticias .fila-noticia, #rejilla-noticias .vacio')
      .length > 0,
    null, 'noticias');
  await idioma('es');

  seccion('\n  ── noticias · castellano de partida ──');
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
  // cargarNoticias() (app.js) marca la rejilla `.cargando` al empezar y la
  // retira en su `finally`, tras repintar: es una señal de un solo disparo,
  // fiable aunque el recuento filtrado coincida por casualidad con el de
  // partida (cosa que un cambio de texto no podría distinguir).
  await p.selectOption('#filtro-noticias-categoria', { index: 1 });
  await p.waitForFunction(
    () => !document.querySelector('#rejilla-noticias')?.classList.contains('cargando'));
  const categoria = await p.locator('#filtro-noticias-categoria').inputValue();

  await idioma('en');
  seccion('\n  ── noticias · repintadas al conmutar, sin recargar ──');
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

  // La fila la construye `construirFilaNoticia()`: nada de `data-i18n`.
  const filas = await p.locator('.fila-noticia').count();
  if (filas) {
    comp('categoría de la fila', await txt('.fila-noticia .fila-noticia__superior span'),
      (v) => v && !/Mercados|Compañía|Macroeconomía|Regulación/.test(v));
  }


  // ── Portada · apoyo degradado de Cartera (antes «fila de cifras») ──
  /* El bloque lo pinta `pintarCarteraHome()` entera —fusionada con la antigua
     `pintarCifras()`—: ni una de sus cifras ni uno de sus rótulos lleva
     `data-i18n`, de modo que sin entrada en `PINTORES_INICIO` se quedaría en
     el idioma de partida sin que nada más se notara. */
  await p.goto(`${B}/#/inicio`);
  // La espera es por condición y sobre un nodo que solo existe pintado: el
  // armazón de la portada —hero, manifiesto, pilares— ya está en el documento
  // mucho antes de que la cartera conteste, y «la sección tiene contenido» daría
  // por buena una fila vacía.
  const filaPintada = () => vistaPintada(p,
    () => document.querySelectorAll('#home-cartera-cuerpo .cartera-home__apoyo .dato').length === 4,
    null, 'apoyo degradado de cartera en portada');
  await filaPintada();

  const celdas = () => p.$$eval('#home-cartera-cuerpo .cartera-home__apoyo .dato', (cs) => cs.map((c) => ({
    valor: c.querySelector('.dato__valor')?.textContent.trim() ?? null,
    etiqueta: c.querySelector('.dato__etiqueta')?.textContent.trim() ?? null,
    nota: c.querySelector('.dato__nota')?.textContent.trim() ?? null,
  })));

  /*
   * Regla 9 en pantalla. Las dos primeras casillas dicen hoy el mismo número, y
   * es correcto que lo digan: la cartera nace dentro del año y ambas miden desde
   * el mismo capital. Lo que se afirma no es la coincidencia —eso caducaría el
   * 1 de enero— sino la EQUIVALENCIA: coinciden si y solo si la casilla del año
   * declara que mide desde el capital. Las dos mitades salen de la propia
   * pantalla, que es lo que ninguna de las tres veces anteriores se comprobó.
   *
   * Que las cifras se calculen por separado lo vigila `tests/cartera.js` (caso 7);
   * aquí se vigila que la pantalla no las contradiga.
   */
  const equivalencia = (cs, desdeCapital) => {
    const mide = desdeCapital.test(cs[0].nota ?? '');
    const iguales = cs[0].valor === cs[1].valor;
    return mide === iguales;
  };

  const RETENIDAS = /sharpe|sortino|calmar|jensen|anualizada|annualised|annualized/i;

  await idioma('es');
  await filaPintada();
  seccion('\n  ── portada · apoyo degradado de cartera en castellano ──');
  let cs = await celdas();
  comp('rótulo del año', cs[0].etiqueta, 'Rentabilidad 2026');
  // El año no es una cantidad: como número, `t()` lo agruparía por millares. En
  // castellano pasaría inadvertido —«2026»—; solo el inglés lo delata.
  comp('el año no se agrupa por millares', cs[0].etiqueta, (v) => v && !/2[.,]026/.test(v));
  comp('rótulo del total', cs[1].etiqueta, 'Rentabilidad total');
  /* El rótulo del índice es «nombre · símbolo», y las dos piezas las manda el
     servidor. Se afirma la FORMA y no el nombre concreto: escribir «S&P 500»
     aquí sería una copia más del catálogo, que es justo lo que se acaba de
     retirar del cliente. Que el nombre sea el del benchmark elegido lo afirma
     `tests/cartera-interfaz.js`, que es donde vive esa pregunta. */
  comp('rótulo del índice, con nombre y símbolo',
    cs[2].etiqueta, (v) => v && /^.+ · [A-Z]{1,6}$/.test(v));
  comp('rótulo de la caída', cs[3].etiqueta, 'Máxima caída');
  comp('las dos casillas coinciden si y solo si el año mide desde el capital',
    cs, (v) => equivalencia(v, /desde el capital/i));
  comp('ninguna cifra retenida por suelo de muestra llega a la portada',
    (await txt('#home-cartera-cuerpo')) ?? '', (v) => !RETENIDAS.test(v));
  comp('el pie declara el tamaño de la muestra',
    await txt('.cifras__pie'), (v) => v && /\d+ sesiones/.test(v) && /\d+ tesis/.test(v));
  comp('el pie lleva a la cartera',
    await p.locator('.cifras__enlace').first().getAttribute('href'), '#/cartera');

  await idioma('en');
  await filaPintada();
  seccion('\n  ── portada · fila repintada al conmutar, sin recargar ──');
  cs = await celdas();
  comp('rótulo del año', cs[0].etiqueta, '2026 return');
  comp('el año no se agrupa por millares', cs[0].etiqueta, (v) => v && !/2[.,]026/.test(v));
  comp('rótulo del total', cs[1].etiqueta, 'Total return');
  // Los nombres de índice son nombres propios: la forma es la misma en inglés.
  comp('rótulo del índice, con nombre y símbolo',
    cs[2].etiqueta, (v) => v && /^.+ · [A-Z]{1,6}$/.test(v));
  comp('rótulo de la caída', cs[3].etiqueta, 'Maximum drawdown');
  comp('la nota del año sigue al idioma', cs[0].nota, (v) => v && /^From capital/.test(v));
  comp('las dos casillas coinciden si y solo si el año mide desde el capital',
    cs, (v) => equivalencia(v, /from capital/i));
  comp('ninguna cifra retenida por suelo de muestra llega a la portada',
    (await txt('#home-cartera-cuerpo')) ?? '', (v) => !RETENIDAS.test(v));
  comp('el pie declara el tamaño de la muestra',
    await txt('.cifras__pie'), (v) => v && /\d+ sessions/.test(v) && /\d+ (thesis|theses)/.test(v));
  comp('porcentaje sin espacio', cs[1].valor, (v) => v && /\d%$/.test(v));

  /* ── Portada · la fila de cifras del HERO, al conmutar ──
     La pinta `pintarMetricasHero()` sobre `#hero-metricas` (Fase D.12) —el
     selector viejo, `#cifras-hero`, es de antes de esa fase y ya no existe—,
     y tampoco lleva un solo `data-i18n`: sin su entrada en `PINTORES_INICIO`
     se quedaría en el idioma de partida. Recargar no lo cazaría —al recargar
     se pinta ya con el diccionario nuevo—, así que se comprueba aquí, donde
     el idioma se conmuta sin recargar.

     Dos de las tres —año y total— comparten fuente exacta con el apoyo
     degradado de abajo (`#home-cartera-cuerpo .cartera-home__apoyo`, Regla 9)
     y se comparan contra su gemela.
     La tercera —el índice EN LO QUE VA DE AÑO— es una cifra propia de esta
     fase (`e.rentabilidadIndiceAnio`, `src/cartera.js`) sin gemela abajo: esa
     fila solo lleva el índice de periodo completo (`e.rentabilidadIndice`),
     un número distinto. Comparar las dos como si fueran la misma no sería
     una prueba de la Regla 9, sería una prueba mal escrita que fallaría por
     una razón que no es la suya. */
  const heroPintado = () => vistaPintada(p,
    () => document.querySelectorAll('#hero-metricas .dato').length === 3,
    null, 'hero');

  /* Las tres cifras del hero arrancan en 0 % y cuentan hasta el valor real
     —la excepción documentada de la cláusula 8 de CLAUDE.md—, así que el
     nodo existe antes de que su texto sea el definitivo. Leerlo en cuanto
     `heroPintado()` resuelve capturaba el número a medio contar: la prueba
     comparaba una cifra en tránsito contra su gemela ya asentada, y fallaba
     por una carrera, no por un dato incorrecto. `contarPorcentajeHasta()`
     (`inicio.js`) marca `dataset.contado = 'true'` en cada `.dato__valor`
     exactamente cuando su texto queda en su valor final —tanto al terminar
     la animación como en las rutas sin ella (movimiento reducido, dato
     ausente)—, así que esto espera sobre ESE dato, no sobre un plazo fijo. */
  const heroContado = () => vistaPintada(p,
    () => [...document.querySelectorAll('#hero-metricas .dato__valor')]
      .every((v) => v.dataset.contado === 'true'),
    null, 'hero, contador asentado');

  const celdasHero = () => p.$$eval('#hero-metricas .dato', (cs) => cs.map((c) => ({
    valor: c.querySelector('.dato__valor')?.textContent.trim() ?? null,
    etiqueta: c.querySelector('.dato__etiqueta')?.textContent.trim() ?? null,
  })));

  /* 1680×1050 es la ventana donde las cifras del hero caben con las líneas
     puestas; en las apaisadas ceden y no habría nada que confrontar. Se fija
     aquí y no se hereda del resto de la prueba, que corre a 1280×900. */
  await p.setViewportSize({ width: 1680, height: 1050 });

  /* El guard que faltaba: `heroPintado()` declara «hero» pendiente y sigue
     —nunca lanza—, pero nada comprobaba su resultado antes de indexar el
     array que deja vacío. Un SIN DATO se leía entonces como excepción de
     Node, con el mismo fallo listo para volver el día que este selector
     también cambie. Ahora el bloque se salta —limpio, como pendiente— si el
     hero no llegó a pintarse, en cualquiera de las dos comprobaciones. */
  const heroListoEn = await heroPintado() && await heroContado();
  if (!heroListoEn) {
    E.pendiente('[hero] resto de comprobaciones del hero',
      'el hero no llegó a pintarse: no hay nada que leer en #hero-metricas');
  } else {

  // Llega en inglés, que es donde acabó la tanda anterior.
  const heroEn = await celdasHero();
  comp('[hero, en] rótulo del año', heroEn[0].etiqueta, (v) => v && /^\d{4} return$/i.test(v));
  comp('[hero, en] rótulo del índice, con el año que acota "en lo que va de"',
    heroEn[1].etiqueta, (v) => v && / · \d{4}$/.test(v));
  comp('[hero, en] rótulo del total', heroEn[2].etiqueta, 'Total return');

  await idioma('es');
  const heroListoEs = await heroPintado() && await heroContado();
  if (!heroListoEs) {
    E.pendiente('[hero, es] resto de comprobaciones del hero',
      'el hero no volvió a pintarse tras conmutar a castellano');
  } else {
  const heroEs = await celdasHero();
  comp('[hero, es] el rótulo del año sigue al idioma',
    heroEs[0].etiqueta, (v) => v && /^rentabilidad \d{4}$/i.test(v));
  comp('[hero, es] el rótulo del índice, con el año que acota "en lo que va de"',
    heroEs[1].etiqueta, (v) => v && / · \d{4}$/.test(v));
  comp('[hero, es] el rótulo del total sigue al idioma', heroEs[2].etiqueta, 'Rentabilidad total');

  /* El valor también se repinta: el porcentaje sigue la convención del idioma
     —«+67,00 %» frente a «+67.00%»—, así que un hero sin repintar se delata
     también en la cifra y no solo en el rótulo. */
  // El separador es un espacio DURO, que es lo que corresponde en castellano
  // ante el signo de porcentaje. Un espacio normal aquí sería un fallo de
  // composición, así que se exige el duro y no `\s`.
  comp('[hero, es] el porcentaje sigue la convención del idioma',
    heroEs[0].valor, (v) => v && /,\d+\u00a0%$/.test(v));
  comp('[hero, en] el porcentaje seguía la suya', heroEn[0].valor, (v) => v && /\.\d+%$/.test(v));

  // Año y total dicen lo mismo que sus gemelas de abajo, en el idioma
  // vigente. El índice no tiene gemela —ver el porqué más arriba— y queda
  // fuera de este recorrido a propósito, no por omisión.
  const abajoEs = await celdas();
  const gemela = (et) => abajoEs.find((c) => c.etiqueta === et || `${c.etiqueta} · ${c.nota}` === et);
  for (const c of [heroEs[0], heroEs[2]]) {
    comp(`[hero, es] «${c.etiqueta}» dice lo mismo que su gemela de abajo`,
      gemela(c.etiqueta)?.valor ?? null, c.valor);
  }

  comp('ninguna cifra retenida por suelo de muestra llega al hero',
    (await txt('#hero-metricas')) ?? '', (v) => !RETENIDAS.test(v));
  }
  }

  if (errores.length) {
    const IMAGEN_INVESTING_403 = /Failed to load resource.*403/;
    if (errores.every((e) => IMAGEN_INVESTING_403.test(e))) {
      E.pendiente('la consola no reporta errores',
        'investing.com bloquea el hotlink de imagen desde el navegador — ver la nota de cabecera');
    } else {
      E.fallo('la consola no reporta errores', `${errores.length} error(es)`);
    }
    console.log('\n  errores de consola:');
    for (const e of errores.slice(0, 5)) console.log(`    ${e}`);
  }

  /* ── Movimiento reducido en noticias: sin @starting-style, sin fundido ──
     `pintarNoticias()` reconstruye la lista entera al cambiar de filtro, y
     desde el rediseño 2 las filas nuevas entran con `@starting-style`
     (opacity 0 → 1, scale 0.97 → 1, ver `estilos.css`). Con movimiento
     reducido eso no debe verse: las filas han de aparecer YA en su estado
     final, sin transición que interpolar. Contexto aparte con
     `reducedMotion: 'reduce'` —el resto de la batería comparte una sola
     página sin esa emulación—, así que no comparte `p` con el resto del
     fichero. CLAUDE.md § Diseño 8. */
  {
    const ctxRM = await navegador.newContext({
      viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce',
    });
    const pRM = await ctxRM.newPage();
    await pRM.goto(`${B}/#/noticias`, { waitUntil: 'domcontentloaded' });

    const NOMBRE = 'movimiento reducido en noticias: las filas aparecen sin animación';

    const hayFilas = await E.esperarDatos(pRM,
      () => document.querySelectorAll('#seccion-noticias .fila-noticia').length > 0, null,
      { nombre: NOMBRE, motivo: 'la base no trae noticias: no hay filas que filtrar' });

    if (hayFilas) {
      const resumenAntes = await pRM.locator('#resumen-noticias').innerText().catch(() => null);
      await pRM.selectOption('#filtro-noticias-categoria', { index: 1 });

      const cambio = await E.esperarDatos(pRM,
        (antes) => document.querySelector('#resumen-noticias')?.textContent !== antes,
        resumenAntes,
        { nombre: NOMBRE, motivo: 'el filtro no cambió el recuento: solo hay una categoría en la base' });

      if (cambio) {
        const est = await pRM.evaluate(() => {
          const fila = document.querySelector('#seccion-noticias .fila-noticia');
          if (!fila) return null;
          const cs = getComputedStyle(fila);
          return { opacidad: cs.opacity, transform: cs.transform, transicion: cs.transitionProperty };
        });
        const bien = est !== null && est.opacidad === '1' && est.transform === 'none'
          && est.transicion === 'none';
        if (bien) E.acierto(NOMBRE);
        else E.fallo(NOMBRE, JSON.stringify(est));
      }
    }
    await ctxRM.close();
  }

  await navegador.close();

  /* Tres salidas y no dos, por la misma razón que `dependencias.js` reserva el 2
     a «no se ha podido ejecutar»: una comprobación que no llegó a hacerse no es
     un aprobado, y anunciarla como tal es presentar por bueno un resultado que
     nadie puede justificar —el mismo defecto que la plataforma evita con los
     datos de mercado—. Verde solo cuando todo se midió. */
  process.exit(E.cerrar());
})();
