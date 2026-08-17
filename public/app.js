/* ============================================================================
   Warrants & Co. — Cliente de la plataforma
   Todo contenido dinamico se inserta como texto: no existe ninguna via de
   inyeccion desde los datos del repositorio ni desde los proveedores de mercado.
   ========================================================================= */

import { GraficoCartera, num } from './grafico.js';
import { iniciarTema } from './tema.js';
import { iniciarIdioma, t, tNodos } from './i18n.js';
import { activarApariciones, pintarCinta, seguirAlturaCabecera } from './portada.js';
import { construirNavegacion, marcarSeccionActiva } from './navegacion.js';
import {
  $, $$, elemento, formatearNumero, formatearMoneda, formatearPorcentaje,
  formatearFecha, formatearMomento, formatearBytes, claseVariacion, localeFormato } from './formato.js';
import {
  pintarSnapshot, pintarRadar, pintarSignal, pintarPanelCartera,
  pintarResearch, pintarCatalizadores, pintarUltimasNoticias,
} from './home.js';
import {
  pintarAlcance, pintarTablaInusual, pintarDestacadas, construirDetalleInusual,
  pintarCadena, pintarMapaInteres, pintarFlujo, reiniciarPaginacion,
} from './opciones.js';
import { pintarCompanias, pintarSectores, pintarFicha } from './companias.js';
import {
  pintarAgenda, pintarCarencias, pintarFiltros as pintarFiltrosCatalizadores,
} from './catalizadores.js';
import { pintarPanorama } from './mercado.js';
import {
  pintarTicker, animarManifiesto, animarCabeceras, pintarPulso, pintarRadarHome,
  pintarResearchHome, pintarCatalizadoresHome, pintarFlujoHome, pintarSignalHome,
} from './inicio.js';

// ─────────────────────────────── utilidades ──────────────────────────────

const CLAVE_SESION = 'warrants.clave';

const estado = {
  seccion: 'analisis',
  filtros: {},
  pagina: 1,
  vocabularios: null,
  cartera: null,
  rangoGrafico: 'MAX',
  benchmark: 'SPY',
  grafico: null,
  cargandoCartera: false,
  filtrosNoticias: {},
  paginaNoticias: 1,
  companias: { q: '', sector: '', ficha: null },
  catalizadores: { horizonte: 'UPCOMING', compania: '', tipo: '' },
  vocabulariosNoticias: null,
  opciones: { estado: null, inusual: null, cadena: null, pestana: 'inusual', filtros: {} },
};

// ──────────────────────────────── avisos ─────────────────────────────────

function avisar(mensaje, { claro = false, duracion = 5200 } = {}) {
  const contenedor = $('#avisos');
  const aviso = elemento('div', `aviso${claro ? ' aviso--claro' : ''}`);
  aviso.appendChild(elemento('span', null, mensaje));

  const cerrar = elemento('button', 'aviso__cerrar', '×');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', 'Cerrar aviso');
  const retirar = () => aviso.remove();
  cerrar.addEventListener('click', retirar);
  aviso.appendChild(cerrar);

  contenedor.appendChild(aviso);
  setTimeout(retirar, duracion);
}

// ──────────────────────────────── red ────────────────────────────────────

const clave = () => sessionStorage.getItem(CLAVE_SESION) ?? '';
const hayCredencial = () => Boolean(clave());

async function api(ruta, opciones = {}) {
  const cabeceras = { ...(opciones.headers ?? {}) };
  if (hayCredencial()) cabeceras['X-Clave-Redaccion'] = clave();
  if (opciones.body && !(opciones.body instanceof FormData)) cabeceras['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(ruta, { ...opciones, headers: cabeceras });
  } catch {
    throw new Error('No ha sido posible contactar con el servidor. Verifique que la aplicación sigue en ejecución.');
  }

  let datos = null;
  const tipo = respuesta.headers.get('content-type') ?? '';
  if (tipo.includes('application/json')) {
    datos = await respuesta.json().catch(() => null);
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401) {
      sessionStorage.removeItem(CLAVE_SESION);
      actualizarIndicadorSesion();
    }
    const error = new Error(datos?.error ?? `La solicitud ha fallado (código ${respuesta.status}).`);
    error.status = respuesta.status;
    error.errores = datos?.errores;
    throw error;
  }
  return datos;
}

// ─────────────────────────────── navegacion ──────────────────────────────

const SECCIONES = new Set([
  'inicio', 'radar', 'repositorio', 'noticias', 'opciones', 'cartera',
  'companias', 'catalizadores', 'mercado',
]);

// La portada era antes la sección del panel; se conserva el destino anterior para
// que un enlace guardado siga funcionando.
const ALIAS_SECCION = {
  analisis: 'radar', home: 'inicio', '': 'inicio',
  companies: 'companias', catalysts: 'catalizadores', market: 'mercado', markets: 'mercado',
};

function irA(seccion, pestana = null, { empujar = true } = {}) {
  seccion = ALIAS_SECCION[seccion] ?? seccion;
  if (!SECCIONES.has(seccion)) seccion = 'inicio';
  estado.seccion = seccion;

  for (const panel of $$('[data-seccion-panel]')) {
    panel.hidden = panel.dataset.seccionPanel !== seccion;
  }
  marcarSeccionActiva(seccion, pestana ?? estado.opciones.pestana);

  if (empujar && location.hash !== `#/${seccion}`) location.hash = `#/${seccion}`;
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

  // Si la sección quedó caducada por un cambio en las tesis, se retiran sus
  // guardas antes de cargarla: así el cargador de siempre trae dato fresco.
  purgarSiCaducada(seccion);

  if (seccion === 'opciones' && pestana) seleccionarPestanaOpciones(pestana);
  CARGADORES[seccion]?.();
}

/**
 * Qué carga cada sección. Un único mapa, consultado por el enrutador y por la
 * invalidación: si algún día una sección cambia de cargador, cambia aquí y en
 * ningún otro sitio.
 */
const CARGADORES = {
  inicio: () => cargarInicio(),
  radar: () => cargarPanel(),
  repositorio: () => cargarInformes(),
  noticias: () => { cargarNoticias(); cargarEstadoSincronizacion(); },
  opciones: () => cargarOpciones(),
  cartera: () => cargarCartera(),
  companias: () => cargarCompanias(),
  catalizadores: () => cargarCatalizadores(),
  mercado: () => cargarMercado(),
};

/* ═══════════════ Lo que se deriva de las tesis de inversión ═══════════════

   La cartera, la cobertura por compañía, la agenda de catalizadores, el radar,
   la portada y el universo de opciones salen todos del mismo conjunto de
   informes. Publicar, editar o borrar uno los invalida a la vez.

   No se recargan los seis de golpe: eso serían media docena de respuestas que
   quizá nadie vaya a mirar. Se marcan como caducados y cada uno se rehace
   cuando toque mostrarse. La sección a la vista se rehace de inmediato.

   Aquí no se cachea nada nuevo: lo único que se guarda es qué secciones han
   quedado caducadas, y lo único que se hace al purgarlas es **retirar** las
   memorias que ya existían para que su cargador vuelva a pedir al servidor. */

/**
 * Memorias que cada sección conserva entre navegaciones y que un cambio en las
 * tesis deja obsoletas. Las que no aparecen —radar, repositorio, compañías,
 * catalizadores— no memorizan nada: su cargador ya pide al servidor cada vez.
 */
const MEMORIAS_DERIVADAS = {
  inicio: () => { inicioMontado = false; },
  cartera: () => { estado.cartera = null; },
  opciones: () => {
    // El universo de opciones es el de tickers cubiertos: cambia con las tesis.
    estado.opciones.estado = null;
    estado.opciones.inusual = null;
    estado.opciones.cadena = null;
  },
  radar: () => {},
  repositorio: () => {},
  companias: () => {},
  catalizadores: () => {},
};

const seccionesCaducadas = new Set();

/**
 * Punto único de invalidación. El alta, la edición y la baja de una tesis pasan
 * por aquí y por ningún otro sitio.
 */
async function invalidarDerivadasDeInformes() {
  for (const seccion of Object.keys(MEMORIAS_DERIVADAS)) seccionesCaducadas.add(seccion);

  // Los vocabularios del formulario salen de los propios informes.
  await cargarVocabularios();

  // Lo que el usuario está mirando se rehace ya; el resto, al mostrarse.
  purgarSiCaducada(estado.seccion);
  await CARGADORES[estado.seccion]?.();
}

/** Retira las memorias de una sección caducada, justo antes de cargarla. */
function purgarSiCaducada(seccion) {
  if (!seccionesCaducadas.has(seccion)) return;
  seccionesCaducadas.delete(seccion);
  MEMORIAS_DERIVADAS[seccion]?.();
}

function seccionDesdeHash() {
  const s = location.hash.replace(/^#\/?/, '').split('?')[0];
  const resuelta = ALIAS_SECCION[s] ?? s;
  return SECCIONES.has(resuelta) ? resuelta : 'inicio';
}


// ═══════════════════════════ identidad corporativa ═══════════════════════

/**
 * Adopta los recursos de marca disponibles en `public/marca/`.
 * La ausencia de un recurso no degrada nada: el logotipo cae al SVG por defecto
 * y la portada conserva su fondo gráfico propio.
 */
async function cargarMarca() {
  let marca;
  try {
    marca = await api('/api/marca');
  } catch {
    return; // la identidad no es crítica para el servicio
  }

  if (marca.sello?.url) {
    const sello = $('#marca-sello');
    if (sello) sello.src = `${marca.sello.url}?v=${marca.sello.version}`;
  }

  if (marca.logo?.url) {
    const logo = $('#pie-logo');
    if (logo) logo.src = `${marca.logo.url}?v=${marca.logo.version}`;
  }

  const portada = $('#portada');
  const banner = $('#portada-banner');
  if (marca.banner?.url && portada && banner) {
    // Se precarga antes de mostrarlo: así no aparece a medio pintar.
    const imagen = new Image();
    imagen.onload = () => {
      banner.style.setProperty('--banner', `url("${marca.banner.url}?v=${marca.banner.version}")`);
      banner.hidden = false;
      portada.dataset.banner = 'true';
    };
    imagen.onerror = () => {
      banner.hidden = true;
      delete portada.dataset.banner;
    };
    imagen.src = `${marca.banner.url}?v=${marca.banner.version}`;
  } else if (portada) {
    delete portada.dataset.banner;
    if (banner) banner.hidden = true;
  }
}

// ─────────────────────────────── portada ─────────────────────────────────

/**
 * Carga el panel de mercado. Cada sección se resuelve por separado: una fuente
 * caída deja su bloque en estado pendiente sin afectar a las demás.
 */
/**
 * Cuadro de mando.
 *
 * Cada bloque se pinta en cuanto resuelve su propia fuente, no cuando resuelven
 * todas: la agenda de catalizadores consulta cadenas de opciones y tarda varios
 * segundos, y esperarla dejaría en blanco a los índices, que llegan en décimas.
 * Una fuente caída deja su bloque en estado declarado sin afectar a los demás.
 */
async function cargarPanel() {
  const irA_ = (destino) => irA(String(destino).replace('#/', ''));

  const pintarCuando = (promesa, pintar) =>
    promesa.then((d) => pintar(d), () => pintar(null));

  const trabajos = [
    pintarCuando(api('/api/radar/indices'), pintarSnapshot),
    pintarCuando(api('/api/radar'), (d) => pintarRadar(d, irA_)),
    pintarCuando(api('/api/radar/signal'), pintarSignal),
    pintarCuando(api('/api/radar/catalizadores'), pintarCatalizadores),

    pintarCuando(api('/api/informes/destacados?limite=4'), (informes) => {
      // Prevalecen los destacados por el comité; si no hay, los más recientes.
      const seleccion = informes?.destacados?.length ? informes.destacados : (informes?.recientes ?? []);
      pintarResearch(seleccion, estado.cartera, abrirDetalle);
    }),

    pintarCuando(api('/api/noticias/portada?limite=6'), (piezas) => {
      const vistos = new Set();
      const titulares = [...(piezas?.destacadas ?? []), ...(piezas?.recientes ?? [])]
        .filter((n) => (vistos.has(n.id) ? false : vistos.add(n.id)));
      pintarUltimasNoticias(titulares, abrirDetalleNoticia);
    }),

    // La cartera alimenta también la cinta y la curva de fondo.
    cargarCartera({ silencioso: true }).catch(() => pintarPanelCartera(null)),
  ];

  await Promise.allSettled(trabajos);
}

function construirFicha(informe) {
  const ficha = elemento('button', 'ficha');
  ficha.type = 'button';
  ficha.addEventListener('click', () => abrirDetalle(informe.id));

  const superior = elemento('div', 'ficha__superior');
  if (informe.ticker) superior.appendChild(elemento('span', 'ficha__ticker', informe.ticker));
  superior.appendChild(elemento('span', null, informe.tipo_informe || 'Informe'));
  if (informe.destacado) superior.appendChild(elemento('span', 'distintivo distintivo--solido', 'Destacado'));
  ficha.appendChild(superior);

  ficha.appendChild(elemento('h3', 'ficha__titulo', informe.empresa));

  if (informe.resumen_ejecutivo) {
    ficha.appendChild(elemento('p', 'ficha__resumen', informe.resumen_ejecutivo));
  }

  const pie = elemento('div', 'ficha__pie');
  if (informe.recomendacion) pie.appendChild(elemento('span', 'distintivo distintivo--fuerte', informe.recomendacion));
  if (informe.precio_objetivo != null) {
    pie.appendChild(elemento('span', null, `P.O. ${formatearMoneda(informe.precio_objetivo, informe.divisa)}`));
  }
  pie.appendChild(elemento('span', null, formatearFecha(informe.fecha_publicacion)));
  for (const a of informe.adjuntos ?? []) pie.appendChild(elemento('span', 'formato-doc', a.formato));
  ficha.appendChild(pie);

  return ficha;
}

// ────────────────────────────── repositorio ──────────────────────────────

async function cargarVocabularios() {
  try {
    estado.vocabularios = await api('/api/informes/vocabularios');
    poblarFiltros();
    poblarFormulario();
  } catch (err) {
    avisar(err.message);
  }
}

function opcion(valor, texto) {
  const o = document.createElement('option');
  o.value = valor;
  o.textContent = texto;
  return o;
}

function poblarSelect(select, valores, textoVacio, rotular = (v) => v) {
  if (!select) return;
  const previo = select.value;
  select.textContent = '';
  select.appendChild(opcion('', textoVacio));
  for (const v of valores) select.appendChild(opcion(v, rotular(v)));
  if (previo && valores.includes(previo)) select.value = previo;
}

/** Denominación visible de un nivel de acceso, resuelta contra el vocabulario del servidor. */
function etiquetaAcceso(nivel) {
  if (!nivel) return '—';
  return estado.vocabularios?.etiquetasAcceso?.[nivel]
    ?? nivel[0].toUpperCase() + nivel.slice(1);
}

function poblarFiltros() {
  const v = estado.vocabularios;
  if (!v) return;
  poblarSelect($('#filtro-sector'), v.sectores, 'Todos');
  poblarSelect($('#filtro-pais'), v.paises, 'Todos');
  poblarSelect($('#filtro-tipo'), v.tipos, 'Todos');
  poblarSelect($('#filtro-recomendacion'), v.recomendaciones, 'Todas');
  poblarSelect($('#filtro-analista'), v.analistas, 'Todos');
  poblarSelect($('#filtro-nivel'), v.nivelesAcceso, 'Todos', etiquetaAcceso);

  const nube = $('#nube-etiquetas');
  const lista = $('#lista-etiquetas');
  lista.textContent = '';
  if (v.etiquetas?.length) {
    nube.hidden = false;
    for (const { etiqueta, usos } of v.etiquetas.slice(0, 18)) {
      const p = elemento('button', 'pastilla', `${etiqueta} · ${usos}`);
      p.type = 'button';
      p.setAttribute('aria-pressed', String(estado.filtros.etiqueta === etiqueta));
      p.addEventListener('click', () => {
        estado.filtros.etiqueta = estado.filtros.etiqueta === etiqueta ? undefined : etiqueta;
        estado.pagina = 1;
        poblarFiltros();
        cargarInformes();
      });
      lista.appendChild(p);
    }
  } else {
    nube.hidden = true;
  }
}

function recogerFiltros() {
  const form = $('#form-filtros');
  const datos = new FormData(form);
  const filtros = {};
  for (const [k, valor] of datos.entries()) {
    const v = String(valor).trim();
    if (v) filtros[k] = v;
  }
  if (estado.filtros.etiqueta) filtros.etiqueta = estado.filtros.etiqueta;
  return filtros;
}

async function cargarInformes() {
  const cuerpo = $('#cuerpo-tabla-informes');
  const envoltorio = $('.tabla-envoltorio');
  envoltorio?.classList.add('cargando');

  const parametros = new URLSearchParams({ ...estado.filtros, pagina: String(estado.pagina), limite: '20' });

  try {
    const datos = await api(`/api/informes?${parametros}`);
    cuerpo.textContent = '';

    if (!datos.informes.length) {
      const fila = document.createElement('tr');
      const celda = document.createElement('td');
      celda.colSpan = 11;
      const vacio = elemento('div', 'vacio');
      vacio.appendChild(elemento('strong', null, 'Sin resultados'));
      vacio.appendChild(document.createTextNode('Ningún informe coincide con los criterios seleccionados.'));
      celda.appendChild(vacio);
      fila.appendChild(celda);
      cuerpo.appendChild(fila);
    } else {
      for (const i of datos.informes) cuerpo.appendChild(construirFila(i));
    }

    pintarResumen(datos.paginacion);
    pintarPaginacion(datos.paginacion);
  } catch (err) {
    avisar(err.message);
  } finally {
    envoltorio?.classList.remove('cargando');
  }
}

function construirFila(informe) {
  const fila = document.createElement('tr');
  fila.tabIndex = 0;
  fila.setAttribute('role', 'button');
  fila.setAttribute('aria-label', `Abrir informe de ${informe.empresa}`);
  const abrir = () => abrirDetalle(informe.id);
  fila.addEventListener('click', abrir);
  fila.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); }
  });

  const celdaEmpresa = elemento('td', 'celda-empresa');
  celdaEmpresa.appendChild(document.createTextNode(informe.empresa));
  if (informe.destacado) {
    const marca = elemento('small', null, 'Destacado por el equipo');
    celdaEmpresa.appendChild(marca);
  }
  fila.appendChild(celdaEmpresa);

  fila.appendChild(elemento('td', 'mono', informe.ticker ?? '—'));
  fila.appendChild(elemento('td', null, informe.sector ?? '—'));
  fila.appendChild(elemento('td', null, informe.tipo_informe ?? '—'));
  fila.appendChild(elemento('td', null, informe.periodo ?? '—'));

  const celdaRec = document.createElement('td');
  if (informe.recomendacion) celdaRec.appendChild(elemento('span', 'distintivo', informe.recomendacion));
  else celdaRec.textContent = '—';
  fila.appendChild(celdaRec);

  fila.appendChild(elemento('td', 'num', informe.precio_objetivo != null ? formatearMoneda(informe.precio_objetivo, informe.divisa) : '—'));
  fila.appendChild(elemento('td', null, informe.analista ?? '—'));
  fila.appendChild(elemento('td', null, formatearFecha(informe.fecha_publicacion)));

  const celdaDocs = document.createElement('td');
  if (informe.adjuntos?.length) {
    for (const a of informe.adjuntos) celdaDocs.appendChild(elemento('span', 'formato-doc', a.formato));
  } else {
    celdaDocs.textContent = '—';
  }
  fila.appendChild(celdaDocs);

  // La edición directa solo se ofrece con sesión de redacción abierta.
  const celdaAcciones = elemento('td', 'celda-acciones');
  celdaAcciones.hidden = !hayCredencial();
  if (hayCredencial()) {
    const editar = elemento('button', 'boton boton--contorno', 'Editar');
    editar.type = 'button';
    editar.setAttribute('aria-label', `Editar el informe de ${informe.empresa}`);
    editar.addEventListener('click', async (ev) => {
      // El clic no debe propagarse a la fila, que abre la ficha de lectura.
      ev.stopPropagation();
      try {
        abrirFormulario(await api(`/api/informes/${informe.id}`));
      } catch (err) {
        avisar(err.message);
      }
    });
    celdaAcciones.appendChild(editar);
  }
  fila.appendChild(celdaAcciones);

  return fila;
}

function pintarResumen(p) {
  const desde = (p.pagina - 1) * p.limite + 1;
  const hasta = Math.min(p.pagina * p.limite, p.total);
  $('#resumen-resultados').textContent = p.total
    ? `Mostrando ${desde}–${hasta} de ${p.total} informe${p.total === 1 ? '' : 's'}`
    : 'Sin resultados';
}

function pintarPaginacion(p) {
  const nav = $('#paginacion');
  nav.textContent = '';
  if (p.paginas <= 1) return;

  const boton = (texto, destino, { actual = false, inactivo = false } = {}) => {
    const b = elemento('button', null, texto);
    b.type = 'button';
    if (actual) b.setAttribute('aria-current', 'true');
    b.disabled = inactivo;
    if (!inactivo && !actual) {
      b.addEventListener('click', () => {
        estado.pagina = destino;
        cargarInformes();
        $('#seccion-repositorio').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    return b;
  };

  nav.appendChild(boton('‹', p.pagina - 1, { inactivo: p.pagina <= 1 }));

  // Ventana deslizante de paginas alrededor de la actual.
  const inicio = Math.max(1, Math.min(p.pagina - 2, p.paginas - 4));
  const fin = Math.min(p.paginas, inicio + 4);
  for (let n = inicio; n <= fin; n++) nav.appendChild(boton(String(n), n, { actual: n === p.pagina }));

  nav.appendChild(boton('›', p.pagina + 1, { inactivo: p.pagina >= p.paginas }));
}

// ─────────────────────────────── detalle ─────────────────────────────────

async function abrirDetalle(id) {
  const dialogo = $('#dialogo-detalle');
  const contenido = $('#contenido-detalle');
  contenido.textContent = '';
  contenido.appendChild(elemento('div', 'detalle', 'Cargando informe…'));
  dialogo.showModal();

  try {
    const i = await api(`/api/informes/${id}`);
    contenido.textContent = '';
    contenido.appendChild(construirDetalle(i));
  } catch (err) {
    contenido.textContent = '';
    const d = elemento('div', 'detalle');
    d.appendChild(elemento('h2', null, 'No disponible'));
    d.appendChild(elemento('p', 'detalle__subtitulo', err.message));
    contenido.appendChild(d);
  }
}

function construirDetalle(i) {
  const raiz = elemento('div', 'detalle');

  const superior = elemento('div', 'detalle__superior');
  if (i.ticker) superior.appendChild(elemento('span', 'ficha__ticker', i.ticker));
  if (i.tipo_informe) superior.appendChild(elemento('span', 'distintivo', i.tipo_informe));
  if (i.recomendacion) superior.appendChild(elemento('span', 'distintivo distintivo--fuerte', i.recomendacion));
  if (i.destacado) superior.appendChild(elemento('span', 'distintivo distintivo--solido', 'Destacado'));
  raiz.appendChild(superior);

  raiz.appendChild(elemento('h2', null, i.empresa));

  const partes = [i.sector, i.pais, i.periodo].filter(Boolean);
  raiz.appendChild(elemento('p', 'detalle__subtitulo', partes.join(' · ') || 'Ficha analítica'));

  const datos = elemento('dl', 'detalle__datos');
  const dato = (etiqueta, valor) => {
    const bloque = elemento('div', 'detalle__dato');
    bloque.appendChild(elemento('dt', null, etiqueta));
    bloque.appendChild(elemento('dd', null, valor));
    datos.appendChild(bloque);
  };
  dato('Analista', i.analista || '—');
  dato('Publicación', formatearFecha(i.fecha_publicacion));
  dato('Precio objetivo', i.precio_objetivo != null ? formatearMoneda(i.precio_objetivo, i.divisa) : '—');
  dato('Nivel de acceso', etiquetaAcceso(i.nivel_acceso));
  dato('En cartera', i.en_cartera ? 'Si' : 'No');
  if (i.peso_cartera != null) dato('Peso asignado', `${formatearNumero(i.peso_cartera)} %`);
  if (i.precio_compra != null) dato('Precio de compra', formatearMoneda(i.precio_compra, i.divisa));
  if (i.take_profit != null) dato('Take profit', formatearMoneda(i.take_profit, i.divisa));
  if (i.stop_loss != null) dato('Stop loss', formatearMoneda(i.stop_loss, i.divisa));
  raiz.appendChild(datos);

  if (i.resumen_ejecutivo) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('h3', null, 'Resumen ejecutivo'));
    s.appendChild(elemento('p', 'detalle__resumen', i.resumen_ejecutivo));
    raiz.appendChild(s);
  }

  if (i.etiquetas?.length) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('h3', null, 'Etiquetas'));
    const cont = elemento('div', 'detalle__etiquetas');
    for (const e of i.etiquetas) cont.appendChild(elemento('span', 'distintivo', e));
    s.appendChild(cont);
    raiz.appendChild(s);
  }

  const s = elemento('div', 'detalle__seccion');
  s.appendChild(elemento('h3', null, 'Documentación'));
  if (i.adjuntos?.length) {
    const lista = elemento('ul', 'lista-adjuntos');
    for (const a of i.adjuntos) {
      const li = document.createElement('li');
      li.appendChild(elemento('span', 'formato-doc', a.formato));
      const enlace = document.createElement('a');
      enlace.href = `/api/informes/${i.id}/adjuntos/${a.id}`;
      enlace.textContent = a.nombre_original;
      enlace.setAttribute('download', '');
      li.appendChild(enlace);
      li.appendChild(elemento('span', 'peso', formatearBytes(a.bytes)));
      lista.appendChild(li);
    }
    s.appendChild(lista);
  } else {
    s.appendChild(elemento('p', 'detalle__subtitulo', 'Este informe todavía no tiene documentación adjunta.'));
  }
  raiz.appendChild(s);

  if (hayCredencial()) {
    const pie = elemento('div', 'detalle__pie');
    const editar = elemento('button', 'boton boton--contorno', 'Editar informe');
    editar.type = 'button';
    editar.addEventListener('click', () => {
      $('#dialogo-detalle').close();
      abrirFormulario(i);
    });
    pie.appendChild(editar);
    raiz.appendChild(pie);
  }

  return raiz;
}

// ────────────────────────────── formulario ───────────────────────────────

function poblarFormulario() {
  const v = estado.vocabularios;
  if (!v) return;

  const conVacio = (select, valores, textoVacio) => {
    if (!select) return;
    select.textContent = '';
    select.appendChild(opcion('', textoVacio));
    for (const x of valores) select.appendChild(opcion(x, x));
  };

  conVacio($('#campo-tipo'), v.tipos, 'Sin clasificar');
  conVacio($('#campo-recomendacion'), v.recomendaciones, 'Sin recomendación');

  const nivel = $('#campo-nivel');
  nivel.textContent = '';
  for (const n of v.nivelesAcceso) nivel.appendChild(opcion(n, etiquetaAcceso(n)));

  const divisa = $('#campo-divisa');
  divisa.textContent = '';
  for (const d of v.divisas) divisa.appendChild(opcion(d, d));

  const rellenar = (id, valores) => {
    const dl = $(id);
    if (!dl) return;
    dl.textContent = '';
    for (const x of valores) dl.appendChild(opcion(x, x));
  };
  rellenar('#lista-sectores', [...new Set([...v.sectoresSugeridos, ...v.sectores])]);
  rellenar('#lista-paises', v.paises);
  rellenar('#lista-analistas', v.analistas);
}

function abrirFormulario(informe = null) {
  if (!hayCredencial()) { abrirAcceso(); return; }

  const dialogo = $('#dialogo-informe');
  const form = $('#form-informe');
  form.reset();
  $('#errores-formulario').hidden = true;
  $('#lista-adjuntos-existentes').textContent = '';
  for (const c of $$('[aria-invalid]', form)) c.removeAttribute('aria-invalid');

  const editando = Boolean(informe);
  $('#titulo-dialogo-informe').textContent = editando ? 'Editar informe' : 'Publicar informe';
  $('#btn-guardar-informe').textContent = editando ? 'Guardar cambios' : 'Publicar';
  $('#btn-eliminar-informe').hidden = !editando;

  form.elements.id.value = editando ? informe.id : '';

  if (editando) {
    const asignar = (nombre, valor) => {
      const campo = form.elements[nombre];
      if (campo && valor !== null && valor !== undefined) campo.value = valor;
    };
    for (const k of ['empresa', 'ticker', 'sector', 'pais', 'tipo_informe', 'periodo', 'analista',
                     'recomendacion', 'precio_objetivo', 'divisa', 'peso_cartera',
                     'precio_compra', 'take_profit', 'stop_loss',
                     'resumen_ejecutivo', 'nivel_acceso', 'fecha_publicacion']) {
      asignar(k, informe[k]);
    }
    form.elements.etiquetas.value = (informe.etiquetas ?? []).join(', ');
    form.elements.destacado.checked = Boolean(informe.destacado);
    form.elements.en_cartera.checked = Boolean(informe.en_cartera);

    if (informe.adjuntos?.length) {
      const lista = $('#lista-adjuntos-existentes');
      for (const a of informe.adjuntos) {
        const li = document.createElement('li');
        li.appendChild(elemento('span', 'formato-doc', a.formato));
        li.appendChild(elemento('span', null, a.nombre_original));
        li.appendChild(elemento('span', 'peso', formatearBytes(a.bytes)));

        const quitar = elemento('button', 'boton boton--texto', 'Retirar');
        quitar.type = 'button';
        quitar.addEventListener('click', async () => {
          if (!confirm(`¿Retirar el documento «${a.nombre_original}»?`)) return;
          try {
            await api(`/api/informes/${informe.id}/adjuntos/${a.id}`, { method: 'DELETE' });
            li.remove();
            avisar('Documento retirado.', { claro: true });
          } catch (err) { avisar(err.message); }
        });
        li.appendChild(quitar);
        lista.appendChild(li);
      }
    }
  } else {
    form.elements.fecha_publicacion.value = new Date().toISOString().slice(0, 10);
    form.elements.en_cartera.checked = true;
    form.elements.nivel_acceso.value = 'publico';
  }

  dialogo.showModal();
  form.elements.empresa.focus();
}

async function enviarFormulario(ev) {
  ev.preventDefault();
  const form = $('#form-informe');
  const boton = $('#btn-guardar-informe');
  const panelErrores = $('#errores-formulario');
  panelErrores.hidden = true;
  for (const c of $$('[aria-invalid]', form)) c.removeAttribute('aria-invalid');

  const id = form.elements.id.value;
  const datos = new FormData();

  for (const nombre of ['empresa', 'ticker', 'sector', 'pais', 'tipo_informe', 'periodo', 'analista',
                        'recomendacion', 'precio_objetivo', 'divisa', 'peso_cartera',
                        'precio_compra', 'take_profit', 'stop_loss',
                        'resumen_ejecutivo', 'etiquetas', 'nivel_acceso', 'fecha_publicacion']) {
    datos.append(nombre, form.elements[nombre].value ?? '');
  }
  datos.append('destacado', form.elements.destacado.checked ? 'true' : 'false');
  datos.append('en_cartera', form.elements.en_cartera.checked ? 'true' : 'false');

  for (const fichero of $('#campo-ficheros').files) datos.append('ficheros', fichero);

  boton.disabled = true;
  boton.textContent = 'Procesando…';

  try {
    await api(id ? `/api/informes/${id}` : '/api/informes', { method: id ? 'PUT' : 'POST', body: datos });
    $('#dialogo-informe').close();
    avisar(id ? 'Informe actualizado correctamente.' : 'Informe publicado correctamente.', { claro: true });

    await invalidarDerivadasDeInformes();
  } catch (err) {
    panelErrores.textContent = '';
    panelErrores.appendChild(elemento('strong', null, err.message));
    if (err.errores?.length) {
      const lista = document.createElement('ul');
      for (const e of err.errores) {
        lista.appendChild(elemento('li', null, e.mensaje));
        const campo = form.elements[e.campo];
        if (campo) campo.setAttribute('aria-invalid', 'true');
      }
      panelErrores.appendChild(lista);
    }
    panelErrores.hidden = false;
    panelErrores.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    boton.disabled = false;
    boton.textContent = id ? 'Guardar cambios' : 'Publicar';
  }
}

async function eliminarInforme() {
  const id = $('#form-informe').elements.id.value;
  if (!id) return;
  if (!confirm('¿Eliminar definitivamente este informe y su documentación asociada?')) return;

  try {
    await api(`/api/informes/${id}`, { method: 'DELETE' });
    $('#dialogo-informe').close();
    avisar('Informe eliminado.', { claro: true });
    await invalidarDerivadasDeInformes();
  } catch (err) {
    avisar(err.message);
  }
}

// ──────────────────────────────── acceso ─────────────────────────────────

function actualizarIndicadorSesion() {
  const activo = hayCredencial();
  const cabecera = $('#cabecera-acciones');
  if (cabecera) cabecera.hidden = !activo;
  $('#indicador-sesion').hidden = !activo;
  $('#btn-acceso').textContent = activo ? t('cabecera.sesionActiva') : t('cabecera.acceso');
  $('#btn-cerrar-sesion').hidden = !activo;
}

function abrirAcceso() {
  $('#error-acceso').hidden = true;
  $('#campo-clave').value = '';
  actualizarIndicadorSesion();
  $('#dialogo-acceso').showModal();
  $('#campo-clave').focus();
}

async function enviarAcceso(ev) {
  ev.preventDefault();
  const campo = $('#campo-clave');
  const error = $('#error-acceso');
  error.hidden = true;

  try {
    const respuesta = await fetch('/api/sesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: campo.value }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => null);
      throw new Error(datos?.error ?? 'Credencial no válida.');
    }
    sessionStorage.setItem(CLAVE_SESION, campo.value);
    actualizarIndicadorSesion();
    $('#dialogo-acceso').close();
    avisar('Sesión iniciada como analista de Warrants & Co.', { claro: true });
    if (estado.seccion === 'repositorio') cargarInformes();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
}

// ════════════════════════════════ HOME ══════════════════════════════════

let inicioMontado = false;

/**
 * Monta la narrativa de la portada.
 *
 * Cada bloque se pinta en cuanto resuelve su fuente: la agenda consulta cadenas
 * de opciones y tarda segundos, y esperarla dejaría la cinta y el pulso en
 * blanco. Una fuente caída deja su bloque con su estado declarado.
 */
async function cargarInicio() {
  if (inicioMontado) return;
  inicioMontado = true;

  animarManifiesto();
  animarCabeceras();

  const irARuta = (destino) => {
    const [seccion, consulta] = String(destino).replace('#/', '').split('?');
    if (consulta) location.hash = `#/${seccion}?${consulta}`;
    else irA(seccion);
  };

  const cuando = (promesa, pintar) => promesa.then((d) => pintar(d), () => pintar(null));

  // ── Cinta y pulso comparten la llamada de índices ──
  const indices = api('/api/radar/indices');
  const cartera = api('/api/mercado/cartera').catch(() => null);

  const trabajos = [
    Promise.all([indices, cartera]).then(
      ([i, c]) => pintarTicker(i, c),
      () => pintarTicker(null, null)
    ),
    indices.then((i) => pintarPulso(i, api), () => pintarPulso(null, api)),
    cuando(api('/api/radar'), (d) => pintarRadarHome(d, irARuta)),
    cuando(api('/api/catalizadores'), (d) => pintarCatalizadoresHome(d, irARuta)),
    cuando(api('/api/opciones/flujo'), pintarFlujoHome),
    cuando(api('/api/radar/signal'), pintarSignalHome),
    cargarResearchDestacado(irARuta),
  ];

  await Promise.allSettled(trabajos);
}

/**
 * Cobertura destacada. El listado no trae cotización ni resumen, de modo que se
 * pide la ficha de cada compañía cubierta —hoy son pocas— y se rota entre ellas.
 */
async function cargarResearchDestacado(irARuta) {
  try {
    // Una sola llamada trae la cobertura entera con su ficha: pedirlas una a
    // una multiplicaba los viajes al servidor sin ganar nada.
    const datos = await api('/api/companias?detalle=1');
    pintarResearchHome(datos.fichas ?? [], irARuta);
  } catch {
    pintarResearchHome([], irARuta);
  }
}

// ═══════════════════════════════ COMPANIES ══════════════════════════════

/**
 * Cobertura por compañía. La lista y la ficha comparten sección: `?t=TICKER`
 * en el enlace decide cuál se muestra, de modo que una ficha es enlazable.
 */
async function cargarCompanias() {
  const ficha = parametroHash('t');

  if (ficha) {
    await abrirCompania(ficha, { empujar: false });
    return;
  }

  mostrarVistaCompanias('lista');

  const parametros = new URLSearchParams();
  if (estado.companias.q) parametros.set('q', estado.companias.q);
  if (estado.companias.sector) parametros.set('sector', estado.companias.sector);

  try {
    const datos = await api(`/api/companias${parametros.toString() ? `?${parametros}` : ''}`);
    pintarSectores(datos.sectores, estado.companias.sector);
    pintarCompanias(datos, (clave) => abrirCompania(clave));
  } catch (err) {
    avisar(`No ha sido posible cargar la cobertura: ${err.message}`);
  }
}

/** Abre la ficha de una compañía. */
async function abrirCompania(clave, { empujar = true } = {}) {
  if (estado.seccion !== 'companias') irA('companias', null, { empujar: false });
  mostrarVistaCompanias('ficha');
  estado.companias.ficha = clave;

  if (empujar) location.hash = `#/companias?t=${encodeURIComponent(clave)}`;

  const raiz = $('#ficha-compania');
  if (raiz) raiz.textContent = 'Cargando…';

  try {
    const datos = await api(`/api/companias/${encodeURIComponent(clave)}`);
    pintarFicha(datos, {
      alAbrirInforme: (id) => abrirDetalle(id),
      alVerCatalizadores: (ticker) => {
        estado.catalizadores.compania = ticker;
        estado.catalizadores.horizonte = 'UPCOMING';
        irA('catalizadores');
      },
    });
  } catch (err) {
    if (raiz) {
      raiz.textContent = '';
      const vacio = elemento('div', 'vacio');
      vacio.appendChild(elemento('strong', '', 'Compañía no encontrada'));
      vacio.appendChild(elemento('span', '', err.message));
      raiz.appendChild(vacio);
    }
  }
}

function mostrarVistaCompanias(cual) {
  const lista = $('#vista-companias-lista');
  const ficha = $('#vista-compania-ficha');
  if (lista) lista.hidden = cual !== 'lista';
  if (ficha) ficha.hidden = cual !== 'ficha';
}

/** Lee un parámetro del hash: `#/seccion?clave=valor`. */
function parametroHash(clave) {
  const [, consulta = ''] = location.hash.split('?');
  return new URLSearchParams(consulta).get(clave);
}

// ═══════════════════════════════ CATALYSTS ══════════════════════════════

async function cargarCatalizadores() {
  const parametros = new URLSearchParams();
  if (estado.catalizadores.compania) parametros.set('ticker', estado.catalizadores.compania);
  if (estado.catalizadores.tipo) parametros.set('tipo', estado.catalizadores.tipo);

  const raiz = $('#agenda-completa');
  if (raiz && !raiz.childElementCount) raiz.textContent = 'Cargando agenda…';

  try {
    const datos = await api(`/api/catalizadores${parametros.toString() ? `?${parametros}` : ''}`);
    pintarFiltrosCatalizadores(datos, estado.catalizadores);
    pintarAgenda(datos, {
      horizonte: estado.catalizadores.horizonte,
      alAbrirCompania: (clave) => abrirCompania(clave),
    });
    pintarCarencias(datos);
    marcarHorizonte();
  } catch (err) {
    avisar(`No ha sido posible cargar la agenda: ${err.message}`);
  }
}

function marcarHorizonte() {
  for (const boton of $$('#conmutador-horizonte [data-horizonte]')) {
    const activo = boton.dataset.horizonte === estado.catalizadores.horizonte;
    boton.setAttribute('aria-selected', String(activo));
  }
}

// ════════════════════════════════ MARKETS ═══════════════════════════════

async function cargarMercado() {
  const raiz = $('#panorama-mercado');
  if (raiz && !raiz.childElementCount) raiz.textContent = 'Cargando panorama…';

  try {
    pintarPanorama(await api('/api/mercado/panorama'));
  } catch (err) {
    avisar(`No ha sido posible cargar el panorama: ${err.message}`);
  }
}

// ──────────────────────────────── cartera ────────────────────────────────

async function cargarCartera({ silencioso = false } = {}) {
  if (estado.cargandoCartera) return;
  estado.cargandoCartera = true;

  const tarjetas = [$('#cuadro-mando'), $('.tarjeta--grafico'), $('#rejilla-estadisticos')];
  if (!silencioso) for (const t of tarjetas) t?.classList.add('cargando');

  try {
    const datos = await api(`/api/mercado/cartera?benchmark=${encodeURIComponent(estado.benchmark)}`);
    estado.cartera = datos;
    pintarCartera(datos);
  } catch (err) {
    avisar(err.message);
    const cuadro = $('#cuadro-mando');
    if (cuadro && !cuadro.children.length) {
      cuadro.textContent = '';
      const vacio = elemento('div', 'vacio');
      vacio.appendChild(elemento('strong', null, 'Datos de mercado no disponibles'));
      vacio.appendChild(document.createTextNode(err.message));
      cuadro.appendChild(vacio);
    }
  } finally {
    estado.cargandoCartera = false;
    for (const t of tarjetas) t?.classList.remove('cargando');
  }
}

function pintarCartera(datos) {
  if (datos.vacia) {
    $('#cuadro-mando').textContent = '';
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, 'Cartera no constituida'));
    vacio.appendChild(document.createTextNode(datos.mensaje));
    $('#cuadro-mando').appendChild(vacio);
    $('#cuerpo-posiciones').textContent = '';
    $('#rejilla-estadisticos').textContent = '';
    return;
  }

  pintarCuadroMando(datos);
  pintarGrafico(datos);
  pintarPosiciones(datos);
  pintarCerradas(datos);
  pintarEstadisticos(datos);
  pintarAvisoCierre(datos);
  pintarEstadoDatos(datos);
  pintarCinta(datos.posiciones ?? [], datos.cerradas ?? []);
  // El panel de mercado muestra un resumen de las mismas cifras.
  pintarPanelCartera(datos);

  for (const a of datos.avisos ?? []) avisar(a, { claro: true, duracion: 8000 });
}

function pintarCuadroMando(datos) {
  const e = datos.estadisticos ?? {};
  const cuadro = $('#cuadro-mando');
  cuadro.textContent = '';

  const indicador = (etiqueta, valor, nota, { principal = false, variacion = null } = {}) => {
    const bloque = elemento('div', `indicador${principal ? ' indicador--principal' : ''}`);
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    const v = elemento('strong', 'indicador__valor', valor);
    if (variacion !== null) v.className = `indicador__valor ${claseVariacion(variacion)}`;
    bloque.appendChild(v);
    if (nota) bloque.appendChild(elemento('span', 'indicador__nota', nota));
    cuadro.appendChild(bloque);
  };

  const posiciones = datos.posiciones ?? [];
  const dia = posiciones.reduce((acc, p) => {
    if (!Number.isFinite(p.variacionDiaPct) || !Number.isFinite(p.peso)) return acc;
    return acc + (p.variacionDiaPct * p.peso) / 100;
  }, 0);

  indicador('Rentabilidad acumulada', formatearPorcentaje(e.rentabilidadTotal),
    `Sobre el capital invertido · desde ${formatearFecha(e.inicio)}`,
    { principal: true, variacion: e.rentabilidadTotal });

  // El valor indexado es un nivel, no una rentabilidad: se muestra sin signo ni símbolo.
  indicador('Valor indexado', formatearNumero(e.valorIndexado ?? datos.valorIndice),
    `Base ${formatearNumero(e.baseCapital ?? 100, 0)} = capital invertido`);
  indicador('Variación del día', formatearPorcentaje(dia), 'Ponderada por peso', { variacion: dia });
  const cerradas = datos.cerradas ?? [];
  indicador('Posiciones', String(posiciones.length),
    cerradas.length ? `${cerradas.length} liquidada${cerradas.length === 1 ? '' : 's'}` : 'Tesis en cartera');
  indicador('Ratio de Sharpe', formatearNumero(e.ratioSharpe), `Tasa libre de riesgo ${formatearNumero(e.tasaLibreRiesgo, 1)} %`);
  indicador('Máxima caída', formatearPorcentaje(e.maximaCaida), 'Desde máximo previo');
}

function filtrarPorRango(serie, rango) {
  if (!serie?.length || rango === 'MAX') return serie ?? [];
  const ultima = new Date(`${serie[serie.length - 1].fecha}T00:00:00`);
  let corte;
  if (rango === 'YTD') {
    corte = new Date(ultima.getFullYear(), 0, 1);
  } else {
    const meses = { '1M': 1, '3M': 3, '6M': 6 }[rango] ?? 0;
    corte = new Date(ultima);
    corte.setMonth(corte.getMonth() - meses);
  }
  const iso = corte.toISOString().slice(0, 10);
  const filtrada = serie.filter((p) => p.fecha >= iso);
  // Un rango sin datos suficientes conserva la serie completa antes que vaciar el grafico.
  return filtrada.length >= 2 ? filtrada : serie;
}

/** Rebasa una serie a 100 en su primer punto, para que el rango elegido sea comparable. */
function rebasar(serie) {
  if (!serie?.length) return [];
  const base = serie[0].valor;
  if (!Number.isFinite(base) || base === 0) return serie;
  return serie.map((p) => ({ fecha: p.fecha, valor: (p.valor / base) * 100 }));
}

const NOMBRES_INDICE = { SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones', IWM: 'Russell 2000' };

function pintarGrafico(datos) {
  const contenedor = $('#grafico');
  if (!estado.grafico) estado.grafico = new GraficoCartera(contenedor);

  const serie = rebasar(filtrarPorRango(datos.serie, estado.rangoGrafico));
  const fechas = new Set(serie.map((p) => p.fecha));
  const serieIndice = rebasar((datos.serieIndice ?? []).filter((p) => fechas.has(p.fecha)));

  const nombreIndice = `${NOMBRES_INDICE[datos.benchmark] ?? datos.benchmark} (${datos.benchmark})`;
  estado.grafico.actualizar(serie, serieIndice, nombreIndice);

  $('#subtitulo-grafico').textContent =
    `Valor indexado · base 100 en ${formatearFecha(serie[0]?.fecha)} · ${serie.length} sesiones`;
  $('#cabecera-indice').textContent = datos.benchmark;

  pintarLeyenda(serie, serieIndice, nombreIndice);
  pintarTablaSerie(serie, serieIndice, nombreIndice);
}

function pintarLeyenda(serie, serieIndice, nombreIndice) {
  const leyenda = $('#leyenda-grafico');
  leyenda.textContent = '';

  const entrada = (nombre, valores, esIndice) => {
    if (!valores?.length) return;
    const el = elemento('span', 'leyenda__elemento');
    el.appendChild(elemento('span', `leyenda__clave${esIndice ? ' leyenda__clave--indice' : ''}`));
    el.appendChild(elemento('span', null, nombre));
    const variacion = (valores[valores.length - 1].valor / valores[0].valor - 1) * 100;
    el.appendChild(elemento('strong', `leyenda__valor ${claseVariacion(variacion)}`, formatearPorcentaje(variacion)));
    leyenda.appendChild(el);
  };

  entrada('Cartera Warrants & Co.', serie, false);
  entrada(nombreIndice, serieIndice, true);
}

function pintarTablaSerie(serie, serieIndice, nombreIndice) {
  const cuerpo = $('#cuerpo-tabla-serie');
  cuerpo.textContent = '';
  const porFecha = new Map(serieIndice.map((p) => [p.fecha, p.valor]));

  // Orden descendente: la sesion mas reciente encabeza la tabla.
  for (const p of [...serie].reverse()) {
    const fila = document.createElement('tr');
    fila.appendChild(elemento('td', null, formatearFecha(p.fecha)));
    fila.appendChild(elemento('td', 'num', formatearNumero(p.valor)));

    const vIndice = porFecha.get(p.fecha);
    fila.appendChild(elemento('td', 'num', Number.isFinite(vIndice) ? formatearNumero(vIndice) : '—'));

    const diferencial = Number.isFinite(vIndice) ? p.valor - vIndice : null;
    const celda = elemento('td', `num ${claseVariacion(diferencial)}`,
      diferencial === null ? '—' : formatearNumero(Math.abs(diferencial)));
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
  }
}

/**
 * Recorrido pendiente hasta el take profit, con un medidor del avance desde la
 * compra. Sin nivel fijado, la celda queda vacia.
 */
function celdaRecorrido(p) {
  const celda = document.createElement('td');
  if (!Number.isFinite(p.recorridoTakeProfitPct)) {
    celda.textContent = '—';
    celda.className = 'variacion variacion--nula';
    return celda;
  }

  const envoltorio = elemento('div', 'medidor-nivel');
  const pista = elemento('div', 'medidor-nivel__pista');
  const relleno = elemento('div', 'medidor-nivel__relleno');

  // Avance recorrido entre el precio de compra y el objetivo de venta.
  let avance = 0;
  if (Number.isFinite(p.precioEntrada) && Number.isFinite(p.takeProfit) && Number.isFinite(p.precioActual)) {
    const total = p.takeProfit - p.precioEntrada;
    if (total > 0) avance = Math.max(0, Math.min(1, (p.precioActual - p.precioEntrada) / total));
  }
  relleno.style.width = `${(avance * 100).toFixed(1)}%`;
  pista.appendChild(relleno);
  envoltorio.appendChild(pista);
  envoltorio.appendChild(elemento('span', null, formatearPorcentaje(p.recorridoTakeProfitPct)));

  celda.appendChild(envoltorio);
  celda.setAttribute('title', `${formatearNumero(avance * 100)} % del recorrido hasta el take profit`);
  return celda;
}

function pintarPosiciones(datos) {
  const cuerpo = $('#cuerpo-posiciones');
  cuerpo.textContent = '';

  for (const p of datos.posiciones ?? []) {
    const fila = document.createElement('tr');

    const valor = elemento('td', 'celda-empresa celda-valor');
    valor.appendChild(document.createTextNode(p.empresa));
    const sub = elemento('small', null, `${p.ticker}${p.sector ? ` · ${p.sector}` : ''}`);
    valor.appendChild(sub);
    fila.appendChild(valor);

    fila.appendChild(elemento('td', 'num', `${formatearNumero(p.pesoVigente ?? p.peso)} %`));
    fila.appendChild(elemento('td', null, formatearFecha(p.fechaEntrada ?? p.fechaAlta)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioEntrada, p.divisa)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioActual, p.divisa)));
    fila.appendChild(elemento('td', `num ${claseVariacion(p.variacionDiaPct)}`, formatearPorcentaje(p.variacionDiaPct)));
    fila.appendChild(elemento('td', `num ${claseVariacion(p.rentabilidadPct)}`, formatearPorcentaje(p.rentabilidadPct)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.takeProfit, p.divisa)));
    fila.appendChild(celdaRecorrido(p));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioObjetivo, p.divisa)));

    const rec = document.createElement('td');
    if (p.recomendacion) rec.appendChild(elemento('span', 'distintivo distintivo--fuerte', p.recomendacion));
    else rec.textContent = '—';
    fila.appendChild(rec);

    cuerpo.appendChild(fila);
  }

  const exposicion = $('#exposicion-sectorial');
  exposicion.textContent = '';
  const maximo = Math.max(...(datos.exposicionSectorial ?? []).map((s) => s.peso), 1);
  for (const s of datos.exposicionSectorial ?? []) {
    const linea = elemento('div', 'exposicion__linea');
    const cab = elemento('div', 'exposicion__cabecera');
    cab.appendChild(elemento('span', null, s.sector));
    cab.appendChild(elemento('strong', null, `${formatearNumero(s.peso)} %`));
    linea.appendChild(cab);

    const barra = elemento('div', 'barra');
    const relleno = elemento('div', 'barra__relleno');
    relleno.style.width = `${Math.max((s.peso / maximo) * 100, 1)}%`;
    barra.appendChild(relleno);
    linea.appendChild(barra);
    exposicion.appendChild(linea);
  }
}

/** Posiciones liquidadas al alcanzar su take profit. */
function pintarCerradas(datos) {
  const tarjeta = $('#tarjeta-cerradas');
  const cuerpo = $('#cuerpo-cerradas');
  const cerradas = datos.cerradas ?? [];

  cuerpo.textContent = '';
  if (!cerradas.length) { tarjeta.hidden = true; return; }
  tarjeta.hidden = false;

  for (const p of cerradas) {
    const fila = document.createElement('tr');

    const valor = elemento('td', 'celda-empresa celda-valor');
    valor.appendChild(document.createTextNode(p.empresa));
    valor.appendChild(elemento('small', null, `${p.ticker}${p.sector ? ` · ${p.sector}` : ''}`));
    fila.appendChild(valor);

    fila.appendChild(elemento('td', null, formatearFecha(p.fechaEntrada ?? p.fechaAlta)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioEntrada, p.divisa)));
    fila.appendChild(elemento('td', null, formatearFecha(p.fechaCierre)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioCierre, p.divisa)));
    fila.appendChild(elemento('td', `num ${claseVariacion(p.rentabilidadPct)}`, formatearPorcentaje(p.rentabilidadPct)));

    const motivo = document.createElement('td');
    motivo.appendChild(elemento('span', 'distintivo distintivo--fuerte', p.motivoCierre ?? 'Cerrada'));
    fila.appendChild(motivo);

    cuerpo.appendChild(fila);
  }
}

function pintarEstadisticos(datos) {
  const rejilla = $('#rejilla-estadisticos');
  rejilla.textContent = '';
  const e = datos.estadisticos;

  if (!e) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, 'Estadísticos no disponibles'));
    vacio.appendChild(document.createTextNode('Se requiere un histórico más amplio para calcular las métricas de riesgo.'));
    rejilla.appendChild(vacio);
    return;
  }

  const nombreIndice = `${NOMBRES_INDICE[datos.benchmark] ?? datos.benchmark}`;
  $('#sub-estadisticos').textContent =
    `Periodo ${formatearFecha(e.inicio)} – ${formatearFecha(e.fin)} · ${e.sesiones} sesiones · referencia ${nombreIndice}`;

  const metricas = [
    ['Rentabilidad total', formatearPorcentaje(e.rentabilidadTotal), 'Del periodo completo', e.rentabilidadTotal],
    ['Rentabilidad anualizada', formatearPorcentaje(e.rentabilidadAnualizada), 'Tasa compuesta', e.rentabilidadAnualizada],
    [`Rentabilidad ${datos.benchmark}`, formatearPorcentaje(e.rentabilidadIndice), 'Mismo periodo', e.rentabilidadIndice],
    ['Volatilidad', formatearPorcentaje(e.volatilidadAnualizada, false), 'Anualizada'],
    ['Ratio de Sharpe', formatearNumero(e.ratioSharpe), `Exceso sobre ${formatearNumero(e.tasaLibreRiesgo, 1)} %`],
    ['Ratio de Sortino', formatearNumero(e.ratioSortino), 'Solo riesgo bajista'],
    ['Ratio de Calmar', formatearNumero(e.ratioCalmar), 'Rentabilidad / máxima caída'],
    ['Máxima caída', formatearPorcentaje(e.maximaCaida), `${formatearFecha(e.maximaCaidaDesde)} – ${formatearFecha(e.maximaCaidaHasta)}`],
    ['Beta', formatearNumero(e.beta), `Frente a ${datos.benchmark}`],
    ['Alfa de Jensen', formatearPorcentaje(e.alfaJensen), 'Anualizada', e.alfaJensen],
    ['Correlación', formatearNumero(e.correlacionIndice), `Con ${datos.benchmark}`],
    ['Sesiones positivas', formatearPorcentaje(e.sesionesPositivasPct, false), 'Del total'],
    ['Mejor sesión', formatearPorcentaje(e.mejorSesion), 'Variación diaria', e.mejorSesion],
    ['Peor sesión', formatearPorcentaje(e.peorSesion), 'Variación diaria', e.peorSesion],
  ];

  for (const [etiqueta, valor, nota, variacion] of metricas) {
    const bloque = elemento('div', 'estadistico');
    bloque.appendChild(elemento('span', 'estadistico__etiqueta', etiqueta));
    const v = elemento('strong', 'estadistico__valor', valor);
    if (variacion !== undefined) v.className = `estadistico__valor ${claseVariacion(variacion)}`;
    bloque.appendChild(v);
    if (nota) bloque.appendChild(elemento('span', 'estadistico__nota', nota));
    rejilla.appendChild(bloque);
  }
}

/** Anuncia las liquidaciones automáticas sobre la sección de cartera. */
function pintarAvisoCierre(datos) {
  const contenedor = $('#cuadro-mando');
  document.getElementById('aviso-cierre')?.remove();
  const cerradas = datos.cerradas ?? [];
  if (!cerradas.length || !contenedor) return;

  const aviso = elemento('div', 'aviso-cierre');
  aviso.id = 'aviso-cierre';

  const n = cerradas.length;

  // Cada posición es a su vez una plantilla: el inglés dice «on … at …» donde
  // el castellano dice «el … a …».
  const posiciones = cerradas
    .map((p) => t('cartera.cierre.posicion', {
      ticker: p.ticker,
      fecha: formatearFecha(p.fechaCierre),
      precio: formatearMoneda(p.precioCierre, p.divisa),
      rentabilidad: formatearPorcentaje(p.rentabilidadPct),
    }))
    .join(t('general.separadorLista'));

  // El recuento va destacado, y viaja como NODO dentro de la frase: así el
  // énfasis sobrevive sin necesidad de insertar marcado desde el diccionario.
  const destacado = elemento('strong', null, t('cartera.cierre.destacado', { n }));

  const texto = document.createElement('p');
  texto.appendChild(tNodos('cartera.cierre.aviso', { n, destacado, posiciones }));
  aviso.appendChild(texto);
  contenedor.parentNode.insertBefore(aviso, contenedor);
}

function pintarEstadoDatos(datos) {
  const fuentes = [...new Set((datos.posiciones ?? []).map((p) => p.fuente).filter(Boolean))];
  const momento = new Date(datos.generadoEn);
  const hora = momento.toLocaleTimeString(localeFormato(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  $('#estado-datos').textContent = `Actualizado a las ${hora}`;
  $('#pie-fuente').textContent = fuentes.length
    ? `Datos de mercado: ${fuentes.join(', ')}. Última actualización: ${momento.toLocaleString(localeFormato())}.`
    : '';
}


// ══════════════════════════════ noticias ═════════════════════════════════

const CLASE_RELEVANCIA = { urgente: 'noticia--urgente', alta: '', normal: '' };

async function cargarVocabulariosNoticias() {
  try {
    estado.vocabulariosNoticias = await api('/api/noticias/vocabularios');
    poblarFiltrosNoticias();
    poblarFormularioNoticia();
  } catch (err) {
    avisar(err.message);
  }
}

function poblarFiltrosNoticias() {
  const v = estado.vocabulariosNoticias;
  if (!v) return;
  poblarSelect($('#filtro-noticias-categoria'), v.categorias, 'Todas');
  poblarSelect($('#filtro-noticias-relevancia'), v.relevancias, 'Todas',
    (r) => v.etiquetasRelevancia?.[r] ?? r);
  // Los valores seleccionables son los que ya cubre el repositorio.
  const tickers = estado.vocabularios?.tickers ?? [];
  poblarSelect($('#filtro-noticias-ticker'), tickers, 'Todos');
  poblarSelect($('#filtro-noticias-origen'), v.origenes ?? [], 'Todos',
    (o) => (o === 'manual' ? 'Redacción propia' : o));
}

function poblarFormularioNoticia() {
  const v = estado.vocabulariosNoticias;
  if (!v) return;
  const cat = $('#campo-noticia-categoria');
  cat.textContent = '';
  for (const c of v.categorias) cat.appendChild(opcion(c, c));

  const rel = $('#campo-noticia-relevancia');
  rel.textContent = '';
  for (const r of v.relevancias) rel.appendChild(opcion(r, v.etiquetasRelevancia?.[r] ?? r));
}

function recogerFiltrosNoticias() {
  const datos = new FormData($('#form-filtros-noticias'));
  const filtros = {};
  for (const [k, valor] of datos.entries()) {
    const v = String(valor).trim();
    if (v) filtros[k] = v;
  }
  return filtros;
}

async function cargarNoticias() {
  const rejilla = $('#rejilla-noticias');
  rejilla.classList.add('cargando');

  const parametros = new URLSearchParams({
    ...estado.filtrosNoticias, pagina: String(estado.paginaNoticias), limite: '12',
  });

  try {
    const datos = await api(`/api/noticias?${parametros}`);
    rejilla.textContent = '';

    if (!datos.noticias.length) {
      const vacio = elemento('div', 'vacio');
      vacio.appendChild(elemento('strong', null, 'Sin noticias'));
      vacio.appendChild(document.createTextNode(
        Object.keys(estado.filtrosNoticias).length
          ? 'Ninguna noticia coincide con los criterios seleccionados.'
          : 'Todavía no se ha publicado ninguna noticia. Utilice «Publicar noticia» para registrar la primera.'
      ));
      rejilla.appendChild(vacio);
      rejilla.classList.remove('rejilla-noticias');
    } else {
      rejilla.classList.add('rejilla-noticias');
      for (const n of datos.noticias) rejilla.appendChild(construirTarjetaNoticia(n));
    }

    const p = datos.paginacion;
    $('#resumen-noticias').textContent = p.total
      ? `Mostrando ${(p.pagina - 1) * p.limite + 1}–${Math.min(p.pagina * p.limite, p.total)} de ${p.total} noticia${p.total === 1 ? '' : 's'}`
      : 'Sin resultados';

    pintarPaginacionGenerica($('#paginacion-noticias'), p, (n) => {
      estado.paginaNoticias = n;
      cargarNoticias();
      $('#seccion-noticias').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } catch (err) {
    avisar(err.message);
  } finally {
    rejilla.classList.remove('cargando');
  }
}

function construirTarjetaNoticia(n) {
  const tarjeta = elemento('button', `noticia ${CLASE_RELEVANCIA[n.relevancia] ?? ''}`.trim());
  tarjeta.type = 'button';
  tarjeta.addEventListener('click', () => abrirDetalleNoticia(n.id));

  const superior = elemento('div', 'noticia__superior');
  superior.appendChild(elemento('span', null, n.categoria));
  if (n.relevancia === 'urgente') superior.appendChild(elemento('span', 'distintivo distintivo--solido', 'Urgente'));
  else if (n.relevancia === 'alta') superior.appendChild(elemento('span', 'distintivo distintivo--fuerte', 'Alta'));
  if (n.destacada) superior.appendChild(elemento('span', 'distintivo', 'Portada'));
  tarjeta.appendChild(superior);

  tarjeta.appendChild(elemento('h3', 'noticia__titular', n.titular));
  if (n.entradilla) tarjeta.appendChild(elemento('p', 'noticia__entradilla', n.entradilla));

  const pie = elemento('div', 'noticia__pie');
  pie.appendChild(elemento('span', null, formatearMomento(n)));
  const propia = n.origen === 'manual' || !n.origen;
  pie.appendChild(elemento('span', `origen${propia ? ' origen--propio' : ''}`,
    propia ? 'Redacción propia' : n.fuente || n.origen));
  for (const t of n.tickers ?? []) pie.appendChild(elemento('span', 'ficha__ticker', t));
  tarjeta.appendChild(pie);

  return tarjeta;
}

async function abrirDetalleNoticia(id) {
  const dialogo = $('#dialogo-detalle-noticia');
  const contenido = $('#contenido-detalle-noticia');
  contenido.textContent = '';
  contenido.appendChild(elemento('div', 'detalle', 'Cargando noticia…'));
  dialogo.showModal();

  try {
    const n = await api(`/api/noticias/${id}`);
    contenido.textContent = '';
    contenido.appendChild(construirDetalleNoticia(n));
  } catch (err) {
    contenido.textContent = '';
    const d = elemento('div', 'detalle');
    d.appendChild(elemento('h2', null, 'No disponible'));
    d.appendChild(elemento('p', 'detalle__subtitulo', err.message));
    contenido.appendChild(d);
  }
}

function construirDetalleNoticia(n) {
  const raiz = elemento('div', 'detalle');

  const superior = elemento('div', 'detalle__superior');
  superior.appendChild(elemento('span', 'distintivo', n.categoria));
  if (n.relevancia === 'urgente') superior.appendChild(elemento('span', 'distintivo distintivo--solido', 'Urgente'));
  else if (n.relevancia === 'alta') superior.appendChild(elemento('span', 'distintivo distintivo--fuerte', 'Alta'));
  raiz.appendChild(superior);

  raiz.appendChild(elemento('h2', null, n.titular));

  const meta = [formatearMomento(n), n.autor, n.fuente, n.feed_origen].filter(Boolean);
  raiz.appendChild(elemento('p', 'detalle__subtitulo', meta.join(' · ')));

  if (n.origen && n.origen !== 'manual') {
    const nota = elemento('p', 'detalle__subtitulo',
      'Pieza sindicada: la plataforma recoge el titular y remite al artículo original en la fuente.');
    nota.style.marginTop = '-14px';
    raiz.appendChild(nota);
  }

  if (n.entradilla) {
    const e = elemento('p', 'portada__entradilla', n.entradilla);
    e.style.marginBottom = '22px';
    raiz.appendChild(e);
  }

  if (n.cuerpo) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('div', 'detalle__cuerpo', n.cuerpo));
    raiz.appendChild(s);
  }

  if (n.tickers?.length) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('h3', null, 'Valores relacionados'));
    const cont = elemento('div', 'detalle__etiquetas');
    for (const t of n.tickers) {
      const boton = elemento('button', 'pastilla', t);
      boton.type = 'button';
      boton.addEventListener('click', () => {
        $('#dialogo-detalle-noticia').close();
        $('#filtro-q').value = t;
        estado.filtros = { q: t };
        estado.pagina = 1;
        irA('repositorio');
      });
      cont.appendChild(boton);
    }
    s.appendChild(cont);
    raiz.appendChild(s);
  }

  if (n.etiquetas?.length) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('h3', null, 'Etiquetas'));
    const cont = elemento('div', 'detalle__etiquetas');
    for (const e of n.etiquetas) cont.appendChild(elemento('span', 'distintivo', e));
    s.appendChild(cont);
    raiz.appendChild(s);
  }

  const pie = elemento('div', 'detalle__pie');
  if (n.url_fuente) {
    // El servidor solo admite http/https, de modo que el enlace es seguro.
    const enlace = document.createElement('a');
    enlace.className = 'boton boton--contorno';
    enlace.href = n.url_fuente;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.textContent = 'Consultar fuente original';
    pie.appendChild(enlace);
  }
  if (hayCredencial()) {
    const editar = elemento('button', 'boton boton--contorno', 'Editar noticia');
    editar.type = 'button';
    editar.addEventListener('click', () => {
      $('#dialogo-detalle-noticia').close();
      abrirFormularioNoticia(n);
    });
    pie.appendChild(editar);
  }
  if (pie.children.length) raiz.appendChild(pie);

  return raiz;
}

function abrirFormularioNoticia(noticia = null) {
  if (!hayCredencial()) { abrirAcceso(); return; }

  const dialogo = $('#dialogo-noticia');
  const form = $('#form-noticia');
  form.reset();
  $('#errores-noticia').hidden = true;
  for (const c of $$('[aria-invalid]', form)) c.removeAttribute('aria-invalid');

  const editando = Boolean(noticia);
  $('#titulo-dialogo-noticia').textContent = editando ? 'Editar noticia' : 'Publicar noticia';
  $('#btn-guardar-noticia').textContent = editando ? 'Guardar cambios' : 'Publicar';
  $('#btn-eliminar-noticia').hidden = !editando;
  form.elements.id.value = editando ? noticia.id : '';

  if (editando) {
    for (const k of ['titular', 'entradilla', 'cuerpo', 'categoria', 'relevancia',
                     'autor', 'fuente', 'url_fuente', 'fecha_publicacion']) {
      if (form.elements[k] && noticia[k] != null) form.elements[k].value = noticia[k];
    }
    form.elements.tickers.value = (noticia.tickers ?? []).join(', ');
    form.elements.etiquetas.value = (noticia.etiquetas ?? []).join(', ');
    form.elements.destacada.checked = Boolean(noticia.destacada);
  } else {
    form.elements.fecha_publicacion.value = new Date().toISOString().slice(0, 10);
    form.elements.categoria.value = 'Mercados';
    form.elements.relevancia.value = 'normal';
  }

  dialogo.showModal();
  form.elements.titular.focus();
}

async function enviarFormularioNoticia(ev) {
  ev.preventDefault();
  const form = $('#form-noticia');
  const boton = $('#btn-guardar-noticia');
  const panel = $('#errores-noticia');
  panel.hidden = true;
  for (const c of $$('[aria-invalid]', form)) c.removeAttribute('aria-invalid');

  const id = form.elements.id.value;
  const cuerpo = {};
  for (const nombre of ['titular', 'entradilla', 'cuerpo', 'categoria', 'relevancia',
                        'tickers', 'etiquetas', 'autor', 'fuente', 'url_fuente', 'fecha_publicacion']) {
    cuerpo[nombre] = form.elements[nombre].value ?? '';
  }
  cuerpo.destacada = form.elements.destacada.checked;

  boton.disabled = true;
  boton.textContent = 'Procesando…';

  try {
    await api(id ? `/api/noticias/${id}` : '/api/noticias', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(cuerpo),
    });
    $('#dialogo-noticia').close();
    avisar(id ? 'Noticia actualizada correctamente.' : 'Noticia publicada correctamente.', { claro: true });
    await cargarVocabulariosNoticias();
    if (estado.seccion === 'noticias') await cargarNoticias();
    if (estado.seccion === 'radar') await cargarPanel();
  } catch (err) {
    panel.textContent = '';
    panel.appendChild(elemento('strong', null, err.message));
    if (err.errores?.length) {
      const lista = document.createElement('ul');
      for (const e of err.errores) {
        lista.appendChild(elemento('li', null, e.mensaje));
        const campo = form.elements[e.campo];
        if (campo) campo.setAttribute('aria-invalid', 'true');
      }
      panel.appendChild(lista);
    }
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    boton.disabled = false;
    boton.textContent = id ? 'Guardar cambios' : 'Publicar';
  }
}

async function eliminarNoticia() {
  const id = $('#form-noticia').elements.id.value;
  if (!id) return;
  if (!confirm('¿Eliminar definitivamente esta noticia?')) return;
  try {
    await api(`/api/noticias/${id}`, { method: 'DELETE' });
    $('#dialogo-noticia').close();
    avisar('Noticia eliminada.', { claro: true });
    if (estado.seccion === 'noticias') await cargarNoticias();
    if (estado.seccion === 'radar') await cargarPanel();
  } catch (err) {
    avisar(err.message);
  }
}


/** Estado de la sindicación automática con Investing.com. */
async function cargarEstadoSincronizacion() {
  const destino = $('#estado-sincronizacion');
  if (!destino) return;
  try {
    const e = await api('/api/noticias/sincronizacion');
    const partes = [];
    if (e.ultimaEjecucion) {
      const d = new Date(e.ultimaEjecucion);
      partes.push(`Actualizado ${d.toLocaleString(localeFormato(), { hour: '2-digit', minute: '2-digit' })}`);
    }
    partes.push(`${e.noticiasSindicadas} de Investing.com`);
    if (e.noticiasPropias) partes.push(`${e.noticiasPropias} propias`);
    if (e.automatica) partes.push(`cada ${Math.round(e.intervaloMs / 60000)} min`);
    else partes.push('automatismo desactivado');
    destino.textContent = partes.join(' · ');

    if (e.incidencias?.length) {
      destino.setAttribute('title', e.incidencias.join(' | '));
    } else {
      destino.removeAttribute('title');
    }
  } catch {
    destino.textContent = 'Estado de sindicación no disponible';
  }
}

/** Fuerza una incorporación inmediata desde los canales de Investing.com. */
async function sincronizarAhora() {
  if (!hayCredencial()) { abrirAcceso(); return; }

  const boton = $('#btn-sincronizar');
  boton.dataset.ocupado = 'true';
  const rotulo = boton.textContent;
  boton.textContent = 'Actualizando…';

  try {
    const r = await api('/api/noticias/sincronizar', { method: 'POST', body: JSON.stringify({}) });
    const detalle = r.incorporadas
      ? `${r.incorporadas} noticia${r.incorporadas === 1 ? '' : 's'} incorporada${r.incorporadas === 1 ? '' : 's'}`
      : 'Sin novedades desde la última consulta';
    const vinculo = r.vinculadas ? ` · ${r.vinculadas} sobre valores en cartera` : '';
    avisar(`${detalle}${vinculo}.`, { claro: true });

    for (const i of r.incidencias ?? []) avisar(`Canal no disponible — ${i}`, { duracion: 8000 });

    await cargarVocabulariosNoticias();
    await cargarEstadoSincronizacion();
    if (estado.seccion === 'noticias') await cargarNoticias();
    if (estado.seccion === 'radar') await cargarPanel();
  } catch (err) {
    avisar(err.message, { duracion: 9000 });
    await cargarEstadoSincronizacion();
  } finally {
    delete boton.dataset.ocupado;
    boton.textContent = rotulo;
  }
}

/** Paginación reutilizable para cualquier listado. */
function pintarPaginacionGenerica(nav, p, alPulsar) {
  nav.textContent = '';
  if (p.paginas <= 1) return;

  const boton = (texto, destino, { actual = false, inactivo = false } = {}) => {
    const b = elemento('button', null, texto);
    b.type = 'button';
    if (actual) b.setAttribute('aria-current', 'true');
    b.disabled = inactivo;
    if (!inactivo && !actual) b.addEventListener('click', () => alPulsar(destino));
    return b;
  };

  nav.appendChild(boton('‹', p.pagina - 1, { inactivo: p.pagina <= 1 }));
  const inicio = Math.max(1, Math.min(p.pagina - 2, p.paginas - 4));
  const fin = Math.min(p.paginas, inicio + 4);
  for (let n = inicio; n <= fin; n++) nav.appendChild(boton(String(n), n, { actual: n === p.pagina }));
  nav.appendChild(boton('›', p.pagina + 1, { inactivo: p.pagina >= p.paginas }));
}


// ══════════════════════════════ opciones ═════════════════════════════════

/** Selecciona una pestaña de la sección y muestra su panel. */
function seleccionarPestanaOpciones(pestana) {
  const validas = ['flujo', 'inusual', 'cadena'];
  if (!validas.includes(pestana)) pestana = 'inusual';
  estado.opciones.pestana = pestana;

  for (const boton of $$('.pestana')) {
    boton.setAttribute('aria-selected', String(boton.dataset.pestana === pestana));
  }
  for (const clave of validas) {
    const panel = $(`#panel-${clave}`);
    if (panel) panel.hidden = clave !== pestana;
  }
  marcarSeccionActiva('opciones', pestana);
}

/** Carga el estado del subsistema y el contenido de la pestaña activa. */
async function cargarOpciones() {
  if (!estado.opciones.estado) {
    try {
      estado.opciones.estado = await api('/api/opciones/estado');
    } catch (err) {
      avisar(err.message);
    }
  }
  pintarAlcance($('#alcance-opciones'), estado.opciones.estado);
  pintarEstadoOpciones();

  if (estado.opciones.pestana === 'flujo') return cargarFlujoOpciones();
  if (estado.opciones.pestana === 'cadena') return cargarCadenaOpciones();
  return cargarInusual();
}

function pintarEstadoOpciones() {
  const destino = $('#estado-opciones');
  const e = estado.opciones.estado;
  if (!destino || !e) return;
  const h = e.historico;
  destino.textContent =
    `Proveedor ${e.proveedores.activo.nombre} · archivo propio ${h?.sesiones ?? 0} sesión(es)`;
}

/** Flujo de operaciones: hoy sin fuente, con su explicación. */
async function cargarFlujoOpciones() {
  const destino = $('#contenido-flujo');
  destino.classList.add('cargando');
  try {
    pintarFlujo(destino, await api('/api/opciones/flujo'));
  } catch (err) {
    avisar(err.message);
  } finally {
    destino.classList.remove('cargando');
  }
}

/** Actividad inusual sobre el universo en cobertura. */
async function cargarInusual({ forzar = false } = {}) {
  const tabla = $('#tabla-inusual');
  const destacadas = $('#rejilla-destacadas');
  tabla?.classList.add('cargando');
  destacadas?.classList.add('cargando');

  if (!tabla.textContent.trim()) {
    tabla.appendChild(elemento('p', 'senal__motivo', 'Consultando cadenas de opciones…'));
  }

  try {
    if (forzar || !estado.opciones.inusual) {
      // Se pide un margen amplio: el filtrado fino ocurre en el cliente.
      estado.opciones.inusual = await api('/api/opciones/inusual?limite=100');
      poblarFiltrosOpciones();
    }
    aplicarFiltrosOpciones();
  } catch (err) {
    tabla.textContent = '';
    const caja = elemento('div', 'pendiente-bloque');
    caja.appendChild(elemento('span', 'pendiente-bloque__marca', 'Error'));
    caja.appendChild(elemento('strong', null, 'No ha sido posible consultar las opciones'));
    caja.appendChild(elemento('p', null, err.message));
    tabla.appendChild(caja);
  } finally {
    tabla?.classList.remove('cargando');
    destacadas?.classList.remove('cargando');
  }
}

/** Los desplegables se pueblan con lo que hay realmente en los datos. */
function poblarFiltrosOpciones() {
  const datos = estado.opciones.inusual;
  if (!datos) return;

  const simbolos = [...new Set(datos.contratos.map((c) => c.simbolo))].sort();
  poblarSelect($('#filtro-op-simbolo'), simbolos, 'Todos');

  const vencimientos = [...new Set(datos.contratos.map((c) => c.vencimiento))].sort();
  poblarSelect($('#filtro-op-vencimiento'), vencimientos, 'Todos', (v) => formatearFecha(v));
}

/** Filtra en cliente y repinta tabla y tarjetas. */
function aplicarFiltrosOpciones() {
  const datos = estado.opciones.inusual;
  if (!datos) return;

  const form = $('#filtros-opciones');
  const f = Object.fromEntries(new FormData(form).entries());
  const numero = (v) => (v === '' || v === undefined ? null : Number(v));

  const filtrados = datos.contratos.filter((c) => {
    if (f.simbolo && c.simbolo !== f.simbolo) return false;
    if (f.lado && c.lado !== f.lado) return false;
    if (f.vencimiento && c.vencimiento !== f.vencimiento) return false;

    const minPremium = numero(f.minPremium);
    if (minPremium !== null && !(Number.isFinite(c.importeNegociado) && c.importeNegociado >= minPremium)) return false;

    const minVolumen = numero(f.minVolumen);
    if (minVolumen !== null && !(Number.isFinite(c.volumen) && c.volumen >= minVolumen)) return false;

    const minRatio = numero(f.minRatio);
    if (minRatio !== null && !(Number.isFinite(c.volumenSobreInteres) && c.volumenSobreInteres >= minRatio)) return false;

    const minScore = numero(f.minScore);
    if (minScore !== null && !(c.puntuacionDisponible && c.puntuacion >= minScore)) return false;

    // «Unusual only» se apoya en el único criterio verificable con estos datos.
    if (f.soloInusual && !(Number.isFinite(c.volumenSobreInteres) && c.volumenSobreInteres >= 1)) return false;

    return true;
  });

  const resumen = $('#resumen-inusual');
  if (resumen) {
    resumen.textContent = `${filtrados.length} de ${datos.evaluados} contratos evaluados`;
  }

  pintarDestacadas($('#rejilla-destacadas'), filtrados, { alSeleccionar: abrirDetalleInusual });
  pintarTablaInusual($('#tabla-inusual'), filtrados, {
    alSeleccionar: abrirDetalleInusual,
    alReordenar: () => aplicarFiltrosOpciones(),
  });
}

function abrirDetalleInusual(contrato) {
  const dialogo = $('#dialogo-inusual');
  const contenido = $('#contenido-inusual');
  contenido.textContent = '';
  contenido.appendChild(construirDetalleInusual(contrato));
  dialogo.showModal();
}

/** Cadena de opciones de un subyacente. */
async function cargarCadenaOpciones(simboloSolicitado = null) {
  const campo = $('#cadena-simbolo');
  const universo = estado.opciones.estado?.universo ?? [];
  const simbolo = (simboloSolicitado ?? campo.value ?? '').trim().toUpperCase() || universo[0] || 'ORCL';
  campo.value = simbolo;

  const marcador = $('#cadena-estado');
  marcador.textContent = 'Consultando…';
  $('#tabla-cadena').classList.add('cargando');

  try {
    const cadena = await api(`/api/opciones/cadena/${encodeURIComponent(simbolo)}`);
    estado.opciones.cadena = cadena;

    const select = $('#cadena-vencimiento');
    const previo = select.value;
    select.textContent = '';
    for (const v of cadena.vencimientos) select.appendChild(opcion(v, formatearFecha(v)));
    if (previo && cadena.vencimientos.includes(previo)) select.value = previo;

    const vencimiento = select.value || cadena.vencimientos[0];
    pintarCadena($('#tabla-cadena'), cadena, vencimiento);
    pintarMapaInteres($('#mapa-interes'), cadena, vencimiento);

    marcador.textContent =
      `${cadena.agregados.contratos} contratos · subyacente ${formatearNumero(cadena.subyacente.precio)} · ` +
      `${cadena.vencimientos.length} vencimientos`;
  } catch (err) {
    marcador.textContent = '';
    const destino = $('#tabla-cadena');
    destino.textContent = '';
    const caja = elemento('div', 'pendiente-bloque');
    caja.appendChild(elemento('span', 'pendiente-bloque__marca', 'Sin datos'));
    caja.appendChild(elemento('strong', null, `No hay cadena disponible para ${simbolo}`));
    caja.appendChild(elemento('p', null, err.message));
    destino.appendChild(caja);
    $('#mapa-interes').textContent = '';
  } finally {
    $('#tabla-cadena').classList.remove('cargando');
  }
}

// ─────────────────────────────── arranque ────────────────────────────────

function enlazarEventos() {
  // Navegacion
  for (const enlace of $$('[data-ruta]')) {
    enlace.addEventListener('click', (ev) => {
      ev.preventDefault();
      const seccion = enlace.getAttribute('href').replace('#/', '');
      irA(seccion);
      // Algunos accesos apuntan a un bloque concreto de la sección de destino.
      const destino = enlace.dataset.desplazar;
      if (destino) {
        requestAnimationFrame(() => {
          document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }
  window.addEventListener('hashchange', () => irA(seccionDesdeHash(), null, { empujar: false }));

  // ── Companies ──
  const formCompanias = $('#form-companias');
  if (formCompanias) {
    formCompanias.addEventListener('submit', (ev) => ev.preventDefault());

    // Búsqueda incremental con retardo, para no consultar en cada pulsación.
    let temporizador = null;
    $('#busca-compania')?.addEventListener('input', (ev) => {
      clearTimeout(temporizador);
      const valor = ev.target.value;
      temporizador = setTimeout(() => {
        estado.companias.q = valor.trim();
        cargarCompanias();
      }, 220);
    });

    $('#filtro-sector-compania')?.addEventListener('change', (ev) => {
      estado.companias.sector = ev.target.value;
      cargarCompanias();
    });

    $('#btn-limpiar-companias')?.addEventListener('click', () => {
      estado.companias = { q: '', sector: '', ficha: null };
      const buscador = $('#busca-compania');
      if (buscador) buscador.value = '';
      const sector = $('#filtro-sector-compania');
      if (sector) sector.value = '';
      cargarCompanias();
    });
  }

  $('#btn-volver-companias')?.addEventListener('click', () => {
    estado.companias.ficha = null;
    location.hash = '#/companias';
    mostrarVistaCompanias('lista');
    cargarCompanias();
  });

  // ── Catalysts ──
  for (const boton of $$('#conmutador-horizonte [data-horizonte]')) {
    boton.addEventListener('click', () => {
      estado.catalizadores.horizonte = boton.dataset.horizonte;
      cargarCatalizadores();
    });
  }
  $('#filtro-compania-catalizador')?.addEventListener('change', (ev) => {
    estado.catalizadores.compania = ev.target.value;
    cargarCatalizadores();
  });
  $('#filtro-tipo-catalizador')?.addEventListener('change', (ev) => {
    estado.catalizadores.tipo = ev.target.value;
    cargarCatalizadores();
  });


  // Filtros del repositorio
  const form = $('#form-filtros');
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    estado.filtros = recogerFiltros();
    estado.pagina = 1;
    cargarInformes();
  });

  form.addEventListener('change', (ev) => {
    if (ev.target.type === 'search') return;
    estado.filtros = recogerFiltros();
    estado.pagina = 1;
    cargarInformes();
  });

  // Busqueda incremental con retardo, para no lanzar una consulta por pulsacion.
  let temporizador = null;
  $('#filtro-q').addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      estado.filtros = recogerFiltros();
      estado.pagina = 1;
      cargarInformes();
    }, 320);
  });

  $('#btn-limpiar-filtros').addEventListener('click', () => {
    form.reset();
    estado.filtros = {};
    estado.pagina = 1;
    poblarFiltros();
    cargarInformes();
  });

  // Formulario de informe
  $('#btn-nuevo-informe').addEventListener('click', () => abrirFormulario());
  $('#form-informe').addEventListener('submit', enviarFormulario);
  $('#btn-cancelar-informe').addEventListener('click', () => $('#dialogo-informe').close());
  $('#btn-eliminar-informe').addEventListener('click', eliminarInforme);

  // Noticias
  const formNoticias = $('#form-filtros-noticias');
  formNoticias.addEventListener('submit', (ev) => {
    ev.preventDefault();
    estado.filtrosNoticias = recogerFiltrosNoticias();
    estado.paginaNoticias = 1;
    cargarNoticias();
  });
  formNoticias.addEventListener('change', (ev) => {
    if (ev.target.type === 'search') return;
    estado.filtrosNoticias = recogerFiltrosNoticias();
    estado.paginaNoticias = 1;
    cargarNoticias();
  });

  let temporizadorNoticias = null;
  $('#filtro-noticias-q').addEventListener('input', () => {
    clearTimeout(temporizadorNoticias);
    temporizadorNoticias = setTimeout(() => {
      estado.filtrosNoticias = recogerFiltrosNoticias();
      estado.paginaNoticias = 1;
      cargarNoticias();
    }, 320);
  });

  $('#btn-limpiar-noticias').addEventListener('click', () => {
    formNoticias.reset();
    estado.filtrosNoticias = {};
    estado.paginaNoticias = 1;
    cargarNoticias();
  });

  $('#btn-sincronizar').addEventListener('click', sincronizarAhora);
  $('#btn-nueva-noticia').addEventListener('click', () => abrirFormularioNoticia());
  $('#form-noticia').addEventListener('submit', enviarFormularioNoticia);
  $('#btn-cancelar-noticia').addEventListener('click', () => $('#dialogo-noticia').close());
  $('#btn-eliminar-noticia').addEventListener('click', eliminarNoticia);

  // Opciones
  for (const boton of $$('.pestana')) {
    boton.addEventListener('click', () => {
      seleccionarPestanaOpciones(boton.dataset.pestana);
      cargarOpciones();
    });
  }

  const formOpciones = $('#filtros-opciones');
  formOpciones.addEventListener('submit', (ev) => ev.preventDefault());
  formOpciones.addEventListener('change', () => {
    reiniciarPaginacion();
    aplicarFiltrosOpciones();
  });
  formOpciones.addEventListener('input', (ev) => {
    if (ev.target.type !== 'number') return;
    clearTimeout(estado.opciones.temporizador);
    estado.opciones.temporizador = setTimeout(() => {
      reiniciarPaginacion();
      aplicarFiltrosOpciones();
    }, 320);
  });

  $('#btn-limpiar-opciones').addEventListener('click', () => {
    formOpciones.reset();
    reiniciarPaginacion();
    aplicarFiltrosOpciones();
  });
  $('#btn-recargar-opciones').addEventListener('click', () => {
    reiniciarPaginacion();
    cargarInusual({ forzar: true });
  });

  $('#filtros-cadena').addEventListener('submit', (ev) => {
    ev.preventDefault();
    cargarCadenaOpciones();
  });
  $('#cadena-vencimiento').addEventListener('change', () => {
    const cadena = estado.opciones.cadena;
    if (!cadena) return;
    const vencimiento = $('#cadena-vencimiento').value;
    pintarCadena($('#tabla-cadena'), cadena, vencimiento);
    pintarMapaInteres($('#mapa-interes'), cadena, vencimiento);
  });

  $('#dialogo-inusual').addEventListener('close', () => { $('#contenido-inusual').textContent = ''; });

  // Acceso
  $('#btn-acceso').addEventListener('click', abrirAcceso);
  $('#form-acceso').addEventListener('submit', enviarAcceso);
  $('#btn-cancelar-acceso').addEventListener('click', () => $('#dialogo-acceso').close());
  $('#btn-cerrar-sesion').addEventListener('click', () => {
    sessionStorage.removeItem(CLAVE_SESION);
    actualizarIndicadorSesion();
    $('#dialogo-acceso').close();
    avisar('Sesión cerrada.', { claro: true });
    if (estado.seccion === 'repositorio') cargarInformes();
  });

  // Grafico
  for (const boton of $$('.conmutador button')) {
    boton.addEventListener('click', () => {
      for (const b of $$('.conmutador button')) b.classList.toggle('activo', b === boton);
      estado.rangoGrafico = boton.dataset.rango;
      if (estado.cartera) pintarGrafico(estado.cartera);
    });
  }

  $('#selector-benchmark').addEventListener('change', (ev) => {
    estado.benchmark = ev.target.value;
    cargarCartera();
  });

  const btnTabla = $('#btn-tabla-serie');
  btnTabla.addEventListener('click', () => {
    const tabla = $('#tabla-serie');
    const visible = tabla.hidden;
    tabla.hidden = !visible;
    btnTabla.setAttribute('aria-expanded', String(visible));
    btnTabla.textContent = visible ? 'Ocultar datos' : 'Ver datos';
  });

  // Los dialogos nativos se cierran con Escape; se limpia el estado asociado.
  $('#dialogo-detalle').addEventListener('close', () => { $('#contenido-detalle').textContent = ''; });
  $('#dialogo-detalle-noticia').addEventListener('close', () => { $('#contenido-detalle-noticia').textContent = ''; });

  // El gráfico lee sus colores del tema: al cambiarlo hay que repintarlo.
  document.addEventListener('tema:cambiado', () => {
    if (estado.cartera) pintarGrafico(estado.cartera);
  });
}

async function iniciar() {
  iniciarTema();
  // Lo que se construye en JavaScript no lo alcanza la pasada sobre el DOM:
  // cada vista se repinta al oír el cambio de idioma.
  document.addEventListener('idioma:cambiado', () => {
    actualizarIndicadorSesion();
    // El menú se construye en JavaScript: la pasada sobre el DOM no lo alcanza.
    construirNavegacion(
      (seccion, pestana) => irA(seccion, pestana),
      (titulo) => avisar(t('nav.pendiente.aviso', { seccion: titulo }), { claro: true })
    );
    marcarSeccionActiva(estado.seccion, estado.opciones.pestana);
  });
  // El idioma se aplica antes de construir nada: la navegación y las vistas se
  // arman ya con el diccionario correcto, sin repintar dos veces.
  iniciarIdioma();
  construirNavegacion(
    (seccion, pestana) => irA(seccion, pestana),
    (titulo) => avisar(t('nav.pendiente.aviso', { seccion: titulo }), { claro: true })
  );
  enlazarEventos();
  actualizarIndicadorSesion();
  seguirAlturaCabecera();
  activarApariciones();

  await cargarMarca();
  await cargarVocabularios();
  await cargarVocabulariosNoticias();

  irA(seccionDesdeHash(), null, { empujar: false });

  // El panel se puebla aunque la sección visible sea otra, para que el Radar esté
  // listo al entrar. La portada ya no depende de estos datos.
  if (estado.seccion !== 'radar') cargarPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
