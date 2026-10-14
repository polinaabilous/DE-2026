"""make_leafy_time.py: deterministic Leafy data for the time-analysis deck.

Writes leafy_time.duckdb with three tables:
  users(user_id, first_seen_utc, home_tz)                  one row per account
  events(event_id, user_id, event_name, event_at_utc)      one row per event delivery
  orders(order_id, user_id, placed_at_utc, category, amount)  one row per order
Every timestamp is a plain TIMESTAMP that means UTC (columns end in _utc).
Data starts on Thursday 1 January 2026 and was loaded on Wednesday 17 June 2026 at 15:00 UTC.
"""
import datetime as dt
import random
from zoneinfo import ZoneInfo

import duckdb

random.seed(20260617)
UTC = dt.timezone.utc
START = dt.date(2026, 1, 1)
LOAD_UTC = dt.datetime(2026, 6, 17, 15, 0)            # 10:00 in Chicago (CDT)
ZONES = [('America/Chicago', 70), ('America/New_York', 12), ('America/Los_Angeles', 10), ('Europe/London', 8)]
MONTH_WEIGHT = {1: 10, 2: 9, 3: 11, 4: 10, 5: 12, 6: 6}  # June is only half observed


def pick(pairs):
    total = sum(w for _, w in pairs)
    r = random.uniform(0, total)
    for v, w in pairs:
        r -= w
        if r <= 0:
            return v
    return pairs[-1][0]


def local_to_utc(day, minutes, zone):
    local = dt.datetime.combine(day, dt.time()) + dt.timedelta(minutes=minutes)
    return local.replace(tzinfo=ZoneInfo(zone)).astimezone(UTC).replace(tzinfo=None)


def random_day_in_month(year, month, after=None):
    first = dt.date(year, month, 1)
    nxt = dt.date(year + month // 12, month % 12 + 1, 1)
    lo = max(first, after or first)
    hi = min(nxt - dt.timedelta(days=1), LOAD_UTC.date())
    if lo > hi:
        return None
    return lo + dt.timedelta(days=random.randint(0, (hi - lo).days))


users, events, orders = [], [], []
eid = 0


def add(user_id, name, ts):
    global eid
    if ts < LOAD_UTC:
        eid += 1
        events.append((eid, user_id, name, ts))


def session(user_id, start_ts):
    """One visit: view a product, maybe add to cart, maybe buy now or come back later."""
    t = start_ts
    if random.random() < 0.06:                      # quick-add from the home page: no product view
        add(user_id, 'add_to_cart', t)
    else:
        add(user_id, 'view_product', t)
        if random.random() < 0.38:
            t += dt.timedelta(minutes=random.randint(1, 20))
            add(user_id, 'add_to_cart', t)
        else:
            return
    r = random.random()
    if r < 0.45:
        t += dt.timedelta(minutes=random.randint(2, 30))
    elif r < 0.65:
        t += dt.timedelta(days=random.randint(1, 12), minutes=random.randint(0, 600))
    else:
        return
    add(user_id, 'purchase', t)


uid = 0
for month, weight in MONTH_WEIGHT.items():
    for _ in range(weight * 6):
        uid += 1
        zone = pick(ZONES)
        first_day = random_day_in_month(2026, month)
        first_ts = local_to_utc(first_day, random.randint(7 * 60, 23 * 60 + 50), zone)
        if first_ts >= LOAD_UTC:
            first_ts = LOAD_UTC - dt.timedelta(hours=random.randint(2, 40))
        users.append((uid, first_ts, zone))
        session(uid, first_ts)
        for _ in range(random.choice([0, 0, 1])):    # sometimes a second visit in the first month
            day = random_day_in_month(2026, month, after=first_ts.date())
            if day:
                session(uid, local_to_utc(day, random.randint(7 * 60, 23 * 60 + 50), zone))
        p = 0.52
        for later in range(month + 1, 7):
            if random.random() < p:
                for _ in range(random.choice([1, 1, 2])):
                    day = random_day_in_month(2026, later)
                    if day:
                        session(uid, local_to_utc(day, random.randint(7 * 60, 23 * 60 + 50), zone))
            p *= 0.82

# Planted users for the funnel lessons (ids 901-904), all America/Chicago.
PLANTED = [
    (901, [('view_product', '2026-05-04 15:00'), ('add_to_cart', '2026-05-04 15:06'), ('purchase', '2026-05-11 16:00')]),   # 7 days + 1 h
    (902, [('purchase', '2026-05-05 18:00'), ('view_product', '2026-05-07 14:00'), ('add_to_cart', '2026-05-07 14:03')]),   # bought first
    (903, [('view_product', '2026-05-02 13:00'), ('view_product', '2026-05-20 19:00'), ('add_to_cart', '2026-05-20 19:04'),
           ('purchase', '2026-05-21 12:00')]),                                                                                  # second try
    (904, [('view_product', '2026-05-12 17:00'), ('add_to_cart', '2026-05-12 17:00'), ('purchase', '2026-05-12 17:09')]),    # same-second cart
]
for u, evs in PLANTED:
    first = min(dt.datetime.fromisoformat(t) for _, t in evs)
    users.append((u, first, 'America/Chicago'))
    for name, t in evs:
        add(u, name, dt.datetime.fromisoformat(t))

# The same event delivered twice by the mobile SDK (same event_id): a classic duplicate.
for e in random.sample(events, 12):
    events.append(e)

# Orders come from the order service: one per purchase event (duplicates excluded).
seen = set()
oid = 1000
for e in sorted(events, key=lambda x: (x[3], x[0])):
    if e[2] == 'purchase' and e[0] not in seen:
        seen.add(e[0])
        oid += 1
        cat = pick([('plants', 70), ('pots', 26), ('workshop', 4)])
        amount = {'plants': random.choice([14, 18, 24, 32, 45]), 'pots': random.choice([9, 12, 19]), 'workshop': 35}[cat]
        orders.append((oid, e[1], e[3], cat, float(amount)))

# Anonymous browsing (no user_id) exists too; funnels per user ignore it.
for k in range(40):
    day = START + dt.timedelta(days=random.randint(0, 160))
    eid += 1
    events.append((eid, None, 'view_product', local_to_utc(day, random.randint(0, 1439), 'America/Chicago')))

con = duckdb.connect('leafy_time.duckdb')
con.execute("SET TimeZone = 'UTC'")
for t in ('users', 'events', 'orders', 'load_info'):
    con.execute('DROP TABLE IF EXISTS ' + t)
con.execute('CREATE TABLE users (user_id INTEGER, first_seen_utc TIMESTAMP, home_tz VARCHAR)')
con.execute('CREATE TABLE events (event_id INTEGER, user_id INTEGER, event_name VARCHAR, event_at_utc TIMESTAMP)')
con.execute('CREATE TABLE orders (order_id INTEGER, user_id INTEGER, placed_at_utc TIMESTAMP, category VARCHAR, amount DECIMAL(9,2))')
con.executemany('INSERT INTO users VALUES (?, ?, ?)', sorted(users))
con.executemany('INSERT INTO events VALUES (?, ?, ?, ?)', sorted(events, key=lambda e: (e[3], e[0])))
con.executemany('INSERT INTO orders VALUES (?, ?, ?, ?, ?)', orders)
con.execute("CREATE TABLE load_info AS SELECT TIMESTAMP '%s' AS loaded_at_utc" % LOAD_UTC.isoformat(sep=' '))
for t in ('users', 'events', 'orders'):
    print(t, con.execute('SELECT count(*) FROM ' + t).fetchone()[0], 'rows')
con.close()
