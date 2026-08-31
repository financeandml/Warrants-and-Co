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

// Una única fecha de vencimiento, con interés abierto concentrado, para QCOM.
// ORCL no tiene cadena —vencimientosDe() debe seguir sin ella, no fallar.
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
  const vencQCOM = eventosQCOM.find((e) => e.tipo === catalizadores.TIPOS.VENCIMIENTO);
  t('el vencimiento de QCOM conserva su interés abierto estructurado',
    vencQCOM?.detalle?.interesAbierto === 800, `${vencQCOM?.detalle?.interesAbierto}`);
  // 2026-12-18 cae fuera del horizonte de 45 días desde hoy: LOW es la
  // prioridad correcta por el propio criterio documentado en `agenda()`,
  // no un valor arbitrario — se afirma el valor real, no uno deseado.
  t('el vencimiento de QCOM conserva su prioridad calculada (LOW, fuera de horizonte)',
    vencQCOM?.prioridad === catalizadores.PRIORIDAD.BAJA, `${vencQCOM?.prioridad}`);

  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(mal ? 1 : 0);
})();
