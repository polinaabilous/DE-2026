# Dashboard critique checklist

Walk the items in this order: the first three decide whether the page is useful and honest; the rest make it fast to read. Items marked **(auto)** are partly checked by `python dashlint.py <module>`; everything else needs a human.

| # | Item | Ask | Typical fix |
|---|---|---|---|
| 1 | Purpose | Who reads this, when, and which decision does it support? One page, one audience, one question? | Name the audience and question in the subtitle; move other audiences' tiles to their own page |
| 2 | Headline **(auto)** | Does the top-left text state the finding with a number and a direction? Is it computed from the data? | `headline(...)` plus one sentence of cause |
| 3 | Honesty **(auto)** | Bars from zero? One value axis per chart? Complete periods only (or labelled)? Fair window? Right denominator? | Zero baseline for bars, two aligned panels instead of a twin axis, `days_in_data = 7` |
| 4 | Chart fits the message | Comparison, trend, composition, distribution, relationship: does the chart type match? No pies with many slices, no 3D | Sorted bars, lines, share lines, histograms, scatter plots |
| 5 | Context | Is every number compared with something: last period, target, normal range? | KPI cards with change and comparison |
| 6 | Clutter | Box, grid, tick marks, legends, data labels on every point, rotated text, decimals nobody needs? | `declutter`, direct labels, fewer ticks |
| 7 | Colour **(auto)** | Gray for context and one accent for the point? Same colour means the same thing everywhere? | Gray + accent; a fixed colour per category |
| 8 | Numbers | Scaled ($17.4K), consistent precision, units once in the title, rate changes in points? | `fmt_money`, `fmt_pct`, `fmt_change` |
| 9 | Accessibility **(auto)** | Text contrast at least 4.5:1 (large 3:1), chart marks 3:1, never colour alone, alt text, readable size? | Darker grays, arrows and words, alt text under 250 characters |
| 10 | Layout and next step | Headline → KPIs → drivers → detail? Definitions and data freshness visible? Where does the reader click next? | Inverted-pyramid layout, notes panel, drill-through |

## Critique sheet (copy once per dashboard)

| Finding | Item # | Why it matters | Fix |
|---|---|---|---|
|  |  |  |  |

**The headline this page should have:**

**The one change that would help most:**

## Weekly critique log (20 minutes a week)

Pick one dashboard a week: a Makeover Monday chart, a Power BI sample report, a public statistics page, or one from work. Write three lines.

| Week | Dashboard (link) | Biggest problem (item #) | Quickest fix | Headline it should have |
|---|---|---|---|---|
|  |  |  |  |  |
