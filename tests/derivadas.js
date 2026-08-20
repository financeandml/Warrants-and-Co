/* ============================================================================
   Invalidación de las vistas derivadas de los informes.

   Publica una tesis con ticker nuevo desde la interfaz y comprueba que, SIN
   recargar la página, aparece en cartera, compañías, radar, portada y
   catalizadores. Después la retira y comprueba lo contrario.

   ESCRIBE EN LA BASE: apúntelo siempre a una instancia de pruebas.

       BASE_PRUEBA=http://127.0.0.1:4174 CLAVE_PRUEBA=PRUEBA123 node tests/derivadas.js

   Una pasada completa abre unas cinco decenas de peticiones en pocos segundos, y
   varias seguidas superan el límite por minuto que el servidor aplica por IP. No
   es un fallo de la plataforma —ese tráfico no se parece al de una persona—, pero
   desde aquí se ve como una vista que no se actualiza, que es justo lo que esta
   prueba vigila. Levante la instancia con el límite subido:

       WARRANTS_MAX_PETICIONES=100000 PORT=4174 WARRANTS_CLAVE=PRUEBA123 npm start

   Si aun así se topa con el límite, la prueba lo dice por su nombre en vez de
   dejar que aparezca disfrazado de invalidación rota.

   Requiere Playwright, que NO es dependencia del proyecto. Sin él la prueba no
   se ejecuta y termina con error, nunca con un aprobado.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('invalidación de las vistas derivadas');

const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4174';
const CLAVE = process.env.CLAVE_PRUEBA ?? 'PRUEBA123';
const TICKER = 'AMD';
const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

(async () => {
  const b = await chromium.launch();
  // El idioma se fija: la interfaz sigue al del navegador, y esta prueba
  // comprueba rótulos y escribe vocabulario en castellano.
  const p = await (await b.newContext({
    viewport: { width: 1440, height: 950 }, locale: 'es-ES',
  })).newPage();
  const err = [];
  p.on('pageerror', e => err.push(e.message));

  /* Un 429 se ve desde aquí como una vista que no se actualiza —exactamente el
     síntoma que esta prueba persigue—, así que se vigila aparte: vale más una
     línea que nombre la causa que ocho comprobaciones rojas sin explicación. */
  let limitadas = 0;
  p.on('response', (r) => { if (r.status() === 429) limitadas++; });

  /* Se espera por CONDICIÓN, no por reloj.

     Cada vista tarda lo que tarde su fuente —la agenda consulta cadenas de
     opciones y se va a varios segundos—, de modo que un plazo fijo o sobra o se
     queda corto, y cuando se queda corto la prueba falla sin que nada esté mal.
     Ese era el origen de los fallos intermitentes: no medían el programa, medían
     la carga de la máquina.

     El plazo de aquí abajo NO es una espera: es el límite a partir del cual se
     da por perdida la condición. Quien lo agote falla de verdad. */
  const LIMITE = 30000;

  const esperar = async (condicion, arg) => {
    try {
      await p.waitForFunction(condicion, arg, { timeout: LIMITE, polling: 200 });
      return true;
    } catch {
      return false; // lo dirá la comprobación que venga detrás, con su texto
    }
  };

  /** La vista ha cargado y menciona el ticker. */
  const conTicker = (sel) => esperar(([s, tk]) => {
    const el = document.querySelector(s);
    return Boolean(el) && el.innerText.includes(tk);
  }, [sel, TICKER]);

  /* La vista ha cargado y ya NO menciona el ticker.

     «Ha cargado» no puede medirse sobre la sección entera: su armazón —títulos,
     cabeceras de tabla— ya la hace no vacía antes de que llegue ningún dato, de
     modo que una sección todavía sin pintar pasaría por «no menciona el ticker»
     y daría por buena una baja que nadie ha propagado. Por eso se señala aparte
     el nodo que SOLO existe con datos ya pintados. */
  const sinTicker = (sel, listo = sel) => esperar(([s, l, tk]) => {
    const el = document.querySelector(s);
    const pintado = document.querySelector(l);
    if (!el || !pintado || pintado.innerText.trim().length === 0) return false;
    return !el.innerText.includes(tk);
  }, [sel, listo, TICKER]);

  /** La portada está montada: es la que cachea, y sin ella no hay nada que mirar. */
  const portadaMontada = () => esperar(() => ['#ticker-pista', '#home-radar-cuerpo',
    '#home-research-cuerpo', '#home-catalizadores-cuerpo', '#home-signal-cuerpo']
    .every((s) => (document.querySelector(s)?.innerText ?? '').trim().length > 0));

  await p.goto(`${B}/#/inicio`);
  await portadaMontada();

  // Sesión de analista.
  await p.evaluate((c) => sessionStorage.setItem('warrants.clave', c), CLAVE);
  await p.reload();
  await portadaMontada();

  // Estado ANTES, con la portada ya montada (es la que cachea).
  const antesPortada = await p.evaluate(t => document.body.innerText.includes(t), TICKER);
  t('El ticker no está en la portada antes', !antesPortada);

  // ── Alta desde la interfaz, sin recargar en ningún momento ──
  await p.goto(`${B}/#/repositorio`);
  await esperar(() => document.querySelectorAll('#cuerpo-tabla-informes tr').length > 0);
  await p.locator('#btn-nuevo-informe').click();
  await p.waitForSelector('#form-informe [name="empresa"]', { state: 'visible', timeout: 15000 });

  const hoy = new Date().toISOString().slice(0, 10);
  await p.fill('#form-informe [name="empresa"]', 'Advanced Micro Devices, Inc.');
  await p.fill('#form-informe [name="ticker"]', TICKER);
  await p.fill('#form-informe [name="sector"]', 'Tecnología de la información');
  await p.fill('#form-informe [name="pais"]', 'Estados Unidos');
  await p.fill('#form-informe [name="analista"]', 'Departamento de Análisis');
  await p.fill('#form-informe [name="precio_objetivo"]', '300');
  await p.fill('#form-informe [name="precio_compra"]', '200');
  await p.fill('#form-informe [name="take_profit"]', '300');
  await p.fill('#form-informe [name="peso_cartera"]', '4');
  await p.fill('#form-informe [name="fecha_publicacion"]', hoy);
  await p.fill('#form-informe [name="resumen_ejecutivo"]',
    'Tesis de prueba para verificar la invalidación de las vistas derivadas.');
  await p.selectOption('#form-informe [name="tipo_informe"]', { index: 1 }).catch(() => {});
  await p.selectOption('#form-informe [name="recomendacion"]', { index: 1 }).catch(() => {});
  const enCartera = p.locator('#form-informe [name="en_cartera"]');
  if (!(await enCartera.isChecked())) await enCartera.check();

  await p.locator('#btn-guardar-informe').click();
  // El alta cierra el diálogo y repuebla la tabla: se espera a las dos cosas.
  await esperar(() => !document.querySelector('#dialogo-informe')?.open);
  await conTicker('#cuerpo-tabla-informes');

  t('El alta se acepta', await p.locator('#dialogo-informe').evaluate(d => !d.open));
  t('Aparece en el repositorio (sección visible)',
    (await p.locator('#cuerpo-tabla-informes').innerText()).includes(TICKER));

  // ── Sin recargar: se navega a cada vista derivada ──
  const visita = async (ruta, sel, etiqueta) => {
    await p.evaluate(r => { location.hash = '#/' + r; }, ruta);
    await conTicker(sel);
    const texto = await p.locator(sel).innerText();
    t(`Aparece en ${etiqueta}`, texto.includes(TICKER), texto.slice(0, 90).replace(/\n/g, ' '));
  };

  await visita('cartera', '#seccion-cartera', 'CARTERA');
  await visita('companias', '#seccion-companias', 'COMPAÑÍAS');
  await visita('radar', '#seccion-radar', 'RADAR');
  await visita('inicio', '#seccion-inicio', 'PORTADA');
  await visita('catalizadores', '#seccion-catalizadores', 'CATALIZADORES');

  t('Sin errores de consola', err.length === 0, err.slice(0, 2).join(' | '));
  t('Sin rechazos por límite de peticiones', limitadas === 0,
    `${limitadas} peticiones rechazadas con 429 — levante la instancia con ` +
    'WARRANTS_MAX_PETICIONES=100000');

  // ── La baja, por la misma interfaz y el mismo punto único ──
  try {
    await p.evaluate(() => { location.hash = '#/repositorio'; });
    await conTicker('#cuerpo-tabla-informes');
    // Por estructura y no por rótulo: «Editar»/«Edit» cambia con el idioma.
    await p.locator(`#cuerpo-tabla-informes tr:has-text("${TICKER}") .celda-acciones button`)
      .first().click();
    await p.waitForSelector('#btn-eliminar-informe:not([hidden])', { timeout: 15000 });
    p.once('dialog', (d) => d.accept());
    await p.locator('#btn-eliminar-informe').click();
    await sinTicker('#cuerpo-tabla-informes');

    const trasBaja = await p.locator('#cuerpo-tabla-informes').innerText();
    t('La baja lo retira del repositorio', !trasBaja.includes(TICKER),
      trasBaja.slice(0, 90).replace(/\n/g, ' '));

    await p.evaluate(() => { location.hash = '#/cartera'; });
    await sinTicker('#seccion-cartera', '#cuadro-mando');
    const carteraTrasBaja = await p.locator('#seccion-cartera').innerText();
    t('La baja lo retira de cartera sin recargar', !carteraTrasBaja.includes(TICKER),
      carteraTrasBaja.slice(0, 90).replace(/\n/g, ' '));

    await p.evaluate(() => { location.hash = '#/inicio'; });
    await sinTicker('#seccion-inicio', '#home-research-cuerpo');
    const portadaTrasBaja = await p.locator('#seccion-inicio').innerText();
    t('La baja lo retira de la portada sin recargar', !portadaTrasBaja.includes(TICKER),
      portadaTrasBaja.slice(0, 90).replace(/\n/g, ' '));
  } catch (e) {
    t('La baja se completa', false, String(e.message).split('\n')[0]);
  }

  await b.close();
  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter(r => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s)\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
