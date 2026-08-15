'use strict';

/**
 * Adaptador de cadena de opciones de Nasdaq.
 *
 * Nasdaq ya es proveedor de cotizaciones e histórico del proyecto, de modo que se
 * reutiliza en lugar de incorporar un origen nuevo.
 *
 * ALCANCE — verificado contra el servicio:
 *   Publica  strike, vencimiento, bid, ask, último, volumen e interés abierto,
 *            por separado para calls y puts.
 *   No publica  volatilidad implícita, griegas, multiplicador de contrato ni
 *            operaciones individuales. Son agregados de la sesión, no un
 *            time & sales: no permiten saber quién cruzó contra quién.
 *
 * Todo lo que no publica se devuelve como `null`, nunca como cero.
 */

const { ProveedorOpciones, ErrorProveedorOpciones } = require('../proveedor');
const { CALIDAD } = require('../calidad');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TIMEOUT_MS = 20_000;
const LIMITE_FILAS = 800;

/**
 * Convierte un valor de Nasdaq en número.
 * Nasdaq marca la ausencia de dato con «--», que debe distinguirse de un cero real.
 * @returns {number|null}
 */
function aNumero(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto || texto === '--' || texto === 'N/A') return null;
  const n = Number(texto.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** «August 14, 2026» o «Aug 14» → fecha ISO. */
function aFechaISO(grupo, anioReferencia) {
  if (!grupo) return null;
  const fecha = new Date(`${grupo} 00:00:00 UTC`);
  if (!Number.isNaN(fecha.getTime())) return fecha.toISOString().slice(0, 10);

  // Forma abreviada sin año: se resuelve con el año del grupo vigente.
  const corta = new Date(`${grupo} ${anioReferencia} 00:00:00 UTC`);
  return Number.isNaN(corta.getTime()) ? null : corta.toISOString().slice(0, 10);
}

class ProveedorNasdaq extends ProveedorOpciones {
  constructor() {
    super({
      clave: 'nasdaq',
      nombre: 'Nasdaq',
      // Interés abierto e histórico van dentro de la propia cadena: no hay
      // endpoints separados, de modo que no se declaran como capacidades aparte.
      capacidades: ['cadena', 'interesAbierto'],
      // Agregados del día publicados tras el cierre de sesión.
      calidades: {
        strike: CALIDAD.DIFERIDO,
        vencimiento: CALIDAD.DIFERIDO,
        compra: CALIDAD.DIFERIDO,
        venta: CALIDAD.DIFERIDO,
        ultimo: CALIDAD.DIFERIDO,
        volumen: CALIDAD.DIFERIDO,
        interesAbierto: CALIDAD.DIFERIDO,
        volatilidadImplicita: CALIDAD.NO_DISPONIBLE,
        delta: CALIDAD.NO_DISPONIBLE,
        gamma: CALIDAD.NO_DISPONIBLE,
        theta: CALIDAD.NO_DISPONIBLE,
        vega: CALIDAD.NO_DISPONIBLE,
        multiplicador: CALIDAD.NO_DISPONIBLE,
        precioOperacion: CALIDAD.NO_DISPONIBLE,
        tamanoOperacion: CALIDAD.NO_DISPONIBLE,
        marcaTemporal: CALIDAD.NO_DISPONIBLE,
        mercadoEjecucion: CALIDAD.NO_DISPONIBLE,
      },
      nota:
        'Publica agregados de la sesión por contrato. No incluye volatilidad implícita, ' +
        'griegas ni operaciones individuales.',
    });
  }

  async getOptionChain(simbolo, { desde = null, hasta = null } = {}) {
    this.exigir('cadena', 'getOptionChain');
    const hoy = new Date();
    const inicio = desde ?? hoy.toISOString().slice(0, 10);
    // Un año cubre los vencimientos con liquidez real sin castigar la respuesta.
    const fin = hasta ?? new Date(hoy.getTime() + 365 * 86400000).toISOString().slice(0, 10);

    const url =
      `https://api.nasdaq.com/api/quote/${encodeURIComponent(simbolo)}/option-chain` +
      `?assetclass=stocks&limit=${LIMITE_FILAS}&fromdate=${inicio}&todate=${fin}` +
      '&excode=oprac&callput=callput&money=all&type=all';

    let respuesta;
    try {
      respuesta = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
    } catch (err) {
      throw new ErrorProveedorOpciones(`No se ha podido consultar la cadena: ${err.message}`, {
        proveedor: this.clave, capacidad: 'cadena', transitorio: true,
      });
    }

    if (!respuesta.ok) {
      throw new ErrorProveedorOpciones(`El proveedor respondió ${respuesta.status}`, {
        proveedor: this.clave, capacidad: 'cadena', status: respuesta.status, transitorio: true,
      });
    }

    const cuerpo = await respuesta.json().catch(() => null);
    const datos = cuerpo?.data;
    const filas = datos?.table?.rows;

    if (!Array.isArray(filas) || !filas.length) {
      throw new ErrorProveedorOpciones(`Sin cadena de opciones para ${simbolo}`, {
        proveedor: this.clave, capacidad: 'cadena',
      });
    }

    // Precio del subyacente, tal y como lo rotula Nasdaq junto a la cadena.
    const precioSubyacente = aNumero(String(datos.lastTrade ?? '').match(/\$([\d.,]+)/)?.[1]);

    const contratos = [];
    const vencimientos = [];
    let grupoVigente = null;
    let anioVigente = hoy.getUTCFullYear();

    for (const fila of filas) {
      // Las filas de encabezado abren cada bloque de vencimiento.
      if (fila.expirygroup) {
        grupoVigente = aFechaISO(fila.expirygroup, anioVigente);
        if (grupoVigente) {
          anioVigente = Number(grupoVigente.slice(0, 4));
          if (!vencimientos.includes(grupoVigente)) vencimientos.push(grupoVigente);
        }
        continue;
      }

      const strike = aNumero(fila.strike);
      if (strike === null || !grupoVigente) continue;

      // Un contrato por lado: la fila de Nasdaq agrupa call y put del mismo strike.
      for (const [lado, prefijo] of [['CALL', 'c_'], ['PUT', 'p_']]) {
        const ultimo = aNumero(fila[`${prefijo}Last`]);
        const volumen = aNumero(fila[`${prefijo}Volume`]);
        const interesAbierto = aNumero(fila[`${prefijo}Openinterest`]);

        // Un contrato sin cotización ni actividad no aporta nada a la cadena.
        if (ultimo === null && volumen === null && interesAbierto === null) continue;

        contratos.push({
          simbolo,
          lado,
          strike,
          vencimiento: grupoVigente,
          ultimo,
          variacion: aNumero(fila[`${prefijo}Change`]),
          compra: aNumero(fila[`${prefijo}Bid`]),
          venta: aNumero(fila[`${prefijo}Ask`]),
          volumen,
          interesAbierto,
          // Ausentes en este proveedor. Se declaran para que la interfaz distinga
          // «no publicado» de «cero».
          volatilidadImplicita: null,
          delta: null,
          gamma: null,
          theta: null,
          vega: null,
          multiplicador: null,
        });
      }
    }

    if (!contratos.length) {
      throw new ErrorProveedorOpciones(`La cadena de ${simbolo} llegó sin contratos legibles`, {
        proveedor: this.clave, capacidad: 'cadena',
      });
    }

    return {
      contratos,
      vencimientos: vencimientos.sort(),
      subyacente: { simbolo, precio: precioSubyacente, fuente: this.nombre },
      totalPublicado: datos.totalRecord ?? null,
      // Se advierte del truncamiento para no presentar la cadena como completa.
      truncada: Number(datos.totalRecord ?? 0) > filas.length,
      proveedor: this.clave,
      obtenidaEn: new Date().toISOString(),
    };
  }
}

/** El interés abierto llega dentro de la propia cadena. */
ProveedorNasdaq.prototype.getOpenInterest = async function getOpenInterest(simbolo, opciones) {
  this.exigir('interesAbierto', 'getOpenInterest');
  const cadena = await this.getOptionChain(simbolo, opciones);
  return {
    contratos: cadena.contratos.map((c) => ({
      lado: c.lado, strike: c.strike, vencimiento: c.vencimiento, interesAbierto: c.interesAbierto,
    })),
    obtenidaEn: cadena.obtenidaEn,
    proveedor: this.clave,
  };
};

// Compatibilidad con el nombre anterior del método, aún en uso por el servicio.
ProveedorNasdaq.prototype.obtenerCadena = function obtenerCadena(...args) {
  return this.getOptionChain(...args);
};

module.exports = { ProveedorNasdaq, aNumero, aFechaISO };
