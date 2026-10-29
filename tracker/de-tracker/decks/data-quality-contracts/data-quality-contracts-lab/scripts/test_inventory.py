"""test_inventory.py: list every data test from target/manifest.json by layer, and flag duplicates.

    dbt parse                                            # any dbt command writes target/manifest.json
    python scripts/test_inventory.py                     # summary + duplicate candidates
    python scripts/test_inventory.py --catalogue TESTING.md   # also rewrite the catalogue in TESTING.md

A duplicate candidate is the same generic test on the same column name as an upstream node: the
column was already checked earlier in the lineage. It is a candidate, not a verdict: keep the test
if the model can change that column (a join, a coalesce, a union with an unknown member).
"""
import argparse
import json
from collections import Counter
from pathlib import Path

LAYERS = ["source", "seed", "staging", "intermediate", "marts", "other"]
DEFAULT = ("!= 0", "!= 0", "count(*)")

ap = argparse.ArgumentParser()
ap.add_argument("--catalogue", help="markdown file with <!-- catalogue:start/end --> markers")
args = ap.parse_args()
m = json.loads(Path("target/manifest.json").read_text(encoding="utf-8"))


def layer(uid):
    kind = uid.split(".")[0]
    if kind in ("source", "seed"):
        return kind
    path = m["nodes"][uid]["original_file_path"].replace("\\", "/")
    return next((name for name in ("staging", "intermediate", "marts") if f"/{name}/" in path), "other")


def short(uid):
    return uid.split(".", 2)[2]


def ancestors(uid, seen=None):
    seen = set() if seen is None else seen
    for parent in m["parent_map"].get(uid, []):
        if parent not in seen:
            seen.add(parent)
            ancestors(parent, seen)
    return seen


tests = []
for t in m["nodes"].values():
    if t["resource_type"] != "test":
        continue
    deps = [d for d in t["depends_on"]["nodes"] if d.split(".")[0] in ("model", "seed", "source")]
    target = t.get("attached_node") or max(deps, key=lambda d: LAYERS.index(layer(d)))
    c = t["config"]
    rule = "" if (c["warn_if"], c["error_if"], c["fail_calc"]) == DEFAULT else \
        f"warn_if {c['warn_if']}; error_if {c['error_if']}" + ("" if c["fail_calc"] == "count(*)" else f"; fail_calc {c['fail_calc']}")
    tests.append(dict(name=t["name"], kind=(t.get("test_metadata") or {}).get("name", "singular"),
                      target=target, column=t.get("column_name") or "", layer=layer(target),
                      severity=c["severity"].lower(), rule=rule))

by_layer = Counter(t["layer"] for t in tests)
print(f"{len(tests)} data tests")
print(f"{'layer':<13}{'tests':>6}{'warn':>6}  kinds")
for name in LAYERS:
    rows = [t for t in tests if t["layer"] == name]
    if rows:
        kinds = Counter(t["kind"] for t in rows)
        print(f"{name:<13}{len(rows):>6}{sum(t['severity'] == 'warn' for t in rows):>6}  "
              + ", ".join(f"{k} {v}" for k, v in sorted(kinds.items())))

index = {(t["target"], t["column"], t["kind"]) for t in tests if t["column"]}
dups = sorted((short(t["target"]), t["column"], t["kind"], short(a)) for t in tests if t["column"]
              for a in ancestors(t["target"]) if (a, t["column"], t["kind"]) in index)
print(f"\nduplicate candidates (same test, same column, upstream): {len(dups)}")
for node, column, kind, upstream in dups:
    print(f"  {node + '.' + column:<28} {kind:<9} also on {upstream}")

if args.catalogue:
    lines = ["| Layer | Tested node | Test | Severity | Thresholds |", "|---|---|---|---|---|"]
    for t in sorted(tests, key=lambda t: (LAYERS.index(t["layer"]), short(t["target"]), t["column"], t["kind"])):
        on = short(t["target"]) + (f".{t['column']}" if t["column"] else "")
        test = t["kind"] if t["kind"] != "singular" else f"singular: `{t['name']}`"
        lines.append(f"| {t['layer']} | `{on}` | {test} | {t['severity']} | {t['rule'] or 'any failure'} |")
    doc = Path(args.catalogue)
    text = doc.read_text(encoding="utf-8")
    start, end = "<!-- catalogue:start -->", "<!-- catalogue:end -->"
    head, rest = text.split(start)
    doc.write_text(head + start + "\n" + "\n".join(lines) + "\n" + end + rest.split(end)[1], encoding="utf-8")
    print(f"\n{doc}: catalogue rewritten ({len(tests)} tests)")
