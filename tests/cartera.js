'use strict';

/* ============================================================================
   Motor de cartera — la aritmética tiene que cuadrar.

   Ni navegador ni servidor ni red: el mercado se simula, de modo que cada caso
   es una cuenta que se sigue a mano. La comprobación central es una identidad,
   no un valor esperado:

       Σ (peso × rentabilidad de la línea) = rentabilidad total

   Esa suma cuadra si —y solo si— cada posición conserva su tramo de capital y
   el importe liquidado permanece como caja. Un rebalanceo silencioso, una
   renormalización de pesos entre las vivas o una caja reinvertida la rompen de
   inmediato, y la rompen por mucho: es la prueba más barata de esta batería y
   habría cazado desde el primer día que el índice publicara +169 % mientras las
   contribuciones sumaban +68.

   Se vio fallar antes de darla por buena, contra el motor que rebalanceaba: el
   índice daba 120 % y 50 % donde sus líneas sumaban 55 % y 33,33 %, y la tercera
   posición se quedaba sin contribución por no haber cotización viva. Cada caso se
   vio fallar además con su propio defecto reintroducido, uno a uno: los pesos
   renormalizados entre las vivas suman 164,52 % con la caja delante, y sin marcar
   la última sesión al precio de referencia el caso 4 publica 0 % donde su única
   línea aporta 5 %.

       node tests/cartera.js
   ========================================================================= */

const assert = require('node:assert');

// ─────────────────────────── mercado simulado ───────────────────────────

/* El motor exige `./market` al cargarse. Se sustituye por adelantado en la
   caché de módulos: sin red, la prueba mide el motor y no al proveedor. */
let escenario = { barras: {}, cotizaciones: {} };

const rutaMercado = require.resolve('../src/market');
require.cache[rutaMercado] = {
  id: rutaMercado,
  filename: rutaMercado,
  loaded: true,
  exports: {
    normalizarSimbolo: (s) => (typeof s === 'string' ? s.trim().toUpperCase() : null),
    async obtenerHistorico(simbolo, desde) {
      const filas = escenario.barras[simbolo];
      if (!filas) throw new Error(`sin histórico simulado para ${simbolo}`);
      const recorte = filas.filter((f) => f.fecha >= desde);
      if (!recorte.length) throw new Error(`histórico simulado vacío para ${simbolo}`);
      return recorte;
    },
    async obtenerCotizaciones(simbolos) {
      const cotizaciones = new Map();
      const fallidos = [];
      for (const s of simbolos) {
        const q = escenario.cotizaciones[s];
        if (q) cotizaciones.set(s, q);
        else fallidos.push({ simbolo: s, motivo: 'sin cotización simulada' });
      }
      return { cotizaciones, fallidos };
    },
  },
};

const { calcularCartera } = require('../src/cartera');

// ────────────────────────────── utilidades ──────────────────────────────

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

/*
 * La identidad es exacta en el motor y solo la empaña el redondeo a dos decimales
 * de cada cifra publicada: medio céntimo por línea, más el del total. La tolerancia
 * se deriva de ahí y no se elige a ojo, para que no absorba un error de verdad.
 */
const margenRedondeo = (lineas) => 0.005 * (lineas + 1);
const casiIgual = (a, b, tol = margenRedondeo(1)) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;

/** Sesiones consecutivas a partir de un lunes, sin festivos: la prueba no los necesita. */
function sesiones(n, desde = '2026-01-05') {
  const fechas = [];
  const d = new Date(`${desde}T00:00:00Z`);
  while (fechas.length < n) {
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) fechas.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return fechas;
}

/** Barras diarias a partir de una lista de cierres. El máximo se declara aparte. */
function barras(fechas, cierres, maximos = null) {
  return cierres.map((cierre, i) => ({
    fecha: fechas[i],
    apertura: cierre,
    maximo: maximos ? maximos[i] : cierre,
    minimo: cierre,
    cierre,
    volumen: 1000,
  }));
}

let idInforme = 0;
const linea = (campos) => ({
  id: ++idInforme,
  empresa: `${campos.ticker} S.A.`,
  sector: 'Tecnología de la información',
  pais: 'Estados Unidos',
  recomendacion: 'Comprar',
  precio_objetivo: null,
  peso_cartera: null,
  precio_compra: null,
  take_profit: null,
  stop_loss: null,
  divisa: 'USD',
  ...campos,
});

/** Σ contribuciones = rentabilidad total. La identidad que da nombre a la batería. */
function comprobarIdentidad(etiqueta, cartera) {
  const lineas = [...cartera.posiciones, ...cartera.cerradas];
  const suma = lineas.reduce((a, p) => a + (p.contribucionPct ?? 0), 0);
  const total = cartera.estadisticos?.rentabilidadTotal;
  const sinContribucion = lineas.filter((p) => !Number.isFinite(p.contribucionPct)).map((p) => p.ticker);

  t(`${etiqueta} · toda línea tiene contribución`, sinContribucion.length === 0, sinContribucion.join(', '));
  t(`${etiqueta} · Σ contribuciones = rentabilidad total`,
    casiIgual(suma, total, margenRedondeo(lineas.length)),
    `Σ ${suma?.toFixed(4)} vs total ${total?.toFixed(4)}`);
  return { suma, total };
}

/** Los pesos actuales reparten el patrimonio entero, caja incluida. */
function comprobarPesos(etiqueta, cartera) {
  const vivas = cartera.posiciones.reduce((a, p) => a + (p.pesoVigente ?? 0), 0);
  const caja = cartera.liquidez?.pesoActual ?? 0;
  t(`${etiqueta} · Σ pesos actuales + caja = 100 %`,
    casiIgual(vivas + caja, 100, margenRedondeo(cartera.posiciones.length + 1)),
    `posiciones ${vivas.toFixed(2)} + caja ${caja.toFixed(2)} = ${(vivas + caja).toFixed(2)}`);
}

// ──────────────────────────────── casos ────────────────────────────────

/*
 * Caso 1 — una salida antes del alta siguiente.
 *
 * Es el caso que delató el fallo: A se liquida al doble en la sesión 3 y B entra
 * en la 5. Con tramos fijos, A aporta su 50 % × 100 % = 50 puntos y su importe
 * espera en caja; B aporta 50 % × 10 % = 5. Total 55 %.
 *
 * Rebalanceando, el importe de A financiaba a B —que además heredaba el peso de
 * la cerrada— y el índice publicaba 120 %.
 */
async function caso1() {
  const f = sesiones(6);
  escenario = {
    barras: {
      A: barras(f, [10, 15, 18, 18, 18, 18], [10, 16, 21, 18, 18, 18]),
      B: barras(f, [100, 100, 100, 100, 100, 110]),
    },
    cotizaciones: {
      A: { precio: 18, divisa: 'USD', variacionPct: 0 },
      B: { precio: 110, divisa: 'USD', variacionPct: 0 },
    },
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'A', fecha_publicacion: f[0], peso_cartera: 50, precio_compra: 10, take_profit: 20 }),
    linea({ ticker: 'B', fecha_publicacion: f[4], peso_cartera: 50, precio_compra: 100 }),
  ]);

  const { suma, total } = comprobarIdentidad('salida antes del alta siguiente', cartera);
  comprobarPesos('salida antes del alta siguiente', cartera);

  t('salida antes del alta siguiente · la cuenta a mano da 55 %', casiIgual(total, 55),
    `total ${total} · Σ ${suma?.toFixed(4)}`);

  const a = cartera.cerradas.find((p) => p.ticker === 'A');
  t('la liquidada conserva su tramo, no se reinvierte', casiIgual(a?.contribucionPct, 50),
    `contribución de A ${a?.contribucionPct}`);
  t('la liquidada se cierra en su nivel, no al cierre', a?.precioCierre === 20, `salida ${a?.precioCierre}`);
  t('el peso de capital en caja es el de la liquidada', casiIgual(cartera.liquidez?.pesoCapital, 50),
    `${cartera.liquidez?.pesoCapital} %`);
}

/*
 * Caso 2 — el peso de la liquidada NO engorda a las vivas.
 *
 * Tres tesis al 1/3. La primera dobla y se liquida; las otras dos se quedan
 * planas. Con tramos fijos el índice gana un tercio: 33,33 %. El motor anterior
 * publicaba 50 %: al alta de la tercera repartía el patrimonio entero —caja de la
 * liquidada incluida— entre las dos vivas, a mitad y mitad en vez de a un tercio.
 */
async function caso2() {
  const f = sesiones(5);
  escenario = {
    barras: {
      C: barras(f, [10, 10, 20, 20, 20], [10, 10, 21, 20, 20]),
      D: barras(f, [50, 50, 50, 50, 50]),
      E: barras(f, [80, 80, 80, 80, 80]),
    },
    cotizaciones: {
      C: { precio: 20, divisa: 'USD', variacionPct: 0 },
      D: { precio: 50, divisa: 'USD', variacionPct: 0 },
      E: { precio: 80, divisa: 'USD', variacionPct: 0 },
    },
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'C', fecha_publicacion: f[0], precio_compra: 10, take_profit: 20 }),
    linea({ ticker: 'D', fecha_publicacion: f[0], precio_compra: 50 }),
    linea({ ticker: 'E', fecha_publicacion: f[3], precio_compra: 80 }),
  ]);

  const { total } = comprobarIdentidad('peso de la liquidada', cartera);
  comprobarPesos('peso de la liquidada', cartera);
  t('peso de la liquidada · la cuenta a mano da 33,33 %', casiIgual(total, 33.33),
    `total ${total}`);

  const vivas = cartera.posiciones.map((p) => p.peso);
  t('el peso de capital de una viva no cambia al cerrarse otra',
    vivas.every((p) => casiIgual(p, 100 / 3)), vivas.join(' · '));
}

/*
 * Caso 3 — sin precio de compra y sin cotización viva.
 *
 * La entrada es el cierre de la sesión de alta y la referencia, el último cierre
 * conocido. La identidad tiene que cuadrar igual: si el desglose se apoyara en un
 * precio que la serie no usa, dejaría de sumar.
 */
async function caso3() {
  const f = sesiones(4);
  escenario = {
    barras: { G: barras(f, [200, 210, 220, 240]) },
    cotizaciones: {}, // ninguna: el motor debe degradar al último cierre
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'G', fecha_publicacion: f[0] }),
  ]);

  const { total } = comprobarIdentidad('sin cotización viva', cartera);
  comprobarPesos('sin cotización viva', cartera);
  t('sin cotización viva · entrada al cierre del alta y referencia al último cierre',
    casiIgual(total, 20), `total ${total} (240/200 − 1)`);
  t('sin cotización viva · el precio actual se declara ausente, no cero',
    cartera.posiciones[0]?.precioActual === null, String(cartera.posiciones[0]?.precioActual));
}

/*
 * Caso 4 — la cotización viva no coincide con el último cierre.
 *
 * Es el resquicio por el que la identidad se rompería sin ruido: si el titular
 * saliera de la serie de cierres y las contribuciones de la cotización, sumarían
 * distinto por la diferencia entre ambos precios, y solo un día de mercado abierto
 * lo delataría. Aquí el último cierre es 100 y la cotización 105: el total tiene
 * que ser +5 %, no 0 %.
 */
async function caso4() {
  const f = sesiones(3);
  escenario = {
    barras: { H: barras(f, [100, 100, 100]) },
    cotizaciones: { H: { precio: 105, divisa: 'USD', variacionPct: 5 } },
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'H', fecha_publicacion: f[0], precio_compra: 100 }),
  ]);

  const { total } = comprobarIdentidad('cotización distinta del cierre', cartera);
  t('cotización distinta del cierre · la última sesión se valora con la cotización',
    casiIgual(total, 5), `total ${total} (105/100 − 1)`);
  t('cotización distinta del cierre · el valor indexado recoge el mismo precio',
    casiIgual(cartera.valorIndexado, 105), `valor indexado ${cartera.valorIndexado}`);
}

// ─────────────────────────────── ejecución ───────────────────────────────

(async () => {
  for (const [nombre, caso] of [['caso 1', caso1], ['caso 2', caso2], ['caso 3', caso3], ['caso 4', caso4]]) {
    try {
      await caso();
    } catch (e) {
      t(`${nombre} · se ejecuta`, false, String(e.message).split('\n')[0]);
    }
  }

  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
