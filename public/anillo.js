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

/** Geometría del dibujo. En unidades de `viewBox`, no en píxeles. */
const G = {
  ancho: 460,
  alto: 260,
  cx: 130,
  cy: 130,
  radio: 82,
  grosor: 30,
  // Cuánto sobresale la línea guía del borde exterior antes de doblar.
  codo: 14,
  // Separación mínima entre dos etiquetas apiladas, para que no se pisen.
  separacion: 22,
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
  const svg = crear('svg', {
    viewBox: `0 0 ${G.ancho} ${G.alto}`,
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
    id: `${id}-trama`, width: 6, height: 6,
    patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)',
  });
  trama.appendChild(crear('rect', { width: 6, height: 6, class: 'anillo__trama-fondo' }));
  trama.appendChild(crear('line', { x1: 0, y1: 0, x2: 0, y2: 6, class: 'anillo__trama-linea' }));
  defs.appendChild(trama);
  svg.appendChild(defs);

  /* Los arcos se dibujan como trazo sobre una circunferencia, no como sectores
     de camino: así el caso de un sector al 100 % sale un anillo entero sin
     tratar aparte el arco de 360°, que es donde `A` de SVG se vuelve ambiguo. */
  const circunferencia = 2 * Math.PI * G.radio;
  let acumulado = 0;

  const anguloMedio = (desde, peso) => {
    const fraccion = (desde + peso / 2) / total;
    // −90° para que el primer sector arranque arriba, no a las tres en punto.
    return fraccion * 2 * Math.PI - Math.PI / 2;
  };

  const etiquetas = [];

  for (const s of sectores) {
    const fraccion = s.peso / total;
    // Un sector de peso cero NO dibuja arco: 0° es invisible. Pero sí etiqueta.
    if (s.peso > 0) {
      const arco = crear('circle', {
        class: `anillo__arco${s.esCaja ? ' anillo__arco--caja' : ''}`,
        cx: G.cx, cy: G.cy, r: G.radio,
        fill: 'none',
        stroke: s.esCaja ? `url(#${id}-trama)` : s.relleno,
        'stroke-width': G.grosor,
        'stroke-dasharray': `${(fraccion * circunferencia).toFixed(3)} ${circunferencia.toFixed(3)}`,
        'stroke-dashoffset': `${(-(acumulado / total) * circunferencia).toFixed(3)}`,
        transform: `rotate(-90 ${G.cx} ${G.cy})`,
      });
      svg.appendChild(arco);
    }
    etiquetas.push({ ...s, angulo: anguloMedio(acumulado, s.peso), fraccion });
    acumulado += s.peso;
  }

  /* ── Un solo sector al 100 % ──
     No hay a dónde apuntar: la línea guía de un anillo entero señalaría un punto
     arbitrario de sí mismo. La etiqueta va al hueco central. */
  const unico = sectores.filter((s) => s.peso > 0).length === 1;
  if (unico) {
    const s = etiquetas.find((e) => e.peso > 0);
    const centro = crear('text', { class: 'anillo__centro', x: G.cx, y: G.cy - 4, 'text-anchor': 'middle' });
    centro.textContent = s.etiqueta;
    svg.appendChild(centro);
    const cifra = crear('text', { class: 'anillo__centro-cifra', x: G.cx, y: G.cy + 20, 'text-anchor': 'middle' });
    cifra.textContent = porcentaje(s.peso);
    svg.appendChild(cifra);
  } else {
    for (const el of colocarEtiquetas(etiquetas, id)) svg.appendChild(el);
  }

  destino.appendChild(svg);

  /* El pie de la caja: la nota que ya existe, que reconcilia el peso sobre
     patrimonio con el de capital. No se redacta aquí ninguna versión propia. */
  if (caja) {
    const nota = caja.tramosLiquidados > 0
      ? t('cartera.liquidez.nota', {
        n: caja.tramosLiquidados, capital: porcentaje(caja.pesoCapital) })
      : t('cartera.liquidez.nota.sinLiquidar', { capital: porcentaje(caja.pesoCapital) });
    destino.appendChild(elemento('p', 'anillo__pie', nota));
  }
}

/**
 * Reparte las etiquetas a izquierda y derecha y las separa para que no se pisen.
 *
 * Cada una se une a su arco con una línea guía, que es lo que la hace ETIQUETA
 * DIRECTA y no leyenda: sin ella, con cuatro sectores habría que contar tonos
 * de gris para saber cuál es cuál, y ahí el color sí informaría solo.
 */
function colocarEtiquetas(sectores, id) {
  const nodos = [];
  const lados = { izquierda: [], derecha: [] };

  for (const s of sectores) {
    const cos = Math.cos(s.angulo);
    const sen = Math.sin(s.angulo);
    const borde = G.radio + G.grosor / 2;
    lados[cos >= 0 ? 'derecha' : 'izquierda'].push({
      ...s,
      // Punto de arranque en el borde exterior del arco.
      x0: G.cx + cos * borde,
      y0: G.cy + sen * borde,
      // Altura deseada de la etiqueta, antes de repartir.
      y: G.cy + sen * (borde + G.codo),
      derecha: cos >= 0,
    });
  }

  for (const [nombre, grupo] of Object.entries(lados)) {
    if (!grupo.length) continue;
    grupo.sort((a, b) => a.y - b.y);

    // Separación mínima: se empuja hacia abajo y luego se corrige por arriba,
    // de modo que un grupo apretado queda centrado en vez de desplazado.
    for (let i = 1; i < grupo.length; i++) {
      if (grupo[i].y - grupo[i - 1].y < G.separacion) grupo[i].y = grupo[i - 1].y + G.separacion;
    }
    const desborde = grupo[grupo.length - 1].y - (G.alto - 16);
    if (desborde > 0) for (const s of grupo) s.y -= desborde;
    for (let i = grupo.length - 2; i >= 0; i--) {
      if (grupo[i + 1].y - grupo[i].y < G.separacion) grupo[i].y = grupo[i + 1].y - G.separacion;
    }

    const xTexto = nombre === 'derecha' ? G.ancho - 12 : 12;
    const xCodo = nombre === 'derecha' ? G.ancho - 96 : 96;

    for (const s of grupo) {
      const guia = crear('polyline', {
        class: 'anillo__guia',
        points: `${s.x0.toFixed(1)},${s.y0.toFixed(1)} ${xCodo},${s.y.toFixed(1)} ${
          nombre === 'derecha' ? xCodo + 10 : xCodo - 10},${s.y.toFixed(1)}`,
      });
      nodos.push(guia);

      const texto = crear('text', {
        class: `anillo__etiqueta${s.esCaja ? ' anillo__etiqueta--caja' : ''}`,
        x: xTexto, y: s.y + 4,
        'text-anchor': nombre === 'derecha' ? 'end' : 'start',
      });
      const nombreSector = crear('tspan', { class: 'anillo__etiqueta-nombre' });
      nombreSector.textContent = s.etiqueta;
      const cifra = crear('tspan', { class: 'anillo__etiqueta-cifra', dx: 6 });
      cifra.textContent = porcentaje(s.peso);
      // En el lado izquierdo la cifra va delante para que el texto quede alineado.
      if (nombre === 'derecha') { texto.appendChild(nombreSector); texto.appendChild(cifra); }
      else { texto.appendChild(nombreSector); texto.appendChild(cifra); }
      nodos.push(texto);
    }
  }
  return nodos;
}

/** Carencia declarada, con su motivo. Nunca un anillo a medias. */
function bloqueSinAnillo(titulo, motivo) {
  const caja = elemento('div', 'anillo__vacio');
  caja.appendChild(elemento('strong', null, titulo));
  caja.appendChild(elemento('p', null, motivo));
  return caja;
}
