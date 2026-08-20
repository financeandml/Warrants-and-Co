/* ============================================================================
   Dictionary · English

   Flat keys, dot-namespaced. An entry is a string or, when a count governs it,
   an object carrying the plural forms the language requires.

   Strings accept named substitution: {n}, {ticker}, {fuente}.
   ========================================================================= */

export default {
  // ── Language switch ──
  'idioma.grupo': 'Interface language',
  'idioma.es': 'Spanish',
  'idioma.en': 'English',

  // ── Sample strings, to verify the mechanism in phase 1 ──
  'general.saltoContenido': 'Skip to main content',
  'cabecera.marca.ir': 'Warrants & Co. — go to home',
  'cabecera.acceso': 'Analyst area',
  'cabecera.sesionActiva': 'Session active',
  'cabecera.sesion.analista': 'Analyst',
  'cabecera.tema.grupo': 'Interface theme',
  'cabecera.tema.claro': 'Light theme',
  'cabecera.tema.oscuro': 'Dark theme',

  // ── Document ──
  'documento.titulo': 'Warrants & Co. — Research & Investment',
  'documento.descripcion': 'Warrants & Co. research and investment platform. Investment thesis repository, company coverage and portfolio tracking.',

  // ── Header ──
  'cabecera.marca.lema': 'Research & Investment',
  'cabecera.nav.etiqueta': 'Main navigation',

  // ── Navigation · areas ──
  // The brand is never translated: «Warrants & Co.», «W&C Radar» and «W&C Signal»
  // are proper names. Area and section labels are.
  'nav.market': 'Market',
  'nav.research': 'Research',
  'nav.options': 'Options',
  'nav.portfolio': 'Portfolio',
  'nav.pronto': 'Soon',

  'nav.market.radar': 'Radar',
  'nav.market.radar.desc': 'Today\u2019s signals',
  'nav.market.mercados': 'Markets',
  'nav.market.mercados.desc': 'Indices, volatility and rates',
  'nav.market.institucional': 'Institutional positioning',

  'nav.research.companias': 'Companies',
  'nav.research.companias.desc': 'Coverage by company',
  'nav.research.tesis': 'Investment theses',
  'nav.research.tesis.desc': 'Report repository',
  'nav.research.catalizadores': 'Catalysts',
  'nav.research.catalizadores.desc': 'Event calendar',
  'nav.research.noticias': 'News',
  'nav.research.noticias.desc': 'Market news',

  'nav.options.flujo': 'Options flow',
  'nav.options.flujo.desc': 'Notable trades',
  'nav.options.inusual': 'Unusual activity',
  'nav.options.inusual.desc': 'Standout activity',
  'nav.options.cadena': 'Option chain',
  'nav.options.cadena.desc': 'Chain by expiry',

  'nav.portfolio.cartera': 'Portfolio',
  'nav.portfolio.cartera.desc': 'Composition and performance',
  'nav.portfolio.rendimiento': 'Performance',
  'nav.portfolio.seguimiento': 'Thesis tracker',

  'nav.pendiente.aviso': '{seccion} will be available in a future release.',

  // ── General ──
  'general.cerrar': 'Close',
  'general.cerrarAviso': 'Dismiss notice',
  'general.cancelar': 'Cancel',

  // ── Analyst area ──
  'acceso.titulo': 'Analyst area',
  'acceso.clave': 'Analyst key',
  'acceso.entrar': 'Sign in',
  'acceso.cerrarSesion': 'Sign out',

  // ── Footer ──
  'pie.lema': 'Internal research and investment platform.',
  'pie.linkedin': 'Warrants & Co. profile on LinkedIn',
  'pie.nav.etiqueta': 'Warrants & Co. sections',

  // ── Formatting pieces ──
  // They only join data, but they live here all the same: the order and the
  // separator are each language's decision, not the painting code's.
  'general.noDisponible': 'N/A',
  'general.sinDatos': 'Data unavailable',
  'general.importeDivisa': '{importe} {divisa}',

  // ── Cover · hero ──
  'portada.accesos.etiqueta': 'Main entry points',
  'portada.acceso.radar': 'Explore radar',
  'portada.acceso.research': 'View research',

  // ── Cover · manifesto ──
  // ONE sentence broken into lines. Where it breaks, and how many lines it
  // takes, is typography and belongs to each language: English says it in three
  // lines, and nothing forces Spanish to use three as well.
  'portada.manifiesto.titular': [
    'Market intelligence',
    'for investors who',
    'think in probabilities.',
  ],
  'portada.manifiesto.entrada': 'Fundamental research, market intelligence and options analytics designed to identify where conviction meets opportunity.',

  'portada.pilar.research.titulo': 'Research',
  'portada.pilar.research.texto': 'Deep fundamental analysis focused on companies, catalysts, valuation and investment thesis.',
  'portada.pilar.radar.titulo': 'Radar',
  'portada.pilar.radar.texto': 'A systematic view of the market designed to surface the most relevant opportunities and signals.',
  'portada.pilar.options.titulo': 'Options',
  'portada.pilar.options.texto': 'Options activity, unusual positioning and market-derived signals.',
  'portada.pilar.explorar': 'Explore',

  // ── Home · market ticker ──
  'inicio.ticker.etiqueta': 'Market quotes',

  // ── Home · market pulse ──
  'inicio.pulse.etiqueta': 'Market',
  'inicio.pulse.titulo': 'Market pulse',
  'inicio.pulse.enlace': 'View market',
  'inicio.pulse.indices.etiqueta': 'Index shown',
  'inicio.pulse.serie.etiqueta': 'Historical series',
  'inicio.pulse.cambio': '{absoluta}  {porcentaje}',
  'inicio.pulse.periodo': '{desde} — {hasta}',
  'inicio.pulse.notaSerie': '{etf} · replicating ETF',
  'inicio.pulse.nota.sinSerie': 'No connected provider publishes a historical series for {indice}. The quote shown above is real and arrives delayed.',
  'inicio.pulse.nota.fallo': 'The {indice} series could not be retrieved right now. Select it again to retry.',
  'inicio.pulse.nota.conSerie': {
    one: 'Curve: {curva}. No connected provider carries a historical series for {indice}; the ETF that replicates it is not the index and is labelled as such. {n} session · historical data.',
    other: 'Curve: {curva}. No connected provider carries a historical series for {indice}; the ETF that replicates it is not the index and is labelled as such. {n} sessions · historical data.',
  },

  // ── Home · W&C Radar ──
  'inicio.radar.etiqueta': 'Market intelligence',
  'inicio.radar.enlace': 'View full radar',
  'inicio.radar.vacio.titulo': 'No operational signals',
  'inicio.radar.vacio.motivo': 'No signal family has a connected source.',
  'inicio.radar.evaluados': { one: '{n} evaluated', other: '{n} evaluated' },
  'inicio.radar.lectura.medida': '{valor} {unidad}',
  'inicio.radar.lectura.cualitativa': 'Qualitative reading, no numeric measurement',
  'inicio.radar.lectura.cualitativaFuente': 'Qualitative reading, no numeric measurement · {fuente}',

  // ── Home · featured coverage ──
  'inicio.research.etiqueta': 'Research',
  'inicio.research.titulo': 'Featured coverage',
  'inicio.research.enlace': 'All companies',
  'inicio.research.vacio.titulo': 'No published coverage',
  'inicio.research.vacio.motivo': 'Coverage is built from published reports.',
  'inicio.research.enCartera': 'In portfolio',
  'inicio.research.sinResumen': 'Data unavailable — no report includes an executive summary.',
  'inicio.research.verFicha': 'View full profile',
  'inicio.research.dato.precio': 'Price',
  'inicio.research.dato.recomendacion': 'Recommendation',
  'inicio.research.dato.objetivo': 'Target price',
  'inicio.research.dato.recorrido': 'Upside to target',

  // ── Home · catalysts ──
  'inicio.catalizadores.etiqueta': 'Research',
  'inicio.catalizadores.titulo': 'Upcoming catalysts',
  'inicio.catalizadores.enlace': 'Full calendar',
  'inicio.catalizadores.vacio.titulo': 'No upcoming events',
  'inicio.catalizadores.vacio.motivo': 'The calendar only carries events with a verifiable date from a connected source.',
  'inicio.catalizadores.nota': 'HIGH priority: an event 14 days out or less on a company held in the portfolio. Earnings, guidance and corporate events require a calendar that no connected provider publishes.',

  // ── Home · options flow ──
  'inicio.flujo.etiqueta': 'Options',
  'inicio.flujo.titulo': 'Options flow',
  'inicio.flujo.enlace': 'View Options',
  'inicio.flujo.rotulo': 'Professional options flow analytics',
  'inicio.flujo.motivo': 'Provider connection required.',
  'inicio.flujo.contrato.titulo': 'Fields the section will consume',

  // ── Home · W&C Signal ──
  'inicio.signal.vacio.titulo': 'Signal data unavailable',
  'inicio.signal.vacio.motivo': 'The model publishes no dimensions.',
  'inicio.signal.dimension.pie': 'Weight {peso} · {estado}',
  'inicio.signal.estado.sinFuente': 'no source',
  'inicio.signal.estado.conFuente': 'source connected',
  'inicio.signal.estado.sinPuntuacion': 'source connected, no score issued',
  'inicio.signal.motivoReserva': 'Model under construction',
  'inicio.signal.cobertura': '{motivo}. Current coverage: {cobertura} of dimensions with a source.',

  // ── Panel quote ticker ──
  'cinta.liquidada': 'closed',
  'cinta.marcaLiquidada': '· closed',

  // ── Take profit liquidation notice ──
  // The whole sentence lives here rather than being stitched together in code,
  // so each language can order its parts as it needs. Note that English leads
  // with the event and pushes the count into a subordinate clause — an order
  // Spanish does not use, and which concatenation could never have produced.
  'cartera.cierre.aviso': {
    one: 'Take profit reached · {destacado}. {posiciones} — the proceeds are held as cash until a new thesis reinvests them.',
    other: 'Take profit reached · {destacado}. {posiciones} — the proceeds are held as cash until new theses reinvest them.',
  },
  'cartera.cierre.destacado': {
    one: '{n} position closed',
    other: '{n} positions closed',
  },
  'cartera.cierre.posicion': '{ticker} on {fecha} at {precio} ({rentabilidad})',
  'general.separadorLista': ' · ',

  // ═══════════════════════ Repository · catalogue ═══════════════════════
  'repositorio.etiqueta': 'Document repository',
  'repositorio.titulo': 'Research catalogue',
  'repositorio.publicar': 'Publish report',

  'repositorio.busqueda': 'Search',
  'repositorio.busqueda.hint': 'Company, ticker, analyst or keyword…',
  'repositorio.buscar': 'Search',
  'repositorio.limpiar': 'Clear',

  'repositorio.filtro.sector': 'Sector',
  'repositorio.filtro.pais': 'Country',
  'repositorio.filtro.tipo': 'Type',
  'repositorio.filtro.recomendacion': 'Recommendation',
  'repositorio.filtro.analista': 'Analyst',
  'repositorio.filtro.acceso': 'Access',
  'repositorio.filtro.desde': 'From',
  'repositorio.filtro.hasta': 'To',
  'repositorio.filtro.orden': 'Sort',

  // English does not inflect for gender, so both entries say the same thing.
  // They stay separate all the same: the code asks for the one that fits its
  // noun, and Spanish needs the distinction.
  'repositorio.filtro.todos': 'All',
  'repositorio.filtro.todas': 'All',

  'repositorio.orden.recientes': 'Most recent',
  'repositorio.orden.antiguos': 'Oldest first',
  'repositorio.orden.empresa': 'Company (A–Z)',
  'repositorio.etiquetas.frecuentes': 'Frequent tags',

  'repositorio.tabla.caption': 'List of published reports',
  'repositorio.col.compania': 'Company',
  'repositorio.col.ticker': 'Ticker',
  'repositorio.col.sector': 'Sector',
  'repositorio.col.tipo': 'Type',
  'repositorio.col.periodo': 'Period',
  'repositorio.col.recomendacion': 'Recommendation',
  'repositorio.col.precioObjetivo': 'Target',
  'repositorio.col.analista': 'Analyst',
  'repositorio.col.fecha': 'Date',
  'repositorio.col.documentos': 'Documents',
  'repositorio.col.acciones': 'Actions',
  'repositorio.paginacion.etiqueta': 'Results pagination',

  'repositorio.vacio.titulo': 'No results',
  'repositorio.vacio.detalle': 'No report matches the selected criteria.',
  'repositorio.destacadoEquipo': 'Selected by the committee',
  'repositorio.editar': 'Edit',
  'repositorio.fila.abrir': 'Open the report on {empresa}',
  'repositorio.fila.editar': 'Edit the report on {empresa}',

  'repositorio.resumen': {
    one: 'Showing {desde}–{hasta} of {n} report',
    other: 'Showing {desde}–{hasta} of {n} reports',
  },

  // ═══════════════════ Repository · reading view ═══════════════════
  'informe.detalle.cargando': 'Loading report…',
  'informe.detalle.noDisponible': 'Unavailable',
  'informe.detalle.destacado': 'Featured',
  'informe.detalle.fichaAnalitica': 'Research record',
  'informe.detalle.analista': 'Analyst',
  'informe.detalle.publicacion': 'Published',
  'informe.detalle.precioObjetivo': 'Target price',
  'informe.detalle.nivelAcceso': 'Access level',
  'informe.detalle.enCartera': 'In portfolio',
  'informe.detalle.pesoAsignado': 'Assigned weight',
  'informe.detalle.precioCompra': 'Purchase price',
  'informe.detalle.takeProfit': 'Take profit',
  'informe.detalle.stopLoss': 'Stop loss',
  'informe.detalle.resumen': 'Executive summary',
  'informe.detalle.etiquetas': 'Tags',
  'informe.detalle.documentacion': 'Documentation',
  'informe.detalle.sinDocumentacion': 'This report has no attached documentation yet.',
  'informe.detalle.editar': 'Edit report',

  // ═══════════════════ Repository · publish and edit ═══════════════════
  'informe.titulo.publicar': 'Publish report',
  'informe.titulo.editar': 'Edit report',
  'informe.entradilla': 'Complete the research record. Fields marked with an asterisk are required.',

  'informe.grupo.emisor': 'Issuer identification',
  'informe.campo.empresa': 'Registered name *',
  'informe.campo.ticker': 'Ticker',
  'informe.campo.sector': 'Sector',
  'informe.campo.pais': 'Country',

  'informe.grupo.clasificacion': 'Report classification',
  'informe.campo.tipo': 'Report type',
  'informe.campo.periodo': 'Period',
  'informe.campo.periodo.hint': 'FY 2026 / Q1 2026',
  'informe.campo.analista': 'Analyst',
  'informe.campo.fecha': 'Publication date *',

  'informe.grupo.valoracion': 'Valuation',
  'informe.campo.recomendacion': 'Recommendation',
  'informe.campo.precioObjetivo': 'Target price',
  'informe.campo.divisa': 'Currency',
  'informe.campo.peso': 'Portfolio weight (%)',
  'informe.campo.peso.hint': 'Equal-weighted if left blank',

  'informe.grupo.operativa': 'Position management',
  'informe.campo.precioCompra': 'Purchase price',
  'informe.campo.precioCompra.hint': 'Price paid per share',
  'informe.campo.takeProfit': 'Take profit',
  'informe.campo.takeProfit.hint': 'Exit level',
  'informe.campo.stopLoss': 'Stop loss',
  'informe.campo.stopLoss.hint': 'Optional',
  'informe.operativa.nota': 'The purchase price sets the real cost of the position and supersedes the close of the publication session. On reaching the take profit, the position is closed automatically at that level, drops out of the portfolio, and its proceeds are held as cash until a new thesis reinvests them.',

  'informe.grupo.contenido': 'Content and distribution',
  'informe.campo.resumen': 'Executive summary',
  'informe.campo.resumen.hint': 'Summary of the thesis, its catalysts and the main risk factors.',
  'informe.campo.etiquetas': 'Free tags',
  'informe.campo.etiquetas.hint': 'Comma-separated: cloud, margins, catalyst',
  'informe.campo.nivel': 'Access level',
  'informe.campo.destacar': 'Feature on the cover',
  'informe.campo.incorporar': 'Add to the portfolio',

  'informe.grupo.documentacion': 'Documentation',
  'informe.campo.ficheros': 'Attach reports (PDF, Word or Excel · 25 MB per document maximum)',

  'informe.select.sinClasificar': 'Unclassified',
  'informe.select.sinRecomendacion': 'No recommendation',

  'informe.eliminar': 'Delete report',
  'informe.cancelar': 'Cancel',
  'informe.guardar.publicar': 'Publish',
  'informe.guardar.cambios': 'Save changes',
  'informe.guardar.procesando': 'Saving…',

  'informe.adjunto.retirar': 'Remove',
  'informe.adjunto.confirmar': 'Remove the document “{nombre}”?',
  'informe.adjunto.retirado': 'Document removed.',
  'informe.guardado.actualizado': 'Report updated.',
  'informe.guardado.publicado': 'Report published.',
  'informe.eliminar.confirmar': 'Permanently delete this report and its attached documentation?',
  'informe.eliminado': 'Report deleted.',

  // ═════════════════════════ Portfolio · header ═════════════════════════
  'cartera.etiqueta': 'Portfolio management',
  'cartera.titulo': 'Position performance',
  'cartera.nota': 'The portfolio is constituted automatically from the published investment theses. Each position is dated at the publication date of its report, and entered at that session’s close. The index is computed as a time-weighted return, base 100, with no external contributions or withdrawals.',

  'cartera.error.mercado': 'Market data unavailable',
  'cartera.vacia.titulo': 'Portfolio not constituted',
  'cartera.estado.actualizado': 'Updated at {hora}',
  'cartera.pie.fuente': 'Market data: {fuentes}. Last updated: {momento}.',

  // ═══════════════════════ Portfolio · dashboard ═══════════════════════
  'cartera.indicador.rentabilidad': 'Cumulative return',
  'cartera.indicador.rentabilidad.nota': 'On invested capital · since {fecha}',
  'cartera.indicador.valorIndexado': 'Indexed value',
  'cartera.indicador.valorIndexado.nota': 'Base {base} = invested capital',
  'cartera.indicador.dia': 'Daily change',
  'cartera.indicador.dia.nota': 'Weighted by position size',
  'cartera.indicador.posiciones': 'Positions',
  'cartera.indicador.posiciones.nota': 'Theses held',
  'cartera.indicador.posiciones.liquidadas': {
    one: '{n} closed',
    other: '{n} closed',
  },
  'cartera.indicador.sharpe': 'Sharpe ratio',
  'cartera.indicador.sharpe.nota': 'Risk-free rate {tasa}',
  'cartera.indicador.maximaCaida': 'Maximum drawdown',
  'cartera.indicador.maximaCaida.nota': 'From previous peak',

  // ══════════════════════════ Portfolio · chart ══════════════════════════
  'cartera.grafico.titulo': 'Portfolio performance',
  'cartera.grafico.subtitulo': 'Indexed value · base 100 = invested capital',
  'cartera.grafico.subtitulo.serie': {
    one: 'Indexed value · base 100 at {fecha} · {n} session',
    other: 'Indexed value · base 100 at {fecha} · {n} sessions',
  },
  'cartera.grafico.opciones': 'Chart options',
  'cartera.grafico.periodo': 'Period',
  'cartera.grafico.rango.max': 'Max',
  'cartera.grafico.indice': 'Benchmark index',
  'cartera.grafico.verDatos': 'View data',
  'cartera.grafico.ocultarDatos': 'Hide data',
  'cartera.leyenda.cartera': 'Warrants & Co. portfolio',

  'cartera.serie.caption': 'Historical series of the portfolio and its benchmark',
  'cartera.serie.fecha': 'Date',
  'cartera.serie.cartera': 'Portfolio',
  'cartera.serie.indice': 'Index',
  'cartera.serie.diferencial': 'Spread',

  // ════════════════════════ Portfolio · holdings ════════════════════════
  'cartera.posiciones.titulo': 'Portfolio composition',
  'cartera.posiciones.subtitulo': 'Quotes refreshed on every page load',
  'cartera.posiciones.caption': 'Breakdown of portfolio positions',
  'cartera.col.valor': 'Holding',
  'cartera.col.peso': 'Weight',
  'cartera.col.alta': 'Opened',
  'cartera.col.compra': 'Entry',
  'cartera.col.cotizacion': 'Last',
  'cartera.col.dia': 'Day',
  'cartera.col.rentabilidad': 'Return',
  'cartera.col.takeProfit': 'Take profit',
  'cartera.col.recorrido': 'Path to TP',
  'cartera.col.precioObjetivo': 'Target',
  'cartera.col.recomendacion': 'Recommendation',
  'cartera.recorrido.title': '{avance} of the path to take profit',

  // ════════════════════════ Portfolio · closed ════════════════════════
  'cartera.cerradas.titulo': 'Closed positions',
  'cartera.cerradas.subtitulo': 'Theses closed automatically on reaching their take profit',
  'cartera.cerradas.caption': 'Breakdown of closed positions',
  'cartera.cerradas.col.cierre': 'Closed',
  'cartera.cerradas.col.precioSalida': 'Exit price',
  'cartera.cerradas.col.resultado': 'Result',
  'cartera.cerradas.col.motivo': 'Reason',
  'cartera.cerradas.motivo': 'Closed',

  // ═══════════════════════ Portfolio · statistics ═══════════════════════
  'cartera.estadisticos.titulo': 'Parameters and statistics',
  'cartera.estadisticos.subtitulo': 'Risk and return metrics',
  'cartera.estadisticos.vacio.titulo': 'Statistics unavailable',
  'cartera.estadisticos.vacio.detalle': 'A longer history is required to compute the risk metrics.',
  'cartera.estadisticos.periodo': {
    one: 'Period {inicio} – {fin} · {n} session · benchmark {indice}',
    other: 'Period {inicio} – {fin} · {n} sessions · benchmark {indice}',
  },

  'cartera.metrica.rentabilidadTotal': 'Total return',
  'cartera.metrica.rentabilidadTotal.nota': 'Full period',
  'cartera.metrica.rentabilidadAnualizada': 'Annualised return',
  'cartera.metrica.rentabilidadAnualizada.nota': 'Compound rate',
  'cartera.metrica.rentabilidadIndice': '{indice} return',
  'cartera.metrica.rentabilidadIndice.nota': 'Same period',
  'cartera.metrica.volatilidad': 'Volatility',
  'cartera.metrica.volatilidad.nota': 'Annualised',
  'cartera.metrica.sharpe': 'Sharpe ratio',
  'cartera.metrica.sharpe.nota': 'Excess over {tasa}',
  'cartera.metrica.sortino': 'Sortino ratio',
  'cartera.metrica.sortino.nota': 'Downside risk only',
  'cartera.metrica.calmar': 'Calmar ratio',
  'cartera.metrica.calmar.nota': 'Return / maximum drawdown',
  'cartera.metrica.maximaCaida': 'Maximum drawdown',
  'cartera.metrica.maximaCaida.nota': '{desde} – {hasta}',
  'cartera.metrica.beta': 'Beta',
  'cartera.metrica.beta.nota': 'Against {indice}',
  'cartera.metrica.alfa': 'Jensen’s alpha',
  'cartera.metrica.alfa.nota': 'Annualised',
  'cartera.metrica.correlacion': 'Correlation',
  'cartera.metrica.correlacion.nota': 'With {indice}',
  'cartera.metrica.sesionesPositivas': 'Positive sessions',
  'cartera.metrica.sesionesPositivas.nota': 'Of the total',
  'cartera.metrica.mejorSesion': 'Best session',
  'cartera.metrica.peorSesion': 'Worst session',
  'cartera.metrica.sesion.nota': 'Daily change',

  // ══════════════════ Portfolio · SVG chart (grafico.js) ══════════════════
  'grafico.indice': 'Index',
  'grafico.vacio.titulo': 'Series unavailable',
  'grafico.vacio.detalle': 'There is not enough history to plot the evolution of the portfolio.',
  'grafico.etiqueta': 'Portfolio performance chart. Use the arrow keys to move through the sessions.',
  'grafico.descripcion': {
    one: 'A series of {n} session between {desde} and {hasta}. The portfolio moves from {inicial} to {final} on base 100, a change of {variacion}. Compared against {indice}. The full numeric detail is available in the data table.',
    other: 'A series of {n} sessions between {desde} and {hasta}. The portfolio moves from {inicial} to {final} on base 100, a change of {variacion}. Compared against {indice}. The full numeric detail is available in the data table.',
  },
  'grafico.emergente.cartera': 'Portfolio',
  'grafico.emergente.acumulado': 'Cumulative',

  'general.si': 'Yes',
  'general.no': 'No',

  'informe.acceso.publico': 'Public',
  'informe.acceso.cliente': 'Client',
  'informe.acceso.institucional': 'Institutional',
  'informe.acceso.interno': 'Internal',
  // ═══════════════════════════════ Network ════════════════════════════════
  'error.red': 'The server could not be reached. Check that the application is still running.',
  'error.solicitud': 'The request failed (status {codigo}).',

  // ═══════════════════════════ Analyst access ═════════════════════════════
  'acceso.credencialInvalida': 'Invalid credentials.',
  'acceso.iniciada': 'Signed in as a Warrants & Co. analyst.',
  'acceso.cerrada': 'Signed out.',

  // ══════════════════ Coverage, calendar and market map ═══════════════════
  'companias.ficha.cargando': 'Loading…',
  'companias.ficha.noEncontrada': 'Company not found',
  'companias.error': 'The coverage list could not be loaded: {detalle}',
  'catalizadores.cargando': 'Loading the calendar…',
  'catalizadores.error': 'The calendar could not be loaded: {detalle}',
  'mercado.cargando': 'Loading the market map…',
  'mercado.error': 'The market map could not be loaded: {detalle}',

  // ════════════════════════════════ News ══════════════════════════════════
  'noticias.antetitulo': 'Latest',
  'noticias.titulo': 'Market news',
  'noticias.sincronizar': 'Refresh now',
  'noticias.publicar': 'Publish story',
  'noticias.busqueda': 'Search the news',
  'noticias.busqueda.hint': 'Headline, company, ticker or keyword…',
  'noticias.buscar': 'Search',
  'noticias.limpiar': 'Clear',
  'noticias.paginacion.etiqueta': 'News pagination',

  'noticias.filtro.categoria': 'Category',
  'noticias.filtro.relevancia': 'Priority',
  'noticias.filtro.valor': 'Ticker',
  'noticias.filtro.origen': 'Source',
  'noticias.filtro.desde': 'From',
  'noticias.filtro.hasta': 'To',
  // English draws no gender distinction: both keys resolve to the same word.
  'noticias.filtro.todas': 'All',
  'noticias.filtro.todos': 'All',

  'noticias.origen.propio': 'In-house',
  'noticias.relevancia.urgente': 'Breaking',
  'noticias.relevancia.alta': 'High',
  'noticias.relevancia.normal': 'Standard',

  'noticias.categoria.mercados': 'Markets',
  'noticias.categoria.compania': 'Company',
  'noticias.categoria.macroeconomia': 'Macro',
  'noticias.categoria.sector': 'Sector',
  'noticias.categoria.resultados': 'Earnings',
  'noticias.categoria.corporativa': 'Corporate action',
  'noticias.categoria.regulacion': 'Regulation',
  'noticias.destacada': 'Front page',

  'noticias.vacio.titulo': 'No stories',
  'noticias.vacio.filtrado': 'No story matches the selected criteria.',
  'noticias.vacio.inicial': 'No story has been published yet. Use «Publish story» to register the first one.',
  'noticias.sinResultados': 'No results',
  'noticias.resumen': {
    one: 'Showing {desde}–{hasta} of {n} story',
    other: 'Showing {desde}–{hasta} of {n} stories',
  },

  // ── News · reading view ──
  'noticias.detalle.cargando': 'Loading the story…',
  'noticias.detalle.noDisponible': 'Unavailable',
  'noticias.detalle.sindicada': 'Syndicated item: the platform carries the headline and points to the original article at the source.',
  'noticias.detalle.valores': 'Related tickers',
  'noticias.detalle.etiquetas': 'Tags',
  'noticias.detalle.fuenteOriginal': 'Read the original source',
  'noticias.detalle.editar': 'Edit story',

  // ── News · create and edit ──
  'noticia.titulo.publicar': 'Publish story',
  'noticia.titulo.editar': 'Edit story',
  'noticia.entradilla': 'Write the story. Only the headline is required.',
  'noticia.grupo.contenido': 'Content',
  'noticia.campo.titular': 'Headline *',
  'noticia.campo.entradilla': 'Standfirst',
  'noticia.campo.entradilla.hint': 'A summary in one or two sentences.',
  'noticia.campo.cuerpo': 'Body',
  'noticia.campo.cuerpo.hint': 'The story in full and what it means for the portfolio.',
  'noticia.grupo.clasificacion': 'Classification',
  'noticia.campo.categoria': 'Category',
  'noticia.campo.relevancia': 'Priority',
  'noticia.campo.fecha': 'Publication date *',
  'noticia.campo.valores': 'Related tickers',
  'noticia.campo.valores.hint': 'Comma-separated: ORCL, QCOM',
  'noticia.campo.etiquetas': 'Free tags',
  'noticia.campo.etiquetas.hint': 'Comma-separated: earnings, guidance',
  'noticia.campo.autor': 'Author',
  'noticia.campo.fuente': 'Source',
  'noticia.campo.fuente.hint': 'Originating outlet or service',
  'noticia.campo.url': 'Link to the source',
  'noticia.campo.destacar': 'Feature on the front page',
  'noticia.eliminar': 'Delete story',
  'noticia.cancelar': 'Cancel',
  'noticia.guardar.publicar': 'Publish',
  'noticia.guardar.cambios': 'Save changes',
  'noticia.guardar.procesando': 'Working…',
  'noticia.guardado.publicada': 'Story published.',
  'noticia.guardado.actualizada': 'Story updated.',
  'noticia.eliminar.confirmar': 'Delete this story permanently?',
  'noticia.eliminada': 'Story deleted.',

  // ── News · Investing.com syndication ──
  'noticias.sindicacion.actualizado': 'Updated {hora}',
  'noticias.sindicacion.sindicadas': '{n} from Investing.com',
  'noticias.sindicacion.propias': '{n} in-house',
  'noticias.sindicacion.cada': 'every {min} min',
  'noticias.sindicacion.manual': 'automatic refresh off',
  'noticias.sindicacion.noDisponible': 'Syndication status unavailable',
  'noticias.sindicacion.actualizando': 'Refreshing…',
  'noticias.sindicacion.incorporadas': {
    one: '{n} story taken in',
    other: '{n} stories taken in',
  },
  'noticias.sindicacion.sinNovedades': 'Nothing new since the last check',
  'noticias.sindicacion.aviso': '{detalle}.',
  'noticias.sindicacion.avisoVinculadas': {
    one: '{detalle} · {n} on a holding.',
    other: '{detalle} · {n} on portfolio holdings.',
  },
  'noticias.sindicacion.canal': 'Feed unavailable — {detalle}',

  // ═════════════════════ Options · labels set by app.js ════════════════════
  'opciones.estado.proveedor': {
    one: '{proveedor} provider · {n} session on file',
    other: '{proveedor} provider · {n} sessions on file',
  },
  'opciones.filtro.todos': 'All',
  'opciones.inusual.consultando': 'Querying the option chains…',
  'opciones.inusual.error.marca': 'Error',
  'opciones.inusual.error.titulo': 'The options could not be queried',
  'opciones.inusual.resumen': {
    one: '{n} of {total} contract screened',
    other: '{n} of {total} contracts screened',
  },
  'opciones.cadena.consultando': 'Querying…',
  'opciones.cadena.resumen': '{contratos} contracts · underlying {precio} · {vencimientos} expirations',
  'opciones.cadena.sinDatos.marca': 'No data',
  'opciones.cadena.sinDatos.titulo': 'No chain available for {simbolo}',

  // ═════════════════════════ Radar · W&C Radar ═════════════════════════════
  'radar.etiqueta': 'Market intelligence',
  'radar.subtitulo': 'The signals worth watching today.',
  'radar.pendiente.marca': 'Coming soon',
  'radar.senales.operativas': {
    one: '{operativas} of {n} signal live',
    other: '{operativas} of {n} signals live',
  },

  // ── Radar · W&C Signal ──
  'radar.signal.subtitulo': 'Proprietary indicator · 0 – 100 scale',
  'radar.signal.agregado': 'Aggregate Signal',
  'radar.signal.escala': '0 – 100 scale',
  'radar.signal.enConstruccion': 'Model under construction',
  'radar.signal.lecturaDe': '{ticker} reading',
  'radar.signal.lecturaDisponible': 'Reading available',
  'radar.signal.pendiente': 'Pending',

  // ── Radar · portfolio ──
  'radar.cartera.titulo': 'Portfolio',
  'radar.cartera.subtitulo': 'Portfolio performance against its benchmark',
  'radar.cartera.enlace': 'View the full portfolio',
  'radar.cartera.vacio.titulo': 'No portfolio data',
  'radar.cartera.vacio.motivo': 'The portfolio is built from published theses with an assigned ticker.',

  'radar.metrica.rentabilidad': 'Portfolio return',
  'radar.metrica.rentabilidad.nota': 'On invested capital',
  'radar.metrica.benchmark': 'Benchmark ({indice})',
  'radar.metrica.benchmark.nota': 'Same period',
  'radar.metrica.alfa': 'Alpha',
  'radar.metrica.alfa.nota': 'Jensen · annualised',
  'radar.metrica.sharpe': 'Sharpe',
  'radar.metrica.sharpe.nota': 'Risk-free {tasa}',
  'radar.metrica.caida': 'Max drawdown',
  'radar.metrica.caida.nota': 'From prior peak',
  'radar.metrica.volatilidad': 'Volatility',
  'radar.metrica.volatilidad.nota': 'Annualised',

  'radar.aportaciones.suman': 'Top contributors',
  'radar.aportaciones.restan': 'Top detractors',
  'radar.aportaciones.sinGrupo': 'No positions in this group.',
  'radar.aportaciones.vacio.titulo': 'No contributions',
  'radar.aportaciones.vacio.motivo': 'No position has a computed return yet.',

  // ── Radar · top research ──
  'radar.research.titulo': 'Top research',
  'radar.research.subtitulo': 'Theses highlighted by the research committee',
  'radar.research.enlace': 'View the catalogue',
  'radar.research.vacio.titulo': 'No theses published',
  'radar.research.vacio.motivo': 'Publish a report from the analyst area to see it here.',
  'radar.research.signal': 'W&C Signal: {valor}',

  // ── Radar · catalysts ──
  'radar.catalizadores.titulo': 'Upcoming catalysts',
  'radar.catalizadores.subtitulo': 'Calendar of events bearing on the portfolio',
  'radar.catalizadores.vacio.titulo': 'Calendar not connected',
  'radar.catalizadores.sinCalendario': 'No event calendar',
  'radar.catalizadores.vacio.motivo': '{motivo}. The interface is ready to take in events of type {tipos}.',
  'radar.catalizadores.nota': '{motivo}: {tipos}.',

  // ── Radar · latest news ──
  'radar.noticias.titulo': 'Latest news',
  'radar.noticias.subtitulo': 'Market news',
  'radar.noticias.enlace': 'View all',
  'radar.noticias.vacio.titulo': 'No stories',
  'radar.noticias.vacio.motivo': 'The repository is fed automatically from Investing.com every fifteen minutes.',

  // ══════════════════════ Data quality seals ══════════════════════════════
  'sello.tiempoReal': 'Real time',
  'sello.retrasado': 'Delayed',
  'sello.historico': 'Historical',
  'sello.calculado': 'Calculated',
  'sello.inferido': 'Inferred',
  'sello.noDisponible': 'Unavailable',

  // ═══════════════════════════ Companies ══════════════════════════════════
  'companias.etiqueta': 'Research',
  'companias.titulo': 'Companies',
  'companias.busqueda': 'Search companies',
  'companias.busqueda.hint': 'Name, ticker, sector or theme…',
  'companias.filtro.sector': 'Sector',
  'companias.filtro.todosSectores': 'All sectors',
  'companias.limpiar': 'Clear',
  'companias.volver': '← All companies',

  // ── List ──
  'companias.estado.consulta': {
    one: '{n} company for «{consulta}»',
    other: '{n} companies for «{consulta}»',
  },
  'companias.estado.cobertura': {
    one: '{n} company under coverage',
    other: '{n} companies under coverage',
  },
  'companias.vacio.titulo': 'No results',
  'companias.vacio.filtrado': 'No covered company matches «{consulta}».',
  'companias.vacio.inicial': 'No report has been published yet: coverage is built from them.',
  'companias.tarjeta.abrir': 'Open the {empresa} profile',
  'companias.enCartera': 'Holding',
  'companias.tarjeta.ultimo': 'Latest: {fecha}',
  'companias.tarjeta.documentos': {
    one: '{n} document',
    other: '{n} documents',
  },

  // ── Data points, shared by the card and the profile ──
  'companias.dato.recomendacion': 'Recommendation',
  'companias.dato.objetivo': 'Target price',
  'companias.dato.informes': 'Reports',
  'companias.dato.recorrido': 'Upside to target',
  'companias.dato.peso': 'Portfolio weight',
  'companias.dato.compra': 'Entry price',
  'companias.dato.takeProfit': 'Take profit',
  'companias.dato.stopLoss': 'Stop loss',
  'companias.dato.distancia': 'Distance to take profit',

  // ── Profile ──
  'companias.cotizacion.sinDato': 'No quote available',
  'companias.cotizacion.selloNota': 'Consolidated with a delay; the platform carries no real-time feed.',
  'companias.tesis.titulo': 'Current thesis',
  'companias.tesis.sinResumen': 'Data unavailable — no report includes an executive summary.',
  'companias.niveles.titulo': 'Trading levels',
  'companias.informes.titulo': 'Published research ({n})',
  'companias.informes.tipoReserva': 'Report',
  'companias.informes.adjuntos': {
    one: '{n} doc.',
    other: '{n} docs.',
  },
  'companias.prensa.titulo': 'Press mentions',
  'companias.prensa.vacio': 'Data unavailable — no recent wire mentions the company.',
  'companias.verCatalizadores': 'View the company catalysts',

  // ═══════════════════ Event vocabulary (calendar) ═════════════════════════
  'evento.tipo.vencimiento': 'Options expiry',
  'evento.tipo.analisis': 'Research',
  'evento.tipo.prensa': 'Press',
  'evento.tipo.resultados': 'Earnings',
  'evento.tipo.previsiones': 'Guidance',
  'evento.tipo.diaInversor': 'Investor day',
  'evento.tipo.corporativa': 'M&A',
  'evento.tipo.producto': 'Product',
  'evento.tipo.regulacion': 'Regulatory',
  'evento.prioridad.alta': 'High',
  'evento.prioridad.media': 'Medium',
  'evento.prioridad.baja': 'Low',
  'evento.prioridad.desconocida': 'Undetermined',
  'evento.fecha.exacta': 'exact',
  'evento.vinculo.mencionLiteral': 'literal mention',

  // ════════════════════════════ Catalysts ══════════════════════════════════
  'catalizadores.etiqueta': 'Research',
  'catalizadores.titulo': 'Catalysts',
  'catalizadores.filtros.etiqueta': 'Calendar filters',
  'catalizadores.horizonte.proximos': 'Upcoming',
  'catalizadores.horizonte.pasados': 'Past',
  'catalizadores.filtro.compania': 'Company',
  'catalizadores.filtro.todasCompanias': 'All companies',
  'catalizadores.filtro.tipo': 'Event type',
  'catalizadores.filtro.todosTipos': 'All types',
  'catalizadores.carencias.titulo': 'No connected source',
  'catalizadores.carencias.subtitulo': 'Categories the calendar recognises but nothing feeds today',

  'catalizadores.resumen.proximos': { one: '{n} upcoming', other: '{n} upcoming' },
  'catalizadores.resumen.pasados': { one: '{n} past', other: '{n} past' },
  'catalizadores.resumen.alta': {
    one: '{n} high priority',
    other: '{n} high priority',
  },

  'catalizadores.vacio.pasados': 'No past events',
  'catalizadores.vacio.proximos': 'No upcoming events',
  'catalizadores.vacio.motivo': 'The calendar only carries events with a verifiable date from a connected source.',
  'catalizadores.enCartera': 'Holding',
  'catalizadores.parcial': 'Partial aggregate',
  'catalizadores.sinFecha.eventos': {
    one: '{n} undated event',
    other: '{n} undated events',
  },

  'catalizadores.pie.fuente': 'Source: {fuente}',
  'catalizadores.pie.fecha': 'Date {calidad}',
  'catalizadores.pie.vinculo': 'Link: {vinculo}',

  'catalizadores.dato.interesAbierto': 'Open interest',
  'catalizadores.dato.volumen': 'Volume',
  'catalizadores.dato.cuotaOI': 'OI share',
  'catalizadores.dato.contratos': 'Contracts',
  'catalizadores.dato.recomendacion': 'Recommendation',
  'catalizadores.dato.objetivo': 'Target price',
  'catalizadores.dato.analista': 'Analyst',

  // ════════════════════════════ Markets ════════════════════════════════════
  'mercado.etiqueta': 'Market',
  'mercado.titulo': 'Markets',
  'mercado.cobertura': {
    one: '{n} of {total} instrument resolved',
    other: '{n} of {total} instruments resolved',
  },
  'mercado.sinMotivo': 'Data unavailable',

  // ── Yield curve ──
  'mercado.curva.titulo': 'Curve slope',
  'mercado.curva.puntosBasicos': '{valor} bp',
  'mercado.curva.invertida': 'Inverted curve (10y < 2y)',
  'mercado.curva.positiva': 'Upward-sloping curve (10y > 2y)',
  'mercado.curva.selloNota': 'Difference between the 10-year and 2-year points.',
  'mercado.curva.plazoMeses': '{n}m',
  'mercado.curva.plazoAnios': '{n}y',

  // ── Quality legend ──
  'mercado.leyenda.titulo': 'Data quality',
  'mercado.leyenda.subtitulo': 'What each seal means on this page',
  'mercado.leyenda.ausentes': 'Not resolved on this load: {instrumentos}.',

  // ═══════════════════════════ Options (A) ═════════════════════════════════
  'opciones.etiqueta': 'Derivatives',
  'opciones.titulo': 'Options',
  'opciones.pestanas.etiqueta': 'Options sections',
  'opciones.pestana.flujo': 'Options flow',
  'opciones.pestana.inusual': 'Unusual activity',
  'opciones.pestana.cadena': 'Option chain',

  // ── Provider scope ──
  'opciones.alcance.servidos': 'Data served by {proveedor}',
  'opciones.alcance.noPublicado': 'Not published: {campos}.',
  'opciones.alcance.archivo': {
    one: 'Own archive: {n} session across {simbolos} tickers.',
    other: 'Own archive: {n} sessions across {simbolos} tickers.',
  },
  'opciones.alcance.archivoCorto': {
    one: 'Own archive: {n} session. {necesarias} are needed for the comparative score factors.',
    other: 'Own archive: {n} sessions. {necesarias} are needed for the comparative score factors.',
  },
  'opciones.campo.volatilidadImplicita': 'implied volatility',
  'opciones.campo.griegas': 'greeks (delta, gamma, theta, vega)',
  'opciones.campo.multiplicador': 'declared contract multiplier',
  'opciones.campo.operaciones': 'individual trades (time & sales)',
  'opciones.campo.contextoCotizacion': 'spread at the moment of each trade',
  'opciones.campo.historico': 'the provider\u2019s own history',

  // ── Table columns ──
  'opciones.col.ticker': 'Ticker',
  'opciones.col.tipo': 'Type',
  'opciones.col.strike': 'Strike',
  'opciones.col.vencimiento': 'Expiration',
  'opciones.col.premium': 'Premium',
  'opciones.col.volumen': 'Volume',
  'opciones.col.interesAbierto': 'Open int.',
  'opciones.col.volOI': 'Vol/OI',
  'opciones.col.iv': 'IV',
  'opciones.col.tradeType': 'Trade type',
  'opciones.col.signal': 'Signal',

  // ── Table ──
  'opciones.tabla.vacio.titulo': 'No results',
  'opciones.tabla.vacio.motivo': 'No contract matches the selected criteria.',
  'opciones.tabla.fila': 'Details for {simbolo} {lado} {strike}',
  'opciones.tabla.resumen': {
    one: 'Showing {desde}–{hasta} of {n} contract',
    other: 'Showing {desde}–{hasta} of {n} contracts',
  },

  // ── Top activity ──
  'opciones.destacadas.titulo': 'Top unusual activity',
  'opciones.destacadas.subtitulo': 'Highest-scoring contracts of the session',
  'opciones.destacadas.vacio.titulo': 'No scorable activity',
  'opciones.destacadas.vacio.motivo': 'No contract reaches the minimum methodology coverage with the available data.',
  'opciones.destacadas.motivo': 'Notable activity in the session',

  // ── «Why is this unusual?» ──
  'opciones.detalle.titulo': 'Why is this unusual?',
  'opciones.detalle.vence': 'expires {fecha}',
  'opciones.detalle.score': 'Unusual activity score',
  'opciones.detalle.escala': '0–100 scale · {cobertura} methodology coverage',
  'opciones.detalle.coberturaInsuficiente': 'Insufficient coverage',
  'opciones.dato.volumen': 'Volume',
  'opciones.dato.interesAbierto': 'Open interest',
  'opciones.dato.volOI': 'Vol/OI',
  'opciones.dato.premium': 'Premium',
  'opciones.dato.iv': 'IV',
  'opciones.dato.ivCambio': 'IV change',
  'opciones.dato.distanciaStrike': 'Strike distance',
  'opciones.dato.diasVencimiento': 'Days to expiration',
  'opciones.dato.noCalculable': 'Not computable',
  'opciones.dato.dias': '{n} d',
  'opciones.clasificacion.titulo': 'Trade classification',
  'opciones.clasificacion.sentido': 'Direction',
  'opciones.clasificacion.ejecucion': 'Execution',
  'opciones.clasificacion.posicion': 'Position status',
  'opciones.senales.titulo': 'Key signals',
  'opciones.senales.vacio': 'No factor reaches the threshold to raise a signal.',
  'opciones.factores.titulo': 'Score breakdown',
  'opciones.factores.peso': 'weight {peso}',

  // ── Contracts: header and filters ──
  'opciones.contratos.titulo': 'Contracts',
  'opciones.contratos.subtitulo': 'Click a row to see why it stands out',
  'opciones.filtro.premiumMin': 'Min. premium',
  'opciones.filtro.volumenMin': 'Min. volume',
  'opciones.filtro.ratioMin': 'Min. Vol/OI',
  'opciones.filtro.scoreMin': 'Min. signal',
  'opciones.filtro.ivRank': 'IV rank',
  'opciones.filtro.tradeType': 'Trade type',
  'opciones.filtro.direccion': 'Direction',
  'opciones.filtro.periodo': 'Time range',
  'opciones.filtro.noDisponible': 'Unavailable',
  'opciones.filtro.sesionActual': 'Current session',
  'opciones.filtro.soloInusual': 'Unusual only (Vol/OI ≥ 1)',
  'opciones.filtro.limpiar': 'Clear',
  'opciones.filtro.actualizar': 'Refresh',
  'opciones.filtro.requiereIV': 'Requires provider IV',
  'opciones.filtro.requiereIV.titulo': 'Requires implied volatility from the provider',
  'opciones.filtro.requiereTimeSales': 'Requires time & sales',
  'opciones.filtro.requiereTimeSales.titulo': 'Requires individual trades',
  'opciones.filtro.requiereSentido': 'Requires the trade direction',
  'opciones.filtro.soloSesion': 'Current session only',
  'opciones.filtro.requierePeriodo.titulo': 'Requires intraday history',

  // ── Order flow ──
  'opciones.flujo.titulo': 'Options flow needs another source',
  'opciones.flujo.motivo': 'No provider of individual trades.',
  'opciones.flujo.mientras': 'In the meantime «Unusual activity» does work: it scores the session aggregates with the factors that can be computed.',

  // ═══════════════════════ Options · chain (B) ═════════════════════════════
  'opciones.cadena.calls': 'Calls',
  'opciones.cadena.puts': 'Puts',
  'opciones.cadena.col.bid': 'Bid',
  'opciones.cadena.col.ask': 'Ask',
  'opciones.cadena.col.last': 'Last',
  'opciones.cadena.col.delta': 'Delta',
  'opciones.cadena.col.gamma': 'Gamma',
  'opciones.cadena.col.theta': 'Theta',
  'opciones.cadena.col.vega': 'Vega',
  'opciones.cadena.vacio.titulo': 'No contracts',
  'opciones.cadena.vacio.motivo': 'The selected expiration has no published contracts.',
  'opciones.cadena.buscar': 'Search',
  'opciones.cadena.subtitulo': 'Calls on the left, puts on the right',

  // ── Open interest map ──
  'opciones.mapa.titulo': 'Open interest by strike',
  'opciones.mapa.subtitulo': 'Concentration of open position in calls and puts',
  'opciones.mapa.callOI': 'Call OI',
  'opciones.mapa.putOI': 'Put OI',
  'opciones.mapa.sinDatos': 'No open interest published for this expiration.',
  'opciones.mapa.tituloCall': {
    one: '{n} open contract in calls',
    other: '{n} open contracts in calls',
  },
  'opciones.mapa.tituloPut': {
    one: '{n} open contract in puts',
    other: '{n} open contracts in puts',
  },

  // ── Options trade classification ──
  'operacion.compraCall': 'Buy call',
  'operacion.ventaCall': 'Sell call',
  'operacion.compraPut': 'Buy put',
  'operacion.ventaPut': 'Sell put',
  'operacion.sweep': 'Sweep',
  'operacion.block': 'Block',
  'operacion.simple': 'Single',
  'operacion.multipata': 'Multi-leg',
  'operacion.apertura': 'Opening',
  'operacion.cierre': 'Closing',
  'operacion.desconocido': 'Unknown',
};
