/* ============================================================================
   Sección de opciones — flujo, actividad inusual y cadena.

   Cada bloque distingue tres estados que no deben confundirse: hay dato, el dato
   es cero, y no hay dato. Una cifra cero se muestra como cero. La ausencia se
   rotula «N/A» —siempre vía `general.noDisponible`, nunca escrita a mano— salvo
   dentro de una tabla numérica densa, donde el blanco tipográfico «—» dice lo
   mismo sin repetir la abreviatura en cada columna.
   ========================================================================= */

import {
  $, elemento, formatearNumero, formatearFecha, formatearPorcentaje, porcentaje,
  localeFormato } from './formato.js';
import { t } from './i18n.js';

/**
 * Formatea un precio de ejercicio con la precisión mínima que lo distingue.
 * Redondear 7,50 y 8,00 a cero decimales los mostraría como filas indistinguibles.
 */
export function formatearStrike(strike) {
  if (!Number.isFinite(strike)) return 'N/A';
  const decimales = Number.isInteger(strike) ? 0 : (Number.isInteger(strike * 10) ? 1 : 2);
  return formatearNumero(strike, decimales);
}

/** Importe en formato compacto: 420K, 1,2M, 15,4M. */
export function formatearImporte(v) {
  if (!Number.isFinite(v)) return 'N/A';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toLocaleString(localeFormato(), { maximumFractionDigits: 1 })} B$`;
  if (abs >= 1e6) return `${(v / 1e6).toLocaleString(localeFormato(), { maximumFractionDigits: 1 })} M$`;
  if (abs >= 1e3) return `${Math.round(v / 1e3).toLocaleString(localeFormato())} K$`;
  return `${Math.round(v).toLocaleString(localeFormato())} $`;
}

/**
 * Celda numérica que distingue ausencia de dato de un cero legítimo.
 *
 * `porcentual` no añade un sufijo: delega en `porcentaje()`, que decide según el
 * idioma si el signo lleva espacio delante —«12,5 %» frente a «12.5%»—.
 */
function celdaNumero(valor, { decimales = 2, porcentual = false, ausente = null } = {}) {
  const td = elemento('td', 'num');
  if (!Number.isFinite(valor)) {
    td.textContent = ausente ?? t('general.noDisponible');
    td.className = 'num lectura--nula';
  } else {
    td.textContent = porcentual ? porcentaje(valor, decimales) : formatearNumero(valor, decimales);
  }
  return td;
}

function distintivoLado(lado) {
  return elemento('span', `lado lado--${lado === 'CALL' ? 'call' : 'put'}`, lado);
}

/** Nota con su cobertura; si no alcanza el mínimo se declara no disponible. */
function celdaNota(contrato) {
  const td = document.createElement('td');
  if (!contrato.puntuacionDisponible || !Number.isFinite(contrato.puntuacion)) {
    td.appendChild(elemento('span', 'nota-score nota-score--nd', t('general.noDisponible')));
    return td;
  }
  const caja = elemento('span', 'nota-score');
  const barra = elemento('span', 'barra-score');
  const relleno = document.createElement('span');
  relleno.style.width = `${Math.max(2, contrato.puntuacion)}%`;
  barra.appendChild(relleno);
  caja.appendChild(barra);
  caja.appendChild(elemento('span', 'nota-score__cifra', formatearNumero(contrato.puntuacion, 1)));
  caja.appendChild(elemento('span', 'nota-score__cobertura', porcentaje(contrato.cobertura, 0)));
  td.appendChild(caja);
  return td;
}

/** Etiqueta de certeza de una clasificación. */
function distintivoCerteza(clasificacion) {
  const certeza = (clasificacion?.certeza ?? 'UNKNOWN').toLowerCase();
  const texto = clasificacion?.hipotesis ?? clasificacion?.sentido ?? clasificacion?.posicion ?? 'UNKNOWN';
  const el = elemento('span', `certeza certeza--${certeza}`, texto);
  if (clasificacion?.motivo) el.setAttribute('title', clasificacion.motivo);
  return el;
}

// ═════════════════════ Aviso de alcance del proveedor ════════════════════

export function pintarAlcance(destino, estado) {
  if (!destino) return;
  destino.textContent = '';
  if (!estado) return;

  const ausentes = estado.proveedores?.ausentes ?? [];
  if (!ausentes.length) return;

  const nombres = {
    volatilidadImplicita: 'volatilidad implícita',
    griegas: 'griegas (delta, gamma, theta, vega)',
    multiplicador: 'multiplicador de contrato declarado',
    operaciones: 'operaciones individuales (time & sales)',
    contextoCotizacion: 'horquilla en el instante de cada operación',
    historico: 'histórico propio del proveedor',
  };

  const caja = elemento('div', 'aviso-alcance');
  const cuerpo = document.createElement('div');
  cuerpo.appendChild(elemento('strong', null,
    `Datos servidos por ${estado.proveedores.activo.nombre}`));
  cuerpo.appendChild(elemento('span', null, estado.proveedores.activo.nota ?? ''));

  const lista = document.createElement('ul');
  lista.appendChild(elemento('li', null, `No publicado: ${ausentes.map((a) => nombres[a] ?? a).join(', ')}.`));
  const h = estado.historico;
  lista.appendChild(elemento('li', null,
    h?.suficienteParaComparar
      ? `Archivo propio: ${h.sesiones} sesiones sobre ${h.simbolos} valores.`
      : `Archivo propio: ${h?.sesiones ?? 0} sesión(es). Hacen falta ${h?.sesionesNecesarias ?? 3} para los factores comparativos del score.`));
  cuerpo.appendChild(lista);

  caja.appendChild(cuerpo);
  destino.appendChild(caja);
}

// ═══════════════════════════ Actividad inusual ═══════════════════════════

const COLUMNAS = [
  { clave: 'simbolo', titulo: 'Ticker', tipo: 'texto' },
  { clave: 'lado', titulo: 'Type', tipo: 'texto' },
  { clave: 'strike', titulo: 'Strike', tipo: 'num' },
  { clave: 'vencimiento', titulo: 'Expiration', tipo: 'texto' },
  { clave: 'importeNegociado', titulo: 'Premium', tipo: 'num' },
  { clave: 'volumen', titulo: 'Volume', tipo: 'num' },
  { clave: 'interesAbierto', titulo: 'Open int.', tipo: 'num' },
  { clave: 'volumenSobreInteres', titulo: 'Vol/OI', tipo: 'num' },
  { clave: 'volatilidadImplicita', titulo: 'IV', tipo: 'num' },
  { clave: 'trade', titulo: 'Trade type', tipo: 'texto' },
  { clave: 'puntuacion', titulo: 'Signal', tipo: 'num' },
];

const estadoTabla = { orden: 'puntuacion', sentido: 'desc', pagina: 1, porPagina: 25 };

/** Ordena y pagina los contratos según el estado de la tabla. */
function ordenarYPaginar(contratos) {
  const { orden, sentido } = estadoTabla;
  const factor = sentido === 'asc' ? 1 : -1;

  const ordenados = [...contratos].sort((a, b) => {
    const va = a[orden];
    const vb = b[orden];
    // Un valor ausente nunca encabeza la ordenación, en ningún sentido.
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === 'string') return factor * va.localeCompare(vb, 'es');
    return factor * (va - vb);
  });

  const paginas = Math.max(Math.ceil(ordenados.length / estadoTabla.porPagina), 1);
  estadoTabla.pagina = Math.min(estadoTabla.pagina, paginas);
  const inicio = (estadoTabla.pagina - 1) * estadoTabla.porPagina;

  return { pagina: ordenados.slice(inicio, inicio + estadoTabla.porPagina), total: ordenados.length, paginas };
}

export function pintarTablaInusual(destino, contratos, { alSeleccionar, alReordenar } = {}) {
  if (!destino) return;
  destino.textContent = '';

  if (!contratos?.length) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, 'Sin resultados'));
    vacio.appendChild(document.createTextNode(
      'Ningún contrato cumple los criterios seleccionados.'));
    destino.appendChild(vacio);
    return;
  }

  const { pagina, total, paginas } = ordenarYPaginar(contratos);

  const envoltorio = elemento('div', 'tabla-envoltorio envoltorio-opciones');
  const tabla = elemento('table', 'tabla-datos tabla-opciones');

  const cabecera = document.createElement('thead');
  const filaCab = document.createElement('tr');
  for (const col of COLUMNAS) {
    const th = elemento('th', col.tipo === 'num' ? 'num' : null, col.titulo);
    th.scope = 'col';
    th.dataset.orden = col.clave;
    if (estadoTabla.orden === col.clave) {
      th.setAttribute('aria-sort', estadoTabla.sentido === 'asc' ? 'ascending' : 'descending');
    }
    th.addEventListener('click', () => {
      if (estadoTabla.orden === col.clave) {
        estadoTabla.sentido = estadoTabla.sentido === 'asc' ? 'desc' : 'asc';
      } else {
        estadoTabla.orden = col.clave;
        estadoTabla.sentido = 'desc';
      }
      alReordenar?.();
    });
    filaCab.appendChild(th);
  }
  cabecera.appendChild(filaCab);
  tabla.appendChild(cabecera);

  const cuerpo = document.createElement('tbody');
  for (const c of pagina) {
    const fila = document.createElement('tr');
    fila.tabIndex = 0;
    fila.setAttribute('role', 'button');
    fila.setAttribute('aria-label', `Detalle de ${c.simbolo} ${c.lado} ${formatearStrike(c.strike)}`);
    const abrir = () => alSeleccionar?.(c);
    fila.addEventListener('click', abrir);
    fila.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); }
    });

    fila.appendChild(elemento('td', 'mono', c.simbolo));

    const tdLado = document.createElement('td');
    tdLado.appendChild(distintivoLado(c.lado));
    fila.appendChild(tdLado);

    fila.appendChild(elemento('td', 'num', formatearStrike(c.strike)));
    fila.appendChild(elemento('td', null, formatearFecha(c.vencimiento)));

    const tdImporte = elemento('td', 'num', formatearImporte(c.importeNegociado));
    if (!Number.isFinite(c.importeNegociado)) tdImporte.className = 'num lectura--nula';
    fila.appendChild(tdImporte);

    fila.appendChild(celdaNumero(c.volumen, { decimales: 0 }));
    fila.appendChild(celdaNumero(c.interesAbierto, { decimales: 0 }));

    // El cociente no existe cuando el interés abierto es cero: no es un cero.
    const tdRatio = elemento('td', 'num');
    if (Number.isFinite(c.volumenSobreInteres)) {
      tdRatio.textContent = `${formatearNumero(c.volumenSobreInteres, 2)}x`;
      if (c.volumenSobreInteres >= 2) tdRatio.classList.add('lectura', 'lectura--aviso');
    } else {
      tdRatio.textContent = c.calidad?.volumenSobreInteres === 'no_calculable' ? '—' : 'N/A';
      tdRatio.classList.add('lectura--nula');
    }
    fila.appendChild(tdRatio);

    // El proveedor no publica volatilidad implícita.
    fila.appendChild(celdaNumero(c.volatilidadImplicita, { decimales: 1, porcentual: true }));

    const tdTrade = document.createElement('td');
    tdTrade.appendChild(distintivoCerteza(c.sentido));
    fila.appendChild(tdTrade);

    fila.appendChild(celdaNota(c));
    cuerpo.appendChild(fila);
  }
  tabla.appendChild(cuerpo);
  envoltorio.appendChild(tabla);
  destino.appendChild(envoltorio);

  // Pie: recuento y paginación
  const pie = elemento('div', 'barra-resultados');
  pie.style.marginTop = '14px';
  const desde = (estadoTabla.pagina - 1) * estadoTabla.porPagina + 1;
  pie.appendChild(elemento('p', null,
    `Mostrando ${desde}–${Math.min(estadoTabla.pagina * estadoTabla.porPagina, total)} de ${total} contratos`));
  destino.appendChild(pie);

  if (paginas > 1) {
    const nav = elemento('nav', 'paginacion');
    const boton = (texto, destinoPagina, inactivo) => {
      const b = elemento('button', null, texto);
      b.type = 'button';
      b.disabled = inactivo;
      if (!inactivo) {
        b.addEventListener('click', () => { estadoTabla.pagina = destinoPagina; alReordenar?.(); });
      }
      return b;
    };
    nav.appendChild(boton('‹', estadoTabla.pagina - 1, estadoTabla.pagina <= 1));
    const inicio = Math.max(1, Math.min(estadoTabla.pagina - 2, paginas - 4));
    for (let n = inicio; n <= Math.min(paginas, inicio + 4); n++) {
      const b = boton(String(n), n, false);
      if (n === estadoTabla.pagina) b.setAttribute('aria-current', 'true');
      nav.appendChild(b);
    }
    nav.appendChild(boton('›', estadoTabla.pagina + 1, estadoTabla.pagina >= paginas));
    destino.appendChild(nav);
  }
}

export function reiniciarPaginacion() {
  estadoTabla.pagina = 1;
}

// ═══════════════════════ Actividad más destacada ═════════════════════════

export function pintarDestacadas(destino, contratos, { alSeleccionar } = {}) {
  if (!destino) return;
  destino.textContent = '';

  const conNota = (contratos ?? []).filter((c) => c.puntuacionDisponible).slice(0, 10);
  if (!conNota.length) {
    const vacio = elemento('div', 'pendiente-bloque');
    vacio.appendChild(elemento('span', 'pendiente-bloque__marca', 'Sin datos'));
    vacio.appendChild(elemento('strong', null, 'Sin actividad puntuable'));
    vacio.appendChild(elemento('p', null,
      'Ningún contrato alcanza la cobertura mínima de la metodología con los datos disponibles.'));
    destino.appendChild(vacio);
    return;
  }

  for (const c of conNota) {
    const tarjeta = elemento('button', 'destacada');
    tarjeta.type = 'button';
    tarjeta.addEventListener('click', () => alSeleccionar?.(c));

    const superior = elemento('div', 'destacada__superior');
    superior.appendChild(elemento('span', 'destacada__ticker', c.simbolo));
    superior.appendChild(distintivoLado(c.lado));
    const nota = elemento('span', 'destacada__score nota-score');
    nota.appendChild(elemento('span', 'nota-score__cifra', formatearNumero(c.puntuacion, 1)));
    superior.appendChild(nota);
    tarjeta.appendChild(superior);

    tarjeta.appendChild(elemento('div', 'destacada__contrato',
      `${formatearStrike(c.strike)} · ${formatearFecha(c.vencimiento)}`));
    tarjeta.appendChild(elemento('div', 'destacada__contrato', formatearImporte(c.importeNegociado)));

    // La explicación procede de las señales calculadas, no de un texto redactado.
    const motivo = c.senales?.[0]?.texto ?? 'Actividad destacada en la sesión';
    tarjeta.appendChild(elemento('p', 'destacada__motivo', motivo));

    destino.appendChild(tarjeta);
  }
}

// ═══════════════════════ «Why is this unusual?» ══════════════════════════

export function construirDetalleInusual(c) {
  const raiz = elemento('div', 'detalle-inusual');

  const superior = elemento('div', 'detalle__superior');
  superior.appendChild(elemento('span', 'senal__ticker', c.simbolo));
  superior.appendChild(distintivoLado(c.lado));
  raiz.appendChild(superior);

  raiz.appendChild(elemento('h2', null, 'Why is this unusual?'));
  raiz.appendChild(elemento('p', 'detalle__subtitulo',
    `${c.lado} ${formatearStrike(c.strike)} · vencimiento ${formatearFecha(c.vencimiento)}`));

  // Nota y cobertura
  const bloqueNota = elemento('div', 'detalle-inusual__score');
  if (c.puntuacionDisponible) {
    bloqueNota.appendChild(elemento('strong', 'detalle-inusual__cifra', formatearNumero(c.puntuacion, 1)));
    const meta = document.createElement('div');
    meta.appendChild(elemento('div', 'signal__etiqueta', 'Unusual activity score'));
    meta.appendChild(elemento('div', 'dimension__detalle',
      `Escala 0–100 · cobertura ${porcentaje(c.cobertura, 0)} de la metodología`));
    bloqueNota.appendChild(meta);
  } else {
    bloqueNota.appendChild(elemento('strong', 'detalle-inusual__cifra detalle-inusual__cifra--nd', t('general.noDisponible')));
    const meta = document.createElement('div');
    meta.appendChild(elemento('div', 'signal__etiqueta', 'Unusual activity score'));
    meta.appendChild(elemento('div', 'dimension__detalle', c.motivoPuntuacion ?? 'Cobertura insuficiente'));
    bloqueNota.appendChild(meta);
  }
  raiz.appendChild(bloqueNota);

  // Cifras del contrato
  const datos = elemento('dl', 'detalle__datos');
  const dato = (etiqueta, valor) => {
    const bloque = elemento('div', 'detalle__dato');
    bloque.appendChild(elemento('dt', null, etiqueta));
    bloque.appendChild(elemento('dd', null, valor));
    datos.appendChild(bloque);
  };
  dato('Volume', Number.isFinite(c.volumen) ? formatearNumero(c.volumen, 0) : 'N/A');
  dato('Open interest', Number.isFinite(c.interesAbierto) ? formatearNumero(c.interesAbierto, 0) : 'N/A');
  dato('Volume / OI', Number.isFinite(c.volumenSobreInteres)
    ? `${formatearNumero(c.volumenSobreInteres, 2)}x`
    : (c.calidad?.volumenSobreInteres === 'no_calculable' ? 'No calculable' : 'N/A'));
  dato('Premium', formatearImporte(c.importeNegociado));
  dato('IV', Number.isFinite(c.volatilidadImplicita) ? porcentaje(c.volatilidadImplicita, 1) : 'N/A');
  dato('IV change', 'N/A');
  const distancia = Number.isFinite(c.precioSubyacente) && c.precioSubyacente > 0
    ? ((c.strike - c.precioSubyacente) / c.precioSubyacente) * 100
    : null;
  dato('Strike distance', distancia === null ? 'N/A' : formatearPorcentaje(distancia));
  const factorDte = (c.factores ?? []).find((f) => f.clave === 'diasVencimiento');
  dato('Days to expiration', factorDte?.disponible ? `${factorDte.lectura} d` : 'N/A');
  raiz.appendChild(datos);

  // Clasificación, siempre con su grado de certeza
  const seccionClase = elemento('div', 'detalle__seccion');
  seccionClase.appendChild(elemento('h3', null, 'Trade classification'));
  const clasif = elemento('div', 'factores');
  const linea = (titulo, clasificacion) => {
    const f = elemento('div', 'factor');
    f.appendChild(elemento('div', 'factor__titulo', titulo));
    const valor = document.createElement('div');
    valor.style.textAlign = 'end';
    valor.appendChild(distintivoCerteza(clasificacion));
    f.appendChild(valor);
    f.appendChild(elemento('div', 'factor__detalle', clasificacion?.motivo ?? ''));
    clasif.appendChild(f);
  };
  linea('Direction', c.sentido);
  linea('Execution', { sentido: c.modalidad?.modalidad, certeza: c.modalidad?.certeza, motivo: c.modalidad?.motivo });
  linea('Position status', c.posicion);
  seccionClase.appendChild(clasif);
  raiz.appendChild(seccionClase);

  // Señales calculadas
  const seccionSenales = elemento('div', 'detalle__seccion');
  seccionSenales.appendChild(elemento('h3', null, 'Key signals'));
  if (c.senales?.length) {
    const lista = elemento('div', 'senales-clave');
    for (const s of c.senales) {
      lista.appendChild(elemento('div', `senal-clave senal-clave--${s.intensidad}`, s.texto));
    }
    seccionSenales.appendChild(lista);
  } else {
    seccionSenales.appendChild(elemento('p', 'dimension__detalle',
      'Ningún factor alcanza el umbral para emitir una señal.'));
  }
  raiz.appendChild(seccionSenales);

  // Desglose completo de la metodología
  const seccionFactores = elemento('div', 'detalle__seccion');
  seccionFactores.appendChild(elemento('h3', null, 'Score breakdown'));
  const factores = elemento('div', 'factores');
  for (const f of c.factores ?? []) {
    const bloque = elemento('div', `factor${f.disponible ? '' : ' factor--ausente'}`);
    const titulo = document.createElement('div');
    titulo.appendChild(elemento('span', 'factor__titulo', f.titulo));
    titulo.appendChild(elemento('span', 'factor__peso', `  peso ${porcentaje(Math.round(f.peso * 100), 0)}`));
    bloque.appendChild(titulo);

    bloque.appendChild(elemento('div', 'factor__lectura',
      f.disponible && Number.isFinite(f.puntuacion) ? formatearNumero(f.puntuacion, 0) : 'N/A'));
    bloque.appendChild(elemento('div', 'factor__detalle',
      f.disponible ? (f.detalle ?? '') : (f.motivo ?? f.requiere ?? '')));
    factores.appendChild(bloque);
  }
  seccionFactores.appendChild(factores);
  raiz.appendChild(seccionFactores);

  return raiz;
}

// ══════════════════════════ Cadena de opciones ═══════════════════════════

export function pintarCadena(destino, cadena, vencimiento) {
  if (!destino) return;
  destino.textContent = '';
  if (!cadena) return;

  const contratos = cadena.contratos.filter((c) => c.vencimiento === vencimiento);
  if (!contratos.length) {
    const vacio = elemento('div', 'vacio');
    vacio.appendChild(elemento('strong', null, 'Sin contratos'));
    vacio.appendChild(document.createTextNode('El vencimiento seleccionado no tiene contratos publicados.'));
    destino.appendChild(vacio);
    return;
  }

  // Un strike por fila, con su call y su put enfrentados.
  const porStrike = new Map();
  for (const c of contratos) {
    if (!porStrike.has(c.strike)) porStrike.set(c.strike, { strike: c.strike });
    porStrike.get(c.strike)[c.lado === 'CALL' ? 'call' : 'put'] = c;
  }
  const filas = [...porStrike.values()].sort((a, b) => a.strike - b.strike);

  const envoltorio = elemento('div', 'tabla-envoltorio envoltorio-opciones');
  const tabla = elemento('table', 'tabla-datos tabla-opciones');

  const COLS = ['Bid', 'Ask', 'Last', 'Volume', 'Open int.', 'IV', 'Delta', 'Gamma', 'Theta', 'Vega'];
  const thead = document.createElement('thead');

  const filaGrupo = document.createElement('tr');
  const thCalls = elemento('th', 'num', 'Calls');
  thCalls.colSpan = COLS.length;
  const thStrike = elemento('th', null, '');
  const thPuts = elemento('th', null, 'Puts');
  thPuts.colSpan = COLS.length;
  filaGrupo.append(thCalls, thStrike, thPuts);
  thead.appendChild(filaGrupo);

  const filaCab = document.createElement('tr');
  for (const c of COLS) filaCab.appendChild(elemento('th', 'num', c));
  filaCab.appendChild(elemento('th', 'num', 'Strike'));
  for (const c of COLS) filaCab.appendChild(elemento('th', 'num', c));
  thead.appendChild(filaCab);
  tabla.appendChild(thead);

  const precio = cadena.subyacente?.precio;
  const cuerpo = document.createElement('tbody');

  const celdasLado = (contrato) => {
    const celdas = [];
    celdas.push(celdaNumero(contrato?.compra, { decimales: 2 }));
    celdas.push(celdaNumero(contrato?.venta, { decimales: 2 }));
    celdas.push(celdaNumero(contrato?.ultimo, { decimales: 2 }));
    celdas.push(celdaNumero(contrato?.volumen, { decimales: 0 }));
    celdas.push(celdaNumero(contrato?.interesAbierto, { decimales: 0 }));
    // Volatilidad implícita y griegas: el proveedor no las publica.
    for (let i = 0; i < 5; i++) celdas.push(celdaNumero(null));
    return celdas;
  };

  for (const fila of filas) {
    const tr = document.createElement('tr');
    for (const td of celdasLado(fila.call)) tr.appendChild(td);

    const tdStrike = elemento('td', 'num', formatearStrike(fila.strike));
    tdStrike.style.fontWeight = '700';
    // Se resalta el entorno del dinero, con un margen proporcional al precio.
    const margenAtm = Number.isFinite(precio) ? Math.max(precio * 0.02, 0.01) : 0;
    if (Number.isFinite(precio) && Math.abs(fila.strike - precio) <= margenAtm) {
      tdStrike.classList.add('lectura', 'lectura--info');
    }
    tr.appendChild(tdStrike);

    for (const td of celdasLado(fila.put)) tr.appendChild(td);
    cuerpo.appendChild(tr);
  }
  tabla.appendChild(cuerpo);
  envoltorio.appendChild(tabla);
  destino.appendChild(envoltorio);
}

// ════════════════════ Mapa de interés abierto por strike ═════════════════

export function pintarMapaInteres(destino, cadena, vencimiento) {
  if (!destino) return;
  destino.textContent = '';
  if (!cadena) return;

  const contratos = cadena.contratos.filter(
    (c) => c.vencimiento === vencimiento && Number.isFinite(c.interesAbierto) && c.interesAbierto > 0
  );
  if (!contratos.length) {
    destino.appendChild(elemento('p', 'senal__motivo',
      'Sin interés abierto publicado para este vencimiento.'));
    return;
  }

  const porStrike = new Map();
  for (const c of contratos) {
    if (!porStrike.has(c.strike)) porStrike.set(c.strike, { strike: c.strike, call: 0, put: 0 });
    porStrike.get(c.strike)[c.lado === 'CALL' ? 'call' : 'put'] += c.interesAbierto;
  }

  // Los veinte strikes con más posición abierta, presentados en orden de precio.
  const filas = [...porStrike.values()]
    .sort((a, b) => (b.call + b.put) - (a.call + a.put))
    .slice(0, 20)
    .sort((a, b) => b.strike - a.strike);

  const maximo = Math.max(...filas.map((f) => Math.max(f.call, f.put)), 1);
  const precio = cadena.subyacente?.precio;

  const cabecera = elemento('div', 'mapa-oi__cabecera');
  cabecera.appendChild(elemento('span', null, 'Call OI'));
  cabecera.appendChild(elemento('span', null, 'Strike'));
  cabecera.appendChild(elemento('span', null, 'Put OI'));
  destino.appendChild(cabecera);

  const mapa = elemento('div', 'mapa-oi');
  for (const f of filas) {
    const fila = elemento('div', 'mapa-oi__fila');

    const barraCall = elemento('div', 'mapa-oi__barra mapa-oi__barra--call');
    const relCall = document.createElement('span');
    relCall.style.width = `${(f.call / maximo) * 100}%`;
    barraCall.appendChild(relCall);
    barraCall.setAttribute('title', `${formatearNumero(f.call, 0)} contratos abiertos en calls`);
    fila.appendChild(barraCall);

    const margen = Number.isFinite(precio) ? Math.max(precio * 0.02, 0.01) : 0;
    const esAtm = Number.isFinite(precio) && Math.abs(f.strike - precio) <= margen;
    fila.appendChild(elemento('div', `mapa-oi__strike${esAtm ? ' mapa-oi__strike--atm' : ''}`,
      formatearStrike(f.strike)));

    const barraPut = elemento('div', 'mapa-oi__barra mapa-oi__barra--put');
    const relPut = document.createElement('span');
    relPut.style.width = `${(f.put / maximo) * 100}%`;
    barraPut.appendChild(relPut);
    barraPut.setAttribute('title', `${formatearNumero(f.put, 0)} contratos abiertos en puts`);
    fila.appendChild(barraPut);

    mapa.appendChild(fila);
  }
  destino.appendChild(mapa);
}

// ═══════════════════════════ Flujo de operaciones ════════════════════════

export function pintarFlujo(destino, flujo) {
  if (!destino) return;
  destino.textContent = '';

  if (flujo?.disponible) {
    // Cuando haya proveedor de operaciones, se reutiliza la tabla de contratos.
    pintarTablaInusual(destino, flujo.operaciones ?? []);
    return;
  }

  const caja = elemento('div', 'pendiente-bloque');
  caja.appendChild(elemento('span', 'pendiente-bloque__marca', 'Data unavailable'));
  caja.appendChild(elemento('strong', null, 'El flujo de operaciones necesita otra fuente'));
  caja.appendChild(elemento('p', null, flujo?.motivo ?? 'Sin proveedor de operaciones individuales.'));

  if (flujo?.requiere?.length) {
    const lista = document.createElement('ul');
    lista.style.margin = '4px 0 0';
    lista.style.paddingInlineStart = '20px';
    lista.style.fontSize = '0.85rem';
    lista.style.color = 'var(--tinta-secundaria)';
    lista.style.lineHeight = '1.7';
    for (const r of flujo.requiere) lista.appendChild(elemento('li', null, r));
    caja.appendChild(lista);
  }

  caja.appendChild(elemento('p', null,
    'Mientras tanto, «Unusual activity» sí opera: puntúa los agregados de la sesión con ' +
    'los factores que sí pueden calcularse.'));
  destino.appendChild(caja);
}
