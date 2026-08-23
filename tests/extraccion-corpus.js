'use strict';

/* ============================================================================
   Extracción contra los informes reales de la casa.

   Las otras dos baterías prueban las reglas contra documentos sintéticos y
   corren en cualquier clon. Esta comprueba lo que ninguna de ellas puede: que
   los informes que el equipo publica de verdad —con sus dos plantillas, sus
   tablas descuadradas y sus exportadores distintos— siguen dando lo que se
   espera de ellos.

       node tests/extraccion-corpus.js

   `data/uploads/` está en `.gitignore`, de modo que el corpus no viaja con el
   repositorio. Sin corpus esta comprobación **falla**, no se salta: una prueba
   que no corre no acredita nada, y un salto silencioso se convierte en verde.

   Un informe cuyo ticker no figure en la tabla de abajo no rompe la batería
   —el corpus crece— pero se anuncia, para que alguien decida si merece entrar.
   ========================================================================= */

const fs = require('node:fs');
const path = require('node:path');

const { leerPdf } = require('../src/extraccion/pdf');
const { extraerFicha } = require('../src/extraccion/ficha');

const DIRECTORIO = path.join(__dirname, '..', 'data', 'uploads');

/* Fecha de referencia fija: con la del día, un informe publicado hoy pasaría de
   propuesto a `FECHA_FUTURA` según a qué hora se ejecute la batería. */
const HOY = '2026-12-31';

/**
 * Lo que cada informe conocido tiene que dar. Se indexa por ticker y no por
 * nombre de fichero porque el nombre lo genera el servidor en cada subida: un
 * informe resubido es el mismo informe con otro nombre.
 *
 * Las cifras de aquí son **lo que dice el PDF**, no lo que el analista tecleó
 * en su ficha. Los dos no coinciden, y no deben: véase el encabezado de
 * `ficha.js`. Ajustar esta tabla para que coincida con el repositorio sería
 * convertir la extracción en el juicio de quien la escribió.
 */
const ESPERADO = {
  IOVA: {
    empresa: 'Iovance Biotherapeutics, Inc.',
    sector: 'Salud',
    pais: 'Estados Unidos',
    fecha_publicacion: '2026-01-30',
    // Objetivo y peso vienen como rango; la compra, como prima de una opción.
    precio_objetivo: { motivo: 'RANGO' },
    peso_cartera: { motivo: 'RANGO' },
    precio_compra: { motivo: 'ETIQUETA_AUSENTE' },
    stop_loss: { motivo: 'ETIQUETA_AUSENTE' },
  },
  RDDT: {
    empresa: 'Reddit, Inc.',
    sector: 'Servicios de comunicación',
    pais: 'Estados Unidos',
    fecha_publicacion: '2026-05-20',
    precio_objetivo: 206,
    divisa: 'USD',
    peso_cartera: 4,
    precio_compra: 146.6,
    stop_loss: 139.6,
  },
  ORCL: {
    empresa: 'Oracle Corporation',
    sector: 'Tecnología de la información',
    pais: 'Estados Unidos',
    fecha_publicacion: '2026-07-28',
    precio_objetivo: 200,
    divisa: 'USD',
    peso_cartera: 4,
    precio_compra: 120,
    stop_loss: { motivo: 'ETIQUETA_AUSENTE' },
  },
  QCOM: {
    empresa: 'Qualcomm Incorporated',
    sector: 'Tecnología de la información',
    pais: 'Estados Unidos',
    fecha_publicacion: '2026-08-03',
    precio_objetivo: 260,
    divisa: 'USD',
    // Su tabla llega descuadrada: el valor va por encima de su propio rótulo.
    peso_cartera: { motivo: 'FILA_PARTIDA' },
    precio_compra: { motivo: 'ETIQUETA_AUSENTE' },
    stop_loss: { motivo: 'ETIQUETA_AUSENTE' },
  },
};

/** Lo que ningún informe puede proponer, por decisión y no por casualidad. */
const NUNCA_PROPUESTOS = ['take_profit', 'recomendacion', 'tipo_informe', 'nivel_acceso', 'etiquetas'];

let fallos = 0;
let hechas = 0;

function comprobar(rotulo, real, esperado) {
  hechas++;
  if (JSON.stringify(real) === JSON.stringify(esperado)) { console.log(`    ✓ ${rotulo}`); return; }
  fallos++;
  console.log(`    ✗ ${rotulo}\n        esperado: ${JSON.stringify(esperado)}\n        obtenido: ${JSON.stringify(real)}`);
}

// ─────────────────────────────────── corpus ───────────────────────────────────

let ficheros = [];
try {
  ficheros = fs.readdirSync(DIRECTORIO).filter((f) => f.toLowerCase().endsWith('.pdf'));
} catch { ficheros = []; }

if (!ficheros.length) {
  console.log(`\n  ✗ No hay ningún PDF en ${path.relative(process.cwd(), DIRECTORIO)}.`);
  console.log('    Esta batería comprueba los informes reales de la casa y sin ellos no acredita nada.');
  console.log('    Las que no dependen del corpus son extraccion-lector.js y extraccion.js.\n');
  process.exit(1);
}

console.log(`\n  ${ficheros.length} informe${ficheros.length === 1 ? '' : 's'} en el corpus\n`);

const vistos = new Set();
const sinGolden = [];

for (const fichero of ficheros.sort()) {
  const inicio = Date.now();
  let paginas;
  try {
    ({ paginas } = leerPdf(fs.readFileSync(path.join(DIRECTORIO, fichero))));
  } catch (err) {
    fallos++;
    hechas++;
    console.log(`  ✗ ${fichero}: no se pudo leer (${err.codigo ?? err.message})`);
    continue;
  }
  const { campos, bloques, avisos } = extraerFicha(paginas, { hoy: HOY });
  const ticker = campos.ticker.estado === 'propuesto' ? campos.ticker.valor : null;
  const ms = Date.now() - inicio;

  console.log(`  ── ${ticker ?? fichero} · ${paginas.length} pág · ficha p${bloques.ficha} · plan p${bloques.plan} · ${ms} ms`);

  /* Las anclas son la base de todo lo demás: si no aparecen, el informe no es
     de la casa o la plantilla ha vuelto a cambiar, y conviene enterarse aquí. */
  comprobar('se localizan las dos anclas', avisos, []);

  comprobar('no se propone lo que nunca debe proponerse',
    NUNCA_PROPUESTOS.filter((c) => campos[c].estado === 'propuesto'), []);

  if (!ticker) { fallos++; hechas++; console.log('    ✗ no se propuso ticker'); continue; }
  vistos.add(ticker);

  const golden = ESPERADO[ticker];
  if (!golden) { sinGolden.push(`${ticker} (${fichero})`); console.log('    · sin golden declarado'); continue; }

  for (const [campo, esperado] of Object.entries(golden)) {
    const dato = campos[campo];
    if (esperado !== null && typeof esperado === 'object') {
      comprobar(`${campo}: no se propone (${esperado.motivo})`,
        { estado: dato.estado, motivo: dato.motivo }, { estado: dato.estado === 'ausente' ? 'ausente' : 'ambiguo', motivo: esperado.motivo });
    } else {
      comprobar(`${campo} = ${JSON.stringify(esperado)}`,
        dato.estado === 'propuesto' ? dato.valor : `${dato.estado}/${dato.motivo}`, esperado);
    }
  }
}

const faltan = Object.keys(ESPERADO).filter((t) => !vistos.has(t));
if (faltan.length) console.log(`\n  · declarados en el golden y ausentes del corpus: ${faltan.join(', ')}`);
if (sinGolden.length) console.log(`  · en el corpus y sin golden: ${sinGolden.join(', ')}`);

console.log(`\n  ${hechas - fallos}/${hechas} comprobaciones superadas`);
if (fallos) {
  console.log(`  ✗ ${fallos} fallo${fallos === 1 ? '' : 's'} contra el corpus real\n`);
  process.exit(1);
}
console.log('  ✓ los informes de la casa se extraen como se espera\n');
