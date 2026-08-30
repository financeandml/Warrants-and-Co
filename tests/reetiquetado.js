/* ============================================================================
   Reetiquetado de noticias al añadir o editar una tesis.

   `vincularNoticiasACompania()` (src/noticias/sincronizacion.js) reetiqueta las
   noticias sindicadas ya existentes cuando una tesis nueva o editada las
   menciona: pasan a categoría «Compañía», relevancia «alta» y su ticker se
   añade. Es la contraparte de `detectarValores()`, que hace lo mismo en la
   otra dirección temporal cuando llega una noticia nueva.

   Dos casos:

     A · ALTA. Publicar una tesis con ticker reetiqueta la noticia que lo
         menciona, y la respuesta declara cuántas tocó.

     B · EDICIÓN PARCIAL. `PUT /api/informes/:id` solo con `ticker` —sin
         `empresa`— tiene que seguir emparejando por nombre. La consulta que
         resuelve la fila existente en la ruta solo traía `id`, así que el
         nombre nunca llegaba a `vincularNoticiasACompania()` en una edición
         parcial: el emparejamiento por ticker seguía funcionando y ocultaba el
         fallo, que solo se ve con una noticia que menciona la compañía por
         nombre y no por ticker.

   ESCRIBE EN LA BASE: apúntese siempre a una instancia de pruebas, nunca a
   `data/warrants.db` ni a un servidor arrancado sobre ella.

       S=/tmp/warrants-prueba && mkdir -p $S/subidas
       WARRANTS_DB=$S/prueba.db WARRANTS_UPLOADS=$S/subidas npm run sembrar

       WARRANTS_DB=$S/prueba.db WARRANTS_UPLOADS=$S/subidas \
       WARRANTS_MAX_PETICIONES=100000 WARRANTS_CLAVE=PRUEBA123 PORT=4174 npm start

       BASE_PRUEBA=http://127.0.0.1:4174 CLAVE_PRUEBA=PRUEBA123 WARRANTS_DB=$S/prueba.db \
       node tests/reetiquetado.js

   `WARRANTS_DB` aquí no es para arrancar un servidor —esta prueba no levanta
   ninguno—: es para sembrar directamente las dos noticias sindicadas que el
   API no tiene manera de crear (`POST /api/noticias` da de alta piezas
   `origen = 'manual'`; las de `Investing.com` solo las escribe la sindicación,
   que exige un proveedor real). Es la misma base que la de `BASE_PRUEBA`, y
   por eso tiene que coincidir con el `WARRANTS_DB` con el que se levantó el
   servidor: apuntar a otra sería sembrar donde nadie lee.
   ========================================================================= */
'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const B = process.env.BASE_PRUEBA ?? 'http://127.0.0.1:4174';
const CLAVE = process.env.CLAVE_PRUEBA ?? 'PRUEBA123';
const DB_PATH = process.env.WARRANTS_DB;

const R = [];
const t = (n, ok, d = '') => { R.push({ n, ok: Boolean(ok), d }); };

function sembrarNoticia(db, { titular, fecha }) {
  const info = db.prepare(
    `INSERT INTO noticias (titular, categoria, tickers, relevancia, origen, fecha_publicacion)
     VALUES (?, 'Mercados', '[]', 'normal', 'Investing.com', ?)`
  ).run(titular, fecha);
  return Number(info.lastInsertRowid);
}

async function api(ruta, opciones = {}) {
  const cabeceras = { 'X-Clave-Redaccion': CLAVE, ...(opciones.headers ?? {}) };
  const respuesta = await fetch(`${B}${ruta}`, { ...opciones, headers: cabeceras });
  const datos = await respuesta.json().catch(() => null);
  return { status: respuesta.status, datos };
}

(async () => {
  if (!DB_PATH) {
    console.error('\n  Falta WARRANTS_DB: hace falta para sembrar las noticias sindicadas.\n');
    process.exit(2);
  }

  const db = new DatabaseSync(path.resolve(DB_PATH));
  const hoy = new Date().toISOString().slice(0, 10);

  // Idempotencia: una repasada sin resembrar la base no debe acumular restos
  // de la pasada anterior, o el recuento de reetiquetadas deja de ser fiable.
  db.prepare("DELETE FROM noticias WHERE titular LIKE '%Zylonix%' OR titular LIKE '%Quorvex%'").run();
  db.prepare("DELETE FROM informes WHERE empresa LIKE '%Zylonix%' OR empresa LIKE '%Quorvex%'").run();

  // ── Caso A · alta, emparejamiento por ticker ──
  const idNoticiaA = sembrarNoticia(db, {
    titular: 'Resultados trimestrales impulsan a $ZYLX por encima de lo esperado',
    fecha: hoy,
  });

  const altaForm = new FormData();
  altaForm.append('empresa', 'Zylonix Test Corp');
  altaForm.append('ticker', 'ZYLX');

  const alta = await api('/api/informes', { method: 'POST', body: altaForm });
  t('alta · responde 201', alta.status === 201, JSON.stringify(alta.datos));
  t('alta · declara cuántas noticias reetiquetó',
    alta.datos?.noticiasReetiquetadas === 1, String(alta.datos?.noticiasReetiquetadas));

  const noticiaA = await api(`/api/noticias/${idNoticiaA}`);
  t('alta · la noticia pasa a categoría Compañía',
    noticiaA.datos?.categoria === 'Compañía', String(noticiaA.datos?.categoria));
  t('alta · la noticia pasa a relevancia alta',
    noticiaA.datos?.relevancia === 'alta', String(noticiaA.datos?.relevancia));
  t('alta · el ticker queda vinculado',
    Array.isArray(noticiaA.datos?.tickers) && noticiaA.datos.tickers.includes('ZYLX'),
    JSON.stringify(noticiaA.datos?.tickers));

  // ── Caso B · edición parcial, emparejamiento por nombre ──
  // La noticia menciona la compañía por nombre y en ningún punto el ticker,
  // para que el caso solo pueda superarse si el nombre llega de verdad.
  const idNoticiaB = sembrarNoticia(db, {
    titular: 'Quorvex Analytics amplía su presencia internacional',
    fecha: hoy,
  });

  // Se crea sin ticker: el alta no debe reetiquetar nada todavía, para que la
  // comprobación aísle lo que hace la EDICIÓN parcial y no el alta.
  const creacionForm = new FormData();
  creacionForm.append('empresa', 'Quorvex Analytics Inc');

  const creacion = await api('/api/informes', { method: 'POST', body: creacionForm });
  t('edición · el alta sin ticker no reetiqueta nada',
    (creacion.datos?.noticiasReetiquetadas ?? 0) === 0, JSON.stringify(creacion.datos));

  const idInforme = creacion.datos?.id;
  const edicionForm = new FormData();
  edicionForm.append('ticker', 'QRVX'); // sin `empresa`: el caso que aísla el fallo

  const edicion = await api(`/api/informes/${idInforme}`, { method: 'PUT', body: edicionForm });
  t('edición · responde con éxito', edicion.status === 200, JSON.stringify(edicion.datos));
  t('edición parcial · declara la noticia reetiquetada por nombre',
    edicion.datos?.noticiasReetiquetadas === 1, String(edicion.datos?.noticiasReetiquetadas));

  const noticiaB = await api(`/api/noticias/${idNoticiaB}`);
  t('edición parcial · el nombre de la empresa llega aunque no se reenvíe',
    noticiaB.datos?.categoria === 'Compañía', String(noticiaB.datos?.categoria));
  t('edición parcial · el ticker nuevo queda vinculado por nombre',
    Array.isArray(noticiaB.datos?.tickers) && noticiaB.datos.tickers.includes('QRVX'),
    JSON.stringify(noticiaB.datos?.tickers));

  for (const r of R) console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${r.n}${r.ok ? '' : ` — ${r.d}`}`);
  const fallos = R.filter((r) => !r.ok).length;
  console.log(fallos ? `\n  ${fallos}/${R.length} fallidas\n` : `\n  ${R.length}/${R.length} correctas\n`);
  process.exit(fallos ? 1 : 0);
})().catch((err) => {
  console.error(`\n  ✗ la prueba no ha podido ejecutarse: ${err.message}\n`);
  process.exit(2);
});
