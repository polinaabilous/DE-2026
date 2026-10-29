# Run the SCD Types 3, 4 and 6 lab

Download [run_scd_lab.py](run_scd_lab.py). It embeds the same SQL shown in [lessons 9A–9F](../dim-dimension-tables.html#slide-21), plus the synthetic table setup. Run it with Python 3.11+ and DuckDB 1.5.6:

```sh
# From this deck's folder after downloading the lab file:
uv run --with duckdb==1.5.6 python lab/run_scd_lab.py
```

Alternatively install DuckDB in a disposable virtual environment with `python -m pip install duckdb==1.5.6`, then run the script with that environment's Python. First-time dependency installation needs a connection; the lab makes no network requests and writes no files. All databases are in memory and close on exit.

The three models are independent alternatives, each with one row per order and 107 of sales. The original Leafy orders are unchanged; region/profile details are synthetic. The Type 6 fixture uses inclusive date bounds and assumes one deduplicated forward-effective change per customer. Retroactive correction and concurrent loaders require additional design.

Checks cover Type 3 map totals and previous-slot rotation, Type 4 shared combinations and identical replays, and Type 6 historical/current totals, boundary lookups, rollback, a third city, one current row, non-overlapping intervals and matching current attributes on all versions. The run prints its tested DuckDB version.

[Worked notes](../scd-advanced.md) · [Deck](../dim-dimension-tables.html#slide-21)
