'use strict';

/* ============================================================================
   Armado de PDF de prueba.

   Construye documentos a medida para las baterías de extracción. Que sean
   sintéticos es lo que permite afirmar sobre una trampa concreta —una cifra
   partida por el kerning, una tabla descuadrada, un rótulo que solo aparece en
   el índice— sin depender de que el corpus de la casa siga conteniéndola.

   Las longitudes de flujo se calculan aquí: un `/Length` escrito a mano se
   desincroniza al primer retoque de la prueba y el fallo aparece lejos.
   ========================================================================= */

const zlib = require('node:zlib');

/* Inverso de la tabla WinAnsi del lector. Hace falta porque los informes usan
   raya y comillas tipográficas —«5,00–8,00»— y esos signos no viven en el
   mismo código en Latin-1: escritos sin traducir, el PDF diría otra cosa. */
const A_WINANSI = new Map(Object.entries({
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
  '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
  '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}));

/** Codifica en WinAnsi y escapa lo que un literal de PDF no admite crudo. */
function literal(texto) {
  let salida = '';
  for (const ch of String(texto)) {
    const codigo = A_WINANSI.get(ch) ?? ch.charCodeAt(0);
    if (codigo > 255) { salida += '?'; continue; }
    const byte = String.fromCharCode(codigo);
    salida += '()\\'.includes(byte) ? `\\${byte}` : byte;
  }
  return salida;
}

/**
 * Arma un PDF a partir de los cuerpos de sus objetos. El objeto 1 es el catálogo.
 * Un objeto es una cadena, o `{dic, datos, comprimir}` si lleva flujo.
 */
function armarPdf(objetos, { extraTrailer = '' } = {}) {
  const partes = [Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  objetos.forEach((objeto, i) => {
    const numero = i + 1;
    if (typeof objeto === 'string') {
      partes.push(Buffer.from(`${numero} 0 obj\n${objeto}\nendobj\n`, 'latin1'));
      return;
    }
    const crudo = Buffer.from(objeto.datos, 'latin1');
    const datos = objeto.comprimir ? zlib.deflateSync(crudo) : crudo;
    partes.push(Buffer.concat([
      Buffer.from(`${numero} 0 obj\n<<${objeto.dic ?? ''}${objeto.comprimir ? '/Filter/FlateDecode' : ''}/Length ${datos.length}>>\nstream\n`, 'latin1'),
      datos,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]));
  });
  partes.push(Buffer.from(`trailer\n<</Size ${objetos.length + 1}/Root 1 0 R${extraTrailer}>>\n%%EOF\n`, 'latin1'));
  return Buffer.concat(partes);
}

/** Fuente de anchura conocida: cada glifo ocupa `ancho` milésimas de cuadratín. */
const fuenteDe = (ancho) =>
  '<</Type/Font/Subtype/TrueType/Name/F1/BaseFont/Prueba/Encoding/WinAnsiEncoding' +
  `/FirstChar 32/LastChar 255/Widths[${Array(224).fill(ancho).join(' ')}]>>`;

/** Un cuadratín por glifo: hace visibles los errores de anchura. */
const fuenteAncha = () => fuenteDe(1000);
/** Medio cuadratín: deja sitio para tablas de rótulo largo. */
const fuenteEstrecha = () => fuenteDe(500);

/** Documento de una página con el contenido y la fuente dados. */
function documentoSimple(contenido, { comprimir = false, fuente = fuenteAncha() } = {}) {
  return armarPdf([
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Count 1/Kids[3 0 R]>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
    { datos: contenido, comprimir },
    fuente,
  ]);
}

// ────────────────────────── páginas con forma de informe ──────────────────────────

const X_ROTULO = 79;
const X_VALOR = 300;
const CUERPO = 10;

/**
 * Traza una página a partir de una lista de líneas. Cada línea puede ser:
 *   'texto suelto'                        una línea corriente
 *   ['Rótulo', 'valor']                   fila de tabla en dos celdas
 *   { seguido: ['Rótulo', 'valor'] }      rótulo y valor pegados, como los de Word
 *   { x, texto }                          una línea en un margen concreto
 */
function trazar(lineas, { yInicial = 760, salto = 16 } = {}) {
  let y = yInicial;
  let flujo = `BT /F1 ${CUERPO} Tf\n`;
  for (const linea of lineas) {
    const poner = (x, texto) => { flujo += `1 0 0 1 ${x} ${y} Tm (${literal(texto)}) Tj\n`; };
    if (typeof linea === 'string') poner(X_ROTULO, linea);
    else if (Array.isArray(linea)) { poner(X_ROTULO, linea[0]); poner(X_VALOR, linea[1]); }
    else if (linea.seguido) poner(X_ROTULO, `${linea.seguido[0]} ${linea.seguido[1]}`);
    else poner(linea.x ?? X_ROTULO, linea.texto);
    y -= salto;
  }
  return `${flujo}ET`;
}

/** El margen de la columna de valores, para trazar derrames alineados con ella. */
trazar.X_VALOR = X_VALOR;
trazar.X_ROTULO = X_ROTULO;

/** Documento de varias páginas, cada una descrita como lista de líneas. */
function informeDePrueba(paginas, { fuente = fuenteEstrecha() } = {}) {
  const objetos = ['<</Type/Catalog/Pages 2 0 R>>', null, fuente];
  const kids = [];
  paginas.forEach((lineas, i) => {
    const numeroPagina = objetos.length + 1;
    const numeroContenido = numeroPagina + 1;
    kids.push(`${numeroPagina} 0 R`);
    objetos.push(`<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents ${numeroContenido} 0 R>>`);
    objetos.push({ datos: trazar(lineas) });
  });
  objetos[1] = `<</Type/Pages/Count ${paginas.length}/Kids[${kids.join(' ')}]>>`;
  return armarPdf(objetos);
}

module.exports = {
  armarPdf, documentoSimple, informeDePrueba, trazar, literal,
  fuenteAncha, fuenteEstrecha, fuenteDe,
};
