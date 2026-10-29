"""Model redesign of Leafy's weekly dashboard (lab step 3). Open it only after your own attempt.

Run:  python -m solutions.redesign_solution      -> out/after.png
Check: python dashlint.py solutions.redesign_solution
"""
import statistics
import textwrap

from chartkit import (ACCENT, GRAY, INK, MUTED, declutter, fmt_change, fmt_money, fmt_pct,
                      headline, kpi_card, label_end, plt, q, save, use_style)


def load(data_dir="data"):
    w = f"'{data_dir}/weekly_platform.csv'"
    weeks = q(f"""SELECT week_start, SUM(sessions), SUM(orders), SUM(net_sales) FROM {w}
                  WHERE days_in_data = 7 GROUP BY 1 ORDER BY 1""")           # complete weeks only
    conv = q(f"""SELECT platform, week_start, orders / sessions FROM {w}
                 WHERE days_in_data = 7 ORDER BY platform, week_start""")
    (last, s1, o1, n1), (prev, s0, o0, n0) = weeks[-1], weeks[-2]
    chan = q(f"""SELECT channel,
                        SUM(orders) FILTER (WHERE week_start = '{last}') AS this_week,
                        SUM(orders) FILTER (WHERE week_start = '{prev}') AS last_week
                 FROM '{data_dir}/channel_orders.csv' GROUP BY 1 ORDER BY this_week, channel DESC""")
    partial = q(f"SELECT MIN(week_start), MIN(days_in_data) FROM {w} WHERE days_in_data < 7")[0]
    return dict(weeks=weeks, conv=conv, chan=chan, last=last, prev=prev, partial=partial,
                ns=(n0, n1), orders=(o0, o1), rate=(o0 / s0, o1 / s1), aov=(n0 / o0, n1 / o1),
                median_ns=statistics.median(r[3] for r in weeks[-9:-1]))


def build(data_dir="data"):
    use_style()
    d = load(data_dir)
    dm = lambda x: f"{x.day} {x:%b}"                # "9 Mar": day without a leading zero, on any OS
    android = {wk: r for p, wk, r in d["conv"] if p == "android"}
    a0, a1 = android[d["prev"]], android[d["last"]]
    title = headline("Net sales", d["ns"][1], d["ns"][0])
    why = (f"Android conversion fell from {fmt_pct(a0, 0)} to {fmt_pct(a1, 0)} after app 5.3 shipped on "
           f"Mon {dm(d['last'])}; web and iOS converted as usual.")

    fig = plt.figure(figsize=(12, 7.6))
    axd = fig.subplot_mosaic([["k1", "k2", "k3", "k4"], ["trend", "trend", "conv", "conv"],
                              ["chan", "chan", "notes", "notes"]],
                             height_ratios=[1, 2.3, 1.7], gridspec_kw=dict(hspace=0.55, wspace=0.35, left=0.055,
                                                                           right=0.95, top=0.80, bottom=0.04))
    fig.text(0.01, 0.975, title, fontsize=17, fontweight="bold", color=INK, va="top")
    fig.text(0.01, 0.925, why, fontsize=12, color=INK, va="top")
    fig.text(0.01, 0.885, f"Week of {dm(d['last'])} {d['last'].year} vs week of {dm(d['prev'])} · complete weeks, "
             f"America/Chicago · the partial week of {dm(d['partial'][0])} ({d['partial'][1]} of 7 days) is not shown",
             fontsize=9.5, color=MUTED, va="top")

    n0, n1 = d["ns"]
    kpi_card(axd["k1"], "Net sales", fmt_money(n1), fmt_change(n1, n0) + " vs last week",
             f"8-week median {fmt_money(d['median_ns'])}", bad=n1 < n0)
    o0, o1 = d["orders"]
    kpi_card(axd["k2"], "Orders", f"{o1:,}", fmt_change(o1, o0) + " vs last week", f"last week {o0:,}", bad=o1 < o0)
    r0, r1 = d["rate"]
    kpi_card(axd["k3"], "Session conversion", fmt_pct(r1), fmt_change(r1, r0, "points") + " vs last week",
             f"last week {fmt_pct(r0)}", bad=r1 < r0)
    v0, v1 = d["aov"]
    kpi_card(axd["k4"], "Average order value", f"${v1:,.2f}", fmt_change(v1, v0) + " vs last week",
             f"last week ${v0:,.2f}")

    ax = axd["trend"]
    xs, ys = [r[0] for r in d["weeks"]], [r[3] for r in d["weeks"]]
    ax.plot(xs, ys, color=GRAY, lw=2)
    ax.plot(xs[-1:], ys[-1:], "o", color=ACCENT, ms=7)
    ax.set_ylim(0, max(ys) * 1.2)
    ax.set_yticks([0, 10000, 20000], ["$0", "$10K", "$20K"])
    ax.set_xticks(xs[::2], [dm(x) for x in xs[::2]])
    ax.annotate("App 5.3 ships", (xs[-1], ys[-1]), xytext=(-110, -38), textcoords="offset points",
                color=ACCENT, fontsize=10, arrowprops=dict(arrowstyle="-", color=ACCENT))
    ax.set_title("Net sales per week")
    declutter(ax)

    ax = axd["conv"]
    for p in ("web", "ios", "android"):
        pts = [(wk, r) for pp, wk, r in d["conv"] if pp == p]
        ax.plot([a for a, _ in pts], [b for _, b in pts], color=ACCENT if p == "android" else GRAY,
                lw=2.4 if p == "android" else 1.6)
    label_end(ax, xs[-1], a1, "Android", ACCENT)
    web_ios = [r for pp, wk, r in d["conv"] if wk == d["last"] and pp != "android"]
    label_end(ax, xs[-1], sum(web_ios) / 2, "Web, iOS", MUTED)
    ax.set_ylim(0, 0.2)
    ax.set_yticks([0, 0.1, 0.2], ["0%", "10%", "20%"])
    ax.set_xticks(xs[::3], [dm(x) for x in xs[::3]])
    ax.set_title("Session conversion by platform")
    declutter(ax)

    ax = axd["chan"]
    names = [c for c, _, _ in d["chan"]]
    bars = ax.barh(names, [t for _, t, _ in d["chan"]], color=GRAY, height=0.6)
    ax.bar_label(bars, [f"{t}  ({t - l:+d})" for _, t, l in d["chan"]], padding=4, color=INK, fontsize=9)
    ax.set_title("Orders by channel this week (change vs last week)")
    declutter(ax, hide=("x",))
    ax.tick_params(axis="y", labelsize=9)

    ax = axd["notes"]
    ax.set_axis_off()
    ax.text(0, 1, "How to read this page", fontsize=10, fontweight="bold", color=INK, va="top")
    ax.text(0, 0.80, "• Net sales: order value after discounts, before refunds.\n"
                     "• Session conversion: orders ÷ sessions (bots and staff excluded).\n"
                     "• Every channel fell: the drop is not one channel's problem.\n"
                     "• Delivery metrics moved to the Operations page.\n"
                     "• Definitions: Leafy metric spec cards (Metric design deck).",
            fontsize=9.5, color=MUTED, va="top", linespacing=1.6)

    alt = (f"Leafy weekly dashboard. {title}. Android conversion fell from {fmt_pct(a0, 0)} to "
           f"{fmt_pct(a1, 0)} after app 5.3; web and iOS steady near 15%. Net sales were near "
           f"{fmt_money(d['median_ns'])} for the eight weeks before.")
    return fig, {"alt_text": alt, "headline": title}


if __name__ == "__main__":
    fig, meta = build()
    save(fig, "out/after.png", dpi=90)
    print(f"alt text ({len(meta['alt_text'])} characters):")
    print(textwrap.fill(meta["alt_text"], 88))
