# Status: 30-day repeat-customer rate · 2026-03-06

## Status
At risk: February orders from the new web shop, needed to count January repeats, land on 2026-03-10, one day before the pre-read deadline.

## Done since last update
- Definition, design doc and ADR-0001 approved (2026-03-04).
- Models and acceptance checks pass on the fixture: January 2026 cohort 50.0%.

## Next
- 2026-03-09: full run for cohorts January 2025 to December 2025.
- 2026-03-10: load the web shop export, recompute January 2026 and send the table to the Marketing lead.

## Risks and blockers
- Web shop export late: if it slips past 2026-03-10 12:00 Chicago, January 2026 web repeats are undercounted.

## Asks
Marketing lead, by 2026-03-09: pick one option in case the export slips.
- Option A: keep the 2026-03-11 deadline; January 2026 web is marked "provisional, undercounted".
- Option B: new date 2026-03-12 08:00 with January 2026 complete, and no review time before the meeting.

## Next update
2026-03-09, or the same day if the export date changes.
