'use strict';

/* ============================================================================
   Tipografía — las dos familias llegan, y las cifras siguen cuadrando.

   La plataforma se compone con Inter para el texto y Playfair Display para los
   titulares, servidas desde este mismo dominio.

   ═══ Por qué esta batería existe ═══

   Antes de Inter, la plataforma se componía con Helvetica Neue, que dibuja
   TODOS los dígitos al mismo ancho. Con esa familia, cualquier columna de
   cifras cuadraba sola: `font-variant-numeric: tabular-nums` estaba puesto en
   unos sitios y no en otros, y la diferencia no se veía en ninguna parte.

   Inter no funciona así. Medido en el propio fichero: el `1` ocupa 0,407 em y
   el `4` 0,646 —un 36 % de diferencia—. Una columna sin dígitos tabulares queda
   con el borde mellado y dos cifras que deberían leerse una bajo otra dejan de
   hacerlo. Nada de eso da error, nada de eso vacía una sección, y ninguna
   comprobación de «tiene contenido» lo ve.

   ═══ Cómo se afirma ═══

   No mirando la hoja de estilos, que sería preguntarle a la misma fuente. Se
   compone en pantalla, con los estilos REALMENTE calculados de cada elemento,
   una tira de dieces y otra de cuatros del mismo número de dígitos, y se afirma
   que miden lo mismo. Si miden distinto, esa columna no cuadra.

   El elemento de medida se crea y se destruye dentro de la propia página: no
   pinta ningún dato, no inventa ninguna cifra y no toca nada de lo que hay.

   Se afirma además que las dos familias han LLEGADO. Sin esa comprobación la
   batería pasaría en verde con las fuentes caídas: la de respaldo es Helvetica,
   que cuadra sola, de modo que el fallo se escondería detrás de su propio
   síntoma.

     BASE_PRUEBA=http://127.0.0.1:4174 npm run test:tipografia

   Solo lee: no escribe en la base.
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('tipografía y cifras tabulares');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

/* Qué columna vive en qué ruta.
   No es la lista de rutas de la aplicación: es la lista de sitios donde hay algo
   que medir, y para cada uno, qué. Sirve para dos cosas a la vez —y por eso está
   escrita una sola vez—: es la condición por la que se espera a que la vista esté
   pintada, y es la lista de lo que hay que haber medido al terminar.

   Esperar por «que la sección tenga algún dígito» NO vale: el rótulo de una
   cabecera con un año dentro ya lo cumple, y la espera vuelve con la vista a
   medio pintar. Se espera por los nodos concretos que se van a medir. */
const PORdesRUTA = {
  inicio: ['.portada__cifras__valor', '.cinta-metricas__valor', '.cinta-metricas__nota', '.dato__valor'],
  cartera: ['.indicador__valor', '.aportacion__valor', '.estadistico__nota'],
  catalizadores: ['.par-dato__valor', '.grupo-agenda__fecha'],
};

const RUTAS = Object.keys(PORdesRUTA);
const COLUMNAS = [...new Set(Object.values(PORdesRUTA).flat())];

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1680, height: 1050 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));

  const vistos = new Set();

  for (const idioma of ['es', 'en']) {
    for (const ruta of RUTAS) {
      await p.goto(`${B}/#/${ruta}`, { waitUntil: 'domcontentloaded' });
      await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
      await p.reload({ waitUntil: 'domcontentloaded' });

      /* Por condición y sobre lo que solo existe ya pintado: TODOS los nodos que
         esta ruta va a medir, visibles y con una cifra dentro. El plazo no es una
         espera —quien cumple, sigue—: es el límite tras el cual se da la condición
         por perdida, y entonces el guardián del final denuncia lo no medido. */
      await p.waitForFunction((sels) => sels.every((sel) =>
        [...document.querySelectorAll(sel)].some((el) => /\d/.test(el.textContent || ''))
      ), PORdesRUTA[ruta], { timeout: 45000 }).catch(() => {});

      const medida = await p.evaluate((columnas) => {
        /* Compone dos tiras del mismo número de dígitos con los estilos REALMENTE
           calculados del elemento, y devuelve lo que mide cada una. */
        const anchoDe = (el, texto) => {
          const cs = getComputedStyle(el);
          const s = document.createElement('span');
          s.textContent = texto;
          s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px';
          s.style.font = cs.font;
          s.style.fontFamily = cs.fontFamily;
          s.style.fontSize = cs.fontSize;
          s.style.fontWeight = cs.fontWeight;
          s.style.letterSpacing = cs.letterSpacing;
          s.style.fontVariantNumeric = cs.fontVariantNumeric;
          document.body.appendChild(s);
          const w = s.getBoundingClientRect().width;
          s.remove();
          return w;
        };
        const out = [];
        for (const sel of columnas) {
          /* TODOS los nodos con cifra, no el primero, y estén o no a la vista.
             Dos motivos, y los dos se aprendieron fallando:

             · La visibilidad no es la condición. Lo que se mide es el estilo
               calculado, que un nodo tiene igual dentro de un plegable cerrado, y
               cuando el lector lo abra ha de cuadrar. Exigirla dejaba fuera
               `.aportacion__valor` —que vive entero dentro del plegable— y
               `.indicador__valor`, cuyo primer nodo está oculto aunque haya siete
               más a la vista.

             · Mirar solo el primero da verdes falsos. Muchas cifras llevan además
               una clase de lectura —`.lectura--alza` y compañía—, que también
               compone tabular; si el nodo que se mira lleva una, la columna cuadra
               por esa vía aunque su propia clase se haya caído de la barrida. Con
               todos los nodos, basta que UNO no lleve clase de lectura —el valor
               plano, el pendiente, el que no aplica— para que el fallo salga. */
          const els = [...document.querySelectorAll(sel)]
            .filter((e) => /\d/.test(e.textContent || ''));
          if (!els.length) continue;
          for (const el of els) {
            out.push({
              sel,
              clases: el.className,
              unos: anchoDe(el, '1111111111'),
              cuatros: anchoDe(el, '4444444444'),
              variante: getComputedStyle(el).fontVariantNumeric,
            });
          }
        }
        return {
          columnas: out,
          inter: document.fonts.check('1em Inter'),
          playfair: document.fonts.check('1em "Playfair Display"'),
          /* Las familias que el documento tiene CARGADAS de verdad. No vale
             `getComputedStyle(body).fontFamily`: eso devuelve lo que la hoja de
             estilos declara, que sigue diciendo «Inter» aunque el fichero no haya
             llegado y se esté componiendo con el respaldo. Preguntarle a la hoja
             si la hoja se cumplió es preguntarle a la misma fuente. */
          cargadas: [...document.fonts].filter((f) => f.status === 'loaded')
            .map((f) => f.family).join(', ') || 'ninguna',
        };
      }, PORdesRUTA[ruta]);

      if (ruta === 'inicio') {
        t(`[${idioma}] Inter ha llegado`, medida.inter,
          `familias cargadas: ${medida.cargadas}`);
        t(`[${idioma}] Playfair Display ha llegado`, medida.playfair,
          `familias cargadas: ${medida.cargadas}`);
      }

      /* Un resultado por SELECTOR, no por nodo: la lista de resultados no debe
         crecer con los datos que haya ese día. Se denuncia el primer nodo que no
         cuadre, con las clases que llevaba puestas. */
      for (const sel of PORdesRUTA[ruta]) {
        const nodos = medida.columnas.filter((c) => c.sel === sel);
        if (!nodos.length) continue;
        vistos.add(sel);
        const malo = nodos.find((c) => Math.abs(c.unos - c.cuatros) >= 0.5);
        t(`[${idioma}] ${sel} cuadra en columna · ${nodos.length} nodo(s)`, !malo,
          malo ? `«${malo.clases}»: «1111111111» mide ${malo.unos.toFixed(1)} y ` +
                 `«4444444444» ${malo.cuatros.toFixed(1)} · ${malo.variante}` : '');
      }
    }
  }

  /* Un selector de la lista que no se haya visto en ninguna ruta no es un
     aprobado silencioso: es una columna que nadie ha comprobado. */
  for (const sel of COLUMNAS) {
    t(`${sel} se ha llegado a medir en alguna ruta`, vistos.has(sel),
      'no apareció en ninguna de las rutas recorridas');
  }

  t('sin errores de consola', errores.length === 0, errores.slice(0, 3).join(' | '));

  await navegador.close();
  for (const r of R) console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
