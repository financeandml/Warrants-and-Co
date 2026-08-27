# Trabajar dos personas en Warrants & Co.

Los dos escribimos en `main`. No hay ramas por persona ni Pull Requests: se sube a
menudo, se baja al empezar, y quien pierde la carrera rebasa. Este fichero explica
qué lo sostiene y qué hace falta de cada uno.

---

## El ciclo

```
   abres sesión  ──▶  sincronizar.sh baja lo del otro y te dice qué tocó
                      │
                      ▼
   trabajas      ──▶  commits pequeños, seguidos
                      │
                      ▼
   cierras tarea ──▶  auto-push.sh:  fetch → rebase → push  (3 intentos)
                      │
                      ├─ sube ────────▶ el otro lo ve al abrir su sesión
                      └─ choca ───────▶ aborta, NO sube, y te dice en qué ficheros
```

Las dos mitades son hooks de Claude Code y viven en [`.claude/`](.claude/). Ninguna
inventa nada: si algo no se puede hacer sin riesgo, se para y lo dice.

## Arranque (solo la primera vez)

```bash
git clone https://github.com/financeandml/Warrants-and-Co.git
cd Warrants-and-Co
npm install

cp .env.example .env          # y rellena WARRANTS_CLAVE
cp .claude/settings.ejemplo.json .claude/settings.local.json
```

`settings.local.json` está en `.gitignore` a propósito: el script sí se comparte, pero
**tenerlo encendido es decisión de cada máquina**. Por eso hay plantilla y no se hereda.

Las rutas de la plantilla van **relativas** —`bash .claude/sincronizar.sh`—, y eso es
deliberado: los hooks se ejecutan con el directorio del proyecto como directorio de
trabajo, y además cada script se relocaliza solo a partir de su propia ruta. Una ruta
absoluta funcionaría en una máquina y rompería en la otra.

Si en la tuya el hook no llega a dispararse, pon la ruta absoluta **en forma MSYS**
—barras normales y el disco como `/c/`—, nunca en forma Windows:

```bash
bash '/c/Users/TUNOMBRE/ruta/al/repo/.claude/auto-push.sh'
```

Comprueba también que Git sabe quién eres, porque `sincronizar.sh` anuncia los cambios
por autor y «unknown» no le dice nada a nadie:

```bash
git config user.name "Tu Nombre"
git config user.email "tu@correo"
```

### Y comprueba que de verdad se ha montado

Este paso no es opcional, y el motivo es que **el fallo aquí es silencioso**: si el
hook no llega a dispararse, no verás ningún error. Verás exactamente lo mismo que si
todo fuera bien —nada—, mientras crees tener la sincronización montada y no la tienes.

Primero, que el script corre en tu máquina. Desde la raíz del repositorio:

```bash
bash .claude/sincronizar.sh; echo "salida: $?"
```

Si estás al día, el script **calla** y responde `salida: 0`. El silencio es el
resultado correcto, no una señal de que no ha hecho nada. Si hubiera novedades,
imprimiría una línea de JSON diciendo qué bajó y de quién.

Segundo, que Claude Code lo dispara: **abre una sesión nueva y mira si aparece
«Buscando novedades...»**. Si no aparece, el hook no está activo —revisa la nota de
las rutas de arriba— y díselo al otro antes de ponerte a trabajar.

Y de paso, que subir funciona: haz un cambio de nada, cierra la tarea y mira si sale
«Subido a GitHub». Vale más un commit tonto hoy que descubrir el lunes que llevas
tres días sin subir nada.

## Las cuatro reglas que de verdad evitan el choque

Lo de arriba **gestiona** los conflictos. Esto es lo que hace que casi no los haya.

**1. Commits pequeños y frecuentes.** Con rebase, lo caro es tardar. Diez commits de
diez líneas se rebasan solos; uno de quinientas se rebasa a mano y de noche. Si dudas
entre commitear ahora o al terminar, commitea ahora.

**2. `es.js` y `en.js` viajan en el mismo commit, siempre.** Son un solo hecho contado
dos veces. Si uno sube `es.js` y el otro `en.js`, el rebase los junta sin quejarse y la
interfaz queda con una clave sin traducir, que es de los fallos que no se ven en
pantalla —justo la clase que `CLAUDE.md` lleva tres veces persiguiendo.

**3. Avisad antes de entrar en los dos monolitos.** Aquí es donde caerán los conflictos
de verdad, y no por casualidad: son los ficheros más largos y los más tocados.

| Fichero | Líneas |
|---|---|
| [`public/estilos.css`](public/estilos.css) | ~3.700 |
| [`public/app.js`](public/app.js) | ~3.600 |
| [`public/index.html`](public/index.html) | ~1.500 |

Un mensaje de treinta segundos —«voy a estar en `app.js` esta tarde»— cuesta menos que
cualquier rebase de los que evita.

**4. Repartíos por área, no por fichero.** Uno en extracción, otro en cartera; uno en
señales, otro en la portada. Dos personas en la misma área acaban en el mismo fichero
aunque empiecen en sitios distintos.

## Cuando el hook se para

No es una avería: es el hook haciendo su trabajo. **Tus commits están intactos y el
árbol como lo dejaste** —el rebase se aborta antes de tocar nada—. El aviso nombra los
ficheros. Resuelve tú:

```bash
git pull --rebase origin main
#  ... arregla los ficheros que nombraba el aviso ...
git add <esos ficheros>
git rebase --continue
git push origin main
```

Y si te lías, `git rebase --abort` te devuelve al punto de partida. Siempre.

## Lo que vigila GitHub

[`.github/workflows/pruebas.yml`](.github/workflows/pruebas.yml) corre en cada push a
`main`, en dos niveles separados:

- **Autónomas** — ocho baterías sin navegador. Segundos.
- **Con navegador** — siembra base aislada, levanta servidor y pasa las nueve de
  Playwright.

Van en dos *jobs* distintos y no en dos pasos del mismo: si el navegador se cae por
algo suyo, el nivel rápido sigue dando veredicto.

Nadie revisa antes de que subas, así que **el CI es el único que se interpone**. Si se
pone rojo, es tuyo hasta que vuelva a verde: el otro está construyendo encima.

## Dos avisos

**La colaboración va por GitHub. Nunca por OneDrive.** Este repositorio vive dentro de
una carpeta sincronizada. Compartir esa carpeta para «trabajar a la vez» corrompe el
`.git` de los dos a la vez: dos clientes escribiendo el mismo índice y los mismos
*packfiles* no es colaboración, es carrera de escritura. Se clona, y punto.

**Esto no es edición en tiempo real.** Ves lo del otro en cuanto abres sesión, no
mientras teclea. Si de verdad necesitáis los dos en el mismo fichero a la vez —repasar
`app.js` juntos, depurar una prueba a cuatro ojos—, eso es **VS Code Live Share**: una
sola copia, una sola máquina anfitriona, cero commits de por medio. Es complementario a
esto, no un sustituto.

---

## Lo que no se sube, y por qué

Ya está en [`.gitignore`](.gitignore); se repite aquí porque es lo que más duele
descubrir tarde:

- `data/warrants.db` y sus `-wal`/`-shm` — la base es de cada máquina. Versionar un
  SQLite entre dos personas es un conflicto binario irresoluble en cada push.
- `.env` — credenciales. La plantilla es `.env.example` y esa **sí** se versiona.
- `.claude/settings.local.json` — por máquina, como se explica arriba.
