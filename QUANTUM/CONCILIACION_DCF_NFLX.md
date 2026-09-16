# Por qué el DCF de este generador no coincide con la tesis de Netflix

> **Registro fechado.** Describe el informe NFLX generado el **03/03/2026**, no el
> comportamiento actual del generador. Las cifras se reproducen volviendo a generar
> ese informe; los datos de mercado se mueven y el modelo ha seguido cambiando desde
> entonces. Comprobado el 03/09/2026: la senda del DCF de Netflix arranca del consenso de
> analistas (13,4%), de modo que el puente del flujo de la sección 1 sigue siendo el
> que aquí se concilia.

Contraste contra **«Tesis de inversión NETFLIX», IEB / Tudor Stegaru, 03/03/2026**
(valoración 66,32 USD por acción, EV de 293.509 M, WACC 9,7%, g 2%).

El generador publica ahora el **puente del flujo** (apartado 14): el resultado
operativo y cada resta con su rótulo, y el FCFF como suma de esas líneas. Esto
existe precisamente para esto: antes las dos valoraciones diferían y no se podía
saber en qué línea. Ahora sí.

---

## 1. El primer año proyectado, línea a línea (millones de USD)

| Concepto | Este informe | La tesis |
|---|---:|---:|
| Ingresos 2026E | 51.221 | 51.192 |
| Métrica operativa de partida | **16.899** (resultado operativo antes de SBC) | **33.846** (EBITDA) |
| − Impuestos en caja | −2.873 | −787 |
| − Retribución en acciones | −516 | *no se resta* |
| − Capex | −871 | −770 |
| − Variación del fondo de maniobra | −30 | −47 |
| − Inversión en contenido | −3.381 *(desfase sobre la amortización)* | −20.009 *(desembolso íntegro)* |
| + Comisión de ruptura de Warner Bros. | *no se aplica* | +2.800 |
| **= Flujo de caja libre 2026E** | **9.229** | **12.233** |

Los ingresos coinciden con un 0,06% de diferencia: **la proyección de negocio es
la misma**. Todo el desacuerdo está debajo de la línea de ingresos.

Las dos primeras filas no son comparables entre sí y no tienen por qué serlo: la
tesis parte del EBITDA y resta el desembolso íntegro en contenido; este informe
parte del resultado operativo —que ya lleva descontada la amortización del
catálogo— y resta solo el **desfase** entre lo que se paga en efectivo y lo que
se amortiza. Son dos caminos al mismo sitio y, de hecho, se cruzan casi: 33.846 −
20.009 = 13.837, contra 16.899 − 3.381 = 13.518. Quedan 319 M de diferencia.

> **Corrección aplicada el 02/09/2026.** Las cifras de la columna izquierda han
> cambiado respecto a la primera versión de esta conciliación, y el motivo es un
> fallo de este generador, no de la tesis. La ruta que parte del resultado
> operativo arrancaba del EBIT contable —que ya lleva la retribución en acciones
> descontada— y el puente la volvía a restar: Netflix la pagaba dos veces.
> Además, lo que se restaba no era la cifra de Netflix sino el supuesto medio del
> perfil sectorial, un 2,30% de los ingresos frente al **1,01%** que la compañía
> publica. Corregidas las dos cosas, el flujo de 2026E pasa de 8.234 a **9.229**,
> que queda a un 0,4% de los 9.270 del modelo de referencia. La ruta que parte
> del EBITDA ya devolvía la retribución antes de restarla; ahora las dos rutas
> hacen lo mismo y hay una prueba que lo afirma.

## 2. Las tres diferencias que sí mueven el resultado

**a) La retribución en acciones (1.178 M en 2026, creciendo).** La tesis no la
resta. No consume tesorería, pero emite acciones nuevas: en una valoración *por
acción* es un coste real del accionista, y la propia tesis lo reconoce en su
apartado de gobierno corporativo —«prácticamente la totalidad del FCF se
desvanece en recompras» y aun así las acciones apenas bajan—. Este informe la
resta siempre y lo declara en el apartado 39.

**b) El tipo impositivo aplicado no es el declarado.** La tesis dice usar un 15%
(«se trata de la tasa media que ha asumido Netflix en los últimos años») y su
cuadro carga 787 M sobre un EBIT 2026E de ~15.900 M: un **4,9% efectivo**. La
misma discrepancia recorre los cinco años (1.619 M sobre ~32.000 M en 2030). Si
se aplicara el 15% que el texto anuncia, el flujo de 2026 bajaría en torno a
1.600 M y el de 2030 en unos 3.200 M. Es un desacuerdo entre una cifra y su
rótulo, del tipo que solo se ve afirmándolo.

**c) La comisión de ruptura de Warner Bros. (2.800 M) entra en el flujo.** Es un
cobro que ocurre una vez. Dentro del año 1 de un descuento de flujos empuja el
valor de empresa en ~2.550 M descontados. Este informe lo trataría como partida
no recurrente —el hueco «Partidas no recurrentes a depurar» del apartado 2 existe
para eso— y no lo mete en la senda.

## 3. El coste de capital NO es la causa principal

Es lo que parecía y no lo es. Reproduciendo los supuestos de la tesis en el
panel del generador —tipo libre de riesgo 4%, beta 1,20, horizonte de 5 años,
g del 2%, escenario base al 100%— sale:

| | Con los supuestos de la tesis | La tesis |
|---|---:|---:|
| WACC | 9,74% | 9,70% |
| Valor de empresa | 231.968 M | 293.510 M |
| **Valor por acción** | **52,21** | **66,32** |

El WACC queda igualado a 4 puntos básicos y el valor sigue 14 USD por debajo.
Los 14 USD son el flujo, no el descuento.

Corregida la doble resta de la retribución en acciones, el valor por acción sube
de 50,55 a 52,21 y el WACC no se mueve ni un punto básico: es la comprobación de
que el fallo estaba donde dice el recuadro de arriba —en el flujo— y de que el
coste de capital nunca fue la causa.

### La comprobación que lo cierra

Tomando **los flujos de la propia tesis** (12.233 / 16.435 / 20.309 / 24.453 /
29.275) y su WACC del 9,7%:

| | |
|---|---:|
| Valor actual de los cinco flujos explícitos | 75.505 |
| Valor terminal, FCFF₅/(WACC−g) | 380.192 *(publica 380.019)* |
| EV descontando el valor terminal al año 5 | 314.820 |
| EV descontando el valor terminal al **año 6** | **293.659** *(publica 293.510)* |

El valor de empresa de la tesis solo se reproduce **descontando el valor terminal
un año de más**. Con la convención habitual —el valor terminal es un valor de
final del año 5 y se descuenta cinco años— su propio modelo, sin tocarle una
sola hipótesis, daría **72,33 USD por acción en vez de 66,32**.

Esto juega a favor de la tesis en el sentido contrario a los tres puntos
anteriores: un año extra de descuento resta unos 6 USD, y compensa en parte los
que suman la dilución no restada, el tipo impositivo y la comisión de ruptura.
Las cuatro cosas se cancelan a medias, que es la razón de que el resultado
final pareciera razonable y la diferencia no se viera en ninguna cifra suelta.

Para el registro, los supuestos que este informe aplica por defecto y que la
tesis fija a mano:

| | Este informe | La tesis |
|---|---|---|
| Tipo libre de riesgo | 4,80% (bono a 10 años del día) | 4,00% |
| Coste de los fondos propios | 11,52% (CAPM con beta de Blume 1,34) | 10,00% (fijado, sin beta) |
| Peso de los fondos propios | 95,3% (valor de mercado) | 83,1% (valor contable) |
| Horizonte explícito | 10 años | 5 años |
| Crecimiento terminal | 3,00% | 2,00% |
| Valor terminal | FCFF·(1+g)/(WACC−g), descontado al año 10 | FCFF/(WACC−g), descontado al año 6 |

Ninguna de estas seis es un error: son decisiones. Las seis están ahora en el
panel de la izquierda y en la tabla del apartado 12, de modo que reproducir una
tesis ajena es cuestión de fijarlas, no de discutir el resultado.

## 4. Lo que sí coincide, y sirve de comprobación cruzada

- Ingresos 2026E: 51.221 contra 51.192 (+0,06%).
- Acciones diluidas: 4.343,863 M en los dos.
- **EV/EBIT forward: 20,7x en este informe.** La tesis cierra con «cotizando a
  un EV/EBIT forward de 25,7x» a un precio de 97,15 USD; al precio de hoy
  (80,81) ese mismo múltiplo son 21,4x. Se añadió el EV/EBIT al apartado 17
  precisamente para tener este contraste, que con EV/EBITDA no se podía hacer.

## 5. Conclusión

Las dos valoraciones dicen lo mismo del negocio y distinto del accionista. Los
ingresos coinciden al 0,06%; la diferencia entera está entre la línea de
ingresos y la de flujo.

Son cuatro discrepancias y no van en el mismo sentido. Tres suben el valor de la
tesis —la dilución que no se resta, un tipo impositivo del 4,9% donde el texto
anuncia un 15%, y una comisión de ruptura irrepetible metida en la senda— y una
lo baja: el valor terminal descontado un año de más. Se compensan a medias, y
por eso el resultado final parecía razonable y ninguna cifra suelta delataba el
desacuerdo. Es exactamente la clase de fallo que solo se ve afirmando que las
partes cuadran con el total, que es para lo que se ha puesto el puente.

Nada de lo anterior se ha cableado en el generador. El panel permite fijar cada
supuesto y el apartado 14 publica el puente, que es la única forma de que la
próxima discrepancia se vea en la línea donde nace.
