# Contexto completo — Warrants & Co.

Soy el desarrollador de una plataforma de análisis financiero llamada
Warrants & Co. Llevo meses trabajando en ella con Claude y necesito que
me ayudes a continuar exactamente donde lo dejamos.

## Qué es la plataforma
Node.js + Express + SQLite nativo. Cliente sin build ni dependencias.
Sin bundler, sin React, sin CDN. Dos dependencias de producción: express
y multer. Código en español, interfaz bilingüe ES/EN.

## Reglas que nunca se rompen
1. Nunca inventar datos. Sin dato, N/A, nunca cero ni estimación.
2. Tres estados siempre: hay dato, el dato es cero, no hay dato.
3. Nada de innerHTML. Todo con elemento() y textContent.
4. CSP estricta: sin scripts en línea, sin eval, sin CDN.
5. SQL siempre parametrizado.
6. No tocar data/warrants.db sin base aislada.
7. No añadir dependencias sin justificarlo.
8. Cambios mínimos. Plan antes de tocar más de 2 ficheros.
9. Un hecho, una fuente.
10. Toda prueba nueva se ve fallar antes de darla por buena.

## Estado actual
- Rama: rediseno
- Servidor: node --env-file=.env server.js en puerto 4173

## Pendiente por orden
1. ✅ E1b: errores de rutas en castellano aunque interfaz en inglés — cerrado.
   `src/errores.js` amplía el catálogo (SIMBOLO_INVALIDO, SIN_SERIE_HISTORICA,
   los códigos de lectura de PDF); las rutas ya no filtran frase propia en
   `detalle`; `api()` en `public/app.js` traduce por `datos.codigo` desde el
   origen. `node tests/errores.js` en verde.
2. ✅ Beta y correlación sin suelo de muestra — cerrado (`ed5bca6`, 30-ago-2026).
   Entran en `SUELO_POR_CIFRA` de `src/cartera.js` con el mismo suelo que el
   alfa de Jensen del que son insumo.
3. ✅ Reetiquetado de noticias al añadir tesis nueva — cerrado (`36190fc`).
   Alta y edición de tesis llaman a `sincronizacion.vincularNoticiasACompania()`.
4. ✅ Fase 5 del multiidioma — cerrado (`f8556ae`). Ver README.md §Diseño,
   "La deuda de `src/` —fase 5— está saldada".
5. Fusionar rediseno a main. Único ítem vivo de esta lista.

## Instrucción
Lee CLAUDE.md antes de tocar nada. Confirma la rama y el estado del
árbol antes de proponer nada. Plan antes de implementar.
