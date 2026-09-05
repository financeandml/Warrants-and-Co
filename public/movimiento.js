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

/**
 * Efecto imán: un botón se deja atraer un poco por el cursor dentro de un
 * radio, y vuelve a su sitio con rebote de muelle real al soltarlo.
 *
 * Escucha en el CONTENEDOR, no en cada botón — el imán tira ANTES de que el
 * cursor lo toque, que es lo que distingue un imán de un hover corriente. El
 * desplazamiento no se escribe en `style.transform` directamente: se calcula
 * en JS (distancia del cursor al centro, acotada a `maximo` px) y se publica
 * en dos variables propias del botón, `--tx`/`--ty`, con `setProperty()` — el
 * propio `transform: translate(var(--tx,0px), var(--ty,0px))` vive en
 * `estilos.css`, no aquí. Es la misma variable la que lee y escribe el MISMO
 * elemento, nunca un padre calculando el `transform` de un hijo (esa práctica
 * sí dispara un recálculo de estilo en cascada; esta no).
 *
 * Sin transición mientras seguimos al cursor —seguirlo con un retardo de
 * transición lo haría sentir pastoso— y una transición con rebote SOLO al
 * soltar, que es el único momento con "gesto que termina" (Cláusula de
 * interrupción del skill de animación): `--mov-resorte`, un `linear()` que
 * muestrea un oscilador amortiguado real, la misma curva que ya usa la
 * tarjeta de la Vitrina — ningún cubic-bezier ni curva nueva. Nunca por
 * debajo de `hover:hover and pointer:fine` ni con movimiento reducido: en
 * táctil no hay "acercarse" y con movimiento reducido el gesto físico es
 * justo lo que se retira.
 */
export function activarImantados(contenedorSelector, botonSelector, { radio = 80, fuerza = 0.34, maximo = 9 } = {}) {
  if (sinMovimiento() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const contenedor = document.querySelector(contenedorSelector);
  if (!contenedor) return;

  const acotar = (v, lim) => Math.max(-lim, Math.min(lim, v));

  const soltar = (boton) => {
    boton.dataset.imantado = 'false';
    // Dos propiedades, la misma curva de muelle: `box-shadow` va aquí y no
    // solo en la hoja de estilos porque este `transition` inline —puesto para
    // que el ARRASTRE no transicione— reemplaza entero al de la hoja mientras
    // dura, y una lista de una sola propiedad habría dejado la sombra sin
    // transición propia al soltar.
    boton.style.transition = 'transform 320ms var(--mov-resorte), box-shadow 320ms var(--mov-resorte)';
    boton.style.setProperty('--tx', '0px');
    boton.style.setProperty('--ty', '0px');
  };

  contenedor.addEventListener('pointermove', (ev) => {
    for (const boton of contenedor.querySelectorAll(botonSelector)) {
      const r = boton.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = ev.clientX - cx, dy = ev.clientY - cy;
      const distancia = Math.hypot(dx, dy);
      if (distancia > radio) {
        if (boton.dataset.imantado === 'true') soltar(boton);
        continue;
      }
      boton.dataset.imantado = 'true';
      boton.style.transition = 'none';
      boton.style.setProperty('--tx', `${acotar(dx * fuerza, maximo)}px`);
      boton.style.setProperty('--ty', `${acotar(dy * fuerza, maximo)}px`);
    }
  });

  contenedor.addEventListener('pointerleave', () => {
    for (const boton of contenedor.querySelectorAll(botonSelector)) soltar(boton);
  });
}
