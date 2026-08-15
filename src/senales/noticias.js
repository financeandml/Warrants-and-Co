'use strict';

/**
 * Señal informativa: piezas recientes que afectan a valores bajo cobertura.
 * Se apoya en el repositorio de noticias ya existente, sin duplicar su lógica.
 */

const { db } = require('../db');

const definicion = {
  clave: 'noticias',
  titulo: 'Noticias',
  familia: 'Información',
  descripcion: 'Actualidad vinculada a los valores en cobertura',
  destino: '#/noticias',
};

async function calcular({ universo = [] } = {}) {
  // Piezas cuyo titular menciona un valor bajo cobertura, marcadas en la ingesta.
  const filas = db
    .prepare(
      `SELECT id, titular, tickers, fuente, categoria, fecha_publicacion, momento_publicacion, url_fuente
       FROM noticias
       WHERE tickers <> '[]'
       ORDER BY COALESCE(momento_publicacion, fecha_publicacion) DESC
       LIMIT 8`
    )
    .all();

  const lecturas = filas
    .map((f) => {
      let tickers = [];
      try { tickers = JSON.parse(f.tickers ?? '[]'); } catch { tickers = []; }
      if (!tickers.length) return null;
      return {
        ticker: tickers[0],
        tickers,
        // Lectura cualitativa: es un titular, no una medición. Se declara sin
        // valor numérico en lugar de omitir el campo, que llegaría al cliente
        // como «undefined».
        valor: null,
        tipo: 'cualitativa',
        noticiaId: f.id,
        titular: f.titular,
        detalle: f.fuente ?? f.categoria,
        momento: f.momento_publicacion ?? f.fecha_publicacion,
        enlace: f.url_fuente,
        sentido: 'neutro',
      };
    })
    .filter(Boolean)
    .filter((l) => !universo.length || universo.includes(l.ticker));

  if (!lecturas.length) {
    // El repositorio funciona; simplemente no hay piezas sobre la cartera todavía.
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM noticias').get();
    return {
      disponible: false,
      motivo: total
        ? 'Sin noticias sobre valores en cobertura'
        : 'Repositorio de noticias vacío',
      lecturas: [],
    };
  }

  return { disponible: true, lecturas, destacada: lecturas[0] };
}

module.exports = { ...definicion, calcular };
