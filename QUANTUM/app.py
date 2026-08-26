"""Analizador Cuantitativo de Carteras -- Warrants & Co.

Implementa las 15 secciones del índice de referencia (composición, KPIs,
salud, sensibilidad asimétrica, distribución, curva de capital, drawdowns,
cono de volatilidad, stress testing, correlaciones, atribución, frontera
eficiente, rebalanceo, Monte Carlo y factores) más las correcciones de
metodología señaladas en el documento fuente. Toda la lógica de calculo
vive en engine.py; este modulo solo orquesta datos y renderiza.

Estilo nativo de Streamlit (config.toml para colores/bordes/tipografia;
sin CSS personalizado) más Plotly para los gráficos.
"""

from __future__ import annotations

import html
from datetime import date

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import engine as eng
import storage

# ---------------------------------------------------------------------------
# Configuracion visual
# ---------------------------------------------------------------------------

st.set_page_config(page_title="Analizador Cuantitativo de Carteras", page_icon=":material/monitoring:", layout="wide")

# Serif editorial en los titulares. Se hace con CSS porque `theme.headingFont`
# de config.toml NO llega a aplicarse en Streamlit 1.60 (la fuente del cuerpo
# gana en la cascada; comprobado midiendo el font-family calculado del <h1> en
# el navegador). La familia si se carga desde config.toml, asi que aqui solo
# hace falta apuntarla, no volver a importarla.
st.html(
    """
    <style>
      h1, h2, h3 {
        font-family: "Source Serif 4", Georgia, "Times New Roman", serif !important;
        letter-spacing: -0.005em;
      }
      /* Cifras alineadas en columna dentro de tablas y metricas: en un informe
         financiero las cifras se comparan en vertical, no se leen como texto. */
      [data-testid="stMetricValue"], [data-testid="stDataFrameResizable"] {
        font-variant-numeric: tabular-nums;
      }
    </style>
    """
)

# Paleta de informe institucional. Debe permanecer en sintonía con
# .streamlit/config.toml: si cambian los colores del tema, estos también.
INK_PRIMARY = "#0d1b2e"     # casi negro con sesgo azul
INK_SECONDARY = "#4a5a70"   # pizarra, texto de apoyo
INK_MUTED = "#8494a8"       # ejes, notas al pie
GRID = "#dbe1ea"            # reglas finas
SURFACE = "#ffffff"         # lienzo del gráfico
CANVAS = "#f5f7fa"          # fondo secundario (cabeceras, bandas)
GOOD, WARNING, SERIOUS, CRITICAL = (eng.STATUS_COLORS["good"], eng.STATUS_COLORS["warning"],
                                     eng.STATUS_COLORS["serious"], eng.STATUS_COLORS["critical"])
NAVY = eng.ASSET_COLORWAY[0]
BLUE, RED = eng.ASSET_COLORWAY[1], eng.ASSET_COLORWAY[7]
INDIGO = eng.ASSET_COLORWAY[5]
GOLD = eng.ASSET_COLORWAY[4]
FONT_FAMILY = "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"


def section_title(number: str, title: str, caption: str = ""):
    st.badge(f"SECCIÓN {number}", color="gray")
    st.subheader(title)
    if caption:
        st.caption(caption)


def base_layout(fig: go.Figure, height: int = 380, showlegend: bool = True, title: str | None = None,
                 hovermode: str = "closest", reverse_y: bool = False):
    top_margin = 10
    if title:
        top_margin = 62 if showlegend else 36
    fig.update_layout(
        template="plotly_white",
        height=height,
        margin=dict(l=10, r=10, t=top_margin, b=10),
        paper_bgcolor=SURFACE,
        plot_bgcolor=SURFACE,
        font=dict(color=INK_SECONDARY, family=FONT_FAMILY, size=11.5),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0,
                     font=dict(size=11, color=INK_SECONDARY)),
        showlegend=showlegend,
        # Título del gráfico como epígrafe de informe: pequeño y en navy, no
        # como un titular decorativo.
        title=dict(text=title, y=0.98, yanchor="top",
                    font=dict(size=12.5, color=INK_PRIMARY, family=FONT_FAMILY)) if title else None,
        hovermode=hovermode,
        separators=",.",
    )
    # Rejilla horizontal fina y sin eje vertical: la lectura va por filas,
    # como en una tabla.
    fig.update_xaxes(showgrid=False, zeroline=False, linecolor=GRID,
                      tickfont=dict(size=10.5, color=INK_MUTED))
    fig.update_yaxes(showgrid=True, gridcolor=GRID, gridwidth=1, zeroline=False,
                      linecolor=GRID, tickfont=dict(size=10.5, color=INK_MUTED))
    if reverse_y:
        fig.update_yaxes(autorange="reversed")
    return fig


# Figuras capturadas para el informe exportable. Se rellena a medida que la
# página se dibuja, asi que el PDF contiene EXACTAMENTE los mismos gráficos que
# el usuario acaba de ver en pantalla, con sus mismos datos.
REPORT_FIGS: dict[str, go.Figure] = {}


def chart(fig: go.Figure, slot: str | None = None, **kwargs):
    """Pinta el gráfico y, si se le indica `slot`, guarda la figura para el
    informe exportable."""
    if slot:
        REPORT_FIGS[slot] = fig
    st.plotly_chart(fig, width="stretch", config={"displayModeBar": False}, **kwargs)


def pct(x, decimals=2) -> str:
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    return f"{x * 100:.{decimals}f}%"


def num(x, decimals=2) -> str:
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    return f"{x:.{decimals}f}"


CURRENCY_SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "CHF": "CHF ", "JPY": "¥", "CAD": "C$", "AUD": "A$"}
# Se reasigna al leer la configuracion; el valor inicial evita un NameError si
# alguna funcion de formato se invocase antes de ese punto.
CURRENCY_SYMBOL = "$"


def money(x, currency=None) -> str:
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    sym = currency if currency is not None else CURRENCY_SYMBOL
    return f"{sym}{x:,.0f}"


def money_short(x, currency=None) -> str:
    """Version abreviada (K/M) para espacios estrechos como una tarjeta de métrica."""
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    sym = currency if currency is not None else CURRENCY_SYMBOL
    a = abs(x)
    if a >= 1_000_000:
        return f"{sym}{x / 1_000_000:.2f}M"
    if a >= 1_000:
        return f"{sym}{x / 1_000:.0f}K"
    return f"{sym}{x:,.0f}"


def money_md(x, currency=None) -> str:
    """Como money(), pero para interpolar dentro de st.markdown/st.caption
    (o de un valor de st.metric) junto con OTRO importe en el mismo texto:
    Streamlit renderiza '$...$' como LaTeX, así que dos simbolos de moneda
    sin escapar en la misma cadena hacen que el texto entre ambos se
    interprete como formula matematica en vez de texto literal. Se escapa
    el simbolo para ese contexto. Un único importe suelto (sin pareja) no
    necesita esto -- solo hace falta al combinar 2+ importes en un string."""
    return money(x, currency).replace("$", r"\$")


def money_short_md(x, currency=None) -> str:
    return money_short(x, currency).replace("$", r"\$")


def months_label(m) -> str:
    if m is None:
        return "aún sin recuperar"
    if m < 1:
        return "menos de 1 mes"
    return f"{m:.1f} meses"


def asset_color_map(tickers) -> dict:
    return {t: eng.ASSET_COLORWAY[i % len(eng.ASSET_COLORWAY)] for i, t in enumerate(tickers)}


# ---------------------------------------------------------------------------
# Funciones cacheadas (datos de mercado + calculos pesados)
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner="Descargando precios de mercado...", ttl="12h")
def cached_download_prices(tickers: tuple, start, end):
    return eng.download_prices(list(tickers), start, end)


@st.cache_data(show_spinner="Consultando tasa libre de riesgo (US T-Bill 3M)...", ttl="12h")
def cached_risk_free(as_of: str):
    return eng.fetch_risk_free_rate(as_of)


# TTL alineado con el run_every del fragmento de la franja de cotizaciones:
# el refresco visual no debe traducirse en una peticion nueva a Yahoo.
@st.cache_data(show_spinner=False, ttl="120s")
def cached_quotes(tickers: tuple):
    return eng.fetch_quotes(list(tickers))


@st.cache_data(show_spinner="Detectando divisa de cotización de cada activo...", ttl="12h")
def cached_ticker_currencies(tickers: tuple):
    return eng.detect_ticker_currencies(list(tickers))


@st.cache_data(show_spinner="Descargando tipos de cambio...", ttl="12h")
def cached_fx_series(currencies: tuple, start, end, base: str):
    return eng.download_fx_series(list(currencies), start, end, base=base)


@st.cache_data(show_spinner="Revisando calidad de los datos de precios...", ttl="12h")
def cached_price_anomalies(prices: pd.DataFrame):
    return eng.detect_price_anomalies(prices)


@st.cache_data(show_spinner="Descargando factores Fama-French (Kenneth French Data Library)...", ttl="12h")
def cached_fama_french(start, end):
    return eng.fetch_fama_french_factors(start, end)


@st.cache_data(show_spinner="Optimizando frontera eficiente (Markowitz)...", ttl="6h")
def cached_markowitz(returns_assets, eff_weights, rf, seed):
    return eng.markowitz_summary(returns_assets, eff_weights, rf, seed=seed)


@st.cache_data(show_spinner="Simulando Buy & Hold...", ttl="6h")
def cached_buy_and_hold(prices, weights, capital):
    return eng.simulate_buy_and_hold(prices, weights, capital)


@st.cache_data(show_spinner="Simulando rebalanceo periódico...", ttl="6h")
def cached_rebalance(prices, weights, capital, frequency, commission_pct, tax_pct):
    return eng.simulate_rebalance(prices, weights, capital, frequency, commission_pct, tax_pct)


@st.cache_data(show_spinner="Ejecutando simulación Monte Carlo...", ttl="6h")
def cached_monte_carlo(monthly_returns, capital, contribution, horizon_years, n_sims, model, seed):
    return eng.monte_carlo_projection(monthly_returns, capital, contribution, horizon_years, n_sims, model, seed=seed)


def parse_portfolio_editor(df: pd.DataFrame) -> dict:
    weights: dict[str, float] = {}
    for _, row in df.iterrows():
        ticker = str(row.get("Ticker", "") or "").strip().upper()
        if not ticker or ticker.lower() == "none":
            continue
        try:
            w = float(row.get("Peso %", 0) or 0) / 100.0
        except (TypeError, ValueError):
            continue
        if w > 0:
            weights[ticker] = weights.get(ticker, 0.0) + w
    return weights


# ---------------------------------------------------------------------------
# Sidebar / configuracion
# ---------------------------------------------------------------------------

st.sidebar.title("Configuracion")

# ---------------------------------------------------------------------------
# Cuenta de usuario y carteras guardadas (Supabase)
# ---------------------------------------------------------------------------
# El cliente de Supabase se guarda en session_state, NO en st.cache_resource:
# cache_resource se comparte entre TODAS las sesiones del servidor, asi que un
# cliente cacheado con sesion iniciada filtraria el login de un usuario a todos
# los demas. session_state es por sesion de navegador, que es lo correcto aqui.

def get_supabase():
    """Cliente de Supabase de ESTA sesión, o None si no esta configurado."""
    if "sb_client" in st.session_state:
        return st.session_state["sb_client"]
    try:
        url = st.secrets.get("SUPABASE_URL", "")
        key = st.secrets.get("SUPABASE_KEY", "")
    except Exception:
        return None
    if not url or not key:
        return None
    try:
        st.session_state["sb_client"] = storage.get_client(url, key)
    except Exception:
        return None
    return st.session_state["sb_client"]


def render_cuenta_sidebar():
    sb = get_supabase()
    if sb is None:
        return

    usuario = st.session_state.get("sb_user")

    with st.sidebar.expander(
        f":material/account_circle: {usuario['email']}" if usuario else ":material/login: Cuenta",
        expanded=False,
    ):
        if usuario is None:
            st.caption("Crea una cuenta para guardar tus carteras y compararlas entre si.")
            tab_login, tab_registro = st.tabs(["Entrar", "Crear cuenta"])

            with tab_login:
                with st.form("form_login"):
                    email = st.text_input("Email", key="login_email")
                    pwd = st.text_input("Contrasena", type="password", key="login_pwd")
                    if st.form_submit_button("Entrar", width="stretch"):
                        try:
                            res = storage.iniciar_sesion(sb, email, pwd)
                            st.session_state["sb_user"] = {"id": res["user"].id, "email": res["user"].email}
                            st.rerun()
                        except storage.StorageError as exc:
                            st.error(str(exc))

            with tab_registro:
                with st.form("form_registro"):
                    email_r = st.text_input("Email", key="reg_email")
                    pwd_r = st.text_input("Contrasena", type="password", key="reg_pwd",
                                           help="Mínimo 6 caracteres.")
                    if st.form_submit_button("Crear cuenta", width="stretch"):
                        try:
                            res = storage.registrar(sb, email_r, pwd_r)
                            if res["requiere_verificacion"]:
                                st.info("Cuenta creada. Revisa tu email y confirma la direccion "
                                        "antes de iniciar sesión.")
                            else:
                                st.session_state["sb_user"] = {"id": res["user"].id,
                                                                "email": res["user"].email}
                                st.rerun()
                        except storage.StorageError as exc:
                            st.error(str(exc))
            return

        # --- Sesion iniciada -------------------------------------------------
        if st.button("Cerrar sesión", icon=":material/logout:", width="stretch"):
            storage.cerrar_sesion(sb)
            for k in ("sb_user", "sb_client", "carteras_guardadas"):
                st.session_state.pop(k, None)
            st.rerun()

        try:
            carteras = storage.listar_carteras(sb)
            st.session_state["carteras_guardadas"] = carteras
        except storage.StorageError as exc:
            st.error(str(exc))
            return

        st.markdown("**Guardar la cartera actual**")
        with st.form("form_guardar_cartera"):
            nombre = st.text_input("Nombre", placeholder="p.ej. Cartera principal")
            if st.form_submit_button("Guardar", icon=":material/save:", width="stretch"):
                cfg_actual = st.session_state.get("config", {})
                try:
                    storage.guardar_cartera(
                        sb, usuario["id"], nombre,
                        cfg_actual.get("weights_input", {}),
                        divisa_base=cfg_actual.get("divisa_base", "USD"),
                        benchmark=cfg_actual.get("benchmark", eng.DEFAULT_BENCHMARK),
                        capital_inicial=cfg_actual.get("capital_inicial", 10000.0),
                    )
                    st.success(f"Guardada como '{nombre}'.")
                    st.rerun()
                except storage.StorageError as exc:
                    st.error(str(exc))

        if carteras:
            st.markdown(f"**Tus carteras ({len(carteras)})**")
            for c in carteras:
                col_n, col_l, col_d = st.columns([3, 1, 1])
                col_n.caption(f"**{c['nombre']}** · {len(c['pesos'])} pos.")
                if col_l.button(":material/upload:", key=f"load_{c['id']}",
                                 help="Cargar esta cartera"):
                    st.session_state["config"] = dict(
                        st.session_state.get("config", {}),
                        weights_input=eng.normalize_weights(c["pesos"]),
                        divisa_base=c.get("divisa_base", "USD"),
                        benchmark=c.get("benchmark", eng.DEFAULT_BENCHMARK),
                        capital_inicial=float(c.get("capital_inicial", 10000.0)),
                    )
                    # El data_editor conserva estado por key: hay que soltarlo
                    # para que se repueble con la cartera recien cargada.
                    st.session_state.pop("portfolio_editor", None)
                    st.session_state["imported_portfolio"] = pd.DataFrame({
                        "Ticker": list(c["pesos"].keys()),
                        "Peso %": [v * 100 for v in c["pesos"].values()],
                    })
                    st.session_state.pop("import_info", None)
                    st.rerun()
                if col_d.button(":material/delete:", key=f"del_{c['id']}",
                                 help="Borrar esta cartera"):
                    try:
                        storage.borrar_cartera(sb, c["id"])
                        st.rerun()
                    except storage.StorageError as exc:
                        st.error(str(exc))


render_cuenta_sidebar()

# El uploader va FUERA del formulario: debe procesarse en cuanto se sube el
# archivo, para que la tabla de cartera del formulario ya aparezca rellena
# con las posiciones importadas (dentro del form no se ejecutaria hasta
# pulsar "Actualizar analisis", que es justo lo contrario de lo que se
# espera al soltar un fichero).
uploaded = st.sidebar.file_uploader(
    "Importar cartera (Excel o CSV)", type=["xlsx", "xls", "csv"],
    help="El archivo debe tener una columna de ticker (Ticker / ticker_yahoo / symbol) y otra de peso "
         "(Peso % / peso norm / weight). Las filas sin ticker (liquidez), con peso 0 o marcadas como "
         "'REVISAR' se excluyen y el resto se renormaliza a 100%.",
)

if uploaded is not None:
    file_signature = (uploaded.name, uploaded.size)
    if st.session_state.get("uploaded_signature") != file_signature:
        try:
            imported_df, import_info = eng.parse_uploaded_portfolio(uploaded, uploaded.name)
            st.session_state["imported_portfolio"] = imported_df
            st.session_state["import_info"] = import_info
            st.session_state["uploaded_signature"] = file_signature
            # El data_editor conserva su estado por 'key'; hay que soltarlo
            # para que se repueble con la cartera recien importada.
            st.session_state.pop("portfolio_editor", None)
            # Aplicar la cartera importada a la configuracion ACTIVA en el
            # acto. Sin esto, el rerun de la subida re-renderiza toda la
            # pagina con el `cfg` anterior (la cartera de ejemplo) hasta que
            # el usuario pulse "Actualizar analisis": el resultado es una
            # pagina incoherente, con la cabecera ya mostrando la cartera
            # nueva pero las secciones pesadas (12-15) todavia calculadas
            # sobre la vieja. Subir un fichero ES la intencion de analizarlo.
            if "config" in st.session_state:
                st.session_state["config"]["weights_input"] = eng.normalize_weights(
                    {row["Ticker"]: float(row["Peso %"]) for _, row in imported_df.iterrows()
                     if float(row["Peso %"]) > 0}
                )
            st.rerun()
        except Exception as exc:
            st.sidebar.error(f"No se pudo importar el archivo: {exc}")

import_info = st.session_state.get("import_info")
if import_info:
    with st.sidebar.container(border=True):
        c_ok, c_ex = st.columns(2)
        c_ok.metric("Posiciones", import_info["n_valid"],
                    help="Filas con ticker y peso válidos, renormalizadas al 100%.")
        c_ex.metric("Filas excluidas", import_info["n_excluded"],
                    help="Liquidez, peso 0% o ticker pendiente de revisar.")
        st.caption(f":material/check_circle: Importado desde **{st.session_state.get('uploaded_signature', ('archivo',))[0]}**")
        peso_bruto = import_info.get("peso_bruto_valido_pct")
        if peso_bruto is not None and abs(peso_bruto - 100.0) > 0.5:
            st.warning(
                f"Los pesos válidos del archivo sumaban **{peso_bruto:.1f}%** (no 100%). Se han "
                f"reescalado proporcionalmente a 100% -- no se asume liquidez ni apalancamiento.",
                icon=":material/scale:",
            )
        negativos = [e for e in import_info["excluded"] if e.get("peso", 0) < 0]
        if negativos:
            detalle = ", ".join(f"{e['ticker']} ({e['peso']:.1f}%)" for e in negativos)
            st.warning(
                f"Posición(es) corta(s) excluida(s) -- el peso negativo no esta soportado: {detalle}. "
                "El resto de la cartera se ha renormalizado sin ella(s).",
                icon=":material/trending_down:",
            )
        if import_info["excluded"]:
            with st.expander(f"Ver las {import_info['n_excluded']} filas excluidas"):
                st.dataframe(pd.DataFrame(import_info["excluded"]), hide_index=True, width="stretch")
    if st.sidebar.button("Descartar importación y volver a la cartera de ejemplo",
                          icon=":material/restart_alt:", width="stretch"):
        for k in ("imported_portfolio", "import_info", "uploaded_signature", "portfolio_editor"):
            st.session_state.pop(k, None)
        st.rerun()

with st.sidebar.form("config_form"):
    st.markdown("**Cartera**")
    if "imported_portfolio" in st.session_state:
        base_portfolio_df = st.session_state["imported_portfolio"]
    else:
        base_portfolio_df = pd.DataFrame({
            "Ticker": eng.DEFAULT_TICKERS,
            "Peso %": [eng.DEFAULT_WEIGHTS[t] * 100 for t in eng.DEFAULT_TICKERS],
        })
    portfolio_df = st.data_editor(
        base_portfolio_df, num_rows="dynamic", hide_index=True, width="stretch",
        column_config={
            "Ticker": st.column_config.TextColumn("Ticker", width="small"),
            "Peso %": st.column_config.NumberColumn("Peso %", min_value=0.0, max_value=100.0, step=0.01,
                                                     format="%.2f%%", width="small"),
        },
        key="portfolio_editor",
    )
    divisa_base = st.selectbox(
        "Divisa base", ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"], index=0,
        help="Todos los precios se convierten a esta divisa con tipos de cambio diarios reales antes de "
             "calcular ninguna métrica. Imprescindible si la cartera cotiza en varios mercados: sin "
             "convertir, las rentabilidades mezclarian el movimiento del activo con el de su divisa.",
    )
    capital_inicial = st.number_input("Capital inicial", min_value=100.0, value=10000.0, step=1000.0)
    periodo_analisis = st.slider("Periodo de análisis (años)", 1, 100, 5)
    benchmark = st.text_input("Benchmark", value=eng.DEFAULT_BENCHMARK)

    st.markdown("**Riesgo**")
    var_confianza_pct = st.slider("Confianza VaR / CVaR (%)", 80, 100, 95)
    rf_mode = st.segmented_control("Tasa libre de riesgo (Rf)", ["Automática (US T-Bill 3M)", "Manual"],
                                    default="Automática (US T-Bill 3M)")
    rf_manual = st.number_input("Rf manual", min_value=0.0, max_value=0.25, value=0.04, step=0.0025, format="%.4f")
    if divisa_base != "USD" and rf_mode != "Manual":
        st.caption(
            f":material/warning: La Rf automática (^IRX, US T-Bill 3M) esta en USD; tu cartera esta en "
            f"{divisa_base}. Para Sharpe/Sortino/Alfa rigurosos en {divisa_base}, considera pasar a 'Manual' "
            f"con un tipo libre de riesgo de esa divisa (p.ej. EURIBOR/deuda publica a corto plazo)."
        )
    vol_max_pct = st.number_input("Volatilidad máxima permitida (%)", 1.0, 100.0, 15.0)
    caida_max_pct = st.number_input("Caída máxima tolerada (%)", 1.0, 100.0, 25.0)
    sharpe_min_val = st.number_input("Sharpe mínimo exigido", 0.0, 5.0, 1.0, step=0.1)

    st.caption("Los parámetros de Monte Carlo (Seccion 14) son en vivo -- se ajustan directamente en esa seccion, "
               "sin pasar por este formulario.")

    st.markdown("**Rebalanceo**")
    freq_rebal = st.segmented_control("Frecuencia", ["ninguno", "anual", "trimestral", "mensual"], default="anual")
    aplicar_costes = st.checkbox("Aplicar comisión + retención fiscal", value=False)
    comision_pct = st.number_input("Comisión por transaccion (%)", 0.0, 5.0, 0.10, step=0.05)
    retencion_pct = st.number_input("Retención fiscal sobre plusvalia (%)", 0.0, 55.0, 19.0, step=1.0)

    submitted = st.form_submit_button("Actualizar análisis", width="stretch")

if submitted or "config" not in st.session_state:
    st.session_state["config"] = dict(
        weights_input=parse_portfolio_editor(portfolio_df),
        divisa_base=divisa_base,
        capital_inicial=capital_inicial,
        periodo_analisis=periodo_analisis,
        benchmark=(benchmark or eng.DEFAULT_BENCHMARK).strip(),
        var_confianza=var_confianza_pct / 100.0,
        rf_mode=rf_mode or "Automática (US T-Bill 3M)",
        rf_manual=rf_manual,
        vol_max=vol_max_pct / 100.0,
        caida_max=caida_max_pct / 100.0,
        sharpe_min=sharpe_min_val,
        freq_rebal=freq_rebal or "ninguno",
        aplicar_costes=aplicar_costes,
        comision=comision_pct / 100.0,
        retencion=retencion_pct / 100.0,
    )

cfg = st.session_state["config"]
weights_input = cfg["weights_input"]
BASE_CURRENCY = cfg.get("divisa_base", "USD")
CURRENCY_SYMBOL = CURRENCY_SYMBOLS.get(BASE_CURRENCY, BASE_CURRENCY + " ")

# Nombres legibles: los de la cartera de ejemplo, mas los que traiga el
# archivo importado (columna 'emisor'/'nombre'/...). Si no hay nombre, el
# propio ticker hace de etiqueta.
ASSET_NAMES = dict(eng.DEFAULT_NAMES)
ASSET_NAMES.update((st.session_state.get("import_info") or {}).get("names", {}))


def asset_name(ticker: str) -> str:
    return ASSET_NAMES.get(ticker, ticker)

st.title("Analizador Cuantitativo de Carteras")
st.caption(
    "Motor de análisis de riesgo, rendimiento, optimización y simulación para carteras de inversión. "
    "Todas las métricas se calculan sobre datos de mercado reales descargados en el momento."
)


@st.fragment(run_every="120s")
def market_ticker_strip(quote_tickers: tuple):
    """Franja de cotizaciones (último cierre y variacion frente al anterior).
    Se auto-refresca cada 2 min, pero la descarga esta cacheada con el mismo
    TTL: el refresco NO dispara una peticion nueva a Yahoo en cada ciclo ni
    por cada usuario -- la cache de Streamlit es de servidor, compartida.
    Es informativa: si la descarga falla, la franja simplemente no se
    dibuja, nunca tumba la página."""
    try:
        quotes = cached_quotes(quote_tickers)
    except Exception:
        return
    if not quotes:
        return

    items = []
    for t, q in quotes.items():
        up = q["cambio_pct"] >= 0
        color = GOOD if up else CRITICAL
        arrow = "&#9650;" if up else "&#9660;"
        items.append(
            f'<span class="tk-item"><span class="tk-sym">{html.escape(t)}</span>'
            f'<span class="tk-px">{q["precio"]:,.2f}</span>'
            f'<span class="tk-chg" style="color:{color}">{arrow} {q["cambio_pct"] * 100:+.2f}%</span></span>'
        )

    as_of = max(q["fecha"] for q in quotes.values()).date().isoformat()
    st.html(
        f"""
        <style>
          .tk-strip {{
            display: flex; flex-wrap: wrap; gap: 0 1.6rem; align-items: baseline;
            padding: .5rem .75rem; border: 1px solid {GRID}; border-radius: 8px;
            background: {SURFACE}; font-size: .82rem; overflow-x: auto;
            font-variant-numeric: tabular-nums;
          }}
          .tk-item {{ display: inline-flex; gap: .45rem; align-items: baseline; white-space: nowrap; }}
          .tk-sym {{ font-weight: 700; color: {INK_PRIMARY}; letter-spacing: .02em; }}
          .tk-px {{ color: {INK_SECONDARY}; }}
          .tk-chg {{ font-weight: 600; }}
          .tk-asof {{ color: {INK_MUTED}; font-size: .72rem; margin-left: auto; padding-left: 1rem; }}
        </style>
        <div class="tk-strip">{''.join(items)}<span class="tk-asof">cierre {as_of}</span></div>
        """
    )


if not weights_input:
    st.error("Anade al menos un activo con peso > 0% en la tabla de cartera de la barra lateral.")
    st.stop()

market_ticker_strip(tuple(dict.fromkeys(list(weights_input.keys()) + [cfg["benchmark"]])))

# ---------------------------------------------------------------------------
# Pipeline de datos
# ---------------------------------------------------------------------------

tickers = list(weights_input.keys())
benchmark = cfg["benchmark"]
proxy_tickers = list(eng.STYLE_PROXIES.values())
all_tickers = list(dict.fromkeys(tickers + [benchmark] + proxy_tickers))

today = date.today()
full_history_start = date(1998, 1, 1)

try:
    prices_all = cached_download_prices(tuple(all_tickers), full_history_start, today)
except Exception as exc:
    st.error(f"No se pudieron descargar datos de mercado: {exc}")
    st.stop()

if prices_all.empty or benchmark not in prices_all.columns or prices_all[benchmark].dropna().empty:
    st.error("No se pudieron descargar precios válidos para la cartera o el benchmark. Revisa los tickers o tu conexión a internet.")
    st.stop()

# --- Conversion a divisa base -------------------------------------------------
# Cada activo se descarga en su divisa nativa de cotizacion. Sin convertir, una
# cartera multi-mercado mezclaria el movimiento del activo con el de su divisa,
# y las correlaciones/volatilidades saldrian mal. La divisa la reporta Yahoo
# (no se asume por el sufijo del ticker), incluyendo el caso GBp = peniques.
ticker_currencies = cached_ticker_currencies(tuple(prices_all.columns))
distinct_currencies = sorted({
    eng.PENCE_CURRENCY_MAP.get(c, c).upper() for c in ticker_currencies.values() if c
})
needs_fx = [c for c in distinct_currencies if c != BASE_CURRENCY]

fx_rates = pd.DataFrame()
if needs_fx:
    try:
        fx_rates = cached_fx_series(tuple(needs_fx), full_history_start, today, BASE_CURRENCY)
    except Exception as exc:
        st.error(f"No se pudieron descargar los tipos de cambio necesarios ({', '.join(needs_fx)}): {exc}")
        st.stop()

prices_all, fx_unconverted = eng.convert_prices_to_base(prices_all, ticker_currencies, fx_rates, base=BASE_CURRENCY)

if fx_unconverted:
    if benchmark in fx_unconverted:
        st.error(
            f"No se pudo descargar el tipo de cambio para convertir el benchmark ({benchmark}) a {BASE_CURRENCY}. "
            "Prueba de nuevo en unos segundos (fallo típico de Yahoo Finance bajo carga) o elige otro benchmark."
        )
        st.stop()
    fx_unconverted_in_cartera = [t for t in fx_unconverted if t in tickers]
    if fx_unconverted_in_cartera:
        st.warning(
            f"Sin tipo de cambio disponible para convertir a {BASE_CURRENCY}: "
            f"{', '.join(fx_unconverted_in_cartera)}. Se excluyen de este análisis en vez de mezclarlos sin "
            f"convertir (eso falsearía rentabilidad y volatilidad de toda la cartera). Suele ser un fallo "
            f"transitorio de Yahoo Finance -- vuelve a pulsar 'Actualizar análisis' para reintentarlo."
        )
        weights_input = {t: w for t, w in weights_input.items() if t not in fx_unconverted_in_cartera}
        tickers = [t for t in tickers if t not in fx_unconverted_in_cartera]
        if not weights_input:
            st.error("Tras excluir los activos sin tipo de cambio disponible no queda ninguna posición analizable.")
            st.stop()

if len(distinct_currencies) > 1:
    ccy_counts = {}
    for t in tickers:
        c = ticker_currencies.get(t) or BASE_CURRENCY
        c = eng.PENCE_CURRENCY_MAP.get(c, c).upper()
        ccy_counts[c] = ccy_counts.get(c, 0) + 1
    resumen = " · ".join(f"{c}: {n}" for c, n in sorted(ccy_counts.items(), key=lambda kv: -kv[1]))
    st.info(f"Cartera multi-divisa convertida a {BASE_CURRENCY} con tipos de cambio diarios reales. "
            f"Divisas de cotización detectadas — {resumen}.")

# --- Control de calidad de los datos de precios -------------------------------
# Un split o dividendo mal retroajustado por el proveedor produce saltos
# imposibles (p.ej. -100% o +800% en una sesion) que contaminarian CAGR,
# volatilidad, curtosis y stress test. Se detectan y se excluyen los casos
# imposibles, avisando siempre al usuario en vez de fallar en silencio.
anomalies = cached_price_anomalies(prices_all[[c for c in prices_all.columns if c in tickers or c == benchmark]])
hard_anomaly_tickers = sorted({t for t, evs in anomalies.items() if any(e["severity"] == "hard" for e in evs)})
soft_anomaly_tickers = sorted({t for t, evs in anomalies.items()
                                if t not in hard_anomaly_tickers and any(e["severity"] == "soft" for e in evs)})

if benchmark in hard_anomaly_tickers:
    st.error(
        f"El benchmark ({benchmark}) tiene saltos de precio diario matemáticamente imposibles en su histórico "
        "(probable split/dividendo mal retroajustado por el proveedor de datos). No se puede usar de forma "
        "fiable para Beta/Alfa/comparativas -- elige otro benchmark en la barra lateral."
    )
    st.stop()

if hard_anomaly_tickers:
    detail_rows = []
    for t in hard_anomaly_tickers:
        for e in anomalies[t]:
            if e["severity"] == "hard":
                detail_rows.append({"Ticker": t, "Fecha": e["date"].date(), "Salto diario": f"{e['return']:+,.1%}"})
    st.error(
        f"**Datos de precio no fiables — {len(hard_anomaly_tickers)} activo(s) excluido(s) del análisis: "
        f"{', '.join(hard_anomaly_tickers)}.** Presentan saltos diarios matemáticamente imposibles, la firma "
        f"típica de un split o dividendo que el proveedor de datos no ha retroajustado bien. Incluirlos "
        f"falsearía rentabilidad, volatilidad y stress test de toda la cartera."
    )
    with st.expander("Ver los saltos detectados"):
        st.dataframe(pd.DataFrame(detail_rows), hide_index=True, width="stretch")
    weights_input = {t: w for t, w in weights_input.items() if t not in hard_anomaly_tickers}
    tickers = [t for t in tickers if t not in hard_anomaly_tickers]
    if not weights_input:
        st.error("Tras excluir los activos con datos corruptos no queda ninguna posición analizable.")
        st.stop()

if soft_anomaly_tickers:
    st.warning(
        f"Movimientos diarios muy extremos (>60%) detectados en: {', '.join(soft_anomaly_tickers)}. "
        f"Se mantienen en el análisis porque pueden ser reales (microcaps ilíquidos, opas, reestructuraciones), "
        f"pero conviene revisarlos: elevan la volatilidad y la curtosis de la cartera."
    )

rf_auto, rf_label_auto = cached_risk_free(today.isoformat())
if cfg["rf_mode"] == "Manual":
    rf, rf_label = cfg["rf_manual"], f"Manual: {cfg['rf_manual']:.2%}"
else:
    rf, rf_label = rf_auto, rf_label_auto

prices_window = eng.slice_window(prices_all, cfg["periodo_analisis"])

# Un ticker sin ningun dato en la ventana (invalido, mal escrito, delistado)
# se descarta ANTES de intersecar fechas: de lo contrario una sola columna
# vacia arrastraria un dropna() vacio para toda la cartera.
tickers_with_data = [t for t in tickers if t in prices_window.columns and not prices_window[t].dropna().empty]
dropped_no_data = sorted(set(tickers) - set(tickers_with_data))
if dropped_no_data:
    st.warning(f"Se excluyeron por no tener ningun dato en el periodo: {', '.join(dropped_no_data)}")
if not tickers_with_data:
    st.error("Ninguno de los tickers de la cartera tiene datos de mercado en el periodo seleccionado.")
    st.stop()

usable = eng.common_window(prices_window, tickers_with_data + [benchmark])

if usable.shape[0] < 30:
    st.error(
        "No hay suficientes sesiones comunes en el periodo seleccionado (mínimo ~30). "
        "Prueba un periodo mayor o revisa que los tickers coticen actualmente."
    )
    st.stop()

eff_weights = eng.effective_weights(usable[tickers_with_data], weights_input)
dropped = sorted(set(weights_input) - set(eff_weights) - set(dropped_no_data))
if dropped:
    st.warning(f"Se excluyeron por falta de datos suficientes en el periodo comun: {', '.join(dropped)}")
if len(eff_weights) < 2:
    st.warning("Con menos de 2 activos no es posible calcular correlaciones, diversificación ni frontera eficiente.")

actual_start = usable.index.min()
actual_end = usable.index.max()
actual_years = (actual_end - actual_start).days / 365.25
if actual_years < cfg["periodo_analisis"] * 0.9:
    st.info(
        f"Periodo efectivamente analizado: {actual_years:.1f} años "
        f"({actual_start.date()} a {actual_end.date()}), limitado por el activo más reciente en cotizar "
        f"dentro de tu cartera."
    )

active_tickers = list(eff_weights.keys())
# Firma estable de "que cartera es esta" -- se usa como sufijo de `key=` en
# graficos/tablas/metricas de aqui en adelante. Sin esto, el frontend de
# Streamlit puede reconciliar mal un componente (mostrar datos de una
# cartera anterior) cuando la estructura del script cambia mucho entre
# ejecuciones (p.ej. pasar de 7 a 45 activos, con avisos nuevos por
# multi-divisa/anomalias insertados antes en la pagina) -- reproducido en
# un navegador real al importar una cartera grande tras la de ejemplo; no
# se reproduce en pruebas headless porque es un efecto de reconciliacion
# del lado del navegador, no un bug de calculo.
psig = f"{BASE_CURRENCY}_{len(active_tickers)}_{abs(hash(tuple(sorted(active_tickers)))) % 10**8}"
returns_assets = eng.daily_returns(usable[active_tickers])
bench_returns = eng.daily_returns(usable[[benchmark]]).iloc[:, 0]
# Buy & Hold real (acciones fijas, pesos que derivan con el precio) -- NO un
# rebalanceo diario implicito.
port_ret = eng.buy_and_hold_return_series(usable[active_tickers], eff_weights)
cum = eng.cumulative_curve(port_ret)
bench_cum = eng.cumulative_curve(bench_returns)
colors = asset_color_map(active_tickers)

valor_final = cfg["capital_inicial"] * float(cum.iloc[-1] / 100.0)
port_cagr = eng.cagr_from_returns(port_ret)
port_vol = eng.annualized_volatility(port_ret)
bench_cagr = eng.cagr_from_returns(bench_returns)
bench_vol = eng.annualized_volatility(bench_returns)
sharpe = eng.sharpe_ratio(port_ret, rf)
sortino = eng.sortino_ratio(port_ret, rf)
beta, alpha = eng.beta_alpha_jensen(port_ret, bench_returns, rf)
var_h, cvar_h = eng.historical_var_cvar(port_ret, cfg["var_confianza"])
mdd = eng.max_drawdown(cum)
bench_sharpe = eng.sharpe_ratio(bench_returns, rf)

# ===========================================================================
# 01-02. Contexto general + Radiografia global
# ===========================================================================

section_title("01-02", "Radiografia de la cartera")
st.markdown(
    f"En los últimos **{actual_years:.1f} años**, **{money_md(cfg['capital_inicial'])}** en esta cartera "
    f"(Buy & Hold, sin rebalancear) se habrían convertido en **{money_md(valor_final)}** — una media del "
    f"**{pct(port_cagr, 2)} anual**, atravesando una caída máxima del **{pct(abs(mdd), 2)}** por el camino. "
    f"En el mismo periodo, el benchmark ({benchmark}) hizo un **{pct(bench_cagr, 2)} anual**. "
    f"*Rf aplicada: {rf_label}.*"
)

col_pie, col_table = st.columns([1, 1])
with col_pie:
    fig = go.Figure(data=[go.Pie(
        labels=active_tickers, values=[eff_weights[t] for t in active_tickers], hole=0.55,
        marker=dict(colors=[colors[t] for t in active_tickers], line=dict(color=SURFACE, width=2)),
        textinfo="label+percent", sort=False,
    )])
    base_layout(fig, height=340, showlegend=False, title="Composición de la cartera")
    chart(fig, "composicion")
with col_table:
    comp_df = pd.DataFrame({
        "Ticker": active_tickers,
        "Nombre": [asset_name(t) for t in active_tickers],
        "Peso": [eff_weights[t] for t in active_tickers],
    })
    st.dataframe(comp_df, hide_index=True, width="stretch", height=340,
                 column_config={"Peso": st.column_config.NumberColumn(format="percent")})

with st.container(horizontal=True):
    st.metric("Rentabilidad anual", pct(port_cagr), border=True,
              help="Rentabilidad geométrica anualizada (CAGR) de una cartera Buy & Hold en el periodo.")
    st.metric("Volatilidad anual", pct(port_vol), border=True,
              help="Desviacion típica de los retornos diarios, anualizada.")
    st.metric("Ratio de Sharpe", num(sharpe), border=True, help=f"(Rentabilidad - Rf) / Volatilidad. Rf = {rf_label}.")
    st.metric("Ratio de Sortino", num(sortino), border=True,
              help="Como el Sharpe, pero penaliza solo la volatilidad de las caídas (semivarianza sobre N total).")
    st.metric("Alfa anual (Jensen)", pct(alpha), border=True,
              help="Exceso de retorno frente al CAPM: Alfa = R_cartera - [Rf + Beta*(R_bench - Rf)].")

with st.container(horizontal=True):
    st.metric("Beta vs mercado", num(beta), border=True, help=f"Sensibilidad frente a {benchmark}. 1 = se mueve igual que el mercado.")
    st.metric(f"VaR diario {cfg['var_confianza']:.0%}", pct(var_h), border=True,
              help="Pérdida diaria que no se supera el X% de los días (método histórico).")
    st.metric(f"CVaR diario {cfg['var_confianza']:.0%}", pct(cvar_h), border=True,
              help="Pérdida media en el peor tramo de días (Expected Shortfall).")
    st.metric("Peor caída (MDD)", pct(mdd), border=True, help="Máxima caída desde un máximo histórico hasta el mínimo posterior.")
    st.metric(f"{benchmark} anual", pct(bench_cagr), border=True,
              help=f"Rentabilidad y volatilidad anualizadas del benchmark: {pct(bench_cagr)} / {pct(bench_vol)}.")

# ===========================================================================
# 03. Diagnostico de salud
# ===========================================================================

corr_matrix_full = eng.correlation_matrix(returns_assets) if len(active_tickers) >= 2 else pd.DataFrame()
avg_corr = eng.weighted_avg_correlation(corr_matrix_full, eff_weights) if len(active_tickers) >= 2 else float("nan")

section_title("03", "Diagnostico de salud de la cartera",
              "Resumen educativo (0-100) que combina retorno ajustado al riesgo, diversificación y "
              "resistencia a caídas. No es una recomendacion de inversión.")

hs = eng.health_score(sharpe, avg_corr if not np.isnan(avg_corr) else 0.5, mdd, cfg["caida_max"], bench_sharpe)
thresholds = eng.evaluate_thresholds(port_vol, mdd, sharpe, eng.AnalysisConfig(
    volatilidad_maxima_permitida=cfg["vol_max"], caida_maxima_tolerada=cfg["caida_max"], sharpe_minimo_exigido=cfg["sharpe_min"]))

col_gauge, col_bars = st.columns([1, 1.4])
with col_gauge:
    gauge_color = GOOD if hs["global"] >= 66 else (WARNING if hs["global"] >= 40 else CRITICAL)
    fig = go.Figure(go.Indicator(
        mode="gauge+number", value=hs["global"], number={"suffix": " /100", "font": {"size": 34}},
        gauge={
            "axis": {"range": [0, 100], "tickcolor": INK_MUTED},
            "bar": {"color": gauge_color, "thickness": 0.28},
            "bgcolor": SURFACE, "borderwidth": 0,
            "steps": [
                {"range": [0, 40], "color": "#f0e2e2"},
                {"range": [40, 66], "color": "#f2ecdb"},
                {"range": [66, 100], "color": "#dde8e1"},
            ],
        },
    ))
    base_layout(fig, height=260, showlegend=False, title="Puntuación global")
    chart(fig, "salud_global")
with col_bars:
    sub_labels = ["Retorno ajustado al riesgo", "Diversificacion", "Resistencia a caídas"]
    sub_values = [hs["retorno_ajustado_riesgo"], hs["diversificacion"], hs["resistencia_caidas"]]
    fig = go.Figure()
    fig.add_trace(go.Bar(y=sub_labels, x=sub_values, orientation="h", marker_color=NAVY, name="Tu cartera"))
    fig.add_trace(go.Scatter(y=sub_labels, x=[hs["media_mercado_referencia"]] * 3, mode="markers",
                              marker=dict(symbol="line-ns", size=22, line=dict(width=3, color=INK_SECONDARY)),
                              name="Media mercado (ref.)"))
    fig.update_xaxes(range=[0, 100])
    base_layout(fig, height=260, showlegend=True, title="Sub-scores (0-100)", reverse_y=True)
    chart(fig, "salud_subscores")

st.markdown("**Frente a tus límites de riesgo** *(configurables en la barra lateral -> Riesgo -> Actualizar análisis)*")
with st.container(horizontal=True):
    for key, label in [("volatilidad", "Volatilidad"), ("caida_maxima", "Caída máxima"), ("sharpe", "Sharpe")]:
        info = thresholds[key]
        ok = info["cumple"]
        st.metric(label, pct(info["valor"]) if key != "sharpe" else num(info["valor"]), border=True,
                  delta="Cumple" if ok else "No cumple", delta_color="normal" if ok else "inverse")

# ===========================================================================
# 04. Sensibilidad asimetrica
# ===========================================================================

section_title("04", "Sensibilidad asimétrica y mercado condicional",
              "Como se comporta la cartera relativo al mercado, separando días/meses al alza y a la baja.")

cap = eng.capture_ratios(port_ret, bench_returns, eng.AnalysisConfig().ventana_captura_meses)
cbeta = eng.conditional_beta(port_ret, bench_returns)

fig = go.Figure()
metrics_asym = [
    ("Captura de subidas", cap["upside_capture"], GOOD, True),
    ("Captura de bajadas", cap["downside_capture"], CRITICAL, True),
    ("Beta en subidas", cbeta["beta_subida"], BLUE, False),
    ("Beta en bajadas", cbeta["beta_bajada"], BLUE, False),
]
labels_asym = [m[0] for m in metrics_asym]
values_asym = [m[1] for m in metrics_asym]
colors_asym = [m[2] for m in metrics_asym]
valid_values = [v for v in values_asym if v is not None and not (isinstance(v, float) and np.isnan(v))]
fig.add_trace(go.Bar(y=labels_asym, x=values_asym, orientation="h", marker_color=colors_asym,
                      text=[pct(v) if is_pct else num(v) for _, v, _, is_pct in metrics_asym], textposition="outside"))
fig.add_vline(x=1.0, line_dash="dash", line_color=INK_MUTED)
if valid_values:
    fig.update_xaxes(range=[0, max(valid_values) * 1.2], title="Captura (ratio) / Beta condicional (coeficiente)")
base_layout(fig, height=300, showlegend=False, reverse_y=True,
            title=f"Ventana: últimos {cap['n_meses']} meses (linea = 100% / Beta 1)")
chart(fig, "sensibilidad")
st.caption(
    "Captura de subidas/bajadas: retorno medio mensual de la cartera dividido por el del benchmark en meses "
    "positivos/negativos. Beta condicional: misma idea calculada sobre retornos diarios."
)

# ===========================================================================
# 05. Distribucion estadistica de retornos diarios
# ===========================================================================

section_title("05", "Distribución estadística de retornos diarios")

var_g = eng.gaussian_var(port_ret, cfg["var_confianza"])
dist = eng.distribution_stats(port_ret)
conf_label = f"{cfg['var_confianza']:.0%}"

col_hist, col_stats = st.columns([2, 1])
with col_hist:
    r = port_ret.dropna()
    fig = go.Figure()
    fig.add_trace(go.Histogram(x=r, nbinsx=60, marker_color=BLUE, opacity=0.85, name="Cartera", histnorm="probability density"))
    x_range = np.linspace(r.min(), r.max(), 200)
    from scipy import stats as _stats
    normal_pdf = _stats.norm.pdf(x_range, r.mean(), r.std(ddof=1))
    fig.add_trace(go.Scatter(x=x_range, y=normal_pdf, mode="lines", line=dict(color=INK_SECONDARY, dash="dash"), name="Normal teórica"))
    fig.add_vline(x=-var_h, line_color=WARNING, annotation_text=f"VaR {conf_label}", annotation_position="top")
    fig.add_vline(x=-cvar_h, line_color=CRITICAL, annotation_text=f"CVaR {conf_label}", annotation_position="bottom")
    base_layout(fig, height=360, showlegend=True, title="Histograma de retornos diarios vs Normal")
    chart(fig, "distribucion")
with col_stats:
    with st.container(border=True):
        st.markdown("**Asimetría (Skewness)**")
        st.markdown(f"### {num(dist['skew'])}")
        st.caption("0 = simétrica. Negativa = colas de pérdida más largas que las de ganancia.")
    with st.container(border=True):
        st.markdown("**Curtosis (exceso)**")
        st.markdown(f"### {num(dist['kurtosis_exceso'])}")
        st.caption("Colas gordas si > 0: los días extremos ocurren más de lo que sugiere la campana de Gauss.")
    with st.container(border=True):
        st.markdown("**Ratio Omega**")
        st.markdown(f"### {num(dist['omega'])}")
        st.caption("Suma de ganancias / suma de pérdidas diarias. Por encima de 1, el conjunto gana.")

st.caption(f"VaR gaussiano/paramétrico {conf_label}: {pct(var_g)} · VaR histórico: {pct(var_h)} · CVaR histórico: {pct(cvar_h)}")

# ===========================================================================
# 06. Curva de capital, caidas acumuladas y retorno rodante
# ===========================================================================

section_title("06", "Curva de capital, caídas acumuladas y retorno rodante")

fig = go.Figure()
fig.add_trace(go.Scatter(x=cum.index, y=cum, mode="lines", name="Cartera (Buy & Hold)", line=dict(color=NAVY, width=2)))
fig.add_trace(go.Scatter(x=bench_cum.index, y=bench_cum, mode="lines", name=f"Benchmark ({benchmark})",
                          line=dict(color=INK_MUTED, width=1.6, dash="dot")))
for m in eng.CAPITAL_CURVE_MILESTONES:
    m_start, m_end = pd.Timestamp(m["start"]), pd.Timestamp(m["end"])
    if m_end >= cum.index.min() and m_start <= cum.index.max():
        fig.add_vrect(x0=max(m_start, cum.index.min()), x1=min(m_end, cum.index.max()),
                       fillcolor=INK_MUTED, opacity=0.10, line_width=0,
                       annotation_text=m["label"], annotation_position="top left", annotation_font_size=10)
base_layout(fig, height=380, showlegend=True, title="Curva de capital (base 100)", hovermode="x unified")
chart(fig, "curva_capital")

col_uw, col_rs = st.columns(2)
with col_uw:
    running_max = cum.cummax()
    dd_series = (cum / running_max - 1.0) * 100
    DRAWDOWN_LINE = "#9b2226"
    DRAWDOWN_FILL = "rgba(155,34,38,0.10)"
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=dd_series.index, y=dd_series, mode="lines", fill="tozeroy",
                              line=dict(color=DRAWDOWN_LINE, width=1.4), fillcolor=DRAWDOWN_FILL, name="Drawdown"))
    base_layout(fig, height=300, showlegend=False, title="Evolución del drawdown (%)", hovermode="x unified")
    chart(fig, "drawdown")
with col_rs:
    rs = eng.rolling_sharpe_series(port_ret, rf, eng.AnalysisConfig().ventana_sharpe_rodante_meses)
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=rs.index, y=rs, mode="lines", line=dict(color=BLUE, width=1.6), name="Sharpe rodante"))
    fig.add_hline(y=1.0, line_dash="dash", line_color=INK_MUTED)
    fig.add_hline(y=0.0, line_color=INK_MUTED, line_width=1)
    base_layout(fig, height=300, showlegend=False, title="Sharpe rodante (12 meses)", hovermode="x unified")
    chart(fig, "sharpe_rodante")

ui = eng.ulcer_index(cum)
mr = eng.martin_ratio(port_cagr * 100, ui, rf * 100)
with st.container(horizontal=True):
    st.metric("Ulcer Index", f"{ui:.2f}%", border=True,
              help="Dolor acumulado del inversor: combina profundidad y duración de las caídas.")
    st.metric("Ratio de Martin", num(mr), border=True,
              help=f"(CAGR% - Rf%) / Ulcer Index. Rf = {rf_label}.")

# ===========================================================================
# 07. Registro de los peores baches (Top 5 Drawdowns)
# ===========================================================================

section_title("07", "Registro de los peores baches (Top 5 Drawdowns)")

dd_top = eng.top_drawdowns(cum, 5)
if dd_top:
    dd_df = pd.DataFrame([{
        "#": i + 1,
        "Máximo previo": d["peak_date"].strftime("%Y-%m"),
        "Suelo": d["trough_date"].strftime("%Y-%m"),
        "Profundidad": months_label(d["fall_months"]),
        "Caída": d["depth_pct"],
        "Recuperación": months_label(d["recovery_months"]) if d["recovered"] else "aún sin recuperar",
    } for i, d in enumerate(dd_top)])
    st.dataframe(dd_df, hide_index=True, width="stretch",
                 column_config={"Caída": st.column_config.NumberColumn(format="percent")})
else:
    st.info("No se detectaron episodios de caída en el periodo seleccionado.")

# ===========================================================================
# 08. Dinamica rodante y cono de volatilidad
# ===========================================================================

section_title("08", "Dinámica rodante y cono de volatilidad")

col_corr, col_cone = st.columns(2)
with col_corr:
    rc = eng.rolling_correlation_series(port_ret, bench_returns, eng.AnalysisConfig().ventana_correlacion_rodante_meses)
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=rc.index, y=rc, mode="lines", line=dict(color=BLUE, width=1.6)))
    fig.update_yaxes(range=[-1, 1])
    base_layout(fig, height=300, showlegend=False, hovermode="x unified",
                title=f"Correlación rodante 3M con {benchmark} (último: {num(rc.iloc[-1]) if len(rc) else 'N/D'})")
    chart(fig, "correlacion_rodante")
with col_cone:
    cone = eng.volatility_cone(port_ret, eng.AnalysisConfig().ventanas_cono_volatilidad_meses)
    windows = [w for w in cone if cone[w] is not None]
    fig = go.Figure()
    if windows:
        p90 = [cone[w]["p90"] * 100 for w in windows]
        p10 = [cone[w]["p10"] * 100 for w in windows]
        p75 = [cone[w]["p75"] * 100 for w in windows]
        p25 = [cone[w]["p25"] * 100 for w in windows]
        median = [cone[w]["median"] * 100 for w in windows]
        actual = [cone[w]["actual"] * 100 for w in windows]
        x_labels = [f"{w}m" for w in windows]
        fig.add_trace(go.Scatter(x=x_labels + x_labels[::-1], y=p90 + p10[::-1], fill="toself", mode="lines",
                                  fillcolor="rgba(15,42,77,0.08)", line=dict(width=0, color="rgba(15,42,77,0.08)"),
                                  name="p10-p90"))
        fig.add_trace(go.Scatter(x=x_labels + x_labels[::-1], y=p75 + p25[::-1], fill="toself", mode="lines",
                                  fillcolor="rgba(15,42,77,0.18)", line=dict(width=0, color="rgba(15,42,77,0.18)"),
                                  name="p25-p75"))
        fig.add_trace(go.Scatter(x=x_labels, y=median, mode="lines", line=dict(color=INK_SECONDARY, dash="dash"), name="Mediana"))
        fig.add_trace(go.Scatter(x=x_labels, y=actual, mode="markers+lines", line=dict(color=BLUE),
                                  marker=dict(size=9, color=BLUE), name="Actual"))
    base_layout(fig, height=300, showlegend=True, title="Cono de volatilidad anualizada (%)")
    chart(fig, "cono_volatilidad")

# ===========================================================================
# 09. Pruebas de esfuerzo en crisis historicas
# ===========================================================================

section_title("09", "Pruebas de esfuerzo en crisis históricas (Stress Testing)",
              "Usa el histórico completo disponible (no limitado al periodo de análisis) para reconstruir cada crisis.")

stress = eng.stress_test(prices_all[active_tickers], eff_weights)
rows = []
for s in stress:
    if not s["disponible"]:
        rows.append({"Crisis": s["name"], "Periodo": f"{s['start'][:7]} -> {s['end'][:7]}", "Cobertura": "sin datos",
                     "Caída max.": "N/D", "Recuperación": "N/D"})
    else:
        rows.append({
            "Crisis": s["name"], "Periodo": f"{s['start'][:7]} -> {s['end'][:7]}",
            "Cobertura": pct(s["cobertura"], 0),
            "Caída max.": pct(s["caida_max"]),
            "Recuperación": months_label(s["recuperacion_meses"]) if s["recuperado"] else "aún sin recuperar",
        })
st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch", key=f"df_stress_{psig}")
st.caption(
    "Cobertura = % de la cartera (por peso) que ya cotizaba al inicio de la crisis; el resto se excluye y los "
    "pesos restantes se renormalizan para simular la crisis solo con los activos disponibles."
)

st.markdown("**Escenario personalizado**")
col_hist, col_shock = st.columns(2)

with col_hist:
    st.caption("Ventana histórica a medida -- mismo motor que las crisis de arriba, para cualquier periodo.")
    prices_min = prices_all.index.min().date()
    prices_max = prices_all.index.max().date()
    c1, c2 = st.columns(2)
    custom_start = c1.date_input("Desde", value=max(prices_min, prices_max - pd.Timedelta(days=365)),
                                  min_value=prices_min, max_value=prices_max, key="custom_stress_start")
    custom_end = c2.date_input("Hasta", value=prices_max,
                                min_value=prices_min, max_value=prices_max, key="custom_stress_end")
    if custom_start >= custom_end:
        st.warning("La fecha 'Desde' debe ser anterior a 'Hasta'.")
    else:
        custom_result = eng.custom_stress_test(prices_all[active_tickers], eff_weights, custom_start, custom_end)
        if not custom_result["disponible"]:
            st.info("Sin datos suficientes de la cartera en ese periodo.")
        else:
            cc1, cc2, cc3 = st.columns(3)
            cc1.metric("Cobertura", pct(custom_result["cobertura"], 0))
            cc2.metric("Caída máxima", pct(custom_result["caida_max"]))
            cc3.metric("Recuperación", months_label(custom_result["recuperacion_meses"])
                       if custom_result["recuperado"] else "aún sin recuperar")

with col_shock:
    st.caption(f"Shock instantaneo estimado via Beta (actual: {num(beta)} frente a {benchmark}) -- "
               "aproximación lineal tipo CAPM, no una repeticion histórica.")
    shock_pct_input = st.slider(f"Movimiento hipotético de {benchmark} (%)", -50, 50, -20, step=5, key="shock_pct")
    shock_pct = shock_pct_input / 100.0
    estimated_impact = beta * shock_pct
    st.metric("Impacto estimado en la cartera", pct(estimated_impact),
              help=f"Aproximación lineal: Beta ({num(beta)}) x shock ({pct(shock_pct)}). No tiene en cuenta "
                   "convexidad, correlaciones que se disparan en crisis reales, ni liquidez.")

# ===========================================================================
# 10. Matriz de correlacion y diversificacion
# ===========================================================================

section_title("10", "Matriz de correlación y grado de diversificación")

if len(active_tickers) >= 2:
    corr = corr_matrix_full.loc[active_tickers, active_tickers]
    div_score = eng.diversification_score(avg_corr)

    col_heat, col_div = st.columns([1.4, 1])
    with col_heat:
        custom_scale = [[0.0, RED], [0.5, "#f4f6f9"], [1.0, NAVY]]
        # Anotar cada celda con su valor solo tiene sentido -- y solo es
        # viable -- en matrices pequenas: el numero de anotaciones crece con
        # el CUADRADO de los activos (7 activos = 49; 45 activos = 2.025).
        # Con una cartera grande esa avalancha de anotaciones hace que el
        # navegador no llegue a renderizar la figura y el rerun se queda a
        # medias, dejando congelado en pantalla todo lo que venga despues
        # (Secciones 11-15 con datos de la cartera anterior). Por encima del
        # umbral se deja solo el color + el valor en el hover.
        annotate_cells = len(corr.columns) <= 12
        heat_height = 380 if len(corr.columns) <= 12 else min(760, 260 + 11 * len(corr.columns))
        fig = go.Figure(data=go.Heatmap(
            z=corr.values, x=corr.columns, y=corr.columns, zmin=-1, zmax=1, colorscale=custom_scale,
            colorbar=dict(title="rho"), hovertemplate="%{y} vs %{x}<br>rho = %{z:.2f}<extra></extra>",
        ))
        if annotate_cells:
            for i, row_t in enumerate(corr.index):
                for j, col_t in enumerate(corr.columns):
                    v = corr.values[i, j]
                    fig.add_annotation(x=col_t, y=row_t, text=f"{v:.2f}", showarrow=False,
                                        font=dict(color="white" if abs(v) > 0.55 else INK_PRIMARY, size=11))
        base_layout(fig, height=heat_height, showlegend=False, title="Correlaciones (rho)", reverse_y=True)
        chart(fig, "correlaciones", key=f"chart_corr_{psig}")
        if not annotate_cells:
            st.caption(f"Con {len(corr.columns)} activos no se imprime el valor en cada celda "
                       f"({len(corr.columns) ** 2:,} celdas): pasa el raton por encima para ver el rho exacto de cada par.")
    with col_div:
        with st.container(border=True):
            st.markdown("**Puntuación de diversificación**")
            st.markdown(f"### {div_score:.0f} /100")
            st.caption(f"Correlación media ponderada entre activos: rho = {num(avg_corr)}.")
        st.dataframe(comp_df, hide_index=True, width="stretch",
                     column_config={"Peso": st.column_config.NumberColumn(format="percent")},
                     key=f"df_div_comp_{psig}")
else:
    st.info("Se requieren al menos 2 activos para calcular la matriz de correlación.")

# ===========================================================================
# 11. Atribucion ponderada de riesgo y retorno por activo
# ===========================================================================

section_title("11", "Atribución ponderada de riesgo y retorno por activo")

if len(active_tickers) >= 2:
    rcontrib = eng.risk_contribution(returns_assets, eff_weights).sort_values(ascending=False)
    retcontrib = eng.return_contribution(usable[active_tickers], eff_weights).reindex(rcontrib.index)

    col_r1, col_r2 = st.columns(2)
    with col_r1:
        fig = go.Figure(go.Bar(x=rcontrib.values * 100, y=rcontrib.index, orientation="h",
                                marker_color=[colors[t] for t in rcontrib.index]))
        fig.update_xaxes(ticksuffix="%")
        base_layout(fig, height=320, showlegend=False, title="Contribución al riesgo (% volatilidad total)", reverse_y=True)
        chart(fig, "contrib_riesgo", key=f"chart_riskcontrib_{psig}")
    with col_r2:
        fig = go.Figure(go.Bar(x=retcontrib.values * 100, y=retcontrib.index, orientation="h",
                                marker_color=[colors[t] for t in retcontrib.index]))
        fig.update_xaxes(ticksuffix=" pp")
        base_layout(fig, height=320, showlegend=False, title="Contribución al retorno (mismo orden que el panel de riesgo)",
                    reverse_y=True)
        chart(fig, "contrib_retorno", key=f"chart_retcontrib_{psig}")
else:
    st.info("Se requieren al menos 2 activos para calcular la atribución de riesgo y retorno.")

# ===========================================================================
# 12. Optimizacion de frontera eficiente (Markowitz)
# ===========================================================================

section_title("12", "Optimización de frontera eficiente (Markowitz)")

if len(active_tickers) >= 2:
    mk = cached_markowitz(returns_assets, eff_weights, rf, eng.AnalysisConfig().semilla_aleatoria)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=np.array(mk["nube_aleatoria"]["volatilidad"]) * 100,
                              y=np.array(mk["nube_aleatoria"]["retorno"]) * 100,
                              mode="markers", marker=dict(size=3, color=INK_MUTED, opacity=0.35),
                              name="Carteras aleatorias", hoverinfo="skip"))
    if mk["frontera"]:
        fx = [p[0] * 100 for p in mk["frontera"]]
        fy = [p[1] * 100 for p in mk["frontera"]]
        fig.add_trace(go.Scatter(x=fx, y=fy, mode="lines", line=dict(color=NAVY, width=2.5), name="Frontera eficiente"))

    points = [("min_volatilidad", "Min. Volatilidad", INDIGO, "diamond", "bottom center"),
              ("max_sharpe", "Max. Sharpe", GOOD, "star", "top center"),
              ("max_retorno", "Max. Retorno", RED, "triangle-up", "top center"),
              ("tu_cartera", "Tu cartera", GOLD, "circle", "bottom center")]
    for key, label, color, symbol, label_pos in points:
        p = mk[key]
        fig.add_trace(go.Scatter(x=[p["volatilidad"] * 100], y=[p["retorno"] * 100], mode="markers+text",
                                  marker=dict(size=13, color=color, symbol=symbol, line=dict(width=1, color="white")),
                                  text=[label], textposition=label_pos, name=label))
    fig.update_xaxes(title="Riesgo (vol. anual %)")
    fig.update_yaxes(title="Retorno (anual %)")
    base_layout(fig, height=440, showlegend=True, title="Mapa riesgo / retorno")
    chart(fig, "markowitz", key=f"chart_markowitz_{psig}")
    st.caption(
        "\"Tu cartera\" usa la media aritmética anualizada de retornos (convencion Markowitz de un solo periodo), "
        "no el CAGR geometrico de la Seccion 01-02 -- con activos volátiles la media aritmética es sistemáticamente "
        "mayor (\"volatility drag\"), así que puede no coincidir exactamente con la rentabilidad de cabecera."
    )

    delta_rows = []
    for key, label, *_ in points[:3]:
        p = mk[key]
        base = mk["tu_cartera"]
        delta_rows.append({
            "Punto": label,
            "Rentabilidad": f"{(p['retorno'] - base['retorno']) * 100:+.1f} pp",
            "Volatilidad": f"{(p['volatilidad'] - base['volatilidad']) * 100:+.1f} pp",
            "Sharpe": f"{p['sharpe'] - base['sharpe']:+.2f}",
        })
    st.markdown("**Mejora frente a tu cartera** *(rentabilidad y volatilidad esperadas según Markowitz; no incluye rebalanceos, costes ni garantiza resultados futuros)*")
    st.dataframe(pd.DataFrame(delta_rows), hide_index=True, width="stretch", key=f"df_mk_delta_{psig}")

    weights_table = pd.DataFrame({
        "Activo": mk["activos"],
        "Nombre": [asset_name(t) for t in mk["activos"]],
        "Tu peso": [mk["tu_cartera"]["weights"][t] for t in mk["activos"]],
        "Max. Sharpe": [mk["max_sharpe"]["weights"][t] for t in mk["activos"]],
        "Delta ajuste": [f"{(mk['max_sharpe']['weights'][t] - mk['tu_cartera']['weights'][t]) * 100:+.1f} pp" for t in mk["activos"]],
    })
    st.dataframe(weights_table, hide_index=True, width="stretch", column_config={
        "Tu peso": st.column_config.NumberColumn(format="percent"),
        "Max. Sharpe": st.column_config.NumberColumn(format="percent"),
    }, key=f"df_mk_weights_{psig}")
else:
    st.info("Se requieren al menos 2 activos para optimizar la frontera eficiente.")

# ===========================================================================
# 13. Simulacion de rebalanceo periodico vs Buy & Hold
# ===========================================================================

section_title("13", "Simulación de rebalanceo periódico vs. Buy & Hold")

bh = cached_buy_and_hold(usable[active_tickers], eff_weights, cfg["capital_inicial"])
freq = cfg["freq_rebal"]
if freq != "ninguno":
    reb_gross = cached_rebalance(usable[active_tickers], eff_weights, cfg["capital_inicial"], freq, 0.0, 0.0)
    reb_net = (cached_rebalance(usable[active_tickers], eff_weights, cfg["capital_inicial"], freq, cfg["comision"], cfg["retencion"])
               if cfg["aplicar_costes"] else reb_gross)

    bh_cagr = eng.cagr_from_returns(bh.pct_change().dropna())
    reb_cagr_gross = eng.cagr_from_returns(reb_gross.pct_change().dropna())
    reb_cagr_net = eng.cagr_from_returns(reb_net.pct_change().dropna())

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=bh.index, y=bh, mode="lines", name="Sin tocar (Buy&Hold)", line=dict(color=INK_MUTED, dash="dot")))
    fig.add_trace(go.Scatter(x=reb_net.index, y=reb_net, mode="lines",
                              name=f"Rebalanceada ({freq}){' neta' if cfg['aplicar_costes'] else ''}", line=dict(color=NAVY)))
    base_layout(fig, height=360, showlegend=True, title="Valor de la cartera: sin tocar vs. rebalanceada", hovermode="x unified")
    chart(fig, "rebalanceo", key=f"chart_rebal_{psig}_{freq}")

    with st.container(horizontal=True):
        st.metric("Sin tocar (anual)", pct(bh_cagr), border=True)
        st.metric(f"Rebalanceada {freq} (anual)", pct(reb_cagr_net if cfg["aplicar_costes"] else reb_cagr_gross), border=True)
        st.metric("Diferencia (rebalancing drag)", pct((reb_cagr_net if cfg["aplicar_costes"] else reb_cagr_gross) - bh_cagr), border=True)
    if cfg["aplicar_costes"]:
        st.caption(
            f"Con comisión {cfg['comision']:.2%} por rebalanceo y retención fiscal {cfg['retencion']:.2%} sobre la "
            f"plusvalia realizada en cada ajuste: bruto {pct(reb_cagr_gross)} anual -> neto {pct(reb_cagr_net)} anual. "
            f"La base de coste se actualiza tras cada evento fiscal (no se grava dos veces la misma plusvalia). "
            f"Aproximación: la comisión se aplica sobre el volumen negociado; no sustituye asesoramiento fiscal."
        )
    else:
        st.caption("Sin comisiones ni impuestos. Activa el toggle en la barra lateral para ver el resultado neto.")
else:
    st.info("Frecuencia de rebalanceo = 'ninguno': se muestra solo la evolución Buy & Hold.")
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=bh.index, y=bh, mode="lines", name="Sin tocar (Buy&Hold)", line=dict(color=NAVY)))
    base_layout(fig, height=320, showlegend=False, title="Valor de la cartera (sin rebalanceo)", hovermode="x unified")
    chart(fig, "rebalanceo", key=f"chart_rebal_none_{psig}")

drift = eng.weight_drift(usable[active_tickers], eff_weights)
st.markdown("**Deriva de tus pesos sin rebalancear**")
if not drift.empty:
    top_drift = drift.iloc[0]
    st.caption(f"Tu mayor desvio: {asset_name(top_drift['activo'])}, "
               f"del {top_drift['peso_inicial']:.1%} al {top_drift['peso_final']:.1%} ({top_drift['delta_pp']:+.1f} pp).")
drift_display = drift.rename(columns={"activo": "Activo", "peso_inicial": "Peso inicial",
                                       "peso_final": "Peso final", "delta_pp": "Delta pp"})
st.dataframe(drift_display, hide_index=True, width="stretch", column_config={
    "Peso inicial": st.column_config.NumberColumn(format="percent"),
    "Peso final": st.column_config.NumberColumn(format="percent"),
    "Delta pp": st.column_config.NumberColumn(format="%+.1f pp"),
}, key=f"df_drift_{psig}")

actions = []
for _, row in drift.iterrows():
    delta = row["peso_final"] - row["peso_inicial"]
    if abs(delta) < 0.005:
        continue
    verb = "Reduce" if delta > 0 else "Sube"
    actions.append(f"{verb} **{row['activo']}** {abs(delta) * 100:.1f} pp")
if actions:
    st.markdown("**Para volver a tus pesos objetivo:** " + " · ".join(actions))

# ===========================================================================
# 14. Proyeccion probabilistica estocastica (Monte Carlo)
# ===========================================================================

section_title("14", "Proyección probabilistica estocástica (Monte Carlo)",
              "Los controles de abajo son en vivo: se recalculan al instante (sin pasar por 'Actualizar análisis' "
              "de la barra lateral).")

# Base estadistica de Monte Carlo: TODO el historico comun disponible para estos
# activos (como el Stress Testing, no limitado al "Periodo de analisis" que
# puede ser de solo 1-2 anios) y con pesos CONSTANTES/objetivo (no el Buy & Hold
# ya derivado de las Secciones 01-12) -- una proyeccion a 10-30 anios asume de
# forma razonable que mantienes tu asignacion objetivo, no que dejas correr
# indefinidamente una concentracion que ya se disparo en el pasado.
mc_prices = eng.common_window(prices_all, active_tickers)
mc_port_ret = eng.portfolio_return_series(eng.daily_returns(mc_prices), eff_weights)
mc_monthly = eng.monthly_return_series(mc_port_ret)
mc_dist = eng.distribution_stats(mc_port_ret)
mc_years_available = len(mc_monthly) / 12


@st.fragment
def monte_carlo_section():
    c1, c2, c3, c4 = st.columns(4)
    mc_aportacion = c1.slider(f"Aportación periódica mensual ({BASE_CURRENCY})", 100, 10000, 250, step=50,
                               key="mc_aportacion")
    mc_horizonte = c2.slider("Horizonte (años)", 1, 50, 20, step=1, key="mc_horizonte")
    mc_n_sims = c3.slider("Número de simulaciones", 1000, 10000, 1000, step=1, key="mc_n_sims")
    mc_modelo = c4.selectbox(
        "Modelo de distribución", ["bootstrap_historico", "student_t", "GBM"], index=0, key="mc_modelo",
        format_func=lambda m: {
            "bootstrap_historico": "Bootstrap Histórico (recomendado)",
            "student_t": "Student-t (colas gordas)",
            "GBM": "GBM / Normal (referencia)",
        }[m],
    )

    if mc_dist["kurtosis_exceso"] > 1 and mc_modelo == "GBM":
        st.warning(
            f"Tu cartera tiene un exceso de curtosis de {mc_dist['kurtosis_exceso']:.2f} (colas gordas). "
            "GBM/Normal asume retornos gaussianos y puede infravalorar el riesgo de caídas extremas a largo plazo -- "
            "se recomienda Bootstrap Histórico o Student-t."
        )

    try:
        mc = cached_monte_carlo(mc_monthly, cfg["capital_inicial"], float(mc_aportacion), mc_horizonte,
                                 mc_n_sims, mc_modelo, eng.AnalysisConfig().semilla_aleatoria)

        # "Spaghetti plot": una linea tenue por simulacion individual (en vez
        # del abanico p10-p90) mas la trayectoria media en negro y el capital
        # aportado como referencia discontinua -- estilo laboratorio Monte
        # Carlo clasico. Se muestra un submuestreo de trayectorias (no las
        # 5000 posibles) porque a partir de unos cientos de lineas con alpha
        # bajo el efecto visual de densidad ya esta saturado y renderizar
        # todas penalizaria el navegador sin cambiar el aspecto.
        months_axis = sorted(mc["checkpoints"].keys())
        x_years = np.array([m / 12 for m in months_axis])
        balances_matrix = np.array([mc["checkpoints"][m] for m in months_axis])  # (meses+1, n_sims)
        mean_path = balances_matrix.mean(axis=1)

        n_show = min(mc["n_sims"], 300)
        show_idx = np.random.default_rng(eng.AnalysisConfig().semilla_aleatoria).choice(
            mc["n_sims"], size=n_show, replace=False)
        x_spaghetti = np.tile(np.append(x_years, np.nan), n_show)
        y_spaghetti = np.concatenate([np.append(balances_matrix[:, i], np.nan) for i in show_idx])

        total_contributed_path = [cfg["capital_inicial"] + mc_aportacion * m for m in months_axis]

        fig = go.Figure()
        fig.add_trace(go.Scattergl(x=x_spaghetti, y=y_spaghetti, mode="lines",
                                    line=dict(color="rgba(15,42,77,0.09)", width=1),
                                    hoverinfo="skip", showlegend=False, name="Simulaciones"))
        fig.add_trace(go.Scatter(x=x_years, y=mean_path, mode="lines",
                                  line=dict(color=NAVY, width=2.2), name="Trayectoria media"))
        fig.add_trace(go.Scatter(x=x_years, y=total_contributed_path, mode="lines",
                                  line=dict(color=RED, width=1.8, dash="dash"), name="Capital aportado"))
        fig.update_xaxes(title="Años", showgrid=True, gridcolor=GRID, gridwidth=1, zeroline=False,
                          showline=True, linecolor=GRID, mirror=False)
        fig.update_yaxes(title=f"Patrimonio ({BASE_CURRENCY})", showgrid=True, gridcolor=GRID, gridwidth=1,
                          zeroline=False, showline=True, linecolor=GRID, mirror=False)
        fig.update_layout(
            template="plotly_white",
            height=420,
            margin=dict(l=10, r=10, t=52, b=10),
            paper_bgcolor=SURFACE,
            plot_bgcolor=SURFACE,
            font=dict(color=INK_SECONDARY, family=FONT_FAMILY, size=11.5),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0,
                         font=dict(size=11, color=INK_SECONDARY)),
            showlegend=True,
            title=dict(text=f"{mc['n_sims']} futuros posibles de tu cartera a {mc_horizonte} años "
                             f"(modelo: {mc_modelo})", y=0.98, yanchor="top",
                        font=dict(size=12.5, color=INK_PRIMARY, family=FONT_FAMILY)),
            hovermode="x unified",
        )
        chart(fig, "montecarlo", key=f"chart_mc_{psig}")

        prob_label = eng.format_probability_floor(mc["prob_perdida"], mc["n_sims"])
        with st.container(horizontal=True):
            st.metric("Capital total aportado", money_short(mc["total_aportado"]), border=True)
            st.metric("Mediana patrimonio final", money_short(mc["mediana"]), border=True)
            st.metric("Rango p10 - p90", f"{money_short_md(mc['p10'])} - {money_short_md(mc['p90'])}", border=True)
            st.metric("Prob. de pérdida vs. aportado", prob_label, border=True,
                      help="Probabilidad de que el patrimonio final sea inferior al total aportado (capital inicial + aportaciones).")
        st.caption(
            f"{mc['n_sims']} simulaciones ({mc_modelo}) con la rentabilidad y volatilidad de tu cartera a pesos "
            f"objetivo constantes sobre los últimos {mc_years_available:.1f} años de histórico disponible (no el "
            "periodo de análisis seleccionado arriba). El modelo Bootstrap Histórico remuestrea bloques de 6 meses "
            "seguidos (no meses sueltos) para conservar rachas malas completas en vez de diluirlas. Es una "
            "proyección estadística de un escenario que repite el pasado, no una predicción garantizada: cambios "
            "de regimen de mercado quedan fuera del modelo."
        )
    except Exception as exc:
        st.error(f"No se pudo completar la simulación Monte Carlo: {exc}")


monte_carlo_section()

# ===========================================================================
# 15. Analisis de estilo y exposicion a factores
# ===========================================================================

section_title("15", "Análisis de estilo y exposición a factores (Factor Investing)")

proxy_prices = eng.common_window(prices_window, proxy_tickers)
proxy_returns = eng.daily_returns(proxy_prices)

try:
    style_2f, r2_2f = eng.style_regression(port_ret, proxy_returns[["IWD", "IWF"]])
    fig = go.Figure()
    fig.add_trace(go.Bar(x=[style_2f.get("IWF", 0) * 100], y=["Estilo"], orientation="h", name="Growth (IWF)",
                          marker_color=eng.ASSET_COLORWAY[5], text=[f"Growth {style_2f.get('IWF', 0):.1%}"], textposition="inside"))
    fig.add_trace(go.Bar(x=[style_2f.get("IWD", 0) * 100], y=["Estilo"], orientation="h", name="Value (IWD)",
                          marker_color=BLUE, text=[f"Value {style_2f.get('IWD', 0):.1%}"], textposition="inside"))
    fig.update_layout(barmode="stack")
    base_layout(fig, height=170, showlegend=False, title=f"Growth vs Value (R2 = {r2_2f:.2f})")
    chart(fig, "estilo", key=f"chart_style_{psig}")
    st.caption(
        f"Regresión de estilo (pesos no negativos, suman 100%) contra ETFs proxy: "
        f"{eng.STYLE_PROXIES['Value']} (Value), {eng.STYLE_PROXIES['Growth']} (Growth). "
        f"El R² indica que estos factores explican el {r2_2f:.0%} del comportamiento diario de la cartera; el resto "
        "responde a otros motores (oro, selección concreta de valores, SmallCap/Momentum no incluidos aquí, etc.)."
    )
except Exception as exc:
    st.warning(f"No se pudo calcular el análisis de estilo Growth/Value: {exc}")

st.markdown("**Ampliación: modelo de factores tipo Fama-French**")
st.caption("Depende de una fuente académica externa (Kenneth French Data Library); se carga bajo demanda para no retrasar el resto de la página.")
if "show_factor_model" not in st.session_state:
    st.session_state["show_factor_model"] = False
if not st.session_state["show_factor_model"]:
    if st.button("Cargar análisis de factores Fama-French", icon=":material/query_stats:"):
        st.session_state["show_factor_model"] = True
        st.rerun()
else:
    freg, source_label = None, ""
    try:
        ff = cached_fama_french(usable.index.min(), usable.index.max())
        if ff is not None and not ff.empty and "RF" in ff.columns:
            factor_cols = [c for c in ["Mkt-RF", "SMB", "HML", "RMW", "CMA"] if c in ff.columns]
            combined = pd.concat([port_ret, ff["RF"]], axis=1, join="inner").dropna()
            excess = combined.iloc[:, 0] - combined.iloc[:, 1]
            freg = eng.factor_regression(excess, ff[factor_cols].reindex(excess.index), 0.0)
            source_label = f"Kenneth French Data Library (factores reales, {freg['n_obs']} sesiones)"
        else:
            raise ValueError("sin datos reales disponibles")
    except Exception:
        try:
            proxy_factors = eng.build_proxy_factors(bench_returns, proxy_returns, rf / eng.TRADING_DAYS)
            freg = eng.factor_regression(port_ret, proxy_factors, rf / eng.TRADING_DAYS)
            source_label = "Proxy con ETFs (SPY/IWM/IWD/IWF) -- datos academicos Fama-French no disponibles en este momento"
        except Exception as exc2:
            st.warning(f"No se pudo calcular el modelo de factores ampliado: {exc2}")

    if freg is not None:
        betas = freg["betas"]
        factor_names = [k for k in betas if k != "alpha_diario"]
        factor_values = [betas[k] for k in factor_names]
        fig = go.Figure(go.Bar(
            x=factor_values, y=factor_names, orientation="h",
            marker_color=[BLUE if v >= 0 else RED for v in factor_values],
        ))
        fig.add_vline(x=0, line_color=INK_MUTED)
        base_layout(fig, height=260, showlegend=False, title=f"Cargas factoriales (R2 = {freg['r2']:.2f})", reverse_y=True)
        chart(fig, "factores", key=f"chart_famafrench_{psig}")
        st.caption(
            f"Fuente: {source_label}. Alfa diario no explicado por los factores: {betas.get('alpha_diario', float('nan')):.4%} "
            f"(~{betas.get('alpha_diario', 0) * eng.TRADING_DAYS:.2%} anualizado)."
        )

# ---------------------------------------------------------------------------
# Exportar informe
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Comparativa de carteras guardadas
# ---------------------------------------------------------------------------

_carteras_guardadas = st.session_state.get("carteras_guardadas") or []
if len(_carteras_guardadas) >= 2:
    section_title("16", "Comparativa de carteras guardadas",
                  "Todas se evaluan sobre la MISMA ventana temporal comun, para que la comparacion "
                  "sea justa: si una incluye un activo que cotiza desde hace poco, esa ventana se "
                  "acorta para todas por igual.")

    nombres = [c["nombre"] for c in _carteras_guardadas]
    por_nombre = {c["nombre"]: c for c in _carteras_guardadas}
    seleccion = st.multiselect("Carteras a comparar (2-4)", nombres,
                                default=nombres[:min(3, len(nombres))], max_selections=4,
                                key="comparativa_seleccion")

    if len(seleccion) < 2:
        st.info("Selecciona al menos dos carteras para compararlas.")
    else:
        try:
            tickers_comp = sorted({t for n in seleccion for t in por_nombre[n]["pesos"]})
            precios_comp = cached_download_prices(tuple(tickers_comp + [benchmark]),
                                                   full_history_start, today)
            precios_comp = eng.slice_window(precios_comp, cfg["periodo_analisis"])
            ventana = eng.common_window(precios_comp, tickers_comp + [benchmark])

            if ventana.shape[0] < 30:
                st.warning("No hay suficientes sesiones comunes a todas las carteras seleccionadas "
                           "en el periodo elegido. Prueba con un periodo más largo.")
            else:
                filas_comp, curvas = [], {}
                for n in seleccion:
                    pesos_n = eng.effective_weights(ventana, por_nombre[n]["pesos"])
                    ret_n = eng.buy_and_hold_return_series(ventana[list(pesos_n)], pesos_n)
                    cum_n = eng.cumulative_curve(ret_n)
                    curvas[n] = cum_n
                    filas_comp.append({
                        "Cartera": n,
                        "Posiciones": len(pesos_n),
                        "Rent. anual": pct(eng.cagr_from_returns(ret_n)),
                        "Volatilidad": pct(eng.annualized_volatility(ret_n)),
                        "Sharpe": num(eng.sharpe_ratio(ret_n, rf)),
                        "Sortino": num(eng.sortino_ratio(ret_n, rf)),
                        "Peor caída": pct(eng.max_drawdown(cum_n)),
                    })

                st.dataframe(pd.DataFrame(filas_comp), hide_index=True, width="stretch",
                             key=f"df_comparativa_{psig}")

                fig = go.Figure()
                for i, (n, c) in enumerate(curvas.items()):
                    fig.add_trace(go.Scatter(x=c.index, y=c, mode="lines", name=n,
                                              line=dict(color=eng.ASSET_COLORWAY[i % len(eng.ASSET_COLORWAY)],
                                                        width=2)))
                bench_cum_comp = eng.cumulative_curve(eng.daily_returns(ventana[[benchmark]]).iloc[:, 0])
                fig.add_trace(go.Scatter(x=bench_cum_comp.index, y=bench_cum_comp, mode="lines",
                                          name=f"Benchmark ({benchmark})",
                                          line=dict(color=INK_MUTED, width=1.6, dash="dot")))
                base_layout(fig, height=380, showlegend=True, hovermode="x unified",
                            title=f"Curvas comparadas, base 100 "
                                  f"({ventana.index.min().date()} a {ventana.index.max().date()})")
                st.plotly_chart(fig, width="stretch", config={"displayModeBar": False},
                                key=f"chart_comparativa_{psig}")
        except Exception as exc:
            st.warning(f"No se pudo construir la comparativa: {exc}")

    st.divider()

section_title("17", "Exportar informe")

export_comp_df = comp_df.copy()
export_comp_df["Peso"] = export_comp_df["Peso"].apply(lambda x: pct(x, 1))

export_dd_rows = [{
    "Máximo previo": d["peak_date"].strftime("%Y-%m"),
    "Suelo": d["trough_date"].strftime("%Y-%m"),
    "Profundidad": months_label(d["fall_months"]),
    "Caída": pct(d["depth_pct"], 1),
    "Recuperación": months_label(d["recovery_months"]) if d["recovered"] else "aún sin recuperar",
} for d in dd_top]

report_data = {
    "titulo": "Analizador Cuantitativo de Carteras -- Informe",
    "subtitulo": f"Generado el {today.isoformat()} -- divisa base {BASE_CURRENCY} -- benchmark {benchmark}",
    "resumen": [
        ("Capital inicial", money(cfg["capital_inicial"])),
        ("Valor final (Buy & Hold)", money(valor_final)),
        ("Periodo analizado", f"{actual_years:.1f} años"),
        ("Rentabilidad anual (CAGR)", pct(port_cagr)),
        ("Volatilidad anual", pct(port_vol)),
        ("Ratio de Sharpe", num(sharpe)),
        ("Ratio de Sortino", num(sortino)),
        ("Alfa anual (Jensen)", pct(alpha)),
        (f"Beta vs {benchmark}", num(beta)),
        (f"VaR diario {cfg['var_confianza']:.0%}", pct(var_h)),
        (f"CVaR diario {cfg['var_confianza']:.0%}", pct(cvar_h)),
        ("Peor caída (MDD)", pct(mdd)),
        (f"{benchmark} anual", pct(bench_cagr)),
        ("Puntuación de salud global", f"{hs['global']:.0f} /100"),
        ("Tasa libre de riesgo (Rf)", rf_label),
    ],
    "composicion": export_comp_df,
    "drawdowns": pd.DataFrame(export_dd_rows),
    "stress": pd.DataFrame(rows),
    "contexto_extra": {
        "Periodo real analizado": f"{actual_start.date()} a {actual_end.date()}",
        "Correlación media ponderada entre activos": num(avg_corr) if not np.isnan(avg_corr) else "N/D",
        "Asimetría (skew) de los retornos diarios": num(dist["skew"]),
        "Curtosis en exceso (colas gordas si > 0)": num(dist["kurtosis_exceso"]),
        "Captura de subidas / bajadas vs benchmark": f"{pct(cap['upside_capture'])} / {pct(cap['downside_capture'])}",
        "Mayor desvio de peso sin rebalancear": (
            f"{drift.iloc[0]['activo']}: del {pct(drift.iloc[0]['peso_inicial'], 1)} al "
            f"{pct(drift.iloc[0]['peso_final'], 1)}" if not drift.empty else "N/D"
        ),
        "Divisa base": BASE_CURRENCY,
    },
    "disclaimer": (
        "Herramienta educativa de análisis cuantitativo. Los datos proceden de Yahoo Finance y fuentes "
        "académicas públicas (Kenneth French Data Library); el rendimiento pasado no garantiza resultados "
        "futuros. No constituye asesoramiento de inversión."
    ),
}

st.markdown("**Resumen ejecutivo**")
try:
    _top_ticker = max(eff_weights, key=eff_weights.get)
    resumen_parrafos = eng.build_executive_summary({
        "cagr": port_cagr, "vol": port_vol, "sharpe": sharpe, "sortino": sortino,
        "beta": beta, "mdd": mdd, "benchmark_cagr": bench_cagr, "benchmark": benchmark,
        "curtosis": dist["kurtosis_exceso"], "avg_corr": avg_corr,
        "anios": actual_years, "n_activos": len(active_tickers),
        "top_ticker": _top_ticker, "top_peso": eff_weights[_top_ticker],
        "top_nombre": asset_name(_top_ticker),
        "drift_ticker": None if drift.empty else drift.iloc[0]["activo"],
        "drift_desde": None if drift.empty else drift.iloc[0]["peso_inicial"],
        "drift_hasta": None if drift.empty else drift.iloc[0]["peso_final"],
        "capital": cfg["capital_inicial"], "valor_final": valor_final,
        "divisa": CURRENCY_SYMBOL,
        "umbral_vol": cfg["vol_max"], "umbral_caida": cfg["caida_max"],
        "umbral_sharpe": cfg["sharpe_min"],
    })
    with st.container(border=True):
        for parrafo in resumen_parrafos:
            # Escapar el simbolo de moneda: con dos '$' sin escapar en la misma
            # cadena, Streamlit interpreta el texto intermedio como una formula
            # LaTeX y lo pinta en monoespaciada. El PDF recibe el texto crudo,
            # que no tiene este problema.
            st.markdown(parrafo.replace("$", r"\$"))
    st.caption("Lectura automática de las métricas calculadas arriba, generada a partir de umbrales "
               "objetivos. Es una descripción de los datos, no asesoramiento de inversión.")
    report_data["resumen_ejecutivo"] = resumen_parrafos
except Exception as exc:
    st.warning(f"No se pudo componer el resumen ejecutivo: {exc}")

report_data["figuras"] = REPORT_FIGS

col_pdf, col_xlsx = st.columns(2)
with col_pdf:
    # El PDF se genera al pulsar, no en cada rerun: incrusta ~15 gráficos y
    # cada uno hay que rasterizarlo, asi que hacerlo en cada movimiento de un
    # slider dejaría la página inutilizable.
    if st.button("Generar informe completo (PDF)", icon=":material/picture_as_pdf:",
                  width="stretch"):
        try:
            with st.spinner("Componiendo el informe con todos los gráficos..."):
                st.session_state[f"pdf_{psig}"] = eng.generate_pdf_report(report_data)
        except Exception as exc:
            st.session_state.pop(f"pdf_{psig}", None)
            st.warning(f"No se pudo generar el PDF: {exc}")

    pdf_listo = st.session_state.get(f"pdf_{psig}")
    if pdf_listo:
        st.download_button(f"Descargar PDF ({len(pdf_listo) / 1024:,.0f} KB)", data=pdf_listo,
                            file_name=f"informe_cartera_{today.isoformat()}.pdf", mime="application/pdf",
                            icon=":material/download:", width="stretch")
with col_xlsx:
    try:
        xlsx_bytes = eng.generate_excel_report(report_data)
        st.download_button("Descargar informe (Excel)", data=xlsx_bytes,
                            file_name=f"informe_cartera_{today.isoformat()}.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            icon=":material/table_view:", width="stretch")
    except Exception as exc:
        st.warning(f"No se pudo generar el Excel: {exc}")

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------

st.caption(
    f"Herramienta educativa de análisis cuantitativo. Datos de mercado hasta **{actual_end.date().isoformat()}** "
    "(Yahoo Finance) y fuentes académicas públicas (Kenneth French Data Library); el rendimiento pasado no "
    "garantiza resultados futuros. No constituye asesoramiento de inversión."
)
