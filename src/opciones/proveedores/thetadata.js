'use strict';

/**
 * ThetaData — esqueleto declarativo. NO REALIZA NINGUNA LLAMADA.
 *
 * Esta pieza existe para dos cosas:
 *
 *   1. Dejar declarado, contra el contrato real, qué cubriría este proveedor. Así
 *      la plataforma puede razonar hoy sobre lo que tendría mañana —el motor de
 *      puntuación sabe qué factores despertarían— sin que exista integración.
 *
 *   2. Permitir probar el intercambio de proveedor de extremo a extremo: se activa
 *      con `OPCIONES_PROVEEDOR=thetadata` y la aplicación entera debe seguir en pie,
 *      degradando con elegancia porque el proveedor se declara «no configurado».
 *
 * Mientras no haya credenciales, toda operación lanza `ErrorProveedorOpciones` con
 * `configuracion: true`. No hay cliente HTTP, ni URL base activa, ni clave.
 *
 * Las capacidades reflejan el plan **Standard** verificado en la investigación
 * previa (tick-level de operaciones y cotizaciones, IV, griegas y 8 años de
 * histórico). El plan Value NO daría `operaciones` ni `griegas`.
 */

const { ProveedorOpciones, ErrorProveedorOpciones } = require('../proveedor');
const { CALIDAD } = require('../calidad');

/**
 * Rutas del proveedor, documentadas para la futura integración.
 * No se invocan: sirven de especificación de lo que habría que conectar.
 */
const RUTAS_PREVISTAS = {
  getOptionChain: 'GET /v3/option/snapshot/chain',
  getTrades: 'GET /v3/option/history/trade',
  getQuotes: 'GET /v3/option/history/quote',
  getOpenInterest: 'GET /v3/option/history/open_interest',
  getHistoricalData: 'GET /v3/option/history/eod',
  getIV: 'GET /v3/option/history/implied_volatility',
  getGreeks: 'GET /v3/option/history/trade_greeks_first_order',
  streaming: 'WS  terminal local · canal de operaciones',
};

/** Lo que haría falta para dar el proveedor por configurado. */
const REQUISITOS = [
  'Suscripción activa (plan Standard o superior)',
  'Terminal local de ThetaData en ejecución',
  'Licencia comercial si los datos se muestran a terceros',
  'Registro propio ante OPRA para redistribución',
];

class ProveedorThetaData extends ProveedorOpciones {
  constructor() {
    // Sin credenciales el proveedor queda declarado pero inoperante. La variable
    // se lee, pero no se usa para conectar: no hay cliente que la consuma.
    const credencial = process.env.THETADATA_CLAVE ?? null;

    super({
      clave: 'thetadata',
      nombre: 'ThetaData',
      capacidades: [
        'cadena',
        'volatilidadImplicita',
        'griegas',
        'operaciones',
        'cotizaciones',
        'contextoCotizacion',
        'interesAbierto',
        'historico',
      ],
      calidades: {
        strike: CALIDAD.TIEMPO_REAL,
        vencimiento: CALIDAD.TIEMPO_REAL,
        compra: CALIDAD.TIEMPO_REAL,
        venta: CALIDAD.TIEMPO_REAL,
        ultimo: CALIDAD.TIEMPO_REAL,
        volumen: CALIDAD.TIEMPO_REAL,
        precioOperacion: CALIDAD.TIEMPO_REAL,
        tamanoOperacion: CALIDAD.TIEMPO_REAL,
        marcaTemporal: CALIDAD.TIEMPO_REAL,
        volatilidadImplicita: CALIDAD.TIEMPO_REAL,
        delta: CALIDAD.TIEMPO_REAL,
        gamma: CALIDAD.TIEMPO_REAL,
        theta: CALIDAD.TIEMPO_REAL,
        vega: CALIDAD.TIEMPO_REAL,
        // El interés abierto lo publica OPRA con el cierre de la sesión anterior:
        // es un dato de ayer, por mucho que se consulte en vivo.
        interesAbierto: CALIDAD.HISTORICO,
        // Pendientes de confirmar con el proveedor.
        multiplicador: CALIDAD.NO_DISPONIBLE,
        mercadoEjecucion: CALIDAD.NO_DISPONIBLE,
      },
      nota:
        'Declarado sobre el plan Standard. Sin integración: no se realiza ninguna ' +
        'llamada mientras no se configure credencial y licencia.',
      configurado: Boolean(credencial),
    });

    this.rutasPrevistas = RUTAS_PREVISTAS;
    this.requisitos = REQUISITOS;
  }

  /**
   * Toda operación se detiene aquí mientras no haya integración. Se sobrescribe
   * `exigir` para que el motivo sea inequívoco y no se confunda con una carencia
   * del proveedor: ThetaData sí publica estos datos, simplemente no está conectado.
   */
  exigir(capacidad, operacion) {
    // Una capacidad que ThetaData tampoco cubriría se reporta como carencia del
    // proveedor; delegar en `super` la resolvería como falta de credencial y
    // ocultaría la distinción.
    if (!this.admite(capacidad)) {
      throw new ErrorProveedorOpciones(
        `${this.nombre} no publica ${capacidad}`,
        { capacidad, proveedor: this.clave, operacion }
      );
    }
    throw new ErrorProveedorOpciones(
      `ThetaData no está integrado: ${operacion} está especificado pero no implementado`,
      { capacidad, proveedor: this.clave, operacion, configuracion: true }
    );
  }

  describir() {
    return {
      ...super.describir(),
      rutasPrevistas: this.rutasPrevistas,
      requisitos: this.requisitos,
      integrado: false,
    };
  }
}

module.exports = { ProveedorThetaData, RUTAS_PREVISTAS, REQUISITOS };
