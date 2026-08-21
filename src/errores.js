'use strict';

/* ============================================================================
   Catálogo de errores de la API.

   Cada error que la plataforma puede devolver figura aquí con su código, su
   estado HTTP y su mensaje. El código es lo que consume la interfaz para
   rotularlo en el idioma de quien mira; el mensaje es el del propio API, y se
   queda en castellano a propósito: sirve a quien llama por `curl` y a los
   registros, que no tienen idioma de usuario.

   **Va escrito y enumerable a propósito.** Una prueba recorre este catálogo y
   comprueba que todo código tiene rótulo en los dos diccionarios del cliente.
   Un código compuesto al vuelo no se podría comprobar, que es la misma razón
   por la que existen `CLAVES_ACCESO` y `public/vocabulario.js`.
   ========================================================================= */

/* ── Pendiente · E1b ──────────────────────────────────────────────────────
   Estos once códigos existen y no los consume nadie todavía. Las rutas siguen
   redactando su error a pelo —`res.status(404).json({ error: '…' })`, una
   veintena de sitios entre `routes/informes.js`, `routes/noticias.js`,
   `routes/mercado.js` y `routes/opciones.js`— y sin código el cliente no puede
   rotularlos: caen a la frase castellana del servidor.

   E1b consiste en pasar esas rutas por `cuerpoError()`, propagar el `codigo` en
   el manejador de `server.js` y declarar los once rótulos como `codigo.…` en
   los diccionarios. `rotuloError()` en `app.js` ya los resolverá sin cambio
   alguno; hasta entonces, la reserva es una frase útil y nunca una clave cruda.

   `tests/errores.js` los enumera como pendientes en cada pasada. Al declarar
   sus rótulos dejan de ser aviso y pasan a exigirse como los de validación.
   ──────────────────────────────────────────────────────────────────────── */

/** Errores de petición: uno por respuesta. */
const API = {
  LIMITE_PETICIONES: {
    status: 429,
    mensaje: 'Se ha superado el límite de peticiones. Reintente en unos instantes.',
  },
  CREDENCIAL_INVALIDA: { status: 401, mensaje: 'Credencial de analista no válida.' },
  RECURSO_NO_ENCONTRADO: { status: 404, mensaje: 'Recurso de API no encontrado.' },
  CUERPO_NO_JSON: { status: 400, mensaje: 'El cuerpo de la petición no es JSON válido.' },
  VALIDACION: { status: 422, mensaje: 'Los datos remitidos no superan la validación' },
  DOCUMENTO_DEMASIADO_GRANDE: {
    status: 413,
    mensaje: 'Cada documento supera el tamaño máximo admitido.',
  },
  DEMASIADOS_DOCUMENTOS: {
    status: 413,
    mensaje: 'Se ha excedido el número máximo de documentos por informe.',
  },
  CAMPO_FICHERO_INESPERADO: { status: 413, mensaje: 'Campo de fichero no esperado.' },
  DOCUMENTOS_NO_PROCESABLES: {
    status: 413,
    mensaje: 'No ha sido posible procesar los documentos.',
  },
  ERROR_INTERNO: { status: 500, mensaje: 'Se ha producido un error interno en el servidor.' },
  /* Para lo que falla fuera de casa. El texto ajeno —el de un proveedor caído o
     el de una excepción inesperada— viaja aparte, en `detalle`, y NO se traduce:
     es diagnóstico, no un mensaje para quien lee la plataforma. */
  PROVEEDOR_NO_RESPONDE: {
    status: 502,
    mensaje: 'Un proveedor externo no ha respondido.',
  },
};

/* Errores de validación: van por campo, y pueden acumularse varios en una misma
   respuesta. Cada uno es una frase entera —nada de `El ${campo} debe…`—, porque
   el orden de una frase es cosa de cada idioma y no del código que la arma. */
const VALIDACION = {
  EMPRESA_OBLIGATORIA: 'La denominación social es obligatoria',
  TICKER_FORMATO: 'Formato de ticker no válido',
  TICKER_REQUERIDO_EN_CARTERA: 'Una tesis incorporada a cartera requiere ticker de cotización',
  FECHA_FORMATO: 'La fecha debe seguir el formato AAAA-MM-DD',
  FECHA_FUTURA: 'La fecha de publicación no puede ser futura',
  TIPO_INFORME_NO_RECONOCIDO: 'Tipo de informe no reconocido',
  RECOMENDACION_NO_RECONOCIDA: 'Recomendación no reconocida',
  NIVEL_ACCESO_NO_RECONOCIDO: 'Nivel de acceso no reconocido',
  DIVISA_NO_SOPORTADA: 'Divisa no soportada',
  PRECIO_OBJETIVO_NO_NUMERICO: 'El precio objetivo debe ser numérico',
  PRECIO_OBJETIVO_FUERA_RANGO: 'El precio objetivo está fuera de rango',
  PESO_NO_NUMERICO: 'El peso debe ser numérico',
  PESO_FUERA_RANGO: 'El peso debe expresarse entre 0 y 100',
  PRECIO_COMPRA_NO_NUMERICO: 'El precio de compra debe ser numérico',
  PRECIO_COMPRA_FUERA_RANGO: 'El precio de compra está fuera de rango',
  TAKE_PROFIT_NO_NUMERICO: 'El take profit debe ser numérico',
  TAKE_PROFIT_FUERA_RANGO: 'El take profit está fuera de rango',
  STOP_LOSS_NO_NUMERICO: 'El stop loss debe ser numérico',
  STOP_LOSS_FUERA_RANGO: 'El stop loss está fuera de rango',
  TAKE_PROFIT_BAJO_COMPRA: 'El take profit debe situarse por encima del precio de compra',
  STOP_LOSS_SOBRE_COMPRA: 'El stop loss debe situarse por debajo del precio de compra',
  TITULAR_OBLIGATORIO: 'El titular es obligatorio',
  URL_NO_VALIDA: 'El enlace debe ser una dirección http o https válida',
  CATEGORIA_NO_RECONOCIDA: 'Categoría no reconocida',
  RELEVANCIA_NO_RECONOCIDA: 'Nivel de relevancia no reconocido',
};

/**
 * Construye un error de API a partir de su código.
 *
 * @param {string} codigo        clave de `API`
 * @param {object} [opciones]
 * @param {object} [opciones.datos]    parámetros de la plantilla del cliente
 * @param {string} [opciones.detalle]  texto ajeno, sin traducir, para diagnóstico
 */
function fallo(codigo, { datos = null, detalle = null } = {}) {
  const def = API[codigo];
  if (!def) throw new Error(`Código de error desconocido: ${codigo}`);
  const err = new Error(def.mensaje);
  err.status = def.status;
  err.codigo = codigo;
  if (datos) err.datos = datos;
  if (detalle) err.detalle = detalle;
  return err;
}

/** Cuerpo JSON de una respuesta de error, con el código siempre presente. */
function cuerpoError(codigo, { datos = null, detalle = null, errores = null } = {}) {
  const def = API[codigo];
  const cuerpo = { error: def?.mensaje ?? 'Error', codigo };
  if (datos) cuerpo.datos = datos;
  if (detalle) cuerpo.detalle = detalle;
  if (errores) cuerpo.errores = errores;
  return cuerpo;
}

module.exports = { API, VALIDACION, fallo, cuerpoError };
