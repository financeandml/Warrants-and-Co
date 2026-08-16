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
