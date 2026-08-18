import { localeFormato, formatearPorcentaje } from './formato.js';
/* ============================================================================
   Grafico de evolucion de cartera — SVG, sin dependencias externas.

   Dos series sobre un unico eje, ambas indexadas a base 100, de modo que la
   comparacion es directa y no existe el sesgo de un segundo eje.
   Al prescindir del color, la identidad de cada serie recae en el trazo
   (continuo frente a discontinuo), la leyenda y las etiquetas de extremo.
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

const MARGEN = { arriba: 22, derecha: 68, abajo: 34, izquierda: 52 };
const ALTURA = 340;

const crear = (nombre, atributos = {}) => {
  const el = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, String(v));
  return el;
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(iso) {
  const [a, m, d] = iso.split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
}

function fechaLarga(iso) {
  const [a, m, d] = iso.split('-');
  return `${Number(d)} de ${MESES[Number(m) - 1]} de ${a}`;
}

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
  #datos = { cartera: [], indice: [], nombreIndice: 'Índice' };
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
      nombreIndice: nombreIndice || 'Índice',
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
        const t = document.createElement('strong');
        t.textContent = 'Serie no disponible';
        vacio.appendChild(t);
        vacio.appendChild(
          document.createTextNode(
            'No existe histórico suficiente para representar la evolución de la cartera.'
          )
        );
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
    const { inicio, fin, ticks } = escalaY(Math.min(...valores), Math.max(...valores));

    const fechas = cartera.map((p) => p.fecha);
    const x = (i) => MARGEN.izquierda + (anchoUtil * i) / Math.max(fechas.length - 1, 1);
    const y = (v) => MARGEN.arriba + altoUtil - (altoUtil * (v - inicio)) / Math.max(fin - inicio, 1e-9);

    const svg = crear('svg', {
      viewBox: `0 0 ${ancho} ${ALTURA}`,
      preserveAspectRatio: 'xMidYMid meet',
      tabindex: '0',
      role: 'application',
      'aria-label': 'Gráfico de evolución de la cartera. Use las flechas para recorrer las sesiones.',
    });

    // ── Rejilla y eje de valores ──
    for (const t of ticks) {
      const py = y(t);
      if (py < MARGEN.arriba - 1 || py > MARGEN.arriba + altoUtil + 1) continue;
      svg.appendChild(crear('line', { class: 'grafico__rejilla', x1: MARGEN.izquierda, x2: MARGEN.izquierda + anchoUtil, y1: py, y2: py }));
      const et = crear('text', { class: 'grafico__texto', x: MARGEN.izquierda - 10, y: py + 3.5, 'text-anchor': 'end' });
      et.textContent = num(t, 0);
      svg.appendChild(et);
    }

    // Referencia de capital invertido.
    if (100 >= inicio && 100 <= fin) {
      svg.appendChild(crear('line', { class: 'grafico__base', x1: MARGEN.izquierda, x2: MARGEN.izquierda + anchoUtil, y1: y(100), y2: y(100) }));
    }

    svg.appendChild(crear('line', { class: 'grafico__eje', x1: MARGEN.izquierda, x2: MARGEN.izquierda + anchoUtil, y1: MARGEN.arriba + altoUtil, y2: MARGEN.arriba + altoUtil }));

    // ── Eje temporal: como maximo seis marcas legibles ──
    const maxMarcas = Math.max(2, Math.min(6, Math.floor(anchoUtil / 96)));
    const salto = Math.max(1, Math.ceil(fechas.length / maxMarcas));
    for (let i = 0; i < fechas.length; i += salto) {
      const et = crear('text', { class: 'grafico__texto', x: x(i), y: ALTURA - MARGEN.abajo + 20, 'text-anchor': 'middle' });
      et.textContent = fechaCorta(fechas[i]);
      svg.appendChild(et);
    }
    // La ultima sesion siempre queda rotulada si no colisiona con la anterior.
    const ultimo = fechas.length - 1;
    if ((ultimo % salto) !== 0 && x(ultimo) - x(ultimo - (ultimo % salto)) > 58) {
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
    const base = MARGEN.arriba + altoUtil;
    svg.appendChild(crear('path', { class: 'grafico__area', d: `${dLinea} L ${x(cartera.length - 1).toFixed(2)} ${base} L ${x(0).toFixed(2)} ${base} Z` }));
    svg.appendChild(crear('path', { class: 'grafico__linea', d: dLinea }));

    // ── Marcadores y etiquetas de extremo (rotulado selectivo) ──
    const finCartera = cartera[cartera.length - 1];
    svg.appendChild(crear('circle', { class: 'grafico__marcador', cx: x(cartera.length - 1), cy: y(finCartera.valor), r: 4.5 }));

    const etCartera = crear('text', {
      class: 'grafico__etiqueta-final',
      x: x(cartera.length - 1) + 11,
      y: y(finCartera.valor) + 4,
    });
    etCartera.textContent = num(finCartera.valor);
    svg.appendChild(etCartera);

    if (puntosIndice.length > 1) {
      const finIndice = puntosIndice[puntosIndice.length - 1];
      svg.appendChild(crear('circle', { class: 'grafico__marcador grafico__marcador--indice', cx: x(finIndice.i), cy: y(finIndice.v), r: 4 }));

      // Separacion minima entre etiquetas de extremo para evitar solapamiento.
      let yIndice = y(finIndice.v) + 4;
      if (Math.abs(yIndice - (y(finCartera.valor) + 4)) < 14) {
        yIndice = y(finCartera.valor) + 4 + (finIndice.v < finCartera.valor ? 14 : -14);
      }
      const etIndice = crear('text', {
        class: 'grafico__etiqueta-final grafico__etiqueta-final--indice',
        x: x(finIndice.i) + 11,
        y: yIndice,
      });
      etIndice.textContent = num(finIndice.v);
      svg.appendChild(etIndice);
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
    const variacion = ((ultimo.valor / primero.valor - 1) * 100).toFixed(2);
    destino.textContent =
      `Serie de ${cartera.length} sesiones entre el ${fechaLarga(primero.fecha)} y el ${fechaLarga(ultimo.fecha)}. ` +
      `La cartera evoluciona desde ${num(primero.valor)} hasta ${num(ultimo.valor)} en base 100, ` +
      `lo que representa una variación del ${variacion} por ciento. Comparada con ${nombreIndice}. ` +
      `El detalle numérico completo está disponible en la tabla de datos.`;
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

    fila('Cartera', valorCartera, false);
    if (Number.isFinite(valorIndice)) fila(this.#datos.nombreIndice, valorIndice, true);

    const variacion = document.createElement('div');
    variacion.className = 'emergente__fila';
    const etq = document.createElement('span');
    etq.className = 'emergente__nombre';
    etq.textContent = 'Acumulado';
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
