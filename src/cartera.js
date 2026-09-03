'use strict';

/**
 * Motor de cartera y analitica cuantitativa.
 *
 * La cartera de Warrants & Co. se deriva integramente de las tesis publicadas:
 * cada informe marcado como posicion genera una linea.
 *
 *   Precio de entrada  El precio de compra consignado en la ficha. Si no se indica,
 *                      se toma el cierre de la sesion en que se publico el informe.
 *   Toma de beneficios Si la ficha fija un take profit, la posicion se liquida de
 *                      forma automatica en la primera sesion cuyo maximo lo alcanza.
 *                      El importe realizado permanece como caja.
 *
 * Metodologia del indice (base 100 = capital):
 *   Tramos fijos. Cada tesis compra en su alta un tramo del capital —su peso— y lo
 *   conserva hasta que se liquida; lo que aun no ha entrado, y lo que sale, es caja.
 *   No hay rebalanceo: ni las vivas se re-dimensionan al entrar otra, ni el importe
 *   de una salida financia a nadie. No existen aportaciones ni reembolsos externos,
 *   de modo que el indice recoge exclusivamente rendimiento.
 *
 *   De ahi la propiedad que gobierna esta pagina y que `tests/cartera.js` vigila:
 *
 *       Σ (peso × rentabilidad de la linea) = rentabilidad total
 *
 *   Las lineas son aditivas porque cada una responde de su propio tramo. El motor
 *   anterior redistribuia todo el patrimonio en cada alta —caja incluida— y
 *   renormalizaba los pesos entre las vivas: publicaba +169,94 % donde sus lineas
 *   sumaban +67,85 %.
 */

const mercado = require('./market');

const SESIONES_ANIO = 252;
const BASE_INDICE = 100;

/* Motivo de cierre de una posicion: dos causas, ambas automaticas. Codigo,
   no frase — la traduccion vive en el cliente (`vocabulario.js`,
   `etiquetaMotivoCierre`), que antes no tenia nada que traducir porque el
   motivo llegaba ya redactado en castellano. */
const MOTIVOS_CIERRE = {
  TAKE_PROFIT_ALCANZADO: 'Take profit alcanzado',
  STOP_LOSS_ALCANZADO: 'Stop loss alcanzado',
};

/*
 * Dos suelos de muestra, y por motivos distintos.
 *
 * ANUALIZADA · un anio. Antes de cumplirlo, anualizar por composicion extrapola un
 * tramo que no se ha recorrido: de 7 meses al +67,85 % salia un CAGR del +153,92 %,
 * que no es un dato sino una proyeccion. Cumplido el anio, la misma cuenta es la
 * anualizacion de un rendimiento ocurrido —un hecho—, y retenerla seria ocultar dato.
 *
 * RATIOS AJUSTADOS POR RIESGO · tres anios. Es el minimo del oficio —Morningstar no
 * calcula medidas ajustadas por riesgo por debajo de ese plazo; GIPS exige cinco de
 * track record— y la aritmetica lo respalda: el error tipico de un Sharpe es
 *
 *     SE(SR) = √252 · √((1 + SR_d² / 2) / N)
 *
 * de modo que depende del PLAZO y no de la frecuencia —muestrear a diario en vez de
 * a mes no compra precision—. Con 141 sesiones sale ±1,35 y el intervalo del 95 %
 * incluye el cero; con 756 baja a ±0,58. Ahi no se publica un numero peor: no se
 * publica numero, y se declara cuanto falta.
 */
const SESIONES_MINIMAS_ANUALIZADA = SESIONES_ANIO;
const SESIONES_MINIMAS_RATIOS = 3 * SESIONES_ANIO;

/*
 * Que suelo espera cada cifra. La tabla es la unica fuente: de ella salen tanto la
 * puerta que decide si se calcula como el rotulo que declara cuanto falta. Cuando
 * eran dos expresiones separadas, cambiar una y no la otra dejaba a la plataforma
 * reteniendo una cifra hasta las 756 sesiones mientras anunciaba que llegaria a las
 * 252 —una cifra retenida que miente sobre su propia espera—, y ninguna prueba de
 * interfaz podia verlo porque el rotulo, por si solo, era coherente.
 */
const SUELO_POR_CIFRA = {
  rentabilidadAnualizada: SESIONES_MINIMAS_ANUALIZADA,
  ratioSharpe: SESIONES_MINIMAS_RATIOS,
  ratioSortino: SESIONES_MINIMAS_RATIOS,
  ratioCalmar: SESIONES_MINIMAS_RATIOS,
  alfaJensen: SESIONES_MINIMAS_RATIOS,
  // Beta y correlacion son insumo del alfa: mismo suelo que su resultado, o la
  // cartera retendria el alfa mientras publica el ingrediente del que sale.
  beta: SESIONES_MINIMAS_RATIOS,
  correlacionIndice: SESIONES_MINIMAS_RATIOS,
};

// ------------------------------------------------------------- utilidades

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function desviacionTipica(xs) {
  if (xs.length < 2) return 0;
  const m = media(xs);
  // Cuasivarianza (n-1): estimador insesgado sobre una muestra de rendimientos.
  const v = xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function covarianza(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = media(xs.slice(0, n));
  const my = media(ys.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (xs[i] - mx) * (ys[i] - my);
  return s / (n - 1);
}

const redondear = (x, d = 2) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);

/** Serie de rendimientos simples a partir de una serie de niveles. */
function rendimientos(niveles) {
  const r = [];
  for (let i = 1; i < niveles.length; i++) {
    const previo = niveles[i - 1];
    if (previo > 0) r.push(niveles[i] / previo - 1);
  }
  return r;
}

function maximaCaida(niveles) {
  let pico = -Infinity;
  let peor = 0;
  let inicio = null;
  let finCaida = null;
  let picoActual = null;
  for (const p of niveles) {
    if (p.valor > pico) {
      pico = p.valor;
      picoActual = p.fecha;
    }
    const caida = pico > 0 ? p.valor / pico - 1 : 0;
    if (caida < peor) {
      peor = caida;
      inicio = picoActual;
      finCaida = p.fecha;
    }
  }
  return { caida: peor * 100, desde: inicio, hasta: finCaida };
}

// --------------------------------------------------- construccion de series

/**
 * Alinea los historicos de varios valores sobre un calendario comun.
 * Se arrastra el ultimo dato disponible para cubrir festivos no coincidentes.
 * Se conservan el maximo y el minimo de cada sesion: determinan si se alcanza
 * el take profit o se cruza el stop loss.
 */
function alinear(historicos) {
  const calendario = new Set();
  for (const filas of historicos.values()) for (const f of filas) calendario.add(f.fecha);
  const fechas = [...calendario].sort();

  const series = new Map();
  for (const [simbolo, filas] of historicos) {
    const porFecha = new Map(filas.map((f) => [f.fecha, f]));
    const alineada = new Map();
    let ultimo = null;
    for (const fecha of fechas) {
      const f = porFecha.get(fecha);
      if (f && typeof f.cierre === 'number') {
        ultimo = {
          cierre: f.cierre,
          maximo: typeof f.maximo === 'number' ? f.maximo : f.cierre,
          minimo: typeof f.minimo === 'number' ? f.minimo : f.cierre,
          real: true,
        };
      } else if (ultimo) {
        // Sesion sin cruce: se arrastra el cierre, pero no un maximo/minimo que no existio.
        ultimo = { cierre: ultimo.cierre, maximo: ultimo.cierre, minimo: ultimo.cierre, real: false };
      }
      if (ultimo !== null) alineada.set(fecha, ultimo);
    }
    series.set(simbolo, alineada);
  }
  return { fechas, series };
}

/**
 * Construye el indice de la cartera aplicando compras, tomas de beneficios y caja.
 *
 * Cada tesis compra su tramo de capital en el alta y no se vuelve a tocar. El
 * importe de una liquidacion regresa a la caja y ahi permanece: quien entre
 * despues comprara con su propio tramo, no con el dinero de la que salio.
 *
 * @returns {{serie: Array, posiciones: Array, liquidez: number}}
 */
function construirIndice(posiciones, fechas, series) {
  const activas = posiciones.filter((p) => series.has(p.ticker));
  if (!activas.length) return { serie: [], posiciones: [], liquidez: BASE_INDICE };

  const primeraAlta = activas.reduce((min, p) => (p.fechaAlta < min ? p.fechaAlta : min), activas[0].fechaAlta);
  const calendario = fechas.filter((f) => f >= primeraAlta);
  if (!calendario.length) return { serie: [], posiciones: [], liquidez: BASE_INDICE };

  const tramos = new Map(); // ticker -> capital asignado en el alta
  const unidades = new Map(); // ticker -> titulos vigentes
  const entradas = new Map(); // ticker -> { fecha, precio } efectivos
  const cerradas = new Map(); // ticker -> { fecha, precio, motivo }

  // El capital arranca integro en caja: cada alta retira de aqui su tramo, y lo
  // que ninguna tesis reclama sigue sin invertir en lugar de repartirse solo.
  let liquidez = BASE_INDICE;
  const serie = [];

  for (const fecha of calendario) {
    // 1 · Altas del dia: la tesis compra su tramo con cargo a la caja. Se ejecuta
    //     primero para que quede valorada y sujeta a toma de beneficios ya en su
    //     propia sesion de alta.
    for (const p of activas) {
      if (entradas.has(p.ticker) || p.fechaAlta > fecha) continue;
      const datos = series.get(p.ticker).get(fecha);
      if (!datos || !(datos.cierre > 0)) continue;

      const capital = BASE_INDICE * (p.peso / 100);
      // La compra usa el precio pagado; si la ficha no lo consigna, el cierre del alta.
      const precio = Number.isFinite(p.precioCompra) && p.precioCompra > 0 ? p.precioCompra : datos.cierre;

      tramos.set(p.ticker, capital);
      unidades.set(p.ticker, capital / precio);
      entradas.set(p.ticker, { fecha, precio });
      liquidez -= capital;
    }

    // 2 · Toma de beneficios: se liquida al nivel fijado en la primera sesion que lo alcanza.
    for (const p of activas) {
      if (cerradas.has(p.ticker) || !unidades.has(p.ticker)) continue;
      if (!Number.isFinite(p.takeProfit) || p.takeProfit <= 0) continue; // TP debe ser positivo y finito
      const datos = series.get(p.ticker).get(fecha);
      if (!datos || !datos.real) continue;
      if (datos.maximo >= p.takeProfit) {
        liquidez += unidades.get(p.ticker) * p.takeProfit;
        unidades.delete(p.ticker);
        cerradas.set(p.ticker, { fecha, precio: p.takeProfit, motivo: 'TAKE_PROFIT_ALCANZADO' });
      }
    }

    // 2b · Stop loss: se liquida al cierre de la sesion que cruza el nivel, no al
    //      nivel exacto — un stop real se ejecuta con deslizamiento, y suponer el
    //      precio del stop seria mas optimista que el mercado.
    for (const p of activas) {
      if (cerradas.has(p.ticker) || !unidades.has(p.ticker)) continue;
      if (!Number.isFinite(p.stopLoss) || p.stopLoss <= 0) continue;
      const datos = series.get(p.ticker).get(fecha);
      if (!datos || !datos.real) continue;
      if (datos.minimo <= p.stopLoss) {
        liquidez += unidades.get(p.ticker) * datos.cierre;
        unidades.delete(p.ticker);
        cerradas.set(p.ticker, { fecha, precio: datos.cierre, motivo: 'STOP_LOSS_ALCANZADO' });
      }
    }

    // 3 · Valoracion de cierre: posiciones vivas mas la caja.
    if (entradas.size) {
      let v = liquidez;
      for (const [t, u] of unidades) {
        const precio = series.get(t).get(fecha)?.cierre;
        if (typeof precio === 'number') v += u * precio;
      }
      serie.push({ fecha, valor: redondear(v, 4) });
    }
  }

  const detalle = activas.map((p) => {
    const entrada = entradas.get(p.ticker) ?? null;
    const cierre = cerradas.get(p.ticker) ?? null;
    return {
      ...p,
      fechaEntrada: entrada?.fecha ?? null,
      precioEntrada: entrada?.precio ?? null,
      // Capital asignado en el alta, en unidades de indice. Es lo que la linea
      // responde: su contribucion es cuanto vale hoy ese tramo menos lo que costo.
      tramo: entrada ? BASE_INDICE * (p.peso / 100) : null,
      cerrada: Boolean(cierre),
      fechaCierre: cierre?.fecha ?? null,
      precioCierre: cierre?.precio ?? null,
      motivoCierre: cierre?.motivo ?? null,
    };
  });

  return { serie, posiciones: detalle, liquidez };
}

// ------------------------------------------------------------ estadisticos

/**
 * @param {Array} serie          indice de la cartera, base 100 = capital invertido
 * @param {Array} serieIndice    indice de referencia, rebasado a 100
 * @param {number} tasaLibreRiesgo
 * @param {number} baseCapital   valor del indice que representa el capital invertido
 */
function calcularEstadisticos(serie, serieIndice, tasaLibreRiesgo, baseCapital = BASE_INDICE) {
  if (serie.length < 2) return null;

  const niveles = serie.map((p) => p.valor);
  const r = rendimientos(niveles);
  if (!r.length) return null;

  /*
   * La rentabilidad se mide desde el CAPITAL INVERTIDO, no desde el primer punto
   * registrado de la serie. Ambos coinciden salvo que la ficha declare precio de
   * compra: en ese caso el primer cierre ya recoge la diferencia entre lo pagado y
   * el cierre de esa jornada, que es rentabilidad del inversor y debe computar.
   * Tomar `niveles[0]` como base la descartaría.
   */
  const valorFinal = niveles[niveles.length - 1];
  const total = valorFinal / baseCapital - 1;

  /*
   * Rentabilidad del anio en curso. Se calcula APARTE de la total aunque hoy
   * coincidan, y esa es toda la razon de que exista este bloque.
   *
   * Coinciden porque la cartera nace dentro del anio: no hay cierre anterior del
   * que partir, de modo que la base de ambas es el mismo capital y el cociente es
   * el mismo. Es una identidad de la aritmetica, no una copia del campo. El dia en
   * que la serie cruce un 1 de enero, la base del anio pasa a ser el ultimo cierre
   * de diciembre y las dos cifras se separan solas.
   *
   * Leer `rentabilidadTotal` en las dos casillas de la portada las habria hecho
   * coincidir tambien ese dia —y sin que se viera en pantalla, que es el modo en
   * que estos fallos han llegado siempre—. De ahi que viaje ademas `anioDesde`:
   * el rotulo dice desde donde mide, y sale de la misma cuenta que la cifra.
   *
   * El anio lo fija la ultima sesion de la serie, no el reloj: asi la cifra y su
   * rotulo hablan del anio del que hay datos, y la prueba es determinista.
   */
  const anioEnCurso = Number(serie[serie.length - 1].fecha.slice(0, 4));
  const primeroDelAnio = `${anioEnCurso}-01-01`;
  let cierreAnterior = null;
  for (const p of serie) {
    if (p.fecha >= primeroDelAnio) break;
    cierreAnterior = p;
  }
  const baseAnio = cierreAnterior ? cierreAnterior.valor : baseCapital;
  const rentAnio = baseAnio > 0 ? valorFinal / baseAnio - 1 : null;
  // Misma fecha de arranque que usará el benchmark más abajo: una sola cuenta,
  // vista dos veces (Regla 9) — «desde cuándo mide el año» no puede tener una
  // respuesta para la cartera y otra para el índice.
  const anioDesde = cierreAnterior ? cierreAnterior.fecha : serie[0].fecha;

  const dias = (new Date(serie[serie.length - 1].fecha) - new Date(serie[0].fecha)) / 86400000;
  const anios = Math.max(dias / 365.25, 1 / 365.25);

  /*
   * Muestra: por debajo del suelo, lo anualizado y los ratios no se calculan peor,
   * no se calculan. Se declara el recuento para que la interfaz pueda decir cuantas
   * sesiones faltan en lugar de un «no disponible» mudo: la cifra llegara.
   */
  const sesiones = serie.length;
  const alcanza = (clave) => sesiones >= SUELO_POR_CIFRA[clave];
  const hayAnualizada = alcanza('rentabilidadAnualizada');
  const hayRatios = alcanza('ratioSharpe');

  const anualizada = hayAnualizada ? (1 + total) ** (1 / anios) - 1 : null;

  const volDiaria = desviacionTipica(r);
  const volatilidad = volDiaria * Math.sqrt(SESIONES_ANIO);

  const rf = tasaLibreRiesgo / 100;

  /*
   * Numerador de Sharpe y Sortino: el exceso MEDIO anualizado, no el CAGR.
   * Anualizar por composicion extrapola el tramo observado, y el ratio heredaba esa
   * extrapolacion: con la cartera de agosto de 2026 el CAGR daba 153,92 % frente al
   * 93,54 % de la media, y el Sharpe subia de 2,58 a 4,32 sin que nada lo hubiera
   * ganado. El denominador ya es una media anualizada por √252: el numerador tiene
   * que serlo por 252, o se comparan dos magnitudes distintas.
   */
  const excesoAnual = (media(r) - rf / SESIONES_ANIO) * SESIONES_ANIO;
  const sharpe = hayRatios && volatilidad > 0 ? excesoAnual / volatilidad : null;

  const negativos = r.filter((x) => x < 0);
  const volBajista = desviacionTipica(negativos) * Math.sqrt(SESIONES_ANIO);
  const sortino = hayRatios && volBajista > 0 ? excesoAnual / volBajista : null;

  const dd = maximaCaida(serie);
  // Calmar si conserva el CAGR en el numerador: es un rendimiento compuesto sobre
  // caida. Pero es un ajustado por riesgo y espera al suelo de los ratios, no al de la
  // anualizada: la caida maxima de una muestra corta es un unico episodio.
  const calmar = hayRatios && dd.caida < 0 && anualizada !== null
    ? anualizada / Math.abs(dd.caida / 100)
    : null;

  // Comparativa con el indice de referencia sobre fechas estrictamente comunes.
  let beta = null;
  let alfa = null;
  let correlacion = null;
  let rentBenchmark = null;
  let rentBenchmarkAnio = null;
  let valorIndexadoBenchmark = null;
  if (serieIndice && serieIndice.length > 1) {
    const mapaBench = new Map(serieIndice.map((p) => [p.fecha, p.valor]));

    /*
     * Rentabilidad del benchmark en el año en curso, midiendo desde LA MISMA
     * fecha que ya fija `anioDesde` para la cartera (cierre anterior al 1 de
     * enero, o el arranque de la cartera si nace dentro del propio año). Sin
     * esto, «YTD Portfolio» y «YTD S&P 500» medirían ventanas distintas —la
     * comparación dejaría de ser una comparación—. `serieIndice` puede no
     * tener sesión exactamente en `anioDesde` (festivo, fin de semana): se
     * toma el último cierre disponible EN o ANTES de esa fecha, el mismo
     * criterio que ya usa `cierreAnterior` para la propia cartera.
     */
    let baseBenchAnio = mapaBench.get(anioDesde);
    if (baseBenchAnio === undefined) {
      let candidato = null;
      for (const p of serieIndice) {
        if (p.fecha > anioDesde) break;
        candidato = p;
      }
      baseBenchAnio = candidato ? candidato.valor : null;
    }
    const valorFinalBench = serieIndice[serieIndice.length - 1].valor;
    rentBenchmarkAnio = (baseBenchAnio != null && baseBenchAnio > 0)
      ? valorFinalBench / baseBenchAnio - 1
      : null;

    const comunes = serie.filter((p) => mapaBench.has(p.fecha));
    if (comunes.length > 2) {
      const rc = rendimientos(comunes.map((p) => p.valor));
      const rb = rendimientos(comunes.map((p) => mapaBench.get(p.fecha)));
      const n = Math.min(rc.length, rb.length);
      if (n > 2) {
        const varB = desviacionTipica(rb.slice(0, n)) ** 2;
        const cov = covarianza(rc.slice(0, n), rb.slice(0, n));
        if (hayRatios) {
          beta = varB > 0 ? cov / varB : null;
          const sdC = desviacionTipica(rc.slice(0, n));
          const sdB = Math.sqrt(varB);
          correlacion = sdC > 0 && sdB > 0 ? cov / (sdC * sdB) : null;
        }

        const nivelesB = comunes.map((p) => mapaBench.get(p.fecha));
        // El índice de referencia sí arranca exactamente en su base al rebasarse.
        rentBenchmark = nivelesB[nivelesB.length - 1] / nivelesB[0] - 1;
        valorIndexadoBenchmark = nivelesB[nivelesB.length - 1];
        // Alfa de Jensen anualizada.
        // El alfa de Jensen es un ajustado por riesgo: mismo suelo que los ratios.
        if (hayRatios && beta !== null && anualizada !== null) {
          const benchAnual = (1 + rentBenchmark) ** (1 / anios) - 1;
          alfa = anualizada - (rf + beta * (benchAnual - rf));
        }
      }
    }
  }

  const positivas = r.filter((x) => x > 0).length;

  /*
   * Que cifras retiene cada suelo, y cuanto les falta. Viaja resuelto para que la
   * interfaz no tenga que saberse ni la lista ni los umbrales: una celda nombrada
   * aqui se rotula con sus sesiones pendientes, y una celda vacia que NO este aqui
   * sigue siendo un «no disponible» corriente, que es otra cosa.
   */
  const suelo = (minimas) => ({
    minimas,
    anios: Math.round(minimas / SESIONES_ANIO),
    restantes: Math.max(minimas - sesiones, 0),
  });
  const retenidas = {};
  for (const [clave, minimas] of Object.entries(SUELO_POR_CIFRA)) {
    if (sesiones < minimas) retenidas[clave] = suelo(minimas);
  }
  const muestra = {
    sesiones,
    suficiente: Object.keys(retenidas).length === 0,
    suelos: {
      anualizada: suelo(SESIONES_MINIMAS_ANUALIZADA),
      ratios: suelo(SESIONES_MINIMAS_RATIOS),
    },
    retenidas,
  };

  return {
    inicio: serie[0].fecha,
    fin: serie[serie.length - 1].fecha,
    sesiones: serie.length,
    muestra,

    // Rentabilidad: (valor final / capital invertido − 1) × 100.
    rentabilidadTotal: redondear(total * 100),
    /*
     * Rentabilidad del anio en curso, su anio y desde donde mide. Los tres salen
     * del mismo calculo: la casilla no tiene que deducir su propio rotulo.
     */
    rentabilidadAnio: rentAnio === null ? null : redondear(rentAnio * 100),
    anioEnCurso,
    anioDesde,
    anioDesdeCapital: cierreAnterior === null,
    // Valor indexado: el nivel del índice, en la misma base que el capital.
    // Se publica aparte para que nunca se presente como si fuera rentabilidad.
    baseCapital,
    valorIndexado: redondear(valorFinal, 2),
    valorIndexadoInicial: redondear(niveles[0], 2),
    rentabilidadAnualizada: anualizada === null ? null : redondear(anualizada * 100),
    volatilidadAnualizada: redondear(volatilidad * 100),
    ratioSharpe: sharpe === null ? null : redondear(sharpe, 2),
    ratioSortino: sortino === null ? null : redondear(sortino, 2),
    ratioCalmar: calmar === null ? null : redondear(calmar, 2),
    maximaCaida: redondear(dd.caida),
    maximaCaidaDesde: dd.desde,
    maximaCaidaHasta: dd.hasta,
    mejorSesion: redondear(Math.max(...r) * 100),
    peorSesion: redondear(Math.min(...r) * 100),
    sesionesPositivasPct: redondear((positivas / r.length) * 100),
    beta: beta === null ? null : redondear(beta, 2),
    alfaJensen: alfa === null ? null : redondear(alfa * 100),
    correlacionIndice: correlacion === null ? null : redondear(correlacion, 2),
    rentabilidadIndice: rentBenchmark === null ? null : redondear(rentBenchmark * 100),
    // Mismo `anioDesde` que `rentabilidadAnio`: las dos cifras del Hero miden
    // desde la misma fecha, así que su comparación es la afirmación real de
    // «cómo le va a la cartera frente al mercado este año», no dos ventanas
    // distintas puestas una junto a otra.
    rentabilidadIndiceAnio: rentBenchmarkAnio === null ? null : redondear(rentBenchmarkAnio * 100),
    valorIndexadoIndice: valorIndexadoBenchmark === null ? null : redondear(valorIndexadoBenchmark, 2),
    tasaLibreRiesgo,
  };
}

// ------------------------------------------------------------- punto de entrada

/**
 * Calcula la cartera completa: composicion, serie historica y estadisticos.
 * @param {Array} lineas  informes que constituyen posicion
 * @param {object} opciones { benchmark, tasaLibreRiesgo }
 */
async function calcularCartera(lineas, { benchmark = 'SPY', tasaLibreRiesgo = 4 } = {}) {
  const avisos = [];

  // Una tesis por valor: prevalece la publicacion mas antigua como fecha de alta,
  // y la mas reciente aporta la vision y los niveles operativos vigentes.
  const porTicker = new Map();
  for (const l of lineas) {
    const ticker = mercado.normalizarSimbolo(l.ticker);
    if (!ticker) {
      if (l.ticker) avisos.push(`Ticker no válido, excluido de cartera: ${l.ticker}`);
      continue;
    }
    const previo = porTicker.get(ticker);
    if (!previo) {
      porTicker.set(ticker, {
        ticker,
        empresa: l.empresa,
        sector: l.sector || 'No asignado',
        pais: l.pais || null,
        fechaAlta: l.fecha_publicacion,
        peso: Number.isFinite(l.peso_cartera) && l.peso_cartera > 0 ? l.peso_cartera : null,
        recomendacion: l.recomendacion || null,
        precioObjetivo: Number.isFinite(l.precio_objetivo) ? l.precio_objetivo : null,
        precioCompra: Number.isFinite(l.precio_compra) ? l.precio_compra : null,
        takeProfit: Number.isFinite(l.take_profit) ? l.take_profit : null,
        stopLoss: Number.isFinite(l.stop_loss) ? l.stop_loss : null,
        divisa: l.divisa || 'USD',
        informes: 1,
        informeId: l.id,
      });
    } else {
      previo.informes++;
      if (l.fecha_publicacion < previo.fechaAlta) previo.fechaAlta = l.fecha_publicacion;
      // El informe mas reciente fija la vision vigente.
      if (l.fecha_publicacion >= previo.fechaAlta) {
        previo.recomendacion = l.recomendacion || previo.recomendacion;
        if (Number.isFinite(l.precio_objetivo)) previo.precioObjetivo = l.precio_objetivo;
        if (Number.isFinite(l.peso_cartera) && l.peso_cartera > 0) previo.peso = l.peso_cartera;
        if (Number.isFinite(l.precio_compra)) previo.precioCompra = l.precio_compra;
        if (Number.isFinite(l.take_profit)) previo.takeProfit = l.take_profit;
        if (Number.isFinite(l.stop_loss)) previo.stopLoss = l.stop_loss;
      }
    }
  }

  let posiciones = [...porTicker.values()];
  if (!posiciones.length) {
    return {
      posiciones: [], serie: [], serieIndice: [], estadisticos: null, avisos,
      benchmark, generadoEn: new Date().toISOString(),
    };
  }

  /*
   * Equiponderacion para las lineas sin peso explicito, sobre el remanente.
   *
   * El peso es una fraccion ABSOLUTA del capital, no relativa entre las
   * posiciones publicadas: cinco tesis al 4 % declaran 20 % desplegado y un
   * 80 % que sigue en caja de verdad, no un 4 % que el motor infla al 20 %
   * cada una para que sumen 100. Antes SI se renormalizaba —vease el commit
   * que anadio `resumenPortfolio`—, y eso hacia imposible declarar capital
   * sin desplegar: cualquier conjunto de pesos explicitos terminaba sumando
   * 100 igual, aunque el analista hubiera escrito 4 %.
   *
   * Solo se guarda una red de seguridad: si la suma declarada excede 100 —
   * dato imposible, no una decision de cartera—, se recorta proporcionalmente
   * y se avisa, en vez de publicar una cartera que pesa mas de si misma. */
  const conPeso = posiciones.filter((p) => p.peso !== null);
  const sinPeso = posiciones.filter((p) => p.peso === null);
  const asignado = conPeso.reduce((a, p) => a + p.peso, 0);
  if (sinPeso.length) {
    const remanente = Math.max(100 - asignado, 0);
    const cuota = remanente > 0 ? remanente / sinPeso.length : 0;
    for (const p of sinPeso) p.peso = cuota;
  }
  const sumaPesos = posiciones.reduce((a, p) => a + p.peso, 0);
  if (sumaPesos > 100) {
    avisos.push(`Los pesos declarados suman ${redondear(sumaPesos)} %; se recortan a 100 % en proporción.`);
    for (const p of posiciones) p.peso = (p.peso / sumaPesos) * 100;
  }

  const desde = posiciones.reduce((min, p) => (p.fechaAlta < min ? p.fechaAlta : min), posiciones[0].fechaAlta);

  // Descarga en paralelo de historicos y cotizaciones vivas.
  const simbolos = posiciones.map((p) => p.ticker);
  const [resHist, resBench, { cotizaciones, fallidos }] = await Promise.all([
    Promise.allSettled(simbolos.map((s) => mercado.obtenerHistorico(s, desde))),
    mercado.obtenerHistorico(benchmark, desde).catch((e) => {
      avisos.push(`Índice de referencia ${benchmark} no disponible: ${e.message}`);
      return null;
    }),
    mercado.obtenerCotizaciones(simbolos),
  ]);

  const historicos = new Map();
  resHist.forEach((r, i) => {
    if (r.status === 'fulfilled') historicos.set(simbolos[i], r.value);
    else avisos.push(`Sin histórico para ${simbolos[i]}: ${r.reason?.message ?? 'error desconocido'}`);
  });
  for (const f of fallidos) avisos.push(`Sin cotización para ${f.simbolo}: ${f.motivo}`);

  if (!historicos.size) {
    return {
      posiciones: posiciones.map((p) => ({ ...p, peso: redondear(p.peso) })),
      serie: [], serieIndice: [], estadisticos: null,
      avisos: [...avisos, 'No ha sido posible construir la serie histórica de la cartera.'],
      benchmark, generadoEn: new Date().toISOString(),
    };
  }

  const { fechas, series } = alinear(historicos);

  // Diagnóstico: detectar TPs cero o inválidos
  for (const p of posiciones) {
    if (p.takeProfit !== null && !Number.isFinite(p.takeProfit)) {
      avisos.push(`${p.ticker}: take profit no válido (${p.takeProfit}), se ignora.`);
    } else if (Number.isFinite(p.takeProfit) && p.takeProfit <= 0) {
      avisos.push(`${p.ticker}: take profit ≤ 0 (${p.takeProfit}), se ignora. Comprueba el valor en el informe.`);
    } else if (p.precioCompra !== null && Number.isFinite(p.takeProfit) && p.takeProfit <= p.precioCompra) {
      avisos.push(`${p.ticker}: take profit (${p.takeProfit}) ≤ precio de compra (${p.precioCompra}), no puede liquidarse con ganancia.`);
    }
  }

  const { serie, posiciones: detalladas, liquidez } = construirIndice(posiciones, fechas, series);

  // Serie del indice de referencia, rebasada a 100 en la fecha de arranque.
  let serieIndice = [];
  if (resBench && serie.length) {
    const inicio = serie[0].fecha;
    const filtrado = resBench.filter((f) => f.fecha >= inicio);
    if (filtrado.length) {
      const base = filtrado[0].cierre;
      serieIndice = filtrado.map((f) => ({ fecha: f.fecha, valor: redondear((f.cierre / base) * BASE_INDICE, 4) }));
    }
  }

  const ultimaSesion = serie.length ? serie[serie.length - 1].fecha : null;

  const detalle = detalladas.map((p) => {
    const q = cotizaciones.get(p.ticker) ?? null;
    const precioMercado = q?.precio ?? null;
    const entrada = p.precioEntrada;
    const ultimoCierre = ultimaSesion ? series.get(p.ticker)?.get(ultimaSesion)?.cierre ?? null : null;

    /*
     * Precio de referencia: el que valora la linea y con el que se calcula su
     * contribucion. Viaja con su procedencia declarada, porque de eso depende que
     * la aritmetica se pueda seguir a mano: una liquidada responde a su precio de
     * salida; una viva, a la cotizacion, y si ningun proveedor la publica, al
     * ultimo cierre conocido. Nunca se rellena con nada.
     */
    let precioReferencia = null;
    let fuentePrecio = null;
    if (p.cerrada) {
      precioReferencia = p.precioCierre;
      fuentePrecio = 'salida';
    } else if (Number.isFinite(precioMercado)) {
      precioReferencia = precioMercado;
      fuentePrecio = 'cotizacion';
    } else if (Number.isFinite(ultimoCierre)) {
      precioReferencia = ultimoCierre;
      fuentePrecio = 'cierre';
    }

    const rentabilidad = entrada && precioReferencia ? (precioReferencia / entrada - 1) * 100 : null;
    // Lo que vale hoy el tramo comprado en el alta. Su contribucion es la diferencia
    // con lo que costo, de modo que las lineas suman el patrimonio por construccion.
    const valorTramo = Number.isFinite(p.tramo) && rentabilidad !== null
      ? p.tramo * (1 + rentabilidad / 100)
      : null;

    const potencial = !p.cerrada && precioMercado && p.precioObjetivo
      ? (p.precioObjetivo / precioMercado - 1) * 100
      : null;

    // Recorrido pendiente hasta la toma de beneficios.
    const recorridoTP = !p.cerrada && precioMercado && Number.isFinite(p.takeProfit)
      ? (p.takeProfit / precioMercado - 1) * 100
      : null;

    return {
      ticker: p.ticker,
      empresa: p.empresa,
      sector: p.sector,
      pais: p.pais,
      informeId: p.informeId,
      informes: p.informes,
      fechaAlta: p.fechaAlta,
      fechaEntrada: p.fechaEntrada,
      // Peso de capital: el tramo que se le asigno en el alta y del que responde.
      peso: redondear(p.peso),
      tramo: redondear(p.tramo, 4),
      recomendacion: p.recomendacion,
      precioEntrada: redondear(entrada, 4),
      precioCompra: redondear(p.precioCompra, 4),
      precioActual: redondear(precioMercado, 4),
      precioReferencia: redondear(precioReferencia, 4),
      fuentePrecio,
      precioObjetivo: p.precioObjetivo,
      takeProfit: p.takeProfit,
      stopLoss: p.stopLoss,
      divisa: q?.divisa ?? p.divisa ?? 'USD',
      /* Cuando imprimio el mercado este precio, y si es eso de verdad.
         Se publica —en vez de quedarse en el orquestador, que es donde estaba—
         porque sin ello el cliente no puede decir nada honesto sobre frescura:
         solo sabria cuando lo pidio el, que con el mercado cerrado avanza igual.
         Una linea cerrada no cotiza, de modo que no lleva ninguno de los dos. */
      momento: p.cerrada ? null : (q?.momento ?? null),
      momentoDeMercado: p.cerrada ? null : Boolean(q?.momentoDeMercado),
      estadoMercado: p.cerrada ? null : (q?.estadoMercado ?? null),
      variacionDiaPct: p.cerrada ? null : redondear(q?.variacionPct),
      rentabilidadPct: redondear(rentabilidad),
      valorTramo: redondear(valorTramo, 4),
      potencialPct: redondear(potencial),
      recorridoTakeProfitPct: redondear(recorridoTP),
      contribucionPct: redondear(valorTramo !== null ? valorTramo - p.tramo : null),
      cerrada: p.cerrada,
      fechaCierre: p.fechaCierre,
      precioCierre: redondear(p.precioCierre, 4),
      motivoCierre: p.motivoCierre,
      fuente: q?.fuente ?? null,
      fundamentales: q?.fundamentales ?? null,
      estadoMercado: q?.estadoMercado ?? null,
    };
  });

  const abiertas = detalle.filter((p) => !p.cerrada);
  const liquidadas = detalle.filter((p) => p.cerrada);

  /*
   * Patrimonio a precios de referencia: cada viva vale su tramo actualizado y las
   * liquidadas ya estan dentro de la caja. Con el se marca la ultima sesion de la
   * serie, para que grafico, estadisticos y desglose hablen de un unico precio: si
   * el titular saliera del ultimo cierre y las contribuciones de la cotizacion,
   * dejarian de sumar por la diferencia entre ambos.
   */
  const patrimonio = abiertas.reduce((a, p) => a + (p.valorTramo ?? 0), 0) + liquidez;
  if (serie.length) serie[serie.length - 1] = { fecha: ultimaSesion, valor: redondear(patrimonio, 4) };
  const base = patrimonio > 0 ? patrimonio : BASE_INDICE;

  /* Peso actual: cuanto pesa hoy la linea sobre el patrimonio, con la caja
     dentro. Sin `valorTramo` —ninguna cotizacion ni cierre cacheado todavia—
     no hay con que calcularlo, y la ausencia no es un cero: es que la linea
     no se ha podido valorar hoy. `?? 0` seguia siendo correcto para el
     PATRIMONIO total dos lineas arriba (una suma necesita un numero), pero
     aqui convertia esa misma ausencia en un peso real del 0%, que es
     precisamente el hecho que el resto de la plataforma ya esperaba poder
     no tener: `public/anillo.js` ya filtra por `Number.isFinite(pesoVigente)`
     y `public/app.js` ya cae a `p.peso` cuando falta, los dos escritos para
     un `pesoVigente` que aqui nunca llegaba a faltar. */
  for (const p of abiertas) {
    p.pesoVigente = p.valorTramo !== null ? redondear((p.valorTramo / base) * 100) : null;
  }

  const estadisticos = calcularEstadisticos(serie, serieIndice, tasaLibreRiesgo, BASE_INDICE);

  /*
   * La caja responde a dos preguntas distintas y ninguna de las dos sobra:
   *   pesoCapital  que parte del capital no esta invertida —tramos liquidados mas
   *                los que ninguna tesis llego a reclamar—;
   *   pesoActual   que parte del patrimonio de hoy es dinero quieto.
   * Difieren porque un tramo liquidado vale mas que lo que costo.
   */
  const bloqueLiquidez = {
    importe: redondear(liquidez, 2),
    pesoActual: redondear((liquidez / base) * 100),
    pesoCapital: redondear(100 - abiertas.reduce((a, p) => a + (p.peso ?? 0), 0)),
    tramosLiquidados: liquidadas.length,
    desde: liquidadas.reduce((max, p) => (p.fechaCierre > max ? p.fechaCierre : max), '') || null,
  };

  // Exposicion agregada por sector sobre las posiciones vivas. Con la liquidez
  // aparte, ambas reparten el patrimonio entero.
  const porSector = new Map();
  for (const p of abiertas) porSector.set(p.sector, (porSector.get(p.sector) ?? 0) + (p.pesoVigente ?? 0));

  /*
   * Resumen "Portfolio": capital desplegado, ROIC y el desglose realizado /
   * no realizado, para el bloque de portada y la vista analitica.
   *
   * No es un motor aparte: descompone el MISMO hecho que ya vigila
   * `tests/cartera.js` —Σ peso × rentabilidad = rentabilidad total—, porque
   * `contribucionPct` de cada linea (abierta o cerrada) ya esta en puntos del
   * indice base 100, y una liquidada transfiere su valorTramo integro a la
   * caja al cerrarse. Sumar contribucionPct de TODAS las lineas da,
   * exactamente, `estadisticos.rentabilidadTotal` partido entre lo realizado
   * y lo que aun no lo esta —no una segunda fuente, la misma cifra vista con
   * otro corte.
   *
   * capitalDesplegadoPct usa el peso de ENTRADA (abierta + cerrada), no el
   * vigente: es cuanto capital ha llegado a comprometerse alguna vez, y una
   * posicion cerrada sigue contando aunque su importe ya este en caja.
   *
   * Tres estados, no dos: sin posiciones de un lado (ninguna cerrada, o
   * ninguna abierta todavia) el campo es `null` —nada que realizar/no
   * realizar todavia—, nunca 0, que leeria como "rendimiento plano" en vez
   * de "no aplica".
   */
  const capitalDesplegadoPct = redondear(
    abiertas.reduce((a, p) => a + (p.peso ?? 0), 0) + liquidadas.reduce((a, p) => a + (p.peso ?? 0), 0)
  );
  const retornoRealizadoPct = liquidadas.length
    ? redondear(liquidadas.reduce((a, p) => a + (p.contribucionPct ?? 0), 0))
    : null;
  const retornoNoRealizadoPct = abiertas.length
    ? redondear(abiertas.reduce((a, p) => a + (p.contribucionPct ?? 0), 0))
    : null;
  const roicPct = (estadisticos?.rentabilidadTotal != null && capitalDesplegadoPct > 0)
    ? redondear((estadisticos.rentabilidadTotal / capitalDesplegadoPct) * 100)
    : null;

  const resumenPortfolio = {
    retornoPct: estadisticos?.rentabilidadTotal ?? null,
    capitalDesplegadoPct,
    roicPct,
    retornoRealizadoPct,
    retornoNoRealizadoPct,
    posicionesAbiertas: abiertas.length,
    posicionesCerradas: liquidadas.length,
  };

  return {
    posiciones: abiertas.sort((a, b) => (b.pesoVigente ?? 0) - (a.pesoVigente ?? 0)),
    cerradas: liquidadas.sort((a, b) => String(b.fechaCierre).localeCompare(String(a.fechaCierre))),
    serie,
    serieIndice,
    estadisticos,
    resumenPortfolio,
    liquidez: bloqueLiquidez,
    exposicionSectorial: [...porSector]
      .map(([sector, peso]) => ({ sector, peso: redondear(peso) }))
      .sort((a, b) => b.peso - a.peso),
    valorIndice: redondear(patrimonio, 2),
    valorIndexado: redondear(patrimonio, 2),
    baseCapital: BASE_INDICE,
    benchmark,
    avisos,
    generadoEn: new Date().toISOString(),
  };
}

module.exports = {
  calcularCartera, calcularEstadisticos, desviacionTipica, maximaCaida, rendimientos,
  construirIndice, alinear, MOTIVOS_CIERRE,
};
