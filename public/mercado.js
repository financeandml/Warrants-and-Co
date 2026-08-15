/* ============================================================================
   Markets — panorama de mercado.

   La sección se organiza por naturaleza del instrumento, no por proveedor:
   renta variable, volatilidad y curva de tipos. Cada dato lleva su calidad
   declarada y su antigüedad, porque un cierre de ayer y una cotización de hace
   un minuto no son la misma cosa aunque se impriman igual.
   ========================================================================= */

import { $, elemento, formatearNumero } from './formato.js';

const NO_DISPONIBLE = 'N/A';

const FLECHA = { UP: '▲', DOWN: '▼', FLAT: '—', UNKNOWN: '' };

function sello(calidad, explicacion = '') {
  const s = elemento('span', `sello sello--${String(calidad ?? 'UNAVAILABLE').toLowerCase()}`, calidad ?? 'UNAVAILABLE');
  if (explicacion) s.title = explicacion;
  return s;
}

/** Antigüedad legible del dato. */
function frescura(segundos) {
  if (!Number.isFinite(segundos)) return NO_DISPONIBLE;
  if (segundos < 60) return `hace ${segundos} s`;
  if (segundos < 3600) return `hace ${Math.round(segundos / 60)} min`;
  return `hace ${Math.round(segundos / 3600)} h`;
}

export function pintarPanorama(datos) {
  const raiz = $('#panorama-mercado');
  const estado = $('#estado-mercado');
  if (!raiz) return;
  raiz.textContent = '';

  if (estado) {
    estado.textContent =
      `${datos.cobertura.resueltos} de ${datos.cobertura.solicitados} instrumentos resueltos` +
      (datos.proveedores?.length ? ` · ${datos.proveedores.join(' → ')}` : '');
  }

  for (const grupo of datos.grupos) {
    const seccion = elemento('section', 'bloque-panel');

    const cabecera = elemento('div', 'bloque-panel__cabecera');
    cabecera.appendChild(elemento('h2', '', grupo.titulo));
    cabecera.appendChild(elemento('p', '', grupo.descripcion));
    seccion.appendChild(cabecera);

    const rejilla = elemento('div', 'rejilla-mercado');
    for (const i of grupo.instrumentos) rejilla.appendChild(tarjetaInstrumento(i));
    // Lo que la sección reconoce pero nadie sirve se muestra igual, declarado.
    for (const s of grupo.sinFuente ?? []) rejilla.appendChild(tarjetaAusente(s));
    seccion.appendChild(rejilla);

    // La curva de tipos merece su propia lectura, no solo cinco cifras sueltas.
    if (grupo.clave === 'tipos' && datos.curvaTipos?.disponible) {
      seccion.appendChild(bloqueCurva(datos.curvaTipos));
    }

    raiz.appendChild(seccion);
  }

  raiz.appendChild(bloqueLeyenda(datos));
}

function tarjetaInstrumento(i) {
  const t = elemento('article', 'tarjeta-mercado');
  t.dataset.direccion = i.direccion;

  const cabecera = elemento('div', 'tarjeta-mercado__cabecera');
  cabecera.appendChild(elemento('h3', 'tarjeta-mercado__nombre', i.nombre));
  cabecera.appendChild(elemento('span', 'tarjeta-mercado__simbolo', i.simbolo));
  t.appendChild(cabecera);

  if (!i.disponible) {
    t.appendChild(elemento('span', 'tarjeta-mercado__valor tarjeta-mercado__valor--ausente', NO_DISPONIBLE));
    t.appendChild(elemento('p', 'tarjeta-mercado__motivo', i.motivo ?? 'Data unavailable'));
    t.appendChild(sello('UNAVAILABLE'));
    return t;
  }

  const decimales = i.decimales ?? 2;
  const sufijo = i.formato === 'tipo' ? ' %' : '';
  t.appendChild(elemento('span', 'tarjeta-mercado__valor',
    `${formatearNumero(i.valor, decimales)}${sufijo}`));

  const cambio = elemento('div', 'tarjeta-mercado__cambio');
  cambio.appendChild(elemento('span', 'tarjeta-mercado__flecha', FLECHA[i.direccion] ?? ''));
  cambio.appendChild(elemento('span', '',
    Number.isFinite(i.variacion)
      ? `${i.variacion > 0 ? '+' : ''}${formatearNumero(i.variacion, decimales)}`
      : NO_DISPONIBLE));
  cambio.appendChild(elemento('span', 'tarjeta-mercado__pct',
    Number.isFinite(i.variacionPct)
      ? `${i.variacionPct > 0 ? '+' : ''}${formatearNumero(i.variacionPct, 2)} %`
      : NO_DISPONIBLE));
  t.appendChild(cambio);

  if (i.nota) t.appendChild(elemento('p', 'tarjeta-mercado__nota', i.nota));

  const pie = elemento('div', 'tarjeta-mercado__pie');
  pie.appendChild(sello(i.calidad, i.explicacionCalidad ?? ''));
  pie.appendChild(elemento('span', '', frescura(i.antiguedadSegundos)));
  pie.appendChild(elemento('span', '', i.fuente ?? ''));
  t.appendChild(pie);

  return t;
}

function tarjetaAusente(s) {
  const t = elemento('article', 'tarjeta-mercado tarjeta-mercado--ausente');
  const cabecera = elemento('div', 'tarjeta-mercado__cabecera');
  cabecera.appendChild(elemento('h3', 'tarjeta-mercado__nombre', s.nombre));
  t.appendChild(cabecera);
  t.appendChild(elemento('span', 'tarjeta-mercado__valor tarjeta-mercado__valor--ausente', NO_DISPONIBLE));
  t.appendChild(elemento('p', 'tarjeta-mercado__motivo', s.motivo));
  t.appendChild(sello('UNAVAILABLE'));
  return t;
}

/**
 * Curva de tipos: los cinco tramos en su escala real, más la pendiente 10a−2a,
 * que es la lectura que interesa y un cálculo propio sobre dos observaciones.
 */
function bloqueCurva(curva) {
  const bloque = elemento('div', 'curva-tipos');

  const cabecera = elemento('div', 'curva-tipos__cabecera');
  cabecera.appendChild(elemento('h3', '', 'Pendiente de la curva'));

  const p = curva.pendiente;
  if (p.disponible) {
    const valor = elemento('strong', 'curva-tipos__pendiente',
      `${p.puntosBasicos > 0 ? '+' : ''}${formatearNumero(p.puntosBasicos, 1)} pb`);
    cabecera.appendChild(valor);
    cabecera.appendChild(elemento('span', 'curva-tipos__lectura',
      p.invertida ? 'Curva invertida (10 a < 2 a)' : 'Curva con pendiente positiva (10 a > 2 a)'));
    cabecera.appendChild(sello('CALCULATED', 'Diferencia entre los tramos de 10 y 2 años.'));
  } else {
    cabecera.appendChild(elemento('strong', 'curva-tipos__pendiente curva-tipos__pendiente--ausente', NO_DISPONIBLE));
    cabecera.appendChild(elemento('span', 'curva-tipos__lectura', p.motivo));
  }
  bloque.appendChild(cabecera);

  // Representación proporcional: la barra mide el rendimiento sobre el máximo.
  const maximo = Math.max(...curva.puntos.map((x) => x.valor));
  const barras = elemento('div', 'curva-tipos__barras');
  for (const punto of curva.puntos) {
    const columna = elemento('div', 'curva-tipos__punto');
    const barra = elemento('div', 'curva-tipos__barra');
    barra.style.height = `${Math.max(6, (punto.valor / maximo) * 100)}%`;
    columna.appendChild(elemento('span', 'curva-tipos__valor', `${formatearNumero(punto.valor, 2)} %`));
    columna.appendChild(barra);
    columna.appendChild(elemento('span', 'curva-tipos__plazo',
      punto.plazoAnios < 1 ? `${punto.plazoAnios * 12} m` : `${punto.plazoAnios} a`));
    barras.appendChild(columna);
  }
  bloque.appendChild(barras);

  return bloque;
}

/** Leyenda de calidades: qué significa cada sello y qué no tenemos. */
function bloqueLeyenda(datos) {
  const bloque = elemento('section', 'bloque-panel');
  const cabecera = elemento('div', 'bloque-panel__cabecera');
  cabecera.appendChild(elemento('h2', '', 'Calidad del dato'));
  cabecera.appendChild(elemento('p', '', 'Qué significa cada sello en esta página'));
  bloque.appendChild(cabecera);

  const lista = elemento('div', 'rejilla-leyenda');
  for (const [clave, texto] of Object.entries(datos.calidades ?? {})) {
    const fila = elemento('div', 'leyenda-calidad');
    fila.appendChild(sello(clave));
    fila.appendChild(elemento('span', '', texto));
    lista.appendChild(fila);
  }
  bloque.appendChild(lista);

  if (datos.cobertura?.ausentes?.length) {
    const nota = elemento('p', 'nota-metodologica',
      `No resuelto en esta carga: ${datos.cobertura.ausentes.map((a) => a.nombre).join(', ')}.`);
    bloque.appendChild(nota);
  }

  return bloque;
}
