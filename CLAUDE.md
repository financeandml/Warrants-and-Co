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
7. **No toques `data/warrants.db` ni `data/copias/`** sin avisar antes. Tampoco
   levantes un servidor contra ellas: basta con que corra para que SQLite vuelque
   el WAL y el fichero cambie. Toda prueba que escriba va contra base aislada —la
   línea de arranque está en «Pruebas que escriben».
8. **No añadas dependencias** sin pedírmelo y justificarlo.
9. **Un hecho, una fuente.** Cuando dos cosas expresan el mismo hecho —una cifra y su
   rótulo, un total y sus partes, una puerta y su anuncio—, salen de la misma fuente y
   hay una prueba que afirma que concuerdan. **Van tres fallos así, y los tres eran
   invisibles en pantalla**: el total de la cartera contra la suma de sus contribuciones,
   la leyenda del gráfico contra el titular, y la puerta de un suelo de muestra contra el
   rótulo que anunciaba cuándo se abriría. Cada cifra por separado era verosímil; el
   desacuerdo solo se ve afirmándolo.

## Idioma y nomenclatura

El código en español (ficheros, funciones, variables, comentarios). La interfaz
es bilingüe ES/EN por diccionario. Comentarios que expliquen el porqué, no el qué.

## Diseño

Base acromática, **tres tonos direccionales** —alza, baja, aviso— y un **índigo** que es
identidad y significado a la vez. Usa variables CSS existentes, nunca un color literal.
Respeta `prefers-reduced-motion`.

**La interfaz solo se sirve en claro.** Decisión de producto: sin conmutador y sin seguir
`prefers-color-scheme`, `public/tema.js` fija `data-tema="claro"` siempre. El sistema de
tokens de `:root[data-tema="oscuro"]` sigue en `estilos.css` y `tests/paleta.js` lo sigue
verificando —se conserva como reserva del sistema de diseño, no como deuda—, pero hoy
ningún visitante lo ve.

**1 · El color nunca carga solo.** Ningún dato depende solo del color: toda variación
lleva glifo (▲ ▼) y signo explícito; toda señal, rótulo. La plataforma se lee impresa en
blanco y negro y con cualquier daltonismo. Esta cláusula no ha cambiado y no se negocia.

**2 · El índigo significa siempre lo mismo.** No es un acento decorativo con un semántico
azul al lado: es **un solo token**. En cromo —cabecera, navegación, foco, botón primario,
carga— es identidad; en un dato es **información neutra, sin dirección**. Las dos cosas
son el mismo hecho —la plataforma hablando sin apuntar a ningún lado— y por la regla 9
salen de la misma fuente: `--acento`. **No existe `--informativo` aparte**; un segundo
azul sería justo el color que esta cláusula impide. La dirección la llevan los otros
tres, y solo ellos.

El marcador de sección —`.etiqueta-superior`, el rótulo pequeño sobre cada `h1`— salió de
esta lista: decisión de producto explícita, revertida a propósito. Ningún rótulo superior
vuelve a llevar `--acento`; se queda en `--tinta-mate`, igual que cualquier otro texto
editorial. No es un hueco para colar el acento ahí «porque total, es cromo»: quien lo haga
estaría deshaciendo la decisión, no completándola.

**3 · Distancia mínima entre tonos con significado: ΔE2000 25.** En los dos temas, y
`tests/paleta.js` lo afirma. Se escribió primero en grados de tono —45°— y estaba mal: el
grado está comprimido en la zona azul y estirado en la roja, de modo que denunciaba a rojo
contra ámbar, que distan 39° y se distinguen de sobra, y habría absuelto casos peores.
ΔE2000 mide diferencia **percibida**, que es lo que la cláusula siempre quiso decir. El
umbral cae en un hueco ancho y está puesto entre sus dos anclajes, no ajustado a ninguno:

| | ΔE2000 |
|---|---|
| El caso que motivó la cláusula: el índigo contra el azul semántico retirado | 10,8 · 14,7 |
| **Umbral** | **25** |
| El par legítimo más ajustado: baja contra aviso | 29,4 · 34,8 |

Es la regla 9 en color: dos cosas parecidas que nadie afirmaba que fueran distintas.

**4 · El contraste se mide, no se mira.** Todo token que componga texto llega a **4.5:1**
sobre su superficie en ambos temas, y `tests/paleta.js` lo afirma. Hay cifra que explica
por qué no basta el ojo: **#6366F1 da 4.47:1 sobre blanco y 4.38:1 sobre `#0c0c0d`** —se
queda corto por centésimas en los dos, que es el peor sitio donde quedarse: pasa la
inspección visual y falla la auditoría—. Por eso el índigo vive en tres valores:

| token | claro | oscuro | para qué |
|---|---|---|---|
| `--acento` | `#4F46E5` · 6,29:1 | `#818CF8` · 6,55:1 | texto, iconos, foco |
| `--acento-pleno` | `#6366F1` | `#6366F1` | rellenos y tipografía grande, **nunca texto corrido** |
| `--acento-tenue` | `rgba(99,102,241,.09)` | `rgba(99,102,241,.13)` | fondos de tarjeta y halos |

`#6366F1` es el tono de la marca; `--acento` es lo que se lee. De él derivan `--foco`
—que se decía `var(--tinta)` en diez reglas sueltas, diez sitios donde olvidarlo— y nada
más: `tests/paleta.js` afirma que el foco es *exactamente* el acento y no una copia suya.

**5 · Movimiento.** Con `prefers-reduced-motion: reduce`: sin parallax, sin cursor
personalizado, sin barrido en la carga, y todo en su **estado final, nunca oculto**. El
cursor personalizado existe solo bajo `@media (pointer: fine)` —en táctil no hay puntero
que sustituir— y no sustituye nunca al foco de teclado.

**6 · Escala tipográfica: ocho pasos, cero literales.** `--tipo-0` (0.6875rem) a
`--tipo-7` (`clamp(2.2rem, 5vw, 3.6rem)`), pasos cortos donde vive el dato —11 · 12 · 13 ·
15px— y saltos grandes solo hacia la jerarquía editorial (h2, h1, display del hero), para
que la tabla nunca compita en tamaño con el titular. `--tipo-6` y `--tipo-7` son los
`clamp()` de h1 y del display del hero que ya existían.

| token | valor | uso |
|---|---|---|
| `--tipo-0` | 0.6875rem | cabeceras de tabla, timestamps, tickers |
| `--tipo-1` | 0.75rem | cuerpo de tabla, cinta |
| `--tipo-2` | 0.8125rem | cuerpo de UI por defecto |
| `--tipo-3` | 0.9375rem | cuerpo de tarjeta, lead de noticia |
| `--tipo-4` | 1.0625rem | título de tarjeta, h3 |
| `--tipo-5` | 1.375rem | h2, cabecera de sección |
| `--tipo-6` | `clamp(1.75rem, 3.4vw, 2.55rem)` | h1 |
| `--tipo-7` | `clamp(2.2rem, 5vw, 3.6rem)` | display del hero |

**Excepción documentada: `--tipo-indicador-principal`.** La cifra grande de
`#resumen-portfolio` en Cartera —el único indicador principal de la sección— mide, medido
en navegador antes de decidir, `clamp(2.6rem, 6vw, 4.2rem)`: 41,6–67,2px. No encaja en la
escala de ocho pasos —su mínimo ya supera el máximo de `--tipo-6` y su techo rebasa el de
`--tipo-7`—, y forzarla a cualquiera de los dos la recortaría o la estiraría sin motivo.
Vive en su propio token, nombrado, en vez de como un `clamp()` suelto: mismo criterio que
`--mov-sale-cinta` en la cláusula 8, una excepción con nombre y no un literal sin rastro.

**Regla verificable:** todo `font-size` en `estilos.css` referencia `var(--tipo-N)` o una
excepción nombrada de la lista de arriba; cero literales sueltos fuera de ella.
`tests/paleta.js` recorre el CSS y lo afirma.

**7 · Densidad: dos niveles, cuatro números cada uno.** Densidad no es un adjetivo de la
fila, es una medida de la fila. Se aplica con `data-densidad="compacta"` o `"comoda"` en
la raíz de la sección o tabla, nunca ad hoc por componente.

| token | fila `min-height` | `padding-block` de celda | `font-size` | `line-height` |
|---|---|---|---|---|
| `--densidad-compacta` | 30px | 5px | `--tipo-1` | 1.3 |
| `--densidad-comoda` | 44px | 10px | `--tipo-2` | 1.5 |

**Criterio de densidad por sección, para aplicarlo tú mismo el día que llegue una
sección nueva** —dos preguntas, en este orden:

1. ¿Se escanea muchas veces al día para comparar valores entre sí, o se lee una vez de
   principio a fin? Comparar → compacta. Leer → cómoda.
2. ¿El contenido es el dato en sí —una cifra, un precio, un delta— o un envoltorio
   narrativo alrededor del dato —un titular, una entradilla, un párrafo—? El dato en sí
   → compacta. El envoltorio → cómoda.

Cuando las dos preguntas empatan —una tabla que también lleva una frase explicativa por
fila— la fila de dato va compacta y el texto que la acompaña conserva su propio `--tipo`
de lectura: la densidad se decide por elemento, no por sección entera, cuando la sección
mezcla ambos. Aplicado hoy: hero cómodo, cinta compacta, noticias con cuerpo cómodo y
metadato compacto. Cartera dejó de ser compacta con la recomposición institucional: su
tabla de posiciones fija su propio relleno y no declara densidad —ver más abajo—.

**Excepción documentada: `#tabla-serie` va cómoda.** Es una tabla de datos —por la
cláusula 2 diría compacta—, pero se abre puntualmente con "Ver datos" y casi nadie la
escanea a diario: el criterio de la cláusula 2 pesa la frecuencia de uso, no solo la
naturaleza del dato, y aquí gana la frecuencia. No es una relajación sin motivo ni un
hueco para colar otra tabla en cómoda por comodidad: quien la vea y la "corrija" a
compacta sin leer esto estaría deshaciendo una decisión, no arreglando un olvido.

**`.tabla-posiciones` ya no declara densidad, y no es una excepción: está fuera de la
cláusula.** Llevaba `data-densidad="compacta"` con una excepción escrita aquí que la
autorizaba a medir ~42px en vez de ≤34px. La recomposición institucional de Cartera
retiró el atributo: la tabla fija su propio relleno (12px por celda, 16px en la fila de
Total) y sus filas miden ~63px —medido en navegador, 62,9–63,9px, igual a 1280px que a
1440px—, porque la primera columna apila el nombre de la compañía y, debajo, «ticker ·
sector», y la de precio de referencia añade su procedencia debajo de la cifra. No se
sustituye por una excepción nueva —una excepción solo hace falta cuando algo declara
una densidad y la incumple, y aquí no se declara ninguna—. Quien vuelva a ponerle
`data-densidad` está sujeto otra vez al tope de la cláusula y tendrá que resolver esas
dos líneas o justificar la excepción entonces.

**Regla verificable:** para todo elemento con `data-densidad="compacta"`, una fila real
pintada mide `getBoundingClientRect().height` ≤ 34px; `"comoda"` mide ≥ 40px.
`tests/repintado.js` lo afirma en el navegador sobre las tablas que declaran densidad,
esperando con `waitForFunction` sobre el `tbody` con filas. Hoy la única que la declara
es `#tabla-serie` (cómoda): la parte de compacta se cumple sin nadie a quien medir, y se
reactiva sola en cuanto una tabla vuelva a declararla.

**8 · Vocabulario de movimiento: tokens fijados, no inventados.** Dos curvas nuevas, sin
fork paralelo de `--transicion` (140ms ease, que sigue siendo hover/color):

```css
--mov-entrada: cubic-bezier(0.23, 1, 0.32, 1);     /* entradas/salidas — ease-out fuerte */
--mov-estado:  cubic-bezier(0.77, 0, 0.175, 1);    /* cambios de estado en pantalla */
```

Anima: la cinta se traslada (`translateX` `linear`, continuo) y, al refrescar un valor,
lo saca y lo entra como un panel de salidas —`transform`+`opacity`, nunca layout, con
sus propias curvas: ver la excepción de abajo—; el hover de fila (`--transicion`, tras
`@media (hover: hover) and (pointer: fine)`), el modal de tesis y las tarjetas de
noticia al filtrar (`scale(0.97)+opacity`, `--mov-entrada`, 200–300ms, sale por el mismo
camino), las métricas del hero al entrar en el viewport —contador ascendente disparado por
`observarEntrada()`, `--mov-entrada`, 200ms, una vez por visita: ver la excepción de
abajo—.

No anima, explícitamente: reordenar o filtrar cartera o cotizaciones —se repinta al
instante, es dato que el usuario lee para decidir—; ningún contador ascendente en cifras
que se repintan en cada visita o refresco —**salvo la excepción documentada de las tres
métricas del Hero, más abajo**—; cursor personalizado en el hero; pausa o rebote del
marquee al pasar el ratón —no hay gesto que justifique un spring—.

**Revocación documentada: parallax en el fondo del Hero.** La prohibición decía "parallax
[...] en el hero —ya prohibido por la cláusula 5—", y era una lectura floja de esa
cláusula: la 5 solo obliga a que el parallax se retire con `prefers-reduced-motion:
reduce`, en cualquier sitio de la plataforma, no a que el Hero no lleve ninguno. Pedido
explícitamente después de flagearlo como conflicto: `.manifiesto__imagen`/
`.manifiesto__video` llevan un parallax nativo por `animation-timeline: view()`, con
`animation-range: cover 0% cover 100%`, que traslada el fondo una fracción de su propio
alto mientras la sección cruza el viewport —el texto y los botones del Hero no lo
acompañan, de ahí la sensación de profundidad—. Convive con el zoom de entrada de arriba
sin pelearse por la misma propiedad: el zoom anima `scale` y el parallax anima `translate`
—las dos son propiedades de transformación independientes de CSS Transforms Level 2, no
la abreviatura `transform`—, así que ninguna sobrescribe a la otra. Sigue dentro de
`@media (prefers-reduced-motion: no-preference)`: con movimiento reducido el fondo se
queda quieto, igual que en cualquier otro parallax de la casa (Vitrina de tesis). Quien
retome la prohibición general de parallax en el Hero debería revertir este párrafo
explícitamente, no dar por hecho que la cláusula 5 ya lo cubre —la lectura que motivó
esta revocación es la prueba de que no es evidente por sí sola.

**Excepción documentada: el cambio de valor en la cinta.** No usa `--mov-entrada` ni
`--mov-estado`, y no es un olvido. `ticker-valor-sale`/`ticker-valor-entra`
(`estilos.css`) mueven el valor viejo hacia arriba y el nuevo desde abajo, como un panel
de salidas de aeropuerto, con el par acelerar/decelerar asimétrico de Material Motion:

```css
--mov-sale-cinta:  cubic-bezier(0.4, 0, 1, 1);     /* el valor que se va — acelera */
--mov-entra-cinta: cubic-bezier(0, 0, 0.2, 1);     /* el valor que llega — decelera */
```

`--mov-entrada` es una sola curva simétrica pensada para un elemento que entra O sale;
aquí entran y salen dos cosas a la vez, en direcciones opuestas, y la asimetría entre
"acelera saliendo" y "decelera llegando" es lo que vende el efecto de panel mecánico.
Forzar las dos mitades a `--mov-entrada` aplanaría el efecto a un fundido genérico — un
paso atrás en el detalle disfrazado de cumplimiento de la regla. Sigue habiendo cero
literales sueltos: las dos curvas viven en variables con nombre, documentadas aquí y en
el propio CSS, y la regla verificable de abajo las admite explícitamente.

**Excepción documentada: el contador de las tres métricas del Hero.** Rentabilidad 2026,
S&P 500 · SPY y Rentabilidad total sí llevan `contarHasta()` —el mismo contador ascendente
que ya usa la puntuación de W&C Signal en su modal (`inicio.js`)— pese a que la cifra que
cuentan se repinta en cada visita, que es justo el caso que la prohibición general excluye
por nombre. No es la misma situación que esa prohibición cubre: la prohibición existe
contra un contador que sugiera movimiento en vivo sobre un dato que no se mueve en vivo
—una cifra que se repinta con cada refresco periódico, animada como si acabara de cambiar
cuando en realidad solo se ha vuelto a pedir—. Las tres del Hero no tienen refresco
periódico —`pintarMetricasHero()` se llama una sola vez, al montar la portada, y el sondeo
de 20s de la cinta las excluye explícitamente (`app.js`, comentario junto a
`programarRefrescoCinta()`)—, así que el contador no puede disparar dos veces ni sugerir un
cambio que no ocurrió: cuenta una vez, al entrar en el viewport (`observarEntrada()`),
exactamente como el de W&C Signal. Son además las tres cifras que la portada presenta con
más peso editorial —la casa hablando más alto, ya lo dice la cláusula 6—, y ese es el
mismo criterio que ya sostiene al contador existente. Quien active este contador en un
futuro refresco periódico de estas cifras —si algún día lo hubiera— estaría reintroduciendo
el caso que la prohibición general prohíbe, no extendiendo esta excepción.

**Excepción documentada: las diez celdas del resumen de capital de Cartera.** Llevan un
contador que corre cuando —y SOLO cuando— la cifra cambió de verdad entre dos sondeos
reales (`pintarCifraIndicador()`, `app.js`), pedido y confirmado de forma explícita: quería
las cifras "en vivo y en directo", sin depender de recargar la página. Es la situación
inversa a la que la prohibición general nombra, no una segunda instancia de ella. La
prohibición existe contra un contador que sugiera movimiento sobre un repintado que NO
cambió nada —de ahí que las tres del Hero, arriba, se limiten a no tener refresco
periódico—; aquí el refresco periódico existe a propósito
(`programarRefrescoCartera()`, cada `REFRESCO_MS` mientras la sección está abierta y la
pestaña visible) y el contador solo se dispara si el número de después es distinto del de
antes: la primera pintura de cada celda, y cualquier repintado que traiga el mismo valor
—incluido el que dispara un cambio de idioma, que repinta desde lo ya guardado—, se
escribe de golpe, sin animación. El contador no anima el refresco: anima el cambio, y sin
un cambio real no corre. Quien lo dispare en cada repintado sin comparar contra el valor
anterior —quitando la comparación de `pintarCifraIndicador()`— estaría reintroduciendo el
caso que la prohibición general prohíbe.

**Excepción documentada: el zoom de entrada de la foto del Hero.** `.manifiesto__imagen` y
`.manifiesto__video` entran a `scale(1.05)` y se asientan en `scale(1)` en 900ms con
`var(--mov-entrada)` (`estilos.css`), disparado una sola vez cuando `cargarMarca()`
(`app.js`) quita `hidden` tras precargar el fichero real. No es el parallax que esta
cláusula prohíbe por nombre para el Hero: el parallax liga la posición al recorrido de
scroll y se repite en cada píxel que el usuario baja o sube; este zoom no escucha el
scroll en absoluto —corre una vez, al montar, y termina— y es del mismo género que la
entrada de un modal (cláusula 8, más arriba) o que el barrido del trazado de
`dibujarSerie()` en `inicio.js`: una transición de llegada puntual, no un recorrido
continuo atado a la posición de la página. La prohibición existe contra el efecto que
convierte el gesto de leer en una fuente de movimiento —el mismo scroll que usa el
visitante para avanzar mueve también la foto—; aquí el visitante no controla nada del
gesto, así que no aplica. Usa `transition-behavior: allow-discrete` + `@starting-style`
—el mismo mecanismo que ya anima la salida de `display:none` en otras piezas de la
Home—, y queda dentro de `@media (prefers-reduced-motion: no-preference)`: con movimiento
reducido la foto aparece directamente en `scale(1)`, sin zoom que retirar porque nunca
llegó a declararse. Quien lo dispare más de una vez por visita, o lo ligue a scroll o a
`IntersectionObserver`, estaría reintroduciendo el parallax que la cláusula prohíbe, no
extendiendo esta excepción.

**Reglas verificables:**

- Toda transición o `@keyframes` de entrada/salida usa `var(--mov-entrada)`,
  `var(--mov-estado)`, o —solo en el cambio de valor de la cinta— `var(--mov-sale-cinta)`/
  `var(--mov-entra-cinta)` —nunca un cubic-bezier aproximado suelto en la regla, nunca
  `ease-in`—; prueba estática sobre `estilos.css`/`app.js` lo afirma.
- Toda fila con `data-densidad="compacta"` mide ≤ 34px y toda fila `"comoda"` ≥ 40px de
  altura real pintada —la misma prueba de la cláusula 7—.
- Ninguna animación de UI declarada dura más de 300ms salvo la lista explícita —modal y
  drawer hasta 500ms—; prueba estática recorre duraciones.
- Con `prefers-reduced-motion: reduce` emulado, la cinta no se desplaza; `tests/repintado.js`
  lo comprueba en navegador real.
- Ningún contenedor de orden de `cartera` o `cotizaciones` lleva `transition`/`animation`
  sobre `transform`; prueba estática afirma su ausencia.

**Tipografía.** Geométrica para titulares, Inter para texto, **monospace del sistema**
para el detalle técnico. `--mono` no lleva fichero propio: un tercer `.woff2` se paga en
la ruta crítica del primer pintado del hero, y la pila del sistema ya es buena en las tres
plataformas. La cadena de respaldo de `--sans` no es decorativa: resuelve ▲ y ▼ —U+25B2 y
U+25BC—, fuera del subconjunto `latin`. Quien la recorte se queda sin las flechas, y
entonces el color pasa a cargar solo, contra la cláusula 1.

## Cómo quiero que trabajes

- Cambios mínimos. No reescribas ficheros enteros ni reordenes lo no pedido.
- Antes de un cambio que toque más de dos ficheros, enséñame el plan y espera.
  **Salvo que yo haya nombrado los ficheros y qué va en cada uno: eso ya es el plan,
  y ya está aprobado.** La regla existe para que no me sorprendas, no para pedir
  permiso dos veces por lo mismo.
- Al terminar: qué ficheros tocaste y qué compruebo en el navegador.
- Si algo choca con este fichero, dímelo en lugar de obedecer.

## Somos dos en esta rama

Dos personas escribimos en `main` a la vez. El detalle está en
[`COLABORAR.md`](COLABORAR.md) —fuente única, no lo repitas aquí—; lo que cambia tu
forma de trabajar es esto:

- **El repositorio se mueve solo.** Un hook baja al abrir sesión y otro sube al cerrar
  la tarea (`.claude/sincronizar.sh` y `.claude/auto-push.sh`). Si al arrancar te
  llegan commits ajenos, míralos antes de editar los ficheros que tocaron: puede que
  lo que ibas a escribir ya no encaje.
- **Commits pequeños, y ahora.** No acumules una tarea entera sin commitear. Con
  rebase, lo caro es tardar.
- **`public/idiomas/es.js` y `public/idiomas/en.js` van SIEMPRE en el mismo commit.**
  Son un hecho contado dos veces, y separarlos deja una clave sin traducir que no se
  ve en pantalla. Es la regla 9 aplicada al caso que más veces se da.
- **Antes de una reforma amplia de `public/app.js`, `public/estilos.css` o
  `public/index.html`, avísame.** Son los tres monolitos y es donde chocamos. No es
  la regla de «más de dos ficheros»: es que ahí puede haber alguien más dentro.
- **Si un hook se para por conflicto, no lo resuelvas por tu cuenta.** Aborta ya lo ha
  hecho él y nada se ha perdido. Dímelo y lo miramos.

## Pruebas de navegador

En `tests/repintado.js` y `tests/derivadas.js`, esperar a que una vista esté lista se
hace **siempre** con `waitForFunction` sobre un nodo que solo existe cuando los datos ya
están pintados —`#cuadro-mando`, `#home-research-cuerpo`, un `tbody` con filas—.

- **Nunca con `waitForTimeout`.** Mide la carga de la máquina, no el programa.

  `tests/repintado.js` no tiene ninguno: las ocho esperas de tiempo que arrastraba se
  convirtieron a condición real, cada una sobre lo que de verdad terminaba de pintarse
  —no todas eran de conmutar idioma, pese a lo que decía aquí antes; había también
  esperas de navegación, de clic en control y de `selectOption`—. Confirmado con diez
  corridas seguidas sin fallo, contra una instancia aislada. El patrón, para la próxima
  vez que haga falta uno:
  - **Repintado por idioma**: no espera nada. `aplicarIdioma()` (`i18n.js`) es síncrona
    de punta a punta —`traducir()`, el evento `idioma:cambiado` y su listener en
    `app.js`— y Playwright ya espera a que ese tick termine antes de resolver `click()`.
  - **Carga async tras navegar**: `vistaPintada()`, ya definida en el propio fichero,
    espera con `waitForFunction` a un nodo que solo existe con datos pintados
    —`#cuerpo-tabla-informes tr`, `.fila-noticia`/`.vacio`—, nunca a que la sección
    «tenga contenido» a secas.
  - **Repintado tras una acción del usuario** (clic, `selectOption`): la propia acción
    suele dejar una marca comprobable —el texto del botón que cambia, una clase
    `.cargando` que se añade y se retira en el `finally` de la carga— y esa marca es la
    condición.
  - Funciones ya escritas para reutilizar en vez de repetir el patrón a mano:
    `vistaPintada`, `compConDatos`, `companiasPintadas`.
  **No se añade ninguna espera de tiempo nueva**, ni aquí ni en ninguna batería.
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

## Pruebas que escriben

`derivadas.js` da de alta y de baja una tesis por formulario. **Nunca contra
`data/warrants.db`**, y tampoco contra un servidor levantado sobre ella: con que el
servidor corra, SQLite vuelca el WAL y el fichero cambia de tamaño y de fecha aunque
no se escriba un solo dato. Instancia aparte, siempre, con su propia base sembrada:

```
S=/tmp/warrants-prueba && mkdir -p $S/subidas
WARRANTS_DB=$S/prueba.db WARRANTS_UPLOADS=$S/subidas npm run sembrar

WARRANTS_DB=$S/prueba.db WARRANTS_UPLOADS=$S/subidas \
WARRANTS_MAX_PETICIONES=100000 WARRANTS_CLAVE=PRUEBA123 PORT=4174 npm start

BASE_PRUEBA=http://127.0.0.1:4174 CLAVE_PRUEBA=PRUEBA123 npm run test:derivadas
```

Las tres variables del servidor hacen falta las tres, y omitir cualquiera no da un
error claro sino una batería roja que parece decir otra cosa:

- **`WARRANTS_CLAVE`** ha de ser la misma que `CLAVE_PRUEBA`. Sin ella el servidor usa
  su clave de serie y responde 401 al alta, que desde la prueba se ve idéntico a una
  invalidación rota. Ya costó dar por rota una batería que estaba sana.
- **`WARRANTS_MAX_PETICIONES`** sube el límite por IP: una pasada abre medio centenar
  de peticiones en segundos y el límite de serie las rechaza con 429, que también se
  ve como una vista que no se actualiza.
- **`WARRANTS_DB` y `WARRANTS_UPLOADS`** aíslan la base y los adjuntos.

Las dos primeras causas las nombra hoy `derivadas.js` en su propia línea. Que las
nombre no las hace opcionales: nombrar la causa evita el diagnóstico equivocado, no
la pérdida de tiempo.

## Términos de oficio: qué se traduce y qué no

**El criterio:** se traduce lo que un analista diría en castellano hablando con otro; se
queda en inglés lo que diría en inglés aunque esté hablando en castellano. **Las siglas
nunca se traducen.** Ante la duda, déjalo en inglés: un término de oficio sin traducir se
entiende, uno traducido a la fuerza suena a manual.

Tampoco se traducen los **nombres de producto** —`W&C Radar`, `W&C Signal`—, que además
no llevan `data-i18n`.

La lista resultante, para no redecidirla cada vez:

| Se traduce | Se queda en inglés |
|---|---|
| Volume → Volumen | Strike |
| Open interest → Interés abierto | Premium |
| Expiration → Vencimiento | IV |
| Days to expiration → Días a vencimiento | Vol/OI |
| Strike distance → Distancia al strike | Trade type |
| Type (call/put) → Tipo | Signal |
| Contracts → Contratos | Unusual activity score |
| Underlying → Subyacente | M&A |

«Distancia al strike» traduce el sustantivo y conserva el término: es exactamente lo que
dice el criterio.
