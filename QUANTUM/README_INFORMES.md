# Generador de informes — Warrants & Co.

SaaS interno de generación de informes de análisis bursátil, valoración
intrínseca y posicionamiento institucional. Se introduce un ticker, se ajustan
los supuestos y sale el informe institucional completo de **39 apartados**
(secciones A a I) con su DCF en tres escenarios, exportable a HTML autocontenido
e imprimible a PDF con la retícula de la plantilla en papel.

Convive con el analizador de carteras sin tocarlo: son dos aplicaciones
independientes en el mismo repositorio.

```
streamlit run app_informes.py --server.port 8503     # interfaz completa
python generar_informe.py UBER LLY JPM               # por lotes, sin interfaz
python generar_informe.py AVGO --formato tearsheet --pdf
python emitir_informe.py AVGO --confirmado-por "Nombre Apellido"   # EMITE
python -m informes.pruebas_informe                   # la suite entera
python -m informes.pruebas_uber                      # contraste del motor
python -m informes.mutaciones                        # ver fallar cada prueba
python -m informes.verificar salida/*.html           # el HTML ya generado
python -m informes.acentuar --aplicar                # tildes de los literales
python -m tests muestras/informe.html                # auditoría del entregable
python -m tests --ticker AVGO                        # genera y audita
```

Antes de emitir nada hace falta `firma.json` en la raíz: quién firma, con qué
cargo, su certificación y bajo qué política de actualización. Y **solo** eso: ahí
cabe lo que es por naturaleza la declaración de una persona. Ni los conflictos
—que se comprueban— ni el reparto histórico —que se cuenta—; el validador de
esquema los rechaza en vez de ignorarlos, porque ignorarlos en silencio es como
llegaron. Se copia de `firma.ejemplo.json` **y se revisa**: ese fichero habla en
nombre de una persona.

Cinco formatos sobre el mismo modelo —`institucional`, `monografia`,
`tematico`, `nota` y `tearsheet`—: cambia lo que se imprime, no lo que se
calcula.

## La regla que gobierna el diseño

**Si el proveedor no publica un dato, sale `N/D`.** Nunca un cero, nunca la
media del sector, nunca el dato del ejercicio anterior. El informe distingue
siempre tres estados —hay dato · el dato es cero · no hay dato— y cada cifra
viaja con su procedencia:

| Marca | Significado |
|---|---|
| *(sin marca)* | Dato de mercado, o cálculo directo sobre datos de mercado |
| <sup>A</sup> | Introducido por el analista |
| <sup>E</sup> | Estimación del modelo |
| `N/D` | No publicado por la fuente (al pasar el ratón, el motivo) |

La pantalla de edición muestra un **registro de control de calidad** que separa
los huecos que puede cerrar el analista de las limitaciones de la fuente. No
viaja en el entregable —es el cuaderno del generador, no del cliente— y se
escribe además en un fichero `.calidad.txt` junto al informe. Un informe con
huecos declarados es útil; uno con huecos rellenados no lo es.

## Módulos

| Fichero | Cometido |
|---|---|
| `informes/modelos.py` | Estructuras de datos de los 39 apartados. La pieza central es `Dato`: valor + procedencia + motivo de ausencia. |
| `informes/motor.py` | Cálculo puro: WACC, DCF a tres escenarios, matriz de sensibilidad, DCF inverso, suma de partes, múltiplos, checklist. Sin red ni interfaz. |
| `informes/datos.py` | Ingesta de Yahoo Finance: cotización, estados financieros, cadena de opciones, 13F, insiders, interés en corto, consenso. |
| `informes/perfiles.py` | Lo que cambia entre sectores: vocabulario, múltiplos objetivo, riesgos típicos, moat, KPIs, supuestos de capex e impuestos. 16 perfiles. |
| `informes/narrativa.py` | Redacción cualitativa a partir de cifras ya calculadas. No inventa hechos del mundo. |
| `informes/construccion.py` | Orquestador: de un ticker a un `Informe` completo. |
| `informes/graficos.py` | Trece gráficos con la paleta de la casa. El color nunca es el único portador. |
| `informes/render.py` | HTML institucional autocontenido, con reglas `@page` para imprimir a PDF. |
| `informes/qr.py` | Codificador de QR en Python puro (sin dependencias) con decodificador de contraste. |
| `informes/legal.py` | Descargo de responsabilidad y restricciones de distribución, literales. |
| `informes/formato.py` | Cifras y fechas en convención española. |
| `informes/acentuar.py` | Utilidad de mantenimiento: repone tildes en los literales de texto. |
| `informes/formatos.py` | Los cinco formatos publicables y la hoja de síntesis que abre el institucional. |
| `informes/contraste.py` | Las tres familias de verificación: el informe contra la fuente, contra su propia definición y contra sí mismo. |
| `informes/huecos.py` | Catálogo de lo que ninguna fuente publica: qué falta, por qué no puede salir solo y qué hace falta para rellenarlo. |
| `informes/pruebas_uber.py` | Contraste del motor contra un informe ya publicado. |
| `informes/mutaciones.py` | Arnés de mutación: reintroduce cada defecto corregido y exige que LA prueba que dice cazarlo lo cace. |
| `informes/puerta.py` | La puerta de exportación: aborta —no avisa— cuando el documento no puede emitirse. Menciones obligatorias, etiqueta derivada de la escala, frescura, avisos graves, higiene del texto y catálogo de derivaciones. |
| `informes/firma.py` | Quién firma los informes de la casa, leído de `firma.json`. No se cablea en el código: escribir aquí la certificación de una persona sería declarar en su nombre. |
| `informes/indice.py` | El índice del informe en un solo sitio. Las referencias cruzadas del texto se generan de aquí; escritas a mano envejecían con cada reordenación y nadie las revisaba. |
| `informes/sec.py` | Conector con EDGAR: cuenta de resultados completa desde el XBRL del 10-K, desglose por segmentos y formularios 4 con su código de transacción, su precio y su fecha. |

## El motor está contrastado, no solo probado

`python -m informes.pruebas_uber` ejecuta **86 comprobaciones** contra las cifras
impresas del informe de Uber de agosto de 2026: la tabla año a año completa, el
valor de empresa, los tres valores por acción, las 25 celdas de la matriz de
sensibilidad, el DCF inverso y la suma de partes.

La prueba se ha visto fallar. Al introducir a propósito tres errores clásicos
—descontar a principio de periodo, olvidar el factor `(1+g)` del valor terminal
y no sumar las participaciones— cazó 41, 32 y 28 comprobaciones respectivamente.

### Tres discrepancias detectadas en el informe de referencia

El contraste encontró tres cifras que **no cuadran con las del propio informe
publicado**. El motor las hace imposibles por construcción:

1. **Valor terminal.** El informe publica 361.891 M y, dos líneas después, un
   valor actual de 176.856 M. Descontar 176.856 M diez años al 9,5% implica un
   valor terminal de 438.269 M, no de 361.891 M. *(El motor deriva uno del otro
   y no admite que se introduzcan por separado.)*
2. **Dos precios de referencia.** El upside del caso base (+67,0%), el ponderado
   (+55,6%) y el margen de seguridad (35,7%) están medidos contra 78,54 USD; el
   upside del precio objetivo de la ficha (+47,42%), contra 78,00 USD. *(El motor
   usa un único precio de referencia en todo el informe.)*
3. **Patrimonio neto.** El informe publica 28.399 M y un valor contable de
   13,32 USD por acción; 28.399 / 2.042 = 13,91. El 13,32 corresponde al
   patrimonio *sin* intereses minoritarios (27.316 M). *(El motor calcula el
   valor contable por acción a partir del patrimonio que publica, de modo que no
   pueden discrepar.)*

## Adaptación por sector

Cada empresa se valora como se valora su sector. El perfil se resuelve por
industria, y el caso del marketplace se detecta por el modelo de negocio, no por
la etiqueta: Yahoo clasifica a Uber como «Software - Application», igual que a un
fabricante de software empresarial.

En banca el enterprise value no significa nada —la deuda es materia prima, no
estructura de capital—, así que el informe **no publica** EV/EBITDA ni un DCF
sobre EBITDA: lo dice y valora por PER y precio sobre valor contable. Preferir el
hueco declarado al número sin sentido es la misma regla de siempre.

## Tres verificaciones distintas sobre cada cifra

Cada informe se audita solo, y las tres familias miran cosas distintas:

1. **Contra la fuente.** Lo que publica el informe frente a lo que publican SEC
   EDGAR e Investing: ingresos, acciones en circulación, precio de referencia.
2. **Contra su propia definición.** Cada cifra derivada se vuelve a calcular
   desde las que el propio informe imprime al lado. Un margen que no sea el
   cociente de las dos cifras de su fila salta.
3. **Contra sí mismo.** Coherencia entre apartados: el total de la cartera
   contra la suma de sus partes, la leyenda del gráfico contra su titular, el
   ejercicio estimado contra el primer año de la proyección.

Son **más de cien identidades por informe**, y el apartado 39 publica cuántas se
han comprobado. Medido sobre diez valores (AVGO, UBER, NFLX, JPM, LLY, KO, XOM,
TSLA, MSFT, PG): 1.059 identidades, cero discrepancias. Lo que no se puede
comprobar se declara como tal —no se cuenta como cuadrado— y dice por qué.

## Una prueba no vale por haberla escrito: vale por haberla visto fallar

`python -m informes.mutaciones` reintroduce, de una en una, cada defecto que
alguna vez estuvo en el código, y exige que LA prueba que dice cazarlo falle.
Una prueba que sigue en verde con el defecto puesto no protege de nada, y sin
este arnés no hay forma de saberlo.

## La puerta de emisión: aborta, no avisa

Un documento con precio objetivo, sesgo, nivel de entrada, tamaño de posición y
criterios de salida **es** una recomendación de inversión en el sentido del
Reglamento (UE) 596/2014, y se presenta conforme al Reglamento Delegado (UE)
2016/958. El descargo lo dice: negarlo no cambiaba lo que el documento es.

`informes/puerta.py` se ejecuta antes de entregar nada y levanta
`ExportacionBloqueada` con la lista entera de impedimentos —no el primero: quien
tiene que arreglarlos quiere verlos todos— si se cumple cualquiera de estas:

1. **Menciones obligatorias** vacías o con un relleno de espera. «Pendiente»
   cuenta como vacío: es peor, porque parece cumplimentado.
2. **La etiqueta no se sigue de la escala publicada.** No se lee de un panel: se
   deriva. Valor razonable por encima del precio y margen de seguridad positivo
   es LONG; por debajo, SHORT; el resto, NEUTRAL. Apartarse exige una
   justificación escrita que se imprime firmada en el apartado 1.
3. **Datos rancios.** Resultados publicados posteriores al último estado
   cargado, o una fecha anunciada como futura que ya pasó.
4. **Cualquier aviso grave.** Y el registro de control de calidad va a un
   fichero de trabajo, nunca al entregable.
5. **Higiene del texto.** Truncamientos, etiquetas internas del generador,
   marcas de proveedores no contratados y cualquier `N/D` derivable de dos
   magnitudes que el propio informe ya publica.

El BORRADOR se genera siempre, con sus avisos a la vista, que es lo que lo hace
útil para trabajar. Lo que la puerta gobierna es la emisión.

**Dónde aborta y dónde solo informa.** Aborta en `emision.emitir`, que es el
único camino. En la pantalla de edición no aborta: enseña el veredicto entero
—cada impedimento con su código y su remedio— y deja los botones de PDF y HTML
puestos. El generador produce antes el documento de trabajo de quien firma que
el entregable de un tercero, y quedarse sin PDF por un hueco que uno mismo va a
cerrar en diez minutos no protege a nadie. Lo que la pantalla no puede hacer es
anunciar una puerta cerrada teniendo al lado un botón que la abre: por eso dice
«esto es un borrador», que es literalmente lo que se descarga. Lo afirma
`probar_los_impedimentos_no_retiran_la_descarga`.

## Generar y emitir son dos programas, a propósito

Eran lo mismo con un interruptor. Del mismo motor salían dos documentos
indistinguibles —el de trabajo y el que se manda a un tercero— y el que decidía
cuál era cuál era un booleano en una línea de órdenes. Así salieron dos informes
del mismo valor, del mismo día, con etiquetas opuestas y el mismo código.

|  | genera | emite |
|---|---|---|
| cómo | `app_informes.py`, `generar_informe.py` | `emitir_informe.py` → `emision.emitir` |
| qué produce | un `Informe`: **borrador** | un `Emitido`: informe + `Menciones` |
| identificación | «BORRADOR — NO EMITIDO» en la portada y en cada hoja | el código del registro |
| menciones del Reglamento | **no las tiene** | las construye la emisión |
| conflictos | — | los responde una persona y los contrasta el fichero |
| deja detrás | un fichero | una línea encadenada en el registro y un commit |

La asimetría es el punto. Un borrador **no tiene** las seis declaraciones
obligatorias: no es que se le pidan y se le nieguen —eso alguien lo vuelve a
pedir al revés—, es que `FirmaDelInforme` no tiene esos campos y
`render._menciones_obligatorias` exige un objeto `Menciones` que solo construye
`emision.emitir`. Dibujar el bloque de menciones de un borrador es un error de
tipos, no una petición denegada. Y `Menciones` no tiene valores por defecto: una
a medias no se puede construir.

`emitir` **completa o lanza**. No hay «emitir con avisos», ni un parámetro para
saltarse la puerta, ni un valor de retorno que se pueda mirar por encima. Todo lo
que puede fallar se comprueba antes de tocar el registro —la puerta, la cadena,
el permiso de escritura, que la carpeta del registro sea un repositorio—, porque
descubrirlo después dejaría una secuencia gastada y ninguna entrada que la
justifique, y un registro con huecos deja de servir para lo único que sirve.

La pantalla no puede llegar a la emisión: no importa `emision`, no construye
`Menciones` y no llama a `emitir`. Lo afirma
`probar_solo_la_emision_construye_menciones`, y lo afirma sobre el código
—analizado, sin comentarios ni docstrings— y no sobre el texto, porque la
pantalla sí habla de la emisión y tiene que poder hacerlo.

## El registro de recomendaciones: el activo más frágil de la casa

El reparto histórico de recomendaciones —la divulgación del artículo 6 del
Reglamento Delegado (UE) 2016/958— **se cuenta, no se teclea**. Estuvo escrito a
mano en `firma.json` declarando dos recomendaciones que nunca se emitieron: eran
dos borradores del mismo valor, del mismo día, con etiquetas opuestas. No era un
dato incompleto; era una declaración obligatoria fabricada.

`informes/registro.py` mantiene un fichero JSONL de solo añadir en `registro/`.
Cada línea lleva el sha256 del **texto exacto** de la anterior. Medido: compactar
los separadores, cambiar el orden de las claves o escapar los acentos rompen la
cadena —las tres cosas que hace una herramienta al «arreglar» un JSON—, mientras
que convertir el fichero a CRLF no la rompe, porque se lee con traducción
universal de finales de línea. Por eso `.gitattributes` marca el fichero
`-text -diff -merge`: sobre todo `-merge`, porque fusionar un histórico de solo
añadir intercalaría líneas y rompería la cadena sin que nadie lo viera.

**El registro vive en un repositorio privado SEPARADO del código, con un commit
por emisión.** `registro.respaldar()` lo hace al emitir y dice si el push ha
fallado; no falla en silencio.

> **Perder ese repositorio es perder el historial de forma irreversible.** No se
> reconstruye de los PDF ni de los directorios de retención: la cadena de hashes
> exige el texto exacto de cada línea, que es justamente lo que le da valor. Un
> historial encadenado desde la primera emisión es una afirmación que se puede
> demostrar; una hoja de cálculo de aciertos no lo es. Respáldalo en más de un
> sitio.

Con el registro vacío el informe publica «ninguna recomendación emitida en los
doce últimos meses», no una tabla de ceros: tres ceros insinúan que se ha contado
y ha salido cero. Y un registro vacío **no impide emitir** —esa exigencia es lo
que empujó a teclear el reparto inventado: la puerta pedía una cifra que la casa
no tenía—. Lo que impide emitir es que la cadena no valide, que el fichero no sea
escribible o que alguien haya vuelto a escribir un dato derivado en `firma.json`.

## Conflictos: los responde una persona, el fichero los contrasta

La declaración de posición era un párrafo tecleado que afirmaba lo mismo para
todo emisor y todo día. Es un hecho, y un hecho se consulta.

La primera versión lo consultaba contra `posiciones.json` y solo contra él. Eso
tiene un defecto propio, y es el mismo que se está corrigiendo en todas partes:
**un fichero con fecha vieja produce una declaración falsa con apariencia de
comprobada**. Nadie miente; nadie actualiza un fichero, que es mucho más fácil.

De modo que la fuente es una persona respondiendo en el momento de emitir, y el
fichero es lo que la corrobora. `emitir_informe.py` pregunta dos cosas —si hay
posición en el emisor, de la firma o de quien firma, y si ha habido operaciones
propias en el instrumento desde que se produjo el borrador— y publica la
respuesta con el nombre de quien la dio y la hora, y la guarda entera en la
entrada del registro.

| desenlace | qué pasa |
|---|---|
| sin confirmación | **aborta**: nadie ha respondido, no hay nada que declarar |
| «sí» sin describirlo | **aborta**: un conflicto se revela describiéndolo |
| el fichero contradice a la confirmación | **aborta**: uno de los dos está mal y el programa no puede decidir cuál |
| sin fichero, o con fecha vieja | aviso: lo que se declara es la respuesta de hoy |
| hay posición, u hubo operaciones | se declara y se emite igual |

`posiciones.json` documenta la cartera vigente de los **dos sujetos que el
informe declara**: la firma y cada analista que pueda firmar, no solo el que
firme hoy. Con una sola lista, el día que firmara otro no habría nada contra lo
que contrastar y la comprobación pasaría en blanco sin decirlo. Y hay tres
estados: un analista con la lista vacía es «se ha mirado y no tiene»; uno que no
figura es «no se ha mirado», y eso deja aviso.

## La suite de auditoría del entregable

`informes/pruebas_*` afirma invariantes del generador. `tests/` comprueba un
INFORME: se ejecuta contra el HTML de un documento ya generado —y contra el
modelo del que salió cuando la familia lo necesita— y cada hallazgo cita el
identificador del catálogo de la auditoría institucional.

Once familias: identidades contables, identidades de valoración, coherencia
cruzada, `N/D` derivables, base contable, frescura, higiene del texto,
coherencia de la recomendación, menciones obligatorias, estimaciones y
maquetación. Lo que un formato no tiene por qué publicar se declara como no
aplicable; no se da por pasado.

## La base contable viaja pegada al dato

Todo beneficio, BPA, margen y múltiplo lleva su `Base` —GAAP, no-GAAP o la del
consenso— y `Base.comparable_con` prohíbe la resta entre bases distintas por
construcción. Era el error individual más caro del informe auditado: publicaba
una decepción del −17,3% en un trimestre restando un BPA GAAP reportado (2,68)
de un consenso no-GAAP (3,24), cuando el BPA no-GAAP real fue 3,32 y la compañía
había batido un 2,5%. Las dos cifras eran correctas; restarlas no lo era.

## Comprobaciones que el generador hace sola

- **Concordancia entre metodologías.** Si el DCF, los múltiplos, la suma de
  partes y el consenso divergen más de 1,8 veces entre el mayor y el menor, lo
  declara: cada vía por separado siempre parece verosímil, y el desacuerdo solo
  se ve afirmándolo.
- **Techo al crecimiento de partida.** Un 48% interanual no se extrapola diez
  años; se recorta al 25% y se avisa.
- **Cadena de opciones sin mercado.** Si el proveedor sirve una foto no
  refrescada —horquillas a cero, interés abierto a cero, volatilidades en la
  escalera 0,5/2^k del solver— el apartado sale sin datos en vez de con ratios
  calculados sobre ruido.
- **Deuda neta.** Se calcula como deuda total menos caja de la misma tabla, no
  se toma la partida del proveedor, que aplica un perímetro propio y discrepa de
  sus propios componentes.

## Herramientas integradas

- **Gráfico en vivo** con seis temporalidades (1D a 5A) y pre-market /
  after-hours en los intervalos intradía, con las tres referencias de la tesis
  —objetivo, valor razonable y suelo pesimista— sobre el mismo eje. Un botón lo
  incrusta en el informe.
- **Panel de edición** para el material que ninguna fuente publica: segmentos,
  participaciones, equipo directivo, catalizadores, tamaño de mercado,
  concentración de clientes, cartera de pedidos y competidores.
- **QR de verificación** con un código estable derivado de ticker, fecha y
  precio de referencia: dos emisiones distintas no comparten código.

## Fuentes

**SEC EDGAR** para todo lo que está en los formularios: la cuenta de resultados
completa línea a línea desde el XBRL del 10-K —incluida «otros ingresos y
gastos», que faltaba, y con el resultado consolidado separado del atribuible—,
el desglose por segmentos, la retribución en acciones, el capex, el impuesto
pagado en caja y los formularios 4 con el código de transacción de cada
operación.

**Yahoo Finance** para el precio y lo que no está en los formularios: la ficha
del valor, el balance, el estado de flujos, la cadena de opciones, los 13F
agregados y el consenso de analistas. Es un portal gratuito y el apartado 38 lo
declara como tal: agregar los 13F de todas las gestoras que declaran sobre un
valor y servir una cadena de opciones institucional exige un proveedor
especializado que la firma no tiene contratado.

**Investing.com** para la serie diaria de cierres con la que se mide la reacción
a cada publicación de resultados, cuando está configurado.

Y el rendimiento del bono del Tesoro estadounidense a 10 años (`^TNX`) como tipo
libre de riesgo. El inventario real de lo usado en cada informe, con qué cifra
sale de dónde, se imprime en su apartado 38.
