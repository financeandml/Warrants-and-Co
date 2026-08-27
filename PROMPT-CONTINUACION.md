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
1. E1b: errores de rutas en castellano aunque interfaz en inglés.
   Deuda en src/errores.js:18-32. Ficheros afectados:
   routes/informes.js, routes/noticias.js, routes/mercado.js,
   routes/opciones.js.
2. Beta y correlación sin suelo de muestra.
3. Reetiquetado de noticias al añadir tesis nueva.
4. Fase 5 del multiidioma.
5. Fusionar rediseno a main.

## Instrucción
Lee CLAUDE.md antes de tocar nada. Confirma la rama y el estado del
árbol antes de proponer nada. Plan antes de implementar.
