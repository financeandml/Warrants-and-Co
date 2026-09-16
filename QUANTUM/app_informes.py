"""Warrants & Co. — Generador de informes de análisis bursátil.

Se elige un valor en el desplegable de la izquierda y debajo del título aparece
el informe institucional completo —39 apartados, tres escenarios de descuento de
flujos, comparables y posicionamiento—, ya montado y ya maquetado.

Lo que el generador no puede verificar no se inventa ni se declara y punto: sale
como un campo de entrada EN EL SITIO EXACTO del documento donde iría ese bloque.
El analista lo rellena ahí, sobre el propio informe, y lo escrito pasa al
documento final. Un hueco que se deja vacío se sigue declarando con su motivo.

Abajo del todo, el botón que imprime el documento terminado a PDF.

La lógica vive en el paquete `informes/`; este módulo solo orquesta la interfaz.
Se ejecuta con:  streamlit run app_informes.py
"""

from __future__ import annotations

import base64
import hashlib
import re
import time
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import streamlit as st

from informes import formato as F
from informes import (firma as _firma, formatos, graficos, huecos, macro, pdf, perfiles,
                      puerta, render)
from informes.construccion import EntradasAnalista, construir_informe
from informes.modelos import TipoTesis

st.set_page_config(page_title="Warrants & Co. — Generador de informes",
                   page_icon=":material/description:", layout="wide")

# La aplicación aporta su propia tipografía para el título y poco más: el
# informe trae la suya acotada a su contenedor, de modo que las dos hojas de
# estilo no se pisan.
st.html("""
<style>
  h1{font-family:"Source Serif 4",Georgia,"Times New Roman",serif !important;
     letter-spacing:-.01em;font-weight:700}
  section[data-testid="stSidebar"]{border-right:1px solid #e3e6ea}
  .hueco-cabecera{font-size:.82rem;letter-spacing:.02em}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>""")


# ---------------------------------------------------------------------------
# Descargas con caché
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner=False, ttl=1800)
def _buscar(consulta: str, maximo: int = 8) -> list:
    from informes import busqueda
    return busqueda.buscar(consulta, maximo=maximo)


@st.cache_data(show_spinner=False, ttl=1800)
def _ficha_rapida(ticker: str) -> Optional[dict]:
    """Sector e industria sin construir el informe entero, para poder proponer
    el grupo comparable antes de generar nada."""
    import yfinance as yf
    try:
        i = dict(yf.Ticker(ticker).info)
    except Exception:
        return None
    if not (i.get("shortName") or i.get("longName")):
        return None
    return {"nombre": i.get("longName") or i.get("shortName"),
            "sector": i.get("sector") or "", "industria": i.get("industry") or "",
            "resumen": i.get("longBusinessSummary") or ""}


@st.cache_data(show_spinner=False, ttl=1800)
def _sugerir_comparables(ticker: str, sector: str, industria: str, perfil_clave: str) -> list:
    from informes import busqueda
    perfil = perfiles.perfil_por_clave(perfil_clave)
    return busqueda.sugerir_comparables(ticker, sector, industria, perfil)


@st.cache_data(show_spinner=False, ttl=1800)
def _panorama(sector: str, dia: str):
    """El marco de mercado del día, cacheado por sector y jornada.

    La clave lleva la fecha por el mismo motivo que la del tipo libre de riesgo:
    un panorama de anteayer publicado con la fecha de hoy es una cifra que dice
    ser de hoy y no lo es.
    """
    return macro.construir_panorama(sector)


@st.cache_data(show_spinner=False, ttl=3600)
def _rf(dia: str) -> tuple:
    """Tipo libre de riesgo, refrescado cada día.

    La clave de caché es la fecha: mientras sea el mismo día se reutiliza la
    descarga. Un WACC calculado sobre el bono de hace tres semanas no es un
    WACC de hoy, y arrastra el error a los tres escenarios, a la matriz de
    sensibilidad y al precio objetivo.
    """
    from informes.construccion import obtener_tipo_libre_riesgo
    return obtener_tipo_libre_riesgo()


# ---------------------------------------------------------------------------
# Estado de los huecos
# ---------------------------------------------------------------------------

def _clave(ticker: str, id_hueco: str) -> str:
    return f"hueco::{ticker}::{id_hueco}"


def _filas(valor: Any) -> List[List[str]]:
    """Las filas de una tabla del analista, en texto y sin las vacías."""
    if isinstance(valor, pd.DataFrame):
        valor = valor.values.tolist()
    return huecos.filas_utiles(valor or [])


def valores_huecos(ticker: str) -> Dict[str, Any]:
    """Lo que el analista ha escrito, leído del estado antes de construir.

    Se lee ANTES de pintar los campos: Streamlit conserva el valor de cada
    widget entre ejecuciones, de modo que lo escrito en la pasada anterior ya
    está aquí y el informe se construye con ello. Sin esta lectura previa habría
    que pulsar un botón para que lo escrito entrase en el documento.
    """
    salida: Dict[str, Any] = {}
    for h in huecos.CATALOGO:
        bruto = st.session_state.get(_clave(ticker, h.id))
        if bruto is None:
            continue
        if h.tipo == huecos.TABLA:
            filas = _filas(bruto)
            if filas:
                salida[h.id] = filas
        elif h.tipo == huecos.IMAGEN:
            if isinstance(bruto, str) and bruto.strip():
                salida[h.id] = bruto
        elif isinstance(bruto, str) and bruto.strip():
            salida[h.id] = bruto.strip()
    return salida


def _reparto(valores: Dict[str, Any]) -> Tuple[Dict[str, str], Dict[str, Any], Dict[str, str]]:
    """Separa lo escrito en textos, tablas e imágenes, como los espera el motor."""
    textos, tablas, imagenes = {}, {}, {}
    for h in huecos.CATALOGO:
        if h.id not in valores:
            continue
        if h.tipo == huecos.TABLA:
            tablas[h.id] = valores[h.id]
        elif h.tipo == huecos.IMAGEN:
            imagenes[h.id] = valores[h.id]
        else:
            textos[h.id] = valores[h.id]
    return textos, tablas, imagenes


# ---------------------------------------------------------------------------
# Barra lateral
# ---------------------------------------------------------------------------

def _selector_valor() -> str:
    """El desplegable: se escribe un nombre o un símbolo y se elige la cotización.

    Escribir «santander» y ver las cinco cotizaciones que tiene —Nueva York,
    Madrid, Fráncfort, Chile, Brasil— evita el error más caro del informe:
    analizar el ADR creyendo que se analiza la acción local, con otra divisa,
    otra liquidez y otro múltiplo.
    """
    st.sidebar.markdown("### Valor a analizar")
    consulta = st.sidebar.text_input(
        "Buscar por nombre o ticker", value=st.session_state.get("consulta_valor", ""),
        placeholder="netflix, uber, banco santander…",
        help="Escribe al menos dos caracteres. Se listan las cotizaciones disponibles con su "
             "mercado, para distinguir la acción local del ADR.")
    st.session_state["consulta_valor"] = consulta

    texto = consulta.strip()
    if len(texto) < 2:
        st.sidebar.caption("Elige un valor para que se construya su informe.")
        st.session_state["ticker_activo"] = ""
        return ""

    resultados = _buscar(texto)
    activo = st.session_state.get("ticker_activo", "")
    if resultados:
        etiquetas = [c.etiqueta for c in resultados]
        simbolos = [c.simbolo for c in resultados]
        indice = simbolos.index(activo) if activo in simbolos else 0
        elegida = st.sidebar.selectbox(
            "Cotización", etiquetas, index=indice,
            help="Cada línea es una cotización distinta del mismo emisor.")
        ticker = simbolos[etiquetas.index(elegida)]
    else:
        # El buscador puede no responder; escribir el símbolo a mano nunca falla.
        ticker = texto.upper()
        st.sidebar.caption(
            "El buscador no ha devuelto resultados. Se usará el texto tal cual como símbolo; "
            "compruébalo si el informe sale vacío.")

    st.session_state["ticker_activo"] = ticker
    return ticker


def _orientacion_descuento(pct: int) -> str:
    if pct == 0:
        return ("Sin descuento: solo defendible si las participaciones son líquidas, cotizadas y "
                "sin plusvalía latente relevante.")
    if pct < 15:
        return ("Descuento bajo: propio de participaciones cotizadas y líquidas, con poca "
                "plusvalía acumulada.")
    if pct <= 30:
        return ("Rango habitual (15-30%): cartera mixta con fiscalidad latente sobre la plusvalía. "
                "Es el tramo que emplean la mayoría de los informes.")
    if pct <= 45:
        return ("Descuento alto: cartera mayoritariamente no cotizada, ilíquida o con "
                "restricciones de venta.")
    return ("Descuento muy alto: equivale a decir que la cartera vale poco más de la mitad de su "
            "valor contable. Conviene justificarlo en el apartado 5.")


def barra_lateral(ticker: str) -> EntradasAnalista:
    """Los supuestos del modelo. Todo lo demás se rellena sobre el informe."""
    valores = valores_huecos(ticker)
    textos, tablas, imagenes = _reparto(valores)

    with st.sidebar.expander("Encuadre de la tesis", expanded=False):
        fecha = st.date_input(
            "Fecha del informe", value=date.today(),
            help="El informe se emite con los últimos datos disponibles a esta fecha.")
        # El proveedor sirve a veces el ISIN de otro valor y el informe lo rechaza
        # con su motivo. Deducir el correcto seria inventar un identificador, de
        # modo que se pide: es el unico campo de la ficha que no puede salir solo.
        isin = st.text_input(
            "ISIN (opcional)", value="", placeholder="US11135F1012",
            help="Solo hace falta cuando la ficha lo publica como N/D. Se comprueban la "
                 "forma y el dígito de control: una errata de tecleo no pasa.")
        tipo = st.radio(
            "Etiqueta de recomendación",
            ["Derivar de la escala", "LONG", "SHORT", "NEUTRAL"], horizontal=True,
            help="Lo normal es derivarla: valor razonable por encima del precio y margen de "
                 "seguridad positivo es LONG; por debajo, SHORT; el resto, NEUTRAL. Apartarse "
                 "de la regla exige justificarlo por escrito, y la justificación se imprime "
                 "firmada en el apartado 1.")
        justificacion = ""
        if tipo != "Derivar de la escala":
            justificacion = st.text_area(
                "Justificación del apartamiento", value="", height=150,
                help=f"Mínimo {puerta.MINIMO_JUSTIFICACION} caracteres. Sin ella se publica la "
                     f"etiqueta de la escala y el informe queda marcado como no emisible a "
                     f"un tercero.")
            faltan = puerta.MINIMO_JUSTIFICACION - len(justificacion.strip())
            if faltan > 0:
                st.caption(f"Faltan {faltan} caracteres.")
        horizonte = st.selectbox(
            "Horizonte temporal",
            ["6-12 meses", "12-24 meses", "24-36 meses", "Más de 36 meses"], index=1)
        # Ya no se publican como estrellas (X-14): una escala de cinco sin
        # definicion no informa. Siguen entrando en el tamano de posicion
        # sugerido del apartado 35, que es donde se pueden defender.
        conviccion = st.slider(
            "Convicción (1-5)", 1, 5, 3,
            help="No se publica como tal: entra en el tamaño de posición sugerido del "
                 "apartado 35 junto con la beta y el margen de seguridad.")
        riesgo = st.slider(
            "Riesgo percibido (1-5)", 1, 5, 3,
            help="Tampoco se publica: el riesgo que el documento publica es el del apartado 30, "
                 "con su probabilidad, su impacto y su efecto por acción.")
        entrada = st.number_input("Precio de entrada real (0 = pendiente)",
                                  0.0, 1000000.0, 0.0, 0.5, format="%.2f")
        objetivo = st.number_input(
            "Precio objetivo publicado (0 = el del modelo)", 0.0, 1000000.0,
            float(st.session_state.get(f"objetivo_sugerido::{ticker}", 0.0)), 0.5, format="%.2f",
            help="El precio objetivo lo fija siempre el analista. El modelo calcula el valor "
                 "razonable y propone una referencia, pero la cifra que se publica es una "
                 "decisión, no un cálculo.")

    ficha = _ficha_rapida(ticker) if ticker else None
    with st.sidebar.expander("Perfil sectorial", expanded=False):
        nombres = perfiles.nombres_disponibles()
        opciones = ["Automático (según sector e industria)"] + list(nombres.values())
        elegido = st.selectbox(
            "Perfil aplicado", opciones, index=0,
            help="El perfil determina el vocabulario del informe, los múltiplos objetivo, los "
                 "riesgos típicos, el moat de referencia, el grupo comparable y —lo que más "
                 "pesa— si el flujo se proyecta sobre EBITDA o sobre resultado operativo.")
        perfil_forzado = None
        if elegido != opciones[0]:
            perfil_forzado = next(k for k, v in nombres.items() if v == elegido)
        if ficha:
            auto = perfiles.resolver_perfil(ficha.get("sector"), ficha.get("industria"),
                                            ficha.get("resumen"))
            st.caption(f"El proveedor clasifica el valor como **{ficha.get('sector') or '—'} / "
                       f"{ficha.get('industria') or '—'}**, que resuelve al perfil "
                       f"«{auto.nombre}».")

    perfil_efectivo = (perfiles.perfil_por_clave(perfil_forzado) if perfil_forzado
                       else perfiles.resolver_perfil((ficha or {}).get("sector"),
                                                     (ficha or {}).get("industria"),
                                                     (ficha or {}).get("resumen")))

    with st.sidebar.expander("Coste de capital", expanded=False):
        rf_auto, origen_rf = _rf(date.today().isoformat())
        if rf_auto:
            st.success(f"Tipo libre de riesgo automático: **{F.porcentaje(rf_auto)}**",
                       icon=":material/sync:")
            st.caption(origen_rf)
        else:
            st.error("No se ha podido descargar el bono a 10 años. Fíjalo a mano: un WACC sobre "
                     "un tipo inventado arrastra el error a toda la valoración.")
        usar_rf_auto = st.checkbox("Usar el tipo automático", value=bool(rf_auto),
                                   disabled=not rf_auto)
        rf = None if usar_rf_auto else st.number_input(
            "Tipo libre de riesgo (%)", 0.0, 20.0, round((rf_auto or 0.045) * 100, 2), 0.05) / 100.0
        prima = st.number_input("Prima de riesgo de mercado (%)", 2.0, 12.0, 5.0, 0.1) / 100.0
        beta_manual = st.checkbox(
            "Fijar beta a mano", value=False,
            help="Sin marcar, se aplica la beta del proveedor ajustada por el método de Blume, "
                 "declarado en la tabla del apartado 12. Si la fijas tú, razónala en el hueco "
                 "«Justificación de la beta empleada» del propio apartado 12.")
        beta = st.number_input("Beta", 0.1, 4.0, 1.15, 0.05) if beta_manual else None
        # El coste de la deuda y el tipo en caja existian en el modelo pero no
        # tenian mando: sin ellos el WACC no se puede igualar al de otro informe
        # y la comparacion se queda en «no coincide», sin decir por que.
        cd_manual = st.checkbox(
            "Fijar el coste de la deuda", value=False,
            help="Sin marcar, se toma el tipo libre de riesgo más 130 puntos básicos. El cupón "
                 "medio real de la compañía está en el apartado 9.")
        coste_deuda = st.number_input("Coste de la deuda antes de impuestos (%)",
                                      0.0, 25.0, 5.0, 0.05) / 100.0 if cd_manual else None
        ti_manual = st.checkbox(
            "Fijar el tipo impositivo en caja", value=False,
            help="Sin marcar, se aplica el tipo de referencia del perfil sectorial. El efectivo de "
                 "los últimos ejercicios sale en el apartado 8.")
        tipo_imp = st.number_input("Tipo impositivo efectivo en caja (%)",
                                   0.0, 60.0, round(perfil_efectivo.tipo_caja * 100, 1),
                                   0.5) / 100.0 if ti_manual else None

        st.divider()
        st.caption("**Convenciones de la casa.** Son decisiones, no datos: cada una se imprime "
                   "en la tabla del apartado 12 para que otro modelo pueda discreparlas.")
        ke_manual = st.checkbox(
            "Fijar el coste de los fondos propios", value=False,
            help="Sin marcar, sale del CAPM con la beta. Fijándolo, la valoración deja de moverse "
                 "con una beta que el proveedor recalcula cada semana; la beta se sigue "
                 "publicando al lado.")
        coste_equity = st.number_input("Coste de los fondos propios (%)", 3.0, 30.0, 10.0,
                                       0.25) / 100.0 if ke_manual else None
        pesos_contables = st.checkbox(
            "Pesos del WACC a valor contable", value=False,
            help="Sin marcar —lo normal— la estructura de capital es la de MERCADO, que es con la "
                 "que se financia hoy la compañía. A valor contable el peso de la deuda sale "
                 "inflado en cualquier emisor que cotice por encima de su patrimonio y el coste "
                 "de capital resultante no es el de nadie.")
        escudo = st.checkbox(
            "Aplicar el escudo fiscal de la deuda", value=True,
            help="El flujo de caja libre para la firma se descuenta al WACC precisamente porque el "
                 "WACC recoge el ahorro fiscal de los intereses. Desmarcarlo no es más "
                 "conservador: descuenta dos veces el mismo impuesto.")
        restar_sbc = st.checkbox(
            "Restar la retribución en acciones del flujo", value=True,
            help="El informe afirma tres veces que restarla es su diferencia principal frente al "
                 "flujo que publican las compañías. Desmarcarlo publica esa afirmación junto a un "
                 "supuesto del 0,0% en la tabla de al lado.")
        term_extra = st.checkbox(
            "Descontar el valor terminal un año de más", value=False,
            help="APARTARSE DEL MÉTODO. El valor terminal de una proyección de N años se sitúa al "
                 "final del año N, que es donde acaba el último flujo explícito. Marcarlo lo "
                 "descuenta un periodo de más, deja un aviso grave y bloquea la exportación.")
        term_crece = st.checkbox(
            "Valor terminal con la fórmula de Gordon completa", value=True,
            help="FCFF×(1+g)/(WACC−g). Gordon capitaliza el flujo del periodo SIGUIENTE, de modo "
                 "que el factor (1+g) forma parte de la fórmula y no es una opción. Desmarcarlo "
                 "deja un aviso grave y bloquea la exportación.")

    with st.sidebar.expander("Escenarios y supuestos", expanded=False):
        horizonte_anyos = st.slider("Horizonte de proyección (años)", 3, 15, 5)
        # Los pesos se introducen con dos cortes sobre una barra de 0 a 100, de
        # modo que SIEMPRE suman 100 por construcción. Con tres casillas
        # independientes es posible publicar un valor razonable ponderado sobre
        # el 105% del peso sin que nadie lo note, y esa es justo la clase de
        # error que no se ve en el PDF.
        st.caption("Pesos de los escenarios — los dos cortes reparten el 100%")
        corte_bajo, corte_alto = st.slider(
            "Reparto pesimista / base / optimista", 0, 100, (25, 75), 5,
            label_visibility="collapsed")
        peso_pes = corte_bajo / 100.0
        peso_base = (corte_alto - corte_bajo) / 100.0
        peso_opt = (100 - corte_alto) / 100.0
        c1, c2, c3 = st.columns(3)
        c1.metric("Pesimista", F.porcentaje(peso_pes))
        c2.metric("Base", F.porcentaje(peso_base))
        c3.metric("Optimista", F.porcentaje(peso_opt))
        if peso_base <= 0:
            st.warning("El escenario base se queda sin peso: el valor razonable saldría solo de "
                       "los extremos, que son los menos probables por definición.")

        avanzado = st.checkbox("Ajustar la senda del caso base", value=False)
        crec_ini = crec_ter = margen_obj = g_term = None
        curvatura, inversion = 1.0, 0.0
        if avanzado:
            crec_ini = st.number_input("Crecimiento del primer año (%)",
                                       -30.0, 80.0, 12.0, 0.5) / 100.0
            crec_ter = st.number_input("Crecimiento del último año (%)",
                                       0.0, 20.0, 5.0, 0.25) / 100.0
            margen_obj = st.number_input(
                f"Margen objetivo de {perfil_efectivo.rotulo_metrica_operativa.lower()} (%)",
                1.0, 80.0, round(perfil_efectivo.margen_ebitda_techo * 100, 1), 0.5) / 100.0
            g_term = st.number_input("Crecimiento terminal g (%)", 0.0, 5.0, 3.0, 0.05) / 100.0
            curvatura = st.slider(
                "Curvatura de la senda de crecimiento", 0.4, 2.5, 1.0, 0.05,
                help="Por encima de 1 el crecimiento aguanta y luego cae; por debajo, se agota "
                     "pronto. En un DCF a diez años esta forma pesa más que el WACC.")
            inversion = st.number_input("Inversión extraordinaria acumulada (M)",
                                        0.0, 500000.0, 0.0, 100.0)

        descuento_pct = st.slider("Descuento sobre participaciones no consolidadas (%)",
                                  0, 60, 25, 1)
        st.caption(_orientacion_descuento(descuento_pct))

    with st.sidebar.expander("Grupo comparable", expanded=False):
        sugeridos = (_sugerir_comparables(ticker, (ficha or {}).get("sector", ""),
                                          (ficha or {}).get("industria", ""),
                                          perfil_efectivo.clave) if ticker else [])
        mapa = {c.etiqueta: c.simbolo for c in sugeridos}
        mapa.update(st.session_state.get(f"comparables_extra::{ticker}", {}))
        seleccion = st.multiselect(
            "Comparables", list(mapa.keys()), default=list(mapa.keys()),
            help="Propuestos por la industria concreta del valor. Cambiar esta lista cambia el "
                 "agregado del apartado 21 y las cuotas del 22: es un supuesto del informe, no "
                 "un dato.")
        consulta_cmp = st.text_input("Añadir comparable", value="", placeholder="doordash, LYFT…")
        if len(consulta_cmp.strip()) >= 2:
            hallados = _buscar(consulta_cmp.strip(), maximo=5)
            if hallados:
                elegido_cmp = st.selectbox("Resultados", [c.etiqueta for c in hallados],
                                           key="sel_cmp")
                if st.button("Añadir al grupo", use_container_width=True):
                    extra = dict(st.session_state.get(f"comparables_extra::{ticker}", {}))
                    extra[elegido_cmp] = next(c.simbolo for c in hallados
                                              if c.etiqueta == elegido_cmp)
                    st.session_state[f"comparables_extra::{ticker}"] = extra
                    st.rerun()
        comparables = [mapa[k] for k in seleccion]

    return EntradasAnalista(
        ticker=ticker, fecha_informe=fecha, isin=isin.strip(),
        tipo_tesis=(None if tipo == "Derivar de la escala" else TipoTesis(tipo)),
        justificacion_discrepancia=justificacion.strip(),
        horizonte=horizonte, conviccion=conviccion, riesgo_estrellas=riesgo,
        perfil_forzado=perfil_forzado,
        tipo_libre_riesgo=rf, prima_riesgo=prima, beta=beta,
        coste_deuda=coste_deuda, tipo_impositivo=tipo_imp,
        coste_equity=coste_equity, pesos_contables=pesos_contables,
        escudo_fiscal_deuda=escudo, restar_sbc=restar_sbc,
        terminal_descuento_extra=term_extra, terminal_con_crecimiento=term_crece,
        horizonte_anyos=horizonte_anyos,
        peso_pesimista=peso_pes, peso_base=peso_base, peso_optimista=peso_opt,
        crecimiento_inicial=crec_ini, crecimiento_terminal_base=crec_ter,
        margen_objetivo_base=margen_obj, g_terminal_base=g_term,
        curvatura_crecimiento=curvatura, inversion_extraordinaria=inversion,
        descuento_participaciones=descuento_pct / 100.0,
        precio_objetivo=objetivo or None, precio_entrada=entrada or None,
        comparables=comparables,
        textos=textos, tablas=tablas, imagenes=imagenes,
        # La cadena de opciones va siempre: el apartado F es parte del informe,
        # no un extra. Cuando el proveedor no la sirve utilizable, el propio
        # apartado lo declara; eso es distinto de no haberla pedido.
        con_opciones=True, con_comparables=bool(comparables),
    )


# ---------------------------------------------------------------------------
# Construccion con memoria
# ---------------------------------------------------------------------------

def _huella(e: EntradasAnalista) -> str:
    """Todo lo que, al cambiar, obliga a rehacer el modelo.

    Los huecos de texto NO entran: cambiarlos solo cambia lo que se imprime, no
    lo que se calcula, y volver a descargar y a proyectar diez años cada vez que
    el analista escribe un párrafo haría la pantalla inservible.
    """
    # `tipo_tesis` puede ser `None` --«derivala de la escala»-- desde que la
    # etiqueta se deriva: `.value` sobre None tumbaba la pantalla entera.
    partes = [e.ticker, str(e.fecha_informe), str(e.tipo_tesis), e.horizonte,
              str(e.conviccion), str(e.riesgo_estrellas), str(e.perfil_forzado),
              str(e.tipo_libre_riesgo), str(e.prima_riesgo), str(e.beta),
              str(e.coste_deuda), str(e.tipo_impositivo),
              str(e.horizonte_anyos), str(e.peso_pesimista), str(e.peso_base),
              str(e.peso_optimista), str(e.crecimiento_inicial),
              str(e.crecimiento_terminal_base), str(e.margen_objetivo_base),
              str(e.g_terminal_base), str(e.curvatura_crecimiento),
              str(e.inversion_extraordinaria), str(e.descuento_participaciones),
              str(e.precio_objetivo), str(e.precio_entrada), ",".join(e.comparables),
              # El autorrelleno SI entra: apagarlo vacia veinte bloques del
              # documento, y sin esto la pantalla seguia mostrando el informe
              # anterior con todos sus bloques puestos.
              str(e.autorrelleno),
              # Las convenciones de la casa cambian el VALOR, de modo que sin
              # ellas la pantalla seguia mostrando la valoracion anterior
              # despues de mover un interruptor que la mueve 21.000 M.
              str(e.coste_equity), str(e.pesos_contables), str(e.escudo_fiscal_deuda),
              str(e.tipo_tesis), e.justificacion_discrepancia,
              str(e.restar_sbc), str(e.terminal_descuento_extra),
              str(e.terminal_con_crecimiento),
              # El ISIN no cambia ningun calculo, pero SI cambia la ficha, y sin
              # el en la huella la pantalla seguia publicando N/D despues de
              # teclearlo: un campo que no repinta se lee como un campo roto.
              e.isin]
    # Las tablas sí entran: los segmentos alimentan la suma de partes del
    # apartado 19 y el mercado, las cuotas del 22. Son cálculo, no redacción.
    partes.append(repr(sorted((k, v) for k, v in (e.tablas or {}).items())))
    for clave in ("narrativa_bajista", "mercados_objetivo", "descripcion_negocio_extra",
                  "beta_justificacion", "tipo_empresa"):
        partes.append((e.textos or {}).get(clave, ""))
    return "|".join(partes)


def _descarga_viva(ticker: str, con_opciones: bool):
    """Lo bajado del proveedor para este valor, mientras siga sirviendo.

    Va en su propia memoria y no dentro de la del informe porque NO depende de
    los supuestos: el balance de Netflix es el mismo con la deuda pesada a
    valor contable que a valor de mercado. Metida en la memoria del informe,
    mover cualquiera de los seis interruptores de convención tiraba la descarga
    entera y volvía a pedir las treinta y nueve peticiones a Yahoo para acabar
    dividiendo por otro número.

    Se guarda una sola: quien cambia de valor deja de necesitar el anterior, y
    guardar varias haría crecer la sesión sin límite —cada descarga son varios
    megas de series de precios y cadenas de opciones—.
    """
    guardada = st.session_state.get("_descarga")
    if (guardada is not None and guardada.ticker == ticker.strip().upper()
            and (guardada.con_opciones or not con_opciones)):
        return guardada
    return None


def construir(e: EntradasAnalista, con_graficos: bool):
    """El informe de estas entradas, reconstruido solo cuando hace falta."""
    huella = _huella(e) + ("|G" if con_graficos else "|-")
    guardado = st.session_state.get("_construido")
    if guardado is not None and guardado[0] == huella:
        inf, d = guardado[1], guardado[2]
    else:
        previa = _descarga_viva(e.ticker, e.con_opciones)
        barra = st.progress(
            0.0, "Rehaciendo el modelo…" if previa is not None
            else "Descargando datos de mercado y formularios de la SEC…")
        t0 = time.time()
        try:
            inf, d = construir_informe(e, descarga=previa)
        except Exception as exc:                                   # noqa: BLE001
            barra.empty()
            st.error(f"No se ha podido construir el informe: {type(exc).__name__}: {exc}")
            return None, None
        st.session_state["_descarga"] = d
        barra.progress(0.55, "Renderizando los gráficos…")
        inf.graficos = graficos.construir_todos(inf, d.precios, incrustar=con_graficos)
        fallidos = [g for g in inf.graficos.values() if con_graficos and g.fallo]
        if fallidos:
            inf.avisar("General", "Gráficos",
                       f"{len(fallidos)} de {len(inf.graficos)} gráficos no se han podido "
                       f"renderizar ({fallidos[0].fallo}).", subsanable=True)
        barra.progress(1.0, f"Listo en {time.time() - t0:.0f} s")
        barra.empty()
        st.session_state["_construido"] = (huella, inf, d)

    # Los huecos de texto se aplican sobre el informe ya construido: cambiarlos
    # no cambia una sola cifra, de modo que rehacer el modelo por un párrafo
    # sería tirar treinta segundos por cada tecla.
    manual = {**(e.textos or {}), **(e.tablas or {}), **(e.imagenes or {})}
    escrito = {k: v for k, v in manual.items() if huecos.hay(v)}
    # Las propuestas del motor siguen ocupando el hueco que el analista no ha
    # escrito. Sin este cruce, reaplicar los textos borraba el autorrelleno en
    # cuanto se tecleaba en cualquier otro campo.
    propuestas = {k: v for k, v in (inf.rellenos or {}).items()
                  if k in (inf.rellenos_automaticos or {}) and k not in escrito}
    inf.rellenos = {**propuestas, **escrito}
    inf.rellenos_automaticos = {k: v for k, v in (inf.rellenos_automaticos or {}).items()
                                if k in propuestas}
    return inf, d


# ---------------------------------------------------------------------------
# El informe en pantalla, con sus huecos rellenables
# ---------------------------------------------------------------------------

def _texto_propuesto(valor) -> str:
    """La propuesta del motor, como texto editable en el campo."""
    if isinstance(valor, str):
        return valor
    if isinstance(valor, (list, tuple)):
        return chr(10).join(str(x) for x in valor)
    return str(valor or "")


def _pintar_campo(h: huecos.Hueco, ticker: str, relleno: bool,
                  propuesta: Optional[tuple] = None) -> None:
    """El campo de un hueco, con la propuesta del motor si la hay.

    Un hueco propuesto ya está en el documento: el campo no sirve para
    rellenarlo sino para corregirlo. Por eso se enseña lo que el motor ha
    escrito y de dónde lo ha sacado, y hace falta un gesto explícito para
    empezar a editar encima. Sin ese gesto, un campo de texto vacío al lado de
    un bloque relleno se lee como si el bloque no estuviera.
    """
    clave = _clave(ticker, h.id)
    marca = "◇" if (propuesta and not relleno) else ("✓" if relleno else "◆")
    titulo = f"{marca}  {h.apartado} · {h.rotulo}"
    with st.expander(titulo, expanded=False):
        if propuesta and not relleno:
            valor, fuente, certeza = propuesta
            st.caption(f"◇ **Redactado por el modelo** a partir de {fuente}. "
                       f"Escribe encima para sustituirlo.")
            if st.button("Editar sobre la propuesta", key=f"cp::{clave}",
                         help="Copia el texto propuesto al campo para retocarlo. Mientras no lo "
                              "hagas, el informe publica la propuesta tal cual."):
                if h.tipo == huecos.TABLA:
                    st.session_state[clave] = [list(f) for f in (valor or [])]
                else:
                    st.session_state[clave] = _texto_propuesto(valor)
                st.rerun()
        st.caption(h.ayuda)
        if h.ejemplo:
            st.caption(f"Ejemplo: _{h.ejemplo}_")

        if h.tipo == huecos.TABLA:
            actual = st.session_state.get(clave)
            if not isinstance(actual, pd.DataFrame):
                filas = actual if isinstance(actual, list) else []
                actual = pd.DataFrame(filas, columns=list(h.columnas)) if filas \
                    else pd.DataFrame(columns=list(h.columnas))
            editado = st.data_editor(actual, num_rows="dynamic", use_container_width=True,
                                     hide_index=True, key=f"ed::{clave}")
            st.session_state[clave] = editado

        elif h.tipo == huecos.IMAGEN:
            subido = st.file_uploader("Imagen (PNG o JPG)", type=["png", "jpg", "jpeg"],
                                      key=f"fu::{clave}")
            if subido is not None:
                datos = base64.b64encode(subido.getvalue()).decode("ascii")
                st.session_state[clave] = f"data:{subido.type};base64,{datos}"
            if st.session_state.get(clave) and st.button("Quitar la imagen", key=f"rm::{clave}"):
                st.session_state[clave] = ""
                st.rerun()

        elif h.tipo == huecos.TEXTO:
            st.text_input(h.rotulo, key=clave, label_visibility="collapsed")

        else:
            altura = 200 if h.tipo == huecos.PARRAFO else 150
            st.text_area(h.rotulo, key=clave, height=altura, label_visibility="collapsed",
                         help="Un párrafo por línea en blanco." if h.tipo == huecos.PARRAFO
                              else "Una viñeta por línea.")


def mostrar_informe(inf, e: EntradasAnalista, formato: str = "institucional",
                    panorama=None) -> None:
    """Pinta el documento intercalando el campo de cada hueco en su sitio.

    Lo que se ve aquí y lo que se descarga salen del MISMO informe y del mismo
    renderizador —`render.renderizar`—, en un caso en modo edición y en el otro
    en modo documento: no hay dos caminos que puedan discrepar.

    El documento final no se monta aquí. Pesa 2,2 MB con los gráficos dentro y
    se rehacía en cada repintado —o sea, en cada tecla escrita en cualquier
    hueco— para dejarlo colgado de un botón que casi nunca se pulsa. Se monta
    en `pie_descarga`, cuando se pide.
    """
    st.html(f"<style>{render.css_para_pantalla()}</style>")

    edicion = render.renderizar(inf, incluir_control_calidad=True,
                                modo="edicion", formato=formato,
                                panorama=panorama)
    trozos = re.split(r"<!--HUECO:([a-z_]+)-->", edicion)
    valores = inf.rellenos or {}

    def bloque(html: str) -> None:
        if html and html.strip():
            st.html(f'<div class="wc-doc"><div class="documento">{html}</div></div>')

    bloque(trozos[0])
    for i in range(1, len(trozos), 2):
        id_hueco = trozos[i]
        h = huecos.POR_ID.get(id_hueco)
        if h is not None:
            auto = (inf.rellenos_automaticos or {}).get(id_hueco)
            propuesta = ((valores.get(id_hueco), auto[0], auto[1]) if auto else None)
            _pintar_campo(h, e.ticker, huecos.hay(valores.get(id_hueco)) and not auto,
                          propuesta)
        bloque(trozos[i + 1] if i + 1 < len(trozos) else "")


def _sello_documento(e: EntradasAnalista, inf, clave_formato: str) -> str:
    """Todo lo que entra en el fichero descargable, resumido en una firma.

    El nombre del fichero solo lleva ticker, formato y fecha, y con ESO se
    guardaba el documento preparado. Pero el documento lo escribe también el
    analista: al teclear un párrafo, la pantalla lo pintaba y el botón de
    descarga seguía ofreciendo los bytes de antes, sin ese párrafo y sin decir
    nada. Medido: 2.573.496 bytes idénticos, la marca en pantalla y ausente del
    fichero. La pantalla y el fichero afirmaban cosas distintas del mismo
    informe, que es exactamente el fallo que la regla novena persigue.

    Entra la huella del modelo --la misma que decide si hay que reconstruirlo,
    no una copia escrita aquí-- más el formato y lo que el analista haya puesto
    en cada hueco.
    """
    partes = [_huella(e), clave_formato]
    for clave, valor in sorted((inf.rellenos or {}).items()):
        partes.append(f"{clave}={_firma_de_relleno(valor)}")
    return hashlib.sha256("|".join(partes).encode("utf-8", "replace")).hexdigest()


def _firma_de_relleno(valor: Any) -> str:
    """Un hueco puede traer texto, una tabla o una imagen: los tres cuentan."""
    if isinstance(valor, (bytes, bytearray)):
        return hashlib.sha256(bytes(valor)).hexdigest()[:16]
    if isinstance(valor, (list, tuple)):
        return repr([[str(c) for c in fila] for fila in valor])
    return str(valor)


# Con que frase anuncia la pantalla el veredicto de la puerta. Vive aqui y no
# dentro de la funcion porque la prueba que vigila que el veredicto SE ANUNCIE
# tiene que poder leerlo: escrito solo dentro, la prueba lo repetia y las dos
# copias podian separarse sin que nada avisara --y se separaron--.
VEREDICTO_BORRADOR = "Esto es un borrador"


def pie_descarga(inf, e: EntradasAnalista, fmt=None, panorama=None) -> None:
    """El botón que cierra el trabajo: el documento terminado, en PDF."""
    st.divider()
    from informes import formatos as _f                          # noqa: PLC0415

    fmt = fmt if fmt is not None else _f.formato(_f.POR_DEFECTO)
    ticker = inf.ficha.ticker
    nombre = f"Warrants_Co_{ticker}_{fmt.clave}_{inf.ficha.fecha_informe}"
    sello = _sello_documento(e, inf, fmt.clave)
    pendientes = huecos.contar_pendientes(inf.rellenos or {})

    def _ofrecer(memoria: str, etiqueta: str, extension: str, tipo: str) -> bool:
        """Ofrece el fichero preparado SOLO si es el de lo que hay en pantalla.

        Si no lo es, no se ofrece uno viejo con cara de nuevo: se retira y se
        dice por qué. Y se suelta, porque son megas de sesión colgando de un
        documento que ya nadie puede descargar.
        """
        guardado = st.session_state.get(memoria)
        if guardado is None:
            return False
        if guardado[0] != sello:
            st.session_state.pop(memoria, None)
            st.caption("El documento preparado ya no coincide con lo que hay en pantalla; "
                       "vuelve a prepararlo.")
            return False
        st.download_button(etiqueta, guardado[1], file_name=f"{nombre}.{extension}",
                           mime=tipo, use_container_width=True, icon=":material/download:")
        return True

    # La puerta de exportacion, antes de los botones. Informa; no cierra.
    #
    # Cerraba: retiraba los botones y el informe no salia. Pero el generador
    # produce el documento de trabajo del analista antes que el entregable de
    # un tercero, y quedarse sin PDF por un hueco que uno mismo va a rellenar
    # dentro de diez minutos no protege a nadie. La decision de emitir es de
    # quien firma, y aqui se le da el veredicto entero para que la tome.
    #
    # Lo que NO puede pasar --regla novena-- es que la pantalla anuncie una
    # puerta cerrada y el boton de al lado la abra. Por eso este bloque dice
    # «no emisible», que es lo que de verdad afirma, y no «bloqueada».
    #
    # Y es literalmente cierto: de esta pantalla NO sale un documento emitido.
    # No hay camino. `render.renderizar` sin menciones produce un borrador --con
    # su marca en cada hoja y sin la pagina del Reglamento-- porque no se le
    # pasa el objeto con el que dibujarla, y aqui nadie lo construye. Emitir es
    # otro programa: `emitir_informe.py`, que llama a `emision.emitir`.
    documento_previo = render.renderizar(inf, modo="documento", formato=fmt.clave,
                                         panorama=panorama)
    impedimentos = puerta.revisar(inf, documento_previo)
    if impedimentos:
        st.warning(
            f"**{VEREDICTO_BORRADOR}: {len(impedimentos)} impedimento(s) para emitirlo.** "
            f"Un informe con precio objetivo y criterios de salida es una recomendación de "
            f"inversión. Lo que se descarga aquí lleva la marca de borrador en cada hoja y no "
            f"lleva las menciones obligatorias: es tu documento de trabajo. Emitir a un "
            f"tercero es otro programa, `emitir_informe.py`.",
            icon=":material/report:")
        # Sin desplegable: los campos del analista son desplegables y este no lo
        # es --no se rellena, se resuelve--; mezclarlos hacia que el recuento de
        # campos de la pantalla dejara de cuadrar con el catalogo de huecos.
        for imp in impedimentos:
            st.markdown(f"**`{imp.codigo}`** · {imp.apartado} — {imp.motivo}")
            if imp.remedio:
                st.caption(f"→ {imp.remedio}")
        if not _firma.configurada():
            st.info(
                "Las menciones obligatorias de la firma se configuran una sola vez en "
                "`firma.json` (copia `firma.ejemplo.json` y revisa cada declaración antes "
                "de firmarla). También se pueden escribir aquí, informe a informe.",
                icon=":material/badge:")

    c1, c2, c3 = st.columns([3, 2, 4])
    with c1:
        if st.button(f"Preparar el PDF — {fmt.nombre}", type="primary",
                     use_container_width=True, icon=":material/picture_as_pdf:"):
            with st.spinner("Imprimiendo el documento…"):
                # Dos pasadas y union: la cubierta a sangre y sin corriente, el
                # cuerpo con sus margenes. Ver `pdf.imprimir_informe`.
                datos, motivo = pdf.imprimir_informe(
                    inf, formato=fmt.clave, panorama=panorama)
            if datos:
                st.session_state["_pdf"] = (sello, datos)
            else:
                st.session_state.pop("_pdf", None)
                st.error(motivo)

        _ofrecer("_pdf", "Descargar el PDF", "pdf", "application/pdf")

    with c2:
        if st.button("Preparar el HTML", use_container_width=True,
                     icon=":material/html:"):
            with st.spinner("Montando el documento…"):
                st.session_state["_html"] = (
                    sello, render.renderizar(inf, modo="documento", formato=fmt.clave,
                                             panorama=panorama).encode("utf-8"))

        if _ofrecer("_html", "Descargar el HTML", "html", "text/html"):
            st.caption(f"{len(st.session_state['_html'][1]) / 1024 / 1024:.2f} MB")

    with c3:
        if pendientes:
            st.warning(
                f"Quedan **{pendientes} de {len(huecos.CATALOGO)} huecos** sin rellenar. El "
                f"documento se genera igual: los que sean estructurales saldrán declarados con "
                f"su motivo y el resto simplemente no aparecerán. Ninguno se rellena con un "
                f"número verosímil.", icon=":material/edit_note:")
        else:
            st.success("Todos los bloques del analista están cubiertos.",
                       icon=":material/task_alt:")


# ---------------------------------------------------------------------------
# Programa principal
# ---------------------------------------------------------------------------

def main() -> None:
    st.title("Warrants & Co. — Generador de informes")

    ticker = _selector_valor()
    if not ticker:
        return

    st.sidebar.markdown("### Formato del informe")
    fmt = st.sidebar.selectbox(
        "Documento a publicar", formatos.FORMATOS,
        format_func=lambda f: f"{f.nombre} · {f.hojas}",
        help="Todos los formatos salen del MISMO modelo y de las mismas descargas: "
             "cambiar de formato no vuelve a bajar nada ni mueve una sola cifra, "
             "solo cambia qué se publica y con qué maqueta.")
    st.sidebar.caption(fmt.para)

    entradas = barra_lateral(ticker)
    autorrelleno = st.sidebar.checkbox(
        "Rellenar solo los huecos derivables", value=True,
        help="Con la casilla puesta, el motor propone los bloques que puede derivar de fuentes "
             "reales —directivos, sorpresas de resultados, separación del consenso, track "
             "record— y los publica marcados con su procedencia. Quitándola, el informe sale con "
             "todos los huecos vacíos y se ve exactamente cuánto material falta por aportar.")
    con_graficos = st.sidebar.checkbox(
        "Renderizar los gráficos a imagen", value=True,
        help="Necesario para el PDF y para el HTML exportable. Añade cerca de un minuto a la "
             "primera generación de cada valor.")
    if st.sidebar.button("Rehacer el informe", use_container_width=True,
                         help="Vuelve a descargar los datos y a montar el modelo desde cero."):
        # El botón dice «vuelve a descargar», así que tira TAMBIÉN la descarga
        # guardada y las imágenes ya dibujadas. Tirando solo el informe, el
        # botón habría prometido una cosa y hecho otra.
        for memoria in ("_construido", "_descarga", "_pdf", "_html"):
            st.session_state.pop(memoria, None)
        graficos.olvidar_figuras()

    entradas.autorrelleno = autorrelleno
    inf, d = construir(entradas, con_graficos)
    if inf is None:
        return
    if not inf.ficha.nombre:
        # Cada uno de los dos casos pide algo distinto del analista: uno,
        # corregir el símbolo; el otro, esperar. Decirle que revise un ticker
        # correcto porque el proveedor iba estrangulado le hace perder el
        # tiempo en el sitio equivocado.
        if d is not None and d.simbolo_desconocido is False:
            st.error(f"El proveedor no ha servido la ficha de «{ticker}». El símbolo puede ser "
                     f"correcto: lo que no ha habido es respuesta. Suele ser el límite de "
                     f"peticiones, y se pasa en un minuto —vuelve a intentarlo—.")
            motivos = [f for f in (d.fallos or []) if f.startswith("ficha general:")]
            if motivos:
                with st.expander("Lo que ha contestado el proveedor"):
                    st.code(motivos[0])
        else:
            st.error(f"El proveedor no reconoce el símbolo «{ticker}». Comprueba el ticker y su "
                     f"sufijo de mercado en el desplegable.")
        return

    # El objetivo lo fija el analista, pero el modelo deja su referencia en la
    # casilla para que la decisión parta de un número y no de cero.
    sugerido = inf.precio_objetivo.objetivo.numero()
    if sugerido and not entradas.precio_objetivo:
        st.session_state[f"objetivo_sugerido::{ticker}"] = round(float(sugerido), 2)

    # El panorama solo lo llevan dos de los cinco formatos: pedirlo siempre
    # serian doce descargas para un tearsheet que no lo publica.
    pan = None
    if formatos.necesita_panorama(fmt.clave):
        sector = inf.ficha.sector.texto() if inf.ficha.sector.hay else ""
        with st.spinner("Leyendo el marco de mercado…"):
            pan = _panorama(sector, str(date.today()))

    mostrar_informe(inf, entradas, fmt.clave, pan)
    pie_descarga(inf, entradas, fmt, pan)


if __name__ == "__main__":
    main()
