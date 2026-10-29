"""chartkit: the small helpers built in the dashboard-storytelling deck, lesson by lesson.

Generated from the deck sources so the lessons and this file never disagree.
"""
import matplotlib
matplotlib.use("Agg")                      # draw into files: no window, same pixels everywhere
import matplotlib.pyplot as plt
import duckdb
from pathlib import Path

INK, MUTED, GRAY, LIGHT = "#1f2a24", "#56605a", "#8b948f", "#e3e7e4"
ACCENT = "#c2410c"                          # the one colour that means "look here"

STYLE = {                                   # the quiet defaults every "after" chart starts from
    "figure.dpi": 100, "savefig.dpi": 100, "font.size": 10,
    "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": GRAY,
    "axes.titlelocation": "left", "axes.titlesize": 12, "axes.titleweight": "bold",
    "axes.titlecolor": INK, "axes.labelcolor": MUTED, "axes.grid": False,
    "xtick.color": MUTED, "ytick.color": MUTED, "legend.frameon": False, "text.color": INK,
}


def use_style():
    plt.rcParams.update(STYLE)


def q(sql):
    """Run DuckDB SQL (it can read CSV files directly) and return a list of tuples."""
    return duckdb.sql(sql).fetchall()


def save(fig, path, dpi=None):
    """Save a PNG without machine-specific metadata, close the figure, report the file."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, bbox_inches="tight", metadata={"Software": None},
                pil_kwargs={"optimize": True})
    plt.close(fig)
    print("saved", path.as_posix())


def declutter(ax, hide=()):
    """Remove what carries no data: box, tick marks, grid, legend frame.
    hide=("y",) also drops a value axis whose numbers are already written on the marks."""
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.tick_params(length=0)
    ax.grid(False)
    if "y" in hide:
        ax.spines["left"].set_visible(False)
        ax.set_yticks([])
    if "x" in hide:
        ax.spines["bottom"].set_visible(False)
        ax.set_xticks([])
    if ax.get_legend() is not None:
        ax.get_legend().remove()
    return ax


def label_end(ax, x, y, text, color, dy=0):
    """A direct label just right of the last point, in the line's colour: no legend lookup."""
    ax.annotate(text, (x, y), xytext=(6, dy), textcoords="offset points",
                va="center", color=color, fontsize=10, annotation_clip=False)


def fmt_money(x):
    """$17.4K, $1.2M, $640: scaled, three or four significant figures, sign in front."""
    sign, x = ("-" if x < 0 else ""), abs(x)
    for size, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if round(x / size, 1) >= 1:          # round first: 999,950 must become $1.0M, not $1000.0K
            return f"{sign}${x / size:.1f}{suffix}"
    return f"{sign}${x:,.0f}"


def fmt_pct(x, nd=1):
    return f"{100 * x:.{nd}f}%"


def fmt_change(this, last, kind="relative"):
    """'▼15%' for a relative change, '▼2.6 pts' for a change in a rate: arrow + number, never colour alone."""
    if kind == "points":
        d, text = 100 * (this - last), f"{abs(100 * (this - last)):.1f} pts"
    else:
        d, text = 100 * (this / last - 1), f"{abs(100 * (this / last - 1)):.0f}%"
    arrow = "▲" if d > 0.05 else "▼" if d < -0.05 else "■"
    return arrow + text


def headline(metric, this, last, fmt=fmt_money, period="week over week"):
    """A title that states the finding, computed from the same numbers as the chart."""
    change = this / last - 1
    if abs(change) < 0.005:
        return f"{metric} was flat {period} at {fmt(this)}"
    verb = "rose" if change > 0 else "fell"
    return f"{metric} {verb} {abs(change):.0%} {period} to {fmt(this)}"


def kpi_card(ax, label, value, change, note, bad=False):
    """Label, big number, change (arrow + words), and the comparison that gives it meaning."""
    ax.set_axis_off()
    put = lambda y, s, **kw: ax.text(0, y, s, transform=ax.transAxes, va="center", **kw)
    put(0.88, label.upper(), fontsize=9, color=MUTED)
    put(0.58, value, fontsize=22, fontweight="bold", color=INK)
    put(0.28, change, fontsize=11, color=ACCENT if bad else INK)
    put(0.06, note, fontsize=9, color=MUTED)


from matplotlib.colors import to_rgb


def relative_luminance(color):
    """WCAG 2.2 relative luminance of any matplotlib colour (name, hex, or RGB tuple)."""
    def channel(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in to_rgb(color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg, bg="white"):
    """1.0 (no contrast) to 21.0 (black on white). Text needs 4.5, large text and chart marks 3."""
    hi, lo = sorted((relative_luminance(fg), relative_luminance(bg)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)
