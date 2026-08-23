'use strict';

/* ============================================================================
   Catálogo de motivos de la extracción.

   Cada vez que la extracción deja un campo sin proponer, dice por qué con uno
   de estos códigos. Va escrito y enumerable a propósito, por la misma razón
   que `src/errores.js`: una prueba lo recorre y exige que todo código tenga
   rótulo en los dos diccionarios del cliente. Un motivo compuesto al vuelo no
   se podría comprobar, y quien mirase la pantalla vería una clave cruda.

   El texto castellano de aquí es la reserva —sirve a quien llame por `curl` y
   a los registros—; la interfaz rotula por código en el idioma de quien mira.

   ═══ Los cuatro estados de un campo ═══

   `propuesto`   hay valor y viene de un rótulo inequívoco. Llega al formulario
                 marcado como sin confirmar, con su página.
   `ambiguo`     el documento dice algo pero no una cifra utilizable: un rango,
                 un «pendiente de confirmar», un sector sin equivalencia. No hay
                 valor; se muestra el literal y la página para que el analista
                 teclee el suyo sabiendo de dónde sale.
   `referencia`  el dato existe en el documento pero no se copia: se indica
                 dónde está. Es el caso del resumen ejecutivo.
   `ausente`     no hay nada que proponer.

   Son la misma distinción de tres estados que exige CLAUDE.md —hay dato, el
   dato es cero, no hay dato— aplicada a una ficha: hay valor, hay texto pero
   no valor, y no hay nada.
   ========================================================================= */

const { CODIGOS_LECTURA } = require('./pdf');

/** Fallos de la propia petición, antes de llegar a leer nada. */
const MOTIVOS_PETICION = {
  DOCUMENTO_AUSENTE: 'No se ha recibido ningún documento que analizar.',
  FORMATO_NO_ANALIZABLE: 'Solo se extrae de documentos PDF.',
};

/** Motivos que afectan al documento entero. */
const MOTIVOS_DOCUMENTO = {
  ESQUELETO_NO_RECONOCIDO:
    'El documento no sigue el esqueleto de los informes de la casa: no se ha localizado ninguna de sus anclas.',
  ANCLA_FICHA_AUSENTE: 'No se ha encontrado el bloque «1. Ficha de Empresa».',
  ANCLA_PLAN_AUSENTE: 'No se ha encontrado el bloque «Plan de inversión».',
};

/** Motivos por los que un campo concreto no se propone. */
const MOTIVOS_CAMPO = {
  ETIQUETA_AUSENTE: 'El documento no trae ese rótulo.',
  FILA_PARTIDA: 'El rótulo aparece suelto y su valor no se puede leer con certeza.',
  SIN_CIFRA: 'El rótulo está, pero lo que lo acompaña no es una cifra.',
  RANGO: 'El documento da un rango y no una cifra única.',
  SIN_PORCENTAJE: 'El rótulo está, pero lo que lo acompaña no es un porcentaje único.',
  FECHA_NO_INTERPRETABLE: 'La fecha no viene en un formato reconocible.',
  FECHA_FUTURA: 'La fecha del informe es posterior a hoy.',
  TICKER_SIN_PATRON: 'El rótulo del ticker no contiene ningún símbolo con «$».',
  TICKER_DISCREPANTE: 'El documento nombra más de un ticker para la compañía analizada.',
  SECTOR_SIN_EQUIVALENCIA: 'El sector del documento no tiene equivalencia declarada.',
  PAIS_SIN_EQUIVALENCIA: 'La sede del documento no tiene equivalencia de país declarada.',
  DIVISA_NO_SOPORTADA: 'La divisa del documento no está entre las admitidas.',
  INCOHERENTE_CON_COMPRA: 'El nivel leído no es coherente con el precio de compra leído.',
  SIN_ETIQUETA_INEQUIVOCA:
    'Solo aparece en prosa condicional, sin un rótulo que lo fije. Este campo mueve la cartera y no se propone de oídas.',
  RECOMENDACION_NO_SE_INFIERE:
    'El documento declara el tipo de tesis, no una recomendación del vocabulario. Que una tesis sea larga no dice si es comprar, sobreponderar o mantener.',
  TIPO_INFORME_NO_FIGURA: 'El documento no dice de qué tipo de informe se trata.',
  SECCION_LOCALIZADA: 'La sección está en el documento; el texto de la ficha lo redacta el analista.',
  FUERA_DE_EXTRACCION: 'Este campo no se extrae del documento.',
};

const MOTIVOS = { ...MOTIVOS_DOCUMENTO, ...MOTIVOS_CAMPO };

/* Todo lo que la extracción puede llegar a decirle a quien mira la pantalla,
   en un solo catálogo: los fallos de lectura del PDF, los de la petición y los
   motivos por campo. La prueba de paridad de diccionarios lo recorre entero y
   exige rótulo en castellano y en inglés para cada código. */
const CODIGOS_EXTRACCION = { ...CODIGOS_LECTURA, ...MOTIVOS_PETICION, ...MOTIVOS };

/** Comprueba que un motivo existe antes de viajar en una respuesta. */
function motivo(codigo) {
  if (!MOTIVOS[codigo]) throw new Error(`Motivo de extracción desconocido: ${codigo}`);
  return codigo;
}

module.exports = { MOTIVOS, MOTIVOS_DOCUMENTO, MOTIVOS_CAMPO, MOTIVOS_PETICION, CODIGOS_EXTRACCION, motivo };
