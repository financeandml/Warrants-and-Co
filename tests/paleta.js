'use strict';

/* ============================================================================
   La paleta: contraste medido, tonos que se separan y una sola fuente.

   ═══ Por qué esta batería existe ═══

   Un color mal elegido no vacía ninguna sección, no da error de consola y no
   rompe ninguna vista. Se ve perfectamente normal, y por eso ninguna de las
   otras dieciocho baterías lo caza. Se comprueba afirmándolo, o no se comprueba.

   Lo caza el primer día, y sobre código que ya estaba en producción:

     · `--tinta-mate` daba 4,52:1 sobre blanco y 4,04:1 sobre
       `--superficie-hundida`. Pasaba la inspección sobre la superficie donde
       nadie lo usa y fallaba sobre las dos donde vive de verdad.
     · `--aviso` daba 4,69:1 sobre blanco y 4,18:1 sobre la misma.

   ═══ Los cuatro apoyos ═══

   1 · CONTRASTE. Todo token que componga texto llega a 4,5:1 sobre las TRES
       superficies, no solo sobre la que le favorece.

   2 · DISTANCIA. Ningún tono con significado se acerca a otro por debajo de
       ΔE2000 25. El criterio nació de un caso a ΔE 10,8 —el índigo y el antiguo
       azul semántico en tema oscuro—, donde cada color por separado era legible
       y juntos no se separaban en una tabla de rentabilidades a 13 px.

   3 · UNA SOLA FUENTE. El tema oscuro está declarado DOS VECES en
       `estilos.css`: una en `:root[data-tema="oscuro"]` y otra en la consulta
       `prefers-color-scheme`. Son el mismo hecho escrito dos veces, y nada
       impedía que se separaran: quien tocara una y olvidara la otra dejaría a
       media plataforma con una paleta y a la otra media con otra, según hubiera
       pulsado el conmutador o no. Esta batería afirma que las dos coinciden.

   4 · SEGREGACIÓN (cláusula 2). El acento no entra en una celda que porte una
       cifra. Va en el borde y el fondo de la tarjeta —cromo—, nunca en el color
       del número. La excepción está en la propia cláusula y es una sola:
       `.lectura--info` SÍ calcula el acento, porque bajo la fusión el índigo
       significa «información neutra, sin dirección» y eso es un dato legítimo.
       Se comprueba en las vistas ya convertidas, y la lista crece con cada una.

   5 · SIN LITERALES. Un color se declara como token o no se declara. Las dos
       excepciones legítimas —una máscara, donde el negro es opacidad, y
       `@media print`, que no tiene tema— se marcan en su línea con
       `paleta-ok:` y su motivo.

   ═══ Los cuatro estados del tema, no dos ═══

   El lector puede estar en cuatro sitios, y los dos que no llevan marca son los
   que se olvidan: sin `data-tema` en la raíz, solo `prefers-color-scheme`
   separa claro de oscuro. Un color declarado únicamente dentro de
   `:root[data-tema="oscuro"]` no se aplica jamás a quien no ha tocado el
   conmutador, que es la mayoría. Los cuatro se recorren enteros.

   ═══ Cómo se pregunta ═══

   No leyendo la hoja de estilos, que sería preguntarle a la misma fuente. Se
   pinta: se le da a un elemento `color: var(--token)` y se lee el color
   REALMENTE calculado. Un token que no existe deja la propiedad inválida y el
   elemento hereda —de ahí el centinela en el padre—, de modo que la ausencia se
   distingue del valor sin ambigüedad.

     BASE_PRUEBA=http://127.0.0.1:4174 npm run test:paleta

   Solo lee: no escribe en la base.
   ========================================================================= */

const fs = require('node:fs');
const path = require('node:path');
const { exigirPlaywright } = require('./dependencias');
const { crearTercerEstado } = require('./tercer-estado');

const { chromium } = exigirPlaywright('paleta: contraste, distancia y fuente única');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';
const HOJA = path.join(__dirname, '..', 'public', 'estilos.css');

/* ── Qué se exige ──────────────────────────────────────────────────────── */

const MINIMO_CONTRASTE = 4.5;   // AA para texto normal

/* ── Por qué ΔE2000 y no grados de tono ──
   La primera versión de esta batería exigía 45° de tono, y denunció a rojo
   (2°) contra ámbar (41°), que distan 39° y se distinguen perfectamente en una
   tabla. El grado de tono no mide lo que la regla quiere decir: está
   comprimido en la zona azul y estirado en la roja, de modo que 23° entre dos
   azules es gravísimo y 39° entre rojo y ámbar no es nada. Denunciaba al par
   sano y habría absuelto a otro enfermo.

   ΔE2000 mide diferencia PERCIBIDA, que es lo que la cláusula 3 siempre quiso
   decir. Medido sobre esta paleta, el umbral cae en un hueco ancho:

       el caso que motivó la regla —el índigo contra el azul
       semántico retirado—            ΔE 10,8 (oscuro) · 14,7 (claro)
       ─────────────────────────────  umbral 25  ─────────────────────
       el par legítimo más ajustado
       —baja contra aviso—            ΔE 29,4 (claro) · 34,8 (oscuro)

   Quien mueva este número: está puesto entre esos dos anclajes a propósito, no
   ajustado a ninguno de los dos. Bajarlo de 15 deja entrar el caso que la
   cláusula existe para impedir; subirlo de 29 denuncia a un par que está sano.

   Con ΔE no hace falta guardar contra los grises: `--tinta-mate` es un gris al
   2 % que calcula 240° —pegado al índigo—, y sin embargo dista ΔE 45 de él,
   porque el croma también cuenta. La métrica anterior necesitaba esa excepción;
   ésta no. */
const MINIMA_DISTANCIA = 25;

const SUPERFICIES = ['--superficie', '--superficie-alt', '--superficie-hundida'];
const TEXTO = ['--tinta', '--tinta-secundaria', '--tinta-mate',
               '--acento', '--alcista', '--bajista', '--aviso'];
/* Los que significan algo. El acento entra aquí: bajo la fusión también
   significa —información neutra, sin dirección—, y por eso ha de separarse de
   los tres direccionales igual que ellos entre sí. */
const CON_SIGNIFICADO = ['--acento', '--alcista', '--bajista', '--aviso'];
const RETIRADOS = ['--informativo', '--informativo-tenue'];

/* Las vistas ya convertidas a bento y, para cada una, QUÉ celdas con cifra tiene.
   Crece una entrada por tanda de la fase 3.

   La lista es por vista y no una sola global, y se espera a que estén TODAS, no
   a que esté alguna. Costó un fallo no cazado averiguarlo: con «alguna», la
   cronología —que pinta pronto— cumplía la condición y la medida se tomaba antes
   de que llegara el panel de research, de modo que un acento metido en
   `.dato__valor` pasaba entero. Es la misma trampa que ya avisa `CLAUDE.md`:
   esperar por que la sección «tenga algo» no es esperar por lo que se va a
   medir.

   No vale tampoco barrer todo nodo con un dígito: un rótulo con un año dentro lo
   cumple y no es una lectura. */
/* Fase D.2: `.cronologia__dia` desapareció con la cronología de Catalizadores
   en Portada —sustituida por `.upcoming` (4 líneas, sin hilo ni badge)—, y su
   fecha vive ahora en `.upcoming__fecha`. Calibración, no relajación: sigue
   siendo la misma comprobación —el acento no entra en la fecha del
   catalizador—, solo que sobre la clase nueva.

   Fase D.6: `.portada__cifras__valor` desapareció con la fila de tres cifras
   del hero, retirada junto con el hero fotográfico que la presupuestaba. Las
   mismas cifras siguen viviendo, y comprobándose, en `.cinta-metricas__valor`
   —la única fuente ahora, dentro de Portfolio—. Misma calibración, no una
   relajación: sigue sin poder entrar el acento en ninguna celda con cifra. */
const VISTAS_CONVERTIDAS = {
  inicio: ['.cinta-metricas__valor', '.dato__valor', '.upcoming__fecha'],
  /* En cartera vive el anillo, y sus sectores NO están en esta lista a
     propósito: no son celdas de texto con cifra sino arcos de un SVG, y su
     régimen es la cláusula 1 —cada sector lleva su nombre escrito y la caja su
     trama—, no la 3.

     Tampoco está `.aportacion__valor`, aunque `tipografia.js` la clasifique bajo
     la ruta de cartera: vive en `#seccion-radar`. Allí la lista dice por qué
     ruta pasar para encontrarla y la consulta es global, así que da igual dónde
     esté; ésta acota por sección, y no da igual. */
  cartera: ['.indicador__valor', '.estadistico__nota'],

  /* Descubiertas mirando la vista pintada, no deducidas del CSS: se barrieron
     los nodos hoja con un dígito dentro de cada sección. Es la misma cautela que
     evitó meter `.aportacion__valor` en cartera. `.estado-datos` queda fuera a
     propósito: lleva un recuento, no una lectura. */
  companias: ['.dato__valor'],
  catalizadores: ['.par-dato__valor', '.grupo-agenda__fecha'],
  repositorio: ['.num'],

  /* `noticias` está convertida y NO figura aquí, y no es un olvido: es la única
     vista sin celdas de lectura. Se comprobó sobre la vista pintada —12 tarjetas,
     23 nodos con dígito— y todos los dígitos viven o dentro de la prosa de un
     titular («vende acciones por 1,58 millones») o en la paginación, que es cromo
     y por tanto SÍ debe ir en índigo. Poner `noticias: []` daría un verde que no
     ha costado nada: la condición «están todas» se cumple sola con la lista
     vacía. Si algún día noticias publica una columna de cifras, entra aquí. */
};

const TODOS = [...new Set([...SUPERFICIES, ...TEXTO, ...CON_SIGNIFICADO,
                           ...RETIRADOS, '--acento-pleno', '--foco', '--fondo-marca'])];

/* Los cuatro estados. `esquema` es lo que dice el sistema operativo; `marca` es
   lo que el lector ha elegido con el conmutador. Las combinaciones cruzadas no
   son teóricas: «oscuro elegido sobre sistema claro» es exactamente quien pulsa
   el conmutador en un portátil en modo claro. */
const ESTADOS = [
  { n: 'claro elegido',        marca: 'claro',  esquema: 'dark',  espera: 'claro'  },
  { n: 'oscuro elegido',       marca: 'oscuro', esquema: 'light', espera: 'oscuro' },
  { n: 'sistema claro',        marca: null,     esquema: 'light', espera: 'claro'  },
  { n: 'sistema oscuro',       marca: null,     esquema: 'dark',  espera: 'oscuro' },
];

/* ── Aritmética de color ───────────────────────────────────────────────── */

const canal = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminancia = ([r, g, b]) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

const contraste = (a, b) => {
  const x = luminancia(a), y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/* sRGB → CIELAB, con blanco D65. */
const lab = ([r, g, b]) => {
  const [R, G, Bl] = [r, g, b].map(canal);
  const k = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = k((0.4124 * R + 0.3576 * G + 0.1805 * Bl) / 0.95047);
  const Y = k(0.2126 * R + 0.7152 * G + 0.0722 * Bl);
  const Z = k((0.0193 * R + 0.1192 * G + 0.9505 * Bl) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};

/* CIEDE2000. Es larga porque la fórmula lo es; no hay versión corta fiel. */
const separacion = (c1, c2) => {
  const [L1, a1, b1] = lab(c1), [L2, a2, b2] = lab(c2);
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const A1 = a1 * (1 + G), A2 = a2 * (1 + G);
  const Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const ang = (x, y) => (x === 0 && y === 0 ? 0 : (Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
  const h1 = ang(A1, b1), h2 = ang(A2, b2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * Math.PI / 360);
  const Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb;
  if (Cp1 * Cp2 === 0) hb = h1 + h2;
  else { hb = (h1 + h2) / 2; if (Math.abs(h1 - h2) > 180) hb += (h1 + h2 < 360) ? 180 : -180; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * Math.PI / 180)
              + 0.24 * Math.cos(2 * hb * Math.PI / 180)
              + 0.32 * Math.cos((3 * hb + 6) * Math.PI / 180)
              - 0.20 * Math.cos((4 * hb - 63) * Math.PI / 180);
  const Rt = -Math.sin(2 * (30 * Math.exp(-(((hb - 275) / 25) ** 2))) * Math.PI / 180)
             * 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2
                   + Rt * (dC / Sc) * (dH / Sh));
};

const enHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/* ── Resultados ────────────────────────────────────────────────────────── */

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

/* El apoyo 4 mira vistas pintadas, y una vista sin filas no se aprueba ni se
   suspende: se declara. El volcado de esta batería es diferido, así que la
   pendiente se acumula en `R` como todo lo demás. */
const E = crearTercerEstado(B);
const pendiente = (n, motivo) => { R.push({ n, sinDato: true, d: motivo }); };

/* ── Apoyo 1-3 · lo que el navegador calcula de verdad ─────────────────── */

const resolver = (pagina, tokens) => pagina.evaluate((lista) => {
  /* El centinela vive en el PADRE. Un `var(--inexistente)` es inválido en
     tiempo de valor calculado: la propiedad no se descarta, se hereda. Poner el
     centinela en el propio elemento no serviría —asignar `color` dos veces
     sustituye la primera—, y entonces la ausencia de un token se leería como el
     color del texto de la página, que es un valor perfectamente plausible. */
  const padre = document.createElement('div');
  padre.style.cssText = 'position:absolute;left:-9999px;top:-9999px;color:rgb(1, 2, 3)';
  const hijo = document.createElement('span');
  padre.appendChild(hijo);
  document.body.appendChild(padre);

  const salida = {};
  for (const tk of lista) {
    hijo.style.color = `var(${tk})`;
    const c = getComputedStyle(hijo).color;
    salida[tk] = c === 'rgb(1, 2, 3)' ? null : c;
  }
  padre.remove();
  return salida;
}, tokens);

const aTerna = (css) => {
  if (!css) return null;
  const m = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])] : null;
};

(async () => {
  const navegador = await chromium.launch();
  const errores = [];
  const porEstado = {};

  for (const e of ESTADOS) {
    const ctx = await navegador.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: e.esquema,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (x) => errores.push(x.message));

    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });

    if (e.marca) {
      await p.evaluate((v) => document.documentElement.setAttribute('data-tema', v), e.marca);
    } else {
      await p.evaluate(() => document.documentElement.removeAttribute('data-tema'));
    }

    /* Por condición y sobre lo que solo existe con la hoja ya aplicada: que
       `--superficie` resuelva. Antes de eso no hay paleta que medir, y medir
       una paleta a medio aplicar daría cifras verosímiles y falsas. */
    await p.waitForFunction(() => {
      const d = document.createElement('span');
      d.style.color = 'var(--superficie)';
      document.body.appendChild(d);
      const hay = getComputedStyle(d).color !== '';
      d.remove();
      return hay;
    }, null, { timeout: 30000 }).catch(() => {});

    const crudo = await resolver(p, TODOS);
    const c = {};
    for (const [k, v] of Object.entries(crudo)) c[k] = aTerna(v);
    porEstado[e.n] = c;

    // ── 1 · contraste sobre las tres superficies ──
    for (const tk of TEXTO) {
      if (!c[tk]) { t(`[${e.n}] ${tk} existe`, false, 'el token no resuelve'); continue; }
      let peor = Infinity, dondePeor = '';
      for (const sup of SUPERFICIES) {
        if (!c[sup]) continue;
        const r = contraste(c[tk], c[sup]);
        if (r < peor) { peor = r; dondePeor = sup; }
      }
      t(`[${e.n}] ${tk} llega a ${MINIMO_CONTRASTE}:1 sobre las tres superficies`,
        peor >= MINIMO_CONTRASTE,
        `${enHex(c[tk])} da ${peor.toFixed(2)}:1 sobre ${dondePeor}`);
    }

    // ── 2 · distancia entre tonos con significado ──
    const conTono = CON_SIGNIFICADO.filter((tk) => c[tk]);
    for (let i = 0; i < conTono.length; i++) {
      for (let j = i + 1; j < conTono.length; j++) {
        const a = conTono[i], b = conTono[j];
        const d = separacion(c[a], c[b]);
        t(`[${e.n}] ${a} y ${b} se separan (ΔE ≥ ${MINIMA_DISTANCIA})`,
          d >= MINIMA_DISTANCIA,
          `${enHex(c[a])} y ${enHex(c[b])} distan ΔE ${d.toFixed(1)}`);
      }
    }

    // ── el azul retirado no ha vuelto ──
    for (const tk of RETIRADOS) {
      t(`[${e.n}] ${tk} no existe`, c[tk] === null,
        c[tk] ? `resuelve a ${enHex(c[tk])}: el segundo azul ha vuelto` : '');
    }

    // ── el foco sale del acento, no de una copia suya ──
    t(`[${e.n}] --foco es exactamente --acento`,
      c['--foco'] && c['--acento'] && enHex(c['--foco']) === enHex(c['--acento']),
      `--foco ${c['--foco'] && enHex(c['--foco'])} · --acento ${c['--acento'] && enHex(c['--acento'])}`);

    // ── el foco de teclado sigue visible ──
    /* Se tabula de verdad, porque `:focus-visible` solo se cumple con foco de
       teclado. Enfocar por programa daría un verde falso: la regla no llega a
       aplicarse y el contorno medido sería el de nadie.

       Se afirman tres cosas a la vez: que hay contorno, que mide lo que la hoja
       dice, y que su color es EXACTAMENTE el acento. Un contorno de 0 px con el
       color correcto pasaría dos de tres. */
    await p.keyboard.press('Tab');
    const foco = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        que: el.className || el.tagName,
        color: cs.outlineColor,
        ancho: parseFloat(cs.outlineWidth) || 0,
        estilo: cs.outlineStyle,
      };
    });

    if (!foco) {
      pendiente(`[${e.n}] el foco de teclado sigue visible`,
        'al tabular no quedó nada enfocado: no hay contorno que medir');
    } else {
      const esperado = c['--acento'] && `rgb(${c['--acento'].join(', ')})`;
      t(`[${e.n}] el foco de teclado sigue visible`,
        foco.estilo !== 'none' && foco.ancho >= 2 && foco.color === esperado,
        `«${foco.que}»: ${foco.estilo} ${foco.ancho}px ${foco.color} · se esperaba solid ≥2px ${esperado}`);
    }
    // ── 4 · el acento no se cuela en una celda con cifra ──
    for (const [vista, CELDAS_CON_CIFRA] of Object.entries(VISTAS_CONVERTIDAS)) {
      await p.goto(`${B}/#/${vista}`, { waitUntil: 'domcontentloaded' });
      if (e.marca) {
        await p.evaluate((v) => document.documentElement.setAttribute('data-tema', v), e.marca);
      }
      /* Por condición y sobre lo que solo existe ya pintado. Si no llega nada
         que medir no se aprueba: se declara pendiente. */
      /* La vista va como argumento y NO se deduce del hash: `'#/inicio'.slice(3)`
         da «nicio», y el selector resultante no casa con nada. Falla en silencio
         —cero nodos parece «no hay datos»—, que es la peor forma de fallar. */
      const hay = await E.esperarDatos(p, ({ sels, v }) =>
        sels.every((sel) => document.querySelectorAll(`#seccion-${v} ${sel}`).length > 0),
        { sels: CELDAS_CON_CIFRA, v: vista },
        { nombre: `[${e.n}] ${vista} · hay celdas con cifra que revisar`,
          motivo: 'la vista no pintó todas sus columnas de cifras: la base no trae filas',
          plazo: 30000, declarar: pendiente });

      if (!hay) continue;

      const intrusos = await p.evaluate(({ sels, acentos, v }) => {
        const raiz = document.getElementById(`seccion-${v}`);
        if (!raiz) return null;
        const fuera = [];
        for (const sel of sels) {
          for (const el of raiz.querySelectorAll(sel)) {
            // La excepción de la cláusula: el índigo SÍ significa «info neutra».
            if (el.classList.contains('lectura--info')) continue;
            if (acentos.includes(getComputedStyle(el).color)) {
              fuera.push(`${sel} «${el.className}»`);
            }
          }
        }
        return fuera;
      }, { sels: CELDAS_CON_CIFRA,
           acentos: [c['--acento'], c['--acento-pleno']].filter(Boolean)
             .map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`),
           v: vista });

      t(`[${e.n}] ${vista} · el acento no entra en ninguna celda con cifra`,
        intrusos !== null && intrusos.length === 0,
        intrusos === null ? `no existe #seccion-${vista}` : intrusos.slice(0, 3).join(' · '));
    }

    await ctx.close();
  }

  /* ── 3 · el tema oscuro está escrito dos veces: ¿dicen lo mismo? ──
     Éste es el apoyo que no se ve navegando. Quien toque un bloque y olvide el
     otro deja dos plataformas distintas conviviendo, y las dos se ven bien. */
  for (const [par, a, b] of [['oscuro', 'oscuro elegido', 'sistema oscuro'],
                             ['claro',  'claro elegido',  'sistema claro']]) {
    const A = porEstado[a], Z = porEstado[b];
    const discrepan = TODOS.filter((tk) => {
      const x = A?.[tk], y = Z?.[tk];
      if (!x && !y) return false;
      if (!x || !y) return true;
      return enHex(x) !== enHex(y);
    });
    t(`el tema ${par} dice lo mismo elegido que por sistema · ${TODOS.length} tokens`,
      discrepan.length === 0,
      discrepan.map((tk) =>
        `${tk}: ${A?.[tk] ? enHex(A[tk]) : 'ausente'} ≠ ${Z?.[tk] ? enHex(Z[tk]) : 'ausente'}`
      ).slice(0, 4).join(' · '));
  }

  /* ── 4 · sin literales de color fuera de un token ──
     Se leen las líneas de una en una para conservar el número y el marcador.
     Los comentarios se vacían ANTES de buscar, porque las cifras medidas viven
     en ellos —«#6366F1 da 4,47:1»— y no son declaraciones de nada. */
  {
    const lineas = fs.readFileSync(HOJA, 'utf8').split('\n');
    let dentroComentario = false;
    const infractoras = [];

    lineas.forEach((linea, i) => {
      const marcada = /paleta-ok:/.test(linea)
        || (i > 0 && /paleta-ok:/.test(lineas[i - 1]));

      // Vacía los comentarios de esta línea, incluidos los que vienen abiertos.
      let limpia = '', j = 0;
      while (j < linea.length) {
        if (dentroComentario) {
          const fin = linea.indexOf('*/', j);
          if (fin === -1) { j = linea.length; } else { dentroComentario = false; j = fin + 2; }
        } else {
          const ini = linea.indexOf('/*', j);
          if (ini === -1) { limpia += linea.slice(j); j = linea.length; }
          else { limpia += linea.slice(j, ini); dentroComentario = true; j = ini + 2; }
        }
      }

      if (marcada) return;
      if (/--[a-z0-9-]+\s*:/.test(limpia)) return;   // es la declaración de un token
      if (/#[0-9a-fA-F]{3,8}\b/.test(limpia)) {
        infractoras.push(`${i + 1}: ${limpia.trim()}`);
      }
    });

    t(`ningún color literal fuera de un token · ${lineas.length} líneas`,
      infractoras.length === 0, infractoras.slice(0, 5).join(' | '));
  }

  t('sin errores de consola', errores.length === 0, errores.slice(0, 3).join(' | '));

  await navegador.close();

  for (const r of R) {
    if (r.sinDato) { console.log(`    SIN DATO ${r.n}  → ${r.d}\n             base: ${B}`); continue; }
    console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  }
  const mal = R.filter((r) => !r.sinDato && !r.ok).length;
  const sin = R.filter((r) => r.sinDato).length;
  const medidas = R.length - sin;
  if (mal) console.log(`\n  ${mal} fallo(s) de ${medidas}${sin ? ` · ${sin} sin dato` : ''}\n`);
  else if (sin) {
    console.log(`\n  ${medidas} correctas · ${sin} SIN DATO: no se pudieron comprobar.`);
    console.log(`  La base de ${B} no trae las filas que necesitan. No es un aprobado.\n`);
  } else console.log(`\n  ${medidas}/${medidas} correctas\n`);
  process.exit(mal ? 1 : (sin ? 2 : 0));
})();
