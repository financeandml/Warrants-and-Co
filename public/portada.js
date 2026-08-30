/* ============================================================================
   Portada — movimiento discreto al servicio del contenido.

   Tres piezas: la aparicion escalonada de los bloques, la cinta de cotizaciones
   y la entrada de las tres cifras del hero. Las tres se desactivan si el sistema
   pide movimiento reducido.

   ── Que el hero anime, y como ──
   Antes no animaba nada, y aqui se leia que la quietud sostenia la composicion
   mejor que cualquier entrada. Ya no es cierto: las tres cifras se descubren al
   pintarse. Lo que sigue siendo cierto es el limite, y por eso se escribe.

   La entrada es UN SOLO PASE y no cuenta la cifra. Esos numeros salen de cierres
   de sesion y no cambian durante el dia: repetirlos en bucle anunciaria dato vivo
   donde no lo hay, y contarlos de cero enseñaria cuarenta rentabilidades que
   nunca fueron ciertas antes de llegar a la buena. Se descubre la definitiva.

   La entrada vive entera en `estilos.css` —`portada-cifra-entra`—, y lo unico
   que pone `pintarCifrasHero()` es el orden y la marca de que ya se hizo. El
   contador que hubo aqui se retiro: estaba exportado, no lo importaba nadie, y
   era lo unico que escribia el `data-contando` que la hoja de estilos miraba.

   Lo que el hero sigue sin hacer es moverse DESPUES de entrar. Con la fotografia
   detras, la quietud sostiene la composicion; una cifra que se reanima sola seria
   ademas una promesa de dato vivo que este bloque no puede cumplir.
   ========================================================================= */

import { localeFormato, formatearPorcentaje } from './formato.js';
import { t } from './i18n.js';
import { MARGEN_REVELADO, sinMovimiento } from './movimiento.js';


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
 * primero. Medido con Jost —la geométrica de los titulares—: a 1920×700 el hero
 * crece hasta 509 px y siguen asomando 122; a 2560×800, hasta 594 y asoman 137.
 *
 * Son una FOTOGRAFÍA, no un contrato: cambian con la cara tipográfica y con el
 * bloque de marca. Lo que sí es contrato, y lo afirma `tests/portada.js`, es que
 * el hero CREZCA en esas ventanas y que la holgura no baje nunca de 28.
 * (El README daba 505 y 588 para estas mismas dos medidas y este comentario
 * daba 523 y 596: el mismo hecho con dos fuentes, y las dos desactualizadas.
 * Ahora sale de aquí, y el README remite.)
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
  const cifras = portada.querySelector('.portada__cifras');
  const lineas = portada.querySelector('.portada__lineas');

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
  /* Solo escribe si cambia: reescribir el mismo atributo despierta al observador
     de mutaciones sin que nada se haya movido. Misma disciplina que `fijar()`. */
  const marcar = (nombre, valor) => {
    if (portada.dataset[nombre] !== valor) portada.dataset[nombre] = valor;
  };

  /*
   * Salir del cálculo devolviendo las dos piezas cedibles.
   *
   * Los `delete` retiran lo que sería mentira: una fracción y una holgura
   * calculadas con `cover` no describen una pantalla que no usa `cover`. Pero
   * `data-lineas` y `data-cifras` también mentían al quedarse como estaban:
   * decían «cedido» donde no hay presupuesto que pagar. Un hero llegado desde
   * una ventana apaisada aparecía en el móvil sin líneas y sin cifras habiendo
   * sitio de sobra, y no había forma de salir de ahí salvo recargando.
   *
   * Fuera del régimen que las hace ceder, NADA las cede: la banda del árbol, la
   * holgura y la cinta —los tres términos que se pagan con pliegue— son de este
   * cálculo y de ningún otro. De modo que se restituyen, no se dejan.
   */
  const sinPresupuesto = () => {
    delete portada.dataset.fraccionBanner;
    delete portada.dataset.holguraCinta;
    marcar('lineas', 'true');
    marcar('cifras', 'true');
  };

  const publicar = () => {
    // Sin foto no hay banda de árbol que pagar, y el hero es el de la ventana.
    if (portada.dataset.banner !== 'true') { sinPresupuesto(); return; }

    /*
     * Solo se encuadra el régimen que este cálculo modela: `cover`. En pantalla
     * estrecha la hoja de estilos fija `auto 120%` y su propio `50% 0%`, que es
     * otra composición y ya sale con el árbol entero. Publicar aquí una holgura
     * calculada con `cover` sería publicar un número que no describe la pantalla.
     */
    if (getComputedStyle(banner).backgroundSize !== 'cover') { sinPresupuesto(); return; }

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
     * bloque de marca, el cielo hasta la copa, la banda del árbol, la holgura y la
     * cinta. Depende del ANCHO del hero y no de su alto, de modo que publicarlo no
     * puede realimentar el cálculo: crecer no cambia lo exigido.
     */
    const minimoDe = (bloqueDeMarca) => Math.ceil(
      bloqueDeMarca + (BANNER.base - BANNER.copa) * fotoAlto + BANNER.holguraMinima + cintaAlto);

    /*
     * ── Las dos piezas cedibles: un término más de esta misma cuenta ──
     *
     * Las dos líneas y la fila de cifras cuestan alto de bloque de marca, y el
     * bloque entra entero en el mínimo: allí donde el hero ya crecía por la foto,
     * ese coste sale del pliegue. Medido sobre las seis ventanas de
     * `tests/portada.js`: las líneas cuestan 67-76 px sin envolver y las cifras
     * 57-66. Ceden ellas y no la holgura del árbol ni el revelado del manifiesto,
     * porque son lo único de los cuatro que al faltar no rompe nada.
     *
     * El orden en que ceden, y por qué, está justo debajo con la escalera.
     */
    const puestas = portada.dataset.lineas !== 'false';
    const cifrasPuestas = portada.dataset.cifras !== 'false';
    const hueco = parseFloat(getComputedStyle(interior).rowGap) || 0;
    const costeLineas = lineas ? lineas.getBoundingClientRect().height + hueco : 0;
    const costeCifras = cifras ? cifras.getBoundingClientRect().height + hueco : 0;
    /* El bloque de marca desnudo: la misma cifra lleve puestas o no las dos piezas
       cedibles. Se descuenta solo lo que ESTÁ en flujo; lo oculto ya no suma al
       alto del interior, aunque siga maquetado. */
    const marcaSola = interiorAlto
      - (puestas ? costeLineas : 0) - (cifrasPuestas ? costeCifras : 0);

    /*
     * Cuánto asomaría el manifiesto en cada hipótesis, sin pintar ninguna. El hero
     * empuja al manifiesto píxel a píxel, así que basta con saber cuánto asoma
     * ahora y cuánto mediría el hero en cada caso. `--alto-por-ventana` lo publica
     * la hoja de estilos ya resuelto: la fórmula del hero vive allí y solo allí.
     */
    const porVentana = parseFloat(
      getComputedStyle(portada).getPropertyValue('--alto-por-ventana')) || caja.height;
    const asomoAhora = asomoDelManifiesto();

    /* Cuánto asomaría el manifiesto con esta combinación de piezas, sin pintar
       ninguna. El hero empuja al manifiesto píxel a píxel, así que basta con
       saber cuánto asoma ahora y cuánto mediría el hero en cada hipótesis. */
    const asomoSi = (conLineas, conCifras) => {
      if (asomoAhora === null) return null;
      const alto = Math.max(porVentana, minimoDe(
        marcaSola + (conLineas ? costeLineas : 0) + (conCifras ? costeCifras : 0)));
      return asomoAhora + (caja.height - alto);
    };

    /* El renglón de cada pieza: lo que ha de sobrar ADEMÁS para que vuelva una
       que está fuera. No es una cifra elegida, es el alto de línea del propio
       rótulo que ha de asomar, medido. Sin esta banda, un píxel de ventana mueve
       el asomo 0,755 px y bastaría para hacerlas parpadear. */
    const renglonDe = (bloque) => bloque && bloque.firstElementChild
      ? parseFloat(getComputedStyle(bloque.firstElementChild).lineHeight) || 0 : 0;
    const renglonLineas = renglonDe(lineas);
    const renglonCifras = cifras && cifras.firstElementChild
      ? parseFloat(getComputedStyle(
          cifras.firstElementChild.lastElementChild ?? cifras.firstElementChild).lineHeight) || 0
      : 0;

    /* ── La escalera: qué se suelta y en qué orden ──
     *
     * Se prueban las combinaciones de más a menos y se toma la primera que deja
     * asomar el manifiesto. El ORDEN es la decisión de producto: **ceden antes
     * las cifras que las líneas**. Donde no caben las dos cosas se conserva la
     * frase que dice qué es esto y se sueltan los números.
     *
     * Medido, y por eso se escribe aquí: el orden contrario sobrevive un peldaño
     * más —las cifras cuestan 57 px y las líneas 67, de modo que soltar lo caro
     * primero rinde más—, y aun así se descarta. Ganaba una banda de unos 20 px
     * de alto por ancho y perdía que la portada abriese con tres porcentajes y
     * ninguna frase a 1440×700, que es de los tamaños más frecuentes.
     *
     * De las seis ventanas de `tests/portada.js`, los dos órdenes solo difieren
     * en esa: en cuatro cabe todo o no cabe nada, con cualquier orden.
     *
     * ── Por qué no oscila ──
     * Dos cosas, y hacen falta las dos:
     *
     *   1. La ENTRADA de la decisión no depende de la decisión. Se calcula lo que
     *      asomaría CON cada pieza, esté como esté ahora, y para eso los bloques
     *      ocultos siguen maquetados —fuera de flujo, no plegados—. Con
     *      `display: none` medirían cero, el coste parecería nulo, cabrían
     *      siempre, y a la pasada siguiente ya no.
     *   2. Cada pieza que está FUERA necesita un renglón de más para volver. Así
     *      el umbral de entrar es más alto que el de quedarse, y en el límite no
     *      hay ida y vuelta.
     */
    const peldanos = [[true, true], [true, false], [false, false]];
    let conLineas = false, conCifras = false;
    for (const [L, C] of peldanos) {
      const exigido = MARGEN_REVELADO
        + (L && !puestas ? renglonLineas : 0)
        + (C && !cifrasPuestas ? renglonCifras : 0);
      const a = asomoSi(L, C);
      if (a === null || a >= exigido) { conLineas = L; conCifras = C; break; }
    }

    marcar('lineas', String(conLineas));
    marcar('cifras', String(conCifras));

    const minimo = minimoDe(
      marcaSola + (conLineas ? costeLineas : 0) + (conCifras ? costeCifras : 0));

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
    for (const el of [portada, cinta, interior, cifras]) if (el) observador.observe(el);
  } else {
    window.addEventListener('resize', publicar);
  }

  /* El banner es la unica llegada tardia que puede NO cambiar ningun tamano:
     `app.js` lo activa cuando la imagen ha cargado, y hasta entonces `publicar()`
     se va de vacio. */
  new MutationObserver(publicar).observe(portada, { attributeFilter: ['data-banner'] });

  /* ── El cambio de familia es otra llegada tardia ──
     Las fuentes se declaran con `font-display: swap`: el hero se maqueta primero
     con la familia de respaldo y cambia a Inter cuando el fichero llega. La
     primera pasada de `publicar()` mide, por tanto, un hero compuesto con OTRA
     tipografia.

     El ALTO no cambia al cambiar la familia —todos los `line-height` del hero son
     sin unidad, de modo que cada caja mide su `font-size` por su factor y no
     depende de con que se componga—. Lo que cambia es el ANCHO, y el ancho decide
     si las dos lineas envuelven: envolviendo cuestan 120 px de bloque de marca y
     sin envolver 50, que es la diferencia entre cederlas y no cederlas.

     Cuando estan en flujo, el `ResizeObserver` sobre `interior` ya lo recoge. Pero
     cuando han cedido salen del flujo, `interior` no se entera, y su coste —que es
     con lo que se decide si vuelven— se habria medido con la familia equivocada y
     nadie volveria a mirarlo. De ahi este enganche.

     `document.fonts` no existe en navegadores muy antiguos; alli no hay fuente que
     cambiar y el respaldo es lo definitivo, de modo que no medir de nuevo es
     exactamente lo correcto. */
  if (document.fonts?.ready) document.fonts.ready.then(publicar);
}

/**
 * Cuánto asoma la etiqueta del manifiesto por debajo del pliegue.
 *
 * Se acumula `offsetTop` en lugar de leer `getBoundingClientRect()`: la etiqueta
 * entra con un `translateY` de 14 px mientras no se ha revelado, y el rectángulo
 * lo recoge. Medida así, la cifra sería distinta antes y después de revelarse
 * —y la decisión que se toma con ella, también—.
 */
function asomoDelManifiesto() {
  const etiqueta = document.querySelector('.manifiesto .etiqueta-superior');
  if (!etiqueta) return null;
  let y = 0;
  for (let n = etiqueta; n; n = n.offsetParent) y += n.offsetTop;
  return window.innerHeight - y;
}

/** Escribe una variable solo si cambia: evita realimentar a los observadores. */
function fijar(nodo, nombre, valor) {
  if (nodo.style.getPropertyValue(nombre) !== valor) nodo.style.setProperty(nombre, valor);
}

/* Aquí vivía el gemelo de `revelar()`. Se ha retirado: los cinco nodos que
   observaba llevaban además `.revelado`, de modo que había dos observadores
   sobre los mismos elementos con dos umbrales distintos, y mandaba el más laxo
   —justo el que NO respetaba `MARGEN_REVELADO`, la cifra que este fichero usa
   para el presupuesto del hero—. El mecanismo único está en `movimiento.js`. */


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
