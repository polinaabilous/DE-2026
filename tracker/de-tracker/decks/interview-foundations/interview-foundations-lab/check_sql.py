"""check_sql.py: run your SQL for one practice prompt and compare it with the reference answer.

Usage:
    python check_sql.py S1a attempts/S1a.sql

Both queries run in DuckDB over three views: orders, customers and events (see prompts.md).
Rows are compared as multisets (row order is ignored); numbers are rounded to 2 decimal places and
dates and timestamps are compared as text. Exit code 0 means your rows match the reference.
"""
import sys
from collections import Counter
from decimal import Decimal
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
DATA = (HERE / "data").as_posix()

VIEWS = f"""
SET TimeZone = 'UTC';
CREATE VIEW orders AS
SELECT * FROM read_csv('{DATA}/orders.csv', header = true, columns = {{
    'order_id': 'VARCHAR', 'customer_id': 'VARCHAR', 'placed_at_utc': 'TIMESTAMPTZ', 'city': 'VARCHAR',
    'delivery_option': 'VARCHAR', 'status': 'VARCHAR', 'amount': 'DECIMAL(10,2)',
    'promised_by_utc': 'TIMESTAMPTZ', 'delivered_at_utc': 'TIMESTAMPTZ'}});
CREATE VIEW customers AS
SELECT * FROM read_csv('{DATA}/customers.csv', header = true, columns = {{
    'customer_id': 'VARCHAR', 'signup_date': 'DATE', 'segment': 'VARCHAR', 'is_staff': 'BOOLEAN'}});
CREATE VIEW events AS
SELECT * FROM read_json('{DATA}/events.jsonl', format = 'newline_delimited', ignore_errors = true, columns = {{
    'event_id': 'VARCHAR', 'user_id': 'VARCHAR', 'event_type': 'VARCHAR',
    'event_ts': 'TIMESTAMPTZ', 'ingested_at': 'TIMESTAMPTZ'}})
WHERE event_id IS NOT NULL;   -- a malformed JSON line loads as an all-NULL row; drop it
"""

EDGE_CASES = {
    "S1a": ["a replayed duplicate row (O07)", "a guest order with no customer_id (O13)",
            "a cancelled order that is some customer's most recent order (O21)"],
    "S1b": ["months are local to America/Chicago: O02 at 05:30 UTC on 1 March is February",
            "O19 at 04:00 UTC on 1 April is still 31 March in Chicago",
            "the replayed duplicate O07 must be counted once",
            "Austin has no February orders but still needs a row with 0"],
    "S2a": ["E08 arrives twice; the later ingested copy corrects 'purchase' to 'add_to_cart'",
            "E09 has no user_id", "a malformed line and a line without event_ts"],
    "S2b": ["Chicago switches to daylight time on 2026-03-08 (offsets -06:00 and -05:00)",
            "E16 at 23:59:59 local on 9 March is 10 March in UTC", "E09 has no user_id",
            "E05 appears twice with the same ingested_at"],
}


def connect():
    con = duckdb.connect()
    con.execute(VIEWS)
    return con


def _norm(v):
    if isinstance(v, (float, Decimal)):
        return round(float(v), 2)
    return v


def run(con, sql):
    """Run a query and return (columns, rows). Date/time columns are cast to text so no extra packages are needed."""
    rel = con.sql(sql.strip().rstrip(";"))
    cols = rel.columns
    exprs = []
    for c, t in zip(cols, rel.types):
        q = '"' + c.replace('"', '""') + '"'
        exprs.append("CAST(" + q + " AS VARCHAR)" if any(w in str(t) for w in ("DATE", "TIME")) else q)
    rows = con.sql("SELECT " + ", ".join(exprs) + " FROM (" + sql.strip().rstrip(";") + ")").fetchall()
    return cols, [tuple(_norm(v) for v in r) for r in rows]


def compare(prompt, attempt_sql, reference_sql):
    con = connect()
    ref_cols, ref = run(con, reference_sql)
    try:
        cols, got = run(con, attempt_sql)
    except duckdb.Error as e:
        return False, ["ERROR: your query did not run: " + str(e).splitlines()[0]]
    out = []
    if len(cols) != len(ref_cols):
        return False, ["FAIL: you return %d columns %s; the reference returns %d %s." % (len(cols), cols, len(ref_cols), ref_cols)]
    want, have = Counter(ref), Counter(got)
    if want == have:
        out.append("PASS: %d rows match the reference." % len(ref))
        return True, out
    out.append("FAIL: your query returned %d rows; the reference has %d." % (len(got), len(ref)))
    missing, extra = want - have, have - want
    dups = [r for r, n in have.items() if n > 1 and want.get(r, 0) < n]
    if missing:
        out.append("  missing (in the reference, not in yours):")
        out += ["    " + repr(r) for r in sorted(missing.elements(), key=repr)[:5]]
    if extra:
        out.append("  extra (in yours, not in the reference):")
        out += ["    " + repr(r) for r in sorted(extra.elements(), key=repr)[:5]]
    if dups:
        out.append("  duplicated rows in yours: " + ", ".join(repr(r) for r in sorted(dups, key=repr)[:3]))
    return False, out


def main(argv):
    if len(argv) != 3 or argv[1] not in EDGE_CASES:
        print(__doc__.strip())
        print("prompts:", ", ".join(EDGE_CASES))
        return 2
    prompt, path = argv[1], Path(argv[2])
    reference = (HERE / "solutions" / "sql" / (prompt + ".sql")).read_text(encoding="utf-8")
    ok, lines = compare(prompt, path.read_text(encoding="utf-8"), reference)
    print("\n".join(lines))
    print("Edge cases in %s (say how your query handles each one):" % prompt)
    for e in EDGE_CASES[prompt]:
        print("  - " + e)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
