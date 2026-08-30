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

   ═══ Hallazgo conocido, no fallo intermitente ═══

   A 1920×700 el manifiesto asoma 41 px bajo el pliegue y a 2560×800, 52 —hacen
   falta 60 en las dos—: un déficit medido y estable, no un parpadeo entre
   corridas. Viene de dos cambios encadenados de esta misma sesión: retirar la
   pieza de líneas del presupuesto de píxeles (`marcaSola` ya no resta su coste)
   y, después, que la cinta pasara a dos líneas —el rediseño de la cinta de
   mercado en formato píldora—, que le resta más alto disponible al manifiesto
   del que tenía antes. No se ha retocado aquí porque el Bloque 3 —Bento— va a
   reestructurar este mismo presupuesto. Ajustar constantes ahora sería trabajo
   que el Bento probablemente repite. Queda para entonces, no para un retoque
   de paso.
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');
const { crearTercerEstado } = require('./tercer-estado');

const { chromium } = exigirPlaywright('encuadre del banner de portada');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

/* Las cuatro ventanas medidas al diagnosticar, más las que ejercitan los dos
   extremos del mecanismo. `crece` dice si en esa ventana se espera que el hero
   tome altura: es la degradación declarada, y se afirma en las dos direcciones
   —que crece donde debe y que NO crece donde no hace falta—. */
/* La pieza cedible del hero, ventana a ventana. */
const VENTANAS = [
  { n: '1440×900',  w: 1440, h: 900,  crece: false, cifras: true  },
  { n: '1680×1050', w: 1680, h: 1050, crece: false, cifras: true  },
  { n: '1920×880',  w: 1920, h: 880,  crece: true,  cifras: true  },
  // Aquí ya no cabe la fila de cifras.
  { n: '1440×700',  w: 1440, h: 700,  crece: true,  cifras: false },
  { n: '1920×700',  w: 1920, h: 700,  crece: true,  cifras: false },
  { n: '2560×800',  w: 2560, h: 800,  crece: true,  cifras: false },
];

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

/* El tercer estado, con el volcado de esta batería: las cifras del hero salen
   de la cartera, y contra una base sin tesis publicadas no se pintan nunca.
   Esperarlas y caerse con un plantón de 45 s decía que la portada estaba rota
   cuando lo que faltaba eran datos. Se declara pendiente y se sigue. */
const E = crearTercerEstado(B);
const pendiente = (n, motivo) => { R.push({ n, sinDato: true, d: motivo }); };
const CIFRAS_HERO = 'las cifras del hero no se pintan: la base no tiene cartera publicada';
const ASOMO_CORTO = 'déficit conocido, ver la nota de cabecera — pendiente del Bloque 3 (Bento)';
const VENTANAS_ASOMO_CORTO = new Set(['1920×700', '2560×800']);

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

  const filaCifras = po.querySelector('.portada__cifras');
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
    /* La cifra sale del módulo del mecanismo, que es donde vive el observador
       que la usa. Vivía en `inicio.js`; al unificar el revelado se mudó, y esta
       línea lo cazó —«franja muerta undefined» en las seis ventanas—, que es
       exactamente para lo que estaba puesta. */
    margenRevelado: (await import('/movimiento.js')).MARGEN_REVELADO,
    // La fila de cifras del hero: si está puesta, si se ve, y si envuelve.
    cifras: po.dataset.cifras,
    cifrasVisibles: getComputedStyle(filaCifras).visibility === 'visible',
    cifrasEnFlujo: getComputedStyle(filaCifras).position === 'static',
    // Que la fila no envuelva es presupuesto, no estética: envolviendo pasa de
    // 36 a 60 px de alto y el hero medido deja de describirla.
    cifrasRenglones: [...filaCifras.querySelectorAll('.portada__cifras__etiqueta')]
      .map((e) => Math.round(e.getBoundingClientRect().height
        / parseFloat(getComputedStyle(e).lineHeight))),
    cifrasDesborda: filaCifras.scrollWidth > interior.width + 1,
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
       vacía. Es el invariante que justifica que la fila ceda, así que se
       afirma contra la MISMA cifra con la que el hero decide. */
    if (VENTANAS_ASOMO_CORTO.has(v.n)) {
      pendiente(`${v.n} · el manifiesto asoma lo bastante para revelarse`, ASOMO_CORTO);
    } else {
      t(`${v.n} · el manifiesto asoma lo bastante para revelarse`,
        m.asomaEtiqueta !== null && m.asomaEtiqueta > m.margenRevelado,
        `asoman ${m.asomaEtiqueta?.toFixed(0)} px, franja muerta ${m.margenRevelado}`);
    }

    /* ── La fila de cifras del hero, en las dos direcciones ──
       Se pinta donde cabe y desaparece donde no, y «desaparecer» se comprueba
       por lo que ve el usuario —visibilidad— y no solo por el atributo. Se
       afirma en los dos sentidos, porque «no se pinta nunca» pasaría la mitad
       de esta prueba sin pintar jamás una cifra. */
    t(`${v.n} · las cifras ${v.cifras ? 'se pintan porque caben' : 'ceden porque no caben'}`,
      m.cifras === String(v.cifras), `data-cifras="${m.cifras}"`);
    t(`${v.n} · y se ven o no se ven en consecuencia`,
      m.cifrasVisibles === v.cifras && m.cifrasEnFlujo === v.cifras,
      `visibles ${m.cifrasVisibles} · en flujo ${m.cifrasEnFlujo}`);

    /* La fila existe como armazón desde el primer pintado, pero sus rótulos
       solo llegan con la cartera. Sin ellos no hay renglones que contar, y
       decir «envuelve» de una fila vacía sería denunciar la falta de datos. */
    if (v.cifras && m.cifrasRenglones.length === 0) {
      pendiente(`${v.n} · ningún rótulo de la fila envuelve`, CIFRAS_HERO);
    } else if (v.cifras) {
      t(`${v.n} · ningún rótulo de la fila envuelve`,
        m.cifrasRenglones.length === 3 && m.cifrasRenglones.every((n) => n === 1),
        `renglones ${m.cifrasRenglones.join(', ')}`);
      t(`${v.n} · la fila cabe de ancho`, !m.cifrasDesborda);
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

    /* El peldaño de las cifras solo existe si hay cifras. Contra una base sin
       cartera la fila no se pinta nunca, no cede nunca, y las afirmaciones de
       abajo salían en rojo diciendo «ningún cambio»: describían la base, no
       la portada. */
    const hayCifras = await p.evaluate(() =>
      document.querySelectorAll('.portada__cifras__etiqueta').length > 0);

    const estado = async () => {
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      return p.evaluate(() => document.getElementById('portada').dataset.cifras);
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

    const bajadaC = hayCifras ? await barrer(760, 690, -1) : [];
    if (!hayCifras) {
      pendiente('el peldaño de las cifras no oscila', CIFRAS_HERO);
    } else {
    t('bajando, las cifras ceden una sola vez',
      bajadaC.length === 1 && bajadaC[0].a === 'false',
      bajadaC.map((c) => `${c.h}: ${c.de}→${c.a}`).join(' | ') || 'ningún cambio');

    const subidaC = hayCifras ? await barrer(690, 760, 1) : [];
    t('subiendo, las cifras vuelven una sola vez',
      subidaC.length === 1 && subidaC[0].a === 'true',
      subidaC.map((c) => `${c.h}: ${c.de}→${c.a}`).join(' | ') || 'ningún cambio');

    /* La banda, dicha como la nota quien arrastra el borde de la ventana: tras
       ceder, devolver la ventana un poco NO las trae de vuelta. Sin banda, el
       punto de caída y el de vuelta caen en el mismo píxel y esto falla; con el
       barrido de dos en dos que tenía antes, el propio paso disimulaba la
       ausencia de banda y la prueba pasaba en verde. */
    t('las cifras vuelven más arriba de donde cedieron, y no por el paso del barrido',
      bajadaC.length === 1 && subidaC.length === 1 && subidaC[0].h - bajadaC[0].h > 4,
      `cede en ${bajadaC[0]?.h} · vuelve en ${subidaC[0]?.h}`);
    }

    if (bajadaC.length === 1) {
      await p.setViewportSize({ width: 1440, height: bajadaC[0].h });
      const serie = [];
      for (let i = 0; i < 8; i++) serie.push(await estado());
      t('en el punto de cambio de las cifras, el estado no se mueve solo',
        new Set(serie).size === 1, serie.join(','));

      await p.setViewportSize({ width: 1440, height: bajadaC[0].h - 1 });
      await estado();
      await p.setViewportSize({ width: 1440, height: bajadaC[0].h + 4 });
      t('devolver la ventana unos píxeles no las trae de vuelta',
        (await estado()) === 'false', `a ${bajadaC[0].h + 4} px de alto`);
    }
    await ctx.close();
  }

  /* ── Fuera del régimen que la cede, la pieza vuelve ──
     `publicar()` se va de vacío cuando el encuadre no es `cover` —pantalla
     estrecha— o cuando aún no hay foto. Retira lo que sería mentira: una
     fracción y una holgura calculadas con `cover` no describen esa pantalla.

     Pero `data-cifras` se quedaba como estaba, y eso también mentía: decía
     «cedido» donde no hay presupuesto que pagar. Un hero llegado desde una
     ventana apaisada aparecía en el móvil sin cifras habiendo sitio de sobra,
     y no se salía de ahí salvo recargando.

     Se afirma la transición, que es donde vive el fallo: mirar solo una carga
     limpia en móvil no lo caza, porque ahí el atributo nunca llegó a
     ponerse a `false`. */
  {
    console.log('\n  ── fuera del régimen `cover`, la pieza vuelve ──');
    const ctx = await navegador.newContext({ viewport: { width: 1920, height: 700 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await encuadrada(p);

    const estado = () => p.evaluate(() => {
      const po = document.getElementById('portada');
      const c = po.querySelector('.portada__cifras');
      return {
        cifras: po.dataset.cifras,
        cifrasVis: getComputedStyle(c).visibility === 'visible',
        // Lo que sí debe seguir retirado: mentiría sobre esta pantalla.
        fraccion: po.dataset.fraccionBanner ?? null,
        holgura: po.dataset.holguraCinta ?? null,
      };
    });

    const apaisada = await estado();
    t('de partida, 1920×700 tiene la pieza cedida',
      apaisada.cifras === 'false', `cifras ${apaisada.cifras}`);

    await p.setViewportSize({ width: 390, height: 844 });
    // Por condición: se espera a que el encuadre deje de ser `cover`, que es lo
    // que marca la entrada en el otro régimen.
    await p.waitForFunction(() => getComputedStyle(
      document.getElementById('portada-banner')).backgroundSize !== 'cover',
      null, { timeout: 30000 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const movil = await estado();
    t('en móvil vuelve, y se ve',
      movil.cifras === 'true' && movil.cifrasVis,
      `cifras ${movil.cifras}/${movil.cifrasVis}`);
    t('y la fracción y la holgura siguen retiradas, que ahí no describen nada',
      movil.fraccion === null && movil.holgura === null,
      `fracción ${movil.fraccion} · holgura ${movil.holgura}`);

    // Ocho lecturas seguidas: restituir no puede realimentar al observador.
    const serie = [];
    for (let i = 0; i < 8; i++) {
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      const e = await estado();
      serie.push(e.cifras);
    }
    t('y una vez vuelta, el estado no se mueve solo', new Set(serie).size === 1, serie.join(' '));

    // Y es reversible: al volver a la ventana apaisada, vuelve a ceder.
    await p.setViewportSize({ width: 1920, height: 700 });
    await encuadrada(p);
    const vuelta = await estado();
    t('al volver a 1920×700 vuelve a ceder',
      vuelta.cifras === 'false', `cifras ${vuelta.cifras}`);

    await ctx.close();
  }

  /* ── Regla 9 · las cifras del hero y sus gemelas de abajo ──
     Las tres del hero están también en la fila completa que va tras los pilares.
     Es duplicación deliberada, y lo único que la hace legítima es que salgan de
     una sola fuente: el mismo `cartera.estadisticos` y los mismos rótulos de
     diccionario. Afirmarlo es el punto entero del asunto — cada cifra por
     separado es verosímil, y el desacuerdo no se ve navegando porque las dos
     filas casi nunca están a la vez en pantalla.

     Se comprueba en LOS DOS IDIOMAS: los rótulos se pintan en JavaScript, y con
     un solo lado un valor que nunca se repinta puede coincidir por casualidad
     con el de partida. */
  {
    // Una ventana donde las cifras del hero se pintan, para tener las dos filas.
    const ctx = await navegador.newContext({ viewport: { width: 1680, height: 1050 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });

    // Listas: se espera a que las DOS filas tengan sus casillas pintadas.
    const pintadas = () => E.esperarDatos(p, () =>
      document.querySelectorAll('#cifras-hero .portada__cifras__celda').length === 3
      && document.querySelectorAll('#cifras-portada-cuerpo .cinta-metricas__celda').length === 4,
      null, { nombre: 'las dos filas de cifras se pintan', motivo: CIFRAS_HERO,
              plazo: 60000, declarar: pendiente });

    const leer = () => p.evaluate(() => {
      const norm = (x) => x.trim().replace(/\s+/g, ' ');
      const hero = [...document.querySelectorAll('#cifras-hero .portada__cifras__celda')]
        .map((c) => ({ valor: norm(c.querySelector('.portada__cifras__valor').textContent),
                       etiqueta: norm(c.querySelector('.portada__cifras__etiqueta').textContent) }));
      const abajo = [...document.querySelectorAll('#cifras-portada-cuerpo .cinta-metricas__celda')]
        .map((c) => ({ valor: norm(c.querySelector('.cinta-metricas__valor').textContent),
                       etiqueta: norm(c.querySelector('.cinta-metricas__etiqueta').textContent),
                       nota: norm(c.querySelector('.cinta-metricas__nota')?.textContent ?? '') }));
      return { hero, abajo };
    });

    /* ── Geometría de los separadores de la fila del hero ──
       Los filetes entre casillas se dibujan en el BORDE de la casilla, dentro del
       hueco que la rejilla ya reservaba: el relleno los aparta del texto y un
       margen negativo del mismo tamaño devuelve lo que el relleno ocupó. De ahí
       que no cuesten alto —y el alto es lo que paga el pliegue—.

       Lo que se afirma es esa cancelación, no su apariencia. Si alguien retira el
       margen negativo, la fila se ensancha 56 px de golpe y las tres casillas se
       estrujan: nada de eso da error, ninguna prueba de «tiene contenido» lo ve, y
       en pantalla solo se aprecia como un apretón que se achaca a la ventana. */
    const separadores = () => p.evaluate(() => {
      const fila = document.getElementById('cifras-hero');
      const hueco = parseFloat(getComputedStyle(fila).columnGap) || 0;
      const celdas = [...fila.querySelectorAll('.portada__cifras__celda')].map((c) => {
        const s = getComputedStyle(c);
        const r = c.getBoundingClientRect();
        return {
          borde: parseFloat(s.borderInlineStartWidth) || 0,
          relleno: parseFloat(s.paddingInlineStart) || 0,
          margen: parseFloat(s.marginInlineStart) || 0,
          izq: r.left, der: r.right,
        };
      });
      return { hueco, celdas, filaArriba: fila.getBoundingClientRect().top };
    });

    for (const idioma of ['en', 'es']) {
      await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
      await p.reload({ waitUntil: 'domcontentloaded' });
      if (!await pintadas()) break;   // el ctx lo cierra el final del bloque
      const { hero, abajo } = await leer();

      // Las cuatro de abajo son año, total, índice y caída, en ese orden; el hero
      // lleva año, índice y total. Se emparejan por rótulo, no por posición.
      const gemela = (etiqueta) => abajo.find((c) =>
        c.etiqueta === etiqueta || `${c.etiqueta} · ${c.nota}` === etiqueta);

      for (const c of hero) {
        const g = gemela(c.etiqueta);
        t(`[${idioma}] «${c.etiqueta}» tiene gemela abajo`, Boolean(g),
          `rótulos abajo: ${abajo.map((x) => x.etiqueta).join(' / ')}`);
        if (g) {
          t(`[${idioma}] «${c.etiqueta}» dice lo mismo en las dos filas`,
            g.valor === c.valor, `hero ${c.valor} · abajo ${g.valor}`);
        }
      }
      t(`[${idioma}] el hero lleva exactamente tres cifras`, hero.length === 3,
        `lleva ${hero.length}`);

      const { hueco, celdas } = await separadores();

      // Dos filetes para tres casillas, y en las dos ÚLTIMAS: uno en la primera
      // abriría la fila por la izquierda y otro al final la cerraría por la derecha.
      const conFilete = celdas.map((c, i) => (c.borde > 0 ? i : -1)).filter((i) => i >= 0);
      t(`[${idioma}] hay filete entre casillas, y solo entre ellas`,
        conFilete.length === 2 && conFilete[0] === 1 && conFilete[1] === 2,
        `casillas con filete: [${conFilete.join(', ')}]`);

      // El margen negativo devuelve exactamente lo que el relleno ocupó. Sin él,
      // cada filete ensancharía la fila su relleno entero.
      for (const i of conFilete) {
        t(`[${idioma}] el filete ${i} no ensancha la fila`,
          Math.abs(celdas[i].relleno + celdas[i].margen) < 0.5,
          `relleno ${celdas[i].relleno} · margen ${celdas[i].margen}`);
      }

      /* Y la comprobación que no se fía de las dos anteriores: la distancia entre
         el texto de una casilla y el de la siguiente ha de seguir siendo el hueco
         de la rejilla, más el píxel del propio filete. Se mide en pantalla. */
      for (let i = 1; i < celdas.length; i++) {
        const entreTextos = (celdas[i].izq + celdas[i].borde + celdas[i].relleno) - celdas[i - 1].der;
        t(`[${idioma}] entre las casillas ${i - 1} y ${i} sigue habiendo el hueco de siempre`,
          Math.abs(entreTextos - (hueco + celdas[i].borde)) < 1.5,
          `medido ${entreTextos.toFixed(1)} · esperado ${(hueco + celdas[i].borde).toFixed(1)}`);
      }
    }
    await ctx.close();
  }

  /* ══════════ La entrada de las tres cifras: un solo pase, sin coste ══════════
     Tres cosas, y ninguna se deduce de la hoja de estilos —eso sería
     preguntarle a la misma fuente—: se miran los estilos CALCULADOS y la caja
     medida en pantalla.

       1 · que entra escalonada al pintarse;
       2 · que NO vuelve a entrar al cambiar de idioma. Es la garantía de
           producto: estas cifras salen de cierres de sesión y no cambian
           durante el día, de modo que un pase repetido anunciaría dato vivo
           donde no lo hay;
       3 · que la entrada no toca la maquetación. Es lo que protege el
           presupuesto del hero: si `clip-path` u `opacity` movieran un píxel de
           alto, `seguirEncuadreBanner()` mediría una fila distinta durante la
           animación y la decisión de ceder saldría de un hero que ya no existe
           medio segundo después. */
  entrada: {
    const ctx = await navegador.newContext({ viewport: { width: 1680, height: 1050 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });

    const pintadas = () => E.esperarDatos(p, () =>
      document.querySelectorAll('#cifras-hero .portada__cifras__celda').length === 3,
      null, { nombre: 'la fila del hero se pinta', motivo: CIFRAS_HERO,
              plazo: 45000, declarar: pendiente });

    const estado = () => p.evaluate(() => {
      const raiz = document.getElementById('cifras-hero');
      const celdas = [...raiz.querySelectorAll('.portada__cifras__celda')];
      return {
        alto: raiz.getBoundingClientRect().height,
        entrada: raiz.dataset.entrada,
        celdas: celdas.map((c) => {
          const cs = getComputedStyle(c);
          return {
            entra: c.classList.contains('portada__cifras__celda--entra'),
            animacion: cs.animationName,
            retardo: parseFloat(cs.animationDelay) || 0,
            iteraciones: cs.animationIterationCount,
          };
        }),
      };
    });

    if (!await pintadas()) { await ctx.close(); break entrada; }
    const alEntrar = await estado();

    t('la entrada se aplica a las tres casillas',
      alEntrar.celdas.length === 3 && alEntrar.celdas.every((c) => c.entra
        && c.animacion === 'portada-cifra-entra'),
      JSON.stringify(alEntrar.celdas.map((c) => c.animacion)));

    // Escalonada y creciente: 0, 80 y 160 ms. Sin esto entrarían las tres a la vez.
    const retardos = alEntrar.celdas.map((c) => c.retardo);
    t('entra escalonada, y en orden',
      retardos.every((r, i) => i === 0 ? r === 0 : r > retardos[i - 1]),
      `retardos: ${retardos.join(' · ')}`);

    /* Una sola pasada. Con `infinite` —o con cualquier número mayor— la fila
       latiría sola, que es exactamente lo que estas cifras no deben sugerir. */
    t('cada casilla entra una sola vez',
      alEntrar.celdas.every((c) => c.iteraciones === '1'),
      `iteraciones: ${alEntrar.celdas.map((c) => c.iteraciones).join(' · ')}`);

    // Terminada la entrada —160 de retardo más 520 de recorrido—, la fila mide lo
    // mismo que mientras corría. La cifra se mira en los dos momentos.
    await p.waitForTimeout(1200);
    const alReposo = await estado();
    t('la entrada no cambia el alto de la fila',
      Math.abs(alEntrar.alto - alReposo.alto) < 0.5,
      `entrando ${alEntrar.alto.toFixed(1)} · en reposo ${alReposo.alto.toFixed(1)}`);

    /* Y no vuelve. Se cambia de idioma con el conmutador de la interfaz, que es
       lo que repinta de verdad; una recarga sería una carga nueva y entrar
       entonces es lo correcto. Se afirma en los dos idiomas: repintar al inglés
       y volver al castellano son dos repintados, y el pase no ha de volver en
       ninguno de los dos. */
    for (const idioma of ['en', 'es']) {
      await p.click(`.conmutador-idioma button[data-idioma="${idioma}"]`);
      await p.waitForFunction((lg) => document.documentElement.lang === lg, idioma, { timeout: 20000 });
      if (!await pintadas()) break;   // el ctx lo cierra el final del bloque
      const tras = await estado();
      t(`[${idioma}] la entrada no se repite al repintar`,
        tras.celdas.length === 3 && tras.celdas.every((c) => !c.entra),
        `${tras.celdas.filter((c) => c.entra).length} de 3 volvieron a entrar`);
    }
    await ctx.close();
  }

  /* Con movimiento reducido la casilla NO se queda a medio descubrir. El bloque
     general de la hoja acorta toda animación a 0,01 ms, lo que bastaría por sí
     solo; se afirma igualmente el estado final, porque lo que no puede pasar
     —una cifra recortada por la mitad— es peor que la falta de entrada. */
  {
    const ctx = await navegador.newContext({
      viewport: { width: 1680, height: 1050 }, reducedMotion: 'reduce',
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    if (!await E.esperarDatos(p, () =>
      document.querySelectorAll('#cifras-hero .portada__cifras__celda').length === 3,
      null, { nombre: 'con movimiento reducido, la fila del hero se pinta',
              motivo: CIFRAS_HERO, plazo: 45000, declarar: pendiente })) {
      await ctx.close();
    } else {

    const visibles = await p.evaluate(() =>
      [...document.querySelectorAll('#cifras-hero .portada__cifras__celda')].map((c) => {
        const cs = getComputedStyle(c);
        return { recorte: cs.clipPath, opacidad: cs.opacity,
                 animacion: cs.animationName, duracion: parseFloat(cs.animationDuration) || 0 };
      }));

    /* Que se vean enteras no basta como afirmación: también se ven enteras sin
       neutralizar nada, en cuanto la animación termina, de modo que esa sola
       comprobación pasaría con el movimiento reducido roto. Lo que se afirma es
       que NO HAY RECORRIDO —animación retirada, o acortada a nada—, que es la
       propiedad que la preferencia del sistema pide. */
    t('con movimiento reducido no hay recorrido',
      visibles.length === 3 && visibles.every((v) =>
        v.animacion === 'none' || v.duracion <= 0.001),
      JSON.stringify(visibles.map((v) => `${v.animacion} ${v.duracion}s`)));

    t('con movimiento reducido las cifras se ven enteras',
      visibles.length === 3 && visibles.every((v) =>
        (v.recorte === 'none' || v.recorte === 'inset(0px)') && Number(v.opacidad) === 1),
      JSON.stringify(visibles.map((v) => `${v.recorte} ${v.opacidad}`)));
    await ctx.close();
    }
  }

  if (errores.length) {
    t('sin errores de consola', false, errores.slice(0, 3).join(' | '));
  } else {
    t('sin errores de consola', true);
  }

  await navegador.close();
  for (const r of R) {
    if (r.sinDato) { console.log(`    SIN DATO ${r.n}  → ${r.d}\n             base: ${B}`); continue; }
    console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  }
  const mal = R.filter((r) => !r.sinDato && !r.ok).length;
  const sin = R.filter((r) => r.sinDato).length;
  const medidas = R.length - sin;
  if (mal) console.log(`\n  ${mal} fallo(s) de ${medidas}${sin ? ` · ${sin} sin dato` : ''}\n`);
  else if (sin) {
    console.log(`\n  ${medidas} correctas · ${sin} SIN DATO: no se pudieron comprobar.`);
    console.log(`  La base de ${B} no trae las filas que necesitan. No es un aprobado.\n`);
  } else console.log(`\n  ${medidas}/${medidas} correctas\n`);
  process.exit(mal ? 1 : (sin ? 2 : 0));
})();
