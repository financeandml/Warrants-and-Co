#!/usr/bin/env bash
# Sube a GitHub lo que quede pendiente al terminar cada tarea (hook Stop).
#
# Dos pasos, en este orden:
#   1. Si hay cambios SIN commitear, los commitea. Es una red de seguridad:
#      lo normal es que el commit lo haya hecho ya Claude con un mensaje que
#      explique el porque. Este mensaje generico solo aparece si se escapo algo.
#   2. Si hay commits locales por delante del remoto, los empuja.
#
# Nunca falla ruidosamente: un error de red deja el trabajo commiteado en local
# y lo dice, en vez de romper la sesion.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 0
cd "$REPO" || exit 0

msg() { printf '{"systemMessage": %s}\n' "$(printf '%s' "$1" | sed 's/\/\\/g; s/"/\\"/g; s/^/"/; s/$/"/')"; }

RAMA="$(git branch --show-current 2>/dev/null)" || exit 0
if [ "$RAMA" != "main" ]; then
  [ -n "$(git status --porcelain 2>/dev/null)" ] && \
    msg "Auto-push omitido: estas en la rama '$RAMA', no en main. Los cambios siguen sin subir."
  exit 0
fi

# ---- 1. Commitear lo que quede suelto -------------------------------------
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  git add -A 2>/dev/null

  # Guardia de credenciales: si .gitignore fallara, esto lo para igualmente.
  # El .gitignore se escribio DESPUES del primer `git add` de este proyecto, y
  # ahi es exactamente donde se cuelan las claves.
  if git diff --cached --name-only | grep -qiE 'secrets\.toml$|(^|/)\.env$|\.pem$|\.p12$|_rsa$|\.key$'; then
    COLADO="$(git diff --cached --name-only | grep -iE 'secrets\.toml$|(^|/)\.env$|\.pem$|\.p12$|_rsa$|\.key$' | head -3 | tr '\n' ' ')"
    git reset -q
    msg "AUTO-PUSH ABORTADO: el commit incluia credenciales ($COLADO). No se ha subido nada."
    exit 0
  fi

  N="$(git diff --cached --name-only | wc -l | tr -d ' ')"
  LISTA="$(git diff --cached --name-only | head -3 | tr '\n' ' ')"
  [ "$N" -gt 3 ] && LISTA="$LISTA y $((N - 3)) mas"
  git commit -q \
    -m "Cambios sin commitear al cerrar la tarea: $LISTA" \
    -m "Commit automatico del hook Stop. Que exista este mensaje generico en vez
de uno que explique el porque significa que algo quedo fuera del commit
principal -- merece una mirada." 2>/dev/null || exit 0
fi

# ---- 2. Empujar si hay algo por delante del remoto ------------------------
git fetch -q origin main 2>/dev/null
PENDIENTES="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
[ "$PENDIENTES" -eq 0 ] && exit 0

if timeout 90 git push -q origin main 2>/dev/null; then
  msg "Subido a GitHub: $PENDIENTES commit(s) en main."
else
  msg "$PENDIENTES commit(s) hechos en local, pero el push fallo (sin conexion, o el remoto ha avanzado). Pendientes de subir."
fi
exit 0
