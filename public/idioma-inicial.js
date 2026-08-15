/* Fija el idioma antes del primer pintado, igual que `tema-inicial.js` hace con
   el tema. Se carga de forma sincrona en la cabecera del documento, de modo que
   no requiere codigo en linea y la politica de seguridad puede seguir
   prohibiendo los scripts embebidos.

   Hace dos cosas y ninguna mas:

     1. Resuelve el idioma efectivo —el elegido, el del navegador o el de
        reserva— y lo escribe en `lang` y en `dataset.idioma`.

     2. Si ese idioma NO es aquel en el que esta escrito el documento, marca
        `data-i18n-pendiente`. Una regla de estilo oculta el cuerpo mientras la
        marca este puesta, y la pasada de traduccion la retira. Asi quien navega
        en el idioma base no espera nada, y quien navega en el otro ve un
        instante en blanco en lugar de un destello en el idioma equivocado.

   Los diccionarios no se cargan aqui: son modulos y llegan despues. */
(function () {
  var CLAVE = 'warrants.idioma';
  var ADMITIDOS = ['es', 'en'];
  /* Idioma en el que esta escrito `index.html`. Si algun dia se reescribe el
     documento en otro idioma, basta con cambiar esta constante. */
  var BASE = 'es';
  var RESERVA = 'es';

  function elegido() {
    try {
      var v = localStorage.getItem(CLAVE);
      return ADMITIDOS.indexOf(v) !== -1 ? v : null;
    } catch (e) {
      return null; /* almacenamiento no disponible */
    }
  }

  function delNavegador() {
    var lista = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    for (var i = 0; i < lista.length; i++) {
      /* `es-419`, `en-GB` y demas variantes cuentan por su raiz. */
      var raiz = String(lista[i]).toLowerCase().split('-')[0];
      if (ADMITIDOS.indexOf(raiz) !== -1) return raiz;
    }
    return null;
  }

  var idioma = elegido() || delNavegador() || RESERVA;

  var raiz = document.documentElement;
  raiz.lang = idioma;
  raiz.dataset.idioma = idioma;
  if (idioma !== BASE) raiz.dataset.i18nPendiente = '';
})();
