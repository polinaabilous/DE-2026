# Self-review rubric

Score each dimension 0-3 right after the session, from your recording or your notes, before you look at any solution.
A session is at interview level when **no dimension is below 2**. The lowest dimension is the focus of your next session.

## Technical round (SQL or Python): five dimensions, 15 points

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| clarify | Started typing at once | Restated the task only | Restated, asked 2+ questions, named the output grain | ...and wrote the agreed example input and output |
| approach | No plan | Plan only in your head | Said the steps before coding | ...plus complexity and one alternative with its trade-off |
| correctness | Does not run | Runs, wrong answer | Right on the main case | Right on every edge case (checker or tests pass) |
| testing | No test | Re-read the code | Walked one example by hand | Walked a typical case and 2+ edge cases; fixed what you found |
| communication | Long silences (over 1 minute) | Narrated syntax ("now a for loop") | Narrated decisions | Decisions, a summary at the end and a clear "done" |

## Case round (modeling and metrics): six dimensions, 18 points

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| clarify | Jumped to tables | Asked generic questions | Pinned the decision, the population and the period | ...and stated assumptions out loud and wrote them down |
| grain | No grain | Grain implied | One sentence per table ("one row per ...") | ...and explained why that grain answers the question |
| model | No tables | Tables without keys | Facts and dimensions with keys | ...and the derived table the metric needs, with its grain |
| metric | Name only | Numerator and denominator | Plus population, window, time zone, exclusions | ...plus how unknowns and late data are reported |
| validate | None | "I would test it" | Grain check and one reconciliation | ...and a sensitivity check or the sample-size caveat |
| answer | Rambled | Numbers without a recommendation | Three sentences: answer, evidence, caveat and next step | ...within one minute, and handled a follow-up calmly |
