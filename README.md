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

La portada funciona como cuadro de mando y se compone de siete bloques:

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

**2 · Market snapshot** — S&P 500, Nasdaq 100, VIX y bono estadounidense a 10 años.
**Datos reales** resueltos por la cascada de mercado; un índice que no resuelva se
rotula `N/A` con su motivo.

**3 · W&C Radar** — Seis familias de señal. Cada una es un módulo independiente que
declara si tiene fuente:

| Señal | Estado | Origen |
|---|---|---|
| Momentum | **Operativa** | Fuerza relativa a 3 meses frente al S&P 500, derivada de series reales |
| Volatilidad | **Operativa** | Volatilidad realizada anualizada, derivada de series reales |
| Noticias | Operativa cuando hay piezas sobre la cartera | Repositorio de noticias |
| Options flow | Pendiente | Requiere proveedor de cadena de opciones |
| Institutional positioning | Pendiente | Requiere fuente de declaraciones 13F |
| Catalysts | Pendiente | Requiere calendario de eventos corporativos |

**4 · W&C Signal** — Indicador propietario en escala 0–100 sobre siete dimensiones
(Fundamentals, Options flow, Institutional positioning, Catalysts, Valuation,
Momentum, Risk) con sus pesos. **La arquitectura está completa; la puntuación no se
emite.** Mientras falten fuentes, muestra `N/A` y detalla qué le falta a cada
dimensión: preferimos eso a publicar un número que no podamos justificar.

**5 · Portfolio snapshot** — Portfolio return, benchmark, alfa, Sharpe, máxima caída
y volatilidad, más contribuidores y detractores. Reutiliza íntegramente las cifras
que ya calcula el motor de cartera, sin duplicar lógica.

**6 · Upcoming catalysts** — Interfaz de línea temporal preparada. Llega vacía
mientras no haya calendario conectado.

**7 · Latest news** — Titulares del repositorio, sindicados desde Investing.com.

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

---

## Cómo se construye la cartera

La cartera **se deriva íntegramente de los informes publicados**. Un informe genera
posición cuando tiene ticker y está marcado como «Incorporar a la cartera».

- **Fecha de alta** — la fecha de publicación del informe.
- **Precio de entrada** — el **precio de compra** consignado en la ficha. Si no se
  indica, se toma el cierre de la sesión de publicación.
- **Peso** — el asignado en la ficha; las posiciones sin peso explícito reparten el
  remanente a partes iguales. La suma se normaliza a 100 %.
- **Varios informes sobre un mismo valor** — la publicación más antigua fija la fecha
  de alta y la más reciente aporta la recomendación y el precio objetivo vigentes.

### Toma de beneficios automática

Cuando la ficha fija un **take profit**, la posición se liquida en la primera sesión
cuyo máximo alcanza ese nivel, al propio nivel fijado. A partir de ese momento:

- Deja de figurar entre las posiciones en cartera y pasa a **Posiciones liquidadas**,
  con su fecha de cierre, precio de salida y resultado realizado.
- Su importe permanece como **liquidez**, de modo que una caída posterior del valor ya
  no afecta al índice.
- Esa liquidez se reinvierte automáticamente en el siguiente rebalanceo, es decir,
  cuando se incorpore una nueva tesis.
- Los pesos de las posiciones que siguen vivas se renormalizan a 100 %.

La detección usa el **máximo** de cada sesión, que es el nivel al que se ejecutaría una
orden limitada, y nunca una sesión sin cruce real.

### Metodología del índice

Rentabilidad ponderada en el tiempo (TWR) encadenada, en base 100. La cartera se
mantiene sin rebalanceo entre altas; al incorporarse una nueva tesis el patrimonio
—posiciones vivas más liquidez— se redistribuye a los pesos objetivo. No se computan
aportaciones ni reembolsos externos, de modo que el índice recoge exclusivamente
rendimiento y es comparable con el índice de referencia sin sesgo de flujos.

> La primera sesión del índice puede no valer exactamente 100: si el precio de compra
> difiere del cierre de esa jornada, la diferencia es rendimiento real y el índice la
> recoge desde el primer día.

> El índice y las rentabilidades por posición responden a dos preguntas distintas: el
> índice mide la cartera con rebalanceos, mientras que la columna «Rentabilidad» de cada
> línea mide el valor desde su entrada. Sus cifras no son aditivas entre sí.

### Estadísticos

Rentabilidad total y anualizada · volatilidad anualizada (252 sesiones) · ratios de
Sharpe, Sortino y Calmar · máxima caída con sus fechas · beta, alfa de Jensen y
correlación frente al índice · sesiones positivas · mejor y peor sesión.

La tasa libre de riesgo por defecto es del 4 % y se ajusta con el parámetro `?rf=` del
endpoint de cartera. Índices de referencia disponibles: SPY, QQQ, DIA e IWM.

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
| `GET` | `/api/mercado/cartera` | Composición, liquidadas, serie histórica y estadísticos |
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
├── scripts/sembrar.js     Constitución de la cartera inicial
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

Genera un volcado consistente en `data/copias/`. Usa `VACUUM INTO` en lugar de copiar
el fichero, porque con el diario en modo WAL una copia directa puede capturar un
estado incoherente.

La ruta de la base de datos puede redirigirse con `WARRANTS_DB`, lo que permite
ejecutar pruebas contra una base desechable sin exponer los datos de trabajo:

```bash
WARRANTS_DB=/tmp/prueba.db npm start
```

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
| 4 | Las nueve secciones · mercado y opciones | pendiente |

> **Dos etiquetas del historial no dicen la verdad, y se quedan como están.** El commit
> `8e20efb` se llama «Fase 3: portada e inicio traducidas», pero lo que trae es la fase 4
> de **cartera y repositorio**; y `b0f0a3e`, que sí se anuncia como «Fase 4 (parcial)»,
> quedó por debajo de él en el orden. El contenido de los dos es correcto: lo que falla es
> el rótulo. Se corrige aquí, y no reescribiendo la historia: mover commits ya publicados
> cuesta más de lo que aclara una etiqueta.

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

La única prueba que **no** necesita Playwright ni servidor: es aritmética sobre los
diccionarios y corre en menos de un segundo. Comprueba que los dos idiomas declaran las
mismas claves, que una misma clave lleva los mismos marcadores `{…}` en ambos —a una
plantilla a la que le falte `{ticker}` el dato se le cae en silencio—, que las formas de
plural son categorías reales del idioma y siempre existe `other`, que una entrada
declarada como lista lo es en los dos, y que toda clave que el documento o el código
piden existe de verdad. Informa además, sin fallar, de las claves que nadie nombra y de
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
estadísticos, la leyenda del gráfico y los desplegables del repositorio. Verifica de paso
dos cosas que el repintado no debe romper: que el porcentaje conserva la convención del
idioma y que la selección que el usuario tenga hecha en un filtro sobrevive.

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
