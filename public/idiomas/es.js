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
};
