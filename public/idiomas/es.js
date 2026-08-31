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
  'cabecera.sesion.analista': 'Analista',
  'cabecera.sesion.gestionar': 'Gestionar sesión',
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
  'general.cerrarAviso': 'Cerrar aviso',
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

  'portada.accesos.etiqueta': 'Accesos principales',
  // `portada.acceso.radar` queda sin uso mientras el área de Mercado esté
  // oculta. No se borra: vuelve con ella.
  'portada.acceso.radar': 'Explorar el radar',
  'portada.acceso.cobertura': 'Explorar la cobertura',
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

  // Los cuatro pilares de la maqueta de referencia, en sustitución de los tres
  // anteriores (Análisis, Catalizadores, Cartera). Pierden el enlace a sus
  // rutas —#/companias, #/catalizadores, #/cartera—: decisión tomada, no un
  // olvido. Las claves antiguas de pilar se conservan sin uso, como ya se
  // hacía con Radar y Opciones: vuelven si la maqueta cambia otra vez.
  'portada.pilar.investigacion.titulo': 'Investigación rigurosa',
  'portada.pilar.investigacion.texto': 'Análisis fundamental propio, sin ruido ni atajos, sobre las compañías y catalizadores que de verdad mueven la tesis.',
  'portada.pilar.cobertura.titulo': 'Cobertura selectiva',
  'portada.pilar.cobertura.texto': 'Un universo reducido de compañías, seguidas con la profundidad que la calidad exige antes que la cantidad.',
  'portada.pilar.riesgo.titulo': 'Gestión del riesgo',
  'portada.pilar.riesgo.texto': 'Cada posición entra con su tamaño, su horizonte y su salida definidos, no como una apuesta suelta.',
  'portada.pilar.independencia.titulo': 'Independencia',
  'portada.pilar.independencia.texto': 'Sin conflictos de interés ni banca de inversión detrás: el análisis solo responde a quien lo lee.',

  'portada.pilar.research.titulo': 'Análisis',
  'portada.pilar.research.texto': 'Análisis fundamental profundo, centrado en compañías, catalizadores, valoración y tesis de inversión.',
  // Los pilares de Radar y Opciones quedan sin uso mientras sus áreas estén
  // ocultas; los sustituyen Catalizadores y Cartera. No se borran: vuelven con ellas.
  'portada.pilar.radar.titulo': 'Radar',
  'portada.pilar.radar.texto': 'Una lectura sistemática del mercado, pensada para hacer emerger las oportunidades y las señales más relevantes.',
  'portada.pilar.options.titulo': 'Opciones',
  'portada.pilar.options.texto': 'Actividad en opciones, posicionamiento inusual y señales derivadas del propio mercado.',
  'portada.pilar.catalizadores.titulo': 'Catalizadores',
  'portada.pilar.catalizadores.texto': 'La agenda de lo que puede mover cada tesis: resultados, vencimientos y fechas con impacto sobre la cobertura.',
  'portada.pilar.cartera.titulo': 'Cartera',
  'portada.pilar.cartera.texto': 'Lo que las tesis publicadas han hecho: posiciones vivas, cerradas y el historial calculado desde su precio y su fecha.',
  'portada.pilar.explorar': 'Explorar',

  // ── Portada · fila de cifras ──
  // Lo que ha HECHO la cartera. Ninguna cifra retenida por suelo de muestra
  // tiene entrada aquí, y es a propósito: sin rótulo no hay casilla que llenar.
  'portada.cifras.anio': 'Rentabilidad {anio}',
  'portada.cifras.anio.desdeCapital': 'Desde el capital · {fecha}',
  'portada.cifras.anio.desdeCierre': 'Desde el cierre de {fecha}',
  'portada.cifras.total': 'Rentabilidad total',
  'portada.cifras.total.nota': 'Desde el capital invertido',
  'portada.cifras.indice.nota': 'Mismo periodo',
  'portada.cifras.caida': 'Máxima caída',
  'portada.cifras.caida.nota': 'Desde máximo previo',
  'portada.cifras.pie': 'Cartera Warrants & Co. · {desde} — {hasta} · {sesiones} · {tesis}, {vivas}.',
  'portada.cifras.pie.sesiones': { one: '{n} sesión', other: '{n} sesiones' },
  'portada.cifras.pie.tesis': { one: '{n} tesis', other: '{n} tesis' },
  'portada.cifras.pie.vivas': { one: '{n} viva', other: '{n} vivas' },
  'portada.cifras.pie.enlace': 'Ver la cartera línea por línea',
  // Compone el rótulo del índice en la fila del hero, que no tiene renglón
  // para la nota. El separador lo decide cada idioma, no el código.
  // Rótulo del índice de referencia: su nombre y el ETF con el que se mide.
  // Uno solo para las dos filas de cifras, el selector y la leyenda del
  // gráfico: son el mismo hecho y se escriben una vez.
  'cartera.benchmark.rotulo': '{nombre} · {simbolo}',
  'portada.cifras.hero.compuesto': '{rotulo} · {nota}',
  'portada.cifras.vacio.titulo': 'Cartera sin constituir',
  'portada.cifras.vacio.motivo': 'La cartera se constituye a partir de las tesis publicadas con ticker asignado. Sin ellas no hay rentabilidad que publicar.',

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

  // ── Inicio · Cartera (bento) ──
  'inicio.cartera.etiqueta': 'Gestión de cartera',
  'inicio.cartera.titulo': 'Cartera',
  'inicio.cartera.enlace': 'Ver cartera completa',
  'inicio.cartera.capital': 'Capital desplegado',
  'inicio.cartera.posiciones.abiertas': { one: '{n} abierta', other: '{n} abiertas' },
  'inicio.cartera.posiciones.cerradas': { one: '{n} cerrada', other: '{n} cerradas' },
  'inicio.cartera.vacio.titulo': 'Cartera sin constituir',
  'inicio.cartera.vacio.motivo': 'La cartera se constituye a partir de las tesis publicadas con ticker asignado. Sin ellas no hay rentabilidad que publicar.',

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
  'inicio.signal.dimension.pie': 'Peso {peso} · {estado}',
  'inicio.signal.estado.sinFuente': 'sin fuente',
  'inicio.signal.estado.conFuente': 'fuente conectada',
  'inicio.signal.estado.sinPuntuacion': 'fuente conectada, sin puntuación emitida',
  'inicio.signal.motivoReserva': 'Modelo en construcción',
  'inicio.signal.cobertura': '{motivo}. Cobertura actual: {cobertura} de las dimensiones con fuente.',

  // ── Cinta de cotizaciones del panel ──
  'cinta.liquidada': 'liquidada',
  'cinta.marcaLiquidada': '· liquidada',

  // ── Aviso de liquidación por take profit ──
  // La frase vive ENTERA aquí, no partida en trozos que el código concatene:
  // así cada idioma coloca sus piezas donde le corresponde. El plural se
  // declara con las formas que exige el idioma —`one` y `other` en castellano—
  // y lo elige `Intl.PluralRules`, nunca una condición en el código.
  'cartera.cierre.aviso': {
    one: '{destacado} — {posiciones}. El importe permanece como liquidez: no se reinvierte.',
    other: '{destacado} — {posiciones}. Los importes permanecen como liquidez: no se reinvierten.',
  },
  'cartera.cierre.destacado': {
    one: '{n} posición liquidada por take profit',
    other: '{n} posiciones liquidadas por take profit',
  },
  'cartera.cierre.posicion': '{ticker} el {fecha} a {precio} ({rentabilidad})',
  'general.separadorLista': ' · ',

  // ═══════════════════════ Repositorio · catálogo ═══════════════════════
  'repositorio.etiqueta': 'Repositorio documental',
  'repositorio.titulo': 'Catálogo de informes',
  'repositorio.publicar': 'Publicar informe',

  'repositorio.busqueda': 'Búsqueda',
  'repositorio.busqueda.hint': 'Empresa, ticker, analista o palabra clave…',
  'repositorio.buscar': 'Buscar',
  'repositorio.limpiar': 'Limpiar',

  'repositorio.filtro.sector': 'Sector',
  'repositorio.filtro.pais': 'País',
  'repositorio.filtro.tipo': 'Tipo',
  'repositorio.filtro.recomendacion': 'Recomendación',
  'repositorio.filtro.analista': 'Analista',
  'repositorio.filtro.acceso': 'Acceso',
  'repositorio.filtro.desde': 'Desde',
  'repositorio.filtro.hasta': 'Hasta',
  'repositorio.filtro.orden': 'Orden',

  // El castellano concuerda en género con el sustantivo elidido —«todos los
  // sectores», «todas las recomendaciones»—, de modo que necesita dos entradas
  // donde el inglés tiene una. Es exactamente lo que el diccionario existe para
  // resolver: el código pide la que corresponde y no sabe que son distintas.
  'repositorio.filtro.todos': 'Todos',
  'repositorio.filtro.todas': 'Todas',

  'repositorio.orden.recientes': 'Más recientes',
  'repositorio.orden.antiguos': 'Más antiguos',
  'repositorio.orden.empresa': 'Empresa (A–Z)',
  'repositorio.etiquetas.frecuentes': 'Etiquetas frecuentes',

  'repositorio.tabla.caption': 'Listado de informes publicados',
  'repositorio.col.compania': 'Compañía',
  'repositorio.col.ticker': 'Ticker',
  'repositorio.col.sector': 'Sector',
  'repositorio.col.tipo': 'Tipo',
  'repositorio.col.periodo': 'Periodo',
  'repositorio.col.recomendacion': 'Recomendación',
  'repositorio.col.precioObjetivo': 'P. objetivo',
  'repositorio.col.analista': 'Analista',
  'repositorio.col.fecha': 'Fecha',
  'repositorio.col.documentos': 'Documentos',
  'repositorio.col.acciones': 'Acciones',
  'repositorio.paginacion.etiqueta': 'Paginación de resultados',

  'repositorio.vacio.titulo': 'Sin resultados',
  'repositorio.vacio.detalle': 'Ningún informe coincide con los criterios seleccionados.',
  'repositorio.destacadoEquipo': 'Destacado por el equipo',
  'repositorio.editar': 'Editar',
  'repositorio.fila.abrir': 'Abrir informe de {empresa}',
  'repositorio.fila.editar': 'Editar el informe de {empresa}',

  // El recuento no se compone con `informe${n === 1 ? '' : 's'}`: esa condición
  // impone a todos los idiomas la morfología del castellano. Aquí cada uno
  // declara sus formas y las elige `Intl.PluralRules`.
  'repositorio.resumen': {
    one: 'Mostrando {desde}–{hasta} de {n} informe',
    other: 'Mostrando {desde}–{hasta} de {n} informes',
  },

  // ═══════════════════ Repositorio · ficha de lectura ═══════════════════
  'informe.detalle.cargando': 'Cargando informe…',
  'informe.detalle.noDisponible': 'No disponible',
  'informe.detalle.destacado': 'Destacado',
  'informe.detalle.fichaAnalitica': 'Ficha analítica',
  'informe.detalle.analista': 'Analista',
  'informe.detalle.publicacion': 'Publicación',
  'informe.detalle.precioObjetivo': 'Precio objetivo',
  'informe.detalle.nivelAcceso': 'Nivel de acceso',
  'informe.detalle.enCartera': 'En cartera',
  'informe.detalle.pesoAsignado': 'Peso asignado',
  'informe.detalle.precioCompra': 'Precio de compra',
  'informe.detalle.takeProfit': 'Take profit',
  'informe.detalle.stopLoss': 'Stop loss',
  'informe.detalle.resumen': 'Resumen ejecutivo',
  'informe.detalle.etiquetas': 'Etiquetas',
  'informe.detalle.documentacion': 'Documentación',
  'informe.detalle.sinDocumentacion': 'Este informe todavía no tiene documentación adjunta.',
  'informe.detalle.editar': 'Editar informe',

  // ═══════════════════ Repositorio · alta y modificación ═══════════════════
  'informe.titulo.publicar': 'Publicar informe',
  'informe.titulo.editar': 'Editar informe',
  'informe.entradilla': 'Complete la ficha analítica. Los campos marcados con asterisco son obligatorios.',

  'informe.grupo.emisor': 'Identificación del emisor',
  'informe.campo.empresa': 'Denominación social *',
  'informe.campo.ticker': 'Ticker',
  'informe.campo.sector': 'Sector',
  'informe.campo.pais': 'País',

  'informe.grupo.clasificacion': 'Clasificación del informe',
  'informe.campo.tipo': 'Tipo de informe',
  'informe.campo.periodo': 'Periodo',
  'informe.campo.periodo.hint': 'Ejercicio 2026 / 1T 2026',
  'informe.campo.analista': 'Analista',
  'informe.campo.fecha': 'Fecha de publicación *',

  'informe.grupo.valoracion': 'Valoración',
  'informe.campo.recomendacion': 'Recomendación',
  'informe.campo.precioObjetivo': 'Precio objetivo',
  'informe.campo.divisa': 'Divisa',
  'informe.campo.peso': 'Peso en cartera (%)',
  'informe.campo.peso.hint': 'Equiponderado si se omite',

  'informe.grupo.operativa': 'Operativa de la posición',
  'informe.campo.precioCompra': 'Precio de compra',
  'informe.campo.precioCompra.hint': 'Precio pagado por acción',
  'informe.campo.takeProfit': 'Take profit',
  'informe.campo.takeProfit.hint': 'Nivel de venta',
  'informe.campo.stopLoss': 'Stop loss',
  'informe.campo.stopLoss.hint': 'Opcional',
  'informe.operativa.nota': 'El precio de compra fija el coste real de la posición y sustituye al cierre de la sesión de publicación. Al alcanzarse el take profit, la posición se liquida automáticamente a ese nivel, deja de figurar en cartera y su importe permanece como liquidez, sin reinvertirse: una tesis nueva compra con su propio tramo de capital.',

  'informe.grupo.contenido': 'Contenido y difusión',
  'informe.campo.resumen': 'Resumen ejecutivo',
  'informe.campo.resumen.hint': 'Síntesis de la tesis, catalizadores y principales factores de riesgo.',
  'informe.campo.etiquetas': 'Etiquetas libres',
  'informe.campo.etiquetas.hint': 'Separadas por comas: cloud, márgenes, catalizador',
  'informe.campo.nivel': 'Nivel de acceso',
  'informe.campo.destacar': 'Destacar en portada',
  'informe.campo.incorporar': 'Incorporar a la cartera',

  'informe.grupo.documentacion': 'Documentación',
  'informe.campo.ficheros': 'Adjuntar informes (PDF, Word o Excel · máximo 25 MB por documento)',

  'informe.select.sinClasificar': 'Sin clasificar',
  'informe.select.sinRecomendacion': 'Sin recomendación',

  'informe.eliminar': 'Eliminar informe',
  'informe.cancelar': 'Cancelar',
  'informe.guardar.publicar': 'Publicar',
  'informe.guardar.cambios': 'Guardar cambios',
  'informe.guardar.procesando': 'Procesando…',

  'informe.adjunto.retirar': 'Retirar',
  'informe.adjunto.confirmar': '¿Retirar el documento «{nombre}»?',
  'informe.adjunto.retirado': 'Documento retirado.',
  'informe.guardado.actualizado': 'Informe actualizado correctamente.',
  'informe.guardado.publicado': 'Informe publicado correctamente.',
  'informe.guardado.reetiquetadas': {
    one: '{n} noticia existente reetiquetada como de esta compañía.',
    other: '{n} noticias existentes reetiquetadas como de esta compañía.',
  },
  'informe.eliminar.confirmar': '¿Eliminar definitivamente este informe y su documentación asociada?',
  'informe.eliminado': 'Informe eliminado.',
  'informe.eliminado.desvinculadas': {
    one: '{n} noticia se ha desvinculado de esta compañía: ya no queda ninguna tesis con este ticker.',
    other: '{n} noticias se han desvinculado de esta compañía: ya no queda ninguna tesis con este ticker.',
  },

  // ══════════════ Propuesta de ficha leída de un PDF adjunto ══════════════
  // Extraer es proponer: nada de lo que sale del documento cuenta como válido
  // hasta que el analista lo acepta. Los rótulos que vienen del PDF —el de la
  // fila que respalda cada propuesta— no se traducen: son texto del documento.
  'extraccion.leyendo': 'Leyendo «{nombre}»…',
  'extraccion.titulo': 'Propuesta leída de «{nombre}»',
  'extraccion.paginas': { one: '{n} página', other: '{n} páginas' },
  'extraccion.resumen.propuestos': { one: '1 campo propuesto, sin confirmar.', other: '{n} campos propuestos, sin confirmar.' },
  'extraccion.resumen.avisos': { one: '1 campo con aviso: el documento dice algo que no es un valor utilizable.', other: '{n} campos con aviso: el documento dice algo que no es un valor utilizable.' },
  'extraccion.resumen.decision': 'No se proponen por decisión: {campos}.',
  'extraccion.resumen.nada': 'De este documento no se ha podido proponer ningún campo.',
  'extraccion.aceptarTodas': 'Aceptar todas',
  'extraccion.descartarTodas': 'Descartar todas',
  'extraccion.aceptar': 'Aceptar',
  'extraccion.descartar': 'Descartar',
  'extraccion.marca.pendiente': 'Sin confirmar',
  'extraccion.marca.aceptada': 'Aceptado',
  'extraccion.marca.descartada': 'Descartado',
  'extraccion.marca.defecto': 'Valor por defecto, no leído del PDF',
  'extraccion.origen': 'página {pagina} · «{rotulo}»',
  'extraccion.origen.pagina': 'página {pagina}',
  'extraccion.aviso.literal': 'El PDF dice «{literal}» ({origen})',
  'extraccion.aviso.motivo': '{motivo} ({origen})',
  'extraccion.aviso.conservado': 'El PDF propone «{valor}» ({origen}); se conserva lo que usted escribió',
  'extraccion.pendientes': { one: 'Queda 1 propuesta sin revisar: {campos}. Acéptela, o vacíe el campo si no la quiere.', other: 'Quedan {n} propuestas sin revisar: {campos}. Acéptelas, o vacíe los campos que no quiera.' },
  'extraccion.boton.pendientes': { one: 'Revise 1 propuesta', other: 'Revise {n} propuestas' },
  'extraccion.error': 'No se ha podido leer el documento: {motivo}',

  // Motivos por los que un campo no llega propuesto. El catálogo vive en
  // `src/extraccion/motivos.js` y una prueba exige rótulo en los dos idiomas.
  'extraccion.motivo.NO_ES_PDF': 'el fichero no es un PDF',
  'extraccion.motivo.PDF_CIFRADO': 'el PDF está cifrado y su texto no puede leerse',
  'extraccion.motivo.PDF_DEMASIADO_GRANDE': 'el PDF supera el tamaño máximo admitido',
  'extraccion.motivo.PDF_SIN_PAGINAS': 'no ha sido posible determinar las páginas del PDF',
  'extraccion.motivo.PDF_SIN_CAPA_DE_TEXTO': 'el PDF no lleva capa de texto: es un documento escaneado',
  'extraccion.motivo.DOCUMENTO_AUSENTE': 'no se ha recibido ningún documento',
  'extraccion.motivo.FORMATO_NO_ANALIZABLE': 'solo se extrae de documentos PDF',
  'extraccion.motivo.ESQUELETO_NO_RECONOCIDO': 'el documento no sigue el esqueleto de los informes de la casa',
  'extraccion.motivo.ANCLA_FICHA_AUSENTE': 'no se ha encontrado la ficha de empresa',
  'extraccion.motivo.ANCLA_PLAN_AUSENTE': 'no se ha encontrado el plan de inversión',
  'extraccion.motivo.ETIQUETA_AUSENTE': 'el documento no trae ese rótulo',
  'extraccion.motivo.FILA_PARTIDA': 'el rótulo aparece suelto, sin su valor',
  'extraccion.motivo.SIN_CIFRA': 'lo que acompaña al rótulo no es una cifra',
  'extraccion.motivo.RANGO': 'el documento da un rango y no una cifra única',
  'extraccion.motivo.SIN_PORCENTAJE': 'lo que acompaña al rótulo no es un porcentaje único',
  'extraccion.motivo.FECHA_NO_INTERPRETABLE': 'la fecha no viene en un formato reconocible',
  'extraccion.motivo.FECHA_FUTURA': 'la fecha del informe es posterior a hoy',
  'extraccion.motivo.TICKER_SIN_PATRON': 'el rótulo del ticker no contiene ningún símbolo con «$»',
  'extraccion.motivo.TICKER_DISCREPANTE': 'el documento nombra más de un ticker',
  'extraccion.motivo.SECTOR_SIN_EQUIVALENCIA': 'sector sin equivalencia declarada',
  'extraccion.motivo.PAIS_SIN_EQUIVALENCIA': 'país sin equivalencia declarada',
  'extraccion.motivo.DIVISA_NO_SOPORTADA': 'divisa no admitida',
  'extraccion.motivo.INCOHERENTE_CON_COMPRA': 'el nivel leído no es coherente con el precio de compra',
  'extraccion.motivo.SIN_ETIQUETA_INEQUIVOCA': 'solo aparece en prosa condicional, y este campo mueve la cartera',
  'extraccion.motivo.RECOMENDACION_NO_SE_INFIERE': 'el documento declara el tipo de tesis, no una recomendación',
  'extraccion.motivo.TIPO_INFORME_NO_FIGURA': 'el documento no dice de qué tipo de informe se trata',
  'extraccion.motivo.SECCION_LOCALIZADA': 'la sección está en el documento; la síntesis la redacta usted',
  'extraccion.motivo.FUERA_DE_EXTRACCION': 'este campo no se extrae del documento',

  // ═════════════════════════ Cartera · encabezado ═════════════════════════
  'cartera.etiqueta': 'Gestión de cartera',
  'cartera.titulo': 'Evolución de posiciones',
  'cartera.nota': 'La cartera se constituye automáticamente a partir de las tesis de inversión publicadas. La fecha de alta de cada posición corresponde a la fecha de publicación de su informe, y el precio de entrada al de compra consignado en la ficha o, en su defecto, al cierre de esa sesión. El índice, en base 100, reparte el capital en tramos fijos: cada tesis compra el suyo en el alta y lo conserva hasta que se liquida, sin rebalanceos. Lo que sale de una posición liquidada permanece como liquidez y no financia a ninguna otra. Sin aportaciones ni reembolsos externos.',

  'cartera.error.mercado': 'Datos de mercado no disponibles',
  'cartera.vacia.titulo': 'Cartera no constituida',
  'cartera.estado.actualizado': 'Actualizado a las {hora}',
  'cartera.pie.fuente': 'Datos de mercado: {fuentes}. Última actualización: {momento}.',

  // ══════════════════════ Cartera · resumen de capital ══════════════════════
  // Las siete cifras de `resumenPortfolio`. «Realizada» y «no realizada» usan
  // dos rótulos de nota distintos: uno para cuando hay una cifra que explicar
  // y otro para cuando no hay nada de ese lado todavía —tercer estado, no cero—.
  'cartera.resumen.titulo': 'Resumen de capital',
  'cartera.resumen.subtitulo': 'Cuánto capital está comprometido y de dónde sale la rentabilidad',
  'cartera.resumen.vacio.titulo': 'Sin resumen que publicar',
  'cartera.resumen.vacio.motivo': 'La cartera no tiene posiciones constituidas todavía.',
  'cartera.resumen.retorno': 'Rentabilidad de la cartera',
  'cartera.resumen.retorno.nota': 'Sobre el capital invertido',
  'cartera.resumen.realizado': 'Rentabilidad realizada',
  'cartera.resumen.realizado.nota': 'Suma de la contribución de las posiciones cerradas',
  'cartera.resumen.realizado.vacio': 'Ninguna posición cerrada todavía',
  'cartera.resumen.noRealizado': 'Rentabilidad no realizada',
  'cartera.resumen.noRealizado.nota': 'Suma de la contribución de las posiciones abiertas',
  'cartera.resumen.noRealizado.vacio': 'Ninguna posición abierta todavía',
  'cartera.resumen.capital': 'Capital desplegado',
  'cartera.resumen.capital.nota': 'Fracción del capital comprometida en posiciones',
  'cartera.resumen.roic': 'ROIC',
  'cartera.resumen.roic.nota': 'Rentabilidad sobre el capital desplegado',
  'cartera.resumen.roic.vacio': 'Sin capital desplegado que dividir',
  'cartera.resumen.abiertas': 'Posiciones abiertas',
  'cartera.resumen.abiertas.nota': 'Tesis vivas en cartera',
  'cartera.resumen.cerradas': 'Posiciones cerradas',
  'cartera.resumen.cerradas.nota': 'Tesis liquidadas',

  // ═══════════════════════ Cartera · cuadro de mando ═══════════════════════
  'cartera.indicador.rentabilidad': 'Rentabilidad acumulada',
  'cartera.indicador.rentabilidad.nota': 'Sobre el capital invertido · desde {fecha}',
  'cartera.indicador.valorIndexado': 'Valor indexado',
  'cartera.indicador.valorIndexado.nota': 'Base {base} = capital invertido',
  'cartera.indicador.dia': 'Variación del día',
  'cartera.indicador.dia.nota': 'Ponderada por peso actual',
  'cartera.indicador.posiciones': 'Posiciones',
  'cartera.indicador.posiciones.nota': 'Tesis en cartera',
  'cartera.indicador.posiciones.liquidadas': {
    one: '{n} liquidada',
    other: '{n} liquidadas',
  },
  'cartera.indicador.liquidez': 'Liquidez',
  'cartera.indicador.liquidez.nota': 'Del patrimonio · {capital} del capital',

  'cartera.indicador.sharpe': 'Ratio de Sharpe',
  'cartera.indicador.sharpe.nota': 'Tasa libre de riesgo {tasa}',
  'cartera.indicador.maximaCaida': 'Máxima caída',
  'cartera.indicador.maximaCaida.nota': 'Desde máximo previo',

  // ══════════════════════════ Cartera · gráfico ══════════════════════════
  'cartera.grafico.titulo': 'Evolución de la cartera',
  'cartera.grafico.subtitulo': 'Valor indexado · base 100 = capital invertido',
  'cartera.grafico.subtitulo.serie': {
    one: 'Valor indexado · base 100 en {fecha} · {n} sesión',
    other: 'Valor indexado · base 100 en {fecha} · {n} sesiones',
  },
  'cartera.grafico.subtitulo.completa': {
    one: 'Valor indexado · base {base} = capital invertido · {n} sesión',
    other: 'Valor indexado · base {base} = capital invertido · {n} sesiones',
  },
  'cartera.grafico.opciones': 'Opciones del gráfico',
  'cartera.grafico.periodo': 'Periodo',
  'cartera.grafico.rango.max': 'Máx',
  'cartera.grafico.indice': 'Índice de referencia',
  'cartera.grafico.verDatos': 'Ver datos',
  'cartera.grafico.ocultarDatos': 'Ocultar datos',
  'cartera.leyenda.cartera': 'Cartera Warrants & Co.',
  'cartera.leyenda.medida.total': 'Medido desde el capital invertido · es la rentabilidad total',
  'cartera.leyenda.medida.rango': 'Medido desde el inicio del rango, {fecha} · no es la rentabilidad total',

  'cartera.serie.caption': 'Serie histórica de la cartera y del índice de referencia',
  'cartera.serie.fecha': 'Fecha',
  'cartera.serie.cartera': 'Cartera',
  'cartera.serie.indice': 'Índice',
  'cartera.serie.diferencial': 'Diferencial',

  // ════════════════════════ Cartera · composición ════════════════════════
  'cartera.posiciones.titulo': 'Composición de la cartera',
  'cartera.posiciones.subtitulo': 'Peso actual: cuánto pesa hoy cada posición sobre el patrimonio, liquidez incluida · cotizaciones actualizadas en cada carga de la página',
  'cartera.posiciones.caption': 'Detalle de las posiciones en cartera',
  'cartera.col.valor': 'Valor',
  'cartera.col.peso': 'Peso actual',
  'cartera.col.alta': 'Alta',
  'cartera.col.compra': 'Compra',
  'cartera.col.cotizacion': 'Cotización',
  'cartera.col.dia': 'Día',
  'cartera.col.rentabilidad': 'Rentabilidad',
  'cartera.col.takeProfit': 'Take profit',
  'cartera.col.recorrido': 'Recorrido a TP',
  'cartera.col.precioObjetivo': 'P. objetivo',
  'cartera.col.recomendacion': 'Recomendación',
  'cartera.col.estado': 'Estado',
  'cartera.col.actual': 'Actual/Salida',
  'cartera.col.contribucion': 'Contribución',
  'cartera.estado.abierta': 'Abierta',
  'cartera.estado.cerrada': 'Cerrada',
  'cartera.fila.desplegar': 'Detalle de {ticker}',
  'cartera.fila.detalle.alta': 'Alta',
  'cartera.fila.detalle.cierre': 'Cierre',
  'cartera.recorrido.title': '{avance} del recorrido hasta el take profit',

  'cartera.mov.rendimiento': 'Rendimiento',
  'cartera.mov.composicion': 'Composición',
  'cartera.mov.procedencia': 'Procedencia',
  'cartera.anillo.titulo': 'Reparto del patrimonio',
  'cartera.anillo.subtitulo': 'Peso sobre el patrimonio · la caja es un sector más',
  'cartera.anillo.descripcion': 'Reparto del patrimonio: {partes}.',
  'cartera.anillo.sinCaja.titulo': 'Composición sin cerrar',
  'cartera.anillo.sinCaja.motivo': 'No consta el peso de la liquidez, y sin él las partes no suman el todo. Repartir solo las posiciones vivas afirmaría que la cartera está invertida al 100 %.',
  'cartera.anillo.vacio.titulo': 'Sin composición que repartir',
  'cartera.anillo.vacio.motivo': 'No hay posiciones vivas ni liquidez que repartir.',
  'cartera.metodologia.resumen': 'Cómo se calcula todo esto',
  'cartera.metodologia.remite': 'La conciliación declara además sus propios supuestos junto a su tabla.',
  'cartera.liquidez.etiqueta': 'Liquidez',
  'cartera.liquidez.nota': {
    one: 'Peso sobre el patrimonio. Del capital es el {capital}: {n} tramo liquidado que ya no se reinvierte. Las dos cifras difieren porque el tramo salió valiendo más de lo que costó.',
    other: 'Peso sobre el patrimonio. Del capital es el {capital}: {n} tramos liquidados que ya no se reinvierten. Las dos cifras difieren porque los tramos salieron valiendo más de lo que costaron.',
  },
  'cartera.liquidez.nota.sinLiquidar': 'Peso sobre el patrimonio. Es el {capital} del capital, que ninguna tesis ha reclamado todavía.',

  // ════════════════════════ Cartera · conciliación ════════════════════════
  'cartera.conciliacion.titulo': 'Conciliación de la rentabilidad',
  'cartera.conciliacion.subtitulo': 'Peso de capital: el tramo asignado en el alta, del que responde la línea. Peso por rentabilidad es su contribución, y las contribuciones suman la rentabilidad total',
  'cartera.conciliacion.caption': 'Conciliación de la rentabilidad, posición por posición',
  'cartera.conciliacion.col.peso': 'Peso de capital',
  'cartera.conciliacion.col.entrada': 'Precio de entrada',
  'cartera.conciliacion.col.referencia': 'Precio de referencia',
  'cartera.conciliacion.col.valorTramo': 'Valor del tramo',
  'cartera.conciliacion.col.contribucion': 'Contribución',
  'cartera.conciliacion.fuente.salida': 'Salida · {fecha}',
  'cartera.conciliacion.fuente.cotizacion': 'Cotización',
  'cartera.conciliacion.fuente.cierre': 'Cierre · {fecha}',
  'cartera.conciliacion.fuente.ausente': 'Sin precio publicado',
  'cartera.conciliacion.enCaja': 'En caja',
  'cartera.conciliacion.sinDesplegar': 'Capital sin desplegar',
  'cartera.conciliacion.sinDesplegar.detalle': 'Ninguna tesis lo ha reclamado',
  'cartera.conciliacion.total': 'Total',
  'cartera.conciliacion.total.nota': {
    one: '{n} tramo · base {base} = capital',
    other: '{n} tramos · base {base} = capital',
  },
  'cartera.conciliacion.nota': {
    one: 'La liquidez no lleva línea propia: el importe de un tramo liquidado sigue dentro de la suya, que es la que responde de él. Hoy es {n} tramo —el {capital} del capital—, valorado en {importe}, que es el {patrimonio} del patrimonio.',
    other: 'La liquidez no lleva línea propia: el importe de un tramo liquidado sigue dentro de la suya, que es la que responde de él. Hoy son {n} tramos —el {capital} del capital—, valorados en {importe}, que es el {patrimonio} del patrimonio.',
  },
  'cartera.conciliacion.nota.sinCaja': 'Sin tramos liquidados: todo el capital sigue invertido y la liquidez es cero.',

  // ═════════════════════════ Cartera · liquidadas ═════════════════════════
  'cartera.cerradas.titulo': 'Posiciones liquidadas',
  'cartera.cerradas.subtitulo': 'Tesis cerradas automáticamente al alcanzar su take profit',
  'cartera.cerradas.caption': 'Detalle de las posiciones liquidadas',
  'cartera.cerradas.col.cierre': 'Cierre',
  'cartera.cerradas.col.precioSalida': 'Precio de salida',
  'cartera.cerradas.col.resultado': 'Resultado',
  'cartera.cerradas.col.motivo': 'Motivo',
  'cartera.cerradas.motivo': 'Cerrada',

  // ═════════════════════ Cartera · suelo de muestra ═════════════════════
  'cartera.muestra.faltan': {
    one: 'Falta {n} sesión · se publica con {minimas} ({plazo})',
    other: 'Faltan {n} sesiones · se publica con {minimas} ({plazo})',
  },
  // El plazo viaja ya redactado: «1 año» y «3 años» concuerdan por su propia cuenta,
  // no por la de las sesiones que falten.
  'cartera.muestra.plazo': { one: '{n} año', other: '{n} años' },
  'cartera.muestra.explicacion': 'Dos suelos distintos, por motivos distintos. Las cifras anualizadas se publican a partir de {anualizada} sesiones, un año: antes de cumplirlo, anualizar por composición extrapola un tramo que no se ha recorrido; a partir de ahí es la anualización de un rendimiento ocurrido, y eso es un hecho, no una inferencia. Los ratios ajustados por riesgo —Sharpe, Sortino, Calmar y el alfa de Jensen— esperan a {ratios} sesiones, tres años: es el mínimo del oficio —Morningstar no calcula medidas ajustadas por riesgo por debajo de ese plazo— y la aritmética lo respalda, porque su error típico depende del plazo y no de la frecuencia con que se muestree. Con {sesiones} sesiones ese error desborda a la propia cifra, de modo que el nivel no significaría nada. Lo que la muestra sí sostiene —rentabilidad total, volatilidad, máxima caída, beta— se publica desde el primer día.',

  // ═══════════════════════ Cartera · estadísticos ═══════════════════════
  'cartera.estadisticos.titulo': 'Parámetros y estadísticos',
  'cartera.estadisticos.subtitulo': 'Métricas de riesgo y rentabilidad',
  'cartera.estadisticos.vacio.titulo': 'Estadísticos no disponibles',
  'cartera.estadisticos.vacio.detalle': 'Se requiere un histórico más amplio para calcular las métricas de riesgo.',
  'cartera.estadisticos.periodo': {
    one: 'Periodo {inicio} – {fin} · {n} sesión · referencia {indice}',
    other: 'Periodo {inicio} – {fin} · {n} sesiones · referencia {indice}',
  },

  'cartera.grupo.rentabilidad': 'Rentabilidad',
  'cartera.grupo.riesgo': 'Riesgo',
  'cartera.grupo.indice': 'Relación con el índice',
  'cartera.grupo.sesiones': 'Sesiones',
  'cartera.metrica.rentabilidadTotal': 'Rentabilidad total',
  'cartera.metrica.rentabilidadTotal.nota': 'Del periodo completo',
  'cartera.metrica.rentabilidadAnualizada': 'Rentabilidad anualizada',
  'cartera.metrica.rentabilidadAnualizada.nota': 'Tasa compuesta',
  'cartera.metrica.rentabilidadIndice': 'Rentabilidad {indice}',
  'cartera.metrica.rentabilidadIndice.nota': 'Mismo periodo',
  'cartera.metrica.volatilidad': 'Volatilidad',
  'cartera.metrica.volatilidad.nota': 'Anualizada',
  'cartera.metrica.sharpe': 'Ratio de Sharpe',
  'cartera.metrica.sharpe.nota': 'Exceso sobre {tasa}',
  'cartera.metrica.sortino': 'Ratio de Sortino',
  'cartera.metrica.sortino.nota': 'Solo riesgo bajista',
  'cartera.metrica.calmar': 'Ratio de Calmar',
  'cartera.metrica.calmar.nota': 'Rentabilidad / máxima caída',
  'cartera.metrica.maximaCaida': 'Máxima caída',
  'cartera.metrica.maximaCaida.nota': '{desde} – {hasta}',
  'cartera.metrica.beta': 'Beta',
  'cartera.metrica.beta.nota': 'Frente a {indice}',
  'cartera.metrica.alfa': 'Alfa de Jensen',
  'cartera.metrica.alfa.nota': 'Anualizada',
  'cartera.metrica.correlacion': 'Correlación',
  'cartera.metrica.correlacion.nota': 'Con {indice}',
  'cartera.metrica.sesionesPositivas': 'Sesiones positivas',
  'cartera.metrica.sesionesPositivas.nota': 'Del total',
  'cartera.metrica.mejorSesion': 'Mejor sesión',
  'cartera.metrica.peorSesion': 'Peor sesión',
  'cartera.metrica.sesion.nota': 'Variación diaria',

  // ══════════════════ Cartera · gráfico SVG (grafico.js) ══════════════════
  'grafico.indice': 'Índice',
  'grafico.vacio.titulo': 'Serie no disponible',
  'grafico.vacio.detalle': 'No existe histórico suficiente para representar la evolución de la cartera.',
  'grafico.etiqueta': 'Gráfico de evolución de la cartera. Use las flechas para recorrer las sesiones.',
  // Descripción equivalente para lectores de pantalla. Vive entera aquí: el
  // inglés no ordena estas piezas como el castellano.
  'grafico.descripcion': {
    one: 'Serie de {n} sesión entre el {desde} y el {hasta}. La cartera evoluciona desde {inicial} hasta {final} en base 100, lo que representa una variación del {variacion}. Comparada con {indice}. El detalle numérico completo está disponible en la tabla de datos.',
    other: 'Serie de {n} sesiones entre el {desde} y el {hasta}. La cartera evoluciona desde {inicial} hasta {final} en base 100, lo que representa una variación del {variacion}. Comparada con {indice}. El detalle numérico completo está disponible en la tabla de datos.',
  },
  // Nombre corto de la serie. Lo usan el rótulo del extremo del gráfico y el
  // emergente: es el mismo nombre para la misma línea, y se escribe una vez.
  'grafico.serie.cartera': 'Cartera',
  'grafico.base': 'base 100',
  'grafico.emergente.acumulado': 'Acumulado',

  'general.si': 'Sí',
  'general.no': 'No',

  // Los cuatro niveles de acceso llegan del servidor ya rotulados, pero ese
  // rótulo es vocabulario de la interfaz —no algo que haya escrito un
  // analista—, así que se traduce desde la clave, que sí es estable.
  'informe.acceso.publico': 'Público',
  'informe.acceso.cliente': 'Cliente',
  'informe.acceso.institucional': 'Institucional',
  'informe.acceso.interno': 'Interno',
  // ═══════════════════════════ Errores de la red ═══════════════════════════
  // Los emite `api()`, antes de que ninguna sección los interprete.
  'error.red': 'No ha sido posible contactar con el servidor. Verifique que la aplicación sigue en ejecución.',
  'error.solicitud': 'La solicitud ha fallado (código {codigo}).',

  // ═════════════════════ Códigos del catálogo del servidor ═════════════════
  // Un reparo de validación llega con su código; `rotuloError()` lo resuelve
  // aquí y solo cae al texto del servidor si el código no tiene rótulo. La
  // clave repite el código tal cual —MAYUSCULAS_CON_GUION, contra el estilo
  // del resto del fichero— para que el cotejo con `src/errores.js` sea una
  // comparación de conjuntos y no una transformación que pueda desviarse.
  // Los cubre `tests/errores.js`, que falla si falta uno en cualquier idioma.
  'codigo.EMPRESA_OBLIGATORIA': 'La denominación social es obligatoria',
  'codigo.TICKER_FORMATO': 'Formato de ticker no válido',
  'codigo.TICKER_REQUERIDO_EN_CARTERA': 'Una tesis incorporada a cartera requiere ticker de cotización',
  'codigo.FECHA_FORMATO': 'La fecha debe seguir el formato AAAA-MM-DD',
  'codigo.FECHA_FUTURA': 'La fecha de publicación no puede ser futura',
  'codigo.TIPO_INFORME_NO_RECONOCIDO': 'Tipo de informe no reconocido',
  'codigo.RECOMENDACION_NO_RECONOCIDA': 'Recomendación no reconocida',
  'codigo.NIVEL_ACCESO_NO_RECONOCIDO': 'Nivel de acceso no reconocido',
  'codigo.DIVISA_NO_SOPORTADA': 'Divisa no soportada',
  'codigo.PRECIO_OBJETIVO_NO_NUMERICO': 'El precio objetivo debe ser numérico',
  'codigo.PRECIO_OBJETIVO_FUERA_RANGO': 'El precio objetivo está fuera de rango',
  'codigo.PESO_NO_NUMERICO': 'El peso debe ser numérico',
  'codigo.PESO_FUERA_RANGO': 'El peso debe expresarse entre 0 y 100',
  'codigo.PRECIO_COMPRA_NO_NUMERICO': 'El precio de compra debe ser numérico',
  'codigo.PRECIO_COMPRA_FUERA_RANGO': 'El precio de compra está fuera de rango',
  'codigo.TAKE_PROFIT_NO_NUMERICO': 'El take profit debe ser numérico',
  'codigo.TAKE_PROFIT_FUERA_RANGO': 'El take profit está fuera de rango',
  'codigo.STOP_LOSS_NO_NUMERICO': 'El stop loss debe ser numérico',
  'codigo.STOP_LOSS_FUERA_RANGO': 'El stop loss está fuera de rango',
  'codigo.TAKE_PROFIT_BAJO_COMPRA': 'El take profit debe situarse por encima del precio de compra',
  'codigo.STOP_LOSS_SOBRE_COMPRA': 'El stop loss debe situarse por debajo del precio de compra',
  'codigo.TITULAR_OBLIGATORIO': 'El titular es obligatorio',
  'codigo.URL_NO_VALIDA': 'El enlace debe ser una dirección http o https válida',
  'codigo.CATEGORIA_NO_RECONOCIDA': 'Categoría no reconocida',
  'codigo.RELEVANCIA_NO_RECONOCIDA': 'Nivel de relevancia no reconocido',
  'codigo.LIMITE_PETICIONES': 'Se ha superado el límite de peticiones. Reintente en unos instantes.',
  'codigo.CREDENCIAL_INVALIDA': 'Credencial de analista no válida.',
  'codigo.RECURSO_NO_ENCONTRADO': 'Recurso de API no encontrado.',
  'codigo.CUERPO_NO_JSON': 'El cuerpo de la petición no es JSON válido.',
  'codigo.VALIDACION': 'Los datos remitidos no superan la validación',
  'codigo.DOCUMENTO_DEMASIADO_GRANDE': 'Cada documento supera el tamaño máximo admitido.',
  'codigo.DEMASIADOS_DOCUMENTOS': 'Se ha excedido el número máximo de documentos por informe.',
  'codigo.CAMPO_FICHERO_INESPERADO': 'Campo de fichero no esperado.',
  'codigo.DOCUMENTOS_NO_PROCESABLES': 'No ha sido posible procesar los documentos.',
  'codigo.ERROR_INTERNO': 'Se ha producido un error interno en el servidor.',
  'codigo.PROVEEDOR_NO_RESPONDE': 'Un proveedor externo no ha respondido.',
  'codigo.CAPACIDAD_NO_DISPONIBLE': 'Ningún proveedor conectado ofrece esta capacidad.',
  'codigo.SIMBOLO_INVALIDO': 'Símbolo no válido: {simbolo}',
  'codigo.SIN_SERIE_HISTORICA': 'No hay serie histórica disponible para este instrumento.',

  // ══════════════════════════ Acceso de analista ═══════════════════════════
  'acceso.credencialInvalida': 'Credencial no válida.',
  'acceso.iniciada': 'Sesión iniciada como analista de Warrants & Co.',
  'acceso.cerrada': 'Sesión cerrada.',

  // ════════════════════ Cobertura, agenda y panorama ═══════════════════════
  // Solo los rótulos que pone `app.js`; el cuerpo de cada sección lo pintan
  // sus propios módulos.
  'companias.ficha.cargando': 'Cargando…',
  'companias.ficha.noEncontrada': 'Compañía no encontrada',
  'companias.error': 'No ha sido posible cargar la cobertura: {detalle}',
  'catalizadores.cargando': 'Cargando agenda…',
  'catalizadores.error': 'No ha sido posible cargar la agenda: {detalle}',
  'mercado.cargando': 'Cargando panorama…',
  'mercado.error': 'No ha sido posible cargar el panorama: {detalle}',

  // ═══════════════════════════════ Noticias ════════════════════════════════
  'noticias.antetitulo': 'Actualidad',
  'noticias.titulo': 'Noticias de mercado',
  'noticias.sincronizar': 'Actualizar ahora',
  'noticias.publicar': 'Publicar noticia',
  'noticias.busqueda': 'Búsqueda de noticias',
  'noticias.busqueda.hint': 'Titular, compañía, ticker o palabra clave…',
  'noticias.buscar': 'Buscar',
  'noticias.limpiar': 'Limpiar',
  'noticias.paginacion.etiqueta': 'Paginación de noticias',

  'noticias.filtro.categoria': 'Categoría',
  'noticias.filtro.relevancia': 'Relevancia',
  'noticias.filtro.valor': 'Valor',
  'noticias.filtro.origen': 'Origen',
  'noticias.filtro.desde': 'Desde',
  'noticias.filtro.hasta': 'Hasta',
  // «Todas» y «Todos» son dos claves por la misma razón que en el repositorio:
  // el castellano concuerda con el sustantivo elidido y el inglés no distingue.
  'noticias.filtro.todas': 'Todas',
  'noticias.filtro.todos': 'Todos',

  'noticias.origen.propio': 'Redacción propia',
  'noticias.relevancia.urgente': 'Urgente',
  'noticias.relevancia.alta': 'Alta',
  'noticias.relevancia.normal': 'Normal',

  // Las siete categorías son vocabulario cerrado de la interfaz —no algo que
  // haya escrito un analista—, igual que los niveles de acceso: se guarda la
  // clave, que es estable, y se traduce el rótulo.
  'noticias.categoria.mercados': 'Mercados',
  'noticias.categoria.compania': 'Compañía',
  'noticias.categoria.macroeconomia': 'Macroeconomía',
  'noticias.categoria.sector': 'Sector',
  'noticias.categoria.resultados': 'Resultados',
  'noticias.categoria.corporativa': 'Operación corporativa',
  'noticias.categoria.regulacion': 'Regulación',
  'noticias.destacada': 'Portada',

  'noticias.vacio.titulo': 'Sin noticias',
  'noticias.vacio.filtrado': 'Ninguna noticia coincide con los criterios seleccionados.',
  'noticias.vacio.inicial': 'Todavía no se ha publicado ninguna noticia. Utilice «Publicar noticia» para registrar la primera.',
  'noticias.sinResultados': 'Sin resultados',
  'noticias.resumen': {
    one: 'Mostrando {desde}–{hasta} de {n} noticia',
    other: 'Mostrando {desde}–{hasta} de {n} noticias',
  },

  // ── Noticias · ficha de lectura ──
  'noticias.detalle.cargando': 'Cargando noticia…',
  'noticias.detalle.noDisponible': 'No disponible',
  'noticias.detalle.sindicada': 'Pieza sindicada: la plataforma recoge el titular y remite al artículo original en la fuente.',
  'noticias.detalle.valores': 'Valores relacionados',
  'noticias.detalle.etiquetas': 'Etiquetas',
  'noticias.detalle.fuenteOriginal': 'Consultar fuente original',
  'noticias.detalle.editar': 'Editar noticia',

  // ── Noticias · alta y modificación ──
  'noticia.titulo.publicar': 'Publicar noticia',
  'noticia.titulo.editar': 'Editar noticia',
  'noticia.entradilla': 'Redacte la pieza informativa. Solo el titular es obligatorio.',
  'noticia.grupo.contenido': 'Contenido',
  'noticia.campo.titular': 'Titular *',
  'noticia.campo.entradilla': 'Entradilla',
  'noticia.campo.entradilla.hint': 'Resumen en una o dos frases.',
  'noticia.campo.cuerpo': 'Cuerpo',
  'noticia.campo.cuerpo.hint': 'Desarrollo de la noticia y su lectura para la cartera.',
  'noticia.grupo.clasificacion': 'Clasificación',
  'noticia.campo.categoria': 'Categoría',
  'noticia.campo.relevancia': 'Relevancia',
  'noticia.campo.fecha': 'Fecha de publicación *',
  'noticia.campo.valores': 'Valores relacionados',
  'noticia.campo.valores.hint': 'Separados por comas: ORCL, QCOM',
  'noticia.campo.etiquetas': 'Etiquetas libres',
  'noticia.campo.etiquetas.hint': 'Separadas por comas: resultados, guidance',
  'noticia.campo.autor': 'Autor',
  'noticia.campo.fuente': 'Fuente',
  'noticia.campo.fuente.hint': 'Medio o servicio de origen',
  'noticia.campo.url': 'Enlace a la fuente',
  'noticia.campo.destacar': 'Destacar en portada',
  'noticia.eliminar': 'Eliminar noticia',
  'noticia.cancelar': 'Cancelar',
  'noticia.guardar.publicar': 'Publicar',
  'noticia.guardar.cambios': 'Guardar cambios',
  'noticia.guardar.procesando': 'Procesando…',
  'noticia.guardado.publicada': 'Noticia publicada correctamente.',
  'noticia.guardado.actualizada': 'Noticia actualizada correctamente.',
  'noticia.eliminar.confirmar': '¿Eliminar definitivamente esta noticia?',
  'noticia.eliminada': 'Noticia eliminada.',

  // ── Noticias · sindicación con Investing.com ──
  // Cada pieza es un dato independiente y se une con el separador de lista, no
  // una frase partida: el orden de los datos no cambia de un idioma a otro.
  'noticias.sindicacion.actualizado': 'Actualizado {hora}',
  'noticias.sindicacion.sindicadas': '{n} de Investing.com',
  'noticias.sindicacion.propias': '{n} propias',
  'noticias.sindicacion.cada': 'cada {min} min',
  'noticias.sindicacion.manual': 'automatismo desactivado',
  'noticias.sindicacion.noDisponible': 'Estado de sindicación no disponible',
  'noticias.sindicacion.actualizando': 'Actualizando…',
  'noticias.sindicacion.incorporadas': {
    one: '{n} noticia incorporada',
    other: '{n} noticias incorporadas',
  },
  'noticias.sindicacion.sinNovedades': 'Sin novedades desde la última consulta',
  // El resultado viaja entero, con su puntuación: el inglés no la coloca igual.
  'noticias.sindicacion.aviso': '{detalle}.',
  'noticias.sindicacion.avisoVinculadas': {
    one: '{detalle} · {n} sobre un valor en cartera.',
    other: '{detalle} · {n} sobre valores en cartera.',
  },
  'noticias.sindicacion.canal': 'Canal no disponible — {detalle}',

  // ═══════════════════════ Opciones · rótulos de app.js ════════════════════
  'opciones.estado.proveedor': {
    one: 'Proveedor {proveedor} · archivo propio {n} sesión',
    other: 'Proveedor {proveedor} · archivo propio {n} sesiones',
  },
  'opciones.filtro.todos': 'Todos',
  'opciones.inusual.consultando': 'Consultando cadenas de opciones…',
  'opciones.inusual.error.marca': 'Error',
  'opciones.inusual.error.titulo': 'No ha sido posible consultar las opciones',
  'opciones.inusual.resumen': {
    one: '{n} de {total} contrato evaluado',
    other: '{n} de {total} contratos evaluados',
  },
  'opciones.cadena.consultando': 'Consultando…',
  // Dos cifras mandan aquí a la vez —contratos y vencimientos— y `Intl` solo
  // puede concordar con una: la plantilla se declara sin formas de plural.
  'opciones.cadena.resumen': '{contratos} contratos · subyacente {precio} · {vencimientos} vencimientos',
  'opciones.cadena.sinDatos.marca': 'Sin datos',
  'opciones.cadena.sinDatos.titulo': 'No hay cadena disponible para {simbolo}',

  // ══════════════════════════ Radar · W&C Radar ════════════════════════════
  // «W&C Radar» y «W&C Signal» no figuran aquí: son nombres de producto y no se
  // traducen, igual que en la portada, donde tampoco llevan `data-i18n`.
  'radar.etiqueta': 'Inteligencia de mercado',
  'radar.subtitulo': 'Las señales que conviene vigilar hoy.',
  'radar.pendiente.marca': 'Próximamente',
  // El plural concuerda con el total, que es el sustantivo cuantificado: son
  // «7 señales» de las que 3 están operativas, no «3 señales».
  'radar.senales.operativas': {
    one: '{operativas} de {n} señal operativa',
    other: '{operativas} de {n} señales operativas',
  },

  // ── Radar · W&C Signal ──
  'radar.signal.subtitulo': 'Indicador propietario · escala 0 – 100',
  'radar.signal.agregado': 'Signal agregado',
  'radar.signal.escala': 'Escala 0 – 100',
  'radar.signal.enConstruccion': 'Modelo en construcción',
  'radar.signal.lecturaDe': 'Lectura de {ticker}',
  'radar.signal.lecturaDisponible': 'Lectura disponible',
  'radar.signal.pendiente': 'Pendiente',

  // ── Radar · cartera ──
  'radar.cartera.titulo': 'Cartera',
  'radar.cartera.subtitulo': 'Rendimiento de la cartera frente a su índice de referencia',
  'radar.cartera.enlace': 'Ver cartera completa',
  'radar.cartera.vacio.titulo': 'Cartera sin datos',
  'radar.cartera.vacio.motivo': 'La cartera se constituye a partir de las tesis publicadas con ticker asignado.',

  // Cada métrica lleva su nota aparte: son dos líneas distintas en pantalla, no
  // una frase partida.
  'radar.metrica.rentabilidad': 'Rentabilidad de la cartera',
  'radar.metrica.rentabilidad.nota': 'Sobre el capital invertido',
  'radar.metrica.benchmark': 'Índice ({indice})',
  'radar.metrica.benchmark.nota': 'Mismo periodo',
  'radar.metrica.alfa': 'Alfa',
  'radar.metrica.alfa.nota': 'Jensen · anualizada',
  'radar.metrica.sharpe': 'Sharpe',
  // La tasa llega ya formateada: un «%» dentro de la plantilla fijaría la
  // convención de un idioma en los dos.
  'radar.metrica.sharpe.nota': 'Tasa libre {tasa}',
  'radar.metrica.caida': 'Máxima caída',
  'radar.metrica.caida.nota': 'Desde máximo previo',
  'radar.metrica.volatilidad': 'Volatilidad',
  'radar.metrica.volatilidad.nota': 'Anualizada',

  'radar.aportaciones.suman': 'Las que más suman',
  'radar.aportaciones.restan': 'Las que más restan',
  'radar.aportaciones.sinGrupo': 'Sin posiciones en este grupo.',
  'radar.aportaciones.vacio.titulo': 'Sin contribuciones',
  'radar.aportaciones.vacio.motivo': 'Todavía no hay posiciones con rentabilidad calculada.',

  // ── Radar · análisis destacado ──
  'radar.research.titulo': 'Análisis destacado',
  'radar.research.subtitulo': 'Tesis destacadas por el comité de análisis',
  'radar.research.enlace': 'Ver repositorio',
  'radar.research.vacio.titulo': 'Sin tesis publicadas',
  'radar.research.vacio.motivo': 'Publique un informe desde el área de analistas para verlo aquí.',
  'radar.research.signal': 'W&C Signal: {valor}',

  // ── Radar · catalizadores ──
  'radar.catalizadores.titulo': 'Próximos catalizadores',
  'radar.catalizadores.subtitulo': 'Agenda de eventos con impacto sobre la cartera',
  'radar.catalizadores.vacio.titulo': 'Agenda sin conectar',
  'radar.catalizadores.sinCalendario': 'Sin calendario de eventos',
  'radar.catalizadores.vacio.motivo': '{motivo}. La interfaz está preparada para recibir eventos de tipo {tipos}.',
  'radar.catalizadores.nota': '{motivo}: {tipos}.',

  // ── Radar · últimas noticias ──
  'radar.noticias.titulo': 'Últimas noticias',
  'radar.noticias.subtitulo': 'Actualidad de mercado',
  'radar.noticias.enlace': 'Ver todas',
  'radar.noticias.vacio.titulo': 'Sin noticias',
  'radar.noticias.vacio.motivo': 'El repositorio se alimenta automáticamente desde Investing.com cada quince minutos.',

  // ═══════════════════ Sellos de calidad del dato ══════════════════════════
  // Vocabulario cerrado del servidor, rotulado desde `vocabulario.js`. El código
  // sigue viajando en la clase CSS; aquí solo se traduce lo que se lee.
  'sello.tiempoReal': 'Tiempo real',
  'sello.retrasado': 'Con retraso',
  'sello.historico': 'Histórico',
  'sello.calculado': 'Calculado',
  'sello.inferido': 'Inferido',
  'sello.noDisponible': 'No disponible',

  // ════════════════════════════ Compañías ══════════════════════════════════
  'companias.etiqueta': 'Análisis',
  'companias.titulo': 'Compañías',
  'companias.busqueda': 'Buscar compañía',
  'companias.busqueda.hint': 'Nombre, ticker, sector o tema…',
  'companias.filtro.sector': 'Sector',
  'companias.filtro.todosSectores': 'Todos los sectores',
  'companias.limpiar': 'Limpiar',
  'companias.volver': '← Todas las compañías',

  // ── Listado ──
  'companias.estado.consulta': {
    one: '{n} compañía para «{consulta}»',
    other: '{n} compañías para «{consulta}»',
  },
  'companias.estado.cobertura': {
    one: '{n} compañía bajo cobertura',
    other: '{n} compañías bajo cobertura',
  },
  'companias.vacio.titulo': 'Sin resultados',
  'companias.vacio.filtrado': 'Ninguna compañía cubierta coincide con «{consulta}».',
  'companias.vacio.inicial': 'Todavía no hay informes publicados: la cobertura se construye a partir de ellos.',
  'companias.tarjeta.abrir': 'Abrir ficha de {empresa}',
  'companias.enCartera': 'En cartera',
  'companias.tarjeta.ultimo': 'Último: {fecha}',
  'companias.tarjeta.documentos': {
    one: '{n} documento',
    other: '{n} documentos',
  },

  // ── Datos, compartidos por la tarjeta y la ficha ──
  'companias.dato.recomendacion': 'Recomendación',
  'companias.dato.objetivo': 'Precio objetivo',
  'companias.dato.informes': 'Informes',
  'companias.dato.recorrido': 'Recorrido al objetivo',
  'companias.dato.peso': 'Peso en cartera',
  'companias.dato.compra': 'Precio de compra',
  'companias.dato.takeProfit': 'Take profit',
  'companias.dato.stopLoss': 'Stop loss',
  'companias.dato.distancia': 'Distancia al take profit',

  // ── Ficha ──
  'companias.cotizacion.sinDato': 'Sin cotización disponible',
  'companias.cotizacion.selloNota': 'Dato consolidado con retraso; la plataforma no dispone de tiempo real.',
  'companias.tesis.titulo': 'Tesis vigente',
  'companias.tesis.sinResumen': 'Dato no disponible — ningún informe incluye resumen ejecutivo.',
  'companias.niveles.titulo': 'Niveles operativos',
  // Sin formas de plural: el número va entre paréntesis y no concuerda con nada.
  'companias.informes.titulo': 'Análisis publicado ({n})',
  'companias.informes.tipoReserva': 'Informe',
  'companias.informes.adjuntos': {
    one: '{n} doc.',
    other: '{n} docs.',
  },
  'companias.prensa.titulo': 'Menciones en prensa',
  'companias.prensa.vacio': 'Dato no disponible — ningún teletipo reciente menciona a la compañía.',
  'companias.verCatalizadores': 'Ver catalizadores de la compañía',

  // ══════════════════ Vocabulario de eventos (agenda) ══════════════════════
  // Rotulado desde `vocabulario.js`. El código sigue siendo el valor del filtro.
  'evento.tipo.vencimiento': 'Vencimiento de opciones',
  'evento.tipo.analisis': 'Análisis',
  'evento.tipo.prensa': 'Prensa',
  'evento.tipo.resultados': 'Resultados',
  'evento.tipo.previsiones': 'Previsiones',
  'evento.tipo.diaInversor': 'Día del inversor',
  'evento.tipo.corporativa': 'M&A',
  'evento.tipo.producto': 'Producto',
  'evento.tipo.regulacion': 'Regulación',
  'evento.prioridad.alta': 'Alta',
  'evento.prioridad.media': 'Media',
  'evento.prioridad.baja': 'Baja',
  'evento.prioridad.desconocida': 'Sin determinar',
  'evento.fecha.exacta': 'exacta',
  'evento.vinculo.mencionLiteral': 'mención literal',

  // ═════════════════════════ Catalizadores ═════════════════════════════════
  'catalizadores.etiqueta': 'Análisis',
  'catalizadores.titulo': 'Catalizadores',
  'catalizadores.filtros.etiqueta': 'Filtros de agenda',
  'catalizadores.horizonte.proximos': 'Próximos',
  'catalizadores.horizonte.pasados': 'Pasados',
  'catalizadores.filtro.compania': 'Compañía',
  'catalizadores.filtro.todasCompanias': 'Todas las compañías',
  'catalizadores.filtro.tipo': 'Tipo de evento',
  'catalizadores.filtro.todosTipos': 'Todos los tipos',
  'catalizadores.carencias.titulo': 'Sin fuente conectada',
  'catalizadores.carencias.subtitulo': 'Categorías que la agenda reconoce pero que hoy nadie alimenta',

  // Tres datos independientes unidos por el separador de lista, no una frase
  // partida: el orden no cambia de un idioma a otro.
  'catalizadores.resumen.proximos': { one: '{n} próximo', other: '{n} próximos' },
  'catalizadores.resumen.pasados': { one: '{n} pasado', other: '{n} pasados' },
  'catalizadores.resumen.alta': {
    one: '{n} de prioridad alta',
    other: '{n} de prioridad alta',
  },

  'catalizadores.vacio.pasados': 'Sin eventos pasados',
  'catalizadores.vacio.proximos': 'Sin eventos próximos',
  'catalizadores.vacio.motivo': 'La agenda solo recoge eventos con fecha verificable de una fuente conectada.',
  'catalizadores.enCartera': 'En cartera',
  'catalizadores.parcial': 'Agregado parcial',
  'catalizadores.sinFecha.eventos': {
    one: '{n} evento sin fecha',
    other: '{n} eventos sin fecha',
  },

  'catalizadores.pie.fuente': 'Fuente: {fuente}',
  'catalizadores.pie.fecha': 'Fecha {calidad}',
  'catalizadores.pie.vinculo': 'Vínculo: {vinculo}',

  'catalizadores.dato.interesAbierto': 'Interés abierto',
  'catalizadores.dato.volumen': 'Volumen',
  'catalizadores.dato.cuotaOI': 'Cuota del OI',
  'catalizadores.dato.contratos': 'Contratos',
  'catalizadores.dato.recomendacion': 'Recomendación',
  'catalizadores.dato.objetivo': 'Precio objetivo',
  'catalizadores.dato.analista': 'Analista',

  // ═══════════════════════════ Mercado ═════════════════════════════════════
  'mercado.etiqueta': 'Mercado',
  'mercado.titulo': 'Mercados',
  // Dos datos independientes unidos por el separador de lista.
  'mercado.cobertura': {
    one: '{n} de {total} instrumento resuelto',
    other: '{n} de {total} instrumentos resueltos',
  },
  'mercado.sinMotivo': 'Dato no disponible',

  // ── Grupos del panorama ──
  'mercado.grupo.renta-variable.titulo': 'Renta variable',
  'mercado.grupo.renta-variable.descripcion': 'Índices de referencia estadounidenses',
  'mercado.grupo.volatilidad.titulo': 'Volatilidad',
  'mercado.grupo.volatilidad.descripcion': 'Volatilidad implícita del mercado',
  'mercado.grupo.tipos.titulo': 'Curva de tipos',
  'mercado.grupo.tipos.descripcion': 'Rendimiento del Tesoro estadounidense',

  // ── Motivos fijos por los que un dato o un cálculo no se publica ──
  'mercado.motivo.SIN_DATOS': 'Sin datos de mercado.',
  'mercado.motivo.DOW_JONES_SIN_PROVEEDOR':
    'Ningún proveedor conectado publica el índice. Los símbolos habituales resuelven a otros ' +
    'instrumentos: DJIA devuelve un ETF de covered call y DIA el ETF réplica, no el índice.',
  'mercado.motivo.VIX_VOLATILIDAD_IMPLICITA': 'Volatilidad implícita a 30 días del S&P 500',
  'mercado.motivo.CURVA_INCOMPLETA': 'Requiere los tramos de 2 y 10 años',
  'mercado.motivo.CALIDAD_DIFERIDO': 'Dato consolidado con retraso. La plataforma no dispone de contrato de tiempo real.',
  'mercado.motivo.CALIDAD_FUERA_DE_SESION': 'Estado de la sesión: {estado}. El último precio es el cierre de la sesión anterior.',

  // ── Estado de sesión, para el {estado} de arriba ──
  'mercado.estadoMercado.CLOSED': 'Cerrado',
  'mercado.estadoMercado.PRE_MKT': 'Previo a la apertura',
  'mercado.estadoMercado.POST_MKT': 'Posterior al cierre',
  'mercado.estadoMercado.AFTER_HOURS': 'Fuera de horario',

  // ── Curva de tipos ──
  'mercado.curva.titulo': 'Pendiente de la curva',
  // La cifra llega ya formateada: «pb» es la unidad, y va pegada al número.
  'mercado.curva.puntosBasicos': '{valor} pb',
  'mercado.curva.invertida': 'Curva invertida (10 a < 2 a)',
  'mercado.curva.positiva': 'Curva con pendiente positiva (10 a > 2 a)',
  'mercado.curva.selloNota': 'Diferencia entre los tramos de 10 y 2 años.',
  'mercado.curva.plazoMeses': '{n} m',
  'mercado.curva.plazoAnios': '{n} a',

  // ── Leyenda de calidades ──
  'mercado.leyenda.titulo': 'Calidad del dato',
  'mercado.leyenda.subtitulo': 'Qué significa cada sello en esta página',
  'mercado.leyenda.ausentes': 'No resuelto en esta carga: {instrumentos}.',
  'mercado.calidad.leyenda.REAL_TIME': 'Cotización en vivo. La plataforma no dispone hoy de ninguna.',
  'mercado.calidad.leyenda.DELAYED': 'Dato consolidado con retraso durante la sesión.',
  'mercado.calidad.leyenda.HISTORICAL': 'Último cierre disponible; el mercado no está en sesión regular.',
  'mercado.calidad.leyenda.UNAVAILABLE': 'Ningún proveedor conectado resuelve el instrumento.',

  // ═══════════════════════════ Opciones (A) ════════════════════════════════
  // Terminología según el criterio de CLAUDE.md: se traduce lo que un analista
  // diría en castellano; Strike, Premium, IV, Vol/OI, Trade type y Signal se
  // quedan porque los diría en inglés aunque hable en castellano.
  'opciones.etiqueta': 'Derivados',
  'opciones.titulo': 'Opciones',
  'opciones.pestanas.etiqueta': 'Secciones de opciones',
  'opciones.pestana.flujo': 'Flujo de opciones',
  'opciones.pestana.inusual': 'Actividad inusual',
  'opciones.pestana.cadena': 'Cadena de opciones',

  // ── Alcance del proveedor ──
  'opciones.alcance.servidos': 'Datos servidos por {proveedor}',
  'opciones.alcance.noPublicado': 'No publicado: {campos}.',
  'opciones.alcance.archivo': {
    one: 'Archivo propio: {n} sesión sobre {simbolos} valores.',
    other: 'Archivo propio: {n} sesiones sobre {simbolos} valores.',
  },
  'opciones.alcance.archivoCorto': {
    one: 'Archivo propio: {n} sesión. Hacen falta {necesarias} para los factores comparativos del score.',
    other: 'Archivo propio: {n} sesiones. Hacen falta {necesarias} para los factores comparativos del score.',
  },
  'opciones.campo.volatilidadImplicita': 'volatilidad implícita',
  'opciones.campo.griegas': 'griegas (delta, gamma, theta, vega)',
  'opciones.campo.multiplicador': 'multiplicador de contrato declarado',
  'opciones.campo.operaciones': 'operaciones individuales (time & sales)',
  'opciones.campo.contextoCotizacion': 'horquilla en el instante de cada operación',
  'opciones.campo.historico': 'histórico propio del proveedor',

  // ── Columnas de la tabla ──
  'opciones.col.ticker': 'Ticker',
  'opciones.col.tipo': 'Tipo',
  'opciones.col.strike': 'Strike',
  'opciones.col.vencimiento': 'Vencimiento',
  'opciones.col.premium': 'Premium',
  'opciones.col.volumen': 'Volumen',
  'opciones.col.interesAbierto': 'Int. abierto',
  'opciones.col.volOI': 'Vol/OI',
  'opciones.col.iv': 'IV',
  'opciones.col.tradeType': 'Trade type',
  'opciones.col.signal': 'Signal',

  // ── Tabla ──
  'opciones.tabla.vacio.titulo': 'Sin resultados',
  'opciones.tabla.vacio.motivo': 'Ningún contrato cumple los criterios seleccionados.',
  'opciones.tabla.fila': 'Detalle de {simbolo} {lado} {strike}',
  'opciones.tabla.resumen': {
    one: 'Mostrando {desde}–{hasta} de {n} contrato',
    other: 'Mostrando {desde}–{hasta} de {n} contratos',
  },

  // ── Destacadas ──
  'opciones.destacadas.titulo': 'Mayor actividad inusual',
  'opciones.destacadas.subtitulo': 'Contratos con mayor puntuación en la sesión',
  'opciones.destacadas.vacio.titulo': 'Sin actividad puntuable',
  'opciones.destacadas.vacio.motivo': 'Ningún contrato alcanza la cobertura mínima de la metodología con los datos disponibles.',
  'opciones.destacadas.motivo': 'Actividad destacada en la sesión',

  // ── Ficha «¿por qué destaca?» ──
  'opciones.detalle.titulo': '¿Por qué destaca?',
  'opciones.detalle.vence': 'vencimiento {fecha}',
  'opciones.detalle.score': 'Unusual activity score',
  'opciones.detalle.escala': 'Escala 0–100 · cobertura {cobertura} de la metodología',
  'opciones.detalle.coberturaInsuficiente': 'Cobertura insuficiente',
  'opciones.dato.volumen': 'Volumen',
  'opciones.dato.interesAbierto': 'Interés abierto',
  'opciones.dato.volOI': 'Vol/OI',
  'opciones.dato.premium': 'Premium',
  'opciones.dato.iv': 'IV',
  'opciones.dato.ivCambio': 'Cambio de IV',
  'opciones.dato.distanciaStrike': 'Distancia al strike',
  'opciones.dato.diasVencimiento': 'Días a vencimiento',
  'opciones.dato.noCalculable': 'No calculable',
  'opciones.dato.dias': '{n} d',
  'opciones.clasificacion.titulo': 'Clasificación de la operación',
  'opciones.clasificacion.sentido': 'Sentido',
  'opciones.clasificacion.ejecucion': 'Ejecución',
  'opciones.clasificacion.posicion': 'Posición',
  'opciones.senales.titulo': 'Señales clave',
  'opciones.senales.vacio': 'Ningún factor alcanza el umbral para emitir una señal.',
  'opciones.factores.titulo': 'Desglose de la puntuación',
  'opciones.factores.peso': 'peso {peso}',

  // ── Contratos: cabecera y filtros ──
  'opciones.contratos.titulo': 'Contratos',
  'opciones.contratos.subtitulo': 'Pulse una fila para ver por qué destaca',
  'opciones.filtro.premiumMin': 'Premium mín.',
  'opciones.filtro.volumenMin': 'Volumen mín.',
  'opciones.filtro.ratioMin': 'Vol/OI mín.',
  'opciones.filtro.scoreMin': 'Signal mín.',
  'opciones.filtro.ivRank': 'IV rank',
  'opciones.filtro.tradeType': 'Trade type',
  'opciones.filtro.direccion': 'Sentido',
  'opciones.filtro.periodo': 'Periodo',
  'opciones.filtro.noDisponible': 'No disponible',
  'opciones.filtro.sesionActual': 'Sesión actual',
  'opciones.filtro.soloInusual': 'Solo inusual (Vol/OI ≥ 1)',
  'opciones.filtro.limpiar': 'Limpiar',
  'opciones.filtro.actualizar': 'Actualizar',
  'opciones.filtro.requiereIV': 'Requiere IV del proveedor',
  'opciones.filtro.requiereIV.titulo': 'Requiere volatilidad implícita del proveedor',
  'opciones.filtro.requiereTimeSales': 'Requiere time & sales',
  'opciones.filtro.requiereTimeSales.titulo': 'Requiere operaciones individuales',
  'opciones.filtro.requiereSentido': 'Requiere sentido de la operación',
  'opciones.filtro.soloSesion': 'Solo sesión actual',
  'opciones.filtro.requierePeriodo.titulo': 'Requiere histórico intradía',

  // ── Flujo de operaciones ──
  'opciones.flujo.titulo': 'El flujo de operaciones necesita otra fuente',
  'opciones.flujo.motivo': 'Sin proveedor de operaciones individuales.',
  'opciones.flujo.mientras': 'Mientras tanto, «Actividad inusual» sí opera: puntúa los agregados de la sesión con los factores que sí pueden calcularse.',

  // ═══════════════════════ Opciones · cadena (B) ═══════════════════════════
  // Bid, Ask y las griegas se quedan en inglés: es lo que se dice en una mesa
  // aunque se hable en castellano. «Last» sí tiene forma viva —«último»—.
  'opciones.cadena.calls': 'Calls',
  'opciones.cadena.puts': 'Puts',
  'opciones.cadena.col.bid': 'Bid',
  'opciones.cadena.col.ask': 'Ask',
  'opciones.cadena.col.last': 'Último',
  'opciones.cadena.col.delta': 'Delta',
  'opciones.cadena.col.gamma': 'Gamma',
  'opciones.cadena.col.theta': 'Theta',
  'opciones.cadena.col.vega': 'Vega',
  'opciones.cadena.vacio.titulo': 'Sin contratos',
  'opciones.cadena.vacio.motivo': 'El vencimiento seleccionado no tiene contratos publicados.',
  'opciones.cadena.buscar': 'Buscar',
  'opciones.cadena.subtitulo': 'Calls a la izquierda, puts a la derecha',

  // ── Mapa de interés abierto ──
  'opciones.mapa.titulo': 'Interés abierto por strike',
  'opciones.mapa.subtitulo': 'Concentración de posición abierta en calls y puts',
  'opciones.mapa.callOI': 'Call OI',
  'opciones.mapa.putOI': 'Put OI',
  'opciones.mapa.sinDatos': 'Sin interés abierto publicado para este vencimiento.',
  'opciones.mapa.tituloCall': {
    one: '{n} contrato abierto en calls',
    other: '{n} contratos abiertos en calls',
  },
  'opciones.mapa.tituloPut': {
    one: '{n} contrato abierto en puts',
    other: '{n} contratos abiertos en puts',
  },

  // ── Clasificación de operaciones de opciones ──
  'operacion.compraCall': 'Compra call',
  'operacion.ventaCall': 'Venta call',
  'operacion.compraPut': 'Compra put',
  'operacion.ventaPut': 'Venta put',
  'operacion.sweep': 'Sweep',
  'operacion.block': 'Block',
  'operacion.simple': 'Simple',
  'operacion.multipata': 'Multipata',
  'operacion.apertura': 'Apertura',
  'operacion.cierre': 'Cierre',
  'operacion.desconocido': 'Desconocido',
};
