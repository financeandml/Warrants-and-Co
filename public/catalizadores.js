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
import { revelar, observarEntrada, sinMovimiento } from './movimiento.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* Escalonado entre filas consecutivas al entrar en pantalla: 55ms, dentro de
 * los 40-70ms pedidos. Un contador de módulo, no por grupo —para que el
 * escalonado se lea continuo cruzando fechas—, y se reinicia en cada pintado
 * completo de la agenda. */
let contadorFilas = 0;

/*
 * Countdown con fundido, no salto. La agenda se repinta entera en cada carga
 * —`raiz.textContent = ''`—, así que no hay nodo persistente que comparar: el
 * valor anterior se guarda aquí, por clave estable (`e.id`, o «siguiente»
 * para Next Catalyst), y si el texto nuevo difiere del último visto para esa
 * clave, se dispara la animación CSS `.valor-fundido`. La primera vez que se
 * ve una clave no hay «antes» que fundir: se pinta directo, tercer estado.
 */
const ultimosValoresCountdown = new Map();
function pintarValorFundido(nodo, clave, texto) {
  const anterior = ultimosValoresCountdown.get(clave);
  nodo.textContent = texto;
  if (anterior !== undefined && anterior !== texto && !sinMovimiento()) {
    nodo.classList.remove('valor-fundido');
    void nodo.offsetWidth; // fuerza reflow para poder repetir la animación
    nodo.classList.add('valor-fundido');
  }
  ultimosValoresCountdown.set(clave, texto);
  return nodo;
}

/* El rótulo de ausencia se resuelve al pintar, que es cuando se sabe el idioma. */
const noDisponible = () => t('general.noDisponible');

/* La distancia temporal la redacta el navegador. Antes era una escalera de
   condiciones —«Hoy», «Mañana», «En N días»— que solo sabía castellano y que
   además imponía su morfología: el inglés no dice «in 1 days», y hay idiomas que
   tienen palabra para «anteayer». `Intl.RelativeTimeFormat` lo sabe todo eso. */
const distancia = (dias) =>
  (Number.isFinite(dias) ? distanciaEnDias(dias) : noDisponible());

/* Prioridad → lectura contenida. Nunca badge sólido: mismo criterio que
 * `.lectura` en Recommendation de Companies (regla 1 de CLAUDE.md, el color
 * nunca carga solo). La prioridad no es direccional —no hay «alza» ni «baja»
 * de un evento—, así que solo usa `--aviso` para HIGH y el tono neutro para el
 * resto; nunca `--acento`, que la cláusula 2 reserva para lo no direccional
 * de cromo, y una prioridad sí lleva juicio, aunque no lleve dirección. */
function claseLecturaPrioridad(prioridad) {
  if (prioridad === 'HIGH') return 'lectura lectura--aviso';
  return 'lectura lectura--nula';
}

export function pintarAgenda(datos, { horizonte, alAbrirCompania, ventana = '' }) {
  const raiz = $('#agenda-completa');
  const estado = $('#estado-catalizadores');
  if (!raiz) return;
  raiz.textContent = '';
  contadorFilas = 0;

  let eventos = horizonte === 'PAST' ? datos.pasados : datos.proximos;
  if (horizonte === 'UPCOMING' && ventana) eventos = filtrarPorVentana(eventos, ventana);

  /* Los vencimientos de opciones de prioridad baja dejan de pintarse como
     tarjeta completa —único cambio de qué se ve por defecto, no de qué
     existe— SOLO en la vista sin filtrar (TODOS, sin ventana): es la única
     donde el resumen por compañía se pinta a continuación como red de
     seguridad. Con una ventana temporal activa o en Pasados, cada vencimiento
     sigue siendo tarjeta, exactamente como antes: no hay resumen ahí que
     recoja lo que se retirase. */
  const conResumen = horizonte === 'UPCOMING' && !ventana;
  const eventosTarjeta = conResumen
    ? eventos.filter((e) => !(e.tipo === 'OPTIONS EXPIRY' && e.prioridad === 'LOW'))
    : eventos;

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
  if (horizonte === 'UPCOMING' && !ventana && datos.sinFecha?.length) {
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

  // Agrupación por fecha: la lectura natural de una agenda. Usa
  // `eventosTarjeta` —eventos ∖ vencimientos LOW cuando hay resumen— para que
  // lo retirado de aquí sea exactamente lo que el bloque de resumen recoge.
  const porFecha = new Map();
  for (const e of eventosTarjeta) {
    if (!porFecha.has(e.fecha)) porFecha.set(e.fecha, []);
    porFecha.get(e.fecha).push(e);
  }

  for (const [fecha, lista] of porFecha) {
    const grupo = elemento('section', 'grupo-agenda');

    const cabecera = elemento('div', 'grupo-agenda__cabecera');
    cabecera.appendChild(elemento('h2', 'grupo-agenda__fecha', formatearFecha(fecha)));
    const distanciaGrupo = elemento('span', 'grupo-agenda__distancia');
    pintarValorFundido(distanciaGrupo, `grupo-${fecha}`, distancia(lista[0].dias));
    cabecera.appendChild(distanciaGrupo);
    grupo.appendChild(cabecera);

    const eventosDom = elemento('div', 'grupo-agenda__eventos');
    for (const e of lista) {
      const fila = filaEvento(e, alAbrirCompania);
      revelar(fila, contadorFilas * 55);
      contadorFilas += 1;
      eventosDom.appendChild(fila);
    }
    grupo.appendChild(eventosDom);

    raiz.appendChild(grupo);
  }

  // Vencimientos de opciones agrupados por compañía: la red de seguridad de
  // lo que `eventosTarjeta` acaba de retirar arriba. `datos.resumenVencimientos`
  // ya viene calculado del servidor —un hecho, una fuente—, así que aquí solo
  // se pinta, nunca se recalcula.
  if (conResumen && datos.resumenVencimientos?.length) {
    raiz.appendChild(bloqueResumenVencimientos(datos.resumenVencimientos, alAbrirCompania));
  }
}

/**
 * "Vencimientos de opciones · Resumen": una fila por compañía, tabla densa en
 * vez de tarjeta —es justo el caso que DESIGN.md reserva para tabla: datos
 * homogéneos, muchas filas—. "Ver todos" despliega el conjunto COMPLETO de
 * vencimientos próximos de esa compañía —HIGH y MEDIUM incluidos, no solo los
 * LOW retirados de arriba—, porque `resumenVencimientos` en el servidor ya
 * trae todos, nunca un subconjunto: así "Ver todos" siempre es trazable a
 * los mismos datos que las tarjetas de arriba, sin una segunda cuenta que
 * pueda discrepar.
 */
function bloqueResumenVencimientos(resumen, alAbrirCompania) {
  const seccion = elemento('section', 'resumen-vencimientos');
  seccion.setAttribute('aria-labelledby', 'titulo-resumen-vencimientos');

  const cabecera = elemento('header', 'resumen-vencimientos__cabecera');
  const titulo = elemento('h2', 'movimiento', t('catalizadores.resumenVencimientos.titulo'));
  titulo.id = 'titulo-resumen-vencimientos';
  cabecera.appendChild(titulo);
  cabecera.appendChild(elemento('p', 'resumen-vencimientos__subtitulo',
    t('catalizadores.resumenVencimientos.subtitulo')));
  seccion.appendChild(cabecera);

  const envoltorio = elemento('div', 'tabla-envoltorio');
  const tabla = elemento('table', 'tabla-datos');

  const caption = elemento('caption', 'visualmente-oculto',
    t('catalizadores.resumenVencimientos.caption'));
  tabla.appendChild(caption);

  const thead = document.createElement('thead');
  const filaCab = document.createElement('tr');
  const th = (clave, clase = '') => {
    const celda = document.createElement('th');
    celda.scope = 'col';
    if (clase) celda.className = clase;
    celda.textContent = t(clave);
    return celda;
  };
  filaCab.appendChild(th('catalizadores.resumenVencimientos.col.compania'));
  filaCab.appendChild(th('catalizadores.resumenVencimientos.col.total', 'num'));
  filaCab.appendChild(th('catalizadores.resumenVencimientos.col.proximo'));
  filaCab.appendChild(th('catalizadores.resumenVencimientos.col.maximaConcentracion', 'num'));
  filaCab.appendChild(th('catalizadores.resumenVencimientos.col.fecha'));
  filaCab.appendChild(th('catalizadores.resumenVencimientos.col.detalle'));
  thead.appendChild(filaCab);
  tabla.appendChild(thead);

  const cuerpo = document.createElement('tbody');
  for (const r of resumen) {
    const [fila, panel, boton] = filaResumenVencimiento(r, alAbrirCompania);
    cuerpo.appendChild(fila);
    cuerpo.appendChild(panel);
    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      boton.querySelector('.resumen-vencimientos__glifo').textContent = abierto ? '+' : '–';
      panel.hidden = abierto;
    });
  }
  tabla.appendChild(cuerpo);

  envoltorio.appendChild(tabla);
  seccion.appendChild(envoltorio);
  return seccion;
}

/** Fila de una compañía en el resumen, más su panel de detalle (oculto). */
function filaResumenVencimiento(r, alAbrirCompania) {
  const idDetalle = `detalle-vencimientos-${r.ticker}`;

  const fila = document.createElement('tr');

  const celdaCompania = elemento('td', 'celda-empresa');
  const nombre = elemento('button', 'evento__compania',
    [r.ticker, r.empresa].filter(Boolean).join(t('general.separadorLista')));
  nombre.type = 'button';
  nombre.addEventListener('click', () => alAbrirCompania(r.ticker ?? r.empresa));
  celdaCompania.appendChild(nombre);
  fila.appendChild(celdaCompania);

  fila.appendChild(elemento('td', 'num', formatearNumero(r.total, 0)));
  fila.appendChild(elemento('td', '', formatearFecha(r.proximaFecha)));
  fila.appendChild(elemento('td', 'num',
    Number.isFinite(r.maximaCuota?.valor) ? porcentaje(r.maximaCuota.valor, 1) : noDisponible()));
  fila.appendChild(elemento('td', '',
    r.maximaCuota?.fecha ? formatearFecha(r.maximaCuota.fecha) : noDisponible()));

  const celdaAccion = elemento('td', 'celda-acciones');
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'resumen-vencimientos__despliegue';
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-controls', idDetalle);
  boton.setAttribute('aria-label',
    t('catalizadores.resumenVencimientos.desplegar', { empresa: r.empresa }));
  boton.appendChild(elemento('span', 'resumen-vencimientos__glifo', '+'));
  boton.appendChild(document.createTextNode(t('catalizadores.resumenVencimientos.verTodos')));
  celdaAccion.appendChild(boton);
  fila.appendChild(celdaAccion);

  const panel = filaDetalleVencimientos(r, idDetalle);

  return [fila, panel, boton];
}

/**
 * Panel expandible con TODOS los vencimientos próximos de una compañía —los
 * mismos objetos que ya trae `r.vencimientos` desde el servidor, sin volver a
 * calcular ninguna cifra—. Tabla, no tarjetas: es el mismo dato que ya se leía
 * arriba en `.evento__datos`, aquí en formato denso para 10-14 filas.
 */
function filaDetalleVencimientos(r, idDetalle) {
  const fila = document.createElement('tr');
  fila.id = idDetalle;
  fila.className = 'resumen-vencimientos__detalle';
  fila.hidden = true;

  const celda = document.createElement('td');
  celda.colSpan = 6;

  const envoltorio = elemento('div', 'tabla-envoltorio');
  const tabla = elemento('table', 'tabla-datos');
  const caption = elemento('caption', 'visualmente-oculto',
    t('catalizadores.resumenVencimientos.detalle.caption', { empresa: r.empresa }));
  tabla.appendChild(caption);

  const thead = document.createElement('thead');
  const filaCab = document.createElement('tr');
  const th = (clave, clase = '') => {
    const c = document.createElement('th');
    c.scope = 'col';
    if (clase) c.className = clase;
    c.textContent = t(clave);
    return c;
  };
  filaCab.appendChild(th('catalizadores.resumenVencimientos.detalle.col.fecha'));
  filaCab.appendChild(th('catalizadores.resumenVencimientos.detalle.col.dias', 'num'));
  filaCab.appendChild(th('catalizadores.dato.interesAbierto', 'num'));
  filaCab.appendChild(th('catalizadores.dato.volumen', 'num'));
  filaCab.appendChild(th('catalizadores.dato.cuotaOI', 'num'));
  filaCab.appendChild(th('catalizadores.dato.contratos', 'num'));
  thead.appendChild(filaCab);
  tabla.appendChild(thead);

  const cuerpo = document.createElement('tbody');
  // Mismo orden que ya trae el servidor (más cercano primero): no se reordena.
  for (const v of r.vencimientos) {
    const d = v.detalle ?? {};
    const filaV = document.createElement('tr');
    filaV.appendChild(elemento('td', '', formatearFecha(v.fecha)));
    filaV.appendChild(elemento('td', 'num', formatearNumero(v.dias, 0)));
    filaV.appendChild(elemento('td', 'num',
      Number.isFinite(d.interesAbierto) ? formatearNumero(d.interesAbierto, 0) : noDisponible()));
    filaV.appendChild(elemento('td', 'num',
      Number.isFinite(d.volumen) ? formatearNumero(d.volumen, 0) : noDisponible()));
    filaV.appendChild(elemento('td', 'num',
      Number.isFinite(d.cuotaInteresAbierto) ? porcentaje(d.cuotaInteresAbierto, 1) : noDisponible()));
    filaV.appendChild(elemento('td', 'num',
      Number.isFinite(d.contratos) ? formatearNumero(d.contratos, 0) : noDisponible()));
    cuerpo.appendChild(filaV);
  }
  tabla.appendChild(cuerpo);

  envoltorio.appendChild(tabla);
  celda.appendChild(envoltorio);
  fila.appendChild(celda);
  return fila;
}

/** Ventana temporal sobre `dias`: 0 = hoy, ≤7, ≤30. Agregación en cliente. */
function filtrarPorVentana(eventos, ventana) {
  const limite = ventana === 'HOY' ? 0
    : ventana === '7D' ? 7
    : ventana === '30D' ? 30
    : ventana === '90D' ? 90
    : null;
  if (limite === null) return eventos;
  return eventos.filter((e) => Number.isFinite(e.dias) && e.dias >= 0 && e.dias <= limite);
}

/**
 * Fila editorial: línea divisoria fina, sin card. Ticker/tipo/prioridad a la
 * izquierda, fecha/countdown a la derecha. El hover desplaza 3px —fundido y
 * traslación, nunca reordenación FLIP—.
 */
function filaEvento(e, alAbrirCompania) {
  const fila = elemento('article', 'evento');
  fila.dataset.prioridad = e.prioridad;

  const cuerpo = elemento('div', 'evento__cuerpo');

  const superior = elemento('div', 'evento__superior');
  superior.appendChild(elemento('span', 'evento__tipo', etiquetaTipoEvento(e.tipo)));
  superior.appendChild(elemento('span',
    `evento__prioridad-texto ${claseLecturaPrioridad(e.prioridad)}`, etiquetaPrioridad(e.prioridad)));
  if (e.parcial) superior.appendChild(elemento('span', 'chip chip--aviso', t('catalizadores.parcial')));
  cuerpo.appendChild(superior);

  cuerpo.appendChild(elemento('h3', 'evento__titulo', e.titulo));

  const compania = elemento('button', 'evento__compania');
  compania.type = 'button';
  compania.textContent = [e.ticker, e.compania].filter(Boolean).join(t('general.separadorLista'));
  compania.addEventListener('click', () => alAbrirCompania(e.ticker ?? e.compania));
  cuerpo.appendChild(compania);

  cuerpo.appendChild(vinculoPortfolio(e, alAbrirCompania));

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

  fila.appendChild(cuerpo);

  const derecha = elemento('div', 'evento__derecha');
  derecha.appendChild(elemento('span', 'evento__fecha', formatearFecha(e.fecha)));
  const distanciaEvento = elemento('span', 'evento__distancia');
  pintarValorFundido(distanciaEvento, e.id ?? `${e.ticker ?? ''}-${e.fecha ?? ''}-${e.titulo ?? ''}`,
    distancia(e.dias));
  derecha.appendChild(distanciaEvento);
  fila.appendChild(derecha);

  return fila;
}

/**
 * Portfolio Connection por evento. Cuatro estados —`portfolioStatus` puede ser
 * `null` (no comprobado) y eso no es lo mismo que `NOT_HELD` (comprobado, no
 * tenida)—, mismo criterio que la ficha de Companies. OPEN/CLOSED enlazan a la
 * ficha de la compañía vía la navegación SPA inyectada (`alAbrirCompania`),
 * no a Cartera: el evento es sobre una compañía, y es ahí donde ya vive el
 * mismo bloque de conexión con la posición.
 */
function vinculoPortfolio(e, alAbrirCompania) {
  const estado = e.portfolioStatus;
  if (estado === 'OPEN' || estado === 'CLOSED') {
    const boton = elemento('button', 'evento__portfolio');
    boton.type = 'button';
    boton.textContent = t(estado === 'OPEN'
      ? 'catalizadores.portfolio.abierta' : 'catalizadores.portfolio.cerrada');
    boton.addEventListener('click', () => alAbrirCompania(e.ticker ?? e.compania));
    return boton;
  }
  const texto = elemento('span', 'evento__portfolio', t(estado === 'NOT_HELD'
    ? 'catalizadores.portfolio.noTenida' : 'catalizadores.portfolio.sinComprobar'));
  return texto;
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

function par(etiqueta, valor, clase = '') {
  const p = elemento('div', 'par-dato');
  p.appendChild(elemento('span', 'par-dato__etiqueta', etiqueta));
  const v = elemento('strong', `par-dato__valor${clase ? ` ${clase}` : ''}`, valor);
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

/** Top metrics: Upcoming / High Priority / Past — mismo patrón que Companies. */
export function pintarMetricas(datos) {
  const caja = $('#catalizadores-metricas');
  if (!caja) return;
  caja.textContent = '';

  const metrica = (etiqueta, valor, principal = false) => {
    const bloque = elemento('div', `indicador${principal ? ' indicador--principal' : ''}`);
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    bloque.appendChild(elemento('strong', 'indicador__valor', valor));
    caja.appendChild(bloque);
  };

  metrica(t('catalizadores.metricas.proximos'), String(datos.resumen?.proximos ?? 0), true);
  metrica(t('catalizadores.metricas.alta'), String(datos.resumen?.alta ?? 0));
  metrica(t('catalizadores.metricas.pasados'), String(datos.resumen?.pasados ?? 0));
}

/**
 * Next Catalyst: el evento próximo más inminente. `proximos` ya llega
 * ordenado por `dias` ascendente desde el servidor —el criterio es el más
 * cercano en el tiempo, aunque su prioridad no sea la más alta—, así que es
 * simplemente el primero de la lista. Sin evento próximo, tercer estado
 * explícito: nunca una pieza vacía o rota.
 */
export function pintarSiguiente(datos, alAbrirCompania) {
  const raiz = $('#siguiente-catalizador');
  if (!raiz) return;
  raiz.textContent = '';

  const e = datos.proximos?.[0];
  if (!e) {
    const vacio = elemento('div', 'siguiente-catalizador__vacio',
      t('catalizadores.siguiente.vacio'));
    raiz.appendChild(vacio);
    return;
  }

  const pieza = elemento('article', 'siguiente-catalizador');
  pieza.tabIndex = 0;
  pieza.setAttribute('role', 'button');
  pieza.setAttribute('aria-label', t('catalizadores.siguiente.abrir', { empresa: e.compania ?? e.ticker ?? '' }));

  const izquierda = elemento('div', 'siguiente-catalizador__izquierda');
  izquierda.appendChild(elemento('span', 'siguiente-catalizador__ticker',
    [e.ticker, e.compania].filter(Boolean).join(t('general.separadorLista')) || '—'));
  const cuenta = elemento('strong', 'siguiente-catalizador__cuenta');
  pintarValorFundido(cuenta, 'siguiente', distancia(e.dias));
  izquierda.appendChild(cuenta);
  izquierda.appendChild(elemento('p', 'siguiente-catalizador__titulo', e.titulo));
  pieza.appendChild(izquierda);

  const derecha = elemento('div', 'siguiente-catalizador__derecha');
  derecha.appendChild(par(t('catalizadores.dato.tipo'), etiquetaTipoEvento(e.tipo)));
  derecha.appendChild(par(t('catalizadores.dato.prioridad'), etiquetaPrioridad(e.prioridad),
    claseLecturaPrioridad(e.prioridad)));
  const d = e.detalle ?? {};
  derecha.appendChild(par(t('catalizadores.dato.interesAbierto'),
    Number.isFinite(d.interesAbierto) ? formatearNumero(d.interesAbierto, 0) : noDisponible()));
  derecha.appendChild(par(t('catalizadores.dato.volumen'),
    Number.isFinite(d.volumen) ? formatearNumero(d.volumen, 0) : noDisponible()));
  pieza.appendChild(derecha);

  const abrir = () => alAbrirCompania(e.ticker ?? e.compania);
  pieza.addEventListener('click', abrir);
  pieza.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); }
  });
  raiz.appendChild(pieza);
}

/**
 * Timeline abstracta del hero: un punto por evento próximo con fecha cierta,
 * su posición horizontal proporcional a `dias` sobre el más lejano de los
 * propios datos —nunca aleatoria—. Sin eje ni leyenda, solo el pulso de la
 * agenda. Sin eventos próximos, tercer estado: no se dibuja nada, ni una
 * línea vacía fingiendo actividad.
 */
export function pintarHeroLinea(datos) {
  const raiz = $('#catalizadores-hero-linea');
  if (!raiz) return;
  raiz.textContent = '';

  const eventos = (datos.proximos ?? []).filter((e) => Number.isFinite(e.dias) && e.dias >= 0);
  if (!eventos.length) return;

  const maxDias = Math.max(...eventos.map((e) => e.dias), 1);
  const ancho = 400;
  const alto = 18;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('catalizadores-hero__linea');

  const eje = document.createElementNS(SVG_NS, 'line');
  eje.setAttribute('class', 'catalizadores-hero__linea-eje');
  eje.setAttribute('x1', '0'); eje.setAttribute('x2', String(ancho));
  eje.setAttribute('y1', String(alto - 1)); eje.setAttribute('y2', String(alto - 1));
  svg.appendChild(eje);

  eventos.forEach((e, i) => {
    const x = maxDias > 0 ? (e.dias / maxDias) * (ancho - 8) + 4 : ancho / 2;
    const punto = document.createElementNS(SVG_NS, 'circle');
    punto.setAttribute('class',
      `catalizadores-hero__linea-punto${e.prioridad === 'HIGH' ? ' catalizadores-hero__linea-punto--alta' : ''}`);
    punto.setAttribute('cx', x.toFixed(1));
    punto.setAttribute('cy', String(alto - 1));
    punto.setAttribute('r', e.prioridad === 'HIGH' ? '3' : '2');
    punto.style.setProperty('--retardo', `${i * 45}ms`);
    svg.appendChild(punto);
  });

  raiz.appendChild(svg);
  observarEntrada(svg);
}

/**
 * Event density: una celda por día del rango 0..30 sobre `proximos`,
 * agregado en cliente —sin pedir nada nuevo al servidor—.
 */
export function pintarDensidad(datos) {
  const raiz = $('#densidad-eventos');
  if (!raiz) return;
  raiz.textContent = '';

  // Misma agrupación para la celda activa y para el tooltip: un hecho, una
  // fuente (regla 9). Sin `.title` nativo —no es accesible por teclado y no
  // se puede estilar—, se sustituye por un globo real.
  const porDia = new Map();
  for (const e of datos.proximos ?? []) {
    if (!Number.isFinite(e.dias) || e.dias < 0 || e.dias > 30) continue;
    if (!porDia.has(e.dias)) porDia.set(e.dias, []);
    porDia.get(e.dias).push(e);
  }

  const globo = elemento('div', 'densidad-eventos__globo');
  globo.setAttribute('role', 'tooltip');
  globo.id = 'densidad-eventos-globo';
  raiz.appendChild(globo);

  const cerrar = () => { globo.dataset.abierto = 'false'; };

  for (let dia = 0; dia <= 30; dia += 1) {
    const eventosDia = porDia.get(dia);
    const activa = Boolean(eventosDia?.length);
    const celda = elemento('span',
      `densidad-eventos__celda${activa ? ' densidad-eventos__celda--activa' : ''}`);
    if (activa) {
      celda.tabIndex = 0;
      celda.setAttribute('role', 'button');
      celda.setAttribute('aria-describedby', globo.id);
      celda.setAttribute('aria-label', `${distancia(dia)} · ${
        eventosDia.map((e) => e.ticker ?? e.compania).filter(Boolean).join(t('general.separadorLista'))}`);
      const abrir = () => {
        globo.textContent = '';
        globo.appendChild(elemento('strong', '', distancia(dia)));
        globo.appendChild(elemento('span', '',
          eventosDia.map((e) => e.ticker ?? e.compania).filter(Boolean).join(t('general.separadorLista'))));
        globo.style.left = `${celda.offsetLeft}px`;
        globo.dataset.abierto = 'true';
      };
      celda.addEventListener('mouseenter', abrir);
      celda.addEventListener('focus', abrir);
      celda.addEventListener('mouseleave', cerrar);
      celda.addEventListener('blur', cerrar);
    }
    raiz.appendChild(celda);
  }
}
