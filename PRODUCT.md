# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Analistas (redacción)** — quienes publican y editan tesis de inversión. Se
acreditan con `WARRANTS_CLAVE` (dos personas hoy, según `COLABORAR.md`: escriben
juntos sobre `main`, sin ramas por persona). Dan de alta informes con su ficha
completa —precio de compra, take profit, stop loss, documentación adjunta— y de
ahí se deriva la cartera entera.

**Visitantes públicos** — consultan sin credencial: research, noticias, radar,
cartera con su conciliación, cadena de opciones. Toda la lectura es pública,
incluida la descarga de documentos adjuntos.

*[Inferido, no confirmado por el usuario en esta sesión: si el visitante público
es sobre todo un inversor/cliente externo evaluando la casa, o si hoy es
principalmente el propio escaparate de los dos analistas. El producto trata a
ambos por igual —lectura pública sin fricción— así que la distinción no cambia
el comportamiento actual, pero sí podría importar para decisiones de tono o de
llamada a la acción en trabajo futuro.]*

## Product Purpose

Inteligencia de mercado que **se deriva de lo publicado, no se declara**. Un
analista publica una tesis con su precio y su fecha; la cartera, su historial y
sus estadísticos salen enteramente de esa cuenta, nunca de un número escrito
aparte. Éxito es que cualquier cifra en pantalla se pueda reconciliar a mano
contra su fuente.

## Positioning

Frente a un research que anuncia una rentabilidad, W&C **la calcula en vivo
desde las tesis publicadas** y hace la cuenta auditable en pantalla —la tarjeta
de conciliación, `Σ (peso × rentabilidad de la línea) = rentabilidad total`—.
Donde el dato no existe o la muestra no alcanza el suelo estadístico del oficio,
la plataforma calla en vez de estimar: `N/A` con motivo, o una celda que dice
cuánto falta y por qué, nunca una cifra de relleno. Esa disciplina —tres estados
siempre (hay dato · el dato es cero · no hay dato), inferencia nunca vestida de
hecho— es el mecanismo diferencial, no un eslogan.

## Operating Context

- Cuatro áreas de navegación: Market (Radar/Markets/Institutional positioning),
  Research (Companies/Investment theses/Catalysts/News), Options (Options
  flow/Unusual activity/Option chain), Portfolio (Portfolio/Performance/Thesis
  tracker). Lo aún no implementado se rotula **Pronto**, no se oculta.
- Cuatro secciones ya operativas: Análisis (portada pública), Repositorio
  (catálogo y alta/edición de tesis), Noticias (sindicada desde Investing.com
  vía RSS + redacción propia) y Cartera (derivada de las tesis).
- La cartera nace el 30-ene-2026; usa tramos fijos de capital sin rebalanceo,
  con toma de beneficios automática al take profit.
- Options usa Nasdaq como único proveedor hoy; IV y griegas no publicadas →
  `N/A`. El W&C Unusual Activity Score pondera diez factores, renormaliza entre
  los disponibles y no emite por debajo del 45 % de cobertura.
- Cotizaciones en cascada Yahoo → CNBC → Nasdaq, con caché de 15 s (cotización)
  y 30 min (histórico).
- Dos personas colaboran a diario directamente sobre `main`, sin ramas ni PRs
  (`COLABORAR.md`), con hooks de sincronización automática y CI en dos niveles
  (pruebas autónomas + Playwright).
- Base de datos SQLite local (`data/warrants.db`), nunca tocada por pruebas
  automatizadas ni por un servidor de prueba apuntado directamente a ella.

## Capabilities and Constraints

- **Nunca se inventa un dato.** Sin proveedor: `N/A`. Sin fuente de señal:
  pendiente. Prohibido rellenar con ceros, medias o `Math.random()`.
- **Tres estados siempre**: hay dato · el dato es cero · no hay dato.
- **Inferencia ≠ hecho.** Toda clasificación (p. ej. dirección de una operación
  de opciones) viaja con su certeza —KNOWN/INFERRED/UNKNOWN— y su motivo.
- **Un hecho, una fuente.** Dos expresiones del mismo hecho (total de cartera y
  suma de contribuciones; leyenda de gráfico y titular; puerta de un suelo de
  muestra y su rótulo) salen de la misma tabla/cálculo y una prueba afirma que
  concuerdan. Tres fallos reales de este tipo ya se dieron y quedaron
  documentados como precedente.
- **Suelos de muestra estadísticos**: 252 sesiones (1 año) para rentabilidad
  anualizada; 756 sesiones (3 años) para Sharpe/Sortino/Calmar/alfa de Jensen,
  siguiendo el mínimo del oficio (Morningstar, GIPS).
- **Alta/edición de tesis** exige `WARRANTS_CLAVE`; la lectura y la descarga de
  documentos son siempre públicas (el control por perfil de usuario llegará con
  el registro de usuarios, aún no construido).
- **Extracción de PDF propone, no rellena.** Cada campo llega con estado
  `propuesto`/`ambiguo`/`referencia`/`ausente`; take profit, recomendación y
  tipo de informe no se proponen nunca, por decisión.
- Terminología de oficio: se traduce lo que un analista diría en castellano
  (Volume→Volumen, Strike se queda, etc.); las siglas nunca se traducen; los
  nombres de producto (W&C Radar, W&C Signal) tampoco.
- Sin dependencias nuevas sin justificar; SQL siempre parametrizado; sin
  `innerHTML`; CSP estricta sin scripts en línea ni CDN.

## Brand Commitments

Nombre: **Warrants & Co.** — «Market Intelligence». Productos con nombre propio
que no se traducen: **W&C Radar**, **W&C Signal**. Interfaz bilingüe ES/EN por
diccionario (`public/idiomas/es.js` / `en.js`, siempre en el mismo commit).
Repositorio en GitHub (`financeandml/Warrants-and-Co`) y presencia en LinkedIn,
ambos enlazados desde el hero como accesos de igual peso junto al radar.

*[No se ha confirmado en esta sesión si hay más compromisos de marca —claim
legal, tono de voz fuera de lo ya escrito en el manifiesto de portada— más allá
de lo documentado en el propio código y en CLAUDE.md.]*

## Evidence on Hand

- El propio código y `README.md` documentan con detalle inusual el porqué de
  cada decisión de producto (metodología de cartera, suelos estadísticos,
  composición del hero), y son fuente de verdad más fiable que cualquier
  resumen: consultarlos antes de asumir.
- Historial real de cartera desde el 30-ene-2026, con casos documentados de
  fallos detectados (discrepancia de índice rebalanceado vs. tramos fijos,
  Sharpe con intervalo de confianza que incluía cero) — no se deben repetir
  como ejemplos de diseño de producto sin volver a mirar el código actual.
- No hay testimonios, clientes citados, cifras de negocio ni pricing
  publicados; no se deben fabricar.

## Product Principles

1. **La cifra manda sobre la narrativa.** Ningún texto declara lo que el motor
   no calcula; donde falta dato o muestra, se dice que falta y por qué.
2. **Un hecho, una fuente, siempre demostrado.** Toda coincidencia visible entre
   dos cifras relacionadas lleva detrás una prueba que la afirma.
3. **La certeza viaja con el dato.** Ninguna inferencia se presenta con la
   misma autoridad visual que un hecho verificado.
4. **Lo no construido se declara, no se esconde.** Pronto/Pendiente/N/A son
   estados de primera clase, no vergüenzas a ocultar.
5. **Cambiar el rigor cuesta una revisión, no un ajuste cosmético.** Los
   umbrales, pesos y metodologías viven en un único fichero fuente citado por
   el resto del sistema.

## Accessibility & Inclusion

Regido por CLAUDE.md: ningún dato depende solo del color (glifo ▲/▼ y signo
explícito siempre), contraste 4.5:1 mínimo en texto, ΔE2000 ≥ 25 entre tonos
direccionales, `prefers-reduced-motion` respetado. La interfaz se sirve solo en
claro por decisión de producto (sin conmutador ni seguimiento de
`prefers-color-scheme`); el sistema de tokens oscuro se conserva como reserva
del sistema de diseño pero no se muestra hoy.

*[No se ha confirmado ningún requisito de accesibilidad adicional específico de
usuario más allá de lo ya fijado en CLAUDE.md.]*
