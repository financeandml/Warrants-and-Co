'use strict';

/**
 * Registro de proveedores de opciones.
 *
 * El proveedor activo se elige con `OPCIONES_PROVEEDOR`. Incorporar uno nuevo
 * consiste en registrarlo aquí: la lógica de negocio y la interfaz consultan sus
 * capacidades, de modo que ninguna de las dos necesita cambios.
 *
 * Si el proveedor seleccionado no está configurado, se conserva como *declarado*
 * —para que la plataforma sepa qué cubriría— pero las operaciones se sirven desde
 * el proveedor de respaldo. Así, seleccionar un proveedor sin credenciales nunca
 * deja la aplicación sin datos.
 */

const { ProveedorNasdaq } = require('./nasdaq');
const { ProveedorThetaData } = require('./thetadata');
const { CAPACIDADES, OPERACIONES } = require('../proveedor');

const REGISTRO = new Map([
  ['nasdaq', new ProveedorNasdaq()],
  ['thetadata', new ProveedorThetaData()],
]);

/** Proveedor que sostiene el servicio mientras no haya otro operativo. */
const CLAVE_RESPALDO = 'nasdaq';

const CLAVE_SELECCIONADA = process.env.OPCIONES_PROVEEDOR ?? CLAVE_RESPALDO;

/** El proveedor pedido, esté o no configurado. */
function proveedorSeleccionado() {
  return REGISTRO.get(CLAVE_SELECCIONADA) ?? REGISTRO.get(CLAVE_RESPALDO);
}

/**
 * El proveedor que efectivamente sirve los datos.
 * Coincide con el seleccionado salvo que a este le falte configuración.
 */
function proveedorActivo() {
  const elegido = proveedorSeleccionado();
  if (elegido?.configurado) return elegido;
  return REGISTRO.get(CLAVE_RESPALDO);
}

/** true cuando se está sirviendo desde el respaldo por falta de configuración. */
function enRespaldo() {
  return proveedorSeleccionado()?.clave !== proveedorActivo()?.clave;
}

/**
 * Estado del subsistema: qué proveedor sirve, qué cubre, qué le falta y qué
 * ganaríamos con cada uno de los registrados. Alimenta los rótulos de la interfaz.
 */
function estadoProveedores() {
  const activo = proveedorActivo();
  const seleccionado = proveedorSeleccionado();

  return {
    activo: {
      clave: activo.clave, nombre: activo.nombre, nota: activo.nota,
      configurado: activo.configurado,
    },
    seleccionado: {
      clave: seleccionado.clave, nombre: seleccionado.nombre,
      configurado: seleccionado.configurado,
    },
    enRespaldo: enRespaldo(),
    motivoRespaldo: enRespaldo()
      ? `${seleccionado.nombre} está declarado pero no configurado; se sirve desde ${activo.nombre}.`
      : null,
    capacidades: Object.fromEntries(CAPACIDADES.map((c) => [c, activo.admite(c)])),
    ausentes: CAPACIDADES.filter((c) => !activo.admite(c)),
    operaciones: Object.fromEntries(
      Object.entries(OPERACIONES).map(([op, cap]) => [op, activo.admite(cap)])
    ),
    calidades: activo.calidades,
    // Comparativa: qué aportaría cada proveedor registrado.
    registrados: [...REGISTRO.values()].map((p) => p.describir()),
  };
}

/**
 * Capacidades que se ganarían al configurar el proveedor seleccionado.
 * Permite explicar en la interfaz qué desbloquearía la integración pendiente.
 */
function capacidadesPendientes() {
  const activo = proveedorActivo();
  const seleccionado = proveedorSeleccionado();
  if (!enRespaldo()) return [];
  return seleccionado.capacidades.filter((c) => !activo.admite(c));
}

module.exports = {
  proveedorActivo, proveedorSeleccionado, enRespaldo,
  estadoProveedores, capacidadesPendientes,
  REGISTRO, CLAVE_RESPALDO,
};
