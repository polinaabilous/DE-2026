# Architecture evolution: a tiny executable lab

Five synthetic flight legs illustrate why retained source files, current analytical inputs and a published mart are separate responsibilities. No real BTS data, cloud account or paid services are used.

## Run

From the parent `architecture-evolution/` directory, with Python 3.11+ and [uv](https://docs.astral.sh/uv/):

```bash
uv run --with "duckdb>=1.4,<2" python lab/run_lab.py
uv run --with "duckdb>=1.4,<2" python lab/run_lab.py --output ./architecture-lab-output
```

Default outputs are temporary. `--output` keeps files in a **new directory**; an existing directory is rejected. Initial dependency installation can require network access. The lab itself makes no network requests. Executed with DuckDB 1.5.6.

If downloading individually, preserve this structure:

- [run_lab.py](run_lab.py)
- [selection.json](selection.json)
- [raw/2025-01-v1.csv](raw/2025-01-v1.csv)
- [raw/2025-01-v2.csv](raw/2025-01-v2.csv)
- [raw/2025-02-v1.csv](raw/2025-02-v1.csv)

## What happens

1. Retain January's original file, its correction and February's original file. Hash the evidence.
2. Read every file: **8 rows / 5 identities / 2 cancellations / 25% cancellation rate**. The SQL runs but the population is wrong.
3. Use `selection.json` to select one current version per month. Validate reporting months and unique keys; write typed `silver/flight_legs.parquet`.
4. Build a DuckDB mart from the original months. Replace January inside a transaction and repeat the replacement. The result matches the selected source at every key.
5. Interrupt the replacement after deleting January. Rollback preserves the last published mart.
6. Verify raw checksums are unchanged and write `report.json` and an enriched `selection.json` alongside `warehouse.duckdb`.

The corrected result is **5 scheduled legs, 1 cancellation (20%), 4 eligible arrivals, 2 delays of at least 30 minutes (50%)**, and **38.5 minutes p90 nonnegative arrival delay**. Eligible arrivals exclude cancelled/diverted legs and missing arrival delay. These definitions match the portfolio's outcome metrics; this tiny sample is not useful for real rankings.

## Inspect and extend

Open `warehouse.duckdb` in DuckDB or query the Parquet file. Compare F002 across the two January files. Inspect how the transaction wraps delete and insert.

- Add a duplicate flight key to the selected source: the uniqueness assertion must fail.
- Point January at an old correction: uniqueness will still pass. Explain why a real source-selection policy also needs publication/version ordering.
- Add a diverted flight: check that scheduled-leg and eligible-arrival denominators differ correctly.
- Write an architecture decision record: pressure, options, boundaries, owner, proof, cost and rollback.

The file-selection JSON is a teaching aid, **not** a concurrent commit protocol. DuckDB demonstrates a local database transaction, **not** Delta/Iceberg/Hudi, distributed concurrency, multi-table lake transactions or cloud scale. Source version resolution and retention need explicit policies in a production pipeline.

Continue in [deck slide 33](../architecture-evolution.html#slide-33) and [slide 34](../architecture-evolution.html#slide-34).
