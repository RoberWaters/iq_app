"""
Theoretical titration curve generator.

Produces an SVG figure (matplotlib) showing the calculated pMetal vs.
volume-of-titrant curve for each implemented practice, with the student's
recorded endpoint marked against the theoretical equivalence point.

Practice 4 (Volhard): pAg vs V(KSCN)
  Back-titration of excess Ag⁺ with KSCN 0.08 M.
  Ksp(AgSCN) = 1.0 × 10⁻¹²

Practice 5 (Complexometry): pCa vs V(EDTA)
  Titration of total hardness (Ca²⁺/Mg²⁺) with EDTA 0.01 M at pH 10.
  K′f(CaY²⁻) at pH 10 = Kf × αY4⁻ = 10^10.65 × 0.36 ≈ 1.61 × 10¹⁰
"""

import io
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker


# ── Style ─────────────────────────────────────────────────────────────────────

_STYLE = {
    'figure.facecolor':    'white',
    'axes.facecolor':      '#F8FAFC',
    'axes.edgecolor':      '#94A3B8',
    'axes.linewidth':      0.8,
    'axes.grid':           True,
    'grid.color':          '#E2E8F0',
    'grid.linestyle':      '-',
    'grid.linewidth':      0.7,
    'grid.alpha':          1.0,
    'font.family':         'serif',
    'mathtext.fontset':    'cm',
    'font.size':           10,
    'axes.labelsize':      13,
    'axes.titlesize':      11,
    'xtick.labelsize':     9,
    'ytick.labelsize':     9,
    'legend.fontsize':     9,
    'legend.framealpha':   0.95,
    'legend.edgecolor':    '#CBD5E1',
}


def _fig_to_bytes(fig, fmt: str = 'svg') -> bytes:
    buf = io.BytesIO()
    if fmt == 'png':
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=180)
    else:
        fig.savefig(buf, format='svg', bbox_inches='tight')
    plt.close(fig)
    return buf.getvalue()


def _annotate_error(ax, recorded_vol, v_eq, y_pos, y_tip):
    """Red dashed annotation showing the student's error magnitude."""
    error_ml = recorded_vol - v_eq
    pct = abs(error_ml) / v_eq * 100 if v_eq else 0
    sign = '+' if error_ml >= 0 else ''
    label = f'{sign}{error_ml:.2f} mL  ({pct:.1f}%)'

    # Horizontal offset to keep label inside the axes
    x_text = recorded_vol + v_eq * 0.06
    ax.annotate(
        label,
        xy=(recorded_vol, y_tip),
        xytext=(x_text, y_pos),
        fontsize=8.5,
        color='#DC2626',
        arrowprops=dict(arrowstyle='->', color='#DC2626', lw=1.0),
        bbox=dict(boxstyle='round,pad=0.3', facecolor='#FEF2F2',
                  edgecolor='#FCA5A5', alpha=0.95),
        zorder=10,
    )


# ── Practice 4 ────────────────────────────────────────────────────────────────

def _curve_p4(recorded_vol: float, expected_vol: float, fmt: str = 'svg') -> bytes:
    """
    Argentometric back-titration (Volhard).
    pAg = –log[Ag⁺]  vs.  V(KSCN) in mL.

    Before eq.:  [Ag⁺] = (n_Ag_exc – M_KSCN·V) / (V0 + V)
    After  eq.:  [Ag⁺] = Ksp / [SCN⁻];  [SCN⁻] = (M_KSCN·V – n_Ag_exc) / (V0 + V)
    """
    M_KSCN    = 0.08          # mol/L
    Ksp_AgSCN = 1.0e-12
    V0        = 73.0          # mL (10 sample + 10 H₂O + 1 HNO₃ + 50 AgNO₃ + 1 NB + 1 indicator)

    # Moles of excess Ag⁺ (mmol → M when dividing by mL)
    n_Ag = expected_vol * M_KSCN          # mmol = mL × mol/L (units consistent at mL scale)

    V  = np.linspace(0.05, expected_vol * 1.65, 3000)
    Vt = V0 + V

    # Before equivalence
    before = V < expected_vol
    Ag_M_pre  = np.maximum((n_Ag - M_KSCN * V[before]) / Vt[before], 1e-15)

    # After equivalence
    after = ~before
    SCN_M     = np.maximum((M_KSCN * V[after] - n_Ag) / Vt[after], 1e-15)
    Ag_M_post = Ksp_AgSCN / SCN_M

    pAg = np.empty_like(V)
    pAg[before] = -np.log10(Ag_M_pre)
    pAg[after]  = -np.log10(Ag_M_post)
    pAg = np.clip(pAg, 0, 12)

    # ── Plot ──────────────────────────────────────────────────────────────────
    plt.rcParams.update(_STYLE)
    fig, ax = plt.subplots(figsize=(8.5, 5))

    ax.plot(V, pAg, color='#2563EB', lw=2.2, zorder=3,
            label='Curva teórica')

    tol = 0.5
    ax.axvspan(expected_vol - tol, expected_vol + tol,
               alpha=0.13, color='#16A34A', zorder=1,
               label=f'Tolerancia ±{tol} mL')
    ax.axvline(expected_vol, color='#16A34A', lw=1.6, ls='-', zorder=4,
               label=f'Punto de equivalencia  {expected_vol:.2f} mL')
    ax.axvline(recorded_vol, color='#DC2626', lw=1.6, ls='--', zorder=4,
               label=f'Lectura del estudiante  {recorded_vol:.2f} mL')

    # Equivalence point marker
    pAg_eq = -np.log10(np.sqrt(Ksp_AgSCN))   # = 6.0
    ax.plot(expected_vol, pAg_eq, 'o', color='#16A34A',
            ms=8, zorder=5, markeredgecolor='white', markeredgewidth=1)

    _annotate_error(ax, recorded_vol, expected_vol, y_pos=10.5, y_tip=8.5)

    ax.set_xlabel(r'$V_{\mathrm{KSCN}}\ /\ \mathrm{mL}$', labelpad=6)
    ax.set_ylabel(r'$\mathrm{p}[\mathrm{Ag}^{+}]$', labelpad=6)
    ax.set_title(
        'Curva de Titulación — Método de Volhard\n'
        r'$\mathrm{Ag}^{+}_{\mathrm{(exc)}}\ +\ \mathrm{SCN}^{-}\ \longrightarrow\ \mathrm{AgSCN}{\downarrow}\ +\ \mathrm{K}^{+}$',
        pad=10,
    )
    ax.set_xlim(0, expected_vol * 1.65)
    ax.set_ylim(0, 12)
    ax.xaxis.set_minor_locator(ticker.AutoMinorLocator(4))
    ax.yaxis.set_minor_locator(ticker.AutoMinorLocator(4))
    ax.tick_params(which='minor', length=2, color='#94A3B8')
    ax.legend(loc='upper left', framealpha=0.95)

    plt.tight_layout()
    return _fig_to_bytes(fig, fmt)


# ── Practice 5 ────────────────────────────────────────────────────────────────

def _curve_p5(recorded_vol: float, measured_value: float, fmt: str = 'svg') -> bytes:
    """
    Complexometric titration (EDTA, pH 10).
    pCa = –log[Ca²⁺]  vs.  V(EDTA) in mL.

    K′f(CaY²⁻) = Kf × αY4⁻ = 10^10.65 × 0.36 ≈ 1.61 × 10¹⁰

    Before eq.:  [Ca²⁺] ≈ (n_Ca – M_EDTA·V) / (V0 + V)   (K′f very large)
    At     eq.:  [Ca²⁺] = √([CaY] / K′f)
    After  eq.:  [Ca²⁺] = [CaY] / (K′f · [EDTA′])
    """
    M_EDTA   = 0.01
    Kf_prime = (10 ** 10.65) * 0.36        # ≈ 1.61e10

    V_sample = measured_value
    V0       = V_sample + 10.0             # sample + 10 mL pH-10 buffer
    V_eq     = 6.5 * measured_value / 100  # scales with sample volume
    n_Ca     = V_eq * M_EDTA              # mmol of total hardness

    V  = np.linspace(0.02, V_eq * 1.9, 3000)
    Vt = V0 + V

    before = V < V_eq - 0.005
    at_eq  = np.abs(V - V_eq) <= 0.005
    after  = V > V_eq + 0.005

    pCa = np.empty_like(V)

    # Before equivalence
    Ca_free  = np.maximum((n_Ca - M_EDTA * V[before]) / Vt[before], 1e-15)
    pCa[before] = -np.log10(Ca_free)

    # At equivalence
    CaY_eq   = n_Ca / Vt[at_eq]
    Ca_eq    = np.sqrt(np.maximum(CaY_eq / Kf_prime, 1e-30))
    pCa[at_eq] = -np.log10(np.maximum(Ca_eq, 1e-15))

    # After equivalence
    EDTA_exc = np.maximum((M_EDTA * V[after] - n_Ca) / Vt[after], 1e-15)
    CaY_post = n_Ca / Vt[after]
    Ca_post  = CaY_post / (Kf_prime * EDTA_exc)
    pCa[after] = -np.log10(np.maximum(Ca_post, 1e-15))

    pCa = np.clip(pCa, 0, 14)

    # ── Plot ──────────────────────────────────────────────────────────────────
    plt.rcParams.update(_STYLE)
    fig, ax = plt.subplots(figsize=(8.5, 5))

    ax.plot(V, pCa, color='#2563EB', lw=2.2, zorder=3,
            label='Curva teórica')

    tol = 0.3
    ax.axvspan(V_eq - tol, V_eq + tol,
               alpha=0.13, color='#16A34A', zorder=1,
               label=f'Tolerancia ±{tol} mL')
    ax.axvline(V_eq, color='#16A34A', lw=1.6, ls='-', zorder=4,
               label=f'Punto de equivalencia  {V_eq:.2f} mL')
    ax.axvline(recorded_vol, color='#DC2626', lw=1.6, ls='--', zorder=4,
               label=f'Lectura del estudiante  {recorded_vol:.2f} mL')

    # Equivalence point marker
    CaY_eq_scalar = n_Ca / (V0 + V_eq)
    Ca_eq_scalar  = np.sqrt(CaY_eq_scalar / Kf_prime)
    pCa_eq        = float(-np.log10(max(Ca_eq_scalar, 1e-15)))
    ax.plot(V_eq, pCa_eq, 'o', color='#16A34A',
            ms=8, zorder=5, markeredgecolor='white', markeredgewidth=1)

    y_max = float(pCa[V > V_eq * 0.1].max()) if any(V > V_eq * 0.1) else 12
    _annotate_error(ax, recorded_vol, V_eq,
                    y_pos=y_max * 0.92, y_tip=y_max * 0.72)

    ax.set_xlabel(r'$V_{\mathrm{EDTA}}\ /\ \mathrm{mL}$', labelpad=6)
    ax.set_ylabel(r'$\mathrm{p}[\mathrm{Ca}^{2+}]$', labelpad=6)
    ax.set_title(
        f'Curva de Titulación — Complejometría EDTA'
        f'  ($V_{{\\mathrm{{muestra}}}}$ = {measured_value:.0f} mL)\n'
        r'$\mathrm{Ca}^{2+}\ +\ \mathrm{HY}^{3-}\ \longrightarrow\ \mathrm{CaY}^{2-}\ +\ \mathrm{H}^{+}$',
        pad=10,
    )
    ax.set_xlim(0, V_eq * 1.9)
    ax.set_ylim(0, min(y_max * 1.08, 14))
    ax.xaxis.set_minor_locator(ticker.AutoMinorLocator(4))
    ax.yaxis.set_minor_locator(ticker.AutoMinorLocator(4))
    ax.tick_params(which='minor', length=2, color='#94A3B8')
    ax.legend(loc='upper left', framealpha=0.95)

    plt.tight_layout()
    return _fig_to_bytes(fig, fmt)


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_titration_curve(practice_id: int, session_data: dict, fmt: str = 'svg') -> bytes:
    """
    Return image bytes (SVG or PNG) for the theoretical titration curve.
    session_data must contain 'recorded_volume', 'expected_volume',
    and (for P5) 'measured_value'.
    fmt: 'svg' (default) or 'png'
    """
    recorded_vol   = session_data.get('recorded_volume') or 0.0
    expected_vol   = session_data.get('expected_volume') or 0.0
    measured_value = session_data.get('measured_value') or 100.0

    if practice_id == 4:
        return _curve_p4(recorded_vol, expected_vol, fmt)
    if practice_id == 5:
        return _curve_p5(recorded_vol, measured_value, fmt)

    raise ValueError(f"Curva de titulación no disponible para práctica {practice_id}")
