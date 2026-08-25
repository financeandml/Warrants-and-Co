import { localeFormato, formatearPorcentaje } from './formato.js';
import { t } from './i18n.js';
/* ============================================================================
   Grafico de evolucion de cartera — SVG, sin dependencias externas.

   Dos series sobre un unico eje, ambas indexadas a base 100, de modo que la
   comparacion es directa y no existe el sesgo de un segundo eje.
   Al prescindir del color, la identidad de cada serie recae en el trazo
   (continuo frente a discontinuo), la leyenda y las etiquetas de extremo.
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

/* Sin eje izquierdo: las cifras del eje van a la DERECHA, donde acaba la serie
   y donde está la mirada. Es la convención de la prensa financiera y ahorra los
   52 px que el eje izquierdo se llevaba sin dibujar nada. El margen derecho
   aloja dos cosas: el rótulo de cada serie pegado a su último punto, y las
   cifras del eje contra el borde. */
const MARGEN = { arriba: 20, derecha: 148, abajo: 34, izquierda: 10 };
const ALTURA = 340;

const crear = (nombre, atributos = {}) => {
  const el = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, String(v));
  return el;
};

/* ── Fechas ──
   Las redacta el navegador, no una tabla de meses escrita a mano: aquella solo
   sabia castellano y habria necesitado una copia por idioma. `toLocaleDateString`
   ademas ordena las piezas como toca —«17 ago» frente a «Aug 17»—, algo que una
   plantilla con dia y mes concatenados no puede hacer.

   Se construye la fecha a mediodia UTC. A medianoche, un huso al oeste de
   Greenwich la retrasaria al dia anterior y el eje rotularia un dia menos. */
const fecha_ = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);

const fechaCorta = (iso) =>
  fecha_(iso).toLocaleDateString(localeFormato(), { day: 'numeric', month: 'short' });

const fechaLarga = (iso) =>
  fecha_(iso).toLocaleDateString(localeFormato(), { day: 'numeric', month: 'long', year: 'numeric' });

const num = (v, dec = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : v.toLocaleString(localeFormato(), { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Escala lineal con ticks en valores redondos. */
function escalaY(min, max, objetivo = 5) {
  const bruto = (max - min) / objetivo;
  const magnitud = 10 ** Math.floor(Math.log10(Math.max(bruto, 1e-9)));
  const norm = bruto / magnitud;
  const paso = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * magnitud;
  const inicio = Math.floor(min / paso) * paso;
  const fin = Math.ceil(max / paso) * paso;
  const ticks = [];
  for (let v = inicio; v <= fin + paso / 2; v += paso) ticks.push(Number(v.toFixed(10)));
  return { inicio, fin, ticks };
}

export class GraficoCartera {
  #contenedor;
  #emergente;
  #svg = null;
  #datos = { cartera: [], indice: [], nombreIndice: '' };
  #geometria = null;
  #indiceActivo = null;
  #observador = null;

  constructor(contenedor) {
    this.#contenedor = contenedor;

    this.#emergente = document.createElement('div');
    this.#emergente.className = 'emergente';
    this.#emergente.setAttribute('role', 'status');
    this.#emergente.dataset.visible = 'false';
    contenedor.appendChild(this.#emergente);

    // Redibujado ante cambios de anchura, con proteccion frente a bucles.
    if ('ResizeObserver' in window) {
      let ultimoAncho = 0;
      this.#observador = new ResizeObserver((entradas) => {
        const ancho = Math.round(entradas[0].contentRect.width);
        if (ancho > 0 && Math.abs(ancho - ultimoAncho) > 1) {
          ultimoAncho = ancho;
          this.#dibujar();
        }
      });
      this.#observador.observe(contenedor);
    }
  }

  destruir() {
    this.#observador?.disconnect();
  }

  /**
   * @param {Array<{fecha,valor}>} cartera
   * @param {Array<{fecha,valor}>} indice
   * @param {string} nombreIndice
   */
  actualizar(cartera, indice, nombreIndice) {
    this.#datos = {
      cartera: Array.isArray(cartera) ? cartera.filter((p) => Number.isFinite(p.valor)) : [],
      indice: Array.isArray(indice) ? indice.filter((p) => Number.isFinite(p.valor)) : [],
      nombreIndice: nombreIndice || t('grafico.indice'),
    };
    this.#dibujar();
  }

  #dibujar() {
    const { cartera, indice, nombreIndice } = this.#datos;
    this.#contenedor.querySelector('svg')?.remove();
    this.#ocultarEmergente();

    if (cartera.length < 2) {
      if (!this.#contenedor.querySelector('.vacio')) {
        const vacio = document.createElement('div');
        vacio.className = 'vacio';
        // `titulo`, y no `t`: `t` es el traductor importado arriba.
        const titulo = document.createElement('strong');
        titulo.textContent = t('grafico.vacio.titulo');
        vacio.appendChild(titulo);
        vacio.appendChild(document.createTextNode(t('grafico.vacio.detalle')));
        this.#contenedor.appendChild(vacio);
      }
      return;
    }
    this.#contenedor.querySelector('.vacio')?.remove();

    const anchoTotal = Math.max(this.#contenedor.clientWidth || 720, 360);
    const ancho = anchoTotal - 48; // descuenta el relleno lateral del contenedor
    const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha;
    const altoUtil = ALTURA - MARGEN.arriba - MARGEN.abajo;

    // Dominio comun a ambas series: un solo eje, sin doble escala.
    const valores = [...cartera.map((p) => p.valor), ...indice.map((p) => p.valor)];
    /* Tres marcas de altura, no cinco. Sin retícula que las prolongue, cada
       cifra es una referencia suelta contra el borde: cinco se leen como una
       lista de números y tres como una escala. */
    const { inicio, fin, ticks } = escalaY(Math.min(...valores), Math.max(...valores), 3);

    const fechas = cartera.map((p) => p.fecha);
    const x = (i) => MARGEN.izquierda + (anchoUtil * i) / Math.max(fechas.length - 1, 1);
    const y = (v) => MARGEN.arriba + altoUtil - (altoUtil * (v - inicio)) / Math.max(fin - inicio, 1e-9);

    const svg = crear('svg', {
      viewBox: `0 0 ${ancho} ${ALTURA}`,
      preserveAspectRatio: 'xMidYMid meet',
      tabindex: '0',
      role: 'application',
      'aria-label': t('grafico.etiqueta'),
    });

    // ── Rejilla y eje de valores ──
    // `marca`, y no `t`: `t` es el traductor, y usarlo de variable de bucle lo
    // taparia justo donde alguien querria traducir.
    /* Las cifras del eje, contra el borde derecho. Sin retícula y sin eje en L:
       la cifra sitúa la altura por sí sola, y las líneas que la acompañaban
       competían con la serie sin añadir nada. */
    const bordeDerecho = ancho - 8;
    /* `escalaY` redondea a pasos legibles —20 en 20—, de modo que pedirle tres
       marcas puede devolver seis. Se aclaran aquí, conservando la primera y la
       última: cambiar el paso para que salgan tres daría alturas como 87 o 143,
       que se leen peor que sobrarle marcas a una escala redonda. */
    const visibles = ticks.length <= 4
      ? ticks
      : ticks.filter((_, i) => i === 0 || i === ticks.length - 1
        || i % Math.ceil((ticks.length - 1) / 3) === 0);
    for (const marca of visibles) {
      const py = y(marca);
      if (py < MARGEN.arriba - 1 || py > MARGEN.arriba + altoUtil + 1) continue;
      const et = crear('text', { class: 'grafico__texto', x: bordeDerecho, y: py + 3.5, 'text-anchor': 'end' });
      et.textContent = num(marca, 0);
      svg.appendChild(et);
    }

    /* La base 100 es lo ÚNICO horizontal que se conserva, porque no es retícula:
       es el capital invertido, y decir si la serie va por encima o por debajo de
       ella es la primera pregunta que se le hace al gráfico. Va rotulada. */
    if (100 >= inicio && 100 <= fin) {
      svg.appendChild(crear('line', { class: 'grafico__base', x1: MARGEN.izquierda, x2: MARGEN.izquierda + anchoUtil, y1: y(100), y2: y(100) }));
      const etBase = crear('text', {
        class: 'grafico__base-rotulo', x: MARGEN.izquierda + 2, y: y(100) - 7,
      });
      etBase.textContent = t('grafico.base');
      svg.appendChild(etBase);
    }

    /* ── Eje temporal: donde cambia el MES, no cada n sesiones ──
       Un reparto uniforme rotula fechas arbitrarias —«17 mar», «2 jun»— que no
       significan nada. Marcar el cambio de mes da un eje que se lee como un
       calendario y que no se mueve al cambiar de rango. */
    const mesDe = (iso) => String(iso).slice(0, 7);
    const cambios = [];
    for (let i = 1; i < fechas.length; i++) {
      if (mesDe(fechas[i]) !== mesDe(fechas[i - 1])) cambios.push(i);
    }
    // Si caben pocos, se toma uno de cada n para que no se apelotonen.
    // Un mes cada 150 px: por debajo de eso las marcas se leen como una tira.
    const cabenMarcas = Math.max(2, Math.floor(anchoUtil / 150));
    const paso = Math.max(1, Math.ceil(cambios.length / cabenMarcas));
    for (let k = 0; k < cambios.length; k += paso) {
      const i = cambios[k];
      const et = crear('text', {
        class: 'grafico__texto', x: x(i), y: ALTURA - MARGEN.abajo + 20, 'text-anchor': 'middle',
      });
      et.textContent = fechaCorta(fechas[i]);
      svg.appendChild(et);
    }

    // La última sesión queda rotulada si no se pisa con la última marca de mes.
    const ultimo = fechas.length - 1;
    const ultimaMarca = cambios.length ? cambios[cambios.length - 1 - ((cambios.length - 1) % paso)] : 0;
    if (x(ultimo) - x(ultimaMarca) > 58) {
      const et = crear('text', { class: 'grafico__texto', x: x(ultimo), y: ALTURA - MARGEN.abajo + 20, 'text-anchor': 'middle' });
      et.textContent = fechaCorta(fechas[ultimo]);
      svg.appendChild(et);
    }

    // ── Serie del indice de referencia (fondo) ──
    const porFechaIndice = new Map(indice.map((p) => [p.fecha, p.valor]));
    const puntosIndice = [];
    fechas.forEach((f, i) => {
      const v = porFechaIndice.get(f);
      if (Number.isFinite(v)) puntosIndice.push({ i, v });
    });

    if (puntosIndice.length > 1) {
      const d = puntosIndice.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i).toFixed(2)} ${y(p.v).toFixed(2)}`).join(' ');
      svg.appendChild(crear('path', { class: 'grafico__linea grafico__linea--indice', d }));
    }

    // ── Serie de la cartera: area de acompañamiento y trazo ──
    const dLinea = cartera.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.valor).toFixed(2)}`).join(' ');
    /* Sin área bajo la serie. Un relleno mide superficie, y aquí la superficie
       no significa nada: lo que se lee es la ALTURA sobre la base 100. Además
       tapaba la serie del índice justo donde las dos se cruzan, que es el punto
       más interesante del gráfico. */
    svg.appendChild(crear('path', { class: 'grafico__linea', d: dLinea }));

    /* ── Rótulo directo al final de cada serie ──
       Nombre y último nivel pegados al punto donde la serie acaba. Es lo que
       sustituye a la clave de color: quien mira no tiene que emparejar un
       cuadradito de una leyenda con una línea del dibujo, porque la línea lleva
       su nombre escrito al lado. La leyenda de abajo conserva otra cosa —la
       rentabilidad medida y desde dónde se mide—, que es un hecho distinto. */
    const rotularFin = (punto, nombre, indice, yRotulo = null) => {
      const px = x(punto.i);
      const py = y(punto.v);
      const yTexto = yRotulo ?? py;
      svg.appendChild(crear('circle', {
        class: `grafico__marcador${indice ? ' grafico__marcador--indice' : ''}`,
        cx: px, cy: py, r: indice ? 3.5 : 4,
      }));
      const g = crear('g', { class: `grafico__fin${indice ? ' grafico__fin--indice' : ''}` });
      const etNombre = crear('text', {
        class: 'grafico__fin-nombre', x: px + 10, y: yTexto - 3,
      });
      etNombre.textContent = nombre;
      const etValor = crear('text', {
        class: 'grafico__fin-valor', x: px + 10, y: yTexto + 13,
      });
      etValor.textContent = num(punto.v);
      g.append(etNombre, etValor);
      svg.appendChild(g);
      return py;
    };

    const finCartera = cartera[cartera.length - 1];
    const yCartera = rotularFin(
      { i: cartera.length - 1, v: finCartera.valor }, t('grafico.serie.cartera'), false);

    if (puntosIndice.length > 1) {
      const finIndice = puntosIndice[puntosIndice.length - 1];
      /* Cada rótulo ocupa dos renglones. Si las series acaban juntas se pisan, de
         modo que el de abajo se empuja lo justo y su marcador se queda donde de
         verdad acaba la serie: mover el punto sería mover el dato. */
      const py = y(finIndice.v);
      const desplazado = Math.abs(py - yCartera) < 34
        ? yCartera + (finIndice.v < finCartera.valor ? 34 : -34)
        : py;
      rotularFin(finIndice, nombreIndice, true, desplazado);
    }

    // ── Capa de interaccion ──
    const capa = crear('g', { class: 'grafico__interaccion' });
    const cruz = crear('line', { class: 'grafico__cruz', y1: MARGEN.arriba, y2: MARGEN.arriba + altoUtil, x1: 0, x2: 0, opacity: 0 });
    const focoCartera = crear('circle', { class: 'grafico__foco', r: 4.5, stroke: 'var(--serie-cartera)', opacity: 0 });
    const focoIndice = crear('circle', { class: 'grafico__foco', r: 4, stroke: 'var(--serie-indice)', opacity: 0 });
    capa.append(cruz, focoCartera, focoIndice);

    const superficie = crear('rect', {
      x: MARGEN.izquierda, y: MARGEN.arriba,
      width: Math.max(anchoUtil, 1), height: Math.max(altoUtil, 1),
      fill: 'transparent', style: 'cursor: crosshair',
    });
    capa.appendChild(superficie);
    svg.appendChild(capa);

    this.#svg = svg;
    this.#geometria = { x, y, anchoUtil, cartera, porFechaIndice, fechas, cruz, focoCartera, focoIndice, nombreIndice };

    superficie.addEventListener('pointermove', (ev) => this.#alDesplazar(ev));
    superficie.addEventListener('pointerleave', () => this.#ocultarEmergente());
    superficie.addEventListener('pointerdown', (ev) => this.#alDesplazar(ev));

    svg.addEventListener('keydown', (ev) => this.#alPulsarTecla(ev));
    svg.addEventListener('blur', () => this.#ocultarEmergente());

    this.#contenedor.insertBefore(svg, this.#emergente);
    this.#describir();
  }

  /** Descripcion textual equivalente para lectores de pantalla. */
  #describir() {
    const destino = document.getElementById('descripcion-grafico');
    if (!destino) return;
    const { cartera, nombreIndice } = this.#datos;
    const primero = cartera[0];
    const ultimo = cartera[cartera.length - 1];
    const variacion = (ultimo.valor / primero.valor - 1) * 100;
    destino.textContent = t('grafico.descripcion', {
      n: cartera.length,
      desde: fechaLarga(primero.fecha),
      hasta: fechaLarga(ultimo.fecha),
      inicial: num(primero.valor),
      final: num(ultimo.valor),
      variacion: formatearPorcentaje(variacion),
      indice: nombreIndice,
    });
  }

  #posicionDesdeEvento(ev) {
    const { x, fechas } = this.#geometria;
    const caja = this.#svg.getBoundingClientRect();
    const escala = caja.width / this.#svg.viewBox.baseVal.width;
    const px = (ev.clientX - caja.left) / escala;

    // Indice mas proximo: el lector apunta a una fecha, no a una linea de 2 px.
    let mejor = 0;
    let mejorDist = Infinity;
    for (let i = 0; i < fechas.length; i++) {
      const d = Math.abs(x(i) - px);
      if (d < mejorDist) { mejorDist = d; mejor = i; }
    }
    return mejor;
  }

  #alDesplazar(ev) {
    this.#mostrarEn(this.#posicionDesdeEvento(ev));
  }

  #alPulsarTecla(ev) {
    if (!this.#geometria) return;
    const ultimo = this.#geometria.fechas.length - 1;
    const actual = this.#indiceActivo ?? ultimo;
    const salto = ev.shiftKey ? 10 : 1;
    let destino = null;

    switch (ev.key) {
      case 'ArrowRight': destino = Math.min(actual + salto, ultimo); break;
      case 'ArrowLeft':  destino = Math.max(actual - salto, 0); break;
      case 'Home':       destino = 0; break;
      case 'End':        destino = ultimo; break;
      case 'Escape':     this.#ocultarEmergente(); return;
      default: return;
    }
    ev.preventDefault();
    this.#mostrarEn(destino);
  }

  #mostrarEn(i) {
    const g = this.#geometria;
    if (!g || i == null || i < 0 || i >= g.fechas.length) return;
    this.#indiceActivo = i;

    const fecha = g.fechas[i];
    const valorCartera = g.cartera[i].valor;
    const valorIndice = g.porFechaIndice.get(fecha);

    const px = g.x(i);
    g.cruz.setAttribute('x1', px);
    g.cruz.setAttribute('x2', px);
    g.cruz.setAttribute('opacity', 0.45);

    g.focoCartera.setAttribute('cx', px);
    g.focoCartera.setAttribute('cy', g.y(valorCartera));
    g.focoCartera.setAttribute('opacity', 1);

    if (Number.isFinite(valorIndice)) {
      g.focoIndice.setAttribute('cx', px);
      g.focoIndice.setAttribute('cy', g.y(valorIndice));
      g.focoIndice.setAttribute('opacity', 1);
    } else {
      g.focoIndice.setAttribute('opacity', 0);
    }

    this.#pintarEmergente(fecha, valorCartera, valorIndice, px);
  }

  #pintarEmergente(fecha, valorCartera, valorIndice, px) {
    const e = this.#emergente;
    e.textContent = '';

    const cab = document.createElement('div');
    cab.className = 'emergente__fecha';
    cab.textContent = fechaLarga(fecha);
    e.appendChild(cab);

    const base = this.#datos.cartera[0]?.valor ?? 100;

    const fila = (nombre, valor, esIndice) => {
      const f = document.createElement('div');
      f.className = 'emergente__fila';

      const clave = document.createElement('span');
      clave.className = `emergente__clave${esIndice ? ' emergente__clave--indice' : ''}`;
      f.appendChild(clave);

      const n = document.createElement('span');
      n.className = 'emergente__nombre';
      // Los nombres proceden de la API: se insertan siempre como texto.
      n.textContent = nombre;
      f.appendChild(n);

      const v = document.createElement('span');
      v.className = 'emergente__valor';
      v.textContent = Number.isFinite(valor) ? num(valor) : '—';
      f.appendChild(v);

      e.appendChild(f);
    };

    fila(t('grafico.serie.cartera'), valorCartera, false);
    if (Number.isFinite(valorIndice)) fila(this.#datos.nombreIndice, valorIndice, true);

    const variacion = document.createElement('div');
    variacion.className = 'emergente__fila';
    const etq = document.createElement('span');
    etq.className = 'emergente__nombre';
    etq.textContent = t('grafico.emergente.acumulado');
    const val = document.createElement('span');
    val.className = 'emergente__valor';
    const pct = (valorCartera / base - 1) * 100;
    val.textContent = formatearPorcentaje(pct);
    variacion.append(etq, val);
    e.appendChild(variacion);

    e.dataset.visible = 'true';

    // Anclaje dentro del contenedor, evitando el desbordamiento lateral.
    const caja = this.#svg.getBoundingClientRect();
    const cajaCont = this.#contenedor.getBoundingClientRect();
    const escala = caja.width / this.#svg.viewBox.baseVal.width;
    const izquierdaSvg = caja.left - cajaCont.left + px * escala;

    const anchoEmergente = e.offsetWidth;
    let izquierda = izquierdaSvg + 16;
    if (izquierda + anchoEmergente > cajaCont.width - 8) izquierda = izquierdaSvg - anchoEmergente - 16;
    e.style.left = `${Math.max(8, izquierda)}px`;
    e.style.top = `${MARGEN.arriba + 12}px`;
  }

  #ocultarEmergente() {
    this.#emergente.dataset.visible = 'false';
    // La opacidad no retira la caja del flujo: sin devolverla al origen, un
    // desplazamiento previo seguiria ampliando el ancho del documento al
    // reducirse la ventana.
    this.#emergente.style.left = '0px';
    this.#emergente.style.top = '0px';
    this.#indiceActivo = null;
    if (this.#geometria) {
      this.#geometria.cruz.setAttribute('opacity', 0);
      this.#geometria.focoCartera.setAttribute('opacity', 0);
      this.#geometria.focoIndice.setAttribute('opacity', 0);
    }
  }
}

export { num, fechaCorta, fechaLarga };
