import { localeFormato } from './formato.js';
/* ============================================================================
   Portada — movimiento discreto al servicio del contenido.

   Dos piezas: la aparicion escalonada de los bloques y la cinta de
   cotizaciones. Ambas se desactivan si el sistema pide movimiento reducido.

   El hero no anima. Con la fotografia detras, la quietud sostiene mejor la
   composicion que cualquier entrada escalonada.
   ========================================================================= */

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
