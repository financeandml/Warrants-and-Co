/* ============================================================================
   Navegación principal por áreas.

   El mapa declara la estructura completa de la plataforma, incluidas las páginas
   todavía no implementadas: aparecen rotuladas como próximas en lugar de
   ocultarse, de modo que el alcance del producto queda a la vista. Activar una
   consiste en darle `ruta`; el resto del cliente no necesita cambios.
   ========================================================================= */

import { $, elemento } from './formato.js';
import { t } from './i18n.js';

/**
 * Estructura de la plataforma.
 *
 * Los rótulos son claves de diccionario, no texto: el menú habla el idioma de
 * la interfaz. Lo que no se traduce nunca es la estructura —`clave`, `ruta` y
 * `hash`—, que es lo que el resto del cliente usa para enrutar.
 *
 * Nota: `descripcion` está declarada pero hoy no se pinta en ninguna parte. Se
 * mantiene traducida para que el mapa sea coherente el día que se muestre.
 *
 * `oculta` retira un área de la interfaz SIN borrarla del mapa: desaparece del
 * menú y sus rutas dejan de admitirse, pero el alcance del producto se sigue
 * declarando aquí. Es un solo campo porque el menú que no la anuncia y la
 * puerta que no la deja pasar son EL MISMO HECHO: `rutasVisibles()` es la única
 * fuente de la que salen los dos, y `tests/areas.js` afirma que concuerdan.
 * Volver a abrir un área es borrar la palabra `oculta` y nada más.
 */
export const AREAS = [
  {
    clave: 'market',
    titulo: 'nav.market',
    oculta: true,
    entradas: [
      { titulo: 'nav.market.radar', ruta: 'radar', descripcion: 'nav.market.radar.desc' },
      { titulo: 'nav.market.mercados', ruta: 'mercado', descripcion: 'nav.market.mercados.desc' },
      { titulo: 'nav.market.institucional', pendiente: true },
    ],
  },
  {
    // Antes un solo área junto con Compañías y Catalizadores. Se parte en dos
    // el día que esas dos se ocultan: `oculta` se aplica al área entera, y
    // Repositorio/Noticias no se iban a ocultar con ellas.
    clave: 'research',
    titulo: 'nav.research',
    entradas: [
      { titulo: 'nav.research.tesis', ruta: 'repositorio', descripcion: 'nav.research.tesis.desc' },
      { titulo: 'nav.research.noticias', ruta: 'noticias', descripcion: 'nav.research.noticias.desc' },
    ],
  },
  {
    clave: 'research-companias',
    titulo: 'nav.research',
    oculta: true,
    entradas: [
      { titulo: 'nav.research.companias', ruta: 'companias', descripcion: 'nav.research.companias.desc' },
      { titulo: 'nav.research.catalizadores', ruta: 'catalizadores', descripcion: 'nav.research.catalizadores.desc' },
    ],
  },
  {
    clave: 'options',
    titulo: 'nav.options',
    oculta: true,
    entradas: [
      { titulo: 'nav.options.flujo', ruta: 'opciones', descripcion: 'nav.options.flujo.desc' },
      { titulo: 'nav.options.inusual', ruta: 'opciones', hash: 'inusual', descripcion: 'nav.options.inusual.desc' },
      { titulo: 'nav.options.cadena', ruta: 'opciones', hash: 'cadena', descripcion: 'nav.options.cadena.desc' },
    ],
  },
  {
    clave: 'portfolio',
    titulo: 'nav.portfolio',
    entradas: [
      { titulo: 'nav.portfolio.cartera', ruta: 'cartera', descripcion: 'nav.portfolio.cartera.desc' },
      { titulo: 'nav.portfolio.rendimiento', pendiente: true },
      { titulo: 'nav.portfolio.seguimiento', pendiente: true },
    ],
  },
];

/**
 * Rutas que la interfaz admite hoy: las de las áreas no ocultas.
 *
 * De aquí sale el conjunto de secciones del enrutador. No es una lista aparte
 * que haya que mantener en paralelo con el menú —eso las dejaría discrepar sin
 * que se notase en pantalla—, sino la MISMA lectura de `AREAS` que construye el
 * menú. Una entrada `pendiente` no tiene `ruta` y por eso no entra: anunciarse
 * como próxima y no ser navegable también es un solo hecho.
 */
export function rutasVisibles() {
  return AREAS.filter((a) => !a.oculta)
    .flatMap((a) => a.entradas.map((e) => e.ruta).filter(Boolean));
}

/** Área a la que pertenece una sección, para marcarla como activa. */
export function areaDeSeccion(seccion) {
  return AREAS.find((a) => a.entradas.some((e) => e.ruta === seccion))?.clave ?? null;
}

const FLECHA = 'M1 1.5 4 4.5 7 1.5';

function cerrarTodos(salvo = null) {
  for (const grupo of document.querySelectorAll('.nav-grupo')) {
    if (grupo === salvo) continue;
    grupo.dataset.abierto = 'false';
    grupo.querySelector('.nav-grupo__disparador')?.setAttribute('aria-expanded', 'false');
    // El panel debe retirarse del flujo, no solo marcarse como cerrado.
    const panel = grupo.querySelector('.nav-grupo__panel');
    if (panel) panel.hidden = true;
  }
}

/**
 * Construye la navegación.
 * @param {(seccion: string) => void} alNavegar
 * @param {(titulo: string) => void} alPendiente
 */
export function construirNavegacion(alNavegar, alPendiente) {
  const nav = $('#navegacion');
  if (!nav) return;
  nav.textContent = '';

  for (const area of AREAS) {
    // Un área oculta no se anuncia. Sigue en el mapa —y en `areaDeSeccion()`—
    // porque el mapa declara el alcance del producto, no lo que hay abierto.
    if (area.oculta) continue;

    const grupo = elemento('div', 'nav-grupo');
    grupo.dataset.area = area.clave;
    grupo.dataset.abierto = 'false';

    const disparador = elemento('button', 'nav-grupo__disparador', t(area.titulo));
    disparador.type = 'button';
    disparador.setAttribute('aria-expanded', 'false');
    disparador.setAttribute('aria-haspopup', 'true');

    const flecha = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    flecha.setAttribute('class', 'nav-grupo__flecha');
    flecha.setAttribute('viewBox', '0 0 8 6');
    flecha.setAttribute('aria-hidden', 'true');
    const trazo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trazo.setAttribute('d', FLECHA);
    trazo.setAttribute('fill', 'none');
    trazo.setAttribute('stroke', 'currentColor');
    trazo.setAttribute('stroke-width', '1.4');
    flecha.appendChild(trazo);
    disparador.appendChild(flecha);
    grupo.appendChild(disparador);

    const panel = elemento('div', 'nav-grupo__panel');
    panel.hidden = true;

    for (const entrada of area.entradas) {
      const disponible = Boolean(entrada.ruta);
      const enlace = elemento(disponible ? 'a' : 'button',
        `nav-enlace${disponible ? '' : ' nav-enlace--pendiente'}`);

      if (disponible) {
        enlace.href = `#/${entrada.ruta}`;
        enlace.dataset.seccion = entrada.ruta;
        if (entrada.hash) enlace.dataset.pestana = entrada.hash;
        enlace.appendChild(document.createTextNode(t(entrada.titulo)));
        enlace.addEventListener('click', (ev) => {
          ev.preventDefault();
          cerrarTodos();
          alNavegar?.(entrada.ruta, entrada.hash ?? null);
        });
      } else {
        enlace.type = 'button';
        enlace.appendChild(document.createTextNode(t(entrada.titulo)));
        enlace.appendChild(elemento('span', 'nav-enlace__marca', t('nav.pronto')));
        enlace.addEventListener('click', () => {
          cerrarTodos();
          // Se pasa el rótulo ya traducido: el aviso lo muestra tal cual.
          alPendiente?.(t(entrada.titulo));
        });
      }
      panel.appendChild(enlace);
    }

    grupo.appendChild(panel);

    disparador.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const abierto = grupo.dataset.abierto === 'true';
      cerrarTodos(grupo);
      grupo.dataset.abierto = String(!abierto);
      panel.hidden = abierto;
      disparador.setAttribute('aria-expanded', String(!abierto));
    });

    nav.appendChild(grupo);
  }

  // Un clic fuera o la tecla de escape cierran cualquier panel abierto.
  // Solo se enlazan una vez: reconstruir el menú no debe duplicar oyentes.
  if (!nav.dataset.oyentes) {
    document.addEventListener('click', () => cerrarTodos());
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') cerrarTodos();
    });
    nav.dataset.oyentes = 'true';
  }
}

/** Marca el área y la entrada correspondientes a la sección visible. */
export function marcarSeccionActiva(seccion, pestana = null) {
  const area = areaDeSeccion(seccion);
  for (const grupo of document.querySelectorAll('.nav-grupo')) {
    grupo.dataset.activo = String(grupo.dataset.area === area);
  }
  for (const enlace of document.querySelectorAll('.nav-enlace[data-seccion]')) {
    const coincide = enlace.dataset.seccion === seccion &&
      (!enlace.dataset.pestana || enlace.dataset.pestana === pestana);
    if (coincide) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
}
