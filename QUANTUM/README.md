# Analizador Cuantitativo de Carteras

Herramienta de analisis cuantitativo de carteras de inversion: descarga precios
reales de mercado, calcula rendimiento, riesgo, salud, optimizacion (Markowitz),
rebalanceo, proyeccion Monte Carlo y exposicion a factores, y lo presenta en un
panel interactivo (Streamlit).

Cubre las 15 secciones del indice de referencia del proyecto, con la cartera
por defecto:

| Ticker | Activo | Peso |
|---|---|---|
| NVDA | NVIDIA Corporation | 15% |
| AAPL | Apple Inc. | 15% |
| AMZN | Amazon.com, Inc. | 15% |
| JNJ | Johnson & Johnson | 15% |
| JPM | JPMorgan Chase & Co. | 15% |
| GLD | SPDR Gold Shares | 15% |
| KO | The Coca-Cola Company | 10% |

La cartera, la divisa base, el capital, el periodo, el benchmark, los umbrales
de riesgo, los parametros de Monte Carlo y el rebalanceo son todos configurables
desde la barra lateral (la tabla de activos admite anadir/quitar filas, asi que
sirve para analizar cualquier otra cartera, no solo la de por defecto).

## Importar tu propia cartera (Excel / CSV)

En vez de teclear las posiciones una a una, puedes subir un `.xlsx`/`.csv` desde
la barra lateral ("Importar cartera"). El archivo solo necesita:

- una columna de **ticker**: `Ticker`, `ticker_yahoo`, `symbol`, `simbolo`...
- una columna de **peso**: `Peso %`, `peso norm`, `peso`, `weight`...
- opcionalmente una columna de **nombre**: `emisor`, `nombre`, `name`, `empresa`...
  (se usa para etiquetar las tablas con el nombre real de la compania)

La importacion limpia los datos y explica siempre que ha excluido y por que:

- Los pesos se aceptan tanto en base-100 (`15` = 15%) como en base-1 (`0.15`).
- Se descartan las filas **sin ticker** (tipicamente la linea de liquidez /
  efectivo, que no cotiza y no puede analizarse), las de **peso 0** y las que
  tienen un ticker marcador de pendiente (`REVISAR`, `TBD`, `N/A`...).
- Los tickers duplicados se **fusionan sumando** sus pesos.
- El resto se **renormaliza a 100%**, y se muestra el peso bruto original para
  que sepas que porcion de la cartera cubre realmente el analisis.
- Si el Excel tiene varias hojas, se busca automaticamente la que contenga
  columnas reconocibles (una hoja de notas o portada no rompe la importacion).

## Carteras multi-divisa

Cada activo se descarga en su **divisa nativa de cotizacion**, consultada al
proveedor de datos (no se deduce del sufijo del ticker), y se convierte a la
divisa base elegida usando **tipos de cambio diarios reales** antes de calcular
ninguna metrica. Sin este paso, una cartera repartida entre varios mercados
mezclaria el movimiento del activo con el de su divisa y falsearia
rentabilidades, volatilidades y correlaciones.

Incluye el caso de las divisas fraccionarias: los valores del LSE cotizan en
**GBp (peniques, 1/100 de libra)**, no en GBP, y tratarlos como libras
introduciria un error de 100x. La distincion se hace por mayusculas (`GBp` vs
`GBP`), igual que la reporta el proveedor.

## Control de calidad de los datos de precios

Un split o dividendo que el proveedor no ha retroajustado correctamente produce
saltos diarios imposibles que contaminarian CAGR, volatilidad, curtosis y stress
test de **toda** la cartera. La app los detecta automaticamente:

- **Imposibles** (retorno diario <= -100% o >= +800%): el activo se **excluye**
  del analisis y se avisa con la lista de fechas y saltos detectados.
- **Extremos pero posibles** (>= 60% en un dia): se **mantienen** y solo se
  avisa, porque pueden ser reales (microcaps ilíquidos, opas, reestructuraciones).

Caso real detectado con este mecanismo: `DIA.MC` registra un salto de
**+102.894%** entre el 2025-01-31 y el 2025-02-03 por un split inverso 1:1000
mal aplicado en la fuente de datos.

## Estructura

- `engine.py` -- motor de calculo puro (sin dependencias de UI): descarga de
  datos, metricas de rendimiento/riesgo, drawdowns, stress testing,
  correlaciones, atribucion, frontera eficiente, rebalanceo, Monte Carlo y
  modelo de factores. Se puede importar y usar independientemente de Streamlit.
- `app.py` -- panel Streamlit que orquesta `engine.py` y renderiza las 15
  secciones.
- `.streamlit/config.toml` -- tema nativo (colores, tipografia, bordes) y
  `toolbarMode = "minimal"` para ocultar el menu/boton "Deploy" de Streamlit.
  No hay CSS personalizado en el codigo.

## Correcciones de metodologia aplicadas

El documento de referencia senalaba 5 fallos a resolver frente a un enfoque
ingenuo; todos estan implementados y documentados dentro de la propia app
(expandir "Notas metodologicas y mejoras aplicadas" al abrir el panel):

1. Monte Carlo por Bootstrap Historico / Student-t por defecto en vez de solo
   GBM (la cartera tiene colas gordas: un GBM puro infravalora el riesgo de
   caidas extremas). GBM se deja disponible como referencia, con aviso.
2. Nunca se muestra una probabilidad de perdida de "0.0%" literal: se acota
   por la resolucion del propio muestreo (p. ej. "< 0.1%").
3. La tasa libre de riesgo (Rf) usada en Sharpe/Sortino/Alfa de Jensen se
   muestra siempre de forma explicita, con su fuente (US T-Bill 3M o manual).
4. Modelo de factores ampliado: ademas del estilo Growth/Value de 2 factores,
   incluye una regresion tipo Fama-French de 3-5 factores (Mercado, SMB, HML,
   RMW, CMA), usando datos reales de Kenneth French cuando hay conexion, con
   un proxy de ETFs como alternativa transparente si no los hay.
5. La simulacion de rebalanceo admite un toggle para aplicar comision por
   transaccion y retencion fiscal sobre la plusvalia realizada, mostrando el
   resultado neto frente al bruto.

## Por que estas cifras no coinciden con el informe oficial de un fondo

La herramienta reconstruye una cartera **estatica**: toma una foto de posiciones
y pesos y la mantiene fija hacia atras en el tiempo. El informe trimestral o
anual de un fondo real mide algo distinto -- rotacion de cartera durante el
periodo, entradas y salidas de posiciones, comisiones de gestion y deposito,
efectivo, politica de dividendos y un valor liquidativo auditado.

Las dos cifras responden a preguntas diferentes ("que habria rendido esta foto
de la cartera" frente a "que rindio realmente el fondo") y no tienen por que
coincidir. Para acercarlas habria que reconstruir la serie historica completa de
posiciones del fondo, no una unica foto.

## Requisitos

```bash
pip install -r requirements.txt
```

Necesita conexion a internet (Yahoo Finance para precios; Kenneth French Data
Library de forma opcional para el modelo de factores real, con fallback
automatico si no esta disponible).

## Uso

```bash
streamlit run app.py
```

Se abre en `http://localhost:8501`. Ajusta la configuracion en la barra
lateral y pulsa "Actualizar analisis".

## Notas

- Los datos proceden de Yahoo Finance en el momento de la consulta; el
  rendimiento pasado no garantiza resultados futuros.
- Si un activo no tiene suficiente historico para el periodo elegido (p. ej.
  SPDR Gold Shares cotiza desde 2004-11), la app recorta automaticamente el
  periodo efectivo y lo indica.
- El Stress Testing usa siempre el historico completo disponible (no el
  periodo de analisis seleccionado), porque reconstruye crisis con fechas
  fijas (Puntocom, 2008, COVID, Inflacion-Tipos 2022, Aranceles 2025).
- Herramienta educativa; no constituye asesoramiento de inversion.
