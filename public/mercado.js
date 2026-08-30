/* ============================================================================
   Markets — panorama de mercado.

   La sección se organiza por naturaleza del instrumento, no por proveedor:
   renta variable, volatilidad y curva de tipos. Cada dato lleva su calidad
   declarada y su antigüedad, porque un cierre de ayer y una cotización de hace
   un minuto no son la misma cosa aunque se impriman igual.
   ========================================================================= */

import {
  $, elemento, formatearNumero, porcentaje, formatearPorcentaje, relativo,
} from './formato.js';
import { t } from './i18n.js';
import { etiquetaSello, claseSello } from './vocabulario.js';

/* El rótulo de ausencia se resuelve al pintar, que es cuando se sabe el idioma. */
const noDisponible = () => t('general.noDisponible');

const FLECHA = { UP: '▲', DOWN: '▼', FLAT: '—', UNKNOWN: '' };

/* El sello venía duplicado aquí, con el código crudo por rótulo: «UNAVAILABLE»
   en mitad del castellano. Ahora sale de `vocabulario.js`, que es donde vive el
   vocabulario cerrado del servidor. El código sigue en la clase. */
function sello(calidad, explicacion = '') {
  const s = elemento('span', claseSello(calidad), etiquetaSello(calidad));
  if (explicacion) s.title = explicacion;
  return s;
}

/* Antigüedad del dato. Era una escalera de condiciones —«hace N s», «min», «h»—
   que solo sabía castellano; la unidad y el plural son cosa del idioma, y eso lo
   sabe `Intl.RelativeTimeFormat`. Se escoge la unidad y él redacta el resto. */
function frescura(segundos) {
  if (!Number.isFinite(segundos)) return noDisponible();
  const f = relativo({ numeric: 'always' });
  if (segundos < 60) return f.format(-segundos, 'second');
  if (segundos < 3600) return f.format(-Math.round(segundos / 60), 'minute');
  return f.format(-Math.round(segundos / 3600), 'hour');
}

export function pintarPanorama(datos) {
  const raiz = $('#panorama-mercado');
  const estado = $('#estado-mercado');
  if (!raiz) return;
  raiz.textContent = '';

  if (estado) {
    // La cadena de proveedores es un dato aparte, no parte de la frase: se une
    // con el separador de lista y conserva su propia flecha.
    const partes = [t('mercado.cobertura', {
      n: datos.cobertura.resueltos, total: datos.cobertura.solicitados,
    })];
    if (datos.proveedores?.length) partes.push(datos.proveedores.join(' → '));
    estado.textContent = partes.join(t('general.separadorLista'));
  }

  for (const grupo of datos.grupos) {
    const seccion = elemento('section', 'bloque-panel');

    const cabecera = elemento('div', 'bloque-panel__cabecera');
    cabecera.appendChild(elemento('h2', '', t(`mercado.grupo.${grupo.clave}.titulo`)));
    cabecera.appendChild(elemento('p', '', t(`mercado.grupo.${grupo.clave}.descripcion`)));
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

  raiz.appendChild(bloqueLeyenda());
}

function tarjetaInstrumento(i) {
  const tarjeta = elemento('article', 'tarjeta-mercado');
  tarjeta.dataset.direccion = i.direccion;

  const cabecera = elemento('div', 'tarjeta-mercado__cabecera');
  cabecera.appendChild(elemento('h3', 'tarjeta-mercado__nombre', i.nombre));
  cabecera.appendChild(elemento('span', 'tarjeta-mercado__simbolo', i.simbolo));
  tarjeta.appendChild(cabecera);

  if (!i.disponible) {
    tarjeta.appendChild(elemento('span', 'tarjeta-mercado__valor tarjeta-mercado__valor--ausente', noDisponible()));
    // El motivo es un código fijo del catálogo del servidor y se traduce; lo
    // que diga el proveedor (`detalle`) es texto ajeno y no se traduce: solo
    // se ofrece como título emergente, para quien quiera el diagnóstico.
    const motivo = elemento('p', 'tarjeta-mercado__motivo', i.motivo ? t(`mercado.motivo.${i.motivo}`) : t('mercado.sinMotivo'));
    if (i.detalle) motivo.title = i.detalle;
    tarjeta.appendChild(motivo);
    tarjeta.appendChild(sello('UNAVAILABLE'));
    return tarjeta;
  }

  const decimales = i.decimales ?? 2;
  // Un tipo de interés SÍ se enuncia en por ciento; un nivel de índice, no.
  tarjeta.appendChild(elemento('span', 'tarjeta-mercado__valor',
    i.formato === 'tipo' ? porcentaje(i.valor, decimales) : formatearNumero(i.valor, decimales)));

  const cambio = elemento('div', 'tarjeta-mercado__cambio');
  cambio.appendChild(elemento('span', 'tarjeta-mercado__flecha', FLECHA[i.direccion] ?? ''));
  cambio.appendChild(elemento('span', '',
    Number.isFinite(i.variacion)
      ? `${i.variacion > 0 ? '+' : ''}${formatearNumero(i.variacion, decimales)}`
      : noDisponible()));
  cambio.appendChild(elemento('span', 'tarjeta-mercado__pct',
    Number.isFinite(i.variacionPct)
      ? formatearPorcentaje(i.variacionPct)
      : noDisponible()));
  tarjeta.appendChild(cambio);

  if (i.nota) tarjeta.appendChild(elemento('p', 'tarjeta-mercado__nota', t(`mercado.motivo.${i.nota}`)));

  const pie = elemento('div', 'tarjeta-mercado__pie');
  const explicacion = i.explicacionCalidad
    ? t(`mercado.motivo.${i.explicacionCalidad}`, i.explicacionCalidad === 'CALIDAD_FUERA_DE_SESION'
        ? { estado: t(`mercado.estadoMercado.${i.estadoMercado}`) } : undefined)
    : '';
  pie.appendChild(sello(i.calidad, explicacion));
  pie.appendChild(elemento('span', '', frescura(i.antiguedadSegundos)));
  pie.appendChild(elemento('span', '', i.fuente ?? ''));
  tarjeta.appendChild(pie);

  return tarjeta;
}

function tarjetaAusente(s) {
  const tarjeta = elemento('article', 'tarjeta-mercado tarjeta-mercado--ausente');
  const cabecera = elemento('div', 'tarjeta-mercado__cabecera');
  cabecera.appendChild(elemento('h3', 'tarjeta-mercado__nombre', s.nombre));
  tarjeta.appendChild(cabecera);
  tarjeta.appendChild(elemento('span', 'tarjeta-mercado__valor tarjeta-mercado__valor--ausente', noDisponible()));
  tarjeta.appendChild(elemento('p', 'tarjeta-mercado__motivo', t(`mercado.motivo.${s.motivo}`)));
  tarjeta.appendChild(sello('UNAVAILABLE'));
  return tarjeta;
}

/**
 * Curva de tipos: los cinco tramos en su escala real, más la pendiente 10a−2a,
 * que es la lectura que interesa y un cálculo propio sobre dos observaciones.
 */
function bloqueCurva(curva) {
  const bloque = elemento('div', 'curva-tipos');

  const cabecera = elemento('div', 'curva-tipos__cabecera');
  cabecera.appendChild(elemento('h3', '', t('mercado.curva.titulo')));

  const p = curva.pendiente;
  if (p.disponible) {
    // El signo lo pone la casa —«−» tipográfico, no el guion de `Intl`—, así que
    // la cifra viaja ya formateada y la plantilla solo le pega su unidad.
    const cifra = `${p.puntosBasicos > 0 ? '+' : ''}${formatearNumero(p.puntosBasicos, 1)}`;
    cabecera.appendChild(elemento('strong', 'curva-tipos__pendiente',
      t('mercado.curva.puntosBasicos', { valor: cifra })));
    cabecera.appendChild(elemento('span', 'curva-tipos__lectura',
      t(p.invertida ? 'mercado.curva.invertida' : 'mercado.curva.positiva')));
    cabecera.appendChild(sello('CALCULATED', t('mercado.curva.selloNota')));
  } else {
    cabecera.appendChild(elemento('strong', 'curva-tipos__pendiente curva-tipos__pendiente--ausente', noDisponible()));
    cabecera.appendChild(elemento('span', 'curva-tipos__lectura', t(`mercado.motivo.${p.motivo}`)));
  }
  bloque.appendChild(cabecera);

  // Representación proporcional: la barra mide el rendimiento sobre el máximo.
  const maximo = Math.max(...curva.puntos.map((x) => x.valor));
  const barras = elemento('div', 'curva-tipos__barras');
  for (const punto of curva.puntos) {
    const columna = elemento('div', 'curva-tipos__punto');
    const barra = elemento('div', 'curva-tipos__barra');
    barra.style.height = `${Math.max(6, (punto.valor / maximo) * 100)}%`;
    columna.appendChild(elemento('span', 'curva-tipos__valor', porcentaje(punto.valor)));
    columna.appendChild(barra);
    // «m» y «a» son abreviaturas de mes y año, y en inglés no son las mismas.
    columna.appendChild(elemento('span', 'curva-tipos__plazo',
      punto.plazoAnios < 1
        ? t('mercado.curva.plazoMeses', { n: punto.plazoAnios * 12 })
        : t('mercado.curva.plazoAnios', { n: punto.plazoAnios })));
    barras.appendChild(columna);
  }
  bloque.appendChild(barras);

  return bloque;
}

// Los cuatro sellos de calidad son un vocabulario cerrado del servidor —igual
// que `CALIDAD` en `src/mercado/panorama.js`— y su explicación es fija: vive
// en el diccionario del cliente (`mercado.calidad.leyenda.*`), no en la red.
const CALIDADES_LEYENDA = ['REAL_TIME', 'DELAYED', 'HISTORICAL', 'UNAVAILABLE'];

/** Leyenda de calidades: qué significa cada sello y qué no tenemos. */
function bloqueLeyenda() {
  const bloque = elemento('section', 'bloque-panel');
  const cabecera = elemento('div', 'bloque-panel__cabecera');
  cabecera.appendChild(elemento('h2', '', t('mercado.leyenda.titulo')));
  cabecera.appendChild(elemento('p', '', t('mercado.leyenda.subtitulo')));
  bloque.appendChild(cabecera);

  const lista = elemento('div', 'rejilla-leyenda');
  for (const clave of CALIDADES_LEYENDA) {
    const fila = elemento('div', 'leyenda-calidad');
    fila.appendChild(sello(clave));
    fila.appendChild(elemento('span', '', t(`mercado.calidad.leyenda.${clave}`)));
    lista.appendChild(fila);
  }
  bloque.appendChild(lista);

  if (datos.cobertura?.ausentes?.length) {
    const nota = elemento('p', 'nota-metodologica', t('mercado.leyenda.ausentes', {
      instrumentos: datos.cobertura.ausentes.map((a) => a.nombre).join(', '),
    }));
    bloque.appendChild(nota);
  }

  return bloque;
}
