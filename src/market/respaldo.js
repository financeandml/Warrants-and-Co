'use strict';

/**
 * Proveedores de respaldo. Se activan unicamente cuando Yahoo Finance no esta
 * disponible (habitualmente por limitacion 429 sobre el rango de IP saliente),
 * de modo que la plataforma nunca queda sin cotizacion.
 *
 *   - CNBC   : cotizacion en tiempo real, incluido fuera de sesion.
 *   - Nasdaq : series historicas diarias OHLCV.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT_MS = 8000;

class ProveedorError extends Error {
  constructor(mensaje, { status = null, proveedor } = {}) {
    super(mensaje);
    this.name = 'ProveedorError';
    this.status = status;
    this.proveedor = proveedor;
  }
}

async function traerJson(url, proveedor, cabeceras = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: 'application/json', ...cabeceras },
  });
  if (!res.ok) throw new ProveedorError(`${proveedor} respondio ${res.status}`, { status: res.status, proveedor });
  return res.json();
}

/** Convierte "$1.234,50" / "1,234.50" / "N/A" en numero, o null. */
function aNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/[$,%\s]/g, '').replace(/,/g, '');
  if (!limpio || limpio === 'N/A' || limpio === '--') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- CNBC

async function cotizacionCnbc(simbolo) {
  const url =
    'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol' +
    `?symbols=${encodeURIComponent(simbolo)}&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json`;
  const datos = await traerJson(url, 'CNBC');

  const q = datos?.FormattedQuoteResult?.FormattedQuote?.[0];
  if (!q || q.code !== 0) throw new ProveedorError(`CNBC sin datos para ${simbolo}`, { proveedor: 'CNBC' });

  const precio = aNumero(q.last);
  if (precio === null) throw new ProveedorError(`CNBC cotizacion invalida para ${simbolo}`, { proveedor: 'CNBC' });

  const cierreAnterior = aNumero(q.previous_day_closing);
  const variacion = aNumero(q.change);

  return {
    simbolo: q.symbol || simbolo,
    nombre: q.name || simbolo,
    precio,
    cierreAnterior,
    variacion: variacion ?? (cierreAnterior !== null ? precio - cierreAnterior : null),
    variacionPct:
      aNumero(q.change_pct) ??
      (cierreAnterior ? ((precio - cierreAnterior) / cierreAnterior) * 100 : null),
    divisa: q.currencyCode || 'USD',
    mercado: q.exchange || null,
    estadoMercado: q.curmktstatus || null,
    momento: new Date().toISOString(),
    // Hora de CONSULTA, no de mercado: CNBC no publica el instante de impresion.
    // Vease la nota en `yahoo.js`; quien lo enseñe ha de rotularlo distinto.
    momentoDeMercado: false,
    fuente: 'CNBC',
    // Fundamentales publicados junto a la cotizacion; alimentan la ficha del valor.
    fundamentales: {
      beta: aNumero(q.beta),
      per: aNumero(q.pe),
      perAdelantado: aNumero(q.fpe),
      bpa: aNumero(q.eps),
      capitalizacion: q.mktcapView || null,
      volumen: aNumero(q.volume),
      volumenMedio10d: q.tendayavgvol || null,
      maximo52s: aNumero(q.yrhiprice),
      minimo52s: aNumero(q.yrloprice),
      apertura: aNumero(q.open),
      maximoDia: aNumero(q.high),
      minimoDia: aNumero(q.low),
      margenBruto: q.GROSMGNTTM || null,
      margenNeto: q.NETPROFTTM || null,
      roe: q.ROETTM || null,
    },
  };
}

// -------------------------------------------------------------- Nasdaq

async function historicoNasdaq(simbolo, desdeISO) {
  const desde = new Date(desdeISO);
  if (Number.isNaN(desde.getTime())) throw new ProveedorError('Fecha de inicio invalida', { proveedor: 'Nasdaq' });

  const hasta = new Date();
  // Margen amplio: Nasdaq limita por numero de filas, no por rango.
  const dias = Math.ceil((hasta - desde) / 86400000) + 10;

  // Nasdaq segmenta por clase de activo y rechaza el simbolo si no coincide;
  // los ETF de referencia (SPY, QQQ) solo responden bajo "etf".
  let filas = null;
  for (const clase of ['stocks', 'etf']) {
    const url =
      `https://api.nasdaq.com/api/quote/${encodeURIComponent(simbolo)}/historical` +
      `?assetclass=${clase}&fromdate=${desde.toISOString().slice(0, 10)}` +
      `&todate=${hasta.toISOString().slice(0, 10)}&limit=${Math.max(dias, 30)}`;
    const datos = await traerJson(url, 'Nasdaq').catch(() => null);
    const candidatas = datos?.data?.tradesTable?.rows;
    if (Array.isArray(candidatas) && candidatas.length) {
      filas = candidatas;
      break;
    }
  }
  if (!filas)
    throw new ProveedorError(`Nasdaq sin historico para ${simbolo}`, { proveedor: 'Nasdaq' });

  const salida = [];
  for (const f of filas) {
    const cierre = aNumero(f.close);
    if (cierre === null) continue;
    // Nasdaq entrega MM/DD/YYYY.
    const [mes, dia, anio] = String(f.date).split('/');
    if (!anio || !mes || !dia) continue;
    salida.push({
      fecha: `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`,
      apertura: aNumero(f.open) ?? cierre,
      maximo: aNumero(f.high) ?? cierre,
      minimo: aNumero(f.low) ?? cierre,
      cierre,
      volumen: aNumero(f.volume) ?? 0,
    });
  }
  if (!salida.length) throw new ProveedorError(`Nasdaq historico ilegible para ${simbolo}`, { proveedor: 'Nasdaq' });

  // Nasdaq devuelve de mas reciente a mas antiguo; normalizamos a cronologico.
  salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return salida;
}

async function cotizacionNasdaq(simbolo) {
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(simbolo)}/info?assetclass=stocks`;
  const datos = await traerJson(url, 'Nasdaq');
  const d = datos?.data;
  const p = d?.primaryData;
  const precio = aNumero(p?.lastSalePrice);
  if (precio === null) throw new ProveedorError(`Nasdaq sin cotizacion para ${simbolo}`, { proveedor: 'Nasdaq' });

  const variacion = aNumero(p?.netChange);
  return {
    simbolo: d.symbol || simbolo,
    nombre: d.companyName || simbolo,
    precio,
    cierreAnterior: variacion !== null ? precio - variacion : null,
    variacion,
    variacionPct: aNumero(p?.percentageChange),
    divisa: 'USD',
    mercado: d.exchange || null,
    estadoMercado: p?.isRealTime ? 'REGULAR' : null,
    momento: new Date().toISOString(),
    // Hora de CONSULTA, no de mercado. Igual que CNBC.
    momentoDeMercado: false,
    fuente: 'Nasdaq',
  };
}

module.exports = {
  cnbc: { nombre: 'CNBC', obtenerCotizacion: cotizacionCnbc },
  nasdaq: { nombre: 'Nasdaq', obtenerCotizacion: cotizacionNasdaq, obtenerHistorico: historicoNasdaq },
  aNumero,
  ProveedorError,
};
