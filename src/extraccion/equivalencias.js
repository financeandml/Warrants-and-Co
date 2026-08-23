'use strict';

/* ============================================================================
   Equivalencias entre lo que dicen los informes y el vocabulario de la casa.

   ═══ Quién escribe aquí ═══

   **Estas tablas las fija el analista, no la extracción.** Ninguna entrada se
   deduce por parecido, ni se completa automáticamente al aparecer un valor
   nuevo. Lo que no esté escrito aquí con su equivalencia deja el campo vacío,
   por mucho que se parezca a un valor del vocabulario: «Tecnología» no es
   «Tecnología de la información» mientras nadie lo haya declarado, y decidirlo
   por cuenta propia sería exactamente la clase de inferencia que esta
   plataforma no admite disfrazada de dato.

   Un valor a `null` no es un olvido: es la declaración de que ese literal no
   tiene equivalencia y el campo se queda vacío. Los dos casos —sin declarar y
   declarado sin equivalencia— se comportan igual; la diferencia es que el
   segundo consta, y así nadie vuelve a preguntarse por él.

   ═══ Cómo se amplía ═══

   Cuando un informe traiga un literal que no figure aquí, la extracción deja
   el campo vacío y lo dice con `SECTOR_SIN_EQUIVALENCIA` o
   `PAIS_SIN_EQUIVALENCIA`, mostrando el literal tal cual. Ese literal se añade
   a la tabla —a mano, con su equivalencia o con `null`— y desde entonces se
   comporta como los demás.

   ═══ Por qué es enumerable ═══

   Una prueba la recorre y comprueba dos cosas: que toda equivalencia declarada
   existe en el vocabulario de `src/validacion.js`, y que la búsqueda no
   distingue mayúsculas ni espacios de más. Una tabla que no se puede recorrer
   no se puede comprobar.
   ========================================================================= */

/**
 * Sector del informe → sector del vocabulario de `validacion.js`.
 * Clave: el literal tal como aparece en la fila «Sector» de la ficha.
 */
const SECTORES = {
  /* Los cuatro primeros son GICS estándar: el primer segmento nombra el sector
     y el segundo la industria, que aquí no interesa. */
  'Healthcare / Biotechnology': 'Salud',
  'Communication Services / Internet Content & Information': 'Servicios de comunicación',
  'Information Technology / Software Infraestructura & Cloud': 'Tecnología de la información',
  'Information Technology / Semiconductors & Semiconductor Equipment': 'Tecnología de la información',
  /* Sin equivalencia a propósito: «Tecnología» a secas no es «Tecnología de la
     información», y un literal ambiguo no entra por parecido. Se conserva
     aunque su informe ya no esté en `data/uploads`: consta como decidido. */
  'Tecnología / Transporte y movilidad bajo demanda': null,
};

/**
 * Último segmento de la fila «Sede» → país.
 * `pais` es texto libre en la ficha, pero la forma la fija la casa igual que
 * el sector: sin equivalencia declarada, el campo va vacío.
 */
const PAISES = {
  'EE. UU.': 'Estados Unidos',
  'EE.UU.': 'Estados Unidos',
};

/** Búsqueda indiferente a mayúsculas y a espacios de más. */
const plegar = (v) => String(v).replace(/\s+/g, ' ').trim().toLowerCase();

function construirIndice(tabla) {
  const indice = new Map();
  for (const [literal, equivalente] of Object.entries(tabla)) indice.set(plegar(literal), equivalente);
  return indice;
}

const INDICE_SECTORES = construirIndice(SECTORES);
const INDICE_PAISES = construirIndice(PAISES);

/**
 * Resuelve un literal contra una tabla.
 * @returns {{declarado: boolean, valor: string|null}} `declarado` distingue el
 *   literal que nadie ha visto todavía del que consta sin equivalencia.
 */
function resolver(indice, literal) {
  const clave = plegar(literal ?? '');
  if (!clave || !indice.has(clave)) return { declarado: false, valor: null };
  return { declarado: true, valor: indice.get(clave) ?? null };
}

const sectorEquivalente = (literal) => resolver(INDICE_SECTORES, literal);
const paisEquivalente = (literal) => resolver(INDICE_PAISES, literal);

module.exports = { SECTORES, PAISES, sectorEquivalente, paisEquivalente };
