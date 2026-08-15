/* ============================================================================
   Formato y utilidades de presentación compartidas por el panel y las secciones.
   Un único punto de verdad: si cambia el criterio de formato, cambia en todas.
   ========================================================================= */

/* ── Locale de presentación ──
   Números, monedas y fechas siguen al idioma de la interfaz. El módulo de
   idioma lo fija; aquí vive el valor porque este es el punto de verdad del
   formato y así ningún formateador tiene que conocer al de idioma. */
let locale = 'es-ES';

/** Fija el locale de presentación. Lo invoca `i18n.js` al aplicar un idioma. */
export function fijarLocale(nuevo) {
  if (typeof nuevo === 'string' && nuevo) locale = nuevo;
}

/** Locale vigente, para quien necesite formatear por su cuenta. */
export const localeFormato = () => locale;

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/** Crea un elemento con clase y texto. El texto siempre se inserta como tal. */
export function elemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== null) el.textContent = String(texto);
  return el;
}

export function formatearNumero(v, dec = 2) {
  return v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : Number(v).toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function formatearMoneda(v, divisa = 'USD') {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  try {
    // Código ISO en lugar de símbolo: convención en documentación de análisis.
    return Number(v).toLocaleString(locale, {
      style: 'currency', currency: divisa, currencyDisplay: 'code',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  } catch {
    return `${formatearNumero(v)} ${divisa}`;
  }
}

export function formatearPorcentaje(v, conSigno = true) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const signo = conSigno ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  return `${signo}${formatearNumero(Math.abs(n))} %`;
}

export function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Fecha con hora cuando el registro la aporta. */
export function formatearMomento(n) {
  if (n?.momento_publicacion) {
    const d = new Date(n.momento_publicacion);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(locale, {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    }
  }
  return formatearFecha(n?.fecha_publicacion);
}

export function formatearBytes(b) {
  if (!Number.isFinite(Number(b))) return '';
  const n = Number(b);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * Clase de lectura de mercado. El color acompaña siempre a un glifo (▲ ▼) y a la
 * cifra con signo, de modo que la información nunca depende solo del color.
 */
export function claseLectura(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return 'lectura lectura--nula';
  const n = Number(v);
  return `lectura ${n > 0 ? 'lectura--alza' : n < 0 ? 'lectura--baja' : 'lectura--nula'}`;
}

/** Traduce el sentido declarado por una señal a su clase de presentación. */
export function claseSentido(sentido) {
  switch (sentido) {
    case 'positivo': return 'lectura lectura--alza';
    case 'negativo': return 'lectura lectura--baja';
    case 'aviso': return 'lectura lectura--aviso';
    case 'informativo': return 'lectura lectura--info';
    default: return 'lectura lectura--nula';
  }
}

/** Clase heredada de las tablas existentes, que usan glifo y peso sin color. */
export function claseVariacion(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return 'variacion variacion--nula';
  const n = Number(v);
  return `variacion ${n > 0 ? 'variacion--positiva' : n < 0 ? 'variacion--negativa' : 'variacion--nula'}`;
}
