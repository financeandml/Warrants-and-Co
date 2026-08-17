/* ============================================================================
   Invalidación de las vistas derivadas de los informes.

   Publica una tesis con ticker nuevo desde la interfaz y comprueba que, SIN
   recargar la página, aparece en cartera, compañías, radar, portada y
   catalizadores. Después la retira y comprueba lo contrario.

   ESCRIBE EN LA BASE: apúntelo siempre a una instancia de pruebas.

       BASE_PRUEBA=http://127.0.0.1:4174 CLAVE_PRUEBA=PRUEBA123 node tests/derivadas.js

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
  const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  const err = [];
  p.on('pageerror', e => err.push(e.message));

  await p.goto(`${B}/#/inicio`);
  await p.waitForTimeout(2500);

  // Sesión de analista.
  await p.evaluate((c) => sessionStorage.setItem('warrants.clave', c), CLAVE);
  await p.reload(); await p.waitForTimeout(3500);

  // Estado ANTES, con la portada ya montada (es la que cachea).
  const antesPortada = await p.evaluate(t => document.body.innerText.includes(t), TICKER);
  t('El ticker no está en la portada antes', !antesPortada);

  // ── Alta desde la interfaz, sin recargar en ningún momento ──
  await p.goto(`${B}/#/repositorio`); await p.waitForTimeout(2200);
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
  await p.waitForTimeout(6000);

  t('El alta se acepta', await p.locator('#dialogo-informe').evaluate(d => !d.open));
  t('Aparece en el repositorio (sección visible)',
    (await p.locator('#cuerpo-tabla-informes').innerText()).includes(TICKER));

  // ── Sin recargar: se navega a cada vista derivada ──
  const visita = async (ruta, sel, etiqueta, espera = 6000) => {
    await p.locator(`.nav-enlace[data-seccion="${ruta}"]`).count()
      ? await p.evaluate(r => { location.hash = '#/' + r; }, ruta)
      : await p.evaluate(r => { location.hash = '#/' + r; }, ruta);
    await p.waitForTimeout(espera);
    const texto = await p.locator(sel).innerText();
    t(`Aparece en ${etiqueta}`, texto.includes(TICKER), texto.slice(0, 90).replace(/\n/g, ' '));
  };

  await visita('cartera', '#seccion-cartera', 'CARTERA', 9000);
  await visita('companias', '#seccion-companias', 'COMPAÑÍAS');
  await visita('radar', '#seccion-radar', 'RADAR', 9000);
  await visita('inicio', '#seccion-inicio', 'PORTADA', 9000);
  await visita('catalizadores', '#seccion-catalizadores', 'CATALIZADORES', 9000);

  t('Sin errores de consola', err.length === 0, err.slice(0, 2).join(' | '));

  // ── La baja, por la misma interfaz y el mismo punto único ──
  try {
    await p.evaluate(() => { location.hash = '#/repositorio'; });
    await p.waitForTimeout(3000);
    await p.locator(`#cuerpo-tabla-informes tr:has-text("${TICKER}") button:has-text("Editar")`)
      .first().click();
    await p.waitForSelector('#btn-eliminar-informe:not([hidden])', { timeout: 15000 });
    p.once('dialog', (d) => d.accept());
    await p.locator('#btn-eliminar-informe').click();
    await p.waitForTimeout(6000);

    t('La baja lo retira del repositorio',
      !(await p.locator('#cuerpo-tabla-informes').innerText()).includes(TICKER));

    await p.evaluate(() => { location.hash = '#/cartera'; });
    await p.waitForTimeout(9000);
    t('La baja lo retira de cartera sin recargar',
      !(await p.locator('#seccion-cartera').innerText()).includes(TICKER));

    await p.evaluate(() => { location.hash = '#/inicio'; });
    await p.waitForTimeout(9000);
    t('La baja lo retira de la portada sin recargar',
      !(await p.locator('#seccion-inicio').innerText()).includes(TICKER));
  } catch (e) {
    t('La baja se completa', false, String(e.message).split('\n')[0]);
  }

  await b.close();
  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FALLO'} ${r.n}${r.ok ? '' : ' — ' + r.d}`);
  const mal = R.filter(r => !r.ok).length;
  console.log(mal ? `\n  ${mal} fallo(s)\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(mal ? 1 : 0);
})();
