"""The 'before' dashboard: Leafy's weekly page as the team shipped it.

Every problem in it is deliberate; lab step 1 asks you to find them with the critique checklist.
Run:  python before_dashboard.py      -> out/before.png
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from chartkit import q, save


def build(data_dir="data"):
    plt.style.use("default")
    w = f"'{data_dir}/weekly_platform.csv'"
    weeks = q(f"""SELECT week_start, SUM(net_sales), SUM(orders) / SUM(sessions)
                  FROM {w} GROUP BY 1 ORDER BY 1""")
    current = q(f"""SELECT SUM(net_sales), SUM(orders), SUM(orders) / SUM(sessions), SUM(net_sales) / SUM(orders)
                    FROM {w} WHERE week_start = (SELECT MAX(week_start) FROM {w})""")[0]
    plat = q(f"""SELECT platform, week_start, orders FROM {w}
                 WHERE week_start IN (SELECT DISTINCT week_start FROM {w} ORDER BY 1 DESC LIMIT 3 OFFSET 1)
                 ORDER BY platform, week_start""")
    mix = q(f"SELECT channel, orders FROM '{data_dir}/channel_orders.csv' WHERE week_start = '2026-03-16'")
    carriers = q(f"SELECT carrier, AVG(delivery_days) FROM '{data_dir}/deliveries.csv' GROUP BY 1 ORDER BY 1")
    area = q(f"SELECT week_start, platform, sessions FROM {w} ORDER BY platform, week_start")

    fig, axs = plt.subplots(2, 3, figsize=(12, 7))
    fig.suptitle("Leafy Weekly Dashboard v3 (FINAL)", fontsize=13, color="#b0b0b0")

    ax = axs[0, 0]                                       # KPI tile: current (partial) week, no comparison
    ax.set_axis_off()
    ax.text(0.05, 0.5, "Net Sales: %s\nOrders: %s\nConv: %s\nAOV: %s" % current,
            fontsize=12, color="#b0b0b0", va="center")
    ax.set_title("KPIs", fontsize=7, color="#b0b0b0")

    ax = axs[0, 1]                                       # pie with seven similar slices
    ax.pie([n for _, n in mix], labels=None, colors=plt.cm.rainbow([i / 6 for i in range(7)]))
    ax.legend([c for c, _ in mix], fontsize=7, loc="center left", bbox_to_anchor=(1, 0.5))
    ax.set_title("Channel Mix", fontsize=9)

    ax = axs[0, 2]                                       # grouped bars on a truncated axis
    names = sorted({p for p, _, _ in plat})
    for k, wk in enumerate(sorted({d for _, d, _ in plat})):
        vals = [o for p, d, o in plat if d == wk]
        ax.bar([i + 0.27 * k for i in range(len(names))], vals, width=0.27, label=str(wk))
    ax.set_xticks(range(len(names)), names)
    ax.set_ylim(20, 170)
    ax.grid(True)
    ax.legend(fontsize=7)
    ax.set_title("Orders by Platform", fontsize=9)

    ax = axs[1, 0]                                       # rainbow bars incl. the partial week + twin axis
    ax.bar([d for d, _, _ in weeks], [s for _, s, _ in weeks], width=5,
           color=plt.cm.tab20([i / len(weeks) for i in range(len(weeks))]))
    ax2 = ax.twinx()
    ax2.plot([d for d, _, _ in weeks], [c for _, _, c in weeks], color="red", marker="o")
    ax.tick_params(axis="x", labelrotation=60, labelsize=7)
    ax.grid(True)
    ax.set_title("Net Sales & Conversion", fontsize=9)

    ax = axs[1, 1]                                       # averages on a truncated axis
    ax.bar([c for c, _ in carriers], [a for _, a in carriers], color=["green", "red"])
    ax.set_ylim(2.9, 3.1)
    ax.set_title("Avg Delivery Days", fontsize=9)

    ax = axs[1, 2]                                       # stacked area: only the bottom layer is readable
    xs = sorted({d for d, _, _ in area})
    ax.stackplot(xs, *[[s for d, p, s in area if p == name] for name in names], labels=names)
    ax.legend(fontsize=7, loc="upper left")
    ax.tick_params(axis="x", labelrotation=60, labelsize=7)
    ax.set_title("Sessions", fontsize=9)
    fig.tight_layout()
    return fig, {}


if __name__ == "__main__":
    fig, meta = build()
    save(fig, "out/before.png", dpi=90)
