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

/** Una cartera de exactamente `n` sesiones, con precio que se mueve. */
async function conSesiones(n) {
  const f = sesiones(n);
  let semilla = 11;
  const siguiente = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  let precio = 100;
  const cierres = f.map(() => {
    precio *= 1 + 0.0008 + (siguiente() - 0.5) * 0.018;
    return Number(precio.toFixed(4));
  });
  escenario = { barras: { Z: barras(f, cierres) }, cotizaciones: {} };
  return calcularCartera([linea({ ticker: 'Z', fecha_publicacion: f[0], precio_compra: 100 })]);
}

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

/*
 * Caso 5 — por debajo del suelo de muestra no se publica número.
 *
 * Dos suelos: 252 sesiones —un año— para las cifras anualizadas, y 756 —tres años—
 * para los ratios ajustados por riesgo. Con menos, la plataforma declara cuántas
 * sesiones faltan en vez de publicar un nivel que su propia muestra no sostiene: con
 * 140 observaciones el error típico de un Sharpe es ±1,35 y su intervalo del 95 %
 * incluye el cero.
 */
async function caso5() {
  const f = sesiones(30);
  escenario = {
    barras: { I: barras(f, f.map((_, i) => 100 + i)) },
    cotizaciones: { I: { precio: 100 + f.length - 1, divisa: 'USD', variacionPct: 0 } },
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'I', fecha_publicacion: f[0], precio_compra: 100 }),
  ]);
  const e = cartera.estadisticos;

  comprobarIdentidad('muestra corta', cartera);
  t('muestra corta · la muestra se declara insuficiente', e.muestra?.suficiente === false,
    JSON.stringify(e.muestra));

  for (const clave of ['rentabilidadAnualizada', 'ratioSharpe', 'ratioSortino', 'ratioCalmar', 'alfaJensen', 'beta', 'correlacionIndice']) {
    t(`muestra corta · ${clave} no se publica`, e[clave] === null, String(e[clave]));
  }

  // Cada cifra declara SU suelo: la anualizada el del año, los ratios el de los tres.
  const anual = e.muestra?.retenidas?.rentabilidadAnualizada;
  const sharpe = e.muestra?.retenidas?.ratioSharpe;
  t('muestra corta · la anualizada espera al año',
    anual?.minimas === 252 && anual?.anios === 1 && anual?.restantes === 252 - e.muestra.sesiones,
    JSON.stringify(anual));
  t('muestra corta · los ratios esperan a los tres años',
    sharpe?.minimas === 756 && sharpe?.anios === 3 && sharpe?.restantes === 756 - e.muestra.sesiones,
    JSON.stringify(sharpe));
  t('muestra corta · los dos suelos no dicen lo mismo',
    anual?.restantes !== sharpe?.restantes, `${anual?.restantes} vs ${sharpe?.restantes}`);

  // Lo que la muestra sí sostiene sigue publicándose: son hechos, no inferencias.
  t('muestra corta · la rentabilidad total sigue publicándose', Number.isFinite(e.rentabilidadTotal));
  t('muestra corta · la volatilidad sigue publicándose', Number.isFinite(e.volatilidadAnualizada));
  t('muestra corta · la máxima caída sigue publicándose', Number.isFinite(e.maximaCaida));
}

/*
 * Caso 5 bis — la banda de en medio: cumplido el año, antes de los tres.
 *
 * Es la que justifica que los suelos sean dos. Anualizar un rendimiento de año y
 * medio ya no extrapola nada —es un hecho ocurrido, y retenerlo sería ocultar
 * dato—, mientras que un Sharpe con esa misma muestra sigue teniendo un error
 * típico que desborda a la cifra. Con un suelo único, uno de los dos casos
 * estaría mal necesariamente.
 */
async function caso5bis() {
  const f = sesiones(400);
  escenario = {
    barras: { K: barras(f, f.map((_, i) => Number((100 * (1 + i * 0.001)).toFixed(4)))) },
    cotizaciones: {},
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'K', fecha_publicacion: f[0], precio_compra: 100 }),
  ]);
  const e = cartera.estadisticos;

  comprobarIdentidad('banda intermedia', cartera);
  t('banda intermedia · la anualizada YA se publica', Number.isFinite(e.rentabilidadAnualizada),
    String(e.rentabilidadAnualizada));
  t('banda intermedia · y no figura entre las retenidas',
    e.muestra?.retenidas?.rentabilidadAnualizada === undefined,
    JSON.stringify(Object.keys(e.muestra?.retenidas ?? {})));

  for (const clave of ['ratioSharpe', 'ratioSortino', 'ratioCalmar', 'alfaJensen', 'beta', 'correlacionIndice']) {
    t(`banda intermedia · ${clave} sigue retenido`,
      e[clave] === null && e.muestra?.retenidas?.[clave]?.minimas === 756,
      `${e[clave]} · ${JSON.stringify(e.muestra?.retenidas?.[clave])}`);
  }
  t('banda intermedia · la muestra no se declara suficiente', e.muestra?.suficiente === false);
}

/*
 * Caso 5 ter — el rótulo no puede mentir sobre su propia espera.
 *
 * Una cifra retenida anuncia a partir de cuántas sesiones aparecerá. Ese número y la
 * puerta que la retiene tienen que ser el mismo: si se separan, la plataforma promete
 * una fecha que no va a cumplir, y desde la interfaz no se ve —el rótulo, por sí solo,
 * es coherente—. Aquí se comprueba contra el propio umbral que el motor declara, no
 * contra una constante copiada: en el suelo justo la cifra está, una sesión antes no.
 */
async function caso5ter() {
  // El umbral se lee de lo que el motor publica, para que la prueba siga a la constante.
  const sonda = await conSesiones(30);
  const suelos = sonda.estadisticos.muestra.suelos;

  for (const [nombre, clave] of [['anualizada', 'rentabilidadAnualizada'], ['ratios', 'ratioSharpe']]) {
    const minimas = suelos[nombre].minimas;

    const justo = (await conSesiones(minimas)).estadisticos;
    t(`suelo de ${nombre} · en ${minimas} sesiones la cifra ya está`,
      justo.muestra.sesiones === minimas && Number.isFinite(justo[clave])
        && justo.muestra.retenidas[clave] === undefined,
      `${justo.muestra.sesiones} sesiones · ${clave} = ${justo[clave]}`);

    const antes = (await conSesiones(minimas - 1)).estadisticos;
    t(`suelo de ${nombre} · una sesión antes no, y anuncia ese mismo umbral`,
      antes[clave] === null && antes.muestra.retenidas[clave]?.minimas === minimas
        && antes.muestra.retenidas[clave]?.restantes === 1,
      `${antes.muestra.sesiones} sesiones · ${JSON.stringify(antes.muestra.retenidas[clave])}`);
  }
}

/*
 * Caso 6 — con muestra suficiente vuelven, y el numerador es el que toca.
 *
 * El Sharpe se afirma contra su definición recalculada aquí mismo desde la serie
 * publicada: exceso MEDIO anualizado sobre volatilidad. Con el CAGR en el numerador
 * —lo que hacía la versión anterior— la cifra sale distinta, porque anualizar por
 * composición extrapola el tramo observado en vez de medirlo.
 */
async function caso6() {
  const f = sesiones(820);
  // Serie determinista con deriva y ruido: sin varianza no hay ratio que comprobar,
  // y sin deriva el CAGR y la media coincidirían y la afirmación no distinguiría nada.
  let semilla = 7;
  const siguiente = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  const cierres = [];
  let precio = 100;
  for (let i = 0; i < f.length; i++) {
    precio *= 1 + 0.0009 + (siguiente() - 0.5) * 0.02;
    cierres.push(Number(precio.toFixed(4)));
  }
  escenario = {
    barras: { J: barras(f, cierres) },
    cotizaciones: { J: { precio: cierres[cierres.length - 1], divisa: 'USD', variacionPct: 0 } },
  };

  const cartera = await calcularCartera([
    linea({ ticker: 'J', fecha_publicacion: f[0], precio_compra: 100 }),
  ]);
  const e = cartera.estadisticos;

  comprobarIdentidad('muestra suficiente', cartera);
  t('muestra suficiente · la muestra se declara bastante', e.muestra?.suficiente === true,
    JSON.stringify(e.muestra?.retenidas));
  t('muestra suficiente · no queda ninguna cifra retenida',
    Object.keys(e.muestra?.retenidas ?? {}).length === 0, JSON.stringify(e.muestra?.retenidas));
  for (const clave of ['rentabilidadAnualizada', 'ratioSharpe', 'ratioSortino', 'ratioCalmar']) {
    t(`muestra suficiente · ${clave} se publica`, Number.isFinite(e[clave]), String(e[clave]));
  }

  // ── El numerador, recalculado aquí desde la serie que la propia cartera publica ──
  const niveles = cartera.serie.map((p) => p.valor);
  const r = [];
  for (let i = 1; i < niveles.length; i++) r.push(niveles[i] / niveles[i - 1] - 1);
  const mediaR = r.reduce((a, b) => a + b, 0) / r.length;
  const varianza = r.reduce((a, x) => a + (x - mediaR) ** 2, 0) / (r.length - 1);
  const vol = Math.sqrt(varianza) * Math.sqrt(252);
  const rf = 0.04;

  const porMedia = ((mediaR - rf / 252) * 252) / vol;          // el correcto
  const anios = (new Date(e.fin) - new Date(e.inicio)) / 86400000 / 365.25;
  const cagr = (1 + e.rentabilidadTotal / 100) ** (1 / anios) - 1;
  const porCagr = (cagr - rf) / vol;                            // el de la versión anterior

  t('muestra suficiente · el Sharpe es el exceso medio anualizado sobre volatilidad',
    casiIgual(e.ratioSharpe, porMedia, 0.011), `publicado ${e.ratioSharpe} · media ${porMedia.toFixed(4)}`);
  t('muestra suficiente · y NO el CAGR sobre volatilidad',
    Math.abs(porMedia - porCagr) > 0.05 && Math.abs(e.ratioSharpe - porCagr) > 0.05,
    `CAGR daría ${porCagr.toFixed(4)} · publicado ${e.ratioSharpe}`);
}

/*
 * Caso 7 — la rentabilidad del anio se calcula, no se copia.
 *
 * Dos direcciones, y hacen falta las dos. Por separado, cualquiera de ellas la
 * pasa una implementacion que publique `rentabilidadTotal` en la casilla del
 * anio: la primera porque hoy coinciden de verdad, la segunda —sola— porque
 * nadie afirmaria que la coincidencia es legitima cuando toca.
 *
 *   a) La serie nace dentro del anio. No hay cierre anterior, la base de ambas
 *      cifras es el mismo capital y valen lo mismo. Es el caso de la cartera de
 *      agosto de 2026, y es el que autoriza las dos casillas de la portada.
 *   b) La serie cruza un 1 de enero. La base del anio pasa a ser el ultimo cierre
 *      de diciembre y las dos cifras se separan. La del anio se recalcula aqui a
 *      mano desde la serie que la propia cartera publica.
 *
 * Se vio fallar: con `rentabilidadAnio: redondear(total * 100)` en el motor, (a)
 * sigue verde y (b) cae en tres afirmaciones —la separacion, el valor recalculado
 * y `anioDesdeCapital`—.
 */
async function caso7() {
  // ── a) la cartera nace dentro del anio: coinciden, y coinciden por la cuenta ──
  const cartera = await conSesiones(140);
  const e = cartera.estadisticos;

  t('anio en curso · el anio sale de la ultima sesion, no del reloj',
    e.anioEnCurso === Number(e.fin.slice(0, 4)), `${e.anioEnCurso} vs fin ${e.fin}`);
  t('anio en curso · sin cierre anterior, se mide desde el capital',
    e.anioDesdeCapital === true && e.anioDesde === e.inicio,
    `desdeCapital ${e.anioDesdeCapital} · desde ${e.anioDesde} · inicio ${e.inicio}`);
  t('anio en curso · nacida dentro del anio, coincide con la total',
    casiIgual(e.rentabilidadAnio, e.rentabilidadTotal),
    `anio ${e.rentabilidadAnio} vs total ${e.rentabilidadTotal}`);

  // ── b) la serie cruza el 1 de enero: se separan ──
  const f = sesiones(300, '2025-06-02');
  let semilla = 23;
  const siguiente = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  let precio = 100;
  const cierres = f.map(() => {
    precio *= 1 + 0.002 + (siguiente() - 0.5) * 0.01;
    return Number(precio.toFixed(4));
  });
  escenario = {
    barras: { K: barras(f, cierres) },
    cotizaciones: { K: { precio: cierres[cierres.length - 1], divisa: 'USD', variacionPct: 0 } },
  };
  const cruzada = await calcularCartera([
    linea({ ticker: 'K', fecha_publicacion: f[0], precio_compra: 100 }),
  ]);
  const c = cruzada.estadisticos;

  comprobarIdentidad('anio a caballo', cruzada);

  // El ultimo cierre del anio anterior, tomado de la serie publicada por la cartera.
  const anio = c.anioEnCurso;
  const anteriores = cruzada.serie.filter((p) => p.fecha < `${anio}-01-01`);
  const cierreAnterior = anteriores[anteriores.length - 1];
  const valorFinal = cruzada.serie[cruzada.serie.length - 1].valor;
  const aMano = (valorFinal / cierreAnterior.valor - 1) * 100;

  t('anio a caballo · la serie cruza de verdad el 1 de enero',
    anteriores.length > 20 && cruzada.serie.length - anteriores.length > 20,
    `${anteriores.length} sesiones antes · ${cruzada.serie.length - anteriores.length} despues`);
  t('anio a caballo · se mide desde el ultimo cierre del anio anterior',
    c.anioDesdeCapital === false && c.anioDesde === cierreAnterior.fecha,
    `desdeCapital ${c.anioDesdeCapital} · desde ${c.anioDesde} vs ${cierreAnterior.fecha}`);
  t('anio a caballo · la cifra del anio es la recalculada a mano',
    casiIgual(c.rentabilidadAnio, aMano, 0.01),
    `publicada ${c.rentabilidadAnio} vs a mano ${aMano.toFixed(4)}`);
  t('anio a caballo · y NO es la rentabilidad total',
    Math.abs(c.rentabilidadAnio - c.rentabilidadTotal) > 5,
    `anio ${c.rentabilidadAnio} · total ${c.rentabilidadTotal}`);
}

// ─────────────────────────────── ejecución ───────────────────────────────

(async () => {
  for (const [nombre, caso] of [['caso 1', caso1], ['caso 2', caso2], ['caso 3', caso3], ['caso 4', caso4],
    ['caso 5', caso5], ['caso 5 bis', caso5bis], ['caso 5 ter', caso5ter], ['caso 6', caso6], ['caso 7', caso7]]) {
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
