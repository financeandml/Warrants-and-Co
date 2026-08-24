/* ============================================================================
   Home — la narrativa de Warrants & Co.

   Nueve piezas encadenadas: cinta de mercado, declaración editorial, fila de
   cifras, pulso de mercado, radar, research, catalizadores, options flow y
   signal. Cada una se
   alimenta de un endpoint real y ninguna fabrica un número: lo que no existe se
   declara, con su motivo, y nunca se sustituye por un cero.

   El movimiento está al servicio de la lectura, no al revés. Todo entra una vez
   al aparecer en pantalla y se queda quieto; nada parpadea de forma continua
   salvo la cinta, que es lo único que se comporta como una cinta. Con
   `prefers-reduced-motion` todo aparece ya en su sitio.
   ========================================================================= */

import {
  $, elemento, formatearNumero, formatearFecha, localeFormato, relativo,
  porcentaje, formatearPorcentaje } from './formato.js';
import { t, tLista } from './i18n.js';

/* Se resuelven al pintar, no al cargar el módulo: el idioma puede cambiar
   después y una constante habría quedado congelada en el de arranque. */
const noDisponible = () => t('general.noDisponible');
const sinDatos = () => t('general.sinDatos');

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cifra = (v, dec = 2) => (Number.isFinite(v) ? formatearNumero(v, dec) : noDisponible());
/* Cambio con signo en unidades del propio dato. Un cambio en por ciento no pasa
   por aquí: lo redacta `formatearPorcentaje()`, que sabe dónde va el espacio. */
const conSigno = (v, dec = 2) =>
  Number.isFinite(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatearNumero(Math.abs(v), dec)}` : noDisponible();

/** Cifra con su divisa. Sin divisa no hay dos piezas que ordenar: va sola. */
const importe = (v, divisa) =>
  divisa ? t('general.importeDivisa', { importe: cifra(v), divisa }) : cifra(v);

/** Clase de lectura direccional, sin que el color sustituya nunca al signo. */
const claseDireccion = (v) =>
  !Number.isFinite(v) ? 'lectura--nula' : v > 0 ? 'lectura--alza' : v < 0 ? 'lectura--baja' : 'lectura--plana';

// ═══════════════════════════ revelado al entrar ═══════════════════════════

/**
 * Observador único para toda la Home. Cada elemento marcado declara qué hacer
 * al entrar en pantalla, y deja de observarse en cuanto lo ha hecho: no hay
 * ninguna animación que se repita al subir y bajar.
 */
const acciones = new WeakMap();
let observador = null;

function observarEntrada(elemento, alEntrar) {
  if (sinMovimiento() || !('IntersectionObserver' in window)) {
    elemento.dataset.visible = 'true';
    alEntrar?.(elemento);
    return;
  }
  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.dataset.visible = 'true';
          acciones.get(e.target)?.(e.target);
          observador.unobserve(e.target);
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
    );
  }
  if (alEntrar) acciones.set(elemento, alEntrar);
  observador.observe(elemento);
}

/** Marca un bloque para que entre con el desplazamiento discreto de la casa. */
function revelar(nodo, retardo = 0) {
  nodo.classList.add('revelado');
  if (retardo) nodo.style.setProperty('--retardo', `${retardo}ms`);
  observarEntrada(nodo);
  return nodo;
}

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

// ═══════════════════════════════ 1 · TICKER ═══════════════════════════════

/**
 * Cinta de mercado. Índices y posiciones abiertas, con sus cifras reales.
 * La pista se duplica y la animación recorre exactamente la mitad, de modo que
 * el ciclo encaja sin salto. El duplicado se oculta al lector de pantalla.
 */
export function pintarTicker(indices, cartera) {
  const cinta = $('#ticker-mercado');
  const pista = $('#ticker-pista');
  if (!cinta || !pista) return;

  const lineas = [];

  for (const i of indices?.indices ?? []) {
    lineas.push({
      etiqueta: i.nombre,
      valor: i.disponible ? i.valor : null,
      decimales: 2,
      // Un tipo de interés se enuncia en por ciento; un nivel de índice, no.
      esTipo: i.formato === 'tipo',
      variacion: i.disponible ? i.variacionPct : null,
      destino: '#/mercado',
    });
  }

  for (const p of cartera?.posiciones ?? []) {
    lineas.push({
      etiqueta: p.ticker,
      valor: Number.isFinite(p.precioActual) ? p.precioActual : null,
      decimales: 2,
      esTipo: false,
      variacion: Number.isFinite(p.variacionDiaPct) ? p.variacionDiaPct : null,
      // Cada valor en cartera tiene ficha propia: la cinta lleva a ella.
      destino: `#/companias?t=${encodeURIComponent(p.ticker)}`,
    });
  }

  if (!lineas.length) { cinta.hidden = true; return; }
  cinta.hidden = false;
  pista.textContent = '';

  const grupo = (duplicado) => {
    const g = elemento('div', 'ticker__grupo');
    if (duplicado) g.setAttribute('aria-hidden', 'true');

    for (const l of lineas) {
      const item = elemento('a', 'ticker__item');
      item.href = l.destino;
      item.dataset.ruta = '';

      item.appendChild(elemento('span', 'ticker__etiqueta', l.etiqueta));
      item.appendChild(elemento('span', 'ticker__valor',
        l.valor === null ? noDisponible()
          : l.esTipo ? porcentaje(l.valor, l.decimales) : formatearNumero(l.valor, l.decimales)));

      const v = elemento('span', `ticker__var ${claseDireccion(l.variacion)}`,
        l.variacion === null ? noDisponible() : formatearPorcentaje(l.variacion));
      item.appendChild(v);
      g.appendChild(item);
    }
    return g;
  };

  pista.appendChild(grupo(false));
  pista.appendChild(grupo(true));

  // La duración se fija por longitud recorrida: velocidad constante y lenta
  // sea cual sea el número de valores.
  const anchoGrupo = pista.firstElementChild.getBoundingClientRect().width;
  if (anchoGrupo > 0) {
    pista.style.setProperty('--recorrido', `${anchoGrupo}px`);
    pista.style.setProperty('--duracion', `${Math.max(28, Math.round(anchoGrupo / 26))}s`);
  }
}

// ══════════════════════════ 2 · DECLARACIÓN Y PILARES ══════════════════════

/**
 * Compone el titular del manifiesto y revela el enunciado línea a línea.
 *
 * Las líneas se construyen aquí porque el diccionario las declara como lista:
 * cuántas son y por dónde cortan es decisión tipográfica de cada idioma, y el
 * documento no puede traerlas escritas sin imponer a todos el reparto de uno.
 */
export function animarManifiesto() {
  const titular = $('#manifiesto-titular');
  if (titular) {
    titular.textContent = '';
    for (const [i, texto] of tLista('portada.manifiesto.titular').entries()) {
      // Dos capas: la exterior recorta y la interior asciende desde detrás.
      const linea = elemento('span', 'linea-revelada');
      linea.style.setProperty('--i', String(i));
      linea.appendChild(elemento('span', null, texto));
      titular.appendChild(linea);
    }
  }

  for (const linea of document.querySelectorAll('.manifiesto .linea-revelada')) {
    observarEntrada(linea);
  }
  const entrada = $('.manifiesto__entrada');
  if (entrada) revelar(entrada, 380);
  document.querySelectorAll('.manifiesto .etiqueta-superior').forEach((e) => revelar(e));
  document.querySelectorAll('.pilar').forEach((p, i) => revelar(p, i * 90));
}

// ═══════════════════════════ 3 · FILA DE CIFRAS ═══════════════════════════

/**
 * Lo que ha hecho la cartera, en cuatro casillas.
 *
 * Se alimenta de `/api/mercado/cartera`, la misma llamada que la cinta: la
 * portada no pide nada nuevo para pintarla. Y no publica ninguna cifra que el
 * motor retenga por suelo de muestra —ni anualizada, ni Sharpe, ni Sortino, ni
 * Calmar, ni alfa de Jensen—: son exactamente las que aquí no aparecen.
 *
 * Las dos primeras casillas dicen hoy el mismo número, y es correcto que lo
 * digan: la cartera nace dentro del año, de modo que ambas miden desde el mismo
 * capital. Leen campos DISTINTOS —`rentabilidadAnio` y `rentabilidadTotal`—,
 * calculados por separado en el motor; el día en que la serie cruce un 1 de
 * enero se separarán solas. De ahí que la casilla del año lleve nota propia con
 * la fecha desde la que mide: es lo que hace visible en pantalla la diferencia
 * entre coincidir y ser el mismo campo.
 *
 * El pie no es letra pequeña. Dice el tamaño de la muestra —periodo, sesiones y
 * cuántas tesis la componen— y lleva a la cartera, donde la conciliación enseña
 * qué línea aporta qué. Sin él, un +67 % de cinco tesis y siete meses se leería
 * como el de una serie larga.
 */
export function pintarCifras(cartera) {
  const raiz = $('#cifras-portada');
  const cuerpo = $('#cifras-portada-cuerpo');
  if (!raiz || !cuerpo) return;

  cuerpo.textContent = '';
  raiz.hidden = false;

  const e = cartera?.estadisticos;
  if (!e) {
    cuerpo.appendChild(bloqueSinDatos(t('portada.cifras.vacio.titulo'),
      cartera?.mensaje ?? t('portada.cifras.vacio.motivo')));
    return;
  }

  const casillas = [
    {
      // El año viaja como texto: `t()` formatea los números con el locale, y un
      // año no es una cantidad. Como número salía «Rentabilidad 2026» en
      // español —que no agrupa cuatro dígitos— y «2,026 return» en inglés.
      etiqueta: t('portada.cifras.anio', { anio: String(e.anioEnCurso) }),
      valor: formatearPorcentaje(e.rentabilidadAnio),
      lectura: e.rentabilidadAnio,
      // La nota sale del mismo cálculo que la cifra: la casilla no deduce su
      // propio rótulo, lo recibe resuelto.
      nota: t(e.anioDesdeCapital ? 'portada.cifras.anio.desdeCapital' : 'portada.cifras.anio.desdeCierre',
        { fecha: formatearFecha(e.anioDesde) }),
    },
    {
      etiqueta: t('portada.cifras.total'),
      valor: formatearPorcentaje(e.rentabilidadTotal),
      lectura: e.rentabilidadTotal,
      nota: t('portada.cifras.total.nota'),
    },
    {
      etiqueta: t('portada.cifras.indice', { indice: cartera.benchmark }),
      valor: formatearPorcentaje(e.rentabilidadIndice),
      lectura: e.rentabilidadIndice,
      nota: t('portada.cifras.indice.nota'),
    },
    {
      etiqueta: t('portada.cifras.caida'),
      valor: formatearPorcentaje(e.maximaCaida),
      lectura: e.maximaCaida,
      nota: t('portada.cifras.caida.nota'),
    },
  ];

  const fila = elemento('div', 'cinta-metricas');
  for (const [i, c] of casillas.entries()) {
    const celda = elemento('div', 'cinta-metricas__celda');
    const valor = elemento('strong', `cinta-metricas__valor ${claseDireccion(c.lectura)}`, c.valor);
    celda.appendChild(valor);
    celda.appendChild(elemento('span', 'cinta-metricas__etiqueta', c.etiqueta));
    celda.appendChild(elemento('span', 'cinta-metricas__nota', c.nota));
    revelar(celda, i * 80);
    fila.appendChild(celda);
  }
  cuerpo.appendChild(fila);

  // ── El pie: de qué muestra hablan las cuatro cifras, y dónde se desglosa ──
  const vivas = cartera.posiciones?.length ?? 0;
  const tesis = vivas + (cartera.cerradas?.length ?? 0);
  const pie = elemento('p', 'cifras__pie');
  pie.appendChild(elemento('span', '', t('portada.cifras.pie', {
    desde: formatearFecha(e.inicio),
    hasta: formatearFecha(e.fin),
    sesiones: t('portada.cifras.pie.sesiones', { n: e.sesiones }),
    tesis: t('portada.cifras.pie.tesis', { n: tesis }),
    vivas: t('portada.cifras.pie.vivas', { n: vivas }),
  })));

  const enlace = document.createElement('a');
  enlace.className = 'cifras__enlace';
  enlace.href = '#/cartera';
  enlace.dataset.ruta = '';
  enlace.appendChild(elemento('span', '', t('portada.cifras.pie.enlace')));
  enlace.appendChild(elemento('span', 'cifras__flecha', '→'));
  pie.appendChild(enlace);

  cuerpo.appendChild(pie);
  revelar(pie);
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

  const mover = (ev) => {
    const caja = svg.getBoundingClientRect();
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

  const salir = () => {
    guia.setAttribute('opacity', '0');
    punto.setAttribute('opacity', '0');
    lectura.hidden = true;
    // La posición se reinicia: si no, el elemento oculto conserva su desplazamiento.
    lectura.style.left = '0px';
  };

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

// ═══════════════════════════════ 6 · RESEARCH ═══════════════════════════════

let researchActivo = 0;
let researchTemporizador = null;
/* El juego de oyentes se engancha una vez y sobrevive a los repintados, de modo
   que no puede cerrarse sobre la lista de aquel momento: consulta estas. */
let listaVigente = [];
let selectorVigente = null;

/**
 * Cobertura destacada. Se rota entre las compañías con informe publicado, con
 * pausa amplia y detención al pasar el cursor: nada se mueve mientras se lee.
 *
 * No se acompaña de fotografía: el proyecto no dispone de imágenes de las
 * compañías cubiertas, y una imagen de banco genérica no aportaría nada.
 */
export function pintarResearchHome(companias, alNavegar) {
  const raiz = $('#home-research-cuerpo');
  if (!raiz) return;

  /* Se detiene la rotación ANTES de vaciar: el temporizador en marcha cierra
     sobre el selector de pestañas de este momento, que el vaciado deja fuera del
     documento. Si sobreviviera, seguiría girando el panel mientras marca la
     pestaña activa en unos botones que ya no están en pantalla. */
  detenerRotacion();
  raiz.textContent = '';

  const lista = (companias ?? []).filter((c) => c.ticker);
  if (!lista.length) {
    raiz.appendChild(bloqueSinDatos(t('inicio.research.vacio.titulo'),
      t('inicio.research.vacio.motivo')));
    return;
  }

  const selector = elemento('div', 'research-selector');
  selector.setAttribute('role', 'tablist');
  listaVigente = lista;
  selectorVigente = selector;
  for (const [i, c] of lista.entries()) {
    const b = elemento('button', 'research-selector__pestana');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = c.ticker;
    b.setAttribute('aria-selected', String(i === researchActivo));
    b.addEventListener('click', () => { detenerRotacion(); mostrarCompania(i, lista, raiz, selector, alNavegar); });
    selector.appendChild(b);
  }
  raiz.appendChild(selector);

  const panel = elemento('div', 'research-panel');
  raiz.appendChild(panel);

  mostrarCompania(researchActivo, lista, raiz, selector, alNavegar);

  if (lista.length > 1 && !sinMovimiento()) {
    // El contenedor sobrevive al repintado —solo se vacía su contenido—, de
    // modo que los oyentes se enganchan una sola vez. Sin esta guarda, cada
    // recarga de la portada añadiría un juego más.
    if (!raiz.dataset.oyentes) {
      raiz.addEventListener('pointerenter', detenerRotacion);
      raiz.addEventListener('pointerleave', () => iniciarRotacion(listaVigente, raiz, selectorVigente, alNavegar));
      raiz.addEventListener('focusin', detenerRotacion);
      raiz.dataset.oyentes = 'true';
    }
    observarEntrada(raiz, () => iniciarRotacion(lista, raiz, selector, alNavegar));
  }
}

function iniciarRotacion(lista, raiz, selector, alNavegar) {
  detenerRotacion();
  // Ocho segundos: tiempo de leer la tesis sin que nada se mueva de golpe.
  researchTemporizador = setInterval(() => {
    mostrarCompania((researchActivo + 1) % lista.length, lista, raiz, selector, alNavegar);
  }, 8000);
}

function detenerRotacion() {
  if (researchTemporizador) { clearInterval(researchTemporizador); researchTemporizador = null; }
}

function mostrarCompania(indice, lista, raiz, selector, alNavegar) {
  researchActivo = indice;
  const c = lista[indice];

  for (const [i, b] of [...selector.children].entries()) {
    b.setAttribute('aria-selected', String(i === indice));
  }

  const panel = raiz.querySelector('.research-panel');
  if (!panel) return;

  panel.dataset.cambiando = 'true';
  const pintar = () => {
    panel.textContent = '';

    const izquierda = elemento('div', 'research-panel__tesis');
    const identidad = elemento('div', 'research-panel__identidad');
    identidad.appendChild(elemento('span', 'research-panel__ticker', c.ticker));
    if (c.enCartera) {
      identidad.appendChild(elemento('span', 'chip chip--cartera', t('inicio.research.enCartera')));
    }
    izquierda.appendChild(identidad);
    izquierda.appendChild(elemento('h3', 'research-panel__empresa', c.empresa));
    izquierda.appendChild(elemento('p', 'research-panel__sector',
      [c.sector, c.pais].filter(Boolean).join(t('general.separadorLista')) || noDisponible()));

    const resumen = c.informes?.find((i) => i.resumen)?.resumen ?? c.resumen ?? null;
    izquierda.appendChild(resumen
      ? elemento('p', 'research-panel__resumen', recortar(resumen, 340))
      : elemento('p', 'research-panel__vacio', t('inicio.research.sinResumen')));

    const enlace = elemento('button', 'enlace-avance');
    enlace.type = 'button';
    enlace.appendChild(elemento('span', null, t('inicio.research.verFicha')));
    enlace.appendChild(elemento('span', 'enlace-avance__flecha', '→'));
    enlace.addEventListener('click', () => alNavegar(`companias?t=${encodeURIComponent(c.ticker)}`));
    izquierda.appendChild(enlace);

    const derecha = elemento('div', 'research-panel__datos');
    // El precio es un nivel: no lleva signo ni dirección. La variación, que sí
    // es un cambio, va debajo y es la única que se marca al alza o a la baja.
    derecha.appendChild(dato(t('inicio.research.dato.precio'), c.cotizacion?.disponible
      ? importe(c.cotizacion.precio, c.cotizacion.divisa) : noDisponible(),
      c.cotizacion?.disponible ? formatearPorcentaje(c.cotizacion.variacionPct) : null,
      null, c.cotizacion?.variacionPct));
    derecha.appendChild(dato(t('inicio.research.dato.recomendacion'), c.recomendacion ?? noDisponible()));
    derecha.appendChild(dato(t('inicio.research.dato.objetivo'),
      Number.isFinite(c.precioObjetivo) ? importe(c.precioObjetivo, c.divisa) : noDisponible()));
    derecha.appendChild(dato(t('inicio.research.dato.recorrido'),
      c.recorridoObjetivo?.disponible ? formatearPorcentaje(c.recorridoObjetivo.porcentaje) : noDisponible(),
      null, c.recorridoObjetivo?.porcentaje));

    panel.appendChild(izquierda);
    panel.appendChild(derecha);
    delete panel.dataset.cambiando;
  };

  if (sinMovimiento()) pintar();
  else setTimeout(pintar, 180);
}

/**
 * Un dato de la ficha.
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

const recortar = (t, n) => (t.length <= n ? t : `${t.slice(0, t.lastIndexOf(' ', n))}…`);

// ═════════════════════════════ 7 · CATALIZADORES ═════════════════════════════

/** Cronología de los próximos catalizadores, del más cercano al más lejano. */
export function pintarCatalizadoresHome(agenda, alNavegar) {
  const raiz = $('#home-catalizadores-cuerpo');
  if (!raiz) return;
  raiz.textContent = '';

  const proximos = (agenda?.proximos ?? []).slice(0, 6);
  if (!proximos.length) {
    raiz.appendChild(bloqueSinDatos(t('inicio.catalizadores.vacio.titulo'),
      t('inicio.catalizadores.vacio.motivo')));
    return;
  }

  const linea = elemento('ol', 'cronologia');
  for (const [i, e] of proximos.entries()) {
    const hito = elemento('li', 'cronologia__hito');

    const fecha = elemento('div', 'cronologia__fecha');
    fecha.appendChild(elemento('span', 'cronologia__dia', diaCorto(e.fecha)));
    // «hoy», «mañana», «dentro de 3 días» — con la palabra en lugar de la cifra
    // cuando el idioma la tiene, que es lo que hace `numeric: 'auto'`. La
    // mayúscula inicial la pone la hoja de estilo: es tipografía, no texto.
    fecha.appendChild(elemento('span', 'cronologia__cuando',
      Number.isFinite(e.dias) ? relativo({ numeric: 'auto' }).format(e.dias, 'day') : ''));
    hito.appendChild(fecha);

    hito.appendChild(elemento('span', 'cronologia__punto'));

    const cuerpo = elemento('div', 'cronologia__cuerpo');
    const sup = elemento('div', 'cronologia__superior');
    sup.appendChild(elemento('span', 'cronologia__tipo', e.tipo));
    sup.appendChild(elemento('span', `cronologia__prioridad prioridad--${String(e.prioridad).toLowerCase()}`, e.prioridad));
    cuerpo.appendChild(sup);

    const empresa = elemento('button', 'cronologia__empresa');
    empresa.type = 'button';
    // Se unen los datos que hay, en vez de armar la pareja y recortarla después:
    // aquel recorte iba con expresión regular contra el separador y se rompía en
    // cuanto el separador cambiaba de idioma.
    empresa.textContent = [e.ticker, e.compania].filter(Boolean)
      .join(t('general.separadorLista'));
    if (e.ticker) empresa.addEventListener('click', () => alNavegar(`companias?t=${encodeURIComponent(e.ticker)}`));
    cuerpo.appendChild(empresa);

    // El título del evento trae su propia fecha; en la cronología ya la
    // encabeza la parada, de modo que se retira para no decirla dos veces.
    cuerpo.appendChild(elemento('p', 'cronologia__detalle',
      String(e.titulo).replace(/\s*·\s*\d{4}-\d{2}-\d{2}\s*$/, '')));
    hito.appendChild(cuerpo);

    linea.appendChild(revelar(hito, i * 110));
  }
  raiz.appendChild(linea);

  raiz.appendChild(elemento('p', 'nota-metodologica', t('inicio.catalizadores.nota')));
}

/**
 * Día y mes abreviados.
 *
 * El orden lo decide el idioma —«17 AGO» en español, «AUG 17» en inglés—, de
 * modo que no hay tabla de meses que mantener ni un orden fijo que imponer. Se
 * lee en UTC: la fecha del catalizador es un día de calendario, no un instante,
 * y desplazarla a la zona del navegador la movería un día en media Europa.
 */
function diaCorto(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return noDisponible();
  return d.toLocaleDateString(localeFormato(), {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).toUpperCase();
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
