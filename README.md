# Warrants & Co. — Market Intelligence

Plataforma local de inteligencia de mercado: research fundamental, posicionamiento,
catalizadores y seguimiento de cartera.

---

## Puesta en marcha

```bash
cd ~/Desktop/Negocios/warrants-co
npm install          # solo la primera vez
npm run sembrar      # constituye la cartera inicial (ORCL, QCOM, IOVA, RDDT)
npm start
```

La aplicación queda disponible en **http://127.0.0.1:4173**

### Clave de analista

El acceso al área de analistas —alta y modificación de informes, incluidos precio de
compra, take profit y stop loss— se acredita con esta clave:

```
WCo-2026-Analistas-K7m4Qx92RtVb
```

Quien la introduce queda identificado como analista de Warrants & Co. y ve aparecer, en
la esquina superior derecha, el rótulo **ANALISTA** con una **luz verde** que confirma la
sesión abierta. La luz se apaga al cerrar sesión.

La clave también se imprime en la consola al arrancar. Para cambiarla:

```bash
WARRANTS_CLAVE=su_nueva_clave npm start
```

La comparación se hace en tiempo constante y la clave nunca viaja en la URL ni queda
registrada en los accesos.

Otras variables de entorno:

| Variable | Efecto | Valor por defecto |
|---|---|---|
| `PORT` | Puerto de escucha | `4173` |
| `HOST` | Interfaz de escucha | `127.0.0.1` |
| `WARRANTS_CLAVE` | Clave del área de analistas | `WCo-2026-Analistas-K7m4Qx92RtVb` |
| `TTL_COTIZACION_MS` | Vigencia de la caché de cotizaciones | `15000` |
| `TTL_HISTORICO_MS` | Vigencia de la caché de series históricas | `1800000` |
| `INTERVALO_NOTICIAS_MS` | Frecuencia de sindicación de noticias | `900000` (15 min) |
| `RETENCION_NOTICIAS_DIAS` | Antigüedad máxima de la sindicación | `60` |
| `OPCIONES_PROVEEDOR` | Proveedor de datos de opciones | `nasdaq` |
| `TTL_OPCIONES_MS` | Vigencia de la caché de cadenas | `300000` (5 min) |
| `RETENCION_OPCIONES_DIAS` | Antigüedad máxima del archivo de opciones | `180` |
| `NOTICIAS_AUTOMATICAS` | `false` desactiva la sindicación automática | activada |

---

## Estructura por áreas

La navegación agrupa la plataforma en cuatro áreas. Las páginas todavía sin
implementar aparecen rotuladas como **Pronto**, en lugar de ocultarse, para que el
alcance del producto quede a la vista.

| Área | Entradas | Estado |
|---|---|---|
| **Market** | Radar · Markets · Institutional positioning | Radar operativo |
| **Research** | Companies · Investment theses · Catalysts · News | Theses y News operativos |
| **Options** | Options flow · Unusual activity · Option chain | Chain y Unusual operativos |
| **Portfolio** | Portfolio · Performance · Thesis tracker | Portfolio operativo |

Activar una entrada consiste en darle `ruta` en `public/navegacion.js`: ni el radar,
ni el cliente, ni las demás secciones necesitan cambios.

---

## El panel de mercado

La portada funciona como cuadro de mando y se compone de ocho bloques:

**1 · Hero** — **La marca es el único texto.** «Warrants & Co.» y tres accesos de igual
peso —radar, repositorio y LinkedIn—, nada más.

La composición no es un descuido: está calculada sobre la fotografía de portada. El
banner tiene una banda de cielo vacía en su 30 % superior, y el bloque se ancla arriba
—`place-items: start center`— para caer justo sobre ella, dejando el árbol y la línea del
horizonte por debajo de los accesos. Un eyebrow y un lema volverían a llenar esa banda y
duplicarían, además, lo que ya dice el manifiesto.

Porque el enunciado no se ha perdido: vive en el **manifiesto**, inmediatamente debajo
—«Market intelligence for investors who think in probabilities» y su entradilla sobre
research fundamental, market intelligence y options analytics—. El hero abre; el
manifiesto explica.

**La cinta de cotizaciones cierra el hero.** Va dentro de él, anclada a su borde
inferior, en fila propia de la rejilla —no en posición absoluta—, de modo que en
pantallas estrechas empuja en lugar de superponerse a los accesos. No es adorno: es lo
único que dice que la página continúa. Un dato vivo cortado por el pliegue invita a bajar
mejor que cualquier flecha, y de paso ocupa el cielo que sobraba bajo los botones.

Sobre la fotografía, la cinta sigue la misma regla que los accesos: manda la paleta de la
portada, no la del tema. También sus tonos semánticos, porque el fondo de la portada es
blanco en ambos temas y el verde y el rojo del tema oscuro —pensados para fondo oscuro—
caían a 2,3:1 y 3,3:1 sobre el velo. Fijados a su versión clara suben a 5,3:1 y 6,4:1.

**Dónde termina el hero.** Al **75,5 %** de la ventana, no al 100 %: antes acababa
exactamente en el pliegue, la fotografía llegaba al borde inferior y no se veía ni un
píxel de lo que sigue, así que la portada se leía como final de página. Lo que cede no es
hueco: es la altura justa para que asomen, ya legibles, la etiqueta del manifiesto y su
primera línea de titular. En una ventana de 900 px de alto asoman 156 px de texto.

> **Esa cifra no es de gusto: sale de una desigualdad.** El manifiesto no pinta su texto
> al cargar, lo revela un `IntersectionObserver` con `threshold: 0.18` y `rootMargin`
> inferior de −60 px (`inicio.js`). El texto que asoma dentro de esos 60 px finales **no
> llega a pintarse**: asomaría una caja vacía, peor que el hueco. Para que la primera
> línea se revele de verdad hace falta
>
> ```
> hero + padding-top + 44 px  ≤  ventana − 60 − 0,18 × alto-de-línea
> ```
>
> y con el hero al 88 % esto exigía **padding negativo**: era imposible, no apretado.
> Bajarlo al 75,5 % y el padding a `7vh` lo cumple con holgura de 700 px de alto en
> adelante. Quien toque una de las dos cifras ha de volver a medir las cuatro alturas
> —700, 844, 900 y 1080—, porque están acopladas.

> **Coste aceptado.** El hero pierde 112 px en escritorio y la cinta pasa a quedar a
> 37 px de la base del árbol, en vez de 150. Se aceptó a conciencia: el texto legible era
> el motivo del cambio, y una primera línea cortada por la mitad de los glifos —que es lo
> que salía conservando más hero— parece un fallo de maquetación, no una invitación.

> La altura se calcula con `calc(75.5svh - var(--alto-cabecera))`. Las dos piezas importan.
> `--alto-cabecera` la mide `seguirAlturaCabecera()` (`portada.js`) con un
> `ResizeObserver`, porque la cabecera es `position: sticky`, ocupa sitio en el flujo y
> **no mide siempre lo mismo**: 69 px en escritorio y 164 px a 390 px de ancho, donde se
> reparte en tres filas —y cambia además al cambiar de idioma, porque los rótulos no
> miden igual—. Y la unidad es `svh`, no `vh`: en un móvil `vh` es la ventana con la
> barra del navegador ya retraída, de modo que al entrar el hero mediría de más y se
> comería la cinta.

> **Residuo retirado.** El hero tuvo lede y fila de acciones. Con ellos se han ido
> `.portada__acciones` (declaración y línea de `@media print`), `.portada__curva` con sus
> fotogramas clave, `.portada__marcador`, la regla `.portada h1 { margin-block }` —que
> pisaba por especificidad el `margin: 0` del hero y le colaba 20 px heredados—, la
> función `componerTitular()` y `dibujarCurva()` con su llamada desde `app.js`. **No
> confundir con `.portada__entradilla`, que sigue viva**: `app.js` la usa para la
> entradilla de las noticias.

**El manifiesto respira distinto arriba que abajo.** `.manifiesto` no lleva
`padding-block` simétrico, sino `padding-top: clamp(44px, 7vh, 104px)` y
`padding-bottom: clamp(88px, 13vh, 156px)`. **Es una decisión, no un descuido: no lo
«arregles» igualando los dos.** Por dos razones, y las dos cuentan:

1. **Editorial.** Arriba no precede un bloque de texto, sino una fotografía a sangre. El
   corte de la imagen ya hace de separación, y un aire simétrico sumaría respiro sobre
   respiro. Abajo sí separa de los pilares, y ahí se conserva el de siempre.
2. **Funcional.** Es una de las dos variables de la desigualdad de arriba. Con el
   `clamp(88px, 13vh, 156px)` simétrico que había, no asomaba ni la etiqueta: caía 26 px
   **por debajo** del pliegue.

Escala con `vh` y no es un número fijo porque la condición depende del alto de la
ventana: un `88px` constante se cumple a 900 px de alto y **falla a 700**, donde la línea
deja de revelarse y vuelve a asomar la caja vacía.

**2 · Fila de cifras** — Cuatro casillas con lo que la cartera **ha hecho**:
rentabilidad del año en curso, rentabilidad total, el índice de referencia en el mismo
periodo y la máxima caída. Debajo, un pie que dice de qué muestra hablan —periodo,
sesiones y cuántas tesis la componen— y lleva a la cartera, donde la conciliación la
desglosa línea por línea.

Va **después de los pilares**, nunca dentro del hero: ahí rompería la desigualdad de las
cuatro alturas, porque lo que asoma bajo el pliegue está medido y es la etiqueta del
manifiesto con su primera línea.

**Lo que la fila no publica.** Ninguna cifra retenida por suelo de muestra —la
anualizada, el Sharpe, el Sortino, el Calmar y el alfa de Jensen—. No es que salgan
vacías: no tienen rótulo en el diccionario, de modo que no hay casilla que llenar, y
`tests/repintado.js` afirma que ninguna de esas palabras aparece en el bloque. Tampoco la
liquidez ni el recuento de posiciones, que son honestos pero dicen **cómo está montada**
la cartera, no qué ha hecho; en una fila de portada se leerían como rendimiento. Viven en
el cuadro de mando, a un clic del pie.

> **Las dos primeras casillas dicen hoy el mismo número, y leen campos distintos.**
> Coinciden porque la cartera nace el 30-ene-2026, dentro del año: no hay cierre anterior
> del que partir, así que ambas miden desde el mismo capital. Es una identidad de la
> aritmética, no una copia.
>
> Que las dos leyeran `rentabilidadTotal` habría dado el mismo resultado en pantalla hoy
> —y **también el 2 de enero de 2027**, cuando ya fuera falso, sin que nada se viera—. Es
> exactamente la forma en que han llegado los tres fallos de fuente única anteriores. De
> ahí que el motor calcule `rentabilidadAnio` aparte, desde el último cierre del año
> anterior cuando lo hay, y que viaje con `anioDesde` y `anioDesdeCapital`: **el rótulo
> dice desde dónde mide y sale de la misma cuenta que la cifra.**
>
> Y de ahí que se afirme en las dos direcciones. `tests/cartera.js` (caso 7) comprueba que
> una serie nacida dentro del año coincide con la total y que **una que cruza un 1 de
> enero se separa**, con la cifra recalculada a mano desde la serie publicada; ninguna de
> las dos sola bastaría, porque la primera la pasa una implementación que copie el campo.
> `tests/repintado.js` comprueba en pantalla la equivalencia —las dos casillas coinciden
> **si y solo si** la del año declara que mide desde el capital—, en los dos idiomas.
>
> Se vio fallar. Con `rentabilidadAnio: redondear(total * 100)` en el motor, el caso 7 cae
> en tres afirmaciones mientras el caso de la serie nacida dentro del año sigue verde.

> **El año no es una cantidad.** `t()` formatea con el locale los parámetros numéricos, y
> el año pasado como número salía «Rentabilidad 2026» en español —que no agrupa cuatro
> dígitos— y **«2,026 return» en inglés**. Viaja como texto. Es un caso más de la regla de
> la casa: lo pintado en JavaScript se afirma en los dos idiomas, porque con un solo lado
> este no se ve.

**3 · Market snapshot** — S&P 500, Nasdaq 100, VIX y bono estadounidense a 10 años.
**Datos reales** resueltos por la cascada de mercado; un índice que no resuelva se
rotula `N/A` con su motivo.

**4 · W&C Radar** — Seis familias de señal. Cada una es un módulo independiente que
declara si tiene fuente:

| Señal | Estado | Origen |
|---|---|---|
| Momentum | **Operativa** | Fuerza relativa a 3 meses frente al S&P 500, derivada de series reales |
| Volatilidad | **Operativa** | Volatilidad realizada anualizada, derivada de series reales |
| Noticias | Operativa cuando hay piezas sobre la cartera | Repositorio de noticias |
| Options flow | Pendiente | Requiere proveedor de cadena de opciones |
| Institutional positioning | Pendiente | Requiere fuente de declaraciones 13F |
| Catalysts | Pendiente | Requiere calendario de eventos corporativos |

**5 · W&C Signal** — Indicador propietario en escala 0–100 sobre siete dimensiones
(Fundamentals, Options flow, Institutional positioning, Catalysts, Valuation,
Momentum, Risk) con sus pesos. **La arquitectura está completa; la puntuación no se
emite.** Mientras falten fuentes, muestra `N/A` y detalla qué le falta a cada
dimensión: preferimos eso a publicar un número que no podamos justificar.

**6 · Portfolio snapshot** — Portfolio return, benchmark, alfa, Sharpe, máxima caída
y volatilidad, más contribuidores y detractores. Reutiliza íntegramente las cifras
que ya calcula el motor de cartera, sin duplicar lógica.

**7 · Upcoming catalysts** — Interfaz de línea temporal preparada. Llega vacía
mientras no haya calendario conectado.

**8 · Latest news** — Titulares del repositorio, sindicados desde Investing.com.

---

## Las cuatro secciones implementadas

**1 · Análisis** — Portada pública. Destaca la selección del comité y las últimas
publicaciones, con buscador por empresa o palabra clave.

**2 · Repositorio** — Catálogo completo. Búsqueda de texto sobre empresa, ticker,
analista, resumen ejecutivo y etiquetas, combinable con filtros por sector, país,
tipo, recomendación, nivel de acceso y rango de fechas. Desde aquí se publican y
editan los informes.

**3 · Noticias** — Actualidad de mercado, macroeconomía y compañías bajo cobertura,
**alimentada automáticamente desde Investing.com**. Búsqueda de texto completo y filtros
por categoría, relevancia, valor relacionado, origen y fecha. Las piezas destacadas
encabezan el bloque de actualidad de la portada.

**4 · Cartera** — Evolución de las posiciones frente a un índice de referencia,
composición detallada con cotización en vivo, posiciones liquidadas y panel de
estadísticos.

---

## Ficha analítica de un informe

Empresa · ticker · sector · país · tipo de informe · periodo · analista ·
recomendación · precio objetivo · divisa · resumen ejecutivo · etiquetas libres ·
nivel de acceso · destacado en portada · incorporación a cartera · peso asignado ·
fecha de publicación.

**Operativa de la posición:** precio de compra · take profit · stop loss. El sistema
valida que el take profit quede por encima del precio pagado y el stop loss por
debajo.

Se admite documentación en **PDF, Word y Excel** (`.pdf`, `.doc`, `.docx`, `.xls`,
`.xlsx`, `.xlsm`), hasta 10 documentos por informe y 25 MB por documento. El tipo se
verifica por extensión **y** por tipo MIME declarado, de modo que una extensión válida
con un tipo que no le corresponde se rechaza; el nombre en disco lo genera el servidor.

**La descarga es pública.** No requiere credencial: cualquier visitante puede obtener
los documentos de un informe. La restricción por perfil llegará con el registro de
usuarios, y se aplicará en ese mismo punto.

### Edición de una tesis

Con la sesión de redacción abierta, el catálogo muestra una columna **Acciones** con un
botón de edición en cada fila; también se puede editar desde la ficha de lectura. El
formulario carga la tesis completa —incluidos precio de compra, take profit y stop
loss—, permite añadir o retirar documentos y guarda mediante modificación parcial, de
modo que los campos que no se tocan conservan su valor y los documentos ya adjuntos se
mantienen.

### Propuesta de ficha a partir del PDF

Al adjuntar un PDF en el alta, la plataforma lo lee y **propone** la ficha. Propone, no
rellena: cada valor llega al formulario marcado como sin confirmar, con la página de la
que sale y el rótulo del documento que lo respalda, y **no se puede publicar mientras
quede uno sin resolver**. El botón dice cuántos quedan y cuáles, porque un botón apagado
sin explicación es una pared y no una salvaguarda. Resolver es aceptar, vaciar o teclear
otra cosa: las tres valen, que no puede haber un estado del que solo se salga aceptando.

Cada campo llega en uno de cuatro estados —la distinción de tres estados de la casa, hay
dato · el dato es cero · no hay dato, aplicada a una ficha—:

| Estado | Qué significa | Qué se ve |
|---|---|---|
| `propuesto` | hay valor y viene de un rótulo inequívoco | el valor en el campo, marcado «◇ Sin confirmar» con su página |
| `ambiguo` | el documento dice algo que no es un valor utilizable: un rango, una divisa no admitida | el campo **vacío** y el literal del PDF, para teclear lo propio sabiendo de dónde sale |
| `referencia` | el dato está en el documento pero no se copia | dónde está. Es el caso del resumen ejecutivo |
| `ausente` | no hay nada que proponer | nada, salvo los tres motivos que conviene decir en voz alta |

**Tres campos no se proponen nunca, por decisión y no por falta de dato.** El take profit
mueve la cartera y en los informes solo vive en prosa condicional, sin un rótulo que lo
fije, de modo que no se propone de oídas ni aunque el documento lo nombre; la
recomendación no se infiere del tipo de tesis —que una tesis sea larga no dice si es
comprar, sobreponderar o mantener—; y el tipo de informe el documento no lo declara.
Cuando el PDF los nombra igualmente, se dice por qué no se han propuesto en lugar de
callarlo.

El stop loss, en cambio, **sí** se propone: tiene rótulo propio en el plan de inversión.
Y se retira si el nivel leído no es coherente con el precio de compra, porque proponer un
par que la validación ya va a rechazar es hacer perder el tiempo a quien lo acepte.

**Lo tecleado por el analista no lo pisa ninguna propuesta.** Lo que prerrellena el propio
diálogo —la fecha de hoy, la divisa por omisión— sí se pisa: eso no lo ha escrito nadie.
Y lo que el formulario ofrece por su cuenta se marca aparte, para que no se confunda con
lo leído: un valor por defecto solo se ofrece cuando **todos** los informes del
repositorio coinciden, porque entonces no es una suposición sino lo que la casa viene
haciendo. En cuanto aparece un segundo valor deja de ofrecerse.

**Analizar no es archivar.** El documento se recibe en memoria y se descarta al terminar;
lo que baja a `data/uploads` es el adjunto del informe, y solo cuando el informe se guarda
de verdad. La respuesta de la extracción no crea ni modifica nada, y el guardado sigue
pasando por `validarInforme` sin excepción alguna.

Los motivos por los que un campo no llega propuesto viven enumerados en
`src/extraccion/motivos.js` y se rotulan **por código** en el idioma de quien mira; el
castellano que emite el servidor es la reserva, para quien llame por `curl` y para los
registros.

---

## Cómo se construye la cartera

La cartera **se deriva íntegramente de los informes publicados**. Un informe genera
posición cuando tiene ticker y está marcado como «Incorporar a la cartera».

- **Fecha de alta** — la fecha de publicación del informe.
- **Precio de entrada** — el **precio de compra** consignado en la ficha. Si no se
  indica, se toma el cierre de la sesión de publicación.
- **Peso de capital** — el asignado en la ficha; las posiciones sin peso explícito
  reparten el remanente a partes iguales. La suma se normaliza a 100 %. Es el **tramo**
  de capital que la posición compra en su alta y del que responde mientras viva.
- **Varios informes sobre un mismo valor** — la publicación más antigua fija la fecha
  de alta y la más reciente aporta la recomendación y el precio objetivo vigentes.

### Toma de beneficios automática

Cuando la ficha fija un **take profit**, la posición se liquida en la primera sesión
cuyo máximo alcanza ese nivel, al propio nivel fijado. A partir de ese momento:

- Deja de figurar entre las posiciones en cartera y pasa a **Posiciones liquidadas**,
  con su fecha de cierre, precio de salida y resultado realizado.
- Su importe permanece como **liquidez**, de modo que una caída posterior del valor ya
  no afecta al índice.
- Esa liquidez **se queda ahí**: no financia a las posiciones vivas ni a las que entren
  después, que compran con su propio tramo. Aparece como una línea más de la composición.
- Los pesos de las posiciones que siguen vivas **no se tocan**: cada una conserva el
  tramo de capital con el que entró.

La detección usa el **máximo** de cada sesión, que es el nivel al que se ejecutaría una
orden limitada, y nunca una sesión sin cruce real.

### Metodología del índice

**Tramos fijos**, en base 100 = capital. El capital arranca íntegro en caja. Cada tesis
retira de ahí su tramo el día de su alta, lo compra al precio de entrada y lo conserva sin
volver a dimensionarlo. Lo que ninguna tesis ha reclamado, y lo que devuelve una
liquidación, es liquidez. No hay rebalanceos ni aportaciones ni reembolsos externos, de
modo que el índice recoge exclusivamente rendimiento.

De ahí la propiedad que se puede comprobar a mano en la tarjeta **Conciliación de la
rentabilidad**, y que vigila `npm run test:cartera`:

```
Σ (peso de capital × rentabilidad de la línea) = rentabilidad total
```

Las líneas son aditivas porque cada una responde de su propio tramo, y el valor de los
tramos más la liquidez es el patrimonio.

> La primera sesión del índice puede no valer exactamente 100: si el precio de compra
> difiere del cierre de esa jornada, la diferencia es rendimiento real y el índice la
> recoge desde el primer día. Tampoco valdrá 100 si en esa sesión queda capital sin
> desplegar, que es lo normal cuando las tesis entran escalonadas.

#### Qué se hacía antes y por qué cambia

Hasta esta versión el índice era una **TWR encadenada con rebalanceo en cada alta**: al
incorporarse una tesis, el patrimonio entero —posiciones vivas más liquidez— se
redistribuía a los pesos objetivo, y esos pesos se renormalizaban a 100 % entre las que
seguían vivas. La consecuencia no era un matiz metodológico:

- El importe de una posición liquidada **financiaba** a la siguiente en entrar, en
  contra de lo que este mismo documento declaraba dos párrafos más arriba.
- El peso de una liquidada **engordaba** a las supervivientes: con dos tesis vivas de las
  cinco declaradas al 20 %, cada una pasaba a pesar el 50 %.
- El rebalanceo repartía el patrimonio de la sesión **anterior** a precios de la actual,
  de modo que el movimiento de las vivas ese día **se perdía**. El 20 de mayo de 2026
  IOVA —el 100 % de la cartera entonces— subió un 2,31 % y el índice registró un 0,04 %.

Con la cartera real de la plataforma, el índice publicaba **+169,94 %** mientras las
contribuciones de sus cinco líneas sumaban **+67,85 %**. Esa discrepancia era el síntoma
visible; el fondo es que aquel índice no medía la cartera descrita en este documento, sino
otra que se rebalanceaba sola. La regla nueva es la que ya estaba escrita: el importe
liquidado permanece como liquidez.

> El índice y las rentabilidades por posición siguen respondiendo a preguntas distintas
> —el índice mide el capital y la columna «Rentabilidad» mide el valor desde su entrada—,
> pero ya **son conciliables**: peso de capital por rentabilidad da la contribución de la
> línea, y las contribuciones suman el índice.

### La liquidez, con sus dos cifras

La caja aparece como una línea más de la composición, junto a los sectores, y en el cuadro
de mando. Lleva **dos porcentajes que no son el mismo y que responden a preguntas
distintas**, porque por separado parecen contradecirse:

| Cifra | Qué contesta |
|---|---|
| **Peso actual** | Qué parte del **patrimonio de hoy** es dinero quieto |
| **Peso de capital** | Qué parte del **capital** no está invertida: tramos liquidados más los que ninguna tesis reclamó |

Con la cartera real: dos tramos liquidados de cinco son el **40 % del capital**, y como
salieron valiendo más de lo que costaron, ese dinero es el **60,07 % del patrimonio**. No
es una contradicción; es exactamente la ganancia realizada. Ambas se rotulan diciendo de
qué total hablan.

La misma distinción gobierna las dos tablas: la **Composición** ordena por peso actual
—cuánto pesa hoy cada posición— y la **Conciliación** por peso de capital —de cuánto
responde—. Solo la segunda es aditiva.

### Estadísticos

Rentabilidad total y anualizada · volatilidad anualizada (252 sesiones) · ratios de
Sharpe, Sortino y Calmar · máxima caída con sus fechas · beta, alfa de Jensen y
correlación frente al índice · sesiones positivas · mejor y peor sesión.

La tasa libre de riesgo por defecto es del 4 % y se ajusta con el parámetro `?rf=` del
endpoint de cartera. Índices de referencia disponibles: SPY, QQQ, DIA e IWM.

#### Dos suelos de muestra: 252 y 756 sesiones

Ni las cifras **anualizadas** ni los **ratios ajustados por riesgo** se publican con
cualquier historia detrás, y no esperan lo mismo porque no les falta lo mismo. Mientras
esperan, la celda no queda muda: dice cuántas sesiones faltan y a partir de cuántas
aparecerá.

| Suelo | Cifras | Por qué |
|---|---|---|
| **252 sesiones · 1 año** | Rentabilidad anualizada (CAGR) | Antes del año, anualizar por composición **extrapola** un tramo que no se ha recorrido: de 7 meses al +67,85 % salía un CAGR del +153,92 %. Cumplido el año es la anualización de un rendimiento ocurrido, y eso es un hecho: retenerlo sería ocultar dato |
| **756 sesiones · 3 años** | Sharpe · Sortino · Calmar · alfa de Jensen | Es el mínimo del oficio —Morningstar no calcula medidas ajustadas por riesgo por debajo de ese plazo; GIPS exige cinco años de track record— y lo respalda la aritmética del error típico |

Desde el primer día se publican, sin suelo, las cifras que la muestra sí sostiene:
rentabilidad total, volatilidad anualizada, máxima caída con sus fechas, beta,
correlación, sesiones positivas y mejor y peor sesión.

**La aritmética del segundo suelo.** El error típico de un Sharpe, con rendimientos iid, es

```
SE(SR) = √252 · √((1 + SR_d² / 2) / N)
```

que depende del **plazo** y no de la frecuencia: muestrear a diario en vez de a mes no
compra precisión. En sesiones: `años = (1 + SR_d²/2) / SE²`.

| Plazo | Sesiones | Error típico |
|---|---:|---:|
| 6 meses | 141 | ±1,35 |
| 1 año | 255 | ±1,01 |
| **3 años** | **756** | **±0,58** |
| 5 años | 1 260 | ±0,45 |
| 10 años | 2 520 | ±0,32 |

Con las 141 sesiones de agosto de 2026, un Sharpe de 2,58 llevaba un intervalo del 95 %
de **[−0,07 , 5,22]**: incluía el cero. Publicar «2,58» habría sido presentar como
nivel algo cuyo signo la muestra no establecía. Y la muestra era además peor de lo que
esa cuenta supone —77 de 141 sesiones con una sola posición, 78 % del rendimiento en
una línea—, de modo que el ±1,35 es optimista, no conservador.

> **La puerta y el rótulo salen de la misma tabla**, `SUELO_POR_CIFRA`. No es
> ceremonia: mientras fueron dos expresiones separadas, mover una y no la otra dejaba
> a la plataforma reteniendo una cifra hasta las 756 sesiones mientras anunciaba que
> llegaría a las 252. Desde la interfaz eso es invisible —el rótulo, por sí solo, es
> coherente—, así que lo vigila la batería del motor: en el suelo justo la cifra está,
> una sesión antes no, y contra el umbral que el propio motor declara, no contra una
> constante copiada en la prueba.

El motor publica un bloque `muestra` con el recuento, los dos suelos y **qué cifra
retiene cada uno**, de modo que la interfaz no tiene que saberse la lista ni los
umbrales.

#### El numerador de Sharpe y Sortino

Es el **exceso medio anualizado**, `(media diaria − rf/252) × 252`, no el CAGR. Son dos
magnitudes distintas: anualizar por composición extrapola el tramo observado, mientras
que el denominador ya es una desviación diaria anualizada por √252. Con la cartera de
agosto de 2026 el CAGR daba 153,92 % frente al 93,54 % de la media, y el Sharpe subía
de 2,58 a **4,32** sin que nada lo hubiera ganado.

Es un defecto **aparte** del tamaño de muestra: estaría igual de mal con veinte años de
historia. Calmar sí conserva el CAGR en el numerador —es un rendimiento compuesto sobre
caída— y por encima del suelo esa anualización ya no extrapola nada.

> Lo que el suelo evita se ve mejor en el extremo: con el mínimo anterior de 30 días,
> una serie de 30 sesiones al alza publicaba una rentabilidad anualizada del **985,71 %**
> y un Sharpe de **207,36**. `npm run test:cartera` lo comprueba en los dos sentidos.

---

## Options

Sección `#/opciones`, con tres pestañas.

### De dónde salen los datos

**Nasdaq**, el mismo proveedor que ya sirve cotizaciones e histórico. No se ha
incorporado ningún origen nuevo.

| Dato | Estado |
|---|---|
| Strike, vencimiento, bid, ask, último, volumen, interés abierto | ✅ Real |
| Volatilidad implícita | ❌ No publicada → `N/A` |
| Griegas (delta, gamma, theta, vega) | ❌ No publicadas → `N/A` |
| Multiplicador de contrato | ❌ No publicado → se aplica 100 y se declara |
| Operaciones individuales (time & sales) | ❌ No publicadas |

Son **agregados de la sesión por contrato**, no un flujo de operaciones.

### Option chain — operativa

Cadena completa por vencimiento, con calls y puts enfrentados y el entorno del dinero
resaltado. Debajo, un mapa de barras con la concentración de interés abierto por
strike. Las columnas de IV y griegas muestran `N/A`, no cero.

### Unusual activity — operativa

Puntúa cada contrato negociado con el **W&C Unusual Activity Score** (0–100). Al pulsar
una fila se abre *Why is this unusual?*, con el desglose completo.

### Options flow — pendiente de proveedor

Un flujo de operaciones exige *time & sales* de opciones: cada ejecución con su hora,
tamaño, precio y la horquilla vigente en ese instante. Nasdaq no lo publica, de modo
que la pestaña declara **Data unavailable** y enumera qué haría falta. No se simula.

### El score y sus diez factores

Cada factor declara si dispone del dato. Solo puntúan los que lo tienen, sus pesos se
renormalizan entre ellos y **la cobertura se publica siempre**. Por debajo del 45 % de
cobertura no se emite puntuación.

| Factor | Peso | Estado |
|---|---|---|
| Volume / Open Interest | 24 % | ✅ Operativo |
| Premium traded | 22 % | ✅ Operativo (derivado) |
| Distance from current price | 16 % | ✅ Operativo |
| Days to expiration | 14 % | ✅ Operativo |
| Call / Put imbalance | 10 % | ✅ Operativo |
| Relative volume | 5 % | ⏳ Requiere 3 sesiones archivadas |
| Implied volatility change | 5 % | ⏳ Requiere IV del proveedor |
| Trade size | 2 % | ⏳ Requiere time & sales |
| Historical activity | 1 % | ⏳ Requiere 3 sesiones archivadas |
| Aggressiveness of trade | 1 % | ⏳ Requiere contexto de horquilla |

La metodología vive en `src/opciones/puntuacion.js`, en `calculateUnusualActivityScore()`.
Cambiar un peso o activar un factor es tocar ese único fichero.

### Clasificación: la inferencia nunca se presenta como hecho

Cada clasificación viaja con su grado de certeza —**KNOWN**, **INFERRED** o
**UNKNOWN**— y con el motivo:

- **Dirección** (buy/sell) → siempre `UNKNOWN`. Determinarla exige el precio de
  ejecución frente al bid/ask **de ese instante**; que un contrato sea CALL no implica
  que alguien lo comprara.
- **Modalidad** (sweep/block/multi-leg) → siempre `UNKNOWN`. Exige el desglose de
  ejecuciones por mercado.
- **Posición** (apertura/cierre) → `UNKNOWN`. Que el volumen supere al interés abierto
  **no demuestra** apertura: puede ser cierre, rolo o intradía. Cuando ocurre, se
  muestra la hipótesis *«Posible apertura de posición»* rotulada como `INFERRED`, con
  la advertencia de que solo el interés abierto de la sesión siguiente lo confirma.

### Premium

`último × multiplicador × contratos`. El multiplicador se toma del proveedor cuando lo
publica; si no, se aplica 100 y el resultado lo declara (`multiplicadorDeclarado: false`).
Es el **importe agregado de la sesión**, no la prima de una operación concreta.

### Calidad del dato

Tres estados que nunca se confunden: **hay dato**, **el dato es cero** y **no hay dato**.
Un interés abierto de cero no produce un cociente de cero, sino «no calculable» (`—`).
Lo que el proveedor no publica se rotula `N/A`.

### Histórico

Cada consulta de cadena archiva una instantánea por contrato en la tabla
`opciones_historico` de la base ya existente —una por contrato y sesión—. Con tres
sesiones acumuladas se activan solos los dos factores comparativos del score. Retención
configurable con `RETENCION_OPCIONES_DIAS` (180 días por defecto).

### Arquitectura

```
ProveedorOpciones (contrato)  →  adaptador Nasdaq
        ↓
Servicio (src/opciones/index.js)
   getOptionChain · getOptionsFlow · getUnusualActivity · getHistoricalOptionsActivity
        ↓
Rutas (/api/opciones/*)  →  Interfaz (public/opciones.js)
```

Incorporar un proveedor consiste en implementar el contrato y registrarlo en
`src/opciones/proveedores/index.js`. Ni el score, ni las rutas, ni la interfaz cambian.
Se selecciona con `OPCIONES_PROVEEDOR`.

---

## Noticias: sindicación con Investing.com

Investing.com **no ofrece API pública** —así lo indica su propio servicio de soporte— y
tanto su web como `api.investing.com` responden `403` a las peticiones automatizadas. El
canal público que la propia casa mantiene son sus **feeds RSS**, y sobre ellos se
construye la integración.

La plataforma consulta cinco canales en cada pasada:

| Canal | Contenido | Categoría asignada |
|---|---|---|
| `news_356` | Bolsa · última hora | Mercados |
| `news_25` | Noticias de bolsa | Mercados |
| `news` | Todas las noticias | Mercados |
| `stock_Stocks` | Análisis de acciones | Sector |
| `market_overview` | Visión general del mercado | Macroeconomía |

Hay otros tres disponibles —divisas, materias primas y criptomonedas— listados en
`GET /api/noticias/sincronizacion` y activables al invocar la sincronización manual.

**Cómo funciona.** La primera pasada se lanza al arrancar el servidor, en segundo plano,
y se repite cada 15 minutos. Cada pieza se identifica por su enlace de origen, de modo
que una resincronización nunca duplica lo ya incorporado. Las peticiones son
condicionales (`If-None-Match`): si un canal no ha cambiado, Investing responde `304` y
no se transfiere nada. Un canal caído no interrumpe a los demás.

**Vínculo con la cartera.** Si el titular menciona un valor en cobertura —por ticker o
por la denominación social sin su forma jurídica— la pieza se etiqueta con ese ticker, se
clasifica como noticia de compañía y sube a relevancia alta. Así, el filtro «Valor» de la
sección reúne todo lo publicado sobre cada posición.

**Qué se guarda.** Únicamente titular, fecha, autor, enlace e imagen: **no se reproduce
el cuerpo del artículo**. La plataforma actúa como índice y remite siempre al original en
la fuente, que es el uso previsto de un canal RSS. Las imágenes remotas se registran pero
no se muestran, para no abrir conexiones a terceros desde el navegador ni romper la
paleta acromática.

**Convivencia con la redacción propia.** Las noticias escritas por el equipo siguen
funcionando igual y se distinguen con el rótulo «Redacción propia». La política de
retención retira la sindicación de más de 60 días, pero **nunca** toca las piezas propias
ni las marcadas como destacadas.

El botón **Actualizar ahora** de la sección fuerza una pasada inmediata; requiere
credencial de redacción.

---

## Datos de mercado

Las cotizaciones se resuelven en cascada, degradando al siguiente proveedor ante
cualquier incidencia:

| Orden | Proveedor | Cobertura |
|---|---|---|
| 1 | **Yahoo Finance** | cotización e histórico |
| 2 | CNBC | cotización en vivo y fundamentales |
| 3 | Nasdaq | cotización e histórico diario OHLCV |

Yahoo Finance es el proveedor primario y está implementado con su flujo de sesión
completo: cookies de consentimiento (incluido el circuito RGPD que se aplica a las IP
europeas), obtención de *crumb* y renovación automática al caducar.

> **Nota operativa.** Yahoo limita por dirección IP y actualmente responde `429 Too Many
> Requests` a todas sus rutas de API desde esta red, incluso con una sesión válida. Por
> eso las cotizaciones se están sirviendo desde CNBC y Nasdaq. No requiere ninguna
> intervención: en cuanto Yahoo vuelva a aceptar peticiones desde esta IP, la cascada lo
> retomará como origen principal de forma automática. El proveedor efectivo de cada dato
> se indica al pie de la sección de cartera, y `GET /api/mercado/estado` da el detalle de
> aciertos y fallos por proveedor.

Cada recarga de la página solicita cotizaciones nuevas. Una caché de 15 segundos evita
saturar a los proveedores ante recargas repetidas; las series históricas se guardan
30 minutos, ya que los cierres diarios no varían intradía.

---

## API

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/informes` | Listado con búsqueda, filtros, orden y paginación |
| `GET` | `/api/informes/:id` | Ficha completa |
| `GET` | `/api/informes/destacados` | Portada: destacados, recientes y métricas |
| `GET` | `/api/informes/vocabularios` | Vocabularios controlados y valores en uso |
| `POST` | `/api/informes` | Alta (requiere credencial) |
| `POST` | `/api/informes/extraccion` | Propuesta de ficha leída de un PDF; no crea nada (requiere credencial) |
| `PUT` | `/api/informes/:id` | Modificación parcial (requiere credencial) |
| `DELETE` | `/api/informes/:id` | Baja y retirada de documentos (requiere credencial) |
| `GET` | `/api/informes/:id/adjuntos/:adjuntoId` | Descarga de documento |
| `DELETE` | `/api/informes/:id/adjuntos/:adjuntoId` | Retirada de documento (requiere credencial) |
| `GET` | `/api/noticias` | Listado con búsqueda, filtros y paginación |
| `GET` | `/api/noticias/:id` | Noticia completa |
| `GET` | `/api/noticias/portada` | Destacadas y recientes para la portada |
| `GET` | `/api/noticias/vocabularios` | Categorías, relevancias, fuentes, autores y orígenes |
| `GET` | `/api/noticias/sincronizacion` | Diagnóstico de la sindicación |
| `POST` | `/api/noticias/sincronizar` | Fuerza una pasada inmediata (requiere credencial) |
| `POST` | `/api/noticias` | Alta (requiere credencial) |
| `PUT` | `/api/noticias/:id` | Modificación parcial (requiere credencial) |
| `DELETE` | `/api/noticias/:id` | Baja (requiere credencial) |
| `GET` | `/api/mercado/cartera` | Composición, liquidadas, liquidez, serie histórica y estadísticos con su suelo de muestra |
| `GET` | `/api/mercado/cotizacion/:simbolo` | Cotización puntual |
| `GET` | `/api/mercado/estado` | Diagnóstico de proveedores |
| `GET` | `/api/marca` | Recursos de identidad corporativa disponibles |
| `GET` | `/api/radar` | Señales del radar, con su disponibilidad |
| `GET` | `/api/radar/signal` | W&C Signal y desglose por dimensión |
| `GET` | `/api/radar/indices` | Panorama de mercado |
| `GET` | `/api/radar/catalizadores` | Agenda de catalizadores |
| `GET` | `/api/opciones/estado` | Proveedor activo, capacidades y cobertura del archivo |
| `GET` | `/api/opciones/cadena/:simbolo` | Cadena de opciones |
| `GET` | `/api/opciones/inusual` | Contratos puntuados por actividad inusual |
| `GET` | `/api/opciones/flujo` | Flujo de operaciones (pendiente de proveedor) |
| `GET` | `/api/opciones/historico/:simbolo` | Actividad archivada |
| `GET` | `/api/salud` | Estado del servicio |
| `POST` | `/api/sesion` | Validación de la clave de redacción |

La lectura es pública; toda escritura exige la cabecera `X-Clave-Redaccion` con la clave
de analista. **La descarga de documentos no requiere credencial.**

---

## Arquitectura

```
warrants-co/
├── server.js              Servidor, seguridad y gestión de errores
├── scripts/
│   ├── sembrar.js         Constitución de la cartera inicial
│   ├── copia.js           Copia de seguridad: base y adjuntos
│   ├── restaurar.js       Restauración, con ensayo a un directorio aparte
│   └── copias-comunes.js  Qué es una copia: lo comparten copia y restaurar
├── src/
│   ├── db.js              SQLite (node:sqlite) e índice FTS5
│   ├── validacion.js      Vocabularios y validación de la ficha
│   ├── cartera.js         Motor de cartera y analítica cuantitativa
│   ├── market/
│   │   ├── index.js       Cascada de proveedores y caché
│   │   ├── yahoo.js       Proveedor primario (sesión, consent, crumb)
│   │   └── respaldo.js    Proveedores CNBC y Nasdaq
│   ├── noticias/
│   │   ├── investing.js   Cliente RSS de Investing.com y analizador XML
│   │   └── sincronizacion.js  Ingesta periódica, deduplicación y retención
│   ├── senales/           Radar: un módulo por familia de señal
│   │   ├── index.js       Registro y orquestación
│   │   ├── momentum.js    Fuerza relativa (datos reales)
│   │   ├── volatilidad.js Volatilidad realizada (datos reales)
│   │   ├── noticias.js    Piezas sobre valores en cobertura
│   │   └── pendientes.js  Señales sin fuente, declaradas como tales
│   ├── mercado/indices.js Panorama de índices
│   ├── opciones/          Subsistema de derivados
│   │   ├── proveedor.js   Contrato OptionsDataProvider
│   │   ├── proveedores/   Adaptadores (Nasdaq) y registro
│   │   ├── puntuacion.js  calculateUnusualActivityScore y los diez factores
│   │   ├── clasificacion.js  Sentido, modalidad y posición, con su certeza
│   │   ├── historico.js   Instantáneas por contrato y sesión
│   │   └── index.js       Servicio: las cuatro operaciones del contrato
│   └── signal.js          Arquitectura del indicador propietario
│   └── routes/            Endpoints de informes, noticias y mercado
├── public/                Cliente (HTML, CSS y JS sin dependencias)
│   ├── marca/             Logotipo y banner corporativos
│   ├── app.js             Orquestador, repositorio, noticias y cartera
│   ├── home.js            Panel de mercado (cada bloque, por separado)
│   ├── navegacion.js      Menús por área
│   ├── formato.js         Formateadores compartidos
│   ├── opciones.js        Sección de derivados (tabla, cadena, mapa, panel)
│   ├── grafico.js         Gráfico SVG de evolución
│   ├── portada.js         Cinta de cotizaciones y animaciones de portada
│   ├── tema.js            Tema claro / oscuro
│   └── tema-inicial.js    Aplica el tema antes del primer pintado
└── data/                  Base de datos y documentos subidos
```

Sin proceso de compilación y sin dependencias de terceros en el navegador: el cliente
es HTML, CSS y JavaScript nativo. En el servidor solo Express y Multer; la persistencia
usa el SQLite integrado en Node, sin módulos compilados.

---

## Copias de seguridad

```bash
npm run copia
```

Copia la base **y los adjuntos**. Un informe sin su PDF no es un informe restaurado, así
que las dos cosas viajan juntas o no vale de nada.

```
data/copias/2026-08-24T10-30-00/
├── warrants.db      volcado consistente de la base
├── uploads/         un fichero por adjunto
└── copia.json       manifiesto: es lo que hace que esto sea una copia
```

La base se vuelca con `VACUUM INTO` en lugar de copiar el fichero, porque con el diario en
modo WAL una copia directa puede capturar un estado incoherente. El origen se abre en
**solo lectura**: la copia no puede escribir sobre los datos de trabajo ni por accidente.

### Lo que ya estaba no se vuelve a escribir

Los adjuntos son de escritura única —nacen con nombre irrepetible y nadie los modifica—,
de modo que los que ya figuraban en la copia anterior se incorporan por **enlace duro**. El
directorio se ve y se restaura como una copia completa e independiente, pero esos ficheros
no ocupan disco por segunda vez. Con la cartera actual, la primera copia son 24 MB y la
siguiente 7,7 MB: lo único que cuesta de verdad es la base más los PDF nuevos.

De ahí salen tres propiedades que conviene tener presentes:

- **Se puede borrar cualquier copia vieja** sin dañar a las demás. El contenido vive
  mientras quede un enlace apuntándolo, así que un `rm -rf` sobre un directorio fechado es
  siempre seguro.
- **Ninguna copia comparte inodo con `data/uploads`.** El primer traslado de un fichero es
  copia real, nunca enlace al almacén vivo; borrar un adjunto desde la plataforma no toca
  ningún respaldo.
- **Al restaurar se copia, nunca se enlaza.** Si lo restaurado compartiera inodo con el
  respaldo, el primer borrado hecho desde la plataforma mutilaría la copia de seguridad.

Si el enlace no es posible —copias en otro volumen, permisos— se cae a copia real y el
manifiesto lo anota. La optimización no decide si hay copia o no.

### Nunca una copia a medias con aspecto de completa

La copia se construye en un directorio `.parcial-…` y solo al final recibe su nombre
definitivo, con un renombrado que es atómico. **Un directorio fechado o existe entero o no
existe.** Antes de publicarlo se comprueba contra la base que cada fila de `adjuntos` tiene
su fichero y que pesa lo que la base declara —contra la base, no contra el directorio: una
copia hecha con el almacén mal apuntado sería coherente consigo misma y aun así estaría
vacía de documentos—.

Cualquier fallo a mitad, quedarse sin disco incluido, retira el parcial y no publica nada:
la copia anterior sigue siendo la última buena. Un Ctrl-C tampoco deja restos. Y como lo
repetido va por enlace, una ejecución solo gasta disco en lo que es nuevo.

Los restos de una copia interrumpida no se ofrecen jamás al restaurar, aunque por dentro
sean indistinguibles de una copia buena.

### Los tres desenlaces son distintos y se distinguen

| Código | Qué ha pasado |
|---|---|
| `0` | copia completa |
| `1` | **la copia ha fallado**: no se ha creado nada |
| `2` | **la copia está completa**, pero hay informes que apuntan a adjuntos que no están |

El `2` no es un fallo del respaldo: es un problema de los datos, anterior a la copia, y la
copia recoge fielmente lo que hay. Sale por el canal de error y con código distinto de cero
para que llegue —un informe apuntando a un PDF que ya no existe es justo lo que hay que
saber—, y el mensaje empieza diciendo `LA COPIA ESTA COMPLETA Y ES VALIDA` para que no se
confunda al leerlo con el de un fallo. El detalle, con informe y empresa, queda en
`copia.json`.

La retención está deliberadamente fuera: las copias no se borran solas.

## Restauración

Una copia que no se ha probado a restaurar no es una copia.

```bash
npm run restaurar                                  # lista y no toca nada
npm run restaurar -- --ultima --a /tmp/ensayo      # ensayo, sin riesgo
npm run restaurar -- 2026-08-24T10-30-00 --forzar  # sobre el directorio de trabajo
```

Sin argumentos solo enumera, separando lo que son copias de lo que no: las restaurables,
los restos de copias interrumpidas y las copias sueltas del esquema anterior —anteriores a
que existieran los adjuntos, y que por tanto **no los contienen**, cosa que se dice al
listarlas y al restaurarlas—.

Antes de tocar nada verifica la copia elegida contra su propio manifiesto: la base está y
pesa lo que decía, cada adjunto está y pesa lo que decía, y la base abre y declara los
mismos adjuntos que el manifiesto. Una copia que no verifica no se restaura.

Lo restaurado se construye entero al lado y solo después sustituye a lo que hubiera, de
modo que un fallo a mitad deja el destino como estaba. Sobre el directorio de trabajo exige
`--forzar`, y aun entonces **no borra**: aparta lo anterior con el sufijo `.previo-<fecha>`.
El diario `-wal` viejo se aparta con su base, porque dejarlo junto a una base nueva es la
forma más silenciosa de estropear una restauración.

### El ensayo

`--a` restaura a otro directorio, y eso es lo que permite ensayar sin rozar los datos de
trabajo:

```bash
npm run restaurar -- --ultima --a /tmp/ensayo-restauracion
WARRANTS_DB=/tmp/ensayo-restauracion/warrants.db \
WARRANTS_UPLOADS=/tmp/ensayo-restauracion/uploads npm start
```

Y entonces se abre un informe y se descarga su PDF. Eso es la copia probada.

## Redirección por entorno

Tres variables mueven las tres cosas: `WARRANTS_DB` la base, `WARRANTS_UPLOADS` el almacén
de documentos y `WARRANTS_COPIAS` el directorio de copias.

**Redirigir la base no basta: hay que redirigir también el almacén de documentos.**
`WARRANTS_UPLOADS` mueve el directorio de adjuntos, y sin él una prueba que publique un
informe deja el PDF cayendo en `data/uploads`, entre los documentos del equipo, donde no
se distingue de los demás más que por la fecha. No es hipotético —ocurrió, y hubo que ir
a buscar los dos ficheros por la hora—, y a diferencia de una fila en una base
desechable, un fichero suelto no lo retira nadie al terminar.

```bash
WARRANTS_DB=/tmp/prueba.db WARRANTS_UPLOADS=/tmp/prueba-uploads npm start
```

Por eso `npm run test:propuesta` redirige las dos y comprueba al terminar que
`data/uploads` ha quedado **exactamente** como estaba: comparando la lista de ficheros, no
fechas ni prefijos. Y `npm run test:copia` redirige las tres, por lo mismo aplicado a
`data/copias`.

---

## Identidad corporativa

El logotipo y el banner se sirven desde **`public/marca/`**. La detección es automática:
basta con depositar el fichero con uno de los nombres previstos y la plataforma lo adopta
en la siguiente carga de la página, **sin tocar código ni reiniciar el servidor**.

| Recurso | Nombres admitidos | Dónde aparece |
|---|---|---|
| `logo` | `logo.svg` · `logo.png` · `logo.jpg` · `logo.webp` | Pie de página |
| `sello` | `logo-marca.svg` · `logo-marca.png` · `sello.svg` · `sello.png` | Cabecera e icono de pestaña |
| `banner` | `banner.jpg` · `banner.png` · `banner.webp` · `banner.avif` | Fondo de la portada |

`GET /api/marca` informa de qué recursos hay presentes y de su versión, que se usa para
invalidar la caché del navegador al sustituir un fichero.

**Banner de portada.** Si el fichero existe, se muestra como fondo del encabezado con un
degradado lateral que preserva el contraste del titular, y se retira la retícula gráfica
de respaldo. En tema oscuro la fotografía se invierte y se atenúa para no deslumbrar. Si
no existe, la portada conserva su fondo propio sin degradarse en nada.

Para que se vea nítido en pantallas de alta densidad, **suba el original sin
recomprimir**, de 3000 px de ancho o más. El navegador solo reduce la imagen, nunca la
amplía, de modo que conserva el detalle. Los recursos de marca se sirven con caché de
siete días e invalidación por versión: sustituir el fichero basta para que se recargue.

---

## Diseño

**Tema claro y oscuro.** El conmutador de la cabecera alterna entre ambos y la elección
persiste entre sesiones. Sin elección explícita se sigue la preferencia del sistema
operativo; volver a pulsar el tema activo devuelve el control al sistema. El tema se
aplica antes del primer pintado, así que no hay destello al recargar. El tema oscuro
está escogido, no invertido: los grises se recalculan para conservar la jerarquía.

**Presencia corporativa.** La portada y el pie enlazan al perfil de LinkedIn de
Warrants & Co., en pestaña nueva y con `rel="noopener noreferrer"`.

**El color codifica lectura de mercado, nunca decora.** La paleta base sigue siendo
acromática; sobre ella actúan cuatro tonos semánticos, cada uno con versión propia para
tema claro y oscuro:

| Tono | Significado |
|---|---|
| Verde | Alza · posición favorable · sesión de analista abierta |
| Rojo | Baja · posición desfavorable |
| Ámbar | Aviso — por ejemplo, volatilidad elevada |
| Azul | Información neutra |

Ningún dato depende solo del color: las variaciones llevan siempre glifo (▲ ▼) y signo
explícito, y las señales van acompañadas de rótulo. El conjunto sigue siendo legible en
impresión en blanco y negro y para cualquier tipo de daltonismo.

**Movimiento en la portada.** Dos piezas discretas: los bloques aparecen al entrar en
pantalla y una cinta de cotizaciones recorre índices y valores en cartera —se detiene al
pasar el puntero por encima—. Todo se desactiva por completo cuando el sistema pide
movimiento reducido, dejando el contenido en su estado final.

El hero **no anima**. Con la fotografía detrás, la quietud sostiene mejor la composición
que cualquier entrada escalonada. Lo único que se mueve en él es la cinta, y con
movimiento reducido se detiene sin perder su función: queda en su primer fotograma, con
los valores legibles y cortados por el ancho de la ventana. Esa línea de datos partida
por el borde es la que invita a bajar, y no depende del movimiento para hacerlo.

Paleta estrictamente acromática: blanco, negro y escala de grises. En el gráfico, al no
disponer de color, la identidad de cada serie recae en el trazo (continuo para la
cartera, discontinuo para el índice), la leyenda y las etiquetas de extremo; el signo de
las variaciones se transmite por glifo (▲ ▼) y peso tipográfico, nunca por color. El
resultado es legible en pantalla, en impresión en blanco y negro y para cualquier tipo
de daltonismo.

Ambas series comparten un único eje en base 100 — nunca un doble eje, que induciría a
leer correlaciones inexistentes.

**La leyenda dice desde dónde mide.** Con el rango completo —MÁX, y también YTD cuando
abarca toda la serie— la cartera se mide **desde el capital invertido**, de modo que su
cifra es la rentabilidad total y coincide con el titular del cuadro de mando. Un rango
parcial se rebasa a 100 en su primer punto, que es lo que lo hace comparable con el
índice, y entonces la leyenda avisa: «no es la rentabilidad total».

> Rebasar también el rango completo era lo que hacía la versión anterior, y publicaba
> **+62,68 %** en la leyenda frente a **+67,85 %** en el titular. La diferencia es exacta y
> tiene nombre: la sesión de alta. El índice arranca en 103,18 porque IOVA se compró a 2,20
> y cerró a 2,55 ese día, y `1,6268 × 1,0318 = 1,6785`. Rebasando se descartaba ese
> rendimiento, que es real. `npm run test:repintado` compara ahora las dos cifras de la
> propia pantalla en los dos idiomas.

---

## Idioma de la interfaz

Se traduce lo que la plataforma **dice**, nunca lo que la plataforma **publica**: las
tesis, los teletipos, los resúmenes ejecutivos y los nombres de compañía se muestran
siempre en su idioma original. Traducirlos automáticamente sería publicar texto que
ningún analista ha firmado. La marca tampoco se traduce: «Warrants & Co.», «W&C Radar»
y «W&C Signal» son nombres propios.

Añadir un idioma se hace en un único fichero, `public/idiomas/index.js`: se importa su
diccionario y se añade una entrada. Ni el motor, ni el documento, ni ninguna vista
necesitan cambio alguno.

### Tres reglas que el mecanismo impone

**Una frase con datos incrustados vive entera en el diccionario**, con marcadores, y
nunca partida en fragmentos que el código concatene. Concatenar impone a todos los
idiomas el orden del castellano; una plantilla completa deja que cada uno coloque las
piezas donde le corresponda:

```
es: 'Curva: {curva}. El índice {indice} no tiene serie histórica…'
en: 'Curve: {curva}. No connected provider carries a historical series for {indice}…'
```

`tNodos()` devuelve un fragmento de DOM para las frases que llevan elementos dentro, de
modo que una parte puede ir en `<strong>` sin que el diccionario contenga marcado ni se
recurra a `innerHTML`.

**El plural se declara por idioma, no con una condición en el código.** Cada entrada que
dependa de un número declara sus formas y `Intl.PluralRules` elige la que toca.

**El reparto tipográfico también es del idioma.** El titular de la portada es una lista:
cuántas líneas ocupa y por dónde corta lo decide cada diccionario, no el documento. Por
eso `#manifiesto-titular` llega vacío y lo compone `animarManifiesto()`.

Cuando el propio navegador sabe redactar algo mejor que un diccionario, se le deja: la
antigüedad de un dato («hace 5 min», «5m ago») y la distancia a un catalizador («hoy»,
«mañana», «in 3 days») las pone `Intl.RelativeTimeFormat`, y el día y mes abreviados
—«17 AGO», «AUG 17»— `toLocaleDateString`. Ahí no hay entrada de diccionario que
mantener ni tabla de meses que se quede corta.

El gráfico de cartera fue el último reducto: llevaba su propia tabla `MESES` escrita a
mano, que solo sabía castellano. Retirada en la fase 4, y la ganancia va más allá de no
mantener doce cadenas por idioma: **el orden de las piezas también es del idioma**, y una
plantilla con día y mes concatenados no puede darle la vuelta.

```
es → «30 ene»   ·   «30 de enero de 2026»
en → «Jan 30»   ·   «January 30, 2026»
```

La fecha se construye a mediodía UTC, no a medianoche: a las 00:00 un huso al oeste de
Greenwich la retrasaría al día anterior y el eje rotularía un día de menos.

### Estado

| Fase | Alcance | Estado |
| --- | --- | --- |
| 1 | Motor, conmutador, cabecera, navegación y pie | hecho |
| 2 | Frases compuestas como plantilla y plurales por idioma | hecho |
| 3 | Portada e inicio: hero, manifiesto y los seis bloques | hecho |
| 4 | Las nueve secciones · **cartera y repositorio** | hecho |
| 4 | Las nueve secciones · **noticias** | hecho |
| 4 | Las nueve secciones · **radar** | hecho |
| 4 | Las nueve secciones · **compañías** | hecho |
| 4 | Las nueve secciones · **catalizadores** | hecho |
| 4 | Las nueve secciones · **mercado** | hecho |
| 4 | Las nueve secciones · **opciones** | hecho |

**La fase 4 está cerrada: las nueve secciones hablan los dos idiomas.** Lo que se pinta en
JavaScript se repinta al conmutar sin volver a la red, y lo comprueba `npm run test:repintado`
sección por sección.

Junto al motor quedó un módulo que no estaba en el plan y que pide la migración de cualquier
sección futura: **`public/vocabulario.js`**, con el vocabulario cerrado que emite el servidor
—sellos de calidad, tipos y prioridades de evento, clasificación de operaciones—. El código
sigue siendo el valor del filtro y el que cuelga de la clase CSS; lo que se traduce es el
rótulo. Antes de existir, la interfaz castellana rotulaba «UNAVAILABLE», «OPTIONS EXPIRY» y
«BUY CALL».

> **Dos etiquetas del historial no dicen la verdad, y se quedan como están.** El commit
> `8e20efb` se llama «Fase 3: portada e inicio traducidas», pero lo que trae es la fase 4
> de **cartera y repositorio**; y `b0f0a3e`, que sí se anuncia como «Fase 4 (parcial)»,
> quedó por debajo de él en el orden. El contenido de los dos es correcto: lo que falla es
> el rótulo. Se corrige aquí, y no reescribiendo la historia: mover commits ya publicados
> cuesta más de lo que aclara una etiqueta.

> **Queda una deuda, y es de `src/`, no de la interfaz.** Hay texto que redacta el
> servidor y que llega al navegador ya escrito en castellano: el título y la descripción
> de cada grupo del panorama de mercado, los motivos de carencia, y **los mensajes de
> error de la API**. El cliente los pinta tal cual —no puede hacer otra cosa— y por eso
> se ven en castellano aunque la interfaz esté en inglés. Llevarlos al diccionario
> significa meter la traducción dentro de `src/`, que es otra tarea y de otro tamaño: se
> aborda **al cerrar la fase 4**, no antes, para no dejar la migración a medias en dos
> capas a la vez.

### Las dos decisiones transversales, cerradas

Estaban abiertas a propósito, porque afectaban a las nueve secciones a la vez y hacerlas
a medias habría dejado la interfaz descuadrada entre lo migrado y lo que no. Se cerraron
al empezar la fase 4 y se aplicaron **a toda la plataforma**, no solo a las dos secciones
traducidas.

**1 · Un marcador de ausencia, no tres.** La plataforma usaba tres, y la diferencia entre
dos de ellos no la podía descifrar nadie:

| Antes | Dónde | Ahora |
|---|---|---|
| `—` | los seis formateadores de `formato.js` y las tablas | **se queda** |
| `N/A` | companias, catalizadores, mercado, opciones | **se queda**, vía diccionario |
| `N/D` | radar ×3, opciones ×2 | **retirado** |

La elección entre los dos que quedan es **estructural, no semántica**. Dentro de una tabla
numérica densa manda el blanco tipográfico `—`: un `N/A` repetido en cada columna es ruido,
y el guion además no depende del idioma, como no depende el separador de miles. Donde iría
una **cifra rotulada** —un indicador del cuadro de mando, una cifra titular, el valor de una
lista de definición— manda `N/A`, siempre resuelto por `general.noDisponible` y nunca escrito
a mano.

`N/D` se retiró y no `N/A` por tres razones. El coste era asimétrico —cinco sitios frente a
unos cuarenta—; `N/D` abrevia «no disponible» y solo se lee en castellano, de modo que la
interfaz inglesa habría necesitado una abreviatura distinta por idioma; y la distinción que
sostenía —`N/D` para «falta la fuente», `N/A` para «el proveedor no lo publica»— no estaba
explicada en ninguna parte de la pantalla. **El motivo no se ha perdido: sigue donde debía
estar**, en el texto contiguo —el panorama lo rotula con su motivo, y Signal detalla qué le
falta a cada dimensión—. Las clases CSS `--nd` y `--pendiente` se conservan: el atenuado
visual sí es información. Lo que se unificó es el texto.

**2 · El espacio antes del `%` lo decide el idioma, no la casa.** Lo resuelve
`Intl.NumberFormat` con `style: 'unit', unit: 'percent'` en `formato.js`, y de ahí salen
`porcentaje()` —sin signo, para una magnitud— y `formatearPorcentaje()` —con signo, para un
cambio—:

```
es-ES → «1234,50 %»   espacio DURO (U+00A0) antes del signo
en-US → «1,234.50%»   sin espacio, y con agrupación de miles
```

Fijar una sola convención habría dejado un idioma tipográficamente mal escrito de forma
permanente: la ISO 31-0 y la RAE exigen el espacio en castellano, y el estilo estadounidense
lo omite en inglés. Las dos son correctas —cada una en su idioma—, y esa es precisamente la
clase de decisión que no le toca al código.

Es además mejor que la concatenación que sustituye, por dos motivos que no eran el objetivo
pero se ganan igual: el espacio es duro, de modo que la cifra y el signo ya no pueden caer en
líneas distintas; y la agrupación de miles pasa a seguir al locale.

> **El signo lo sigue poniendo la casa**, y es deliberado: `Intl` firmaría los negativos con
> el guion ASCII, mientras que aquí se usa el menos tipográfico «−» (U+2212), que mide como
> un dígito y por tanto cuadra en columna bajo `font-variant-numeric: tabular-nums`.

> **Un `%` no puede vivir dentro de una plantilla del diccionario.** Escribirlo ahí —
> `'Peso {peso} % · {estado}'`— fija la convención de un idioma en los dos. Lo que viaja como
> parámetro es el porcentaje **ya formateado**, no el número desnudo.

---

## Seguridad

Content-Security-Policy con `script-src 'self'` · `X-Frame-Options: DENY` ·
`X-Content-Type-Options: nosniff` · consultas SQL siempre parametrizadas · expresiones
FTS entrecomilladas · comparación de credenciales en tiempo constante · nombres de
fichero generados en servidor y resueltos con `basename` en la descarga · limitación de
300 peticiones por minuto sobre la API · contenido dinámico insertado exclusivamente
como texto.

---

## Verificación

**Para que las pruebas corran de verdad hacen falta dos cosas: Playwright
instalado (`npm i -D playwright && npx playwright install chromium`) y el
servidor levantado en la dirección a la que apunte `BASE_PRUEBA`.** Sin
Playwright ninguna prueba se ejecuta y todas salen con código `2` diciéndolo:
una prueba que no corre no acredita nada, y su ausencia nunca se presenta como
un aprobado. El código `1` queda reservado a la prueba que sí se ejecutó y
falló.

### Paridad de diccionarios

```
npm run test:idiomas
```

No necesita Playwright ni servidor —como tampoco las cuatro de extracción—: es aritmética
sobre los diccionarios y corre en menos de un segundo. Comprueba que los dos idiomas
declaran las mismas claves, que una misma clave lleva los mismos marcadores `{…}` en
ambos —a una plantilla a la que le falte `{ticker}` el dato se le cae en silencio—, que
las formas de plural son categorías reales del idioma y siempre existe `other`, que una
entrada declarada como lista lo es en los dos, y que toda clave que el documento o el
código piden existe de verdad. Informa además, sin fallar, de las claves que nadie nombra y de
las categorías de plural que una entrada no cubre.

> **El aviso de claves huérfanas estuvo mudo hasta la fase 4.** `clavesMencionadas()`
> recorría también los diccionarios, de modo que toda clave quedaba «nombrada» por su
> propia declaración y la comprobación no podía saltar nunca. Corregido excluyendo
> `idiomas/`, delató en el acto 140 claves declaradas y todavía sin cablear. Quien añada
> una fuente a esa función ha de excluirla igual, o el aviso vuelve a enmudecer.
>
> Sobreviven dos huérfanas **a propósito**: `idioma.es` e `idioma.en`. El conmutador
> escribe el nombre de cada idioma *en ese idioma* —quien no entienda la interfaz actual
> debe reconocer la suya—, y lo toma de `idiomas/index.js`. No se leerán nunca.

Una clave que se compone en tiempo de ejecución —`informe.acceso.${nivel}`— es invisible
para esta prueba. Por eso los niveles de acceso se declaran en una tabla, `CLAVES_ACCESO`,
con las cuatro claves escritas: la misma pauta de `navegacion.js`, y por la misma razón.

### Comprobación de humo

```
npm test             # nueve secciones × dos idiomas contra el servidor local
```

Recorre las nueve secciones en español e inglés y verifica que cada una se
pinta, que el atributo `lang` sigue al idioma elegido, que la página no
desborda a lo ancho y que ninguna clave de diccionario llega sin traducir a la
pantalla.

### Repintado al cambiar de idioma

```
BASE_PRUEBA=http://127.0.0.1:4174 npm run test:repintado
```

La pasada sobre el DOM solo alcanza a los nodos con `data-i18n`; todo lo que el cliente
construye en JavaScript se quedaría en el idioma anterior si nadie lo repintara. **Una
sección traducida que no se repinta está a medias**: se ve bien al entrar y mal en cuanto
se pulsa el conmutador. Esta prueba lo pulsa sin recargar y comprueba, en las dos
direcciones, que siguen al idioma la tabla de posiciones, el cuadro de mando, los
estadísticos, la leyenda del gráfico, la fila de cifras de la portada y los desplegables
del repositorio. Verifica de paso dos cosas que el repintado no debe romper: que el
porcentaje conserva la convención del idioma y que la selección que el usuario tenga hecha
en un filtro sobrevive.

En la fila de cifras afirma además dos cosas que solo se ven mirando los dos idiomas: que
el año del rótulo **no se agrupa por millares** —como número salía «2,026 return»— y la
equivalencia de la regla 9, que las dos primeras casillas coinciden **si y solo si** la
del año declara que mide desde el capital. 152 comprobaciones.

Solo lee: no escribe en la base.

> **Los diálogos quedan fuera, y no es un olvido.** Se abren con `showModal()`, que deja el
> conmutador fuera del alcance del ratón *y* del tabulador —comprobado—: con uno abierto no
> se puede llegar a cambiar el idioma. Repintar su contenido sería código inalcanzable. Si
> alguno pasara algún día a `show()`, habría que añadirlo a `repintarVistas()`.

### Invalidación de vistas derivadas

```
BASE_PRUEBA=http://127.0.0.1:4174 npm run test:derivadas
```

Publica una tesis con ticker nuevo desde la interfaz y comprueba que aparece en
cartera, compañías, radar, portada y catalizadores **sin recargar la página**;
después la retira y comprueba lo contrario. Escribe en la base, de modo que ha
de apuntarse siempre a una instancia de pruebas.

> **Las dos cosas se tocan.** El repintado por idioma se hace desde lo ya cargado, sin
> volver a la red: cambian los rótulos, no los datos. Eso obliga a guardar la última carga
> de cada sección —`estado.cartera`, `estado.informes`—, y una carga guardada es una carga
> que puede quedarse rancia. Por eso toda memoria de repintado ha de retirarse en
> `MEMORIAS_DERIVADAS`: sin ello, publicar una tesis y conmutar el idioma repintaría la
> vista con la lista anterior. **Quien añada una caché de repintado tiene que darla de alta
> ahí**, o reintroduce exactamente el fallo que ese mapa existe para impedir.

### Extracción: lector, reglas y rótulos

```
npm run test:extraccion          # las reglas de ficha, sobre documentos armados al vuelo
npm run test:extraccion-lector   # el lector de PDF: cifrado, sin capa de texto, sin páginas
npm run test:extraccion-rotulos  # todo motivo tiene rótulo en los dos idiomas
npm run test:extraccion-corpus   # las mismas reglas contra los informes reales del equipo
```

Ninguna necesita Playwright ni servidor. Las tres primeras se bastan solas; la del corpus
lee los PDF que haya en `data/uploads`, que está en `.gitignore`, de modo que el corpus no
viaja con el repositorio y la batería se salta sola donde no lo haya.

**`test:extraccion-rotulos` existe por una razón concreta.** `test:idiomas` no puede
vigilar las claves `extraccion.motivo.…`: se componen en tiempo de ejecución con el código
que manda el servidor, y allí no hay forma de distinguir el rótulo que sobra del que nadie
ha cableado todavía —la misma excepción, y por lo mismo, que la de `codigo.…`—. Ésta
coteja las dos listas en las dos direcciones: código sin rótulo, y rótulo que sobrevive a
su código. Sin ella la ausencia sería invisible, porque un motivo sin traducir no se ve
como una clave cruda: se ve como una frase castellana en mitad de la interfaz inglesa.

### Propuesta de ficha en el navegador

```
npm run test:propuesta
```

Donde las anteriores comprueban *qué* se lee de un documento, ésta comprueba **que leer no
rellena**: que el valor propuesto llega marcado y con su página, que un rango deja el campo
vacío, que el resumen ejecutivo se localiza pero no se copia, que el take profit no se
propone ni estando en el PDF, que aceptar conserva y descartar vacía, que vaciar o editar a
mano también resuelven, y que con una propuesta sin revisar el botón de publicar está
apagado y dice por qué. El recorrido entero se repite en los dos idiomas. 69
comprobaciones.

**Levanta su propio servidor** en un puerto libre, con `WARRANTS_DB` y `WARRANTS_UPLOADS`
apuntando a un directorio temporal: es la única batería que escribe, porque publica para
comprobar que lo aceptado se guarda y lo descartado no. No necesita, en cambio, servidor
levantado ni corpus —el informe de prueba se arma en la propia batería—, y sus dos últimas
comprobaciones son las que vigilan la fuga de adjuntos descrita en **Copias de seguridad**.

### Copia de seguridad y restauración

```
npm run test:copia
```

No comprueba que la copia «se haga»: hace el viaje entero. Copia, borra el origen, restaura
a otro directorio y exige que **cada fila de `adjuntos` vuelva a resolver en un fichero con
sus bytes exactos**. Por el camino verifica que lo repetido se enlaza y comparte inodo con
la copia anterior, que nada comparte inodo con el almacén vivo ni con el respaldo tras
restaurar, que borrar una copia vieja no daña a las posteriores, que un adjunto ausente da
código 2 con un mensaje que no puede confundirse con el de un fallo, y que un fallo de
verdad no deja ni copia ni parcial.

**Un parcial abandonado tiene su propio bloque**, porque es el caso que de verdad engaña: la
batería fabrica uno que por dentro es indistinguible de una copia buena —manifiesto
incluido— y con fecha del año 2099, y exige que no se ofrezca al listar, que `--ultima` no
lo elija, que nombrarlo explícitamente no lo restaure y que la copia siguiente no enlace de
él.

Sin navegador ni servidor. Redirige las tres variables de entorno y comprueba al terminar
que `data/copias` sigue como estaba. 64 comprobaciones.

### Aritmética del motor de cartera

```
npm run test:cartera
```

Ni navegador ni servidor ni red: el mercado se simula, de modo que cada caso es una cuenta
que se puede seguir a mano. La comprobación central no es un valor esperado sino una
identidad —**Σ (peso × rentabilidad) = rentabilidad total**—, que cuadra si y solo si cada
posición conserva su tramo y el importe liquidado permanece como caja. Un rebalanceo
silencioso, una renormalización de pesos o una caja reinvertida la rompen, y la rompen por
mucho.

Cuatro casos: una salida anterior al alta siguiente, el peso de una liquidada que no debe
engordar a las vivas, una posición sin precio de compra ni cotización viva —entrada al
cierre del alta, referencia al último cierre— y una cotización que no coincide con el
último cierre, que es el resquicio por el que la identidad se rompería sin ruido si el
titular saliera de la serie de cierres y las contribuciones de la cotización.

Otros cuatro cubren los **suelos de muestra**: que por debajo no salga número y que cada
cifra declare el suyo; la banda de en medio —cumplido el año, antes de los tres—, que es
la que justifica que los suelos sean dos, porque con uno solo uno de los dos casos estaría
mal necesariamente; que el umbral anunciado sea el que de verdad rige, comprobado en el
suelo justo y una sesión antes; y que por encima vuelvan todas, con el Sharpe afirmado
contra su definición recalculada allí mismo desde la serie publicada, que es lo que
distingue el exceso medio del CAGR.

Cada caso se vio fallar antes de darlo por bueno, con su propio defecto reintroducido. 67
comprobaciones, en menos de un segundo. Es la prueba más barata de la casa y habría cazado
desde el primer día que el índice publicara +169 % mientras sus líneas sumaban +68.

### Baterías completas

La entrega se validó con ocho baterías automatizadas sobre navegador real (Chromium),
**605 comprobaciones** en total, ejecutadas por duplicado con resultado idéntico:

- **124** comprobaciones sistemáticas de los fallos habituales en este tipo de
  plataformas (seguridad, validación, carga de ficheros, búsqueda, paginación, cartera,
  ciclo de vida e interfaz).
- **51** comprobaciones funcionales del cliente (navegación, diálogos, búsqueda
  incremental, gráfico, tooltip, teclado, rangos, responsive y accesibilidad).
- **67** comprobaciones de niveles operativos, liquidación por take profit, noticias,
  portada animada, tema claro/oscuro y movimiento reducido.
- **61** comprobaciones de la sindicación con Investing.com, documentos Word, edición
  directa de tesis, descarga pública y enlace corporativo.
- **59** comprobaciones de la clave de analista, la luz verde de sesión, el logotipo
  corporativo y la detección automática del banner.
- **105** comprobaciones del panel Market Intelligence: navegación por áreas, hero,
  panorama, radar, signal, cartera, research, catalizadores, noticias, responsive en
  cuatro anchos y ausencia de cifras fabricadas.
- **132** comprobaciones de la sección Options: capacidades del proveedor, cadena real,
  aritmética del score, clasificación prudente, distinción entre cero y ausencia de
  dato, histórico, interfaz, responsive y no regresión del resto de la plataforma.
- **7** casos deterministas del motor de cartera: coste real de compra, liquidación por
  take profit —incluida la que ocurre en la propia sesión de alta—, permanencia del
  importe como liquidez y su reinversión.

Ese recuento es el de **aquella entrega**. Las baterías de idiomas, repintado, vistas
derivadas, extracción y propuesta de ficha son posteriores y se documentan cada una en su
apartado, arriba. Queda una sin documentar, `npm run test:errores`, que coteja los códigos
de error del servidor con sus rótulos igual que `test:extraccion-rotulos` hace con los
motivos.

---

## Evolución prevista

El registro de usuarios para la descarga de informes está contemplado en el modelo: el
campo `nivel_acceso` (público, cliente, institucional, interno) ya acompaña a cada
informe y la descarga pasa por un endpoint propio, de modo que la restricción por perfil
se aplicará en ese único punto sin alterar el resto de la plataforma.

Las noticias sindicadas llegan sin cuerpo porque los canales RSS de Investing.com solo
publican el titular. Recuperar el desarrollo exigiría descargar cada artículo, y esa vía
está cerrada por Cloudflare además de plantear dudas de licencia; por eso la ficha remite
al original.

El campo `stop_loss` se registra y se muestra, pero todavía no cierra posiciones de
forma automática: a diferencia del take profit, un stop suele ejecutarse con
deslizamiento y conviene decidir si se quiere cierre automático al precio del stop o al
cierre de la sesión. Queda pendiente de esa decisión.
