'use strict';

/* ============================================================================
   Ficha de compañía — riesgos_clave y el cruce de estado con Portfolio.

   Fase 1 del Research Hub: motor de datos, sin interfaz. Dos piezas nuevas en
   `src/companias/index.js`, ninguna un cálculo nuevo de verdad:

     1 · riesgos_clave. Columna aditiva en `informes` (migración en `src/db.js`),
         juicio narrativo del analista. `null` si nadie lo ha escrito —tercer
         estado, no una cadena vacía— y NUNCA se rellena a mano en el motor.

     2 · portfolioStatus. Cruce de `companias.detalle()` contra el resultado ya
         calculado de `calcularCartera()` (posiciones vivas y liquidadas). No es
         un dato guardado: pasar `cartera: null` dice «no comprobado», nunca
         «no está en cartera» — la regla 9 aplicada al estado de una posición.

   No escribe en la base real: siembra sus propias filas en una base temporal y
   la borra al terminar. `../market` se sustituye igual que en tests/cartera.js,
   así que no hay red ni SQLite fuera de este proceso.

       node tests/companias.js
   ========================================================================= */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-companias-'));
process.env.WARRANTS_DB = path.join(dir, 'prueba.db');
process.env.WARRANTS_UPLOADS = path.join(dir, 'subidas');
fs.mkdirSync(process.env.WARRANTS_UPLOADS, { recursive: true });

// `../market` simulado antes de que nada lo requiera: sin red, la prueba mide
// el cruce de datos, no al proveedor. Mismo patrón que tests/cartera.js.
const rutaMercado = require.resolve('../src/market');
require.cache[rutaMercado] = {
  id: rutaMercado,
  filename: rutaMercado,
  loaded: true,
  exports: {
    normalizarSimbolo: (s) => (typeof s === 'string' ? s.trim().toUpperCase() : null),
    async obtenerCotizacion() {
      throw new Error('sin cotización simulada'); // No hace falta para esta batería.
    },
    async obtenerCotizaciones() { return { cotizaciones: new Map(), fallidos: [] }; },
    async obtenerHistorico() { throw new Error('sin histórico simulado'); },
  },
};

const { db } = require('../src/db');
const companias = require('../src/companias');

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

const insertar = db.prepare(`
  INSERT INTO informes (empresa, ticker, sector, recomendacion, precio_objetivo, divisa,
    riesgos_clave, en_cartera, fecha_publicacion)
  VALUES (@empresa, @ticker, @sector, @recomendacion, @precio_objetivo, @divisa,
    @riesgos_clave, @en_cartera, @fecha_publicacion)
`);

const RIESGO_QCOM =
  'Execution Risk: Delays in scaling the new product pipeline could compress margins. Macro: Exposure to ' +
  'emerging market FX headwinds. Valuation: Trading at a premium to historical averages, leaving little ' +
  'margin of safety.';

insertar.run({
  empresa: 'QUALCOMM Incorporated', ticker: 'QCOM', sector: 'Tecnología', recomendacion: 'Sobreponderar',
  precio_objetivo: 195, divisa: 'USD', riesgos_clave: RIESGO_QCOM, en_cartera: 1, fecha_publicacion: '2026-02-20',
});
insertar.run({
  empresa: 'Oracle Corporation', ticker: 'ORCL', sector: 'Tecnología', recomendacion: 'Sobreponderar',
  precio_objetivo: 200, divisa: 'USD', riesgos_clave: null, en_cartera: 1, fecha_publicacion: '2026-01-15',
});
insertar.run({
  empresa: 'Nombre Sin Ticker Todavía', ticker: null, sector: 'Salud', recomendacion: 'Mantener',
  precio_objetivo: null, divisa: 'USD', riesgos_clave: null, en_cartera: 0, fecha_publicacion: '2026-03-01',
});

(async () => {
  // ── 1 · riesgos_clave: dato presente, dato ausente, nunca cadena vacía ──
  const qcom = await companias.detalle('QCOM');
  t('QCOM · riesgosClave es el texto sembrado', qcom?.riesgosClave === RIESGO_QCOM,
    `«${qcom?.riesgosClave}»`);

  const orcl = await companias.detalle('ORCL');
  t('ORCL · sin riesgos_clave, el campo es null', orcl?.riesgosClave === null,
    `«${orcl?.riesgosClave}»`);
  t('ORCL · nunca una cadena vacía', orcl?.riesgosClave !== '', `«${orcl?.riesgosClave}»`);

  // ── 2 · portfolioStatus: sin cartera pasada, sin comprobar ──
  const sinCartera = await companias.detalle('QCOM');
  t('sin `cartera` pasada · portfolioStatus es null, no NOT_HELD',
    sinCartera.portfolioStatus === null, `${sinCartera.portfolioStatus}`);

  // ── 3 · portfolioStatus: cruce contra un resultado simulado de calcularCartera() ──
  const carteraSimulada = {
    posiciones: [{ ticker: 'QCOM' }],
    cerradas: [{ ticker: 'ORCL' }],
  };

  const qcomAbierta = await companias.detalle('QCOM', { cartera: carteraSimulada });
  t('QCOM en `posiciones` · portfolioStatus OPEN', qcomAbierta.portfolioStatus === 'OPEN',
    `${qcomAbierta.portfolioStatus}`);

  const orclCerrada = await companias.detalle('ORCL', { cartera: carteraSimulada });
  t('ORCL en `cerradas` · portfolioStatus CLOSED', orclCerrada.portfolioStatus === 'CLOSED',
    `${orclCerrada.portfolioStatus}`);

  // Una tercera compañía, sembrada sin ticker: nunca puede cruzar contra la
  // cartera (que se indexa por ticker), y no debe fallar por eso.
  const listado = companias.listar();
  const sinTicker = listado.companias.find((c) => c.ticker === null);
  t('cobertura sin ticker · existe en el listado', Boolean(sinTicker), 'no se encontró la fila sembrada');
  if (sinTicker) {
    const ficha = await companias.detalle(sinTicker.clave, { cartera: carteraSimulada });
    t('sin ticker · portfolioStatus NOT_HELD, no un error',
      ficha?.portfolioStatus === 'NOT_HELD', `${ficha?.portfolioStatus}`);
  }

  // Un ticker que no aparece en ninguna de las dos listas de la cartera.
  const carteraSinLaTercera = { posiciones: [{ ticker: 'QCOM' }], cerradas: [] };
  const orclNoTenida = await companias.detalle('ORCL', { cartera: carteraSinLaTercera });
  t('ORCL fuera de ambas listas · portfolioStatus NOT_HELD',
    orclNoTenida.portfolioStatus === 'NOT_HELD', `${orclNoTenida.portfolioStatus}`);

  // ── 4 · catalysts: sin agendaDe inyectada, lista vacía, nunca un fallo ──
  t('sin `agendaDe` inyectada · catalysts es un array vacío',
    Array.isArray(qcom.catalysts) && qcom.catalysts.length === 0, JSON.stringify(qcom.catalysts));

  // Con `agendaDe` inyectada, se le pasa el ticker y su resultado se publica tal cual.
  const eventoSimulado = [{ id: 'venc-QCOM-2026-06-19', ticker: 'QCOM', tipo: 'VENCIMIENTO_OPCIONES' }];
  const conAgenda = await companias.detalle('QCOM', {
    agendaDe: async ({ ticker }) => (ticker === 'QCOM' ? eventoSimulado : []),
  });
  t('con `agendaDe` · catalysts trae el evento simulado',
    conAgenda.catalysts?.length === 1 && conAgenda.catalysts[0].id === eventoSimulado[0].id,
    JSON.stringify(conAgenda.catalysts));

  // Si `agendaDe` falla, la ficha no se cae con ella: catalysts queda vacío.
  const agendaRota = await companias.detalle('QCOM', {
    agendaDe: async () => { throw new Error('proveedor de agenda caído'); },
  });
  t('si `agendaDe` falla · la ficha sigue resolviéndose, catalysts vacío',
    Array.isArray(agendaRota.catalysts) && agendaRota.catalysts.length === 0,
    JSON.stringify(agendaRota));

  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(mal ? 1 : 0);
})();
