/* ============================================================================
   Diccionario · Español

   Claves planas con espacio de nombres por puntos. Una entrada es una cadena o,
   cuando el numero manda, un objeto con las formas de plural que exige el
   idioma (`one` y `other` en castellano).

   Las cadenas admiten sustitucion por nombre: {n}, {ticker}, {fuente}.
   ========================================================================= */

export default {
  // ── Conmutador de idioma ──
  'idioma.grupo': 'Idioma de la interfaz',
  'idioma.es': 'Español',
  'idioma.en': 'Inglés',

  // ── Cadenas de ejemplo para verificar el mecanismo en la fase 1 ──
  'general.saltoContenido': 'Ir al contenido principal',
  'cabecera.marca.ir': 'Warrants & Co. — ir al inicio',
  'cabecera.acceso': 'Área de analistas',
  'cabecera.sesionActiva': 'Sesión activa',
  'cabecera.sesion.analista': 'Analista',
  'cabecera.tema.grupo': 'Tema de la interfaz',
  'cabecera.tema.claro': 'Tema claro',
  'cabecera.tema.oscuro': 'Tema oscuro',

  // ── Documento ──
  'documento.titulo': 'Warrants & Co. — Análisis e Inversión',
  'documento.descripcion': 'Plataforma de análisis e inversión de Warrants & Co. Repositorio de tesis de inversión, cobertura de valores y seguimiento de cartera.',

  // ── Cabecera ──
  'cabecera.marca.lema': 'Análisis e Inversión',
  'cabecera.nav.etiqueta': 'Navegación principal',

  // ── Navegación · áreas ──
  // La marca no se traduce nunca: «Warrants & Co.», «W&C Radar» y «W&C Signal»
  // son nombres propios. Los rótulos de área y sección, sí.
  'nav.market': 'Mercado',
  'nav.research': 'Análisis',
  'nav.options': 'Opciones',
  'nav.portfolio': 'Cartera',
  'nav.pronto': 'Pronto',

  'nav.market.radar': 'Radar',
  'nav.market.radar.desc': 'Señales del día',
  'nav.market.mercados': 'Mercados',
  'nav.market.mercados.desc': 'Índices, volatilidad y tipos',
  'nav.market.institucional': 'Posicionamiento institucional',

  'nav.research.companias': 'Compañías',
  'nav.research.companias.desc': 'Cobertura por compañía',
  'nav.research.tesis': 'Tesis de inversión',
  'nav.research.tesis.desc': 'Repositorio de informes',
  'nav.research.catalizadores': 'Catalizadores',
  'nav.research.catalizadores.desc': 'Agenda de eventos',
  'nav.research.noticias': 'Noticias',
  'nav.research.noticias.desc': 'Actualidad de mercado',

  'nav.options.flujo': 'Flujo de opciones',
  'nav.options.flujo.desc': 'Operaciones relevantes',
  'nav.options.inusual': 'Actividad inusual',
  'nav.options.inusual.desc': 'Actividad destacada',
  'nav.options.cadena': 'Cadena de opciones',
  'nav.options.cadena.desc': 'Cadena por vencimiento',

  'nav.portfolio.cartera': 'Cartera',
  'nav.portfolio.cartera.desc': 'Composición y evolución',
  'nav.portfolio.rendimiento': 'Rendimiento',
  'nav.portfolio.seguimiento': 'Seguimiento de tesis',

  'nav.pendiente.aviso': '{seccion} estará disponible en una próxima entrega.',

  // ── General ──
  'general.cerrar': 'Cerrar',
  'general.cancelar': 'Cancelar',

  // ── Área de analistas ──
  'acceso.titulo': 'Área de analistas',
  'acceso.clave': 'Clave de analista',
  'acceso.entrar': 'Acceder',
  'acceso.cerrarSesion': 'Cerrar sesión',

  // ── Pie ──
  'pie.lema': 'Plataforma interna de análisis e inversión.',
  'pie.linkedin': 'Perfil de Warrants & Co. en LinkedIn',
  'pie.nav.etiqueta': 'Secciones de Warrants & Co.',

  // ── Piezas de formato ──
  // Solo unen datos, pero viven aquí igualmente: el orden y el separador son
  // decisión de cada idioma, no del código que las pinta.
  //
  // `noDisponible` se abrevia igual en ambos: «N/A» es la abreviatura que usa
  // toda la plataforma —y la que la documentación de análisis en español
  // emplea—, de modo que cambiarla sería cambiarla en las nueve secciones a la
  // vez, no solo aquí.
  'general.noDisponible': 'N/A',
  'general.sinDatos': 'Dato no disponible',
  'general.importeDivisa': '{importe} {divisa}',

  // ── Portada · hero ──
  'portada.accesos.etiqueta': 'Accesos principales',
  'portada.acceso.radar': 'Explorar el radar',
  'portada.acceso.research': 'Ver el análisis',

  // ── Portada · manifiesto ──
  // El titular es UNA frase repartida en líneas, y el reparto es tipográfico:
  // cada idioma decide dónde corta y en cuántas líneas le cabe. Por eso es una
  // lista y no tres claves —tres claves impondrían a todos los idiomas los
  // cortes del inglés, y un idioma que necesitara cuatro líneas no tendría
  // dónde ponerlas— y por eso el documento ya no las trae escritas.
  'portada.manifiesto.titular': [
    'Inteligencia de mercado',
    'para quien invierte',
    'pensando en probabilidades.',
  ],
  'portada.manifiesto.entrada': 'Análisis fundamental, inteligencia de mercado y analítica de opciones para identificar dónde la convicción se encuentra con la oportunidad.',

  'portada.pilar.research.titulo': 'Análisis',
  'portada.pilar.research.texto': 'Análisis fundamental profundo, centrado en compañías, catalizadores, valoración y tesis de inversión.',
  'portada.pilar.radar.titulo': 'Radar',
  'portada.pilar.radar.texto': 'Una lectura sistemática del mercado, pensada para hacer emerger las oportunidades y las señales más relevantes.',
  'portada.pilar.options.titulo': 'Opciones',
  'portada.pilar.options.texto': 'Actividad en opciones, posicionamiento inusual y señales derivadas del propio mercado.',
  'portada.pilar.explorar': 'Explorar',

  // ── Inicio · cinta de mercado ──
  'inicio.ticker.etiqueta': 'Cotizaciones de mercado',

  // ── Inicio · pulso de mercado ──
  'inicio.pulse.etiqueta': 'Mercado',
  'inicio.pulse.titulo': 'Pulso de mercado',
  'inicio.pulse.enlace': 'Ver mercado',
  'inicio.pulse.indices.etiqueta': 'Índice representado',
  'inicio.pulse.serie.etiqueta': 'Serie histórica',
  'inicio.pulse.cambio': '{absoluta}  {porcentaje}',
  'inicio.pulse.periodo': '{desde} — {hasta}',
  'inicio.pulse.notaSerie': '{etf} · ETF de réplica',
  'inicio.pulse.nota.sinSerie': 'Ningún proveedor conectado publica la serie histórica del {indice}. La cotización mostrada arriba sí es real y llega con retraso.',
  'inicio.pulse.nota.fallo': 'No ha sido posible recuperar la serie de {indice} en este momento. Vuelva a seleccionarlo para reintentarlo.',
  'inicio.pulse.nota.conSerie': {
    one: 'Curva: {curva}. El índice {indice} no tiene serie histórica en ningún proveedor conectado; el ETF que lo replica no es el índice y se rotula como tal. {n} sesión · dato histórico.',
    other: 'Curva: {curva}. El índice {indice} no tiene serie histórica en ningún proveedor conectado; el ETF que lo replica no es el índice y se rotula como tal. {n} sesiones · dato histórico.',
  },

  // ── Inicio · W&C Radar ──
  'inicio.radar.etiqueta': 'Inteligencia de mercado',
  'inicio.radar.enlace': 'Ver el radar completo',
  'inicio.radar.vacio.titulo': 'Sin señales operativas',
  'inicio.radar.vacio.motivo': 'Ninguna familia de señales tiene fuente conectada.',
  'inicio.radar.evaluados': { one: '{n} evaluado', other: '{n} evaluados' },
  'inicio.radar.lectura.medida': '{valor} {unidad}',
  'inicio.radar.lectura.cualitativa': 'Lectura cualitativa, sin medición numérica',
  'inicio.radar.lectura.cualitativaFuente': 'Lectura cualitativa, sin medición numérica · {fuente}',

  // ── Inicio · cobertura destacada ──
  'inicio.research.etiqueta': 'Análisis',
  'inicio.research.titulo': 'Cobertura destacada',
  'inicio.research.enlace': 'Todas las compañías',
  'inicio.research.vacio.titulo': 'Sin cobertura publicada',
  'inicio.research.vacio.motivo': 'La cobertura se construye a partir de los informes publicados.',
  'inicio.research.enCartera': 'En cartera',
  'inicio.research.sinResumen': 'Dato no disponible — ningún informe incluye resumen ejecutivo.',
  'inicio.research.verFicha': 'Ver ficha completa',
  'inicio.research.dato.precio': 'Precio',
  'inicio.research.dato.recomendacion': 'Recomendación',
  'inicio.research.dato.objetivo': 'Precio objetivo',
  'inicio.research.dato.recorrido': 'Recorrido al objetivo',

  // ── Inicio · catalizadores ──
  'inicio.catalizadores.etiqueta': 'Análisis',
  'inicio.catalizadores.titulo': 'Próximos catalizadores',
  'inicio.catalizadores.enlace': 'Agenda completa',
  'inicio.catalizadores.vacio.titulo': 'Sin eventos próximos',
  'inicio.catalizadores.vacio.motivo': 'La agenda solo recoge eventos con fecha verificable de una fuente conectada.',
  'inicio.catalizadores.nota': 'Prioridad HIGH: evento a 14 días o menos sobre una compañía en cartera. Resultados, guidance y eventos corporativos requieren un calendario que ningún proveedor conectado publica.',

  // ── Inicio · flujo de opciones ──
  'inicio.flujo.etiqueta': 'Opciones',
  'inicio.flujo.titulo': 'Flujo de opciones',
  'inicio.flujo.enlace': 'Ver Options',
  'inicio.flujo.rotulo': 'Analítica profesional de flujo de opciones',
  'inicio.flujo.motivo': 'Requiere conexión con un proveedor.',
  'inicio.flujo.contrato.titulo': 'Campos que consumirá la sección',

  // ── Inicio · W&C Signal ──
  'inicio.signal.vacio.titulo': 'Sin datos de Signal',
  'inicio.signal.vacio.motivo': 'El modelo no publica dimensiones.',
  'inicio.signal.dimension.pie': 'Peso {peso} % · {estado}',
  'inicio.signal.estado.sinFuente': 'sin fuente',
  'inicio.signal.estado.conFuente': 'fuente conectada',
  'inicio.signal.estado.sinPuntuacion': 'fuente conectada, sin puntuación emitida',
  'inicio.signal.motivoReserva': 'Modelo en construcción',
  'inicio.signal.cobertura': '{motivo}. Cobertura actual: {cobertura} % de las dimensiones con fuente.',

  // ── Cinta de cotizaciones del panel ──
  'cinta.liquidada': 'liquidada',
  'cinta.marcaLiquidada': '· liquidada',

  // ── Aviso de liquidación por take profit ──
  // La frase vive ENTERA aquí, no partida en trozos que el código concatene:
  // así cada idioma coloca sus piezas donde le corresponde. El plural se
  // declara con las formas que exige el idioma —`one` y `other` en castellano—
  // y lo elige `Intl.PluralRules`, nunca una condición en el código.
  'cartera.cierre.aviso': {
    one: '{destacado} — {posiciones}. El importe permanece como liquidez hasta que una nueva tesis lo reinvierta.',
    other: '{destacado} — {posiciones}. Los importes permanecen como liquidez hasta que nuevas tesis los reinviertan.',
  },
  'cartera.cierre.destacado': {
    one: '{n} posición liquidada por take profit',
    other: '{n} posiciones liquidadas por take profit',
  },
  'cartera.cierre.posicion': '{ticker} el {fecha} a {precio} ({rentabilidad})',
  'general.separadorLista': ' · ',
};
