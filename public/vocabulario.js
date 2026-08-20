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

/* Los tipos de evento de la agenda. El código es el valor del filtro y viaja al
   servidor; lo que se traduce es el rótulo. «M&A» se queda como está: es término
   de oficio en los dos idiomas, no una sigla inglesa sin traducir. */
const CLAVES_TIPO_EVENTO = {
  'OPTIONS EXPIRY': 'evento.tipo.vencimiento',
  RESEARCH: 'evento.tipo.analisis',
  PRESS: 'evento.tipo.prensa',
  EARNINGS: 'evento.tipo.resultados',
  GUIDANCE: 'evento.tipo.previsiones',
  'INVESTOR DAY': 'evento.tipo.diaInversor',
  'M&A': 'evento.tipo.corporativa',
  PRODUCT: 'evento.tipo.producto',
  REGULATORY: 'evento.tipo.regulacion',
};

/* Las cuatro prioridades. El código sigue en `dataset.prioridad`, que es de
   donde cuelga el color: aquí solo se decide lo que se lee. */
const CLAVES_PRIORIDAD = {
  HIGH: 'evento.prioridad.alta',
  MEDIUM: 'evento.prioridad.media',
  LOW: 'evento.prioridad.baja',
  UNKNOWN: 'evento.prioridad.desconocida',
};

/* Calidad de la fecha y clase de vínculo. Hoy el servidor solo emite un valor de
   cada uno, y aun así van en tabla: escritos en castellano dentro del servidor,
   se colaban tal cual en la interfaz inglesa. */
const CLAVES_CALIDAD_FECHA = { EXACTA: 'evento.fecha.exacta' };
const CLAVES_VINCULACION = { 'MENCIÓN LITERAL': 'evento.vinculo.mencionLiteral' };

const rotular = (tabla) => (codigo) => {
  const clave = tabla[String(codigo ?? '').toUpperCase()];
  return clave ? t(clave) : String(codigo ?? '');
};

/** Rótulo de un tipo de evento. Un código sin traducir se enseña tal cual. */
export const etiquetaTipoEvento = rotular(CLAVES_TIPO_EVENTO);

/** Rótulo de una prioridad. */
export const etiquetaPrioridad = rotular(CLAVES_PRIORIDAD);

/** Rótulo de la calidad de la fecha de un evento. */
export const etiquetaCalidadFecha = rotular(CLAVES_CALIDAD_FECHA);

/** Rótulo de la clase de vínculo entre un evento y una compañía. */
export const etiquetaVinculacion = rotular(CLAVES_VINCULACION);
