# Lab: critique and redesign Leafy's weekly dashboard

Companion lab for the deck *Dashboard storytelling: chart choice, decluttering and headline-first dashboards* (lessons 17–21). Time: about 90 minutes. Everything runs offline; the data is synthetic and deterministic.

**Tested with:** CPython 3.12.10, matplotlib 3.11.2, DuckDB 1.5.6, pytest 9.1.1 on Windows 11.

## The brief

Leafy's leadership team opens the weekly dashboard every Monday at 9:00 to decide what needs attention this week. The page in `out/before.png` (built by `before_dashboard.py`) is what the team shipped. Nobody noticed from it that net sales fell for a reason that one team could fix that day.

Your job: critique the page with the checklist, write the headline, sketch a headline-first layout, build it in `my_redesign.py`, and make the automated checks pass. Then do the same once for your Fuel Smart portfolio dashboard.

## Set up

```powershell
# Windows PowerShell, from this folder
python -m venv .venv
.venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python make_data.py                   # rebuilds data/*.csv (already included; same rows every time)
python before_dashboard.py            # writes out/before.png
```

## Files

| File | What it is |
|---|---|
| `make_data.py` | Generates the Leafy dashboard extract and a 50-row Fuel Smart fixture into `data/` (standard library only) |
| `data/weekly_platform.csv` | One row per week and platform: sessions, orders, net sales, and `days_in_data` (the last week is partial: 2 of 7 days) |
| `data/channel_orders.csv` | Orders per marketing channel for the last two complete weeks (two channels tie) |
| `data/deliveries.csv` | One row per shipment: carrier and delivery days (same average, different shapes) |
| `data/campaigns.csv` | One row per campaign: discount, sessions, orders |
| `data/fuel_smart_recipes.csv` | 50 synthetic recipe servings shaped like the Fuel Smart mart (not real data) |
| `chartkit.py` | The helpers built in the deck: quiet style, `declutter`, `label_end`, number formatting, `headline`, `kpi_card`, `contrast_ratio` |
| `before_dashboard.py` | The page to critique. Every problem is deliberate |
| `dashlint.py` | The automatable half of the critique checklist: `python dashlint.py <module>` |
| `critique_checklist.md` | The 10-point checklist and a weekly critique log template |
| `solutions/redesign_solution.py` | A model redesign. **Spoiler:** open it only after your attempt |
| `tests/test_dashboard.py` | Checks that the linter catches every planted problem and the model redesign passes |

## Steps

1. **Critique** (20 min). Open `out/before.png`. Fill in the checklist in `critique_checklist.md` for this page: for each problem, the item it breaks and the fix. Then run `python dashlint.py before_dashboard` and compare: which of your findings could a linter never catch?
2. **Headline and wireframe** (15 min). Compute the headline from the data with `chartkit.headline` (complete weeks only), add one sentence of cause, and sketch the four tiers: headline → KPI cards with comparisons → the charts that prove it → detail and definitions.
3. **Build** (40 min). Create `my_redesign.py` with `build(data_dir="data") -> (fig, meta)`, where `meta["alt_text"]` is at most 250 characters. Save the page with `chartkit.save(fig, "out/my_redesign.png")`.
4. **Check** (5 min). `python dashlint.py my_redesign` must print `9 of 9 checks passed`. Then walk the manual checklist items again.
5. **Portfolio** (optional, 30 min). Redesign your Fuel Smart dashboard once, using `data/fuel_smart_recipes.csv` until your real mart exists (deck lesson 21).

## Expected results

- `python dashlint.py before_dashboard` fails all 9 automated checks (exit code 1).
- `python dashlint.py solutions.redesign_solution` passes all 9 (exit code 0).
- `python -m pytest -q` prints: `8 passed`

## Power BI variant

If you build the redesign in Power BI Desktop instead: import the CSV files, recreate the four tiers with a dynamic title measure, Card or KPI visuals, a line chart and a small-multiples line chart, set alt text on every visual and check the tab order. The deck's lesson 13 maps each chartkit helper to its Power BI feature. (The Power BI variant was not executed for this lab.)
