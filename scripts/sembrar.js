'use strict';

/**
 * Constituye la cartera inicial de Warrants & Co. con las cuatro tesis en vigor.
 * Las fichas quedan registradas sin soporte documental: los PDF y hojas de calculo
 * se incorporan desde el area de redaccion de la plataforma.
 *
 *   node scripts/sembrar.js           alta si el repositorio esta vacio
 *   node scripts/sembrar.js --forzar  reconstruye las fichas de cartera
 */

const { db } = require('../src/db');

const TESIS = [
  {
    empresa: 'Oracle Corporation',
    ticker: 'ORCL',
    sector: 'Tecnología de la información',
    pais: 'Estados Unidos',
    tipo_informe: 'Tesis de inversión',
    periodo: 'Ejercicio 2026',
    analista: 'Departamento de Análisis',
    recomendacion: 'Comprar',
    precio_objetivo: 215,
    precio_compra: 188.40,
    take_profit: 220,
    stop_loss: 165,
    divisa: 'USD',
    resumen_ejecutivo:
      'Iniciamos posición en Oracle sobre la base de la reaceleración de su división de infraestructura ' +
      'en la nube (OCI), cuya cartera de pedidos contratada respalda un crecimiento de ingresos de doble ' +
      'dígito para los próximos ejercicios. La compañía mantiene una posición diferencial en cargas de ' +
      'trabajo de inteligencia artificial gracias a su capacidad instalada de cómputo y a los acuerdos ' +
      'plurianuales suscritos con proveedores de modelos fundacionales. La conversión en caja del negocio ' +
      'recurrente y la disciplina en la asignación de capital sostienen nuestra valoración.',
    etiquetas: ['cloud', 'infraestructura', 'inteligencia artificial', 'software empresarial'],
    nivel_acceso: 'cliente',
    destacado: 1,
    en_cartera: 1,
    peso_cartera: 30,
    fecha_publicacion: '2026-01-15',
  },
  {
    empresa: 'QUALCOMM Incorporated',
    ticker: 'QCOM',
    sector: 'Tecnología de la información',
    pais: 'Estados Unidos',
    tipo_informe: 'Inicio de cobertura',
    periodo: 'Ejercicio 2026',
    analista: 'Departamento de Análisis',
    recomendacion: 'Sobreponderar',
    precio_objetivo: 195,
    precio_compra: 141.20,
    take_profit: 190,
    stop_loss: 120,
    divisa: 'USD',
    resumen_ejecutivo:
      'Iniciamos cobertura de QUALCOMM con recomendación de sobreponderar. La tesis descansa en la ' +
      'diversificación efectiva del negocio más allá del segmento de telefonía móvil, con avances ' +
      'relevantes en automoción e internet de las cosas, y en la resiliencia de los ingresos por licencias ' +
      'de propiedad intelectual. Consideramos que la cotización no recoge adecuadamente la normalización ' +
      'del ciclo de semiconductores ni el potencial del cómputo en el dispositivo. La retribución al ' +
      'accionista y un balance saneado limitan el riesgo a la baja.',
    // Texto de prueba pedido explícitamente para validar riesgos_clave contra
    // datos sembrados reales, no un mock aparte.
    riesgos_clave:
      'Execution Risk: Delays in scaling the new product pipeline could compress margins. Macro: Exposure to ' +
      'emerging market FX headwinds. Valuation: Trading at a premium to historical averages, leaving little ' +
      'margin of safety.',
    etiquetas: ['semiconductores', 'automoción', 'propiedad intelectual', 'cómputo en dispositivo'],
    nivel_acceso: 'cliente',
    destacado: 1,
    en_cartera: 1,
    peso_cartera: 25,
    fecha_publicacion: '2026-02-20',
  },
  {
    empresa: 'Iovance Biotherapeutics, Inc.',
    ticker: 'IOVA',
    sector: 'Salud',
    pais: 'Estados Unidos',
    tipo_informe: 'Tesis de inversión',
    periodo: 'Ejercicio 2026',
    analista: 'Departamento de Análisis',
    recomendacion: 'Comprar',
    precio_objetivo: 9.5,
    precio_compra: 3.62,
    take_profit: 9.00,
    stop_loss: 2.80,
    divisa: 'USD',
    resumen_ejecutivo:
      'Incorporamos Iovance Biotherapeutics como posición de convicción con perfil de riesgo elevado. ' +
      'La compañía dispone de una terapia celular aprobada en melanoma avanzado y de una plataforma de ' +
      'linfocitos infiltrantes de tumor con potencial de extensión a indicaciones adicionales. La tesis ' +
      'exige un seguimiento estrecho de la curva de adopción en centros autorizados, de la evolución de ' +
      'los márgenes de fabricación y de la posición de tesorería. Dimensionamos la posición en coherencia ' +
      'con la volatilidad implícita del valor.',
    etiquetas: ['biotecnología', 'terapia celular', 'oncología', 'alto riesgo'],
    nivel_acceso: 'institucional',
    destacado: 0,
    en_cartera: 1,
    peso_cartera: 15,
    fecha_publicacion: '2026-04-10',
  },
  {
    empresa: 'Reddit, Inc.',
    ticker: 'RDDT',
    sector: 'Servicios de comunicación',
    pais: 'Estados Unidos',
    tipo_informe: 'Tesis de inversión',
    periodo: 'Ejercicio 2026',
    analista: 'Departamento de Análisis',
    recomendacion: 'Comprar',
    precio_objetivo: 210,
    precio_compra: 143.10,
    take_profit: 200,
    stop_loss: 120,
    divisa: 'USD',
    resumen_ejecutivo:
      'Tomamos posición en Reddit atendiendo a la monetización creciente de una comunidad de usuarios de ' +
      'elevada intencionalidad y a la aparición de una segunda línea de ingresos derivada de los acuerdos ' +
      'de licencia de datos para el entrenamiento de modelos de lenguaje. El apalancamiento operativo del ' +
      'negocio publicitario, todavía en fase temprana de desarrollo respecto a comparables del sector, ' +
      'justifica nuestra valoración. Vigilamos la dependencia del tráfico procedente de buscadores como ' +
      'principal factor de riesgo.',
    etiquetas: ['plataformas digitales', 'publicidad', 'licencia de datos', 'redes sociales'],
    nivel_acceso: 'cliente',
    destacado: 1,
    en_cartera: 1,
    peso_cartera: 30,
    fecha_publicacion: '2026-05-22',
  },
];

const forzar = process.argv.includes('--forzar');
const { total } = db.prepare('SELECT COUNT(*) AS total FROM informes').get();

if (total > 0 && !forzar) {
  console.log(`El repositorio ya contiene ${total} informe(s). Use --forzar para reconstruir la cartera inicial.`);
  process.exit(0);
}

if (forzar) {
  const tickers = TESIS.map((t) => t.ticker);
  const marcadores = tickers.map(() => '?').join(',');
  const borrados = db.prepare(`DELETE FROM informes WHERE ticker IN (${marcadores})`).run(...tickers);
  if (borrados.changes) console.log(`Retiradas ${borrados.changes} ficha(s) previa(s).`);
}

const columnas = [
  'empresa', 'ticker', 'sector', 'pais', 'tipo_informe', 'periodo', 'analista',
  'recomendacion', 'precio_objetivo', 'precio_compra', 'take_profit', 'stop_loss',
  'divisa', 'resumen_ejecutivo', 'riesgos_clave', 'etiquetas',
  'nivel_acceso', 'destacado', 'en_cartera', 'peso_cartera', 'fecha_publicacion',
];
const insertar = db.prepare(
  `INSERT INTO informes (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`
);

db.exec('BEGIN IMMEDIATE');
try {
  for (const t of TESIS) {
    insertar.run(...columnas.map((c) => (c === 'etiquetas' ? JSON.stringify(t[c]) : t[c] ?? null)));
    console.log(`  Registrada  ${String(t.ticker).padEnd(6)} ${t.empresa}`);
  }
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('No ha sido posible constituir la cartera inicial:', err.message);
  process.exit(1);
}

console.log(`\nCartera inicial constituida con ${TESIS.length} tesis de inversión.`);
db.close();
