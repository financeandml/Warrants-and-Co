"""Motor de calculo cuantitativo para análisis de carteras de inversión.

Modulo puro (sin dependencias de UI) que implementa las 15 secciones de
métricas descritas en el índice de referencia, más las correcciones de
metodología señaladas en "Fallos a solucionar":

  1. Monte Carlo por Bootstrap Histórico / Student-t en vez de solo GBM
     (la cartera tiene colas gordas -> GBM infravalora el riesgo de cola).
  2. Nunca se reporta una probabilidad de pérdida de "0.0%" literal.
  3. La tasa libre de riesgo (Rf) es siempre un input explícito y trazable.
  4. Modelo de factores ampliado a un proxy de 3 factores Fama-French
     (Mercado, SMB, HML), con fallback documentado si no hay datos reales
     de Kenneth French disponibles.
  5. La simulación de rebalanceo admite comisión por transaccion y
     retención fiscal opcionales (toggle), mostrando el resultado neto.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import minimize, nnls

TRADING_DAYS = 252
DAYS_PER_MONTH = TRADING_DAYS / 12.0

# ---------------------------------------------------------------------------
# Cartera y universo de referencia
# ---------------------------------------------------------------------------

DEFAULT_TICKERS = ["NVDA", "AAPL", "AMZN", "JNJ", "JPM", "GLD", "KO"]
DEFAULT_NAMES = {
    "NVDA": "NVIDIA Corporation",
    "AAPL": "Apple Inc.",
    "AMZN": "Amazon.com, Inc.",
    "JNJ": "Johnson & Johnson",
    "JPM": "JPMorgan Chase & Co.",
    "GLD": "SPDR Gold Shares",
    "KO": "The Coca-Cola Company",
}
DEFAULT_WEIGHTS = {
    "NVDA": 0.15,
    "AAPL": 0.15,
    "AMZN": 0.15,
    "JNJ": 0.15,
    "JPM": 0.15,
    "GLD": 0.15,
    "KO": 0.10,
}

DEFAULT_BENCHMARK = "^GSPC"
RF_TICKER = "^IRX"          # US T-Bill 3M (rendimiento anualizado en %)
RF_FALLBACK = 0.04          # usado solo si falla la descarga del Rf

STYLE_PROXIES = {"Value": "IWD", "Growth": "IWF", "SmallCap": "IWM", "Momentum": "MTUM"}

# Colores categoricos fijos, un slot por activo, en el orden en que se dan
# de alta -- nunca se reciclan ni se reordenan. Paleta desaturada/tenue
# (azul pizarra, terracota, verde pino, oro apagado, ciruela, verde bosque,
# indigo apagado, granate) en vez de tonos saturados tipo arcoiris, para un
# aspecto mas cercano a un terminal financiero institucional.
# Paleta institucional: navy como ancla, series desaturadas. Todo el producto
# (página, gráficos y PDF) comparte el mismo registro de informe de research.
ASSET_COLORWAY = ["#0f2a4d", "#2e6da4", "#6f9bc3", "#3d6b5c", "#8a6d3b", "#5b4b6b", "#9aa9b8", "#9b2226"]
STATUS_COLORS = {"good": "#1f7a4d", "warning": "#b8860b", "serious": "#c05621", "critical": "#9b2226"}

CRISIS_PERIODS = [
    {"key": "dotcom", "name": "Burbuja Puntocom", "start": "2000-03-01", "end": "2002-10-31"},
    {"key": "gfc", "name": "Crisis Financiera 2008", "start": "2007-10-01", "end": "2009-03-31"},
    {"key": "covid", "name": "COVID-19", "start": "2020-02-01", "end": "2020-03-31"},
    {"key": "inflacion", "name": "Inflacion y Tipos", "start": "2022-01-01", "end": "2022-10-31"},
    {"key": "aranceles", "name": "Aranceles 2025", "start": "2025-02-01", "end": "2025-04-30"},
]

CAPITAL_CURVE_MILESTONES = [
    {"label": "Inflación - Tipos", "start": "2022-01-01", "end": "2022-10-01"},
    {"label": "Aranceles", "start": "2025-02-01", "end": "2025-04-01"},
]


@dataclass
class AnalysisConfig:
    capital_inicial: float = 10000.0
    periodo_analisis_anios: int = 5
    benchmark: str = DEFAULT_BENCHMARK
    var_confianza: float = 0.95
    tasa_libre_riesgo: Optional[float] = None   # None -> se descarga de ^IRX
    volatilidad_maxima_permitida: float = 0.15
    caida_maxima_tolerada: float = 0.25
    sharpe_minimo_exigido: float = 1.0
    ventana_captura_meses: int = 61
    ventana_correlacion_rodante_meses: int = 3
    ventana_sharpe_rodante_meses: int = 12
    ventanas_cono_volatilidad_meses: Tuple[int, ...] = (1, 3, 6, 12)
    aportacion_periodica: float = 250.0
    horizonte_montecarlo_anios: int = 20
    n_simulaciones: int = 1000
    modelo_montecarlo: str = "bootstrap_historico"   # bootstrap_historico | student_t | GBM
    frecuencia_rebalanceo: str = "anual"             # ninguno | anual | trimestral | mensual
    aplicar_costes_rebalanceo: bool = False
    comision_transaccion: float = 0.001
    retencion_fiscal: float = 0.19
    semilla_aleatoria: Optional[int] = 7


def normalize_weights(weights: Dict[str, float]) -> Dict[str, float]:
    total = sum(weights.values())
    if total <= 0:
        raise ValueError("La suma de los pesos debe ser positiva.")
    return {k: v / total for k, v in weights.items()}


# ---------------------------------------------------------------------------
# 1. Descarga y preparacion de datos
# ---------------------------------------------------------------------------

def _flatten_close(raw: pd.DataFrame, tickers: Sequence[str]) -> pd.DataFrame:
    """Extrae precios de cierre ajustados de la respuesta (posiblemente
    multi-índice) de yfinance, tolerando tanto 1 como N tickers."""
    if raw is None or raw.empty:
        return pd.DataFrame()
    if isinstance(raw.columns, pd.MultiIndex):
        level0 = raw.columns.get_level_values(0)
        if "Close" in level0:
            close = raw["Close"]
        else:
            close = raw.xs(raw.columns.levels[0][0], axis=1, level=0)
        if isinstance(close, pd.Series):
            close = close.to_frame(tickers[0])
    else:
        close = raw[["Close"]].rename(columns={"Close": tickers[0]}) if "Close" in raw.columns else raw
    close.index = pd.to_datetime(close.index)
    if close.index.tz is not None:
        close.index = close.index.tz_localize(None)
    return close


def download_prices(tickers: Sequence[str], start, end, retries: int = 2) -> pd.DataFrame:
    """Descarga precios de cierre ajustados para una lista de tickers.
    Devuelve un DataFrame (fecha x ticker) con NaN antes de la salida a
    bolsa de cada activo (no se recorta aquí). Reintenta con espera
    creciente si el lote completo vuelve vacio o si yfinance lanza una
    excepcion transitoria (mismo patron que download_fx_series) -- un
    fallo de red pasajero no debe consumir el único intento del usuario."""
    import time

    import yfinance as yf

    tickers = list(dict.fromkeys(tickers))  # unicos, preserva orden
    if not tickers:
        raise ValueError("Lista de tickers vacia.")

    last_exc = None
    close = pd.DataFrame()
    for attempt in range(retries + 1):
        last_exc = None  # solo debe reflejar el intento MAS RECIENTE, no uno anterior ya superado
        try:
            raw = yf.download(tickers, start=start, end=end, progress=False, auto_adjust=True, threads=True)
            close = _flatten_close(raw, tickers)
            close = close.reindex(columns=tickers)
            close = close.dropna(how="all")
            if not close.empty:
                return close
        except Exception as exc:
            last_exc = exc
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))

    if close.empty and last_exc is not None:
        raise last_exc
    return close


def fetch_quotes(tickers: Sequence[str]) -> Dict[str, Dict]:
    """Último precio y variacion frente al cierre anterior, para la franja de
    cotizaciones. UNA sola llamada por lote (no una por ticker) para no
    multiplicar la latencia ni el riesgo de rate limiting -- el riesgo real
    de esta app es yfinance, no el calculo.

    Devuelve {ticker: {"precio", "cambio_pct", "fecha"}} solo con los
    tickers que traen al menos dos sesiones utilizables; los que fallan se
    omiten en silencio (una franja decorativa nunca debe tumbar la página).
    Los precios van en la divisa NATIVA de cotización de cada activo, sin
    convertir: es una foto de mercado, no una métrica agregada de cartera.
    """
    import yfinance as yf

    tickers = list(dict.fromkeys(t for t in tickers if t))
    if not tickers:
        return {}

    try:
        raw = yf.download(tickers, period="5d", interval="1d", progress=False,
                          auto_adjust=False, threads=True)
        close = _flatten_close(raw, tickers)
    except Exception:
        return {}

    if close is None or close.empty:
        return {}

    out: Dict[str, Dict] = {}
    for t in tickers:
        if t not in close.columns:
            continue
        serie = close[t].dropna()
        if len(serie) < 2:
            continue
        last, prev = float(serie.iloc[-1]), float(serie.iloc[-2])
        if prev == 0:
            continue
        out[t] = {"precio": last, "cambio_pct": last / prev - 1.0, "fecha": serie.index[-1]}
    return out


# yfinance distingue por mayusculas: "GBp"/"ZAc" (fraccionaria, peniques o
# centimos) frente a "GBP"/"ZAC" (divisa entera). Este mapa debe consultarse
# ANTES de pasar a mayusculas, o "GBp" y "GBP" se vuelven indistinguibles.
PENCE_CURRENCY_MAP = {"GBp": "GBP", "ZAc": "ZAR", "ILA": "ILS"}


def detect_ticker_currencies(tickers: Sequence[str]) -> Dict[str, str]:
    """Consulta la divisa nativa que reporta Yahoo Finance para cada ticker
    (fast_info['currency']). Es la fuente de verdad para la conversion de
    divisas: puede no coincidir con lo que indique un Excel externo (p.ej.
    valores del LSE cotizan en GBp -peniques- aunque el activo sea GBP)."""
    import yfinance as yf

    out: Dict[str, str] = {}
    for t in tickers:
        try:
            currency = yf.Ticker(t).fast_info.get("currency")
            out[t] = str(currency) if currency else ""
        except Exception:
            out[t] = ""
    return out


def download_fx_series(currencies: Sequence[str], start, end, base: str = "EUR",
                        retries: int = 2) -> pd.DataFrame:
    """Descarga series `{base}{divisa}=X` (unidades de `divisa` por 1 `base`)
    para cada divisa distinta de `base`. Devuelve un DataFrame fecha x divisa.
    Yahoo Finance falla de forma transitoria en descargas concurrentes con
    cierta frecuencia (rate limiting); se reintenta, y cualquier par que
    siga sin datos tras los reintentos se re-descarga individualmente antes
    de darlo por perdido -- un fallo de UN solo par no debe tirar el resto
    del lote hacia abajo silenciosamente."""
    import time

    import yfinance as yf

    codes = sorted({c.upper() for c in currencies if c and c.upper() != base.upper()})
    if not codes:
        return pd.DataFrame()

    pairs = [f"{base.upper()}{c}=X" for c in codes]

    close = pd.DataFrame()
    for attempt in range(retries + 1):
        raw = yf.download(pairs, start=start, end=end, progress=False, auto_adjust=True, threads=True)
        close = _flatten_close(raw, pairs)
        close = close.reindex(columns=pairs)
        missing = [p for p in pairs if p not in close.columns or close[p].dropna().empty]
        if not missing:
            break
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))

    # Reintento individual (fuera del lote) para cualquier par que siga sin
    # datos -- un fallo aislado de un par no debe perder los demas.
    still_missing = [p for p in pairs if p not in close.columns or close[p].dropna().empty]
    for pair in still_missing:
        try:
            solo_raw = yf.download(pair, start=start, end=end, progress=False, auto_adjust=True, threads=False)
            solo_close = _flatten_close(solo_raw, [pair])
            if not solo_close.empty and pair in solo_close.columns and not solo_close[pair].dropna().empty:
                close[pair] = solo_close[pair]
        except Exception:
            pass

    close = close.reindex(columns=pairs)  # garantiza el mismo orden que `codes`, columnas que faltan -> NaN
    close.columns = codes
    close = close.dropna(how="all", axis=1).ffill()
    return close


def convert_prices_to_base(prices: pd.DataFrame, ticker_currencies: Dict[str, str],
                            fx: pd.DataFrame, base: str = "EUR") -> Tuple[pd.DataFrame, List[str]]:
    """Convierte cada columna de `prices` (cotizada en su divisa nativa) a la
    divisa `base`, usando `fx` (unidades de divisa entera por 1 `base`, ver
    `download_fx_series`). Los tickers cuya divisa nativa es fraccionaria
    (GBp/ZAc/ILA -> peniques/centimos/agoras) se escalan /100 antes de
    aplicar el tipo de cambio de la divisa entera correspondiente.

    Si el tipo de cambio necesario no esta disponible (columna ausente o
    enteramente NaN en `fx` -- p.ej. tras un fallo de descarga de Yahoo
    Finance), el ticker se EXCLUYE del resultado en vez de dejarse sin
    convertir en silencio: mezclar una columna en divisa nativa con el resto
    ya convertido corrompe cualquier métrica agregada sin que se note.
    Devuelve (df_convertido, lista_de_tickers_excluidos_por_fx) para que
    quien llama pueda avisar con una razon clara, distinta de "sin datos
    de mercado"."""
    base = base.upper()
    fx_aligned = fx.reindex(prices.index).ffill().bfill() if not fx.empty else fx

    converted = {}
    unconverted: List[str] = []
    for ticker in prices.columns:
        series = prices[ticker]
        raw_currency = ticker_currencies.get(ticker) or base

        if raw_currency in PENCE_CURRENCY_MAP:
            scale = 100.0
            fx_currency = PENCE_CURRENCY_MAP[raw_currency]
        else:
            scale = 1.0
            fx_currency = raw_currency.upper()

        if fx_currency == base:
            converted[ticker] = series / scale
        elif fx_currency in fx_aligned.columns and not fx_aligned[fx_currency].dropna().empty:
            rate = fx_aligned[fx_currency]
            converted[ticker] = (series / scale) / rate
        else:
            unconverted.append(ticker)

    return pd.DataFrame(converted), unconverted


# ---------------------------------------------------------------------------
# Deteccion de anomalias de precio (splits/dividendos mal ajustados por el
# proveedor de datos, no volatilidad real de mercado)
# ---------------------------------------------------------------------------

ANOMALY_HARD_THRESHOLD = 8.0     # retorno diario >= +800% -> imposible, se excluye siempre
ANOMALY_SOFT_THRESHOLD = 0.60    # retorno diario >= 60% (y < hard) -> se avisa, no se excluye


def detect_price_anomalies(prices: pd.DataFrame, hard_threshold: float = ANOMALY_HARD_THRESHOLD,
                            soft_threshold: float = ANOMALY_SOFT_THRESHOLD) -> Dict[str, List[Dict]]:
    """Detecta saltos de precio diarios matemáticamente imposibles o
    extremadamente inusuales. Un retorno <= -99% implica un precio en cero o
    negativo (imposible); un retorno >= 800% en una sesión no ocurre en
    mercados continuos reales. Ambos son la firma típica de un split o
    dividendo que el proveedor de datos no ha retroajustado correctamente
    (ver caso real documentado: DIA.MC, split inverso 1:1000 no aplicado,
    salto de +102.894% en una sesión), no de volatilidad real. Severidad
    'hard' (excluir) vs 'soft' (avisar, sin excluir -- puede ser un
    microcap ilíquido con un movimiento real grande). Devuelve, por ticker,
    la lista de eventos ordenada por fecha."""
    report: Dict[str, List[Dict]] = {}
    for ticker in prices.columns:
        s = prices[ticker].dropna()
        if len(s) < 2:
            continue
        ret = s.pct_change().dropna()
        hard = ret[(ret <= -0.99) | (ret >= hard_threshold)]
        soft = ret[(ret.abs() >= soft_threshold) & (ret.abs() < hard_threshold) & (ret > -0.99)]
        events = [{"date": dt, "return": float(v), "severity": "hard"} for dt, v in hard.items()]
        events += [{"date": dt, "return": float(v), "severity": "soft"} for dt, v in soft.items()]
        if events:
            report[ticker] = sorted(events, key=lambda e: e["date"])
    return report


# ---------------------------------------------------------------------------
# Importacion de carteras desde Excel/CSV
# ---------------------------------------------------------------------------

PLACEHOLDER_TICKER_VALUES = {"REVISAR", "TBD", "PENDIENTE", "N/A", "NA", "-", "?", "REVIEW", "TODO", "TO DO"}
_TICKER_COL_CANDIDATES = ["ticker", "ticker_yahoo", "simbolo", "símbolo", "symbol"]
_WEIGHT_COL_CANDIDATES = ["peso %", "peso%", "peso norm", "peso", "weight", "weight %", "weight%", "weight_pct"]
_NAME_COL_CANDIDATES = ["emisor", "nombre", "name", "compania", "compañia", "compañía", "empresa", "security"]


def _find_column(columns: Sequence, candidates: Sequence[str]) -> Optional[str]:
    norm = {str(c).strip().lower(): c for c in columns}
    for cand in candidates:
        if cand in norm:
            return norm[cand]
    return None


def parse_uploaded_portfolio(file_obj, filename: str) -> Tuple[pd.DataFrame, Dict[str, object]]:
    """Lee un Excel/CSV subido por el usuario y lo normaliza al formato
    Ticker/Peso % del editor de cartera. Detecta la columna de ticker y de
    peso por nombre (tolera 'Ticker', 'ticker_yahoo', 'Peso %', 'peso norm',
    'weight', ...), excluye filas sin ticker (tipicamente una linea de
    liquidez/efectivo), con peso <= 0, o cuyo ticker es un marcador de
    "pendiente de revisar" (REVISAR/TBD/N-A/...), fusiona tickers duplicados
    y renormaliza el resto a 100%. Si el Excel tiene varias hojas (p.ej. una
    hoja auxiliar de notas antes de la hoja de datos), prueba cada hoja hasta
    encontrar una con columnas de ticker y peso reconocibles. Devuelve
    (df_listo_para_editor, informe_de_limpieza) -- nunca lanza silenciosamente
    sobre datos sucios, siempre documenta que se excluyo y por que."""
    name_lower = filename.lower()
    if name_lower.endswith(".csv"):
        raw = pd.read_csv(file_obj)
        ticker_col = _find_column(raw.columns, _TICKER_COL_CANDIDATES)
        weight_col = _find_column(raw.columns, _WEIGHT_COL_CANDIDATES)
        if ticker_col is None or weight_col is None:
            raise ValueError(
                "No se encontraron columnas de ticker y peso reconocibles. Columnas disponibles: "
                + ", ".join(str(c) for c in raw.columns)
            )
    else:
        sheets = pd.read_excel(file_obj, sheet_name=None)
        raw, ticker_col, weight_col = None, None, None
        checked_cols = []
        for sheet_name, sheet_df in sheets.items():
            tc = _find_column(sheet_df.columns, _TICKER_COL_CANDIDATES)
            wc = _find_column(sheet_df.columns, _WEIGHT_COL_CANDIDATES)
            checked_cols.append(f"{sheet_name}: {', '.join(str(c) for c in sheet_df.columns)}")
            if tc is not None and wc is not None:
                raw, ticker_col, weight_col = sheet_df, tc, wc
                break
        if raw is None:
            raise ValueError(
                "No se encontraron columnas de ticker y peso reconocibles en ninguna hoja. "
                + " | ".join(checked_cols)
            )

    name_col = _find_column(raw.columns, _NAME_COL_CANDIDATES)

    df = raw[[ticker_col, weight_col]].copy()
    df.columns = ["ticker", "peso"]
    df["nombre"] = (raw[name_col].fillna("").astype(str).str.strip().values
                    if name_col is not None else "")
    # fillna ANTES de astype(str): con el dtype 'string' de pandas, .str.strip()
    # vuelve a convertir pd.NA en un float nan y anula el astype(str) previo.
    df["ticker"] = df["ticker"].fillna("").astype(str).str.strip()
    df["peso"] = pd.to_numeric(df["peso"], errors="coerce").fillna(0.0)

    # Los pesos pueden venir en base-100 ("15" = 15%) o en base-1 ("0.15" =
    # 15%): se infiere por la magnitud de la suma total (una cartera valida
    # siempre suma en torno a 100 o en torno a 1, nunca algo intermedio).
    raw_sum = float(df["peso"].sum())
    if raw_sum <= 3.0:
        df["peso"] = df["peso"] * 100.0

    excluded: List[Dict] = []
    keep_mask = []
    for _, row in df.iterrows():
        t, w = row["ticker"], row["peso"]
        t_norm = "" if t.lower() in ("nan", "none", "") else t
        if not t_norm:
            excluded.append({"ticker": t_norm, "peso": w, "motivo": "sin ticker (posible liquidez/efectivo)"})
            keep_mask.append(False)
        elif t_norm.upper() in PLACEHOLDER_TICKER_VALUES:
            excluded.append({"ticker": t_norm, "peso": w, "motivo": "ticker marcado como pendiente de revisar"})
            keep_mask.append(False)
        elif w <= 0:
            excluded.append({"ticker": t_norm, "peso": w, "motivo": "peso 0% o negativo"})
            keep_mask.append(False)
        else:
            keep_mask.append(True)

    valid = df[pd.Series(keep_mask, index=df.index)].copy()
    if valid.empty:
        raise ValueError("Ninguna fila del archivo tiene un ticker y peso válidos tras la limpieza.")

    valid["ticker"] = valid["ticker"].str.upper()
    names = (valid.groupby("ticker")["nombre"].first().to_dict()
             if name_col is not None else {})
    names = {k: v for k, v in names.items() if v}
    valid = valid.groupby("ticker", as_index=False)["peso"].sum()
    total = float(valid["peso"].sum())
    valid["peso"] = valid["peso"] / total * 100.0

    out_df = pd.DataFrame({"Ticker": valid["ticker"], "Peso %": valid["peso"].round(4)})
    info = {
        "n_valid": len(out_df), "n_excluded": len(excluded), "excluded": excluded,
        "peso_bruto_valido_pct": total, "names": names,
    }
    return out_df, info


def fetch_risk_free_rate(end) -> Tuple[float, str]:
    """Devuelve (tasa_anualizada, etiqueta_fuente). Si falla la descarga,
    usa un valor de respaldo documentado explícitamente en la etiqueta."""
    import yfinance as yf

    try:
        raw = yf.download(RF_TICKER, period="10d", progress=False, auto_adjust=True)
        close = _flatten_close(raw, [RF_TICKER])
        series = close.iloc[:, 0].dropna()
        if series.empty:
            raise ValueError("Sin datos de ^IRX")
        rate = float(series.iloc[-1]) / 100.0
        as_of = series.index[-1].date().isoformat()
        return rate, f"US T-Bill 3M (^IRX) @ {as_of}: {rate:.2%}"
    except Exception:
        return RF_FALLBACK, f"Valor de respaldo (no se pudo descargar ^IRX): {RF_FALLBACK:.2%}"


def daily_returns(prices: pd.DataFrame) -> pd.DataFrame:
    return prices.pct_change().dropna(how="all")


def portfolio_return_series(returns: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    """Retorno diario asumiendo pesos CONSTANTES cada dia (equivalente a un
    rebalanceo diario a los pesos objetivo -- "constant-mix"). No es el
    retorno de una cartera Buy & Hold, cuyos pesos derivan con el precio;
    para eso usar buy_and_hold_return_series(). Se mantiene por si algun
    análisis quiere explícitamente la asuncion constant-mix (p.ej. como
    referencia teórica de Markowitz de un único periodo)."""
    cols = [c for c in returns.columns if c in weights]
    w = np.array([weights[c] for c in cols])
    w = w / w.sum()
    port = returns[cols].dot(w)
    port.name = "cartera"
    return port


def buy_and_hold_return_series(prices: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    """Retorno diario de una cartera Buy & Hold real: acciones fijas
    compradas al inicio, pesos que derivan libremente con el precio (nunca
    se rebalancea). Es la base correcta para "Rentabilidad Anualizada",
    Sharpe, Sortino, VaR/CVaR, drawdowns, etc. de la Seccion 01-02, ya que
    el texto de cabecera describe explícitamente un escenario de "comprar y
    mantener" (ver Seccion 13, que SI distingue esto de "Rebalanceada")."""
    value = simulate_buy_and_hold(prices, weights, 100.0)
    r = value.pct_change().dropna()
    r.name = "cartera"
    return r


def monthly_return_series(returns: pd.Series) -> pd.Series:
    cum = (1 + returns.fillna(0)).cumprod()
    m = cum.resample("ME").last().pct_change().dropna()
    return m


# ---------------------------------------------------------------------------
# 2. Rendimiento y riesgo (Radiografia global)
# ---------------------------------------------------------------------------

def cagr_from_returns(returns: pd.Series, periods_per_year: int = TRADING_DAYS) -> float:
    r = returns.dropna()
    n = len(r)
    if n == 0:
        return float("nan")
    growth = float((1 + r).prod())
    years = n / periods_per_year
    if years <= 0 or growth <= 0:
        return float("nan")
    return growth ** (1 / years) - 1


def annualized_volatility(returns: pd.Series, periods_per_year: int = TRADING_DAYS) -> float:
    r = returns.dropna()
    if len(r) < 2:
        return float("nan")
    return float(r.std(ddof=1) * np.sqrt(periods_per_year))


def sharpe_ratio(returns: pd.Series, rf: float) -> float:
    vol = annualized_volatility(returns)
    if not vol or np.isnan(vol) or vol == 0:
        return float("nan")
    return (cagr_from_returns(returns) - rf) / vol


def sortino_ratio(returns: pd.Series, rf: float, periods_per_year: int = TRADING_DAYS) -> float:
    r = returns.dropna()
    target = rf / periods_per_year
    downside = r[r < target]
    if downside.empty:
        return float("nan")
    # Convencion estandar (Sortino & van der Meer): la semivarianza se
    # promedia sobre el N TOTAL de observaciones (incluyendo los periodos
    # positivos, que aportan 0 al cuadrado), no sobre el subconjunto de
    # periodos negativos. Dividir solo por len(downside) sobreestima la
    # desviacion a la baja y castiga el ratio artificialmente.
    downside_dev = float(np.sqrt((downside - target).pow(2).sum() / len(r)) * np.sqrt(periods_per_year))
    if downside_dev == 0:
        return float("nan")
    return (cagr_from_returns(r) - rf) / downside_dev


def beta_alpha_jensen(port_ret: pd.Series, bench_ret: pd.Series, rf: float) -> Tuple[float, float]:
    common = pd.concat([port_ret, bench_ret], axis=1, join="inner").dropna()
    if len(common) < 3:
        return float("nan"), float("nan")
    p, b = common.iloc[:, 0], common.iloc[:, 1]
    var_b = float(np.var(b, ddof=1))
    if var_b == 0:
        return float("nan"), float("nan")
    beta = float(np.cov(p, b, ddof=1)[0, 1] / var_b)
    port_cagr = cagr_from_returns(p)
    bench_cagr = cagr_from_returns(b)
    alpha = port_cagr - (rf + beta * (bench_cagr - rf))
    return beta, float(alpha)


def historical_var_cvar(returns: pd.Series, confidence: float) -> Tuple[float, float]:
    r = returns.dropna().sort_values()
    n = len(r)
    if n == 0:
        return float("nan"), float("nan")
    idx = int(np.floor((1 - confidence) * n))
    idx = min(max(idx, 0), n - 1)
    var = float(-r.iloc[idx])
    cvar = float(-r.iloc[: idx + 1].mean())
    return var, cvar


def gaussian_var(returns: pd.Series, confidence: float) -> float:
    r = returns.dropna()
    if r.empty:
        return float("nan")
    mu, sigma = float(r.mean()), float(r.std(ddof=1))
    z = float(stats.norm.ppf(1 - confidence))
    return float(-(mu + z * sigma))


def cumulative_curve(returns: pd.Series, base: float = 100.0) -> pd.Series:
    return base * (1 + returns.fillna(0)).cumprod()


def max_drawdown(cum: pd.Series) -> float:
    running_max = cum.cummax()
    dd = cum / running_max - 1.0
    return float(dd.min())


# ---------------------------------------------------------------------------
# 3. Salud de cartera
# ---------------------------------------------------------------------------

def health_score(sharpe: float, avg_corr: float, mdd: float, caida_maxima_tolerada: float,
                  bench_sharpe: float) -> Dict[str, object]:
    def clip100(x):
        return float(np.clip(x, 0, 100))

    score_retorno = clip100(50 + sharpe * 25) if not np.isnan(sharpe) else 50.0
    score_diversificacion = clip100(100 * (1 - avg_corr)) if not np.isnan(avg_corr) else 50.0
    score_resistencia = clip100(100 * (1 - abs(mdd) / (2 * max(caida_maxima_tolerada, 1e-6))))

    global_score = round(0.4 * score_retorno + 0.3 * score_diversificacion + 0.3 * score_resistencia)
    bench_marker = clip100(50 + bench_sharpe * 25) if not np.isnan(bench_sharpe) else 50.0

    return {
        "global": int(global_score),
        "retorno_ajustado_riesgo": round(score_retorno),
        "diversificacion": round(score_diversificacion),
        "resistencia_caidas": round(score_resistencia),
        "media_mercado_referencia": round(bench_marker),
    }


def evaluate_thresholds(annual_vol: float, mdd: float, sharpe: float, cfg: AnalysisConfig) -> Dict[str, Dict]:
    return {
        "volatilidad": {
            "valor": annual_vol, "limite": cfg.volatilidad_maxima_permitida,
            "cumple": bool(annual_vol <= cfg.volatilidad_maxima_permitida),
        },
        "caida_maxima": {
            "valor": mdd, "limite": -cfg.caida_maxima_tolerada,
            "cumple": bool(mdd >= -cfg.caida_maxima_tolerada),
        },
        "sharpe": {
            "valor": sharpe, "limite": cfg.sharpe_minimo_exigido,
            "cumple": bool(sharpe >= cfg.sharpe_minimo_exigido),
        },
    }


# ---------------------------------------------------------------------------
# 4. Sensibilidad asimetrica
# ---------------------------------------------------------------------------

def capture_ratios(port_ret: pd.Series, bench_ret: pd.Series, window_months: Optional[int]) -> Dict[str, float]:
    pm, bm = monthly_return_series(port_ret), monthly_return_series(bench_ret)
    common = pd.concat([pm, bm], axis=1, join="inner").dropna()
    common.columns = ["p", "b"]
    if window_months:
        common = common.tail(window_months)
    up, down = common[common["b"] > 0], common[common["b"] < 0]
    upside = float(up["p"].mean() / up["b"].mean()) if len(up) and up["b"].mean() != 0 else float("nan")
    downside = float(down["p"].mean() / down["b"].mean()) if len(down) and down["b"].mean() != 0 else float("nan")
    return {"upside_capture": upside, "downside_capture": downside, "n_meses": len(common)}


def conditional_beta(port_ret: pd.Series, bench_ret: pd.Series) -> Dict[str, float]:
    common = pd.concat([port_ret, bench_ret], axis=1, join="inner").dropna()
    common.columns = ["p", "b"]
    up, down = common[common["b"] > 0], common[common["b"] < 0]

    def _beta(sub):
        if len(sub) < 3 or np.var(sub["b"], ddof=1) == 0:
            return float("nan")
        return float(np.cov(sub["p"], sub["b"], ddof=1)[0, 1] / np.var(sub["b"], ddof=1))

    return {"beta_subida": _beta(up), "beta_bajada": _beta(down)}


# ---------------------------------------------------------------------------
# 5. Distribucion estadistica
# ---------------------------------------------------------------------------

def distribution_stats(returns: pd.Series) -> Dict[str, float]:
    r = returns.dropna()
    if r.empty:
        return {"skew": float("nan"), "kurtosis_exceso": float("nan"), "omega": float("nan")}
    gains = r[r > 0].sum()
    losses = -r[r < 0].sum()
    omega = float(gains / losses) if losses > 0 else float("nan")
    return {
        "skew": float(stats.skew(r)),
        "kurtosis_exceso": float(stats.kurtosis(r)),
        "omega": omega,
    }


# ---------------------------------------------------------------------------
# 6. Curva de capital / Ulcer / Martin / Sharpe rodante
# ---------------------------------------------------------------------------

def ulcer_index(cum: pd.Series) -> float:
    running_max = cum.cummax()
    dd_pct = (cum / running_max - 1.0) * 100.0
    return float(np.sqrt((dd_pct ** 2).mean()))


def martin_ratio(cagr_pct: float, ui: float, rf_pct: float = 0.0) -> float:
    """(CAGR% - Rf%) / Ulcer Index -- se resta Rf para ser consistente con
    Sharpe/Sortino/Alfa, que si descuentan la tasa libre de riesgo."""
    return float((cagr_pct - rf_pct) / ui) if ui and ui > 0 else float("nan")


def rolling_sharpe_series(returns: pd.Series, rf: float, window_months: int,
                           periods_per_year: int = TRADING_DAYS) -> pd.Series:
    window_days = max(2, int(round(window_months * DAYS_PER_MONTH)))
    roll_mean = returns.rolling(window_days).mean()
    roll_std = returns.rolling(window_days).std(ddof=1)
    rf_period = rf / periods_per_year
    return ((roll_mean - rf_period) / roll_std * np.sqrt(periods_per_year)).dropna()


# ---------------------------------------------------------------------------
# 7. Top drawdowns
# ---------------------------------------------------------------------------

def top_drawdowns(cum: pd.Series, n: int = 5) -> List[Dict]:
    episodes = []
    peak_date, peak_val = cum.index[0], cum.iloc[0]
    in_dd, trough_date, trough_val = False, None, None

    for date, val in cum.items():
        if val >= peak_val:
            if in_dd and trough_date is not None:
                episodes.append({"peak_date": peak_date, "peak_val": peak_val,
                                  "trough_date": trough_date, "trough_val": trough_val,
                                  "recovery_date": date})
            peak_val, peak_date = val, date
            in_dd, trough_date, trough_val = False, None, None
        else:
            in_dd = True
            if trough_val is None or val < trough_val:
                trough_val, trough_date = val, date

    if in_dd and trough_date is not None:
        episodes.append({"peak_date": peak_date, "peak_val": peak_val,
                          "trough_date": trough_date, "trough_val": trough_val,
                          "recovery_date": None})

    for e in episodes:
        e["depth"] = e["trough_val"] / e["peak_val"] - 1.0

    episodes.sort(key=lambda e: e["depth"])
    top = episodes[:n]

    results = []
    for e in top:
        fall_days = (e["trough_date"] - e["peak_date"]).days
        recovery_days = (e["recovery_date"] - e["trough_date"]).days if e["recovery_date"] is not None else None
        results.append({
            "peak_date": e["peak_date"],
            "trough_date": e["trough_date"],
            "depth_pct": e["depth"],
            "fall_months": fall_days / 30.44,
            "recovery_months": (recovery_days / 30.44) if recovery_days is not None else None,
            "recovered": e["recovery_date"] is not None,
        })
    return results


# ---------------------------------------------------------------------------
# 8. Dinamica rodante y cono de volatilidad
# ---------------------------------------------------------------------------

def rolling_correlation_series(port_ret: pd.Series, bench_ret: pd.Series, window_months: int) -> pd.Series:
    window_days = max(2, int(round(window_months * DAYS_PER_MONTH)))
    common = pd.concat([port_ret, bench_ret], axis=1, join="inner").dropna()
    return common.iloc[:, 0].rolling(window_days).corr(common.iloc[:, 1]).dropna()


def volatility_cone(returns: pd.Series, windows_months: Sequence[int]) -> Dict[int, Optional[Dict[str, float]]]:
    results: Dict[int, Optional[Dict[str, float]]] = {}
    for wm in windows_months:
        wd = max(2, int(round(wm * DAYS_PER_MONTH)))
        roll_vol = (returns.rolling(wd).std(ddof=1) * np.sqrt(TRADING_DAYS)).dropna()
        if roll_vol.empty:
            results[wm] = None
            continue
        results[wm] = {
            "p10": float(roll_vol.quantile(0.10)), "p25": float(roll_vol.quantile(0.25)),
            "median": float(roll_vol.quantile(0.50)), "p75": float(roll_vol.quantile(0.75)),
            "p90": float(roll_vol.quantile(0.90)), "actual": float(roll_vol.iloc[-1]),
        }
    return results


# ---------------------------------------------------------------------------
# 9. Stress testing
# ---------------------------------------------------------------------------

def _stress_test_window(prices: pd.DataFrame, weights: Dict[str, float], total_weight: float,
                         period: Dict) -> Dict:
    """Reconstruye el comportamiento de la cartera durante UNA ventana
    (start/end) concreta. Logica compartida por `stress_test` (crisis fijas)
    y `custom_stress_test` (ventana elegida por el usuario) -- misma
    implementacion, una sola vez."""
    start, end = pd.Timestamp(period["start"]), pd.Timestamp(period["end"])
    available = [t for t in weights if t in prices.columns and
                 prices[t].first_valid_index() is not None and
                 prices[t].first_valid_index() <= start]

    if not available or prices.index.min() > start:
        return {**period, "cobertura": 0.0, "caida_max": None,
                "recuperacion_meses": None, "recuperado": None, "disponible": False}

    w = {t: weights[t] for t in available}
    wsum = sum(w.values())
    w = {t: v / wsum for t, v in w.items()}
    coverage = wsum / total_weight

    sub = prices[available].dropna()
    window = sub.loc[sub.index >= (start - pd.Timedelta(days=10))]
    if window.empty:
        return {**period, "cobertura": coverage, "caida_max": None,
                "recuperacion_meses": None, "recuperado": None, "disponible": False}

    rel = window / window.iloc[0]
    w_arr = np.array([w[t] for t in available])
    port_idx = rel.dot(w_arr)

    pre_crisis = port_idx.loc[:start]
    pre_level = float(pre_crisis.iloc[-1]) if not pre_crisis.empty else float(port_idx.iloc[0])

    crisis_window = port_idx.loc[start:end]
    if crisis_window.empty:
        return {**period, "cobertura": coverage, "caida_max": None,
                "recuperacion_meses": None, "recuperado": None, "disponible": False}

    trough_val = float(crisis_window.min())
    trough_date = crisis_window.idxmin()
    max_dd = trough_val / pre_level - 1.0

    after = port_idx.loc[trough_date:]
    recovered_mask = after >= pre_level
    if recovered_mask.any():
        recovery_date = after[recovered_mask].index[0]
        recovery_months = (recovery_date - trough_date).days / 30.44
        recovered = True
    else:
        recovery_months = None
        recovered = False

    return {**period, "cobertura": coverage, "caida_max": max_dd,
            "recuperacion_meses": recovery_months, "recuperado": recovered, "disponible": True}


def stress_test(prices: pd.DataFrame, weights: Dict[str, float]) -> List[Dict]:
    total_weight = sum(weights.values())
    return [_stress_test_window(prices, weights, total_weight, crisis) for crisis in CRISIS_PERIODS]


def custom_stress_test(prices: pd.DataFrame, weights: Dict[str, float], start, end,
                        label: str = "Escenario personalizado") -> Dict:
    """Como `stress_test`, pero para una ventana temporal arbitraria elegida
    por el usuario en vez de las crisis predefinidas -- mismo motor, mismos
    supuestos (cobertura por peso, renormalizacion de los activos
    disponibles), ya verificado en produccion."""
    total_weight = sum(weights.values())
    period = {"key": "personalizado", "name": label,
              "start": pd.Timestamp(start).strftime("%Y-%m-%d"), "end": pd.Timestamp(end).strftime("%Y-%m-%d")}
    return _stress_test_window(prices, weights, total_weight, period)


# ---------------------------------------------------------------------------
# 10. Correlacion y diversificacion
# ---------------------------------------------------------------------------

def correlation_matrix(returns: pd.DataFrame) -> pd.DataFrame:
    return returns.corr()


def weighted_avg_correlation(corr: pd.DataFrame, weights: Dict[str, float]) -> float:
    tickers = [t for t in corr.columns if t in weights]
    num, den = 0.0, 0.0
    for i in tickers:
        for j in tickers:
            if i == j:
                continue
            num += weights[i] * weights[j] * corr.loc[i, j]
            den += weights[i] * weights[j]
    return float(num / den) if den > 0 else float("nan")


def diversification_score(avg_corr: float) -> float:
    return float(np.clip(100 * (1 - avg_corr), 0, 100))


# ---------------------------------------------------------------------------
# 11. Atribucion de riesgo y retorno
# ---------------------------------------------------------------------------

def risk_contribution(returns: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    cols = [c for c in returns.columns if c in weights]
    cov = returns[cols].cov() * TRADING_DAYS
    w = np.array([weights[c] for c in cols])
    w = w / w.sum()
    port_var = float(w @ cov.values @ w)
    if port_var <= 0:
        return pd.Series(np.nan, index=cols)
    marginal = cov.values @ w
    contrib = w * marginal / port_var
    return pd.Series(contrib, index=cols)


def return_contribution(prices: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    cols = [c for c in prices.columns if c in weights]
    valid = prices[cols].dropna()
    total_ret = valid.iloc[-1] / valid.iloc[0] - 1.0
    w = pd.Series(weights).reindex(cols)
    w = w / w.sum()
    return total_ret * w


# ---------------------------------------------------------------------------
# 12. Frontera eficiente (Markowitz)
# ---------------------------------------------------------------------------

def _portfolio_perf(w: np.ndarray, mean_ret: np.ndarray, cov: np.ndarray) -> Tuple[float, float]:
    ret = float(w @ mean_ret)
    vol = float(np.sqrt(max(w @ cov @ w, 0)))
    return ret, vol


def optimize_min_vol(mean_ret: np.ndarray, cov: np.ndarray) -> np.ndarray:
    n = len(mean_ret)
    x0 = np.repeat(1 / n, n)
    bounds = [(0.0, 1.0)] * n
    cons = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    res = minimize(lambda w: w @ cov @ w, x0, bounds=bounds, constraints=cons, method="SLSQP")
    return res.x if res.success else x0


def optimize_max_sharpe(mean_ret: np.ndarray, cov: np.ndarray, rf: float) -> np.ndarray:
    n = len(mean_ret)
    x0 = np.repeat(1 / n, n)
    bounds = [(0.0, 1.0)] * n
    cons = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]

    def neg_sharpe(w):
        ret, vol = _portfolio_perf(w, mean_ret, cov)
        return -(ret - rf) / vol if vol > 1e-9 else 1e6

    res = minimize(neg_sharpe, x0, bounds=bounds, constraints=cons, method="SLSQP")
    return res.x if res.success else x0


def efficient_frontier(mean_ret: np.ndarray, cov: np.ndarray, n_points: int = 24) -> List[Tuple[float, float]]:
    """Traza solo la rama EFICIENTE de la frontera: desde la cartera de
    mínima varianza global hasta el activo de mayor retorno. Por debajo del
    punto de mínima varianza, un long-only que persigue un retorno objetivo
    muy bajo (más bajo que el de todos los demas activos) queda forzado
    hacia ese único activo de bajo retorno -- una rama dominada que, por
    definicion, no forma parte de "la frontera eficiente"."""
    n = len(mean_ret)
    bounds = [(0.0, 1.0)] * n

    w_minvol = optimize_min_vol(mean_ret, cov)
    min_var_target = float(w_minvol @ mean_ret)
    max_target = float(mean_ret.max())
    if max_target <= min_var_target:
        return []

    targets = np.linspace(min_var_target, max_target, n_points)
    frontier = []
    x0 = w_minvol.copy()  # warm start: cada punto parte de la solucion del anterior
    for target in targets:
        cons = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w, t=target: float(w @ mean_ret) - t},
        ]
        res = minimize(lambda w: w @ cov @ w, x0, bounds=bounds, constraints=cons, method="SLSQP",
                        options={"maxiter": 200, "ftol": 1e-12})
        if res.success and res.fun >= 0:
            frontier.append((float(np.sqrt(res.fun)), float(target)))
            x0 = res.x
    return frontier


def random_portfolios(mean_ret: np.ndarray, cov: np.ndarray, n: int = 3000,
                       seed: Optional[int] = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    k = len(mean_ret)
    weights = rng.dirichlet(np.ones(k), size=n)
    rets = weights @ mean_ret
    vols = np.sqrt(np.einsum("ij,jk,ik->i", weights, cov, weights))
    return rets, vols, weights


def markowitz_summary(returns: pd.DataFrame, weights: Dict[str, float], rf: float,
                       seed: Optional[int] = None) -> Dict[str, object]:
    cols = list(returns.columns)
    mean_ret = (returns.mean() * TRADING_DAYS).reindex(cols).values
    cov = (returns.cov() * TRADING_DAYS).reindex(index=cols, columns=cols).values
    w_current = np.array([weights.get(c, 0.0) for c in cols])
    w_current = w_current / w_current.sum()

    w_minvol = optimize_min_vol(mean_ret, cov)
    w_maxsharpe = optimize_max_sharpe(mean_ret, cov, rf)
    w_maxret = np.zeros(len(cols))
    w_maxret[int(np.argmax(mean_ret))] = 1.0

    frontier = efficient_frontier(mean_ret, cov)
    rand_rets, rand_vols, _ = random_portfolios(mean_ret, cov, n=3000, seed=seed)

    def pack(w):
        ret, vol = _portfolio_perf(w, mean_ret, cov)
        sharpe = (ret - rf) / vol if vol > 1e-9 else float("nan")
        return {"weights": dict(zip(cols, w)), "retorno": ret, "volatilidad": vol, "sharpe": sharpe}

    return {
        "activos": cols,
        "tu_cartera": pack(w_current),
        "min_volatilidad": pack(w_minvol),
        "max_sharpe": pack(w_maxsharpe),
        "max_retorno": pack(w_maxret),
        "frontera": frontier,
        "nube_aleatoria": {"retorno": rand_rets.tolist(), "volatilidad": rand_vols.tolist()},
    }


# ---------------------------------------------------------------------------
# 13. Rebalanceo vs Buy & Hold
# ---------------------------------------------------------------------------

_FREQ_PERIOD = {"anual": "Y", "trimestral": "Q", "mensual": "M"}


def simulate_buy_and_hold(prices: pd.DataFrame, weights: Dict[str, float], capital: float) -> pd.Series:
    cols = [c for c in prices.columns if c in weights]
    p = prices[cols].dropna()
    w = np.array([weights[c] for c in cols])
    w = w / w.sum()
    shares = (capital * w) / p.iloc[0].values
    value = (p.values * shares).sum(axis=1)
    return pd.Series(value, index=p.index, name="sin_tocar")


def simulate_rebalance(prices: pd.DataFrame, weights: Dict[str, float], capital: float,
                        frequency: str, commission_pct: float = 0.0, tax_pct: float = 0.0) -> pd.Series:
    cols = [c for c in prices.columns if c in weights]
    p = prices[cols].dropna()
    w_target = np.array([weights[c] for c in cols])
    w_target = w_target / w_target.sum()

    period_key = _FREQ_PERIOD.get(frequency)
    holdings = capital * w_target
    values = np.empty(len(p))
    prev_prices = p.iloc[0].values
    last_period = p.index[0].to_period(period_key) if period_key else None
    # Base de coste que se actualiza ("step-up") cada vez que se paga
    # impuesto sobre la plusvalia: sin esto, la misma ganancia ya gravada
    # en un rebalanceo anterior se contaria como "no realizada" otra vez
    # en el siguiente evento, tributando varias veces sobre el mismo importe.
    cost_basis = capital

    for i, (date, row) in enumerate(p.iterrows()):
        price_now = row.values
        if i > 0:
            holdings = holdings * (price_now / prev_prices)
        total = float(holdings.sum())

        if period_key is not None:
            this_period = date.to_period(period_key)
            if this_period != last_period:
                target_value = total * w_target
                turnover = float(np.abs(target_value - holdings).sum())
                commission_cost = commission_pct * turnover
                unrealized_gain_frac = max(0.0, (total - cost_basis) / total) if total > 0 else 0.0
                tax_cost = tax_pct * unrealized_gain_frac * (turnover / 2.0)
                total_after = max(total - commission_cost - tax_cost, 0.0)
                holdings = w_target * total_after
                total = total_after
                cost_basis = total_after
                last_period = this_period

        values[i] = total
        prev_prices = price_now

    return pd.Series(values, index=p.index, name="rebalanceada")


def weight_drift(prices: pd.DataFrame, weights: Dict[str, float]) -> pd.DataFrame:
    cols = [c for c in prices.columns if c in weights]
    p = prices[cols].dropna()
    w0 = np.array([weights[c] for c in cols])
    w0 = w0 / w0.sum()
    shares = w0  # unidades proporcionales al peso inicial (capital normalizado a 1)
    end_value = shares * (p.iloc[-1].values / p.iloc[0].values)
    end_weights = end_value / end_value.sum()
    df = pd.DataFrame({"activo": cols, "peso_inicial": w0, "peso_final": end_weights})
    df["delta_pp"] = (df["peso_final"] - df["peso_inicial"]) * 100
    return df.sort_values("delta_pp", key=lambda s: s.abs(), ascending=False).reset_index(drop=True)


# ---------------------------------------------------------------------------
# 14. Monte Carlo (Fix 1 y 2)
# ---------------------------------------------------------------------------

def monte_carlo_projection(monthly_port_returns: pd.Series, capital: float, contribution: float,
                            horizon_years: int, n_sims: int, model: str,
                            seed: Optional[int] = None) -> Dict[str, object]:
    rng = np.random.default_rng(seed)
    r = monthly_port_returns.dropna().values
    horizon_months = horizon_years * 12
    if len(r) < 6:
        raise ValueError("Historial insuficiente para proyectar con Monte Carlo (se necesitan >= 6 meses).")

    if model == "bootstrap_historico":
        # Bootstrap POR BLOQUES (no mes a mes independiente). Remuestrear
        # meses de forma independiente rompe cualquier estructura serial
        # (una racha bajista completa, un mercado lateral prolongado) y
        # diluye los meses malos entre los buenos vecinos -- sobre un
        # historico con una media mensual fuertemente positiva, eso hace
        # que la probabilidad de perdida a 10-30 anios salga en la practica
        # siempre exactamente en cero, para cualquier combinacion de
        # parametros (el sintoma reportado de que Monte Carlo "no cambia").
        # Remuestrear bloques contiguos de 6 meses preserva esa estructura
        # (una mala racha real permanece junta en vez de trocearse) y
        # produce una cola de perdida bastante mas realista.
        block_size = 6
        n = len(r)
        n_blocks = int(np.ceil(horizon_months / block_size))
        starts = rng.integers(0, n, size=(n_sims, n_blocks))
        offsets = np.arange(block_size)
        idx = (starts[:, :, None] + offsets[None, None, :]) % n
        draws = r[idx].reshape(n_sims, n_blocks * block_size)[:, :horizon_months]
    elif model == "student_t":
        # El ajuste MLE de los 3 parametros (df, loc, scale) de scipy sobre
        # una muestra pequena y asimetrica (los retornos mensuales reales
        # suelen tener skew negativo por las caidas bruscas) desplaza `loc`
        # respecto de la media muestral real -- un Student-t es simetrico y
        # "tuerce" su centro para compensar la asimetria de los datos, lo
        # que aqui se traducia en un sesgo de ~0.3 pp/mes que, compuesto a
        # 20-30 anios, casi duplicaba el patrimonio mediano proyectado.
        # Se usa el df ajustado por MLE (forma de la cola) pero se ancla
        # loc/scale a la media y desviacion tipica empiricas (moment
        # matching), de forma que el modelo solo anade colas mas gordas
        # que una Normal, sin alterar el rendimiento medio esperado.
        df_t, _, _ = stats.t.fit(r)
        df_t = max(df_t, 4.0)
        target_mean = float(r.mean())
        target_std = float(r.std(ddof=1))
        scale = target_std / np.sqrt(df_t / (df_t - 2))
        draws = stats.t.rvs(df_t, loc=target_mean, scale=scale, size=(n_sims, horizon_months), random_state=rng)
    elif model == "GBM":
        mu, sigma = float(r.mean()), float(r.std(ddof=1))
        draws = rng.normal(mu, sigma, size=(n_sims, horizon_months))
    else:
        raise ValueError(f"Modelo de Monte Carlo no reconocido: {model}")

    # Cota economica: no se puede perder mas del 100% del valor en un mes;
    # sin este limite, colas gordas (student_t) o Normal pueden producir
    # rendimientos simulados < -100% y romper el interes compuesto.
    draws = np.clip(draws, -0.99, None)

    balances = np.full(n_sims, capital, dtype=float)
    # Se guarda un checkpoint por mes (no solo anual) para poder dibujar
    # trayectorias individuales suaves en el grafico de abanico ("spaghetti
    # plot"); las estadisticas (mediana, p10/p90, prob. de perdida) siguen
    # calculandose solo sobre el valor final, sin cambios de metodologia.
    path_checkpoints = {0: balances.copy()}

    for m in range(1, horizon_months + 1):
        balances = balances * (1 + draws[:, m - 1]) + contribution
        path_checkpoints[m] = balances.copy()

    total_contributed = capital + contribution * horizon_months
    final = balances
    prob_loss = float(np.mean(final < total_contributed))

    return {
        "modelo": model,
        "n_sims": n_sims,
        "horizon_months": horizon_months,
        "final_values": final,
        "mediana": float(np.median(final)),
        "p10": float(np.percentile(final, 10)),
        "p90": float(np.percentile(final, 90)),
        "media": float(np.mean(final)),
        "total_aportado": total_contributed,
        "prob_perdida": prob_loss,
        "checkpoints": path_checkpoints,
    }


def format_probability_floor(p: float, n_sims: int) -> str:
    """Nunca devuelve '0.0%' de forma literal (Fix 2). Con un número finito
    de simulaciones no se puede distinguir una probabilidad real de cero
    de una simplemente menor que 1/n_sims, así que se acota por la propia
    resolución del muestreo (con un suelo de 0.1% para no sugerir una
    precision que los datos no respaldan)."""
    resolution_floor = max(0.1, 100.0 / n_sims)
    pct = p * 100
    if pct < resolution_floor:
        return f"< {resolution_floor:.1f}%"
    return f"{pct:.1f}%"


# ---------------------------------------------------------------------------
# 15. Analisis de estilo / factores (Fix 4)
# ---------------------------------------------------------------------------

def style_regression(port_ret: pd.Series, proxy_returns: pd.DataFrame) -> Tuple[Dict[str, float], float]:
    common = pd.concat([port_ret, proxy_returns], axis=1, join="inner").dropna()
    y = common.iloc[:, 0].values
    X = common.iloc[:, 1:].values
    cols = list(proxy_returns.columns)

    w, _ = nnls(X, y)
    if w.sum() > 0:
        w_norm = w / w.sum()
    else:
        w_norm = np.ones(len(cols)) / len(cols)

    y_pred = X @ w
    ss_res = float(np.sum((y - y_pred) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    return dict(zip(cols, w_norm)), r2


def fetch_fama_french_factors(start, end) -> Optional[pd.DataFrame]:
    """Intenta descargar los factores reales de Kenneth French (fuente
    académica publica). Si no hay red o la libreria falla, devuelve None
    y el llamador debe usar el modelo proxy con ETFs como alternativa."""
    try:
        import pandas_datareader.data as web
        ff = web.DataReader("F-F_Research_Data_5_Factors_2x3_daily", "famafrench", start, end)[0]
        ff = ff.astype(float) / 100.0
        ff.index = pd.to_datetime(ff.index.to_timestamp() if hasattr(ff.index, "to_timestamp") else ff.index)
        return ff
    except Exception:
        return None


def build_proxy_factors(bench_ret: pd.Series, proxy_returns: pd.DataFrame, rf_daily: float) -> pd.DataFrame:
    """Construye un proxy de 3 factores estilo Fama-French a partir de ETFs
    cuando no hay acceso a los datos academicos originales."""
    factors = pd.DataFrame(index=bench_ret.index)
    factors["Mkt-RF"] = bench_ret - rf_daily
    if "IWM" in proxy_returns.columns:
        factors["SMB"] = proxy_returns["IWM"] - bench_ret
    if "IWD" in proxy_returns.columns and "IWF" in proxy_returns.columns:
        factors["HML"] = proxy_returns["IWD"] - proxy_returns["IWF"]
    return factors.dropna()


def factor_regression(port_ret: pd.Series, factors: pd.DataFrame, rf_daily: float) -> Dict[str, object]:
    common = pd.concat([port_ret - rf_daily, factors], axis=1, join="inner").dropna()
    y = common.iloc[:, 0].values
    X = common.iloc[:, 1:].values
    X_design = np.hstack([np.ones((len(X), 1)), X])
    coef, _, _, _ = np.linalg.lstsq(X_design, y, rcond=None)
    y_pred = X_design @ coef
    ss_res = float(np.sum((y - y_pred) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    betas = dict(zip(["alpha_diario"] + list(factors.columns), coef.tolist()))
    return {"betas": betas, "r2": r2, "n_obs": len(common)}


# ---------------------------------------------------------------------------
# Orquestacion
# ---------------------------------------------------------------------------

def effective_weights(prices: pd.DataFrame, weights: Dict[str, float]) -> Dict[str, float]:
    present = {t: w for t, w in weights.items() if t in prices.columns and not prices[t].dropna().empty}
    return normalize_weights(present)


def slice_window(prices: pd.DataFrame, years: float) -> pd.DataFrame:
    """Recorta las últimas `years` (años, admite fraccion) del histórico."""
    if prices.empty:
        return prices
    end = prices.index.max()
    start = end - pd.DateOffset(days=int(round(years * 365.25)))
    return prices.loc[prices.index >= start]


def common_window(prices: pd.DataFrame, tickers: Sequence[str]) -> pd.DataFrame:
    """Devuelve solo las fechas en que TODOS los tickers indicados cotizan
    (interseccion), necesaria para comparaciones y matrices consistentes."""
    cols = [t for t in tickers if t in prices.columns]
    return prices[cols].dropna()


# ---------------------------------------------------------------------------
# 16. Exportacion de informe (PDF / Excel)
# ---------------------------------------------------------------------------
# Ambas funciones reciben `data`, un dict ya ensamblado por app.py a partir
# de valores que YA se han calculado y verificado en las secciones 01-15 --
# aqui no se recalcula nada, solo se da formato. Sin dependencias de
# Streamlit, para mantener este modulo puro.

def generate_excel_report(data: Dict) -> bytes:
    """Libro Excel multi-hoja (Resumen, Composición, Drawdowns, Stress Test)
    a partir del `report_data` ya ensamblado. Devuelve bytes listos para
    st.download_button."""
    import io

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        pd.DataFrame(data["resumen"], columns=["Metrica", "Valor"]).to_excel(
            writer, sheet_name="Resumen", index=False)
        data["composicion"].to_excel(writer, sheet_name="Composición", index=False)
        if data.get("drawdowns") is not None and not data["drawdowns"].empty:
            data["drawdowns"].to_excel(writer, sheet_name="Drawdowns", index=False)
        if data.get("stress") is not None and not data["stress"].empty:
            data["stress"].to_excel(writer, sheet_name="Stress Test", index=False)
    return buf.getvalue()


def _fig_a_png(fig, ancho_px: int = 1400, alto_px: int = 620) -> bytes:
    """Renderiza una figura de Plotly a PNG. Se fuerza fondo blanco y tamaño
    fijo para que todas las láminas del informe salgan homogéneas, sin heredar
    la altura que cada gráfico tenía en pantalla.

    Plotly se importa aquí dentro (igual que fpdf o yfinance en este módulo)
    para que engine.py siga siendo importable sin las dependencias de dibujo."""
    import plotly.graph_objects as go

    copia = go.Figure(fig)
    # NO se fuerza el color de fondo: las láminas son paneles de terminal en
    # negro incrustados en un informe claro, asi que deben conservar el fondo
    # que ya trae la figura. Forzar blanco aqui dejaba el titulo ámbar y las
    # series claras ilegibles.
    copia.update_layout(width=ancho_px, height=alto_px, margin=dict(l=62, r=34, t=54, b=52))
    return copia.to_image(format="png", scale=2)


class _InformePDF:
    """Envuelve fpdf2 con la retícula del informe: cabecera de sección, tablas
    con cabecera gris azulada, láminas de gráfico y pie con numeración."""

    ANCHO_UTIL = 180  # A4 (210mm) menos 15mm de margen a cada lado
    NAVY = (15, 42, 77)
    TINTA = (13, 27, 46)
    PIZARRA = (74, 90, 112)
    REGLA = (219, 225, 234)
    CABECERA_TABLA = (238, 242, 247)

    def __init__(self, titulo: str, subtitulo: str):
        from fpdf import FPDF

        self.titulo_corto = titulo
        self.pdf = FPDF(orientation="P", unit="mm", format="A4")
        self.pdf.set_auto_page_break(auto=True, margin=18)
        self.pdf.set_margins(15, 15, 15)
        self.pdf.add_page()
        self._portada(titulo, subtitulo)

    # -- utilidades ---------------------------------------------------------
    @staticmethod
    def _t(texto) -> str:
        """Helvetica de fpdf2 usa latin-1; cualquier carácter fuera de esa
        codificación (comillas tipográficas, guion largo) rompe la salida."""
        return str(texto).encode("latin-1", "replace").decode("latin-1")

    def _regla(self, grosor: float = 0.3):
        self.pdf.set_draw_color(*self.REGLA)
        self.pdf.set_line_width(grosor)
        y = self.pdf.get_y()
        self.pdf.line(self.pdf.l_margin, y, self.pdf.w - self.pdf.r_margin, y)

    # -- bloques ------------------------------------------------------------
    def _portada(self, titulo: str, subtitulo: str):
        p = self.pdf
        p.set_fill_color(*self.NAVY)
        p.rect(0, 0, p.w, 34, style="F")
        p.set_xy(15, 11)
        p.set_font("Helvetica", "B", 17)
        p.set_text_color(255, 255, 255)
        p.cell(0, 8, self._t(titulo), new_x="LMARGIN", new_y="NEXT")
        p.set_x(15)
        p.set_font("Helvetica", "", 9)
        p.set_text_color(206, 216, 230)
        p.cell(0, 5, self._t(subtitulo), new_x="LMARGIN", new_y="NEXT")
        p.set_y(42)
        p.set_text_color(*self.TINTA)

    def seccion(self, numero: str, titulo: str):
        p = self.pdf
        if p.get_y() > p.h - 60:
            p.add_page()
        p.ln(3)
        p.set_font("Helvetica", "", 7.5)
        p.set_text_color(*self.PIZARRA)
        p.cell(0, 4, self._t(f"SECCIÓN {numero}"), new_x="LMARGIN", new_y="NEXT")
        p.set_font("Helvetica", "B", 12.5)
        p.set_text_color(*self.NAVY)
        p.cell(0, 6.5, self._t(titulo), new_x="LMARGIN", new_y="NEXT")
        p.set_text_color(*self.TINTA)
        self._regla(0.5)
        p.ln(2.5)

    def parrafo(self, texto: str, tamano: float = 9.0):
        p = self.pdf
        p.set_font("Helvetica", "", tamano)
        p.set_text_color(*self.TINTA)
        p.multi_cell(0, 4.6, self._t(texto))
        p.ln(1.6)

    def nota(self, texto: str):
        p = self.pdf
        p.set_font("Helvetica", "I", 7.5)
        p.set_text_color(*self.PIZARRA)
        p.multi_cell(0, 3.6, self._t(texto))
        p.set_text_color(*self.TINTA)
        p.ln(1.5)

    def pares(self, filas, col_etiqueta: float = 74):
        """Lista etiqueta -> valor, alineando los valores en columna."""
        p = self.pdf
        for etiqueta, valor in filas:
            if p.get_y() > p.h - 26:
                p.add_page()
            p.set_font("Helvetica", "", 8.8)
            p.set_text_color(*self.PIZARRA)
            p.cell(col_etiqueta, 5.4, self._t(etiqueta), border="B")
            p.set_font("Helvetica", "B", 8.8)
            p.set_text_color(*self.TINTA)
            p.cell(self.ANCHO_UTIL - col_etiqueta, 5.4, self._t(valor), border="B",
                    align="R", new_x="LMARGIN", new_y="NEXT")
        p.ln(2.5)

    def tabla(self, df, anchos=None, alinear_dcha=None):
        """Tabla con cabecera gris azulada. `anchos` en mm; si no se da, se
        reparte el ancho útil a partes iguales."""
        p = self.pdf
        cols = list(df.columns)
        if not anchos:
            anchos = [self.ANCHO_UTIL / len(cols)] * len(cols)
        alinear_dcha = alinear_dcha or set()

        def cabecera():
            p.set_font("Helvetica", "B", 8)
            p.set_fill_color(*self.CABECERA_TABLA)
            p.set_text_color(*self.NAVY)
            p.set_draw_color(*self.REGLA)
            for c, w in zip(cols, anchos):
                p.cell(w, 6, self._t(c), border="TB", fill=True,
                        align="R" if c in alinear_dcha else "L")
            p.ln()

        if p.get_y() > p.h - 40:
            p.add_page()
        cabecera()
        p.set_font("Helvetica", "", 8)
        p.set_text_color(*self.TINTA)
        for _, fila in df.iterrows():
            if p.get_y() > p.h - 24:
                p.add_page()
                cabecera()
                p.set_font("Helvetica", "", 8)
                p.set_text_color(*self.TINTA)
            for c, w in zip(cols, anchos):
                p.cell(w, 5.4, self._t(fila[c]), border="B",
                        align="R" if c in alinear_dcha else "L")
            p.ln()
        p.ln(3)

    def lamina(self, fig, alto_mm: float = 78, alto_px: int = 620):
        """Inserta un gráfico a ancho completo. Si no cabe en lo que queda de
        página, salta a la siguiente en vez de partirlo."""
        import io

        if fig is None:
            return
        try:
            png = _fig_a_png(fig, alto_px=alto_px)
        except Exception:
            # Un fallo al renderizar una lámina no debe tumbar el informe
            # entero: se omite ese gráfico y el resto se genera igual.
            return
        p = self.pdf
        if p.get_y() + alto_mm > p.h - 20:
            p.add_page()
        p.image(io.BytesIO(png), x=15, w=self.ANCHO_UTIL)
        p.ln(2.5)

    def salida(self) -> bytes:
        p = self.pdf
        # Pie con numeración en todas las páginas.
        # Hay que desactivar el salto de página automático antes de escribir en
        # el margen inferior: con él activo, escribir a 14mm del borde dispara
        # un salto y fpdf crea una página extra en blanco (y el total deja de
        # cuadrar con la numeración ya impresa).
        p.set_auto_page_break(auto=False)
        total = p.pages_count
        for n in range(1, total + 1):
            p.page = n
            p.set_y(-13)
            p.set_x(p.l_margin)
            p.set_font("Helvetica", "", 7)
            p.set_text_color(132, 148, 168)
            p.cell(self.ANCHO_UTIL, 4,
                    self._t(f"{self.titulo_corto}  -  página {n} de {total}"), align="C")
        return bytes(p.output())


def generate_pdf_report(data: Dict) -> bytes:
    """Informe institucional completo en PDF: la misma foto de la cartera que
    el usuario acaba de ver en pantalla, con todas las métricas y todos los
    gráficos. `data["figuras"]` es un dict {hueco: figura de Plotly}; los
    huecos que falten simplemente se omiten."""
    figs = data.get("figuras") or {}
    doc = _InformePDF(data["titulo"], data["subtitulo"])

    # -- Resumen ejecutivo --------------------------------------------------
    if data.get("resumen_ejecutivo"):
        doc.seccion("00", "Resumen ejecutivo")
        for parrafo in data["resumen_ejecutivo"]:
            doc.parrafo(parrafo)

    # -- Métricas y composición --------------------------------------------
    doc.seccion("01-02", "Radiografía de la cartera")
    doc.pares(data["resumen"])
    doc.lamina(figs.get("composicion"), alto_mm=72, alto_px=560)
    comp = data["composicion"]
    doc.tabla(comp, anchos=[28, 112, 40], alinear_dcha={"Peso"})

    # -- Salud --------------------------------------------------------------
    if figs.get("salud_global") or figs.get("salud_subscores"):
        doc.seccion("03", "Diagnóstico de salud")
        doc.lamina(figs.get("salud_global"), alto_mm=58, alto_px=440)
        doc.lamina(figs.get("salud_subscores"), alto_mm=58, alto_px=440)

    # -- Sensibilidad y distribución ---------------------------------------
    if figs.get("sensibilidad"):
        doc.seccion("04", "Sensibilidad asimétrica")
        doc.lamina(figs["sensibilidad"], alto_mm=62, alto_px=480)
    if figs.get("distribucion"):
        doc.seccion("05", "Distribución de retornos diarios")
        doc.lamina(figs["distribucion"], alto_mm=70, alto_px=540)

    # -- Curva de capital y caídas -----------------------------------------
    doc.seccion("06-07", "Curva de capital y caídas")
    doc.lamina(figs.get("curva_capital"))
    doc.lamina(figs.get("drawdown"), alto_mm=58, alto_px=440)
    doc.lamina(figs.get("sharpe_rodante"), alto_mm=58, alto_px=440)
    if data.get("drawdowns") is not None and not data["drawdowns"].empty:
        doc.parrafo("Peores caídas del periodo:")
        doc.tabla(data["drawdowns"], anchos=[32, 26, 34, 24, 64])

    # -- Dinámica rodante ---------------------------------------------------
    if figs.get("correlacion_rodante") or figs.get("cono_volatilidad"):
        doc.seccion("08", "Dinámica rodante y cono de volatilidad")
        doc.lamina(figs.get("correlacion_rodante"), alto_mm=58, alto_px=440)
        doc.lamina(figs.get("cono_volatilidad"), alto_mm=58, alto_px=440)

    # -- Stress testing -----------------------------------------------------
    if data.get("stress") is not None and not data["stress"].empty:
        doc.seccion("09", "Pruebas de esfuerzo en crisis históricas")
        doc.tabla(data["stress"], anchos=[40, 38, 26, 30, 46])
        doc.nota("Cobertura = % de la cartera (por peso) que ya cotizaba al inicio de la crisis; "
                 "el resto se excluye y los pesos restantes se renormalizan.")

    # -- Correlaciones y atribución ----------------------------------------
    if figs.get("correlaciones"):
        doc.seccion("10", "Correlaciones y diversificación")
        doc.lamina(figs["correlaciones"], alto_mm=80, alto_px=620)
    if figs.get("contrib_riesgo") or figs.get("contrib_retorno"):
        doc.seccion("11", "Atribución de riesgo y retorno")
        doc.lamina(figs.get("contrib_riesgo"), alto_mm=60, alto_px=460)
        doc.lamina(figs.get("contrib_retorno"), alto_mm=60, alto_px=460)

    # -- Optimización y rebalanceo -----------------------------------------
    if figs.get("markowitz"):
        doc.seccion("12", "Frontera eficiente (Markowitz)")
        doc.lamina(figs["markowitz"], alto_mm=82, alto_px=640)
    if figs.get("rebalanceo"):
        doc.seccion("13", "Rebalanceo periódico frente a Buy & Hold")
        doc.lamina(figs["rebalanceo"])

    # -- Monte Carlo y factores --------------------------------------------
    if figs.get("montecarlo"):
        doc.seccion("14", "Proyección probabilística (Monte Carlo)")
        doc.lamina(figs["montecarlo"], alto_mm=82, alto_px=640)
    if figs.get("estilo") or figs.get("factores"):
        doc.seccion("15", "Estilo y exposición a factores")
        doc.lamina(figs.get("estilo"), alto_mm=42, alto_px=300)
        doc.lamina(figs.get("factores"), alto_mm=56, alto_px=420)

    # -- Cierre -------------------------------------------------------------
    doc.pdf.ln(3)
    doc._regla(0.3)
    doc.nota(data["disclaimer"])
    return doc.salida()


# ---------------------------------------------------------------------------
# 17. Resumen ejecutivo (generado por reglas, sin dependencias externas)
# ---------------------------------------------------------------------------
# Se redacta a partir de los umbrales de abajo en vez de llamar a un modelo de
# lenguaje: es gratis, instantaneo, funciona sin conexion y -- lo importante en
# un informe financiero -- no puede inventarse una cifra que no este en los
# datos. El precio a pagar es que el texto no varia de forma creativa.

def _clasificar(valor: float, tramos: Sequence[Tuple[float, str]], por_defecto: str) -> str:
    """Devuelve la etiqueta del primer tramo cuyo umbral supera `valor`.
    `tramos` va de mayor a menor umbral."""
    if valor is None or (isinstance(valor, float) and (np.isnan(valor) or np.isinf(valor))):
        return por_defecto
    for umbral, etiqueta in tramos:
        if valor >= umbral:
            return etiqueta
    return por_defecto


def build_executive_summary(m: Dict) -> List[str]:
    """Resumen ejecutivo en 3 parrafos a partir de las métricas ya calculadas.

    `m` debe traer estas claves (sin tildes: son identificadores, no texto):
    cagr, vol, sharpe, sortino, beta, mdd, benchmark_cagr, benchmark,
    curtosis, avg_corr, años, n_activos, top_ticker, top_peso, top_nombre,
    drift_ticker, drift_desde, drift_hasta, capital, valor_final, divisa,
    umbral_vol, umbral_caída, umbral_sharpe.
    Devuelve una lista de parrafos (str) ya redactados."""
    p = []

    # --- Parrafo 1: que ha hecho la cartera --------------------------------
    dif = m["cagr"] - m["benchmark_cagr"]
    if abs(dif) < 0.005:
        veredicto = f"prácticamente en linea con el {m['benchmark']}"
    elif dif > 0:
        veredicto = f"batiendo al {m['benchmark']} en {abs(dif) * 100:.1f} puntos porcentuales anuales"
    else:
        veredicto = f"por debajo del {m['benchmark']} en {abs(dif) * 100:.1f} puntos porcentuales anuales"

    calidad_sharpe = _clasificar(m["sharpe"], [
        (2.0, "una relación rentabilidad/riesgo excelente"),
        (1.0, "una buena relación rentabilidad/riesgo"),
        (0.5, "una relación rentabilidad/riesgo aceptable"),
        (0.0, "una relación rentabilidad/riesgo pobre"),
    ], "una relación rentabilidad/riesgo negativa: el activo sin riesgo habría rendido más")

    p.append(
        f"En los últimos {m['anios']:.1f} años esta cartera ha rendido un {m['cagr'] * 100:.2f}% anual, "
        f"{veredicto}. Ha convertido {m['divisa']}{m['capital']:,.0f} en {m['divisa']}{m['valor_final']:,.0f}, "
        f"con una volatilidad del {m['vol'] * 100:.1f}% y un Sharpe de {m['sharpe']:.2f}, "
        f"{calidad_sharpe}. Por el camino ha atravesado una caída máxima del {abs(m['mdd']) * 100:.1f}%."
    )

    # --- Parrafo 2: riesgos ------------------------------------------------
    riesgos = []

    if m["top_peso"] >= 0.40:
        riesgos.append(
            f"la cartera esta muy concentrada: {m['top_nombre']} ({m['top_ticker']}) pesa un "
            f"{m['top_peso'] * 100:.1f}% del total, así que su comportamiento individual domina el del conjunto"
        )
    elif m["top_peso"] >= 0.25:
        riesgos.append(
            f"hay una concentracion notable en {m['top_nombre']} ({m['top_ticker']}), con un "
            f"{m['top_peso'] * 100:.1f}% del total"
        )

    if m["n_activos"] >= 2 and not np.isnan(m["avg_corr"]):
        if m["avg_corr"] >= 0.70:
            riesgos.append(
                f"la correlación media entre posiciones es alta ({m['avg_corr']:.2f}), lo que significa que "
                f"los {m['n_activos']} activos tienden a caer a la vez y la diversificación real es menor "
                f"de lo que sugiere el número de posiciones"
            )
        elif m["avg_corr"] <= 0.30:
            riesgos.append(
                f"la correlación media entre posiciones es baja ({m['avg_corr']:.2f}), lo que amortigua las "
                f"caídas conjuntas"
            )

    if m["curtosis"] >= 3:
        riesgos.append(
            f"los retornos diarios tienen colas muy gordas (curtosis en exceso de {m['curtosis']:.1f}): "
            f"los días extremos ocurren bastante más a menudo de lo que predice una campana de Gauss, "
            f"así que el VaR gaussiano infravalora el riesgo real"
        )
    elif m["curtosis"] >= 1:
        riesgos.append(
            f"los retornos diarios presentan colas gordas (curtosis en exceso de {m['curtosis']:.1f}), "
            f"con más días extremos de lo que sugeriría una distribución normal"
        )

    if m["beta"] >= 1.20:
        riesgos.append(
            f"con una beta de {m['beta']:.2f} la cartera amplifica los movimientos del mercado: en una "
            f"caída del 10% del {m['benchmark']} cabría esperar en torno a un {m['beta'] * 10:.0f}% de retroceso"
        )
    elif m["beta"] <= 0.80:
        riesgos.append(
            f"con una beta de {m['beta']:.2f} la cartera se mueve bastante menos que el mercado"
        )

    if riesgos:
        p.append("Sobre el riesgo, " + "; ".join(riesgos) + ".")
    else:
        p.append(
            "En cuanto al riesgo, no aparecen concentraciones extremas, correlaciones anormalmente altas "
            "ni colas especialmente gordas en los datos de este periodo."
        )

    # --- Parrafo 3: que vigilar --------------------------------------------
    frases = []

    incumple = []
    if m["vol"] > m["umbral_vol"]:
        incumple.append(f"la volatilidad ({m['vol'] * 100:.1f}%) supera tu límite del {m['umbral_vol'] * 100:.0f}%")
    if abs(m["mdd"]) > m["umbral_caida"]:
        incumple.append(f"la caída máxima ({abs(m['mdd']) * 100:.1f}%) supera tu tolerancia del "
                        f"{m['umbral_caida'] * 100:.0f}%")
    if m["sharpe"] < m["umbral_sharpe"]:
        incumple.append(f"el Sharpe ({m['sharpe']:.2f}) queda por debajo del mínimo que te exiges "
                        f"({m['umbral_sharpe']:.1f})")
    if incumple:
        frases.append("Frente a los límites de riesgo que has fijado, " + " y ".join(incumple) + ".")
    else:
        frases.append("La cartera se mantiene dentro de todos los límites de riesgo que has configurado.")

    if m.get("drift_ticker") and m.get("drift_desde") is not None:
        desvio_pp = abs(m["drift_hasta"] - m["drift_desde"]) * 100
        if desvio_pp >= 5:
            frases.append(
                f"Sin rebalancear, {m['drift_ticker']} ha pasado del {m['drift_desde'] * 100:.1f}% al "
                f"{m['drift_hasta'] * 100:.1f}% de la cartera, así que el reparto real ya no es el que elegiste."
            )

    if m["anios"] < 3:
        frases.append(
            f"El histórico analizado es corto ({m['anios']:.1f} años), así que estas métricas son menos "
            f"estables de lo que parecen: conviene no extrapolarlas."
        )

    p.append(" ".join(frases))
    return p
