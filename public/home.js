/* ============================================================================
   Panel de mercado — la portada como cuadro de mando.

   Cada sección se pinta de forma independiente y tolera que su fuente falle: una
   incidencia en el radar no impide ver la cartera. Ninguna sección fabrica cifras:
   lo que no tiene fuente conectada se rotula como pendiente, con su motivo.
   ========================================================================= */

import {
  $, elemento, formatearNumero, formatearMoneda, formatearPorcentaje,
  formatearFecha, formatearMomento, claseLectura, claseSentido,
} from './formato.js';

/** Bloque de estado para una sección todavía sin fuente de datos. */
function bloquePendiente(titulo, motivo) {
  const caja = elemento('div', 'pendiente-bloque');
  caja.appendChild(elemento('span', 'pendiente-bloque__marca', 'Próximamente'));
  caja.appendChild(elemento('strong', null, titulo));
  caja.appendChild(elemento('p', null, motivo));
  return caja;
}

// ═══════════════════════════ Market snapshot ═════════════════════════════

export function pintarSnapshot(datos) {
  const destino = $('#snapshot-mercado');
  if (!destino) return;
  destino.textContent = '';

  for (const i of datos?.indices ?? []) {
    const celda = elemento('div', 'snapshot__celda');
    celda.appendChild(elemento('span', 'snapshot__nombre', i.nombre));

    if (!i.disponible) {
      celda.appendChild(elemento('strong', 'snapshot__valor lectura--nula', 'N/D'));
      celda.appendChild(elemento('span', 'snapshot__nota', i.motivo ?? 'No disponible'));
      destino.appendChild(celda);
      continue;
    }

    // Los tipos de interés se expresan en puntos porcentuales, no en puntos de índice.
    const esTipo = i.formato === 'tipo';
    celda.appendChild(elemento('strong', 'snapshot__valor',
      esTipo ? `${formatearNumero(i.valor)} %` : formatearNumero(i.valor)));

    const cambio = elemento('div', 'snapshot__cambio');
    cambio.appendChild(elemento('span', claseLectura(i.variacionPct), formatearPorcentaje(i.variacionPct)));
    if (Number.isFinite(i.variacion)) {
      cambio.appendChild(elemento('span', 'lectura--nula',
        `${i.variacion >= 0 ? '+' : '−'}${formatearNumero(Math.abs(i.variacion))}`));
    }
    celda.appendChild(cambio);

    if (i.nota) celda.appendChild(elemento('span', 'snapshot__nota', i.nota));
    destino.appendChild(celda);
  }
}

// ══════════════════════════════ W&C Radar ════════════════════════════════

export function pintarRadar(datos, alNavegar) {
  const destino = $('#rejilla-radar');
  const estado = $('#estado-radar');
  if (!destino) return;
  destino.textContent = '';

  const senales = datos?.senales ?? [];
  if (estado) {
    estado.textContent = senales.length
      ? `${datos.operativas} de ${datos.total} señales operativas`
      : '';
  }

  for (const s of senales) {
    // Una señal con destino navegable es un botón; el resto, una tarjeta inerte.
    const navegable = s.disponible && s.destino;
    const tarjeta = elemento(navegable ? 'button' : 'div',
      `senal${s.disponible ? '' : ' senal--pendiente'}`);
    if (navegable) {
      tarjeta.type = 'button';
      tarjeta.addEventListener('click', () => alNavegar?.(s.destino));
    }

    const cabecera = elemento('div', 'senal__cabecera');
    cabecera.appendChild(elemento('span', `senal__estado${s.disponible ? ' senal__estado--activa' : ''}`));
    const grupo = document.createElement('div');
    grupo.appendChild(elemento('span', 'senal__familia', s.familia));
    grupo.appendChild(elemento('div', 'senal__titulo', s.titulo));
    cabecera.appendChild(grupo);
    tarjeta.appendChild(cabecera);

    const cuerpo = elemento('div', 'senal__cuerpo');
    if (s.disponible && s.destacada) {
      const d = s.destacada;
      if (d.ticker) cuerpo.appendChild(elemento('span', 'senal__ticker', d.ticker));

      if (Number.isFinite(d.valor)) {
        const signo = d.valor > 0 && d.unidad === 'pp' ? '+' : '';
        cuerpo.appendChild(elemento('div', `senal__valor ${claseSentido(d.sentido)}`,
          `${signo}${formatearNumero(d.valor, d.unidad === '%' ? 1 : 2)}${d.unidad ?? ''}`));
      } else if (d.titular) {
        cuerpo.appendChild(elemento('div', 'senal__detalle', d.titular));
      }

      if (d.detalle) cuerpo.appendChild(elemento('span', 'senal__detalle', d.detalle));
    } else {
      cuerpo.appendChild(elemento('span', 'pendiente-bloque__marca', 'Próximamente'));
      cuerpo.appendChild(elemento('p', 'senal__motivo', s.motivo ?? s.descripcion));
    }
    tarjeta.appendChild(cuerpo);
    destino.appendChild(tarjeta);
  }
}

// ═════════════════════════════ W&C Signal ════════════════════════════════

export function pintarSignal(datos) {
  const destino = $('#tarjeta-signal');
  if (!destino) return;
  destino.textContent = '';

  const marcador = elemento('div', 'signal__marcador');
  marcador.appendChild(elemento('span', 'signal__etiqueta', 'Signal agregado'));

  if (datos?.disponible && Number.isFinite(datos.agregado)) {
    marcador.appendChild(elemento('strong', 'signal__cifra', formatearNumero(datos.agregado, 1)));
    const barra = elemento('div', 'signal__barra');
    const relleno = document.createElement('span');
    relleno.style.width = `${Math.max(0, Math.min(100, datos.agregado))}%`;
    barra.appendChild(relleno);
    marcador.appendChild(barra);
  } else {
    marcador.appendChild(elemento('strong', 'signal__cifra signal__cifra--pendiente', 'N/D'));
  }

  marcador.appendChild(elemento('span', 'signal__escala', 'Escala 0 – 100'));
  if (!datos?.disponible) {
    marcador.appendChild(elemento('span', 'signal__escala', datos?.motivo ?? 'Modelo en construcción'));
  }
  destino.appendChild(marcador);

  // Desglose por dimensión: la arquitectura definitiva del indicador.
  const dimensiones = elemento('div', 'signal__dimensiones');
  const primero = datos?.valores?.[0];
  const lista = primero?.dimensiones ?? datos?.dimensiones ?? [];

  for (const d of lista) {
    const bloque = elemento('div', 'dimension');
    const cabecera = elemento('div', 'dimension__cabecera');
    cabecera.appendChild(elemento('span', `dimension__punto${d.disponible ? ' dimension__punto--activa' : ''}`));
    cabecera.appendChild(elemento('span', 'dimension__titulo', d.titulo));
    if (Number.isFinite(d.peso)) {
      cabecera.appendChild(elemento('span', 'dimension__peso', `${Math.round(d.peso * 100)} %`));
    }
    bloque.appendChild(cabecera);

    if (d.disponible && Number.isFinite(d.lectura)) {
      bloque.appendChild(elemento('div', 'dimension__lectura',
        `${formatearNumero(d.lectura, 1)}${d.unidad ?? ''}`));
      bloque.appendChild(elemento('span', 'dimension__detalle',
        primero?.ticker ? `Lectura de ${primero.ticker}` : 'Lectura disponible'));
    } else {
      bloque.appendChild(elemento('span', 'dimension__detalle', d.detalle ?? d.requiere ?? 'Pendiente'));
    }
    dimensiones.appendChild(bloque);
  }
  destino.appendChild(dimensiones);
}

// ═══════════════════════════ Portfolio snapshot ══════════════════════════

export function pintarPanelCartera(cartera) {
  const destino = $('#panel-cartera');
  const aportaciones = $('#aportaciones');
  if (!destino) return;
  destino.textContent = '';
  if (aportaciones) aportaciones.textContent = '';

  const e = cartera?.estadisticos;
  if (!e) {
    destino.appendChild(bloquePendiente('Cartera sin datos',
      cartera?.mensaje ?? 'La cartera se constituye a partir de las tesis publicadas con ticker asignado.'));
    return;
  }

  // Se reutilizan las métricas ya calculadas por el motor de cartera.
  const metricas = [
    ['Portfolio return', formatearPorcentaje(e.rentabilidadTotal), 'Sobre el capital invertido', e.rentabilidadTotal],
    [`Benchmark (${cartera.benchmark})`, formatearPorcentaje(e.rentabilidadIndice), 'Mismo periodo', e.rentabilidadIndice],
    ['Alpha', formatearPorcentaje(e.alfaJensen), 'Jensen · anualizada', e.alfaJensen],
    ['Sharpe', formatearNumero(e.ratioSharpe), `Tasa libre ${formatearNumero(e.tasaLibreRiesgo, 1)} %`],
    ['Max drawdown', formatearPorcentaje(e.maximaCaida), 'Desde máximo previo', e.maximaCaida],
    ['Volatilidad', formatearPorcentaje(e.volatilidadAnualizada, false), 'Anualizada'],
  ];

  for (const [etiqueta, valor, nota, lectura] of metricas) {
    const bloque = elemento('div', 'indicador');
    bloque.appendChild(elemento('span', 'indicador__etiqueta', etiqueta));
    const cifra = elemento('strong', 'indicador__valor', valor);
    if (lectura !== undefined) cifra.className = `indicador__valor ${claseLectura(lectura)}`;
    bloque.appendChild(cifra);
    if (nota) bloque.appendChild(elemento('span', 'indicador__nota', nota));
    destino.appendChild(bloque);
  }

  if (!aportaciones) return;

  // Contribución = rentabilidad de la línea ponderada por su peso, ya calculada.
  const lineas = [...(cartera.posiciones ?? []), ...(cartera.cerradas ?? [])]
    .filter((p) => Number.isFinite(p.contribucionPct));

  if (!lineas.length) {
    aportaciones.appendChild(bloquePendiente('Sin contribuciones',
      'Todavía no hay posiciones con rentabilidad calculada.'));
    return;
  }

  const ordenadas = [...lineas].sort((a, b) => b.contribucionPct - a.contribucionPct);
  const columna = (titulo, conjunto) => {
    const caja = document.createElement('section');
    const cab = elemento('div', 'bloque-panel__cabecera');
    cab.style.borderBottomColor = 'var(--linea)';
    cab.appendChild(elemento('h2', null, titulo));
    caja.appendChild(cab);

    const lista = elemento('div', 'lista-aportacion');
    if (!conjunto.length) {
      lista.appendChild(elemento('p', 'senal__motivo', 'Sin posiciones en este grupo.'));
    }
    for (const p of conjunto) {
      const fila = elemento('div', 'aportacion');
      fila.appendChild(elemento('span', 'aportacion__ticker', p.ticker));
      fila.appendChild(elemento('span', 'aportacion__nombre', p.empresa));
      fila.appendChild(elemento('span', `aportacion__valor ${claseLectura(p.contribucionPct)}`,
        formatearPorcentaje(p.contribucionPct)));
      lista.appendChild(fila);
    }
    caja.appendChild(lista);
    return caja;
  };

  aportaciones.appendChild(columna('Top contributors', ordenadas.filter((p) => p.contribucionPct > 0).slice(0, 4)));
  aportaciones.appendChild(columna('Top detractors',
    ordenadas.filter((p) => p.contribucionPct < 0).reverse().slice(0, 4)));
}

// ═════════════════════════════ Top research ══════════════════════════════

export function pintarResearch(informes, cartera, alAbrir) {
  const destino = $('#rejilla-research');
  if (!destino) return;
  destino.textContent = '';

  if (!informes?.length) {
    destino.appendChild(bloquePendiente('Sin tesis publicadas',
      'Publique un informe desde el área de analistas para verlo aquí.'));
    return;
  }

  // Precio vivo procedente de la cartera, cuando la tesis es posición.
  const precios = new Map();
  for (const p of [...(cartera?.posiciones ?? []), ...(cartera?.cerradas ?? [])]) {
    if (Number.isFinite(p.precioActual)) precios.set(p.ticker, { precio: p.precioActual, divisa: p.divisa });
  }

  for (const i of informes.slice(0, 4)) {
    const tarjeta = elemento('button', 'research');
    tarjeta.type = 'button';
    tarjeta.addEventListener('click', () => alAbrir?.(i.id));

    const superior = elemento('div', 'research__superior');
    if (i.ticker) superior.appendChild(elemento('span', 'senal__ticker', i.ticker));
    if (i.recomendacion) superior.appendChild(elemento('span', 'distintivo', i.recomendacion));

    const vivo = i.ticker ? precios.get(i.ticker) : null;
    if (vivo) superior.appendChild(elemento('span', 'research__precio', formatearMoneda(vivo.precio, vivo.divisa)));
    tarjeta.appendChild(superior);

    tarjeta.appendChild(elemento('h3', 'research__empresa', i.empresa));
    if (i.resumen_ejecutivo) tarjeta.appendChild(elemento('p', 'research__resumen', i.resumen_ejecutivo));

    const pie = elemento('div', 'research__pie');
    // El indicador propietario todavía no puntúa: se declara como tal.
    pie.appendChild(elemento('span', null, 'W&C Signal: N/D'));
    pie.appendChild(elemento('span', null, formatearFecha(i.fecha_publicacion)));
    tarjeta.appendChild(pie);

    destino.appendChild(tarjeta);
  }
}

// ═══════════════════════════ Upcoming catalysts ══════════════════════════

export function pintarCatalizadores(datos) {
  const destino = $('#agenda-catalizadores');
  if (!destino) return;
  destino.textContent = '';

  const eventos = datos?.eventos ?? [];
  if (!eventos.length) {
    destino.appendChild(bloquePendiente(
      'Agenda sin conectar',
      `${datos?.motivo ?? 'Sin calendario de eventos'}. La interfaz está preparada para recibir eventos de tipo ${(datos?.tipos ?? []).join(', ')}.`
    ));
    return;
  }

  const agenda = elemento('div', 'agenda');
  for (const ev of eventos) {
    const fila = elemento('div', 'agenda__fila');
    fila.appendChild(elemento('span', 'agenda__fecha', formatearFecha(ev.fecha)));
    fila.appendChild(elemento('span', 'agenda__evento', ev.evento));
    fila.appendChild(elemento('span', 'senal__ticker', ev.ticker ?? '—'));
    fila.appendChild(elemento('span', 'agenda__tipo', ev.tipo));
    agenda.appendChild(fila);
  }
  destino.appendChild(agenda);

  // La agenda se sostiene sobre las fuentes que hay; lo que no cubre se dice.
  if (datos?.tipos?.length) {
    destino.appendChild(elemento('p', 'nota-metodologica',
      `${datos.motivo}: ${datos.tipos.join(', ')}.`));
  }
}

// ═════════════════════════════ Latest news ═══════════════════════════════

export function pintarUltimasNoticias(noticias, alAbrir) {
  const destino = $('#lista-titulares');
  if (!destino) return;
  destino.textContent = '';

  if (!noticias?.length) {
    destino.appendChild(bloquePendiente('Sin noticias',
      'El repositorio se alimenta automáticamente desde Investing.com cada quince minutos.'));
    return;
  }

  for (const n of noticias.slice(0, 6)) {
    const fila = elemento('button', 'titular');
    fila.type = 'button';
    fila.addEventListener('click', () => alAbrir?.(n.id));

    fila.appendChild(elemento('span', 'titular__fecha', formatearMomento(n)));
    fila.appendChild(elemento('span', 'titular__texto', n.titular));

    const marca = elemento('span', 'titular__categoria');
    const tickers = n.tickers ?? [];
    marca.textContent = tickers.length ? tickers.join(' · ') : (n.fuente ?? n.categoria);
    fila.appendChild(marca);

    destino.appendChild(fila);
  }
}
