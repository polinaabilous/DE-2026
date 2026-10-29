"""Synthetic architecture lab: retained files, current selection and atomic serving."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import tempfile

import duckdb

HERE = Path(__file__).resolve().parent
COLUMNS = """{'flight_id':'VARCHAR','flight_date':'DATE','airline':'VARCHAR',
    'origin':'VARCHAR','destination':'VARCHAR','scheduled_hour':'INTEGER',
    'cancelled':'INTEGER','diverted':'INTEGER','arrival_delay':'INTEGER'}"""


def read_files(paths: list[Path]) -> str:
    # Only local fixture/output paths; quote SQL literals, including apostrophes.
    literals = ",".join("'" + str(p).replace("'", "''") + "'" for p in paths)
    return f"read_csv([{literals}], header=true, columns={COLUMNS})"


def rows(con, relation: str):
    return con.execute(f"SELECT * FROM {relation} ORDER BY flight_id").fetchall()


def metrics(con, relation: str) -> dict:
    scheduled, cancelled, eligible, long_delays, p90 = con.execute(f"""
        SELECT count(*), sum(cancelled),
            count(*) FILTER (WHERE cancelled=0 AND diverted=0 AND arrival_delay IS NOT NULL),
            count(*) FILTER (WHERE cancelled=0 AND diverted=0 AND arrival_delay>=30),
            quantile_cont(greatest(arrival_delay,0),0.9)
                FILTER (WHERE cancelled=0 AND diverted=0 AND arrival_delay IS NOT NULL)
        FROM {relation}
    """).fetchone()
    return dict(scheduled=scheduled, cancelled=cancelled,
                cancellation_rate=cancelled / scheduled,
                eligible_arrivals=eligible, long_delays=long_delays,
                long_delay_rate=long_delays / eligible,
                p90_nonnegative_delay=p90)


def run(output: Path) -> None:
    raw = HERE / "raw"
    paths = sorted(raw.glob("*.csv"))
    hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    selection = json.loads((HERE / "selection.json").read_text())
    selected = [raw / record["file"] for record in selection["current_months"]]
    assert len({r["month"] for r in selection["current_months"]}) == len(selected)
    assert all(p in paths for p in selected)
    assert len(paths) == 3 and len(selected) == 2
    (output / "silver").mkdir()
    con = duckdb.connect(str(output / "warehouse.duckdb"))
    try:
        con.execute(f"CREATE TEMP VIEW naive AS SELECT * FROM {read_files(paths)}")
        naive = metrics(con, "naive")
        assert naive["scheduled"] == 8 and naive["cancelled"] == 2
        assert naive["cancellation_rate"] == 0.25
        assert con.execute("SELECT count(DISTINCT flight_id) FROM naive").fetchone()[0] == 5
        con.execute(f"CREATE TEMP VIEW selected AS SELECT * FROM {read_files(selected)}")
        assert con.execute("SELECT count(*)=count(DISTINCT flight_id) FROM selected").fetchone()[0]
        # Each manifest partition must match its file's actual reporting month.
        for record, path in zip(selection["current_months"], selected):
            months = con.execute(f"SELECT DISTINCT strftime(flight_date, '%Y-%m') FROM {read_files([path])}").fetchall()
            assert months == [(record["month"],)]
        parquet = output / "silver" / "flight_legs.parquet"
        con.execute(f"COPY (SELECT * FROM selected) TO '{str(parquet).replace(chr(39), chr(39)*2)}' (FORMAT PARQUET)")
        parquet_literal = str(parquet).replace("'", "''")
        con.execute(f"CREATE TEMP VIEW silver AS SELECT * FROM read_parquet('{parquet_literal}')")
        assert rows(con, "selected") == rows(con, "silver")
        original = [raw / "2025-01-v1.csv", raw / "2025-02-v1.csv"]
        con.execute(f"CREATE TABLE flight_mart AS SELECT * FROM {read_files(original)}")
        before = metrics(con, "flight_mart")
        assert before["scheduled"] == 5 and before["cancelled"] == 2

        def replace_january(fail=False):
            con.execute("BEGIN TRANSACTION")
            try:
                con.execute("DELETE FROM flight_mart WHERE flight_date >= DATE '2025-01-01' AND flight_date < DATE '2025-02-01'")
                if fail:
                    raise RuntimeError("Synthetic interruption after delete")
                con.execute("INSERT INTO flight_mart SELECT * FROM silver WHERE flight_date >= DATE '2025-01-01' AND flight_date < DATE '2025-02-01'")
                assert con.execute("SELECT count(*)=count(DISTINCT flight_id) FROM flight_mart").fetchone()[0]
                con.execute("COMMIT")
            except Exception:
                con.execute("ROLLBACK")
                raise

        replace_january()
        published = rows(con, "flight_mart")
        assert published == rows(con, "silver")
        replace_january()
        assert rows(con, "flight_mart") == published
        try:
            replace_january(fail=True)
        except RuntimeError as error:
            assert str(error) == "Synthetic interruption after delete"
        else:
            raise AssertionError("The interruption must run")
        assert rows(con, "flight_mart") == published
        current = metrics(con, "flight_mart")
        assert current["scheduled"] == 5 and current["cancelled"] == 1
        assert current["eligible_arrivals"] == 4 and current["long_delays"] == 2
        assert current["cancellation_rate"] == 0.2 and current["long_delay_rate"] == 0.5
        assert math.isclose(current["p90_nonnegative_delay"], 38.5)
        assert hashes == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
        report = dict(duckdb_version=duckdb.__version__, fixture="synthetic; not real BTS data",
                      naive=naive, original_mart=before, current=current,
                      rerun_safe=True, failed_write_rolled_back=True, raw_unchanged=True)
        manifest = dict(selection, raw_sha256=hashes)
        (output / "selection.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, indent=2))
        print("PASS: selection, typed Parquet, key uniqueness, reconciliation, rerun, rollback and unchanged raw evidence")
    finally:
        con.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Keep outputs in a new, nonexistent directory")
    args = parser.parse_args()
    if args.output:
        output = args.output.resolve()
        output.mkdir(parents=True, exist_ok=False)
        run(output)
        print(f"Outputs: {output}")
    else:
        with tempfile.TemporaryDirectory(prefix="architecture-lab-") as directory:
            run(Path(directory))
        print("Temporary outputs removed; use --output to keep them.")


if __name__ == "__main__":
    main()
