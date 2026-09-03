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
  'cabecera.sesion.analista': 'Analyst',
  'cabecera.sesion.gestionar': 'Manage session',
  'cabecera.tema.grupo': 'Interface theme',
  'cabecera.tema.claro': 'Light theme',
  'cabecera.tema.oscuro': 'Dark theme',

  // ── Document ──
  'documento.titulo': 'Warrants & Co. — Research & Investment',
  'documento.descripcion': 'Warrants & Co. research and investment platform. Investment thesis repository, company coverage and portfolio tracking.',

  // ── Header ──
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
  'nav.research.tesis': 'Research Repository',
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
  'pie.aviso': 'This is research, not investment advice. Theses reflect the judgment of whoever signs them. The portfolio is calculated automatically from what’s published, session by session, with no manual intervention on the outcome.',

  // ── Formatting pieces ──
  // They only join data, but they live here all the same: the order and the
  // separator are each language's decision, not the painting code's.
  'general.noDisponible': 'N/A',
  'general.sinDatos': 'Data unavailable',
  'general.importeDivisa': '{importe} {divisa}',

  'portada.accesos.etiqueta': 'Main entry points',
  // `portada.acceso.radar` is unused while the Market area is hidden.
  // Not deleted: it comes back with it.
  'portada.acceso.radar': 'Explore radar',
  'portada.acceso.cobertura': 'Explore coverage',
  'portada.acceso.research': 'View research',

  // portada.manifiesto.titular and portada.hero.subtitulo (Phase D.6) were
  // retired in Phase D.13: the hero's editorial copy is gone, the photo is
  // now the whole hero.

  // The four pillars from the reference mockup, replacing the previous three
  // (Research, Catalysts, Portfolio). They lose the link to their routes
  // —#/companias, #/catalizadores, #/cartera—: a decision, not an oversight.
  // The old pillar keys stay unused, same as Radar and Options: they come back
  // if the mockup changes again.
  'portada.pilar.investigacion.titulo': 'Rigorous research',
  'portada.pilar.investigacion.texto': 'Original fundamental analysis, no noise or shortcuts, on the companies and catalysts that actually move the thesis.',
  'portada.pilar.cobertura.titulo': 'Selective coverage',
  'portada.pilar.cobertura.texto': 'A narrow universe of companies, followed with the depth that quality demands over quantity.',
  'portada.pilar.riesgo.titulo': 'Risk management',
  'portada.pilar.riesgo.texto': 'Every position enters with its size, horizon and exit defined, not as a loose bet.',
  'portada.pilar.independencia.titulo': 'Independence',
  'portada.pilar.independencia.texto': 'No conflicts of interest and no investment bank behind it: the research answers only to the reader.',

  'portada.pilar.research.titulo': 'Research',
  'portada.pilar.research.texto': 'Deep fundamental analysis focused on companies, catalysts, valuation and investment thesis.',
  // The Radar and Options pillars are unused while their areas are hidden;
  // Catalysts and Portfolio take their place. Not deleted: they come back with them.
  'portada.pilar.radar.titulo': 'Radar',
  'portada.pilar.radar.texto': 'A systematic view of the market designed to surface the most relevant opportunities and signals.',
  'portada.pilar.options.titulo': 'Options',
  'portada.pilar.options.texto': 'Options activity, unusual positioning and market-derived signals.',
  'portada.pilar.catalizadores.titulo': 'Catalysts',
  'portada.pilar.catalizadores.texto': 'The calendar of what can move each thesis: earnings, expirations and dates that bear on coverage.',
  'portada.pilar.cartera.titulo': 'Portfolio',
  'portada.pilar.cartera.texto': 'What the published theses have done: open and closed positions, and a track record computed from their price and date.',
  'portada.pilar.explorar': 'Explore',

  // ── Home · figures row ──
  // What the portfolio has DONE. No figure held back by a sample floor has a
  // label here, deliberately: no label, no cell to fill.
  'portada.cifras.anio': '{anio} return',
  'portada.cifras.anio.desdeCapital': 'From capital · {fecha}',
  'portada.cifras.anio.desdeCierre': 'From the {fecha} close',
  'portada.cifras.total': 'Total return',
  'portada.cifras.total.nota': 'From capital invested',
  'portada.cifras.indice.nota': 'Same period',

  // ── Hero · performance metrics (Phase D.12) ──
  // The index label carries its real name ({indice}, from `rotuloIndice()`)
  // and the dynamic year — never "S&P 500" written by hand or a fixed year.
  'portada.hero.metrica.indiceAnio': '{indice} · {anio}',
  'portada.hero.metrica.vacio': 'Not enough portfolio data yet',
  'portada.cifras.caida': 'Maximum drawdown',
  'portada.cifras.caida.nota': 'From previous peak',
  'portada.cifras.pie': 'Warrants & Co. portfolio · {desde} — {hasta} · {sesiones} · {tesis}, {vivas}.',
  'portada.cifras.pie.sesiones': { one: '{n} session', other: '{n} sessions' },
  'portada.cifras.pie.tesis': { one: '{n} thesis', other: '{n} theses' },
  'portada.cifras.pie.vivas': { one: '{n} open', other: '{n} open' },
  'portada.cifras.pie.enlace': 'See the portfolio line by line',
  // Composes the index label for the hero row, which has no line for the note.
  // The separator is each language's decision, not the code's.
  // Rótulo del índice de referencia: su nombre y el ETF con el que se mide.
  // Uno solo para las dos filas de cifras, el selector y la leyenda del
  // gráfico: son el mismo hecho y se escriben una vez.
  'cartera.benchmark.rotulo': '{nombre} · {simbolo}',
  'portada.cifras.hero.compuesto': '{rotulo} · {nota}',
  'portada.cifras.vacio.titulo': 'Portfolio not yet constituted',
  'portada.cifras.vacio.motivo': 'The portfolio is built from published theses with an assigned ticker. Without them there is no return to publish.',

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
    one: 'Take profit reached · {destacado}. {posiciones} — the proceeds are held as cash and are not reinvested.',
    other: 'Take profit reached · {destacado}. {posiciones} — the proceeds are held as cash and are not reinvested.',
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
  'repositorio.hub.subtitulo': 'Fundamental coverage published by the research team, with its full record and source documentation.',
  'repositorio.publicar': 'Publish report',

  // Hub metrics header: all four come from GET /api/informes/destacados
  // (`metricas`), already computed server-side.
  'repositorio.hub.total': 'Reports',
  'repositorio.hub.cubiertas': 'Companies covered',
  'repositorio.hub.analistas': 'Analysts',
  'repositorio.hub.sectores': 'Sectors',

  // Featured research: a single piece, same pattern as Companies.
  'repositorio.hub.destacado': 'Featured research',
  'repositorio.destacado.ver': 'View report →',
  'repositorio.destacado.abrir': 'Open report for {empresa}',
  'repositorio.destacado.sinResumen': 'This report does not have an executive summary yet.',

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

  // ── Report closed vocabulary: type, recommendation, sector ──
  'informe.tipo.tesisInversion': 'Investment thesis',
  'informe.tipo.inicioCobertura': 'Initiation of coverage',
  'informe.tipo.actualizacionResultados': 'Earnings update',
  'informe.tipo.notaSectorial': 'Sector note',
  'informe.tipo.notaMacro': 'Macro note',
  'informe.tipo.revisionValoracion': 'Valuation review',
  'informe.tipo.analisisTecnico': 'Technical analysis',
  'informe.tipo.dueDiligence': 'Due diligence',

  'informe.recomendacion.comprar': 'Buy',
  'informe.recomendacion.sobreponderar': 'Overweight',
  'informe.recomendacion.mantener': 'Hold',
  'informe.recomendacion.infraponderar': 'Underweight',
  'informe.recomendacion.vender': 'Sell',
  'informe.recomendacion.enRevision': 'Under review',

  'informe.sector.tecnologia': 'Information technology',
  'informe.sector.salud': 'Health care',
  'informe.sector.financiero': 'Financials',
  'informe.sector.consumoDiscrecional': 'Consumer discretionary',
  'informe.sector.consumoBasico': 'Consumer staples',
  'informe.sector.energia': 'Energy',
  'informe.sector.industriales': 'Industrials',
  'informe.sector.materiales': 'Materials',
  'informe.sector.comunicacion': 'Communication services',
  'informe.sector.utilities': 'Utilities',
  'informe.sector.inmobiliario': 'Real estate',

  'informe.grupo.operativa': 'Position management',
  'informe.campo.precioCompra': 'Purchase price',
  'informe.campo.precioCompra.hint': 'Price paid per share',
  'informe.campo.takeProfit': 'Take profit',
  'informe.campo.takeProfit.hint': 'Exit level',
  'informe.campo.stopLoss': 'Stop loss',
  'informe.campo.stopLoss.hint': 'Optional',
  'informe.operativa.nota': 'The purchase price sets the real cost of the position and supersedes the close of the publication session. On reaching the take profit, the position is closed automatically at that level, drops out of the portfolio, and its proceeds are held as cash, not reinvested: a new thesis buys with its own tranche of capital.',

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
  'informe.guardado.reetiquetadas': {
    one: '{n} existing news item relabelled under this company.',
    other: '{n} existing news items relabelled under this company.',
  },
  'informe.eliminar.confirmar': 'Permanently delete this report and its attached documentation?',
  'informe.eliminado': 'Report deleted.',
  'informe.eliminado.desvinculadas': {
    one: '{n} news item unlinked from this company: no thesis with this ticker remains.',
    other: '{n} news items unlinked from this company: no thesis with this ticker remains.',
  },

  // ═════════════ Report card proposed from an attached PDF ════════════════
  // Extracting is proposing: nothing taken from the document counts as valid
  // until the analyst accepts it. Row labels quoted from the PDF are not
  // translated — they are the document's own text.
  'extraccion.leyendo': 'Reading “{nombre}”…',
  'extraccion.titulo': 'Proposal read from “{nombre}”',
  'extraccion.paginas': { one: '{n} page', other: '{n} pages' },
  'extraccion.resumen.propuestos': { one: '1 field proposed, unconfirmed.', other: '{n} fields proposed, unconfirmed.' },
  'extraccion.resumen.avisos': { one: '1 field with a notice: the document says something that is not a usable value.', other: '{n} fields with a notice: the document says something that is not a usable value.' },
  'extraccion.resumen.decision': 'Deliberately not proposed: {campos}.',
  'extraccion.resumen.nada': 'No field could be proposed from this document.',
  'extraccion.aceptarTodas': 'Accept all',
  'extraccion.descartarTodas': 'Discard all',
  'extraccion.aceptar': 'Accept',
  'extraccion.descartar': 'Discard',
  'extraccion.marca.pendiente': 'Unconfirmed',
  'extraccion.marca.aceptada': 'Accepted',
  'extraccion.marca.descartada': 'Discarded',
  'extraccion.marca.defecto': 'Default value, not read from the PDF',
  'extraccion.origen': 'page {pagina} · “{rotulo}”',
  'extraccion.origen.pagina': 'page {pagina}',
  'extraccion.aviso.literal': 'The PDF says “{literal}” ({origen})',
  'extraccion.aviso.motivo': '{motivo} ({origen})',
  'extraccion.aviso.conservado': 'The PDF proposes “{valor}” ({origen}); what you typed is kept',
  'extraccion.pendientes': { one: '1 proposal still unreviewed: {campos}. Accept it, or clear the field if you do not want it.', other: '{n} proposals still unreviewed: {campos}. Accept them, or clear the fields you do not want.' },
  'extraccion.boton.pendientes': { one: 'Review 1 proposal', other: 'Review {n} proposals' },
  'extraccion.error': 'The document could not be read: {motivo}',

  // Why a field did not arrive proposed. The catalogue lives in
  // `src/extraccion/motivos.js`; a test demands a label in both languages.
  'extraccion.motivo.NO_ES_PDF': 'the file is not a PDF',
  'extraccion.motivo.PDF_CIFRADO': 'the PDF is encrypted and its text cannot be read',
  'extraccion.motivo.PDF_DEMASIADO_GRANDE': 'the PDF exceeds the maximum size allowed',
  'extraccion.motivo.PDF_SIN_PAGINAS': 'the pages of the PDF could not be determined',
  'extraccion.motivo.PDF_SIN_CAPA_DE_TEXTO': 'the PDF carries no text layer: it is a scanned document',
  'extraccion.motivo.DOCUMENTO_AUSENTE': 'no document was received',
  'extraccion.motivo.FORMATO_NO_ANALIZABLE': 'only PDF documents can be read',
  'extraccion.motivo.ESQUELETO_NO_RECONOCIDO': 'the document does not follow the house report structure',
  'extraccion.motivo.ANCLA_FICHA_AUSENTE': 'the company report card was not found',
  'extraccion.motivo.ANCLA_PLAN_AUSENTE': 'the investment plan was not found',
  'extraccion.motivo.ETIQUETA_AUSENTE': 'the document does not carry that label',
  'extraccion.motivo.FILA_PARTIDA': 'the label stands alone, without its value',
  'extraccion.motivo.SIN_CIFRA': 'what follows the label is not a figure',
  'extraccion.motivo.RANGO': 'the document gives a range, not a single figure',
  'extraccion.motivo.SIN_PORCENTAJE': 'what follows the label is not a single percentage',
  'extraccion.motivo.FECHA_NO_INTERPRETABLE': 'the date is not in a recognisable format',
  'extraccion.motivo.FECHA_FUTURA': 'the report date is later than today',
  'extraccion.motivo.TICKER_SIN_PATRON': 'the ticker label carries no symbol marked with “$”',
  'extraccion.motivo.TICKER_DISCREPANTE': 'the document names more than one ticker',
  'extraccion.motivo.SECTOR_SIN_EQUIVALENCIA': 'sector with no declared equivalence',
  'extraccion.motivo.PAIS_SIN_EQUIVALENCIA': 'country with no declared equivalence',
  'extraccion.motivo.DIVISA_NO_SOPORTADA': 'currency not supported',
  'extraccion.motivo.INCOHERENTE_CON_COMPRA': 'the level read is inconsistent with the purchase price',
  'extraccion.motivo.SIN_ETIQUETA_INEQUIVOCA': 'it appears only in conditional prose, and this field moves the portfolio',
  'extraccion.motivo.RECOMENDACION_NO_SE_INFIERE': 'the document states the trade type, not a recommendation',
  'extraccion.motivo.TIPO_INFORME_NO_FIGURA': 'the document does not state what kind of report it is',
  'extraccion.motivo.SECCION_LOCALIZADA': 'the section is in the document; the synthesis is yours to write',
  'extraccion.motivo.FUERA_DE_EXTRACCION': 'this field is not extracted from the document',

  // ═════════════════════════ Portfolio · header ═════════════════════════
  'cartera.etiqueta': 'Portfolio management',
  'cartera.titulo': 'Position performance',
  'cartera.nota': 'The portfolio is constituted automatically from the published investment theses. Each position is dated at the publication date of its report, and entered at the purchase price stated in the thesis or, failing that, at that session’s close. The index, base 100, splits the capital into fixed tranches: each thesis buys its own at inception and holds it until it is liquidated, with no rebalancing. Proceeds from a liquidated position stay in cash and fund no other position. No external contributions or withdrawals.',

  'cartera.error.mercado': 'Market data unavailable',
  'cartera.vacia.titulo': 'Portfolio not constituted',
  'cartera.estado.actualizado': 'Updated at {hora}',
  'cartera.pie.fuente': 'Market data: {fuentes}. Last updated: {momento}.',

  // ═════════════════════ Portfolio · capital summary ═════════════════════
  'cartera.resumen.titulo': 'Capital summary',
  'cartera.resumen.subtitulo': 'How much capital is committed and where the return comes from',
  'cartera.resumen.vacio.titulo': 'No summary to publish',
  'cartera.resumen.vacio.motivo': 'The portfolio has no positions constituted yet.',
  'cartera.resumen.retorno': 'Portfolio return',
  'cartera.resumen.retorno.nota': 'On invested capital',
  'cartera.resumen.realizado': 'Realized return',
  'cartera.resumen.realizado.nota': 'Sum of the contribution of closed positions',
  'cartera.resumen.realizado.vacio': 'No closed position yet',
  'cartera.resumen.noRealizado': 'Unrealized return',
  'cartera.resumen.noRealizado.nota': 'Sum of the contribution of open positions',
  'cartera.resumen.noRealizado.vacio': 'No open position yet',
  'cartera.resumen.capital': 'Capital deployed',
  'cartera.resumen.capital.nota': 'Fraction of capital committed to positions',
  'cartera.resumen.roic': 'ROIC',
  'cartera.resumen.roic.nota': 'Return on capital deployed',
  'cartera.resumen.roic.vacio': 'No capital deployed to divide by',
  'cartera.resumen.abiertas': 'Open positions',
  'cartera.resumen.abiertas.nota': 'Live theses in the portfolio',
  'cartera.resumen.cerradas': 'Closed positions',
  'cartera.resumen.cerradas.nota': 'Liquidated theses',

  // ═══════════════════════ Portfolio · dashboard ═══════════════════════
  'cartera.indicador.rentabilidad': 'Cumulative return',
  'cartera.indicador.rentabilidad.nota': 'On invested capital · since {fecha}',
  'cartera.indicador.valorIndexado': 'Indexed value',
  'cartera.indicador.valorIndexado.nota': 'Base {base} = invested capital',
  'cartera.indicador.dia': 'Daily change',
  'cartera.indicador.dia.nota': 'Weighted by current weight',
  'cartera.indicador.posiciones': 'Positions',
  'cartera.indicador.posiciones.nota': 'Theses held',
  'cartera.indicador.posiciones.liquidadas': {
    one: '{n} closed',
    other: '{n} closed',
  },
  'cartera.indicador.liquidez': 'Cash',
  'cartera.indicador.liquidez.nota': 'Of portfolio value · {capital} of capital',

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
  'cartera.grafico.subtitulo.completa': {
    one: 'Indexed value · base {base} = invested capital · {n} session',
    other: 'Indexed value · base {base} = invested capital · {n} sessions',
  },
  'cartera.grafico.opciones': 'Chart options',
  'cartera.grafico.periodo': 'Period',
  'cartera.grafico.rango.max': 'Max',
  'cartera.grafico.indice': 'Benchmark index',
  'cartera.grafico.verDatos': 'View data',
  'cartera.grafico.ocultarDatos': 'Hide data',
  'cartera.leyenda.cartera': 'Warrants & Co. portfolio',
  'cartera.leyenda.medida.total': 'Measured from invested capital · this is the total return',
  'cartera.leyenda.medida.rango': 'Measured from the start of the range, {fecha} · not the total return',

  'cartera.serie.caption': 'Historical series of the portfolio and the active benchmarks',
  'cartera.serie.fecha': 'Date',
  'cartera.serie.cartera': 'Portfolio',

  // ── Portfolio · performance table and outperformance ──
  'cartera.rendimiento.caption': 'Performance by series over the selected range',
  'cartera.rendimiento.activo': 'Asset',
  'cartera.rendimiento.inicio': 'Start',
  'cartera.rendimiento.actual': 'Current',
  'cartera.rendimiento.retorno': 'Return',
  // Outperformance is always measured against the PRINCIPAL benchmark — the
  // same one that drives beta and correlation, never "whichever was toggled
  // last": one fact, one source.
  'cartera.outperformance.rotulo': 'Vs. {nombre} · {simbolo}',

  'cartera.metodologia.rebase': 'All series are normalized to 100 at the start of the selected period. Benchmark performance is shown for comparison purposes only and does not represent an investable position in the underlying index unless explicitly stated.',

  // ════════════════════════ Portfolio · holdings ════════════════════════
  'cartera.posiciones.titulo': 'Portfolio composition',
  'cartera.posiciones.subtitulo': 'Current weight: how much each position is worth today against portfolio value, cash included · quotes refreshed on every page load',
  'cartera.posiciones.caption': 'Breakdown of portfolio positions',
  'cartera.col.valor': 'Holding',
  'cartera.col.peso': 'Current weight',
  'cartera.col.alta': 'Opened',
  'cartera.col.compra': 'Entry',
  'cartera.col.cotizacion': 'Last',
  'cartera.col.dia': 'Day',
  'cartera.col.rentabilidad': 'Return',
  'cartera.col.takeProfit': 'Take profit',
  'cartera.col.recorrido': 'Path to TP',
  'cartera.col.precioObjetivo': 'Target',
  'cartera.col.recomendacion': 'Recommendation',
  'cartera.col.estado': 'Status',
  'cartera.col.actual': 'Current/Exit',
  'cartera.col.contribucion': 'Contribution',
  'cartera.estado.abierta': 'Open',
  'cartera.estado.cerrada': 'Closed',
  'cartera.fila.desplegar': 'Detail for {ticker}',
  'cartera.fila.detalle.alta': 'Entry date',
  'cartera.fila.detalle.cierre': 'Exit date',
  'cartera.recorrido.title': '{avance} of the path to take profit',

  'cartera.mov.rendimiento': 'Performance',
  'cartera.mov.composicion': 'Composition',
  'cartera.mov.procedencia': 'Attribution',
  'cartera.anillo.titulo': 'Portfolio breakdown',
  'cartera.anillo.subtitulo': 'Weight against portfolio value · cash is one more slice',
  'cartera.anillo.descripcion': 'Portfolio breakdown: {partes}.',
  'cartera.anillo.sinCaja.titulo': 'Composition cannot be closed',
  'cartera.anillo.sinCaja.motivo': 'The cash weight is not available, and without it the parts do not add up to the whole. Splitting only the open positions would claim the portfolio is fully invested.',
  'cartera.anillo.vacio.titulo': 'Nothing to break down',
  'cartera.anillo.vacio.motivo': 'There are no open positions and no cash to split.',
  'cartera.metodologia.resumen': 'How all of this is computed',
  'cartera.metodologia.remite': 'Reconciliation also states its own assumptions next to its table.',
  'cartera.liquidez.etiqueta': 'Cash',
  'cartera.liquidez.nota': {
    one: 'Weight against portfolio value. Of capital it is {capital}: {n} liquidated tranche that is no longer reinvested. The two figures differ because the tranche exited worth more than it cost.',
    other: 'Weight against portfolio value. Of capital it is {capital}: {n} liquidated tranches that are no longer reinvested. The two figures differ because the tranches exited worth more than they cost.',
  },
  'cartera.liquidez.nota.sinLiquidar': 'Weight against portfolio value. It is {capital} of capital, which no thesis has claimed yet.',

  // ════════════════════ Portfolio · reconciliation ════════════════════
  'cartera.conciliacion.titulo': 'Return reconciliation',
  'cartera.conciliacion.subtitulo': 'Capital weight: the tranche assigned at inception, which the line answers for. Weight times return is its contribution, and the contributions add up to the total return',
  'cartera.conciliacion.caption': 'Return reconciliation, position by position',
  'cartera.conciliacion.col.peso': 'Capital weight',
  'cartera.conciliacion.col.entrada': 'Entry price',
  'cartera.conciliacion.col.referencia': 'Reference price',
  'cartera.conciliacion.col.valorTramo': 'Tranche value',
  'cartera.conciliacion.col.contribucion': 'Contribution',
  'cartera.conciliacion.fuente.salida': 'Exit · {fecha}',
  'cartera.conciliacion.fuente.cotizacion': 'Quote',
  'cartera.conciliacion.fuente.cierre': 'Close · {fecha}',
  'cartera.conciliacion.fuente.ausente': 'No price published',
  'cartera.conciliacion.enCaja': 'In cash',
  'cartera.conciliacion.sinDesplegar': 'Undeployed capital',
  'cartera.conciliacion.sinDesplegar.detalle': 'No thesis has claimed it',
  'cartera.conciliacion.total': 'Total',
  'cartera.conciliacion.total.nota': {
    one: '{n} tranche · base {base} = capital',
    other: '{n} tranches · base {base} = capital',
  },
  'cartera.conciliacion.nota': {
    one: 'Cash carries no line of its own: the proceeds of a liquidated tranche remain within its line, which is the one that answers for them. Today that is {n} tranche —{capital} of capital— worth {importe}, which is {patrimonio} of portfolio value.',
    other: 'Cash carries no line of its own: the proceeds of a liquidated tranche remain within its line, which is the one that answers for them. Today that is {n} tranches —{capital} of capital— worth {importe}, which is {patrimonio} of portfolio value.',
  },
  'cartera.conciliacion.nota.sinCaja': 'No liquidated tranches: all capital remains invested and cash is zero.',

  // ════════════════════════ Portfolio · closed ════════════════════════
  'cartera.cerradas.titulo': 'Closed positions',
  'cartera.cerradas.subtitulo': 'Theses closed automatically on reaching their take profit',
  'cartera.cerradas.caption': 'Breakdown of closed positions',
  'cartera.cerradas.col.cierre': 'Closed',
  'cartera.cerradas.col.precioSalida': 'Exit price',
  'cartera.cerradas.col.resultado': 'Result',
  'cartera.cerradas.col.motivo': 'Reason',
  'cartera.cerradas.motivo': 'Closed',
  'cartera.motivoCierre.takeProfit': 'Take profit reached',
  'cartera.motivoCierre.stopLoss': 'Stop loss reached',

  // ═════════════════════ Portfolio · sample floor ═════════════════════
  'cartera.muestra.faltan': {
    one: '{n} session short · published from {minimas} ({plazo})',
    other: '{n} sessions short · published from {minimas} ({plazo})',
  },
  'cartera.muestra.plazo': { one: '{n} year', other: '{n} years' },
  'cartera.muestra.explicacion': 'Two different floors, for different reasons. Annualised figures are published from {anualizada} sessions, one year: before that, annualising by compounding extrapolates a stretch that has not been travelled; from then on it is the annualisation of a return that actually happened, and that is a fact, not an inference. Risk-adjusted ratios —Sharpe, Sortino, Calmar and Jensen’s alpha— wait for {ratios} sessions, three years: it is the floor the industry uses —Morningstar computes no risk-adjusted measures below that span— and the arithmetic backs it, because their standard error depends on the span, not on how often it is sampled. At {sesiones} sessions that error overwhelms the figure itself, so the level would mean nothing. What the sample does support —total return, volatility, maximum drawdown, beta— is published from day one.',

  // ═══════════════════════ Portfolio · statistics ═══════════════════════
  'cartera.estadisticos.titulo': 'Parameters and statistics',
  'cartera.estadisticos.subtitulo': 'Risk and return metrics',
  'cartera.estadisticos.vacio.titulo': 'Statistics unavailable',
  'cartera.estadisticos.vacio.detalle': 'A longer history is required to compute the risk metrics.',
  'cartera.estadisticos.periodo': {
    one: 'Period {inicio} – {fin} · {n} session · benchmark {indice}',
    other: 'Period {inicio} – {fin} · {n} sessions · benchmark {indice}',
  },

  'cartera.grupo.rentabilidad': 'Return',
  'cartera.grupo.riesgo': 'Risk',
  'cartera.grupo.indice': 'Against the index',
  'cartera.grupo.sesiones': 'Sessions',
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
  // Short name of the series. Used by the chart's end label and the tooltip:
  // same name for the same line, written once.
  'grafico.serie.cartera': 'Portfolio',
  'grafico.base': 'base 100',
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

  // ══════════════════════ Server catalogue codes ══════════════════════════
  // See the note in `es.js`: the key repeats the code verbatim so that
  // `tests/errores.js` can compare sets instead of transforming names.
  'codigo.EMPRESA_OBLIGATORIA': 'The registered name is required',
  'codigo.TICKER_FORMATO': 'Invalid ticker format',
  'codigo.TICKER_REQUERIDO_EN_CARTERA': 'A thesis held in the portfolio requires a listed ticker',
  'codigo.FECHA_FORMATO': 'The date must follow the YYYY-MM-DD format',
  'codigo.FECHA_FUTURA': 'The publication date cannot be in the future',
  'codigo.TIPO_INFORME_NO_RECONOCIDO': 'Report type not recognised',
  'codigo.RECOMENDACION_NO_RECONOCIDA': 'Recommendation not recognised',
  'codigo.NIVEL_ACCESO_NO_RECONOCIDO': 'Access level not recognised',
  'codigo.DIVISA_NO_SOPORTADA': 'Currency not supported',
  'codigo.PRECIO_OBJETIVO_NO_NUMERICO': 'The target price must be numeric',
  'codigo.PRECIO_OBJETIVO_FUERA_RANGO': 'The target price is out of range',
  'codigo.PESO_NO_NUMERICO': 'The portfolio weight must be numeric',
  'codigo.PESO_FUERA_RANGO': 'The portfolio weight must be between 0 and 100',
  'codigo.PRECIO_COMPRA_NO_NUMERICO': 'The purchase price must be numeric',
  'codigo.PRECIO_COMPRA_FUERA_RANGO': 'The purchase price is out of range',
  'codigo.TAKE_PROFIT_NO_NUMERICO': 'The take profit must be numeric',
  'codigo.TAKE_PROFIT_FUERA_RANGO': 'The take profit is out of range',
  'codigo.STOP_LOSS_NO_NUMERICO': 'The stop loss must be numeric',
  'codigo.STOP_LOSS_FUERA_RANGO': 'The stop loss is out of range',
  'codigo.TAKE_PROFIT_BAJO_COMPRA': 'The take profit must sit above the purchase price',
  'codigo.STOP_LOSS_SOBRE_COMPRA': 'The stop loss must sit below the purchase price',
  'codigo.TITULAR_OBLIGATORIO': 'The headline is required',
  'codigo.URL_NO_VALIDA': 'The link must be a valid http or https address',
  'codigo.CATEGORIA_NO_RECONOCIDA': 'Category not recognised',
  'codigo.RELEVANCIA_NO_RECONOCIDA': 'Relevance level not recognised',
  'codigo.LIMITE_PETICIONES': 'Rate limit exceeded. Please try again in a few moments.',
  'codigo.CREDENCIAL_INVALIDA': 'Invalid analyst credential.',
  'codigo.RECURSO_NO_ENCONTRADO': 'API resource not found.',
  'codigo.CUERPO_NO_JSON': 'Request body is not valid JSON.',
  'codigo.VALIDACION': 'The submitted data does not pass validation',
  'codigo.DOCUMENTO_DEMASIADO_GRANDE': 'Each document exceeds the maximum allowed size.',
  'codigo.DEMASIADOS_DOCUMENTOS': 'Maximum number of documents per report exceeded.',
  'codigo.CAMPO_FICHERO_INESPERADO': 'Unexpected file field.',
  'codigo.DOCUMENTOS_NO_PROCESABLES': 'Documents could not be processed.',
  'codigo.ERROR_INTERNO': 'An internal server error has occurred.',
  'codigo.PROVEEDOR_NO_RESPONDE': 'An external provider did not respond.',
  'codigo.CAPACIDAD_NO_DISPONIBLE': 'No connected provider offers this capability.',
  'codigo.SIMBOLO_INVALIDO': 'Invalid symbol: {simbolo}',
  'codigo.SIN_SERIE_HISTORICA': 'No historical series available for this instrument.',
  'codigo.FORMATO_INFORME_NO_ADMITIDO':
    'Format not supported. Only PDF, Word and Excel files are accepted.',
  'codigo.COMPANIA_NO_CUBIERTA': 'This company is not under coverage.',

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
  'noticias.hub.subtitulo': 'Market news syndicated from Investing.com and in-house coverage, with source and time on every piece.',
  'noticias.hub.total': 'News',
  'noticias.hub.categorias': 'Categories',
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
  'companias.tarjeta.ver': 'View research →',

  // ── Data points, shared by the card and the profile ──
  'companias.dato.recomendacion': 'Recommendation',
  'companias.dato.objetivo': 'Target price',
  'companias.dato.actual': 'Current price',
  'companias.dato.informes': 'Reports',
  'companias.dato.recorrido': 'Upside to target',
  'companias.dato.peso': 'Portfolio weight',
  'companias.dato.compra': 'Entry price',
  'companias.dato.takeProfit': 'Take profit',
  'companias.dato.stopLoss': 'Stop loss',
  'companias.dato.distancia': 'Distance to take profit',

  // ── Hub: header, Featured, Latest, Sector ──
  'companias.hub.subtitulo': 'Fundamental coverage of the companies under watch.',
  'companias.hub.cubiertas': 'Companies covered',
  'companias.hub.activas': 'Active coverage',
  'companias.hub.activas.nota': 'Companies with at least one published report',
  'companias.hub.informes': 'Research reports',
  'companias.hub.destacadas': 'Featured research',
  'companias.hub.recientes': 'Latest coverage',
  'companias.hub.sectores': 'Coverage by sector',
  'companias.hub.todas': 'All companies',
  'companias.hub.posiciones': 'Active positions',
  'companias.hub.posiciones.nota': 'Covered companies with an open portfolio position',
  'companias.cta.texto': 'Follow our research.',
  'companias.cta.enlace': 'View the catalyst calendar',

  // ── Profile ──
  'companias.cotizacion.sinDato': 'No quote available',
  'companias.motivoCotizacion.sinCotizacion': 'No quote available',
  'companias.cotizacion.selloNota': 'Consolidated with a delay; the platform carries no real-time feed.',
  'companias.tesis.titulo': 'Current thesis',
  'companias.tesis.sinResumen': 'Data unavailable — no report includes an executive summary.',
  'companias.niveles.titulo': 'Trading levels',
  'companias.catalizadores.titulo': 'Upcoming catalysts',
  'companias.catalizadores.vacio': 'No upcoming catalysts scheduled for this company.',
  'companias.catalizadores.sinComprobar': 'Data unavailable — the catalyst calendar could not be checked.',
  'companias.catalizadores.tipoReserva': 'Event',
  'companias.catalizadores.notaResumen':
    '{pasados} past catalyst(s) and {sinFuente} without a confirmed source in this company’s history.',
  'companias.riesgos.titulo': 'Key risks',
  'companias.riesgos.vacio': 'Data unavailable — no report has recorded key risks yet.',
  'companias.portfolio.titulo': 'Portfolio connection',
  'companias.portfolio.abierta': 'Currently held in the portfolio.',
  'companias.portfolio.cerrada': 'Previously held in the portfolio.',
  'companias.portfolio.noTenida': 'Not currently part of the portfolio.',
  'companias.portfolio.sinComprobar': 'Data unavailable — the portfolio status could not be checked on this load.',
  'companias.portfolio.verPosicion': 'View position',
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
  'evento.fuente.prensa': 'Press',

  // ════════════════════════════ Catalysts ══════════════════════════════════
  'catalizadores.etiqueta': 'Research',
  'catalizadores.titulo': 'Catalysts',
  'catalizadores.enVivo': 'LIVE',
  'catalizadores.hub.subtitulo': 'The calendar of what can move each thesis, with a verifiable date from a connected source.',
  'catalizadores.filtros.etiqueta': 'Calendar filters',
  'catalizadores.horizonte.proximos': 'Upcoming',
  'catalizadores.horizonte.pasados': 'Past',
  'catalizadores.filtro.compania': 'Company',
  'catalizadores.filtro.todasCompanias': 'All companies',
  'catalizadores.filtro.tipo': 'Event type',
  'catalizadores.filtro.todosTipos': 'All types',
  'catalizadores.carencias.titulo': 'No connected source',
  'catalizadores.carencias.subtitulo': 'Categories the calendar recognises but nothing feeds today',

  'catalizadores.ventana.etiqueta': 'Time window',
  'catalizadores.ventana.hoy': 'TODAY',
  'catalizadores.ventana.7d': '7D',
  'catalizadores.ventana.30d': '30D',
  'catalizadores.ventana.90d': '90D',
  'catalizadores.ventana.todos': 'ALL',

  'catalizadores.metricas.proximos': 'Upcoming',
  'catalizadores.metricas.alta': 'High priority',
  'catalizadores.metricas.pasados': 'Past',

  'catalizadores.siguiente.titulo': 'Next catalyst',
  'catalizadores.siguiente.vacio': 'No upcoming catalysts scheduled.',
  'catalizadores.siguiente.abrir': 'Open {empresa} profile',

  'catalizadores.dato.tipo': 'Type',
  'catalizadores.dato.prioridad': 'Priority',

  'catalizadores.portfolio.abierta': 'In portfolio',
  'catalizadores.portfolio.cerrada': 'Closed position',
  'catalizadores.portfolio.noTenida': 'Not held',
  'catalizadores.portfolio.sinComprobar': 'Portfolio not checked',

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

  // ── Priority reason and expiry title, composed on the client ──
  'catalizadores.evento.titulo.vencimiento': 'Options expiry · {fecha}',
  'catalizadores.motivo.plazo.hoy': 'Happening today',
  'catalizadores.motivo.plazo.manana': 'Happening tomorrow',
  'catalizadores.motivo.plazo.dias': '{dias} days away',
  'catalizadores.motivo.sinFecha': 'The event has no known date.',
  'catalizadores.motivo.pasado': "Event already happened: priority only applies to what's upcoming.",
  'catalizadores.motivo.secundario': 'Secondary event for the thesis.',
  'catalizadores.motivo.alta':
    '{cuando}, and the company is in the portfolio: it could affect the current thesis.',
  'catalizadores.motivo.mediaEnCartera': '{cuando}, on an open position, but outside the immediate horizon.',
  'catalizadores.motivo.mediaSinCartera': '{cuando}, on a covered company with no open position.',
  'catalizadores.motivo.baja': '{cuando}: outside the tracking horizon.',

  'catalizadores.dato.interesAbierto': 'Open interest',
  'catalizadores.dato.volumen': 'Volume',
  'catalizadores.dato.cuotaOI': 'OI share',
  'catalizadores.dato.contratos': 'Contracts',
  'catalizadores.dato.recomendacion': 'Recommendation',
  'catalizadores.dato.objetivo': 'Target price',
  'catalizadores.dato.analista': 'Analyst',

  // Expiration summary: low-priority ones aren't dropped, they're grouped by
  // company. "See all" brings the complete set, HIGH/MEDIUM included.
  'catalizadores.resumenVencimientos.titulo': 'Options expirations · Summary',
  'catalizadores.resumenVencimientos.subtitulo':
    'High- and medium-priority expirations stay above as full events. Here, the rest, grouped by company — none of them are left out of this table.',
  'catalizadores.resumenVencimientos.caption': 'Options expirations grouped by company',
  'catalizadores.resumenVencimientos.col.compania': 'Company',
  'catalizadores.resumenVencimientos.col.total': 'Expirations',
  'catalizadores.resumenVencimientos.col.proximo': 'Next',
  'catalizadores.resumenVencimientos.col.maximaConcentracion': 'Peak concentration',
  'catalizadores.resumenVencimientos.col.fecha': 'Date',
  'catalizadores.resumenVencimientos.col.detalle': 'Detail',
  'catalizadores.resumenVencimientos.verTodos': 'See all',
  'catalizadores.resumenVencimientos.desplegar': 'See all expirations for {empresa}',
  'catalizadores.resumenVencimientos.detalle.caption': 'All expirations for {empresa}',
  'catalizadores.resumenVencimientos.detalle.col.fecha': 'Date',
  'catalizadores.resumenVencimientos.detalle.col.dias': 'Days',

  // ════════════════════════════ Markets ════════════════════════════════════
  'mercado.etiqueta': 'Market',
  'mercado.titulo': 'Markets',
  'mercado.cobertura': {
    one: '{n} of {total} instrument resolved',
    other: '{n} of {total} instruments resolved',
  },
  'mercado.sinMotivo': 'Data unavailable',

  // ── Market map groups ──
  'mercado.grupo.renta-variable.titulo': 'Equities',
  'mercado.grupo.renta-variable.descripcion': 'U.S. benchmark indices',
  'mercado.grupo.volatilidad.titulo': 'Volatility',
  'mercado.grupo.volatilidad.descripcion': 'Implied market volatility',
  'mercado.grupo.tipos.titulo': 'Yield curve',
  'mercado.grupo.tipos.descripcion': 'U.S. Treasury yield',

  // ── Fixed reasons a data point or a calculation is not published ──
  'mercado.motivo.SIN_DATOS': 'No market data.',
  'mercado.motivo.DOW_JONES_SIN_PROVEEDOR':
    'No connected provider publishes the index. The usual symbols resolve to other ' +
    'instruments: DJIA returns a covered-call ETF and DIA the tracking ETF, not the index.',
  'mercado.motivo.VIX_VOLATILIDAD_IMPLICITA': '30-day implied volatility of the S&P 500',
  'mercado.motivo.CURVA_INCOMPLETA': 'Requires the 2-year and 10-year points',
  'mercado.motivo.CALIDAD_DIFERIDO': 'Consolidated data with a delay. The platform holds no real-time entitlement.',
  'mercado.motivo.CALIDAD_FUERA_DE_SESION': 'Session status: {estado}. The last price is the previous session’s close.',

  // ── Session state, for the {estado} above ──
  'mercado.estadoMercado.CLOSED': 'Closed',
  'mercado.estadoMercado.PRE_MKT': 'Pre-market',
  'mercado.estadoMercado.POST_MKT': 'Post-close',
  'mercado.estadoMercado.AFTER_HOURS': 'After hours',

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
  'mercado.calidad.leyenda.REAL_TIME': 'Live quote. The platform holds none today.',
  'mercado.calidad.leyenda.DELAYED': 'Consolidated data with a delay during the session.',
  'mercado.calidad.leyenda.HISTORICAL': 'Last available close; the market is not in regular session.',
  'mercado.calidad.leyenda.UNAVAILABLE': 'No connected provider resolves the instrument.',

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
