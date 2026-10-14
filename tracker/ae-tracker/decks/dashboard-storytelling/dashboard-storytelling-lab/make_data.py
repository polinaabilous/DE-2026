"""Build the Leafy dashboard extract and a small Fuel Smart fixture (synthetic, deterministic).

Run:  python make_data.py
Writes data/*.csv. Same seed, same rows, on every machine. Standard library only.
"""
import csv
import random
from datetime import date, timedelta
from pathlib import Path

DATA = Path(__file__).with_name("data")
FIRST_WEEK = date(2026, 1, 5)          # a Monday
N_WEEKS = 12                           # the last week is partial: loaded Wed 25 Mar 2026, 10:00 Chicago time
PARTIAL_DAYS = 2                       # Mon 23 and Tue 24 March are complete
APP_53 = date(2026, 3, 16)             # Android app 5.3 ships and breaks checkout
CHANNELS = [("Organic search", 0.26), ("Email", 0.18), ("Paid search", 0.17), ("Direct", 0.15),
            ("Social", 0.10), ("Referral", 0.08), ("Affiliate", 0.06)]


def split(total, shares, rng):
    """Largest-remainder split of an integer total, with a little noise in the shares."""
    raw = [total * s * rng.uniform(0.92, 1.08) for _, s in shares]
    scale = total / sum(raw)
    raw = [r * scale for r in raw]
    out = [int(r) for r in raw]
    for i in sorted(range(len(raw)), key=lambda i: raw[i] - out[i], reverse=True)[: total - sum(out)]:
        out[i] += 1
    return out


def weekly(rng):
    base = {"web": 1010, "ios": 640, "android": 560}
    conv = {"web": 0.152, "ios": 0.150, "android": 0.149}
    rows = []
    for k in range(N_WEEKS):
        week = FIRST_WEEK + timedelta(weeks=k)
        days = 7 if k < N_WEEKS - 1 else PARTIAL_DAYS
        for platform in ("web", "ios", "android"):
            sessions = round(base[platform] * (1.006 ** k) * rng.uniform(0.96, 1.04) * days / 7)
            c = conv[platform] + rng.uniform(-0.008, 0.008)
            if platform == "android" and week >= APP_53:
                c = 0.040 + rng.uniform(-0.004, 0.004)
            orders = round(sessions * c)
            aov = 59.5 + rng.uniform(-1.5, 1.5)
            rows.append(dict(week_start=week.isoformat(), platform=platform, days_in_data=days,
                             sessions=sessions, orders=orders, net_sales=round(orders * aov, 2)))
    return rows


def channels(rng, weekly_rows):
    out = []
    for week in (APP_53 - timedelta(weeks=1), APP_53):
        total = sum(r["orders"] for r in weekly_rows if r["week_start"] == week.isoformat())
        for (name, _), n in zip(CHANNELS, split(total, CHANNELS, rng)):
            out.append(dict(week_start=week.isoformat(), channel=name, orders=n))
    return out


def deliveries(rng):
    """Same average, different shapes: SwiftPost is usually fast but sometimes takes a week."""
    days = {"ParcelCo": ([2, 3, 4], [0.2, 0.6, 0.2]),
            "SwiftPost": ([1, 2, 7, 8, 9], [0.2, 0.6, 0.06, 0.08, 0.06])}
    out = []
    for i in range(400):
        carrier = "ParcelCo" if i % 2 == 0 else "SwiftPost"
        values, weights = days[carrier]
        out.append(dict(shipment_id="S%04d" % (i + 1), carrier=carrier,
                        delivery_days=rng.choices(values, weights)[0]))
    return out


def campaigns(rng):
    out = []
    for i in range(20):
        discount = (0, 5, 10, 15, 20, 25, 30)[i % 7]
        conversion = 0.060 + 0.004 * min(discount, 15) + rng.uniform(-0.008, 0.008)
        sessions = rng.randrange(300, 2000, 10)
        out.append(dict(campaign_id="C%02d" % (i + 1), discount_pct=discount, sessions=sessions,
                        orders=round(sessions * conversion)))
    return out


def recipes(rng):
    """50 synthetic recipe servings with the shape of the Fuel Smart mart (not real data)."""
    out = []
    for i in range(50):
        simple = i % 3 != 0
        protein = round(max(0.5, rng.gauss(4.8 if simple else 4.2, 1.6)), 2)
        n_reviews = rng.choice([0, 1, 2, 3, 5, 8, 12, 20, 35, 60])
        rating = round(min(5.0, max(2.5, rng.gauss(4.3, 0.35))), 2) if n_reviews else ""
        out.append(dict(recipe_id="R%03d" % (i + 1), is_simple=int(simple),
                        protein_g_per_100kcal=protein,
                        fibre_g_per_100kcal=round(max(0.1, rng.gauss(1.6, 0.6)), 2),
                        veg_legume_share=round(min(0.95, max(0.0, rng.gauss(0.35, 0.18))), 2),
                        n_reviews=n_reviews, rating_mean=rating))
    return out


def write(name, rows):
    with open(DATA / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print("%-26s %4d rows" % (name, len(rows)))


def main():
    DATA.mkdir(exist_ok=True)
    rng = random.Random(2026)
    w = weekly(rng)
    write("weekly_platform.csv", w)
    write("channel_orders.csv", channels(rng, w))
    write("deliveries.csv", deliveries(rng))
    write("campaigns.csv", campaigns(rng))
    write("fuel_smart_recipes.csv", recipes(rng))


if __name__ == "__main__":
    main()
