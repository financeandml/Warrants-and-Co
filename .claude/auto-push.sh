#!/usr/bin/env bash
# Sube a GitHub lo que quede pendiente al terminar cada tarea (hook Stop).
#
# Dos pasos, en este orden:
#   1. Si hay cambios SIN commitear, los commitea. Es una red de seguridad:
#      lo normal es que el commit lo haya hecho ya quien trabajaba, con un
#      mensaje que explique el porque. El generico solo aparece si algo se escapo.
#   2. Si hay commits locales por delante del remoto, los empuja.
#
# Nunca falla ruidosamente: un error de red deja el trabajo commiteado en local
# y lo dice, en vez de romper la sesion.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 0
cd "$REPO" || exit 0

# Escapa para JSON con expansion de bash, NO con sed: los mensajes llevan rutas
# y parentesis, y ahi sed aborta con "unknown option to `s'" y emite
# {"systemMessage": } -- un JSON vacio que el harness descarta en silencio, de
# modo que el aviso se pierde justo en el caso en que mas importa (credenciales).
#
# Y el patron va en VARIABLE, no escrito en la propia expansion. Esto no es
# estilo: `${s//\/\\}` no dobla las barras invertidas y ademas se COME las
# secuencias `/\`, porque dentro de las comillas bash consume la barra antes de
# que la expansion la vea. Comprobado con `a\b "c" /\ d`, que esa forma convierte
# en `a\b \"c\"  d` -- barras sin doblar y `/\` desaparecido. Con las variables
# sale `a\b \"c\" /\ d`, que es lo correcto.
msg() {
  local s="$1" bs='\' q='"'
  s="${s//"$bs"/"$bs$bs"}"
  s="${s//"$q"/"$bs$q"}"
  printf '{"systemMessage": "%s"}\n' "$s"
}

SECRETOS='secrets\.toml$|(^|/)\.env$|\.pem$|\.p12$|_rsa$|\.key$'

RAMA="$(git branch --show-current 2>/dev/null)" || exit 0
if [ "$RAMA" != "main" ]; then
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    msg "Auto-push omitido: estas en la rama '$RAMA', no en main. Los cambios siguen sin subir."
  fi
  exit 0
fi

# ---- 1. Commitear lo que quede suelto -------------------------------------
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  git add -A >/dev/null 2>&1

  # Guardia de credenciales: redundante con .gitignore, y por eso mismo util.
  # El .gitignore de QUANTUM se escribio DESPUES del primer `git add`, asi que
  # hubo ficheros preparados que el propio .gitignore decia excluir. Automatizar
  # el push sin esta comprobacion convierte ese descuido en una publicacion.
  if git diff --cached --name-only | grep -qiE "$SECRETOS"; then
    COLADO="$(git diff --cached --name-only | grep -iE "$SECRETOS" | head -3 | tr '\n' ' ')"
    git reset -q >/dev/null 2>&1
    msg "AUTO-PUSH ABORTADO: el commit incluia credenciales ($COLADO). No se ha subido nada."
    exit 0
  fi

  N="$(git diff --cached --name-only | wc -l | tr -d ' ')"
  LISTA="$(git diff --cached --name-only | head -3 | tr '\n' ' ')"
  [ "$N" -gt 3 ] && LISTA="$LISTA y $((N - 3)) mas"
  git commit -q \
    -m "Cambios sin commitear al cerrar la tarea: $LISTA" \
    -m "Commit automatico del hook Stop. Que exista este mensaje generico en vez de
uno que explique el porque significa que algo quedo fuera del commit principal:
merece una mirada." >/dev/null 2>&1 || exit 0
fi

# ---- 2. Rebasar sobre el remoto y empujar ---------------------------------
# Con dos personas en main, `git push` a secas falla en cuanto la otra sube algo.
# Y fallar aqui no es inocuo: deja el trabajo commiteado en local mientras las dos
# ramas divergen en silencio, que es justo lo que nadie mira hasta que duele. El
# orden correcto es siempre el mismo: traer, rebasar, empujar.
#
# Con reintento, ademas: entre tu rebase y tu push caben los commits de la otra
# persona, asi que un push puede perder la carrera aunque el rebase acabe de
# dejarte al dia. Tres intentos; si los tres pierden, no es una carrera, es que
# algo va mal, y entonces conviene avisar en vez de seguir girando.
INTENTOS=3
for _ in $(seq 1 "$INTENTOS"); do
  if ! timeout 90 git fetch -q origin main >/dev/null 2>&1; then
    msg "Auto-push: no se pudo contactar con GitHub. El trabajo esta commiteado en local, sin subir."
    exit 0
  fi

  PENDIENTES="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
  [ "$PENDIENTES" -eq 0 ] && exit 0

  DETRAS="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
  if [ "$DETRAS" -gt 0 ]; then
    if ! git rebase -q origin/main >/dev/null 2>&1; then
      # Nombrar los ficheros ANTES de abortar: despues del abort ya no hay
      # conflicto que listar, y un aviso que dice "hubo un choque" sin decir
      # donde obliga a repetir a mano el trabajo que el script acaba de hacer.
      CHOCAN="$(git diff --name-only --diff-filter=U 2>/dev/null | head -5 | tr '\n' ' ')"
      git rebase --abort >/dev/null 2>&1
      msg "AUTO-PUSH DETENIDO: tu trabajo y el de origin/main chocan en: ${CHOCAN:-(sin detalle)}. No se ha subido nada y no se ha perdido nada: tus commits siguen aqui y el arbol esta como lo dejaste. Resuelvelo tu con: git pull --rebase origin main"
      exit 0
    fi
    PENDIENTES="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
  fi

  if timeout 90 git push -q origin main >/dev/null 2>&1; then
    if [ "$DETRAS" -gt 0 ]; then
      msg "Subido a GitHub: $PENDIENTES commit(s) en main, rebasados sobre $DETRAS commit(s) que ya estaban en el remoto."
    else
      msg "Subido a GitHub: $PENDIENTES commit(s) en main."
    fi
    exit 0
  fi
done

msg "$PENDIENTES commit(s) hechos en local, pero el push perdio la carrera $INTENTOS veces seguidas. O no hay conexion, o el remoto se mueve muy deprisa. Pendientes de subir: reintenta con git pull --rebase origin main y git push."
exit 0
