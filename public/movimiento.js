/* ============================================================================
   Movimiento de entrada: un solo mecanismo.

   ═══ Qué había antes ═══

   Dos mecanismos gemelos, `.aparicion` en `portada.js` y `.revelado` en
   `inicio.js`, con dos observadores, dos umbrales, dos desplazamientos, dos
   duraciones y dos escalonados. No convivían en paz: caían sobre LOS MISMOS
   CINCO NODOS —el rótulo del manifiesto, su entradilla y los tres pilares—,
   porque el documento les ponía `.aparicion` e `inicio.js` les añadía
   `.revelado` encima. Medido en pantalla: `.aparicion` no aparecía nunca sola.

   De ahí salían tres cosas que nadie veía:

     · EL ESCALONADO SE PELEABA, y ganaba el que no debía. `.manifiesto
       .aparicion` —dos clases— vencía a `.revelado` —una— en `transition-delay`,
       de modo que los retardos que calculaba `inicio.js` no llegaban a
       aplicarse. El nodo con `--retardo: 380ms` computaba 0,14 s, que es
       `--i: 2` × 70 ms. Los 380, los 90 y los 180 eran código muerto.

     · LA DURACIÓN salía del otro. `.revelado` va más abajo en la hoja, así que
       con igual especificidad ganaba: 700 ms y no los 620 de `.aparicion`. El
       efecto real era un híbrido que ninguno de los dos ficheros describía.

     · `MARGEN_REVELADO` NO GOBERNABA esos cinco nodos. Es la cifra que
       `portada.js` usa para decidir si las líneas del hero caben —«cuánto tiene
       que asomar el manifiesto para que se vea»—, y sobre los nodos compartidos
       mandaba el observador más laxo, el de `.aparicion`, con 40 px en vez de
       60. El hero respetaba un margen que no era el que se aplicaba.

   ═══ Qué se conserva, y por qué ═══

   La semántica de `.revelado`, entera, y NO la de `.aparicion`. La diferencia
   que lo decide está en movimiento reducido: `activarApariciones()` se limitaba
   a marcar el nodo visible, mientras `observarEntrada()` marca visible Y ejecuta
   la acción de entrada. Unificar en la otra dirección habría dejado a quien pide
   menos movimiento sin los contadores, sin la serie del pulso y sin las
   rotaciones: contenido ausente, no solo animación ausente.

   El ritmo que se ve hoy en el manifiesto se conserva tal cual —0, 140, 210,
   280 y 350 ms—, medido en pantalla antes de tocar nada. Cambiar el mecanismo no
   es excusa para cambiar de paso lo que ya estaba revisado.
   ========================================================================= */

/** ¿El sistema pide menos movimiento? Estaba escrito igual en dos ficheros. */
export const sinMovimiento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
 * Franja muerta inferior del observador. Lo que asome dentro de estos píxeles
 * finales NO llega a revelarse: aparecería una caja vacía, que es peor que el
 * hueco.
 *
 * Vive aquí y no en `inicio.js` porque no es solo asunto del observador: el hero
 * la necesita para decidir si sus dos líneas caben —`seguirEncuadreBanner()`, en
 * `portada.js`—. Son la misma cifra, «cuánto tiene que asomar el manifiesto para
 * que se vea», y ahora los dos la leen del mismo sitio de verdad y no solo de
 * nombre.
 */
export const MARGEN_REVELADO = 60;

const acciones = new WeakMap();
let observador = null;

/**
 * Observa un elemento y, al entrar en pantalla, lo marca visible y ejecuta su
 * acción. Deja de observarlo en cuanto lo ha hecho: nada se repite al subir y
 * bajar.
 *
 * Con movimiento reducido no se observa nada —se marca visible y se ejecuta la
 * acción de inmediato—, que es lo que mantiene el CONTENIDO en pantalla cuando
 * se retira el recorrido.
 */
export function observarEntrada(elemento, alEntrar) {
  if (sinMovimiento() || !('IntersectionObserver' in window)) {
    elemento.dataset.visible = 'true';
    alEntrar?.(elemento);
    return elemento;
  }
  if (!observador) {
    observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.dataset.visible = 'true';
          acciones.get(e.target)?.(e.target);
          observador.unobserve(e.target);
        }
      },
      { threshold: 0.18, rootMargin: `0px 0px -${MARGEN_REVELADO}px 0px` }
    );
  }
  if (alEntrar) acciones.set(elemento, alEntrar);
  observador.observe(elemento);
  return elemento;
}

/**
 * Marca un bloque para que entre con el desplazamiento discreto de la casa.
 *
 * El retardo se declara AQUÍ, en la llamada, y no en el documento con una
 * variable de orden: tener las dos vías fue exactamente lo que dejó una de ellas
 * sin efecto durante meses.
 */
export function revelar(nodo, retardo = 0) {
  nodo.classList.add('revelado');
  if (retardo) nodo.style.setProperty('--retardo', `${retardo}ms`);
  observarEntrada(nodo);
  return nodo;
}
