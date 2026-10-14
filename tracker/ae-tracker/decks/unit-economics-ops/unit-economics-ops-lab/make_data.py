"""Leafy Box: a deterministic, offline dataset for unit economics and operations metrics.

Leafy (the plant shop of this course) launched Leafy Box in January 2025: a monthly plant-care box,
'small' ($25) or 'large' ($40), first box at 50 % off. This script writes small CSV fixtures to data/
and loads them into leafy_box.duckdb. Same seed, same rows, on every machine.

Tables
  customers       one row per subscriber (acquisition channel, signup date, plan, test flag)
  billing         one row per payment attempt (failed attempts are rows too)
  marketing_spend one row per channel per month of acquisition spend
  assets          one row per fulfilment asset or service
  incidents       one row per incident ticket (duplicates are merged_into another ticket)
  sla_targets     resolution target per severity
  box_jobs        one row per box released to the warehouse in March 2026
  shifts          labour hours per warehouse day in March 2026

Run:  python make_data.py            (needs: pip install duckdb)
"""
import csv
import datetime as dt
import math
import os
import random

import duckdb

SEED = 20260331
AS_OF = dt.datetime(2026, 4, 1, 0, 0)            # data is complete up to the end of 31 March 2026 (UTC)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')

PLANS = {'small': dict(price=25.00, product=9.00, ship=6.50), 'large': dict(price=40.00, product=15.00, ship=8.00)}
CHANNELS = {   # share of signups, base monthly churn, share on the large plan, target paid CAC
    'paid_search': dict(share=0.28, churn=0.07, large=0.35, cac=62.0),
    'paid_social': dict(share=0.24, churn=0.13, large=0.25, cac=41.0),
    'influencer':  dict(share=0.10, churn=0.10, large=0.30, cac=78.0),
    'referral':    dict(share=0.14, churn=0.04, large=0.40, cac=None),   # a $15 credit per referred subscriber
    'organic':     dict(share=0.24, churn=0.05, large=0.35, cac=None),   # no attributable spend
}


def month_add(d, k):
    y, m = divmod(d.month - 1 + k, 12)
    return dt.date(d.year + y, m + 1, 1)


def money(x):
    return round(x + 1e-9, 2)


def write(name, header, rows):
    with open(os.path.join(DATA, name + '.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    return len(rows)


def build_commerce(rng):
    customers, billing, spend = [], [], []
    months = [month_add(dt.date(2025, 1, 1), k) for k in range(15)]          # Jan 2025 .. Mar 2026
    cid = 1000
    for mi, m in enumerate(months):
        n_month = 70 + 3 * mi + rng.randint(-6, 6)
        counts = {ch: 0 for ch in CHANNELS}
        for _ in range(n_month):
            ch = rng.choices(list(CHANNELS), weights=[c['share'] for c in CHANNELS.values()])[0]
            if ch == 'influencer' and (m < dt.date(2025, 4, 1) or m == dt.date(2025, 8, 1)):
                ch = 'organic'                     # influencer starts in April; August campaign brought nobody
            counts[ch] += 1
            cid += 1
            days = (month_add(m, 1) - m).days
            signup = m + dt.timedelta(days=rng.randrange(days))
            plan = 'large' if rng.random() < CHANNELS[ch]['large'] else 'small'
            customers.append([cid, signup.isoformat(), ch, plan, False])
            # monthly billing while subscribed
            k = 0
            while True:
                bm = month_add(m, k)
                if bm > dt.date(2026, 3, 1):
                    break
                p = PLANS[plan]
                price = p['price']
                discount = price * 0.5 if k == 0 else 0.0
                revenue = price - discount
                refund = revenue if rng.random() < 0.02 else 0.0          # damaged plants: full refund
                fee = money(revenue * 0.029 + 0.30)
                bill_day = min(signup.day, 28)
                paid_at = dt.date(bm.year, bm.month, bill_day).isoformat()
                if rng.random() < 0.03:                                   # a failed attempt before success
                    billing.append([cid, bm.isoformat(), paid_at, 'failed', plan, price, money(discount),
                                    money(revenue), 0.0, 0.0, 0.0, 0.0])
                if k > 0 and rng.random() < 0.01:                         # card never recovered: involuntary churn
                    billing.append([cid, bm.isoformat(), paid_at, 'failed', plan, price, 0.0, money(revenue), 0.0, 0.0, 0.0, 0.0])
                    break
                billing.append([cid, bm.isoformat(), paid_at, 'paid', plan, price, money(discount), money(revenue),
                                money(refund), p['product'], p['ship'], fee])
                base = CHANNELS[ch]['churn']
                hazard = base * (1.6 if k == 0 else 1.2 if k <= 2 else 0.8)
                if rng.random() < hazard:
                    break
                if plan == 'small' and rng.random() < 0.03:
                    plan = 'large'                                        # upgrade from next month
                k += 1
        for ch, c in CHANNELS.items():
            if ch == 'organic':
                continue
            if ch == 'referral':
                if counts[ch]:
                    spend.append([m.isoformat(), ch, money(15.0 * counts[ch])])
                continue
            if ch == 'influencer' and m < dt.date(2025, 4, 1):
                continue
            if ch == 'influencer' and m == dt.date(2025, 8, 1):
                spend.append([m.isoformat(), ch, 1500.00])                # paid, but no signups that month
                continue
            spend.append([m.isoformat(), ch, money(counts[ch] * c['cac'] * rng.uniform(0.85, 1.15))])
        spend.append([m.isoformat(), 'brand_podcast', 900.00])            # brand spend: no channel to attribute
    for i in range(6):                                                    # QA test subscribers
        cid += 1
        customers.append([cid, '2025-06-%02d' % (3 + i), 'organic', 'small', True])
        for k in range(10):
            bm = month_add(dt.date(2025, 6, 1), k)
            billing.append([cid, bm.isoformat(), dt.date(bm.year, bm.month, 3 + i).isoformat(), 'paid', 'small',
                            25.0, 12.5 if k == 0 else 0.0, 12.5 if k == 0 else 25.0, 0.0, 9.0, 6.5,
                            money((12.5 if k == 0 else 25.0) * 0.029 + 0.30)])
    return customers, billing, spend


ASSETS = [  # asset_id, name, asset_type, mean hours between failures
    (1, 'packing_line_1', 'packing_line', 150), (2, 'packing_line_2', 'packing_line', 190),
    (3, 'label_printer_1', 'label_printer', 260), (4, 'label_printer_2', 'label_printer', None),
    (5, 'conveyor_1', 'conveyor', 420), (6, 'web_checkout', 'service', 300)]


def ts(x):
    return x.strftime('%Y-%m-%d %H:%M:%S')


def build_ops(rng):
    start, end = dt.datetime(2026, 1, 1), AS_OF
    incidents = []
    iid = 500
    for aid, name, typ, mtbf in ASSETS:
        if mtbf is None:
            continue
        t = start + dt.timedelta(hours=rng.expovariate(1 / mtbf))
        while t < end - dt.timedelta(hours=30):
            sev = rng.choices(['sev1', 'sev2', 'sev3'], weights=[0.15, 0.45, 0.40])[0]
            detect = dt.timedelta(minutes=round(rng.expovariate(1 / 9)) + 1)
            ack = dt.timedelta(minutes=round(rng.expovariate(1 / 6)) + 1)
            mitigate = dt.timedelta(minutes=round(math.exp(rng.gauss(math.log({'sev1': 50, 'sev2': 90, 'sev3': 240}[sev]), 0.6))))
            resolve_extra = dt.timedelta(minutes=round(rng.expovariate(1 / {'sev1': 60, 'sev2': 300, 'sev3': 900}[sev])))
            iid += 1
            started = t.replace(second=0, microsecond=0)
            detected = started + detect
            acked = detected + ack
            mitigated = acked + mitigate
            resolved = mitigated + resolve_extra
            incidents.append([iid, aid, sev, ts(started), ts(detected), ts(acked), ts(mitigated), ts(resolved), None])
            t = resolved + dt.timedelta(hours=rng.expovariate(1 / mtbf))
    # hand-placed edge cases
    edge = [
        # web_checkout outage across the January/February boundary
        [6, 'sev1', '2026-01-31 23:20:00', '2026-01-31 23:26:00', '2026-01-31 23:31:00', '2026-02-01 01:10:00', '2026-02-01 02:00:00'],
        # conveyor waits 30 hours for a spare part: the MTTR outlier
        [5, 'sev2', '2026-02-17 08:00:00', '2026-02-17 08:04:00', '2026-02-17 08:09:00', '2026-02-18 14:00:00', '2026-02-18 14:30:00'],
        # workaround in place (mitigated), root-cause fix still open and already past its 72 h target
        [3, 'sev3', '2026-03-27 10:00:00', '2026-03-27 10:15:00', '2026-03-27 10:40:00', '2026-03-27 13:30:00', None],
        # still open, but its 4 h target has not passed yet
        [1, 'sev1', '2026-03-31 22:10:00', '2026-03-31 22:12:00', '2026-03-31 22:15:00', None, None],
    ]
    for aid, sev, s, d, a, mi, r in edge:
        iid += 1
        incidents.append([iid, aid, sev, s, d, a, mi, r, None])
    # a duplicate ticket for the January/February outage, merged into the original
    parent = [r for r in incidents if r[1] == 6 and r[3] == '2026-01-31 23:20:00'][0]
    iid += 1
    incidents.append([iid, 6, 'sev2', parent[3], '2026-01-31 23:29:00', '2026-01-31 23:33:00', parent[6], parent[7], parent[0]])
    incidents.sort(key=lambda r: (r[3], r[0]))
    return incidents


def build_fulfilment(rng, billing):
    """One box job per paid March 2026 box. Warehouse works Monday-Saturday; Sundays are closed."""
    march = sorted({r[0] for r in billing if r[1] == '2026-03-01' and r[3] == 'paid'})
    work_days = [dt.date(2026, 3, d) for d in range(1, 32) if dt.date(2026, 3, d).weekday() != 6]
    jobs, shipped_per_day = [], {}
    jid = 90000
    for cid in march:
        jid += 1
        day = rng.choice(work_days[:-1])
        released = dt.datetime.combine(day, dt.time(7)) + dt.timedelta(minutes=rng.randrange(0, 600))
        hours = rng.choice([6, 8, 20, 24, 26, 30, 48, 50]) + rng.random() * 4
        if day == dt.date(2026, 3, 18):
            hours += 24                                                   # packing line 1 down most of the day
        shipped = released + dt.timedelta(hours=hours)
        if shipped.date().weekday() == 6:
            shipped += dt.timedelta(days=1)                               # nothing ships on Sunday
        if shipped.hour >= 19:
            shipped = dt.datetime.combine(shipped.date() + dt.timedelta(days=1 if shipped.date().weekday() != 5 else 2), dt.time(8, 30))
        shipped_s = ts(shipped) if shipped < AS_OF else None
        jobs.append([jid, cid, ts(released), shipped_s])
    shifts = []
    for d in work_days:
        shifts.append([d.isoformat(), 16.0 if d.weekday() == 5 else 32.0])
    return jobs, shifts


def main():
    rng = random.Random(SEED)
    os.makedirs(DATA, exist_ok=True)
    customers, billing, spend = build_commerce(rng)
    incidents = build_ops(rng)
    jobs, shifts = build_fulfilment(rng, billing)
    n = {}
    n['customers'] = write('customers', ['customer_id', 'signup_date', 'channel', 'plan', 'is_test'], customers)
    n['billing'] = write('billing', ['customer_id', 'bill_month', 'billed_on', 'status', 'plan', 'list_price', 'discount',
                                     'revenue', 'refund', 'product_cost', 'shipping_cost', 'payment_fee'], billing)
    n['marketing_spend'] = write('marketing_spend', ['spend_month', 'channel', 'spend'], spend)
    n['assets'] = write('assets', ['asset_id', 'asset_name', 'asset_type'], [[a, b, c] for a, b, c, _ in ASSETS])
    n['incidents'] = write('incidents', ['incident_id', 'asset_id', 'severity', 'started_at', 'detected_at',
                                         'acknowledged_at', 'mitigated_at', 'resolved_at', 'merged_into'], incidents)
    n['sla_targets'] = write('sla_targets', ['severity', 'target_hours'], [['sev1', 4], ['sev2', 24], ['sev3', 72]])
    n['box_jobs'] = write('box_jobs', ['job_id', 'customer_id', 'released_at', 'shipped_at'], jobs)
    n['shifts'] = write('shifts', ['work_day', 'labour_hours'], shifts)

    db = os.path.join(HERE, 'leafy_box.duckdb')
    if os.path.exists(db):
        os.remove(db)
    con = duckdb.connect(db)
    con.execute("""
        CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, signup_date DATE, channel VARCHAR,
                                plan VARCHAR, is_test BOOLEAN);
        CREATE TABLE billing (customer_id INTEGER, bill_month DATE, billed_on DATE, status VARCHAR, plan VARCHAR,
                              list_price DECIMAL(8,2), discount DECIMAL(8,2), revenue DECIMAL(8,2), refund DECIMAL(8,2),
                              product_cost DECIMAL(8,2), shipping_cost DECIMAL(8,2), payment_fee DECIMAL(8,2));
        CREATE TABLE marketing_spend (spend_month DATE, channel VARCHAR, spend DECIMAL(10,2));
        CREATE TABLE assets (asset_id INTEGER PRIMARY KEY, asset_name VARCHAR, asset_type VARCHAR);
        CREATE TABLE incidents (incident_id INTEGER PRIMARY KEY, asset_id INTEGER, severity VARCHAR,
                                started_at TIMESTAMP, detected_at TIMESTAMP, acknowledged_at TIMESTAMP,
                                mitigated_at TIMESTAMP, resolved_at TIMESTAMP, merged_into INTEGER);
        CREATE TABLE sla_targets (severity VARCHAR PRIMARY KEY, target_hours INTEGER);
        CREATE TABLE box_jobs (job_id INTEGER PRIMARY KEY, customer_id INTEGER, released_at TIMESTAMP, shipped_at TIMESTAMP);
        CREATE TABLE shifts (work_day DATE PRIMARY KEY, labour_hours DECIMAL(6,1));
    """)
    for t in n:
        con.execute("COPY %s FROM '%s' (HEADER, NULLSTR '')" % (t, os.path.join(DATA, t + '.csv').replace('\\', '/')))
    con.close()
    for t, k in n.items():
        print('%-16s %6s rows' % (t, format(k, ',')))


if __name__ == '__main__':
    main()
