'use strict';

/**
 * Recursos de identidad corporativa.
 *
 * El logotipo y el banner se sirven desde `public/marca/`. La deteccion es
 * automatica: basta con depositar el fichero con el nombre previsto y la
 * plataforma lo adopta en la siguiente carga, sin tocar codigo ni reiniciar.
 * Si el banner no esta presente, la portada mantiene su fondo grafico propio.
 */

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');

const router = express.Router();

const DIR_MARCA = path.join(__dirname, '..', '..', 'public', 'marca');

// Orden de preferencia por recurso. Gana la primera variante existente.
const RECURSOS = {
  logo: ['logo.svg', 'logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp'],
  sello: ['logo-marca.svg', 'logo-marca.png', 'sello.svg', 'sello.png'],
  banner: ['banner.jpg', 'banner.jpeg', 'banner.png', 'banner.webp', 'banner.avif'],
  // Vídeo de fondo del hero, mudo y en bucle. Mismo criterio de depósito que el
  // resto de `public/marca/`: basta con dejar el fichero, sin tocar código.
  bannerVideo: ['banner.mp4', 'banner.webm'],
};

/** Localiza la primera variante disponible de un recurso. */
function resolver(nombre) {
  for (const fichero of RECURSOS[nombre] ?? []) {
    const ruta = path.join(DIR_MARCA, fichero);
    try {
      const info = fs.statSync(ruta);
      if (info.isFile() && info.size > 0) {
        return {
          url: `/marca/${fichero}`,
          bytes: info.size,
          // La marca de tiempo invalida la cache del navegador al sustituir el fichero.
          version: Math.floor(info.mtimeMs),
          formato: path.extname(fichero).slice(1).toLowerCase(),
        };
      }
    } catch {
      // Variante no presente: se prueba la siguiente.
    }
  }
  return null;
}

router.get('/', (req, res) => {
  const logo = resolver('logo');
  const sello = resolver('sello');
  const banner = resolver('banner');
  const bannerVideo = resolver('bannerVideo');

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    logo,
    sello,
    banner,
    bannerVideo,
    // Ruta y nombres admitidos, para que el equipo sepa donde depositar los ficheros.
    directorio: 'public/marca/',
    nombresAdmitidos: RECURSOS,
  });
});

module.exports = { router, resolver };
