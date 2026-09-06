# METODOLOGIA.md — Warrants & Co.

Cómo se registra una posición y cómo se mide su rendimiento. Este fichero es la
fuente única de la metodología: cuando el motor y este documento discrepen, el
error está en el motor.

**Estado: aprobado, no implementado.** Recoge las decisiones D1, D2 y D3 tomadas
el 2026-09-06. El motor actual (`src/cartera.js`) todavía funciona con el modelo
anterior —tramos de peso sobre `informes`— y no se toca hasta la fase 6 del plan.
Lo que sigue describe el destino, y por eso está escrito en presente: es el
contrato que la implementación tendrá que cumplir, no una crónica de lo que hace
hoy.

---

## 1 · La fuente de verdad de una posición

**Una posición es la suma de sus transacciones.** No hay otra definición.

La fila de `posiciones` guarda únicamente **identidad y ciclo de vida**: a qué
compañía pertenece, de qué tesis nace, cuándo se abrió, en qué estado está y con
qué vehículo. No guarda cantidad, ni coste, ni valor, ni peso, ni resultado.

Esto no es una preferencia de diseño. Si la cantidad viviera a la vez en
`posiciones` y en `transacciones`, habría dos respuestas para «cuántos títulos
tengo» y nada obligaría a que coincidieran. Es la regla 9 de `CLAUDE.md` aplicada
al hecho central de la plataforma.

| Vive en `posiciones` | Se deriva de `transacciones` |
|---|---|
| `compania_id`, `tesis_id`, `cartera_id` | cantidad actual |
| `abierta_en`, `cerrada_en` | coste medio |
| `estado`, `vehiculo`, `divisa` | valor de mercado |
| `notas` | peso |
| | P&L realizado y no realizado |
| | rentabilidad y contribución |

`abierta_en`, `cerrada_en` y `estado` figuran en la tabla pero **tampoco se
teclean**: los escribe el servicio a partir de las transacciones. Están ahí para
poder indexar y filtrar sin recorrer el libro entero, no porque sean un dato
independiente.

## 2 · La fuente de verdad del peso

```
peso = valor_mercado_de_la_posicion / NAV_de_la_cartera
```

**El peso no se introduce nunca a mano.** No hay campo de peso en ningún
formulario, no hay columna de peso en ninguna tabla, y no existe forma de
declarar que una posición «pesa un 8 %». Pesa lo que vale respecto a lo que vale
la cartera, y eso se calcula.

Tres estados, y el tercero importa:

| Situación | `peso` |
|---|---|
| Hay cotización y hay cantidad | la cifra |
| Cantidad cero (posición cerrada) | `0` — un cero **real** |
| Sin cotización ni cierre cacheado | `null` — **no es 0 %** |

`cartera.js` ya distingue hoy estos tres casos en `pesoVigente`, con el
razonamiento escrito junto al código. Esa distinción se conserva entera.

---

## 3 · Cómo se registra una compra

Transacción de tipo `COMPRA`:

| Campo | Obligatorio | Nota |
|---|---|---|
| `posicion_id` | sí | si no existe posición abierta para esa compañía, se abre |
| `fecha` | sí | fecha de **ejecución**, no de anotación |
| `cantidad` | sí | títulos, positivo |
| `precio` | sí | por título, en la divisa de la operación |
| `comisiones` | sí | `0` es un valor legítimo, no una ausencia |
| `divisa` | sí | |
| `tipo_cambio` | si difiere de la divisa base | el del día de la operación |

Efecto: `cantidad += cantidad`, `coste_total += cantidad × precio × fx + comisiones`.

**La comisión entra en el coste.** Una comisión que no toca el coste desaparece
del rendimiento sin dejar rastro, que es justo el tipo de fuga que esta
metodología existe para impedir.

## 4 · Cómo se registra una venta parcial

Transacción de tipo `VENTA` con `cantidad < cantidad_actual`.

```
coste_medio      = coste_total / cantidad          ← se calcula ANTES de restar
pnl_realizado   += cantidad_vendida × (precio × fx − coste_medio) − comisiones
coste_total     -= cantidad_vendida × coste_medio
cantidad        -= cantidad_vendida
estado           = PARCIAL
```

El coste medio **no cambia** al vender: sale coste proporcional a los títulos que
salen. Lo que cambia es el resultado realizado, que crece.

## 5 · Cómo se registra un cierre

Un cierre no es un tipo de transacción: **es la consecuencia de que la cantidad
llegue a cero.**

```
si cantidad_actual == 0 → estado = CERRADA
                          cerrada_en = fecha de la última venta
```

No existe un botón de «cerrar posición» que escriba un estado. Se vende lo que
queda, y la posición se cierra sola. Una posición cerrada conserva todo su
historial y su P&L realizado, que ya no vuelve a cambiar.

**Take profit y stop loss no cierran nada.** Son niveles declarados en la tesis
—lo que el analista dijo que haría—, no órdenes que el sistema ejecute. Una tesis
puede tener el take profit superado y la posición abierta: eso es información
sobre disciplina de ejecución, y hoy es imposible de representar.

## 6 · Cómo se registra un dividendo

Transacción de tipo `DIVIDENDO`. `cantidad` es el número de títulos que cobran y
`precio` el importe por título; el producto es el bruto. La retención, si la hay,
se anota como `comisiones`.

```
pnl_realizado += (cantidad × precio × fx) − comisiones
```

**El dividendo no altera el coste medio ni la cantidad.** Es renta, no una
devolución de capital. Va entero a resultado realizado, y por eso una posición
que nunca se ha vendido puede tener P&L realizado positivo.

## 7 · Cómo se registra una comisión

Dos casos distintos y no se mezclan:

- **Comisión de operación** — viaja en el campo `comisiones` de la propia compra
  o venta. Entra en el coste o sale del ingreso.
- **Comisión suelta** —custodia, cambio de divisa, mantenimiento— es una
  transacción de tipo `COMISION` con `cantidad` y `precio` nulos y su importe en
  `comisiones`. Resta directamente del resultado realizado sin tocar la cantidad.

## 8 · Corporate actions

`SPLIT` multiplica la cantidad acumulada **hasta esa fecha** por el ratio, y deja
el coste total intacto —el coste medio se divide solo, por aritmética—. Por eso el
recálculo recorre el libro en orden cronológico y no como una suma agregada: un
split entre dos compras afecta a la primera y no a la segunda.

`AJUSTE` es el asiento de corrección. **Las transacciones no se editan ni se
borran**: un libro de operaciones que se puede reescribir no es un libro de
operaciones. Un error se corrige con un asiento que lo compensa y una nota que
dice por qué.

---

## 9 · Qué significa exactamente REALIZED

> **Resultado realizado es, exclusivamente, el que producen operaciones reales
> registradas en `transacciones`.**

Se compone de tres cosas y de ninguna más:

1. la diferencia entre precio de venta y coste medio, en cada venta ejecutada;
2. los dividendos cobrados;
3. las comisiones pagadas, con signo negativo.

Es un **hecho cerrado**: no cambia cuando cambia la cotización. Una vez vendido,
lo ganado está ganado.

**Consecuencia inmediata y hay que asumirla:** mientras no haya transacciones
reales anotadas, el resultado realizado de la cartera es `null` —no hay operación
que lo produzca—, y **no es cero**. Cero significaría «se operó y no se ganó
nada», que es falso. La cifra de realizado que la plataforma publica hoy procede
del modelo, no de operaciones, y por eso pasa a vivir donde le corresponde (§11).

## 10 · Qué significa exactamente UNREALIZED

> **Resultado no realizado es el de las posiciones reales abiertas, valoradas a
> precio de mercado.**

```
valor_mercado    = cantidad_actual × precio_actual × fx_actual
pnl_no_realizado = valor_mercado − (coste_medio × cantidad_actual)
pnl_total        = pnl_realizado + pnl_no_realizado
```

Cambia con cada cotización. Si no hay precio, es `null`, nunca `0`: una posición
que no se ha podido valorar hoy no es una posición que no ha ganado nada.

## 11 · Qué significa SIMULATED / MODEL

> **Track record de modelo: el rendimiento que la cartera habría tenido si las
> reglas declaradas en cada tesis se hubieran ejecutado sin fallo.**

Es lo que la plataforma calcula hoy: cada tesis compra su tramo en la fecha de
publicación y se liquida en la primera sesión cuyo máximo toca el take profit o
cuyo mínimo cruza el stop loss. Nadie ejecutó esas órdenes. Las dedujo el motor.

Y por eso, decisión explícita del 2026-09-06:

- **Las liquidaciones simuladas NO se convierten en transacciones.** No entran en
  `transacciones` ni siquiera marcadas. Esa tabla contiene operaciones reales y
  nada más; admitir una sola fila deducida la convertiría en un sitio donde hay
  que mirar la etiqueta antes de fiarse de la fila.
- **El histórico de modelo se conserva**, no se borra. Sigue derivándose de
  `informes` con `take_profit` y `stop_loss`, que por eso no se retiran.
- **Se rotula siempre.** Toda cifra de esta procedencia lleva `MODELO` o
  `SIMULATED` en pantalla, junto a la cifra y no en una nota al pie.
- **Nunca se suma con lo real.** No existe un total que mezcle resultado realizado
  y resultado de modelo. Son dos columnas, nunca una.

Su migración a una forma propia se diseñará por separado. Hasta entonces vive
donde está.

| | Origen | Etiqueta | ¿Suma con las otras? |
|---|---|---|---|
| **Realizado** | ventas y dividendos reales | *Realized* | con no realizado |
| **No realizado** | posiciones reales abiertas | *Unrealized* | con realizado |
| **Modelo** | reglas de la tesis aplicadas al histórico | **Model / Simulated** | **con ninguna** |

---

## 12 · TWR — definición matemática y funcional

**Time-Weighted Return.** Mide el rendimiento de las **decisiones de inversión**,
neutralizando el efecto de cuándo entra y sale dinero de la cartera.

La serie se parte en sub-periodos, cortando en cada flujo externo. Para el
sub-periodo *i*:

```
             NAV_i − NAV_(i−1) − F_i
    r_i = ─────────────────────────────
                NAV_(i−1) + F_i

    TWR = Π (1 + r_i) − 1
           i
```

donde `F_i` es el flujo externo al inicio del sub-periodo —aportación positiva,
reembolso negativo—. Un flujo externo es dinero que entra o sale **de la
cartera**; comprar una acción no lo es: mueve caja a posición dentro del mismo
patrimonio.

Anualizada, cuando la muestra alcanza el suelo:

```
    TWR_anual = (1 + TWR)^(365,25 / dias) − 1
```

**Funcionalmente:** es la cifra que permite comparar contra un índice. El S&P 500
no recibe aportaciones, así que solo una medida inmune a los flujos puede ponerse
a su lado sin mentir.

**Nota sobre el caso actual:** hoy la cartera no tiene aportaciones ni reembolsos
—capital fijo desde el origen—, de modo que hay un solo sub-periodo y el TWR
coincide con el cociente simple de NAV. La fórmula general se implementa igual: el
día que entre capital, la cifra sigue significando lo mismo sin que nadie tenga
que acordarse de cambiarla.

## 13 · MWR / IRR — definición matemática y funcional

**Money-Weighted Return.** Mide el rendimiento del **capital efectivamente
invertido**, y sí depende de cuándo entró.

Es la tasa `r` que anula el valor actual de todos los flujos:

```
        F_t                    NAV_final
    Σ ────────────  +  ──────────────────────  =  0
    t  (1+r)^(t/365)        (1+r)^(T/365)
```

con `t` en días desde el origen y `T` el horizonte total. No tiene solución
cerrada: se resuelve numéricamente —Newton-Raphson con respaldo de bisección en
`[−0,9999, 10]`—.

**Devuelve `null`, no una cifra, cuando:**
- hay menos de dos flujos;
- todos los flujos tienen el mismo signo (no hay TIR);
- el método no converge en el límite de iteraciones.

**Funcionalmente:** responde a «¿cuánto ha rentado mi dinero?». Si se aporta justo
antes de una caída, el MWR baja aunque las decisiones fueran buenas. Eso es
correcto: es información sobre el capital, no sobre el criterio.

## 14 · Cuándo se usa cada uno

| | TWR | MWR / IRR |
|---|---|---|
| Comparar con benchmark | **sí** | nunca |
| Titular público | **sí** | nunca |
| Alfa, beta, Sharpe, Sortino, Calmar | **sí** | nunca |
| Rendimiento del capital del analista | no | **sí** |
| Terminal privado | sí | **sí, junto al TWR** |

**No se mezclan jamás bajo el mismo rótulo.** Ninguna pantalla dice «rentabilidad»
a secas: dice «TWR» o dice «MWR», siempre, incluso donde solo aparece una.

**La batería tiene que afirmarlo**, y no basta con comprobar que las dos funciones
existen. La prueba construye un caso con un flujo externo intermedio —el único
escenario en que TWR y MWR divergen de verdad—, verifica que **dan cifras
distintas**, y verifica que cada rótulo de la interfaz nombra la que le
corresponde. Con capital fijo las dos coinciden, así que una prueba sin flujo
pasaría con las dos funciones intercambiadas: sería un verde falso de la misma
familia que los tres que `CLAUDE.md` ya documenta.

## 15 · Qué se publica dónde

**Web pública — titular:**

```
    TWR desde origen · TWR del año en curso · TWR del benchmark
```

Y junto a ellas, sin excepción: alfa, beta, máxima caída, y el **rótulo de
procedencia** de cada una. Donde la muestra no alcance el suelo estadístico —252
sesiones para anualizar, 756 para los ratios— la celda dice cuántas sesiones
faltan, que es lo que ya hace hoy.

El track record de modelo puede publicarse, y va **en su propio bloque, con su
propio título, nunca intercalado** con las cifras reales.

**Terminal privado:** todo lo anterior más MWR/IRR, coste medio, cantidades,
P&L realizado y no realizado por línea, comisiones acumuladas, dividendos
cobrados, y el libro de transacciones completo.

**Lo que no sale nunca por la ruta pública:** cantidades de títulos, coste medio,
importes absolutos. La vista pública habla en porcentajes y contribuciones. No es
un filtro sobre la respuesta privada —un filtro deja pasar por omisión cualquier
campo nuevo—: son dos formadores de respuesta distintos sobre el mismo servicio, y
una prueba afirma que el público no contiene importes.

---

## Lo que esta metodología deja pendiente

Dos decisiones tomadas y una abierta, para que quien lea esto sepa qué está
cerrado y qué no:

- **Método de coste: medio ponderado móvil.** Recomendado y pendiente de
  confirmación explícita. FIFO solo haría falta para declarar plusvalías por lote.
- **Divisa.** No existe conversión en ninguna parte del sistema. Mientras toda la
  cartera esté en una sola divisa el problema no se manifiesta; en cuanto haya
  dos, las cifras agregadas serán incorrectas y verosímiles a la vez. `tipo_cambio`
  está en el esquema para cuando se resuelva.
- **Capital de la cartera.** `BASE_INDICE = 100` es hoy el capital. Con cantidades
  reales hace falta un capital de verdad en `carteras.capital_inicial`, o la
  decisión explícita de conservar 100 como capital nominal.
