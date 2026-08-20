/* ============================================================================
   Vocabulario cerrado de la interfaz.

   Códigos que emite el servidor y que la pantalla rotula. Viven aquí, y no en
   `formato.js`, porque traducirlos exige `i18n.js` y `i18n.js` ya importa
   `formato.js` para fijar el locale: meter `t()` allí cerraría un ciclo. Este
   módulo solo depende de `i18n.js`, de modo que compañías, mercado y opciones
   pueden compartirlo sin que ninguno importe a otro.

   Las claves van escritas y no compuestas al vuelo —nada de `sello.${codigo}`—
   para que queden a la vista de quien lea el fichero y de la prueba de paridad,
   que no sabe leer una clave que se arma en tiempo de ejecución. Es la misma
   pauta de `CLAVES_ACCESO`, y por la misma razón.
   ========================================================================= */

import { t } from './i18n.js';

/* Los seis grados de calidad del dato. El código es estable y viaja en la clase
   CSS; lo que se traduce es el rótulo. */
const CLAVES_SELLO = {
  REAL_TIME: 'sello.tiempoReal',
  DELAYED: 'sello.retrasado',
  HISTORICAL: 'sello.historico',
  CALCULATED: 'sello.calculado',
  INFERRED: 'sello.inferido',
  UNAVAILABLE: 'sello.noDisponible',
};

/**
 * Rótulo visible de un sello de calidad.
 *
 * Un código que no figure en la tabla se rotula tal cual: vale más un código a
 * la vista, que delata que falta traducirlo, que una etiqueta inventada.
 */
export function etiquetaSello(calidad) {
  const codigo = String(calidad ?? 'UNAVAILABLE').toUpperCase();
  return CLAVES_SELLO[codigo] ? t(CLAVES_SELLO[codigo]) : codigo;
}

/** Clase del sello. Sigue al código, no al idioma: el atenuado es información. */
export const claseSello = (calidad) =>
  `sello sello--${String(calidad ?? 'UNAVAILABLE').toLowerCase()}`;
