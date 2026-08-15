/* ============================================================================
   Registro de idiomas.

   Este es el UNICO fichero que hay que tocar para incorporar un idioma nuevo:
   se importa su diccionario y se anade una entrada. Ni el motor, ni el
   documento, ni ninguna vista necesitan cambio alguno.
   ========================================================================= */

import es from './es.js';
import en from './en.js';

export const IDIOMAS = [
  { clave: 'es', nombre: 'Español', rotulo: 'ES', locale: 'es-ES', diccionario: es },
  { clave: 'en', nombre: 'English', rotulo: 'EN', locale: 'en-US', diccionario: en },
];

/** Idioma en el que esta escrito `index.html`; sirve de reserva de ultimo recurso. */
export const BASE = 'es';

export const CLAVES = IDIOMAS.map((i) => i.clave);

export function definicion(clave) {
  return IDIOMAS.find((i) => i.clave === clave) ?? IDIOMAS.find((i) => i.clave === BASE);
}
