/* ============================================================================
   Cursor personalizado.

   Dos piezas: un punto que va exactamente donde está el puntero y un halo que
   lo persigue con retraso. El punto es la posición —ha de ser exacto o el
   cursor miente sobre dónde se va a pulsar—; el halo es el único que interpreta
   algo: se ensancha sobre lo pulsable.

   ═══ Las tres cosas que lo acotan ═══

   · SOLO CON PUNTERO FINO. `(pointer: fine)` en la consulta y también aquí, en
     el guardián: en táctil no hay puntero que sustituir, y un punto pegado al
     último toque sería un residuo en pantalla. La consulta sola no bastaría
     —los oyentes seguirían corriendo y el nodo existiendo—, y el guardián solo
     tampoco —`cursor: none` seguiría aplicándose—. Hacen falta los dos.

   · NO SUSTITUYE NUNCA AL FOCO DE TECLADO. Este módulo no toca `outline` ni
     `:focus-visible` ni ninguna regla de foco, y no debe empezar a hacerlo: el
     cursor dice dónde está el ratón, el foco dice dónde está el teclado, y son
     dos lectores distintos. `tests/paleta.js` lo afirma con la pantalla ya
     tomada por el cursor, porque el modo en que esto se rompería —apagar el
     contorno «que ya lo dice el cursor»— se ve perfectamente bien con ratón.

   · CON MOVIMIENTO REDUCIDO, NO EXISTE. El halo es persecución continua, que es
     exactamente lo que la cláusula 5 retira. Y no se degrada a «punto sin
     halo»: sin la persecución no aporta nada que el cursor del sistema no diga
     ya mejor.

   Sobre los campos de texto el cursor propio se aparta y vuelve el del sistema:
   la barra de inserción dice dónde caerá la letra, y un punto no. La hoja lo
   acompaña devolviéndoles `cursor: auto`.
   ========================================================================= */

import { sinMovimiento } from './movimiento.js';

/* Cuánto del camino pendiente recorre el halo en cada fotograma. Más alto, más
   pegado al punto —y menos halo—; más bajo, más rezagado. */
const SEGUIMIENTO = 0.18;

/* Lo que el halo considera pulsable. Es la misma familia que ya declara
   `cursor: pointer` en la hoja, dicha en una sola línea. */
const PULSABLE = 'a[href], button, [role="button"], summary, label, select, ' +
  '[tabindex]:not([tabindex="-1"]), .tabla-informes tbody tr, .tabla-opciones tbody tr';

/* Donde manda la barra de inserción y no un punto. */
const ESCRITURA = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"])' +
  ':not([type="file"]), textarea, [contenteditable="true"]';

export function iniciarCursor() {
  if (sinMovimiento()) return;
  if (!window.matchMedia?.('(pointer: fine)').matches) return;

  const punto = document.createElement('span');
  punto.className = 'cursor__punto';
  punto.setAttribute('aria-hidden', 'true');
  const halo = document.createElement('span');
  halo.className = 'cursor__halo';
  halo.setAttribute('aria-hidden', 'true');
  document.body.append(halo, punto);
  document.documentElement.dataset.cursor = 'propio';

  // Hasta el primer movimiento no hay posición que mostrar: nacer en el (0,0)
  // pondría las dos piezas en la esquina superior izquierda, donde nadie ha
  // puesto el ratón.
  let x = 0, y = 0, hx = 0, hy = 0, estrenado = false, animando = false;

  const fotograma = () => {
    hx += (x - hx) * SEGUIMIENTO;
    hy += (y - hy) * SEGUIMIENTO;
    halo.style.transform = `translate3d(${hx}px, ${hy}px, 0) translate(-50%, -50%)`;
    // Se detiene al alcanzar el punto: un bucle perpetuo mantendría despierto el
    // compositor con el ratón quieto.
    if (Math.abs(x - hx) > 0.2 || Math.abs(y - hy) > 0.2) {
      requestAnimationFrame(fotograma);
    } else {
      animando = false;
    }
  };

  const arrancar = () => {
    if (animando) return;
    animando = true;
    requestAnimationFrame(fotograma);
  };

  document.addEventListener('pointermove', (ev) => {
    // Solo el ratón y el lápiz: un dedo genera `pointermove` y no ha de mover
    // nada.
    if (ev.pointerType === 'touch') return;
    x = ev.clientX; y = ev.clientY;
    if (!estrenado) {
      estrenado = true;
      hx = x; hy = y;
      document.documentElement.dataset.cursorVisible = 'true';
    }
    punto.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    arrancar();

    const bajo = ev.target instanceof Element ? ev.target : null;
    const escribe = Boolean(bajo?.closest(ESCRITURA));
    // Sobre un campo de texto el cursor propio se retira entero: la hoja
    // devuelve ahí el del sistema, y dos cursores a la vez serían uno de más.
    document.documentElement.dataset.cursorVisible = escribe ? 'false' : 'true';
    halo.dataset.sobrePulsable = String(Boolean(bajo?.closest(PULSABLE)) && !escribe);
  }, { passive: true });

  // Fuera de la ventana no hay puntero que representar. `pointerdown` y `up`
  // acusan la pulsación: el halo se encoge bajo el dedo, igual que el
  // hundimiento de los controles.
  document.addEventListener('pointerleave', () => {
    document.documentElement.dataset.cursorVisible = 'false';
  });
  document.addEventListener('pointerdown', () => { halo.dataset.pulsando = 'true'; });
  document.addEventListener('pointerup', () => { halo.dataset.pulsando = 'false'; });

  // El teclado tiene su propio indicador —el foco— y no comparte pantalla con
  // el del ratón: al tabular, el cursor propio se aparta hasta que el ratón
  // vuelva a moverse. No se toca el contorno de foco; solo se quita de en medio
  // lo que no le corresponde.
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab') return;
    document.documentElement.dataset.cursorVisible = 'false';
  });
}
