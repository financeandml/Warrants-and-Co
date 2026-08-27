/* ============================================================================
   Pantalla de carga.

   No es un adorno de espera: cubre el hueco entre «el documento existe» y «la
   primera vista está pintada», que es el tramo en el que la plataforma se ve
   armada pero vacía —cabecera puesta, secciones con sus títulos y ni un dato
   dentro—. Ese estado intermedio es indistinguible de una plataforma rota, y
   dura lo que tarden la marca, los vocabularios y la primera sección.

   Tres decisiones que conviene no deshacer:

     · SE MONTA DESDE JAVASCRIPT, no desde el documento. Si el módulo no llega a
       ejecutarse —error de red, script bloqueado—, no hay pantalla que retirar
       y el lector ve la plataforma directamente. Una capa escrita en el HTML
       tendría el fallo contrario: sin JavaScript se queda puesta y tapa todo.

     · NO LLEVA TEXTO TRADUCIBLE. Solo el sello y el nombre de la casa, que es
       nombre propio y por tanto no lleva `data-i18n`. Así la pantalla no depende
       del diccionario, que es justo una de las cosas que se están cargando
       debajo: un rótulo traducido aquí saldría en el idioma equivocado o en
       ninguno.

     · LÍMITE DE RESCATE, no duración. `cerrar()` lo llama quien termina de
       pintar; el temporizador de abajo existe solo para que un fallo en esa
       cadena no deje la capa puesta para siempre. Que salte es un síntoma, no
       el funcionamiento normal.

   Con movimiento reducido la pantalla sigue existiendo —el hueco que tapa es el
   mismo— pero sin barrido y sin desvanecido: aparece quieta y se retira de
   golpe, que es lo que pide la cláusula 5.
   ========================================================================= */

import { elemento } from './formato.js';
import { sinMovimiento } from './movimiento.js';

/* Cuánto se espera antes de dar por perdida la llamada a `cerrar()`. Generoso a
   propósito: quien cumple, cierra mucho antes y nunca lo alcanza. */
const RESCATE = 8000;

/* Lo que tarda el desvanecido, y por tanto lo que se espera para retirar el
   nodo. Ha de coincidir con `.carga--saliendo` en la hoja: son el mismo hecho
   escrito en dos sitios, así que si uno cambia, cambia el otro. */
const SALIDA = 420;

export function iniciarCarga() {
  // Sin `document.body` no hay dónde montar: puede ocurrir si alguien mueve el
  // módulo a la cabecera. Mejor no hacer nada que dejar la carga a medias.
  if (!document.body) return { cerrar() {} };

  const quieta = sinMovimiento();

  const capa = elemento('div', 'carga');
  capa.setAttribute('aria-hidden', 'true');
  const marca = elemento('div', 'carga__marca');

  const sello = elemento('img', 'carga__sello');
  sello.src = '/marca/logo-marca.svg';
  sello.alt = '';
  sello.width = 48;
  sello.height = 48;

  // Nombre propio: no se traduce y no lleva `data-i18n`.
  const nombre = elemento('p', 'carga__nombre', 'Warrants & Co.');

  const pista = elemento('div', 'carga__pista');
  if (!quieta) pista.appendChild(elemento('span', 'carga__barrido'));

  marca.append(sello, nombre, pista);
  capa.appendChild(marca);
  document.body.appendChild(capa);
  document.documentElement.dataset.cargando = 'true';

  let cerrada = false;
  let rescate = setTimeout(() => cerrar(), RESCATE);

  function retirar() {
    capa.remove();
    delete document.documentElement.dataset.cargando;
  }

  function cerrar() {
    if (cerrada) return;
    cerrada = true;
    clearTimeout(rescate);
    if (quieta) { retirar(); return; }
    capa.classList.add('carga--saliendo');
    setTimeout(retirar, SALIDA);
  }

  return { cerrar };
}
