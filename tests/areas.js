/* ============================================================================
   Las áreas ocultas: la puerta y su anuncio.

   Ocultar un área se expresa en dos caras que tienen que decir lo mismo:

     · el MENÚ deja de anunciarla —`construirNavegacion()` salta las `oculta`—;
     · la PUERTA deja de admitir sus rutas —`SECCIONES`, en `app.js`—.

   Las dos salen hoy de la misma fuente, `rutasVisibles()`, precisamente para que
   no puedan discrepar. Esta prueba afirma que siguen saliendo de ahí. Es la
   regla 9 de CLAUDE.md aplicada al caso que ya falló una vez: «una puerta y su
   anuncio», que se desincronizaron sin que se viera en pantalla.

   Lo que se comprueba, área por área y ruta por ruta, es un SI Y SOLO SI:

       la ruta es navegable  ⟺  su área no está oculta
       la ruta está en el menú  ⟺  su área no está oculta

   El desacuerdo es invisible navegando: un menú sin Radar y una ruta `#/radar`
   que sigue abriendo el Radar se ven los dos perfectamente normales por
   separado. Solo se ve afirmando que concuerdan.

       BASE_PRUEBA=http://127.0.0.1:4174 node tests/areas.js

   No escribe en la base: solo lee. Requiere Playwright y servidor levantado.
   ========================================================================= */
const { exigirPlaywright } = require('./dependencias');

const { chromium } = exigirPlaywright('áreas ocultas: la puerta y su anuncio');
const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4173';

(async () => {
  const navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();

  let ok = 0, fallos = 0;
  const comp = (nombre, real, esperado) => {
    if (real === esperado) { ok++; console.log(`  ✓ ${nombre}`); return; }
    fallos++;
    console.log(`  ✗ ${nombre}`);
    console.log(`      esperado: ${esperado}`);
    console.log(`      real:     ${real}`);
  };

  await p.goto(`${B}/#/inicio`);
  // El menú lo construye `iniciar()`; sin un grupo pintado no hay nada que mirar.
  await p.waitForFunction(() => document.querySelectorAll('#navegacion .nav-grupo').length > 0,
    null, { timeout: 30000 });

  /* El mapa se lee del módulo que lo declara, no se copia aquí. Copiarlo sería
     una tercera fuente del mismo hecho, y esta prueba existe justamente para
     que no haya más de una. */
  const AREAS = await p.evaluate(() => import('/navegacion.js').then((m) => m.AREAS));

  for (const area of AREAS) {
    const visible = !area.oculta;
    const rotulo = `área ${area.clave}${visible ? '' : ' (oculta)'}`;

    // ── El anuncio: el grupo del menú ──
    const hayGrupo = await p.locator(`#navegacion .nav-grupo[data-area="${area.clave}"]`).count() > 0;
    comp(`${rotulo} · ${visible ? 'se anuncia' : 'no se anuncia'} en el menú`, hayGrupo, visible);

    for (const entrada of area.entradas) {
      if (!entrada.ruta) continue;  // Una entrada pendiente no tiene puerta que probar.
      const r = entrada.ruta;

      // ── El anuncio, por ruta: el enlace dentro del grupo ──
      const hayEnlace = await p.locator(`#navegacion .nav-enlace[data-seccion="${r}"]`).count() > 0;
      comp(`${rotulo} · ${r} ${visible ? 'tiene' : 'no tiene'} enlace en el menú`, hayEnlace, visible);

      /* ── La puerta: ¿abre la ruta su sección? ──
         Se mide sobre el panel, no sobre el hash: `irA()` deja el hash intacto
         cuando no reconoce la sección —solo lo reescribe al empujar—, así que
         mirar la barra de direcciones daría por buena una puerta cerrada. Lo que
         decide es qué panel queda visible. */
      await p.goto(`${B}/#/${r}`);
      await p.waitForFunction(() => document.querySelector('[data-seccion-panel]:not([hidden])'),
        null, { timeout: 30000 });
      const abierta = await p.evaluate((ruta) => {
        const panel = document.querySelector(`[data-seccion-panel="${ruta}"]`);
        return Boolean(panel) && !panel.hidden;
      }, r);
      comp(`${rotulo} · #/${r} ${visible ? 'abre su sección' : 'NO abre su sección'}`, abierta, visible);

      // Cerrada la puerta, hay que aterrizar en la portada: un panel en blanco
      // sería tan malo como dejar entrar.
      if (!visible) {
        const enPortada = await p.evaluate(() => {
          const panel = document.querySelector('[data-seccion-panel="inicio"]');
          return Boolean(panel) && !panel.hidden;
        });
        comp(`${rotulo} · #/${r} aterriza en la portada`, enPortada, true);
      }
    }
  }

  console.log(`\n  ${ok} conformes · ${fallos} fallos\n`);
  await navegador.close();
  process.exit(fallos ? 1 : 0);
})();
