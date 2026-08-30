#!/usr/bin/env bash
# Baja lo que haya subido la otra persona, al empezar la sesion (hook SessionStart).
#
# Es la mitad que faltaba. `auto-push.sh` solo sube, y subir sin bajar es
# exactamente como se diverge: cada uno acumula commits sobre una base vieja y el
# choque aparece entero, de golpe, el dia que a alguien le toca rebasar una semana.
# Bajar al empezar convierte ese choque en muchos roces pequenos, que es lo unico
# que hace llevadero que dos personas escriban en la misma rama.
#
# Tres reglas, y las tres importan:
#   1. Si no hay nada nuevo, calla. Un aviso que sale siempre no se lee.
#   2. Si hay cambios sin commitear, NO toca nada. Rebasar sobre un arbol sucio
#      es la forma mas rapida de perder trabajo que nadie te pidio arriesgar.
#   3. Si el rebase choca, aborta y dice DONDE. Un "hubo un conflicto" sin ficheros
#      obliga a repetir a mano el diagnostico que el script ya habia hecho.
#
# Sin acentos ni enes, a proposito: el texto viaja dentro de un JSON de una linea.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 0
cd "$REPO" || exit 0

# Escapado de JSON en el orden correcto: la barra invertida PRIMERO, porque si se
# escapan antes las comillas, el paso de las barras vuelve a escapar las que
# acaban de anadirse y el JSON sale roto justo cuando lleva nombres de fichero.
esc() {
  local s="$1" bs='\' q='"'
  s="${s//"$bs"/"$bs$bs"}"
  s="${s//"$q"/"$bs$q"}"
  s="${s//$'\n'/ }"
  s="${s//$'\r'/ }"
  s="${s//$'\t'/ }"
  printf '%s' "$s"
}

# Dos destinatarios distintos y por eso dos campos: `systemMessage` se lo ensena a
# quien trabaja; `additionalContext` se lo cuenta a Claude, que asi arranca la
# sesion sabiendo que toco la otra persona en vez de descubrirlo al chocar.
salida() {
  printf '{"systemMessage": "%s", "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}\n' \
    "$(esc "$1")" "$(esc "${2:-$1}")"
}
aviso() { printf '{"systemMessage": "%s"}\n' "$(esc "$1")"; }

# Un rebase o un merge a medias no es "estar en otra rama": es un trabajo a medio
# terminar, y es el estado en el que MAS falta hace decirlo. Durante un rebase el
# HEAD esta desacoplado y `git branch --show-current` responde vacio, asi que sin
# esta comprobacion el aviso salia como "estas en la rama ''" -- que no es verdad
# y ademas esconde lo unico que hay que hacer: terminar el rebase o descartarlo.
A_MEDIAS=""
[ -d "$(git rev-parse --git-path rebase-merge 2>/dev/null)" ] && A_MEDIAS="un rebase"
[ -d "$(git rev-parse --git-path rebase-apply 2>/dev/null)" ] && A_MEDIAS="un rebase"
[ -f "$(git rev-parse --git-path MERGE_HEAD 2>/dev/null)" ] && A_MEDIAS="un merge"
[ -f "$(git rev-parse --git-path CHERRY_PICK_HEAD 2>/dev/null)" ] && A_MEDIAS="un cherry-pick"
if [ -n "$A_MEDIAS" ]; then
  salida "Tienes $A_MEDIAS a medias de la sesion anterior. No se ha bajado nada. Terminalo con git rebase --continue, o descartalo con git rebase --abort."           "El repositorio tiene $A_MEDIAS sin terminar de antes. No se ha sincronizado nada y no conviene editar ficheros hasta resolverlo: avisa de esto antes de tocar nada."
  exit 0
fi
RAMA="$(git branch --show-current 2>/dev/null)" || exit 0
[ "$RAMA" != "main" ] && exit 0

if ! timeout 60 git fetch -q origin main >/dev/null 2>&1; then
  # Sin conexion no es una incidencia: es lo normal en un tren. Pero conviene
  # decirlo, porque el silencio de la regla 1 significa "estas al dia", y aqui
  # no se sabe si lo estas.
  aviso "Sin novedades que comprobar: no se pudo contactar con GitHub. Puede que la otra persona haya subido algo que aun no ves."
  exit 0
fi

NUEVOS="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
[ "$NUEVOS" -eq 0 ] && exit 0

# Recoger el detalle AHORA. Despues del rebase, HEAD..origin/main esta vacio y ya
# no hay forma de contar que entro sin volver a calcularlo contra el reflog.
QUIEN="$(git log --format='%an' HEAD..origin/main 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//; s/,/, /g')"
QUE="$(git log --format='%s' HEAD..origin/main 2>/dev/null | head -3 | tr '\n' '|' | sed 's/|$//; s/|/ | /g')"
TOCADOS="$(git diff --name-only HEAD...origin/main 2>/dev/null | head -8 | tr '\n' ' ')"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  salida "Hay $NUEVOS commit(s) nuevos de $QUIEN en origin/main, pero tienes cambios sin commitear y no toco nada. Commitea y luego: git pull --rebase origin main. Tocaron: $TOCADOS" \
          "Al arrancar habia $NUEVOS commit(s) sin integrar en origin/main ($QUIEN), y el arbol local tiene cambios sin commitear, asi que NO se han bajado. Ficheros que cambiaron en el remoto: $TOCADOS. Advierte de esto antes de editar cualquiera de ellos."
  exit 0
fi

if ! git rebase -q origin/main >/dev/null 2>&1; then
  CHOCAN="$(git diff --name-only --diff-filter=U 2>/dev/null | head -5 | tr '\n' ' ')"
  git rebase --abort >/dev/null 2>&1
  salida "NOVEDADES SIN INTEGRAR: $NUEVOS commit(s) de $QUIEN chocan con tu trabajo local en: ${CHOCAN:-(sin detalle)}. No se ha tocado nada. Resuelvelo con: git pull --rebase origin main" \
          "El rebase automatico sobre origin/main se aborto por conflicto en: ${CHOCAN:-(sin detalle)}. El repositorio esta intacto y sin integrar $NUEVOS commit(s) de $QUIEN. Hay que resolverlo antes de seguir."
  exit 0
fi

salida "Al dia: $NUEVOS commit(s) de $QUIEN integrados. $QUE. Tocaron: $TOCADOS" \
        "Se han integrado $NUEVOS commit(s) de $QUIEN al arrancar la sesion. Asuntos: $QUE. Ficheros que cambiaron: $TOCADOS. Si vas a editar alguno, mira antes como quedo."
exit 0
