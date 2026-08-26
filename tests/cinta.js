'use strict';

/* ============================================================================
   La cinta de mercado — lo único vivo de la portada.

   Todo lo demás de la portada es una foto del instante de carga, y es correcto
   que lo sea: los estadísticos salen de cierres de sesión y no cambian durante
   el día. Las cotizaciones sí cambian, y hasta ahora tampoco se movían —
   `cargarInicio()` corre una vez por carga de página—.

   ═══ Qué se afirma, y por qué cada cosa ═══

   1 · QUE LOS DOS ÍTEMS DE UNA CLAVE CAMBIAN A LA VEZ. La pista se duplica para
       que el bucle visual encaje, de modo que cada valor está DOS veces en el
       documento. Si solo cambiara uno, el mismo hecho diría dos cosas distintas
       según por dónde fuera pasando la cinta, y no habría error que lo delatara:
       las dos mitades no se ven nunca a la vez.

   2 · QUE EL ALTO NO CAMBIA. El alto de la cinta lo mide `seguirEncuadreBanner()`
       para encuadrar la fotografía y decidir dónde cae el árbol. Una sustitución
       que moviera un píxel movería el árbol cada veinte segundos.

   3 · QUE EL RÓTULO DISTINGUE COTIZADO DE CONSULTADO. `momento` no significa lo
       mismo en todos los proveedores: Yahoo publica el instante en que el mercado
       imprimió el precio, y los de respaldo la hora en que se lo preguntamos. Con
       el mercado cerrado, la primera se queda quieta y la segunda avanza en cada
       petición. Rotular una como la otra es publicar una frescura falsa.

   4 · QUE CON MOVIMIENTO REDUCIDO EL VALOR SIGUE CAMBIANDO. La hoja apaga esa
       animación con `animation: none`, y sin animación `animationend` NO SE
       DISPARA. Un cambio encadenado a ese evento dejaría el valor congelado en la
       cifra vieja para siempre — y en pantalla se vería como una cinta tranquila,
       que es justo lo que se pidió, no como un fallo.

     BASE_PRUEBA=http://127.0.0.1:4175 npm run test:cinta

   Solo lee: no escribe en la base.
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('la cinta de mercado');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

/* Una pasada del sondeo son 20 s por diseño —el servidor cachea las cotizaciones
   15—, así que esperar es aquí lo correcto y no un atajo: lo que se comprueba es
   que la pasada OCURRE sola. El plazo es el límite tras el cual se da por
   perdida, no una espera fija: se sale en cuanto el valor cambia. */
const esperarCambio = (p, antes) => p.waitForFunction((v) => {
  const n = document.querySelector('#ticker-pista .ticker__valor');
  return Boolean(n) && n.textContent !== v;
}, antes, { timeout: 40000 });

/** Un contexto con la API intervenida para mover el primer índice. */
async function conCambio(navegador, opciones = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: 1680, height: 1050 }, ...opciones,
  });
  const p = await ctx.newPage();
  let pasadas = 0;
  await p.route('**/api/radar/indices', async (ruta) => {
    const r = await ruta.fetch();
    const d = await r.json();
    pasadas++;
    if (pasadas >= 2 && d.indices?.[0]) {
      d.indices[0].valor = (d.indices[0].valor ?? 100) + 12.34;
      d.indices[0].variacionPct = 1.23;
      d.indices[0].momento = new Date().toISOString();
      d.indices[0].momentoDeMercado = opciones.deMercado !== false;
    }
    await ruta.fulfill({ response: r, json: d });
  });
  return { ctx, p };
}

const pintada = (p) => p.waitForFunction(() =>
  document.querySelectorAll('#ticker-pista .ticker__item').length > 0
  && Boolean(document.querySelector('.ticker__frescura__texto')?.textContent),
  null, { timeout: 45000 });

(async () => {
  const navegador = await chromium.launch();
  const errores = [];

  /* ── 1 · Sustitución en el sitio, en los dos ítems, sin coste de alto ── */
  {
    const { ctx, p } = await conCambio(navegador);
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await pintada(p);

    const antes = await p.evaluate(() => {
      const items = [...document.querySelectorAll('#ticker-pista .ticker__item')];
      return {
        alto: document.getElementById('ticker-mercado').getBoundingClientRect().height,
        porClave: items.filter((i) => i.dataset.clave === items[0].dataset.clave).length,
        clave: items[0].dataset.clave,
        valor: items[0].querySelector('.ticker__valor').textContent,
      };
    });

    t('cada valor está dos veces: el original y el del bucle',
      antes.porClave === 2, `«${antes.clave}» aparece ${antes.porClave} vez(ces)`);

    /* `esperarCambio` vuelve en cuanto el texto es otro, que es el final del
       primer tramo: el segundo sigue corriendo. Se mide AHÍ, con la sustitución
       en marcha, y no solo en reposo.

       Medir solo antes y después no afirma nada: una animación que moviera la
       caja únicamente mientras dura —un margen, un relleno, un alto— empujaría
       el árbol 200 ms cada 20 s y volvería a su sitio antes de que nadie mirase.
       Se comprobó: con un `margin-block-start` dentro del fotograma, la
       comprobación de antes pasaba en verde. */
    await esperarCambio(p, antes.valor);
    const enMarcha = await p.evaluate(() =>
      document.getElementById('ticker-mercado').getBoundingClientRect().height);
    t('la sustitución no cambia el alto MIENTRAS ocurre',
      Math.abs(antes.alto - enMarcha) < 0.5,
      `en reposo ${antes.alto.toFixed(2)} · durante el cambio ${enMarcha.toFixed(2)}`);

    // La sustitución dura 200 ms: se deja terminar antes de mirar el reposo.
    await p.waitForTimeout(600);

    const despues = await p.evaluate((clave) => {
      const items = [...document.querySelectorAll(`[data-clave="${CSS.escape(clave)}"]`)];
      return {
        alto: document.getElementById('ticker-mercado').getBoundingClientRect().height,
        valores: items.map((i) => i.querySelector('.ticker__valor').textContent),
        marcados: items.filter((i) => i.dataset.cambiado === 'true').length,
      };
    }, antes.clave);

    t('las dos copias del valor dicen lo mismo tras el cambio',
      despues.valores.length === 2 && despues.valores[0] === despues.valores[1]
        && despues.valores[0] !== antes.valor,
      `antes «${antes.valor}» · ahora ${JSON.stringify(despues.valores)}`);

    t('las dos copias quedan marcadas como cambiadas',
      despues.marcados === 2, `${despues.marcados} de 2`);

    t('la sustitución no cambia el alto de la cinta',
      Math.abs(antes.alto - despues.alto) < 0.5,
      `antes ${antes.alto.toFixed(2)} · después ${despues.alto.toFixed(2)}`);
    await ctx.close();
  }

  /* ── 2 · El rótulo distingue cotizado de consultado, en los dos idiomas ── */
  for (const idioma of ['es', 'en']) {
    for (const deMercado of [true, false]) {
      const { ctx, p } = await conCambio(navegador, { deMercado });
      p.on('pageerror', (e) => errores.push(e.message));
      await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
      await p.evaluate((i) => localStorage.setItem('warrants.idioma', i), idioma);
      await p.reload({ waitUntil: 'domcontentloaded' });
      await pintada(p);

      const antes = await p.evaluate(() =>
        document.querySelector('#ticker-pista .ticker__valor').textContent);
      await esperarCambio(p, antes);
      await p.waitForTimeout(400);

      const rotulo = await p.evaluate(() => {
        const f = document.querySelector('.ticker__frescura');
        return { texto: f.querySelector('.ticker__frescura__texto').textContent,
                 deMercado: f.dataset.deMercado, vivo: f.dataset.vivo ?? null };
      });

      /* Las dos formas han de ser DISTINTAS y decir cuál es cuál. Se compara
         contra el diccionario del idioma, no contra una palabra escrita aquí. */
      const esperado = deMercado
        ? { es: 'Cotizado', en: 'Quoted' }[idioma]
        : { es: 'Consultado', en: 'Fetched' }[idioma];
      t(`[${idioma}] con momento ${deMercado ? 'de mercado' : 'de consulta'}, el rótulo lo dice`,
        rotulo.texto.startsWith(esperado) && rotulo.deMercado === String(deMercado),
        `«${rotulo.texto}» · data-de-mercado=${rotulo.deMercado}`);

      /* El punto solo se enciende con hora de mercado. Con hora de consulta,
         encenderlo anunciaría un pulso que nadie ha publicado. */
      t(`[${idioma}] el punto solo se enciende con hora de mercado`,
        deMercado ? rotulo.vivo === 'true' : rotulo.vivo === null,
        `vivo=${rotulo.vivo} con deMercado=${deMercado}`);
      await ctx.close();
    }
  }

  /* ── 3 · Movimiento reducido: sin recorrido, pero el valor cambia ── */
  {
    const { ctx, p } = await conCambio(navegador, { reducedMotion: 'reduce' });
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await pintada(p);

    const antes = await p.evaluate(() =>
      document.querySelector('#ticker-pista .ticker__valor').textContent);
    let llego = true;
    await esperarCambio(p, antes).catch(() => { llego = false; });

    t('con movimiento reducido el valor SÍ se actualiza', llego,
      `se quedó en «${antes}»: el cambio encadenado a `
      + '`animationend` no llega cuando la animación está apagada');

    if (llego) {
      const est = await p.evaluate(() => {
        const i = document.querySelector('#ticker-pista .ticker__item');
        const v = i.querySelector('.ticker__valor');
        return { cambiado: i.dataset.cambiado,
                 animacion: getComputedStyle(v).animationName,
                 opacidad: getComputedStyle(v).opacity };
      });
      t('con movimiento reducido no hay recorrido, pero sí marca',
        est.cambiado === 'true' && Number(est.opacidad) === 1,
        JSON.stringify(est));
    }
    await ctx.close();
  }

  /* ── 4 · Con la pestaña oculta no se pide nada ──
     Una regresión aquí no se ve NUNCA: la pestaña está de fondo por definición.
     Lo que se pierde es una promesa cara — una pestaña abierta toda la noche son
     4.320 peticiones al proveedor que nadie va a mirar.

     `visibilityState` es de solo lectura, de modo que se sustituye su descriptor
     y se despacha el evento a mano. Es exactamente lo que hace el navegador al
     cambiar de pestaña, y es la única forma de provocarlo sin un navegador de
     verdad delante. */
  {
    const ctx = await navegador.newContext({ viewport: { width: 1680, height: 1050 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    let peticiones = 0;
    p.on('request', (r) => {
      if (/\/api\/(radar\/indices|mercado\/cartera)/.test(r.url())) peticiones++;
    });
    await p.goto(`${B}/#/inicio`, { waitUntil: 'domcontentloaded' });
    await pintada(p);
    await p.waitForTimeout(1500);

    const base = peticiones;
    await p.evaluate(() => {
      Object.defineProperty(document, 'visibilityState',
        { get: () => 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Más de una pasada entera: si fuera a pedir, aquí ya habría pedido.
    await p.waitForTimeout(26000);

    t('con la pestaña oculta no se pide nada', peticiones === base,
      `${peticiones - base} peticiones en 26 s de pestaña oculta`);

    const antesVolver = peticiones;
    await p.evaluate(() => {
      Object.defineProperty(document, 'visibilityState',
        { get: () => 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.waitForTimeout(2500);

    /* Y al volver se pide DE INMEDIATO, sin esperar la siguiente pasada: quien
       regresa quiere el dato de ahora, no el de cuando se fue. */
    t('al volver a la pestaña se pide de inmediato', peticiones > antesVolver,
      `${peticiones - antesVolver} peticiones tras volver`);
    await ctx.close();
  }

  t('sin errores de consola', errores.length === 0, errores.slice(0, 3).join(' | '));

  await navegador.close();
  for (const r of R) console.log(`    ${r.ok ? 'OK   ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter((r) => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s) de ${R.length}\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
