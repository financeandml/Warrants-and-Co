/* ============================================================================
   Warrants & Co. — Cliente de la plataforma
   Todo contenido dinamico se inserta como texto: no existe ninguna via de
   inyeccion desde los datos del repositorio ni desde los proveedores de mercado.
   ========================================================================= */

import { GraficoCartera, num } from './grafico.js';
import { iniciarTema } from './tema.js';
import { iniciarIdioma, t, tNodos, existe } from './i18n.js';
import { pintarCinta, seguirAlturaCabecera } from './portada.js';
import { construirNavegacion, marcarSeccionActiva, rutasVisibles } from './navegacion.js';
import { pintarAnillo } from './anillo.js';
import { alinearContraMaestra, rebasarBase100 } from './benchmarks.js';
import {
  $, $$, elemento, formatearNumero, formatearMoneda, formatearPorcentaje, porcentaje,
  formatearFecha, formatearMomento, formatearBytes, claseVariacion, localeFormato } from './formato.js';
import { etiquetaMotivoCierre, etiquetaTipoInforme, etiquetaRecomendacion, etiquetaSector } from './vocabulario.js';
import {
  pintarSnapshot, pintarRadar, pintarSignal, pintarPanelCartera,
  pintarResearch, pintarCatalizadores, pintarUltimasNoticias,
  notaMuestra, retenidaPorMuestra,
} from './home.js';
import {
  pintarAlcance, pintarTablaInusual, pintarDestacadas, construirDetalleInusual,
  pintarCadena, pintarMapaInteres, pintarFlujo, reiniciarPaginacion,
} from './opciones.js';
import { pintarCompanias, pintarSectores, pintarFicha, pintarHubCompanias, pintarTrazaHeroCompanias } from './companias.js';
import {
  pintarAgenda, pintarCarencias, pintarFiltros as pintarFiltrosCatalizadores,
  pintarMetricas as pintarMetricasCatalizadores, pintarSiguiente as pintarSiguienteCatalizador,
  pintarDensidad as pintarDensidadCatalizadores, pintarHeroLinea as pintarHeroLineaCatalizadores,
} from './catalizadores.js';
import { pintarPanorama } from './mercado.js';
import { iniciarCarga } from './carga.js';
import {
  pintarTicker, pintarMetricasHero, pintarCarteraHome, animarManifiesto, animarCabeceras, pintarPulso, pintarRadarHome,
  pintarResearchHome, pintarCatalizadoresHome, pintarFlujoHome, pintarSignalHome,
  refrescarTicker,
} from './inicio.js';

// ─────────────────────────────── utilidades ──────────────────────────────

const CLAVE_SESION = 'warrants.clave';

const estado = {
  seccion: 'analisis',
  filtros: {},
  pagina: 1,
  vocabularios: null,
  // Últimas cargas resueltas. Existen para que un cambio de idioma repinte con
  // lo que ya hay en memoria en vez de volver a pedirlo: cambian los rótulos,
  // no los datos.
  informes: null,
  // Hub del repositorio: destacado + métricas globales de GET /api/informes/destacados.
  informesDestacados: null,
  noticias: null,
  sincronizacion: null,
  cartera: null,
  mercado: null,
  rangoGrafico: 'MAX',
  /* Benchmarks activos en el gráfico: símbolos del catálogo, en el orden en que
     el usuario los fue encendiendo. El PRINCIPAL —el que alimenta beta,
     correlación y rentabilidadIndice, que el servidor calcula contra UNO solo—
     es siempre el primero del catálogo que esté activo, no el último tocado:
     así no cambia de estadísticas cada vez que se enciende y apaga un segundo
     benchmark que no es el principal. */
  benchmarksActivos: new Set(['SPY', 'QQQ', 'DIA']),
  // Series crudas ya pedidas a `/api/mercado/serie/:simbolo`, por símbolo.
  seriesBenchmark: new Map(),
  grafico: null,
  filtrosNoticias: {},
  paginaNoticias: 1,
  companias: {
    q: '', sector: '', ficha: null, lista: null, datosFicha: null,
    // Series por ticker para el sparkline diferido de cada card, y la traza del
    // hero —una sola petición por símbolo, cacheada para no repetirla al
    // repintar por idioma ni al volver a entrar en la sección.
    seriesTicker: new Map(), trazaHero: null,
  },
  catalizadores: { horizonte: 'UPCOMING', compania: '', tipo: '', ventana: '', agenda: null },
  vocabulariosNoticias: null,
  opciones: { estado: null, inusual: null, cadena: null, flujo: null, pestana: 'inusual', filtros: {} },
  // Última lectura de un PDF adjunto, con las propuestas que quedan por revisar.
  extraccion: null,
  /* Los valores que el formulario tenía al abrirse. Distinguen lo que el
     analista ha escrito de lo que el propio diálogo prerrellena —la fecha de
     hoy, la divisa por omisión—, que no es lo mismo en absoluto: una propuesta
     del PDF debe pisar lo segundo y jamás lo primero. */
  valoresIniciales: null,
};

// ──────────────────────────────── avisos ─────────────────────────────────

function avisar(mensaje, { claro = false, duracion = 5200 } = {}) {
  const contenedor = $('#avisos');
  const aviso = elemento('div', `aviso${claro ? ' aviso--claro' : ''}`);
  aviso.appendChild(elemento('span', null, mensaje));

  const cerrar = elemento('button', 'aviso__cerrar', '×');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', t('general.cerrarAviso'));
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
    throw new Error(t('error.red'));
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
    // El servidor manda su reparo en castellano y, junto a el, un codigo del
    // catalogo. Se prefiere el codigo -rotuloError()- para que el mensaje nazca
    // ya en el idioma de quien mira; solo cuando no hay codigo, o el codigo aun
    // no tiene rotulo, se cae a la frase castellana del servidor.
    const error = new Error(
      datos?.codigo
        ? rotuloError(datos.codigo, datos.error, datos.datos)
        : (datos?.error ?? t('error.solicitud', { codigo: respuesta.status }))
    );
    error.status = respuesta.status;
    error.codigo = datos?.codigo;
    error.errores = datos?.errores;
    error.datos = datos?.datos;
    throw error;
  }
  return datos;
}

/**
 * Rotulo de un error del servidor, en el idioma de la interfaz.
 *
 * El servidor redacta en castellano —sirve a quien llama por `curl` y a los
 * registros—, pero manda ademas un codigo del catalogo de `src/errores.js`. Se
 * prefiere el codigo: es lo unico estable entre idiomas. Se cae a la frase del
 * servidor cuando no hay codigo, o cuando lo hay y aun no tiene rotulo —hoy es
 * el caso de los codigos de API—; asi la reserva es una frase util y nunca la
 * clave cruda, que es lo que devolveria `t()` a secas.
 *
 * @param {string|undefined} codigo
 * @param {string} reserva  lo que redacto el servidor
 * @param {object|null} [datos]  parametros de la plantilla, p.ej. {simbolo}
 */
function rotuloError(codigo, reserva, datos = null) {
  if (!codigo) return reserva;
  const clave = `codigo.${codigo}`;
  return existe(clave) ? t(clave, datos) : reserva;
}

// ─────────────────────────────── navegacion ──────────────────────────────

/* Secciones que el enrutador admite.

   NO se escriben aquí: se derivan del mapa de áreas. El menú que anuncia un
   área y la puerta que deja pasar a sus rutas son el mismo hecho, y escribirlo
   dos veces es exactamente lo que permite que discrepen sin que se vea en
   pantalla. Ocultar un área es ponerle `oculta` en `navegacion.js`, y sus rutas
   dejan de admitirse solas. `tests/areas.js` afirma que ambas caras concuerdan.

   La portada no pertenece a ningún área —es la raíz—, de modo que se añade. */
const SECCIONES = new Set(['inicio', ...rutasVisibles()]);

// La portada era antes la sección del panel; se conserva el destino anterior para
// que un enlace guardado siga funcionando.
//
// Los alias de áreas ocultas se retiran con ellas: mantenerlos sería una segunda
// puerta a una sección que la primera ya no admite. Un enlace guardado a esas
// rutas no da error —`irA()` no reconoce la sección y cae en la portada—, que es
// lo que debe pasar mientras el área esté cerrada.
const ALIAS_SECCION = {
  home: 'inicio', '': 'inicio',
  companies: 'companias', catalysts: 'catalizadores',
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
  // Devuelve la promesa del cargador. Casi todas las llamadas la ignoran —el
  // enrutador no espera a nadie—; la del arranque sí la necesita, porque la
  // pantalla de carga se retira cuando la primera vista está PINTADA y no
  // cuando se ha decidido cuál era.
  return CARGADORES[seccion]?.();
}

/**
 * Qué carga cada sección. Un único mapa, consultado por el enrutador y por la
 * invalidación: si algún día una sección cambia de cargador, cambia aquí y en
 * ningún otro sitio.
 */
const CARGADORES = {
  inicio: () => cargarInicio(),
  radar: () => cargarPanel(),
  repositorio: () => { cargarInformes(); cargarHubRepositorio(); },
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
 * tesis deja obsoletas.
 *
 * Las claves son el censo de secciones que hay que marcar como caducadas; el
 * cuerpo, lo que hay que retirar de cada una. Por eso figuran también las que no
 * memorizan nada —compañías, catalizadores—, con el cuerpo vacío: su cargador ya
 * pide al servidor cada vez, pero sin la marca no volvería a correr.
 * Quien añada una sección ha de añadirla aquí aunque no tenga nada que purgar.
 */
const MEMORIAS_DERIVADAS = {
  // Lo guardado para repintar por idioma se retira con el montaje: así el
  // repintado nunca puede resucitar datos que las tesis ya han dejado atrás.
  inicio: () => { inicioMontado = false; olvidarDatosInicio(); },
  cartera: () => { estado.cartera = null; },
  opciones: () => {
    // El universo de opciones es el de tickers cubiertos: cambia con las tesis.
    estado.opciones.estado = null;
    estado.opciones.inusual = null;
    estado.opciones.cadena = null;
    estado.opciones.flujo = null;
  },
  // El radar guarda lo suyo para repintarse por idioma, igual que la portada.
  radar: () => olvidarDatosRadar(),
  // El listado de noticias guarda su última carga por la misma razón que el
  // catálogo, y por eso figura aquí aunque una tesis no altere las noticias:
  // lo que este mapa vigila es la memoria, no quién la ensucia.
  noticias: () => { estado.noticias = null; },
  // El catálogo también guarda su última carga para repintarse por idioma: sin
  // retirarla, publicar una tesis y conmutar el idioma repintaría la tabla con
  // la lista anterior, que es exactamente lo que este mapa existe para impedir.
  repositorio: () => { estado.informes = null; estado.informesDestacados = null; },
  // La cobertura guarda listado y ficha para repintarse por idioma: publicar una
  // tesis y conmutar repintaría con la lista anterior si no se retiraran.
  companias: () => { estado.companias.lista = null; estado.companias.datosFicha = null; },
  // La agenda guarda su última carga para repintarse por idioma.
  catalizadores: () => { estado.catalizadores.agenda = null; },
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

/**
 * Punto único de invalidación por cambio en las noticias.
 *
 * Publicar, editar, borrar o sindicar una noticia deja obsoletos el listado y
 * el bloque de titulares del radar. Se sigue la misma pauta que con las tesis:
 * se marcan como caducadas y se rehace de inmediato solo la que está a la
 * vista; las demás, al mostrarse.
 */
async function invalidarDerivadasDeNoticias() {
  for (const seccion of ['noticias', 'radar']) seccionesCaducadas.add(seccion);
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
 *
 * La ausencia de un recurso no degrada nada: el logotipo cae al SVG por
 * defecto y, sin banner depositado, `.manifiesto__visual` se queda oculto —el
 * flex del hero le devuelve su ancho al texto solo (Fase D.6.1).
 *
 * El banner ya NO alimenta ninguna geometría de encuadre —eso se retiró en la
 * Fase D.6 con la fotografía a sangre—: aquí es una imagen editorial más,
 * como el sello o el logo, y se trata igual que ellos salvo por la
 * precarga, que evita que se vea a medio pintar la primera vez que llega.
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

  const visual = $('#hero-visual');
  const imagen = $('#hero-imagen');
  if (marca.banner?.url && visual && imagen) {
    const precarga = new Image();
    precarga.onload = () => {
      imagen.src = `${marca.banner.url}?v=${marca.banner.version}`;
      visual.hidden = false;
    };
    precarga.onerror = () => { visual.hidden = true; };
    precarga.src = `${marca.banner.url}?v=${marca.banner.version}`;
  } else if (visual) {
    visual.hidden = true;
  }
}

// ════════════════════════════════ RADAR ═════════════════════════════════

/* Lo último que cada bloque del radar recibió de su fuente. Se guarda con la
   misma pauta que la portada, y por la misma razón: repintar al cambiar de
   idioma sin volver a pedir nada, porque los datos son los mismos y lo único
   que cambia es el texto que los rodea. */
const datosRadar = {
  indices: null, senales: null, signal: null,
  catalizadores: null, research: null, titulares: null,
};

/* Bloques que ya se han pintado alguna vez. Hace falta distinguir «su fuente aún
   no ha contestado» de «contestó y no había dato»: en el segundo caso el bloque
   muestra su carencia declarada, que también hay que traducir, y en el primero
   no hay nada que repintar todavía. */
const pintadosRadar = new Set();

/** Vacía lo guardado, para que la próxima visita vuelva a pedirlo. */
function olvidarDatosRadar() {
  for (const campo of Object.keys(datosRadar)) datosRadar[campo] = null;
  pintadosRadar.clear();
}

const irARadar = (destino) => irA(String(destino).replace('#/', ''));

/* Cómo se pinta cada bloque a partir de lo guardado. Los pintores viven aquí
   —y no dentro de la carga— porque el repintado por idioma usa exactamente los
   mismos: si un bloque cambiara de argumentos, cambiaría en un único sitio. */
const PINTORES_RADAR = {
  snapshot: () => pintarSnapshot(datosRadar.indices),
  senales: () => pintarRadar(datosRadar.senales, irARadar),
  signal: () => pintarSignal(datosRadar.signal),
  catalizadores: () => pintarCatalizadores(datosRadar.catalizadores),
  research: () => pintarResearch(datosRadar.research ?? [], estado.cartera, abrirDetalle),
  titulares: () => pintarUltimasNoticias(datosRadar.titulares, abrirDetalleNoticia),
  // Cuando la cartera resuelve, este bloque lo repinta `pintarCartera()`, que ya
  // pasa por `repintarVistas()`. Solo figura aquí para el caso contrario: si no
  // resolvió, lo que hay en pantalla es su carencia declarada, y a esa no llega
  // nadie más.
  cartera: () => pintarPanelCartera(estado.cartera),
};

/** Repinta los bloques del radar que ya se pintaron alguna vez. */
function repintarRadar() {
  for (const bloque of pintadosRadar) PINTORES_RADAR[bloque]();
}

/**
 * Cuadro de mando.
 *
 * Cada bloque se pinta en cuanto resuelve su propia fuente, no cuando resuelven
 * todas: la agenda de catalizadores consulta cadenas de opciones y tarda varios
 * segundos, y esperarla dejaría en blanco a los índices, que llegan en décimas.
 * Una fuente caída deja su bloque en estado declarado sin afectar a los demás.
 */
async function cargarPanel() {
  // Guarda lo que llegue —resuelva la fuente o falle— y pinta ese bloque.
  const alLlegar = (promesa, guardar, bloque) => {
    const pintar = () => { pintadosRadar.add(bloque); PINTORES_RADAR[bloque](); };
    return promesa.then((d) => { guardar(d); pintar(); }, () => { guardar(null); pintar(); });
  };

  await Promise.allSettled([
    alLlegar(api('/api/radar/indices'), (d) => { datosRadar.indices = d; }, 'snapshot'),
    alLlegar(api('/api/radar'), (d) => { datosRadar.senales = d; }, 'senales'),
    alLlegar(api('/api/radar/signal'), (d) => { datosRadar.signal = d; }, 'signal'),
    alLlegar(api('/api/radar/catalizadores'),
      (d) => { datosRadar.catalizadores = d; }, 'catalizadores'),

    alLlegar(api('/api/informes/destacados?limite=4'), (informes) => {
      // Prevalecen los destacados por el comité; si no hay, los más recientes.
      datosRadar.research = informes?.destacados?.length
        ? informes.destacados
        : (informes?.recientes ?? []);
    }, 'research'),

    alLlegar(api('/api/noticias/portada?limite=6'), (piezas) => {
      const vistos = new Set();
      datosRadar.titulares = [...(piezas?.destacadas ?? []), ...(piezas?.recientes ?? [])]
        .filter((n) => (vistos.has(n.id) ? false : vistos.add(n.id)));
    }, 'titulares'),

    // La cartera alimenta también la cinta y la curva de fondo, y se pinta sola
    // desde `cargarCartera()`. Aquí solo se decide quién repinta su bloque: si
    // resolvió, `pintarCartera()`; si no, este mapa con la carencia declarada.
    cargarCartera({ silencioso: true }).finally(() => {
      if (estado.cartera) { pintadosRadar.delete('cartera'); return; }
      pintadosRadar.add('cartera');
      pintarPanelCartera(null);
    }),
  ]);
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

/**
 * Rótulo de cada nivel de acceso.
 *
 * Tabla y no plantilla `informe.acceso.${nivel}`: escritas, las claves quedan a
 * la vista de quien lea el fichero y de la prueba de paridad, que comprueba
 * que existen y avisa de las que sobran. Es la misma pauta de `navegacion.js`.
 */
const CLAVES_ACCESO = {
  publico: 'informe.acceso.publico',
  cliente: 'informe.acceso.cliente',
  institucional: 'informe.acceso.institucional',
  interno: 'informe.acceso.interno',
};

/**
 * Denominación visible de un nivel de acceso.
 *
 * Manda el diccionario, y el rótulo del servidor queda de reserva: la clave
 * —`publico`, `cliente`…— es estable y traducible, mientras que el rótulo llega
 * siempre en castellano y dejaría «Institucional» en mitad de la interfaz
 * inglesa. Un nivel que la tabla no recoja sigue mostrándose.
 */
function etiquetaAcceso(nivel) {
  if (!nivel) return '—';
  if (CLAVES_ACCESO[nivel]) return t(CLAVES_ACCESO[nivel]);
  return estado.vocabularios?.etiquetasAcceso?.[nivel]
    ?? nivel[0].toUpperCase() + nivel.slice(1);
}

function poblarFiltros() {
  const v = estado.vocabularios;
  if (!v) return;
  // «Todos» y «Todas» son dos claves, no una: el castellano concuerda con el
  // sustantivo elidido —«todas las recomendaciones»— y el inglés no distingue.
  const todos = t('repositorio.filtro.todos');
  poblarSelect($('#filtro-sector'), v.sectores, todos, etiquetaSector);
  poblarSelect($('#filtro-pais'), v.paises, todos);
  poblarSelect($('#filtro-tipo'), v.tipos, todos, etiquetaTipoInforme);
  poblarSelect($('#filtro-recomendacion'), v.recomendaciones, t('repositorio.filtro.todas'), etiquetaRecomendacion);
  poblarSelect($('#filtro-analista'), v.analistas, todos);
  poblarSelect($('#filtro-nivel'), v.nivelesAcceso, todos, etiquetaAcceso);

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
  const envoltorio = $('.tabla-envoltorio');
  envoltorio?.classList.add('cargando');

  const parametros = new URLSearchParams({ ...estado.filtros, pagina: String(estado.pagina), limite: '20' });

  try {
    const datos = await api(`/api/informes?${parametros}`);
    // Se guarda la carga para poder repintar la tabla al cambiar de idioma sin
    // volver a pedirla: un cambio de rótulos no es un cambio de datos.
    estado.informes = datos;
    pintarInformes(datos);
  } catch (err) {
    avisar(err.message);
  } finally {
    envoltorio?.classList.remove('cargando');
  }
}

/**
 * Hub del repositorio: métricas globales + análisis destacado.
 *
 * `GET /api/informes/destacados` ya calcula `metricas` (total, cubiertas,
 * analistas, sectores) en el servidor —la misma consulta que hoy alimenta el
 * panel de Radar, oculto—; aquí solo se pinta, nunca se recalcula. Las cifras
 * representan la cobertura GLOBAL, no el resultado de los filtros activos: por
 * eso viven en su propia carga, independiente de `cargarInformes()`.
 */
async function cargarHubRepositorio() {
  try {
    estado.informesDestacados = await api('/api/informes/destacados');
    pintarHubRepositorio(estado.informesDestacados);
  } catch {
    estado.informesDestacados = null;
    pintarHubRepositorio(null);
  }
}

function pintarHubRepositorio(datos) {
  pintarMetricasRepositorio(datos?.metricas ?? null);
  pintarDestacadoRepositorio(datos?.destacados?.[0] ?? null);
}

function pintarMetricasRepositorio(metricas) {
  const caja = $('#repositorio-metricas');
  if (!caja) return;
  caja.textContent = '';
  if (!metricas) return;

  const metrica = (etiqueta, valor, principal = false) => {
    const bloque = elemento('div', `indicador${principal ? ' indicador--principal' : ''}`);
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    bloque.appendChild(elemento('strong', 'indicador__valor', String(valor)));
    caja.appendChild(bloque);
  };
  metrica(t('repositorio.hub.total'), metricas.total, true);
  metrica(t('repositorio.hub.cubiertas'), metricas.cubiertas);
  metrica(t('repositorio.hub.analistas'), metricas.analistas);
  metrica(t('repositorio.hub.sectores'), metricas.sectores);
}

/**
 * Pieza única de "Análisis destacado". Si no hay ningún informe destacado el
 * bloque entero se oculta con `hidden` —nunca CSS a medias—: la sección no
 * declara nada que no pueda respaldar. El clic abre `#dialogo-detalle` con
 * `abrirDetalle()`, el mismo mecanismo que ya usa cada fila de la tabla: no
 * hay un segundo sistema de navegación para lo mismo.
 */
function pintarDestacadoRepositorio(informe) {
  const bloque = $('#repositorio-destacado-bloque');
  const contenedor = $('#repositorio-destacado');
  if (!bloque || !contenedor) return;
  contenedor.textContent = '';

  if (!informe) {
    bloque.hidden = true;
    return;
  }
  bloque.hidden = false;

  const pieza = elemento('article', 'repositorio-destacado');
  pieza.tabIndex = 0;
  pieza.setAttribute('role', 'button');
  pieza.setAttribute('aria-label', t('repositorio.destacado.abrir', { empresa: informe.empresa }));

  const izquierda = elemento('div', 'repositorio-destacado__izquierda');
  izquierda.appendChild(elemento('span', 'repositorio-destacado__ticker', informe.ticker ?? '—'));
  izquierda.appendChild(elemento('h3', 'repositorio-destacado__nombre', informe.empresa));
  izquierda.appendChild(elemento('p', 'repositorio-destacado__resumen',
    informe.resumen_ejecutivo || t('repositorio.destacado.sinResumen')));
  izquierda.appendChild(elemento('span', 'repositorio-destacado__enlace', t('repositorio.destacado.ver')));
  pieza.appendChild(izquierda);

  const derecha = elemento('div', 'repositorio-destacado__derecha');
  if (informe.recomendacion) {
    derecha.appendChild(elemento('span', 'distintivo distintivo--fuerte', etiquetaRecomendacion(informe.recomendacion)));
  }
  const fecha = elemento('div', 'dato');
  fecha.appendChild(elemento('span', 'dato__etiqueta', t('repositorio.col.fecha')));
  fecha.appendChild(elemento('strong', 'dato__valor', formatearFecha(informe.fecha_publicacion)));
  derecha.appendChild(fecha);
  pieza.appendChild(derecha);

  const abrir = () => abrirDetalle(informe.id);
  pieza.addEventListener('click', abrir);
  pieza.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
  });
  contenedor.appendChild(pieza);
}

/** Pinta la tabla del repositorio a partir de una carga ya resuelta. */
function pintarInformes(datos) {
  const cuerpo = $('#cuerpo-tabla-informes');
  if (!cuerpo || !datos) return;
  cuerpo.textContent = '';

  if (!datos.informes.length) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 11;
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, t('repositorio.vacio.titulo')));
    vacio.appendChild(document.createTextNode(t('repositorio.vacio.detalle')));
    celda.appendChild(vacio);
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
  } else {
    for (const i of datos.informes) cuerpo.appendChild(construirFila(i));
  }

  pintarResumen(datos.paginacion);
  pintarPaginacion(datos.paginacion);
}

function construirFila(informe) {
  const fila = document.createElement('tr');
  fila.tabIndex = 0;
  fila.setAttribute('role', 'button');
  fila.setAttribute('aria-label', t('repositorio.fila.abrir', { empresa: informe.empresa }));
  const abrir = () => abrirDetalle(informe.id);
  fila.addEventListener('click', abrir);
  fila.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); }
  });

  const celdaEmpresa = elemento('td', 'celda-empresa');
  celdaEmpresa.appendChild(document.createTextNode(informe.empresa));
  if (informe.destacado) {
    const marca = elemento('small', null, t('repositorio.destacadoEquipo'));
    celdaEmpresa.appendChild(marca);
  }
  fila.appendChild(celdaEmpresa);

  fila.appendChild(elemento('td', 'mono', informe.ticker ?? '—'));
  fila.appendChild(elemento('td', null, informe.sector ? etiquetaSector(informe.sector) : '—'));
  fila.appendChild(elemento('td', null, informe.tipo_informe ? etiquetaTipoInforme(informe.tipo_informe) : '—'));
  fila.appendChild(elemento('td', null, informe.periodo ?? '—'));

  const celdaRec = document.createElement('td');
  if (informe.recomendacion) celdaRec.appendChild(elemento('span', 'distintivo', etiquetaRecomendacion(informe.recomendacion)));
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
    const editar = elemento('button', 'boton boton--contorno', t('repositorio.editar'));
    editar.type = 'button';
    editar.setAttribute('aria-label', t('repositorio.fila.editar', { empresa: informe.empresa }));
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
  // El plural lo elige `Intl.PluralRules` sobre las formas que declara cada
  // idioma, no un `informe${n === 1 ? '' : 's'}` que impondría a todos la
  // morfología del castellano.
  $('#resumen-resultados').textContent = p.total
    ? t('repositorio.resumen', { n: p.total, desde, hasta })
    : t('repositorio.vacio.titulo');
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
  contenido.appendChild(elemento('div', 'detalle', t('informe.detalle.cargando')));
  dialogo.showModal();

  try {
    const i = await api(`/api/informes/${id}`);
    contenido.textContent = '';
    contenido.appendChild(construirDetalle(i));
  } catch (err) {
    contenido.textContent = '';
    const d = elemento('div', 'detalle');
    d.appendChild(elemento('h2', null, t('informe.detalle.noDisponible')));
    d.appendChild(elemento('p', 'detalle__subtitulo', err.message));
    contenido.appendChild(d);
  }
}

function construirDetalle(i) {
  const raiz = elemento('div', 'detalle');

  const superior = elemento('div', 'detalle__superior');
  if (i.ticker) superior.appendChild(elemento('span', 'ficha__ticker', i.ticker));
  if (i.tipo_informe) superior.appendChild(elemento('span', 'distintivo', etiquetaTipoInforme(i.tipo_informe)));
  if (i.recomendacion) {
    superior.appendChild(elemento('span', 'distintivo distintivo--fuerte', etiquetaRecomendacion(i.recomendacion)));
  }
  if (i.destacado) superior.appendChild(elemento('span', 'distintivo distintivo--solido', t('informe.detalle.destacado')));
  raiz.appendChild(superior);

  raiz.appendChild(elemento('h2', null, i.empresa));

  const partes = [i.sector ? etiquetaSector(i.sector) : null, i.pais, i.periodo].filter(Boolean);
  raiz.appendChild(elemento('p', 'detalle__subtitulo',
    partes.join(t('general.separadorLista')) || t('informe.detalle.fichaAnalitica')));

  const datos = elemento('dl', 'detalle__datos');
  const dato = (etiqueta, valor) => {
    const bloque = elemento('div', 'detalle__dato');
    bloque.appendChild(elemento('dt', null, etiqueta));
    bloque.appendChild(elemento('dd', null, valor));
    datos.appendChild(bloque);
  };
  dato(t('informe.detalle.analista'), i.analista || '—');
  dato(t('informe.detalle.publicacion'), formatearFecha(i.fecha_publicacion));
  dato(t('informe.detalle.precioObjetivo'),
    i.precio_objetivo != null ? formatearMoneda(i.precio_objetivo, i.divisa) : '—');
  dato(t('informe.detalle.nivelAcceso'), etiquetaAcceso(i.nivel_acceso));
  dato(t('informe.detalle.enCartera'), i.en_cartera ? t('general.si') : t('general.no'));
  if (i.peso_cartera != null) dato(t('informe.detalle.pesoAsignado'), porcentaje(i.peso_cartera));
  if (i.precio_compra != null) dato(t('informe.detalle.precioCompra'), formatearMoneda(i.precio_compra, i.divisa));
  if (i.take_profit != null) dato(t('informe.detalle.takeProfit'), formatearMoneda(i.take_profit, i.divisa));
  if (i.stop_loss != null) dato(t('informe.detalle.stopLoss'), formatearMoneda(i.stop_loss, i.divisa));
  raiz.appendChild(datos);

  if (i.resumen_ejecutivo) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('h3', null, t('informe.detalle.resumen')));
    s.appendChild(elemento('p', 'detalle__resumen', i.resumen_ejecutivo));
    raiz.appendChild(s);
  }

  if (i.etiquetas?.length) {
    const s = elemento('div', 'detalle__seccion');
    s.appendChild(elemento('h3', null, t('informe.detalle.etiquetas')));
    const cont = elemento('div', 'detalle__etiquetas');
    for (const e of i.etiquetas) cont.appendChild(elemento('span', 'distintivo', e));
    s.appendChild(cont);
    raiz.appendChild(s);
  }

  const s = elemento('div', 'detalle__seccion');
  s.appendChild(elemento('h3', null, t('informe.detalle.documentacion')));
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
    s.appendChild(elemento('p', 'detalle__subtitulo', t('informe.detalle.sinDocumentacion')));
  }
  raiz.appendChild(s);

  if (hayCredencial()) {
    const pie = elemento('div', 'detalle__pie');
    const editar = elemento('button', 'boton boton--contorno', t('informe.detalle.editar'));
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

  // Conserva la selección porque esta función ya no se ejecuta una sola vez:
  // `repintarVistas()` la repite en cada cambio de idioma, y una repoblación no
  // debe alterar el estado del formulario.
  const conVacio = (select, valores, textoVacio, rotular = (x) => x) => {
    if (!select) return;
    const previo = select.value;
    select.textContent = '';
    select.appendChild(opcion('', textoVacio));
    // El valor sigue siendo el texto español —lo que de verdad se guarda—;
    // solo la etiqueta visible se traduce (mismo criterio que poblarSelect()).
    for (const x of valores) select.appendChild(opcion(x, rotular(x)));
    if (previo && valores.includes(previo)) select.value = previo;
  };

  conVacio($('#campo-tipo'), v.tipos, t('informe.select.sinClasificar'), etiquetaTipoInforme);
  conVacio($('#campo-recomendacion'), v.recomendaciones, t('informe.select.sinRecomendacion'), etiquetaRecomendacion);

  const nivel = $('#campo-nivel');
  const nivelPrevio = nivel.value;
  nivel.textContent = '';
  for (const n of v.nivelesAcceso) nivel.appendChild(opcion(n, etiquetaAcceso(n)));
  if (nivelPrevio && v.nivelesAcceso.includes(nivelPrevio)) nivel.value = nivelPrevio;

  // Los códigos de divisa no se traducen; se repuebla igualmente por simetría.
  const divisa = $('#campo-divisa');
  const divisaPrevia = divisa.value;
  divisa.textContent = '';
  for (const d of v.divisas) divisa.appendChild(opcion(d, d));
  if (divisaPrevia && v.divisas.includes(divisaPrevia)) divisa.value = divisaPrevia;

  const rellenar = (id, valores, rotular = (x) => x) => {
    const dl = $(id);
    if (!dl) return;
    dl.textContent = '';
    for (const x of valores) dl.appendChild(opcion(x, rotular(x)));
  };
  rellenar('#lista-sectores', [...new Set([...v.sectoresSugeridos, ...v.sectores])], etiquetaSector);
  rellenar('#lista-paises', v.paises);
  rellenar('#lista-analistas', v.analistas);
}

/**
 * Rótulos que dependen del modo del formulario, en un solo sitio.
 *
 * No se repintan al conmutar el idioma, y no hace falta: mientras el diálogo
 * está abierto el idioma no puede cambiar —lo explica `repintarVistas()`—, y al
 * abrirlo se aplican de nuevo con el diccionario vigente. Por eso el modo llega
 * por parámetro y no se guarda en `estado`: nadie lo necesita después.
 */
/* ══════════════ Propuesta de ficha leída de un PDF adjunto ══════════════

   Extraer es proponer, nunca rellenar en firme. Un valor leído del documento
   llega al campo marcado como sin confirmar, con la página de la que sale, y
   no cuenta como válido hasta que el analista lo resuelve: aceptándolo o
   vaciándolo. Mientras quede alguno sin resolver no se puede publicar, y el
   botón dice cuántos quedan y cuáles: un botón apagado sin explicación es una
   pared, no una salvaguarda.

   Lo que el documento dice pero no sirve como valor —un rango, un «pendiente
   de confirmar», un sector sin equivalencia declarada— no rellena nada: se
   muestra el literal y la página para que el analista teclee lo suyo sabiendo
   de dónde sale. Y lo que el formulario pone por su cuenta se marca distinto,
   para que no se confunda con lo leído.

   Estos rótulos no entran en `repintarVistas()`, y no es un olvido: el diálogo
   se abre con `showModal()`, que deja el conmutador de idioma fuera de alcance,
   y al reabrirlo `abrirFormulario()` borra la lectura anterior. Se pintan con
   el diccionario vigente en el momento de leer el PDF, que es el único que
   puede estar puesto.
   ═══════════════════════════════════════════════════════════════════════ */

/** Rótulo de cada campo del formulario, para nombrarlo en los avisos. */
const ROTULO_CAMPO = {
  empresa: 'informe.campo.empresa', ticker: 'informe.campo.ticker',
  sector: 'informe.campo.sector', pais: 'informe.campo.pais',
  tipo_informe: 'informe.campo.tipo', periodo: 'informe.campo.periodo',
  analista: 'informe.campo.analista', fecha_publicacion: 'informe.campo.fecha',
  recomendacion: 'informe.campo.recomendacion', precio_objetivo: 'informe.campo.precioObjetivo',
  divisa: 'informe.campo.divisa', peso_cartera: 'informe.campo.peso',
  precio_compra: 'informe.campo.precioCompra', take_profit: 'informe.campo.takeProfit',
  stop_loss: 'informe.campo.stopLoss', resumen_ejecutivo: 'informe.campo.resumen',
  nivel_acceso: 'informe.campo.nivel', etiquetas: 'informe.campo.etiquetas',
};

/* Motivos que conviene decir en voz alta aunque no rellenen nada: son los tres
   campos que uno se pregunta por qué han quedado vacíos. El resto de ausencias
   —un rótulo que el documento no trae— se callan: enumerarlas sería ruido. */
const MOTIVOS_QUE_SE_ANUNCIAN = new Set([
  'SIN_ETIQUETA_INEQUIVOCA', 'RECOMENDACION_NO_SE_INFIERE', 'TIPO_INFORME_NO_FIGURA',
]);

const nombreCampo = (campo) =>
  (ROTULO_CAMPO[campo] ? t(ROTULO_CAMPO[campo]) : campo).replace(/\s*\*\s*$/, '');

/** Rótulo de un motivo de extracción; si no lo tiene, el código en crudo. */
function rotuloMotivo(codigo, reserva = '') {
  if (!codigo) return reserva;
  const clave = `extraccion.motivo.${codigo}`;
  return existe(clave) ? t(clave) : (reserva || codigo);
}

/* Los motivos están redactados para encajar dentro de una frase —«… — el
   documento da un rango»—; cuando van solos necesitan su mayúscula. */
const enMayuscula = (texto) => (texto ? texto[0].toLocaleUpperCase() + texto.slice(1) : texto);

const origenDe = (dato) => (dato.rotulo
  ? t('extraccion.origen', { pagina: dato.pagina, rotulo: dato.rotulo })
  : t('extraccion.origen.pagina', { pagina: dato.pagina }));

/**
 * ¿Está libre este campo?
 *
 * Lo está si sigue como lo dejó `abrirFormulario()`: vacío, o con el valor que
 * el propio diálogo prerrellena. Deja de estarlo en cuanto alguien escribe algo
 * distinto, y entonces la propuesta del PDF no lo toca.
 */
function campoLibre(nombre, control) {
  const inicial = estado.valoresIniciales?.[nombre];
  const actual = String(control.value ?? '');
  if (inicial !== undefined && actual === inicial) return true;
  return !actual.trim();
}

/** Control del formulario de informe, o `null` si ese campo no existe. */
function controlDe(nombre) {
  const control = $('#form-informe').elements[nombre];
  return control instanceof Element ? control : null;
}

function construirMarca(clase, glifo, texto) {
  const caja = elemento('div', `propuesta propuesta--${clase}`);
  /* El glifo va dentro del propio texto y no como elemento hermano: suelto, al
     partirse la línea se quedaba solo en un renglón, separado de lo que rotula. */
  const cuerpo = elemento('span', 'propuesta__texto');
  cuerpo.appendChild(elemento('span', 'propuesta__marca', glifo));
  cuerpo.appendChild(document.createTextNode(` ${texto}`));
  caja.appendChild(cuerpo);
  return caja;
}

/** Coloca la marca de un campo, sustituyendo la que hubiera. */
function colocarMarca(nombre, marca) {
  const control = controlDe(nombre);
  if (!control) return null;
  const caja = control.closest('.campo') ?? control.parentElement;
  if (!caja) return null;
  for (const previa of $$('.propuesta', caja)) previa.remove();
  caja.appendChild(marca);
  return marca;
}

/** Retira toda huella de la lectura anterior. */
function limpiarPropuestas() {
  const form = $('#form-informe');
  for (const marca of $$('.propuesta', form)) marca.remove();
  for (const control of $$('[data-propuesta]', form)) control.removeAttribute('data-propuesta');
  const panel = $('#extraccion-resumen');
  panel.textContent = '';
  panel.hidden = true;
  panel.classList.remove('extraccion--leyendo');
  estado.extraccion = null;
  reflejarPendientes();
}

/**
 * Da por resuelta una propuesta.
 * Aceptar conserva el valor; descartar vacía el campo. Las dos resuelven: no
 * existe un estado del que solo se salga aceptando.
 */
function resolverPropuesta(nombre, { aceptada }) {
  const lectura = estado.extraccion;
  if (!lectura || !lectura.pendientes.has(nombre)) return;
  lectura.pendientes.delete(nombre);

  const control = controlDe(nombre);
  const dato = lectura.campos[nombre];
  if (control) {
    control.removeAttribute('data-propuesta');
    if (!aceptada) control.value = '';
  }
  colocarMarca(nombre, aceptada
    ? construirMarca('aceptada', '◆', `${t('extraccion.marca.aceptada')} · ${origenDe(dato)}`)
    : construirMarca('descartada', '·', `${t('extraccion.marca.descartada')} · ${origenDe(dato)}`));
  reflejarPendientes();
}

/** Marca de un campo propuesto, con sus dos botones. */
function marcarPendiente(nombre, dato) {
  const marca = construirMarca('pendiente', '◇', `${t('extraccion.marca.pendiente')} · ${origenDe(dato)}`);

  const aceptar = elemento('button', 'propuesta__boton', t('extraccion.aceptar'));
  aceptar.type = 'button';
  aceptar.addEventListener('click', () => resolverPropuesta(nombre, { aceptada: true }));

  const descartar = elemento('button', 'propuesta__boton', t('extraccion.descartar'));
  descartar.type = 'button';
  descartar.addEventListener('click', () => resolverPropuesta(nombre, { aceptada: false }));

  marca.appendChild(aceptar);
  marca.appendChild(descartar);
  colocarMarca(nombre, marca);

  /* Tocar el campo también resuelve: quien lo edita ya lo ha juzgado, y quien
     lo vacía lo ha rechazado. Es la vía que no obliga a pulsar nada. */
  const control = controlDe(nombre);
  if (!control) return;
  const alTocar = () => resolverPropuesta(nombre, { aceptada: Boolean(String(control.value).trim()) });
  control.addEventListener('input', alTocar);
  control.addEventListener('change', alTocar);
}

/** Cuántas propuestas quedan sin revisar, y por qué eso impide publicar. */
function reflejarPendientes() {
  const boton = $('#btn-guardar-informe');
  const nota = $('#extraccion-pendientes');
  if (!boton || !nota) return;

  const editando = Boolean($('#form-informe').elements.id.value);
  const pendientes = [...(estado.extraccion?.pendientes ?? [])];

  if (!pendientes.length) {
    nota.hidden = true;
    nota.textContent = '';
    boton.disabled = false;
    boton.textContent = t(editando ? 'informe.guardar.cambios' : 'informe.guardar.publicar');
    return;
  }

  const campos = pendientes.map(nombreCampo).join(', ');
  nota.textContent = t('extraccion.pendientes', { n: pendientes.length, campos });
  nota.hidden = false;
  boton.disabled = true;
  boton.textContent = t('extraccion.boton.pendientes', { n: pendientes.length });
}

/**
 * Valor por defecto de la casa para un campo que no se extrae.
 *
 * Solo lo hay cuando **todos** los informes del repositorio coinciden: eso no
 * es una suposición, es lo que la casa viene haciendo. En cuanto aparezca un
 * segundo valor deja de ofrecerse, que es lo correcto: ya no hay convención.
 */
function valorPorDefecto(nombre) {
  const lista = nombre === 'analista'
    ? estado.vocabularios?.analistas
    : (nombre === 'periodo' ? estado.vocabularios?.periodos : null);
  return Array.isArray(lista) && lista.length === 1 ? lista[0] : null;
}

/** Vuelca la lectura del PDF sobre el formulario. */
function aplicarPropuesta(datos) {
  limpiarPropuestas();
  estado.extraccion = { ...datos, pendientes: new Set() };

  const propuestos = [];
  const avisados = [];
  const porDecision = [];

  for (const nombre of datos.orden ?? Object.keys(datos.campos)) {
    const dato = datos.campos[nombre];
    if (!dato || !controlDe(nombre)) continue;
    const control = controlDe(nombre);

    if (dato.estado === 'propuesto') {
      /* Lo ya tecleado no se pisa nunca: la propuesta pasa a ser un aviso con
         lo que decía el documento, y el analista compara si quiere. Lo que
         prerrellena el propio diálogo sí se pisa: no lo ha escrito nadie. */
      if (!campoLibre(nombre, control)) {
        colocarMarca(nombre, construirMarca('defecto', '△',
          t('extraccion.aviso.conservado', { valor: dato.valor, origen: origenDe(dato) })));
        avisados.push(nombre);
        continue;
      }
      control.value = dato.valor;
      control.dataset.propuesta = 'pendiente';
      estado.extraccion.pendientes.add(nombre);
      marcarPendiente(nombre, dato);
      propuestos.push(nombre);
      continue;
    }

    if (dato.estado === 'ambiguo') {
      const texto = dato.literal
        ? `${t('extraccion.aviso.literal', { literal: dato.literal, origen: origenDe(dato) })} — ${rotuloMotivo(dato.motivo)}`
        : t('extraccion.aviso.motivo', { motivo: enMayuscula(rotuloMotivo(dato.motivo)), origen: origenDe(dato) });
      colocarMarca(nombre, construirMarca('aviso', '△', texto));
      avisados.push(nombre);
      continue;
    }

    if (dato.estado === 'referencia') {
      colocarMarca(nombre, construirMarca('aviso', '△',
        t('extraccion.aviso.motivo', { motivo: enMayuscula(rotuloMotivo(dato.motivo)), origen: origenDe(dato) })));
      avisados.push(nombre);
      continue;
    }

    if (dato.estado === 'ausente' && MOTIVOS_QUE_SE_ANUNCIAN.has(dato.motivo)) {
      colocarMarca(nombre, construirMarca('aviso', '△', enMayuscula(rotuloMotivo(dato.motivo))));
      porDecision.push(nombre);
    }
  }

  // Lo que pone el formulario, marcado aparte para que no se confunda con el PDF.
  for (const nombre of datos.fueraDeExtraccion ?? []) {
    const control = controlDe(nombre);
    if (!control || !campoLibre(nombre, control)) continue;
    const valor = valorPorDefecto(nombre);
    if (!valor) continue;
    control.value = valor;
    colocarMarca(nombre, construirMarca('defecto', '·', t('extraccion.marca.defecto')));
  }

  pintarResumenExtraccion({ propuestos, avisados, porDecision });
  reflejarPendientes();
}

function pintarResumenExtraccion({ propuestos, avisados, porDecision }) {
  const panel = $('#extraccion-resumen');
  const lectura = estado.extraccion;
  panel.textContent = '';
  panel.classList.remove('extraccion--leyendo');

  panel.appendChild(elemento('strong', 'extraccion__titulo',
    t('extraccion.titulo', { nombre: lectura.documento.nombre })));

  const linea = (texto) => panel.appendChild(elemento('p', 'extraccion__linea', texto));

  linea(t('extraccion.paginas', { n: lectura.documento.paginas }));
  for (const aviso of lectura.avisos ?? []) linea(enMayuscula(rotuloMotivo(aviso)));

  if (propuestos.length) linea(t('extraccion.resumen.propuestos', { n: propuestos.length }));
  if (avisados.length) linea(t('extraccion.resumen.avisos', { n: avisados.length }));
  if (porDecision.length) {
    linea(t('extraccion.resumen.decision', { campos: porDecision.map(nombreCampo).join(', ') }));
  }
  if (!propuestos.length && !avisados.length) linea(t('extraccion.resumen.nada'));

  if (propuestos.length) {
    const acciones = elemento('div', 'extraccion__acciones');
    for (const [clave, aceptada] of [['extraccion.aceptarTodas', true], ['extraccion.descartarTodas', false]]) {
      const boton = elemento('button', 'propuesta__boton', t(clave));
      boton.type = 'button';
      boton.addEventListener('click', () => {
        for (const nombre of [...(estado.extraccion?.pendientes ?? [])]) resolverPropuesta(nombre, { aceptada });
      });
      acciones.appendChild(boton);
    }
    panel.appendChild(acciones);
  }

  panel.hidden = false;
}

/** Pide al servidor la lectura de un PDF recién adjuntado. */
async function analizarDocumento(fichero) {
  const panel = $('#extraccion-resumen');
  panel.textContent = '';
  panel.classList.add('extraccion--leyendo');
  panel.appendChild(elemento('p', 'extraccion__linea', t('extraccion.leyendo', { nombre: fichero.name })));
  panel.hidden = false;

  const cuerpo = new FormData();
  cuerpo.append('documento', fichero);

  let datos;
  try {
    datos = await api('/api/informes/extraccion', { method: 'POST', body: cuerpo });
  } catch (err) {
    panel.textContent = '';
    panel.hidden = true;
    panel.classList.remove('extraccion--leyendo');
    // Que la lectura falle no estorba el alta: la ficha se teclea como siempre.
    avisar(t('extraccion.error', { motivo: rotuloMotivo(err.codigo, err.message) }));
    return;
  }
  aplicarPropuesta(datos);
}

function alAdjuntarDocumento(ev) {
  // Solo al dar de alta: sobre un informe ya publicado, lo escrito manda.
  if ($('#form-informe').elements.id.value) return;
  const pdf = [...(ev.target.files ?? [])].find((f) => /\.pdf$/i.test(f.name));
  if (!pdf) return;
  analizarDocumento(pdf);
}

function reflejarModoFormulario(editando) {
  $('#titulo-dialogo-informe').textContent =
    t(editando ? 'informe.titulo.editar' : 'informe.titulo.publicar');
  $('#btn-guardar-informe').textContent =
    t(editando ? 'informe.guardar.cambios' : 'informe.guardar.publicar');
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
  reflejarModoFormulario(editando);
  $('#btn-eliminar-informe').hidden = !editando;

  form.elements.id.value = editando ? informe.id : '';
  // Se retira la lectura anterior antes de volcar nada: un diálogo reabierto no
  // puede conservar propuestas de un informe que ya no es el que se edita.
  limpiarPropuestas();

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

        const quitar = elemento('button', 'boton boton--texto', t('informe.adjunto.retirar'));
        quitar.type = 'button';
        quitar.addEventListener('click', async () => {
          if (!confirm(t('informe.adjunto.confirmar', { nombre: a.nombre_original }))) return;
          try {
            await api(`/api/informes/${informe.id}/adjuntos/${a.id}`, { method: 'DELETE' });
            li.remove();
            avisar(t('informe.adjunto.retirado'), { claro: true });
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

  // Instantánea después de prerrellenar: lo que difiera de aquí lo escribió alguien.
  estado.valoresIniciales = Object.fromEntries(
    Object.keys(ROTULO_CAMPO).map((nombre) => [nombre, String(form.elements[nombre]?.value ?? '')])
  );

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
  boton.textContent = t('informe.guardar.procesando');

  try {
    const guardado = await api(id ? `/api/informes/${id}` : '/api/informes', { method: id ? 'PUT' : 'POST', body: datos });
    $('#dialogo-informe').close();
    avisar(t(id ? 'informe.guardado.actualizado' : 'informe.guardado.publicado'), { claro: true });
    // Publicar o editar una tesis puede reetiquetar noticias ya existentes: un
    // cambio de estado que, sin este aviso, ocurriría sin que nadie lo viera.
    if (guardado?.noticiasReetiquetadas) {
      avisar(t('informe.guardado.reetiquetadas', { n: guardado.noticiasReetiquetadas }));
    }

    await invalidarDerivadasDeInformes();
  } catch (err) {
    panelErrores.textContent = '';
    panelErrores.appendChild(elemento('strong', null, rotuloError(err.codigo, err.message)));
    if (err.errores?.length) {
      const lista = document.createElement('ul');
      for (const e of err.errores) {
        lista.appendChild(elemento('li', null, rotuloError(e.codigo, e.mensaje)));
        const campo = form.elements[e.campo];
        if (campo) campo.setAttribute('aria-invalid', 'true');
      }
      panelErrores.appendChild(lista);
    }
    panelErrores.hidden = false;
    panelErrores.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    boton.disabled = false;
    // Devuelve el botón a su rótulo, que depende de si quedan propuestas.
    reflejarPendientes();
  }
}

async function eliminarInforme() {
  const id = $('#form-informe').elements.id.value;
  if (!id) return;
  if (!confirm(t('informe.eliminar.confirmar'))) return;

  try {
    const eliminado = await api(`/api/informes/${id}`, { method: 'DELETE' });
    $('#dialogo-informe').close();
    avisar(t('informe.eliminado'), { claro: true });
    // Simétrico al aviso de reetiquetado: borrar una tesis puede dejar un
    // ticker sin cobertura y desvincularlo de noticias ya existentes.
    if (eliminado?.noticiasDesvinculadas) {
      avisar(t('informe.eliminado.desvinculadas', { n: eliminado.noticiasDesvinculadas }));
    }
    await invalidarDerivadasDeInformes();
  } catch (err) {
    avisar(err.message);
  }
}

// ──────────────────────────────── acceso ─────────────────────────────────

/**
 * Refleja el estado de sesion en la cabecera.
 *
 * El boton es el unico elemento que habla de la sesion: lleva el punto dentro y
 * cambia de peso segun el estado. Sin sesion conserva su caja —ahi invita a
 * entrar—; con ella la pierde, porque entonces solo informa y no debe competir
 * con la marca.
 *
 * El rotulo se guarda como CLAVE en `data-i18n`, no como texto: esta funcion
 * vuelve a correr en `idioma:cambiado`, y una clave se retraduce mientras que un
 * rotulo ya resuelto se congelaria en el idioma en que se puso.
 */
function actualizarIndicadorSesion() {
  const activo = hayCredencial();
  const cabecera = $('#cabecera-acciones');
  if (cabecera) cabecera.hidden = !activo;

  const boton = $('#btn-acceso');
  boton.classList.toggle('boton--contorno', !activo);
  boton.classList.toggle('boton--sesion', activo);
  $('#punto-sesion').hidden = !activo;

  const texto = $('#btn-acceso-texto');
  texto.dataset.i18n = activo ? 'cabecera.sesion.analista' : 'cabecera.acceso';
  texto.textContent = t(texto.dataset.i18n);

  // Con sesion el rotulo visible dice quien eres, no que hace el boton. El
  // nombre accesible si tiene que decir la accion.
  if (activo) {
    boton.dataset.i18nAttr = 'aria-label:cabecera.sesion.gestionar';
    boton.setAttribute('aria-label', t('cabecera.sesion.gestionar'));
  } else {
    delete boton.dataset.i18nAttr;
    boton.removeAttribute('aria-label');
  }

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
      throw new Error(datos?.error ?? t('acceso.credencialInvalida'));
    }
    sessionStorage.setItem(CLAVE_SESION, campo.value);
    actualizarIndicadorSesion();
    $('#dialogo-acceso').close();
    avisar(t('acceso.iniciada'), { claro: true });
    if (estado.seccion === 'repositorio') cargarInformes();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
}

// ════════════════════════════════ HOME ══════════════════════════════════

let inicioMontado = false;

/* Lo último que cada bloque de la portada recibió de su fuente.
   Se guarda para poder repintar al cambiar de idioma sin volver a pedir nada:
   los datos son los mismos, lo único que cambia es el texto que los rodea. */
const datosInicio = {
  indices: null, cartera: null, radar: null,
  catalizadores: null, flujo: null, signal: null, research: null,
};

/* Bloques que ya se han pintado alguna vez. Hace falta distinguir «su fuente aún
   no ha contestado» de «contestó y no había dato»: en el segundo caso el bloque
   muestra su carencia declarada, que sí hay que traducir, y en el primero no hay
   nada que repintar todavía. */
const pintadosInicio = new Set();

/** Vacía lo guardado. Va de la mano de `inicioMontado`: viven y mueren juntos. */
function olvidarDatosInicio() {
  for (const campo of Object.keys(datosInicio)) datosInicio[campo] = null;
  pintadosInicio.clear();
}

const irARutaInicio = (destino) => {
  const [seccion, consulta] = String(destino).replace('#/', '').split('?');
  if (consulta) location.hash = `#/${seccion}?${consulta}`;
  else irA(seccion);
};

/* Cómo se pinta cada bloque a partir de lo guardado. Los pintores viven aquí
   —y no dentro de la carga— porque el repintado por idioma usa exactamente los
   mismos: si un bloque cambiara de argumentos, cambiaría en un único sitio.

   Los bloques de las áreas ocultas —el pulso, el radar, el flujo y la señal— no
   figuran aquí ni se piden en `cargarInicio()`. Sus pintores siguen exportados y
   su HTML sigue en el documento con `hidden`: reabrir el área es devolverles su
   entrada en este mapa y su llamada abajo. */
const PINTORES_INICIO = {
  ticker: () => pintarTicker(datosInicio.indices, datosInicio.cartera),
  // Fase D.12: las tres cifras del Hero — misma cartera que `cartera`, su
  // propia entrada porque el repintado por idioma recorre esta lista.
  metricasHero: () => pintarMetricasHero(datosInicio.cartera),
  // Bloque Bento: misma cartera, otro corte —`resumenPortfolio` y, como apoyo
  // degradado, `estadisticos`— y su propia entrada porque el repintado por
  // idioma recorre esta lista, y sus rótulos también se traducen.
  cartera: () => pintarCarteraHome(datosInicio.cartera, irARutaInicio),
  catalizadores: () => pintarCatalizadoresHome(datosInicio.catalizadores, irARutaInicio),
  research: () => pintarResearchHome(datosInicio.research ?? [], irARutaInicio),
};

/**
 * Monta la narrativa de la portada.
 *
 * Cada bloque se pinta en cuanto resuelve su fuente: la agenda consulta cadenas
 * de opciones y tarda segundos, y esperarla dejaría la cinta en blanco. Una
 * fuente caída deja su bloque con su estado declarado.
 */
async function cargarInicio() {
  if (inicioMontado) return;
  inicioMontado = true;

  animarManifiesto();
  animarCabeceras();

  // Guarda lo que llegue —resuelva la fuente o falle— y pinta ese bloque.
  const alLlegar = (promesa, guardar, bloque) => {
    const pintar = () => { pintadosInicio.add(bloque); PINTORES_INICIO[bloque](); };
    return promesa.then((d) => { guardar(d); pintar(); }, () => { guardar(null); pintar(); });
  };

  // Los índices son hoy de la cinta y de nadie más: el pulso, que compartía esta
  // llamada, se fue con el área de Mercado.
  const indices = api('/api/radar/indices');
  const cartera = api('/api/mercado/cartera').catch(() => null);

  await Promise.allSettled([
    // Los índices se atrapan aquí dentro para que el par NUNCA se rechace. Si
    // se dejaran rechazar, un fallo de índices dejaría la cinta sin cartera
    // —que sí ha llegado— y, peor, borraría `datosInicio.cartera` por debajo de
    // la fila de cifras: seguiría pintada y se vaciaría al cambiar de idioma.
    alLlegar(Promise.all([indices.catch(() => null), cartera]), (par) => {
      datosInicio.indices = par?.[0] ?? null;
      datosInicio.cartera = par?.[1] ?? null;
    }, 'ticker'),
    alLlegar(cartera, (d) => { datosInicio.cartera = d; }, 'metricasHero'),
    alLlegar(cartera, (d) => { datosInicio.cartera = d; }, 'cartera'),
    alLlegar(api('/api/catalizadores'), (d) => { datosInicio.catalizadores = d; }, 'catalizadores'),
    // La cobertura destacada no trae cotización ni resumen en el listado, de
    // modo que se pide con ficha. Una sola llamada trae la cobertura entera:
    // pedirla compañía a compañía multiplicaba los viajes sin ganar nada.
    alLlegar(api('/api/companias?detalle=1'),
      (d) => { datosInicio.research = d?.fichas ?? []; }, 'research'),
  ]);

  /* La cinta queda viva a partir de aquí. Se arranca DESPUÉS del `allSettled`
     porque antes no hay cinta que refrescar, y refrescar lo que aún no existe
     dispararía un repintado entero en la primera pasada. */
  programarRefrescoCinta();
}

/**
 * Repinta la portada en el idioma vigente.
 *
 * No se vuelve a pedir nada a ninguna fuente: los datos no dependen del idioma.
 * El titular del manifiesto se recompone porque sus líneas las declara el
 * diccionario, y un bloque cuya fuente aún no haya respondido no se toca: lo
 * pintará su propia carga cuando llegue, ya con el diccionario nuevo.
 */
function repintarInicio() {
  if (!inicioMontado) return;
  animarManifiesto();
  for (const bloque of pintadosInicio) PINTORES_INICIO[bloque]();
}

/* ════════════════════ La cinta, que sí es dato vivo ═════════════════════
 *
 * Todo lo demás de la portada es una foto del instante de carga, y es correcto
 * que lo sea: los estadísticos salen de cierres de sesión y no cambian durante
 * el día. Las cotizaciones sí, y hasta ahora tampoco se movían — `cargarInicio()`
 * corre UNA vez por carga de página, de modo que la cinta envejecía en silencio.
 *
 * ── El ritmo ──
 * 20 s. El servidor cachea las cotizaciones 15 —`TTL_COTIZACION_MS`—, así que
 * pedir más a menudo no traería un dato más nuevo: traería el mismo dato y una
 * petición de más al proveedor. Por encima del TTL, y no justo en él, para no
 * caer siempre sobre el borde de la caché.
 *
 * ── Cuándo NO se pide ──
 * Con la pestaña oculta no se pide nada. Una pestaña de fondo abierta toda la
 * noche son 4.320 peticiones que nadie va a mirar.
 *
 * Y cuando el mercado deja de imprimir, se retrocede a cinco minutos. Eso NO se
 * deduce de un calendario de sesión —que habría que mantener, y que se equivoca
 * en festivos y en subastas—: se deduce del dato. Si tras tres pasadas seguidas
 * ningún valor ha cambiado, el mercado no está imprimiendo, y da igual el motivo.
 * Se vuelve al ritmo corto en cuanto algo cambia o el lector regresa a la
 * pestaña.
 */
const REFRESCO_MS = 20_000;
const REFRESCO_QUIETO_MS = 300_000;
const PASADAS_QUIETAS = 3;

let refrescoTemporizador = null;
let pasadasSinCambio = 0;

function pararRefrescoCinta() {
  clearTimeout(refrescoTemporizador); refrescoTemporizador = null;
}

async function pasadaDeCinta() {
  /* Se piden las dos fuentes de la cinta y NADA MÁS. La fila de cifras y el
     cuadro de mando salen de la misma llamada de cartera, pero no se repintan
     aquí: son otro commit y otra decisión. Repintarlos de tapadillo movería unas
     cifras que la portada presenta como cierres de sesión. */
  const [indices, cartera] = await Promise.all([
    api('/api/radar/indices').catch(() => null),
    api('/api/mercado/cartera').catch(() => null),
  ]);
  if (!indices && !cartera) return null;

  if (indices) datosInicio.indices = indices;
  if (cartera) datosInicio.cartera = cartera;
  return refrescarTicker(datosInicio.indices, datosInicio.cartera);
}

function programarRefrescoCinta() {
  pararRefrescoCinta();
  if (document.visibilityState !== 'visible') return;

  const siguiente = () => {
    const espera = pasadasSinCambio >= PASADAS_QUIETAS ? REFRESCO_QUIETO_MS : REFRESCO_MS;
    refrescoTemporizador = setTimeout(async () => {
      if (document.visibilityState !== 'visible') return;
      let cambios = null;
      try { cambios = await pasadaDeCinta(); } catch { cambios = null; }
      // `null` es «no se pudo comparar» —repintado entero o fuente caída—, y no
      // es lo mismo que «no cambió nada»: no cuenta como pasada quieta.
      if (cambios === null) pasadasSinCambio = 0;
      else if (cambios > 0) pasadasSinCambio = 0;
      else pasadasSinCambio++;
      siguiente();
    }, espera);
  };
  siguiente();
}

/* Al volver a la pestaña se vuelve al ritmo corto y se pide de inmediato: quien
   regresa quiere ver el dato de ahora, no el de cuando se fue. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { pararRefrescoCinta(); return; }
  if (!inicioMontado) return;
  pasadasSinCambio = 0;
  pasadaDeCinta().catch(() => {});
  programarRefrescoCinta();
});

/**
 * Repinta lo que la pasada sobre el DOM no alcanza.
 *
 * `traducir()` solo sabe de nodos con `data-i18n`; todo lo que el cliente
 * construye en JavaScript —tablas, cuadros de mando, diálogos— quedaría en el
 * idioma anterior. Se repinta desde lo ya cargado, sin volver a la red: cambian
 * los rótulos, no los datos.
 *
 * Se repinta siempre, no solo la sección visible: las demás están ocultas con
 * `hidden`, y dejarlas sin repintar significaría que al navegar a ellas
 * aparecen en el idioma anterior hasta que su cargador vuelva a resolver.
 */
function repintarVistas() {
  // Los desplegables se arman en JavaScript —«Todos», «Sin clasificar», los
  // niveles de acceso, las categorías de noticia—, así que tampoco los alcanza
  // la pasada sobre el DOM. Todas estas funciones conservan la selección
  // vigente: repoblar por idioma no debe deshacer lo que el usuario eligió.
  if (estado.vocabularios) { poblarFiltros(); poblarFormulario(); }
  if (estado.informes) pintarInformes(estado.informes);
  if (estado.informesDestacados) pintarHubRepositorio(estado.informesDestacados);
  if (estado.cartera) pintarCartera(estado.cartera, { avisos: false });
  reflejarModoTablaSerie();

  repintarRadar();
  repintarCompanias();
  pintarAgendaCompleta();
  pintarPanoramaCompleto();

  if (estado.vocabulariosNoticias) { poblarFiltrosNoticias(); poblarFormularioNoticia(); }
  if (estado.noticias) pintarNoticias(estado.noticias);
  pintarEstadoSincronizacion();

  // La sección de opciones se repinta entera desde lo guardado: el aviso de
  // alcance, la línea de estado, el flujo y —vía `aplicarFiltrosOpciones()`— la
  // tabla de contratos y las destacadas.
  pintarAlcance($('#alcance-opciones'), estado.opciones.estado);
  pintarEstadoOpciones();
  pintarFlujoOpciones();
  if (estado.opciones.inusual) { poblarFiltrosOpciones(); aplicarFiltrosOpciones(); }
  pintarCadenaOpciones();

  // Los diálogos no entran, y no es un olvido: se abren con `showModal()`, que
  // deja el conmutador de idioma fuera del alcance del ratón y del tabulador.
  // Con uno abierto no puede llegar a cambiarse el idioma, de modo que repintar
  // su contenido sería código que nunca se ejecuta. Sus rótulos de modo se
  // aplican al abrirlos, que es cuando se sabe el modo. Si algún día alguno
  // pasara a `show()` —sin modal—, habría que volver a añadirlos aquí.
}

/**
 * Rótulo del conmutador de la tabla del gráfico.
 *
 * Este sí se ve mientras se conmuta el idioma: está en la sección, no en un
 * diálogo. Su `data-i18n` lo devolvería a «Ver datos» con la tabla abierta, así
 * que `repintarVistas()` lo vuelve a aplicar. El modo no se guarda en `estado`
 * porque ya lo dice el DOM, que es donde ocurre.
 */
function reflejarModoTablaSerie() {
  const boton = $('#btn-tabla-serie');
  const tabla = $('#tabla-serie');
  if (!boton || !tabla) return;
  boton.textContent =
    t(tabla.hidden ? 'cartera.grafico.verDatos' : 'cartera.grafico.ocultarDatos');
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
  // El hub necesita cotización y recorrido por compañía para Current Price /
  // Implied Upside de la tarjeta: `detalle=1` los trae en una sola llamada
  // (`datos.fichas`), en vez de que el cliente pida la ficha una a una.
  parametros.set('detalle', '1');

  // La traza del hero es independiente del listado —no bloquea su pintado— y se
  // pide una sola vez: se cachea en `estado.companias.trazaHero`.
  cargarTrazaHeroCompanias();

  try {
    // Se guarda la carga para repintar al cambiar de idioma sin volver a pedirla.
    estado.companias.lista = await api(`/api/companias?${parametros}`);
    pintarListaCompanias();
  } catch (err) {
    avisar(t('companias.error', { detalle: err.message }));
  }
}

/** Pinta el listado a partir de la última carga resuelta. */
function pintarListaCompanias() {
  const datos = estado.companias.lista;
  if (!datos) return;
  pintarSectores(datos.sectores, estado.companias.sector);
  pintarHubCompanias(datos, (clave) => abrirCompania(clave), cargarSerieCompania);
}

/**
 * Serie por ticker para el sparkline diferido de cada card. Una llamada por
 * símbolo, cacheada en `estado.companias.seriesTicker` —cachea la promesa, no
 * solo el resultado, para que dos cards del mismo ticker que entren en el
 * viewport casi a la vez no disparen dos peticiones—. Si falla, el sparkline
 * simplemente no aparece: nunca un hueco vacío ni un error visible.
 */
function cargarSerieCompania(ticker) {
  if (estado.companias.seriesTicker.has(ticker)) return estado.companias.seriesTicker.get(ticker);
  const promesa = api(`/api/mercado/serie/${encodeURIComponent(ticker)}?dias=90`)
    .then((r) => ({ disponible: true, serie: r.serie ?? [] }))
    .catch(() => ({ disponible: false, serie: [] }));
  estado.companias.seriesTicker.set(ticker, promesa);
  return promesa;
}

/**
 * Traza decorativa del hero: histórico real de SPY, mismo endpoint que ya usa
 * `cargarSeriesBenchmark()`. Decorativa y prescindible —se omite en móvil, no
 * vale el coste de red ahí— y nunca bloquea el resto del hero: si falla o
 * tarda, el hero queda igual de completo sin la traza.
 */
async function cargarTrazaHeroCompanias() {
  if (estado.companias.trazaHero) {
    pintarTrazaHeroCompanias(estado.companias.trazaHero);
    return;
  }
  if (window.matchMedia('(max-width: 640px)').matches) return;
  try {
    const r = await api('/api/mercado/serie/SPY?dias=180');
    estado.companias.trazaHero = { disponible: true, serie: r.serie ?? [] };
  } catch {
    estado.companias.trazaHero = { disponible: false, serie: [] };
  }
  pintarTrazaHeroCompanias(estado.companias.trazaHero);
}

/** Abre la ficha de una compañía. */
async function abrirCompania(clave, { empujar = true } = {}) {
  if (estado.seccion !== 'companias') irA('companias', null, { empujar: false });
  mostrarVistaCompanias('ficha');
  estado.companias.ficha = clave;

  if (empujar) location.hash = `#/companias?t=${encodeURIComponent(clave)}`;

  const raiz = $('#ficha-compania');
  if (raiz) raiz.textContent = t('companias.ficha.cargando');

  try {
    estado.companias.datosFicha = await api(`/api/companias/${encodeURIComponent(clave)}`);
    pintarFichaCompania();
  } catch (err) {
    // Sin ficha válida no hay nada que repintar: se retira la memoria para que un
    // cambio de idioma no resucite la última que sí cargó.
    estado.companias.datosFicha = null;
    if (raiz) {
      raiz.textContent = '';
      const vacio = elemento('div', 'vacio');
      vacio.appendChild(elemento('strong', '', t('companias.ficha.noEncontrada')));
      vacio.appendChild(elemento('span', '', err.message));
      raiz.appendChild(vacio);
    }
  }
}

/** Pinta la ficha a partir de la última carga resuelta. */
function pintarFichaCompania() {
  const datos = estado.companias.datosFicha;
  if (!datos) return;
  pintarFicha(datos, {
    alAbrirInforme: (id) => abrirDetalle(id),
    alVerCatalizadores: (ticker) => {
      estado.catalizadores.compania = ticker;
      estado.catalizadores.horizonte = 'UPCOMING';
      irA('catalizadores');
    },
    alIrCartera: () => irA('cartera'),
  });
}

/**
 * Repinta la cobertura desde lo guardado.
 *
 * Las dos vistas comparten sección y solo una está a la vista, pero se repintan
 * las dos: la oculta se mostraría en el idioma anterior en cuanto se navegara a
 * ella, que es justo lo que este repintado existe para impedir.
 */
function repintarCompanias() {
  pintarListaCompanias();
  pintarFichaCompania();
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
  if (raiz && !raiz.childElementCount) raiz.textContent = t('catalizadores.cargando');

  try {
    // Se guarda la carga para repintar al cambiar de idioma sin volver a pedirla.
    estado.catalizadores.agenda = await api(`/api/catalizadores${parametros.toString() ? `?${parametros}` : ''}`);
    pintarAgendaCompleta();
  } catch (err) {
    avisar(t('catalizadores.error', { detalle: err.message }));
  }
}

/** Pinta la agenda a partir de la última carga resuelta. */
function pintarAgendaCompleta() {
  const datos = estado.catalizadores.agenda;
  if (!datos) return;
  pintarFiltrosCatalizadores(datos, estado.catalizadores);
  pintarMetricasCatalizadores(datos);
  pintarSiguienteCatalizador(datos, (clave) => abrirCompania(clave));
  pintarDensidadCatalizadores(datos);
  pintarHeroLineaCatalizadores(datos);
  pintarAgenda(datos, {
    horizonte: estado.catalizadores.horizonte,
    ventana: estado.catalizadores.ventana,
    alAbrirCompania: (clave) => abrirCompania(clave),
  });
  pintarCarencias(datos);
  marcarHorizonte();
  marcarVentana();
}

function marcarHorizonte() {
  for (const boton of $$('#conmutador-horizonte [data-horizonte]')) {
    const activo = boton.dataset.horizonte === estado.catalizadores.horizonte;
    boton.setAttribute('aria-selected', String(activo));
  }
}

/* La ventana TODAY/7D/30D es un filtro adicional sobre Próximos, no un
   sustituto del conmutador Próximos/Pasados: solo tiene efecto ahí, y se
   deshabilita visualmente en Pasados para no sugerir un filtro que no aplica. */
function marcarVentana() {
  const enProximos = estado.catalizadores.horizonte === 'UPCOMING';
  let botonActivo = null;
  for (const boton of $$('#conmutador-ventana [data-ventana]')) {
    const activo = enProximos && boton.dataset.ventana === estado.catalizadores.ventana;
    boton.setAttribute('aria-selected', String(activo));
    boton.disabled = !enProximos;
    if (activo) botonActivo = boton;
  }
  moverIndicadorVentana(botonActivo);
}

/*
 * El indicador se posiciona sobre el ancho y el desplazamiento REALES del
 * botón activo —`offsetLeft`/`offsetWidth`—, nunca sobre una cifra fija: el
 * texto de un mismo botón mide distinto en inglés y en castellano
 * («TODOS» contra «ALL»), y un valor a mano se habría desincronizado ahí.
 */
function moverIndicadorVentana(boton) {
  const indicador = $('#conmutador-ventana-indicador');
  if (!indicador) return;
  if (!boton) { indicador.style.opacity = '0'; return; }
  indicador.style.opacity = '1';
  indicador.style.width = `${boton.offsetWidth}px`;
  indicador.style.transform = `translateX(${boton.offsetLeft}px)`;
}

// ════════════════════════════════ MARKETS ═══════════════════════════════

async function cargarMercado() {
  const raiz = $('#panorama-mercado');
  if (raiz && !raiz.childElementCount) raiz.textContent = t('mercado.cargando');

  try {
    // Se guarda la carga para repintar al cambiar de idioma sin volver a pedirla.
    estado.mercado = await api('/api/mercado/panorama');
    pintarPanoramaCompleto();
  } catch (err) {
    avisar(t('mercado.error', { detalle: err.message }));
  }
}

/** Pinta el panorama a partir de la última carga resuelta. */
function pintarPanoramaCompleto() {
  if (estado.mercado) pintarPanorama(estado.mercado);
}

// ──────────────────────────────── cartera ────────────────────────────────

/* Número de la carga de cartera en curso.

   Antes había aquí un pestillo —«si ya hay una cargando, no hagas nada»— que
   ahorraba una petición y a cambio perdía la recarga: dar de baja una tesis
   mientras la cartera estaba en vuelo dejaba la vista con la posición borrada
   hasta que uno salía de la sección y volvía. Y la respuesta vieja, al llegar,
   pintaba encima lo que ya se sabía anterior.

   El número lo arregla sin pestillo: cada carga se lleva el suyo, la última
   pedida es la única que puede pintar, y ninguna se descarta antes de salir. Se
   paga una petición de más en un solapamiento raro, que es mucho menos de lo que
   costaba enseñar una posición que ya no existe. */
let generacionCartera = 0;

async function cargarCartera({ silencioso = false } = {}) {
  const generacion = ++generacionCartera;
  const vigente = () => generacion === generacionCartera;

  const tarjetas = [$('#cuadro-mando'), $('.tarjeta--grafico'), $('#rejilla-estadisticos')];
  if (!silencioso) for (const tarjeta of tarjetas) tarjeta?.classList.add('cargando');

  try {
    const principal = benchmarkPrincipal(estado.catalogoBenchmarks);
    const datos = await api(`/api/mercado/cartera?benchmark=${encodeURIComponent(principal)}`);
    // Si mientras volaba se pidió otra carga, esta respuesta ya nació vieja.
    if (!vigente()) return;
    estado.cartera = datos;
    estado.catalogoBenchmarks = datos.benchmarks;
    await cargarSeriesBenchmark(datos);
    if (!vigente()) return;
    pintarCartera(datos);
  } catch (err) {
    if (!vigente()) return;
    avisar(err.message);
    const cuadro = $('#cuadro-mando');
    if (cuadro && !cuadro.children.length) {
      cuadro.textContent = '';
      const vacio = elemento('div', 'vacio');
      vacio.appendChild(elemento('strong', null, t('cartera.error.mercado')));
      vacio.appendChild(document.createTextNode(err.message));
      cuadro.appendChild(vacio);
    }
  } finally {
    // El indicador de carga lo retira quien siga siendo la carga vigente: si no,
    // la que acaba primero lo apagaría con otra todavía en vuelo.
    if (vigente()) for (const tarjeta of tarjetas) tarjeta?.classList.remove('cargando');
  }
}

/**
 * @param {object} datos
 * @param {object} [opciones] `{ avisos }` — false al repintar por cambio de
 *   idioma: los avisos ya se mostraron, y volver a lanzarlos cada vez que se
 *   pulsa ES o EN convertiría el conmutador en una fuente de ruido.
 */
function pintarCartera(datos, { avisos = true } = {}) {
  // Antes del corte por cartera vacía: el selector ha de poder usarse aunque no
  // haya ninguna tesis todavía, y el catálogo viene igual en las dos respuestas.
  poblarBenchmarks(datos.benchmarks);

  if (datos.vacia) {
    $('#cuadro-mando').textContent = '';
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, t('cartera.vacia.titulo')));
    vacio.appendChild(document.createTextNode(datos.mensaje));
    $('#cuadro-mando').appendChild(vacio);
    $('#resumen-portfolio').textContent = '';
    $('#realizado-comparativa').textContent = '';
    $('#contribucion-barras').textContent = '';
    $('#cuerpo-posiciones').textContent = '';
    $('#rejilla-estadisticos').textContent = '';
    return;
  }

  pintarResumenPortfolio(datos);
  pintarRealizadoComparativa(datos);
  pintarCuadroMando(datos);
  pintarGrafico(datos);
  pintarTablaCartera(datos);
  pintarContribucion(datos);
  pintarConciliacion(datos);
  pintarEstadisticos(datos);
  pintarAvisoCierre(datos);
  pintarEstadoDatos(datos);
  /* La composición: el anillo sustituye a las barras por sector que había en la
     tarjeta de posiciones. Sale de los MISMOS campos que la columna «Peso» de esa
     tabla —`pesoVigente`— y que el indicador de liquidez del cuadro de mando
     —`liquidez.pesoActual`—, de modo que las tres cifras de una posición en esta
     pantalla no pueden discrepar: son la misma. */
  pintarAnillo($('#anillo-composicion'), datos);
  pintarMetodologia(datos);
  pintarCinta(datos.posiciones ?? [], datos.cerradas ?? []);
  // El panel de mercado muestra un resumen de las mismas cifras.
  pintarPanelCartera(datos);

  if (avisos) for (const a of datos.avisos ?? []) avisar(a, { claro: true, duracion: 8000 });
}

/**
 * Cabecera de `resumenPortfolio`: siete cifras — rentabilidad, realizada, no
 * realizada, capital desplegado, ROIC y el recuento de posiciones abiertas y
 * cerradas.
 *
 * Cada campo que el motor entrega en `null` se rotula «N/A», nunca con un cero
 * ni con el guion silencioso de `formatearPorcentaje()`: aquí el hueco es una
 * afirmación —«esta cifra no aplica todavía»—, no un adorno tipográfico. Las
 * dos que pueden faltar de verdad son `retornoRealizadoPct` y
 * `retornoNoRealizadoPct`: una cartera recién nacida no tiene nada cerrado, y
 * eso no es una rentabilidad realizada del 0 %, es la ausencia del tercer
 * estado que exige CLAUDE.md.
 */
function pintarResumenPortfolio(datos) {
  const cuadro = $('#resumen-portfolio');
  if (!cuadro) return;
  cuadro.textContent = '';

  const r = datos.resumenPortfolio;
  const na = t('general.noDisponible');
  const cifraPct = (v) => (v === null || v === undefined ? na : formatearPorcentaje(v));

  const indicador = (etiqueta, valor, nota, { principal = false, variacion = null } = {}) => {
    const bloque = elemento('div', `indicador${principal ? ' indicador--principal' : ''}`);
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    const v = elemento('strong', 'indicador__valor', valor);
    if (variacion !== null) v.className = `indicador__valor ${claseVariacion(variacion)}`;
    bloque.appendChild(v);
    if (nota) bloque.appendChild(elemento('span', 'indicador__nota', nota));
    cuadro.appendChild(bloque);
  };

  if (!r) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, t('cartera.resumen.vacio.titulo')));
    vacio.appendChild(document.createTextNode(t('cartera.resumen.vacio.motivo')));
    cuadro.appendChild(vacio);
    return;
  }

  // Mismo hecho que `cartera.indicador.rentabilidad` de `#cuadro-mando`, leído
  // del mismo campo en última instancia: `resumenPortfolio.retornoPct` es
  // literalmente `estadisticos.rentabilidadTotal`, nunca un cálculo aparte.
  indicador(t('cartera.resumen.retorno'), cifraPct(r.retornoPct),
    t('cartera.resumen.retorno.nota'), { principal: true, variacion: r.retornoPct });
  indicador(t('cartera.resumen.realizado'), cifraPct(r.retornoRealizadoPct),
    r.retornoRealizadoPct === null ? t('cartera.resumen.realizado.vacio') : t('cartera.resumen.realizado.nota'),
    { variacion: r.retornoRealizadoPct });
  indicador(t('cartera.resumen.noRealizado'), cifraPct(r.retornoNoRealizadoPct),
    r.retornoNoRealizadoPct === null ? t('cartera.resumen.noRealizado.vacio') : t('cartera.resumen.noRealizado.nota'),
    { variacion: r.retornoNoRealizadoPct });
  indicador(t('cartera.resumen.capital'), porcentaje(r.capitalDesplegadoPct),
    t('cartera.resumen.capital.nota'));
  indicador(t('cartera.resumen.roic'), cifraPct(r.roicPct),
    r.roicPct === null ? t('cartera.resumen.roic.vacio') : t('cartera.resumen.roic.nota'),
    { variacion: r.roicPct });
  indicador(t('cartera.resumen.abiertas'), String(r.posicionesAbiertas),
    t('cartera.resumen.abiertas.nota'));
  indicador(t('cartera.resumen.cerradas'), String(r.posicionesCerradas),
    t('cartera.resumen.cerradas.nota'));
}

/**
 * Realizada frente a no realizada: dos cifras y una barra de magnitud debajo.
 *
 * La barra NO reparte por signo —para eso ya están el color y el glifo de cada
 * cifra—: reparte por peso, cuánto pesa cada lado sobre la suma de los dos
 * valores absolutos. Con un solo lado presente, ese lado se lleva la barra
 * entera y el otro no dibuja tramo; con los dos en `null` no hay pista que
 * pintar, y se declara sin datos en vez de una barra vacía sin explicación.
 */
function pintarRealizadoComparativa(datos) {
  const destino = $('#realizado-comparativa');
  if (!destino) return;
  destino.textContent = '';

  const r = datos.resumenPortfolio;
  const realizado = r?.retornoRealizadoPct ?? null;
  const noRealizado = r?.retornoNoRealizadoPct ?? null;
  if (!r || (realizado === null && noRealizado === null)) return;

  const na = t('general.noDisponible');
  const cifras = elemento('div', 'realizado-comparativa__cifras');
  const celda = (etiqueta, valor) => {
    const c = elemento('div', 'realizado-comparativa__celda');
    c.appendChild(elemento('strong',
      `realizado-comparativa__valor ${claseVariacion(valor)}`,
      valor === null ? na : formatearPorcentaje(valor)));
    c.appendChild(elemento('span', 'realizado-comparativa__etiqueta', etiqueta));
    cifras.appendChild(c);
  };
  celda(t('cartera.resumen.realizado'), realizado);
  celda(t('cartera.resumen.noRealizado'), noRealizado);
  destino.appendChild(cifras);

  const magRealizado = Math.abs(realizado ?? 0);
  const magNoRealizado = Math.abs(noRealizado ?? 0);
  const total = magRealizado + magNoRealizado;
  if (total > 0) {
    const barra = elemento('div', 'realizado-comparativa__barra');
    if (realizado !== null) {
      const tramo = elemento('div',
        `realizado-comparativa__tramo realizado-comparativa__tramo--${realizado > 0 ? 'alza' : realizado < 0 ? 'baja' : 'nula'}`);
      tramo.style.width = `${(magRealizado / total) * 100}%`;
      barra.appendChild(tramo);
    }
    if (noRealizado !== null) {
      const tramo = elemento('div',
        `realizado-comparativa__tramo realizado-comparativa__tramo--${noRealizado > 0 ? 'alza' : noRealizado < 0 ? 'baja' : 'nula'}`);
      tramo.style.width = `${(magNoRealizado / total) * 100}%`;
      barra.appendChild(tramo);
    }
    destino.appendChild(barra);
  }
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
  /* Se pondera por el peso ACTUAL, no por el de capital: la liquidez no se mueve,
     y con los pesos de capital una cartera medio en caja publicaría el día entero
     de sus posiciones vivas como si estuviera invertida del todo. */
  const dia = posiciones.reduce((acc, p) => {
    const peso = p.pesoVigente ?? p.peso;
    if (!Number.isFinite(p.variacionDiaPct) || !Number.isFinite(peso)) return acc;
    return acc + (p.variacionDiaPct * peso) / 100;
  }, 0);

  indicador(t('cartera.indicador.rentabilidad'), formatearPorcentaje(e.rentabilidadTotal),
    t('cartera.indicador.rentabilidad.nota', { fecha: formatearFecha(e.inicio) }),
    { principal: true, variacion: e.rentabilidadTotal });

  // El valor indexado es un nivel, no una rentabilidad: se muestra sin signo ni símbolo.
  indicador(t('cartera.indicador.valorIndexado'), formatearNumero(e.valorIndexado ?? datos.valorIndice),
    t('cartera.indicador.valorIndexado.nota', { base: formatearNumero(e.baseCapital ?? 100, 0) }));
  indicador(t('cartera.indicador.dia'), formatearPorcentaje(dia),
    t('cartera.indicador.dia.nota'), { variacion: dia });
  const cerradas = datos.cerradas ?? [];
  indicador(t('cartera.indicador.posiciones'), String(posiciones.length),
    cerradas.length
      ? t('cartera.indicador.posiciones.liquidadas', { n: cerradas.length })
      : t('cartera.indicador.posiciones.nota'));
  /* La caja se declara en el cuadro de mando o no se declara: es la diferencia
     entre una cartera invertida y otra que no lo está, y el rótulo dice de qué
     total habla cada cifra. */
  const caja = datos.liquidez;
  if (caja && Number.isFinite(caja.pesoActual)) {
    indicador(t('cartera.indicador.liquidez'), porcentaje(caja.pesoActual),
      t('cartera.indicador.liquidez.nota', { capital: porcentaje(caja.pesoCapital) }));
  }

  const sharpePendiente = retenidaPorMuestra(e.muestra, 'ratioSharpe');
  indicador(t('cartera.indicador.sharpe'), formatearNumero(e.ratioSharpe),
    sharpePendiente
      ? notaMuestra(sharpePendiente)
      : t('cartera.indicador.sharpe.nota', { tasa: porcentaje(e.tasaLibreRiesgo, 1) }));
  indicador(t('cartera.indicador.maximaCaida'), formatearPorcentaje(e.maximaCaida),
    t('cartera.indicador.maximaCaida.nota'));
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

/**
 * Rótulo del benchmark PRINCIPAL —nombre y símbolo, los dos del servidor—, para
 * los sub-estadísticos que `calcularCartera()` computa contra uno solo.
 */
function rotuloBenchmark(datos) {
  return datos.benchmarkNombre
    ? t('cartera.benchmark.rotulo', { nombre: datos.benchmarkNombre, simbolo: datos.benchmark })
    : datos.benchmark;
}

/**
 * El benchmark PRINCIPAL: el que alimenta beta, correlación y rentabilidadIndice,
 * que `calcularCartera()` computa contra uno solo y no contra varios. Es siempre
 * el primero del catálogo —el orden que publica el servidor— que esté activo,
 * nunca el último que se tocó: así encender o apagar un segundo benchmark no le
 * cambia las estadísticas al primero sin que el usuario lo haya pedido.
 */
function benchmarkPrincipal(catalogo) {
  const activo = (catalogo ?? []).find((b) => estado.benchmarksActivos.has(b.simbolo));
  return activo?.simbolo ?? catalogo?.[0]?.simbolo ?? 'SPY';
}

/**
 * Pide la serie cruda de cada benchmark activo que aún no está en caché. Una
 * llamada por símbolo, en paralelo, contra `/api/mercado/serie/:simbolo` —la
 * misma ruta que ya sirve la portada—: ni una segunda arquitectura de datos ni
 * un segundo cálculo de cartera.
 *
 * `dias` cubre el tramo real de la cartera hasta el tope de 400 que la propia
 * ruta impone (`src/routes/mercado.js`): un benchmark no puede tener más
 * historia que la que esa ruta esté dispuesta a servir, y eso es una frontera
 * de la infraestructura existente, no algo que este módulo pueda estirar.
 */
async function cargarSeriesBenchmark(datos) {
  const primera = datos.serie?.[0]?.fecha;
  const dias = primera
    ? Math.min(400, Math.ceil((Date.now() - new Date(`${primera}T00:00:00Z`).getTime()) / 86_400_000) + 5)
    : 180;

  const pendientes = [...estado.benchmarksActivos].filter((s) => !estado.seriesBenchmark.has(s));
  await Promise.all(pendientes.map(async (simbolo) => {
    try {
      const r = await api(`/api/mercado/serie/${encodeURIComponent(simbolo)}?dias=${dias}`);
      estado.seriesBenchmark.set(simbolo, { disponible: true, serie: r.serie ?? [] });
    } catch {
      // Sin serie: se declara N/A en el gráfico y en las tablas, nunca se omite en
      // silencio ni se rellena con la de otro benchmark.
      estado.seriesBenchmark.set(simbolo, { disponible: false, serie: [] });
    }
  }));
}

/**
 * Puebla las píldoras de benchmark desde el catálogo que manda el servidor.
 *
 * No hay lista de índices en el cliente: la había —un mapa de nombres y las
 * opciones de un `<select>` escritas a mano— y era la segunda y la tercera
 * copia de un hecho que ya declaraba `src/routes/mercado.js`.
 *
 * Cada píldora es un `<button aria-pressed>` real, operable por teclado. La
 * cartera no es una píldora más: es la serie protagonista y siempre está
 * visible, así que no lleva control propio.
 */
function poblarBenchmarks(catalogo) {
  const cont = $('#pastillas-benchmark');
  if (!cont || !catalogo?.length) return;

  // Los símbolos que ya no están en el catálogo se sueltan del conjunto activo.
  const vigentes = new Set(catalogo.map((b) => b.simbolo));
  for (const s of [...estado.benchmarksActivos]) if (!vigentes.has(s)) estado.benchmarksActivos.delete(s);

  cont.textContent = '';
  for (const b of catalogo) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'pastilla-benchmark';
    boton.dataset.simbolo = b.simbolo;
    const activo = estado.benchmarksActivos.has(b.simbolo);
    boton.setAttribute('aria-pressed', String(activo));
    // El mismo rótulo compuesto que llevan las cifras, del mismo diccionario.
    boton.textContent = t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo });
    boton.addEventListener('click', () => alPulsarPastillaBenchmark(b.simbolo));
    cont.appendChild(boton);
  }
}

/** Alterna un benchmark y decide si hace falta recargar la cartera entera. */
async function alPulsarPastillaBenchmark(simbolo) {
  const principalAntes = estado.cartera?.benchmark;
  if (estado.benchmarksActivos.has(simbolo)) estado.benchmarksActivos.delete(simbolo);
  else estado.benchmarksActivos.add(simbolo);

  const boton = $(`.pastilla-benchmark[data-simbolo="${CSS.escape(simbolo)}"]`);
  if (boton) boton.setAttribute('aria-pressed', String(estado.benchmarksActivos.has(simbolo)));

  if (!estado.cartera) return;

  // El principal solo cambia si el que se tocó desplazó al que ya lo era: eso
  // recalcula beta/correlación en el servidor. Cualquier otro toque es puramente
  // de cliente: la cartera y sus estadísticos no se mueven.
  const principalDespues = benchmarkPrincipal(estado.catalogoBenchmarks);
  if (principalDespues !== principalAntes) {
    await cargarCartera({ silencioso: true });
    return;
  }
  await cargarSeriesBenchmark(estado.cartera);
  pintarGrafico(estado.cartera);
}

/** Series de los benchmarks activos, alineadas contra `filtrada` y a base 100. */
function benchmarksActivosParaGrafico(datos, filtrada) {
  return (estado.catalogoBenchmarks ?? [])
    .filter((b) => estado.benchmarksActivos.has(b.simbolo))
    .map((b) => {
      const entrada = estado.seriesBenchmark.get(b.simbolo);
      if (!entrada) return { simbolo: b.simbolo, nombre: b.nombre, disponible: false, serie: [] };
      const alineada = alinearContraMaestra(filtrada, entrada.serie);
      return {
        simbolo: b.simbolo, nombre: b.nombre,
        disponible: entrada.disponible, serie: rebasarBase100(alineada),
      };
    });
}

function pintarGrafico(datos) {
  const contenedor = $('#grafico');
  if (!estado.grafico) estado.grafico = new GraficoCartera(contenedor);

  const filtrada = filtrarPorRango(datos.serie, estado.rangoGrafico);
  /*
   * Un rango que abarca la serie entera NO se rebasa. La cartera ya está en base
   * 100 = capital, y rebasarla a su primer punto descartaría el movimiento de la
   * sesión de alta —que es rendimiento real, porque el precio de compra no es el
   * cierre de esa jornada— y publicaría una cifra distinta de la rentabilidad
   * total. Un rango parcial sí se rebasa: ahí la pregunta es otra, cuánto ha
   * hecho la cartera en ese tramo, y así se compara con los benchmarks.
   */
  const completa = Boolean(filtrada.length) && filtrada[0].fecha === datos.serie?.[0]?.fecha;
  const baseCapital = datos.baseCapital ?? 100;
  const serie = completa ? filtrada : rebasarBase100(filtrada);
  const benchmarks = benchmarksActivosParaGrafico(datos, filtrada);

  estado.grafico.actualizar(serie, benchmarks);

  $('#subtitulo-grafico').textContent = completa
    ? t('cartera.grafico.subtitulo.completa', {
      n: serie.length, base: formatearNumero(baseCapital, 0),
    })
    : t('cartera.grafico.subtitulo.serie', {
      n: serie.length, fecha: formatearFecha(serie[0]?.fecha),
    });

  pintarLeyenda(serie, benchmarks, {
    base: completa ? baseCapital : null,
    desde: serie[0]?.fecha,
  });
  pintarTablaRendimiento(serie, benchmarks);
  pintarTablaSerie(serie, benchmarks);
}

function pintarLeyenda(serie, benchmarks, medida = {}) {
  const leyenda = $('#leyenda-grafico');
  leyenda.textContent = '';

  // `base` fija desde dónde se mide. Sin ella, desde el primer punto del rango.
  const entrada = (nombre, valores, esIndice, base = null) => {
    const conValor = (valores ?? []).filter((p) => Number.isFinite(p.valor));
    if (!conValor.length) return;
    const el = elemento('span', 'leyenda__elemento');
    el.appendChild(elemento('span', `leyenda__clave${esIndice ? ' leyenda__clave--indice' : ''}`));
    el.appendChild(elemento('span', null, nombre));
    const partida = base ?? conValor[0].valor;
    const variacion = partida > 0 ? (conValor[conValor.length - 1].valor / partida - 1) * 100 : null;
    el.appendChild(elemento('strong', `leyenda__valor ${claseVariacion(variacion)}`, formatearPorcentaje(variacion)));
    leyenda.appendChild(el);
  };

  entrada(t('cartera.leyenda.cartera'), serie, false, medida.base);
  for (const b of benchmarks) {
    entrada(t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo }), b.serie, true);
  }

  /* Desde dónde se mide, dicho en la propia leyenda: sobre la serie completa la
     cifra es la rentabilidad total y coincide con el titular, pero en un rango
     parcial es lo hecho en ese tramo, y sin rótulo se lee como si fuera total. */
  if (!serie?.length) return;
  leyenda.appendChild(elemento('span', 'leyenda__medida', medida.base
    ? t('cartera.leyenda.medida.total')
    : t('cartera.leyenda.medida.rango', { fecha: formatearFecha(medida.desde) })));
}

/**
 * Rentabilidad de una serie ya rebasada, desde su primer punto CON valor hasta
 * el último. `null` si no hay ni dos puntos con valor —no hay tramo que medir.
 */
function retornoDeSerie(serie) {
  const conValor = (serie ?? []).filter((p) => Number.isFinite(p.valor));
  if (conValor.length < 2) return null;
  const inicio = conValor[0].valor;
  const fin = conValor[conValor.length - 1].valor;
  return inicio > 0 ? (fin / inicio - 1) * 100 : null;
}

/**
 * Asset / Start / Current / Return, una fila por serie activa, y el
 * outperformance de la cartera contra el benchmark PRINCIPAL —el mismo que fija
 * beta y correlación arriba, por la regla del hecho único: no tendría sentido
 * decir «supera al índice» con un número y a la vez fijar el beta contra otro.
 *
 * `Start` nunca se escribe «100,00» a mano: sale de `retornoDeSerie`/`serie[0]`
 * como cualquier otra cifra, para que si el rebase cambiara de base algún día
 * esta tabla no mienta sola.
 */
function pintarTablaRendimiento(serie, benchmarks) {
  const cuerpo = $('#cuerpo-tabla-rendimiento');
  if (!cuerpo) return;
  cuerpo.textContent = '';

  const fila = (nombre, valores) => {
    const conValor = (valores ?? []).filter((p) => Number.isFinite(p.valor));
    const tr = document.createElement('tr');
    tr.appendChild(elemento('td', null, nombre));
    tr.appendChild(elemento('td', 'num', conValor.length ? formatearNumero(conValor[0].valor) : '—'));
    tr.appendChild(elemento('td', 'num', conValor.length ? formatearNumero(conValor[conValor.length - 1].valor) : '—'));
    const retorno = retornoDeSerie(valores);
    tr.appendChild(elemento('td', `num ${claseVariacion(retorno)}`, formatearPorcentaje(retorno)));
    cuerpo.appendChild(tr);
  };

  fila(t('cartera.leyenda.cartera'), serie);
  for (const b of benchmarks) {
    fila(t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo }), b.serie);
  }

  const principal = benchmarks.find((b) => b.simbolo === estado.cartera?.benchmark) ?? benchmarks[0];
  const bloque = $('#bloque-outperformance');
  bloque?.remove();
  if (!principal) return;

  const retornoCartera = retornoDeSerie(serie);
  const retornoPrincipal = retornoDeSerie(principal.serie);
  const outperformance = Number.isFinite(retornoCartera) && Number.isFinite(retornoPrincipal)
    ? retornoCartera - retornoPrincipal
    : null;

  const p = elemento('p', 'outperformance', null);
  p.id = 'bloque-outperformance';
  p.appendChild(document.createTextNode(t('cartera.outperformance.rotulo', {
    nombre: principal.nombre, simbolo: principal.simbolo,
  })));
  const cifra = Number.isFinite(outperformance)
    ? `${outperformance > 0 ? '+' : outperformance < 0 ? '−' : ''}${formatearNumero(Math.abs(outperformance))} pp`
    : '—';
  p.appendChild(elemento('strong', claseVariacion(outperformance), cifra));
  cuerpo.closest('table')?.insertAdjacentElement('afterend', p);
}

/** Cabecera y cuerpo de la tabla desplegable: Fecha, Cartera y una columna por benchmark activo. */
function pintarTablaSerie(serie, benchmarks) {
  const cabecera = $('#cabecera-tabla-serie');
  const cuerpo = $('#cuerpo-tabla-serie');
  if (!cabecera || !cuerpo) return;
  cabecera.textContent = '';
  cuerpo.textContent = '';

  cabecera.appendChild(elemento('th', null, t('cartera.serie.fecha')));
  cabecera.firstChild.setAttribute('scope', 'col');
  const thCartera = elemento('th', 'num', t('cartera.serie.cartera'));
  thCartera.setAttribute('scope', 'col');
  cabecera.appendChild(thCartera);
  for (const b of benchmarks) {
    const th = elemento('th', 'num', t('cartera.benchmark.rotulo', { nombre: b.nombre, simbolo: b.simbolo }));
    th.setAttribute('scope', 'col');
    cabecera.appendChild(th);
  }

  const porFecha = benchmarks.map((b) => new Map(b.serie.map((p) => [p.fecha, p.valor])));

  // Orden descendente: la sesion mas reciente encabeza la tabla.
  for (const p of [...serie].reverse()) {
    const fila = document.createElement('tr');
    fila.appendChild(elemento('td', null, formatearFecha(p.fecha)));
    fila.appendChild(elemento('td', 'num', formatearNumero(p.valor)));
    for (const mapa of porFecha) {
      const v = mapa.get(p.fecha);
      fila.appendChild(elemento('td', 'num', Number.isFinite(v) ? formatearNumero(v) : '—'));
    }
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
  celda.setAttribute('title',
    t('cartera.recorrido.title', { avance: porcentaje(avance * 100) }));
  return celda;
}

/**
 * Fila de detalle expandible: lo que sobraba de las dos tablas separadas —
 * recorrido a TP, take profit, precio objetivo y recomendación de las
 * abiertas; fecha de cierre y motivo de las cerradas— sin segunda fuente,
 * de los mismos campos de `p` que ya pintó la fila principal.
 *
 * Varios paneles pueden estar abiertos a la vez: cada fila lleva su propio
 * estado en su botón (`aria-expanded`) y no cierra a las demás al abrirse.
 * Es una tabla de lectura comparativa —se abre una posición para ver por qué
 * rindió lo que rindió mientras se sigue viendo la fila de al lado—, y
 * obligar a una sola abierta estorbaría justo esa comparación.
 */
function filaDetalle(p, idDetalle) {
  const fila = document.createElement('tr');
  fila.id = idDetalle;
  fila.className = 'fila-cartera__detalle';
  fila.hidden = true;

  const celda = document.createElement('td');
  celda.colSpan = 7;

  const lista = elemento('dl', 'fila-cartera__panel');
  const par = (etiqueta, valor) => {
    lista.appendChild(elemento('dt', null, etiqueta));
    const dd = document.createElement('dd');
    if (valor instanceof Node) dd.appendChild(valor);
    else dd.textContent = valor;
    lista.appendChild(dd);
  };

  par(t('cartera.fila.detalle.alta'), formatearFecha(p.fechaEntrada ?? p.fechaAlta));

  if (p.cerrada) {
    par(t('cartera.fila.detalle.cierre'), formatearFecha(p.fechaCierre));
    par(t('cartera.cerradas.col.motivo'),
      p.motivoCierre ? etiquetaMotivoCierre(p.motivoCierre) : t('cartera.cerradas.motivo'));
  } else {
    par(t('cartera.col.takeProfit'), formatearMoneda(p.takeProfit, p.divisa));
    par(t('cartera.col.recorrido'), celdaRecorrido(p).firstChild ?? document.createTextNode('—'));
    par(t('cartera.col.precioObjetivo'), formatearMoneda(p.precioObjetivo, p.divisa));
    par(t('cartera.col.recomendacion'), p.recomendacion ? etiquetaRecomendacion(p.recomendacion) : '—');
  }

  celda.appendChild(lista);
  fila.appendChild(celda);
  return fila;
}

/**
 * Tabla única de posiciones, abiertas y cerradas fundidas por `Status`.
 *
 * Antes eran dos tablas —`pintarPosiciones()` y `pintarCerradas()`— con
 * columnas propias cada una. Fundidas, las columnas comunes (peso, compra,
 * actual/salida, rentabilidad, contribución) se leen de un único cálculo
 * —`pesoVigente`/`peso`, `contribucionPct`— para las dos clases de fila, y lo
 * que solo aplicaba a una pasa a `filaDetalle()`.
 */
function pintarTablaCartera(datos) {
  const cuerpo = $('#cuerpo-posiciones');
  cuerpo.textContent = '';

  const posiciones = datos.posiciones ?? [];
  const cerradas = datos.cerradas ?? [];
  const filas = [...posiciones, ...cerradas];

  for (const p of filas) {
    const cerrada = cerradas.includes(p);
    const idDetalle = `detalle-${cerrada ? 'cerrada' : 'abierta'}-${p.ticker}`;

    const fila = document.createElement('tr');
    if (cerrada) fila.className = 'cerrada';

    const celdaPosicion = elemento('td', 'celda-empresa celda-valor');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'fila-cartera__despliegue';
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-controls', idDetalle);
    boton.setAttribute('aria-label', t('cartera.fila.desplegar', { ticker: p.ticker }));
    boton.appendChild(elemento('span', 'fila-cartera__glifo', '+'));
    const textoPosicion = elemento('span', null);
    textoPosicion.appendChild(document.createTextNode(p.empresa));
    textoPosicion.appendChild(elemento('small', null,
      `${p.ticker}${p.sector ? ` · ${etiquetaSector(p.sector)}` : ''}`));
    boton.appendChild(textoPosicion);
    celdaPosicion.appendChild(boton);
    fila.appendChild(celdaPosicion);

    fila.appendChild(elemento('td', 'fila-cartera__estado',
      t(cerrada ? 'cartera.estado.cerrada' : 'cartera.estado.abierta')));
    fila.appendChild(elemento('td', 'num', porcentaje(p.pesoVigente ?? p.peso)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioEntrada, p.divisa)));
    fila.appendChild(elemento('td', 'num',
      formatearMoneda(cerrada ? p.precioCierre : p.precioActual, p.divisa)));
    fila.appendChild(elemento('td', `num ${claseVariacion(p.rentabilidadPct)}`,
      formatearPorcentaje(p.rentabilidadPct)));
    fila.appendChild(elemento('td', `num ${claseVariacion(p.contribucionPct)}`,
      Number.isFinite(p.contribucionPct) ? formatearPorcentaje(p.contribucionPct) : '—'));

    cuerpo.appendChild(fila);

    const panel = filaDetalle({ ...p, cerrada }, idDetalle);
    cuerpo.appendChild(panel);

    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      boton.querySelector('.fila-cartera__glifo').textContent = abierto ? '+' : '–';
      panel.hidden = abierto;
    });
  }
}

/**
 * Lo que el plegable de metodología pinta desde los datos.
 *
 * Dos notas que estaban sueltas en la sección: la explicación de los suelos de
 * muestra —que iba bajo los estadísticos— y la de la liquidez —que iba bajo el
 * anillo—. Se mueven aquí porque en su sitio repetían lo que la propia celda ya
 * dice: cada estadístico retenido declara ya cuántas sesiones le faltan, y la
 * casilla de la caja ya lleva su peso. Lo que estas dos añaden es POR QUÉ existe
 * ese mínimo y por qué las dos cifras de la caja difieren, que es método, no
 * dato, y el método vive en este bloque.
 *
 * Ninguna se redacta aquí: son las mismas claves que ya existían.
 */
function pintarMetodologia(datos) {
  const destino = $('#metodologia-dinamica');
  if (!destino) return;
  destino.textContent = '';

  const e = datos.estadisticos;
  if (e?.muestra && !e.muestra.suficiente) {
    destino.appendChild(elemento('p', null, t('cartera.muestra.explicacion', {
      anualizada: e.muestra.suelos.anualizada.minimas,
      ratios: e.muestra.suelos.ratios.minimas,
      sesiones: e.muestra.sesiones,
    })));
  }

  const caja = datos.liquidez;
  if (caja && Number.isFinite(caja.pesoActual)) {
    destino.appendChild(elemento('p', null, caja.tramosLiquidados > 0
      ? t('cartera.liquidez.nota', {
        n: caja.tramosLiquidados, capital: porcentaje(caja.pesoCapital) })
      : t('cartera.liquidez.nota.sinLiquidar', { capital: porcentaje(caja.pesoCapital) })));
  }
}


/**
 * Análisis de contribución: una barra horizontal por posición, abierta o
 * cerrada, ordenada de mayor a menor `contribucionPct` — la misma cifra que
 * pinta la tabla de conciliación de abajo, en la misma unidad (puntos del
 * índice base 100). No es una segunda fuente: es la MISMA columna, vista como
 * barra en vez de como número. SVG a mano no hacía falta — la plataforma ya
 * resuelve una magnitud proporcional con una `<div>` de ancho relativo en
 * `celdaRecorrido()`; aquí se reutiliza la misma idea, dos tramos que
 * divergen desde un eje central en vez de uno que avanza desde cero.
 */
function pintarContribucion(datos) {
  const destino = $('#contribucion-barras');
  if (!destino) return;
  destino.textContent = '';

  const lineas = [...(datos.posiciones ?? []), ...(datos.cerradas ?? [])]
    .filter((p) => Number.isFinite(p.contribucionPct))
    .sort((a, b) => b.contribucionPct - a.contribucionPct);
  if (!lineas.length) return;

  const maxAbs = Math.max(...lineas.map((p) => Math.abs(p.contribucionPct)), 0.0001);

  for (const p of lineas) {
    const fila = elemento('div', 'contribucion-fila');
    fila.appendChild(elemento('span', 'contribucion-fila__ticker', p.ticker));

    const pista = elemento('div', 'contribucion-fila__pista');
    const barra = elemento('div',
      `contribucion-fila__barra contribucion-fila__barra--${p.contribucionPct >= 0 ? 'alza' : 'baja'}`);
    barra.style.width = `${(Math.abs(p.contribucionPct) / maxAbs) * 50}%`;
    pista.appendChild(barra);
    fila.appendChild(pista);

    fila.appendChild(elemento('span', `contribucion-fila__valor ${claseVariacion(p.contribucionPct)}`,
      formatearPorcentaje(p.contribucionPct)));
    destino.appendChild(fila);
  }
}

/**
 * Conciliación de la rentabilidad, línea por línea.
 *
 * Cada tramo aporta su peso de capital por su rentabilidad, y la fila de total
 * cierra la cuenta. Esa cifra tiene que ser la misma que encabeza el cuadro de
 * mando: se suma aquí, a partir de lo que la tabla enseña, y no se copia del
 * titular; si un día dejan de coincidir, la tabla lo enseñará en vez de taparlo.
 */
function pintarConciliacion(datos) {
  const cuerpo = $('#cuerpo-conciliacion');
  const pie = $('#pie-conciliacion');
  const nota = $('#nota-conciliacion');
  if (!cuerpo || !pie) return;

  cuerpo.textContent = '';
  pie.textContent = '';
  if (nota) nota.textContent = '';

  const lineas = [...(datos.posiciones ?? []), ...(datos.cerradas ?? [])]
    .sort((a, b) => (b.contribucionPct ?? 0) - (a.contribucionPct ?? 0));
  if (!lineas.length) return;

  /* De dónde sale el precio con el que se valora la línea. Sin eso, la columna es
     una cifra sin procedencia y la cuenta no se puede seguir a mano. */
  const rotuloFuente = (p) => {
    if (p.fuentePrecio === 'salida') {
      return t('cartera.conciliacion.fuente.salida', { fecha: formatearFecha(p.fechaCierre) });
    }
    if (p.fuentePrecio === 'cotizacion') return t('cartera.conciliacion.fuente.cotizacion');
    if (p.fuentePrecio === 'cierre') {
      return t('cartera.conciliacion.fuente.cierre', { fecha: formatearFecha(datos.estadisticos?.fin) });
    }
    return t('cartera.conciliacion.fuente.ausente');
  };

  for (const p of lineas) {
    const fila = document.createElement('tr');

    const valor = elemento('td', 'celda-empresa celda-valor');
    valor.appendChild(document.createTextNode(p.empresa));
    valor.appendChild(elemento('small', null,
      `${p.ticker}${p.sector ? ` · ${etiquetaSector(p.sector)}` : ''}`));
    if (p.cerrada) valor.appendChild(elemento('span', 'distintivo', t('cartera.conciliacion.enCaja')));
    fila.appendChild(valor);

    fila.appendChild(elemento('td', 'num', porcentaje(p.peso)));
    fila.appendChild(elemento('td', 'num', formatearMoneda(p.precioEntrada, p.divisa)));

    const referencia = elemento('td', 'num', formatearMoneda(p.precioReferencia, p.divisa));
    referencia.appendChild(elemento('small', 'dato-fuente', rotuloFuente(p)));
    fila.appendChild(referencia);

    fila.appendChild(elemento('td', `num ${claseVariacion(p.rentabilidadPct)}`,
      formatearPorcentaje(p.rentabilidadPct)));
    fila.appendChild(elemento('td', 'num', formatearNumero(p.valorTramo)));
    fila.appendChild(elemento('td', `num ${claseVariacion(p.contribucionPct)}`,
      formatearPorcentaje(p.contribucionPct)));

    cuerpo.appendChild(fila);
  }

  const pesoDesplegado = lineas.reduce((a, p) => a + (p.peso ?? 0), 0);
  const valorDesplegado = lineas.reduce((a, p) => a + (p.valorTramo ?? 0), 0);
  const contribuciones = lineas.reduce((a, p) => a + (p.contribucionPct ?? 0), 0);
  // Capital que ninguna tesis llegó a reclamar: sin su fila, la columna de valor
  // no cerraría con el patrimonio.
  const sinDesplegar = Math.max(100 - pesoDesplegado, 0);

  const filaTexto = (celdas) => {
    const fila = document.createElement('tr');
    for (const c of celdas) fila.appendChild(c);
    return fila;
  };

  if (sinDesplegar > 0.005) {
    const valor = elemento('td', 'celda-empresa celda-valor');
    valor.appendChild(document.createTextNode(t('cartera.conciliacion.sinDesplegar')));
    valor.appendChild(elemento('small', null, t('cartera.conciliacion.sinDesplegar.detalle')));
    cuerpo.appendChild(filaTexto([
      valor,
      elemento('td', 'num', porcentaje(sinDesplegar)),
      elemento('td', 'num', '—'),
      elemento('td', 'num', '—'),
      elemento('td', 'num', '—'),
      elemento('td', 'num', formatearNumero(sinDesplegar)),
      elemento('td', `num ${claseVariacion(0)}`, formatearPorcentaje(0)),
    ]));
  }

  const rotuloTotal = elemento('td', 'celda-total');
  rotuloTotal.appendChild(document.createTextNode(t('cartera.conciliacion.total')));
  rotuloTotal.appendChild(elemento('small', null, t('cartera.conciliacion.total.nota', {
    n: lineas.length, base: formatearNumero(datos.baseCapital ?? 100, 0),
  })));

  pie.appendChild(filaTexto([
    rotuloTotal,
    elemento('td', 'num', porcentaje(pesoDesplegado + sinDesplegar)),
    elemento('td', 'num', '—'),
    elemento('td', 'num', '—'),
    elemento('td', 'num', '—'),
    elemento('td', 'num', formatearNumero(valorDesplegado + sinDesplegar)),
    elemento('td', `num ${claseVariacion(contribuciones)}`, formatearPorcentaje(contribuciones)),
  ]));

  if (!nota) return;
  const caja = datos.liquidez;
  nota.textContent = caja?.tramosLiquidados
    ? t('cartera.conciliacion.nota', {
      n: caja.tramosLiquidados,
      capital: porcentaje(caja.pesoCapital),
      importe: formatearNumero(caja.importe),
      patrimonio: porcentaje(caja.pesoActual),
    })
    : t('cartera.conciliacion.nota.sinCaja');
}

function pintarEstadisticos(datos) {
  const rejilla = $('#rejilla-estadisticos');
  rejilla.textContent = '';
  const e = datos.estadisticos;

  if (!e) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, t('cartera.estadisticos.vacio.titulo')));
    vacio.appendChild(document.createTextNode(t('cartera.estadisticos.vacio.detalle')));
    rejilla.appendChild(vacio);
    return;
  }

  const nombreIndice = rotuloBenchmark(datos);
  $('#sub-estadisticos').textContent = t('cartera.estadisticos.periodo', {
    n: e.sesiones,
    inicio: formatearFecha(e.inicio),
    fin: formatearFecha(e.fin),
    indice: nombreIndice,
  });

  // El ticker del índice no se traduce —es un nombre—, pero la frase que lo
  // rodea sí, de modo que viaja como parámetro de la plantilla.
  const sesion = t('cartera.metrica.sesion.nota');
  /* Las catorce métricas, agrupadas por lo que preguntan.

     No es adorno de maqueta: eran catorce celdas iguales en una rejilla de seis
     columnas, o sea dos filas llenas y dos huérfanas, y la asimetría empujaba a
     inventarse cuatro cifras más para cuadrarla. Agrupadas, la simetría deja de
     ser la pregunta —nadie cuenta si una banda tiene cuatro o cinco— y no hace
     falta añadir ninguna cifra que la muestra no sostenga.

     Cinco de las catorce están hoy retenidas por suelo de muestra, y agrupar las
     reparte por banda en vez de salpicarlas. */
  const grupos = [
    [t('cartera.grupo.rentabilidad'), [
    [t('cartera.metrica.rentabilidadTotal'), formatearPorcentaje(e.rentabilidadTotal),
      t('cartera.metrica.rentabilidadTotal.nota'), e.rentabilidadTotal],
    [t('cartera.metrica.rentabilidadAnualizada'), formatearPorcentaje(e.rentabilidadAnualizada),
      t('cartera.metrica.rentabilidadAnualizada.nota'), e.rentabilidadAnualizada, 'rentabilidadAnualizada'],
    [t('cartera.metrica.rentabilidadIndice', { indice: datos.benchmark }), formatearPorcentaje(e.rentabilidadIndice),
      t('cartera.metrica.rentabilidadIndice.nota'), e.rentabilidadIndice],
    [t('cartera.metrica.alfa'), formatearPorcentaje(e.alfaJensen),
      t('cartera.metrica.alfa.nota'), e.alfaJensen, 'alfaJensen'],
    ]],

    [t('cartera.grupo.riesgo'), [
    [t('cartera.metrica.volatilidad'), formatearPorcentaje(e.volatilidadAnualizada, false),
      t('cartera.metrica.volatilidad.nota')],
    [t('cartera.metrica.sharpe'), formatearNumero(e.ratioSharpe),
      t('cartera.metrica.sharpe.nota', { tasa: porcentaje(e.tasaLibreRiesgo, 1) }), undefined, 'ratioSharpe'],
    [t('cartera.metrica.sortino'), formatearNumero(e.ratioSortino),
      t('cartera.metrica.sortino.nota'), undefined, 'ratioSortino'],
    [t('cartera.metrica.calmar'), formatearNumero(e.ratioCalmar),
      t('cartera.metrica.calmar.nota'), undefined, 'ratioCalmar'],
    [t('cartera.metrica.maximaCaida'), formatearPorcentaje(e.maximaCaida),
      t('cartera.metrica.maximaCaida.nota', {
        desde: formatearFecha(e.maximaCaidaDesde), hasta: formatearFecha(e.maximaCaidaHasta),
      })],
    ]],

    [t('cartera.grupo.indice'), [
    [t('cartera.metrica.beta'), formatearNumero(e.beta),
      t('cartera.metrica.beta.nota', { indice: datos.benchmark }), undefined, 'beta'],
    [t('cartera.metrica.correlacion'), formatearNumero(e.correlacionIndice),
      t('cartera.metrica.correlacion.nota', { indice: datos.benchmark }), undefined, 'correlacionIndice'],
    ]],

    [t('cartera.grupo.sesiones'), [
    [t('cartera.metrica.sesionesPositivas'), formatearPorcentaje(e.sesionesPositivasPct, false),
      t('cartera.metrica.sesionesPositivas.nota')],
    [t('cartera.metrica.mejorSesion'), formatearPorcentaje(e.mejorSesion), sesion, e.mejorSesion],
    [t('cartera.metrica.peorSesion'), formatearPorcentaje(e.peorSesion), sesion, e.peorSesion],
    ]],
  ];

  /* Una cifra retenida por el suelo de muestra no lleva su nota de siempre —que
     hablaría de un dato que no está— sino las sesiones que le faltan. La quinta
     posición de cada métrica la nombra; el resto no la necesita. */
  for (const [titulo, metricas] of grupos) {
    const grupo = elemento('section', 'grupo-estadisticos');
    grupo.appendChild(elemento('h3', 'grupo-estadisticos__titulo', titulo));
    const celdas = elemento('div', 'rejilla-grupo');

    for (const [etiqueta, valor, nota, variacion, clave] of metricas) {
      const retenida = retenidaPorMuestra(e.muestra, clave);
      const bloque = elemento('div', 'estadistico');
      bloque.appendChild(elemento('span', 'estadistico__etiqueta', etiqueta));
      const v = elemento('strong', 'estadistico__valor', valor);
      if (variacion !== undefined) v.className = `estadistico__valor ${claseVariacion(variacion)}`;
      bloque.appendChild(v);
      const alPie = retenida ? notaMuestra(retenida) : nota;
      if (alPie) bloque.appendChild(elemento('span', `estadistico__nota${retenida ? ' estadistico__nota--pendiente' : ''}`, alPie));
      celdas.appendChild(bloque);
    }
    grupo.appendChild(celdas);
    rejilla.appendChild(grupo);
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

  $('#estado-datos').textContent = t('cartera.estado.actualizado', { hora });
  $('#pie-fuente').textContent = fuentes.length
    ? t('cartera.pie.fuente', {
        fuentes: fuentes.join(', '),
        momento: momento.toLocaleString(localeFormato()),
      })
    : '';
}


// ══════════════════════════════ noticias ═════════════════════════════════

const CLASE_RELEVANCIA = { urgente: 'fila-noticia--urgente', alta: '', normal: '' };

/**
 * Denominación visible de un nivel de relevancia.
 *
 * Tabla con las claves escritas, y no `noticias.relevancia.${nivel}`: así
 * quedan a la vista de quien lea el fichero y de la prueba de paridad. Es la
 * misma pauta de `CLAVES_ACCESO`, y por la misma razón.
 *
 * El rótulo del servidor queda de reserva: llega siempre en castellano, de modo
 * que solo se usa para un nivel que esta tabla no recoja.
 */
const CLAVES_RELEVANCIA = {
  normal: 'noticias.relevancia.normal',
  alta: 'noticias.relevancia.alta',
  urgente: 'noticias.relevancia.urgente',
};

function etiquetaRelevancia(nivel, vocabulario = estado.vocabulariosNoticias) {
  if (CLAVES_RELEVANCIA[nivel]) return t(CLAVES_RELEVANCIA[nivel]);
  return vocabulario?.etiquetasRelevancia?.[nivel] ?? nivel;
}

/**
 * Denominación visible de una categoría de noticia.
 *
 * El servidor guarda la categoría con su nombre castellano, que hace de clave
 * estable —así lo almacena la base y así viaja en el filtro—; lo que se traduce
 * es el rótulo. Misma pauta que los niveles de acceso y de relevancia.
 */
const CLAVES_CATEGORIA = {
  'Mercados': 'noticias.categoria.mercados',
  'Compañía': 'noticias.categoria.compania',
  'Macroeconomía': 'noticias.categoria.macroeconomia',
  'Sector': 'noticias.categoria.sector',
  'Resultados': 'noticias.categoria.resultados',
  'Operación corporativa': 'noticias.categoria.corporativa',
  'Regulación': 'noticias.categoria.regulacion',
};

const etiquetaCategoria = (categoria) =>
  (CLAVES_CATEGORIA[categoria] ? t(CLAVES_CATEGORIA[categoria]) : categoria);

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
  // «Todas» y «Todos» son dos claves, no una, por lo mismo que en el
  // repositorio: el castellano concuerda con el sustantivo elidido.
  const todas = t('noticias.filtro.todas');
  const todos = t('noticias.filtro.todos');
  poblarSelect($('#filtro-noticias-categoria'), v.categorias, todas, etiquetaCategoria);
  poblarSelect($('#filtro-noticias-relevancia'), v.relevancias, todas,
    (r) => etiquetaRelevancia(r, v));
  // Los valores seleccionables son los que ya cubre el repositorio.
  const tickers = estado.vocabularios?.tickers ?? [];
  poblarSelect($('#filtro-noticias-ticker'), tickers, todos);
  poblarSelect($('#filtro-noticias-origen'), v.origenes ?? [], todos,
    (o) => (o === 'manual' ? t('noticias.origen.propio') : o));
}

function poblarFormularioNoticia() {
  const v = estado.vocabulariosNoticias;
  if (!v) return;
  // Conserva la selección: `repintarVistas()` repite esta función en cada
  // cambio de idioma, y repoblar no debe alterar el formulario abierto.
  const cat = $('#campo-noticia-categoria');
  const catPrevia = cat.value;
  cat.textContent = '';
  for (const c of v.categorias) cat.appendChild(opcion(c, etiquetaCategoria(c)));
  if (catPrevia && v.categorias.includes(catPrevia)) cat.value = catPrevia;

  const rel = $('#campo-noticia-relevancia');
  const relPrevia = rel.value;
  rel.textContent = '';
  for (const r of v.relevancias) rel.appendChild(opcion(r, etiquetaRelevancia(r, v)));
  if (relPrevia && v.relevancias.includes(relPrevia)) rel.value = relPrevia;
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
    // Se guarda la carga para repintar el listado al cambiar de idioma sin
    // volver a pedirla: un cambio de rótulos no es un cambio de datos.
    estado.noticias = datos;
    pintarNoticias(datos);
  } catch (err) {
    avisar(err.message);
  } finally {
    rejilla.classList.remove('cargando');
  }
}

/**
 * Cabecera de cifras del hub: total cubierto y categorías activas.
 *
 * Las dos salen de fuentes ya cargadas —paginación de la propia respuesta,
 * vocabulario cargado al arrancar la app— y no se piden aparte. No lleva la
 * hora de sincronización: esa cifra ya vive en `#estado-sincronizacion` y
 * repetirla aquí sería la misma cifra contada dos veces, justo lo que la
 * regla 9 prohíbe.
 */
function pintarMetricasNoticias(paginacion) {
  const caja = $('#noticias-metricas');
  if (!caja) return;
  caja.textContent = '';

  const metrica = (etiqueta, valor, principal = false) => {
    const bloque = elemento('div', `indicador${principal ? ' indicador--principal' : ''}`);
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    bloque.appendChild(elemento('strong', 'indicador__valor', valor));
    caja.appendChild(bloque);
  };

  metrica(t('noticias.hub.total'), String(paginacion.total), true);

  const categorias = estado.vocabulariosNoticias?.categorias?.length;
  if (Number.isFinite(categorias)) {
    metrica(t('noticias.hub.categorias'), String(categorias));
  }
}

/** Pinta el listado de noticias a partir de una carga ya resuelta. */
function pintarNoticias(datos) {
  const listado = $('#rejilla-noticias');
  if (!listado || !datos) return;
  listado.textContent = '';

  if (!datos.noticias.length) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, t('noticias.vacio.titulo')));
    vacio.appendChild(document.createTextNode(t(
      Object.keys(estado.filtrosNoticias).length
        ? 'noticias.vacio.filtrado'
        : 'noticias.vacio.inicial'
    )));
    listado.appendChild(vacio);
    listado.classList.remove('noticias-listado');
  } else {
    listado.classList.add('noticias-listado');
    for (const n of datos.noticias) listado.appendChild(construirFilaNoticia(n));
  }

  const p = datos.paginacion;
  pintarMetricasNoticias(p);

  // El plural lo elige `Intl.PluralRules` sobre las formas de cada idioma, no
  // un `noticia${n === 1 ? '' : 's'}` que impondría la morfología castellana.
  $('#resumen-noticias').textContent = p.total
    ? t('noticias.resumen', {
        n: p.total,
        desde: (p.pagina - 1) * p.limite + 1,
        hasta: Math.min(p.pagina * p.limite, p.total),
      })
    : t('noticias.sinResultados');

  pintarPaginacionGenerica($('#paginacion-noticias'), p, (n) => {
    estado.paginaNoticias = n;
    cargarNoticias();
    $('#seccion-noticias').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** Fila editorial de una noticia, con línea divisoria y sin lenguaje de tarjeta. */
function construirFilaNoticia(n) {
  const fila = elemento('button', `fila-noticia ${CLASE_RELEVANCIA[n.relevancia] ?? ''}`.trim());
  fila.type = 'button';
  fila.addEventListener('click', () => abrirDetalleNoticia(n.id));

  if (n.imagen) {
    const contenedorImagen = elemento('div', 'fila-noticia__imagen');
    const img = document.createElement('img');
    img.src = n.imagen;
    img.alt = n.titular;
    img.loading = 'lazy';
    // Investing.com bloquea el hotlink de imagen desde el navegador (ver
    // tests/repintado.js): sin este manejador, el icono roto deja el `alt`
    // —el titular real, nunca traducido— desbordando la caja de 84px, que a
    // simple vista se lee como si la fila entera se hubiera quedado en
    // español. Retirar el contenedor entero es la misma disciplina que ya
    // sigue el resto de la plataforma con un dato sin fuente: no se rellena
    // con un icono de repuesto, se declara ausente quitándolo de en medio.
    img.addEventListener('error', () => contenedorImagen.remove(), { once: true });
    contenedorImagen.appendChild(img);
    fila.appendChild(contenedorImagen);
  }

  const cuerpo = elemento('div', 'fila-noticia__cuerpo');

  const superior = elemento('div', 'fila-noticia__superior');
  superior.appendChild(elemento('span', null, etiquetaCategoria(n.categoria)));
  if (n.relevancia === 'urgente') superior.appendChild(elemento('span', 'distintivo distintivo--solido', etiquetaRelevancia('urgente')));
  else if (n.relevancia === 'alta') superior.appendChild(elemento('span', 'distintivo distintivo--fuerte', etiquetaRelevancia('alta')));
  if (n.destacada) superior.appendChild(elemento('span', 'distintivo', t('noticias.destacada')));
  cuerpo.appendChild(superior);

  cuerpo.appendChild(elemento('h3', 'fila-noticia__titular', n.titular));
  if (n.entradilla) cuerpo.appendChild(elemento('p', 'fila-noticia__entradilla', n.entradilla));

  const pie = elemento('div', 'fila-noticia__pie');
  pie.appendChild(elemento('span', null, formatearMomento(n)));
  const propia = n.origen === 'manual' || !n.origen;
  pie.appendChild(elemento('span', `origen${propia ? ' origen--propio' : ''}`,
    propia ? t('noticias.origen.propio') : n.fuente || n.origen));
  for (const tk of n.tickers ?? []) pie.appendChild(elemento('span', 'ficha__ticker', tk));
  cuerpo.appendChild(pie);

  fila.appendChild(cuerpo);
  return fila;
}

async function abrirDetalleNoticia(id) {
  const dialogo = $('#dialogo-detalle-noticia');
  const contenido = $('#contenido-detalle-noticia');
  contenido.textContent = '';
  contenido.appendChild(elemento('div', 'detalle', t('noticias.detalle.cargando')));
  dialogo.showModal();

  try {
    const n = await api(`/api/noticias/${id}`);
    contenido.textContent = '';
    contenido.appendChild(construirDetalleNoticia(n));
  } catch (err) {
    contenido.textContent = '';
    const d = elemento('div', 'detalle');
    d.appendChild(elemento('h2', null, t('noticias.detalle.noDisponible')));
    d.appendChild(elemento('p', 'detalle__subtitulo', err.message));
    contenido.appendChild(d);
  }
}

function construirDetalleNoticia(n) {
  const raiz = elemento('div', 'detalle');

  const superior = elemento('div', 'detalle__superior');
  superior.appendChild(elemento('span', 'distintivo', etiquetaCategoria(n.categoria)));
  if (n.relevancia === 'urgente') superior.appendChild(elemento('span', 'distintivo distintivo--solido', etiquetaRelevancia('urgente')));
  else if (n.relevancia === 'alta') superior.appendChild(elemento('span', 'distintivo distintivo--fuerte', etiquetaRelevancia('alta')));
  raiz.appendChild(superior);

  raiz.appendChild(elemento('h2', null, n.titular));

  const meta = [formatearMomento(n), n.autor, n.fuente, n.feed_origen].filter(Boolean);
  raiz.appendChild(elemento('p', 'detalle__subtitulo', meta.join(t('general.separadorLista'))));

  if (n.origen && n.origen !== 'manual') {
    const nota = elemento('p', 'detalle__subtitulo', t('noticias.detalle.sindicada'));
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
    s.appendChild(elemento('h3', null, t('noticias.detalle.valores')));
    const cont = elemento('div', 'detalle__etiquetas');
    for (const tk of n.tickers) {
      const boton = elemento('button', 'pastilla', tk);
      boton.type = 'button';
      boton.addEventListener('click', () => {
        $('#dialogo-detalle-noticia').close();
        $('#filtro-q').value = tk;
        estado.filtros = { q: tk };
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
    s.appendChild(elemento('h3', null, t('noticias.detalle.etiquetas')));
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
    enlace.textContent = t('noticias.detalle.fuenteOriginal');
    pie.appendChild(enlace);
  }
  if (hayCredencial()) {
    const editar = elemento('button', 'boton boton--contorno', t('noticias.detalle.editar'));
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
  reflejarModoFormularioNoticia(editando);
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

/** Los rótulos del formulario de noticia, con la misma pauta y por lo mismo. */
function reflejarModoFormularioNoticia(editando) {
  $('#titulo-dialogo-noticia').textContent =
    t(editando ? 'noticia.titulo.editar' : 'noticia.titulo.publicar');
  $('#btn-guardar-noticia').textContent =
    t(editando ? 'noticia.guardar.cambios' : 'noticia.guardar.publicar');
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
  boton.textContent = t('noticia.guardar.procesando');

  try {
    await api(id ? `/api/noticias/${id}` : '/api/noticias', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(cuerpo),
    });
    $('#dialogo-noticia').close();
    avisar(t(id ? 'noticia.guardado.actualizada' : 'noticia.guardado.publicada'), { claro: true });
    await cargarVocabulariosNoticias();
    await invalidarDerivadasDeNoticias();
  } catch (err) {
    panel.textContent = '';
    panel.appendChild(elemento('strong', null, rotuloError(err.codigo, err.message)));
    if (err.errores?.length) {
      const lista = document.createElement('ul');
      for (const e of err.errores) {
        lista.appendChild(elemento('li', null, rotuloError(e.codigo, e.mensaje)));
        const campo = form.elements[e.campo];
        if (campo) campo.setAttribute('aria-invalid', 'true');
      }
      panel.appendChild(lista);
    }
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    boton.disabled = false;
    boton.textContent = t(id ? 'noticia.guardar.cambios' : 'noticia.guardar.publicar');
  }
}

async function eliminarNoticia() {
  const id = $('#form-noticia').elements.id.value;
  if (!id) return;
  if (!confirm(t('noticia.eliminar.confirmar'))) return;
  try {
    await api(`/api/noticias/${id}`, { method: 'DELETE' });
    $('#dialogo-noticia').close();
    avisar(t('noticia.eliminada'), { claro: true });
    await invalidarDerivadasDeNoticias();
  } catch (err) {
    avisar(err.message);
  }
}


/** Estado de la sindicación automática con Investing.com. */
async function cargarEstadoSincronizacion() {
  const destino = $('#estado-sincronizacion');
  if (!destino) return;
  try {
    // Se guarda para repintar la línea al cambiar de idioma sin volver a pedirla.
    estado.sincronizacion = await api('/api/noticias/sincronizacion');
    pintarEstadoSincronizacion();
  } catch {
    estado.sincronizacion = null;
    destino.textContent = t('noticias.sindicacion.noDisponible');
  }
}

/** Pinta la línea de sindicación a partir del último estado resuelto. */
function pintarEstadoSincronizacion() {
  const destino = $('#estado-sincronizacion');
  const e = estado.sincronizacion;
  if (!destino || !e) return;

  // Cada pieza es un dato independiente, no una frase partida: unirlas con el
  // separador de lista no impone a nadie el orden del castellano.
  const partes = [];
  if (e.ultimaEjecucion) {
    const d = new Date(e.ultimaEjecucion);
    partes.push(t('noticias.sindicacion.actualizado', {
      hora: d.toLocaleString(localeFormato(), { hour: '2-digit', minute: '2-digit' }),
    }));
  }
  partes.push(t('noticias.sindicacion.sindicadas', { n: e.noticiasSindicadas }));
  if (e.noticiasPropias) partes.push(t('noticias.sindicacion.propias', { n: e.noticiasPropias }));
  if (e.automatica) partes.push(t('noticias.sindicacion.cada', { min: Math.round(e.intervaloMs / 60000) }));
  else partes.push(t('noticias.sindicacion.manual'));
  destino.textContent = partes.join(t('general.separadorLista'));

  if (e.incidencias?.length) {
    destino.setAttribute('title', e.incidencias.join(' | '));
  } else {
    destino.removeAttribute('title');
  }
}

/** Fuerza una incorporación inmediata desde los canales de Investing.com. */
async function sincronizarAhora() {
  if (!hayCredencial()) { abrirAcceso(); return; }

  const boton = $('#btn-sincronizar');
  boton.dataset.ocupado = 'true';
  const rotulo = boton.textContent;
  boton.textContent = t('noticias.sindicacion.actualizando');

  try {
    const r = await api('/api/noticias/sincronizar', { method: 'POST', body: JSON.stringify({}) });
    const detalle = r.incorporadas
      ? t('noticias.sindicacion.incorporadas', { n: r.incorporadas })
      : t('noticias.sindicacion.sinNovedades');
    // El aviso viaja entero al diccionario, con su puntuación: partirlo en
    // trozos que el código concatena impondría a todos el orden castellano.
    avisar(r.vinculadas
      ? t('noticias.sindicacion.avisoVinculadas', { detalle, n: r.vinculadas })
      : t('noticias.sindicacion.aviso', { detalle }), { claro: true });

    for (const i of r.incidencias ?? []) {
      avisar(t('noticias.sindicacion.canal', { detalle: i }), { duracion: 8000 });
    }

    await cargarVocabulariosNoticias();
    await cargarEstadoSincronizacion();
    await invalidarDerivadasDeNoticias();
  } catch (err) {
    avisar(rotuloError(err.codigo, err.message), { duracion: 9000 });
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

/** Pinta el flujo a partir de la última carga resuelta. */
function pintarFlujoOpciones() {
  if (estado.opciones.flujo) pintarFlujo($('#contenido-flujo'), estado.opciones.flujo);
}

function pintarEstadoOpciones() {
  const destino = $('#estado-opciones');
  const e = estado.opciones.estado;
  if (!destino || !e) return;
  // El «sesión(es)» de antes era un plural escrito con paréntesis porque el
  // código no podía elegir; ahora lo elige `Intl.PluralRules` por idioma.
  const h = e.historico;
  destino.textContent = t('opciones.estado.proveedor', {
    proveedor: e.proveedores.activo.nombre,
    n: h?.sesiones ?? 0,
  });
}

/** Flujo de operaciones: hoy sin fuente, con su explicación. */
async function cargarFlujoOpciones() {
  const destino = $('#contenido-flujo');
  destino.classList.add('cargando');
  try {
    // Se guarda para repintar al cambiar de idioma sin volver a pedirlo.
    estado.opciones.flujo = await api('/api/opciones/flujo');
    pintarFlujoOpciones();
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
    tabla.appendChild(elemento('p', 'senal__motivo', t('opciones.inusual.consultando')));
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
    caja.appendChild(elemento('span', 'pendiente-bloque__marca', t('opciones.inusual.error.marca')));
    caja.appendChild(elemento('strong', null, t('opciones.inusual.error.titulo')));
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

  const todos = t('opciones.filtro.todos');
  const simbolos = [...new Set(datos.contratos.map((c) => c.simbolo))].sort();
  poblarSelect($('#filtro-op-simbolo'), simbolos, todos);

  const vencimientos = [...new Set(datos.contratos.map((c) => c.vencimiento))].sort();
  poblarSelect($('#filtro-op-vencimiento'), vencimientos, todos, (v) => formatearFecha(v));
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
    resumen.textContent = t('opciones.inusual.resumen', {
      n: filtrados.length, total: datos.evaluados,
    });
  }

  pintarDestacadas($('#rejilla-destacadas'), filtrados, { alSeleccionar: abrirDetalleInusual });
  pintarTablaInusual($('#tabla-inusual'), filtrados, {
    alSeleccionar: abrirDetalleInusual,
    alReordenar: () => aplicarFiltrosOpciones(),
  });
}

/**
 * Pinta la cadena a partir de la última carga resuelta.
 *
 * Las fechas de vencimiento y el resumen siguen al idioma, de modo que esto se
 * repite al conmutar; los datos, no, y por eso no se vuelve a la red. El
 * vencimiento elegido sobrevive porque el desplegable se repuebla conservándolo.
 */
function pintarCadenaOpciones() {
  const cadena = estado.opciones.cadena;
  if (!cadena) return;

  const select = $('#cadena-vencimiento');
  const previo = select.value;
  select.textContent = '';
  for (const v of cadena.vencimientos) select.appendChild(opcion(v, formatearFecha(v)));
  if (previo && cadena.vencimientos.includes(previo)) select.value = previo;

  const vencimiento = select.value || cadena.vencimientos[0];
  pintarCadena($('#tabla-cadena'), cadena, vencimiento);
  pintarMapaInteres($('#mapa-interes'), cadena, vencimiento);

  $('#cadena-estado').textContent = t('opciones.cadena.resumen', {
    contratos: cadena.agregados.contratos,
    precio: formatearNumero(cadena.subyacente.precio),
    vencimientos: cadena.vencimientos.length,
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
  marcador.textContent = t('opciones.cadena.consultando');
  $('#tabla-cadena').classList.add('cargando');

  try {
    const cadena = await api(`/api/opciones/cadena/${encodeURIComponent(simbolo)}`);
    estado.opciones.cadena = cadena;

    pintarCadenaOpciones();
  } catch (err) {
    // Sin cadena válida no hay nada que repintar: se retira la memoria para que
    // un cambio de idioma no resucite la última que sí cargó.
    estado.opciones.cadena = null;
    marcador.textContent = '';
    const destino = $('#tabla-cadena');
    destino.textContent = '';
    const caja = elemento('div', 'pendiente-bloque');
    caja.appendChild(elemento('span', 'pendiente-bloque__marca', t('opciones.cadena.sinDatos.marca')));
    caja.appendChild(elemento('strong', null, t('opciones.cadena.sinDatos.titulo', { simbolo })));
    caja.appendChild(elemento('p', null, rotuloError(err.codigo, err.message)));
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
      pintarAgendaCompleta();
    });
  }
  // Filtro cliente, sin pedir nada nuevo al servidor: la carga ya trae todos
  // los próximos, y la ventana solo recorta lo ya pintado.
  for (const boton of $$('#conmutador-ventana [data-ventana]')) {
    boton.addEventListener('click', () => {
      if (boton.disabled) return;
      estado.catalizadores.ventana = boton.dataset.ventana;
      pintarAgendaCompleta();
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
  $('#campo-ficheros').addEventListener('change', alAdjuntarDocumento);
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
    avisar(t('acceso.cerrada'), { claro: true });
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

  // Las píldoras de benchmark llevan su propio manejador: lo añade
  // `poblarBenchmarks()` a cada botón en cuanto lo pinta, porque el conjunto de
  // botones cambia con el catálogo y no existe uno fijo que delegar aquí.

  const btnTabla = $('#btn-tabla-serie');
  btnTabla.addEventListener('click', () => {
    const tabla = $('#tabla-serie');
    const visible = tabla.hidden;
    tabla.hidden = !visible;
    btnTabla.setAttribute('aria-expanded', String(visible));
    reflejarModoTablaSerie();
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
  // Lo primero de todo: entre aquí y `irA()` la plataforma existe con su armazón
  // puesto y sin un dato dentro, que es el estado que la capa tapa.
  const carga = iniciarCarga();
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
    // La portada tampoco: se repinta con lo que ya tiene guardado.
    repintarInicio();
    repintarVistas();
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

  await cargarMarca();
  await cargarVocabularios();
  await cargarVocabulariosNoticias();

  // Se espera a que la primera vista esté pintada: es la condición que retira la
  // pantalla de carga, más abajo. Un fallo del cargador no ha de dejar la capa
  // puesta —eso sería tapar el aviso de error con una pantalla de espera—, así
  // que el rechazo se absorbe aquí y la carga se cierra igual.
  await Promise.resolve(irA(seccionDesdeHash(), null, { empujar: false })).catch(() => {});

  // La cartera se precarga aunque la sección visible sea otra. Antes lo hacía
  // `cargarPanel()` de paso, al poblar el Radar; con el Radar oculto hay que
  // pedirla aquí, porque `estado.cartera` lo leen el repintado por idioma, el
  // gráfico al cambiar de modo o de índice, y la cobertura destacada para saber
  // qué tesis están en cartera. Silenciosa: nadie está mirando esa sección.
  cargarCartera({ silencioso: true });

  // Se cierra con la primera vista ya pintada —`irA()` de arriba— y NO se espera
  // a la cartera silenciosa: nadie está mirando esa sección, y encadenarla aquí
  // alargaría la capa por algo que el lector no ve.
  carga.cerrar();

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
