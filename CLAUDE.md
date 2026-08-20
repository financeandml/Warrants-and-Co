# CLAUDE.md — Warrants & Co.

## Reglas duras

1. **Nunca inventes datos.** Si un proveedor no publica un dato, se rotula `N/A`;
   si una señal no tiene fuente, se declara pendiente. Prohibido rellenar con ceros,
   medias o estimaciones. Prohibido `Math.random()` para poblar interfaz.
2. **Distingue tres estados siempre**: hay dato · el dato es cero · no hay dato.
3. **Inferencia ≠ hecho.** Toda clasificación viaja con su certeza y su motivo.
4. **Nada de `innerHTML`.** Contenido dinámico con `elemento()` y `textContent`.
5. **CSP estricta**: sin scripts en línea, sin `eval`, sin `onclick=`, sin CDN.
6. **SQL siempre parametrizado.**
7. **No toques `data/warrants.db` ni `data/copias/`** sin avisar antes.
8. **No añadas dependencias** sin pedírmelo y justificarlo.

## Idioma y nomenclatura

El código en español (ficheros, funciones, variables, comentarios). La interfaz
es bilingüe ES/EN por diccionario. Comentarios que expliquen el porqué, no el qué.

## Diseño

Paleta acromática más cuatro tonos semánticos en `estilos.css`. El color nunca es
el único portador de información: toda variación lleva glifo y signo. Usa variables
CSS existentes, nunca un color literal. Tema claro y oscuro. Respeta
`prefers-reduced-motion`.

## Cómo quiero que trabajes

- Cambios mínimos. No reescribas ficheros enteros ni reordenes lo no pedido.
- Antes de un cambio que toque más de dos ficheros, enséñame el plan y espera.
- Al terminar: qué ficheros tocaste y qué compruebo en el navegador.
- Si algo choca con este fichero, dímelo en lugar de obedecer.

## Pruebas de navegador

En `tests/repintado.js` y `tests/derivadas.js`, esperar a que una vista esté lista se
hace **siempre** con `waitForFunction` sobre un nodo que solo existe cuando los datos ya
están pintados —`#cuadro-mando`, `#home-research-cuerpo`, un `tbody` con filas—.

- **Nunca con `waitForTimeout`.** Mide la carga de la máquina, no el programa.
- **Nunca comprobando que la sección «tenga contenido».** Su armazón —títulos, cabeceras
  de tabla— ya la hace no vacía antes de que llegue ningún dato, así que una sección sin
  pintar pasa por «no menciona el ticker» y por «está en el idioma nuevo».
- **Una prueba nueva no vale hasta haberla visto fallar.** Reintroduce el fallo que dice
  cazar y comprueba que lo caza.
- **Lo que se pinta en JavaScript se afirma en los dos idiomas.** Con un solo lado, un
  valor que nunca se repinta puede coincidir por casualidad con el de partida.

El plazo de `waitForFunction` no es una espera: es el límite tras el cual se da por
perdida la condición. Que sea holgado no ralentiza nada —quien cumple, sigue.

**Van tres verdes falsos por esto**, los tres cazados solo al reintroducir el fallo:

1. el bloque de radar pasaba con `repintarRadar()` quitado, porque un bloque que llegaba
   tarde pintaba ya con el diccionario nuevo;
2. lo pintado en JS se afirmaba en un solo idioma, y coincidía con el de partida sin
   repintar;
3. `sinTicker()` daba una cartera por limpia cuando aún no se había pintado nada.
