/* ============================================================================
   Idioma de la interfaz.

   Traduce lo que la plataforma dice, nunca lo que la plataforma publica: las
   tesis, los teletipos, los resúmenes ejecutivos y los nombres de compañía se
   muestran siempre en su idioma original. Traducirlos automáticamente sería
   publicar texto que ningún analista ha firmado.

   ═══ Cómo se declara una cadena ═══

   En el documento, con dos atributos que esta pasada resuelve:

       <h1 data-i18n="repositorio.titulo">Catálogo de informes</h1>
       <input data-i18n-attr="placeholder:filtros.hint; aria-label:filtros.etiqueta">

   El HTML conserva su texto en español: es legible al revisarlo y sirve de
   reserva si una clave llegara a faltar.

   En JavaScript, con `t()`:

       elemento('h3', 'vacio', t('companias.vacio'))
       t('companias.total', { n: 4 })

   ═══ Plurales ═══

   Se resuelven con `Intl.PluralRules`, que trae el navegador. Una entrada que
   dependa de un número declara sus formas y el motor elige:

       'companias.total': { one: '{n} compañía cubierta', other: '{n} compañías cubiertas' }
   ========================================================================= */

import { IDIOMAS, BASE, CLAVES, definicion } from './idiomas/index.js';
import { fijarLocale } from './formato.js';

const CLAVE_ALMACEN = 'warrants.idioma';

let activo = BASE;
let diccionario = definicion(BASE).diccionario;
let reglasPlural = new Intl.PluralRules(definicion(BASE).locale);

/** Idioma vigente. */
export const idiomaActivo = () => activo;

/** Locale completo del idioma vigente, para formateadores. */
export const localeActivo = () => definicion(activo).locale;

export { IDIOMAS, CLAVES };

function almacenado() {
  try {
    const v = localStorage.getItem(CLAVE_ALMACEN);
    return CLAVES.includes(v) ? v : null;
  } catch {
    return null; // almacenamiento no disponible
  }
}

/**
 * Idioma que corresponde: el elegido, el del navegador o el de reserva.
 * Repite la lógica de `idioma-inicial.js` porque aquel se ejecuta antes de que
 * exista ningún módulo; ambos deben coincidir.
 */
function resolver() {
  const elegido = almacenado();
  if (elegido) return elegido;

  const lista = navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
  for (const etiqueta of lista) {
    const raiz = String(etiqueta).toLowerCase().split('-')[0];
    if (CLAVES.includes(raiz)) return raiz;
  }
  return BASE;
}

/**
 * Traduce una clave.
 *
 * Si la clave no existe, se devuelve la propia clave. Es deliberado: un rótulo
 * que aparece como «companias.vacio» en pantalla se detecta de inmediato,
 * mientras que uno que cae en silencio al español pasaría inadvertido en la
 * versión inglesa.
 *
 * @param {string} clave
 * @param {object} [params] valores para sustituir {nombre}; `n` gobierna el plural
 */
export function t(clave, params = null) {
  let entrada = diccionario[clave];

  if (entrada === undefined) {
    // Reserva al idioma base antes de rendirse: mejor un rótulo en español que
    // una clave cruda, siempre que quede constancia de la ausencia.
    const base = definicion(BASE).diccionario[clave];
    if (base === undefined) return clave;
    entrada = base;
  }

  if (entrada !== null && typeof entrada === 'object') {
    const n = Number(params?.n);
    const forma = Number.isFinite(n) ? reglasPlural.select(n) : 'other';
    entrada = entrada[forma] ?? entrada.other ?? entrada.one ?? clave;
  }

  return params ? sustituir(entrada, params) : entrada;
}

/** Sustituye {nombre} por su valor. Los números se formatean con el locale vigente. */
function sustituir(texto, params) {
  return String(texto).replace(/\{(\w+)\}/g, (coincidencia, nombre) => {
    if (!(nombre in params)) return coincidencia;
    const v = params[nombre];
    return typeof v === 'number' ? v.toLocaleString(localeActivo()) : String(v);
  });
}

/** ¿Existe la clave en el idioma vigente? Lo usan las pruebas de paridad. */
export const existe = (clave) => diccionario[clave] !== undefined;

// ───────────────────────────── pasada sobre el DOM ─────────────────────────────

/**
 * Aplica el diccionario a un fragmento del documento.
 *
 * Solo escribe `textContent` y `setAttribute`: nunca `innerHTML`, de modo que
 * una traducción no puede inyectar marcado.
 *
 * @param {ParentNode} raiz
 */
export function traducir(raiz = document) {
  for (const nodo of raiz.querySelectorAll('[data-i18n]')) {
    const clave = nodo.dataset.i18n;
    if (clave) nodo.textContent = t(clave);
  }

  for (const nodo of raiz.querySelectorAll('[data-i18n-attr]')) {
    // Formato: «placeholder:clave.uno; aria-label:clave.dos»
    for (const par of nodo.dataset.i18nAttr.split(';')) {
      const [atributo, clave] = par.split(':').map((x) => x.trim());
      if (atributo && clave) nodo.setAttribute(atributo, t(clave));
    }
  }
}

// ───────────────────────────────── aplicación ─────────────────────────────────

/**
 * Fija el idioma y repinta la interfaz.
 * @param {string} clave
 * @param {object} [opciones] `{ persistir }` — false para no guardar la elección
 */
export function aplicarIdioma(clave, { persistir = true } = {}) {
  const def = definicion(clave);
  activo = def.clave;
  diccionario = def.diccionario;
  reglasPlural = new Intl.PluralRules(def.locale);

  // Los formateadores de número y fecha siguen al idioma.
  fijarLocale(def.locale);

  const raiz = document.documentElement;
  raiz.lang = activo;
  raiz.dataset.idioma = activo;

  if (persistir) {
    try { localStorage.setItem(CLAVE_ALMACEN, activo); } catch { /* sin persistencia */ }
  }

  traducir();
  reflejarBotones();

  // El cuerpo estaba oculto si el idioma no era el del documento; ya puede verse.
  delete raiz.dataset.i18nPendiente;

  // Las vistas que construyen su texto en JavaScript se repintan al oírlo.
  document.dispatchEvent(new CustomEvent('idioma:cambiado', { detail: { idioma: activo } }));
}

function reflejarBotones() {
  for (const boton of document.querySelectorAll('.conmutador-idioma button')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.idioma === activo));
  }
}

/** Construye el conmutador y aplica el idioma que corresponda. */
export function iniciarIdioma() {
  const grupo = document.querySelector('.conmutador-idioma');
  if (grupo) {
    grupo.textContent = '';
    grupo.setAttribute('role', 'group');

    for (const def of IDIOMAS) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.dataset.idioma = def.clave;
      boton.textContent = def.rotulo;
      // El nombre del idioma se escribe SIEMPRE en ese idioma: quien no entienda
      // la interfaz actual debe poder reconocer la suya.
      boton.setAttribute('lang', def.clave);
      boton.title = def.nombre;
      boton.setAttribute('aria-label', def.nombre);
      boton.addEventListener('click', () => aplicarIdioma(def.clave));
      grupo.appendChild(boton);
    }
  }

  aplicarIdioma(resolver(), { persistir: false });
}
