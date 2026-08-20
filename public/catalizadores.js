/* ============================================================================
   Catalysts — agenda de eventos con fecha verificable.

   Dos principios rigen esta vista:
     1. Solo se pinta lo que tiene fecha cierta de una fuente. Lo que no la tiene
        no aparece con una fecha aproximada: aparece rotulado «N/A».
     2. La prioridad se muestra siempre junto al motivo que la justifica. Una
        etiqueta HIGH sin explicación sería una opinión disfrazada de dato.
   ========================================================================= */

import {
  $, elemento, formatearNumero, formatearFecha, porcentaje, distanciaEnDias,
} from './formato.js';
import { t } from './i18n.js';
import {
  etiquetaTipoEvento, etiquetaPrioridad, etiquetaCalidadFecha, etiquetaVinculacion,
} from './vocabulario.js';

/* El rótulo de ausencia se resuelve al pintar, que es cuando se sabe el idioma. */
const noDisponible = () => t('general.noDisponible');

/* La distancia temporal la redacta el navegador. Antes era una escalera de
   condiciones —«Hoy», «Mañana», «En N días»— que solo sabía castellano y que
   además imponía su morfología: el inglés no dice «in 1 days», y hay idiomas que
   tienen palabra para «anteayer». `Intl.RelativeTimeFormat` lo sabe todo eso. */
const distancia = (dias) =>
  (Number.isFinite(dias) ? distanciaEnDias(dias) : noDisponible());

export function pintarAgenda(datos, { horizonte, alAbrirCompania }) {
  const raiz = $('#agenda-completa');
  const estado = $('#estado-catalizadores');
  if (!raiz) return;
  raiz.textContent = '';

  const eventos = horizonte === 'PAST' ? datos.pasados : datos.proximos;

  if (estado) {
    // Tres datos independientes unidos por el separador de lista, no una frase
    // partida que impondría a todos el orden del castellano.
    const partes = [
      t('catalizadores.resumen.proximos', { n: datos.resumen.proximos }),
      t('catalizadores.resumen.pasados', { n: datos.resumen.pasados }),
    ];
    if (datos.resumen.alta) partes.push(t('catalizadores.resumen.alta', { n: datos.resumen.alta }));
    estado.textContent = partes.join(t('general.separadorLista'));
  }

  // Los eventos sin fecha se agrupan aparte y jamás se ordenan entre los datados.
  if (horizonte === 'UPCOMING' && datos.sinFecha?.length) {
    raiz.appendChild(grupoSinFecha(datos.sinFecha));
  }

  if (!eventos.length) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', '',
      t(horizonte === 'PAST' ? 'catalizadores.vacio.pasados' : 'catalizadores.vacio.proximos')));
    vacio.appendChild(elemento('span', '', t('catalizadores.vacio.motivo')));
    raiz.appendChild(vacio);
    return;
  }

  // Agrupación por fecha: la lectura natural de una agenda.
  const porFecha = new Map();
  for (const e of eventos) {
    if (!porFecha.has(e.fecha)) porFecha.set(e.fecha, []);
    porFecha.get(e.fecha).push(e);
  }

  for (const [fecha, lista] of porFecha) {
    const grupo = elemento('section', 'grupo-agenda');

    const cabecera = elemento('div', 'grupo-agenda__cabecera');
    cabecera.appendChild(elemento('h2', 'grupo-agenda__fecha', formatearFecha(fecha)));
    cabecera.appendChild(elemento('span', 'grupo-agenda__distancia', distancia(lista[0].dias)));
    grupo.appendChild(cabecera);

    const eventosDom = elemento('div', 'grupo-agenda__eventos');
    for (const e of lista) eventosDom.appendChild(tarjetaEvento(e, alAbrirCompania));
    grupo.appendChild(eventosDom);

    raiz.appendChild(grupo);
  }
}

function tarjetaEvento(e, alAbrirCompania) {
  const tarjeta = elemento('article', 'evento');
  tarjeta.dataset.prioridad = e.prioridad;

  // ── Franja izquierda: prioridad ──
  const marca = elemento('div', 'evento__prioridad');
  // El código sigue en `dataset.prioridad`, que es de donde cuelga el color.
  marca.appendChild(elemento('span', 'evento__prioridad-texto', etiquetaPrioridad(e.prioridad)));
  marca.title = e.motivo ?? '';
  tarjeta.appendChild(marca);

  // ── Cuerpo ──
  const cuerpo = elemento('div', 'evento__cuerpo');

  const superior = elemento('div', 'evento__superior');
  superior.appendChild(elemento('span', 'evento__tipo', etiquetaTipoEvento(e.tipo)));
  if (e.enCartera) superior.appendChild(elemento('span', 'chip chip--cartera', t('catalizadores.enCartera')));
  if (e.parcial) superior.appendChild(elemento('span', 'chip chip--aviso', t('catalizadores.parcial')));
  cuerpo.appendChild(superior);

  cuerpo.appendChild(elemento('h3', 'evento__titulo', e.titulo));

  const compania = elemento('button', 'evento__compania');
  compania.type = 'button';
  compania.textContent = [e.ticker, e.compania].filter(Boolean).join(t('general.separadorLista'));
  compania.addEventListener('click', () => alAbrirCompania(e.ticker ?? e.compania));
  cuerpo.appendChild(compania);

  // ── Detalle específico del tipo de evento ──
  const detalle = detalleDe(e);
  if (detalle) cuerpo.appendChild(detalle);

  // ── El motivo de la prioridad, siempre visible ──
  if (e.motivo) cuerpo.appendChild(elemento('p', 'evento__motivo', e.motivo));

  const pie = elemento('div', 'evento__pie');
  pie.appendChild(elemento('span', '',
    t('catalizadores.pie.fuente', { fuente: e.fuente ?? noDisponible() })));
  pie.appendChild(elemento('span', '', e.fechaConocida
    ? t('catalizadores.pie.fecha', { calidad: etiquetaCalidadFecha(e.calidadFecha) })
    : noDisponible()));
  if (e.vinculacion) {
    pie.appendChild(elemento('span', '',
      t('catalizadores.pie.vinculo', { vinculo: etiquetaVinculacion(e.vinculacion) })));
  }
  cuerpo.appendChild(pie);

  tarjeta.appendChild(cuerpo);
  return tarjeta;
}

function detalleDe(e) {
  const d = e.detalle ?? {};

  if (e.tipo === 'OPTIONS EXPIRY') {
    const fila = elemento('div', 'evento__datos');
    fila.appendChild(par(t('catalizadores.dato.interesAbierto'),
      Number.isFinite(d.interesAbierto) ? formatearNumero(d.interesAbierto, 0) : noDisponible()));
    fila.appendChild(par(t('catalizadores.dato.volumen'),
      Number.isFinite(d.volumen) ? formatearNumero(d.volumen, 0) : noDisponible()));
    fila.appendChild(par(t('catalizadores.dato.cuotaOI'),
      Number.isFinite(d.cuotaInteresAbierto) ? porcentaje(d.cuotaInteresAbierto, 1) : noDisponible()));
    fila.appendChild(par(t('catalizadores.dato.contratos'),
      Number.isFinite(d.contratos) ? formatearNumero(d.contratos, 0) : noDisponible()));
    return fila;
  }

  if (e.tipo === 'RESEARCH') {
    const fila = elemento('div', 'evento__datos');
    fila.appendChild(par(t('catalizadores.dato.recomendacion'), d.recomendacion ?? noDisponible()));
    fila.appendChild(par(t('catalizadores.dato.objetivo'),
      Number.isFinite(d.precioObjetivo)
        ? t('general.importeDivisa', {
            importe: formatearNumero(d.precioObjetivo, 2), divisa: d.divisa ?? '',
          }).trim()
        : noDisponible()));
    fila.appendChild(par(t('catalizadores.dato.analista'), d.analista ?? noDisponible()));
    return fila;
  }

  return null;
}

function par(etiqueta, valor) {
  const p = elemento('div', 'par-dato');
  p.appendChild(elemento('span', 'par-dato__etiqueta', etiqueta));
  const v = elemento('strong', 'par-dato__valor', valor);
  if (valor === noDisponible()) v.classList.add('par-dato__valor--ausente');
  p.appendChild(v);
  return p;
}

function grupoSinFecha(eventos) {
  const grupo = elemento('section', 'grupo-agenda grupo-agenda--sin-fecha');
  const cabecera = elemento('div', 'grupo-agenda__cabecera');
  cabecera.appendChild(elemento('h2', 'grupo-agenda__fecha', noDisponible()));
  cabecera.appendChild(elemento('span', 'grupo-agenda__distancia',
    t('catalizadores.sinFecha.eventos', { n: eventos.length })));
  grupo.appendChild(cabecera);
  return grupo;
}

/** Categorías reconocidas para las que no hay fuente conectada. */
export function pintarCarencias(datos) {
  const raiz = $('#carencias-catalizadores');
  if (!raiz) return;
  raiz.textContent = '';

  for (const c of datos.sinFuente ?? []) {
    const carencia = elemento('article', 'carencia');
    carencia.appendChild(elemento('span', 'carencia__tipo', etiquetaTipoEvento(c.tipo)));
    carencia.appendChild(elemento('h3', 'carencia__titulo', c.titulo));
    carencia.appendChild(elemento('p', 'carencia__motivo', c.motivo));
    raiz.appendChild(carencia);
  }
}

/** Filtros: compañías y tipos presentes en la agenda. */
export function pintarFiltros(datos, { compania = '', tipo = '' } = {}) {
  const selCompania = $('#filtro-compania-catalizador');
  if (selCompania) {
    const previo = compania || selCompania.value;
    selCompania.textContent = '';
    selCompania.appendChild(new Option(t('catalizadores.filtro.todasCompanias'), ''));
    for (const c of datos.universo ?? []) {
      if (c.ticker) {
        selCompania.appendChild(
          new Option([c.ticker, c.empresa].join(t('general.separadorLista')), c.ticker));
      }
    }
    selCompania.value = previo;
  }

  const selTipo = $('#filtro-tipo-catalizador');
  if (selTipo) {
    const previo = tipo || selTipo.value;
    const tipos = [...new Set([...datos.proximos, ...datos.pasados].map((e) => e.tipo))];
    selTipo.textContent = '';
    selTipo.appendChild(new Option(t('catalizadores.filtro.todosTipos'), ''));
    // El valor sigue siendo el código —viaja al servidor—; se traduce el rótulo.
    for (const codigo of tipos) selTipo.appendChild(new Option(etiquetaTipoEvento(codigo), codigo));
    selTipo.value = previo;
  }
}
