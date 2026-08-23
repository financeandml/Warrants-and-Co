'use strict';

/* ============================================================================
   Lector de la capa de texto de un PDF.

   Comprueba `src/extraccion/pdf.js` contra documentos armados aqui mismo, uno
   por trampa conocida. No hace falta navegador ni corpus: corre en cualquier
   clon con `node tests/extraccion-lector.js`.

   Que los PDF sean sinteticos es a proposito. Un PDF real prueba que hoy
   funciona con ese PDF; uno construido a medida prueba que la regla que se
   quiso escribir es la que esta escrita, y sigue probandolo cuando el corpus
   cambie. La comprobacion contra los documentos reales de la casa va aparte,
   en `extraccion-corpus.js`, y esa si necesita el corpus.

   Cada afirmacion de este fichero se ha visto fallar reintroduciendo el fallo
   que dice cazar; queda anotado en cada caso cual es ese fallo.
   ========================================================================= */

const { armarPdf, documentoSimple, fuenteAncha } = require('./pdf-de-prueba');
const { leerPdf, ErrorLectura } = require('../src/extraccion/pdf');

const lineasDe = (buffer, pagina = 0) => leerPdf(buffer).paginas[pagina].lineas;
const textos = (buffer, pagina = 0) => lineasDe(buffer, pagina).map((l) => l.texto);

// ──────────────────────────────── afirmaciones ────────────────────────────────

let fallos = 0;
let hechas = 0;

function comprobar(rotulo, caso, esperado) {
  hechas++;
  let real;
  try {
    real = caso();
  } catch (err) {
    // Una excepcion es el fallo de este caso, no el final de la bateria: si
    // abortara aqui, las afirmaciones siguientes quedarian sin ejecutar y sin
    // que nadie lo note.
    fallos++;
    console.log(`  ✗ ${rotulo}\n      excepción inesperada: ${err.codigo ?? err.message}`);
    return;
  }
  const coincide = JSON.stringify(real) === JSON.stringify(esperado);
  if (coincide) { console.log(`  ✓ ${rotulo}`); return; }
  fallos++;
  console.log(`  ✗ ${rotulo}`);
  console.log(`      esperado: ${JSON.stringify(esperado)}`);
  console.log(`      obtenido: ${JSON.stringify(real)}`);
}

function comprobarFallo(rotulo, fn, codigo) {
  hechas++;
  try {
    fn();
    fallos++;
    console.log(`  ✗ ${rotulo}\n      esperado ErrorLectura ${codigo}; no se lanzó ninguno`);
  } catch (err) {
    if (err instanceof ErrorLectura && err.codigo === codigo) { console.log(`  ✓ ${rotulo}`); return; }
    fallos++;
    console.log(`  ✗ ${rotulo}\n      esperado ${codigo}; obtenido ${err.codigo ?? err.message}`);
  }
}

// ─────────────────────────────────── casos ───────────────────────────────────

console.log('\n  ── anchura real de los glifos ──');

/* El fallo que caza: convertir en espacio cualquier ajuste de un TJ. Word
   parte «200,00» en «20», un ajuste de -3 milesimas y «0,00»; quien traduzca
   ese ajuste a un espacio entrega 20, y la extraccion propondra veinte donde
   hay doscientos. No revienta: miente. */
comprobar(
  'el kerning no parte una cifra en dos', () => (textos(documentoSimple('BT /F1 10 Tf 100 700 Td [(20) -3 (0,00) 0 ( USD)] TJ ET'))),
  ['200,00 USD']
);

/* Mismo mecanismo, sentido contrario: un salto grande dentro del mismo TJ si
   tiene que separar. Si el lector convirtiera todo salto en espacio —o
   ninguno— este caso y el anterior no podrian pasar a la vez. */
comprobar(
  'un salto grande dentro de un TJ separa palabras', () => (textos(documentoSimple('BT /F1 10 Tf 100 700 Td [(Precio) -400 (objetivo)] TJ ET'))),
  ['Precio objetivo']
);

console.log('\n  ── huecos: espacio frente a columna ──');

/* Este es el caso que vigila que las anchuras se lean de la fuente y no se
   estimen. Con la fuente de un cuadratin, «Sector» ocupa 60 pt a cuerpo 10 y
   termina en x=160; el segundo trozo arranca en 164, cuatro puntos: mas que un
   espacio (2,2) y menos que una columna (11), luego una sola celda. Estimando
   medio cuadratin por glifo acabaria en 130, el hueco medirian 34 puntos y la
   celda se partiria en dos. Enfrentar el avance calculado a una posicion
   absoluta es lo que hace visible el error: dentro de un mismo TJ, una anchura
   equivocada es coherente consigo misma y no se nota. */
comprobar(
  'un hueco de palabra no abre columna', () => (lineasDe(documentoSimple('BT /F1 10 Tf 1 0 0 1 100 700 Tm (Sector) Tj 1 0 0 1 164 700 Tm (Salud) Tj ET'))
    .map((l) => l.columnas)),
  [['Sector Salud']]
);

/* El mismo texto separado por veinte puntos es una tabla de dos celdas. Es la
   diferencia entre los informes exportados desde macOS —que dejan el hueco— y
   los de Word, que pegan el valor al rotulo. Ninguna regla puede exigir
   columnas, pero cuando existen hay que verlas. */
comprobar(
  'un hueco de columna parte la línea en celdas', () => (lineasDe(documentoSimple('BT /F1 10 Tf 1 0 0 1 100 700 Tm (Sector) Tj 1 0 0 1 180 700 Tm (Salud) Tj ET'))
    .map((l) => l.columnas)),
  [['Sector', 'Salud']]
);

comprobar(
  'el texto de la línea es el mismo lleve columnas o no', () => (textos(documentoSimple('BT /F1 10 Tf 1 0 0 1 100 700 Tm (Sector) Tj 1 0 0 1 180 700 Tm (Salud) Tj ET'))),
  ['Sector Salud']
);

console.log('\n  ── orden y agrupación ──');

/* El fallo que caza: dar por buena la numeracion de los objetos como orden de
   lectura. Aqui la pagina que va primera en `/Kids` es la de numero mayor. */
comprobar(
  'las páginas siguen el árbol, no el número de objeto', () => (leerPdf(armarPdf([
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Count 2/Kids[5 0 R 4 0 R]>>',
    fuenteAncha(),
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents 7 0 R>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents 6 0 R>>',
    { datos: 'BT /F1 10 Tf 100 700 Td (PRIMERA) Tj ET' },
    { datos: 'BT /F1 10 Tf 100 700 Td (SEGUNDA) Tj ET' },
  ])).paginas.map((p) => p.lineas[0].texto)),
  ['PRIMERA', 'SEGUNDA']
);

/* Dos lineas separadas por el interlineado normal no pueden fundirse en una, y
   dos trozos de la misma linea no pueden partirse en dos. */
comprobar(
  'líneas distintas no se funden', () => (textos(documentoSimple('BT /F1 10 Tf 1 0 0 1 100 700 Tm (arriba) Tj 1 0 0 1 100 686 Tm (abajo) Tj ET'))),
  ['arriba', 'abajo']
);

comprobar(
  'una diferencia de base despreciable no parte la línea', () => (textos(documentoSimple('BT /F1 10 Tf 1 0 0 1 100 700 Tm (base) Tj 1 0 0 1 164 701 Tm (misma) Tj ET'))),
  ['base misma']
);

/* El margen izquierdo de cada celda es lo unico que permite unir sin adivinar
   el texto que se derrama a la linea siguiente: cae bajo la celda de la que
   viene. En el corpus real le pasa al sector de un informe, cuyo valor termina
   en la linea de abajo; sin este dato habria que decidir por parecido. */
comprobar(
  'cada celda conserva su margen izquierdo',
  () => lineasDe(documentoSimple(
    'BT /F1 10 Tf 1 0 0 1 100 700 Tm (Sector) Tj 1 0 0 1 240 700 Tm (Salud) Tj 1 0 0 1 240 686 Tm (aplicada) Tj ET'
  )).map((l) => ({ columnas: l.columnas, izquierdas: l.izquierdas })),
  [{ columnas: ['Sector', 'Salud'], izquierdas: [100, 240] }, { columnas: ['aplicada'], izquierdas: [240] }]
);

console.log('\n  ── codificaciones ──');

/* WinAnsi no es Latin-1 entre 128 y 159: ahi viven la comilla tipografica y la
   raya, que estos informes usan a destajo. Leido como Latin-1, el apostrofo de
   «Moody’s» sale como un caracter de control invisible. */
comprobar(
  'los códigos altos de WinAnsi se traducen', () => (textos(documentoSimple('BT /F1 10 Tf 100 700 Td (Moody\\222s \\226 BBB) Tj ET'))),
  ['Moody’s – BBB']
);

/* Fuente compuesta: los codigos son de dos bytes y solo su `/ToUnicode` dice
   que letra es cada uno. Sin leerlo, la linea sale vacia o en gerogrificos. */
comprobar(
  'una fuente Identity-H se lee por su ToUnicode', () => (textos(armarPdf([
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Count 1/Kids[3 0 R]>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
    { datos: 'BT /F1 10 Tf 100 700 Td <000100020003> Tj ET' },
    '<</Type/Font/Subtype/Type0/BaseFont/Prueba/Encoding/Identity-H/DescendantFonts[6 0 R]/ToUnicode 7 0 R>>',
    '<</Type/Font/Subtype/CIDFontType2/BaseFont/Prueba/DW 1000/W[1 [1000 1000 1000]]>>',
    {
      datos: '/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n' +
        '3 beginbfchar\n<0001> <0055>\n<0002> <0042>\n<0003> <0045>\nendbfchar\n' +
        'endcmap end end',
    },
  ]))),
  ['UBE']
);

console.log('\n  ── compresión y flujos de objetos ──');

comprobar(
  'un contenido comprimido se descomprime', () => (textos(documentoSimple('BT /F1 10 Tf 100 700 Td (comprimido) Tj ET', { comprimir: true }))),
  ['comprimido']
);

/* El fallo que caza: buscar los objetos solo sueltos en el cuerpo. El PDF que
   exporta Word comprime parte del documento en flujos de objetos; si la fuente
   vive dentro de uno y nadie lo abre, la pagina se lee con anchuras supuestas.

   La afirmacion va sobre las columnas y no sobre el texto a proposito: sin
   abrir el flujo, el lector no se queda mudo —usa la anchura por defecto y
   entrega algo—, de modo que una prueba sobre el texto pasaria igual. Es lo
   que hacia la primera version de este caso: verde con `/ObjStm` desactivado.
   Con las anchuras verdaderas «Sector» acaba en x=160 y el hueco hasta 164 es
   un espacio; con las supuestas acaba en 130 y el mismo hueco pasa por salto
   de columna. */
comprobar(
  'los objetos dentro de un /ObjStm se incorporan', () => (lineasDe(armarPdf([
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Count 1/Kids[3 0 R]>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 6 0 R>>>>/Contents 4 0 R>>',
    { datos: 'BT /F1 10 Tf 1 0 0 1 100 700 Tm (Sector) Tj 1 0 0 1 164 700 Tm (Salud) Tj ET' },
    { dic: `/Type/ObjStm/N 1/First 5`, datos: `6 0 ${fuenteAncha()}` },
  ])).map((l) => l.columnas)),
  [['Sector Salud']]
);

console.log('\n  ── documentos que no se pueden leer ──');

comprobarFallo('un fichero que no es PDF se rechaza',
  () => leerPdf(Buffer.from('esto no es un pdf en absoluto')), 'NO_ES_PDF');

comprobarFallo('un PDF cifrado se rechaza en vez de devolver ruido',
  () => leerPdf(armarPdf([
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Count 1/Kids[3 0 R]>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R>>',
    { datos: 'BT ET' },
    '<</Filter/Standard/V 2/R 3/Length 128>>',
  ], { extraTrailer: '/Encrypt 5 0 R' })), 'PDF_CIFRADO');

/* Un escaneo tiene paginas y no tiene texto. Distinguirlo de un fallo de
   lectura evita que la extraccion informe de veinte campos ausentes por veinte
   motivos distintos cuando la causa es una sola. */
comprobarFallo('un PDF sin capa de texto se distingue de uno ilegible',
  () => leerPdf(armarPdf([
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Count 1/Kids[3 0 R]>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</XObject<</Im0 5 0 R>>>>/Contents 4 0 R>>',
    { datos: 'q 595 0 0 842 0 0 cm /Im0 Do Q' },
    { dic: '/Type/XObject/Subtype/Image/Width 1/Height 1/ColorSpace/DeviceGray/BitsPerComponent 8', datos: '\x00' },
  ])), 'PDF_SIN_CAPA_DE_TEXTO');

comprobarFallo('un PDF sin páginas se rechaza',
  () => leerPdf(armarPdf(['<</Type/Catalog>>'])), 'PDF_SIN_PAGINAS');

// ─────────────────────────────────── cierre ───────────────────────────────────

console.log(`\n  ${hechas - fallos}/${hechas} comprobaciones superadas`);
if (fallos) {
  console.log(`  ✗ ${fallos} fallo${fallos === 1 ? '' : 's'} en el lector de PDF\n`);
  process.exit(1);
}
console.log('  ✓ el lector de PDF se comporta\n');
