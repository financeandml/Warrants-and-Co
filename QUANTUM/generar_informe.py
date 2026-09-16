"""Generación de BORRADORES por línea de comandos, sin abrir la interfaz.

Útil para producir varios informes de una tacada o para dejarlos programados.
La interfaz de edición vive en `app_informes.py`; esto es el mismo motor sin
pantalla, de modo que lo que sale por aquí y lo que sale por allí es idéntico.

Lo que sale por aquí es un BORRADOR, siempre, sin excepción ni interruptor: lleva
la marca de borrador en cada hoja y no lleva menciones obligatorias. Emitir es
otro programa —`emitir_informe.py`— y lo es a propósito. Hubo un `--emitir` en
esta misma línea de órdenes, y una bandera de una letra entre «documento de
trabajo» y «recomendación publicada» es demasiado poco: se copia y se pega, se
deja en un script de anoche y nadie vuelve a mirarla.

Ejemplos:
    python generar_informe.py UBER
    python generar_informe.py UBER LLY JPM --salida salida
    python generar_informe.py QCOM --sin-graficos      (mucho más rápido)
    python generar_informe.py NFLX --formato tearsheet --pdf
    python generar_informe.py NFLX --formato tematico --pdf
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from datetime import date
from pathlib import Path

from informes import formatos, graficos, macro, render
from informes import formato as F
from informes.construccion import EntradasAnalista, construir_informe


def generar(ticker: str, carpeta: Path, con_graficos: bool = True,
            conviccion: int = 3, riesgo: int = 3,
            formato: str = "institucional", pdf_tambien: bool = False) -> int:
    """Genera un borrador. Devuelve el número de impedimentos para emitirlo.

    Los impedimentos se cuentan y se enseñan; no detienen nada. Este documento
    es el de trabajo del analista y sale siempre, con sus defectos a la vista,
    que es lo que lo hace útil. Quien detiene es `emitir_informe.py`.
    """
    inicio = time.time()
    print(f"[{ticker}] descargando datos y construyendo el modelo…", flush=True)
    inf, d = construir_informe(EntradasAnalista(
        ticker=ticker, conviccion=conviccion, riesgo_estrellas=riesgo))

    if not inf.ficha.nombre:
        print(f"[{ticker}] el proveedor no reconoce el ticker.")
        return 1

    if con_graficos:
        print(f"[{ticker}] renderizando gráficos…", flush=True)
    inf.graficos = graficos.construir_todos(inf, d.precios, incrustar=con_graficos)

    # Un gráfico que no sale tiene que decirlo aquí y en el documento. Sin este
    # aviso el informe anunciaba «13 gráficos» y publicaba trece huecos mudos
    # cuando el motor de imagen no estaba instalado en el intérprete en uso.
    fallidos = [g for g in inf.graficos.values() if con_graficos and g.fallo]
    if fallidos:
        print(f"[{ticker}] {len(fallidos)} de {len(inf.graficos)} gráficos no han salido: "
              f"{fallidos[0].fallo}")
        inf.avisar("General", "Gráficos",
                   f"{len(fallidos)} gráficos no se han podido renderizar ({fallidos[0].fallo}). "
                   f"Comprueba que el motor de imagen está instalado en el intérprete que ejecuta "
                   f"el generador.", subsanable=True)

    # La puerta de emision externa, que aqui solo INFORMA. El borrador se publica
    # siempre --con sus avisos a la vista, que es lo que lo hace util-- y la
    # emision es otro programa. Ver `puerta.revisar` y `emision.emitir`.
    from informes import puerta                                    # noqa: PLC0415

    fmt = formatos.formato(formato)
    # El panorama de mercado solo lo publican dos de los cinco formatos: pedirlo
    # siempre serian doce descargas para un documento que no lo lleva.
    pan = None
    if formatos.necesita_panorama(fmt.clave):
        print(f"[{ticker}] leyendo el marco de mercado…", flush=True)
        pan = macro.construir_panorama(
            inf.ficha.sector.texto() if inf.ficha.sector.hay else "")

    documento = render.renderizar(inf, formato=fmt.clave, panorama=pan)
    carpeta.mkdir(parents=True, exist_ok=True)
    base = f"Warrants_Co_{ticker}_{fmt.clave}_{inf.ficha.fecha_informe}"
    ruta = carpeta / f"{base}.html"
    ruta.write_text(documento, encoding="utf-8")

    # El registro de calidad va a un fichero de trabajo, nunca al entregable.
    ruta_calidad = puerta.guardar_registro(inf, carpeta, base)
    impedimentos = puerta.revisar(inf, documento)

    ruta_pdf = None
    if pdf_tambien:
        from informes import pdf as _pdf                          # noqa: PLC0415
        print(f"[{ticker}] imprimiendo el PDF…", flush=True)
        datos, motivo = _pdf.imprimir_informe(inf, formato=fmt.clave, panorama=pan)
        if datos:
            ruta_pdf = carpeta / f"{base}.pdf"
            ruta_pdf.write_bytes(datos)
        else:
            print(f"[{ticker}] el PDF no ha salido: {motivo}")

    div = inf.ficha.moneda
    graves = [a for a in inf.avisos if a.gravedad == "grave"]
    if impedimentos:
        print(f"[{ticker}] borrador: {len(impedimentos)} impedimento(s) para emitirlo")
        for imp in impedimentos:
            print(f"         [x] {str(imp)[:160]}")
    print(f"[{ticker}] {inf.ficha.nombre} — perfil «{inf.perfil_sectorial}» "
          f"— {fmt.nombre}")
    print(f"         precio {F.dato(inf.ficha.precio_referencia, 'moneda', div)}"
          f" · valor razonable {F.dato(inf.ficha.valor_razonable, 'moneda', div)}"
          f" · objetivo {F.dato(inf.ficha.precio_objetivo, 'moneda', div)}"
          f" ({F.dato(inf.ficha.upside, 'porcentaje_signo')})")
    print(f"         {len(inf.graficos)} gráficos · {len(inf.avisos)} avisos"
          f" ({len(graves)} graves) · {len(documento) / 1024 / 1024:.2f} MB"
          f" · {time.time() - inicio:.0f} s")
    for a in graves:
        print(f"         [!] {a.apartado} / {a.campo}")
    print(f"         -> {ruta}")
    print(f"         -> {ruta_calidad}")
    if ruta_pdf is not None:
        print(f"         -> {ruta_pdf}")
    return len(impedimentos)


def main() -> int:
    p = argparse.ArgumentParser(
        description="Generador de BORRADORES Warrants & Co. Para emitir: emitir_informe.py")
    p.add_argument("tickers", nargs="+", help="uno o varios símbolos, por ejemplo UBER LLY JPM")
    p.add_argument("--salida", default="salida", help="carpeta de destino (por defecto: salida)")
    p.add_argument("--sin-graficos", action="store_true",
                   help="omite el renderizado a imagen; mucho más rápido, informe sin gráficos")
    p.add_argument("--conviccion", type=int, default=3, help="estrellas de convicción (1-5)")
    p.add_argument("--riesgo", type=int, default=3, help="estrellas de riesgo (1-5)")
    p.add_argument("--formato", default="institucional",
                   choices=[f.clave for f in formatos.FORMATOS],
                   help="documento a publicar: " + " | ".join(
                       f"{f.clave} ({f.hojas})" for f in formatos.FORMATOS))
    p.add_argument("--pdf", action="store_true",
                   help="imprime también el PDF, con la cubierta a sangre")
    p.add_argument("--verboso", action="store_true", help="muestra los avisos del proveedor")
    args = p.parse_args()

    if not args.verboso:
        logging.disable(logging.ERROR)

    carpeta = Path(args.salida)
    graves = 0
    for ticker in args.tickers:
        try:
            graves += generar(ticker.strip().upper(), carpeta, not args.sin_graficos,
                              args.conviccion, args.riesgo, args.formato, args.pdf)
        except Exception as exc:
            print(f"[{ticker}] ERROR: {type(exc).__name__}: {exc}")
            graves += 1
        print()

    if graves:
        print(f"Terminado con {graves} avisos graves. Revísalos antes de publicar: "
              f"están recogidos al final de cada informe.")
    else:
        print("Terminado sin avisos graves.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
