# Discrepancias del generador contra la «Tesis Netflix» escrita a mano

> **Registro fechado.** Describe el informe NFLX generado el **01/09/2026**, no el
> comportamiento actual del generador. Las cifras se reproducen volviendo a generar
> ese informe; los datos de mercado se mueven y el modelo ha seguido cambiando desde
> entonces. Comprobado el 03/09/2026: la senda del DCF de Netflix arranca del consenso de
> analistas (13,4%), de modo que el puente del flujo de la sección 1 sigue siendo el
> que aquí se concilia.

Referencia estructural completa: `scratchpad/ref/referencia_nflx.md`.
Auditoría inicial sobre el informe NFLX del 01/09/2026; estado actualizado tras
la reforma de la pantalla y del modelo.

---

## CAUSAS RAÍZ — corregidas

### 1. Netflix se clasificaba como «Telecomunicaciones» — CORREGIDO

`perfiles.py` no tenía regla para la industria «Entertainment», que caía al
sector «Communication Services» y de ahí a telecos. Se ha añadido el perfil
**«Plataforma de suscripción de contenido»** y la regla de industria que lo
resuelve.

| | Antes | Ahora |
|---|---|---|
| Perfil | Telecomunicaciones | Plataforma de suscripción de contenido |
| Capex sobre ingresos | 16,0% (supuesto de teleco) | 1,7% |
| PER sectorial | 13,0x | 27,0x |
| Grupo comparable | T, VZ, TMUS, TEF.MC | DIS, WBD, SPOT, ROKU, FOXA, LYV |
| Riesgos | regulación de precios mayoristas | engagement, competencia por el tiempo, coste de contenido |

### 2. El EBITDA era la base del DCF — CORREGIDO

`PerfilSectorial.base_flujo` admite ahora `"ebitda"` u `"operativo"`. Con
`"operativo"`, `motor.construir_fcff_operativo` NO devuelve la amortización al
flujo y resta aparte el **desfase entre el gasto en contenido en efectivo y su
amortización** (6,6% → 1,0% de los ingresos). El apartado 12 imprime la base
elegida y su motivo; el apartado 8 deja de publicar la columna de EBITDA, y el
margen EBITDA del apartado 11 sale con su advertencia.

Proyección resultante contra el modelo de referencia:

| | Este informe | Referencia |
|---|---|---|
| Ingresos 2026E | 51.221 | 51.192 |
| FCFF 2026E | 9.229 | 9.270 |
| Ingresos 2035E | 103.489 | 99.312 |
| FCFF 2035E | 30.970 | 30.651 |

El FCFF de 2026 estaba 1.036 M por debajo de la referencia por un fallo propio,
corregido el 02/09/2026: la ruta que parte del resultado operativo restaba la
retribución en acciones **dos veces** —el EBIT contable ya la lleva descontada y
el puente la volvía a restar— y encima restaba el supuesto medio del sector
(2,30% de los ingresos) en vez del 1,01% que publica Netflix. Ahora las dos rutas
del modelo parten de una métrica sin retribución en acciones y proyectan la de la
compañía. Queda un 0,4% de diferencia contra la referencia.

### 3. Beta sin ajustar — CORREGIDO CON MATIZ

Se aplica el **ajuste de Blume** (⅔ de la beta histórica más ⅓ de la unidad),
que es una convención nombrada y verificable, y la tabla del WACC publica la
beta cruda y la empleada. NO se fija 1,10 por cuenta propia: eso es una
decisión discrecional del analista, y por eso existe el hueco «Justificación de
la beta empleada» del apartado 12. Con beta 1,10 el WACC baja al entorno del
9,5% y el valor razonable se acerca a los 75 USD de la referencia.

---

## VIOLACIONES DE LA REGLA 9 — corregidas

| # | Cifra | Antes | Ahora |
|---|---|---|---|
| 1 | Capitalización | ficha 337.466 vs apartado 17 352.048 | una sola, la de la ficha |
| 2 | Deuda neta | ficha 7.527 vs balance 5.181 | una sola, la del balance |
| 3 | Enterprise value | no era la suma de sus partes | capitalización + deuda neta del balance |
| 4 | Cita del valor | «NASDAQ: $NFLX» en la ficha, «Nasdaq Global Select Market (NasdaqGS): NFLX» en el resumen | la sigla en los dos sitios |

Cada una tiene su prueba y su mutación: `probar_una_sola_capitalizacion_en_el_documento`,
`probar_la_ficha_toma_la_deuda_neta_del_balance`,
`probar_el_valor_se_cita_igual_en_todo_el_documento`.

## TEXTO QUE CONTRADECÍA SUS PROPIAS CIFRAS — corregido

- El pilar 1 afirmaba «Descuento de valoración frente a la caja que ya genera»
  mientras el DCF del mismo informe situaba el valor razonable un 39% por
  debajo del precio. Ahora el pilar **cambia de signo con el resultado**: si el
  múltiplo dice barata y el flujo dice cara, lo dice y se declara el más frágil
  de los cinco. Prueba: `probar_pilar_de_valoracion_no_contradice_al_modelo`.
- El pilar de recompras daba por hecho «el descuento» que el modelo negaba.

## DATOS MAL LEÍDOS — corregidos

- **Fondo de comercio 33.838 M**: `_valor` acepta coincidencia parcial y
  «Goodwill» casaba con «Goodwill And Other Intangible Assets». Se lee ahora
  por nombre exacto (`_valor_exacto`); en Netflix sale `N/D` con su motivo y el
  catálogo capitalizado va en su propia fila, «Activos intangibles».
- **Titulares de otras compañías en el apartado 7** (DUOL, GOOGL, Duolingo):
  `titulares_del_valor` descarta el titular que abre con otro símbolo, el que
  usa el nombre como comparación («Netflix-Like») y el que no la nombra. Los
  descartes se **declaran** en los avisos, con su motivo.
- **Diferencial ROIC − WACC**: iba en «%», ahora en puntos porcentuales.

---

## LO QUE SIGUE SIENDO DEL ANALISTA, Y AHORA SE PIDE ANTES

31 bloques del informe modelo no salen de ninguna fuente estructurada. Antes se
declaraban dentro del PDF; ahora el catálogo de `informes/huecos.py` los coloca
como campo de entrada **en el punto exacto del documento donde va cada uno**, y
lo escrito pasa al documento final:

ficha (producto, tipo de empresa) · causas del movimiento del precio ·
separación del consenso · partidas no recurrentes · catalizadores recientes ·
matiz de los pilares · descripción del negocio · estructura de ingresos ·
mercados objetivo · segmentos · participaciones · operaciones corporativas ·
directivos · track record · catalizadores · matiz del ROIC · justificación de la
beta · motivo de la suma de partes · condiciones del precio objetivo · TAM/SAM/SOM ·
competidores · objeción al moat · narrativa bajista · bear case · declaración
del sesgo · episodios de resultados · asunciones clave · tramos de salida ·
fuentes adicionales · notas metodológicas.

Dos se declaran en el documento aunque queden vacíos, porque su ausencia es
información: **las causas del movimiento del precio** y **la declaración del
sesgo del informe**. El resto simplemente no aparecen. Ninguno se rellena nunca
con un número verosímil.

## PENDIENTE

- Ingresos por región desde el eje geográfico del XBRL (apartado 4).
- Columna «valor rodado a 24 meses» en la tabla de escenarios (apartado 12).
- Desglose del valor de empresa por fuente de crecimiento cuando no aplica la
  suma de partes (apartado 19).
- Desglose aritmético del precio objetivo (apartado 20).
- Calibración del modelo contra las cuentas reales, publicada con su desvío.
