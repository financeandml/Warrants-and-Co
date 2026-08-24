/* ============================================================================
   Portada — movimiento discreto al servicio del contenido.

   Dos piezas: la aparicion escalonada de los bloques y la cinta de
   cotizaciones. Ambas se desactivan si el sistema pide movimiento reducido.

   El hero no anima. Con la fotografia detras, la quietud sostiene mejor la
   composicion que cualquier entrada escalonada.
   ========================================================================= */

import { localeFormato, formatearPorcentaje } from './formato.js';
import { t } from './i18n.js';

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Publica la altura real de la cabecera en `--alto-cabecera`.
 *
 * El hero la descuenta para terminar donde debe, y no vale una constante: la
 * cabecera es `position: sticky`, ocupa sitio en el flujo y se reparte en
 * varias filas al estrecharse la ventana —69 px en escritorio, 164 px a 390 px
 * de ancho—. Cambia ademas al cambiar de idioma, porque los rotulos no miden lo
 * mismo en español que en ingles y pueden reordenar el reparto. Medirla es la
 * unica forma de que el hero acabe donde se ha decidido en cualquier ancho.
 */
export function seguirAlturaCabecera() {
  const cabecera = document.querySelector('.cabecera');
  if (!cabecera) return;

  const publicar = () => {
    const alto = Math.round(cabecera.getBoundingClientRect().height);
    if (alto > 0) document.documentElement.style.setProperty('--alto-cabecera', `${alto}px`);
  };

  publicar();
  if ('ResizeObserver' in window) new ResizeObserver(publicar).observe(cabecera);
  else window.addEventListener('resize', publicar);
}

/* ═══════════════════════ Geometría del banner ═══════════════════════════
 *
 * UNA SOLA FUENTE. La fracción de la foto que se ve, dónde cae el árbol y qué
 * altura tiene la cinta son el mismo hecho dicho de tres maneras, y solo una de
 * las tres se escribe aquí:
 *
 *   · la POSICIÓN DEL ÁRBOL se declara —es un hecho del fichero, no del
 *     programa—, y `tests/portada.js` la confronta con los píxeles de
 *     `banner.jpg` leídos en un lienzo. Si alguien deposita otra fotografía
 *     —que es justo lo que invita a hacer `public/marca/LEEME.txt`—, estas
 *     fracciones dejan de describirla y la prueba lo dice;
 *   · la ALTURA DE LA CINTA no se escribe: se mide del DOM en cada pasada;
 *   · la FRACCIÓN VISIBLE no se escribe: se deriva de las dos anteriores y del
 *     tamaño real del hero, y se publica en `data-fraccion-banner` para que
 *     nadie tenga que volver a calcularla.
 *
 * Medido sobre el fichero con un umbral de luminancia de 100 sobre 255: la nieve
 * no baja de 216 y el árbol es lo único oscuro del encuadre.
 */
export const BANNER = {
  // Relación de la fotografía. 4506 × 3004 es 3:2 exacto.
  relacion: 4506 / 3004,
  // Fracción del ALTO de la foto donde empieza la copa y donde acaba la sombra.
  copa: 0.3728,
  base: 0.5430,
  /*
   * Aire mínimo entre la base del árbol y el borde superior de la cinta. No es
   * gusto: por debajo de esto la cinta deja de leerse como una banda apoyada en
   * la nieve y pasa a leerse como un tajo sobre el árbol.
   */
  holguraMinima: 28,
};

/**
 * Encuadra la fotografía para que el árbol salga entero y la cinta no lo pise.
 *
 * ── El problema ──
 * El alto del hero sale de la ventana (`75,5 svh − cabecera`) y el alto al que
 * se dibuja la foto sale del ANCHO del hero, porque `cover` escala por el lado
 * que se quede corto. Las dos cifras no se hablan, de modo que qué fracción de
 * la foto se ve era un accidente de la relación de aspecto de la ventana: a
 * 1440×900 se veía el 63,7 % y el árbol salía entero, pero a 1920×880 solo el
 * 46,5 % y la cinta le cortaba la copa.
 *
 * ── Qué se cede primero ──
 * El orden importa y es deliberado:
 *
 *   1. Se mueve el ENCUADRE. Mientras sobre foto por abajo, bajar el recorte no
 *      cuesta nada: el árbol desciende hasta dejar su holgura y entra además la
 *      línea del horizonte, que antes se quedaba fuera.
 *   2. Si el encuadre no llega —la ventana es tan apaisada que la banda del
 *      árbol, la cinta y el bloque de marca no caben a la vez—, CRECE EL HERO,
 *      con `--alto-minimo-banner`, lo justo y solo en esas ventanas.
 *   3. La holgura NO se cede nunca. La cinta no se sienta sobre el árbol en
 *      ninguna ventana; antes se pierde pliegue, que es lo reversible.
 *
 * Crecer cuesta asomo del manifiesto, y por eso es el segundo recurso y no el
 * primero. Medido: a 1920×700 el hero pasa de 460 a 523 px y siguen asomando
 * 108; a 2560×800, de 535 a 596 y asoman 135.
 *
 * ── Por qué se mide y no se constantiza ──
 * Igual que `--alto-cabecera`: la cinta mide 52 px en escritorio y 48 en móvil,
 * y el bloque de marca cambia con el idioma y con el ancho. Una constante aquí
 * sería la misma clase de fallo que aquel `69px` de la cabecera.
 */
export function seguirEncuadreBanner() {
  const portada = document.getElementById('portada');
  const banner = document.getElementById('portada-banner');
  if (!portada || !banner) return;

  const cinta = document.getElementById('ticker-mercado');
  const interior = portada.querySelector('.portada__interior');

  // Un elemento oculto no tiene caja: `height` ya vale 0. Mirar ademas `hidden`
  // invitaba a creer que una cinta sin pintar valia 0 por decision y no por
  // medida, que es justo la confusion que costo el fallo de abajo.
  const alto = (el) => (el ? el.getBoundingClientRect().height : 0);

  /*
   * Dos llegadas tardias, y las dos se ven como un cambio de TAMANO, que es por
   * lo que basta con observarlo:
   *
   *   · la CINTA aparece cuando su fuente contesta —`pintarTicker()` la revela—,
   *     y hasta entonces mide 0 por no tener caja. Calcular con ella a 0 da un
   *     resultado correcto para un hero sin cinta y falso para el que se vera;
   *   · si el hero CRECE al aplicarse `--alto-minimo-banner`, la fraccion visible
   *     cambia y el encuadre anterior se queda corto.
   *
   * No hace falta encadenar pasadas a mano: el observador vuelve a llamar. Y
   * converge, porque lo exigido depende del ANCHO del hero, de la cinta y del
   * bloque de marca, nunca de su alto: crecer no vuelve a mover el minimo.
   *
   * Que el observador es quien lo sostiene esta comprobado: sin el,
   * `tests/portada.js` cae en doce afirmaciones y publica holgura 28 mientras la
   * cinta acaba 24,5 px POR DEBAJO de la base del arbol.
   */
  const publicar = () => {
    if (portada.dataset.banner !== 'true') {
      delete portada.dataset.fraccionBanner;
      delete portada.dataset.holguraCinta;
      return;
    }

    /*
     * Solo se encuadra el régimen que este cálculo modela: `cover`. En pantalla
     * estrecha la hoja de estilos fija `auto 120%` y su propio `50% 0%`, que es
     * otra composición y ya sale con el árbol entero. Publicar aquí una holgura
     * calculada con `cover` sería publicar un número que no describe la pantalla.
     */
    if (getComputedStyle(banner).backgroundSize !== 'cover') {
      delete portada.dataset.fraccionBanner;
      delete portada.dataset.holguraCinta;
      return;
    }

    const caja = portada.getBoundingClientRect();
    if (!(caja.width > 0 && caja.height > 0)) return;

    const cintaAlto = alto(cinta);
    const interiorAlto = alto(interior);

    // `cover` escala por el lado que se quede corto. Más apaisada que la foto
    // —todo escritorio—, manda el ancho; si no, la foto entra entera de alto.
    const mandaElAncho = caja.width / caja.height > BANNER.relacion;
    const fotoAlto = mandaElAncho ? caja.width / BANNER.relacion : caja.height;
    const fraccion = caja.height / fotoAlto;

    // Dónde ha de acabar la ventana visible para que la base del árbol quede a
    // su holgura por encima de la cinta, y de ahí el recorte que hace falta.
    const abajo = BANNER.base + (cintaAlto + BANNER.holguraMinima) / fotoAlto;
    const sobrante = 1 - fraccion;
    const bruto = sobrante > 0 ? (abajo - fraccion) / sobrante : 0;
    const encuadre = Math.min(Math.max(bruto, 0), 1);

    /*
     * Alto que la foto exige para que quepan, en este orden y sin solaparse: el
     * bloque de marca y accesos, el cielo hasta la copa, la banda del árbol, la
     * holgura y la cinta. Depende del ANCHO del hero y no de su alto, de modo que
     * publicarlo no puede realimentar el cálculo: crecer no cambia lo exigido.
     */
    const minimo = Math.ceil(
      interiorAlto + (BANNER.base - BANNER.copa) * fotoAlto + BANNER.holguraMinima + cintaAlto);

    // Lo que de verdad queda tras recortar el encuadre a [0, 1]. Es la cifra que
    // la prueba confronta con lo medido en pantalla; no se deduce del deseo.
    const baseEnPantalla = (BANNER.base - encuadre * sobrante) * fotoAlto;
    const holgura = caja.height - cintaAlto - baseEnPantalla;

    fijar(document.documentElement, '--alto-minimo-banner', `${minimo}px`);
    fijar(portada, '--encuadre-banner', `${(encuadre * 100).toFixed(3)}%`);
    portada.dataset.fraccionBanner = fraccion.toFixed(4);
    portada.dataset.holguraCinta = String(Math.round(holgura));
  };

  publicar();

  if ('ResizeObserver' in window) {
    const observador = new ResizeObserver(publicar);
    for (const el of [portada, cinta, interior]) if (el) observador.observe(el);
  } else {
    window.addEventListener('resize', publicar);
  }

  /* El banner es la unica llegada tardia que puede NO cambiar ningun tamano:
     `app.js` lo activa cuando la imagen ha cargado, y hasta entonces `publicar()`
     se va de vacio. */
  new MutationObserver(publicar).observe(portada, { attributeFilter: ['data-banner'] });
}

/** Escribe una variable solo si cambia: evita realimentar a los observadores. */
function fijar(nodo, nombre, valor) {
  if (nodo.style.getPropertyValue(nombre) !== valor) nodo.style.setProperty(nombre, valor);
}

/** Revela los bloques marcados a medida que entran en el area visible. */
export function activarApariciones() {
  const elementos = document.querySelectorAll('.aparicion');
  if (!elementos.length) return;

  if (sinMovimiento() || !('IntersectionObserver' in window)) {
    for (const el of elementos) el.dataset.visible = 'true';
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.dataset.visible = 'true';
          observador.unobserve(entrada.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  for (const el of elementos) observador.observe(el);
}

/** Cuenta hasta el valor final de una metrica. */
export function contarHasta(elemento, destino, duracion = 900) {
  const objetivo = Number(destino);
  if (!Number.isFinite(objetivo)) {
    elemento.textContent = String(destino ?? '—');
    return;
  }
  if (sinMovimiento() || objetivo === 0) {
    elemento.textContent = objetivo.toLocaleString(localeFormato());
    return;
  }

  elemento.dataset.contando = 'true';
  const inicio = performance.now();
  const paso = (ahora) => {
    // `avance`, no `t`: `t()` es la traduccion y en este fichero no se tapa.
    const avance = Math.min((ahora - inicio) / duracion, 1);
    // Desaceleracion suave hacia el valor final.
    const suave = 1 - (1 - avance) ** 3;
    elemento.textContent = Math.round(objetivo * suave).toLocaleString(localeFormato());
    if (avance < 1) requestAnimationFrame(paso);
    else {
      elemento.textContent = objetivo.toLocaleString(localeFormato());
      delete elemento.dataset.contando;
    }
  };
  requestAnimationFrame(paso);
}

/**
 * Cinta de cotizaciones. El listado se duplica y la animacion recorre justo la
 * mitad de la pista, de modo que el ciclo encaja sin salto visible.
 */
export function pintarCinta(posiciones, cerradas = []) {
  const cinta = document.getElementById('cinta-cotizaciones');
  const pista = document.getElementById('pista-cotizaciones');
  if (!cinta || !pista) return;

  const lineas = [
    ...posiciones.map((p) => ({
      ticker: p.ticker,
      precio: p.precioActual,
      variacion: p.variacionDiaPct,
      divisa: p.divisa,
      cerrada: false,
    })),
    ...cerradas.map((p) => ({
      ticker: p.ticker,
      precio: p.precioCierre,
      variacion: p.rentabilidadPct,
      divisa: p.divisa,
      cerrada: true,
    })),
  ].filter((l) => Number.isFinite(l.precio));

  pista.textContent = '';
  if (!lineas.length) {
    cinta.hidden = true;
    return;
  }
  cinta.hidden = false;

  const formatear = (v, dec = 2) =>
    Number(v).toLocaleString(localeFormato(), { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const construirGrupo = (ocultoAlLector) => {
    const grupo = document.createElement('div');
    grupo.className = 'cinta-cotizaciones__grupo';
    // El duplicado existe solo para el bucle visual: no debe leerse dos veces.
    if (ocultoAlLector) grupo.setAttribute('aria-hidden', 'true');

    for (const l of lineas) {
      const item = document.createElement('span');
      item.className = `cotiza${l.cerrada ? ' cotiza--cerrada' : ''}`;

      const ticker = document.createElement('span');
      ticker.className = 'cotiza__ticker';
      ticker.textContent = l.ticker;
      item.appendChild(ticker);

      const precio = document.createElement('span');
      precio.className = 'cotiza__precio';
      precio.textContent = formatear(l.precio);
      item.appendChild(precio);

      const variacion = document.createElement('span');
      const v = Number(l.variacion);
      const signo = Number.isFinite(v) ? (v > 0 ? 'positiva' : v < 0 ? 'negativa' : 'nula') : 'nula';
      variacion.className = `cotiza__var variacion variacion--${signo}`;
      variacion.textContent = Number.isFinite(v)
        ? formatearPorcentaje(v)
        : (l.cerrada ? t('cinta.liquidada') : '—');
      item.appendChild(variacion);

      if (l.cerrada) {
        const marca = document.createElement('span');
        marca.className = 'cotiza__var';
        marca.textContent = t('cinta.marcaLiquidada');
        item.appendChild(marca);
      }
      grupo.appendChild(item);
    }
    return grupo;
  };

  pista.appendChild(construirGrupo(false));
  pista.appendChild(construirGrupo(true));
}
