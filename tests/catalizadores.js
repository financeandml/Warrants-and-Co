'use strict';

/* ============================================================================
   Agenda de catalizadores — el cruce con el estado real de Portfolio.

   Fase 1 del Investment Catalyst Monitor: `agenda()` gana un `portfolioStatus`
   por evento (y por compañía en `universo`), reutilizando `companias.
   estadoPortfolio()` —el mismo cruce que ya prueba tests/companias.js—, no una
   segunda implementación. Sin `cartera` pasada, `portfolioStatus` es `null`
   («no comprobado»), nunca se infiere del `enCartera` antiguo.

   No escribe en la base real: siembra sus propias filas en una base temporal.
   `../market` y `../opciones` se sustituyen antes de que nada los requiera,
   igual que tests/cartera.js y tests/companias.js.

       node tests/catalizadores.js
   ========================================================================= */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-catalizadores-'));
process.env.WARRANTS_DB = path.join(dir, 'prueba.db');
process.env.WARRANTS_UPLOADS = path.join(dir, 'subidas');
fs.mkdirSync(process.env.WARRANTS_UPLOADS, { recursive: true });

const rutaMercado = require.resolve('../src/market');
require.cache[rutaMercado] = {
  id: rutaMercado, filename: rutaMercado, loaded: true,
  exports: {
    normalizarSimbolo: (s) => (typeof s === 'string' ? s.trim().toUpperCase() : null),
    async obtenerCotizacion() { throw new Error('sin cotización simulada'); },
    async obtenerCotizaciones() { return { cotizaciones: new Map(), fallidos: [] }; },
    async obtenerHistorico() { throw new Error('sin histórico simulado'); },
  },
};

// Tres vencimientos distintos para QCOM —el primero conserva exactamente el
// caso ya usado por las pruebas de más abajo (dos contratos, mismo 2026-12-18,
// 800 de interés abierto acumulado)—, más dos fechas relativas a "hoy" para no
// depender de cuándo se ejecute la prueba. ORCL sigue sin cadena —
// vencimientosDe() debe seguir sin ella, no fallar—.
const diasDesdeHoy = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const FECHA_CERCANA = diasDesdeHoy(5);
const FECHA_LEJANA = diasDesdeHoy(120);

const rutaOpciones = require.resolve('../src/opciones');
require.cache[rutaOpciones] = {
  id: rutaOpciones, filename: rutaOpciones, loaded: true,
  exports: {
    async getOptionChain(simbolo) {
      if (simbolo !== 'QCOM') throw new Error('sin cadena simulada');
      return {
        proveedor: { nombre: 'Simulado' },
        truncada: false,
        contratos: [
          { vencimiento: '2026-12-18', interesAbierto: 500, volumen: 80 },
          { vencimiento: '2026-12-18', interesAbierto: 300, volumen: 40 },
          { vencimiento: FECHA_CERCANA, interesAbierto: 200, volumen: 50 },
          { vencimiento: FECHA_LEJANA, interesAbierto: 2000, volumen: 10 },
        ],
      };
    },
  },
};

const { db } = require('../src/db');
const companias = require('../src/companias');
const catalizadores = require('../src/catalizadores');

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

const insertar = db.prepare(`
  INSERT INTO informes (empresa, ticker, sector, recomendacion, en_cartera, fecha_publicacion)
  VALUES (@empresa, @ticker, @sector, @recomendacion, @en_cartera, @fecha_publicacion)
`);
insertar.run({
  empresa: 'QUALCOMM Incorporated', ticker: 'QCOM', sector: 'Tecnología',
  recomendacion: 'Sobreponderar', en_cartera: 1, fecha_publicacion: '2026-02-20',
});
insertar.run({
  empresa: 'Oracle Corporation', ticker: 'ORCL', sector: 'Tecnología',
  recomendacion: 'Sobreponderar', en_cartera: 1, fecha_publicacion: '2026-01-15',
});

const carteraSimulada = {
  posiciones: [{ ticker: 'QCOM' }], // QCOM: abierta
  cerradas: [{ ticker: 'ORCL' }],   // ORCL: cerrada
};

(async () => {
  // ── 1 · sin `cartera` pasada: portfolioStatus es null en todo evento ──
  const sinCartera = await catalizadores.agenda({});
  t('sin `cartera` · todo evento con ticker declara portfolioStatus null',
    sinCartera.proximos.every((e) => !e.ticker || e.portfolioStatus === null),
    JSON.stringify(sinCartera.proximos.map((e) => e.portfolioStatus)));
  t('sin `cartera` · universo también declara portfolioStatus null',
    sinCartera.universo.every((c) => c.portfolioStatus === null),
    JSON.stringify(sinCartera.universo));

  // ── 2 · con `cartera` pasada: el cruce real, por evento y por compañía ──
  const conCartera = await catalizadores.agenda({ cartera: carteraSimulada });

  const eventosQCOM = conCartera.proximos.filter((e) => e.ticker === 'QCOM');
  t('QCOM tiene al menos un evento (vencimiento de opciones simulado)',
    eventosQCOM.length > 0, `eventos: ${conCartera.proximos.length}`);
  t('eventos de QCOM · portfolioStatus OPEN',
    eventosQCOM.length > 0 && eventosQCOM.every((e) => e.portfolioStatus === 'OPEN'),
    JSON.stringify(eventosQCOM.map((e) => e.portfolioStatus)));

  const universoORCL = conCartera.universo.find((c) => c.ticker === 'ORCL');
  t('ORCL en `universo` · portfolioStatus CLOSED',
    universoORCL?.portfolioStatus === 'CLOSED', `${universoORCL?.portfolioStatus}`);

  const universoQCOM = conCartera.universo.find((c) => c.ticker === 'QCOM');
  t('QCOM en `universo` · portfolioStatus OPEN',
    universoQCOM?.portfolioStatus === 'OPEN', `${universoQCOM?.portfolioStatus}`);

  // Una compañía cubierta que no aparece en ninguna lista de la cartera simulada.
  const carteraSinORCL = { posiciones: [{ ticker: 'QCOM' }], cerradas: [] };
  const conOtraCartera = await catalizadores.agenda({ cartera: carteraSinORCL });
  const universoORCL2 = conOtraCartera.universo.find((c) => c.ticker === 'ORCL');
  t('ORCL fuera de ambas listas · portfolioStatus NOT_HELD',
    universoORCL2?.portfolioStatus === 'NOT_HELD', `${universoORCL2?.portfolioStatus}`);

  // ── 3 · preservación del motor: lo sin fuente sigue declarado como tal ──
  t('sinFuente sigue listando las categorías sin proveedor conectado',
    conCartera.sinFuente.length > 0 && conCartera.sinFuente.every((c) => c.motivo?.length > 0),
    JSON.stringify(conCartera.sinFuente));
  t('ORCL sin cadena de opciones no revienta la agenda —solo se queda sin ese evento',
    conCartera.disponible === true, `disponible: ${conCartera.disponible}`);

  // La prioridad/horizonte/detalle de OI siguen intactos: el cruce no los toca.
  // Se localiza por fecha —ya no es el único vencimiento de QCOM— para seguir
  // afirmando exactamente el mismo caso que antes.
  const vencimientosQCOM = eventosQCOM.filter((e) => e.tipo === catalizadores.TIPOS.VENCIMIENTO);
  const vencQCOM = vencimientosQCOM.find((e) => e.fecha === '2026-12-18');
  t('el vencimiento de QCOM conserva su interés abierto estructurado',
    vencQCOM?.detalle?.interesAbierto === 800, `${vencQCOM?.detalle?.interesAbierto}`);
  // 2026-12-18 cae fuera del horizonte de 45 días desde hoy: LOW es la
  // prioridad correcta por el propio criterio documentado en `agenda()`,
  // no un valor arbitrario — se afirma el valor real, no uno deseado.
  t('el vencimiento de QCOM conserva su prioridad calculada (LOW, fuera de horizonte)',
    vencQCOM?.prioridad === catalizadores.PRIORIDAD.BAJA, `${vencQCOM?.prioridad}`);

  // ── 4 · Resumen de vencimientos: agregado derivado, no un segundo cálculo ──
  // (Fase 2 del Investment Catalyst Monitor)
  //
  // QCOM tiene ahora tres vencimientos próximos: 2026-12-18 (800 OI),
  // FECHA_CERCANA (200 OI, la más próxima) y FECHA_LEJANA (2000 OI, la que
  // concentra más interés abierto sobre el total de las tres: 2000/3000 =
  // 66,7 %). Total de interés abierto = 500+300+200+2000 = 3000.
  const resumenQCOM = conCartera.resumenVencimientos?.find((r) => r.ticker === 'QCOM');

  t('resumenVencimientos existe y trae exactamente una fila (QCOM; ORCL sin cadena)',
    Array.isArray(conCartera.resumenVencimientos) && conCartera.resumenVencimientos.length === 1,
    JSON.stringify(conCartera.resumenVencimientos?.map((r) => r.ticker)));

  t('resumen de QCOM · total coincide exactamente con sus vencimientos originales',
    resumenQCOM?.total === vencimientosQCOM.length,
    `resumen: ${resumenQCOM?.total} · originales: ${vencimientosQCOM.length}`);

  t('resumen de QCOM · próximo vencimiento es el más cercano en días',
    resumenQCOM?.proximaFecha === FECHA_CERCANA, `${resumenQCOM?.proximaFecha}`);

  t('resumen de QCOM · máxima cuota es la de FECHA_LEJANA (66,7 %)',
    resumenQCOM?.maximaCuota?.fecha === FECHA_LEJANA
      && Math.abs((resumenQCOM?.maximaCuota?.valor ?? 0) - 66.7) < 0.05,
    JSON.stringify(resumenQCOM?.maximaCuota));

  // Trazabilidad exacta: cada vencimiento del resumen es EL MISMO objeto (o un
  // objeto con los mismos campos) que ya vive en `proximos` — no una cifra
  // recalculada que pudiera divergir del dato fuente.
  const fechasOriginales = vencimientosQCOM.map((e) => e.fecha).sort();
  const fechasResumen = (resumenQCOM?.vencimientos ?? []).map((e) => e.fecha).sort();
  t('resumen de QCOM · exactamente las mismas fechas que los vencimientos originales',
    JSON.stringify(fechasOriginales) === JSON.stringify(fechasResumen),
    `originales: ${JSON.stringify(fechasOriginales)} · resumen: ${JSON.stringify(fechasResumen)}`);

  const coincideEnTodo = vencimientosQCOM.every((original) => {
    const enResumen = resumenQCOM?.vencimientos?.find((e) => e.fecha === original.fecha);
    return enResumen
      && enResumen.detalle?.interesAbierto === original.detalle?.interesAbierto
      && enResumen.detalle?.volumen === original.detalle?.volumen
      && enResumen.detalle?.contratos === original.detalle?.contratos
      && enResumen.detalle?.cuotaInteresAbierto === original.detalle?.cuotaInteresAbierto
      && enResumen.prioridad === original.prioridad;
  });
  t('resumen de QCOM · interés abierto, volumen, contratos, cuota y prioridad idénticos al original',
    coincideEnTodo, 'alguna fila del resumen difiere del vencimiento original');

  // ORCL no tiene cadena de opciones: no debe aparecer en el resumen, ni con
  // una fila vacía ni con ceros que fingieran datos que no existen.
  t('ORCL sin cadena · no aparece en resumenVencimientos (ni vacío, ni a cero)',
    !conCartera.resumenVencimientos?.some((r) => r.ticker === 'ORCL'),
    JSON.stringify(conCartera.resumenVencimientos?.map((r) => r.ticker)));

  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(mal ? 1 : 0);
})();
