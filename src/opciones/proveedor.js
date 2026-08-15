'use strict';

/**
 * Contrato de proveedor de datos de opciones.
 *
 * Separa el origen de los datos de la lógica de negocio y de la interfaz: para
 * incorporar un proveedor nuevo basta con implementar esta interfaz y registrarlo,
 * sin tocar el motor de puntuación, las rutas ni el cliente.
 *
 * Dos reglas gobiernan el contrato:
 *
 *   1. Un proveedor solo declara las capacidades que realmente tiene. Un método
 *      correspondiente a una capacidad no declarada lanza `ErrorProveedorOpciones`
 *      en lugar de devolver una lista vacía: «sin datos» y «no hay resultados» son
 *      estados distintos y no pueden confundirse aguas arriba.
 *
 *   2. Cada proveedor declara además la CALIDAD con la que sirve cada campo
 *      —tiempo real, diferido o histórico—, de modo que la capa superior pueda
 *      etiquetar el dato sin conocer al proveedor.
 */

const { CALIDAD } = require('./calidad');

/** Capacidades que un proveedor puede declarar. */
const CAPACIDADES = [
  'cadena',              // strike, vencimiento, bid, ask, last, volumen, interés abierto
  'volatilidadImplicita',// IV por contrato
  'griegas',             // delta, gamma, theta, vega
  'multiplicador',       // multiplicador de contrato declarado por el mercado
  'operaciones',         // time & sales: cada operación con hora, tamaño y precio
  'cotizaciones',        // serie de bid/ask con marca temporal
  'contextoCotizacion',  // bid/ask vigente en el instante de cada operación
  'interesAbierto',      // interés abierto por contrato
  'historico',           // series históricas por contrato
  'mercadoEjecucion',    // identificador del mercado en cada operación
];

/** Operaciones del contrato y capacidad que cada una exige. */
const OPERACIONES = {
  getOptionChain: 'cadena',
  getTrades: 'operaciones',
  getQuotes: 'cotizaciones',
  getOpenInterest: 'interesAbierto',
  getHistoricalData: 'historico',
  getIV: 'volatilidadImplicita',
  getGreeks: 'griegas',
};

class ProveedorOpciones {
  /**
   * @param {object} definicion
   * @param {string} definicion.clave          identificador interno
   * @param {string} definicion.nombre         denominación mostrada al usuario
   * @param {string[]} definicion.capacidades  subconjunto de CAPACIDADES
   * @param {object} [definicion.calidades]    calidad por campo; por defecto, diferido
   * @param {string} [definicion.nota]         advertencia sobre el alcance del dato
   * @param {boolean} [definicion.configurado] false si le faltan credenciales
   */
  constructor({ clave, nombre, capacidades = [], calidades = {}, nota = null, configurado = true }) {
    this.clave = clave;
    this.nombre = nombre;
    this.capacidades = capacidades;
    this.calidades = calidades;
    this.nota = nota;
    this.configurado = configurado;
  }

  admite(capacidad) {
    return this.capacidades.includes(capacidad);
  }

  /**
   * Calidad con la que este proveedor sirve un campo.
   * Un campo cuya capacidad no se declara es siempre no disponible, con
   * independencia de lo que diga el mapa de calidades.
   */
  calidadDe(campo) {
    return this.calidades[campo] ?? CALIDAD.NO_DISPONIBLE;
  }

  /** Comprueba una capacidad antes de operar; lanza si no la tiene. */
  exigir(capacidad, operacion) {
    if (!this.configurado) {
      throw new ErrorProveedorOpciones(
        `El proveedor ${this.nombre} no está configurado`,
        { capacidad, proveedor: this.clave, operacion, configuracion: true }
      );
    }
    if (!this.admite(capacidad)) {
      throw new ErrorProveedorOpciones(
        `${this.nombre} no publica ${capacidad}`,
        { capacidad, proveedor: this.clave, operacion }
      );
    }
  }

  // ─────────────────────── operaciones del contrato ───────────────────────
  // Cada una lanza por defecto. Un proveedor implementa solo las que sostiene.

  /** Cadena de opciones de un subyacente. */
  async getOptionChain() { this.exigir('cadena', 'getOptionChain'); }

  /** Operaciones individuales (time & sales). */
  async getTrades() { this.exigir('operaciones', 'getTrades'); }

  /** Serie de cotizaciones bid/ask con marca temporal. */
  async getQuotes() { this.exigir('cotizaciones', 'getQuotes'); }

  /** Interés abierto por contrato. */
  async getOpenInterest() { this.exigir('interesAbierto', 'getOpenInterest'); }

  /** Series históricas por contrato. */
  async getHistoricalData() { this.exigir('historico', 'getHistoricalData'); }

  /** Volatilidad implícita por contrato. */
  async getIV() { this.exigir('volatilidadImplicita', 'getIV'); }

  /** Griegas por contrato. */
  async getGreeks() { this.exigir('griegas', 'getGreeks'); }

  /** Retrato del proveedor: qué cubre, con qué calidad y qué le falta. */
  describir() {
    return {
      clave: this.clave,
      nombre: this.nombre,
      configurado: this.configurado,
      nota: this.nota,
      capacidades: Object.fromEntries(CAPACIDADES.map((c) => [c, this.admite(c)])),
      ausentes: CAPACIDADES.filter((c) => !this.admite(c)),
      operaciones: Object.fromEntries(
        Object.entries(OPERACIONES).map(([op, cap]) => [op, this.admite(cap)])
      ),
      calidades: this.calidades,
    };
  }
}

/**
 * Error del proveedor. Distingue tres situaciones que exigen respuestas distintas:
 * carencia estructural, falta de configuración e incidencia pasajera.
 */
class ErrorProveedorOpciones extends Error {
  constructor(mensaje, {
    capacidad = null, proveedor = null, operacion = null,
    status = null, transitorio = false, configuracion = false,
  } = {}) {
    super(mensaje);
    this.name = 'ErrorProveedorOpciones';
    this.capacidad = capacidad;
    this.proveedor = proveedor;
    this.operacion = operacion;
    this.status = status;
    this.transitorio = transitorio;
    this.configuracion = configuracion;
  }
}

module.exports = { ProveedorOpciones, ErrorProveedorOpciones, CAPACIDADES, OPERACIONES };
