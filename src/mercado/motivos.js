'use strict';

/* ============================================================================
   Catálogo de motivos y leyendas del panorama de mercado.

   Mismo patrón que `src/errores.js` y `extraccion/motivos.js`: enumerable, con
   su texto en castellano de reserva —sirve a quien llama por `curl` y a los
   registros—, para que una prueba de paridad exija rótulo en los dos
   diccionarios del cliente.

   El texto ajeno de un proveedor —la razón concreta por la que una petición
   de cotización falló— NO figura aquí: viaja aparte, en `detalle`, sin
   traducir. Misma doctrina que `PROVEEDOR_NO_RESPONDE` en `src/errores.js`.
   ========================================================================= */

/** Grupos en los que se organiza el panorama. Cerrado: no lo decide el proveedor. */
const CLAVES_GRUPO = ['renta-variable', 'volatilidad', 'tipos'];

/** Motivos fijos por los que un instrumento o un cálculo no se publica. */
const MOTIVOS_MERCADO = {
  SIN_DATOS: 'Sin datos de mercado.',
  DOW_JONES_SIN_PROVEEDOR:
    'Ningún proveedor conectado publica el índice. Los símbolos habituales resuelven a otros ' +
    'instrumentos: DJIA devuelve un ETF de covered call y DIA el ETF réplica, no el índice.',
  VIX_VOLATILIDAD_IMPLICITA: 'Volatilidad implícita a 30 días del S&P 500',
  CURVA_INCOMPLETA: 'Requiere los tramos de 2 y 10 años',
  CALIDAD_DIFERIDO: 'Dato consolidado con retraso. La plataforma no dispone de contrato de tiempo real.',
  // Interpola `{estado}`, que resuelve ESTADOS_MERCADO de aquí abajo.
  CALIDAD_FUERA_DE_SESION: 'Estado de la sesión: {estado}. El último precio es el cierre de la sesión anterior.',
};

/** Rótulo de cada estado de sesión, para rellenar el `{estado}` de arriba. */
const ESTADOS_MERCADO = {
  CLOSED: 'Cerrado',
  PRE_MKT: 'Previo a la apertura',
  POST_MKT: 'Posterior al cierre',
  AFTER_HOURS: 'Fuera de horario',
};

/** Leyenda de cada sello de calidad: qué significa y qué no tenemos hoy. */
const LEYENDA_CALIDAD = {
  REAL_TIME: 'Cotización en vivo. La plataforma no dispone hoy de ninguna.',
  DELAYED: 'Dato consolidado con retraso durante la sesión.',
  HISTORICAL: 'Último cierre disponible; el mercado no está en sesión regular.',
  UNAVAILABLE: 'Ningún proveedor conectado resuelve el instrumento.',
};

module.exports = { CLAVES_GRUPO, MOTIVOS_MERCADO, ESTADOS_MERCADO, LEYENDA_CALIDAD };
