import { localeFormato } from './formato.js';
/* ============================================================================
   Portada — movimiento discreto al servicio del contenido.

   Cuatro piezas: el titular que se compone por palabras, la curva de la cartera
   que se traza al cargar, la aparicion escalonada de los bloques y la cinta de
   cotizaciones. Todo se desactiva si el sistema pide movimiento reducido.
   ========================================================================= */

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const NS = 'http://www.w3.org/2000/svg';

/** Descompone el titular en palabras para escalonar su entrada. */
export function componerTitular(elemento) {
  if (!elemento || elemento.dataset.compuesto === 'true') return;
  const palabras = elemento.textContent.trim().split(/\s+/);
  elemento.textContent = '';
  palabras.forEach((palabra, i) => {
    const span = document.createElement('span');
    span.className = 'palabra';
    span.style.setProperty('--i', String(i));
    span.textContent = palabra;
    elemento.appendChild(span);
    if (i < palabras.length - 1) elemento.appendChild(document.createTextNode(' '));
  });
  elemento.dataset.compuesto = 'true';
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

/**
 * Traza la silueta real de la cartera como fondo de la portada.
 * Si no hay serie disponible, el elemento queda vacio y la portada se sostiene sola.
 */
export function dibujarCurva(serie) {
  const svg = document.getElementById('portada-curva');
  if (!svg) return;
  svg.textContent = '';
  if (!Array.isArray(serie) || serie.length < 8) return;

  const ANCHO = 720;
  const ALTO = 300;
  const valores = serie.map((p) => p.valor).filter(Number.isFinite);
  if (valores.length < 8) return;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  // Margen superior e inferior para que la curva no roce los bordes.
  const x = (i) => (ANCHO * i) / (valores.length - 1);
  const y = (v) => ALTO - 26 - ((v - min) / rango) * (ALTO - 70);

  const d = valores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const relleno = document.createElementNS(NS, 'path');
  relleno.setAttribute('class', 'relleno');
  relleno.setAttribute('d', `${d} L ${ANCHO} ${ALTO} L 0 ${ALTO} Z`);
  svg.appendChild(relleno);

  const linea = document.createElementNS(NS, 'path');
  linea.setAttribute('d', d);
  svg.appendChild(linea);

  // La longitud real del trazo alimenta la animacion, que asi dura lo mismo
  // sea cual sea la forma de la curva.
  if (sinMovimiento()) {
    linea.style.setProperty('--largo', '0');
  } else {
    const largo = typeof linea.getTotalLength === 'function' ? linea.getTotalLength() : 2400;
    linea.style.setProperty('--largo', String(Math.ceil(largo)));
  }
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
    const t = Math.min((ahora - inicio) / duracion, 1);
    // Desaceleracion suave hacia el valor final.
    const suave = 1 - (1 - t) ** 3;
    elemento.textContent = Math.round(objetivo * suave).toLocaleString(localeFormato());
    if (t < 1) requestAnimationFrame(paso);
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
        ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatear(Math.abs(v))} %`
        : (l.cerrada ? 'liquidada' : '—');
      item.appendChild(variacion);

      if (l.cerrada) {
        const marca = document.createElement('span');
        marca.className = 'cotiza__var';
        marca.textContent = '· liquidada';
        item.appendChild(marca);
      }
      grupo.appendChild(item);
    }
    return grupo;
  };

  pista.appendChild(construirGrupo(false));
  pista.appendChild(construirGrupo(true));
}
