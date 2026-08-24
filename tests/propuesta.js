'use strict';

/* ============================================================================
   Propuesta de ficha a partir de un PDF adjunto — en el navegador.

   Las baterías de extracción comprueban qué se lee de un documento. Ésta
   comprueba lo otro: que **leer no rellena**. Un valor propuesto llega marcado,
   con su página, y no se puede publicar hasta que el analista lo resuelve —lo
   acepta o lo vacía—. Eso no se ve desde Node: hay que abrir el diálogo.

   ═══ La batería levanta su propio servidor ═══

   A diferencia de las demás, ésta **escribe**: publica un informe para
   comprobar que lo aceptado se guarda y lo descartado no. Por eso arranca su
   propia instancia con `WARRANTS_DB` y `WARRANTS_UPLOADS` apuntando a un
   directorio temporal. No es celo: redirigir solo la base deja los adjuntos
   cayendo en `data/uploads`, y una prueba de publicación ya dejó ahí un PDF
   suelto que hubo que ir a buscar por la fecha.

   ═══ Cómo se espera ═══

   Siempre con `waitForFunction` sobre un nodo que solo existe cuando lo pintado
   ya está: una marca de propuesta. Nunca con `waitForTimeout`, que mide la
   carga de la máquina, y nunca comprobando que el diálogo «tenga contenido»:
   el armazón del formulario está ahí desde antes de adjuntar nada.

   ═══ Y en los dos idiomas ═══

   El recorrido entero se repite en castellano y en inglés. Con un solo lado, un
   rótulo que no siguiera al diccionario podría coincidir por casualidad con el
   de partida y pasar por bueno.

       node tests/propuesta.js

   Requiere Playwright. No necesita servidor levantado ni corpus: el informe de
   prueba se arma aquí mismo.
   ========================================================================= */

const { exigirPlaywright } = require('./dependencias');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const { informeDePrueba } = require('./pdf-de-prueba');

const { chromium } = exigirPlaywright('propuesta de ficha desde un PDF');

const RAIZ = path.join(__dirname, '..');
const CLAVE = 'clave-de-la-bateria';

/* Informe con la forma de la casa y una trampa de cada clase: campos que se
   proponen, un rango que no debe rellenar nada, y la sección del resumen, que
   se referencia pero no se copia. */
const PDF = informeDePrueba([
  [
    'A. RESUMEN EJECUTIVO & CONTEXTO DE LA TESIS',
    '1. Ficha de Empresa',
    ['Nombre de la empresa', 'Sintética Corporation'],
    ['Ticker', 'NYSE: $SNTC'],
    ['Sector', 'Healthcare / Biotechnology'],
    ['Sede', 'Austin, Texas, EE. UU.'],
    ['Fecha del informe', '28 de julio de 2026'],
    ['Precio objetivo', '206,00 USD'],
    '2. Resumen ejecutivo y contexto de la tesis',
  ],
  [
    '24. Gestión del Riesgo',
    'Plan de inversión',
    ['Instrumento', 'Acciones $SNTC (NYSE)'],
    ['Precio de entrada', '120,00 USD'],
    ['Stop loss', '102,00 USD'],
    ['Tamaño de posición', '1-3% del portfolio total'],
    /* Este rótulo está aquí a propósito. El take profit liquida posiciones y no
       se propone ni aunque el documento lo nombre; sin la fila, la afirmación
       que lo comprueba pasaría por no haber nada que leer. */
    ['Take profit', '206,00 USD'],
  ],
]);

/** Los nueve campos que este documento propone, en el orden de la ficha. */
const PROPUESTOS = [
  'empresa', 'ticker', 'sector', 'pais', 'fecha_publicacion',
  'precio_objetivo', 'divisa', 'precio_compra', 'stop_loss',
];

const ROTULOS = {
  es: {
    pendiente: 'Sin confirmar', aceptado: 'Aceptado', descartado: 'Descartado',
    aceptar: 'Aceptar', descartar: 'Descartar', publicar: 'Publicar',
    // El informe de prueba tiene la ficha en su primera página; los de la casa,
    // en la cuarta o la quinta según la plantilla. Por eso no se ancla a ella.
    pagina: 'página 1', rotulo: '«Nombre de la empresa»',
    boton: `Revise ${PROPUESTOS.length} propuestas`,
    nota: `Quedan ${PROPUESTOS.length} propuestas sin revisar`,
    defecto: 'Valor por defecto',
  },
  en: {
    pendiente: 'Unconfirmed', aceptado: 'Accepted', descartado: 'Discarded',
    aceptar: 'Accept', descartar: 'Discard', publicar: 'Publish',
    // Las comillas siguen al idioma; el rótulo de dentro, no: es del documento.
    pagina: 'page 1', rotulo: '“Nombre de la empresa”',
    boton: `Review ${PROPUESTOS.length} proposals`,
    nota: `${PROPUESTOS.length} proposals still unreviewed`,
    defecto: 'Default value',
  },
};

// ──────────────────────────── servidor desechable ────────────────────────────

const puertoLibre = () => new Promise((resolver) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolver(port)); });
});

async function levantarServidor(directorio) {
  const puerto = await puertoLibre();
  const proceso = spawn(process.execPath, [path.join(RAIZ, 'server.js')], {
    cwd: RAIZ,
    env: {
      ...process.env,
      PORT: String(puerto),
      HOST: '127.0.0.1',
      WARRANTS_DB: path.join(directorio, 'prueba.db'),
      WARRANTS_UPLOADS: path.join(directorio, 'uploads'),
      WARRANTS_CLAVE: CLAVE,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const base = `http://127.0.0.1:${puerto}`;

  const limite = Date.now() + 20000;
  for (;;) {
    if (proceso.exitCode !== null) throw new Error(`el servidor terminó con código ${proceso.exitCode}`);
    try {
      const r = await fetch(`${base}/api/salud`);
      if (r.ok) break;
    } catch { /* todavía no escucha */ }
    if (Date.now() > limite) throw new Error('el servidor no llegó a responder');
    await new Promise((r) => setTimeout(r, 120));
  }
  return { base, proceso, uploads: path.join(directorio, 'uploads') };
}

// ──────────────────────────────── afirmaciones ────────────────────────────────

let fallos = 0;
let hechas = 0;

function comprobar(rotulo, real, esperado) {
  hechas++;
  if (JSON.stringify(real) === JSON.stringify(esperado)) { console.log(`    ✓ ${rotulo}`); return; }
  fallos++;
  console.log(`    ✗ ${rotulo}\n        esperado: ${JSON.stringify(esperado)}\n        obtenido: ${JSON.stringify(real)}`);
}

const contiene = (rotulo, texto, fragmento) => comprobar(
  rotulo, typeof texto === 'string' && texto.includes(fragmento) ? fragmento : texto, fragmento
);

// ────────────────────────────── recorrido ──────────────────────────────

/** Estado de la marca de un campo y del control que la acompaña. */
const estadoDe = (p, campo) => p.evaluate((c) => {
  const control = document.querySelector(`#form-informe [name="${c}"]`);
  const marca = control?.closest('.campo')?.querySelector('.propuesta');
  return {
    valor: control ? String(control.value) : null,
    clase: marca ? [...marca.classList].find((x) => x.startsWith('propuesta--'))?.slice('propuesta--'.length) : null,
    texto: marca?.querySelector('.propuesta__texto')?.textContent ?? null,
    marcado: control?.dataset.propuesta ?? null,
  };
}, campo);

const estadoBoton = (p) => p.evaluate(() => ({
  texto: document.querySelector('#btn-guardar-informe').textContent,
  apagado: document.querySelector('#btn-guardar-informe').disabled,
  nota: document.querySelector('#extraccion-pendientes').hidden
    ? null : document.querySelector('#extraccion-pendientes').textContent,
}));

const pendientes = (p) => p.evaluate(() => document.querySelectorAll('.propuesta--pendiente').length);

/** Pulsa uno de los dos botones de la marca de un campo. */
const pulsarEnMarca = (p, campo, cual) => p.evaluate(([c, i]) => {
  const marca = document.querySelector(`#form-informe [name="${c}"]`).closest('.campo').querySelector('.propuesta');
  marca.querySelectorAll('button')[i].click();
}, [campo, cual]);

async function abrirConPdf(p, base, idioma) {
  await p.goto(`${base}/#/repositorio`);
  await p.evaluate(([clave, i]) => {
    sessionStorage.setItem('warrants.clave', clave);
    localStorage.setItem('warrants.idioma', i);
  }, [CLAVE, idioma]);
  await p.reload();
  // Un nodo que solo existe con la sección ya pintada.
  await p.waitForFunction(() => document.querySelector('#btn-nuevo-informe'));
  await p.click('#btn-nuevo-informe');
  await p.waitForFunction(() => document.querySelector('#dialogo-informe')?.open);
  return p;
}

async function adjuntar(p) {
  await p.setInputFiles('#campo-ficheros', { name: 'informe-de-prueba.pdf', mimeType: 'application/pdf', buffer: PDF });
  /* Se espera a que la marca exista, no a que el diálogo «tenga contenido»: el
     formulario está pintado desde antes de adjuntar nada. */
  await p.waitForFunction(
    () => document.querySelectorAll('.propuesta--pendiente').length > 0,
    null, { timeout: 30000 }
  );
  /* Se espera a que haya marcas, no a que haya nueve: esperar la cifra exacta
     convierte cualquier discrepancia en un plantón sin diagnóstico, y la cifra
     es justo lo que hay que afirmar y leer cuando falla. */
}

async function recorrido(nav, base, idioma, uploads) {
  const R = ROTULOS[idioma];
  console.log(`\n  ── ${idioma} ──`);
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

  await abrirConPdf(p, base, idioma);
  await adjuntar(p);

  comprobar('se proponen los nueve campos del documento', await pendientes(p), PROPUESTOS.length);

  const empresa = await estadoDe(p, 'empresa');
  comprobar('el valor propuesto llega al campo', empresa.valor, 'Sintética Corporation');
  comprobar('y llega marcado como sin confirmar', empresa.marcado, 'pendiente');
  contiene('la marca dice que está sin confirmar', empresa.texto, R.pendiente);
  contiene('la marca dice de qué página sale', empresa.texto, R.pagina);
  contiene('la marca cita el rótulo del PDF, sin traducir', empresa.texto, R.rotulo);

  const boton = await estadoBoton(p);
  comprobar('no se puede publicar con propuestas sin revisar', boton.apagado, true);
  contiene('el botón dice cuántas quedan', boton.texto, R.boton);
  contiene('y junto a él se dice por qué', boton.nota ?? '', R.nota);

  /* Un rango no rellena nada: se muestra el literal y la página para que el
     analista teclee lo suyo sabiendo de dónde sale. */
  const peso = await estadoDe(p, 'peso_cartera');
  comprobar('un rango deja el campo vacío', peso.valor, '');
  comprobar('y no cuenta como propuesta', peso.clase, 'aviso');
  contiene('pero enseña lo que dice el PDF', peso.texto, '1-3% del portfolio total');

  const resumen = await estadoDe(p, 'resumen_ejecutivo');
  comprobar('el resumen ejecutivo no se copia', resumen.valor, '');
  comprobar('pero se dice dónde está', resumen.clase, 'aviso');

  const takeProfit = await estadoDe(p, 'take_profit');
  comprobar('el take profit no se propone nunca', takeProfit.valor, '');

  // ── resolver: aceptar, vaciar, editar ──
  await pulsarEnMarca(p, 'empresa', 0);
  const aceptada = await estadoDe(p, 'empresa');
  comprobar('aceptar conserva el valor', aceptada.valor, 'Sintética Corporation');
  contiene('y lo dice', aceptada.texto, R.aceptado);
  comprobar('aceptar descuenta una pendiente', await pendientes(p), PROPUESTOS.length - 1);

  await pulsarEnMarca(p, 'stop_loss', 1);
  const descartada = await estadoDe(p, 'stop_loss');
  comprobar('descartar vacía el campo', descartada.valor, '');
  contiene('y lo dice', descartada.texto, R.descartado);

  /* Vaciar a mano tiene que bastar: no puede haber un estado del que solo se
     salga aceptando. */
  await p.fill('#form-informe [name="precio_compra"]', '');
  const vaciada = await estadoDe(p, 'precio_compra');
  comprobar('vaciar a mano también resuelve', vaciada.clase, 'descartada');
  comprobar('y deja el campo vacío', vaciada.valor, '');

  await p.fill('#form-informe [name="precio_objetivo"]', '210');
  const editada = await estadoDe(p, 'precio_objetivo');
  comprobar('editar a mano resuelve como aceptada', editada.clase, 'aceptada');
  comprobar('y respeta lo tecleado', editada.valor, '210');

  comprobar('quedan las que no se han tocado', await pendientes(p), PROPUESTOS.length - 4);

  // ── aceptar el resto y publicar ──
  await p.evaluate(() => document.querySelector('#extraccion-resumen .extraccion__acciones button').click());
  const listo = await estadoBoton(p);
  comprobar('resueltas todas, el botón vuelve a publicar', listo.apagado, false);
  contiene('con su rótulo de siempre', listo.texto, R.publicar);
  comprobar('y la explicación desaparece', listo.nota, null);

  await p.click('#btn-guardar-informe');
  await p.waitForFunction(() => !document.querySelector('#dialogo-informe').open, null, { timeout: 20000 });

  const guardado = await p.evaluate(async () => {
    const r = await fetch('/api/informes?q=SNTC');
    const d = await r.json();
    const i = d.informes[0];
    return i && {
      empresa: i.empresa, ticker: i.ticker, sector: i.sector, pais: i.pais,
      fecha: i.fecha_publicacion, po: i.precio_objetivo, divisa: i.divisa,
      compra: i.precio_compra, stop: i.stop_loss, tp: i.take_profit, peso: i.peso_cartera,
    };
  });
  comprobar('se guarda lo aceptado y nada de lo descartado', guardado, {
    empresa: 'Sintética Corporation', ticker: 'SNTC', sector: 'Salud', pais: 'Estados Unidos',
    fecha: '2026-07-28', po: 210, divisa: 'USD',
    compra: null, stop: null, tp: null, peso: null,
  });

  if (errores.length) { fallos++; hechas++; console.log(`    ✗ errores de consola: ${errores.join(' · ')}`); }
  await ctx.close();
  return guardado;
}

/** Lo tecleado por el analista no lo pisa ninguna propuesta. */
async function respetarLoTecleado(nav, base) {
  console.log('\n  ── lo escrito a mano manda ──');
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await ctx.newPage();
  await abrirConPdf(p, base, 'es');
  await p.fill('#form-informe [name="empresa"]', 'Lo que yo escribí');
  await p.setInputFiles('#campo-ficheros', { name: 'informe-de-prueba.pdf', mimeType: 'application/pdf', buffer: PDF });
  await p.waitForFunction(() => document.querySelectorAll('.propuesta--pendiente').length > 0, null, { timeout: 30000 });

  const empresa = await estadoDe(p, 'empresa');
  comprobar('la propuesta no pisa lo tecleado', empresa.valor, 'Lo que yo escribí');
  comprobar('y no queda pendiente de nada', empresa.clase, 'defecto');
  contiene('pero enseña lo que decía el PDF', empresa.texto, 'Sintética Corporation');
  comprobar('la fecha, prerrellenada por el diálogo, sí se pisa',
    (await estadoDe(p, 'fecha_publicacion')).valor, '2026-07-28');
  await ctx.close();
}

/** El valor por defecto sale de lo que la casa viene haciendo, o no sale. */
async function valoresPorDefecto(nav, base, idioma) {
  console.log('\n  ── valores por defecto de la casa ──');
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await ctx.newPage();
  await abrirConPdf(p, base, idioma);
  await adjuntar(p);
  const analista = await estadoDe(p, 'analista');
  comprobar('con una sola convención en la casa, se ofrece', analista.valor, 'Departamento de Análisis');
  comprobar('marcada aparte de lo leído del PDF', analista.clase, 'defecto');
  contiene('y dicho con todas las letras', analista.texto, ROTULOS[idioma].defecto);

  /* El periodo va por la misma vía, pero con su propia lista en `/vocabularios`.
     Se afirma aparte porque es la única que puede faltar sin que se note: si el
     servidor deja de emitir `periodos`, el analista se sigue ofreciendo y este
     campo queda vacío sin que nada lo denuncie. */
  const periodo = await estadoDe(p, 'periodo');
  comprobar('el periodo también, con su lista propia', periodo.valor, 'Ejercicio 2026');
  comprobar('y marcado igual', periodo.clase, 'defecto');
  await ctx.close();
}

// ─────────────────────────────────── cierre ───────────────────────────────────

(async () => {
  // Se anota antes de arrancar nada: es la referencia contra la que se compara.
  const trabajoAlEmpezar = fs.readdirSync(path.join(RAIZ, 'data', 'uploads')).sort();
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'warrants-propuesta-'));
  let servidor = null;
  let nav = null;
  try {
    servidor = await levantarServidor(directorio);
    console.log(`\n  servidor de prueba en ${servidor.base} · datos en ${directorio}`);

    /* Un informe de partida para que la casa tenga convención de analista y de
       periodo; sin él, el formulario no ofrece valor por defecto, que es lo
       correcto: no hay nada que se venga haciendo. */
    const cuerpo = new URLSearchParams({
      empresa: 'Informe de partida', ticker: 'PART', fecha_publicacion: '2026-01-05',
      analista: 'Departamento de Análisis', periodo: 'Ejercicio 2026',
    });
    const alta = await fetch(`${servidor.base}/api/informes`, {
      method: 'POST',
      headers: { 'X-Clave-Redaccion': CLAVE, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo,
    });
    if (!alta.ok) throw new Error(`no se pudo sembrar el informe de partida (${alta.status})`);

    nav = await chromium.launch();

    await recorrido(nav, servidor.base, 'es', servidor.uploads);
    await recorrido(nav, servidor.base, 'en', servidor.uploads);
    await respetarLoTecleado(nav, servidor.base);
    await valoresPorDefecto(nav, servidor.base, 'es');

    console.log('\n  ── el almacén de documentos ──');
    const enPrueba = fs.existsSync(servidor.uploads) ? fs.readdirSync(servidor.uploads) : [];
    comprobar('los adjuntos van al directorio desechable', enPrueba.length, 2);
    /* Comparación de listas, no de fechas ni de prefijos: lo único que acredita
       que esta batería no ha tocado el directorio de trabajo es que contenga
       exactamente lo mismo que antes de empezar. */
    comprobar('y el directorio de trabajo queda como estaba',
      fs.readdirSync(path.join(RAIZ, 'data', 'uploads')).sort(), trabajoAlEmpezar);
  } catch (err) {
    fallos++;
    console.log(`\n  ✗ la batería no ha podido completarse: ${err.message}`);
  } finally {
    if (nav) await nav.close().catch(() => {});
    if (servidor?.proceso) servidor.proceso.kill();
    fs.rmSync(directorio, { recursive: true, force: true });
  }

  console.log(`\n  ${hechas - fallos}/${hechas} comprobaciones superadas`);
  if (fallos) {
    console.log(`  ✗ ${fallos} fallo${fallos === 1 ? '' : 's'} en la propuesta de ficha\n`);
    process.exit(1);
  }
  console.log('  ✓ extraer sigue siendo proponer\n');
})();
