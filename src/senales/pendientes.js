'use strict';

/**
 * Señales cuya fuente de datos todavía no está conectada.
 *
 * Se declaran aquí con la misma forma que las operativas, de modo que el radar las
 * presenta con su sitio reservado y su motivo explícito. No devuelven lectura
 * alguna: preferimos un «pendiente» honesto a una cifra fabricada.
 *
 * Para activar cualquiera de ellas basta con dotarla de un `calcular` que consulte
 * su fuente; ni el radar ni el cliente necesitan cambios.
 */

/** Construye una señal sin fuente, con la explicación de qué le falta. */
function pendiente({ clave, titulo, familia, descripcion, destino, requiere }) {
  return {
    clave,
    titulo,
    familia,
    descripcion,
    destino,
    requiere,
    async calcular() {
      return { disponible: false, motivo: requiere, lecturas: [], pendiente: true };
    },
  };
}

const institucional = pendiente({
  clave: 'institucional',
  titulo: 'Institutional positioning',
  familia: 'Posicionamiento',
  descripcion: 'Variación de posiciones declaradas por institucionales',
  destino: null,
  requiere: 'Requiere la fuente de declaraciones 13F',
});

const catalizador = pendiente({
  clave: 'catalizador',
  titulo: 'Catalysts',
  familia: 'Agenda',
  descripcion: 'Resultados y eventos próximos de los valores en cobertura',
  destino: null,
  requiere: 'Requiere un calendario de eventos corporativos',
});

module.exports = { institucional, catalizador, pendiente };
