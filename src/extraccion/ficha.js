'use strict';

/* ============================================================================
   Reglas de extracción de la ficha analítica a partir de un informe en PDF.

   ═══ La extracción cubre identificación, no juicio ═══

   Comparadas estas reglas con las cuatro fichas que el analista ya tenía
   tecleadas, coinciden en lo que el documento **dice que es** —denominación,
   ticker, sector, país, fecha— y discrepan en seis puntos. En los seis tenía
   razón el analista:

     · RDDT   el PDF fecha el informe el 20 de mayo de 2026; la ficha, el 22.
     · QCOM   el PDF escribe «Qualcomm Incorporated»; la ficha, «QUALCOMM».
     · IOVA   el PDF da un precio objetivo de 5,00–8,00; la ficha fija 8,00.
     · IOVA   el PDF da una referencia de 2,20–3,00; la ficha compra a 2,50.
     · IOVA   el PDF recomienda un peso del 1–3%; la ficha asigna un 4%.
     · RDDT   el PDF trae un stop loss de 139,60; la ficha lo deja sin fijar.

   Ninguna regla habría acertado esos seis, porque no son datos: son criterio.
   De ahí que nada de lo que sale de aquí se guarde sin aceptación explícita, y
   que ante cualquier ambigüedad se entregue el literal y la página en vez de
   una cifra. Quien venga a «afinar» estas reglas hasta que coincidan con las
   fichas guardadas estará ajustando la extracción a un juicio que no le toca.

   ═══ Por qué se ancla al rótulo y no a la página ni al número de sección ═══

   En la casa hay **dos plantillas**, no una. Entre los informes vistos:

                        plantilla antigua        plantilla nueva
     ficha              página 4                 página 5
     plan de inversión  sección 24               sección 35
     denominación       «Nombre de la empresa»   «Nombre»
     divisa             solo junto a la cifra    fila propia, «Moneda»
     sector             GICS en inglés           castellano libre
     filas nuevas       —                        ISIN, Industria, Valor
                                                 razonable, Objetivo parcial,
                                                 Nivel de invalidación

   Anclar a la página 4 o a la sección 24 habría parecido más simple y habría
   dejado de funcionar en cuanto cambió la plantilla, y —lo importante— sin
   avisar: la página 4 de la plantilla nueva existe, tiene texto y no es la
   ficha, de modo que el error no se manifiesta como un fallo sino como datos
   de otro sitio. Lo único que sobrevivió a ese cambio fueron los dos rótulos,
   `1. Ficha de Empresa` y `Plan de inversión`, y por eso son las anclas.

   La misma razón desaconseja el atajo contrario: buscar un rótulo suelto por
   todo el documento. «Precio objetivo» aparece siete veces en un informe, y
   una de ellas es `Precio objetivo consenso analistas`, que es la opinión del
   mercado y no la tesis de la casa. Sin bloque que acote, esa cifra acabaría
   en la cartera. Fuera de sus anclas no se busca nada.

   Si no aparece ninguna ancla, no hay repuesto: se informa de que el documento
   no es de la casa y se devuelve todo vacío.

   ═══ Lo que nunca se propone ═══

   `take_profit`      liquida posiciones y en los informes solo vive en prosa
                      condicional («si la acción alcanza N USD…»).
   `recomendacion`    el documento declara `Tipo de tesis: LONG`, que es una
                      dirección de operación y no un valor del vocabulario.
   `tipo_informe`     no figura; dos informes de esqueleto idéntico están
                      clasificados de forma distinta en el repositorio.
   `resumen_ejecutivo` existe, pero es tres a nueve veces más largo que la
                      síntesis que escribe el analista: se indica la página.
   `analista`, `periodo`  son convenciones de la casa, no datos del documento.
                      Quedan fuera de la extracción y los pone el formulario.
   ========================================================================= */

const { motivo } = require('./motivos');
const { sectorEquivalente, paisEquivalente } = require('./equivalencias');
const { DIVISAS } = require('../validacion');

/** Campos que el formulario rellena por su cuenta: no se extraen ni se avisan. */
const CAMPOS_FUERA_DE_EXTRACCION = ['analista', 'periodo'];

// ─────────────────────────────── anclas y bloques ───────────────────────────────

const normalizar = (t) => String(t).replace(/\s+/g, ' ').trim();
const plegar = (t) => normalizar(t).toLowerCase();

/* El final de línea es lo que distingue el epígrafe de su entrada en el índice:
   la del índice arrastra puntos suspensivos y un número de página. */
const ES_ANCLA_FICHA = /^1\.\s*ficha de empresa$/;
const ES_ANCLA_PLAN = /^plan de inversión$/;
/* El epígrafe del cuerpo y su entrada en el índice empiezan igual; lo que los
   separa es que la del índice arrastra puntos suspensivos y su número de
   página. Sin ese corte, la referencia del resumen apuntaba a la tabla de
   contenidos —página 3— en los cuatro informes. */
const ES_ANCLA_RESUMEN = /^2\.\s*resumen ejecutivo\b/;
const ES_LINEA_DE_INDICE = /\.{3,}\s*\d+$/;
const ES_EPIGRAFE = /^(?:\d{1,2}\.\s+\S|[A-I]\.\s+[A-ZÁÉÍÓÚÑ])/;

/** Margen, en unidades del documento, para dar dos celdas por alineadas. */
const TOLERANCIA_MARGEN = 2;

/** Filas de un bloque: desde su ancla hasta el epígrafe siguiente. */
function bloqueDesde(paginas, esAncla, { maxFilas = 24 } = {}) {
  for (const pagina of paginas) {
    const i = pagina.lineas.findIndex((l) => esAncla.test(plegar(l.texto)));
    if (i < 0) continue;
    const filas = [];
    for (let k = i + 1; k < pagina.lineas.length && filas.length < maxFilas; k++) {
      const linea = pagina.lineas[k];
      const texto = normalizar(linea.texto);
      if (ES_EPIGRAFE.test(texto) || /^nota:/i.test(texto)) break;
      filas.push({ texto, columnas: [...linea.columnas], izquierdas: [...linea.izquierdas] });
    }
    return { pagina: pagina.numero, filas: unirDerrames(filas) };
  }
  return null;
}

/** Todos los rótulos que las reglas saben leer, plegados para comparar. */
const ROTULOS_CONOCIDOS = new Set();

/**
 * Une a su fila el texto que se derrama a la línea siguiente.
 *
 * La celda de una tabla que no cabe en su ancho continúa debajo, alineada por
 * la izquierda con la celda de la que viene. Esa coincidencia de márgenes es
 * lo que permite unirla sin adivinar: se une a la celda cuyo margen comparte,
 * y si no comparte ninguno se deja aparte. En el corpus le ocurre al sector de
 * un informe, cuyo valor termina —«… & Semiconductor» / «Equipment»— abajo.
 *
 * ═══ Cuándo NO se une ═══
 *
 * Hay tablas que llegan descuadradas, con el valor de una fila **por encima**
 * de su propio rótulo. Ocurre de verdad: en un informe, el plan de inversión
 * entrega «4% del porfolio total…», luego «Tamaño de posición orientativo» y
 * luego el resto del valor. Unir por márgenes sin más pega ese valor a la fila
 * de arriba y produce un disparate con apariencia de dato: un rótulo «Precio
 * objetivo Tamaño de posición orientativo» con dos cifras dentro, del que la
 * primera todavía se lee como precio objetivo.
 *
 * El corte es este: **una línea que sea exactamente un rótulo conocido nunca
 * es la continuación de nada**, y una tanda de líneas sueltas que contenga uno
 * se deja entera sin unir. No es una estimación de parecido; es la misma lista
 * blanca de rótulos sobre la que se sostiene todo lo demás. Donde la tabla
 * viene descuadrada, la extracción prefiere no leer: el campo sale como fila
 * partida, que es información, y no como una cifra de procedencia inventada.
 */
function unirDerrames(filas) {
  const salida = [];
  for (let i = 0; i < filas.length; i++) {
    if (filas[i].columnas.length !== 1) { salida.push(filas[i]); continue; }

    // Tanda de líneas sueltas consecutivas.
    let fin = i;
    while (fin + 1 < filas.length && filas[fin + 1].columnas.length === 1) fin++;
    const tanda = filas.slice(i, fin + 1);
    const hayRotulo = tanda.some((f) => ROTULOS_CONOCIDOS.has(plegar(f.texto)));

    for (const fila of tanda) {
      const anterior = salida[salida.length - 1];
      if (!hayRotulo && anterior && anterior.columnas.length >= 2) {
        const margen = fila.izquierdas[0];
        const destino = anterior.izquierdas.findIndex((x) => Math.abs(x - margen) <= TOLERANCIA_MARGEN);
        if (destino >= 0) {
          anterior.columnas[destino] = `${anterior.columnas[destino]} ${fila.columnas[0]}`;
          anterior.texto = anterior.columnas.join(' ');
          continue;
        }
      }
      salida.push(fila);
    }
    i = fin;
  }
  return salida;
}

/**
 * Valor de la fila cuyo rótulo es exactamente uno de los dados.
 *
 * Se prueban de más largo a más corto porque los rótulos se solapan: «Precio de
 * entrada (inversor)» contiene a «Precio de entrada», y quedarse con el corto
 * dejaría «(inversor) 120,00 USD» como valor.
 */
function filaDe(bloque, etiquetas) {
  if (!bloque) return null;
  const ordenadas = [...etiquetas].sort((a, b) => b.length - a.length);
  for (const etiqueta of ordenadas) {
    const buscada = plegar(etiqueta);
    for (const fila of bloque.filas) {
      if (fila.columnas.length >= 2 && plegar(fila.columnas[0]) === buscada) {
        return { rotulo: fila.columnas[0], valor: normalizar(fila.columnas.slice(1).join(' ')) };
      }
      // Los exportados de Word no dejan hueco entre rótulo y valor: van seguidos.
      const texto = plegar(fila.texto);
      if (fila.columnas.length === 1 && texto.startsWith(`${buscada} `)) {
        return { rotulo: etiqueta, valor: normalizar(fila.texto.slice(etiqueta.length)) };
      }
      if (fila.columnas.length === 1 && texto === buscada) {
        return { rotulo: etiqueta, valor: null, partida: true };
      }
    }
  }
  return null;
}

// ──────────────────────────────── lectura de valores ────────────────────────────────

/* Un rango se reconoce por dos cifras unidas por raya o guion. Ante uno no se
   propone nada: ni un extremo ni un punto medio, que serían criterio. */
const ES_RANGO = /\d\s*[–—-]\s*\d/;

/**
 * Convierte a número respetando las dos convenciones que conviven en un mismo
 * informe: «200,00» y «260.00». Con coma, la coma decide y los puntos son
 * millares; sin coma, un punto con exactamente tres cifras detrás es millar y
 * en cualquier otro caso es decimal.
 */
function aNumero(bruto) {
  let s = String(bruto);
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\.(?=\d{3}(?:\D|$))/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const CIFRA = /^(?:US\s*\$|\$|€|£)?\s*(\d[\d.,]*)\s*(USD|EUR|GBP|CHF|JPY)?\b/i;

/** @returns {{numero: number, divisa: string|null}|{fallo: string}} */
function cifraDe(literal) {
  if (literal === null || literal === undefined || !normalizar(literal)) return { fallo: 'SIN_CIFRA' };
  if (ES_RANGO.test(literal)) return { fallo: 'RANGO' };
  const m = CIFRA.exec(normalizar(literal));
  if (!m) return { fallo: 'SIN_CIFRA' };
  const numero = aNumero(m[1]);
  if (numero === null || numero <= 0) return { fallo: 'SIN_CIFRA' };
  return { numero, divisa: m[2] ? m[2].toUpperCase() : null };
}

const PORCENTAJE = /^(\d+(?:[.,]\d+)?)\s*%/;

function porcentajeDe(literal) {
  if (literal === null || literal === undefined || !normalizar(literal)) return { fallo: 'SIN_PORCENTAJE' };
  if (ES_RANGO.test(literal)) return { fallo: 'RANGO' };
  const m = PORCENTAJE.exec(normalizar(literal));
  if (!m) return { fallo: 'SIN_PORCENTAJE' };
  const numero = aNumero(m[1]);
  if (numero === null || numero <= 0 || numero > 100) return { fallo: 'SIN_PORCENTAJE' };
  return { numero };
}

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/* Solo se admite la fecha larga en castellano, que es como la escriben las dos
   plantillas. Una fecha en cifras del tipo 03/08/2026 no se interpreta: nada en
   el documento dice si el primer número es el día o el mes, y equivocarse
   desplaza la publicación de un informe cinco meses sin que se note. */
function fechaDe(literal) {
  const m = /^(\d{1,2}) de ([a-záéíóúñ]+) de (\d{4})$/i.exec(normalizar(literal ?? '').toLowerCase());
  const mes = m && MESES[m[2]];
  if (!mes) return { fallo: 'FECHA_NO_INTERPRETABLE' };
  const iso = `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const fecha = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== iso) {
    return { fallo: 'FECHA_NO_INTERPRETABLE' };
  }
  return { iso };
}

// ──────────────────────────────── estados de campo ────────────────────────────────

const propuesto = (valor, pagina, rotulo) => ({ estado: 'propuesto', valor, pagina, rotulo });
const ambiguo = (literal, pagina, rotulo, codigo) =>
  ({ estado: 'ambiguo', literal, pagina, rotulo, motivo: motivo(codigo) });
const referencia = (pagina, codigo) => ({ estado: 'referencia', pagina, motivo: motivo(codigo) });
const ausente = (codigo) => ({ estado: 'ausente', motivo: motivo(codigo) });

/** Traduce el fallo de una lectura al estado que corresponde. */
function segunLectura(lectura, literal, pagina, rotulo, alAcertar) {
  if (lectura.fallo) return ambiguo(literal, pagina, rotulo, lectura.fallo);
  return alAcertar();
}

// ───────────────────────────────────── reglas ─────────────────────────────────────

const ETIQUETAS = {
  empresa: ['Nombre de la empresa', 'Nombre'],
  ticker: ['Ticker'],
  sector: ['Sector'],
  sede: ['Sede'],
  fecha: ['Fecha del informe'],
  precioObjetivo: ['Precio objetivo'],
  moneda: ['Moneda'],
  precioCompra: ['Precio de entrada (inversor)', 'Precio de entrada'],
  stopLoss: ['Stop loss'],
  peso: ['Tamaño de posición orientativo', 'Tamaño de posición recomendado', 'Tamaño de posición'],
  instrumento: ['Instrumento'],
};

for (const lista of Object.values(ETIQUETAS)) for (const e of lista) ROTULOS_CONOCIDOS.add(plegar(e));

const PATRON_TICKER = /\$([A-Z][A-Z0-9.\-]{0,11})\b/;

/**
 * Extrae la propuesta de ficha de un informe ya leído.
 *
 * @param {Array<{numero: number, lineas: Array<{texto: string, columnas: string[], izquierdas: number[]}>}>} paginas
 * @param {object} opciones
 * @param {string} [opciones.hoy]  fecha de referencia en ISO, para que la prueba no dependa del calendario
 * @param {function} [opciones.sectores]  resolución de sector; se inyecta en las pruebas
 * @param {function} [opciones.paises]    resolución de país; se inyecta en las pruebas
 * @returns {{campos: object, bloques: object, avisos: string[]}}
 */
function extraerFicha(paginas, {
  hoy = new Date().toISOString().slice(0, 10),
  /* Las tablas se inyectan para que la batería pueda afirmar sobre los dos
     caminos —con equivalencia declarada y sin ella— sin quedar atada a lo que
     el analista escriba en `equivalencias.js`. Una prueba que dependiera de esa
     tabla se pondría roja el día que se declare un sector, y el fallo no
     estaría en el código sino en la prueba. */
  sectores = sectorEquivalente,
  paises = paisEquivalente,
} = {}) {
  const ficha = bloqueDesde(paginas, ES_ANCLA_FICHA);
  const plan = bloqueDesde(paginas, ES_ANCLA_PLAN);
  const resumen = paginas.find((p) => p.lineas.some((l) => {
    const t = normalizar(l.texto);
    return ES_ANCLA_RESUMEN.test(plegar(t)) && !ES_LINEA_DE_INDICE.test(t);
  }));

  const campos = {};
  const avisos = [];

  if (!ficha && !plan) {
    avisos.push(motivo('ESQUELETO_NO_RECONOCIDO'));
    for (const nombre of CAMPOS) campos[nombre] = ausente('ESQUELETO_NO_RECONOCIDO');
    return { campos, bloques: { ficha: null, plan: null, resumen: null }, avisos };
  }
  if (!ficha) avisos.push(motivo('ANCLA_FICHA_AUSENTE'));
  if (!plan) avisos.push(motivo('ANCLA_PLAN_AUSENTE'));

  const pF = ficha?.pagina ?? null;
  const pP = plan?.pagina ?? null;

  /** Resuelve un campo de texto que solo necesita rótulo y valor. */
  const desde = (bloque, pagina, etiquetas, alTener) => {
    const fila = filaDe(bloque, etiquetas);
    if (!fila) return ausente(bloque ? 'ETIQUETA_AUSENTE' : (bloque === ficha ? 'ANCLA_FICHA_AUSENTE' : 'ANCLA_PLAN_AUSENTE'));
    if (fila.partida) return ambiguo(fila.rotulo, pagina, fila.rotulo, 'FILA_PARTIDA');
    return alTener(fila);
  };

  // ── identificación ──────────────────────────────────────────────────────
  campos.empresa = ficha
    ? desde(ficha, pF, ETIQUETAS.empresa, (f) => propuesto(f.valor, pF, f.rotulo))
    : ausente('ANCLA_FICHA_AUSENTE');

  campos.ticker = ficha
    ? desde(ficha, pF, ETIQUETAS.ticker, (f) => {
        const m = PATRON_TICKER.exec(f.valor.toUpperCase());
        if (!m) return ambiguo(f.valor, pF, f.rotulo, 'TICKER_SIN_PATRON');
        // El instrumento del plan nombra el mismo símbolo: si discrepan, calla.
        const instrumento = filaDe(plan, ETIQUETAS.instrumento);
        const otro = instrumento?.valor && PATRON_TICKER.exec(instrumento.valor.toUpperCase());
        if (otro && otro[1] !== m[1]) return ambiguo(`${m[1]} / ${otro[1]}`, pF, f.rotulo, 'TICKER_DISCREPANTE');
        return propuesto(m[1], pF, f.rotulo);
      })
    : ausente('ANCLA_FICHA_AUSENTE');

  campos.sector = ficha
    ? desde(ficha, pF, ETIQUETAS.sector, (f) => {
        const { valor } = sectores(f.valor);
        return valor ? propuesto(valor, pF, f.rotulo) : ambiguo(f.valor, pF, f.rotulo, 'SECTOR_SIN_EQUIVALENCIA');
      })
    : ausente('ANCLA_FICHA_AUSENTE');

  campos.pais = ficha
    ? desde(ficha, pF, ETIQUETAS.sede, (f) => {
        const cola = normalizar(f.valor.split(',').pop());
        const { valor } = paises(cola);
        return valor ? propuesto(valor, pF, f.rotulo) : ambiguo(cola, pF, f.rotulo, 'PAIS_SIN_EQUIVALENCIA');
      })
    : ausente('ANCLA_FICHA_AUSENTE');

  campos.fecha_publicacion = ficha
    ? desde(ficha, pF, ETIQUETAS.fecha, (f) => {
        const leida = fechaDe(f.valor);
        if (leida.fallo) return ambiguo(f.valor, pF, f.rotulo, leida.fallo);
        // Una fecha futura la rechazaría la validación al guardar: no se propone.
        if (leida.iso > hoy) return ambiguo(f.valor, pF, f.rotulo, 'FECHA_FUTURA');
        return propuesto(leida.iso, pF, f.rotulo);
      })
    : ausente('ANCLA_FICHA_AUSENTE');

  // ── valoración ──────────────────────────────────────────────────────────
  let divisaDelPrecio = null;
  campos.precio_objetivo = ficha
    ? desde(ficha, pF, ETIQUETAS.precioObjetivo, (f) => {
        const leida = cifraDe(f.valor);
        return segunLectura(leida, f.valor, pF, f.rotulo, () => {
          divisaDelPrecio = leida.divisa;
          return propuesto(leida.numero, pF, f.rotulo);
        });
      })
    : ausente('ANCLA_FICHA_AUSENTE');

  const filaMoneda = filaDe(ficha, ETIQUETAS.moneda);
  if (filaMoneda?.valor) {
    const declarada = normalizar(filaMoneda.valor).toUpperCase();
    campos.divisa = DIVISAS.includes(declarada)
      ? propuesto(declarada, pF, filaMoneda.rotulo)
      : ambiguo(filaMoneda.valor, pF, filaMoneda.rotulo, 'DIVISA_NO_SOPORTADA');
  } else if (divisaDelPrecio && DIVISAS.includes(divisaDelPrecio)) {
    campos.divisa = propuesto(divisaDelPrecio, pF, ETIQUETAS.precioObjetivo[0]);
  } else {
    campos.divisa = ausente('ETIQUETA_AUSENTE');
  }

  // ── operativa de la posición ────────────────────────────────────────────
  campos.precio_compra = plan
    ? desde(plan, pP, ETIQUETAS.precioCompra, (f) => {
        const leida = cifraDe(f.valor);
        return segunLectura(leida, f.valor, pP, f.rotulo, () => propuesto(leida.numero, pP, f.rotulo));
      })
    : ausente('ANCLA_PLAN_AUSENTE');

  campos.stop_loss = plan
    ? desde(plan, pP, ETIQUETAS.stopLoss, (f) => {
        const leida = cifraDe(f.valor);
        return segunLectura(leida, f.valor, pP, f.rotulo, () => propuesto(leida.numero, pP, f.rotulo));
      })
    : ausente('ANCLA_PLAN_AUSENTE');

  campos.peso_cartera = plan
    ? desde(plan, pP, ETIQUETAS.peso, (f) => {
        const leida = porcentajeDe(f.valor);
        return segunLectura(leida, f.valor, pP, f.rotulo, () => propuesto(leida.numero, pP, f.rotulo));
      })
    : ausente('ANCLA_PLAN_AUSENTE');

  /* Coherencia con lo que exige `validarInforme`. Proponer un par que ya se
     sabe que la validación rechaza es hacer perder el tiempo a quien lo acepte. */
  if (campos.precio_compra.estado === 'propuesto' && campos.stop_loss.estado === 'propuesto'
      && campos.stop_loss.valor >= campos.precio_compra.valor) {
    campos.stop_loss = ambiguo(String(campos.stop_loss.valor), pP, campos.stop_loss.rotulo, 'INCOHERENTE_CON_COMPRA');
  }

  // ── lo que no se propone nunca ──────────────────────────────────────────
  campos.take_profit = ausente('SIN_ETIQUETA_INEQUIVOCA');
  campos.recomendacion = ausente('RECOMENDACION_NO_SE_INFIERE');
  campos.tipo_informe = ausente('TIPO_INFORME_NO_FIGURA');
  campos.resumen_ejecutivo = resumen
    ? referencia(resumen.numero, 'SECCION_LOCALIZADA')
    : ausente('ETIQUETA_AUSENTE');
  for (const nombre of ['nivel_acceso', 'etiquetas', 'destacado', 'en_cartera']) {
    campos[nombre] = ausente('FUERA_DE_EXTRACCION');
  }

  return {
    campos,
    bloques: {
      ficha: pF,
      plan: pP,
      resumen: resumen?.numero ?? null,
    },
    avisos,
  };
}

/** Campos sobre los que la extracción se pronuncia, en el orden de la ficha. */
const CAMPOS = [
  'empresa', 'ticker', 'sector', 'pais', 'tipo_informe', 'fecha_publicacion',
  'recomendacion', 'precio_objetivo', 'divisa', 'peso_cartera',
  'precio_compra', 'take_profit', 'stop_loss',
  'resumen_ejecutivo', 'nivel_acceso', 'etiquetas', 'destacado', 'en_cartera',
];

/* `bloqueDesde`, `unirDerrames` y `filaDe` se exportan para que la bateria
   pueda afirmar sobre ellas por separado. Son las tres piezas donde se decide
   que se lee y que no, y una prueba que solo mire el resultado final no
   distinguiria un derrame mal unido de un rotulo mal escrito. */
module.exports = {
  extraerFicha, CAMPOS, CAMPOS_FUERA_DE_EXTRACCION, ETIQUETAS,
  bloqueDesde, unirDerrames, filaDe, cifraDe, porcentajeDe, fechaDe,
  ES_ANCLA_FICHA, ES_ANCLA_PLAN, ES_ANCLA_RESUMEN,
};
