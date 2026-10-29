# Leafy: a dbt + DuckDB project with a quality gate and contracts

The finished project of the deck *Data quality and contracts: test strategy, freshness, model contracts and versions*
(dbt series, gap deck). It starts from `dbt-jinja-macros-project` and adds a risk-based test strategy
(`TESTING.md`), source freshness and volume tests, percentage thresholds with `fail_calc`, row conservation and a
revenue reconciliation against the payment provider, an enforced model contract with constraints on `fct_orders`,
two model versions with a deprecation date, groups and access, and a producer-consumer data contract (ODCS) for the
web events.

Tested with dbt-core 1.12.5, dbt-duckdb 1.11.0 (DuckDB 1.5.6), Python 3.12.10; Data Contract CLI 1.2.4 (optional, separate environment).

## Run it

    python -m venv .venv
    .venv\Scripts\Activate.ps1               # macOS/Linux: source .venv/bin/activate
    python -m pip install dbt-core==1.12.5 dbt-duckdb==1.11.0
    $env:DBT_PROFILES_DIR = (Get-Location).Path   # macOS/Linux: export DBT_PROFILES_DIR=$PWD
    python scripts/load_raw.py               # EL: a normal week, newest files landed 1 hour ago
    dbt source freshness                     # expect: 2 x PASS
    dbt build                                # expect: ERROR=0, WARN=2, PASS=57
    python scripts/test_inventory.py --catalogue TESTING.md   # 44 data tests

The two warnings are expected and owned (see TESTING.md): guest purchases at 6% and event e7's unparseable amount.
dbt also warns that `mkt_customer_orders` still references `fct_orders` v1, which is slated for deprecation.

## Incident drill

    python scripts/load_raw.py --lag-hours 50          ; dbt source freshness   # ERROR STALE (events)
    python scripts/load_raw.py --incident truncated    ; dbt build              # volume test fails, children skipped
    python scripts/load_raw.py --incident redelivered  ; dbt build              # green again
    python scripts/load_raw.py --incident appv2        ; dbt build              # green: stg_events reads amount_cents

## Breaking-change check (CI)

    dbt parse; mkdir prod-artifacts; copy target\manifest.json prod-artifacts\   # "production" state
    # change a contracted column, then:
    dbt build --select state:modified+ --state prod-artifacts --warn-error-options '{"error": ["UnversionedBreakingChange"]}'

## Data contract (optional, needs datacontract-cli in its own environment)

    datacontract lint contracts/web_events.odcs.yaml
    datacontract test --server release-v2 contracts/web_events.odcs.yaml     # fails: purchases without amount
    datacontract breaking contracts/web_events.odcs.yaml contracts/web_events.v2_0.odcs.yaml   # exit 1

## Layout

    data-quality-contracts-lab/
      TESTING.md                      strategy, SLAs, owners, contracts policy, generated catalogue
      contracts/web_events*.odcs.yaml data contract with the web team (1.0.0, 1.1.0, 2.0.0)
      data/raw/                       a normal week: events_*.jsonl, payments/settlement_*.csv
      data/incidents/                 truncated/, redelivered/, appv2/ (day 2026-03-08)
      models/_groups.yml              commerce and marketing groups with owners
      models/staging/                 sources (freshness, volume), stg_events, stg_payments
      models/marts/                   fct_orders v1 + v2 (contract, constraints), rec_daily_revenue
      models/marketing/               mkt_customer_orders (pins fct_orders v1)
      seeds/known_differences.csv     explained reconciliation differences
      scripts/load_raw.py             EL with --through, --lag-hours, --incident
      scripts/test_inventory.py       test inventory and catalogue
      tests/                          conservation and reconciliation; generic null_rate, volume_vs_trailing
