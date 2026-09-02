'use strict';

/* ============================================================================
   Vocabulario de movimiento — CLAUDE.md § Diseño 8.

   Recorrido estático de estilos.css. Sin servidor ni navegador: lee el
   fichero directamente y afirma tres cosas sobre las curvas y duraciones que
   la cláusula 8 promete.

   ═══ Por qué es un allowlist y no un barrido del fichero entero ═══

   La cláusula 8 es nueva y hoy solo gobierna lo que el rediseño 2 ya
   convirtió: el cambio de valor de la cinta y la entrada de fila de
   noticias. El resto de estilos.css —`.research`, `.destacada`, `.senal`,
   las tarjetas de compañías, el pulso de catalizadores, y sus `:hover` con
   `transform` sin gatear— es ANTERIOR a esta cláusula y no la ha adoptado
   todavía. Barrer el fichero entero pondría en rojo permanente decenas de
   reglas que nadie ha tocado y que no están en la orden del día de hoy, y una
   batería roja de forma permanente acaba dejándose de mirar —el mismo
   argumento que ya usa `tests/paleta.js` con `VISTAS_CONVERTIDAS` para el
   acento fuera de una celda con cifra.

   `SELECTORES_CONVERTIDOS` crece con cada componente que el rediseño trae al
   vocabulario nuevo. Hoy son dos: la cinta y noticias. Quien convierta el
   siguiente —cartera— lo añade aquí en la misma tanda.

       node tests/movimiento.js

   No necesita servidor ni Playwright: lee estilos.css del disco. */

const fs = require('node:fs');
const path = require('node:path');

const HOJA = path.join(__dirname, '..', 'public', 'estilos.css');
const css = fs.readFileSync(HOJA, 'utf8');

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

/* Los selectores ya migrados a la cláusula 8. El texto ha de coincidir
   EXACTO con el que abre el bloque en estilos.css —se busca como cabecera de
   regla, no como subcadena libre—. */
const SELECTORES_CONVERTIDOS = [
  '.ticker__valor--sale, .ticker__var--sale',
  '.ticker__valor--entra, .ticker__var--entra',
  '#seccion-noticias .fila-noticia',
];

const CURVAS_VALIDAS = ['--mov-entrada', '--mov-estado', '--mov-sale-cinta', '--mov-entra-cinta'];

/* Tope de duración de la cláusula 8. Ninguna de las dos convertidas hoy es
   modal ni drawer, así que la excepción a 500ms está declarada y vacía: la
   rellena quien convierta el primer modal. */
const TOPE_MS = 300;
const EXCEPCIONES_TOPE = {}; // selector → tope propio, ej. '.dialogo': 500

/**
 * Todos los bloques `{ ... }` cuya cabecera contiene el selector dado, tal
 * cual aparece en el fichero —comas y espacios incluidos—. Devuelve los
 * cuerpos concatenados: a estos selectores no les hace falta un parser CSS
 * completo, ninguno anida llaves dentro de su propio bloque.
 */
function cuerposDe(selector) {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patron = new RegExp(`${escapado}\\s*\\{([^{}]*)\\}`, 'g');
  const cuerpos = [];
  let m;
  while ((m = patron.exec(css)) !== null) cuerpos.push(m[1]);
  return cuerpos;
}

/* ── 1 · toda curva de los selectores convertidos usa un token, nunca un
   cubic-bezier suelto, y nunca `ease-in` ── */
for (const sel of SELECTORES_CONVERTIDOS) {
  const cuerpos = cuerposDe(sel);
  if (!cuerpos.length) { t(`«${sel}» existe en estilos.css`, false, 'no se encontró el bloque'); continue; }
  const cuerpo = cuerpos.join('\n');

  const cubicSuelto = /cubic-bezier\(/.test(cuerpo);
  t(`«${sel}» no lleva un cubic-bezier literal —solo var(--mov-*)`,
    !cubicSuelto, cubicSuelto ? cuerpo.match(/[^;]*cubic-bezier\([^;]*/)[0].trim() : '');

  const easeIn = /\bease-in\b(?!-out)/.test(cuerpo);
  t(`«${sel}» no usa ease-in`, !easeIn, easeIn ? cuerpo.match(/[^;]*\bease-in\b[^;]*/)[0].trim() : '');

  const usaCurvaValida = CURVAS_VALIDAS.some((v) => cuerpo.includes(`var(${v})`));
  const tieneTransicionOAnimacion = /\b(transition|animation)\s*:/.test(cuerpo);
  if (tieneTransicionOAnimacion) {
    t(`«${sel}» usa una curva del vocabulario (${CURVAS_VALIDAS.join(', ')})`,
      usaCurvaValida, cuerpo.trim().replace(/\s+/g, ' '));
  }
}

/* ── 2 · tope de 300ms, salvo la excepción declarada del propio selector ── */
for (const sel of SELECTORES_CONVERTIDOS) {
  const cuerpo = cuerposDe(sel).join('\n');
  const tope = EXCEPCIONES_TOPE[sel] ?? TOPE_MS;
  const duraciones = [...cuerpo.matchAll(/\b(\d+)ms\b/g)].map((m) => Number(m[1]));
  if (!duraciones.length) continue;
  const excede = duraciones.filter((d) => d > tope);
  t(`«${sel}» no supera ${tope}ms`, excede.length === 0,
    excede.length ? `declara ${excede.join('ms, ')}ms` : '');
}

/* ── 3 · todo :hover de un selector convertido que anime algo distinto de
   opacity/color/background vive tras @media (hover: hover) and (pointer: fine) ──
   `animation-play-state` no cuenta: pausa movimiento, no lo añade —pausar en
   hover no atasca nada en táctil, que es justo lo que la cláusula 8 evita. */
{
  const PROPIEDADES_LIBRES = /^(opacity|color|background|background-color|animation-play-state)\b/;
  // Cada rama de un selector compuesto por comas lleva su propio `:hover` —
  // `${sel}:hover` a pelo solo se lo pondría a la última rama—.
  for (const sel of SELECTORES_CONVERTIDOS) {
    const ramas = sel.split(',').map((r) => `${r.trim()}:hover`);
    const cuerposHover = ramas.flatMap((r) => cuerposDe(r).map((cuerpo) => ({ r, cuerpo })));
    for (const { r: conHover, cuerpo } of cuerposHover) {
      const declaraciones = cuerpo.split(';').map((d) => d.trim()).filter(Boolean);
      const libres = declaraciones.every((d) => PROPIEDADES_LIBRES.test(d));
      if (libres) continue;
      // Si anima algo más, el propio bloque de :hover debe estar dentro de un
      // `@media (hover: hover)`: se comprueba mirando 400 caracteres alrededor
      // de la posición del bloque en el fichero por si el `@media` lo envuelve.
      const idx = css.indexOf(`${conHover} {${cuerpo}}`);
      const alrededor = css.slice(Math.max(0, idx - 400), idx);
      const gateado = /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/.test(alrededor);
      t(`«${conHover}» gatea el movimiento no libre tras (hover: hover) and (pointer: fine)`,
        gateado, cuerpo.trim().replace(/\s+/g, ' '));
    }
  }
}

console.log('\n  ── vocabulario de movimiento: cláusula 8 ──\n');
for (const r of R) console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
const mal = R.filter((r) => !r.ok).length;
if (mal) console.log(`\n  ${mal} fallo(s) de ${R.length}\n`);
else console.log(`\n  ${R.length}/${R.length} correctas\n`);
process.exit(mal ? 1 : 0);
