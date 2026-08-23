'use strict';

/* ============================================================================
   Lector de la capa de texto de un PDF.

   Devuelve, pagina a pagina, las lineas de texto que el documento ya lleva
   escritas. No interpreta nada: quien decide que significa cada linea es
   `ficha.js`. Aqui solo se responde a «que pone, donde pone, y en que pagina».

   No hay dependencias. El unico auxilio externo es `zlib`, que trae Node.

   ═══ Por que se leen los anchos de fuente ═══

   Un PDF no guarda palabras: guarda glifos con su posicion. Word y Pages parten
   una cifra en varios trozos para ajustar el kerning —«200,00» viaja como «20»,
   un salto de -3 milesimas, y «0,00»—. Si el lector decide donde acaba un trozo
   estimando su anchura, se equivoca, mete un espacio en medio y entrega «20
   0,00»; el analisis posterior lee 20 y propone veinte euros donde hay
   doscientos. No revienta: miente, que es peor.

   Por eso se leen `/Widths` y `/W` de cada fuente y se calcula el avance real.
   Es la razon de ser de media clase de este fichero.

   ═══ Por que las lineas llevan columnas ═══

   La separacion entre el rotulo de una tabla y su valor no es universal. Los
   documentos exportados desde macOS dejan un hueco ancho y tabuladores reales;
   los de Word pegan el valor al rotulo con un espacio corriente. Una linea se
   entrega por tanto de dos maneras a la vez: `texto`, todo seguido, para
   reconocer rotulos; y `columnas`, partida por los huecos anchos, para las
   tablas que si los tienen. Ninguna regla puede depender de que haya columnas.

   ═══ Lo que este lector NO hace ═══

   - No lee texto dentro de XObjects de formulario. En el corpus de la casa no
     hay ninguno con texto, y suponerlo seria adivinar.
   - No descifra. Un PDF con `/Encrypt` se rechaza con codigo, no se intenta.
   - No rota. El texto en vertical o girado se coloca donde su matriz lo deja,
     y el orden de lectura puede no ser el visual.

   Cuando algo de esto se cumpla, el resultado sera un documento con menos
   texto del que se ve, y las reglas de `ficha.js` lo traduciran en campos
   ausentes. Nunca en campos inventados.
   ========================================================================= */

const zlib = require('node:zlib');

/** Tope de paginas. Un informe de la casa ronda las treinta. */
const MAX_PAGINAS = 120;

/** Tope de fichero, el mismo que admite la subida de documentacion. */
const MAX_BYTES = 25 * 1024 * 1024;

/* Fallos de lectura. Enumerables a proposito: el catalogo de motivos de la
   extraccion los recoge y la interfaz los rotula en el idioma de quien mira.
   Un codigo compuesto al vuelo no se podria comprobar. */
const CODIGOS_LECTURA = {
  NO_ES_PDF: 'El fichero no es un PDF.',
  PDF_CIFRADO: 'El PDF está cifrado y su texto no puede leerse.',
  PDF_DEMASIADO_GRANDE: 'El PDF supera el tamaño máximo admitido.',
  PDF_SIN_PAGINAS: 'No ha sido posible determinar las páginas del PDF.',
  PDF_SIN_CAPA_DE_TEXTO: 'El PDF no lleva capa de texto: es un documento escaneado.',
};

class ErrorLectura extends Error {
  constructor(codigo) {
    const mensaje = CODIGOS_LECTURA[codigo];
    if (!mensaje) throw new Error(`Código de lectura desconocido: ${codigo}`);
    super(mensaje);
    this.name = 'ErrorLectura';
    this.codigo = codigo;
  }
}

// ───────────────────────────── indice de objetos ─────────────────────────────

/**
 * Indice de los objetos del documento por numero.
 *
 * Se recorre el fichero entero buscando `N G obj` en lugar de seguir la tabla
 * de referencias cruzadas. Es deliberado: la tabla sobra —el cuerpo ya dice
 * donde empieza cada objeto— y un documento con la tabla rota, que los hay,
 * se sigue leyendo. Cuando un numero aparece dos veces gana la ultima
 * aparicion, que es como se comporta una actualizacion incremental.
 */
function indexar(buf) {
  const s = buf.toString('latin1');
  const objetos = new Map();
  for (const m of s.matchAll(/(?:^|[^0-9])(\d+)\s+(\d+)\s+obj\b/g)) {
    objetos.set(Number(m[1]), { inicio: m.index + m[0].length, enFlujo: null });
  }
  return { buf, s, objetos };
}

/** Cuerpo textual de un objeto, hasta su `endobj`. */
function cuerpo(doc, numero) {
  const o = doc.objetos.get(numero);
  if (!o) return '';
  if (o.enFlujo !== null) return o.enFlujo;
  const fin = doc.s.indexOf('endobj', o.inicio);
  return doc.s.slice(o.inicio, fin < 0 ? o.inicio + 8192 : fin);
}

/** Valor entero de una clave, resolviendo la referencia indirecta si la hay. */
function entero(doc, dic, clave) {
  const directo = new RegExp(`/${clave}\\s+(\\d+)(?!\\s+\\d+\\s+R)`).exec(dic);
  if (directo) return Number(directo[1]);
  const indirecto = new RegExp(`/${clave}\\s+(\\d+)\\s+\\d+\\s+R`).exec(dic);
  if (!indirecto) return null;
  const m = /(\d+)/.exec(cuerpo(doc, Number(indirecto[1])));
  return m ? Number(m[1]) : null;
}

/** Contenido de un flujo, ya descomprimido. `null` si el objeto no lleva flujo. */
function flujo(doc, numero) {
  const o = doc.objetos.get(numero);
  if (!o || o.enFlujo !== null) return null;
  // Margen holgado: el diccionario de un flujo es corto, pero uno con filtros
  // encadenados o parametros de decodificacion se estira, y no encontrar el
  // `stream` se traduciria en una pagina muda sin explicacion.
  const cabecera = doc.s.slice(o.inicio, o.inicio + 8192);
  const marca = /stream\r\n|stream\n|stream\r/.exec(cabecera);
  if (!marca) return null;

  const diccionario = cabecera.slice(0, marca.index);
  const inicio = o.inicio + marca.index + marca[0].length;
  const declarada = entero(doc, diccionario, 'Length');
  // La longitud declarada manda; si falta o miente, se recorta en `endstream`.
  const cierre = doc.s.indexOf('endstream', inicio);
  let fin = declarada !== null ? inicio + declarada : cierre;
  if (cierre >= 0 && (fin > cierre || fin <= inicio)) fin = cierre;
  if (fin <= inicio) return null;

  let bytes = doc.buf.subarray(inicio, fin);
  if (/\/FlateDecode/.test(diccionario)) {
    try {
      bytes = zlib.inflateSync(bytes);
    } catch {
      // Un flujo truncado todavia sirve: se descomprime lo que haya llegado.
      try {
        bytes = zlib.inflateSync(bytes, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
      } catch { return null; }
    }
  }
  return { diccionario, bytes };
}

/**
 * Incorpora los objetos que viajan dentro de flujos de objetos (`/ObjStm`).
 *
 * Word comprime ahi parte del documento. En el corpus actual lo que se necesita
 * —paginas, fuentes, contenidos— va suelto, pero eso es casualidad del
 * exportador y no una garantia: sin esto, otro documento del mismo Word
 * devolveria un informe vacio sin poder explicar por que.
 *
 * Lo que ya esta definido en el cuerpo no se pisa: si un numero aparece en los
 * dos sitios, la definicion suelta es la de la actualizacion mas reciente.
 */
function absorberFlujosDeObjetos(doc) {
  for (const [numero] of [...doc.objetos]) {
    const c = cuerpo(doc, numero);
    if (!/\/Type\s*\/ObjStm/.test(c)) continue;
    const f = flujo(doc, numero);
    if (!f) continue;
    const texto = f.bytes.toString('latin1');
    const cuantos = entero(doc, f.diccionario, 'N');
    const primero = entero(doc, f.diccionario, 'First');
    if (!cuantos || primero === null) continue;

    const cabecera = texto.slice(0, primero).trim().split(/\s+/).map(Number);
    for (let i = 0; i < cuantos; i++) {
      const num = cabecera[i * 2];
      const desplazamiento = cabecera[i * 2 + 1];
      if (!Number.isFinite(num) || !Number.isFinite(desplazamiento)) continue;
      if (doc.objetos.has(num)) continue;
      const siguiente = cabecera[i * 2 + 3];
      const fin = Number.isFinite(siguiente) ? primero + siguiente : texto.length;
      doc.objetos.set(num, { inicio: 0, enFlujo: texto.slice(primero + desplazamiento, fin) });
    }
  }
}

// ───────────────────────────── arbol de paginas ─────────────────────────────

/** Numeros de objeto de las paginas, en orden de lectura. */
function arbolDePaginas(doc) {
  let raiz = null;
  for (const [numero] of doc.objetos) {
    const c = cuerpo(doc, numero);
    if (/\/Type\s*\/Pages\b/.test(c) && !/\/Parent\s+\d+\s+\d+\s+R/.test(c)) { raiz = numero; break; }
  }

  const orden = [];
  const visitados = new Set();
  const bajar = (numero) => {
    if (visitados.has(numero) || orden.length >= MAX_PAGINAS) return;
    visitados.add(numero);
    const c = cuerpo(doc, numero);
    if (/\/Type\s*\/Page\s*(?:\/|>|$)/.test(c) || /\/Type\s*\/Page\b(?!s)/.test(c)) { orden.push(numero); return; }
    const kids = /\/Kids\s*\[([\s\S]*?)\]/.exec(c);
    if (!kids) return;
    for (const r of kids[1].matchAll(/(\d+)\s+\d+\s+R/g)) bajar(Number(r[1]));
  };
  if (raiz !== null) bajar(raiz);

  // Sin arbol utilizable se recurre al orden de aparicion. Es peor —el orden de
  // los objetos no tiene por que ser el de lectura— pero es honesto: se lee
  // todo el texto que hay, y quien decide sobre paginas concretas ya sabra.
  if (!orden.length) {
    for (const [numero] of doc.objetos) {
      if (orden.length >= MAX_PAGINAS) break;
      if (/\/Type\s*\/Page\b(?!s)/.test(cuerpo(doc, numero))) orden.push(numero);
    }
  }
  return orden;
}

// ──────────────────────────────── fuentes ────────────────────────────────

/* Los codigos 128-159 de WinAnsi no coinciden con Latin-1: ahi es donde viven
   las comillas tipograficas y la raya, que abundan en estos informes. */
const WINANSI = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
  0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜',
  0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

/** Tabla codigo → texto declarada por un `/ToUnicode`. */
function leerCMap(texto) {
  const mapa = new Map();
  const aTexto = (hex) => {
    let s = '';
    for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return s;
  };
  for (const bloque of texto.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const par of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g))
      mapa.set(parseInt(par[1], 16), aTexto(par[2]));

  for (const bloque of texto.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const t of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const desde = parseInt(t[1], 16), hasta = parseInt(t[2], 16), destino = parseInt(t[3], 16);
      for (let c = desde; c <= hasta && c - desde < 65536; c++) mapa.set(c, String.fromCharCode(destino + (c - desde)));
    }
    for (const t of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      const desde = parseInt(t[1], 16);
      let i = 0;
      for (const pieza of t[3].matchAll(/<([0-9A-Fa-f]+)>/g)) mapa.set(desde + i++, aTexto(pieza[1]));
    }
  }
  return mapa;
}

/** Recorta el diccionario `<<…>>` que sigue a una clave, contando anidamiento. */
function diccionarioTras(texto, clave) {
  const i = texto.indexOf(clave);
  if (i < 0) return null;
  const resto = texto.slice(i + clave.length).replace(/^\s*/, '');
  if (!resto.startsWith('<<')) return null;
  let profundidad = 0;
  for (let j = 0; j < resto.length; j++) {
    if (resto.startsWith('<<', j)) { profundidad++; j++; }
    else if (resto.startsWith('>>', j)) { profundidad--; j++; if (!profundidad) return resto.slice(0, j + 1); }
  }
  return null;
}

/** Lista de numeros de un array, resolviendo la referencia indirecta si la hay. */
function arrayDeNumeros(doc, dic, clave) {
  const directo = new RegExp(`/${clave}\\s*\\[([\\s\\S]*?)\\]`).exec(dic);
  if (directo) return directo[1].trim().split(/\s+/).filter(Boolean).map(Number);
  const indirecto = new RegExp(`/${clave}\\s+(\\d+)\\s+\\d+\\s+R`).exec(dic);
  if (!indirecto) return null;
  const m = /\[([\s\S]*?)\]/.exec(cuerpo(doc, Number(indirecto[1])));
  return m ? m[1].trim().split(/\s+/).filter(Boolean).map(Number) : null;
}

/** Fuentes declaradas en los recursos de una pagina, por su nombre corto. */
function fuentesDe(doc, numeroPagina) {
  let recursos = cuerpo(doc, numeroPagina);
  const referencia = /\/Resources\s+(\d+)\s+\d+\s+R/.exec(recursos);
  if (referencia) recursos = cuerpo(doc, Number(referencia[1]));

  let catalogo = diccionarioTras(recursos, '/Font');
  if (!catalogo) {
    const indirecto = /\/Font\s+(\d+)\s+\d+\s+R/.exec(recursos);
    if (indirecto) catalogo = cuerpo(doc, Number(indirecto[1]));
  }
  const fuentes = new Map();
  if (!catalogo) return fuentes;

  for (const entrada of catalogo.matchAll(/\/([A-Za-z0-9#+._-]+)\s+(\d+)\s+\d+\s+R/g)) {
    const dic = cuerpo(doc, Number(entrada[2]));
    if (!/\/BaseFont/.test(dic) && !/\/Type\s*\/Font/.test(dic)) continue;

    const dosBytes = /\/Subtype\s*\/Type0/.test(dic) || /\/Encoding\s*\/Identity-[HV]/.test(dic);
    const fuente = { dosBytes, mapa: null, primerCodigo: 0, anchos: null, anchoPorDefecto: dosBytes ? 1000 : 500, anchosCid: null };

    const aUnicode = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(dic);
    if (aUnicode) {
      const f = flujo(doc, Number(aUnicode[1]));
      if (f) fuente.mapa = leerCMap(f.bytes.toString('latin1'));
    }

    if (dosBytes) {
      const descendiente = /\/DescendantFonts\s*\[?\s*(\d+)\s+\d+\s+R/.exec(dic);
      const dicHijo = descendiente ? cuerpo(doc, Number(descendiente[1])) : dic;
      const pordefecto = entero(doc, dicHijo, 'DW');
      if (pordefecto) fuente.anchoPorDefecto = pordefecto;
      fuente.anchosCid = leerAnchosCid(dicHijo);
    } else {
      fuente.primerCodigo = entero(doc, dic, 'FirstChar') ?? 0;
      fuente.anchos = arrayDeNumeros(doc, dic, 'Widths');
      const descriptor = /\/FontDescriptor\s+(\d+)\s+\d+\s+R/.exec(dic);
      const falta = descriptor ? entero(doc, cuerpo(doc, Number(descriptor[1])), 'MissingWidth') : null;
      if (falta) fuente.anchoPorDefecto = falta;
    }
    fuentes.set(entrada[1], fuente);
  }
  return fuentes;
}

/** Tabla `/W` de una fuente compuesta: `c [w w w]` o `desde hasta w`. */
function leerAnchosCid(dic) {
  const bloque = /\/W\s*\[([\s\S]*?)\]\s*(?:\/|>>)/.exec(dic);
  if (!bloque) return null;
  const anchos = new Map();
  const piezas = bloque[1].match(/\[[^\]]*\]|[-\d.]+/g) ?? [];
  for (let i = 0; i < piezas.length; i++) {
    if (piezas[i].startsWith('[')) continue;
    const desde = Number(piezas[i]);
    const siguiente = piezas[i + 1];
    if (siguiente && siguiente.startsWith('[')) {
      const lista = siguiente.slice(1, -1).trim().split(/\s+/).filter(Boolean).map(Number);
      lista.forEach((w, j) => anchos.set(desde + j, w));
      i++;
    } else if (piezas[i + 2] !== undefined && !piezas[i + 2].startsWith('[')) {
      const hasta = Number(piezas[i + 1]);
      const ancho = Number(piezas[i + 2]);
      for (let c = desde; c <= hasta && c - desde < 65536; c++) anchos.set(c, ancho);
      i += 2;
    }
  }
  return anchos;
}

const anchoDe = (fuente, codigo) => {
  if (!fuente) return 500;
  if (fuente.dosBytes) return fuente.anchosCid?.get(codigo) ?? fuente.anchoPorDefecto;
  const i = codigo - fuente.primerCodigo;
  const w = fuente.anchos && i >= 0 && i < fuente.anchos.length ? fuente.anchos[i] : null;
  return Number.isFinite(w) && w > 0 ? w : fuente.anchoPorDefecto;
};

/** Codigos de una cadena cruda, ya sea de uno o de dos bytes. */
function codigosDe(bruto, fuente) {
  const codigos = [];
  if (fuente?.dosBytes) {
    for (let i = 0; i + 1 < bruto.length; i += 2) codigos.push((bruto.charCodeAt(i) << 8) | bruto.charCodeAt(i + 1));
  } else {
    for (let i = 0; i < bruto.length; i++) codigos.push(bruto.charCodeAt(i));
  }
  return codigos;
}

function decodificar(codigos, fuente) {
  let salida = '';
  for (const c of codigos) {
    const delMapa = fuente?.mapa?.get(c);
    if (delMapa !== undefined && delMapa !== '') { salida += delMapa; continue; }
    // Una fuente compuesta sin tabla no se adivina: se deja constancia del hueco.
    if (fuente?.dosBytes) { salida += delMapa === '' ? '' : '�'; continue; }
    salida += WINANSI[c] ?? String.fromCharCode(c);
  }
  return salida;
}

// ─────────────────────── analisis del flujo de contenido ───────────────────────

/**
 * Trocea un flujo de contenido en cadenas, numeros, nombres y operadores.
 * No construye arboles: los operandos van antes del operador y con eso basta.
 */
function tokenizar(s) {
  const piezas = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '%') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0') { i++; continue; }

    if (c === '(') {
      let profundidad = 1, texto = '';
      i++;
      while (i < s.length && profundidad > 0) {
        const d = s[i];
        if (d === '\\') {
          const octal = /^[0-7]{1,3}/.exec(s.slice(i + 1, i + 4));
          if (octal) { texto += String.fromCharCode(parseInt(octal[0], 8) & 0xff); i += 1 + octal[0].length; continue; }
          const siguiente = s[i + 1];
          if (siguiente === '\n') { i += 2; continue; }           // continuacion de linea
          if (siguiente === '\r') { i += s[i + 2] === '\n' ? 3 : 2; continue; }
          texto += { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[siguiente] ?? siguiente;
          i += 2; continue;
        }
        if (d === '(') { profundidad++; texto += d; i++; continue; }
        if (d === ')') { profundidad--; i++; if (!profundidad) break; texto += d; continue; }
        texto += d; i++;
      }
      piezas.push({ tipo: 'cadena', valor: texto });
      continue;
    }

    if (c === '<' && s[i + 1] !== '<') {
      const cierre = s.indexOf('>', i);
      const hex = s.slice(i + 1, cierre < 0 ? s.length : cierre).replace(/\s/g, '');
      let texto = '';
      for (let k = 0; k + 2 <= hex.length; k += 2) texto += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
      if (hex.length % 2) texto += String.fromCharCode(parseInt(hex.slice(-1) + '0', 16));
      piezas.push({ tipo: 'cadena', valor: texto });
      i = cierre < 0 ? s.length : cierre + 1;
      continue;
    }

    if (s.startsWith('<<', i)) { piezas.push({ tipo: 'operador', valor: '<<' }); i += 2; continue; }
    if (s.startsWith('>>', i)) { piezas.push({ tipo: 'operador', valor: '>>' }); i += 2; continue; }
    if (c === '[' || c === ']') { piezas.push({ tipo: 'operador', valor: c }); i++; continue; }
    if (c === '{' || c === '}') { i++; continue; }

    if (c === '/') {
      const m = /^\/([^\s/()<>[\]{}%]*)/.exec(s.slice(i));
      piezas.push({ tipo: 'nombre', valor: m[1] });
      i += m[0].length;
      continue;
    }

    if (/[-+.\d]/.test(c)) {
      const m = /^[-+]?(?:\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (m) { piezas.push({ tipo: 'numero', valor: parseFloat(m[0]) }); i += m[0].length; continue; }
      i++; continue;
    }

    const m = /^[A-Za-z'"*][A-Za-z0-9'"*]*/.exec(s.slice(i));
    if (m) { piezas.push({ tipo: 'operador', valor: m[0] }); i += m[0].length; continue; }
    i++;
  }
  return piezas;
}

const multiplicar = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const IDENTIDAD = [1, 0, 0, 1, 0, 0];

/**
 * Piezas de texto de una pagina, cada una con su posicion y su anchura reales.
 *
 * La anchura sale de la tabla de la fuente, nunca de una estimacion: es lo que
 * permite despues saber si dos piezas contiguas son una misma palabra partida
 * por el kerning o dos celdas distintas de una tabla.
 */
function piezasDePagina(doc, numeroPagina) {
  const dic = cuerpo(doc, numeroPagina);
  const referencias = [];
  const unico = /\/Contents\s+(\d+)\s+\d+\s+R/.exec(dic);
  if (unico) referencias.push(Number(unico[1]));
  else {
    const varios = /\/Contents\s*\[([\s\S]*?)\]/.exec(dic);
    if (varios) for (const r of varios[1].matchAll(/(\d+)\s+\d+\s+R/g)) referencias.push(Number(r[1]));
  }

  let contenido = '';
  for (const r of referencias) {
    const f = flujo(doc, r);
    if (f) contenido += `${f.bytes.toString('latin1')}\n`;
  }
  if (!contenido) return [];

  const fuentes = fuentesDe(doc, numeroPagina);
  const piezas = [];
  const tokens = tokenizar(contenido);

  let ctm = IDENTIDAD.slice();
  let tm = IDENTIDAD.slice();
  let tlm = IDENTIDAD.slice();
  let fuente = null;
  let cuerpoTexto = 10;      // Tf
  let interletra = 0;        // Tc
  let interpalabra = 0;      // Tw
  let escalaH = 1;           // Tz / 100
  let interlinea = 0;        // TL
  const pila = [];

  const mostrar = (bruto) => {
    const codigos = codigosDe(bruto, fuente);
    const texto = decodificar(codigos, fuente);

    let avance = 0;
    for (const c of codigos) {
      const propio = (anchoDe(fuente, c) / 1000) * cuerpoTexto;
      // El espacio de un byte es el unico que recibe `Tw`; en una fuente
      // compuesta el codigo 32 no significa espacio y la regla no aplica.
      const extra = interletra + (!fuente?.dosBytes && c === 32 ? interpalabra : 0);
      avance += (propio + extra) * escalaH;
    }

    if (texto) {
      const trm = multiplicar(tm, ctm);
      const escala = Math.hypot(trm[0], trm[1]) || 1;
      piezas.push({
        x: trm[4],
        y: trm[5],
        texto,
        ancho: avance * escala,
        cuerpo: cuerpoTexto * escala,
      });
    }
    tm = multiplicar([1, 0, 0, 1, avance, 0], tm);
  };

  const bajarLinea = (desplazamiento) => {
    tlm = multiplicar([1, 0, 0, 1, 0, desplazamiento], tlm);
    tm = tlm.slice();
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.tipo !== 'operador') continue;
    const operando = (atras) => tokens[i - atras];
    const numero = (atras) => {
      const p = operando(atras);
      return p && p.tipo === 'numero' ? p.valor : 0;
    };

    switch (token.valor) {
      case 'q':
        pila.push({ ctm: ctm.slice(), fuente, cuerpoTexto, interletra, interpalabra, escalaH, interlinea });
        break;
      case 'Q': {
        const previo = pila.pop();
        if (previo) {
          // Se restaura el estado grafico. La matriz de texto no forma parte de
          // el: la reinicia `BT`, que es quien abre cada bloque.
          ({ fuente, cuerpoTexto, interletra, interpalabra, escalaH, interlinea } = previo);
          ctm = previo.ctm;
        }
        break;
      }
      case 'cm':
        ctm = multiplicar([numero(6), numero(5), numero(4), numero(3), numero(2), numero(1)], ctm);
        break;

      case 'BT': tm = IDENTIDAD.slice(); tlm = IDENTIDAD.slice(); break;
      case 'ET': break;

      case 'Tf': {
        const nombre = operando(2);
        if (nombre?.tipo === 'nombre') fuente = fuentes.get(nombre.valor) ?? null;
        cuerpoTexto = numero(1);
        break;
      }
      case 'Tc': interletra = numero(1); break;
      case 'Tw': interpalabra = numero(1); break;
      case 'Tz': escalaH = (numero(1) || 100) / 100; break;
      case 'TL': interlinea = numero(1); break;

      case 'Tm':
        tm = [numero(6), numero(5), numero(4), numero(3), numero(2), numero(1)];
        tlm = tm.slice();
        break;
      case 'Td':
        tlm = multiplicar([1, 0, 0, 1, numero(2), numero(1)], tlm);
        tm = tlm.slice();
        break;
      case 'TD':
        interlinea = -numero(1);
        tlm = multiplicar([1, 0, 0, 1, numero(2), numero(1)], tlm);
        tm = tlm.slice();
        break;
      case 'T*': bajarLinea(-interlinea); break;

      case 'Tj': {
        const p = operando(1);
        if (p?.tipo === 'cadena') mostrar(p.valor);
        break;
      }
      case "'": {
        bajarLinea(-interlinea);
        const p = operando(1);
        if (p?.tipo === 'cadena') mostrar(p.valor);
        break;
      }
      case '"': {
        interpalabra = numero(3);
        interletra = numero(2);
        bajarLinea(-interlinea);
        const p = operando(1);
        if (p?.tipo === 'cadena') mostrar(p.valor);
        break;
      }
      case 'TJ': {
        let j = i - 1;
        const elementos = [];
        while (j >= 0 && !(tokens[j].tipo === 'operador' && tokens[j].valor === '[')) { elementos.push(tokens[j]); j--; }
        elementos.reverse();
        for (const elemento of elementos) {
          if (elemento.tipo === 'cadena') { mostrar(elemento.valor); continue; }
          if (elemento.tipo !== 'numero') continue;
          // El ajuste no se convierte en espacio aqui: solo mueve el lapiz. Que
          // el hueco resultante sea o no un espacio lo decide `montarLineas`,
          // que ya conoce la anchura real de lo escrito a cada lado.
          const salto = (-elemento.valor / 1000) * cuerpoTexto * escalaH;
          tm = multiplicar([1, 0, 0, 1, salto, 0], tm);
        }
        break;
      }
      default: break;
    }
  }
  return piezas;
}

// ──────────────────────────── montaje de lineas ────────────────────────────

/* Proporciones del cuerpo de letra, no medidas absolutas: el documento puede
   venir escalado por su matriz y una constante en puntos no serviria. */
const TOLERANCIA_LINEA = 0.4;   // dos piezas comparten linea si su base casi coincide
const HUECO_ESPACIO = 0.22;     // a partir de aqui hay un espacio entre palabras
const HUECO_COLUMNA = 1.1;      // a partir de aqui es otra celda de la tabla

/**
 * Agrupa las piezas en lineas y cada linea en columnas.
 *
 * El hueco entre dos piezas se mide contra el final real de la anterior, que se
 * conoce porque su anchura salio de la tabla de la fuente. Un hueco pequeno es
 * kerning y no separa nada; uno mediano es un espacio; uno grande es el salto a
 * otra columna.
 */
function montarLineas(piezas) {
  const ordenadas = piezas.slice().sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const grupos = [];
  let actual = null;
  for (const pieza of ordenadas) {
    const tolerancia = Math.max(pieza.cuerpo, actual?.cuerpo ?? 0) * TOLERANCIA_LINEA;
    if (!actual || Math.abs(actual.y - pieza.y) > tolerancia) {
      actual = { y: pieza.y, cuerpo: pieza.cuerpo, piezas: [pieza] };
      grupos.push(actual);
    } else {
      actual.piezas.push(pieza);
      actual.cuerpo = Math.max(actual.cuerpo, pieza.cuerpo);
    }
  }

  const lineas = [];
  for (const grupo of grupos) {
    const enOrden = grupo.piezas.sort((a, b) => a.x - b.x);
    const celdas = [];
    let actual = null;
    let finAnterior = null;

    for (const pieza of enOrden) {
      if (finAnterior !== null && actual) {
        const hueco = pieza.x - finAnterior;
        if (hueco > pieza.cuerpo * HUECO_COLUMNA) { celdas.push(actual); actual = null; }
        else if (hueco > pieza.cuerpo * HUECO_ESPACIO && !/\s$/.test(actual.texto)) actual.texto += ' ';
      }
      // La izquierda de cada celda se conserva porque es lo unico que permite
      // saber, sin adivinar, si una linea suelta continua el rotulo o el valor
      // de la fila anterior: las celdas de una tabla comparten margen y el
      // texto derramado cae bajo el suyo.
      if (!actual) actual = { texto: '', izquierda: pieza.x };
      actual.texto += pieza.texto;
      finAnterior = pieza.x + pieza.ancho;
    }
    if (actual) celdas.push(actual);

    // El tabulador es texto del documento en los exportados de macOS, no un
    // hueco calculado: se normaliza para que ninguna regla dependa de el.
    const limpias = celdas
      .map((c) => ({ texto: c.texto.replace(/\s+/g, ' ').trim(), izquierda: c.izquierda }))
      .filter((c) => c.texto);
    if (!limpias.length) continue;

    lineas.push({
      texto: limpias.map((c) => c.texto).join(' '),
      columnas: limpias.map((c) => c.texto),
      izquierdas: limpias.map((c) => c.izquierda),
    });
  }
  return lineas;
}

// ────────────────────────────────── entrada ──────────────────────────────────

/**
 * Lee la capa de texto de un PDF.
 *
 * @param {Buffer} buffer contenido del fichero
 * @returns {{paginas: Array<{numero: number, lineas: Array<{texto: string, columnas: string[], izquierdas: number[]}>}>, truncado: boolean}}
 * @throws {ErrorLectura} si el fichero no es legible como PDF
 */
function leerPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) throw new ErrorLectura('NO_ES_PDF');
  if (buffer.length > MAX_BYTES) throw new ErrorLectura('PDF_DEMASIADO_GRANDE');
  // La cabecera puede llevar basura delante; el margen es el que admite la norma.
  if (!buffer.subarray(0, 1024).toString('latin1').includes('%PDF-')) throw new ErrorLectura('NO_ES_PDF');

  const doc = indexar(buffer);
  if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(doc.s)) throw new ErrorLectura('PDF_CIFRADO');

  absorberFlujosDeObjetos(doc);
  const numeros = arbolDePaginas(doc);
  if (!numeros.length) throw new ErrorLectura('PDF_SIN_PAGINAS');

  const paginas = numeros.map((numero, i) => ({
    numero: i + 1,
    lineas: montarLineas(piezasDePagina(doc, numero)),
  }));

  // Un documento escaneado se distingue de uno vacio: aqui hay paginas, y no
  // hay una sola linea de texto en ninguna. Decirlo ahora ahorra que la
  // extraccion informe de veinte campos ausentes por veinte motivos distintos.
  if (!paginas.some((p) => p.lineas.length)) throw new ErrorLectura('PDF_SIN_CAPA_DE_TEXTO');

  return { paginas, truncado: numeros.length >= MAX_PAGINAS };
}

module.exports = { leerPdf, ErrorLectura, CODIGOS_LECTURA, MAX_PAGINAS, MAX_BYTES };
