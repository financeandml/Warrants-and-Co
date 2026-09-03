import { localeFormato, formatearPorcentaje } from './formato.js';
import { t } from './i18n.js';
/* ============================================================================
   Grafico de evolucion de cartera — SVG, sin dependencias externas.

   La cartera y N benchmarks activos sobre un unico eje, todos indexados a base
   100, de modo que la comparacion es directa y no existe el sesgo de un
   segundo eje. Al prescindir del color como unico portador —regla 1—, la
   identidad de cada serie recae en el TRAZO (continuo para la cartera,
   discontinuo con un patron propio para cada benchmark), la leyenda y las
   etiquetas de extremo. La cartera lleva siempre la mayor jerarquia visual:
   trazo mas grueso y sin discontinuar.
   ========================================================================= */

const NS = 'http://www.w3.org/2000/svg';

/* Sin eje izquierdo: las cifras del eje van a la DERECHA, donde acaba la serie
   y donde está la mirada. Es la convención de la prensa financiera y ahorra los
   52 px que el eje izquierdo se llevaba sin dibujar nada. El margen derecho
   aloja dos cosas: el rótulo de cada serie pegado a su último punto, y las
   cifras del eje contra el borde. */
const MARGEN = { arriba: 20, derecha: 148, abajo: 34, izquierda: 10 };
const ALTURA = 340;

/* Un patron de trazo distinto por posicion en la lista de benchmarks activos,
   no por simbolo: el catalogo puede crecer y esto sigue dando patrones
   distinguibles a los primeros cuatro sin tocar la hoja de estilos por cada
   indice nuevo. A partir del quinto se repite —cuatro es mas de lo que un
   grafico de lineas puede distinguir de un vistazo de todos modos—. */
const CLASES_BENCHMARK = ['indice-0', 'indice-1', 'indice-2', 'indice-3'];

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
  #datos = { cartera: [], benchmarks: [] };
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
   * @param {Array<{simbolo,nombre,disponible,serie:Array<{fecha,valor}>}>} benchmarks
   *   Ya alineados contra `cartera` y rebasados a 100, en el orden en que deben
   *   dibujarse. Un benchmark con `serie` vacía o toda en `null` —sin dato en
   *   todo el rango— no se dibuja, pero conserva su hueco de leyenda en las
   *   tablas que lee `app.js`, no aquí.
   */
  actualizar(cartera, benchmarks) {
    this.#datos = {
      cartera: Array.isArray(cartera) ? cartera.filter((p) => Number.isFinite(p.valor)) : [],
      benchmarks: (Array.isArray(benchmarks) ? benchmarks : []).map((b) => ({
        simbolo: b.simbolo,
        nombre: b.nombre || t('grafico.indice'),
        serie: Array.isArray(b.serie) ? b.serie : [],
      })),
    };
    this.#dibujar();
  }

  #dibujar() {
    const { cartera, benchmarks } = this.#datos;
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

    const fechas = cartera.map((p) => p.fecha);

    // Cada benchmark, reducido a los puntos con valor real, indexados a la
    // posicion `i` que ocupa esa fecha en el calendario de la cartera.
    const puntosPorBenchmark = benchmarks.map((b) => {
      const porFecha = new Map(b.serie.map((p) => [p.fecha, p.valor]));
      const puntos = [];
      fechas.forEach((f, i) => {
        const v = porFecha.get(f);
        if (Number.isFinite(v)) puntos.push({ i, v });
      });
      return { ...b, porFecha, puntos };
    });

    // Dominio comun a todas las series: un solo eje, sin doble escala.
    const valores = [
      ...cartera.map((p) => p.valor),
      ...puntosPorBenchmark.flatMap((b) => b.puntos.map((p) => p.v)),
    ];
    /* Tres marcas de altura, no cinco. Sin retícula que las prolongue, cada
       cifra es una referencia suelta contra el borde: cinco se leen como una
       lista de números y tres como una escala. */
    const { inicio, fin, ticks } = escalaY(Math.min(...valores), Math.max(...valores), 3);

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

    /* ── Área degradada bajo la cartera, SOLO la cartera ──
       Se pintaba «sin área: aquí lo que se lee es la altura sobre la base
       100, y un relleno tapaba los benchmarks justo donde se cruzan» —las
       dos razones siguen siendo ciertas, y esta área no las contradice:
       vive DETRÁS de las series de benchmark en el orden de pintado (este
       `<path>` se añade antes que el bucle de benchmarks, más abajo, así
       que sus trazos quedan encima, a opacidad plena, y ningún cruce se
       tapa), y su opacidad es lo bastante baja —10% arriba, 0 abajo— para
       que sea un acento decorativo de la serie protagonista, no una
       segunda lectura de superficie que compita con la altura. */
    const dArea = `${cartera.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.valor).toFixed(2)}`).join(' ')} L ${x(cartera.length - 1).toFixed(2)} ${y(inicio).toFixed(2)} L ${x(0).toFixed(2)} ${y(inicio).toFixed(2)} Z`;
    const defs = crear('defs');
    const gradiente = crear('linearGradient', {
      id: 'grafico-cartera-degradado', x1: '0', x2: '0', y1: '0', y2: '1',
    });
    gradiente.appendChild(crear('stop', { offset: '0%', class: 'grafico__area-parada', 'stop-opacity': '0.1' }));
    gradiente.appendChild(crear('stop', { offset: '100%', class: 'grafico__area-parada', 'stop-opacity': '0' }));
    defs.appendChild(gradiente);
    svg.appendChild(defs);
    svg.appendChild(crear('path', {
      class: 'grafico__area', d: dArea, fill: 'url(#grafico-cartera-degradado)', stroke: 'none',
    }));

    // ── Series de benchmark (fondo), cada una con su propio patron de trazo ──
    puntosPorBenchmark.forEach((b, k) => {
      if (b.puntos.length < 2) return;
      const clase = CLASES_BENCHMARK[k % CLASES_BENCHMARK.length];
      const d = b.puntos.map((p, j) => `${j === 0 ? 'M' : 'L'} ${x(p.i).toFixed(2)} ${y(p.v).toFixed(2)}`).join(' ');
      svg.appendChild(crear('path', { class: `grafico__linea grafico__linea--indice grafico__linea--${clase}`, d }));
    });

    // ── Serie de la cartera: trazo protagonista ──
    const dLinea = cartera.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.valor).toFixed(2)}`).join(' ');
    svg.appendChild(crear('path', { class: 'grafico__linea', d: dLinea }));

    /* ── Rótulo directo al final de cada serie ──
       Nombre y último nivel pegados al punto donde la serie acaba. Es lo que
       sustituye a la clave de color: quien mira no tiene que emparejar un
       cuadradito de una leyenda con una línea del dibujo, porque la línea lleva
       su nombre escrito al lado. La leyenda de abajo conserva otra cosa —la
       rentabilidad medida y desde dónde se mide—, que es un hecho distinto. */
    const finesOcupados = [];
    const rotularFin = (punto, nombre, esBenchmark, claseIndice) => {
      const px = x(punto.i);
      const pyReal = y(punto.v);
      /* Empuja el rótulo hacia abajo hasta que no choque con ninguno de los ya
         colocados. El marcador se queda donde de verdad acaba la serie —mover
         el punto sería mover el dato—; solo el rótulo de dos renglones se
         desplaza. */
      let yTexto = pyReal;
      let intentos = 0;
      while (finesOcupados.some((o) => Math.abs(yTexto - o) < 24) && intentos < 8) { yTexto += 26; intentos++; }
      finesOcupados.push(yTexto);

      svg.appendChild(crear('circle', {
        class: `grafico__marcador${esBenchmark ? ' grafico__marcador--indice' : ''}`,
        cx: px, cy: pyReal, r: esBenchmark ? 3.5 : 4,
      }));
      const g = crear('g', { class: `grafico__fin${esBenchmark ? ` grafico__fin--indice grafico__fin--${claseIndice}` : ''}` });
      const etNombre = crear('text', { class: 'grafico__fin-nombre', x: px + 10, y: yTexto - 3 });
      etNombre.textContent = nombre;
      const etValor = crear('text', { class: 'grafico__fin-valor', x: px + 10, y: yTexto + 13 });
      etValor.textContent = num(punto.v);
      g.append(etNombre, etValor);
      svg.appendChild(g);
    };

    const finCartera = cartera[cartera.length - 1];
    rotularFin({ i: cartera.length - 1, v: finCartera.valor }, t('grafico.serie.cartera'), false);

    puntosPorBenchmark.forEach((b, k) => {
      if (b.puntos.length < 2) return;
      const finB = b.puntos[b.puntos.length - 1];
      rotularFin(finB, t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo }),
        true, CLASES_BENCHMARK[k % CLASES_BENCHMARK.length]);
    });

    // ── Capa de interaccion ──
    const capa = crear('g', { class: 'grafico__interaccion' });
    const cruz = crear('line', { class: 'grafico__cruz', y1: MARGEN.arriba, y2: MARGEN.arriba + altoUtil, x1: 0, x2: 0, opacity: 0 });
    const focoCartera = crear('circle', { class: 'grafico__foco', r: 4.5, stroke: 'var(--serie-cartera)', opacity: 0 });
    capa.append(cruz, focoCartera);
    const focosBenchmark = puntosPorBenchmark.map(() => {
      const c = crear('circle', { class: 'grafico__foco', r: 4, stroke: 'var(--serie-indice)', opacity: 0 });
      capa.appendChild(c);
      return c;
    });

    const superficie = crear('rect', {
      x: MARGEN.izquierda, y: MARGEN.arriba,
      width: Math.max(anchoUtil, 1), height: Math.max(altoUtil, 1),
      fill: 'transparent', style: 'cursor: crosshair',
    });
    capa.appendChild(superficie);
    svg.appendChild(capa);

    this.#svg = svg;
    this.#geometria = {
      x, y, anchoUtil, cartera, fechas, cruz, focoCartera,
      benchmarks: puntosPorBenchmark.map((b, k) => ({ ...b, foco: focosBenchmark[k] })),
    };

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
    const { cartera, benchmarks } = this.#datos;
    const primero = cartera[0];
    const ultimo = cartera[cartera.length - 1];
    const variacion = (ultimo.valor / primero.valor - 1) * 100;
    const nombresBenchmark = benchmarks.map((b) => t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo })).join(', ');
    destino.textContent = t('grafico.descripcion', {
      n: cartera.length,
      desde: fechaLarga(primero.fecha),
      hasta: fechaLarga(ultimo.fecha),
      inicial: num(primero.valor),
      final: num(ultimo.valor),
      variacion: formatearPorcentaje(variacion),
      indice: nombresBenchmark || t('grafico.indice'),
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

    const px = g.x(i);
    g.cruz.setAttribute('x1', px);
    g.cruz.setAttribute('x2', px);
    g.cruz.setAttribute('opacity', 0.45);

    g.focoCartera.setAttribute('cx', px);
    g.focoCartera.setAttribute('cy', g.y(valorCartera));
    g.focoCartera.setAttribute('opacity', 1);

    const valoresBenchmark = g.benchmarks.map((b) => {
      const v = b.porFecha.get(fecha);
      if (Number.isFinite(v)) {
        b.foco.setAttribute('cx', px);
        b.foco.setAttribute('cy', g.y(v));
        b.foco.setAttribute('opacity', 1);
      } else {
        b.foco.setAttribute('opacity', 0);
      }
      return { simbolo: b.simbolo, nombre: b.nombre, valor: Number.isFinite(v) ? v : null };
    });

    this.#pintarEmergente(fecha, valorCartera, valoresBenchmark, px);
  }

  /**
   * Dos bloques, como pidió el dueño: los valores indexados de cada serie
   * activa en esa fecha, y debajo su rentabilidad desde la base del rango —no
   * la misma cifra repetida dos veces, sino dos preguntas distintas: «dónde
   * está» y «cuánto ha hecho desde que empezó a medirse».
   */
  #pintarEmergente(fecha, valorCartera, valoresBenchmark, px) {
    const e = this.#emergente;
    e.textContent = '';

    const cab = document.createElement('div');
    cab.className = 'emergente__fecha';
    cab.textContent = fechaLarga(fecha);
    e.appendChild(cab);

    const baseCartera = this.#datos.cartera[0]?.valor ?? 100;
    const basesBenchmark = new Map(
      this.#datos.benchmarks.map((b) => [b.simbolo, b.serie.find((p) => Number.isFinite(p.valor))?.valor ?? null]));

    const filaValor = (nombre, valor, esIndice) => {
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

    filaValor(t('grafico.serie.cartera'), valorCartera, false);
    for (const b of valoresBenchmark) {
      filaValor(t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo }), b.valor, true);
    }

    const separador = document.createElement('div');
    separador.className = 'emergente__separador';
    e.appendChild(separador);

    const filaRetorno = (nombre, valor, base, esIndice) => {
      const f = document.createElement('div');
      f.className = 'emergente__fila';
      const clave = document.createElement('span');
      clave.className = `emergente__clave${esIndice ? ' emergente__clave--indice' : ''}`;
      f.appendChild(clave);
      const n = document.createElement('span');
      n.className = 'emergente__nombre';
      n.textContent = nombre;
      f.appendChild(n);
      const v = document.createElement('span');
      const pct = Number.isFinite(valor) && Number.isFinite(base) && base > 0 ? (valor / base - 1) * 100 : null;
      v.className = `emergente__valor ${pct === null ? '' : (pct > 0 ? 'variacion--positiva' : pct < 0 ? 'variacion--negativa' : 'variacion--nula')}`;
      v.textContent = formatearPorcentaje(pct);
      f.appendChild(v);
      e.appendChild(f);
    };

    filaRetorno(t('grafico.emergente.acumulado'), valorCartera, baseCartera, false);
    for (const b of valoresBenchmark) {
      filaRetorno(t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo }),
        b.valor, basesBenchmark.get(b.simbolo), true);
    }

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
      for (const b of this.#geometria.benchmarks) b.foco.setAttribute('opacity', 0);
    }
  }
}

export { num, fechaCorta, fechaLarga };
