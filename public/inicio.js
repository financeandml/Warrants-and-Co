/* ============================================================================
   Home — la narrativa de Warrants & Co.

   Todo lo que iba debajo de la cinta —research, cartera con retorno
   dominante, riesgo, catalizadores, metodología, "por qué W&Co", firma y
   footer nuevo— se retiró entero: la composición de ocho piezas no
   funcionaba (ver commit de esta eliminación). Home termina hoy justo
   después de la cinta. Lo que queda aquí es el hero: cinta de mercado y
   las tres métricas destacadas.

   `pintarFlujoHome()` sigue aquí, exportada y sin usar: options flow se fue
   con el área de Opciones, pero su HTML sigue en el documento con `hidden`
   (`#home-flujo`), y reabrir el área es devolverle su entrada en
   `PINTORES_INICIO`. `pintarPulso()`, `pintarRadarHome()` y `pintarSignalHome()`
   ya NO tienen ese respaldo: su HTML (`#home-pulse`, `#home-radar`,
   `#home-signal`, agrupados antes en `.bento-home`) se retiró del documento
   antes de esta fase —pagaba espacio reservado sin ningún hijo visible—.
   Siguen exportadas porque no se pidió borrarlas, pero hoy son no-op puro:
   sus `$(...)` no encuentran nodo y devuelven de inmediato. Reabrir
   cualquiera de las tres exige devolver su HTML antes de reactivar su
   entrada en `PINTORES_INICIO`, no solo lo segundo.

   El movimiento está al servicio de la lectura, no al revés. Todo entra una vez
   al aparecer en pantalla y se queda quieto; nada parpadea de forma continua
   salvo la cinta, que es lo único que se comporta como una cinta. Con
   `prefers-reduced-motion` todo aparece ya en su sitio.
   ========================================================================= */

import {
  $, elemento, formatearNumero, formatearFecha, relativo,
  porcentaje, formatearPorcentaje } from './formato.js';
import { sinMovimiento, revelar, observarEntrada } from './movimiento.js';
import { t } from './i18n.js';

/* Se resuelven al pintar, no al cargar el módulo: el idioma puede cambiar
   después y una constante habría quedado congelada en el de arranque. */
const noDisponible = () => t('general.noDisponible');
const sinDatos = () => t('general.sinDatos');

/* Cambio con signo en unidades del propio dato. Un cambio en por ciento no pasa
   por aquí: lo redacta `formatearPorcentaje()`, que sabe dónde va el espacio. */
const conSigno = (v, dec = 2) =>
  Number.isFinite(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatearNumero(Math.abs(v), dec)}` : noDisponible();

/**
 * Rótulo del índice de referencia: su nombre y el ETF con el que se mide.
 *
 * Las dos piezas vienen del servidor. Si no publicara nombre —hoy no ocurre: el
 * catálogo obliga a que todos lo lleven— se rotula el símbolo solo, que es lo
 * único que consta. No se inventa un nombre ni se deja el hueco.
 */
const rotuloIndice = (cartera) =>
  cartera?.benchmarkNombre
    ? t('cartera.benchmark.rotulo',
        { nombre: cartera.benchmarkNombre, simbolo: cartera.benchmark })
    : (cartera?.benchmark ?? noDisponible());

/** Clase de lectura direccional, sin que el color sustituya nunca al signo. */
const claseDireccion = (v) =>
  !Number.isFinite(v) ? 'lectura--nula' : v > 0 ? 'lectura--alza' : v < 0 ? 'lectura--baja' : 'lectura--plana';

// ═══════════════════════════ revelado al entrar ═══════════════════════════
// El mecanismo vive en `movimiento.js`. Vivía aquí, y una copia gemela en
// `portada.js`; allí está escrito qué salía mal de tenerlo dos veces.

/** Cuenta hasta un valor real. Nunca se invoca sobre un dato ausente. */
function contarHasta(nodo, destino, { decimales = 0, duracion = 1100, sufijo = '' } = {}) {
  if (!Number.isFinite(destino)) { nodo.textContent = noDisponible(); return; }
  if (sinMovimiento()) { nodo.textContent = formatearNumero(destino, decimales) + sufijo; return; }

  const inicio = performance.now();
  const paso = (ahora) => {
    // `avance`, no `t`: `t()` es la traducción y en este fichero no se tapa.
    const avance = Math.min((ahora - inicio) / duracion, 1);
    const suave = 1 - (1 - avance) ** 3;
    nodo.textContent = formatearNumero(destino * suave, decimales) + sufijo;
    if (avance < 1) requestAnimationFrame(paso);
    else nodo.textContent = formatearNumero(destino, decimales) + sufijo;
  };
  requestAnimationFrame(paso);
}

/**
 * Como `contarHasta()`, pero para un cambio con signo —una rentabilidad—,
 * formateado con `formatearPorcentaje()`: mismo punto de verdad del formato
 * que usa la cifra ya en reposo, para que el número donde el contador se
 * detiene sea EXACTAMENTE el mismo texto que si no hubiera contado.
 *
 * Excepción documentada de la cláusula 8 de CLAUDE.md: solo para las tres
 * métricas del Hero, que no tienen refresco periódico y cuentan una vez.
 */
function contarPorcentajeHasta(nodo, destino, duracion = 1100) {
  delete nodo.dataset.contado;
  if (!Number.isFinite(destino)) { nodo.textContent = noDisponible(); nodo.dataset.contado = 'true'; return; }
  if (sinMovimiento()) { nodo.textContent = formatearPorcentaje(destino); nodo.dataset.contado = 'true'; return; }

  const inicio = performance.now();
  const paso = (ahora) => {
    const avance = Math.min((ahora - inicio) / duracion, 1);
    const suave = 1 - (1 - avance) ** 3;
    nodo.textContent = formatearPorcentaje(destino * suave);
    if (avance < 1) requestAnimationFrame(paso);
    else { nodo.textContent = formatearPorcentaje(destino); nodo.dataset.contado = 'true'; }
  };
  requestAnimationFrame(paso);
}

// ═══════════════════════════════ 1 · TICKER ═══════════════════════════════

/* Las líneas de la cinta, construidas UNA vez.
   Las usan el primer pintado y el refresco. Dos constructores distintos serían
   dos fuentes del mismo hecho, y el día que discreparan la cinta refrescada
   diría algo que la recién pintada no dice —sin que nada diera error—. */
function lineasDeTicker(indices, cartera) {
  const lineas = [];

  for (const i of indices?.indices ?? []) {
    lineas.push({
      etiqueta: i.nombre,
      valor: i.disponible ? i.valor : null,
      decimales: 2,
      // Un tipo de interés se enuncia en por ciento; un nivel de índice, no.
      esTipo: i.formato === 'tipo',
      variacion: i.disponible ? i.variacionPct : null,
      // Compañías está oculta hoy: sin destino, la celda no es clicable. Ver
      // AREAS en navegacion.js — reabrir el área es devolver aquí el destino.
      destino: null,
      clave: `i:${i.clave ?? i.simbolo ?? i.nombre}`,
      // El sparkline pide el ticker que reconoce el endpoint de históricos
      // —con su circunflejo de índice—, no el de cotización en vivo: son el
      // mismo instrumento, dos convenciones de símbolo distintas.
      simbolo: i.simboloHistorico ?? i.simbolo ?? null,
    });
  }

  for (const p of cartera?.posiciones ?? []) {
    lineas.push({
      etiqueta: p.ticker,
      valor: Number.isFinite(p.precioActual) ? p.precioActual : null,
      decimales: 2,
      esTipo: false,
      variacion: Number.isFinite(p.variacionDiaPct) ? p.variacionDiaPct : null,
      // Cada valor tenía ficha propia en Compañías, hoy oculta: sin destino,
      // la celda no es clicable. Ver el comentario del índice, arriba.
      destino: null,
      clave: `p:${p.ticker}`,
      simbolo: p.ticker,
    });
  }

  return lineas;
}

/* ── El texto de cada celda, escrito UNA vez ──
   Las usan el primer pintado y el refresco. Si cada uno formateara por su cuenta,
   dos formas del mismo número —«1.234,5» y «1234.50»— se leerían como un cambio
   y la cinta se movería sin que el mercado hubiera hecho nada. El refresco decide
   comparando texto contra texto, de modo que la comparación solo significa algo
   si el texto sale del mismo sitio en los dos casos. */
const textoValor = (l) => (l.valor === null ? noDisponible()
  : l.esTipo ? porcentaje(l.valor, l.decimales) : formatearNumero(l.valor, l.decimales));

const textoVariacion = (l) => (l.variacion === null ? noDisponible()
  : formatearPorcentaje(l.variacion));

/**
 * Sustituye un valor que ha cambiado: sale hacia arriba, entra desde abajo.
 *
 * Devuelve si hubo cambio. Los dos tramos se encadenan por `animationend` y no
 * por temporizador: con la pestaña de fondo el reloj se estira y el texto
 * cambiaría fuera de tiempo.
 *
 * Con movimiento reducido NO se anima, y el texto se pone de una vez. No es solo
 * cortesía: la hoja apaga esa animación con `animation: none`, y sin animación
 * `animationend` NO SE DISPARA. Encadenado a él, el valor se quedaría congelado
 * en la cifra vieja para siempre, que es peor que cualquier movimiento.
 */
function sustituirValor(nodo, texto, prefijo) {
  if (!nodo || nodo.textContent === texto) return false;

  if (sinMovimiento()) { nodo.textContent = texto; return true; }

  const sale = `${prefijo}--sale`;
  const entra = `${prefijo}--entra`;
  nodo.classList.remove(entra);
  nodo.classList.add(sale);
  nodo.addEventListener('animationend', function salida() {
    nodo.removeEventListener('animationend', salida);
    nodo.textContent = texto;
    nodo.classList.remove(sale);
    nodo.classList.add(entra);
    nodo.addEventListener('animationend', function llegada() {
      nodo.removeEventListener('animationend', llegada);
      nodo.classList.remove(entra);
    });
  }, { once: false });
  return true;
}

/* ── El sparkline: siempre con datos reales, nunca con una curva fabricada ──
   `/api/mercado/serie/:simbolo` publica cierres diarios reales. Hoy el
   proveedor conectado no tiene histórico para los índices —VIX, NDX, SPX,
   US10Y fallan con «crumb inválido»—, así que su celda cae a `serieSimple()`:
   una recta de dos puntos, los dos reales, no la curva con forma de tendencia
   que tendría una serie inventada. Un ticker de cartera consigue casi siempre
   la serie completa.

   La caché es por símbolo y vive mientras dure la página: la cinta no vuelve
   a pedir la serie en cada refresco de 20 s, solo la tendencia de precio, que
   sí cambia sesión a sesión y no minuto a minuto. */
const cacheSparkline = new Map();

function obtenerSerieSparkline(simbolo) {
  if (!cacheSparkline.has(simbolo)) {
    cacheSparkline.set(simbolo, fetch(`/api/mercado/serie/${encodeURIComponent(simbolo)}?dias=20`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.disponible && Array.isArray(d.serie) && d.serie.length >= 2 ? d.serie : null))
      .catch(() => null));
  }
  return cacheSparkline.get(simbolo);
}

const NS_SVG = 'http://www.w3.org/2000/svg';
// Único por instancia: dos sparklines en el documento a la vez —la cinta se
// duplica para el bucle— no pueden compartir id de degradado, o el segundo
// robaría el relleno del primero en algunos navegadores.
let idGradienteSiguiente = 0;

/**
 * Construye el trazado SVG de la miniserie, con su área degradada debajo.
 * Sin `innerHTML`: cada nodo se crea por su cuenta, como exige la CSP.
 *
 * El color no es del día —la variación diaria que ya lleva la celda, con su
 * propio signo— sino del PERIODO que el propio trazo dibuja: si la sesión más
 * antigua de la ventana cotizaba por debajo de la más reciente, sube. Es
 * decorativo y redundante con el signo que ya está escrito al lado, nunca la
 * única forma de leer la dirección: la regla 1 de CLAUDE.md lo exige. El
 * relleno es la misma redundancia con más superficie, no un dato aparte.
 */
function construirSparkline(valores, clasePrefijo = 'ticker__grafico') {
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;
  const ANCHO = 56, ALTO = 24;

  const coordenadas = valores.map((v, i) => [
    (i / (valores.length - 1)) * ANCHO,
    ALTO - ((v - minimo) / rango) * ALTO,
  ]);
  const puntos = coordenadas.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const svg = document.createElementNS(NS_SVG, 'svg');
  svg.setAttribute('class', clasePrefijo);
  svg.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const cambio = valores[valores.length - 1] - valores[0];
  const modificador = cambio > 0 ? 'alza' : cambio < 0 ? 'baja' : 'plana';

  // El degradado: del color del trazo, tenue arriba, transparente abajo.
  const idGradiente = `sparkline-degradado-${idGradienteSiguiente++}`;
  const defs = document.createElementNS(NS_SVG, 'defs');
  const gradiente = document.createElementNS(NS_SVG, 'linearGradient');
  gradiente.setAttribute('id', idGradiente);
  gradiente.setAttribute('x1', '0'); gradiente.setAttribute('x2', '0');
  gradiente.setAttribute('y1', '0'); gradiente.setAttribute('y2', '1');

  const paradaArriba = document.createElementNS(NS_SVG, 'stop');
  paradaArriba.setAttribute('offset', '0%');
  paradaArriba.setAttribute('stop-opacity', '0.32');
  paradaArriba.setAttribute('class', `${clasePrefijo}__parada ${clasePrefijo}__parada--${modificador}`);
  const paradaAbajo = document.createElementNS(NS_SVG, 'stop');
  paradaAbajo.setAttribute('offset', '100%');
  paradaAbajo.setAttribute('stop-opacity', '0');
  paradaAbajo.setAttribute('class', `${clasePrefijo}__parada ${clasePrefijo}__parada--${modificador}`);
  gradiente.appendChild(paradaArriba);
  gradiente.appendChild(paradaAbajo);
  defs.appendChild(gradiente);
  svg.appendChild(defs);

  // El área: la misma línea, cerrada hacia abajo. Puramente decorativa —el
  // contorno ya la dibuja el trazo— así que no lleva `aria` propio.
  const areaPuntos = `${puntos} ${ANCHO.toFixed(1)},${ALTO.toFixed(1)} 0,${ALTO.toFixed(1)}`;
  const area = document.createElementNS(NS_SVG, 'polygon');
  area.setAttribute('points', areaPuntos);
  area.setAttribute('fill', `url(#${idGradiente})`);
  area.setAttribute('class', `${clasePrefijo}__area`);
  svg.appendChild(area);

  const linea = document.createElementNS(NS_SVG, 'polyline');
  linea.setAttribute('points', puntos);
  linea.setAttribute('class', `${clasePrefijo}__linea ${clasePrefijo}__linea--${modificador}`);
  svg.appendChild(linea);
  return svg;
}

/**
 * Serie de respaldo cuando el proveedor no tiene histórico del símbolo —hoy,
 * los cuatro índices—: una recta de DOS puntos reales, nunca una curva
 * inventada. El cierre de ayer no lo publica nadie directamente, pero sale de
 * dos cifras que sí se publican —el precio actual y la variación %— por
 * aritmética exacta, no por estimación: `cierre = actual / (1 + var/100)`.
 */
function serieSimple(valorActual, variacionPct) {
  if (!Number.isFinite(valorActual) || !Number.isFinite(variacionPct)) return null;
  const cierreAnterior = valorActual / (1 + variacionPct / 100);
  if (!Number.isFinite(cierreAnterior)) return null;
  return [cierreAnterior, valorActual];
}

/**
 * Refresca la cinta SIN reconstruirla.
 *
 * Reconstruirla reiniciaría el traslado de la pista —la cinta daría un salto
 * visible— y perdería la marca de «este acaba de cambiar» de cualquier celda
 * a medio desvanecer. Aquí se cambian solo las celdas cuyo texto es distinto.
 *
 * Si el CONJUNTO de claves cambia —una posición que se abre o se cierra— no hay
 * refresco que valga y se repinta entero: la cinta ya no habla de las mismas
 * cosas. Devuelve cuántos valores cambiaron, que es lo que el sondeo mira para
 * decidir si el mercado sigue imprimiendo.
 */
export function refrescarTicker(indices, cartera) {
  const cinta = $('#ticker-mercado');
  const pista = $('#ticker-pista');
  if (!cinta || !pista || cinta.hidden) return null;

  const lineas = lineasDeTicker(indices, cartera);
  const clavesAhora = [...pista.querySelectorAll('.ticker__grupo:first-child .ticker__item')]
    .map((n) => n.dataset.clave).join('|');
  if (!lineas.length || lineas.map((l) => l.clave).join('|') !== clavesAhora) {
    pintarTicker(indices, cartera);
    return null;
  }

  let cambios = 0;
  for (const l of lineas) {
    // Los DOS items de esa clave: el original y el duplicado del bucle. Los
    // dos han de cambiar a la vez, o el mismo valor diría dos cosas distintas
    // según por dónde fuera pasando la pista.
    for (const item of pista.querySelectorAll(`[data-clave="${CSS.escape(l.clave)}"]`)) {
      const valor = item.querySelector('.ticker__valor');
      const varia = item.querySelector('.ticker__var');
      let movido = false;
      movido = sustituirValor(valor, textoValor(l), 'ticker__valor') || movido;
      movido = sustituirValor(varia, textoVariacion(l), 'ticker__var') || movido;
      if (varia) varia.className = `ticker__var ${claseDireccion(l.variacion)}`
        + (varia.classList.contains('ticker__var--sale') ? ' ticker__var--sale' : '')
        + (varia.classList.contains('ticker__var--entra') ? ' ticker__var--entra' : '');
      if (movido) {
        cambios++;
        /* Marca persistente de «este cambió». Es la que sostiene la información
           cuando el sistema pide movimiento reducido y no hay deslizamiento que
           ver: movimiento reducido no es información reducida. */
        item.dataset.cambiado = 'true';
        clearTimeout(Number(item.dataset.temporizador) || 0);
        item.dataset.temporizador = String(setTimeout(() => {
          delete item.dataset.cambiado; delete item.dataset.temporizador;
        }, 4000));
      }
    }
  }

  return cambios;
}

/**
 * Construye una celda de la cinta, sin su gráfico: eso llega aparte y tarde.
 * Sin `l.destino` —Compañías está oculta hoy— la celda es un `span`, no un
 * `a`: texto sin destino clicable, nunca un enlace roto que caiga a portada.
 */
function construirItemTicker(l) {
  const item = elemento(l.destino ? 'a' : 'span', `ticker__item${l.destino ? '' : ' ticker__item--estatico'}`);
  if (l.destino) {
    item.href = l.destino;
    item.dataset.ruta = '';
  }
  // La clave enlaza este item con su línea al refrescar.
  item.dataset.clave = l.clave;

  const texto = elemento('span', 'ticker__texto');
  texto.appendChild(elemento('span', 'ticker__etiqueta', l.etiqueta));
  const fila = elemento('span', 'ticker__cifras');
  fila.appendChild(elemento('span', 'ticker__valor', textoValor(l)));
  fila.appendChild(elemento('span',
    `ticker__var ${claseDireccion(l.variacion)}`, textoVariacion(l)));
  texto.appendChild(fila);
  item.appendChild(texto);
  return item;
}

/**
 * Cinta de mercado. Índices y posiciones abiertas, con sus cifras reales.
 * La pista se duplica y la animación recorre exactamente la mitad, de modo que
 * el ciclo encaja sin salto. El duplicado se oculta al lector de pantalla.
 */
export function pintarTicker(indices, cartera) {
  const cinta = $('#ticker-mercado');
  const pista = $('#ticker-pista');
  if (!cinta || !pista) return;

  const lineas = lineasDeTicker(indices, cartera);
  if (!lineas.length) { cinta.hidden = true; return; }
  cinta.hidden = false;
  pista.textContent = '';

  const grupo = (duplicado) => {
    const g = elemento('div', 'ticker__grupo');
    if (duplicado) g.setAttribute('aria-hidden', 'true');
    for (const l of lineas) g.appendChild(construirItemTicker(l));
    return g;
  };

  pista.appendChild(grupo(false));
  pista.appendChild(grupo(true));

  /* El gráfico llega aparte y tarde, a las DOS copias de cada clave. Se pide
     la serie una única vez por símbolo —la caché es compartida— y, si el
     proveedor no la tiene, se cae a la recta de dos puntos reales antes de
     rendirse del todo. Solo si ninguna de las dos existe la celda se queda
     sin gráfico: no hay hueco reservado para uno que no llega. */
  const pendientes = lineas.map((l) => {
    const valores = l.simbolo
      ? obtenerSerieSparkline(l.simbolo).then((serie) =>
          (serie ? serie.map((p) => p.valor) : serieSimple(l.valor, l.variacion)))
      : Promise.resolve(serieSimple(l.valor, l.variacion));

    return valores.then((v) => {
      if (!v) return;
      for (const item of pista.querySelectorAll(`[data-clave="${CSS.escape(l.clave)}"]`)) {
        item.appendChild(construirSparkline(v));
      }
    });
  });

  /* La duración se fija por longitud recorrida, y solo cuando el contenido ya
     está completo: medir antes de que lleguen los gráficos daría un ancho
     corto y la cinta saltaría al ensancharse cada celda que consigue el suyo. */
  Promise.allSettled(pendientes).then(() => {
    const anchoGrupo = pista.firstElementChild.getBoundingClientRect().width;
    if (anchoGrupo > 0) {
      pista.style.setProperty('--recorrido', `${anchoGrupo}px`);
      pista.style.setProperty('--duracion', `${Math.max(28, Math.round(anchoGrupo / 26))}s`);
    }
  });
}

// ═══════════════════════════════ 2 · HERO ══════════════════════════════════

/**
 * Revela las acciones del hero al entrar.
 *
 * Fase D.13 retira el titular y el subtítulo del hero —la foto pasa a ser el
 * hero entero— y con ellos la construcción línea a línea que vivía aquí:
 * `tLista('portada.manifiesto.titular')` no tiene ya ningún nodo que rellenar.
 * Las acciones son lo único de la vieja declaración editorial que sigue en
 * pie, ahora superpuestas a la foto.
 */
export function animarManifiesto() {
  const acciones = $('.manifiesto__acciones');
  if (acciones) revelar(acciones, 160);
}

/* Sesiones que muestra el sparkline de cada métrica del Hero. Ajustado
   mirándolo en el navegador, no una cifra redonda sin más. */
const SESIONES_CHISPA_HERO = 30;

/**
 * El sparkline de una métrica del Hero, de la MISMA serie que ya trae
 * `cartera` —`serie` para las dos cifras del fondo, `serieIndice` para la del
 * benchmark—, nunca un cálculo aparte (Regla 9): son las series que ya
 * alimentan el gráfico de Cartera, aquí solo recortadas a las últimas
 * sesiones. Sin serie o con menos de dos puntos, no hay trazo —nunca una
 * curva inventada para no dejar el hueco vacío—.
 */
function chispaHero(serie) {
  if (!Array.isArray(serie) || serie.length < 2) return null;
  const valores = serie.slice(-SESIONES_CHISPA_HERO).map((p) => p.valor);
  if (valores.length < 2) return null;
  return construirSparkline(valores, 'hero-metrica__grafico');
}

/**
 * Una métrica del Hero: `dato()` con el valor arrancando en cero y contando
 * hasta el real al entrar en el viewport —la excepción documentada de la
 * cláusula 8—, más su sparkline si hay serie. Sin dato, sin contador: el
 * `noDisponible()` no cuenta desde cero hacia un valor que no existe.
 */
function datoHero(etiqueta, destino, serie) {
  const valorInicial = Number.isFinite(destino) ? formatearPorcentaje(0) : noDisponible();
  const caja = dato(etiqueta, valorInicial, null, destino);
  if (Number.isFinite(destino)) {
    const nodoValor = caja.querySelector('.dato__valor');
    observarEntrada(caja, () => contarPorcentajeHasta(nodoValor, destino));
  }
  const chispa = chispaHero(serie);
  if (chispa) caja.appendChild(chispa);
  return caja;
}

/**
 * Fase D.12: las tres cifras de rendimiento del fondo, en el hueco vacío del
 * Hero. Salen de `cartera.estadisticos`, la misma respuesta que ya usan la
 * cinta y `#/cartera` — no se calcula nada aparte (Regla 9).
 * `dato()` es el mismo componente de "cifra con filete" que usa la ficha
 * de compañía — ninguna caja nueva.
 */
export function pintarMetricasHero(cartera) {
  const raiz = $('#hero-metricas');
  if (!raiz) return;
  raiz.textContent = '';

  const e = cartera?.estadisticos;
  if (!e) { raiz.hidden = true; return; }

  raiz.appendChild(datoHero(
    t('portada.cifras.anio', { anio: String(e.anioEnCurso) }),
    e.rentabilidadAnio, cartera?.serie,
  ));
  raiz.appendChild(datoHero(
    t('portada.hero.metrica.indiceAnio', { indice: rotuloIndice(cartera), anio: String(e.anioEnCurso) }),
    e.rentabilidadIndiceAnio, cartera?.serieIndice,
  ));
  raiz.appendChild(datoHero(
    t('portada.cifras.total'),
    e.rentabilidadTotal, cartera?.serie,
  ));

  raiz.hidden = false;
}

// ════════════════════════════ 4 · MARKET PULSE ════════════════════════════

/**
 * Instrumentos del pulso.
 *
 * Ningún proveedor conectado publica la **serie histórica de un índice**: Nasdaq
 * solo sirve series de valores negociables. La cotización del índice sí es real,
 * de modo que la cifra es la del índice y la curva, cuando existe, es la del ETF
 * que lo replica. Eso se rotula en el pie del gráfico sin ambigüedad: un ETF no
 * es el índice, y presentarlo como tal sería exactamente el error que esta
 * plataforma no comete.
 */
const PULSO = [
  { clave: 'sp500', nombre: 'S&P 500', serie: 'SPY' },
  { clave: 'nasdaq', nombre: 'Nasdaq 100', serie: 'QQQ' },
  { clave: 'vix', nombre: 'VIX', serie: null },
];

const cacheSeries = new Map();
let pulsoActivo = 'sp500';

export function pintarPulso(indices, api) {
  const barra = $('#pulse-indices');
  if (!barra) return;
  barra.textContent = '';

  for (const def of PULSO) {
    const i = (indices?.indices ?? []).find((x) => x.clave === def.clave);

    const boton = elemento('button', 'pulse-indice');
    boton.type = 'button';
    boton.setAttribute('role', 'tab');
    boton.dataset.clave = def.clave;
    boton.setAttribute('aria-selected', String(def.clave === pulsoActivo));

    boton.appendChild(elemento('span', 'pulse-indice__nombre', def.nombre));
    boton.appendChild(elemento('span', 'pulse-indice__valor',
      i?.disponible ? formatearNumero(i.valor, 2) : noDisponible()));

    const cambio = elemento('span', `pulse-indice__var ${claseDireccion(i?.variacionPct)}`);
    cambio.textContent = i?.disponible
      ? t('inicio.pulse.cambio', {
        absoluta: conSigno(i.variacion, 2),
        porcentaje: formatearPorcentaje(i.variacionPct),
      })
      : (i?.motivo ? sinDatos() : noDisponible());
    boton.appendChild(cambio);

    const pie = elemento('span', 'pulse-indice__pie');
    // Fuente y antigüedad son dos datos: solo se enuncian juntos si hay ambos.
    const piezas = [i?.fuente, i?.disponible ? frescura(i.momento) : null].filter(Boolean);
    pie.textContent = i?.disponible ? piezas.join(t('general.separadorLista')) : '';
    boton.appendChild(pie);

    boton.addEventListener('click', () => {
      pulsoActivo = def.clave;
      for (const b of barra.querySelectorAll('.pulse-indice')) {
        b.setAttribute('aria-selected', String(b.dataset.clave === def.clave));
      }
      cargarSerieDelPulso(api);
    });

    barra.appendChild(boton);
  }

  const figura = $('#pulse-figura');
  if (figura) observarEntrada(figura, () => cargarSerieDelPulso(api));
}

/** Antigüedad legible de una marca temporal: «hace 5 min», «5m ago». */
function frescura(momento) {
  if (!momento) return '';
  const bruto = Math.round((Date.now() - new Date(momento).getTime()) / 1000);
  if (!Number.isFinite(bruto)) return '';

  // Negativo porque es pasado; la unidad se elige por magnitud y la redacción
  // —incluido el plural— la pone el idioma.
  const s = Math.max(0, bruto);
  const f = relativo({ numeric: 'always', style: 'narrow' });
  if (s < 60) return f.format(-s, 'second');
  if (s < 3600) return f.format(-Math.round(s / 60), 'minute');
  return f.format(-Math.round(s / 3600), 'hour');
}

async function cargarSerieDelPulso(api) {
  const def = PULSO.find((d) => d.clave === pulsoActivo);
  const svg = $('#pulse-svg');
  const nota = $('#pulse-nota');
  const pie = $('#pulse-pie');
  if (!svg) return;

  if (!def.serie) {
    dibujarSinSerie(svg, pie);
    if (nota) nota.textContent = t('inicio.pulse.nota.sinSerie', { indice: def.nombre });
    return;
  }

  // Solo se memoriza el acierto. Guardar el fallo dejaría el gráfico
  // inutilizado para el resto de la sesión ante una caída pasajera —un límite
  // de peticiones, un corte de red—, cuando basta con volver a pedirlo.
  let datos = cacheSeries.get(def.serie) ?? null;
  if (!datos) {
    try {
      const respuesta = await api(`/api/mercado/serie/${def.serie}?dias=180`);
      if (respuesta?.disponible) {
        cacheSeries.set(def.serie, respuesta);
        datos = respuesta;
      }
    } catch {
      datos = null;
    }
  }

  if (!datos?.disponible) {
    dibujarSinSerie(svg, pie);
    if (nota) nota.textContent = t('inicio.pulse.nota.fallo', { indice: def.nombre });
    return;
  }

  dibujarSerie(svg, datos);
  if (pie) {
    pie.textContent = '';
    pie.appendChild(elemento('span', '', t('inicio.pulse.periodo', {
      desde: formatearFecha(datos.desde), hasta: formatearFecha(datos.hasta),
    })));
    const v = elemento('span', `grafico-linea__periodo ${claseDireccion(datos.variacionPeriodoPct)}`,
      formatearPorcentaje(datos.variacionPeriodoPct));
    pie.appendChild(v);
  }
  if (nota) {
    // El número de sesiones gobierna el plural de la frase entera: la plantilla
    // se declara con sus formas en cada diccionario, no se cose aquí.
    nota.textContent = t('inicio.pulse.nota.conSerie', {
      curva: t('inicio.pulse.notaSerie', { etf: def.serie }),
      indice: def.nombre,
      n: datos.puntos,
    });
  }
}

const ANCHO = 900;
const ALTO = 300;
const NS = 'http://www.w3.org/2000/svg';

function dibujarSinSerie(svg, pie) {
  svg.textContent = '';
  if (pie) pie.textContent = '';
  const texto = document.createElementNS(NS, 'text');
  texto.setAttribute('x', String(ANCHO / 2));
  texto.setAttribute('y', String(ALTO / 2));
  texto.setAttribute('text-anchor', 'middle');
  texto.setAttribute('class', 'grafico-linea__vacio');
  texto.textContent = sinDatos();
  svg.appendChild(texto);
}

/** Traza la serie y la deja dibujarse de una pasada. */
function dibujarSerie(svg, datos) {
  svg.textContent = '';
  const serie = datos.serie;
  const min = datos.minimo;
  const max = datos.maximo;
  const rango = max - min || 1;

  const x = (i) => (ANCHO * i) / (serie.length - 1);
  const y = (v) => ALTO - 18 - ((v - min) / rango) * (ALTO - 44);

  const d = serie.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ');

  // Área y trazo van en el mismo grupo para poder revelarlos juntos.
  const grupo = document.createElementNS(NS, 'g');
  svg.appendChild(grupo);

  const relleno = document.createElementNS(NS, 'path');
  relleno.setAttribute('class', 'grafico-linea__area');
  relleno.setAttribute('d', `${d} L ${ANCHO} ${ALTO} L 0 ${ALTO} Z`);
  grupo.appendChild(relleno);

  const linea = document.createElementNS(NS, 'path');
  linea.setAttribute('class', 'grafico-linea__trazo');
  linea.setAttribute('d', d);
  grupo.appendChild(linea);

  // El trazado se revela con un barrido de izquierda a derecha.
  //
  // No se usa `stroke-dasharray`: el trazo lleva `vector-effect:
  // non-scaling-stroke` y el patrón de guiones se mide entonces en píxeles de
  // pantalla, mientras que `getTotalLength()` devuelve unidades del viewBox. Con
  // el estirado horizontal que impone `preserveAspectRatio="none"` ambas
  // magnitudes difieren y el trazo se quedaba sin dibujar por el extremo
  // derecho, dejando relleno sin línea encima. El barrido no depende de la
  // escala y revela línea y área a la vez.
  if (!sinMovimiento() && typeof grupo.animate === 'function') {
    grupo.animate(
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 1500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );
  }

  // ── Lectura al pasar el cursor ──
  const guia = document.createElementNS(NS, 'line');
  guia.setAttribute('class', 'grafico-linea__guia');
  guia.setAttribute('y1', '0');
  guia.setAttribute('y2', String(ALTO));
  guia.setAttribute('opacity', '0');
  svg.appendChild(guia);

  const punto = document.createElementNS(NS, 'circle');
  punto.setAttribute('class', 'grafico-linea__punto');
  punto.setAttribute('r', '4');
  punto.setAttribute('opacity', '0');
  svg.appendChild(punto);

  const lectura = $('#pulse-lectura');
  const figura = $('#pulse-figura');
  if (!lectura || !figura) return;

  // Caja del SVG: se mide una vez al entrar el puntero, no en cada
  // `pointermove` — `getBoundingClientRect()` es una lectura de layout y
  // repetirla en caliente es el mismo coste que `activarBrilloVitrina()` (más
  // abajo) evita con rAF. El recuadro no cambia mientras el puntero está
  // dentro, así que una lectura por gesto basta.
  let caja = null;
  let pendiente = null;

  const escribir = (ev) => {
    pendiente = null;
    const proporcion = Math.min(Math.max((ev.clientX - caja.left) / caja.width, 0), 1);
    const i = Math.round(proporcion * (serie.length - 1));
    const p = serie[i];
    if (!p) return;

    const px = x(i);
    const py = y(p.valor);
    guia.setAttribute('x1', String(px));
    guia.setAttribute('x2', String(px));
    guia.setAttribute('opacity', '1');
    punto.setAttribute('cx', String(px));
    punto.setAttribute('cy', String(py));
    punto.setAttribute('opacity', '1');

    lectura.hidden = false;
    lectura.textContent = '';
    lectura.appendChild(elemento('span', 'grafico-linea__fecha', formatearFecha(p.fecha)));
    lectura.appendChild(elemento('strong', '', formatearNumero(p.valor, 2)));

    // La etiqueta sigue al cursor sin salirse por ningún borde.
    const ancho = lectura.offsetWidth || 120;
    const izquierda = Math.min(Math.max((px / ANCHO) * caja.width - ancho / 2, 4), caja.width - ancho - 4);
    lectura.style.left = `${izquierda}px`;
  };

  // Un solo vuelo de rAF por movimiento: si llegan varios `pointermove` antes
  // de que pinte el frame, solo el último de ellos escribe.
  const mover = (ev) => {
    if (!caja) caja = svg.getBoundingClientRect();
    if (pendiente) cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(() => escribir(ev));
  };

  const salir = () => {
    if (pendiente) { cancelAnimationFrame(pendiente); pendiente = null; }
    caja = null;
    guia.setAttribute('opacity', '0');
    punto.setAttribute('opacity', '0');
    lectura.hidden = true;
    // La posición se reinicia: si no, el elemento oculto conserva su desplazamiento.
    lectura.style.left = '0px';
  };

  figura.addEventListener('pointerenter', () => { caja = svg.getBoundingClientRect(); });
  figura.addEventListener('pointermove', mover);
  figura.addEventListener('pointerleave', salir);
}

// ══════════════════════════════ 5 · W&C RADAR ══════════════════════════════

/**
 * Señales del radar.
 *
 * Cada familia mide en su propia unidad —una puntuación 0-100, puntos
 * porcentuales frente al índice, volatilidad anualizada— y por eso **no
 * comparten barra**: la longitud se calcula dentro de cada familia, sobre su
 * propio máximo, y la unidad se imprime junto a cada cifra. Meterlas en una
 * escala común daría una comparación que los datos no sostienen.
 */
export function pintarRadarHome(datos, alNavegar) {
  const raiz = $('#home-radar-cuerpo');
  if (!raiz) return;
  raiz.textContent = '';

  const familias = (datos?.senales ?? []).filter((f) => f.disponible && (f.lecturas ?? []).length);

  if (!familias.length) {
    raiz.appendChild(bloqueSinDatos(t('inicio.radar.vacio.titulo'),
      datos?.senales?.find((f) => f.motivo)?.motivo ?? t('inicio.radar.vacio.motivo')));
    return;
  }

  const rejilla = elemento('div', 'radar-home');

  for (const familia of familias) {
    const bloque = elemento('section', 'radar-familia');

    const cabecera = elemento('div', 'radar-familia__cabecera');
    cabecera.appendChild(elemento('h3', 'radar-familia__titulo', familia.titulo));
    if (Number.isFinite(familia.evaluados)) {
      cabecera.appendChild(elemento('span', 'radar-familia__alcance',
        t('inicio.radar.evaluados', { n: familia.evaluados })));
    }
    bloque.appendChild(cabecera);

    // Solo lecturas con medición: las cualitativas se muestran sin barra.
    const numericas = familia.lecturas.filter((l) => Number.isFinite(l.valor));
    const maximo = numericas.length ? Math.max(...numericas.map((l) => Math.abs(l.valor))) : 0;

    const lista = elemento('div', 'radar-lecturas');
    for (const l of familia.lecturas.slice(0, 4)) {
      lista.appendChild(filaLectura(l, maximo, familia, alNavegar));
    }
    bloque.appendChild(lista);
    rejilla.appendChild(revelar(bloque));
  }

  raiz.appendChild(rejilla);
}

function filaLectura(l, maximo, familia, alNavegar) {
  const fila = elemento('article', 'radar-lectura');

  const cabecera = elemento('div', 'radar-lectura__cabecera');
  const ticker = elemento('button', 'radar-lectura__ticker');
  ticker.type = 'button';
  ticker.textContent = l.ticker ?? noDisponible();
  if (l.ticker) ticker.addEventListener('click', () => alNavegar(`companias?t=${encodeURIComponent(l.ticker)}`));
  cabecera.appendChild(ticker);

  const valor = elemento('span', `radar-lectura__valor ${claseDireccion(l.sentido === 'negativo' ? -1 : l.sentido === 'positivo' ? 1 : 0)}`);
  // La unidad la publica la fuente; solo el orden respecto a la cifra es del
  // idioma, y para eso está la plantilla. Sin unidad no hay nada que ordenar.
  valor.textContent = !Number.isFinite(l.valor)
    ? noDisponible()
    : l.unidad
      ? t('inicio.radar.lectura.medida', { valor: formatearNumero(l.valor, 1), unidad: l.unidad })
      : formatearNumero(l.valor, 1);
  cabecera.appendChild(valor);
  fila.appendChild(cabecera);

  // Barra proporcional dentro de la familia. Se anima una sola vez al entrar.
  const carril = elemento('div', 'radar-barra');
  const barra = elemento('div', 'radar-barra__relleno');
  carril.appendChild(barra);
  fila.appendChild(carril);

  if (Number.isFinite(l.valor) && maximo > 0) {
    const proporcion = Math.min(Math.abs(l.valor) / maximo, 1);
    carril.dataset.medible = 'true';
    observarEntrada(carril, () => {
      barra.style.width = `${(proporcion * 100).toFixed(1)}%`;
    });
  } else {
    carril.dataset.medible = 'false';
  }

  // En una lectura cualitativa el titular es lo único que la distingue de otra;
  // el campo `detalle` trae solo la fuente y dejaría cuatro filas idénticas.
  const cuerpo = l.titular ?? l.detalle ?? sinDatos();
  fila.appendChild(elemento('p', 'radar-lectura__detalle', cuerpo));

  if (!Number.isFinite(l.valor)) {
    // Dos frases enteras en lugar de una y un apéndice: la que menciona la
    // fuente puede necesitar otro orden, y así cada idioma se lo da.
    fila.appendChild(elemento('span', 'radar-lectura__nota',
      l.titular && l.detalle
        ? t('inicio.radar.lectura.cualitativaFuente', { fuente: l.detalle })
        : t('inicio.radar.lectura.cualitativa')));
  }

  return fila;
}

/**
 * Un dato de la ficha —también usada por las métricas del Hero (`datoHero()`).
 * @param direccion           marca el propio valor al alza o a la baja; solo
 *                            para magnitudes que son un cambio, nunca un nivel.
 * @param direccionSecundaria marca la línea de apoyo.
 */
function dato(etiqueta, valor, secundario = null, direccion = null, direccionSecundaria = null) {
  const b = elemento('div', 'dato');
  b.appendChild(elemento('span', 'dato__etiqueta', etiqueta));
  const v = elemento('strong', 'dato__valor', valor);
  if (valor === noDisponible()) v.classList.add('dato__valor--ausente');
  if (Number.isFinite(direccion)) v.classList.add(claseDireccion(direccion));
  b.appendChild(v);
  if (secundario) {
    const d = Number.isFinite(direccionSecundaria) ? direccionSecundaria : direccion;
    b.appendChild(elemento('span', `dato__secundario ${claseDireccion(d)}`, secundario));
  }
  return b;
}

// ═══════════════════════════════ 8 · OPTIONS FLOW ═══════════════════════════

/**
 * Options flow.
 *
 * Ningún proveedor conectado publica operaciones individuales, de modo que aquí
 * no se muestra ni una sola operación: se declara la carencia y se enumeran los
 * campos que la sección consumirá el día que exista la fuente. La maqueta ya
 * está construida sobre esos campos, así que conectarla no exigirá rediseñarla.
 */
export function pintarFlujoHome(flujo) {
  const raiz = $('#home-flujo-cuerpo');
  if (!raiz) return;
  raiz.textContent = '';

  if (flujo?.disponible && (flujo.operaciones ?? []).length) {
    raiz.appendChild(tablaFlujo(flujo.operaciones));
    return;
  }

  const bloque = elemento('div', 'flujo-vacio');

  const izquierda = elemento('div', 'flujo-vacio__texto');
  izquierda.appendChild(elemento('p', 'flujo-vacio__rotulo', t('inicio.flujo.rotulo')));
  izquierda.appendChild(elemento('h3', 'flujo-vacio__estado', sinDatos()));
  izquierda.appendChild(elemento('p', 'flujo-vacio__motivo',
    flujo?.motivo ?? t('inicio.flujo.motivo')));

  const requisitos = flujo?.requiere ?? [];
  if (requisitos.length) {
    const lista = elemento('ul', 'flujo-vacio__requisitos');
    for (const r of requisitos) lista.appendChild(elemento('li', '', r));
    izquierda.appendChild(lista);
  }
  bloque.appendChild(izquierda);

  // Esqueleto del contrato de datos: qué campos llenarán cada columna.
  const campos = flujo?.contratoDatos?.camposRequeridos ?? [];
  if (campos.length) {
    const derecha = elemento('div', 'flujo-vacio__contrato');
    derecha.appendChild(elemento('p', 'flujo-vacio__contrato-titulo', t('inicio.flujo.contrato.titulo')));
    // Nombres de campo del contrato de datos, no rótulos: no se traducen, igual
    // que no se traduce el nombre de una columna de la base.
    const rejilla = elemento('div', 'flujo-vacio__campos');
    for (const c of [...campos, 'compra', 'venta', 'sentido', 'prima']) {
      rejilla.appendChild(elemento('span', 'flujo-vacio__campo', c));
    }
    derecha.appendChild(rejilla);
    bloque.appendChild(derecha);
  }

  raiz.appendChild(revelar(bloque));
}

/** Tabla de operaciones. Sin fuente conectada nunca llega a ejecutarse. */
function tablaFlujo(operaciones) {
  const lista = elemento('div', 'flujo-operaciones');
  for (const o of operaciones.slice(0, 8)) {
    const fila = elemento('article', 'flujo-operacion');
    fila.appendChild(elemento('span', 'flujo-operacion__lado', o.lado ?? noDisponible()));
    fila.appendChild(elemento('span', 'flujo-operacion__ticker', o.simbolo ?? noDisponible()));
    fila.appendChild(elemento('span', 'flujo-operacion__strike',
      Number.isFinite(o.strike) ? formatearNumero(o.strike, 2) : noDisponible()));
    fila.appendChild(elemento('span', 'flujo-operacion__vencimiento',
      o.vencimiento ? formatearFecha(o.vencimiento) : noDisponible()));
    // `UNKNOWN` es el valor que declara el proveedor, no un rótulo de interfaz.
    fila.appendChild(elemento('span', 'flujo-operacion__sentido',
      o.sentido?.sentido ?? 'UNKNOWN'));
    fila.appendChild(elemento('span', 'flujo-operacion__prima',
      Number.isFinite(o.prima) ? formatearNumero(o.prima, 0) : noDisponible()));
    lista.appendChild(fila);
  }
  return lista;
}

// ══════════════════════════════ 9 · W&C SIGNAL ══════════════════════════════

/**
 * W&C Signal.
 *
 * El modelo declara siete dimensiones y hoy solo dos tienen fuente, ninguna con
 * puntuación emitida: la cobertura real es del 20 %. En consecuencia **no hay
 * puntuación que mostrar**, y aquí no se calcula ninguna para llenar el hueco.
 * Se publica la convergencia prevista, qué dimensión aporta cada fuente y qué
 * falta para que el indicador exista.
 */
export function pintarSignalHome(signal) {
  const raiz = $('#home-signal-cuerpo');
  if (!raiz) return;
  raiz.textContent = '';

  const referencia = signal?.valores?.[0];
  const dimensiones = referencia?.dimensiones ?? [];

  if (!dimensiones.length) {
    raiz.appendChild(bloqueSinDatos(t('inicio.signal.vacio.titulo'),
      signal?.motivo ?? t('inicio.signal.vacio.motivo')));
    return;
  }

  const bloque = elemento('div', 'signal-home');

  // ── Las dimensiones, con su peso y su estado real ──
  const columna = elemento('div', 'signal-home__dimensiones');
  // La barra se escala sobre el peso mayor del modelo, de modo que la longitud
  // compara pesos entre sí y no insinúa una puntuación.
  const pesoMaximo = Math.max(...dimensiones.map((d) => d.peso ?? 0), 0.0001);

  for (const [i, d] of dimensiones.entries()) {
    const fila = elemento('div', 'signal-dimension');
    fila.dataset.disponible = String(Boolean(d.disponible));

    const cabecera = elemento('div', 'signal-dimension__cabecera');
    cabecera.appendChild(elemento('span', 'signal-dimension__titulo', d.titulo));
    cabecera.appendChild(elemento('span', 'signal-dimension__valor',
      Number.isFinite(d.puntuacion) ? formatearNumero(d.puntuacion, 0) : noDisponible()));
    fila.appendChild(cabecera);

    // La barra representa el PESO de la dimensión en el modelo —un dato real—
    // y su relleno, si la fuente existe. Nunca una puntuación inventada.
    const carril = elemento('div', 'signal-barra');
    const relleno = elemento('div', 'signal-barra__relleno');
    carril.appendChild(relleno);
    fila.appendChild(carril);

    // Fuente conectada y puntuación emitida son cosas distintas: hoy hay dos
    // dimensiones con fuente y ninguna con puntuación, y así se dice.
    const estado = !d.disponible
      ? (d.requiere ?? t('inicio.signal.estado.sinFuente'))
      : Number.isFinite(d.puntuacion)
        ? t('inicio.signal.estado.conFuente')
        : t('inicio.signal.estado.sinPuntuacion');
    // Peso y estado se enuncian en una sola plantilla: el orden y el separador
    // son del idioma, no de un `${a} · ${b}` escrito aquí.
    fila.appendChild(elemento('span', 'signal-dimension__pie', t('inicio.signal.dimension.pie', {
      peso: porcentaje(d.peso * 100, 0), estado,
    })));

    observarEntrada(fila, () => {
      relleno.style.width = `${(((d.peso ?? 0) / pesoMaximo) * 100).toFixed(1)}%`;
    });
    fila.style.setProperty('--retardo', `${i * 90}ms`);
    columna.appendChild(fila);
  }
  bloque.appendChild(columna);

  // ── El resultado: hoy, ninguno ──
  const resultado = elemento('div', 'signal-home__resultado');
  resultado.appendChild(elemento('span', 'signal-home__flecha', '↓'));
  resultado.appendChild(elemento('p', 'signal-home__rotulo', 'W&C Signal'));

  if (Number.isFinite(referencia?.puntuacion) && referencia.disponible) {
    const cifraSignal = elemento('strong', 'signal-home__cifra', '0');
    resultado.appendChild(cifraSignal);
    observarEntrada(resultado, () => contarHasta(cifraSignal, referencia.puntuacion, { decimales: 0 }));
  } else {
    resultado.appendChild(elemento('strong', 'signal-home__cifra signal-home__cifra--ausente',
      t('inicio.signal.vacio.titulo')));
    resultado.appendChild(elemento('p', 'signal-home__motivo', t('inicio.signal.cobertura', {
      motivo: signal?.motivo ?? t('inicio.signal.motivoReserva'),
      cobertura: porcentaje(referencia?.cobertura ?? 0, 0),
    })));
  }
  bloque.appendChild(resultado);

  raiz.appendChild(bloque);
}

// ═════════════════════════════════ comunes ═════════════════════════════════

function bloqueSinDatos(titulo, motivo) {
  const b = elemento('div', 'vacio vacio--home');
  b.appendChild(elemento('strong', '', titulo));
  b.appendChild(elemento('span', '', motivo));
  return b;
}

/** Prepara las cabeceras de sección para que entren con el scroll. */
export function animarCabeceras() {
  for (const c of document.querySelectorAll('#seccion-inicio .bloque-home__cabecera')) revelar(c);
}

// ═══════════════════ METODOLOGÍA / LOS TRES ESTADOS (home) ═══════════════

/**
 * Revela las celdas bento de Metodología y de Los tres estados: son
 * contenido estático —no dependen de ninguna fuente—, así que se marcan en
 * el propio HTML con `data-revelar` y su retardo, si lleva, en `data-retardo`.
 * El retardo se traduce aquí a la llamada real de `revelar()` — nunca se
 * declara dos veces, en el atributo Y en una variable CSS suelta.
 */
export function animarBentoEstatico() {
  for (const nodo of document.querySelectorAll(
    '#home-metodologia [data-revelar], #home-estados [data-revelar]'
  )) {
    revelar(nodo, Number(nodo.dataset.retardo) || 0);
  }
}

// ═══════════════════════ CIFRAS EN VIVO (home) ═══════════════════════════

/**
 * Tres celdas: sesiones de histórico real, tesis publicadas y estado del
 * suelo estadístico de Sharpe/Sortino/Calmar/alfa —el más exigente de los
 * dos—. Las dos primeras y la tercera salen de `cartera.estadisticos`, la
 * MISMA respuesta que ya usan la cinta, el Hero y Cartera (Regla 9: ningún
 * cálculo aparte); `totalTesis` llega ya resuelto de `cargarInicio()`, que lo
 * pide una vez a `/api/informes`. Sin cartera o sin histórico, la celda dice
 * que no hay dato — nunca un cero de relleno (Regla 1).
 */
export function pintarCifrasHome(cartera, totalTesis) {
  const raiz = $('#bento-cifras');
  if (!raiz) return;
  raiz.textContent = '';

  const e = cartera?.estadisticos;

  const celda = (clase, cifra, etiqueta) => {
    const c = elemento('article', `bento-cifras__celda ${clase}`.trim());
    c.setAttribute('data-revelar', '');
    c.appendChild(elemento('p', 'bento-cifras__cifra', cifra));
    c.appendChild(elemento('p', 'bento-cifras__etiqueta', etiqueta));
    return c;
  };

  raiz.appendChild(celda(
    'bento-cifras__celda--grande',
    Number.isFinite(e?.sesiones) ? formatearNumero(e.sesiones, 0) : noDisponible(),
    t('inicio.cifras.sesiones.etiqueta'),
  ));

  raiz.appendChild(celda(
    '',
    Number.isFinite(totalTesis) ? formatearNumero(totalTesis, 0) : noDisponible(),
    t('inicio.cifras.tesis.etiqueta'),
  ));

  /* La cifra grande lleva SOLO el número —igual que las otras dos celdas—;
     la sentencia completa no cabe en `--tipo-7` sin partirse a media palabra.
     Alcanzado el suelo, la cifra pasa a ser la palabra misma: no hay número
     que mostrar y no se inventa uno. */
  const suelo = e?.muestra?.suelos?.ratios;
  const alcanzado = suelo && suelo.restantes <= 0;
  const cifraSuelo = !suelo
    ? noDisponible()
    : alcanzado ? t('inicio.cifras.suelo.alcanzado') : formatearNumero(suelo.restantes, 0);
  const etiquetaSuelo = !suelo
    ? t('inicio.cifras.suelo.etiqueta')
    : alcanzado ? t('inicio.cifras.suelo.etiqueta') : t('inicio.cifras.suelo.faltan');
  raiz.appendChild(celda('', cifraSuelo, etiquetaSuelo));

  for (const nodo of raiz.querySelectorAll('[data-revelar]')) revelar(nodo);
}

// ═══════════════════════ VITRINA DE TESIS (home) ═══════════════════════

/**
 * "Galería de proyectos" del encargo, mapeada a lo que el producto tiene de
 * verdad: tesis de inversión ya publicadas, con sus compañías reales. Cada
 * tarjeta abre el mismo diálogo de detalle que el resto de la plataforma
 * (`alAbrir`, hoy `abrirDetalle()` de `app.js` — Regla 9: un solo mecanismo
 * de apertura, no uno nuevo para esta vista).
 *
 * Sin vídeo de portada (`tieneVideoPortada`), la tarjeta intenta el logotipo
 * local de la compañía —`/assets/logos/<TICKER>.svg`, servido por el propio
 * origen, nunca un CDN (CSP)— y solo si ese fichero no existe cae al mismo
 * lenguaje de marca de agua tipográfica que ya usa `.tarjeta-compania` en
 * Companies. Ninguno de los dos casos fabrica un logo ni una foto que no
 * exista (Regla 1): el fichero lo deposita quien mantiene la marca en
 * `public/assets/logos/`, igual que el banner en `public/marca/`.
 */
/**
 * El "medio" de una tarjeta sin vídeo: intenta el logo local de la
 * compañía y, si el fichero no existe (404, o el ticker es una compañía sin
 * logo depositado — hoy, p. ej., una biotech pequeña), sustituye el propio
 * nodo por el monograma tipográfico. `onerror` se asigna como propiedad del
 * elemento, no como atributo `onerror=""` del marcado —lo segundo violaría
 * la CSP (sin `onclick=`/manejadores en línea); asignarlo desde el script
 * cargado por `'self'` no la toca—.
 */
function marcaOLogo(inf) {
  if (!inf.ticker) return elemento('p', 'vitrina-tesis__marca', (inf.empresa || '?').charAt(0));

  const chip = elemento('div', 'vitrina-tesis__logo-chip');
  const logo = elemento('img', 'vitrina-tesis__logo');
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  logo.loading = 'lazy';
  logo.decoding = 'async';
  logo.src = `/assets/logos/${encodeURIComponent(inf.ticker)}.svg`;
  logo.onerror = () => {
    chip.replaceWith(elemento('p', 'vitrina-tesis__marca', (inf.ticker || inf.empresa || '?').charAt(0)));
  };
  chip.appendChild(logo);
  return chip;
}

export function pintarVitrinaTesis(informes, alAbrir) {
  const seccion = $('#home-vitrina');
  const raiz = $('#vitrina-tesis');
  if (!raiz || !seccion) return;
  raiz.textContent = '';

  const lista = (informes ?? []).slice(0, 6);
  seccion.hidden = lista.length === 0;
  if (!lista.length) return;

  for (const inf of lista) {
    const tarjeta = elemento('article', 'vitrina-tesis__tarjeta');
    tarjeta.setAttribute('role', 'button');
    tarjeta.setAttribute('tabindex', '0');
    tarjeta.setAttribute('data-revelar', '');
    const etiquetaAbrir = t('inicio.vitrina.abrir', { empresa: inf.empresa });
    tarjeta.setAttribute('aria-label', etiquetaAbrir);

    const medio = elemento('div', 'vitrina-tesis__medio');
    if (inf.tieneVideoPortada) {
      const video = elemento('video', 'vitrina-tesis__video');
      video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
      video.src = `/api/informes/${inf.id}/video`;
      if (sinMovimiento()) { video.autoplay = false; video.removeAttribute('autoplay'); }
      medio.appendChild(video);
    } else {
      // El césped es la excepción documentada de DESIGN.md a The Monochrome
      // Register Rule, acotada a esta tarjeta — capa propia, separada del
      // logo/monograma, para que el parallax de más abajo pueda mover el
      // fondo sin arrastrar el chip que sí debe quedarse quieto encima.
      medio.appendChild(elemento('div', 'vitrina-tesis__fondo'));
      medio.appendChild(marcaOLogo(inf));
    }
    medio.appendChild(elemento('div', 'vitrina-tesis__velo'));
    tarjeta.appendChild(medio);
    tarjeta.appendChild(elemento('div', 'vitrina-tesis__brillo'));

    const texto = elemento('div', 'vitrina-tesis__texto');
    texto.appendChild(elemento('p', 'vitrina-tesis__ticker', inf.ticker || noDisponible()));
    texto.appendChild(elemento('p', 'vitrina-tesis__empresa', inf.empresa));
    const meta = [inf.sector, inf.tipo_informe].filter(Boolean).join(' · ');
    if (meta) texto.appendChild(elemento('p', 'vitrina-tesis__meta', meta));
    // Texto adicional real, revelado solo al pasar el ratón — nunca inventado:
    // es `resumen_ejecutivo`, recortado, no una frase redactada aquí.
    const resumen = recorte(inf.resumen_ejecutivo, 140);
    if (resumen) texto.appendChild(elemento('p', 'vitrina-tesis__resumen', resumen));
    tarjeta.appendChild(texto);

    const abrir = () => alAbrir?.(inf.id);
    tarjeta.addEventListener('click', abrir);
    tarjeta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); }
    });

    raiz.appendChild(tarjeta);
  }

  for (const nodo of raiz.querySelectorAll('[data-revelar]')) revelar(nodo);
  activarBrilloVitrina(raiz);
}

/** Recorta por palabra completa, nunca a media palabra. `null` si no hay texto. */
function recorte(texto, limite) {
  if (!texto) return null;
  const plano = String(texto).trim();
  if (plano.length <= limite) return plano;
  return `${plano.slice(0, limite).replace(/\s+\S*$/, '')}…`;
}

/**
 * Brillo que sigue al ratón: escribe `--mx`/`--my` (posición en % dentro de
 * la tarjeta) en cada `pointermove`, acotado a un fotograma por movimiento
 * con `requestAnimationFrame` — nunca un `transform` recalculado en el
 * padre para el hijo (evitaría el recálculo en cascada), solo una custom
 * property que el propio `::` de `.vitrina-tesis__brillo` ya consume en CSS.
 * Sin ratón de precisión no se escucha nada: no hay posición continua que
 * seguir en táctil.
 */
function activarBrilloVitrina(raiz) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let pendiente = null;
  raiz.addEventListener('pointermove', (ev) => {
    const tarjeta = ev.target.closest('.vitrina-tesis__tarjeta');
    if (!tarjeta) return;
    if (pendiente) return;
    pendiente = requestAnimationFrame(() => {
      pendiente = null;
      const r = tarjeta.getBoundingClientRect();
      tarjeta.style.setProperty('--mx', `${((ev.clientX - r.left) / r.width) * 100}%`);
      tarjeta.style.setProperty('--my', `${((ev.clientY - r.top) / r.height) * 100}%`);
    });
  });
}
