# %% [markdown]
# # Analizador Cuantitativo de Carteras -- version Google Colab
#
# Adaptacion de la app Streamlit a formato notebook (Streamlit no corre de
# forma nativa en Colab sin un tunel externo tipo ngrok/localtunnel, que es
# fragil). Aqui el mismo motor de calculo (ya verificado: Buy & Hold real,
# Sortino/Martin corregidos, Monte Carlo por bloques sobre historico
# completo, etc.) se ejecuta celda a celda y cada grafico/tabla se muestra
# directamente en la salida de la celda.
#
# **Como usarlo en Colab:**
# 1. Sube este archivo con `Archivo -> Subir cuaderno -> .py` (Colab lo
#    parte automaticamente en celdas por los marcadores `# %%`), o abre un
#    cuaderno en blanco y pega el contenido.
# 2. Ejecuta las celdas en orden (Entorno de ejecucion -> Ejecutar todas).
# 3. Para cambiar la cartera o cualquier parametro, edita las variables de
#    la celda "CONFIGURACION" y vuelve a ejecutar desde ahi hacia abajo.
# 4. La Seccion 14 (Monte Carlo) tiene sus propias variables al principio de
#    su celda -- cambialas y re-ejecuta SOLO esa celda para iterar rapido
#    sin recalcular todo el resto.
#
# Necesita conexion a internet (Yahoo Finance para precios; Kenneth French
# Data Library opcional para el modelo de factores, con fallback automatico).

# %%
# ---------------------------------------------------------------------------
# Instalacion de dependencias (yfinance y pandas-datareader no vienen
# preinstalados en Colab; pandas/numpy/scipy/plotly si).
# ---------------------------------------------------------------------------
import sys
import subprocess

for pkg in ["yfinance>=0.2.40", "pandas-datareader", "plotly>=5.20"]:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", pkg], check=False)

print("Dependencias instaladas.")

# %%
# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------
from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio
from scipy import stats
from scipy.optimize import minimize, nnls
from IPython.display import display, Markdown
import pandas_datareader.data as web

# Detecta si estamos en Colab para usar el renderer correcto; si no,
# deja el renderer por defecto (funciona igual en Jupyter/VS Code local).
if "google.colab" in sys.modules:
    pio.renderers.default = "colab"

pd.set_option("display.max_columns", 20)
pd.set_option("display.width", 140)

print("Imports listos.")


# %%
# ===========================================================================
# MOTOR DE CALCULO (identico al engine.py de la app -- sin dependencias de
# UI, se copia tal cual). Cubre las 15 secciones del indice de referencia y
# las correcciones de metodologia: Buy & Hold real para la cartera (no
# constant-mix), Sortino sobre N total, Martin ratio con Rf, rebalanceo con
# base de coste actualizada, frontera eficiente solo rama eficiente, Monte
# Carlo por bloques de 6 meses sobre el historico completo, probabilidad de
# perdida nunca mostrada como "0.0%" literal, y factores Fama-French reales
# con fallback a proxy de ETFs.
# ===========================================================================

TRADING_DAYS = 252
DAYS_PER_MONTH = TRADING_DAYS / 12.0

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
    "NVDA": 0.15, "AAPL": 0.15, "AMZN": 0.15, "JNJ": 0.15,
    "JPM": 0.15, "GLD": 0.15, "KO": 0.10,
}

DEFAULT_BENCHMARK = "^GSPC"
RF_TICKER = "^IRX"
RF_FALLBACK = 0.04

STYLE_PROXIES = {"Value": "IWD", "Growth": "IWF", "SmallCap": "IWM", "Momentum": "MTUM"}

ASSET_COLORWAY = ["#2f5f98", "#b5651d", "#2f7a6f", "#ab8a2c", "#7a4a6b", "#3f6b3f", "#574b7a", "#a13d3d"]
STATUS_COLORS = {"good": "#0ca30c", "warning": "#c98500", "serious": "#c1622f", "critical": "#a13d3d"}

CRISIS_PERIODS = [
    {"key": "dotcom", "name": "Burbuja Puntocom", "start": "2000-03-01", "end": "2002-10-31"},
    {"key": "gfc", "name": "Crisis Financiera 2008", "start": "2007-10-01", "end": "2009-03-31"},
    {"key": "covid", "name": "COVID-19", "start": "2020-02-01", "end": "2020-03-31"},
    {"key": "inflacion", "name": "Inflacion y Tipos", "start": "2022-01-01", "end": "2022-10-31"},
    {"key": "aranceles", "name": "Aranceles 2025", "start": "2025-02-01", "end": "2025-04-30"},
]

CAPITAL_CURVE_MILESTONES = [
    {"label": "Inflacion - Tipos", "start": "2022-01-01", "end": "2022-10-01"},
    {"label": "Aranceles", "start": "2025-02-01", "end": "2025-04-01"},
]


@dataclass
class AnalysisConfig:
    ventana_captura_meses: int = 61
    ventana_correlacion_rodante_meses: int = 3
    ventana_sharpe_rodante_meses: int = 12
    ventanas_cono_volatilidad_meses: Tuple[int, ...] = (1, 3, 6, 12)
    semilla_aleatoria: Optional[int] = 7


def normalize_weights(weights: Dict[str, float]) -> Dict[str, float]:
    total = sum(weights.values())
    if total <= 0:
        raise ValueError("La suma de los pesos debe ser positiva.")
    return {k: v / total for k, v in weights.items()}


def _flatten_close(raw: pd.DataFrame, tickers: Sequence[str]) -> pd.DataFrame:
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


def download_prices(tickers: Sequence[str], start, end) -> pd.DataFrame:
    import yfinance as yf
    tickers = list(dict.fromkeys(tickers))
    if not tickers:
        raise ValueError("Lista de tickers vacia.")
    raw = yf.download(tickers, start=start, end=end, progress=False, auto_adjust=True, threads=True)
    close = _flatten_close(raw, tickers)
    close = close.reindex(columns=tickers)
    close = close.dropna(how="all")
    return close


def fetch_risk_free_rate(end) -> Tuple[float, str]:
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
    cols = [c for c in returns.columns if c in weights]
    w = np.array([weights[c] for c in cols])
    w = w / w.sum()
    port = returns[cols].dot(w)
    port.name = "cartera"
    return port


def simulate_buy_and_hold(prices: pd.DataFrame, weights: Dict[str, float], capital: float) -> pd.Series:
    cols = [c for c in prices.columns if c in weights]
    p = prices[cols].dropna()
    w = np.array([weights[c] for c in cols])
    w = w / w.sum()
    shares = (capital * w) / p.iloc[0].values
    value = (p.values * shares).sum(axis=1)
    return pd.Series(value, index=p.index, name="sin_tocar")


def buy_and_hold_return_series(prices: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    value = simulate_buy_and_hold(prices, weights, 100.0)
    r = value.pct_change().dropna()
    r.name = "cartera"
    return r


def monthly_return_series(returns: pd.Series) -> pd.Series:
    cum = (1 + returns.fillna(0)).cumprod()
    return cum.resample("ME").last().pct_change().dropna()


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
    alpha = cagr_from_returns(p) - (rf + beta * (cagr_from_returns(b) - rf))
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
    return float((cum / running_max - 1.0).min())


def health_score(sharpe, avg_corr, mdd, caida_maxima_tolerada, bench_sharpe) -> Dict[str, object]:
    def clip100(x):
        return float(np.clip(x, 0, 100))
    score_retorno = clip100(50 + sharpe * 25) if not np.isnan(sharpe) else 50.0
    score_diversificacion = clip100(100 * (1 - avg_corr)) if not np.isnan(avg_corr) else 50.0
    score_resistencia = clip100(100 * (1 - abs(mdd) / (2 * max(caida_maxima_tolerada, 1e-6))))
    global_score = round(0.4 * score_retorno + 0.3 * score_diversificacion + 0.3 * score_resistencia)
    bench_marker = clip100(50 + bench_sharpe * 25) if not np.isnan(bench_sharpe) else 50.0
    return {
        "global": int(global_score), "retorno_ajustado_riesgo": round(score_retorno),
        "diversificacion": round(score_diversificacion), "resistencia_caidas": round(score_resistencia),
        "media_mercado_referencia": round(bench_marker),
    }


def evaluate_thresholds(annual_vol, mdd, sharpe, vol_max, caida_max, sharpe_min) -> Dict[str, Dict]:
    return {
        "volatilidad": {"valor": annual_vol, "limite": vol_max, "cumple": bool(annual_vol <= vol_max)},
        "caida_maxima": {"valor": mdd, "limite": -caida_max, "cumple": bool(mdd >= -caida_max)},
        "sharpe": {"valor": sharpe, "limite": sharpe_min, "cumple": bool(sharpe >= sharpe_min)},
    }


def capture_ratios(port_ret, bench_ret, window_months) -> Dict[str, float]:
    pm, bm = monthly_return_series(port_ret), monthly_return_series(bench_ret)
    common = pd.concat([pm, bm], axis=1, join="inner").dropna()
    common.columns = ["p", "b"]
    if window_months:
        common = common.tail(window_months)
    up, down = common[common["b"] > 0], common[common["b"] < 0]
    upside = float(up["p"].mean() / up["b"].mean()) if len(up) and up["b"].mean() != 0 else float("nan")
    downside = float(down["p"].mean() / down["b"].mean()) if len(down) and down["b"].mean() != 0 else float("nan")
    return {"upside_capture": upside, "downside_capture": downside, "n_meses": len(common)}


def conditional_beta(port_ret, bench_ret) -> Dict[str, float]:
    common = pd.concat([port_ret, bench_ret], axis=1, join="inner").dropna()
    common.columns = ["p", "b"]
    up, down = common[common["b"] > 0], common[common["b"] < 0]

    def _beta(sub):
        if len(sub) < 3 or np.var(sub["b"], ddof=1) == 0:
            return float("nan")
        return float(np.cov(sub["p"], sub["b"], ddof=1)[0, 1] / np.var(sub["b"], ddof=1))

    return {"beta_subida": _beta(up), "beta_bajada": _beta(down)}


def distribution_stats(returns: pd.Series) -> Dict[str, float]:
    r = returns.dropna()
    if r.empty:
        return {"skew": float("nan"), "kurtosis_exceso": float("nan"), "omega": float("nan")}
    gains, losses = r[r > 0].sum(), -r[r < 0].sum()
    omega = float(gains / losses) if losses > 0 else float("nan")
    return {"skew": float(stats.skew(r)), "kurtosis_exceso": float(stats.kurtosis(r)), "omega": omega}


def ulcer_index(cum: pd.Series) -> float:
    running_max = cum.cummax()
    dd_pct = (cum / running_max - 1.0) * 100.0
    return float(np.sqrt((dd_pct ** 2).mean()))


def martin_ratio(cagr_pct: float, ui: float, rf_pct: float = 0.0) -> float:
    return float((cagr_pct - rf_pct) / ui) if ui and ui > 0 else float("nan")


def rolling_sharpe_series(returns, rf, window_months, periods_per_year=TRADING_DAYS) -> pd.Series:
    window_days = max(2, int(round(window_months * DAYS_PER_MONTH)))
    roll_mean = returns.rolling(window_days).mean()
    roll_std = returns.rolling(window_days).std(ddof=1)
    rf_period = rf / periods_per_year
    return ((roll_mean - rf_period) / roll_std * np.sqrt(periods_per_year)).dropna()


def top_drawdowns(cum: pd.Series, n: int = 5) -> List[Dict]:
    episodes = []
    peak_date, peak_val = cum.index[0], cum.iloc[0]
    in_dd, trough_date, trough_val = False, None, None
    for date_, val in cum.items():
        if val >= peak_val:
            if in_dd and trough_date is not None:
                episodes.append({"peak_date": peak_date, "peak_val": peak_val, "trough_date": trough_date,
                                  "trough_val": trough_val, "recovery_date": date_})
            peak_val, peak_date = val, date_
            in_dd, trough_date, trough_val = False, None, None
        else:
            in_dd = True
            if trough_val is None or val < trough_val:
                trough_val, trough_date = val, date_
    if in_dd and trough_date is not None:
        episodes.append({"peak_date": peak_date, "peak_val": peak_val, "trough_date": trough_date,
                          "trough_val": trough_val, "recovery_date": None})
    for e in episodes:
        e["depth"] = e["trough_val"] / e["peak_val"] - 1.0
    episodes.sort(key=lambda e: e["depth"])
    results = []
    for e in episodes[:n]:
        fall_days = (e["trough_date"] - e["peak_date"]).days
        recovery_days = (e["recovery_date"] - e["trough_date"]).days if e["recovery_date"] is not None else None
        results.append({
            "peak_date": e["peak_date"], "trough_date": e["trough_date"], "depth_pct": e["depth"],
            "fall_months": fall_days / 30.44,
            "recovery_months": (recovery_days / 30.44) if recovery_days is not None else None,
            "recovered": e["recovery_date"] is not None,
        })
    return results


def rolling_correlation_series(port_ret, bench_ret, window_months) -> pd.Series:
    window_days = max(2, int(round(window_months * DAYS_PER_MONTH)))
    common = pd.concat([port_ret, bench_ret], axis=1, join="inner").dropna()
    return common.iloc[:, 0].rolling(window_days).corr(common.iloc[:, 1]).dropna()


def volatility_cone(returns, windows_months) -> Dict[int, Optional[Dict[str, float]]]:
    results = {}
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


def stress_test(prices: pd.DataFrame, weights: Dict[str, float]) -> List[Dict]:
    results = []
    total_weight = sum(weights.values())
    for crisis in CRISIS_PERIODS:
        start, end = pd.Timestamp(crisis["start"]), pd.Timestamp(crisis["end"])
        available = [t for t in weights if t in prices.columns and prices[t].first_valid_index() is not None
                     and prices[t].first_valid_index() <= start]
        if not available or prices.index.min() > start:
            results.append({**crisis, "cobertura": 0.0, "caida_max": None, "recuperacion_meses": None,
                             "recuperado": None, "disponible": False})
            continue
        w = {t: weights[t] for t in available}
        wsum = sum(w.values())
        w = {t: v / wsum for t, v in w.items()}
        coverage = wsum / total_weight
        sub = prices[available].dropna()
        window = sub.loc[sub.index >= (start - pd.Timedelta(days=10))]
        if window.empty:
            results.append({**crisis, "cobertura": coverage, "caida_max": None, "recuperacion_meses": None,
                             "recuperado": None, "disponible": False})
            continue
        rel = window / window.iloc[0]
        w_arr = np.array([w[t] for t in available])
        port_idx = rel.dot(w_arr)
        pre_crisis = port_idx.loc[:start]
        pre_level = float(pre_crisis.iloc[-1]) if not pre_crisis.empty else float(port_idx.iloc[0])
        crisis_window = port_idx.loc[start:end]
        if crisis_window.empty:
            results.append({**crisis, "cobertura": coverage, "caida_max": None, "recuperacion_meses": None,
                             "recuperado": None, "disponible": False})
            continue
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
            recovery_months, recovered = None, False
        results.append({**crisis, "cobertura": coverage, "caida_max": max_dd, "recuperacion_meses": recovery_months,
                         "recuperado": recovered, "disponible": True})
    return results


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


def risk_contribution(returns: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    cols = [c for c in returns.columns if c in weights]
    cov = returns[cols].cov() * TRADING_DAYS
    w = np.array([weights[c] for c in cols])
    w = w / w.sum()
    port_var = float(w @ cov.values @ w)
    if port_var <= 0:
        return pd.Series(np.nan, index=cols)
    marginal = cov.values @ w
    return pd.Series(w * marginal / port_var, index=cols)


def return_contribution(prices: pd.DataFrame, weights: Dict[str, float]) -> pd.Series:
    cols = [c for c in prices.columns if c in weights]
    valid = prices[cols].dropna()
    total_ret = valid.iloc[-1] / valid.iloc[0] - 1.0
    w = pd.Series(weights).reindex(cols)
    w = w / w.sum()
    return total_ret * w


def _portfolio_perf(w, mean_ret, cov) -> Tuple[float, float]:
    ret = float(w @ mean_ret)
    vol = float(np.sqrt(max(w @ cov @ w, 0)))
    return ret, vol


def optimize_min_vol(mean_ret, cov) -> np.ndarray:
    n = len(mean_ret)
    x0 = np.repeat(1 / n, n)
    bounds = [(0.0, 1.0)] * n
    cons = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    res = minimize(lambda w: w @ cov @ w, x0, bounds=bounds, constraints=cons, method="SLSQP")
    return res.x if res.success else x0


def optimize_max_sharpe(mean_ret, cov, rf) -> np.ndarray:
    n = len(mean_ret)
    x0 = np.repeat(1 / n, n)
    bounds = [(0.0, 1.0)] * n
    cons = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]

    def neg_sharpe(w):
        ret, vol = _portfolio_perf(w, mean_ret, cov)
        return -(ret - rf) / vol if vol > 1e-9 else 1e6

    res = minimize(neg_sharpe, x0, bounds=bounds, constraints=cons, method="SLSQP")
    return res.x if res.success else x0


def efficient_frontier(mean_ret, cov, n_points: int = 24) -> List[Tuple[float, float]]:
    n = len(mean_ret)
    bounds = [(0.0, 1.0)] * n
    w_minvol = optimize_min_vol(mean_ret, cov)
    min_var_target = float(w_minvol @ mean_ret)
    max_target = float(mean_ret.max())
    if max_target <= min_var_target:
        return []
    targets = np.linspace(min_var_target, max_target, n_points)
    frontier = []
    x0 = w_minvol.copy()
    for target in targets:
        cons = [{"type": "eq", "fun": lambda w: np.sum(w) - 1},
                {"type": "eq", "fun": lambda w, t=target: float(w @ mean_ret) - t}]
        res = minimize(lambda w: w @ cov @ w, x0, bounds=bounds, constraints=cons, method="SLSQP",
                        options={"maxiter": 200, "ftol": 1e-12})
        if res.success and res.fun >= 0:
            frontier.append((float(np.sqrt(res.fun)), float(target)))
            x0 = res.x
    return frontier


def random_portfolios(mean_ret, cov, n=3000, seed=None):
    rng = np.random.default_rng(seed)
    k = len(mean_ret)
    weights = rng.dirichlet(np.ones(k), size=n)
    rets = weights @ mean_ret
    vols = np.sqrt(np.einsum("ij,jk,ik->i", weights, cov, weights))
    return rets, vols, weights


def markowitz_summary(returns: pd.DataFrame, weights: Dict[str, float], rf: float, seed=None) -> Dict[str, object]:
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
        "activos": cols, "tu_cartera": pack(w_current), "min_volatilidad": pack(w_minvol),
        "max_sharpe": pack(w_maxsharpe), "max_retorno": pack(w_maxret), "frontera": frontier,
        "nube_aleatoria": {"retorno": rand_rets.tolist(), "volatilidad": rand_vols.tolist()},
    }


_FREQ_PERIOD = {"anual": "Y", "trimestral": "Q", "mensual": "M"}


def simulate_rebalance(prices, weights, capital, frequency, commission_pct=0.0, tax_pct=0.0) -> pd.Series:
    cols = [c for c in prices.columns if c in weights]
    p = prices[cols].dropna()
    w_target = np.array([weights[c] for c in cols])
    w_target = w_target / w_target.sum()
    period_key = _FREQ_PERIOD.get(frequency)
    holdings = capital * w_target
    values = np.empty(len(p))
    prev_prices = p.iloc[0].values
    last_period = p.index[0].to_period(period_key) if period_key else None
    cost_basis = capital
    for i, (date_, row) in enumerate(p.iterrows()):
        price_now = row.values
        if i > 0:
            holdings = holdings * (price_now / prev_prices)
        total = float(holdings.sum())
        if period_key is not None:
            this_period = date_.to_period(period_key)
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


def weight_drift(prices, weights) -> pd.DataFrame:
    cols = [c for c in prices.columns if c in weights]
    p = prices[cols].dropna()
    w0 = np.array([weights[c] for c in cols])
    w0 = w0 / w0.sum()
    end_value = w0 * (p.iloc[-1].values / p.iloc[0].values)
    end_weights = end_value / end_value.sum()
    df = pd.DataFrame({"activo": cols, "peso_inicial": w0, "peso_final": end_weights})
    df["delta_pp"] = (df["peso_final"] - df["peso_inicial"]) * 100
    return df.sort_values("delta_pp", key=lambda s: s.abs(), ascending=False).reset_index(drop=True)


def monte_carlo_projection(monthly_port_returns, capital, contribution, horizon_years, n_sims, model, seed=None) -> Dict[str, object]:
    rng = np.random.default_rng(seed)
    r = monthly_port_returns.dropna().values
    horizon_months = horizon_years * 12
    if len(r) < 6:
        raise ValueError("Historial insuficiente para proyectar con Monte Carlo (se necesitan >= 6 meses).")
    if model == "bootstrap_historico":
        block_size = 6
        n = len(r)
        n_blocks = int(np.ceil(horizon_months / block_size))
        starts = rng.integers(0, n, size=(n_sims, n_blocks))
        offsets = np.arange(block_size)
        idx = (starts[:, :, None] + offsets[None, None, :]) % n
        draws = r[idx].reshape(n_sims, n_blocks * block_size)[:, :horizon_months]
    elif model == "student_t":
        df_t, _, _ = stats.t.fit(r)
        df_t = max(df_t, 4.0)
        target_mean, target_std = float(r.mean()), float(r.std(ddof=1))
        scale = target_std / np.sqrt(df_t / (df_t - 2))
        draws = stats.t.rvs(df_t, loc=target_mean, scale=scale, size=(n_sims, horizon_months), random_state=rng)
    elif model == "GBM":
        mu, sigma = float(r.mean()), float(r.std(ddof=1))
        draws = rng.normal(mu, sigma, size=(n_sims, horizon_months))
    else:
        raise ValueError(f"Modelo de Monte Carlo no reconocido: {model}")
    draws = np.clip(draws, -0.99, None)
    balances = np.full(n_sims, capital, dtype=float)
    path_checkpoints = {0: balances.copy()}
    checkpoint_months = set(range(0, horizon_months + 1, 12)) | {horizon_months}
    for m in range(1, horizon_months + 1):
        balances = balances * (1 + draws[:, m - 1]) + contribution
        if m in checkpoint_months:
            path_checkpoints[m] = balances.copy()
    total_contributed = capital + contribution * horizon_months
    prob_loss = float(np.mean(balances < total_contributed))
    return {
        "modelo": model, "n_sims": n_sims, "horizon_months": horizon_months,
        "mediana": float(np.median(balances)), "p10": float(np.percentile(balances, 10)),
        "p90": float(np.percentile(balances, 90)), "media": float(np.mean(balances)),
        "total_aportado": total_contributed, "prob_perdida": prob_loss, "checkpoints": path_checkpoints,
    }


def format_probability_floor(p: float, n_sims: int) -> str:
    resolution_floor = max(0.1, 100.0 / n_sims)
    pct_ = p * 100
    if pct_ < resolution_floor:
        return f"< {resolution_floor:.1f}%"
    return f"{pct_:.1f}%"


def style_regression(port_ret, proxy_returns) -> Tuple[Dict[str, float], float]:
    common = pd.concat([port_ret, proxy_returns], axis=1, join="inner").dropna()
    y = common.iloc[:, 0].values
    X = common.iloc[:, 1:].values
    cols = list(proxy_returns.columns)
    w, _ = nnls(X, y)
    w_norm = w / w.sum() if w.sum() > 0 else np.ones(len(cols)) / len(cols)
    y_pred = X @ w
    ss_res, ss_tot = float(np.sum((y - y_pred) ** 2)), float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    return dict(zip(cols, w_norm)), r2


def fetch_fama_french_factors(start, end) -> Optional[pd.DataFrame]:
    try:
        import pandas_datareader.data as web
        ff = web.DataReader("F-F_Research_Data_5_Factors_2x3_daily", "famafrench", start, end)[0]
        ff = ff.astype(float) / 100.0
        ff.index = pd.to_datetime(ff.index.to_timestamp() if hasattr(ff.index, "to_timestamp") else ff.index)
        return ff
    except Exception:
        return None


def build_proxy_factors(bench_ret, proxy_returns, rf_daily) -> pd.DataFrame:
    factors = pd.DataFrame(index=bench_ret.index)
    factors["Mkt-RF"] = bench_ret - rf_daily
    if "IWM" in proxy_returns.columns:
        factors["SMB"] = proxy_returns["IWM"] - bench_ret
    if "IWD" in proxy_returns.columns and "IWF" in proxy_returns.columns:
        factors["HML"] = proxy_returns["IWD"] - proxy_returns["IWF"]
    return factors.dropna()


def factor_regression(port_ret, factors, rf_daily) -> Dict[str, object]:
    common = pd.concat([port_ret - rf_daily, factors], axis=1, join="inner").dropna()
    y = common.iloc[:, 0].values
    X = common.iloc[:, 1:].values
    X_design = np.hstack([np.ones((len(X), 1)), X])
    coef, _, _, _ = np.linalg.lstsq(X_design, y, rcond=None)
    y_pred = X_design @ coef
    ss_res, ss_tot = float(np.sum((y - y_pred) ** 2)), float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    betas = dict(zip(["alpha_diario"] + list(factors.columns), coef.tolist()))
    return {"betas": betas, "r2": r2, "n_obs": len(common)}


def effective_weights(prices, weights) -> Dict[str, float]:
    present = {t: w for t, w in weights.items() if t in prices.columns and not prices[t].dropna().empty}
    return normalize_weights(present)


def slice_window(prices: pd.DataFrame, years: float) -> pd.DataFrame:
    if prices.empty:
        return prices
    end = prices.index.max()
    start = end - pd.DateOffset(days=int(round(years * 365.25)))
    return prices.loc[prices.index >= start]


def common_window(prices: pd.DataFrame, tickers: Sequence[str]) -> pd.DataFrame:
    cols = [t for t in tickers if t in prices.columns]
    return prices[cols].dropna()


print("Motor de calculo cargado.")

# %%
# ===========================================================================
# CONFIGURACION -- edita estas variables y vuelve a ejecutar desde aqui hacia
# abajo. Equivale a la barra lateral de la app Streamlit.
# ===========================================================================

# Cartera: ticker de Yahoo Finance -> peso (se normalizan automaticamente a
# 100%, asi que no hace falta que sumen 1 exacto). Anade/quita activos
# libremente, p.ej. agrega "SPY": 0.10 para incluir el ETF del S&P 500.
PORTFOLIO = {
    "NVDA": 0.15, "AAPL": 0.15, "AMZN": 0.15, "JNJ": 0.15,
    "JPM": 0.15, "GLD": 0.15, "KO": 0.10,
}

CAPITAL_INICIAL = 10000.0
PERIODO_ANALISIS_ANIOS = 5          # 1-100
BENCHMARK = "^GSPC"

VAR_CONFIANZA = 0.95                # 0.80-1.00

RF_MODO = "automatica"              # "automatica" (US T-Bill 3M via ^IRX) | "manual"
RF_MANUAL = 0.04

VOL_MAXIMA_PERMITIDA = 0.15
CAIDA_MAXIMA_TOLERADA = 0.25
SHARPE_MINIMO_EXIGIDO = 1.0

FRECUENCIA_REBALANCEO = "anual"     # "ninguno" | "anual" | "trimestral" | "mensual"
APLICAR_COSTES_REBALANCEO = False
COMISION_TRANSACCION = 0.001
RETENCION_FISCAL = 0.19

_CFG = AnalysisConfig()

print("Configuracion cargada. Cartera:", PORTFOLIO)

# %%
# ===========================================================================
# Estilo visual (colores) y funciones auxiliares de formato/graficos --
# identicas a las de la app.
# ===========================================================================

INK_PRIMARY, INK_SECONDARY, INK_MUTED = "#0b0b0b", "#52514e", "#898781"
GRID, SURFACE = "#e1e0d9", "#fcfcfb"
GOOD, WARNING, SERIOUS, CRITICAL = (STATUS_COLORS["good"], STATUS_COLORS["warning"],
                                     STATUS_COLORS["serious"], STATUS_COLORS["critical"])
BLUE, RED, INDIGO, GOLD = ASSET_COLORWAY[0], ASSET_COLORWAY[7], ASSET_COLORWAY[6], ASSET_COLORWAY[3]
FONT_FAMILY = "system-ui, -apple-system, Segoe UI, sans-serif"


def section_title(number, title, caption=""):
    display(Markdown(f"## Seccion {number} -- {title}"))
    if caption:
        display(Markdown(f"*{caption}*"))


def base_layout(fig, height=380, showlegend=True, title=None, hovermode="closest", reverse_y=False):
    top_margin = 10
    if title:
        top_margin = 62 if showlegend else 36
    fig.update_layout(
        template="plotly_white", height=height, margin=dict(l=10, r=10, t=top_margin, b=10),
        paper_bgcolor=SURFACE, plot_bgcolor=SURFACE,
        font=dict(color=INK_PRIMARY, family=FONT_FAMILY, size=12),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
        showlegend=showlegend, title=dict(text=title, y=0.98, yanchor="top") if title else None,
        hovermode=hovermode,
    )
    fig.update_xaxes(showgrid=False, zeroline=False, linecolor=GRID)
    fig.update_yaxes(showgrid=True, gridcolor=GRID, zeroline=False)
    if reverse_y:
        fig.update_yaxes(autorange="reversed")
    return fig


def pct(x, decimals=2):
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    return f"{x * 100:.{decimals}f}%"


def num(x, decimals=2):
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    return f"{x:.{decimals}f}"


def money(x, currency="$"):
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    return f"{currency}{x:,.0f}"


def money_short(x, currency="$"):
    if x is None or (isinstance(x, (float, np.floating)) and (np.isnan(x) or np.isinf(x))):
        return "N/D"
    a = abs(x)
    if a >= 1_000_000:
        return f"{currency}{x / 1_000_000:.2f}M"
    if a >= 1_000:
        return f"{currency}{x / 1_000:.0f}K"
    return f"{currency}{x:,.0f}"


def months_label(m):
    if m is None:
        return "aun sin recuperar"
    if m < 1:
        return "menos de 1 mes"
    return f"{m:.1f} meses"


def asset_color_map(tickers):
    return {t: ASSET_COLORWAY[i % len(ASSET_COLORWAY)] for i, t in enumerate(tickers)}


def show_metrics(pairs):
    """Muestra una fila de metricas tipo 'tarjeta' (equivalente a st.metric)."""
    df = pd.DataFrame({k: [v] for k, v in pairs})
    display(df.style.hide(axis="index"))


print("Utilidades de estilo cargadas.")

# %%
# ===========================================================================
# PIPELINE DE DATOS -- descarga precios y calcula la serie de retornos de la
# cartera. Ejecuta esta celda cada vez que cambies algo en CONFIGURACION.
# ===========================================================================

tickers = list(PORTFOLIO.keys())
proxy_tickers = list(STYLE_PROXIES.values())
all_tickers = list(dict.fromkeys(tickers + [BENCHMARK] + proxy_tickers))

today = date.today()
full_history_start = date(1998, 1, 1)

print(f"Descargando precios para {len(all_tickers)} tickers desde {full_history_start} hasta {today}...")
prices_all = download_prices(all_tickers, full_history_start, today)

if prices_all.empty or BENCHMARK not in prices_all.columns or prices_all[BENCHMARK].dropna().empty:
    raise RuntimeError("No se pudieron descargar precios validos para la cartera o el benchmark. "
                        "Revisa los tickers o tu conexion a internet.")

rf_auto, rf_label_auto = fetch_risk_free_rate(today)
if RF_MODO == "manual":
    rf, rf_label = RF_MANUAL, f"Manual: {RF_MANUAL:.2%}"
else:
    rf, rf_label = rf_auto, rf_label_auto

prices_window = slice_window(prices_all, PERIODO_ANALISIS_ANIOS)

tickers_with_data = [t for t in tickers if t in prices_window.columns and not prices_window[t].dropna().empty]
dropped_no_data = sorted(set(tickers) - set(tickers_with_data))
if dropped_no_data:
    print(f"AVISO: se excluyeron por no tener ningun dato en el periodo: {', '.join(dropped_no_data)}")
if not tickers_with_data:
    raise RuntimeError("Ninguno de los tickers de la cartera tiene datos de mercado en el periodo seleccionado.")

usable = common_window(prices_window, tickers_with_data + [BENCHMARK])
if usable.shape[0] < 30:
    raise RuntimeError("No hay suficientes sesiones comunes en el periodo seleccionado (minimo ~30). "
                        "Prueba un periodo mayor o revisa que los tickers coticen actualmente.")

eff_weights = effective_weights(usable[tickers_with_data], PORTFOLIO)
dropped = sorted(set(PORTFOLIO) - set(eff_weights) - set(dropped_no_data))
if dropped:
    print(f"AVISO: se excluyeron por falta de datos suficientes en el periodo comun: {', '.join(dropped)}")
if len(eff_weights) < 2:
    print("AVISO: con menos de 2 activos no es posible calcular correlaciones, diversificacion ni frontera eficiente.")

actual_start, actual_end = usable.index.min(), usable.index.max()
actual_years = (actual_end - actual_start).days / 365.25
if actual_years < PERIODO_ANALISIS_ANIOS * 0.9:
    print(f"INFO: periodo efectivamente analizado: {actual_years:.1f} anios "
          f"({actual_start.date()} a {actual_end.date()}), limitado por el activo mas reciente en cotizar.")

active_tickers = list(eff_weights.keys())
returns_assets = daily_returns(usable[active_tickers])
bench_returns = daily_returns(usable[[BENCHMARK]]).iloc[:, 0]

# Buy & Hold real (acciones fijas, pesos que derivan con el precio) -- base
# correcta para "Rentabilidad Anualizada", Sharpe, Sortino, VaR/CVaR, MDD, etc.
port_ret = buy_and_hold_return_series(usable[active_tickers], eff_weights)
cum = cumulative_curve(port_ret)
bench_cum = cumulative_curve(bench_returns)
colors = asset_color_map(active_tickers)

valor_final = CAPITAL_INICIAL * float(cum.iloc[-1] / 100.0)
port_cagr = cagr_from_returns(port_ret)
port_vol = annualized_volatility(port_ret)
bench_cagr = cagr_from_returns(bench_returns)
bench_vol = annualized_volatility(bench_returns)
sharpe = sharpe_ratio(port_ret, rf)
sortino = sortino_ratio(port_ret, rf)
beta, alpha = beta_alpha_jensen(port_ret, bench_returns, rf)
var_h, cvar_h = historical_var_cvar(port_ret, VAR_CONFIANZA)
mdd = max_drawdown(cum)
bench_sharpe = sharpe_ratio(bench_returns, rf)

print(f"\nListo. {len(active_tickers)} activos, {len(usable)} sesiones "
      f"({actual_start.date()} a {actual_end.date()}). Rf: {rf_label}")

# %%
# ===========================================================================
# SECCION 01-02 -- Radiografia de la cartera
# ===========================================================================

section_title("01-02", "Radiografia de la cartera")
display(Markdown(
    f"En los ultimos **{actual_years:.1f} anios**, **{money(CAPITAL_INICIAL)}** en esta cartera "
    f"(Buy & Hold, sin rebalancear) se habrian convertido en **{money(valor_final)}** -- una media del "
    f"**{pct(port_cagr, 2)} anual**, atravesando una caida maxima del **{pct(abs(mdd), 2)}** por el camino. "
    f"En el mismo periodo, el benchmark ({BENCHMARK}) hizo un **{pct(bench_cagr, 2)} anual**. "
    f"*Rf aplicada: {rf_label}.*"
))

fig = go.Figure(data=[go.Pie(
    labels=active_tickers, values=[eff_weights[t] for t in active_tickers], hole=0.55,
    marker=dict(colors=[colors[t] for t in active_tickers], line=dict(color=SURFACE, width=2)),
    textinfo="label+percent", sort=False,
)])
base_layout(fig, height=340, showlegend=False, title="Composicion de la cartera")
fig.show()

comp_df = pd.DataFrame({
    "Ticker": active_tickers,
    "Nombre": [DEFAULT_NAMES.get(t, t) for t in active_tickers],
    "Peso": [pct(eff_weights[t], 1) for t in active_tickers],
})
display(comp_df)

show_metrics([
    ("Rentabilidad anual", pct(port_cagr)), ("Volatilidad anual", pct(port_vol)),
    ("Ratio de Sharpe", num(sharpe)), ("Ratio de Sortino", num(sortino)), ("Alfa anual (Jensen)", pct(alpha)),
])
show_metrics([
    ("Beta vs mercado", num(beta)), (f"VaR diario {VAR_CONFIANZA:.0%}", pct(var_h)),
    (f"CVaR diario {VAR_CONFIANZA:.0%}", pct(cvar_h)), ("Peor caida (MDD)", pct(mdd)),
    (f"{BENCHMARK} anual", pct(bench_cagr)),
])

# %%
# ===========================================================================
# SECCION 03 -- Diagnostico de salud de la cartera
# ===========================================================================

corr_matrix_full = correlation_matrix(returns_assets) if len(active_tickers) >= 2 else pd.DataFrame()
avg_corr = weighted_avg_correlation(corr_matrix_full, eff_weights) if len(active_tickers) >= 2 else float("nan")

section_title("03", "Diagnostico de salud de la cartera",
              "Resumen educativo (0-100) que combina retorno ajustado al riesgo, diversificacion y "
              "resistencia a caidas. No es una recomendacion de inversion.")

hs = health_score(sharpe, avg_corr if not np.isnan(avg_corr) else 0.5, mdd, CAIDA_MAXIMA_TOLERADA, bench_sharpe)
thresholds = evaluate_thresholds(port_vol, mdd, sharpe, VOL_MAXIMA_PERMITIDA, CAIDA_MAXIMA_TOLERADA, SHARPE_MINIMO_EXIGIDO)

gauge_color = GOOD if hs["global"] >= 66 else (WARNING if hs["global"] >= 40 else CRITICAL)
fig = go.Figure(go.Indicator(
    mode="gauge+number", value=hs["global"], number={"suffix": " /100", "font": {"size": 34}},
    gauge={"axis": {"range": [0, 100], "tickcolor": INK_MUTED}, "bar": {"color": gauge_color, "thickness": 0.28},
           "bgcolor": SURFACE, "borderwidth": 0,
           "steps": [{"range": [0, 40], "color": "#f6d9d3"}, {"range": [40, 66], "color": "#fbe8bf"},
                     {"range": [66, 100], "color": "#c9ecc9"}]},
))
base_layout(fig, height=260, showlegend=False, title="Puntuacion global")
fig.show()

sub_labels = ["Retorno ajustado al riesgo", "Diversificacion", "Resistencia a caidas"]
sub_values = [hs["retorno_ajustado_riesgo"], hs["diversificacion"], hs["resistencia_caidas"]]
fig = go.Figure()
fig.add_trace(go.Bar(y=sub_labels, x=sub_values, orientation="h", marker_color=BLUE, name="Tu cartera"))
fig.add_trace(go.Scatter(y=sub_labels, x=[hs["media_mercado_referencia"]] * 3, mode="markers",
                          marker=dict(symbol="line-ns", size=22, line=dict(width=3, color=INK_SECONDARY)),
                          name="Media mercado (ref.)"))
fig.update_xaxes(range=[0, 100])
base_layout(fig, height=260, showlegend=True, title="Sub-scores (0-100)", reverse_y=True)
fig.show()

display(Markdown("**Frente a tus limites de riesgo:**"))
show_metrics([
    (label, f"{pct(thresholds[key]['valor']) if key != 'sharpe' else num(thresholds[key]['valor'])} "
            f"({'Cumple' if thresholds[key]['cumple'] else 'No cumple'})")
    for key, label in [("volatilidad", "Volatilidad"), ("caida_maxima", "Caida maxima"), ("sharpe", "Sharpe")]
])

# %%
# ===========================================================================
# SECCION 04 -- Sensibilidad asimetrica y mercado condicional
# ===========================================================================

section_title("04", "Sensibilidad asimetrica y mercado condicional",
              "Como se comporta la cartera relativo al mercado, separando dias/meses al alza y a la baja.")

cap = capture_ratios(port_ret, bench_returns, _CFG.ventana_captura_meses)
cbeta = conditional_beta(port_ret, bench_returns)

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

fig = go.Figure()
fig.add_trace(go.Bar(y=labels_asym, x=values_asym, orientation="h", marker_color=colors_asym,
                      text=[pct(v) if is_pct else num(v) for _, v, _, is_pct in metrics_asym], textposition="outside"))
fig.add_vline(x=1.0, line_dash="dash", line_color=INK_MUTED)
if valid_values:
    fig.update_xaxes(range=[0, max(valid_values) * 1.2], title="Captura (ratio) / Beta condicional (coeficiente)")
base_layout(fig, height=300, showlegend=False, reverse_y=True,
            title=f"Ventana: ultimos {cap['n_meses']} meses (linea = 100% / Beta 1)")
fig.show()

# %%
# ===========================================================================
# SECCION 05 -- Distribucion estadistica de retornos diarios
# ===========================================================================

section_title("05", "Distribucion estadistica de retornos diarios")

var_g = gaussian_var(port_ret, VAR_CONFIANZA)
dist = distribution_stats(port_ret)
conf_label = f"{VAR_CONFIANZA:.0%}"

r = port_ret.dropna()
fig = go.Figure()
fig.add_trace(go.Histogram(x=r, nbinsx=60, marker_color=BLUE, opacity=0.85, name="Cartera", histnorm="probability density"))
x_range = np.linspace(r.min(), r.max(), 200)
normal_pdf = stats.norm.pdf(x_range, r.mean(), r.std(ddof=1))
fig.add_trace(go.Scatter(x=x_range, y=normal_pdf, mode="lines", line=dict(color=INK_SECONDARY, dash="dash"), name="Normal teorica"))
fig.add_vline(x=-var_h, line_color=WARNING, annotation_text=f"VaR {conf_label}", annotation_position="top")
fig.add_vline(x=-cvar_h, line_color=CRITICAL, annotation_text=f"CVaR {conf_label}", annotation_position="bottom")
base_layout(fig, height=360, showlegend=True, title="Histograma de retornos diarios vs Normal")
fig.show()

show_metrics([
    ("Asimetria (Skewness)", num(dist["skew"])), ("Curtosis (exceso)", num(dist["kurtosis_exceso"])),
    ("Ratio Omega", num(dist["omega"])),
])
display(Markdown(f"VaR gaussiano/parametrico {conf_label}: **{pct(var_g)}** &middot; "
                  f"VaR historico: **{pct(var_h)}** &middot; CVaR historico: **{pct(cvar_h)}**"))

# %%
# ===========================================================================
# SECCION 06 -- Curva de capital, caidas acumuladas y retorno rodante
# ===========================================================================

section_title("06", "Curva de capital, caidas acumuladas y retorno rodante")

fig = go.Figure()
fig.add_trace(go.Scatter(x=cum.index, y=cum, mode="lines", name="Cartera (Buy & Hold)", line=dict(color=BLUE, width=2)))
fig.add_trace(go.Scatter(x=bench_cum.index, y=bench_cum, mode="lines", name=f"Benchmark ({BENCHMARK})",
                          line=dict(color=INK_MUTED, width=1.6, dash="dot")))
for m in CAPITAL_CURVE_MILESTONES:
    m_start, m_end = pd.Timestamp(m["start"]), pd.Timestamp(m["end"])
    if m_end >= cum.index.min() and m_start <= cum.index.max():
        fig.add_vrect(x0=max(m_start, cum.index.min()), x1=min(m_end, cum.index.max()),
                       fillcolor=INK_MUTED, opacity=0.10, line_width=0,
                       annotation_text=m["label"], annotation_position="top left", annotation_font_size=10)
base_layout(fig, height=380, showlegend=True, title="Curva de capital (base 100)", hovermode="x unified")
fig.show()

running_max = cum.cummax()
dd_series = (cum / running_max - 1.0) * 100
fig = go.Figure()
fig.add_trace(go.Scatter(x=dd_series.index, y=dd_series, mode="lines", fill="tozeroy",
                          line=dict(color=CRITICAL, width=1.4), name="Drawdown"))
base_layout(fig, height=300, showlegend=False, title="Bajo el agua -- profundidad de las caidas (%)", hovermode="x unified")
fig.show()

rs = rolling_sharpe_series(port_ret, rf, _CFG.ventana_sharpe_rodante_meses)
fig = go.Figure()
fig.add_trace(go.Scatter(x=rs.index, y=rs, mode="lines", line=dict(color=BLUE, width=1.6), name="Sharpe rodante"))
fig.add_hline(y=1.0, line_dash="dash", line_color=INK_MUTED)
fig.add_hline(y=0.0, line_color=INK_MUTED, line_width=1)
base_layout(fig, height=300, showlegend=False, title="Sharpe rodante (12 meses)", hovermode="x unified")
fig.show()

ui = ulcer_index(cum)
mr = martin_ratio(port_cagr * 100, ui, rf * 100)
show_metrics([("Ulcer Index", f"{ui:.2f}%"), ("Ratio de Martin", num(mr))])

# %%
# ===========================================================================
# SECCION 07 -- Registro de los peores baches (Top 5 Drawdowns)
# ===========================================================================

section_title("07", "Registro de los peores baches (Top 5 Drawdowns)")

dd_top = top_drawdowns(cum, 5)
if dd_top:
    dd_df = pd.DataFrame([{
        "#": i + 1, "Maximo previo": d["peak_date"].strftime("%Y-%m"), "Suelo": d["trough_date"].strftime("%Y-%m"),
        "Profundidad": months_label(d["fall_months"]), "Caida": pct(d["depth_pct"]),
        "Recuperacion": months_label(d["recovery_months"]) if d["recovered"] else "aun sin recuperar",
    } for i, d in enumerate(dd_top)])
    display(dd_df)
else:
    print("No se detectaron episodios de caida en el periodo seleccionado.")

# %%
# ===========================================================================
# SECCION 08 -- Dinamica rodante y cono de volatilidad
# ===========================================================================

section_title("08", "Dinamica rodante y cono de volatilidad")

rc = rolling_correlation_series(port_ret, bench_returns, _CFG.ventana_correlacion_rodante_meses)
fig = go.Figure()
fig.add_trace(go.Scatter(x=rc.index, y=rc, mode="lines", line=dict(color=BLUE, width=1.6)))
fig.update_yaxes(range=[-1, 1])
base_layout(fig, height=300, showlegend=False, hovermode="x unified",
            title=f"Correlacion rodante 3M con {BENCHMARK} (ultimo: {num(rc.iloc[-1]) if len(rc) else 'N/D'})")
fig.show()

cone = volatility_cone(port_ret, _CFG.ventanas_cono_volatilidad_meses)
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
                              fillcolor="rgba(47,95,152,0.12)", line=dict(width=0, color="rgba(47,95,152,0.12)"), name="p10-p90"))
    fig.add_trace(go.Scatter(x=x_labels + x_labels[::-1], y=p75 + p25[::-1], fill="toself", mode="lines",
                              fillcolor="rgba(47,95,152,0.28)", line=dict(width=0, color="rgba(47,95,152,0.28)"), name="p25-p75"))
    fig.add_trace(go.Scatter(x=x_labels, y=median, mode="lines", line=dict(color=INK_SECONDARY, dash="dash"), name="Mediana"))
    fig.add_trace(go.Scatter(x=x_labels, y=actual, mode="markers+lines", line=dict(color=BLUE),
                              marker=dict(size=9, color=BLUE), name="Actual"))
base_layout(fig, height=300, showlegend=True, title="Cono de volatilidad anualizada (%)")
fig.show()

# %%
# ===========================================================================
# SECCION 09 -- Pruebas de esfuerzo en crisis historicas (Stress Testing)
# ===========================================================================

section_title("09", "Pruebas de esfuerzo en crisis historicas (Stress Testing)",
              "Usa el historico completo disponible (no limitado al periodo de analisis) para reconstruir cada crisis.")

stress = stress_test(prices_all[active_tickers], eff_weights)
rows = []
for s in stress:
    if not s["disponible"]:
        rows.append({"Crisis": s["name"], "Periodo": f"{s['start'][:7]} -> {s['end'][:7]}", "Cobertura": "sin datos",
                     "Caida max.": "N/D", "Recuperacion": "N/D"})
    else:
        rows.append({"Crisis": s["name"], "Periodo": f"{s['start'][:7]} -> {s['end'][:7]}",
                      "Cobertura": pct(s["cobertura"], 0), "Caida max.": pct(s["caida_max"]),
                      "Recuperacion": months_label(s["recuperacion_meses"]) if s["recuperado"] else "aun sin recuperar"})
display(pd.DataFrame(rows))

# %%
# ===========================================================================
# SECCION 10 -- Matriz de correlacion y grado de diversificacion
# ===========================================================================

section_title("10", "Matriz de correlacion y grado de diversificacion")

if len(active_tickers) >= 2:
    corr = corr_matrix_full.loc[active_tickers, active_tickers]
    div_score = diversification_score(avg_corr)

    custom_scale = [[0.0, RED], [0.5, "#f0efec"], [1.0, BLUE]]
    fig = go.Figure(data=go.Heatmap(z=corr.values, x=corr.columns, y=corr.columns, zmin=-1, zmax=1,
                                     colorscale=custom_scale, colorbar=dict(title="rho")))
    for i, row_t in enumerate(corr.index):
        for j, col_t in enumerate(corr.columns):
            v = corr.values[i, j]
            fig.add_annotation(x=col_t, y=row_t, text=f"{v:.2f}", showarrow=False,
                                font=dict(color="white" if abs(v) > 0.55 else INK_PRIMARY, size=11))
    base_layout(fig, height=380, showlegend=False, title="Correlaciones (rho)", reverse_y=True)
    fig.show()

    show_metrics([("Puntuacion de diversificacion", f"{div_score:.0f} /100"),
                  ("Correlacion media ponderada", num(avg_corr))])
else:
    print("Se requieren al menos 2 activos para calcular la matriz de correlacion.")

# %%
# ===========================================================================
# SECCION 11 -- Atribucion ponderada de riesgo y retorno por activo
# ===========================================================================

section_title("11", "Atribucion ponderada de riesgo y retorno por activo")

if len(active_tickers) >= 2:
    rcontrib = risk_contribution(returns_assets, eff_weights).sort_values(ascending=False)
    retcontrib = return_contribution(usable[active_tickers], eff_weights).reindex(rcontrib.index)

    fig = go.Figure(go.Bar(x=rcontrib.values * 100, y=rcontrib.index, orientation="h",
                            marker_color=[colors[t] for t in rcontrib.index]))
    fig.update_xaxes(ticksuffix="%")
    base_layout(fig, height=320, showlegend=False, title="Contribucion al riesgo (% volatilidad total)", reverse_y=True)
    fig.show()

    fig = go.Figure(go.Bar(x=retcontrib.values * 100, y=retcontrib.index, orientation="h",
                            marker_color=[colors[t] for t in retcontrib.index]))
    fig.update_xaxes(ticksuffix=" pp")
    base_layout(fig, height=320, showlegend=False, title="Contribucion al retorno (mismo orden que el panel de riesgo)", reverse_y=True)
    fig.show()
else:
    print("Se requieren al menos 2 activos para calcular la atribucion de riesgo y retorno.")

# %%
# ===========================================================================
# SECCION 12 -- Optimizacion de frontera eficiente (Markowitz)
# ===========================================================================

section_title("12", "Optimizacion de frontera eficiente (Markowitz)")

if len(active_tickers) >= 2:
    mk = markowitz_summary(returns_assets, eff_weights, rf, seed=_CFG.semilla_aleatoria)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=np.array(mk["nube_aleatoria"]["volatilidad"]) * 100,
                              y=np.array(mk["nube_aleatoria"]["retorno"]) * 100,
                              mode="markers", marker=dict(size=3, color=INK_MUTED, opacity=0.35),
                              name="Carteras aleatorias", hoverinfo="skip"))
    if mk["frontera"]:
        fx = [p[0] * 100 for p in mk["frontera"]]
        fy = [p[1] * 100 for p in mk["frontera"]]
        fig.add_trace(go.Scatter(x=fx, y=fy, mode="lines", line=dict(color=BLUE, width=2.5), name="Frontera eficiente"))

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
    fig.show()
    display(Markdown(
        "*\"Tu cartera\" usa la media aritmetica anualizada de retornos (convencion Markowitz de un solo periodo), "
        "no el CAGR geometrico de la Seccion 01-02 -- con activos volatiles la media aritmetica es sistematicamente "
        "mayor (\"volatility drag\"), asi que puede no coincidir exactamente con la rentabilidad de cabecera.*"
    ))

    delta_rows = []
    for key, label, *_ in points[:3]:
        p, base_p = mk[key], mk["tu_cartera"]
        delta_rows.append({
            "Punto": label, "Rentabilidad": f"{(p['retorno'] - base_p['retorno']) * 100:+.1f} pp",
            "Volatilidad": f"{(p['volatilidad'] - base_p['volatilidad']) * 100:+.1f} pp",
            "Sharpe": f"{p['sharpe'] - base_p['sharpe']:+.2f}",
        })
    display(Markdown("**Mejora frente a tu cartera:**"))
    display(pd.DataFrame(delta_rows))

    weights_table = pd.DataFrame({
        "Activo": mk["activos"], "Nombre": [DEFAULT_NAMES.get(t, t) for t in mk["activos"]],
        "Tu peso": [pct(mk["tu_cartera"]["weights"][t], 1) for t in mk["activos"]],
        "Max. Sharpe": [pct(mk["max_sharpe"]["weights"][t], 1) for t in mk["activos"]],
        "Delta ajuste": [f"{(mk['max_sharpe']['weights'][t] - mk['tu_cartera']['weights'][t]) * 100:+.1f} pp" for t in mk["activos"]],
    })
    display(weights_table)
else:
    print("Se requieren al menos 2 activos para optimizar la frontera eficiente.")

# %%
# ===========================================================================
# SECCION 13 -- Simulacion de rebalanceo periodico vs Buy & Hold
# ===========================================================================

section_title("13", "Simulacion de rebalanceo periodico vs. Buy & Hold")

bh = simulate_buy_and_hold(usable[active_tickers], eff_weights, CAPITAL_INICIAL)
freq = FRECUENCIA_REBALANCEO
if freq != "ninguno":
    reb_gross = simulate_rebalance(usable[active_tickers], eff_weights, CAPITAL_INICIAL, freq, 0.0, 0.0)
    reb_net = (simulate_rebalance(usable[active_tickers], eff_weights, CAPITAL_INICIAL, freq,
                                   COMISION_TRANSACCION, RETENCION_FISCAL)
               if APLICAR_COSTES_REBALANCEO else reb_gross)

    bh_cagr = cagr_from_returns(bh.pct_change().dropna())
    reb_cagr_gross = cagr_from_returns(reb_gross.pct_change().dropna())
    reb_cagr_net = cagr_from_returns(reb_net.pct_change().dropna())

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=bh.index, y=bh, mode="lines", name="Sin tocar (Buy&Hold)", line=dict(color=INK_MUTED, dash="dot")))
    fig.add_trace(go.Scatter(x=reb_net.index, y=reb_net, mode="lines",
                              name=f"Rebalanceada ({freq}){' neta' if APLICAR_COSTES_REBALANCEO else ''}", line=dict(color=BLUE)))
    base_layout(fig, height=360, showlegend=True, title="Valor de la cartera: sin tocar vs. rebalanceada", hovermode="x unified")
    fig.show()

    show_metrics([
        ("Sin tocar (anual)", pct(bh_cagr)),
        (f"Rebalanceada {freq} (anual)", pct(reb_cagr_net if APLICAR_COSTES_REBALANCEO else reb_cagr_gross)),
        ("Diferencia (drag)", pct((reb_cagr_net if APLICAR_COSTES_REBALANCEO else reb_cagr_gross) - bh_cagr)),
    ])
    if APLICAR_COSTES_REBALANCEO:
        display(Markdown(
            f"Con comision {COMISION_TRANSACCION:.2%} por rebalanceo y retencion fiscal {RETENCION_FISCAL:.2%} sobre "
            f"la plusvalia realizada: bruto {pct(reb_cagr_gross)} anual -> neto {pct(reb_cagr_net)} anual."
        ))
else:
    print("Frecuencia de rebalanceo = 'ninguno': se muestra solo la evolucion Buy & Hold.")
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=bh.index, y=bh, mode="lines", name="Sin tocar (Buy&Hold)", line=dict(color=BLUE)))
    base_layout(fig, height=320, showlegend=False, title="Valor de la cartera (sin rebalanceo)", hovermode="x unified")
    fig.show()

drift = weight_drift(usable[active_tickers], eff_weights)
display(Markdown("**Deriva de tus pesos sin rebalancear:**"))
if not drift.empty:
    top_drift = drift.iloc[0]
    display(Markdown(f"Tu mayor desvio: {DEFAULT_NAMES.get(top_drift['activo'], top_drift['activo'])}, "
                      f"del {top_drift['peso_inicial']:.1%} al {top_drift['peso_final']:.1%} ({top_drift['delta_pp']:+.1f} pp)."))
drift_display = drift.copy()
drift_display["peso_inicial"] = drift_display["peso_inicial"].map(lambda x: f"{x:.1%}")
drift_display["peso_final"] = drift_display["peso_final"].map(lambda x: f"{x:.1%}")
drift_display["delta_pp"] = drift_display["delta_pp"].map(lambda x: f"{x:+.1f} pp")
drift_display.columns = ["Activo", "Peso inicial", "Peso final", "Delta"]
display(drift_display)

actions = []
for _, row in drift.iterrows():
    delta = row["peso_final"] - row["peso_inicial"]
    if abs(delta) < 0.005:
        continue
    verb = "Reduce" if delta > 0 else "Sube"
    actions.append(f"{verb} **{row['activo']}** {abs(delta) * 100:.1f} pp")
if actions:
    display(Markdown("**Para volver a tus pesos objetivo:** " + " &middot; ".join(actions)))

# %%
# ===========================================================================
# SECCION 14 -- Proyeccion probabilistica estocastica (Monte Carlo)
#
# "En vivo": cambia MC_APORTACION / MC_HORIZONTE_ANIOS / MC_N_SIMULACIONES /
# MC_MODELO abajo y vuelve a ejecutar SOLO esta celda (no hace falta repetir
# todo el pipeline) para ver el resultado al instante.
# ===========================================================================

MC_APORTACION = 250.0
MC_HORIZONTE_ANIOS = 20             # 10 | 20 | 30
MC_N_SIMULACIONES = 1000
MC_MODELO = "bootstrap_historico"   # "bootstrap_historico" | "student_t" | "GBM"

section_title("14", "Proyeccion probabilistica estocastica (Monte Carlo)")

# Base estadistica: TODO el historico comun disponible (como el Stress
# Testing, no limitado al Periodo de Analisis) y con pesos CONSTANTES/
# objetivo (no el Buy & Hold ya derivado de las Secciones 01-12) -- una
# proyeccion a 10-30 anios asume que mantienes tu asignacion objetivo.
mc_prices = common_window(prices_all, active_tickers)
mc_port_ret = portfolio_return_series(daily_returns(mc_prices), eff_weights)
mc_monthly = monthly_return_series(mc_port_ret)
mc_dist = distribution_stats(mc_port_ret)
mc_years_available = len(mc_monthly) / 12

if mc_dist["kurtosis_exceso"] > 1 and MC_MODELO == "GBM":
    print(f"AVISO: tu cartera tiene un exceso de curtosis de {mc_dist['kurtosis_exceso']:.2f} (colas gordas). "
          "GBM/Normal puede infravalorar el riesgo de caidas extremas -- se recomienda Bootstrap Historico o Student-t.")

mc = monte_carlo_projection(mc_monthly, CAPITAL_INICIAL, MC_APORTACION, MC_HORIZONTE_ANIOS,
                             MC_N_SIMULACIONES, MC_MODELO, seed=_CFG.semilla_aleatoria)

years_axis = sorted(mc["checkpoints"].keys())
p10_path = [np.percentile(mc["checkpoints"][m], 10) for m in years_axis]
p90_path = [np.percentile(mc["checkpoints"][m], 90) for m in years_axis]
median_path = [np.percentile(mc["checkpoints"][m], 50) for m in years_axis]
x_years = [m / 12 for m in years_axis]

fig = go.Figure()
fig.add_trace(go.Scatter(x=x_years + x_years[::-1], y=p90_path + p10_path[::-1], fill="toself", mode="lines",
                          fillcolor="rgba(47,95,152,0.15)", line=dict(width=0, color="rgba(47,95,152,0.15)"), name="Rango p10-p90"))
fig.add_trace(go.Scatter(x=x_years, y=median_path, mode="lines", line=dict(color=BLUE, width=2.4), name="Mediana"))
total_contributed_path = [CAPITAL_INICIAL + MC_APORTACION * m for m in years_axis]
fig.add_trace(go.Scatter(x=x_years, y=total_contributed_path, mode="lines", line=dict(color=INK_MUTED, dash="dot"), name="Capital aportado"))
fig.update_xaxes(title="Anios")
fig.update_yaxes(title="Patrimonio ($)")
base_layout(fig, height=400, showlegend=True, hovermode="x unified",
            title=f"Proyeccion a {MC_HORIZONTE_ANIOS} anios -- modelo: {MC_MODELO}")
fig.show()

prob_label = format_probability_floor(mc["prob_perdida"], mc["n_sims"])
show_metrics([
    ("Capital total aportado", money_short(mc["total_aportado"])), ("Mediana patrimonio final", money_short(mc["mediana"])),
    ("Rango p10 - p90", f"{money_short(mc['p10'])} - {money_short(mc['p90'])}"),
    ("Prob. de perdida vs. aportado", prob_label),
])
display(Markdown(
    f"*{mc['n_sims']} simulaciones ({MC_MODELO}) con la rentabilidad y volatilidad de tu cartera a pesos objetivo "
    f"constantes sobre los ultimos {mc_years_available:.1f} anios de historico disponible. El modelo Bootstrap "
    "Historico remuestrea bloques de 6 meses seguidos (no meses sueltos) para conservar rachas malas completas. "
    "Es una proyeccion estadistica de un escenario que repite el pasado, no una prediccion garantizada.*"
))

# %%
# ===========================================================================
# SECCION 15 -- Analisis de estilo y exposicion a factores (Factor Investing)
# ===========================================================================

section_title("15", "Analisis de estilo y exposicion a factores (Factor Investing)")

proxy_prices = common_window(prices_window, proxy_tickers)
proxy_returns = daily_returns(proxy_prices)

try:
    style_2f, r2_2f = style_regression(port_ret, proxy_returns[["IWD", "IWF"]])
    fig = go.Figure()
    fig.add_trace(go.Bar(x=[style_2f.get("IWF", 0) * 100], y=["Estilo"], orientation="h", name="Growth (IWF)",
                          marker_color=ASSET_COLORWAY[5], text=[f"Growth {style_2f.get('IWF', 0):.1%}"], textposition="inside"))
    fig.add_trace(go.Bar(x=[style_2f.get("IWD", 0) * 100], y=["Estilo"], orientation="h", name="Value (IWD)",
                          marker_color=BLUE, text=[f"Value {style_2f.get('IWD', 0):.1%}"], textposition="inside"))
    fig.update_layout(barmode="stack")
    base_layout(fig, height=170, showlegend=False, title=f"Growth vs Value (R2 = {r2_2f:.2f})")
    fig.show()
    display(Markdown(
        f"Regresion de estilo contra ETFs proxy: {', '.join(STYLE_PROXIES.values())}. El R2 indica que estos "
        f"factores explican el {r2_2f:.0%} del comportamiento diario de la cartera."
    ))
except Exception as exc:
    print(f"No se pudo calcular el analisis de estilo Growth/Value: {exc}")

display(Markdown("**Ampliacion: modelo de factores tipo Fama-French**"))
freg, source_label = None, ""
try:
    ff = fetch_fama_french_factors(usable.index.min(), usable.index.max())
    if ff is not None and not ff.empty and "RF" in ff.columns:
        factor_cols = [c for c in ["Mkt-RF", "SMB", "HML", "RMW", "CMA"] if c in ff.columns]
        combined = pd.concat([port_ret, ff["RF"]], axis=1, join="inner").dropna()
        excess = combined.iloc[:, 0] - combined.iloc[:, 1]
        freg = factor_regression(excess, ff[factor_cols].reindex(excess.index), 0.0)
        source_label = f"Kenneth French Data Library (factores reales, {freg['n_obs']} sesiones)"
    else:
        raise ValueError("sin datos reales disponibles")
except Exception:
    try:
        proxy_factors = build_proxy_factors(bench_returns, proxy_returns, rf / TRADING_DAYS)
        freg = factor_regression(port_ret, proxy_factors, rf / TRADING_DAYS)
        source_label = "Proxy con ETFs (IWM/IWD/IWF) -- datos academicos Fama-French no disponibles en este momento"
    except Exception as exc2:
        print(f"No se pudo calcular el modelo de factores ampliado: {exc2}")

if freg is not None:
    betas = freg["betas"]
    factor_names = [k for k in betas if k != "alpha_diario"]
    factor_values = [betas[k] for k in factor_names]
    fig = go.Figure(go.Bar(x=factor_values, y=factor_names, orientation="h",
                            marker_color=[BLUE if v >= 0 else RED for v in factor_values]))
    fig.add_vline(x=0, line_color=INK_MUTED)
    base_layout(fig, height=260, showlegend=False, title=f"Cargas factoriales (R2 = {freg['r2']:.2f})", reverse_y=True)
    fig.show()
    display(Markdown(
        f"Fuente: {source_label}. Alfa diario no explicado por los factores: {betas.get('alpha_diario', float('nan')):.4%} "
        f"(~{betas.get('alpha_diario', 0) * TRADING_DAYS:.2%} anualizado)."
    ))

# %%
print("Analisis completo. Herramienta educativa; no constituye asesoramiento de inversion.")
