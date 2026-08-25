'use strict';

/* ============================================================================
   Encuadre del banner de portada — el árbol entero y la cinta libre.

   El hero mide `75,5 svh − cabecera` y la foto entra con `cover`, cuyo alto sale
   del ANCHO del hero. Las dos cifras no se hablan, de modo que la fracción de la
   foto que se ve era un accidente de la relación de aspecto: a 1440×900 se veía
   el 63,7 % y el árbol salía entero, pero a 1440×700 la cinta lo partía por la
   mitad y a 1920×880 solo asomaba la punta de la copa.

   `seguirEncuadreBanner()` lo resuelve moviendo el recorte, y si el recorte no
   llega, haciendo crecer el hero. Esta batería afirma que lo consigue.

   ═══ Un hecho, una fuente ═══

   La fracción visible, la posición del árbol y la altura de la cinta son el
   mismo hecho dicho tres veces. Aquí se comprueban con tres apoyos distintos, y
   ninguno se apoya en el anterior:

     1 · LA FOTO      `BANNER.copa` y `BANNER.base` contra los píxeles de
                      `banner.jpg`, leídos en un lienzo. Es lo único declarado, y
                      describe un fichero que `public/marca/LEEME.txt` invita a
                      sustituir: cambiada la foto, las fracciones dejan de
                      describirla y hay que volver a medirlas.
     2 · LA PANTALLA  dónde cae el árbol de verdad, calculado desde el rectángulo
                      medido del hero, el de la cinta y el `background-position`
                      que el NAVEGADOR dice estar aplicando. No toca ni una línea
                      de la aritmética del módulo.
     3 · LO PUBLICADO `data-holgura-cinta` y `data-fraccion-banner` contra (2).
                      Un número publicado que la pantalla desmiente es el fallo
                      que esta batería cazó al escribirse: con la cinta medida
                      antes de existir, el módulo publicaba holgura 28 mientras la
                      cinta acababa 24 px POR DEBAJO de la base del árbol.

       BASE_PRUEBA=http://127.0.0.1:4174 npm run test:portada

   Solo lee: no escribe en la base.
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('encuadre del banner de portada');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

/* Las cuatro ventanas medidas al diagnosticar, más las que ejercitan los dos
   extremos del mecanismo. `crece` dice si en esa ventana se espera que el hero
   tome altura: es la degradación declarada, y se afirma en las dos direcciones
   —que crece donde debe y que NO crece donde no hace falta—. */
const VENTANAS = [
  { n: '1440×900',  w: 1440, h: 900,  crece: false, lineas: true },
  { n: '1680×1050', w: 1680, h: 1050, crece: false, lineas: true },
  { n: '1440×700',  w: 1440, h: 700,  crece: true,  lineas: true },
  { n: '1920×880',  w: 1920, h: 880,  crece: false, lineas: true },
  // Muy apaisadas: aquí ni el encuadre ni el crecimiento dejan sitio a las dos
  // líneas del hero, y son ellas las que ceden.
  { n: '1920×700',  w: 1920, h: 700,  crece: true,  lineas: false },
  { n: '2560×800',  w: 2560, h: 800,  crece: true,  lineas: false },
];

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

/**
 * Espera a que la portada esté encuadrada de verdad.
 *
 * Por condición y sobre lo que solo existe ya pintado: el banner activo, la
 * cinta CON sus items —no basta el nodo, que existe vacío desde el documento— y
 * la holgura publicada. Y después dos fotogramas, porque el encuadre converge en
 * dos pasadas y la primera puede medir un hero que aún va a crecer.
 */
async function encuadrada(p) {
  await p.waitForFunction(() => {
    const po = document.getElementById('portada');
    return po?.dataset.banner === 'true'
      && document.querySelectorAll('#ticker-pista .ticker__item').length > 0
      && po.dataset.holguraCinta !== undefined;
  }, null, { timeout: 30000 });
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Apoyo 2 y 3: lo que se ve, y lo que el módulo dice que se ve. */
const medir = (p) => p.evaluate(async () => {
  const { BANNER } = await import('/portada.js');
  const po = document.getElementById('portada');
  const hero = po.getBoundingClientRect();
  const cinta = document.getElementById('ticker-mercado').getBoundingClientRect();
  const interior = po.querySelector('.portada__interior').getBoundingClientRect();
  const est = getComputedStyle(document.getElementById('portada-banner'));

  // El recorte que el NAVEGADOR aplica, no el que el módulo quiso aplicar.
  const encuadre = parseFloat(est.backgroundPosition.split(' ')[1]) / 100;
  // `cover` escala por el lado que se quede corto.
  const fotoAlto = hero.width / hero.height > BANNER.relacion
    ? hero.width / BANNER.relacion : hero.height;
  const fraccion = hero.height / fotoAlto;
  const arriba = encuadre * (1 - fraccion);

  const svh = window.innerHeight;
  const cabecera = document.querySelector('.cabecera').getBoundingClientRect().height;
  const etiqueta = document.querySelector('.manifiesto .etiqueta-superior');

  const bloque = po.querySelector('.portada__lineas');
  const renglones = [...bloque.children].map((l) => Math.round(
    l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)));
  // El asomo se acumula con `offsetTop`: el `translateY` de la aparición mueve el
  // rectángulo y daría una cifra distinta antes y después de revelarse.
  let yEtiqueta = 0;
  for (let n = etiqueta; n; n = n.offsetParent) yEtiqueta += n.offsetTop;

  return {
    alto: hero.height,
    fraccion,
    copa: (BANNER.copa - arriba) * fotoAlto,
    base: (BANNER.base - arriba) * fotoAlto,
    cintaArriba: cinta.top - hero.top,
    interiorAbajo: interior.bottom - hero.top,
    holguraMinima: BANNER.holguraMinima,
    // Lo publicado, para confrontarlo con lo de arriba.
    holguraPublicada: Number(po.dataset.holguraCinta),
    fraccionPublicada: Number(po.dataset.fraccionBanner),
    // Degradación: alto que exige la foto frente al que daría la ventana.
    minimoBanner: parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--alto-minimo-banner')) || 0,
    porVentana: 0.755 * svh - cabecera,
    // El pliegue: qué asoma del manifiesto por debajo del hero.
    asomaEtiqueta: etiqueta ? svh - yEtiqueta : null,
    // La franja muerta del observador que revela el manifiesto. Se importa de
    // donde vive el observador: es la misma cifra con la que el hero decide.
    margenRevelado: (await import('/inicio.js')).MARGEN_REVELADO,
    // Las dos líneas: si están puestas, si se ven, y si envuelven.
    lineas: po.dataset.lineas,
    lineasVisibles: getComputedStyle(bloque).visibility === 'visible',
    lineasEnFlujo: getComputedStyle(bloque).position === 'static',
    renglones,
    textos: [...bloque.children].map((l) => l.textContent.trim()),
  };
});

/**
 * Apoyo 1: las fracciones declaradas contra los píxeles del fichero.
 *
 * Se lee a resolución nativa. Reducir la imagen antes de mirarla promediaría la
 * punta de la copa —una aguja de pocos píxeles— con la nieve que la rodea y la
 * haría desaparecer, que es justo el borde que hay que medir. Se recorre en
 * franjas para no pedir 54 MB de una vez.
 *
 * Una fila cuenta como árbol con seis píxeles oscuros: por debajo es ruido de
 * compresión. La nieve no baja de 216 sobre 255, así que el umbral no es fino.
 */
const medirFichero = (p) => p.evaluate(async () => {
  const { BANNER } = await import('/portada.js');
  const img = new Image();
  img.src = '/marca/banner.jpg';
  await img.decode();

  const W = img.naturalWidth, H = img.naturalHeight;
  const lienzo = document.createElement('canvas');
  lienzo.width = W;
  const FRANJA = 300;
  lienzo.height = FRANJA;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });

  const UMBRAL = 100, MASA = 6;
  let primera = null, ultima = null;
  for (let y0 = 0; y0 < H; y0 += FRANJA) {
    const filas = Math.min(FRANJA, H - y0);
    ctx.clearRect(0, 0, W, FRANJA);
    ctx.drawImage(img, 0, y0, W, filas, 0, 0, W, filas);
    const d = ctx.getImageData(0, 0, W, filas).data;
    for (let y = 0; y < filas; y++) {
      let n = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        // Luminancia aproximada; la foto es prácticamente acromática.
        if ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 < UMBRAL) n++;
      }
      if (n >= MASA) {
        if (primera === null) primera = y0 + y;
        ultima = y0 + y;
      }
    }
  }
  return {
    relacion: W / H,
    copa: primera === null ? null : primera / H,
    base: ultima === null ? null : ultima / H,
    declarada: { relacion: BANNER.relacion, copa: BANNER.copa, base: BANNER.base },
  };
});

(async () => {
  const navegador = await chromium.launch();
  const errores = [];

  // ── Apoyo 1 · lo declarado describe el fichero que hay ──
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await encuadrada(p);

    const f = await medirFichero(p);
    console.log('\n  ── la geometría declarada describe banner.jpg ──');
    /* Tolerancia de 0,012: la copa se midió tomando el primer píxel oscuro y
       aquí se exigen seis, y entre un criterio y otro hay cuatro filas de 3004.
       No absorbe un cambio de fotografía, que mueve estas fracciones décimas. */
    const TOL = 0.012;
    t('la relación declarada es la del fichero',
      f.relacion !== null && Math.abs(f.relacion - f.declarada.relacion) < 0.001,
      `fichero ${f.relacion?.toFixed(4)} · declarada ${f.declarada.relacion.toFixed(4)}`);
    t('la copa declarada es donde empieza el árbol',
      f.copa !== null && Math.abs(f.copa - f.declarada.copa) <= TOL,
      `fichero ${f.copa?.toFixed(4)} · declarada ${f.declarada.copa}`);
    t('la base declarada es donde acaba el árbol',
      f.base !== null && Math.abs(f.base - f.declarada.base) <= TOL,
      `fichero ${f.base?.toFixed(4)} · declarada ${f.declarada.base}`);
    await ctx.close();
  }

  // ── Apoyos 2 y 3 · ventana a ventana ──
  for (const v of VENTANAS) {
    const ctx = await navegador.newContext({ viewport: { width: v.w, height: v.h } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await encuadrada(p);

    const m = await medir(p);
    const holgura = m.cintaArriba - m.base;
    console.log(`\n  ── ${v.n} · fracción ${m.fraccion.toFixed(3)} · hero ${Math.round(m.alto)} px ──`);

    // Un píxel de margen: el hero y la cinta caen en fracciones de píxel.
    t(`${v.n} · la cinta deja al árbol su holgura`,
      holgura >= m.holguraMinima - 1,
      `holgura ${holgura.toFixed(1)} px, mínima ${m.holguraMinima}`);
    t(`${v.n} · la copa entra en cuadro`, m.copa >= 0, `copa a ${m.copa.toFixed(1)} px`);
    t(`${v.n} · la base entra en cuadro`, m.base <= m.alto,
      `base a ${m.base.toFixed(1)} px de un hero de ${m.alto.toFixed(1)}`);
    t(`${v.n} · los accesos no se sientan sobre la copa`,
      m.copa >= m.interiorAbajo - 1,
      `copa a ${m.copa.toFixed(1)} · accesos hasta ${m.interiorAbajo.toFixed(1)}`);

    // Regla 9: lo publicado y lo que se ve son el mismo hecho.
    t(`${v.n} · la holgura publicada es la que se ve`,
      Math.abs(m.holguraPublicada - holgura) <= 1.5,
      `publicada ${m.holguraPublicada} · medida ${holgura.toFixed(1)}`);
    t(`${v.n} · la fracción publicada es la que se ve`,
      Math.abs(m.fraccionPublicada - m.fraccion) <= 0.002,
      `publicada ${m.fraccionPublicada} · medida ${m.fraccion.toFixed(4)}`);

    /* La degradación declarada: primero se mueve el encuadre —gratis— y solo si
       no llega crece el hero, que cuesta pliegue. Se afirma en las dos
       direcciones: donde no hace falta, el hero es exactamente el de la ventana. */
    const crecio = m.alto > m.porVentana + 1;
    t(`${v.n} · el hero ${v.crece ? 'crece porque el encuadre no llega' : 'NO crece: el encuadre basta'}`,
      crecio === v.crece,
      `hero ${m.alto.toFixed(0)} · por ventana ${m.porVentana.toFixed(0)} · exige ${m.minimoBanner}`);
    /* Crecer se paga en pliegue, y el pago tiene un suelo: lo que asome dentro de
       la franja muerta del observador NO llega a revelarse y aparecería una caja
       vacía. Es el invariante que justifica que las líneas cedan, así que se
       afirma contra la MISMA cifra con la que el hero decide. */
    t(`${v.n} · el manifiesto asoma lo bastante para revelarse`,
      m.asomaEtiqueta !== null && m.asomaEtiqueta > m.margenRevelado,
      `asoman ${m.asomaEtiqueta?.toFixed(0)} px, franja muerta ${m.margenRevelado}`);

    /* ── Las dos líneas del hero, en las dos direcciones ──
       Se pintan donde caben y desaparecen donde no, y «desaparecer» se comprueba
       por lo que ve el usuario —visibilidad— y no solo por el atributo. */
    t(`${v.n} · las líneas ${v.lineas ? 'se pintan porque caben' : 'ceden porque no caben'}`,
      m.lineas === String(v.lineas), `data-lineas="${m.lineas}"`);
    t(`${v.n} · y se ven o no se ven en consecuencia`,
      m.lineasVisibles === v.lineas && m.lineasEnFlujo === v.lineas,
      `visibles ${m.lineasVisibles} · en flujo ${m.lineasEnFlujo}`);

    /* El presupuesto: envolviendo cuestan 120 px de hero en vez de 50, y con 120
       no caben en ninguna ventana apaisada. Se afirma sobre el texto realmente
       pintado, de modo que una traducción larga se caza aquí y no en producción. */
    if (v.lineas) {
      t(`${v.n} · ninguna de las dos líneas envuelve`,
        m.renglones.every((n) => n === 1), `renglones ${m.renglones.join(' y ')}`);
    }

    await ctx.close();
  }

  /* ── La decisión no oscila ──
     En el límite exacto, un píxel de ventana mueve el asomo 0,755 px: sin banda
     de histéresis las líneas parpadearían al redimensionar. Se barre el umbral
     píxel a píxel en las dos direcciones y se exige que el cambio ocurra UNA vez
     en cada sentido, que el punto de vuelta esté por encima del de caída —eso es
     la banda— y que en el punto justo de caída el estado no se mueva por sí solo.

     Se vio fallar: sin banda, y midiendo el bloque oculto con `display: none`
     —que lo deja a cero y hace que el coste parezca nulo—, la bajada y la subida
     acumulan cambios en el mismo píxel. */
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 760 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await encuadrada(p);

    const estado = async () => {
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      return p.evaluate(() => document.getElementById('portada').dataset.lineas);
    };
    const barrer = async (desde, hasta, paso) => {
      const cambios = [];
      let previo = null;
      for (let h = desde; paso > 0 ? h <= hasta : h >= hasta; h += paso) {
        await p.setViewportSize({ width: 1440, height: h });
        const e = await estado();
        if (previo !== null && e !== previo) cambios.push({ h, de: previo, a: e });
        previo = e;
      }
      return cambios;
    };

    console.log('\n  ── la decisión no oscila (barrido a 1440 px de ancho) ──');
    const bajada = await barrer(720, 660, -1);
    t('bajando, las líneas ceden una sola vez',
      bajada.length === 1 && bajada[0].a === 'false',
      bajada.map((c) => `${c.h}: ${c.de}→${c.a}`).join(' | ') || 'ningún cambio');

    const subida = await barrer(660, 730, 1);
    t('subiendo, vuelven una sola vez',
      subida.length === 1 && subida[0].a === 'true',
      subida.map((c) => `${c.h}: ${c.de}→${c.a}`).join(' | ') || 'ningún cambio');

    /* La banda, dicha como la nota quien arrastra el borde de la ventana: tras
       ceder, devolver la ventana un poco NO las trae de vuelta. Sin banda, el
       punto de caída y el de vuelta caen en el mismo píxel y esto falla; con el
       barrido de dos en dos que tenía antes, el propio paso disimulaba la
       ausencia de banda y la prueba pasaba en verde. */
    t('vuelven más arriba de donde cedieron, y no por el paso del barrido',
      bajada.length === 1 && subida.length === 1 && subida[0].h - bajada[0].h > 4,
      `cede en ${bajada[0]?.h} · vuelve en ${subida[0]?.h}`);

    if (bajada.length === 1) {
      await p.setViewportSize({ width: 1440, height: bajada[0].h - 1 });
      await estado();
      await p.setViewportSize({ width: 1440, height: bajada[0].h + 4 });
      t('devolver la ventana unos píxeles no las trae de vuelta',
        (await estado()) === 'false', `a ${bajada[0].h + 4} px de alto`);
    }

    // Y en el punto justo del cambio, quieto es quieto.
    if (bajada.length === 1) {
      await p.setViewportSize({ width: 1440, height: bajada[0].h });
      const serie = [];
      for (let i = 0; i < 8; i++) serie.push(await estado());
      t('en el punto de cambio, el estado no se mueve solo',
        new Set(serie).size === 1, serie.join(','));
    }
    await ctx.close();
  }

  if (errores.length) {
    t('sin errores de consola', false, errores.slice(0, 3).join(' | '));
  } else {
    t('sin errores de consola', true);
  }

  await navegador.close();
  for (const r of R) console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
