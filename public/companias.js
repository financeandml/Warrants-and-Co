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
import { etiquetaSello, claseSello, etiquetaTipoEvento } from './vocabulario.js';

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

/** Recomendación → lectura direccional. Reutiliza `.lectura` —ya usada en Radar
 * y Signal—, que pone el glifo por CSS (`.lectura--alza::before`); nunca badge
 * sólido, y el signo viaja siempre junto al color, nunca solo — cláusula 1. */
function claseRecomendacion(rec) {
  if (!rec) return 'lectura lectura--nula';
  const r = String(rec).toUpperCase();
  if (/COMPRAR|BUY|OVERWEIGHT|SOBREPONDERAR|ACCUMULATE|ACUMULAR/.test(r)) return 'lectura lectura--alza';
  if (/VENDER|SELL|UNDERWEIGHT|INFRAPONDERAR|REDUCE|REDUCIR/.test(r)) return 'lectura lectura--baja';
  return 'lectura lectura--nula';
}

/**
 * Una tarjeta de compañía, en dos densidades: `completa` (rejilla y destacadas)
 * y `compacta` (cobertura reciente, fila tipográfica sin rejilla de datos).
 * Una sola función: Featured, Latest y Grid pintan la misma tarjeta, nunca
 * cuatro variantes que puedan divergir en lo que cuentan de una compañía.
 */
function tarjetaCompania(c, alAbrir, densidad = 'completa', cargarSerie = null) {
  const tarjeta = elemento('article',
    `tarjeta-compania${densidad === 'compacta' ? ' tarjeta-compania--compacta' : ''}`);
  tarjeta.tabIndex = 0;
  tarjeta.setAttribute('role', 'button');
  tarjeta.setAttribute('aria-label', t('companias.tarjeta.abrir', { empresa: c.empresa }));

  if (densidad === 'completa') {
    // Marca de agua tipográfica: la inicial del ticker (o del nombre, si no hay
    // ticker), en `--acento` a opacidad muy baja. Puro adorno de fondo —por eso
    // `aria-hidden`—, nunca un color por compañía, que sería un sistema nuevo.
    const inicial = (c.ticker || c.empresa || '?').trim().charAt(0).toUpperCase();
    const marca = elemento('span', 'tarjeta-compania__marca', inicial);
    marca.setAttribute('aria-hidden', 'true');
    tarjeta.appendChild(marca);
  }

  const cabecera = elemento('div', 'tarjeta-compania__cabecera');
  const identidad = elemento('div');
  identidad.appendChild(elemento('span', 'tarjeta-compania__ticker', c.ticker ?? '—'));
  identidad.appendChild(elemento('h3', 'tarjeta-compania__nombre', c.empresa));
  cabecera.appendChild(identidad);
  if (c.enCartera) cabecera.appendChild(elemento('span', 'chip chip--cartera', t('companias.enCartera')));
  tarjeta.appendChild(cabecera);

  if (densidad === 'compacta') {
    tarjeta.appendChild(elemento('span', 'tarjeta-compania__fecha',
      formatearFecha(c.ultimaPublicacion)));
  } else {
    const meta = elemento('p', 'tarjeta-compania__meta',
      [c.sector, c.pais].filter(Boolean).join(t('general.separadorLista')) || noDisponible());
    tarjeta.appendChild(meta);

    const datosClave = elemento('div', 'tarjeta-compania__datos');
    datosClave.appendChild(dato(t('companias.dato.recomendacion'),
      c.recomendacion ?? noDisponible(),
      claseRecomendacion(c.recomendacion)));
    datosClave.appendChild(dato(t('companias.dato.objetivo'),
      Number.isFinite(c.precioObjetivo) ? importe(cifra(c.precioObjetivo), c.divisa) : noDisponible()));
    // Cotización y recorrido solo llegan cuando la lista se pidió con
    // `detalle=1` —el listado barato no resuelve proveedor en vivo por
    // compañía—; sin ellos el tercer estado es explícito, nunca un hueco.
    datosClave.appendChild(dato(t('companias.dato.actual'),
      c.cotizacion?.disponible ? importe(cifra(c.cotizacion.precio), c.cotizacion.divisa) : noDisponible()));
    const recorrido = c.recorridoObjetivo;
    datosClave.appendChild(dato(t('companias.dato.recorrido'),
      recorrido?.disponible ? formatearPorcentaje(recorrido.porcentaje) : noDisponible(),
      recorrido?.disponible ? claseVariacion(recorrido.porcentaje) : ''));
    tarjeta.appendChild(datosClave);

    const pie = elemento('div', 'tarjeta-compania__pie');
    pie.appendChild(elemento('span', '',
      t('companias.tarjeta.ultimo', { fecha: formatearFecha(c.ultimaPublicacion) })));
    if (c.totalAdjuntos > 0) {
      pie.appendChild(elemento('span', '', t('companias.tarjeta.documentos', { n: c.totalAdjuntos })));
    }
    pie.appendChild(elemento('span', 'tarjeta-compania__enlace', t('companias.tarjeta.ver')));
    tarjeta.appendChild(pie);

    if (c.ticker && typeof cargarSerie === 'function') {
      tarjeta.appendChild(chispaDiferida(c.ticker, cargarSerie));
    }
  }

  const abrir = () => alAbrir(c.ticker ?? c.clave);
  tarjeta.addEventListener('click', abrir);
  tarjeta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
  });
  return tarjeta;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Sparkline de card, con carga diferida por `IntersectionObserver`: la card se
 * pinta completa desde el primer momento —con la marca de agua tipográfica—, y
 * la petición de serie solo se dispara cuando entra en el viewport. Si falla,
 * tarda o el ticker no tiene serie, el hueco se queda vacío sin más —nunca un
 * error visible ni una carga que bloquee el resto de la tarjeta.
 */
function chispaDiferida(ticker, cargarSerie) {
  const caja = elemento('div', 'tarjeta-compania__chispa');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 28');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const linea = document.createElementNS(SVG_NS, 'polyline');
  linea.setAttribute('class', 'tarjeta-compania__chispa-linea');
  svg.appendChild(linea);
  caja.appendChild(svg);

  const observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      observador.disconnect(); // una sola petición por card, nunca observers colgados.
      cargarSerie(ticker)
        .then((r) => {
          const puntos = trazarPuntos(r?.serie, 100, 28);
          if (!puntos) return; // sin serie utilizable: la card se queda tal cual.
          linea.setAttribute('points', puntos);
          requestAnimationFrame(() => caja.classList.add('tarjeta-compania__chispa--visible'));
        })
        .catch(() => {});
      return;
    }
  }, { rootMargin: '120px' });
  observador.observe(caja);

  return caja;
}

/** Traza una polilínea normalizada al lienzo `ancho×alto` a partir de una serie
 * `{fecha, valor}`. Devuelve `null` si no hay al menos dos puntos con valor. */
function trazarPuntos(serie, ancho, alto) {
  if (!Array.isArray(serie) || serie.length < 2) return null;
  const valores = serie.map((p) => p?.valor).filter(Number.isFinite);
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const n = serie.length;
  return serie
    .map((p, i) => (Number.isFinite(p?.valor)
      ? `${(i / (n - 1)) * ancho},${alto - ((p.valor - min) / rango) * alto}`
      : null))
    .filter(Boolean)
    .join(' ');
}

/**
 * Featured Research, pieza principal: dos columnas, jerarquía muy superior al
 * resto —ticker, nombre y tesis a un lado; recommendation/target/current/upside
 * al otro—. Reutiliza los mismos helpers de formato que `tarjetaCompania`, no
 * inventa una segunda lectura de los mismos campos.
 */
function tarjetaDestacadaPrincipal(c, alAbrir) {
  const pieza = elemento('article', 'destacada-principal');
  pieza.tabIndex = 0;
  pieza.setAttribute('role', 'button');
  pieza.setAttribute('aria-label', t('companias.tarjeta.abrir', { empresa: c.empresa }));

  const izquierda = elemento('div', 'destacada-principal__izquierda');
  izquierda.appendChild(elemento('span', 'destacada-principal__ticker', c.ticker ?? '—'));
  izquierda.appendChild(elemento('h3', 'destacada-principal__nombre', c.empresa));
  const resumen = c.informes?.find((i) => i.resumen)?.resumen;
  izquierda.appendChild(elemento('p', 'destacada-principal__tesis',
    resumen || t('companias.tesis.sinResumen')));
  izquierda.appendChild(elemento('span', 'destacada-principal__enlace', t('companias.tarjeta.ver')));
  pieza.appendChild(izquierda);

  const derecha = elemento('div', 'destacada-principal__derecha');
  derecha.appendChild(dato(t('companias.dato.recomendacion'),
    c.recomendacion ?? noDisponible(), claseRecomendacion(c.recomendacion)));
  derecha.appendChild(dato(t('companias.dato.objetivo'),
    Number.isFinite(c.precioObjetivo) ? importe(cifra(c.precioObjetivo), c.divisa) : noDisponible()));
  derecha.appendChild(dato(t('companias.dato.actual'),
    c.cotizacion?.disponible ? importe(cifra(c.cotizacion.precio), c.cotizacion.divisa) : noDisponible()));
  const recorrido = c.recorridoObjetivo;
  derecha.appendChild(dato(t('companias.dato.recorrido'),
    recorrido?.disponible ? formatearPorcentaje(recorrido.porcentaje) : noDisponible(),
    recorrido?.disponible ? claseVariacion(recorrido.porcentaje) : ''));
  pieza.appendChild(derecha);

  const abrir = () => alAbrir(c.ticker ?? c.clave);
  pieza.addEventListener('click', abrir);
  pieza.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
  });
  return pieza;
}

// ───────────────────────────────── listado ─────────────────────────────────

/** Cabecera del hub: compañías cubiertas, informes, sectores y posiciones activas. */
export function pintarCabeceraCompanias(companias) {
  const caja = $('#companias-metricas');
  if (!caja) return;
  caja.textContent = '';

  const metrica = (etiqueta, valor, nota, principal = false) => {
    const bloque = elemento('div', `indicador${principal ? ' indicador--principal' : ''}`);
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    bloque.appendChild(elemento('strong', 'indicador__valor', valor));
    if (nota) bloque.appendChild(elemento('span', 'indicador__nota', nota));
    caja.appendChild(bloque);
  };

  const total = companias.length;
  const informes = companias.reduce((a, c) => a + (c.totalInformes ?? 0), 0);
  const sectores = new Set(companias.map((c) => c.sector).filter(Boolean)).size;

  // Posiciones activas: `portfolioStatus` solo llega con `datos.fichas`
  // (`detalle=1`); si ninguna compañía lo trae, el motor de cartera no se
  // resolvió en esta carga y la cifra se rotula N/A —tercer estado explícito—
  // en vez de mostrar un cero que afirmaría «cero posiciones abiertas».
  const conEstado = companias.filter((c) => 'portfolioStatus' in c);
  const posiciones = conEstado.length
    ? String(conEstado.filter((c) => c.portfolioStatus === 'OPEN').length)
    : noDisponible();

  metrica(t('companias.hub.cubiertas'), String(total), null, true);
  metrica(t('companias.hub.informes'), String(informes));
  metrica(t('companias.hub.sectores'), String(sectores));
  metrica(t('companias.hub.posiciones'), posiciones, t('companias.hub.posiciones.nota'));
}

/**
 * Featured Research: la destacada más reciente compone una pieza única
 * asimétrica, muy por encima del resto en jerarquía; si hay más destacadas,
 * van debajo en una lista compacta —nunca repetidas a la misma escala.
 */
function pintarDestacadasCompanias(companias, alAbrir) {
  const bloque = $('#bloque-destacadas-companias');
  const caja = $('#destacadas-companias');
  if (!bloque || !caja) return;
  const destacadas = companias
    .filter((c) => c.destacada)
    .sort((a, b) => new Date(b.ultimaPublicacion) - new Date(a.ultimaPublicacion));
  caja.textContent = '';
  bloque.hidden = destacadas.length === 0;
  if (!destacadas.length) return;

  const [principal, ...resto] = destacadas;
  caja.appendChild(tarjetaDestacadaPrincipal(principal, alAbrir));
  if (resto.length) {
    const lista = elemento('div', 'companias-destacadas__resto');
    for (const c of resto) lista.appendChild(tarjetaCompania(c, alAbrir, 'compacta'));
    caja.appendChild(lista);
  }
}

/** Latest Coverage: las más recientes por fecha de última publicación. */
function pintarRecientesCompanias(companias, alAbrir) {
  const bloque = $('#bloque-recientes-companias');
  const caja = $('#recientes-companias');
  if (!bloque || !caja) return;
  const recientes = [...companias]
    .filter((c) => c.ultimaPublicacion)
    .sort((a, b) => new Date(b.ultimaPublicacion) - new Date(a.ultimaPublicacion))
    .slice(0, 6);
  caja.textContent = '';
  bloque.hidden = recientes.length === 0;
  for (const c of recientes) caja.appendChild(tarjetaCompania(c, alAbrir, 'compacta'));
}

/** Coverage by Sector: recuento por sector con barra fina de magnitud. */
function pintarSectoresCobertura(companias) {
  const bloque = $('#bloque-sectores-companias');
  const caja = $('#sectores-companias');
  if (!bloque || !caja) return;
  caja.textContent = '';

  const porSector = new Map();
  for (const c of companias) {
    const s = c.sector || noDisponible();
    porSector.set(s, (porSector.get(s) ?? 0) + 1);
  }
  const filas = [...porSector.entries()].sort((a, b) => b[1] - a[1]);
  bloque.hidden = filas.length === 0;
  if (!filas.length) return;

  const maximo = Math.max(...filas.map(([, n]) => n));
  for (const [sector, n] of filas) {
    const fila = elemento('div', 'sector-fila');
    fila.appendChild(elemento('span', 'sector-fila__nombre', sector));
    const pista = elemento('div', 'sector-fila__pista');
    const barra = elemento('div', 'sector-fila__barra');
    barra.style.width = `${(n / maximo) * 100}%`;
    pista.appendChild(barra);
    fila.appendChild(pista);
    fila.appendChild(elemento('span', 'sector-fila__valor', String(n)));
    caja.appendChild(fila);
  }
}

/** Orquesta el hub entero a partir de una carga ya resuelta. */
export function pintarHubCompanias(datos, alAbrir, cargarSerie = null) {
  // `datos.fichas` —modo `detalle=1`— trae cotización y recorrido por
  // compañía; sin él, se usa el listado ligero y esas dos cifras quedan N/A
  // explícito en la tarjeta, nunca inventadas en el cliente.
  const companias = datos.fichas ?? datos.companias;
  pintarCabeceraCompanias(companias);
  pintarDestacadasCompanias(companias, alAbrir);
  pintarRecientesCompanias(companias, alAbrir);
  pintarSectoresCobertura(companias);
  pintarCompanias({ ...datos, companias }, alAbrir, cargarSerie);
}

export function pintarCompanias(datos, alAbrir, cargarSerie = null) {
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

  for (const c of datos.companias) rejilla.appendChild(tarjetaCompania(c, alAbrir, 'completa', cargarSerie));

  // Fundido CSS puro al reorganizar por búsqueda/filtro: nunca FLIP ni
  // reordenación animada de posiciones. La rejilla ya se reconstruyó entera
  // arriba; aquí solo se pide un fotograma para que la transición de opacidad
  // tenga un punto de partida distinto del de llegada.
  rejilla.classList.add('rejilla-companias--transicion');
  rejilla.style.opacity = '0';
  requestAnimationFrame(() => { rejilla.style.opacity = '1'; });
}

/**
 * Traza decorativa del hero: histórico real del S&P 500, sin eje ni tooltip.
 * `serieHero` es `{disponible, serie}` —ya resuelto por quien hizo la
 * petición—; si no hay serie utilizable el SVG se queda vacío y el hero sigue
 * completo sin ella.
 */
export function pintarTrazaHeroCompanias(serieHero) {
  const svg = $('#companias-hero-traza');
  if (!svg) return;
  const linea = svg.querySelector('.companias-hero__traza-linea');
  if (!linea) return;

  const puntos = serieHero?.disponible ? trazarPuntos(serieHero.serie, 400, 120) : null;
  if (!puntos) return;
  linea.setAttribute('points', puntos);
  requestAnimationFrame(() => svg.classList.add('companias-hero__traza--visible'));
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

export function pintarFicha(c, { alAbrirInforme, alVerCatalizadores, alIrCartera }) {
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

  // ── Catalizadores próximos ──
  raiz.appendChild(bloqueCatalizadores(c));

  // ── Riesgos clave ──
  raiz.appendChild(bloqueRiesgos(c));

  // ── Conexión con la cartera ──
  raiz.appendChild(bloquePortfolio(c, alIrCartera));

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
  rejilla.appendChild(dato(t('companias.dato.recomendacion'),
    c.recomendacion ?? noDisponible(), claseRecomendacion(c.recomendacion)));
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

/** Catalizadores próximos. `catalysts` es un objeto —`{proximos, pasados,
 * resumen}`—, no una lista plana: viene ya filtrado a esta compañía por
 * `agendaDe()` en `src/routes/companias.js`. */
function bloqueCatalizadores(c) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo', t('companias.catalizadores.titulo')));

  const proximos = c.catalysts?.proximos ?? [];
  if (!proximos.length) {
    // Tercer estado explícito: «no hay catalizadores próximos» no es lo mismo
    // que «no se pudo comprobar la agenda» —si `catalysts` ni siquiera llegó,
    // se dice también, en vez de mostrar el mismo vacío para los dos casos.
    bloque.appendChild(elemento('p', 'bloque-ficha__vacio',
      c.catalysts ? t('companias.catalizadores.vacio') : t('companias.catalizadores.sinComprobar')));
  } else {
    const lista = elemento('ul', 'lista-catalizadores');
    for (const ev of proximos) {
      const fila = elemento('li', 'fila-catalizador');
      // El tipo se traduce con el mismo vocabulario que ya usa la Agenda de
      // catalizadores; el título del evento («Vencimiento de opciones ·
      // fecha») ya repite la fecha, así que aquí solo va el tipo, sin duplicar
      // el mismo hecho en dos formatos —regla 9—.
      fila.appendChild(elemento('strong', '',
        ev.tipo ? etiquetaTipoEvento(ev.tipo) : t('companias.catalizadores.tipoReserva')));
      fila.appendChild(elemento('span', 'fila-catalizador__meta', formatearFecha(ev.fecha)));
      lista.appendChild(fila);
    }
    bloque.appendChild(lista);
  }

  // Un resumen con pasados/sin-fuente informativos no debe quedar oculto:
  // se anota como nota de pie, sin fingir que no hay nada más que decir.
  const resumen = c.catalysts?.resumen;
  if (resumen && (resumen.pasados > 0 || resumen.sinFuente > 0)) {
    bloque.appendChild(elemento('p', 'bloque-ficha__nota',
      t('companias.catalizadores.notaResumen', { pasados: resumen.pasados ?? 0, sinFuente: resumen.sinFuente ?? 0 })));
  }

  return bloque;
}

/** Riesgos clave: juicio narrativo del analista, nunca derivado. */
function bloqueRiesgos(c) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo', t('companias.riesgos.titulo')));

  if (!c.riesgosClave) {
    bloque.appendChild(elemento('p', 'bloque-ficha__vacio', t('companias.riesgos.vacio')));
    return bloque;
  }

  // Respeta los saltos de párrafo del texto del analista: un párrafo por línea.
  for (const parrafo of c.riesgosClave.split(/\n+/).filter((p) => p.trim())) {
    bloque.appendChild(elemento('p', 'bloque-ficha__resumen', parrafo));
  }
  return bloque;
}

/**
 * Conexión con la cartera. Cuatro estados, no tres: `portfolioStatus` puede
 * ser `null` —el motor de cartera no se pudo calcular en esta carga—, que no
 * es lo mismo que `NOT_HELD` —sí se comprobó y la respuesta es «no»—. Fundir
 * los dos habría sido la regla del tercer estado rota justo donde más importa.
 */
function bloquePortfolio(c, alIrCartera) {
  const bloque = elemento('section', 'bloque-ficha');
  bloque.appendChild(elemento('h3', 'bloque-ficha__titulo', t('companias.portfolio.titulo')));

  const estado = c.portfolioStatus;
  // Contenido pintado en cliente: no hay `enlazarEventos()` posterior que lo
  // recorra, así que sigue el mismo patrón que `inicio.js` para navegación
  // dentro de la SPA —un botón con su callback— y no un `<a data-ruta>`, que
  // solo se intercepta en los enlaces que ya existían al arrancar.
  const enlaceCartera = () => {
    const boton = elemento('button', 'enlace-avance');
    boton.type = 'button';
    boton.appendChild(elemento('span', null, t('companias.portfolio.verPosicion')));
    boton.appendChild(elemento('span', 'enlace-avance__flecha', '→'));
    boton.addEventListener('click', () => alIrCartera());
    return boton;
  };

  if (estado === 'OPEN') {
    bloque.appendChild(elemento('p', 'bloque-ficha__resumen', t('companias.portfolio.abierta')));
    bloque.appendChild(enlaceCartera());
  } else if (estado === 'CLOSED') {
    bloque.appendChild(elemento('p', 'bloque-ficha__resumen', t('companias.portfolio.cerrada')));
    bloque.appendChild(enlaceCartera());
  } else if (estado === 'NOT_HELD') {
    bloque.appendChild(elemento('p', 'bloque-ficha__vacio', t('companias.portfolio.noTenida')));
  } else {
    // null: no se ha comprobado, distinto y visible aparte de «no está en cartera».
    bloque.appendChild(elemento('p', 'bloque-ficha__vacio', t('companias.portfolio.sinComprobar')));
  }

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
