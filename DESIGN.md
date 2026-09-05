---
name: Warrants & Co.
description: Panel de instrumentos acromático para inteligencia de mercado donde cada cifra viaja con su fuente, su certeza y su estado.
colors:
  tinta: "#101011"
  tinta-secundaria: "#4a4a4c"
  tinta-mate: "#6e6e71"
  tinta-inversa: "#ffffff"
  superficie: "#ffffff"
  superficie-alt: "#f7f7f6"
  superficie-hundida: "#f2f2f1"
  superficie-inversa: "#101011"
  linea: "#e2e2e0"
  linea-fuerte: "#c8c8c5"
  linea-hairline: "#ecece9"
  acento: "#4F46E5"
  acento-pleno: "#6366F1"
  acento-tenue: "rgba(99, 102, 241, 0.09)"
  alcista: "#0f7a3d"
  alcista-tenue: "rgba(15, 122, 61, 0.09)"
  bajista: "#b02a26"
  bajista-tenue: "rgba(176, 42, 38, 0.09)"
  aviso: "#926608"
  aviso-tenue: "rgba(146, 102, 8, 0.10)"
  verde-sesion: "#1a9d4b"
typography:
  display:
    fontFamily: "Jost, Futura, 'Century Gothic', 'Avenir Next', Inter, 'Helvetica Neue', Helvetica, Arial, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 2.55rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Jost, Futura, 'Century Gothic', 'Avenir Next', Inter, sans-serif"
    fontSize: "1.28rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  xs: "2px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "22px"
  xl: "34px"
  xxl: "54px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.tinta-inversa}"
    rounded: "{rounded.xs}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.acento}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xs}"
    padding: "10px 20px"
  button-outline-hover:
    backgroundColor: "{colors.superficie-alt}"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.lg}"
    padding: "22px 24px 18px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xs}"
    padding: "10px 12px"
  pill-filter:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-secundaria}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  pill-filter-active:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.tinta-inversa}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
---

# Design System: Warrants & Co.

## Overview

**Creative North Star: "The Instrument Panel"**

Warrants & Co. se lee como el panel de instrumentos de una sala de análisis, no como
un producto de consumo. La base es acromática — tinta sobre superficie, filetes de
1px que hacen de separación — y sobre ella hay exactamente un color con peso
propio: un índigo de precisión institucional que no decora, señaliza. Aparece donde
el sistema toma una posición de identidad (cabecera, foco de teclado, botón
primario, marcador de sección activa) y donde presenta un dato neutro sin
dirección (un filtro activo, un enlace). Nunca donde el dato tiene signo: eso lo
llevan solo los tres tonos direccionales —alza, baja, aviso—, siempre acompañados
de un glifo (▲ ▼) porque el color nunca carga solo.

La superficie es plana por decisión, no por descuido: no hay una sombra
ambiental generalizada, hay un filete de 1px (`--linea`) que hace el trabajo que en
otros sistemas hace `box-shadow`. Esto es coherente con lo que el producto es —un
instrumento que muestra una lectura, no una tarjeta que invita a tocarse—: el
énfasis se gana con contraste tipográfico, espacio negativo y estado del borde, no
con relieve. La sombra real se reserva para lo que de verdad flota por encima del
contenido: modales, tooltips, el aviso de guardado.

Nada en este sistema es decoración gratuita. Cada regla nombrada en el CSS lleva
su motivo escrito al lado —por qué ese contraste, por qué ese ΔE, por qué esa
excepción—, y ese mismo rigor se traslada aquí: cualquier variación de color en
pantalla existe para decir algo verificable, nunca para embellecer.

**Key Characteristics:**
- Acromático con un solo acento con doble papel: identidad en cromo, información neutra en dato.
- Plano por defecto; la profundidad se gana con filete de 1px y espacio negativo, no con sombra.
- Tres tonos direccionales y ninguno más — el color nunca sustituye al glifo o al signo.
- Geométrica (Jost) para titulares, Inter para texto, monospace del sistema para el detalle técnico y los tickers.
- Radios de esquina casi imperceptibles (2px) en controles; 14px solo en contenedores tipo tarjeta y bento.

## Colors

Paleta casi monocroma — trece tonos de tinta y superficie— sobre la que un único
índigo lleva todo el peso emocional del sistema.

### Primary
- **Indigo de precisión institucional** (`--acento` `#4F46E5` claro / `#818CF8` oscuro): identidad en cromo — cabecera, foco de teclado, botón primario, marcador de sección — e información neutra en un dato (filtro activo, enlace). Es un solo token con dos papeles que son el mismo hecho; nunca lleva dirección de alza o baja.
- **Indigo pleno** (`--acento-pleno` `#6366F1`, idéntico en los dos temas): solo para rellenos y tipografía grande donde el contraste de texto no aplica — nunca para texto corrido, porque a 0.83rem cae a 4.47:1 sobre blanco y 4.38:1 sobre `#0c0c0d`, por debajo del suelo AA.
- **Indigo tenue** (`--acento-tenue` `rgba(99,102,241,.09)` claro / `.16` oscuro): fondos de tarjeta y halos de foco.

### Direccionales (los únicos tres que apuntan a algún lado)
- **Alza** (`--alcista` `#0f7a3d`): siempre con ▲ y signo `+`.
- **Baja** (`--bajista` `#b02a26`): siempre con ▼ y signo `-`.
- **Aviso** (`--aviso` `#926608`): estados pendientes o de riesgo, siempre con su propio rótulo textual.

### Neutral
- **Tinta** (`--tinta` `#101011`): texto principal, iconografía de alto contraste.
- **Tinta secundaria** (`--tinta-secundaria` `#4a4a4c`): texto de apoyo, navegación en reposo.
- **Tinta mate** (`--tinta-mate` `#6e6e71`): metadatos, etiquetas de campo, texto terciario — calibrado a 4.54:1 sobre `--superficie-hundida`, no solo sobre blanco.
- **Superficie** (`--superficie` `#ffffff`) / **Superficie alterna** (`--superficie-alt` `#f7f7f6`) / **Superficie hundida** (`--superficie-hundida` `#f2f2f1`): tres profundidades de fondo plano, sin sombra entre ellas.
- **Línea** (`--linea` `#e2e2e0`), **línea fuerte** (`--linea-fuerte` `#c8c8c5`), **línea hairline** (`--linea-hairline` `#ecece9`): el vocabulario de separación — hace en este sistema el trabajo que la sombra hace en otros.

### Named Rules
**The One Indigo Rule.** No existe un azul informativo aparte del acento de marca. Un segundo azul —por sutil que sea— reintroduce la confusión que la fusión de tokens vino a resolver. Cualquier necesidad de "color informativo neutro" se resuelve con el acento existente, nunca con un token nuevo.

**The Glyph-Before-Color Rule.** Ningún estado direccional se comunica solo por tinte. Alza y baja llevan ▲/▼ y signo explícito; el color es refuerzo, no portador único del significado.

## Typography

**Display Font:** Jost (con Futura, Century Gothic, Avenir Next e Inter como respaldo)
**Body Font:** Inter (con Helvetica Neue, Helvetica, Arial, Segoe UI, system-ui como respaldo)
**Label/Mono Font:** monospace del sistema (`ui-monospace, SF Mono, Menlo, Consolas`) — sin fichero propio, deliberadamente: un tercer `.woff2` pagaría en la ruta crítica del primer pintado, y la pila del sistema ya rinde bien en las tres plataformas.

**Character:** Jost aporta el registro geométrico de titular — presente, pero comedido, nunca decorativo — mientras Inter lleva todo el peso de lectura extendida. El monospace marca sin ambigüedad "esto es un dato técnico, no prosa": tickers, cifras de detalle, el rótulo `N/A`.

### Hierarchy
- **Display / H1** (600, `clamp(1.75rem, 3.4vw, 2.55rem)`, 1.2): titulares de sección, manifiesto de portada.
- **Headline / H2** (600, 1.28rem, 1.2): cabeceras de tarjeta y bloque.
- **Title / H3** (600, 1.05rem, 1.2): subtítulos internos de un bloque.
- **Body** (400, 15px, 1.6): texto corrido en toda la plataforma; sin max-width fijo salvo en el manifiesto (62ch), porque la mayoría del contenido es tabular o de panel, no prosa larga.
- **Label** (600, 0.7rem, letter-spacing 0.1em, mayúsculas): rótulos de campo, cabeceras de tabla, metadatos.
- **Mono** (400, 0.85rem): tickers, cifras técnicas, valores que exigen alineación de columna.

### Named Rules
**The Fallback-Chain Rule.** La cadena de respaldo de `--sans` no es decorativa: resuelve ▲ (U+25B2) y ▼ (U+25BC), fuera del subconjunto `latin` de la fuente servida. Recortar la cadena deja esos glifos sin resolver, y entonces el color de dirección pasa a cargar solo — viola directamente The Glyph-Before-Color Rule.

## Layout

Ancho máximo de contenido `1240px` (`--ancho-maximo`), con la portada acotada a
`1024px` porque su composición de referencia es más estrecha. La rejilla de campos
de formulario usa `repeat(auto-fit, minmax(210px, 1fr))`: densidad que se adapta
sin puntos de quiebre explícitos para ese patrón. Cabecera `position: sticky`, con
su altura real medida en tiempo de ejecución (`seguirAlturaCabecera()`) porque
cambia de 69px en escritorio a tres filas en 390px de ancho y varía además por
idioma.

Escala de espaciado en seis pasos (`--espacio-1` a `--espacio-6`: 4/8/14/22/34/54px),
usada tanto para relleno interno como para separación entre bloques. Las
transiciones de estado usan una sola duración (`--transicion`, 140ms ease) en toda
la plataforma — hover de borde, cambio de fondo, aparición de foco.

## Elevation & Depth

Plano por defecto. Las superficies en reposo —tarjetas, paneles de filtro, envoltorios
de tabla— se definen por un filete de 1px (`--linea` o `--linea-fuerte`) y por las tres
profundidades de fondo (`--superficie` / `--alt` / `--hundida`), nunca por sombra.
La cartera lleva esto al extremo: destruye deliberadamente el lenguaje de tarjeta
—fondo, borde, radio— y lo sustituye por espacio negativo puro y filetes, porque su
naturaleza es editorial, no de panel.

La sombra real existe pero se reserva para lo que de verdad se superpone al
contenido: modales (`--sombra-emergente`, `0 6px 22px` / `0 10px 34px`), avisos
flotantes (`--sombra-aviso`, `0 8px 28px`) y el velo de fondo tras un modal
(`--velo-modal`). Ver una sombra en pantalla es la señal de que algo está por
encima del flujo normal, no un adorno de tarjeta.

### Shadow Vocabulary
- **Emergente** (`box-shadow: 0 6px 22px var(--sombra-emergente)` / `0 10px 34px` en variantes mayores): paneles flotantes y modales.
- **Aviso** (`box-shadow: 0 8px 28px var(--sombra-aviso)`): notificaciones que requieren atención inmediata.
- **Foco** (`box-shadow: 0 0 0 4px var(--acento-tenue)`, vía `:focus-visible`): anillo de foco de teclado — deliberadamente en `box-shadow` y no en un segundo `outline`, para no competir con la línea de separación de una fila de tabla.

### Named Rules
**The Flat-By-Default Rule.** Ninguna superficie en reposo lleva sombra. Si algo necesita separarse del fondo, se separa con filete o con un salto de profundidad entre las tres superficies planas — la sombra se reserva para lo que literalmente flota sobre el contenido.

## Shapes

Radio casi imperceptible en controles de uso diario: `--radio` (2px) en botones,
inputs, filas de tabla activa — la esquina se insinúa, no se redondea. La escala
sube en contenedores: `--radio-s` (6px) en detalles menores, `--radio-m` (10px) en
paneles secundarios, `--radio-l` (14px) en tarjetas, paneles de filtro y envoltorios
de tabla. Pastillas de filtro y el punto de sesión usan `999px` — la única forma
totalmente circular del sistema, reservada a controles de selección/estado, nunca a
contenedores de contenido.

## Imagery

**Registro fotográfico: monocromo o muy desaturado, sujeto único, luz difusa,
espacio negativo generoso.** El banner de portada (`public/marca/banner.jpg`) fija
el criterio para cualquier foto que la casa publique: un solo sujeto natural,
niebla o cielo cubierto en vez de sol duro, mucho negativo alrededor, sin gente,
sin texto ni marca de agua sobrepuesta, sin saturación de color.

No es solo gusto: es consecuencia directa de The One Indigo Rule. La base del
sistema es acromática y el único color con peso propio es el índigo — una foto
con grado de color natural (verdes, tierras, dorados de hora dorada) introduciría
una segunda paleta compitiendo por atención con el acento de marca, exactamente
la clase de ambigüedad que el sistema de un solo índigo existe para evitar. "Tonos
naturales" se consigue aquí por composición y luz —paisaje real, niebla, silencio
visual— no por temperatura de color.

**Recorte:** proporción amplia (16:9 o más ancha), `object-fit: cover` con el
sujeto principal fuera de centro, dejando el tercio opuesto vacío para que el
manifiesto de portada respire sobre él sin superponerse.

### Named Rules
**The Monochrome Register Rule.** Toda fotografía editorial de la plataforma
—banner de portada y cualquier imagen equivalente futura— se publica en blanco y
negro o muy desaturada. Una foto a color entra en conflicto directo con The One
Indigo Rule: introduce una paleta que la base acromática no tiene sitio para
alojar.

**Excepción documentada, acotada: el fondo de las tarjetas de la Vitrina de
tesis (`.vitrina-tesis__medio`).** Pedido explícitamente después de flagear el
conflicto con esta misma regla: un verde de césped natural a color, foto
editorial premium, con degradado oscuro superpuesto para que logo y texto
sigan leyéndose. No extiende la excepción a ninguna otra pieza —el banner de
portada sigue monocromo—: es la única superficie de la casa que hoy admite
color de foto, y quien añada otra debería documentarla aquí de la misma
forma, no asumir que esta abre la puerta en general.

## Logo / Mark

El logo (`public/marca/logo.svg`, `public/marca/logo-marca.svg`) es hoy un
wordmark plano: cuadrado negro sólido (`#000000`) con el nombre —o la inicial
«W» en la versión de icono— en blanco, Helvetica Neue 700. Dos resoluciones
maestras — 96×96 para el icono de cabecera, 800×800 para pie y usos grandes—,
sin tercera variante.

*(Hubo una versión intermedia con un símbolo propio —una "W" trazada como
gráfico de precio con un rombo de "strike" en `--acento-pleno`—, revertida a
petición explícita. Si se retoma un símbolo propio en el futuro, documentarlo
aquí de nuevo en vez de dejar esta sección desactualizada.)*

## Components

### Buttons
- **Shape:** radio casi imperceptible (`var(--radio)`, 2px), borde de 1px.
- **Primary (`.boton--solido`):** relleno `--acento`, texto `--tinta-inversa`; hover baja opacidad a 0.86 en vez de cambiar de tono. Es el único sitio de cromo donde el índigo pesa más — texto blanco sobre `--acento` da 6.29:1 en claro y 6.55:1 en oscuro.
- **Outline (`.boton--contorno`):** transparente, borde `--linea-fuerte`, texto `--tinta`; hover oscurece borde a `--tinta` y rellena con `--superficie-alt`.
- **Text (`.boton--texto`):** sin caja, color `--tinta-secundaria`; hover pasa a `--tinta` con subrayado.
- **Sesión abierta:** variante `.boton--sesion` — pierde la caja de invitación y pasa a informar (rótulo en mayúsculas, 0.72rem), porque un control con caja solo significa algo cuando invita a una acción; sin sesión conserva `.boton--contorno`.
- **Excepción documentada:** el CTA sólido del hero usa `--tinta-portada` (negro fijo) en vez de `--acento`, pedido explícitamente por encima de la regla de identidad — no repetir en ningún otro botón primario de la plataforma.

### Pills / Filtros
- **Style:** borde `--linea-fuerte`, radio `999px`, fondo `--superficie`, texto `--tinta-secundaria`.
- **State:** activo (`aria-pressed="true"`) invierte a relleno `--acento` con texto `--tinta-inversa` — 6.29:1 en claro, 6.55:1 en oscuro, AA en ambos.

### Cards / Containers
- **Corner Style:** `var(--radio-l)`, 14px.
- **Background:** `--superficie`, sin gradiente ni sombra.
- **Shadow Strategy:** ninguna en reposo (ver Elevation & Depth); solo borde `--linea`.
- **Border:** 1px sólido `--linea`.
- **Internal Padding:** cabecera `22px 24px 18px`; cuerpo sigue la escala `--espacio-*`.

### Inputs / Fields
- **Style:** borde `--linea-fuerte`, radio `var(--radio)`, fondo `--superficie`, ancho completo.
- **Hover:** borde pasa a `--tinta-mate`.
- **Focus:** anillo `box-shadow: 0 0 0 4px var(--acento-tenue)` vía `:focus-visible`.
- **Error:** `aria-invalid="true"` engorda el borde a 2px en `--tinta` (no en `--bajista` — el error de validación se distingue por grosor, el direccional rojo queda reservado a rendimiento).
- **Propuesta sin confirmar (extracción de PDF):** estado `data-propuesta="pendiente"` con tratamiento visual propio, distinto de vacío y de error — la extracción propone, nunca rellena en silencio.

### Navigation
- Enlaces en `--tinta-secundaria`, hover a `--tinta`, borde inferior de 2px transparente que se llena con `--tinta` en `aria-current="page"`. Sin fondo de resalte: el estado activo se lee por borde y color de texto, coherente con el resto del sistema plano.

### Punto de sesión (componente de firma)
Punto verde de 7px con halo (`--verde-halo`) y animación de "respirar" (2.6s, se
desactiva con `prefers-reduced-motion`) integrado dentro del propio botón de acceso
—nunca un indicador suelto duplicando lo que el botón ya dice—. Es la aplicación
literal de "un hecho, una fuente" al estado de sesión: un solo elemento declara que
hay sesión abierta, no dos elementos que puedan desincronizarse.

## Do's and Don'ts

### Do:
- **Do** usar `--acento` para todo cromo de identidad y para dato neutro sin dirección; es un solo token con dos papeles, nunca dos tokens.
- **Do** separar superficies con filete de 1px (`--linea` / `--linea-fuerte`) o con salto entre las tres profundidades de fondo antes de recurrir a sombra.
- **Do** acompañar todo tono direccional (alza/baja/aviso) de un glifo o rótulo explícito — nunca solo color.
- **Do** usar `--acento-pleno` únicamente en relleno o tipografía grande, nunca en texto corrido: falla AA por centésimas en ambos temas.
- **Do** usar monospace del sistema para tickers y cifras técnicas — nunca cargar una fuente monospace propia.

### Don't:
- **Don't** crear un segundo token de azul "informativo" distinto de `--acento` — es exactamente la confusión que la fusión de tokens resolvió.
- **Don't** añadir `box-shadow` a una tarjeta o panel en reposo; la sombra es exclusiva de lo que flota sobre el contenido (modal, aviso, foco).
- **Don't** usar `--alcista`/`--bajista` para nada que no sea rendimiento con signo real — no son colores decorativos de "positivo/negativo" genérico.
- **Don't** redondear un control de uso diario (botón, input) más allá de `var(--radio)` (2px); el radio grande es exclusivo de contenedores tipo tarjeta.
- **Don't** repetir la excepción del CTA del hero (`--tinta-portada` en vez de `--acento`) en ningún otro botón primario — es una excepción única, documentada y cerrada.
