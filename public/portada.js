/* ============================================================================
   Portada — la cabecera y la cinta de mercado.

   Fase D.6: el hero fotográfico y toda la geometría que existía para
   encuadrarlo —`seguirEncuadreBanner()`, la constante `BANNER`, la
   histéresis de `asomoDelManifiesto()`— se retiraron con la foto. Ese
   mecanismo no describía nada más que esa imagen; sin ella no había nada que
   seguir midiendo. Lo que queda aquí es lo que nunca dependió de la foto: la
   altura real de la cabecera y la cinta de cotizaciones.
   ========================================================================= */

import { localeFormato, formatearPorcentaje } from './formato.js';
import { t } from './i18n.js';


/**
 * Publica la altura real de la cabecera en `--alto-cabecera`.
 *
 * No vale una constante: la cabecera es `position: sticky`, ocupa sitio en el
 * flujo y se reparte en varias filas al estrecharse la ventana —69 px en
 * escritorio, 164 px a 390 px de ancho—. Cambia además al cambiar de idioma,
 * porque los rótulos no miden lo mismo en español que en inglés y pueden
 * reordenar el reparto.
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
