"""practice.py: keep a session log, a mistake log with spaced retries, and rubric scores.

Commands (dates are ISO, yyyy-mm-dd):
  python practice.py log-session --date D --kind sql|python|case --problems S1a,S1b --minutes 45 --ai no --score 11 --feedback "..."
  python practice.py log-mistake --date D --kind sql|python|case --problem S1b --pattern spine --type edge-case --rule "..."
  python practice.py retry ID --date D --result clean|miss
  python practice.py due --on D
  python practice.py score RUBRIC.json
  python practice.py report
Put --log DIR before the command to use another log folder (default: ./log).
"""
import argparse
import csv
import json
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

RETRY_OFFSETS = (1, 3, 7)     # days to the next retry after 0, 1 and 2 clean retries in a row
TECHNICAL = ("clarify", "approach", "correctness", "testing", "communication")
CASE = ("clarify", "grain", "model", "metric", "validate", "answer")
MISTAKE_TYPES = ("clarify", "grain", "edge-case", "logic", "api-recall", "complexity", "communication", "time")
SESSION_FIELDS = ["date", "kind", "problems", "minutes", "ai", "score", "feedback"]
MISTAKE_FIELDS = ["id", "date", "kind", "problem", "pattern", "type", "rule", "retries"]
GOALS = {"sql": 2, "python": 2, "case": 1}


def read(path):
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write(path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def next_due(mistake):
    """Date of the next retry, or None when the mistake is closed (three clean retries in a row)."""
    base, streak = date.fromisoformat(mistake["date"]), 0
    for item in filter(None, mistake["retries"].split(";")):
        day, result = item.split(":")
        base = date.fromisoformat(day)
        streak = streak + 1 if result == "clean" else 0
    if streak >= len(RETRY_OFFSETS):
        return None
    return base + timedelta(days=RETRY_OFFSETS[streak])


def score(rubric):
    """Return (kind, total, maximum, weakest_dimension, ready) for a {dimension: 0..3} rubric."""
    keys = tuple(rubric)
    kind = "technical" if set(keys) == set(TECHNICAL) else "case" if set(keys) == set(CASE) else None
    if kind is None:
        raise ValueError("rubric keys must be %s or %s" % (TECHNICAL, CASE))
    if any(v not in (0, 1, 2, 3) for v in rubric.values()):
        raise ValueError("every score must be 0, 1, 2 or 3")
    order = TECHNICAL if kind == "technical" else CASE
    weakest = min(order, key=lambda d: (rubric[d], order.index(d)))
    return kind, sum(rubric.values()), 3 * len(order), weakest, min(rubric.values()) >= 2


def main(argv=None):
    ap = argparse.ArgumentParser(description="interview practice log")
    ap.add_argument("--log", default="log")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("log-session")
    for a in ("--date", "--kind", "--problems", "--minutes", "--ai", "--score"):
        s.add_argument(a, required=True)
    s.add_argument("--feedback", default="")
    m = sub.add_parser("log-mistake")
    for a in ("--date", "--kind", "--problem", "--pattern", "--type", "--rule"):
        m.add_argument(a, required=True)
    r = sub.add_parser("retry")
    r.add_argument("id")
    r.add_argument("--date", required=True)
    r.add_argument("--result", choices=["clean", "miss"], required=True)
    d = sub.add_parser("due")
    d.add_argument("--on", required=True)
    sc = sub.add_parser("score")
    sc.add_argument("rubric")
    sub.add_parser("report")
    a = ap.parse_args(argv)
    log = Path(a.log)
    sessions_csv, mistakes_csv = log / "sessions.csv", log / "mistakes.csv"

    if a.cmd == "log-session":
        if a.kind not in GOALS or a.ai not in ("yes", "no"):
            sys.exit("kind must be sql, python or case; ai must be yes or no")
        rows = read(sessions_csv) + [{k: getattr(a, k) for k in SESSION_FIELDS}]
        write(sessions_csv, SESSION_FIELDS, rows)
        print("logged %s session on %s (%d sessions in the log)" % (a.kind, a.date, len(rows)))
    elif a.cmd == "log-mistake":
        if a.type not in MISTAKE_TYPES:
            sys.exit("type must be one of: " + ", ".join(MISTAKE_TYPES))
        rows = read(mistakes_csv)
        new = {"id": str(len(rows) + 1), "date": a.date, "kind": a.kind, "problem": a.problem,
               "pattern": a.pattern, "type": a.type, "rule": a.rule, "retries": ""}
        write(mistakes_csv, MISTAKE_FIELDS, rows + [new])
        print("mistake %s logged; first retry due %s" % (new["id"], next_due(new)))
    elif a.cmd == "retry":
        rows = read(mistakes_csv)
        row = next(x for x in rows if x["id"] == a.id)
        row["retries"] = ";".join(filter(None, [row["retries"], a.date + ":" + a.result]))
        write(mistakes_csv, MISTAKE_FIELDS, rows)
        due = next_due(row)
        print("mistake %s: %s on %s; %s" % (a.id, a.result, a.date, "closed" if due is None else "next retry %s" % due))
    elif a.cmd == "due":
        on = date.fromisoformat(a.on)
        due = [(next_due(x), x) for x in read(mistakes_csv)]
        due = sorted(((d, x) for d, x in due if d is not None and d <= on), key=lambda t: (t[0], int(t[1]["id"])))
        print("retries due on or before %s: %d" % (on, len(due)))
        for d, x in due:
            print("  #%s %-6s %-5s %-12s due %s  rule: %s" % (x["id"], x["kind"], x["problem"], x["pattern"], d, x["rule"]))
    elif a.cmd == "score":
        rubric = json.loads(Path(a.rubric).read_text(encoding="utf-8"))
        kind, total, top, weakest, ready = score(rubric)
        print("%s rubric: %d / %d" % (kind, total, top))
        print("  " + "  ".join("%s=%d" % kv for kv in rubric.items()))
        print("weakest: %s -> make it the focus of your next session" % weakest)
        print("verdict: " + ("every dimension at 2 or more" if ready else "below 2 somewhere: retry this pattern"))
    elif a.cmd == "report":
        sessions, mistakes = read(sessions_csv), read(mistakes_csv)
        print("Definition of done (sessions without AI):")
        for kind, goal in GOALS.items():
            done = [s for s in sessions if s["kind"] == kind and s["ai"] == "no" and (kind != "case" or s["feedback"])]
            print("  [%s] %-6s %d / %d" % ("x" if len(done) >= goal else " ", kind, len(done), goal))
        open_ = [x for x in mistakes if next_due(x) is not None]
        print("mistakes: %d logged, %d open" % (len(mistakes), len(open_)))
        for label, key in (("by type", "type"), ("by pattern", "pattern")):
            counts = sorted(Counter(x[key] for x in mistakes).items(), key=lambda kv: (-kv[1], kv[0]))
            print("  %-11s %s" % (label + ":", ", ".join("%s %d" % kv for kv in counts) or "-"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
