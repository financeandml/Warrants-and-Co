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
    one: '{destacado} — {posiciones}. El importe permanece como liquidez hasta que una nueva tesis lo reinvierta.',
    other: '{destacado} — {posiciones}. Los importes permanecen como liquidez hasta que nuevas tesis los reinviertan.',
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
  'informe.operativa.nota': 'El precio de compra fija el coste real de la posición y sustituye al cierre de la sesión de publicación. Al alcanzarse el take profit, la posición se liquida automáticamente a ese nivel, deja de figurar en cartera y su importe permanece como liquidez hasta que una nueva tesis lo reinvierta.',

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
  'informe.eliminar.confirmar': '¿Eliminar definitivamente este informe y su documentación asociada?',
  'informe.eliminado': 'Informe eliminado.',

  // ═════════════════════════ Cartera · encabezado ═════════════════════════
  'cartera.etiqueta': 'Gestión de cartera',
  'cartera.titulo': 'Evolución de posiciones',
  'cartera.nota': 'La cartera se constituye automáticamente a partir de las tesis de inversión publicadas. La fecha de alta de cada posición corresponde a la fecha de publicación de su informe y el precio de entrada al cierre de esa sesión. El índice se calcula como rentabilidad ponderada en el tiempo, en base 100, sin aportaciones ni reembolsos externos.',

  'cartera.error.mercado': 'Datos de mercado no disponibles',
  'cartera.vacia.titulo': 'Cartera no constituida',
  'cartera.estado.actualizado': 'Actualizado a las {hora}',
  'cartera.pie.fuente': 'Datos de mercado: {fuentes}. Última actualización: {momento}.',

  // ═══════════════════════ Cartera · cuadro de mando ═══════════════════════
  'cartera.indicador.rentabilidad': 'Rentabilidad acumulada',
  'cartera.indicador.rentabilidad.nota': 'Sobre el capital invertido · desde {fecha}',
  'cartera.indicador.valorIndexado': 'Valor indexado',
  'cartera.indicador.valorIndexado.nota': 'Base {base} = capital invertido',
  'cartera.indicador.dia': 'Variación del día',
  'cartera.indicador.dia.nota': 'Ponderada por peso',
  'cartera.indicador.posiciones': 'Posiciones',
  'cartera.indicador.posiciones.nota': 'Tesis en cartera',
  'cartera.indicador.posiciones.liquidadas': {
    one: '{n} liquidada',
    other: '{n} liquidadas',
  },
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
  'cartera.grafico.opciones': 'Opciones del gráfico',
  'cartera.grafico.periodo': 'Periodo',
  'cartera.grafico.rango.max': 'Máx',
  'cartera.grafico.indice': 'Índice de referencia',
  'cartera.grafico.verDatos': 'Ver datos',
  'cartera.grafico.ocultarDatos': 'Ocultar datos',
  'cartera.leyenda.cartera': 'Cartera Warrants & Co.',

  'cartera.serie.caption': 'Serie histórica de la cartera y del índice de referencia',
  'cartera.serie.fecha': 'Fecha',
  'cartera.serie.cartera': 'Cartera',
  'cartera.serie.indice': 'Índice',
  'cartera.serie.diferencial': 'Diferencial',

  // ════════════════════════ Cartera · composición ════════════════════════
  'cartera.posiciones.titulo': 'Composición de la cartera',
  'cartera.posiciones.subtitulo': 'Cotizaciones actualizadas en cada carga de la página',
  'cartera.posiciones.caption': 'Detalle de las posiciones en cartera',
  'cartera.col.valor': 'Valor',
  'cartera.col.peso': 'Peso',
  'cartera.col.alta': 'Alta',
  'cartera.col.compra': 'Compra',
  'cartera.col.cotizacion': 'Cotización',
  'cartera.col.dia': 'Día',
  'cartera.col.rentabilidad': 'Rentabilidad',
  'cartera.col.takeProfit': 'Take profit',
  'cartera.col.recorrido': 'Recorrido a TP',
  'cartera.col.precioObjetivo': 'P. objetivo',
  'cartera.col.recomendacion': 'Recomendación',
  'cartera.recorrido.title': '{avance} del recorrido hasta el take profit',

  // ═════════════════════════ Cartera · liquidadas ═════════════════════════
  'cartera.cerradas.titulo': 'Posiciones liquidadas',
  'cartera.cerradas.subtitulo': 'Tesis cerradas automáticamente al alcanzar su take profit',
  'cartera.cerradas.caption': 'Detalle de las posiciones liquidadas',
  'cartera.cerradas.col.cierre': 'Cierre',
  'cartera.cerradas.col.precioSalida': 'Precio de salida',
  'cartera.cerradas.col.resultado': 'Resultado',
  'cartera.cerradas.col.motivo': 'Motivo',
  'cartera.cerradas.motivo': 'Cerrada',

  // ═══════════════════════ Cartera · estadísticos ═══════════════════════
  'cartera.estadisticos.titulo': 'Parámetros y estadísticos',
  'cartera.estadisticos.subtitulo': 'Métricas de riesgo y rentabilidad',
  'cartera.estadisticos.vacio.titulo': 'Estadísticos no disponibles',
  'cartera.estadisticos.vacio.detalle': 'Se requiere un histórico más amplio para calcular las métricas de riesgo.',
  'cartera.estadisticos.periodo': {
    one: 'Periodo {inicio} – {fin} · {n} sesión · referencia {indice}',
    other: 'Periodo {inicio} – {fin} · {n} sesiones · referencia {indice}',
  },

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
  'grafico.emergente.cartera': 'Cartera',
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
};
