/* ============================================================================
   Catalysts — agenda de eventos con fecha verificable.

   Dos principios rigen esta vista:
     1. Solo se pinta lo que tiene fecha cierta de una fuente. Lo que no la tiene
        no aparece con una fecha aproximada: aparece con «Date: N/A».
     2. La prioridad se muestra siempre junto al motivo que la justifica. Una
        etiqueta HIGH sin explicación sería una opinión disfrazada de dato.
   ========================================================================= */

import { $, elemento, formatearNumero, formatearFecha } from './formato.js';

const NO_DISPONIBLE = 'N/A';

/** Cómo se lee la distancia temporal de un evento. */
function distancia(dias) {
  if (!Number.isFinite(dias)) return 'Date: N/A';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias > 0) return `En ${dias} días`;
  if (dias === -1) return 'Ayer';
  return `Hace ${Math.abs(dias)} días`;
}

export function pintarAgenda(datos, { horizonte, alAbrirCompania }) {
  const raiz = $('#agenda-completa');
  const estado = $('#estado-catalizadores');
  if (!raiz) return;
  raiz.textContent = '';

  const eventos = horizonte === 'PAST' ? datos.pasados : datos.proximos;

  if (estado) {
    estado.textContent =
      `${datos.resumen.proximos} próximo(s) · ${datos.resumen.pasados} pasado(s)` +
      (datos.resumen.alta ? ` · ${datos.resumen.alta} de prioridad alta` : '');
  }

  // Los eventos sin fecha se agrupan aparte y jamás se ordenan entre los datados.
  if (horizonte === 'UPCOMING' && datos.sinFecha?.length) {
    raiz.appendChild(grupoSinFecha(datos.sinFecha));
  }

  if (!eventos.length) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', '', horizonte === 'PAST' ? 'Sin eventos pasados' : 'Sin eventos próximos'));
    vacio.appendChild(elemento('span', '',
      'La agenda solo recoge eventos con fecha verificable de una fuente conectada.'));
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
  const t = elemento('article', 'evento');
  t.dataset.prioridad = e.prioridad;

  // ── Franja izquierda: prioridad ──
  const marca = elemento('div', 'evento__prioridad');
  marca.appendChild(elemento('span', 'evento__prioridad-texto', e.prioridad));
  marca.title = e.motivo ?? '';
  t.appendChild(marca);

  // ── Cuerpo ──
  const cuerpo = elemento('div', 'evento__cuerpo');

  const superior = elemento('div', 'evento__superior');
  superior.appendChild(elemento('span', 'evento__tipo', e.tipo));
  if (e.enCartera) superior.appendChild(elemento('span', 'chip chip--cartera', 'En cartera'));
  if (e.parcial) superior.appendChild(elemento('span', 'chip chip--aviso', 'Agregado parcial'));
  cuerpo.appendChild(superior);

  cuerpo.appendChild(elemento('h3', 'evento__titulo', e.titulo));

  const compania = elemento('button', 'evento__compania');
  compania.type = 'button';
  compania.textContent = `${e.ticker ?? ''} · ${e.compania}`.replace(/^ · /, '');
  compania.addEventListener('click', () => alAbrirCompania(e.ticker ?? e.compania));
  cuerpo.appendChild(compania);

  // ── Detalle específico del tipo de evento ──
  const detalle = detalleDe(e);
  if (detalle) cuerpo.appendChild(detalle);

  // ── El motivo de la prioridad, siempre visible ──
  if (e.motivo) cuerpo.appendChild(elemento('p', 'evento__motivo', e.motivo));

  const pie = elemento('div', 'evento__pie');
  pie.appendChild(elemento('span', '', `Fuente: ${e.fuente ?? NO_DISPONIBLE}`));
  pie.appendChild(elemento('span', '', e.fechaConocida ? `Fecha ${e.calidadFecha.toLowerCase()}` : 'Date: N/A'));
  if (e.vinculacion) pie.appendChild(elemento('span', '', `Vínculo: ${e.vinculacion.toLowerCase()}`));
  cuerpo.appendChild(pie);

  t.appendChild(cuerpo);
  return t;
}

function detalleDe(e) {
  const d = e.detalle ?? {};

  if (e.tipo === 'OPTIONS EXPIRY') {
    const fila = elemento('div', 'evento__datos');
    fila.appendChild(par('Interés abierto',
      Number.isFinite(d.interesAbierto) ? formatearNumero(d.interesAbierto, 0) : NO_DISPONIBLE));
    fila.appendChild(par('Volumen',
      Number.isFinite(d.volumen) ? formatearNumero(d.volumen, 0) : NO_DISPONIBLE));
    fila.appendChild(par('Cuota del OI',
      Number.isFinite(d.cuotaInteresAbierto) ? `${formatearNumero(d.cuotaInteresAbierto, 1)} %` : NO_DISPONIBLE));
    fila.appendChild(par('Contratos',
      Number.isFinite(d.contratos) ? formatearNumero(d.contratos, 0) : NO_DISPONIBLE));
    return fila;
  }

  if (e.tipo === 'RESEARCH') {
    const fila = elemento('div', 'evento__datos');
    fila.appendChild(par('Recomendación', d.recomendacion ?? NO_DISPONIBLE));
    fila.appendChild(par('Precio objetivo',
      Number.isFinite(d.precioObjetivo) ? `${formatearNumero(d.precioObjetivo, 2)} ${d.divisa ?? ''}`.trim() : NO_DISPONIBLE));
    fila.appendChild(par('Analista', d.analista ?? NO_DISPONIBLE));
    return fila;
  }

  return null;
}

function par(etiqueta, valor) {
  const p = elemento('div', 'par-dato');
  p.appendChild(elemento('span', 'par-dato__etiqueta', etiqueta));
  const v = elemento('strong', 'par-dato__valor', valor);
  if (valor === NO_DISPONIBLE) v.classList.add('par-dato__valor--ausente');
  p.appendChild(v);
  return p;
}

function grupoSinFecha(eventos) {
  const grupo = elemento('section', 'grupo-agenda grupo-agenda--sin-fecha');
  const cabecera = elemento('div', 'grupo-agenda__cabecera');
  cabecera.appendChild(elemento('h2', 'grupo-agenda__fecha', 'Date: N/A'));
  cabecera.appendChild(elemento('span', 'grupo-agenda__distancia', `${eventos.length} evento(s) sin fecha`));
  grupo.appendChild(cabecera);
  return grupo;
}

/** Categorías reconocidas para las que no hay fuente conectada. */
export function pintarCarencias(datos) {
  const raiz = $('#carencias-catalizadores');
  if (!raiz) return;
  raiz.textContent = '';

  for (const c of datos.sinFuente ?? []) {
    const t = elemento('article', 'carencia');
    t.appendChild(elemento('span', 'carencia__tipo', c.tipo));
    t.appendChild(elemento('h3', 'carencia__titulo', c.titulo));
    t.appendChild(elemento('p', 'carencia__motivo', c.motivo));
    raiz.appendChild(t);
  }
}

/** Filtros: compañías y tipos presentes en la agenda. */
export function pintarFiltros(datos, { compania = '', tipo = '' } = {}) {
  const selCompania = $('#filtro-compania-catalizador');
  if (selCompania) {
    const previo = compania || selCompania.value;
    selCompania.textContent = '';
    selCompania.appendChild(new Option('Todas las compañías', ''));
    for (const c of datos.universo ?? []) {
      if (c.ticker) selCompania.appendChild(new Option(`${c.ticker} · ${c.empresa}`, c.ticker));
    }
    selCompania.value = previo;
  }

  const selTipo = $('#filtro-tipo-catalizador');
  if (selTipo) {
    const previo = tipo || selTipo.value;
    const tipos = [...new Set([...datos.proximos, ...datos.pasados].map((e) => e.tipo))];
    selTipo.textContent = '';
    selTipo.appendChild(new Option('Todos los tipos', ''));
    for (const t of tipos) selTipo.appendChild(new Option(t, t));
    selTipo.value = previo;
  }
}
