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
};
