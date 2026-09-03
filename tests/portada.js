'use strict';

/* ============================================================================
   Encuadre del banner de portada — que la secuencia entera quepa sobre el
   pliegue en las ventanas que se comprueban, y que la cinta —lo último de la
   secuencia— nunca quede a medias.

   ═══ Por qué este fichero es una reescritura, no un ajuste ═══

   La versión anterior verificaba `seguirEncuadreBanner()`, la constante
   `BANNER` y las clases `.portada`/`.portada__cifras`/`data-banner` —el
   mecanismo que encuadraba una foto de hero por JS, con histéresis, y crecía
   el hero cuando el recorte no llegaba. Ese mecanismo se retiró en Fase D.6
   (lo dice `public/portada.js` en su propio comentario), y el hero volvió a
   rediseñarse en Fase D.9→D.12 sobre clases `.manifiesto`/`.manifiesto__visual`
   que no comparten ni un selector con las que esta batería comprobaba. La
   prueba vieja no fallaba en rojo: se caía con un `Timeout 30000ms exceeded`
   sin capturar, esperando para siempre un `#portada[data-banner]` que ningún
   código escribe ya. Llevaba así desde que Fase D.9 landeó —nadie la había
   vuelto a correr entre medias—.

   El mecanismo de hoy no tiene presupuesto que ceder ni histéresis: es CSS
   puro. `.manifiesto__visual` tiene una altura fija por `clamp()` —una según
   el ANCHO de ventana, una según el ANCHO Y EL ALTO para ventanas bajas—, la
   cinta se solapa un valor fijo (`-44px`) sobre el pie de la foto, y el árbol
   se mantiene centrado en su banda con un `object-position` estático. No hay
   nada que remedir en píxeles del fichero de la foto: `object-position` no
   depende de dónde caiga el árbol en `banner.jpg`, así que esta batería ya no
   comprueba eso —lo comprobaba la versión con histéresis, que ya no existe—.

   Lo que SÍ hace falta seguir afirmando, con el mecanismo de hoy, es lo que
   esta batería cazó al escribirse: a 1440×700 y 1920×700 —dos de las seis
   ventanas de la matriz, precisamente las que la lógica retirada existía para
   cubrir— la cinta caía 77px y 14px por debajo del alto de ventana. Ninguna
   regla la remediaba, porque la franja de foto solo respondía al ancho, nunca
   al alto. Se corrigió con una regla de altura en `estilos.css`
   (`@media (min-width: 1024px) and (max-height: 820px)`); esta batería es la
   que se hubiera roto si esa corrección se deshace.

   Solo lee: no escribe en la base.

       BASE_PRUEBA=http://127.0.0.1:4174 npm run test:portada
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');
const { crearTercerEstado } = require('./tercer-estado');

const { chromium } = exigirPlaywright('encuadre del banner de portada');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

/* Las seis ventanas de siempre, más dos portátiles comunes fuera de la
   matriz —1280×720 y 1440×816— que fueron el motivo empírico para fijar el
   umbral de la regla de altura: sin ellas, un umbral que solo cupiera las
   seis oficiales podría seguir dejando fuera resoluciones reales frecuentes. */
const VENTANAS = [
  { n: '1440×900',  w: 1440, h: 900 },
  { n: '1680×1050', w: 1680, h: 1050 },
  { n: '1920×880',  w: 1920, h: 880 },
  { n: '1440×700',  w: 1440, h: 700 },
  { n: '1920×700',  w: 1920, h: 700 },
  { n: '2560×800',  w: 2560, h: 800 },
  { n: '1280×720 (portátil, fuera de la matriz oficial)',  w: 1280, h: 720 },
  { n: '1440×816 (portátil, fuera de la matriz oficial)',  w: 1440, h: 816 },
];

const E = crearTercerEstado(B);
const CIFRAS_HERO = 'las cifras del hero no se pintan: la base no tiene cartera publicada';
const TICKER_VACIO = 'la cinta no pinta filas: la base no tiene índices ni posiciones';

/**
 * Espera a que la portada esté pintada de verdad: la cinta con sus items —no
 * basta el nodo, que existe vacío desde el documento— y, si hay foto
 * depositada, la franja visible. Nunca lanza: como el resto de la casa,
 * decide con un `if` en vez de con un `try/catch` de última hora.
 */
async function pintada(p) {
  return E.esperarDatos(p, () =>
    document.querySelectorAll('#ticker-pista .ticker__item').length > 0,
    null, { nombre: 'la cinta se pinta', motivo: TICKER_VACIO, plazo: 30000 });
}

/** Lo que se ve, medido en pantalla — nunca lo que el CSS dice que debería medir. */
const medir = (p) => p.evaluate(() => {
  const visual = document.getElementById('hero-visual');
  const ticker = document.getElementById('ticker-mercado');
  const tr = ticker.getBoundingClientRect();
  const item = document.querySelector('#ticker-pista .ticker__item');
  const ir = item ? item.getBoundingClientRect() : null;
  return {
    alto: window.innerHeight,
    visualVisible: visual ? !visual.hidden : false,
    visualAlto: visual ? visual.getBoundingClientRect().height : 0,
    tickerArriba: tr.top,
    tickerAbajo: tr.bottom,
    // El item ha de caber DENTRO del contenedor —que recorta con
    // `overflow: hidden`—, no solo el contenedor dentro de la ventana: las dos
    // cosas se rompen por causas distintas y una prueba que solo mirara una
    // dejaría pasar la otra.
    itemCabeEnTicker: ir ? (ir.top >= tr.top - 0.5 && ir.bottom <= tr.bottom + 0.5) : null,
  };
});

(async () => {
  const navegador = await chromium.launch();
  const errores = [];

  for (const v of VENTANAS) {
    const ctx = await navegador.newContext({ viewport: { width: v.w, height: v.h } });
    const p = await ctx.newPage();
    const erroresVentana = [];
    p.on('pageerror', (e) => erroresVentana.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erroresVentana.push(m.text());
    });

    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });

    if (!await pintada(p)) { await ctx.close(); continue; }
    // El encuadre converge en dos pasadas —la primera puede medir una fila de
    // cifras que aún va a entrar—; dos fotogramas de margen.
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const m = await medir(p);

    // ── La comprobación que motivó esta reescritura ──
    if (m.tickerAbajo <= m.alto + 0.5) {
      E.acierto(`[${v.n}] la cinta entera cabe sobre el pliegue`);
    } else {
      E.fallo(`[${v.n}] la cinta entera cabe sobre el pliegue`,
        `pie de la cinta a ${Math.round(m.tickerAbajo)}px, ventana de ${m.alto}px `
        + `(sobran ${Math.round(m.tickerAbajo - m.alto)}px)`);
    }

    if (m.itemCabeEnTicker === null) {
      E.pendiente(`[${v.n}] el item de la cinta cabe en su contenedor`, TICKER_VACIO);
    } else if (m.itemCabeEnTicker) {
      E.acierto(`[${v.n}] el item de la cinta cabe en su contenedor`);
    } else {
      E.fallo(`[${v.n}] el item de la cinta cabe en su contenedor`,
        `cinta ${Math.round(m.tickerArriba)}–${Math.round(m.tickerAbajo)}, se recorta con overflow:hidden`);
    }

    // La foto es opcional —`cargarMarca()` la deja `hidden` sin banner
    // depositado—, así que su ausencia no es un fallo. Su presencia con
    // altura cero sí lo sería: sería una franja reservada que no muestra nada.
    if (m.visualVisible) {
      if (m.visualAlto > 0) {
        E.acierto(`[${v.n}] la franja de foto tiene alto real`);
      } else {
        E.fallo(`[${v.n}] la franja de foto tiene alto real`, 'visible pero mide 0px');
      }
    }

    // ── Cifras del hero: tercer estado si la base no trae cartera ──
    const cifrasOk = await E.esperarDatos(p, () =>
      document.querySelectorAll('#hero-metricas .dato').length === 3,
      null, { nombre: `[${v.n}] las tres cifras del hero se pintan`, motivo: CIFRAS_HERO, plazo: 10000 });
    if (cifrasOk) E.acierto(`[${v.n}] las tres cifras del hero se pintan`);

    if (erroresVentana.length) errores.push(...erroresVentana.map((e) => `[${v.n}] ${e}`));
    await ctx.close();
  }

  if (errores.length) {
    E.fallo('sin errores de consola', errores.slice(0, 3).join(' | '));
  } else {
    E.acierto('sin errores de consola');
  }

  await navegador.close();
  process.exit(E.cerrar('encuadre del banner de portada'));
})();
