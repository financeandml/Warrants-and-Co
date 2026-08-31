'use strict';

/**
 * Warrants & Co. — Plataforma de análisis e inversión
 * Servidor de aplicacion: API REST y distribucion del cliente web.
 */

const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const { db } = require('./src/db');
const { ErrorValidacion } = require('./src/validacion');
const { cuerpoError } = require('./src/errores');
const informes = require('./src/routes/informes');
const noticias = require('./src/routes/noticias');
const sincronizacionNoticias = require('./src/noticias/sincronizacion');
const mercadoRutas = require('./src/routes/mercado');
const marca = require('./src/routes/marca');
const radar = require('./src/routes/radar');
const companiasRutas = require('./src/routes/companias');
const catalizadoresRutas = require('./src/routes/catalizadores');
const opcionesRutas = require('./src/routes/opciones');

const app = express();
const PUERTO = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';

/*
 * Clave del area de redaccion. SIN valor por defecto, y a proposito.
 *
 * Antes habia uno escrito aqui. Una credencial en el codigo no es un valor por
 * defecto: es una credencial publicada. Queda en el repositorio, queda en cada
 * copia que alguien clone y —esto es lo que no se deshace— queda en el historial
 * de git aunque se borre de la linea. Y como todo el mundo que lea el fichero la
 * conoce, la puerta de escritura del area de analistas estaba abierta de par en
 * par para cualquiera que hubiese visto el codigo.
 *
 * De modo que el servidor NO ARRANCA sin ella. Negarse es la unica respuesta
 * honesta: caer en una clave conocida es quedarse sin puerta creyendo tenerla, y
 * eso es peor que no tenerla, porque no se nota.
 */
const CLAVE_ANALISTAS = process.env.WARRANTS_CLAVE ?? '';

if (!CLAVE_ANALISTAS) {
  console.error('');
  console.error('  WARRANTS & CO.  ·  el servidor no puede arrancar');
  console.error('  ' + '-'.repeat(58));
  console.error('  Falta WARRANTS_CLAVE, la credencial del area de analistas.');
  console.error('');
  console.error('  No hay valor por defecto a proposito: una clave escrita en el');
  console.error('  codigo queda publicada en el repositorio y en su historial.');
  console.error('');
  console.error('  Genere una y arranque con ella:');
  console.error('');
  console.error('      WARRANTS_CLAVE="$(openssl rand -base64 24)" npm start');
  console.error('');
  console.error('  O deje sus variables en un fichero .env —que .gitignore ya');
  console.error('  excluye— y arranque con:');
  console.error('');
  console.error('      node --env-file=.env server.js');
  console.error('');
  console.error('  Hay una plantilla con todas las variables en .env.example.');
  console.error('  ' + '-'.repeat(58));
  console.error('');
  process.exit(1);
}

app.disable('x-powered-by');
app.set('trust proxy', false);
app.set('etag', false);

// ------------------------------------------------------------ seguridad

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    // El cliente es autocontenido: sin origenes externos, salvo la unica
    // excepcion de img-src. Las noticias llegan del RSS de Investing.com
    // (src/noticias/investing.js) con su propia imagen de portada por
    // <enclosure>, servida desde un subdominio de investing.com que la pieza
    // no fija de antemano -asi que se admite el dominio entero, no un host
    // suelto que dejaria de servir la siguiente noticia sin avisar-. Nada mas
    // se relaja: script-src sigue estricto, que es lo que cierra la via de
    // inyeccion de codigo. style-src admite estilos en linea porque el
    // posicionamiento del emergente del grafico y la anchura de las barras de
    // exposicion se calculan en tiempo de ejecucion; un estilo no ejecuta
    // codigo, de modo que la superficie de riesgo no aumenta.
    "default-src 'self'; img-src 'self' data: https://*.investing.com; " +
      "style-src 'self' 'unsafe-inline'; script-src 'self'; " +
      "connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  );
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Limitacion de ritmo sobre la API: contiene automatismos accidentales sin
// entorpecer el uso normal de la plataforma.
const ventanas = new Map();
const VENTANA_MS = 60_000;
// Límite por IP y minuto. Se deja ajustable por entorno porque las baterías de
// verificación abren decenas de páginas por minuto desde la misma dirección, y
// ese tráfico no se parece al de una persona. El valor de servicio no cambia.
const MAX_PETICIONES = Number(process.env.WARRANTS_MAX_PETICIONES) || 300;

setInterval(() => {
  const ahora = Date.now();
  for (const [clave, v] of ventanas) if (v.reinicio < ahora) ventanas.delete(clave);
}, VENTANA_MS).unref();

app.use('/api', (req, res, next) => {
  const clave = req.ip ?? 'local';
  const ahora = Date.now();
  let v = ventanas.get(clave);
  if (!v || v.reinicio < ahora) {
    v = { conteo: 0, reinicio: ahora + VENTANA_MS };
    ventanas.set(clave, v);
  }
  v.conteo++;
  if (v.conteo > MAX_PETICIONES) {
    res.setHeader('Retry-After', Math.ceil((v.reinicio - ahora) / 1000));
    return res.status(429).json({ error: 'Se ha superado el límite de peticiones. Reintente en unos instantes.' });
  }
  next();
});

/**
 * Area de analistas: el alta y la modificacion de informes —incluidos precio de
 * compra, take profit y stop loss— quedan reservadas a quien acredite la clave.
 */
function exigirCredencial(req, res, next) {
  const remitida = req.get('X-Clave-Redaccion') ?? '';
  const esperada = CLAVE_ANALISTAS;
  const a = Buffer.from(remitida);
  const b = Buffer.from(esperada);
  // Comparacion de duracion constante sobre longitudes iguales.
  const valida = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valida) {
    return res.status(401).json({ error: 'Credencial de analista no válida.', codigo: 'CREDENCIAL_INVALIDA' });
  }
  next();
}

app.post('/api/sesion', (req, res) => {
  const remitida = String(req.body?.clave ?? '');
  const a = Buffer.from(remitida);
  const b = Buffer.from(CLAVE_ANALISTAS);
  const valida = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valida) return res.status(401).json({ error: 'Credencial de analista no válida.' });
  res.json({ autorizado: true });
});

// --------------------------------------------------------------- rutas

// Lectura publica; escritura restringida al equipo.
app.use('/api/informes', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return exigirCredencial(req, res, next);
  next();
});
app.use('/api/informes', informes.router);

app.use('/api/noticias', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return exigirCredencial(req, res, next);
  next();
});
app.use('/api/noticias', noticias.router);

app.use('/api/mercado', mercadoRutas.router);
app.use('/api/marca', marca.router);
app.use('/api/radar', radar.router);
app.use('/api/companias', companiasRutas.router);
app.use('/api/catalizadores', catalizadoresRutas.router);
app.use('/api/opciones', opcionesRutas.router);

app.get('/api/salud', (req, res) => {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM informes').get();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    estado: 'operativo',
    informes: total,
    version: require('./package.json').version,
    momento: new Date().toISOString(),
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Recurso de API no encontrado.' }));

// ------------------------------------------------------------- cliente

app.use(
  express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    setHeaders: (res, ruta) => {
      // Los recursos de marca se piden con huella de version, de modo que pueden
      // cachearse con holgura; sustituir el fichero cambia la huella y se recarga.
      // El resto del cliente evoluciona con la aplicacion y se revalida siempre.
      if (ruta.includes(`${path.sep}marca${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// Aplicacion de pagina unica: cualquier ruta desconocida devuelve el cliente.
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ------------------------------------------------------- gestion de errores

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ErrorValidacion) {
    return res.status(422).json({ error: err.message, codigo: err.codigo, errores: err.errores });
  }

  if (err instanceof multer.MulterError) {
    const mapa = {
      LIMIT_FILE_SIZE: 'DOCUMENTO_DEMASIADO_GRANDE',
      LIMIT_FILE_COUNT: 'DEMASIADOS_DOCUMENTOS',
      LIMIT_UNEXPECTED_FILE: 'CAMPO_FICHERO_INESPERADO',
    };
    const codigo = mapa[err.code] ?? 'DOCUMENTOS_NO_PROCESABLES';
    return res.status(413).json(cuerpoError(codigo));
  }

  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message, codigo: err.codigo });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(cuerpoError('CUERPO_NO_JSON'));
  }

  console.error('[error]', err);
  res.status(500).json(cuerpoError('ERROR_INTERNO'));
});

// ----------------------------------------------------------- arranque

const servidor = app.listen(PUERTO, HOST, () => {
  const url = `http://${HOST}:${PUERTO}`;
  console.log('');
  console.log('  WARRANTS & CO.  ·  Plataforma de análisis e inversión');
  console.log('  ' + '-'.repeat(58));
  console.log(`  Servidor operativo      ${url}`);
  /* La clave NO se imprime. Confirmar que se recibio es util; enseñarla es la
     misma fuga por otra via: la consola acaba en registros, en capturas y en la
     salida de la integracion continua. Se dice su longitud, que basta para ver
     si se paso la que uno creia y no revela cual es. */
  console.log(`  Clave de analistas      definida por entorno (${CLAVE_ANALISTAS.length} caracteres)`);
  console.log('  ' + '-'.repeat(58));
  console.log('');

  // La sindicacion arranca en segundo plano: no retrasa la disponibilidad del servicio.
  sincronizacionNoticias.iniciarSincronizacionPeriodica();
});

servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  El puerto ${PUERTO} está ocupado. Indique otro con: PORT=4174 npm start\n`);
    process.exit(1);
  }
  throw err;
});

// Cierre ordenado: se libera el puerto y se consolida la base de datos.
let cerrando = false;
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    if (cerrando) return;
    cerrando = true;
    console.log('\n  Cerrando el servidor...');
    sincronizacionNoticias.detenerSincronizacion();
    servidor.close(() => {
      try { db.close(); } catch { /* ya cerrada */ }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

module.exports = app;
