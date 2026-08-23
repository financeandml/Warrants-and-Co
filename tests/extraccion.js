'use strict';

/* ============================================================================
   Reglas de extracción de la ficha.

   Comprueba `src/extraccion/ficha.js` contra informes armados aquí mismo, uno
   por trampa. Corre sin navegador y sin corpus: `node tests/extraccion.js`.

   Lo que estas afirmaciones vigilan no es que la extracción acierte mucho, sino
   que **calle cuando debe**. Un campo que se propone de más acaba en la cartera
   con un número que nadie escribió; por eso hay más casos sobre lo que no se
   propone que sobre lo que sí.

   Cada afirmación se ha visto fallar reintroduciendo el fallo que dice cazar.
   ========================================================================= */

const { informeDePrueba, trazar } = require('./pdf-de-prueba');
const { leerPdf } = require('../src/extraccion/pdf');
const { extraerFicha, CAMPOS, unirDerrames, cifraDe, porcentajeDe, fechaDe } = require('../src/extraccion/ficha');
const { MOTIVOS, motivo } = require('../src/extraccion/motivos');
const { SECTORES, PAISES } = require('../src/extraccion/equivalencias');
const validacion = require('../src/validacion');

const HOY = '2026-08-23';

/** Tablas de equivalencia de mentira, para no depender de las de la casa. */
const sectoresDePrueba = (literal) =>
  /healthcare/i.test(literal ?? '') ? { declarado: true, valor: 'Salud' } : { declarado: false, valor: null };
const paisesDePrueba = (literal) =>
  /^EE\.\s?UU\.$/i.test(literal ?? '') ? { declarado: true, valor: 'Estados Unidos' } : { declarado: false, valor: null };

/** Ficha mínima y correcta; cada caso sustituye las filas que le interesan. */
const FICHA_BASE = [
  ['Nombre de la empresa', 'Prueba Corporation'],
  ['Ticker', 'NYSE: $PRB'],
  ['Sector', 'Healthcare / Biotechnology'],
  ['Sede', 'Austin, Texas, EE. UU.'],
  ['Fecha del informe', '28 de julio de 2026'],
  ['Precio objetivo', '200,00 USD'],
];
const PLAN_BASE = [
  ['Instrumento', 'Acciones $PRB (NYSE)'],
  ['Precio de entrada', '120,00 USD'],
  ['Stop loss', '102,00 USD'],
  ['Tamaño de posición', '4% del portfolio total'],
];

/** Informe de dos páginas con la forma de la casa. */
function informe({ ficha = FICHA_BASE, plan = PLAN_BASE, antes = [], resumen = true } = {}) {
  const paginaFicha = [
    'A. RESUMEN EJECUTIVO & CONTEXTO DE LA TESIS',
    '1. Ficha de Empresa',
    ...ficha,
    ...(resumen ? ['2. Resumen ejecutivo y contexto de la tesis'] : []),
  ];
  const paginaPlan = ['24. Gestión del Riesgo', 'Plan de inversión', ...plan];
  return informeDePrueba([...antes, paginaFicha, paginaPlan]);
}

const extraer = (buffer, opciones = {}) =>
  extraerFicha(leerPdf(buffer).paginas, { hoy: HOY, sectores: sectoresDePrueba, paises: paisesDePrueba, ...opciones });

const campo = (buffer, nombre, opciones) => extraer(buffer, opciones).campos[nombre];

// ──────────────────────────────── afirmaciones ────────────────────────────────

let fallos = 0;
let hechas = 0;

function comprobar(rotulo, caso, esperado) {
  hechas++;
  let real;
  try { real = caso(); }
  catch (err) {
    fallos++;
    console.log(`  ✗ ${rotulo}\n      excepción inesperada: ${err.codigo ?? err.message}`);
    return;
  }
  if (JSON.stringify(real) === JSON.stringify(esperado)) { console.log(`  ✓ ${rotulo}`); return; }
  fallos++;
  console.log(`  ✗ ${rotulo}`);
  console.log(`      esperado: ${JSON.stringify(esperado)}`);
  console.log(`      obtenido: ${JSON.stringify(real)}`);
}

/** Resumen de un campo, que es lo que casi todos los casos afirman. */
const resumenDe = (d) => (d.estado === 'propuesto'
  ? { estado: d.estado, valor: d.valor, pagina: d.pagina }
  : { estado: d.estado, motivo: d.motivo });

// ─────────────────────────────────── casos ───────────────────────────────────

console.log('\n  ── las anclas ──');

/* El fallo que caza: anclar a la página. La ficha vive en la 4 en una plantilla
   de la casa y en la 5 en la otra, y la página 4 de esa otra existe y tiene
   texto: el error no se manifestaría como fallo, sino como datos de otro sitio. */
comprobar(
  'la ficha se localiza por su rótulo, esté en la página que esté',
  () => [1, 3].map((relleno) => {
    const paja = Array.from({ length: relleno }, (_, i) => [`Página de relleno ${i}`]);
    return extraer(informe({ antes: paja })).bloques.ficha;
  }),
  [2, 4]
);

/* El fallo que caza: confundir el epígrafe con su entrada en el índice. La del
   índice arrastra puntos y número de página, y apuntaría a la tabla de
   contenidos en todos los informes de la casa. */
comprobar(
  'la línea del índice no vale como ancla',
  () => extraer(informe({
    antes: [['TABLA DE CONTENIDOS', '1. Ficha de Empresa ....................... 4']],
  })).bloques.ficha,
  2
);

/* El fallo que caza: buscar el rótulo suelto por todo el documento. «Precio
   objetivo» sale siete veces en un informe real y una de ellas es el consenso
   de los analistas, que es la opinión del mercado y no la tesis de la casa. */
comprobar(
  'un rótulo igual fuera del bloque no contamina',
  () => resumenDe(campo(informe({
    antes: [['10. Métricas de Valoración', ['Precio objetivo consenso analistas', '8,35 USD']]],
  }), 'precio_objetivo')),
  { estado: 'propuesto', valor: 200, pagina: 2 }
);

comprobar(
  'sin ninguna ancla no se propone nada y se dice por qué',
  () => {
    const { campos, avisos } = extraer(informeDePrueba([['Un documento cualquiera', 'sin forma de informe']]));
    return { avisos, distintos: [...new Set(CAMPOS.map((c) => campos[c].estado))] };
  },
  { avisos: ['ESQUELETO_NO_RECONOCIDO'], distintos: ['ausente'] }
);

console.log('\n  ── las dos plantillas ──');

comprobar(
  'una fila en dos celdas se lee',
  () => resumenDe(campo(informe(), 'empresa')),
  { estado: 'propuesto', valor: 'Prueba Corporation', pagina: 1 }
);

/* Los exportados de Word pegan el valor al rótulo con un espacio corriente: no
   hay salto de columna que valga como separador. */
comprobar(
  'una fila con el valor pegado al rótulo se lee igual',
  () => resumenDe(campo(informe({
    ficha: [{ seguido: ['Nombre de la empresa', 'Prueba Corporation'] }, ...FICHA_BASE.slice(1)],
  }), 'empresa')),
  { estado: 'propuesto', valor: 'Prueba Corporation', pagina: 1 }
);

comprobar(
  'la plantilla nueva llama «Nombre» a la denominación',
  () => resumenDe(campo(informe({ ficha: [['Nombre', 'Uber Technologies, Inc.'], ...FICHA_BASE.slice(1)] }), 'empresa')),
  { estado: 'propuesto', valor: 'Uber Technologies, Inc.', pagina: 1 }
);

/* El fallo que caza: quedarse con el rótulo corto cuando hay uno más largo que
   lo contiene, y dejar «(inversor) 120,00 USD» como valor. */
comprobar(
  'entre dos rótulos que se solapan gana el más largo',
  () => {
    const d = campo(informe({ plan: [['Precio de entrada (inversor)', '120,00 USD']] }), 'precio_compra');
    return { rotulo: d.rotulo, valor: d.valor };
  },
  { rotulo: 'Precio de entrada (inversor)', valor: 120 }
);

console.log('\n  ── lo que mueve la cartera ──');

comprobar(
  'un precio objetivo con rótulo inequívoco se propone',
  () => resumenDe(campo(informe(), 'precio_objetivo')),
  { estado: 'propuesto', valor: 200, pagina: 1 }
);

/* Ante un rango no se propone ni un extremo ni un punto medio: son criterio.
   Se entrega el literal para que el analista teclee el suyo. */
comprobar(
  'un rango no se convierte en cifra, y se conserva el literal',
  () => {
    const d = campo(informe({ ficha: [...FICHA_BASE.slice(0, 5), ['Precio objetivo', '5,00–8,00 USD (+43% a +130%)']] }), 'precio_objetivo');
    return { estado: d.estado, motivo: d.motivo, literal: d.literal, valor: d.valor };
  },
  { estado: 'ambiguo', motivo: 'RANGO', literal: '5,00–8,00 USD (+43% a +130%)', valor: undefined }
);

/* Caso real de la plantilla nueva: el rótulo es inequívoco y lo que lo sigue
   no es una cifra. Vale para nada, y decirlo es mejor que callarlo. */
comprobar(
  'un rótulo sin cifra detrás no propone nada',
  () => resumenDe(campo(informe({
    plan: [['Precio de entrada (inversor)', 'Pendiente de confirmar — posición ya abierta']],
  }), 'precio_compra')),
  { estado: 'ambiguo', motivo: 'SIN_CIFRA' }
);

/* El take profit liquida posiciones. En los informes solo vive en prosa
   condicional, y ni siquiera un rótulo que lo nombre lo hace proponible. */
comprobar(
  'el take profit no se propone ni con un rótulo delante',
  () => resumenDe(campo(informe({ plan: [...PLAN_BASE, ['Take profit', '200,00 USD']] }), 'take_profit')),
  { estado: 'ausente', motivo: 'SIN_ETIQUETA_INEQUIVOCA' }
);

comprobar(
  'la recomendación no se deduce del tipo de tesis',
  () => resumenDe(campo(informe({ ficha: [...FICHA_BASE, ['Tipo de tesis', 'LONG (acciones)']] }), 'recomendacion')),
  { estado: 'ausente', motivo: 'RECOMENDACION_NO_SE_INFIERE' }
);

/* Proponer un par que la validación va a rechazar es hacer perder el tiempo a
   quien lo acepte: un stop por encima de la compra no pasa `validarInforme`. */
comprobar(
  'un stop incoherente con la compra baja a aviso',
  () => resumenDe(campo(informe({
    plan: [['Precio de entrada', '120,00 USD'], ['Stop loss', '130,00 USD']],
  }), 'stop_loss')),
  { estado: 'ambiguo', motivo: 'INCOHERENTE_CON_COMPRA' }
);

comprobar(
  'un stop coherente sí se propone',
  () => resumenDe(campo(informe(), 'stop_loss')),
  { estado: 'propuesto', valor: 102, pagina: 2 }
);

console.log('\n  ── vocabularios controlados ──');

comprobar(
  'un sector con equivalencia declarada se propone ya traducido',
  () => resumenDe(campo(informe(), 'sector')),
  { estado: 'propuesto', valor: 'Salud', pagina: 1 }
);

/* La regla de la casa: lo que no esté declarado se queda vacío por mucho que se
   parezca. «Tecnología» no es «Tecnología de la información». */
comprobar(
  'un sector sin equivalencia declarada se queda vacío aunque se parezca',
  () => {
    const d = campo(informe({ ficha: [...FICHA_BASE.slice(0, 2), ['Sector', 'Tecnología / Movilidad'], ...FICHA_BASE.slice(3)] }), 'sector');
    return { estado: d.estado, motivo: d.motivo, literal: d.literal };
  },
  { estado: 'ambiguo', motivo: 'SECTOR_SIN_EQUIVALENCIA', literal: 'Tecnología / Movilidad' }
);

/* El motivo tiene que traer el literal exacto y con la forma de la clave de la
   tabla —para el país, el último segmento de la sede y no la sede entera—, para
   que añadirlo sea copiar y pegar y no volver al PDF a buscarlo. */
comprobar(
  'el aviso trae el literal con la forma exacta de la clave de la tabla',
  () => {
    const d = campo(informe({
      ficha: [...FICHA_BASE.slice(0, 3), ['Sede', 'Múnich, Baviera, Alemania'], ...FICHA_BASE.slice(4)],
    }), 'pais');
    return { motivo: d.motivo, literal: d.literal };
  },
  { motivo: 'PAIS_SIN_EQUIVALENCIA', literal: 'Alemania' }
);

comprobar(
  'toda equivalencia declarada existe en el vocabulario de validación',
  () => Object.entries(SECTORES)
    .filter(([, v]) => v !== null && !validacion.SECTORES.includes(v))
    .map(([k, v]) => `${k} → ${v}`),
  []
);

comprobar(
  'el país sale de la sede, no del cuerpo del informe',
  () => resumenDe(campo(informe(), 'pais')),
  { estado: 'propuesto', valor: 'Estados Unidos', pagina: 1 }
);

comprobar(
  'la divisa de la plantilla nueva viene de su propia fila',
  () => {
    const d = campo(informe({ ficha: [...FICHA_BASE, ['Moneda', 'USD']] }), 'divisa');
    return { valor: d.valor, rotulo: d.rotulo };
  },
  { valor: 'USD', rotulo: 'Moneda' }
);

comprobar(
  'una divisa fuera de las admitidas no se propone',
  () => resumenDe(campo(informe({ ficha: [...FICHA_BASE, ['Moneda', 'SEK']] }), 'divisa')),
  { estado: 'ambiguo', motivo: 'DIVISA_NO_SOPORTADA' }
);

console.log('\n  ── ticker y fecha ──');

comprobar(
  'el ticker sale del símbolo con $',
  () => resumenDe(campo(informe(), 'ticker')),
  { estado: 'propuesto', valor: 'PRB', pagina: 1 }
);

/* Los dos sitios donde el informe nombra el símbolo tienen que coincidir. Si no,
   algo se ha copiado de otro informe y no hay manera de saber cuál manda. */
comprobar(
  'dos tickers distintos en el mismo informe no proponen ninguno',
  () => resumenDe(campo(informe({ plan: [['Instrumento', 'Acciones $OTRO (NYSE)'], ...PLAN_BASE.slice(1)] }), 'ticker')),
  { estado: 'ambiguo', motivo: 'TICKER_DISCREPANTE' }
);

comprobar(
  'la fecha larga en castellano se traduce a ISO',
  () => resumenDe(campo(informe(), 'fecha_publicacion')),
  { estado: 'propuesto', valor: '2026-07-28', pagina: 1 }
);

/* Nada en el documento dice si el primer número es el día o el mes, y
   equivocarse desplaza la publicación cinco meses sin que se note. */
comprobar(
  'una fecha en cifras no se interpreta',
  () => resumenDe(campo(informe({ ficha: [...FICHA_BASE.slice(0, 4), ['Fecha del informe', '03/08/2026'], FICHA_BASE[5]] }), 'fecha_publicacion')),
  { estado: 'ambiguo', motivo: 'FECHA_NO_INTERPRETABLE' }
);

comprobar(
  'una fecha futura no se propone: la validación la rechazaría',
  () => resumenDe(campo(informe({ ficha: [...FICHA_BASE.slice(0, 4), ['Fecha del informe', '30 de diciembre de 2026'], FICHA_BASE[5]] }), 'fecha_publicacion')),
  { estado: 'ambiguo', motivo: 'FECHA_FUTURA' }
);

console.log('\n  ── cifras ──');

/* Las dos convenciones conviven dentro de un mismo informe de la casa. */
comprobar(
  'coma y punto decimales conviven, y el millar no se confunde con el decimal',
  () => ['200,00', '260.00', '1.234,56', '1.234', '146,60'].map((t) => cifraDe(`${t} USD`).numero),
  [200, 260, 1234.56, 1234, 146.6]
);

comprobar(
  'el porcentaje se lee del principio del valor, no de cualquier cifra',
  () => [
    porcentajeDe('4% del portfolio total').numero,
    porcentajeDe('Posición satélite: 1–3% del portfolio total').fallo,
    porcentajeDe('del portfolio total, un 4%').fallo,
  ],
  [4, 'RANGO', 'SIN_PORCENTAJE']
);

comprobar(
  'la fecha rechaza lo que no sea mes en castellano',
  () => [fechaDe('28 de julio de 2026').iso, fechaDe('28 de july de 2026').fallo, fechaDe('31 de febrero de 2026').fallo],
  ['2026-07-28', 'FECHA_NO_INTERPRETABLE', 'FECHA_NO_INTERPRETABLE']
);

console.log('\n  ── tablas mal formadas ──');

/* Caso real: el valor de la celda no cabe y sigue en la línea de abajo, alineado
   con la columna de la que viene. Se une por márgenes, sin adivinar. */
comprobar(
  'el texto derramado se une a la celda de la que viene',
  () => unirDerrames([
    { texto: 'Sector Information Technology / Semiconductors &', columnas: ['Sector', 'Information Technology / Semiconductors &'], izquierdas: [79, 239] },
    { texto: 'Equipment', columnas: ['Equipment'], izquierdas: [239] },
  ]).map((f) => f.columnas),
  [['Sector', 'Information Technology / Semiconductors & Equipment']]
);

/* Caso real y peor: la tabla llega descuadrada, con el valor por encima de su
   rótulo. Unir por márgenes sin más produce un rótulo «Precio objetivo Tamaño
   de posición orientativo» con dos cifras dentro, de las que la primera se
   seguiría leyendo como precio objetivo. Ahí la extracción prefiere no leer. */
comprobar(
  'una tanda descuadrada con un rótulo dentro se deja sin unir',
  () => unirDerrames([
    { texto: 'Precio objetivo 260,00 USD', columnas: ['Precio objetivo', '260,00 USD'], izquierdas: [79, 312] },
    { texto: '4% del porfolio total (beta 1,6-', columnas: ['4% del porfolio total (beta 1,6-'], izquierdas: [312] },
    { texto: 'Tamaño de posición orientativo', columnas: ['Tamaño de posición orientativo'], izquierdas: [79] },
    { texto: '2,0x)', columnas: ['2,0x)'], izquierdas: [312] },
  ]).map((f) => f.columnas),
  [['Precio objetivo', '260,00 USD'], ['4% del porfolio total (beta 1,6-'], ['Tamaño de posición orientativo'], ['2,0x)']]
);

/* Los dos casos de arriba miran `unirDerrames` por separado; este comprueba que
   además está conectado. Sin él, desactivar la unión dentro de `bloqueDesde` no
   lo cazaba nadie: las piezas pasaban y el montaje no. */
comprobar(
  'el derrame se une también al leer un informe entero',
  () => {
    const d = campo(informe({
      ficha: [
        ...FICHA_BASE.slice(0, 2),
        ['Sector', 'Materials / Specialty'],
        { x: trazar.X_VALOR, texto: 'Chemicals' },
        ...FICHA_BASE.slice(3),
      ],
    }), 'sector');
    return { estado: d.estado, literal: d.literal };
  },
  { estado: 'ambiguo', literal: 'Materials / Specialty Chemicals' }
);

comprobar(
  'un rótulo suelto sin su valor se declara fila partida',
  () => resumenDe(campo(informe({ plan: [['Instrumento', 'Acciones $PRB (NYSE)'], 'Tamaño de posición orientativo'] }), 'peso_cartera')),
  { estado: 'ambiguo', motivo: 'FILA_PARTIDA' }
);

console.log('\n  ── el catálogo de motivos ──');

comprobar(
  'todo motivo emitido está en el catálogo',
  () => {
    const emitidos = new Set();
    const documentos = [informe(), informe({ plan: [] }), informeDePrueba([['nada']])];
    for (const d of documentos) {
      const { campos, avisos } = extraer(d);
      for (const c of CAMPOS) if (campos[c].motivo) emitidos.add(campos[c].motivo);
      for (const a of avisos) emitidos.add(a);
    }
    return [...emitidos].filter((m) => !MOTIVOS[m]);
  },
  []
);

comprobar(
  'un motivo inventado revienta aquí y no en la respuesta',
  () => { try { motivo('NO_EXISTE'); return 'no lanzó'; } catch { return 'lanzó'; } },
  'lanzó'
);

comprobar(
  'todos los campos de la ficha reciben un estado',
  () => {
    const { campos } = extraer(informe());
    return CAMPOS.filter((c) => !campos[c] || !campos[c].estado);
  },
  []
);

comprobar(
  'los países declarados son texto, no códigos',
  () => Object.entries(PAISES).filter(([, v]) => v !== null && typeof v !== 'string').map(([k]) => k),
  []
);

// ─────────────────────────────────── cierre ───────────────────────────────────

console.log(`\n  ${hechas - fallos}/${hechas} comprobaciones superadas`);
if (fallos) {
  console.log(`  ✗ ${fallos} fallo${fallos === 1 ? '' : 's'} en las reglas de extracción\n`);
  process.exit(1);
}
console.log('  ✓ las reglas de extracción se comportan\n');
