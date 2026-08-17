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
  'inicio.signal.dimension.pie': 'Weight {peso} % · {estado}',
  'inicio.signal.estado.sinFuente': 'no source',
  'inicio.signal.estado.conFuente': 'source connected',
  'inicio.signal.estado.sinPuntuacion': 'source connected, no score issued',
  'inicio.signal.motivoReserva': 'Model under construction',
  'inicio.signal.cobertura': '{motivo}. Current coverage: {cobertura} % of dimensions with a source.',

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
};
