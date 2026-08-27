'use strict';

/* ============================================================================
   El tercer estado de una prueba: ni bien, ni mal, SIN DATO.

   ═══ Qué problema resuelve ═══

   Una comprobación que mira un dato no puede distinguir dos cosas muy
   distintas si solo tiene dos casillas donde ponerlas:

     · el dato está y es el equivocado          → eso es un FALLO;
     · no hay nada que medir porque la base
       contra la que se corre no trae esas filas → eso NO es un fallo.

   Meterlas en la misma casilla tiene dos formas de salir mal, y las hemos visto
   las dos:

     · en ROJO. `derivadas.js` y `tipografia.js` daban por rota la plataforma
       cuando lo único roto era contra qué instancia se apuntaba. Una prueba
       roja permanente deja de mirarse, y entonces deja de servir.
     · en EXCEPCIÓN. `cartera-interfaz.js` y `portada.js` se caían con un
       `page.waitForFunction: Timeout 60000ms exceeded` y un volcado de pila. Ni
       decían qué comprobación se perdía, ni cuántas quedaban, ni contra qué base
       estaban. Un plantón de sesenta segundos y un stack no son un diagnóstico.

   ═══ Lo que NO hace ═══

   No da por buena la ausencia. Un contenedor que falta ENTERO es una regresión y
   se denuncia como fallo; solo se declara pendiente el contenedor que existe y
   está legítimamente vacío. La diferencia es la razón de ser de todo esto: una
   sección que dejó de pintarse y una sección sin filas se parecen mucho en
   pantalla, y son cosas opuestas.

   Y no se contagia al código de salida: `sinDato` sale con 2, que no es 0. Quien
   encadene baterías en un guion se entera de que algo quedó sin comprobar.

   ═══ Por qué vive aquí y no en cada batería ═══

   Nació dentro de `repintado.js`. Cuando la tercera batería necesitó lo mismo,
   copiarlo habría sido un hecho con tres fuentes —la regla 9 aplicada a las
   propias pruebas—, y con el tiempo tres mecanismos que se parecen sin coincidir.
   ========================================================================= */

/**
 * @param {string} base  La URL contra la que corre la batería. Se imprime en
 *   cada pendiente: es el dato que faltaba para diagnosticarlo sin adivinar.
 */
function crearTercerEstado(base) {
  let ok = 0, fallos = 0, sinDato = 0;

  /** Bien. */
  const acierto = (nombre) => { ok++; console.log(`    OK    ${nombre}`); };

  /** Mal, con lo que se vio. */
  const fallo = (nombre, detalle = '') => {
    fallos++;
    console.log(`    FALLO ${nombre}${detalle ? `  → ${detalle}` : ''}`);
  };

  /** Ni bien ni mal: no había nada que medir, y aquí está por qué. */
  const pendiente = (nombre, motivo) => {
    sinDato++;
    console.log(`    SIN DATO ${nombre}  → ${motivo}\n             base: ${base}`);
  };

  /**
   * Espera una condición que solo se cumple si la base trae datos.
   *
   * Devuelve `true` si se cumplió y `false` si no, y en el segundo caso deja
   * dicho por qué. NUNCA lanza: ése es el punto entero. Quien la llama decide
   * qué se salta, y lo hace con un `if`, que se lee.
   *
   * El plazo no es una espera: es el límite tras el cual se da la condición por
   * perdida. Que sea holgado no ralentiza nada —quien cumple, sigue—.
   *
   * `declarar` existe porque no todas las baterías informan igual: unas escriben
   * según van y otras acumulan y vuelcan al final. Imponerles el formato de aquí
   * intercalaría líneas sueltas en mitad de un volcado ordenado. Lo que se
   * comparte es el MECANISMO —no lanzar, distinguir el vacío de la avería, decir
   * contra qué base—, no el sitio donde cada una escribe.
   */
  const esperarDatos = async (pagina, condicion, arg,
                              { nombre, motivo, plazo = 45000, declarar = pendiente }) => {
    try {
      await pagina.waitForFunction(condicion, arg, { timeout: plazo });
      return true;
    } catch {
      declarar(nombre, motivo);
      return false;
    }
  };

  /**
   * El contenedor ha de existir SIEMPRE. Si falta, la vista dejó de pintarse y
   * eso es una regresión, no una base sin filas.
   *
   * Devuelve `true` si está, y si no lo denuncia como fallo y devuelve `false`.
   */
  const exigirContenedor = async (pagina, selector, nombre) => {
    if (await pagina.locator(selector).count() > 0) return true;
    fallo(`${nombre} · el contenedor ${selector} existe`,
      'no está: la vista dejó de pintarse, que no es lo mismo que no haber datos');
    return false;
  };

  /**
   * Cierra la batería: imprime el recuento y devuelve el código de salida.
   *   0 · todo comprobado y bien
   *   1 · hay fallos
   *   2 · sin fallos, pero algo quedó sin comprobar
   */
  const cerrar = (titulo = '') => {
    const cab = titulo ? `${titulo}: ` : '';
    if (fallos) {
      console.log(`\n  ${cab}${fallos} fallo(s) de ${ok + fallos}` +
        (sinDato ? ` · ${sinDato} sin dato` : '') + '\n');
      return 1;
    }
    if (sinDato) {
      console.log(`\n  ${cab}${ok} correctas · ${sinDato} SIN DATO: no se pudieron comprobar.`);
      console.log(`  La base de ${base} no trae las filas que necesitan. No es un aprobado.\n`);
      return 2;
    }
    console.log(`\n  ${cab}${ok}/${ok} correctas\n`);
    return 0;
  };

  return {
    acierto, fallo, pendiente, esperarDatos, exigirContenedor, cerrar,
    get contadores() { return { ok, fallos, sinDato }; },
  };
}

module.exports = { crearTercerEstado };
