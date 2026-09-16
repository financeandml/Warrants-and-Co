"""Emisión de una recomendación a un tercero. Un programa aparte, a propósito.

Generar es fácil: `generar_informe.py UBER`, o dos clics en la aplicación, y
sale un borrador. Emitir es esto, y es más difícil de alcanzar porque tiene que
serlo:

  · un solo ticker por invocación —no hay emisión en lote—,
  · `--confirmado-por` con el nombre de quien responde,
  · dos preguntas contestadas a mano, en una consola de verdad,
  · y la puerta entera, que es todo o nada.

Hubo un `--emitir` dentro de `generar_informe.py`. Una bandera de una letra
entre «documento de trabajo» y «recomendación publicada» es demasiado poco: se
copia y se pega, se queda en un script de anoche y nadie vuelve a mirarla. Del
mismo motor con el mismo interruptor salieron dos informes del mismo valor, del
mismo día, con etiquetas opuestas y el mismo código.

Lo que esto deja detrás, si sale bien: un HTML, un PDF, una línea nueva en el
registro encadenado y un commit en el repositorio privado del registro.

Ejemplos:
    python emitir_informe.py AVGO --confirmado-por "Sergio de Santiago López"
    python emitir_informe.py AVGO --confirmado-por "..." --formato nota
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

from informes import emision, formatos, graficos, macro, puerta
from informes.construccion import EntradasAnalista, construir_informe

# Lo que hay que teclear para responder que sí. No vale «s», ni «y», ni el
# retorno solo: una declaración obligatoria no se firma con una tecla que se
# pulsa por inercia al ir a otra cosa.
SI = "si"
NO = "no"


def _preguntar(texto: str) -> bool:
    """Una pregunta de sí o no, en una consola de verdad. Sin valor por defecto.

    Si la entrada no es una consola —un cron, una tubería, un script— esto
    aborta en vez de tomar una respuesta por sentada. Ese es el punto: la
    respuesta la da una persona en el momento, o no la da nadie.
    """
    if not sys.stdin.isatty():
        raise SystemExit(
            "La emisión pide confirmar los conflictos de interés a mano y la entrada "
            "estándar no es una consola. No se emite desde un script: la declaración "
            "del artículo 6 la responde una persona.")
    while True:
        respuesta = input(f"{texto} [si/no] ").strip().lower()
        if respuesta == SI:
            return True
        if respuesta == NO:
            return False
        print(f"Escribe «{SI}» o «{NO}».")


def confirmar(quien: str) -> emision.Confirmacion:
    """Las dos preguntas del artículo 6, con su detalle si alguna es que sí."""
    print()
    print(f"Confirmación de conflictos — responde {quien}")
    hay_posicion = _preguntar(emision.PREGUNTAS[0])
    hubo_operaciones = _preguntar(emision.PREGUNTAS[1])
    detalle = ""
    if hay_posicion or hubo_operaciones:
        print("Describe de quién es, en qué sentido y cuándo. Se publica en el informe "
              "y se guarda en el registro.")
        detalle = input("Detalle: ").strip()
    print()
    return emision.Confirmacion(
        quien=quien, momento=datetime.now(), hay_posicion=hay_posicion,
        hubo_operaciones=hubo_operaciones, detalle=detalle)


def main() -> int:
    p = argparse.ArgumentParser(
        description="Emite UNA recomendación de Warrants & Co. a un tercero.")
    p.add_argument("ticker", help="un solo símbolo: no hay emisión en lote")
    p.add_argument("--confirmado-por", required=True, dest="quien",
                   help="nombre de quien responde a las preguntas de conflictos")
    p.add_argument("--salida", default="emitidos", help="carpeta de destino")
    p.add_argument("--formato", default="institucional",
                   choices=[f.clave for f in formatos.FORMATOS])
    p.add_argument("--sin-respaldo", action="store_true",
                   help="no empuja el registro a su repositorio privado; solo para pruebas")
    p.add_argument("--verboso", action="store_true")
    args = p.parse_args()

    if not args.verboso:
        logging.disable(logging.ERROR)

    ticker = args.ticker.strip().upper()
    print(f"[{ticker}] construyendo el borrador…", flush=True)
    inf, d = construir_informe(EntradasAnalista(ticker=ticker))
    if not inf.ficha.nombre:
        print(f"[{ticker}] el proveedor no reconoce el ticker.")
        return 1

    print(f"[{ticker}] renderizando gráficos…", flush=True)
    inf.graficos = graficos.construir_todos(inf, d.precios, incrustar=True)

    fmt = formatos.formato(args.formato)
    pan = None
    if formatos.necesita_panorama(fmt.clave):
        print(f"[{ticker}] leyendo el marco de mercado…", flush=True)
        pan = macro.construir_panorama(
            inf.ficha.sector.texto() if inf.ficha.sector.hay else "")

    # La confirmación se pide ANTES de la puerta y no después: preguntarla al
    # final, cuando ya se sabe que todo lo demás está bien, la convierte en el
    # último trámite entre una persona y el botón que esperaba pulsar.
    confirmacion = confirmar(args.quien.strip())

    try:
        emitido = emision.emitir(inf, confirmacion=confirmacion, formato=fmt.clave,
                                 panorama=pan, respaldar=not args.sin_respaldo)
    except puerta.ExportacionBloqueada as bloqueo:
        print(f"[{ticker}] NO SE EMITE. {len(bloqueo.impedimentos)} impedimento(s):")
        print(puerta.informe_de_puerta(bloqueo.impedimentos))
        print("\nNo se ha tocado el registro: no se ha gastado ningún código.")
        return 2
    except emision.EmisionIncompleta as parcial:
        print(f"[{ticker}] {parcial}")
        print("La recomendación CONSTA como emitida en el registro local. Lo que falta es "
              "sacarla de esta máquina.")
        return 3

    carpeta = Path(args.salida)
    carpeta.mkdir(parents=True, exist_ok=True)
    base = f"{emitido.codigo}_{fmt.clave}"
    ruta_html = carpeta / f"{base}.html"
    ruta_html.write_text(emitido.documento, encoding="utf-8")

    from informes import pdf as _pdf                                # noqa: PLC0415
    print(f"[{ticker}] imprimiendo el PDF…", flush=True)
    datos, motivo = _pdf.imprimir_informe(inf, formato=fmt.clave, panorama=pan,
                                          menciones=emitido.menciones)
    ruta_pdf = None
    if datos:
        ruta_pdf = carpeta / f"{base}.pdf"
        ruta_pdf.write_bytes(datos)
    else:
        print(f"[{ticker}] el PDF no ha salido: {motivo}")

    print(f"\n[{ticker}] EMITIDO — {emitido.codigo}")
    print(f"         {inf.ficha.nombre} · {emitido.entrada['direccion']} · "
          f"difundido {emitido.menciones.momento_difusion.strftime('%d/%m/%Y %H:%M')}")
    print(f"         conflictos confirmados por {confirmacion.quien}")
    print(f"         -> {ruta_html}")
    if ruta_pdf is not None:
        print(f"         -> {ruta_pdf}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
