/* Fija el tema elegido antes del primer pintado, evitando el destello de tema
   claro al recargar. Se carga de forma sincrona en la cabecera del documento,
   de modo que no requiere codigo en linea y la politica de seguridad puede
   seguir prohibiendo los scripts embebidos. */
(function () {
  try {
    var t = localStorage.getItem('warrants.tema');
    if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.tema = t;
  } catch (e) {
    /* almacenamiento no disponible: se sigue la preferencia del sistema */
  }
})();
