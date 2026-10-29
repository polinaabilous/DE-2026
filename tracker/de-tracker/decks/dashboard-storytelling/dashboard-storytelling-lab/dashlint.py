"""dashlint: the checkable half of the critique checklist, run against a matplotlib dashboard.

Usage (from this folder):
    python dashlint.py before_dashboard
    python dashlint.py solutions.redesign_solution
    python dashlint.py my_redesign            # your own module

The module must define build(data_dir="data") -> (fig, meta), where meta["alt_text"] is the
screen-reader description. Exit code 1 when any check fails.
A linter cannot judge whether the chart fits the message or the layout fits the audience:
those checklist items stay manual (see critique_checklist.md).
"""
import colorsys
import importlib
import sys

import matplotlib.dates as mdates
from matplotlib.colors import to_rgba
from matplotlib.container import BarContainer
from matplotlib.patches import Wedge
from matplotlib.text import Text

from chartkit import contrast_ratio, q

VERBS = ("rose", "fell", "grew", "dropped", "increased", "decreased", "was flat", "up ", "down ",
         "beat", "missed", "doubled", "halved")


def partial_week(data_dir="data"):
    rows = q(f"SELECT DISTINCT week_start FROM '{data_dir}/weekly_platform.csv' WHERE days_in_data < 7")
    return rows[0][0] if rows else None


def texts(fig):
    return [t for t in fig.findobj(Text) if t.get_visible() and t.get_text().strip()]


def background(t):
    box = t.get_bbox_patch()
    if box is not None and box.get_visible():
        return box.get_facecolor()
    if t.axes is not None and t.axes.axison and t.axes.patch.get_visible():
        return t.axes.patch.get_facecolor()
    return t.figure.get_facecolor()


def blended(fg, bg):
    """Text colour as actually seen: alpha blended over the background."""
    r, g, b, a = to_rgba(fg)
    br, bgc, bb, _ = to_rgba(bg)
    return (a * r + (1 - a) * br, a * g + (1 - a) * bgc, a * b + (1 - a) * bb)


def check_headline(fig, meta):
    ts = sorted(texts(fig), key=lambda t: -t.get_window_extent().y1)
    top = ts[0].get_text() if ts else ""
    ok = any(ch.isdigit() for ch in top) and any(v in top.lower() + " " for v in VERBS)
    return ok, repr(top[:70])


def check_no_pie(fig, meta):
    n = sum(isinstance(p, Wedge) for ax in fig.axes for p in ax.patches)
    return n == 0, "%d pie/donut wedges" % n


def check_bars_from_zero(fig, meta):
    bad = []
    for ax in fig.axes:
        for c in ax.containers:
            if isinstance(c, BarContainer):
                lo, hi = ax.get_ylim() if c.orientation == "vertical" else ax.get_xlim()
                if min(lo, hi) > 0:
                    bad.append("%s starts at %g" % (ax.get_title() or "untitled", min(lo, hi)))
    return not bad, "; ".join(sorted(set(bad))) or "all bar axes include zero"


def check_no_dual_axis(fig, meta):
    seen = {}
    for ax in fig.axes:
        if not ax.axison:
            continue
        key = tuple(round(v, 4) for v in ax.get_position().bounds)
        if key in seen:
            return False, "%r has a twin axis" % seen[key]
        seen[key] = ax.get_title() or "untitled"
    return True, "one value axis per plot"


def check_partial_period(fig, meta):
    pw = partial_week()
    if pw is None:
        return True, "no partial period in the data"
    target = mdates.date2num(pw)
    hit = None
    for ax in fig.axes:
        for line in ax.get_lines():
            try:
                xs = mdates.date2num(list(line.get_xdata()))
            except (TypeError, ValueError):
                continue
            if any(abs(x - target) < 0.5 for x in xs):
                hit = ax.get_title() or "a line"
        for c in ax.containers:
            if isinstance(c, BarContainer):
                if any(abs(p.get_x() + p.get_width() / 2 - target) < 0.5 for p in c.patches):
                    hit = ax.get_title() or "a bar chart"
    if hit is None:
        return True, "partial week of %s not plotted" % pw
    if any("partial" in t.get_text().lower() for t in texts(fig)):
        return True, "%s shows the partial week, and the page labels it" % hit
    return False, "%s plots the partial week of %s as if complete" % (hit, pw)


def check_colour_budget(fig, meta, limit=3):
    hues = set()
    for ax in fig.axes:
        colours = [p.get_facecolor() for p in ax.patches if p.get_visible()]
        colours += [line.get_color() for line in ax.get_lines()]
        for coll in ax.collections:
            colours += list(coll.get_facecolors()) + list(coll.get_edgecolors())
        for col in colours:
            r, g, b, a = to_rgba(col)
            h, light, s = colorsys.rgb_to_hls(r, g, b)
            if a == 0 or s < 0.2 or light > 0.92 or light < 0.08:
                continue                                  # grays, white, black: no hue
            hues.add(round(h * 12) % 12)
    return len(hues) <= limit, "%d distinct hues (limit %d)" % (len(hues), limit)


def check_text_contrast(fig, meta):
    bad = []
    for t in texts(fig):
        size, bold = t.get_fontsize(), str(t.get_fontweight()) in ("bold", "heavy", "700", "800", "900")
        need = 3.0 if size >= 18 or (size >= 14 and bold) else 4.5
        bg = background(t)
        ratio = contrast_ratio(blended(t.get_color(), bg), bg)
        if ratio < need:
            bad.append("%r %.1f:1" % (t.get_text()[:18], ratio))
    return not bad, ("%d low-contrast texts, e.g. " % len(bad) + ", ".join(bad[:2])) if bad else "all text at least 4.5:1 (3:1 large)"


def check_min_font(fig, meta, minimum=8):
    small = sorted({round(t.get_fontsize(), 1) for t in texts(fig) if t.get_fontsize() < minimum})
    return not small, ("sizes below %dpt: %s" % (minimum, small)) if small else "all text %dpt or larger" % minimum


def check_alt_text(fig, meta):
    alt = (meta or {}).get("alt_text", "")
    return 0 < len(alt) <= 250, "%d characters (1-250)" % len(alt)


CHECKS = [check_headline, check_no_pie, check_bars_from_zero, check_no_dual_axis, check_partial_period,
          check_colour_budget, check_text_contrast, check_min_font, check_alt_text]


def lint(fig, meta):
    fig.canvas.draw()                                     # tick labels exist only after a draw
    return [(f.__name__[6:], *f(fig, meta)) for f in CHECKS]


def main(argv):
    if len(argv) != 2:
        sys.exit(__doc__)
    fig, meta = importlib.import_module(argv[1]).build()
    results = lint(fig, meta)
    for name, ok, detail in results:
        print("%-4s %-16s %s" % ("PASS" if ok else "FAIL", name, detail))
    failed = sum(not ok for _, ok, _ in results)
    print("%d of %d checks passed" % (len(results) - failed, len(results)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
