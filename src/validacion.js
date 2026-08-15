'use strict';

/** Vocabularios controlados del repositorio documental. */
const TIPOS_INFORME = [
  'Tesis de inversión',
  'Inicio de cobertura',
  'Actualización de resultados',
  'Nota sectorial',
  'Nota macroeconómica',
  'Revisión de valoración',
  'Análisis técnico',
  'Due diligence',
];

const RECOMENDACIONES = ['Comprar', 'Sobreponderar', 'Mantener', 'Infraponderar', 'Vender', 'En revisión'];

// Claves internas sin diacriticos; la denominacion visible se resuelve en el cliente.
const NIVELES_ACCESO = ['publico', 'cliente', 'institucional', 'interno'];
const ETIQUETAS_ACCESO = {
  publico: 'Público',
  cliente: 'Cliente',
  institucional: 'Institucional',
  interno: 'Interno',
};

const SECTORES = [
  'Tecnología de la información', 'Salud', 'Financiero', 'Consumo discrecional',
  'Consumo básico', 'Energía', 'Industriales', 'Materiales',
  'Servicios de comunicación', 'Utilities', 'Inmobiliario',
];

const DIVISAS = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];

class ErrorValidacion extends Error {
  constructor(errores) {
    super('Los datos remitidos no superan la validación');
    this.name = 'ErrorValidacion';
    this.status = 422;
    this.errores = errores;
  }
}

const texto = (v, max) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

function numero(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function esFechaISO(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function normalizarEtiquetas(v) {
  let bruto = v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[')) {
      try { bruto = JSON.parse(s); } catch { bruto = s.split(','); }
    } else {
      bruto = s.split(',');
    }
  }
  if (!Array.isArray(bruto)) return [];
  const vistas = new Set();
  const salida = [];
  for (const e of bruto) {
    const t = String(e).trim().slice(0, 40);
    const clave = t.toLowerCase();
    if (t && !vistas.has(clave)) {
      vistas.add(clave);
      salida.push(t);
    }
    if (salida.length >= 25) break;
  }
  return salida;
}

const esVerdadero = (v) => v === true || v === 'true' || v === '1' || v === 1 || v === 'on';

/**
 * Valida y normaliza el cuerpo de un informe.
 * @param {object} cuerpo
 * @param {boolean} parcial  true en actualizaciones: solo valida lo presente
 */
function validarInforme(cuerpo, { parcial = false } = {}) {
  const e = [];
  const d = {};

  const empresa = texto(cuerpo.empresa, 160);
  if (!parcial || cuerpo.empresa !== undefined) {
    if (!empresa) e.push({ campo: 'empresa', mensaje: 'La denominación social es obligatoria' });
    else d.empresa = empresa;
  }

  if (!parcial || cuerpo.ticker !== undefined) {
    const t = texto(cuerpo.ticker, 12);
    if (t) {
      const limpio = t.toUpperCase().replace(/^\$/, '');
      if (!/^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(limpio))
        e.push({ campo: 'ticker', mensaje: 'Formato de ticker no válido' });
      else d.ticker = limpio;
    } else d.ticker = null;
  }

  if (!parcial || cuerpo.fecha_publicacion !== undefined) {
    const f = texto(cuerpo.fecha_publicacion, 10);
    if (!f) {
      if (!parcial) d.fecha_publicacion = new Date().toISOString().slice(0, 10);
    } else if (!esFechaISO(f)) {
      e.push({ campo: 'fecha_publicacion', mensaje: 'La fecha debe seguir el formato AAAA-MM-DD' });
    } else if (f > new Date().toISOString().slice(0, 10)) {
      e.push({ campo: 'fecha_publicacion', mensaje: 'La fecha de publicación no puede ser futura' });
    } else d.fecha_publicacion = f;
  }

  for (const [campo, lista, etiqueta] of [
    ['tipo_informe', TIPOS_INFORME, 'tipo de informe'],
    ['recomendacion', RECOMENDACIONES, 'recomendación'],
    ['nivel_acceso', NIVELES_ACCESO, 'nivel de acceso'],
  ]) {
    if (!parcial || cuerpo[campo] !== undefined) {
      const v = texto(cuerpo[campo], 60);
      if (!v) {
        if (campo === 'nivel_acceso' && !parcial) d[campo] = 'publico';
        else d[campo] = null;
      } else if (!lista.includes(v)) {
        e.push({ campo, mensaje: `Valor de ${etiqueta} no reconocido` });
      } else d[campo] = v;
    }
  }

  for (const [campo, max] of [
    ['sector', 80], ['pais', 60], ['periodo', 40], ['analista', 120], ['resumen_ejecutivo', 8000],
  ]) {
    if (!parcial || cuerpo[campo] !== undefined) d[campo] = texto(cuerpo[campo], max);
  }

  if (!parcial || cuerpo.divisa !== undefined) {
    const v = (texto(cuerpo.divisa, 3) || 'USD').toUpperCase();
    if (!DIVISAS.includes(v)) e.push({ campo: 'divisa', mensaje: 'Divisa no soportada' });
    else d.divisa = v;
  }

  if (!parcial || cuerpo.precio_objetivo !== undefined) {
    const n = numero(cuerpo.precio_objetivo);
    if (Number.isNaN(n)) e.push({ campo: 'precio_objetivo', mensaje: 'El precio objetivo debe ser numérico' });
    else if (n !== null && (n <= 0 || n > 1_000_000))
      e.push({ campo: 'precio_objetivo', mensaje: 'El precio objetivo está fuera de rango' });
    else d.precio_objetivo = n;
  }

  if (!parcial || cuerpo.peso_cartera !== undefined) {
    const n = numero(cuerpo.peso_cartera);
    if (Number.isNaN(n)) e.push({ campo: 'peso_cartera', mensaje: 'El peso debe ser numérico' });
    else if (n !== null && (n <= 0 || n > 100))
      e.push({ campo: 'peso_cartera', mensaje: 'El peso debe expresarse entre 0 y 100' });
    else d.peso_cartera = n;
  }

  // Niveles operativos de la posición: precio pagado, toma de beneficios y stop.
  for (const [campo, etiqueta] of [
    ['precio_compra', 'precio de compra'],
    ['take_profit', 'take profit'],
    ['stop_loss', 'stop loss'],
  ]) {
    if (!parcial || cuerpo[campo] !== undefined) {
      const n = numero(cuerpo[campo]);
      if (Number.isNaN(n)) e.push({ campo, mensaje: `El ${etiqueta} debe ser numérico` });
      else if (n !== null && (n <= 0 || n > 1_000_000))
        e.push({ campo, mensaje: `El ${etiqueta} está fuera de rango` });
      else d[campo] = n;
    }
  }

  // Coherencia de los niveles frente al precio pagado.
  const compra = d.precio_compra;
  if (Number.isFinite(compra)) {
    if (Number.isFinite(d.take_profit) && d.take_profit <= compra)
      e.push({ campo: 'take_profit', mensaje: 'El take profit debe situarse por encima del precio de compra' });
    if (Number.isFinite(d.stop_loss) && d.stop_loss >= compra)
      e.push({ campo: 'stop_loss', mensaje: 'El stop loss debe situarse por debajo del precio de compra' });
  }

  if (!parcial || cuerpo.etiquetas !== undefined) d.etiquetas = JSON.stringify(normalizarEtiquetas(cuerpo.etiquetas));
  if (!parcial || cuerpo.destacado !== undefined) d.destacado = esVerdadero(cuerpo.destacado) ? 1 : 0;
  if (!parcial || cuerpo.en_cartera !== undefined) d.en_cartera = esVerdadero(cuerpo.en_cartera) ? 1 : 0;

  // Una posición de cartera exige identificador de cotización.
  const enCartera = d.en_cartera === 1;
  const tickerFinal = d.ticker !== undefined ? d.ticker : null;
  if (!parcial && enCartera && !tickerFinal)
    e.push({ campo: 'ticker', mensaje: 'Una tesis incorporada a cartera requiere ticker de cotización' });

  if (e.length) throw new ErrorValidacion(e);
  return d;
}

// ─────────────────────────────── Noticias ────────────────────────────────

const CATEGORIAS_NOTICIA = [
  'Mercados', 'Compañía', 'Macroeconomía', 'Sector', 'Resultados', 'Operación corporativa', 'Regulación',
];
const RELEVANCIAS = ['normal', 'alta', 'urgente'];
const ETIQUETAS_RELEVANCIA = { normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };

/** Valida y normaliza el cuerpo de una noticia. */
function validarNoticia(cuerpo, { parcial = false } = {}) {
  const e = [];
  const d = {};

  if (!parcial || cuerpo.titular !== undefined) {
    const t = texto(cuerpo.titular, 220);
    if (!t) e.push({ campo: 'titular', mensaje: 'El titular es obligatorio' });
    else d.titular = t;
  }

  for (const [campo, max] of [['entradilla', 600], ['cuerpo', 20000], ['fuente', 120], ['autor', 120]]) {
    if (!parcial || cuerpo[campo] !== undefined) d[campo] = texto(cuerpo[campo], max);
  }

  if (!parcial || cuerpo.url_fuente !== undefined) {
    const u = texto(cuerpo.url_fuente, 500);
    if (!u) d.url_fuente = null;
    else {
      // Solo se admiten esquemas de navegación: descarta javascript: y data:.
      let valida = false;
      try {
        const parsed = new URL(u);
        valida = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch { valida = false; }
      if (!valida) e.push({ campo: 'url_fuente', mensaje: 'El enlace debe ser una dirección http o https válida' });
      else d.url_fuente = u;
    }
  }

  if (!parcial || cuerpo.categoria !== undefined) {
    const v = texto(cuerpo.categoria, 60);
    if (!v) { if (!parcial) d.categoria = 'Mercados'; }
    else if (!CATEGORIAS_NOTICIA.includes(v)) e.push({ campo: 'categoria', mensaje: 'Categoría no reconocida' });
    else d.categoria = v;
  }

  if (!parcial || cuerpo.relevancia !== undefined) {
    const v = texto(cuerpo.relevancia, 20);
    if (!v) { if (!parcial) d.relevancia = 'normal'; }
    else if (!RELEVANCIAS.includes(v)) e.push({ campo: 'relevancia', mensaje: 'Nivel de relevancia no reconocido' });
    else d.relevancia = v;
  }

  if (!parcial || cuerpo.fecha_publicacion !== undefined) {
    const f = texto(cuerpo.fecha_publicacion, 10);
    if (!f) { if (!parcial) d.fecha_publicacion = new Date().toISOString().slice(0, 10); }
    else if (!esFechaISO(f)) e.push({ campo: 'fecha_publicacion', mensaje: 'La fecha debe seguir el formato AAAA-MM-DD' });
    else if (f > new Date().toISOString().slice(0, 10))
      e.push({ campo: 'fecha_publicacion', mensaje: 'La fecha de publicación no puede ser futura' });
    else d.fecha_publicacion = f;
  }

  if (!parcial || cuerpo.tickers !== undefined) {
    const brutos = normalizarEtiquetas(cuerpo.tickers);
    const limpios = [];
    for (const t of brutos) {
      const s = t.toUpperCase().replace(/^\$/, '').trim();
      if (/^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(s) && !limpios.includes(s)) limpios.push(s);
    }
    d.tickers = JSON.stringify(limpios);
  }

  if (!parcial || cuerpo.etiquetas !== undefined) d.etiquetas = JSON.stringify(normalizarEtiquetas(cuerpo.etiquetas));
  if (!parcial || cuerpo.destacada !== undefined) d.destacada = esVerdadero(cuerpo.destacada) ? 1 : 0;

  if (e.length) throw new ErrorValidacion(e);
  return d;
}

module.exports = {
  validarInforme, validarNoticia, ErrorValidacion, normalizarEtiquetas, esFechaISO,
  TIPOS_INFORME, RECOMENDACIONES, NIVELES_ACCESO, ETIQUETAS_ACCESO, SECTORES, DIVISAS,
  CATEGORIAS_NOTICIA, RELEVANCIAS, ETIQUETAS_RELEVANCIA,
};
