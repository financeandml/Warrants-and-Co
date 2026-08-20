/* ============================================================================
   Companies — cobertura por compañía.

   El listado y la ficha se sirven del mismo panel: la ficha no es otra página,
   es el mismo lugar mirado de cerca. Nada de lo que se pinta aquí nace en el
   cliente: lo que el servidor no envía se rotula «N/A», nunca se rellena.
   ========================================================================= */

import {
  $, elemento, formatearNumero, formatearFecha, claseVariacion,
  porcentaje, formatearPorcentaje } from './formato.js';
import { t } from './i18n.js';
import { etiquetaSello, claseSello } from './vocabulario.js';

/* El rótulo de ausencia es una función y no una constante: se resuelve al
   pintar, que es cuando se sabe el idioma. Escrito a mano —«N/A»— quedaba fuera
   del diccionario y sobrevivía a la conmutación. */
const noDisponible = () => t('general.noDisponible');

/** Importe con su divisa, en el orden que decida el idioma. */
const importe = (valor, divisa) =>
  t('general.importeDivisa', { importe: valor, divisa: divisa ?? '' }).trim();

/** Valor numérico o el rótulo de ausencia; un cero legítimo se conserva. */
const cifra = (v, dec = 2) => (Number.isFinite(v) ? formatearNumero(v, dec) : noDisponible());

function dato(etiqueta, valor, clase = '') {
  const bloque = elemento('div', 'dato');
  bloque.appendChild(elemento('span', 'dato__etiqueta', etiqueta));
  const v = elemento('strong', `dato__valor${clase ? ` ${clase}` : ''}`, valor);
  if (valor === noDisponible()) v.classList.add('dato__valor--ausente');
  bloque.appendChild(v);
  return bloque;
}

/** Sello de calidad del dato, con su explicación al pasar el cursor. */
function sello(calidad, explicacion = '') {
  // El código viaja en la clase —el atenuado es información—; se traduce el rótulo.
  const s = elemento('span', claseSello(calidad), etiquetaSello(calidad));
  if (explicacion) s.title = explicacion;
  return s;
}

// ───────────────────────────────── listado ─────────────────────────────────

export function pintarCompanias(datos, alAbrir) {
  const rejilla = $('#rejilla-companias');
  const estado = $('#estado-companias');
  if (!rejilla) return;

  rejilla.textContent = '';

  if (estado) {
    // El «compañía(s)» de antes era un plural con paréntesis porque el código no
    // podía elegir; ahora lo elige `Intl.PluralRules` por idioma.
    estado.textContent = datos.consulta
      ? t('companias.estado.consulta', { n: datos.total, consulta: datos.consulta })
      : t('companias.estado.cobertura', { n: datos.total });
  }

  if (!datos.companias.length) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', '', t('companias.vacio.titulo')));
    vacio.appendChild(
      elemento('span', '', datos.consulta
        ? t('companias.vacio.filtrado', { consulta: datos.consulta })
        : t('companias.vacio.inicial'))
    );
    rejilla.appendChild(vacio);
    return;
  }

  for (const c of datos.companias) {
    const tarjeta = elemento('article', 'tarjeta-compania');
    tarjeta.tabIndex = 0;
    tarjeta.setAttribute('role', 'button');
    tarjeta.setAttribute('aria-label', t('companias.tarjeta.abrir', { empresa: c.empresa }));

    const cabecera = elemento('div', 'tarjeta-compania__cabecera');
    const identidad = elemento('div');
    identidad.appendChild(elemento('span', 'tarjeta-compania__ticker', c.ticker ?? '—'));
    identidad.appendChild(elemento('h3', 'tarjeta-compania__nombre', c.empresa));
    cabecera.appendChild(identidad);
    if (c.enCartera) cabecera.appendChild(elemento('span', 'chip chip--cartera', t('companias.enCartera')));
    tarjeta.appendChild(cabecera);

    const meta = elemento('p', 'tarjeta-compania__meta',
      [c.sector, c.pais].filter(Boolean).join(t('general.separadorLista')) || noDisponible());
    tarjeta.appendChild(meta);

    const datosClave = elemento('div', 'tarjeta-compania__datos');
    datosClave.appendChild(dato(t('companias.dato.recomendacion'), c.recomendacion ?? noDisponible()));
    datosClave.appendChild(dato(t('companias.dato.objetivo'),
      Number.isFinite(c.precioObjetivo) ? importe(cifra(c.precioObjetivo), c.divisa) : noDisponible()));
    datosClave.appendChild(dato(t('companias.dato.informes'), String(c.totalInformes)));
    tarjeta.appendChild(datosClave);

    const pie = elemento('div', 'tarjeta-compania__pie');
    pie.appendChild(elemento('span', '',
      t('companias.tarjeta.ultimo', { fecha: formatearFecha(c.ultimaPublicacion) })));
    if (c.totalAdjuntos > 0) {
      pie.appendChild(elemento('span', '', t('companias.tarjeta.documentos', { n: c.totalAdjuntos })));
    }
    tarjeta.appendChild(pie);

    const abrir = () => alAbrir(c.ticker ?? c.clave);
    tarjeta.addEventListener('click', abrir);
    tarjeta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });

    rejilla.appendChild(tarjeta);
  }
}

/** Rellena el desplegable de sectores conservando la selección vigente. */
export function pintarSectores(sectores, seleccionado = '') {
  const select = $('#filtro-sector-compania');
  if (!select) return;
  const previo = seleccionado || select.value;
  select.textContent = '';
  select.appendChild(new Option(t('companias.filtro.todosSectores'), ''));
  for (const s of sectores) select.appendChild(new Option(s, s));
  select.value = previo;
}

// ────────────────────────────────── ficha ──────────────────────────────────

export function pintarFicha(c, { alAbrirInforme, alVerCatalizadores }) {
  const raiz = $('#ficha-compania');
  if (!raiz) return;
  raiz.textContent = '';

  // ── Encabezado: identidad y cotización ──
  const cabecera = elemento('header', 'ficha-compania__cabecera');

  const identidad = elemento('div');
  const linea = elemento('div', 'ficha-compania__identidad');
  linea.appendChild(elemento('span', 'ficha-compania__ticker', c.ticker ?? '—'));
  if (c.enCartera) linea.appendChild(elemento('span', 'chip chip--cartera', t('companias.enCartera')));
  identidad.appendChild(linea);
  identidad.appendChild(elemento('h2', 'ficha-compania__nombre', c.empresa));
  identidad.appendChild(elemento('p', 'ficha-compania__meta',
    [c.sector, c.pais].filter(Boolean).join(t('general.separadorLista')) || noDisponible()));
  cabecera.appendChild(identidad);

  cabecera.appendChild(bloqueCotizacion(c));
  raiz.appendChild(cabecera);

  // ── Tesis vigente ──
  raiz.appendChild(bloqueTesis(c));

  // ── Niveles operativos ──
  raiz.appendChild(bloqueNiveles(c));

  // ── Informes ──
  raiz.appendChild(bloqueInformes(c, alAbrirInforme));

  // ── Prensa ──
  raiz.appendChild(bloquePrensa(c));

  // ── Acceso a la agenda ──
  if (c.ticker) {
    const pie = elemento('div', 'ficha-compania__acciones');
    const boton = elemento('button', 'boton boton--contorno', t('companias.verCatalizadores'));
    boton.type = 'button';
    boton.addEventListener('click', () => alVerCatalizadores(c.ticker));
    pie.appendChild(boton);
    raiz.appendChild(pie);
  }
}

function bloqueCotizacion(c) {
  const caja = elemento('div', 'ficha-cotizacion');
  const q = c.cotizacion;

  if (!q?.disponible) {
    caja.appendChild(elemento('span', 'ficha-cotizacion__precio ficha-cotizacion__precio--ausente', noDisponible()));
    // El motivo lo redacta el servidor; solo se traduce la reserva.
    caja.appendChild(elemento('p', 'ficha-cotizacion__nota', q?.motivo ?? t('companias.cotizacion.sinDato')));
    caja.appendChild(sello('UNAVAILABLE'));
    return caja;
  }

  caja.appendChild(elemento('span', 'ficha-cotizacion__precio', importe(cifra(q.precio), q.divisa)));

  const variacion = elemento('span',
    `ficha-cotizacion__var variacion ${claseVariacion(q.variacionPct)}`,
    Number.isFinite(q.variacionPct)
      ? formatearPorcentaje(q.variacionPct)
      : noDisponible());
  caja.appendChild(variacion);

  const pie = elemento('div', 'ficha-cotizacion__pie');
  pie.appendChild(sello(q.calidad, t('companias.cotizacion.selloNota')));
  pie.appendChild(elemento('span', '',
    [q.mercado, q.fuente].filter(Boolean).join(t('general.separadorLista'))));
  caja.appendChild(pie);

  return caja;
}

function bloqueTesis(c) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo', t('companias.tesis.titulo')));

  const rejilla = elemento('div', 'rejilla-datos');
  rejilla.appendChild(dato(t('companias.dato.recomendacion'), c.recomendacion ?? noDisponible()));
  rejilla.appendChild(dato(t('companias.dato.objetivo'),
    Number.isFinite(c.precioObjetivo) ? importe(cifra(c.precioObjetivo), c.divisa) : noDisponible()));

  const recorrido = c.recorridoObjetivo;
  rejilla.appendChild(dato(t('companias.dato.recorrido'),
    recorrido?.disponible ? formatearPorcentaje(recorrido.porcentaje) : noDisponible(),
    recorrido?.disponible ? claseVariacion(recorrido.porcentaje) : ''));

  rejilla.appendChild(dato(t('companias.dato.peso'),
    Number.isFinite(c.pesoCartera) ? porcentaje(c.pesoCartera) : noDisponible()));
  bloque.appendChild(rejilla);

  // El resumen ejecutivo del informe más reciente que lo tenga.
  const resumen = c.informes.find((i) => i.resumen)?.resumen;
  if (resumen) {
    bloque.appendChild(elemento('p', 'bloque-ficha__resumen', resumen));
  } else {
    bloque.appendChild(elemento('p', 'bloque-ficha__vacio', t('companias.tesis.sinResumen')));
  }

  if (c.etiquetas?.length) {
    const chips = elemento('div', 'lista-chips');
    for (const e of c.etiquetas) chips.appendChild(elemento('span', 'chip', e));
    bloque.appendChild(chips);
  }

  return bloque;
}

function bloqueNiveles(c) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo', t('companias.niveles.titulo')));

  const rejilla = elemento('div', 'rejilla-datos');
  rejilla.appendChild(dato(t('companias.dato.compra'),
    Number.isFinite(c.precioCompra) ? importe(cifra(c.precioCompra), c.divisa) : noDisponible()));
  rejilla.appendChild(dato(t('companias.dato.takeProfit'),
    Number.isFinite(c.takeProfit) ? importe(cifra(c.takeProfit), c.divisa) : noDisponible()));
  rejilla.appendChild(dato(t('companias.dato.stopLoss'),
    Number.isFinite(c.stopLoss) ? importe(cifra(c.stopLoss), c.divisa) : noDisponible()));

  // Distancia al take profit: cálculo propio sobre dos valores existentes.
  const q = c.cotizacion;
  const distancia = q?.disponible && Number.isFinite(q.precio) && Number.isFinite(c.takeProfit)
    ? (c.takeProfit / q.precio - 1) * 100
    : null;
  rejilla.appendChild(dato(t('companias.dato.distancia'),
    distancia === null ? noDisponible() : formatearPorcentaje(distancia)));

  bloque.appendChild(rejilla);
  return bloque;
}

function bloqueInformes(c, alAbrirInforme) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo',
    t('companias.informes.titulo', { n: c.informes.length })));

  const lista = elemento('ul', 'lista-informes-compania');
  for (const i of c.informes) {
    const fila = elemento('li');
    const boton = elemento('button', 'fila-informe');
    boton.type = 'button';

    const izquierda = elemento('div');
    izquierda.appendChild(elemento('strong', '', i.tipo ?? t('companias.informes.tipoReserva')));
    izquierda.appendChild(elemento('span', 'fila-informe__meta',
      [i.periodo, i.analista].filter(Boolean).join(t('general.separadorLista')) || noDisponible()));
    boton.appendChild(izquierda);

    const derecha = elemento('div', 'fila-informe__derecha');
    derecha.appendChild(elemento('span', '', formatearFecha(i.fecha)));
    if (i.adjuntos > 0) {
      derecha.appendChild(elemento('span', 'chip chip--doc',
        t('companias.informes.adjuntos', { n: i.adjuntos })));
    }
    boton.appendChild(derecha);

    boton.addEventListener('click', () => alAbrirInforme(i.id));
    fila.appendChild(boton);
    lista.appendChild(fila);
  }
  bloque.appendChild(lista);
  return bloque;
}

function bloquePrensa(c) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo', t('companias.prensa.titulo')));

  const n = c.noticias;
  if (!n?.disponible) {
    bloque.appendChild(elemento('p', 'bloque-ficha__vacio', t('companias.prensa.vacio')));
    return bloque;
  }

  bloque.appendChild(elemento('p', 'bloque-ficha__nota', n.nota));

  const lista = elemento('ul', 'lista-prensa');
  for (const a of n.articulos) {
    const fila = elemento('li');
    const enlace = elemento('a', 'fila-prensa', a.titular);
    if (a.url) {
      enlace.href = a.url;
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
    }
    const meta = elemento('span', 'fila-prensa__meta',
      [a.fuente, formatearFecha(a.fecha)].filter(Boolean).join(t('general.separadorLista')));
    fila.appendChild(enlace);
    fila.appendChild(meta);
    lista.appendChild(fila);
  }
  bloque.appendChild(lista);
  return bloque;
}
