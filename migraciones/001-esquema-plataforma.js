'use strict';

/**
 * 001 · Esquema de plataforma de investment management.
 *
 * ═══ Qué hace y qué NO hace ═══
 *
 * Crea nueve tablas nuevas. NO toca ninguna existente: `informes` conserva sus
 * 23 columnas intactas, `peso_cartera`, `precio_compra`, `take_profit`,
 * `stop_loss` y `en_cartera` incluidas. NO mueve datos. NO cambia el motor.
 *
 * Al terminar, la aplicación se comporta exactamente igual que antes, porque
 * ningún servicio, ninguna ruta y ninguna prueba consultan estas tablas. Están
 * ahí y están vacías. Esa es toda la intención de esta migración: que el esquema
 * exista y esté validado antes de que nada dependa de él.
 *
 * ═══ La regla que gobierna el reparto ═══
 *
 * Cada hecho vive en un solo sitio (regla 9 de CLAUDE.md). De ahí que
 * `posiciones` no tenga cantidad, ni coste, ni peso, ni resultado: todo eso se
 * deriva de `transacciones`, y guardarlo además aquí daría dos respuestas para
 * la misma pregunta sin nada que obligue a que coincidan.
 *
 * Ver METODOLOGIA.md §1 y §2 para el desarrollo, que es donde se decide; esto
 * solo lo ejecuta.
 */

const id = '001';
const nombre = 'esquema-plataforma';

function arriba(db) {
  /* ── carteras ────────────────────────────────────────────────────────────
     No estaba en la lista de ocho y hace falta igualmente: es el denominador.
     Peso, ROIC, capital desplegado y liquidez son todos cocientes contra el
     patrimonio de UNA cartera, y hoy ese número es `BASE_INDICE = 100` escrito
     dentro de `cartera.js`. Mientras siga ahí, la cifra de la que cuelgan todas
     las demás es un literal del código y no un dato.

     Nace VACÍA a propósito: `capital_inicial` es una decisión pendiente
     —capital real contra base 100 nominal— y rellenarla con un valor supuesto
     sería inventar el dato más estructural de la plataforma (regla 1). */
  db.exec(`
    CREATE TABLE carteras (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre          TEXT    NOT NULL,
      capital_inicial REAL    NOT NULL CHECK (capital_inicial > 0),
      divisa_base     TEXT    NOT NULL,
      fecha_inicio    TEXT    NOT NULL,
      metodo_coste    TEXT    NOT NULL DEFAULT 'MEDIO'
                              CHECK (metodo_coste IN ('MEDIO', 'FIFO')),
      creado_en       TEXT    NOT NULL DEFAULT (datetime('now')),
      actualizado_en  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  /* ── usuarios ────────────────────────────────────────────────────────────
     Solo el esquema. No hay autenticación todavía y esta migración no la
     introduce: las claves ajenas `autor_id` de más abajo nacen admitiendo NULL,
     y NULL significa «anterior a la identidad», no «autor desconocido».

     `algoritmo_hash` viaja junto al hash porque el día que se cambie de
     algoritmo habrá filas de los dos tipos conviviendo, y sin esta columna no
     habría forma de saber cuál verificar contra cuál. */
  db.exec(`
    CREATE TABLE usuarios (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      nombre          TEXT    NOT NULL,
      hash_credencial TEXT,
      algoritmo_hash  TEXT,
      rol             TEXT    NOT NULL DEFAULT 'LECTOR'
                              CHECK (rol IN ('ANALISTA', 'LECTOR')),
      activo          INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
      creado_en       TEXT    NOT NULL DEFAULT (datetime('now')),
      actualizado_en  TEXT    NOT NULL DEFAULT (datetime('now')),
      ultimo_acceso   TEXT
    )
  `);

  /* ── companias ───────────────────────────────────────────────────────────
     Deja de derivarse de `informes`. Con tabla propia, una compañía puede
     existir sin tesis y sin posición —cobertura en preparación, seguimiento sin
     convicción—, que hoy es imposible de representar.

     `simbolo_mercado` separado de `ticker` es lo que mantiene intercambiable al
     proveedor: el ticker es cómo la llama la casa; el símbolo, cómo hay que
     pedirla (^GSPC, BRK-B). Cambiar de proveedor no debe obligar a renombrar
     compañías. */
  db.exec(`
    CREATE TABLE companias (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker           TEXT    NOT NULL UNIQUE,
      nombre           TEXT    NOT NULL,
      exchange         TEXT,
      mic              TEXT,
      isin             TEXT,
      sector           TEXT,
      industria        TEXT,
      pais             TEXT,
      divisa           TEXT    NOT NULL DEFAULT 'USD',
      descripcion      TEXT,
      simbolo_mercado  TEXT,
      estado_cobertura TEXT    NOT NULL DEFAULT 'ACTIVA'
                               CHECK (estado_cobertura IN ('ACTIVA', 'SEGUIMIENTO', 'RETIRADA')),
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now')),
      actualizado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec('CREATE INDEX idx_companias_sector ON companias(sector)');
  db.exec('CREATE INDEX idx_companias_cobertura ON companias(estado_cobertura)');
  db.exec('CREATE INDEX idx_companias_simbolo ON companias(simbolo_mercado)');

  /* ── tesis ───────────────────────────────────────────────────────────────
     `take_profit` y `stop_loss` viven aquí, y cambian de naturaleza respecto a
     lo que hoy hacen en `informes`: son niveles DECLARADOS por el analista, no
     órdenes que el motor ejecute. Una tesis puede tener el take profit superado
     y la posición abierta —eso es información sobre disciplina de ejecución, y
     hoy no se puede expresar—. Ver METODOLOGIA.md §5.

     Los tres escenarios nacen NULL y no cadena vacía: una tesis sin caso
     bajista escrito no tiene caso bajista, que es el tercer estado. */
  db.exec(`
    CREATE TABLE tesis (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      compania_id       INTEGER NOT NULL REFERENCES companias(id) ON DELETE RESTRICT,
      titulo            TEXT    NOT NULL,
      estado            TEXT    NOT NULL DEFAULT 'BORRADOR'
                                CHECK (estado IN ('BORRADOR','PUBLICADA','EN_REVISION','CERRADA','INVALIDADA')),
      fecha_publicacion TEXT,
      caso_inversion    TEXT,
      caso_alcista      TEXT,
      caso_base         TEXT,
      caso_bajista      TEXT,
      precio_alcista    REAL,
      precio_base       REAL,
      precio_bajista    REAL,
      valoracion_metodo TEXT    CHECK (valoracion_metodo IS NULL OR
                                valoracion_metodo IN ('DCF','MULTIPLOS','SUMA_PARTES','ACTIVOS')),
      valoracion_notas  TEXT,
      precio_objetivo   REAL,
      take_profit       REAL,
      stop_loss         REAL,
      horizonte_meses   INTEGER,
      conviccion        TEXT    CHECK (conviccion IS NULL OR conviccion IN ('ALTA','MEDIA','BAJA')),
      riesgos           TEXT,
      recomendacion     TEXT,
      nivel_acceso      TEXT    NOT NULL DEFAULT 'publico',
      autor_id          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      creado_en         TEXT    NOT NULL DEFAULT (datetime('now')),
      actualizado_en    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec('CREATE INDEX idx_tesis_compania ON tesis(compania_id)');
  db.exec('CREATE INDEX idx_tesis_estado ON tesis(estado)');
  db.exec('CREATE INDEX idx_tesis_fecha ON tesis(fecha_publicacion DESC)');

  /* ── posiciones ──────────────────────────────────────────────────────────
     La tabla más corta del modelo, y es lo que se pretende. Identidad y ciclo
     de vida; ni una cifra de dinero.

     `abierta_en`, `cerrada_en` y `estado` SÍ son columnas pero NO son entrada
     manual: los escribe el servicio a partir de las transacciones. Están para
     poder filtrar sin recorrer el libro entero, no porque sean dato propio.

     El índice parcial impide dos posiciones abiertas de la misma compañía en la
     misma cartera —eso es una posición con dos compras—, pero deja convivir una
     cerrada con otra nueva, que es una reentrada y merece línea propia. */
  db.exec(`
    CREATE TABLE posiciones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      cartera_id  INTEGER NOT NULL REFERENCES carteras(id)  ON DELETE RESTRICT,
      compania_id INTEGER NOT NULL REFERENCES companias(id) ON DELETE RESTRICT,
      tesis_id    INTEGER          REFERENCES tesis(id)     ON DELETE SET NULL,
      abierta_en  TEXT    NOT NULL,
      cerrada_en  TEXT,
      estado      TEXT    NOT NULL DEFAULT 'ABIERTA'
                          CHECK (estado IN ('ABIERTA','PARCIAL','CERRADA')),
      vehiculo    TEXT,
      divisa      TEXT    NOT NULL DEFAULT 'USD',
      notas       TEXT,
      creado_en   TEXT    NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (cerrada_en IS NULL OR estado = 'CERRADA')
    )
  `);
  db.exec(`
    CREATE UNIQUE INDEX idx_posiciones_abierta_unica
      ON posiciones(cartera_id, compania_id) WHERE estado <> 'CERRADA'
  `);
  db.exec('CREATE INDEX idx_posiciones_cartera ON posiciones(cartera_id)');
  db.exec('CREATE INDEX idx_posiciones_tesis ON posiciones(tesis_id)');
  db.exec('CREATE INDEX idx_posiciones_estado ON posiciones(estado)');

  /* ── transacciones ───────────────────────────────────────────────────────
     La entidad que hoy no existe, y la única fuente de cantidad y coste.

     SOLO OPERACIONES REALES. Decisión explícita del 2026-09-06: los cierres que
     hoy deduce el motor al tocar el take profit NO entran aquí, ni siquiera
     etiquetados. Admitir una sola fila deducida convertiría esta tabla en un
     sitio donde hay que leer la etiqueta antes de fiarse de la fila. El track
     record de modelo se conserva aparte y se rotula. Ver METODOLOGIA.md §11.

     Inmutable: no se edita ni se borra. Un error se corrige con un AJUSTE que lo
     compensa. `ON DELETE RESTRICT` desde posiciones es parte de lo mismo — no
     debe haber un clic capaz de borrar el libro de una compañía.

     `comisiones` es NOT NULL DEFAULT 0 y no admite NULL: cero comisión es un
     hecho («no me cobraron»), no una ausencia, y esa distinción es la regla de
     los tres estados aplicada aquí. */
  db.exec(`
    CREATE TABLE transacciones (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      posicion_id        INTEGER NOT NULL REFERENCES posiciones(id) ON DELETE RESTRICT,
      tipo               TEXT    NOT NULL
                                 CHECK (tipo IN ('COMPRA','VENTA','DIVIDENDO','COMISION','SPLIT','AJUSTE')),
      fecha              TEXT    NOT NULL,
      cantidad           REAL,
      precio             REAL,
      comisiones         REAL    NOT NULL DEFAULT 0,
      divisa             TEXT    NOT NULL DEFAULT 'USD',
      tipo_cambio        REAL    CHECK (tipo_cambio IS NULL OR tipo_cambio > 0),
      origen             TEXT    NOT NULL DEFAULT 'MANUAL'
                                 CHECK (origen IN ('MANUAL','IMPORTADO','MIGRADO')),
      referencia_externa TEXT,
      notas              TEXT,
      autor_id           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      creado_en          TEXT    NOT NULL DEFAULT (datetime('now')),

      -- Impacto en caja, en divisa base y con signo. Columna GENERADA: es una
      -- consecuencia aritmética de las otras, de modo que no puede discrepar de
      -- ellas ni quedarse sin actualizar. VIRTUAL porque se recalcula al leer y
      -- no ocupa; la cuenta es trivial.
      valor_total        REAL GENERATED ALWAYS AS (
        CASE tipo
          WHEN 'COMPRA'    THEN -(COALESCE(cantidad,0) * COALESCE(precio,0) * COALESCE(tipo_cambio,1)) - comisiones
          WHEN 'VENTA'     THEN  (COALESCE(cantidad,0) * COALESCE(precio,0) * COALESCE(tipo_cambio,1)) - comisiones
          WHEN 'DIVIDENDO' THEN  (COALESCE(cantidad,0) * COALESCE(precio,0) * COALESCE(tipo_cambio,1)) - comisiones
          WHEN 'COMISION'  THEN -comisiones
          WHEN 'SPLIT'     THEN 0
          WHEN 'AJUSTE'    THEN  (COALESCE(cantidad,0) * COALESCE(precio,0) * COALESCE(tipo_cambio,1)) - comisiones
        END
      ) VIRTUAL,

      -- Una compra sin cantidad o sin precio no es una compra.
      CHECK (tipo NOT IN ('COMPRA','VENTA') OR (cantidad IS NOT NULL AND cantidad > 0 AND precio IS NOT NULL)),
      CHECK (tipo <> 'SPLIT' OR (cantidad IS NOT NULL AND cantidad > 0))
    )
  `);
  db.exec('CREATE INDEX idx_transacciones_posicion ON transacciones(posicion_id)');
  db.exec('CREATE INDEX idx_transacciones_fecha ON transacciones(fecha)');
  db.exec('CREATE INDEX idx_transacciones_tipo ON transacciones(tipo)');
  /* Hace idempotente la importación desde un bróker: reimportar el mismo
     extracto no duplica operaciones. Parcial porque las manuales no llevan
     referencia y SQLite admite múltiples NULL, pero no múltiples iguales. */
  db.exec(`
    CREATE UNIQUE INDEX idx_transacciones_referencia
      ON transacciones(referencia_externa) WHERE referencia_externa IS NOT NULL
  `);

  /* ── precios ─────────────────────────────────────────────────────────────
     Histórico diario por símbolo y sesión, con la restricción que evita
     duplicados. Convierte la descarga completa que hoy se repite cada 30
     minutos en una incremental.

     `maximo` y `minimo` hacen falta de verdad, no por completitud: la lógica de
     take profit y stop loss del motor actual los usa. `proveedor` permite
     auditar una revisión de precio; `real` distingue sesión de mercado de
     relleno por alineación de calendarios, distinción que el motor ya hace. */
  db.exec(`
    CREATE TABLE precios (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      simbolo   TEXT    NOT NULL,
      sesion    TEXT    NOT NULL,
      apertura  REAL,
      maximo    REAL,
      minimo    REAL,
      cierre    REAL,
      volumen   INTEGER,
      divisa    TEXT    NOT NULL DEFAULT 'USD',
      proveedor TEXT    NOT NULL,
      real      INTEGER NOT NULL DEFAULT 1 CHECK (real IN (0, 1)),
      creado_en TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (simbolo, sesion)
    )
  `);
  db.exec('CREATE INDEX idx_precios_simbolo_sesion ON precios(simbolo, sesion DESC)');

  /* ── instantaneas_cartera ────────────────────────────────────────────────
     Un hecho sobre una fecha cerrada, y por eso inmutable: si se reescribiera
     cuando un proveedor revisa un precio, la serie histórica cambiaría bajo los
     pies de quien la miró ayer.

     `aportaciones` y `reembolsos` no son adorno: sin ellos el TWR no se puede
     calcular, porque no habría forma de separar rendimiento de flujo. Hoy valen
     cero —capital fijo— y aun así se guardan, porque el día que entre capital la
     serie anterior tiene que seguir siendo interpretable. */
  db.exec(`
    CREATE TABLE instantaneas_cartera (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      cartera_id          INTEGER NOT NULL REFERENCES carteras(id) ON DELETE CASCADE,
      fecha               TEXT    NOT NULL,
      nav                 REAL    NOT NULL,
      caja                REAL    NOT NULL,
      capital_desplegado  REAL    NOT NULL,
      aportaciones        REAL    NOT NULL DEFAULT 0,
      reembolsos          REAL    NOT NULL DEFAULT 0,
      posiciones_abiertas INTEGER NOT NULL DEFAULT 0,
      calculado_en        TEXT    NOT NULL DEFAULT (datetime('now')),
      version_motor       TEXT,
      UNIQUE (cartera_id, fecha)
    )
  `);
  db.exec('CREATE INDEX idx_instantaneas_fecha ON instantaneas_cartera(cartera_id, fecha DESC)');

  /* ── catalizadores_tesis ─────────────────────────────────────────────────
     El catalizador que DECLARA un analista, atado a su tesis. No sustituye a la
     agenda de `src/catalizadores/`, que deriva de vencimientos de opciones,
     fechas de informe y prensa: son dos hechos distintos —lo que el analista
     espera contra lo que el mercado publica con fecha cierta— y la agenda tendrá
     que decir de cuál viene cada fila.

     `certeza_fecha` es obligatoria, y ese es el punto: un catalizador sin fecha
     confirmada se declara estimado o sin fecha, nunca se le pone una aproximada
     con aspecto de exacta. */
  db.exec(`
    CREATE TABLE catalizadores_tesis (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      tesis_id       INTEGER NOT NULL REFERENCES tesis(id) ON DELETE CASCADE,
      titulo         TEXT    NOT NULL,
      descripcion    TEXT,
      fecha_estimada TEXT,
      certeza_fecha  TEXT    NOT NULL DEFAULT 'SIN_FECHA'
                             CHECK (certeza_fecha IN ('CONFIRMADA','ESTIMADA','SIN_FECHA')),
      impacto        TEXT    CHECK (impacto IS NULL OR impacto IN ('ALTO','MEDIO','BAJO')),
      estado         TEXT    NOT NULL DEFAULT 'PENDIENTE'
                             CHECK (estado IN ('PENDIENTE','CUMPLIDO','DESCARTADO')),
      creado_en      TEXT    NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT    NOT NULL DEFAULT (datetime('now')),
      CHECK (certeza_fecha = 'SIN_FECHA' OR fecha_estimada IS NOT NULL)
    )
  `);
  db.exec('CREATE INDEX idx_catalizadores_tesis ON catalizadores_tesis(tesis_id)');
  db.exec('CREATE INDEX idx_catalizadores_fecha ON catalizadores_tesis(fecha_estimada)');
}

/**
 * Reversión. Orden inverso al de creación por las claves ajenas: primero lo que
 * apunta, después lo apuntado. Los índices caen con su tabla.
 *
 * Es segura porque estas tablas nacen vacías y nada las lee. Dejará de serlo en
 * cuanto contengan operaciones reales, y para entonces revertir 001 tendrá que
 * exigir una copia previa.
 */
function abajo(db) {
  for (const tabla of [
    'catalizadores_tesis',
    'instantaneas_cartera',
    'precios',
    'transacciones',
    'posiciones',
    'tesis',
    'companias',
    'usuarios',
    'carteras',
  ]) {
    db.exec(`DROP TABLE IF EXISTS ${tabla}`);
  }
}

module.exports = { id, nombre, arriba, abajo };
