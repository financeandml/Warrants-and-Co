/* ============================================================================
   Composición de la cartera: el anillo.

   ── QUÉ AFIRMA UN ANILLO ──
   Que sus partes son el todo. Esa es la razón de que la CAJA sea un sector más y
   no un dato aparte: hoy el 60 % del patrimonio está sin invertir, y un anillo
   que repartiera solo las posiciones vivas diría que la cartera está invertida
   al 100 %. Es el mismo fallo que se quitó del motor, dibujado.

   De ahí sale la regla dura de este módulo: **sin el peso de la caja no se
   dibuja nada**. No se deduce por diferencia —eso sería inferir un dato y
   presentarlo como hecho—, no se pinta el resto solo, y no se deja el hueco sin
   explicar: se declara la carencia con su motivo.

   ── SOBRE QUÉ TOTAL ──
   Sobre el PATRIMONIO, y lo dice el subtítulo. Conviven dos pesos en esta
   sección y hay que declarar cuál se usa:

     · `pesoVigente` / `liquidez.pesoActual` — qué parte de lo que hay HOY es
       cada cosa. Se mueve con el mercado y con las liquidaciones.
     · `peso` / `liquidez.pesoCapital` — cómo se repartió el dinero al dar de
       alta cada tesis. Es una decisión histórica y no se mueve.

   Se usa el primero por tres razones. Es el que responde a «composición
   actual»; es el que ya enseña la columna «Peso» de la tabla, de modo que no
   aparecen dos pesos distintos de ORCL en la misma pantalla; y bajo el corte por
   capital el 40 % de la caja NO es lo que hay en la caja —es el capital de los
   tramos liquidados—, así que un anillo rotulado «composición actual» con esa
   cifra se equivocaría sobre la cosa que nombra.

   Ninguna cifra se calcula aquí. Los sectores salen de `pesoVigente` y de
   `liquidez.pesoActual` tal cual llegan del motor: recalcularlos desde
   `valorTramo` sería una segunda fuente del mismo hecho.

   ── LOS TRES ESTADOS DE LA CAJA ──
     · hay dato          → arco con su etiqueta;
     · hay dato y es CERO → sin arco, porque 0° es invisible, pero CON etiqueta:
       «invertido al 100 %» se afirma, no se deduce de una ausencia;
     · no hay dato       → no se dibuja el anillo.

   ── EL COLOR NO INFORMA SOLO ──
   Los sectores se separan por tono de gris Y por etiqueta directa, cada una
   unida a su arco con una línea guía. La caja lleva además TRAMA diagonal: no es
   una inversión, y la trama la distingue por naturaleza en vez de por
   intensidad. Quien no vea el gris lee el rótulo; quien no vea ninguno de los
   dos tiene la descripción alternativa, que enumera los sectores con su peso.
   ========================================================================= */

import { elemento, porcentaje } from './formato.js';
import { t } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';

/* Geometría del dibujo, en unidades de `viewBox`.

   El anillo mide 140 px y NO escala con el ancho de la tarjeta. Escalaba, y a
   1440 px salía un disco de 478 px de diámetro: un gráfico de informe, no una
   pieza de lectura. El tamaño se fija en la hoja de estilos y aquí solo se
   describe la proporción. */
const G = {
  lado: 140,
  radio: 52,
  grosor: 18,
};

function crear(nombre, atributos = {}) {
  const el = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, String(v));
  return el;
}

/* Rampa de grises para las posiciones. Son variables de la hoja de estilos, no
   literales: el tema oscuro las redefine y el anillo lo sigue sin saberlo. Si
   hay más posiciones que tonos se recorre en ciclo, y por eso la etiqueta
   directa no es un adorno: es lo que distingue a la séptima de la primera. */
const TONOS = ['var(--anillo-1)', 'var(--anillo-2)', 'var(--anillo-3)', 'var(--anillo-4)'];

/** Identificador único por instancia: dos tramas con el mismo id colisionan. */
let secuencia = 0;

/**
 * Pinta la composición de la cartera.
 *
 * @param {HTMLElement} destino
 * @param {object} datos  respuesta de `/api/mercado/cartera`
 */
export function pintarAnillo(destino, datos) {
  if (!destino) return;
  destino.textContent = '';

  const caja = datos?.liquidez;
  const pesoCaja = Number.isFinite(caja?.pesoActual) ? caja.pesoActual : null;
  const vivas = (datos?.posiciones ?? []).filter((p) => Number.isFinite(p.pesoVigente));

  /* Sin la caja no se cierra la composición, y un anillo incompleto afirmaría
     que lo que enseña es todo lo que hay. Se declara la carencia. */
  if (pesoCaja === null) {
    destino.appendChild(bloqueSinAnillo(
      t('cartera.anillo.sinCaja.titulo'), t('cartera.anillo.sinCaja.motivo')));
    return;
  }

  // Sin posiciones vivas NI caja no hay cartera que componer.
  if (!vivas.length && pesoCaja === 0) {
    destino.appendChild(bloqueSinAnillo(
      t('cartera.anillo.vacio.titulo'), t('cartera.anillo.vacio.motivo')));
    return;
  }

  const sectores = [
    ...vivas.map((p, i) => ({
      clave: p.ticker,
      etiqueta: p.ticker,
      peso: p.pesoVigente,
      relleno: TONOS[i % TONOS.length],
      esCaja: false,
    })),
    {
      clave: '__caja__',
      etiqueta: t('cartera.liquidez.etiqueta'),
      peso: pesoCaja,
      relleno: null,          // la caja va con trama, no con tono
      esCaja: true,
    },
  ];

  const total = sectores.reduce((a, s) => a + s.peso, 0);
  // Un total no positivo no es dibujable, y forzarlo inventaría proporciones.
  if (!(total > 0)) {
    destino.appendChild(bloqueSinAnillo(
      t('cartera.anillo.vacio.titulo'), t('cartera.anillo.vacio.motivo')));
    return;
  }

  const id = `anillo-${++secuencia}`;
  const cuerpo = elemento('div', 'anillo__cuerpo');

  const svg = crear('svg', {
    viewBox: `0 0 ${G.lado} ${G.lado}`,
    class: 'anillo__svg',
    role: 'img',
    'aria-labelledby': `${id}-desc`,
  });

  /* Descripción alternativa: enumera los sectores con su peso, en el orden en
     que se dibujan. Es la misma lista que se ve, no un resumen aparte. */
  const desc = crear('title', { id: `${id}-desc` });
  desc.textContent = t('cartera.anillo.descripcion', {
    partes: sectores.map((s) => `${s.etiqueta} ${porcentaje(s.peso)}`).join(' · '),
  });
  svg.appendChild(desc);

  // ── La trama de la caja ──
  const defs = crear('defs');
  const trama = crear('pattern', {
    id: `${id}-trama`, width: 5, height: 5,
    patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)',
  });
  trama.appendChild(crear('rect', { width: 5, height: 5, class: 'anillo__trama-fondo' }));
  trama.appendChild(crear('line', { x1: 0, y1: 0, x2: 0, y2: 5, class: 'anillo__trama-linea' }));
  defs.appendChild(trama);
  svg.appendChild(defs);

  /* Los arcos se dibujan como trazo sobre una circunferencia, no como sectores
     de camino: así el caso de un sector al 100 % sale un anillo entero sin
     tratar aparte el arco de 360°, que es donde `A` de SVG se vuelve ambiguo. */
  const centro = G.lado / 2;
  const circunferencia = 2 * Math.PI * G.radio;
  let acumulado = 0;

  for (const s of sectores) {
    // Un sector de peso cero NO dibuja arco: 0° es invisible. Pero sí figura en
    // la lista, que es donde se afirma que vale cero y no que falte.
    if (s.peso > 0) {
      svg.appendChild(crear('circle', {
        class: `anillo__arco${s.esCaja ? ' anillo__arco--caja' : ''}`,
        cx: centro, cy: centro, r: G.radio,
        fill: 'none',
        stroke: s.esCaja ? `url(#${id}-trama)` : s.relleno,
        'stroke-width': G.grosor,
        'stroke-dasharray': `${((s.peso / total) * circunferencia).toFixed(3)} ${circunferencia.toFixed(3)}`,
        'stroke-dashoffset': `${(-(acumulado / total) * circunferencia).toFixed(3)}`,
        transform: `rotate(-90 ${centro} ${centro})`,
      }));
    }
    acumulado += s.peso;
  }

  cuerpo.appendChild(svg);

  /* ── La lista ──
     A este tamaño no caben rótulos sobre el dibujo, de modo que la identidad de
     cada sector la lleva la lista y no el anillo. Es un reparto deliberado: el
     ANILLO responde a «cuánto hay invertido» —que se ve de un golpe por la
     proporción y por la trama de la caja—, y la LISTA responde a «qué y cuánto»,
     con cada nombre escrito junto a su cifra. El tono del cuadrito acompaña,
     pero no es lo que porta el dato: eso lo porta el texto de al lado. */
  const lista = elemento('ul', 'anillo__lista');
  for (const s of sectores) {
    const fila = elemento('li', `anillo__fila${s.esCaja ? ' anillo__fila--caja' : ''}`);
    const muestra = elemento('span', `anillo__muestra${s.esCaja ? ' anillo__muestra--caja' : ''}`);
    if (!s.esCaja) muestra.style.background = s.relleno;
    muestra.setAttribute('aria-hidden', 'true');
    fila.appendChild(muestra);
    fila.appendChild(elemento('span', 'anillo__nombre', s.etiqueta));
    fila.appendChild(elemento('strong', 'anillo__cifra', porcentaje(s.peso)));
    lista.appendChild(fila);
  }
  cuerpo.appendChild(lista);
  destino.appendChild(cuerpo);
}

/** Carencia declarada, con su motivo. Nunca un anillo a medias. */
function bloqueSinAnillo(titulo, motivo) {
  const caja = elemento('div', 'anillo__vacio');
  caja.appendChild(elemento('strong', null, titulo));
  caja.appendChild(elemento('p', null, motivo));
  return caja;
}
