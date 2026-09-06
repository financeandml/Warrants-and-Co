# MOTOR.md — Definición matemática del motor de cartera

Especificación del **motor nuevo**, que se construirá en paralelo al actual sin
sustituirlo. Define cada métrica como una fórmula, no como una descripción, y
fija las identidades que deben cumplirse para que el resultado sea creíble.

**Estado: propuesta. No implementado. `src/cartera.js` no se ha tocado.**

Complementa a [`METODOLOGIA.md`](METODOLOGIA.md), que decide *qué* significa cada
cosa. Este documento dice *cómo se calcula*. Cuando discrepen, manda
`METODOLOGIA.md`.

---

## 0 · Bases fijadas

| | Valor | Origen |
|---|---|---|
| Divisa | **USD**, única | Decisión 2026-09-06 |
| Capital base | **100, nominal** | Decisión 2026-09-06 |
| Método de coste | **Medio ponderado móvil** | Decisión 2026-09-06 |
| Métrica oficial | **TWR** | Decisión 2026-09-06 |
| Métrica complementaria | **MWR/IRR** | Decisión 2026-09-06 |

**El 100 es una base de índice, no dinero.** Toda cifra monetaria que salga de
este motor está expresada en *unidades de índice*, no en dólares, y así debe
rotularse. Un patrimonio de 118,4 significa «118,4 % del capital base», no
«118,4 dólares» ni «118,4 millones».

La distinción tiene una consecuencia que conviene escribir antes de que alguien
la descubra en pantalla: **el motor no puede publicar ninguna cifra en dólares**
—ni P&L, ni coste, ni dividendo cobrado— porque no sabe cuánto dinero hay
detrás. Publica porcentajes, unidades de índice y multiplicadores. El día que
exista un patrimonio real, entra como un factor de escala y ninguna fórmula de
este documento cambia.

**Notación.** `q` cantidad de títulos · `P` precio por título · `c` comisiones ·
`C` coste total acumulado · `V` valor de mercado · `NAV` patrimonio · `F` flujo
externo de la cartera · `t` fecha.

---

## 1 · Las magnitudes de una posición

Todas se derivan recorriendo las transacciones de la posición **en orden
cronológico**. El orden no es un detalle de implementación: un split entre dos
compras afecta a la primera y no a la segunda, de modo que ninguna de estas
magnitudes puede calcularse como una suma agregada.

### 1.1 Estado acumulado

Se mantienen tres acumuladores, `q` (títulos), `C` (coste total) y `R` (P&L
realizado), inicializados a cero. Cada transacción los transforma:

| Tipo | `q` | `C` | `R` |
|---|---|---|---|
| **COMPRA** | `q + qₜ` | `C + qₜ·Pₜ + cₜ` | sin cambio |
| **VENTA** | `q − qₜ` | `C − qₜ·c̄` | `R + qₜ·(Pₜ − c̄) − cₜ` |
| **DIVIDENDO** | sin cambio | sin cambio | `R + qₜ·Pₜ − cₜ` |
| **COMISION** | sin cambio | sin cambio | `R − cₜ` |
| **SPLIT** | `q · rₜ` | sin cambio | sin cambio |
| **AJUSTE** | `q + qₜ` | `C + qₜ·Pₜ + cₜ` | sin cambio |

donde `c̄ = C / q` es el **coste medio evaluado antes de restar**, y `rₜ` el
ratio del split.

Dos consecuencias que la tabla hace visibles y conviene no perder de vista:

- **La comisión entra en el coste al comprar y sale del ingreso al vender.** No
  hay ningún sitio donde una comisión desaparezca.
- **El coste medio no cambia al vender.** Sale coste en proporción exacta a los
  títulos que salen. Lo que cambia es `R`.

### 1.2 Derivadas

```
c̄  = C / q                              coste medio        → N/A si q = 0
V   = q · P_mercado                       valor de mercado   → null si no hay precio
U   = V − C                               P&L no realizado   → null si V es null
T   = R + U                               P&L total
w   = V / NAV                             peso               → null si V es null
r   = T / C_invertido                     rentabilidad de la posición
```

`C_invertido` es el coste total **de todo lo que llegó a comprarse**, no el
vigente: una posición cerrada tiene `C = 0` y su rentabilidad seguiría siendo
divisible. Formalmente, `C_invertido = Σ (qₜ·Pₜ + cₜ)` sobre las COMPRA.

### 1.3 Estado de la posición

```
CERRADA   ⟺  q = 0
PARCIAL   ⟺  q > 0  ∧  ∃ VENTA
ABIERTA   ⟺  q > 0  ∧  ∄ VENTA
```

Derivado siempre, nunca tecleado. `cerrada_en` es la fecha de la venta que llevó
`q` a cero.

---

## 2 · Las magnitudes de la cartera

```
NAV(t)   = Σᵢ Vᵢ(t)  +  caja(t)
caja(t)  = capital_base + Σ valor_total(transacciones hasta t)
```

`valor_total` es la columna generada de `transacciones`: negativa al comprar,
positiva al vender y al cobrar dividendo, negativa en comisión suelta. La caja
sale por tanto de una sola fuente y no se lleva aparte.

```
capital_desplegado(t) = Σᵢ Cᵢ(t)                    coste vigente de lo abierto
liquidez(t)           = caja(t) / NAV(t)
asignación_i(t)       = Vᵢ(t) / NAV(t)
```

**ROIC.** Retorno sobre el capital que llegó a comprometerse:

```
ROIC = (Σᵢ Rᵢ + Σᵢ Uᵢ) / Σᵢ C_invertido,i
```

Nótese que el denominador **no** es el capital base: es lo que de verdad se puso
a trabajar. Con capital sin desplegar, ROIC y retorno total divergen, y deben.

**Drawdown.** Sobre la serie de NAV, que exige las instantáneas:

```
DD(t)  = NAV(t) / max NAV(s) − 1        para s ≤ t
MDD    = min DD(t)
```

---

## 3 · TWR — la métrica oficial

La serie se parte en sub-periodos cortando en **cada flujo externo**. Para el
sub-periodo *i* que termina en `tᵢ`:

```
             NAV(tᵢ) − NAV(tᵢ₋₁) − Fᵢ
    rᵢ  =  ──────────────────────────────
                  NAV(tᵢ₋₁) + Fᵢ


    TWR  =  ∏ (1 + rᵢ)  −  1
             i
```

**Qué es y qué no es un flujo externo `F`.** Es dinero que entra o sale *de la
cartera*: una aportación de capital, un reembolso. **Comprar una acción no lo
es** —mueve caja a posición dentro del mismo patrimonio— y tratarlo como flujo
sería el error que vacía de sentido la métrica.

Hoy `F = 0` en toda la serie: capital fijo desde el origen. Hay un solo
sub-periodo y por tanto

```
    TWR  =  NAV(final) / 100  −  1
```

Se implementa la forma general igual. El día que entre capital, la cifra sigue
significando lo mismo sin que nadie tenga que acordarse de cambiarla — y la
prueba de §6 verifica el caso con flujo aunque hoy no ocurra.

**Anualizado**, solo por encima del suelo de muestra (§5):

```
    TWR_anual  =  (1 + TWR)^(365,25 / días)  −  1
```

---

## 4 · MWR / IRR — la complementaria

La tasa `r` que anula el valor actual de los flujos:

```
        Fₜ                     NAV(T)
    Σ ───────────────  +  ─────────────────  =  0
    t  (1+r)^(t/365)       (1+r)^(T/365)
```

**Resolución numérica.** Newton-Raphson desde `r₀ = 0,1`, con respaldo de
bisección en `[−0,9999, 10]` si la derivada se acerca a cero o la iteración se
sale del intervalo. Tolerancia `1e−9`, máximo 200 iteraciones.

**Devuelve `null` —nunca una cifra de relleno— cuando:**

- hay menos de dos flujos;
- todos los flujos tienen el mismo signo, en cuyo caso no existe TIR;
- no converge dentro del límite.

Un `null` aquí es el tercer estado, no un cero.

**Cuándo coinciden con TWR.** Sin flujos externos intermedios, TWR y MWR miden
lo mismo y **coinciden por construcción**. Eso importa para las pruebas más que
para el producto: hoy no se distinguirían, así que ninguna prueba sin flujos
puede demostrar que están bien implementadas por separado (§6.4).

---

## 5 · Suelos de muestra

Se conservan íntegros los del motor actual, que siguen el mínimo del oficio:

| Cifra | Suelo | Por debajo |
|---|---|---|
| Rentabilidad anualizada | 252 sesiones | `null` + sesiones que faltan |
| Sharpe · Sortino · Calmar · alfa | 756 sesiones | `null` + sesiones que faltan |
| TWR, MWR, P&L, pesos, drawdown | sin suelo | siempre se publican |

Por debajo del suelo **no se calcula peor: no se calcula**, y la interfaz dice
cuántas sesiones faltan en vez de un «no disponible» mudo.

---

## 6 · Identidades que deben cumplirse

Son el contrato del motor. Cada una es una prueba (§8).

### I1 · Conservación de la caja

```
caja(t)  =  capital_base  +  Σ valor_total(transacciones hasta t)
```

La caja no se lleva como acumulador aparte: se deriva. Si alguien la mantuviera
en paralelo, habría dos fuentes para el mismo hecho.

### I2 · Composición del patrimonio

```
NAV(t)  =  Σᵢ Vᵢ(t)  +  caja(t)
```

### I3 · Descomposición del resultado

```
T_cartera  =  Σᵢ Rᵢ  +  Σᵢ Uᵢ
```

Realizado y no realizado parten el total y no se solapan.

### I4 · Los pesos cierran

```
Σᵢ wᵢ  +  liquidez  =  1
```

Sobre las posiciones **valorables**. Una posición sin precio tiene `w = null` y
queda excluida del sumatorio; entonces la identidad se declara *no comprobable
hoy* en vez de darse por buena. **Esto es nuevo respecto al motor actual**, que
no tiene ninguna posición sin valorar porque las inventa todas desde el peso.

### I5 · Aditividad de la contribución — **cambia de forma**

El motor actual sostiene:

```
    Σ (peso × rentabilidad de la línea)  =  rentabilidad total
```

y es cierto **porque cada línea compra un tramo fijo en su alta y no vuelve a
tocarse**. Con compras adicionales y ventas parciales esa identidad **deja de ser
válida**, y no por un error: el peso de una línea ya no es constante en el
periodo, de modo que «peso × rentabilidad» no es un sumando bien definido.

La identidad que la sustituye descompone la variación de patrimonio:

```
    NAV(t₁) − NAV(t₀)  =  Σᵢ ΔVᵢ  +  Δcaja
```

y la contribución de cada posición al retorno del periodo es

```
              ΔVᵢ  −  flujo_neto_de_caja_de_i
    contribᵢ = ────────────────────────────────
                        NAV(t₀)
```

donde `flujo_neto_de_caja_de_i` es lo que la posición absorbió o devolvió a la
caja en el periodo (negativo al comprar, positivo al vender o cobrar dividendo).
Restarlo es lo que impide que comprar más cuente como rendimiento.

Con eso, la identidad aditiva se recupera en su forma general:

```
    Σᵢ contribᵢ  +  contrib_caja  =  TWR del periodo
```

**Por qué se recupera.** Comprar mueve valor de la caja a la posición: el
término entra con signo positivo en `ΔVᵢ` y negativo en `Δcaja`, y se cancela.
Lo único que sobrevive al sumatorio es la variación de precio, que es
exactamente lo que el retorno debe recoger.

**Caso degenerado, y es el de hoy:** sin compras adicionales ni ventas
parciales, `flujo_neto_de_caja_de_i` es cero en todo periodo posterior al alta, y
la fórmula se reduce a la identidad actual. **El motor nuevo debe reproducir la
cifra del actual sobre los datos de hoy**, y esa es la prueba de conciliación.

### I6 · Realizado inmutable

```
    Rᵢ(t)  no depende de ningún precio de mercado
```

Recalcular la cartera dos veces con cotizaciones distintas debe dar el mismo
`R`. Si cambia, hay una cotización colándose donde solo debería haber
transacciones.

### I7 · Reconstruibilidad

```
    estado(posición)  =  f(transacciones)     y nada más
```

Borrar cualquier caché derivada y reconstruirla desde `transacciones` da un
resultado idéntico. Es lo que convierte la caché en copia y no en segunda fuente.

### I8 · Separación modelo / realidad

```
    R_realizado  ∩  resultado_de_modelo  =  ∅
```

Ninguna cifra suma operaciones reales con liquidaciones simuladas. El motor
nuevo **no lee `take_profit` ni `stop_loss` para cerrar nada**: son niveles
declarados.

---

## 7 · Comportamiento caso por caso

Doce casos, con el efecto exacto sobre cada magnitud. `→` significa «pasa a».

**1 · Una compra.** `q → q₀`, `C → q₀P₀ + c₀`, `R = 0`, `U = q₀(P−P₀) − c₀`.
Caja baja en `q₀P₀ + c₀`. Estado ABIERTA.

**2 · Varias compras.** El coste medio se mezcla:
`c̄ = (q₁P₁ + c₁ + q₂P₂ + c₂) / (q₁+q₂)`. `R` sigue en cero: comprar no realiza
nada. **La segunda compra no es rendimiento**, y de eso se encarga el término de
flujo de I5.

**3 · Venta parcial.** `R += q_v(P_v − c̄) − c_v`, `C −= q_v·c̄`, `q −= q_v`.
`c̄` **no cambia**. Estado PARCIAL. Caja sube en `q_v·P_v − c_v`.

**4 · Venta total.** Igual, con `q_v = q`. Resulta `q = 0`, `C = 0`, `V = 0`,
`U = 0`. Estado CERRADA, `cerrada_en` = fecha. `R` queda congelado para siempre.

**5 · Dividendo.** `R += q·P_div − retención`. `q`, `C` y `c̄` **intactos**. Caja
sube. Consecuencia: una posición que nunca se ha vendido puede tener `R > 0`.

**6 · Comisión de operación.** Viaja dentro de la compra o la venta. Nunca es
transacción propia.

**7 · Comisión suelta.** `R −= c`. Caja baja. `q` y `C` intactos.

**8 · Split.** `q → q·r`, `C` intacto, luego `c̄ → c̄/r`. `V` no cambia si el
precio se ajusta a la vez, que es lo que hace el proveedor. `R` intacto.

**9 · Posición abierta.** `V` y `U` se recalculan con cada cotización; `R` no.
Si no hay precio: `V = null`, `U = null`, `w = null`. **Nunca cero.**

**10 · Posición cerrada.** `V = 0`, `U = 0`, `w = 0` —ceros **reales**, no
ausencias—. `R` fijo. Sigue contando en el retorno acumulado y en el histórico.

**11 · Caja.** Derivada de I1. Con capital base 100 y nada comprado, `caja = 100`
y `liquidez = 100 %`. Con todo comprado, `caja = 0`, que es un cero real.

**12 · Take profit / stop loss.** **El motor nuevo no hace nada.** Son niveles
declarados en la tesis. La posición se cierra cuando hay una venta registrada, y
no antes. El track record de modelo se calcula aparte, con el motor actual, y se
rotula `MODELO`.

---

## 8 · Plan de pruebas — lo que el motor nuevo debe superar

Batería propuesta: `tests/motor.js`. Sin navegador, sin servidor, sin red: el
mercado se simula, igual que hace hoy `tests/cartera.js`. Cada caso construye
transacciones a mano y afirma cifras calculadas con lápiz.

### 8.1 · Unitarias de posición — 12 casos

| # | Caso | Afirma |
|---|---|---|
| U1 | Una compra | `q`, `C`, `c̄`, `R = 0`, `U` |
| U2 | Dos compras a precios distintos | `c̄` es la media ponderada, `R = 0` |
| U3 | Compra con comisión | `c̄` la incluye |
| U4 | Venta parcial | `R` correcto, `c̄` **no cambia**, estado PARCIAL |
| U5 | Venta total | `q=0`, `C=0`, `U=0`, estado CERRADA |
| U6 | Venta con pérdida | `R < 0` |
| U7 | Dividendo | `R` sube, `q` y `c̄` intactos |
| U8 | Comisión suelta | `R` baja, `q` y `C` intactos |
| U9 | Split entre dos compras | afecta a la primera y no a la segunda |
| U10 | Reentrada tras cierre | dos posiciones, `R` de la primera congelado |
| U11 | Sin cotización | `V`, `U`, `w` son `null`, **no 0** |
| U12 | Cerrada | `V`, `U`, `w` son `0`, **no null** |

### 8.2 · Identidades — 8 casos

Una por identidad de §6, sobre una cartera generada con transacciones
aleatorias de los seis tipos, repetida sobre varias semillas fijas.

| # | Afirma |
|---|---|
| ID1 | `caja = capital + Σ valor_total` |
| ID2 | `NAV = Σ V + caja` |
| ID3 | `T = Σ R + Σ U` |
| ID4 | `Σ w + liquidez = 1` sobre las valorables; `null` si alguna no lo es |
| ID5 | `Σ contrib + contrib_caja = TWR del periodo` |
| ID6 | `R` no cambia al recalcular con otras cotizaciones |
| ID7 | Borrar la caché y reconstruirla da lo mismo |
| ID8 | Ninguna cifra real incluye liquidaciones simuladas |

### 8.3 · TWR y MWR — 6 casos, y el cuarto es el que importa

| # | Caso | Afirma |
|---|---|---|
| P1 | Sin flujos | `TWR = NAV/100 − 1` |
| P2 | Sin flujos | **`TWR = MWR`** — coinciden por construcción |
| P3 | Aportación intermedia | `TWR` **no** se altera por el momento del flujo |
| P4 | **Aportación intermedia antes de una caída** | **`TWR ≠ MWR`**, y `MWR < TWR` |
| P5 | Flujos del mismo signo | `MWR = null`, no una cifra |
| P6 | Cada rótulo de interfaz nombra la métrica que muestra | ningún «rentabilidad» a secas |

**P4 es la prueba que impide el verde falso**, y merece decirse por qué. Con
capital fijo —el caso de hoy— TWR y MWR coinciden, de modo que una batería sin
flujos pasaría igual con las dos funciones **intercambiadas**, o con una llamando
a la otra. Solo un flujo intermedio las separa. Es exactamente la familia de los
tres verdes falsos que `CLAUDE.md` documenta, y por eso va escrito antes de
escribir el motor y no después.

### 8.4 · Conciliación con el motor actual — el criterio de aceptación

Sobre los datos reales migrados, ejecutados los dos motores:

| # | Afirma |
|---|---|
| C1 | Serie de NAV coincide **sesión a sesión**, tolerancia 1e−6 |
| C2 | Retorno total coincide |
| C3 | Capital desplegado y liquidez coinciden |
| C4 | Peso vigente de cada posición coincide |
| C5 | Contribución de cada posición coincide |
| C6 | Máxima caída coincide |
| C7 | Sharpe, Sortino, Calmar, beta y alfa coinciden |
| C8 | Los suelos de muestra se activan en las mismas cifras |

**Si alguna difiere en un solo punto, el motor nuevo está mal y no se conmuta.**

Con una salvedad que hay que escribir ahora para no discutirla luego: **el
realizado NO coincidirá, y es correcto que no coincida.** El actual lo deriva de
liquidaciones simuladas; el nuevo solo cuenta operaciones reales, y hoy no hay
ninguna. La conciliación se hace, por tanto, sobre el **track record de modelo**
alimentando el motor nuevo con las mismas liquidaciones simuladas como entrada
de prueba —nunca escritas en `transacciones`—, y por separado se afirma que el
realizado real es `null`.

### 8.5 · Degradación — 5 casos

| # | Caso | Afirma |
|---|---|---|
| D1 | Sin precio para una posición | la cartera se publica, esa línea va `null` |
| D2 | Sin precio para ninguna | `NAV = null`, no `caja` |
| D3 | Serie más corta que el suelo | anualizada y ratios `null` + sesiones que faltan |
| D4 | Cartera sin transacciones | `NAV = capital`, `liquidez = 100 %`, retorno `0` real |
| D5 | Transacción con fecha anterior al alta | se rechaza, no se ignora en silencio |

**Total: 43 casos.** Ninguno necesita red ni navegador.

---

## 9 · Lo que este documento deja pendiente

- **La contribución de la caja** (`contrib_caja` en I5) es cero mientras la caja
  no devengue intereses. Si algún día se remunera, deja de serlo y I5 necesita
  el término.
- **Multi-divisa.** Todas las fórmulas llevan implícito `fx = 1`. Con más de una
  divisa, cada `P` se multiplica por el cambio del día y `c̄` queda en divisa
  base. Ninguna identidad cambia de forma.
- **Instantáneas.** TWR, drawdown y contribución por periodo exigen la serie de
  `instantaneas_cartera`. Sin ella solo se puede calcular el instante actual.
  Es la primera dependencia real del motor nuevo.
