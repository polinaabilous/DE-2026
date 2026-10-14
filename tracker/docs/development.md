# Development

The app is a small static website with no build step. Its script files use explicit browser namespaces so the local version can still open directly from a file. Modules receive their plan, storage helpers or current-state getter as dependencies; they do not reach into the app controller's state.

| File in `ae-tracker/` | Responsibility |
| --- | --- |
| `index.html`, `styles.css` | Page shell, navigation and visual styles |
| `data.js` | Curriculum: lessons, learning areas and chapters, roadmap rows, portfolio stages, checkpoints, the deck catalog with lesson coverage and labs, per-lesson resource picks and Library metadata (`LM`) |
| `decks/` | Study decks published with the app: one folder per deck (HTML, Markdown companion, labs and project folders) plus `tools/` quick guides |
| `utils.js` | Shared escaping, dates, IDs, filenames and downloads |
| `state.js` | State defaults and legacy schema/curriculum/check/reading migrations |
| `progress.js` | Lesson and stage index, check-based completion, prerequisite locking and stage readiness |
| `resources.js` | Resource catalog and formats, per-lesson picks, area reading lists, deck and lab links, long-read status and completion rules |
| `editor.js` | Safe Markdown rendering, formatting toolbar, Markdown links and keyboard/list editing |
| `plan-views.js` | Topics (learning areas), Roadmap (learn → build) and the lesson/stage side panel |
| `practice-data.js` | Public SQL problem catalog and curated broad topics and original tag provenance |
| `practice.js` | Tool registry, practice filters, three progress statuses and problem notes |
| `store.js` | Optional local folder adapter and Markdown file format |
| `cloud-core.js` | Cloud record serialization and durable pending-change model |
| `cloud.js` | Firebase authentication, account cache, sync and reconnects |
| `firebase-config.js` | Public Firebase web configuration |
| `app.js` | Remaining views, routing, events, drafts and persistence coordination |

`getState()` is deliberately a function: imports, folder reloads and account switches replace the current state object. Holding a reference to the initial object would leave calculations and views showing another version of the data.

Shared Markdown rendering and editing serve notes, daily logs and practice notes. Bare HTTP(S) URLs and `[label](url)` links are clickable; the Link button and Cmd/Ctrl+K insert editable Markdown. HTTP(S) and mailto destinations are allowed; script/data URLs are rendered as text. URLs inside code remain literal. Date/identity helpers are shared with folder exports. Account changes and data restores clear all editor drafts; incoming cloud updates preserve drafts for the current account.

## Topics, roadmap and progress

- **Lessons.** Every curriculum item in `data.js` is one lesson. The UI shows titles only; item IDs (`S1`, `PF3` …) are internal keys for saved progress and must stay stable.
- **Topics** (`#topics`) groups lessons by learning area (`areas`) and chapter. Each area also has a reading list for broad books and courses.
- **Roadmap** (`#roadmap`) renders `road`: releases → rows. A row lists lessons on the left and unlocks one portfolio stage, career milestone, standalone practice route or checkpoint on the right. `#skills` and other old routes alias to the new views.
- **Lesson panel:** Learn first → 1 What to learn (every deck for the lesson, then at most 3 resources: one *Start here* plus up to two *Go deeper*, then the area reading list with this lesson's chapters first) → 2 How to practise (lab slot, practice items with their data & tools, practice sites) → 3 Portfolio connection → 4 Check your understanding. Notes and the daily-log link follow.
- **Stage panel:** Knowledge needed → What this stage covers → What to do → Deliverable & completion.
- **Completion.** `ck[id]` stores check boxes for lessons and stages. `done[id]` and `built[stageId]` record completion. A lesson can be completed only when all its checks are ticked and its prerequisite lessons are complete. A stage needs its required lessons and earlier stages first.
- **Migration.** `checksV` runs once per state, whether loaded from local storage, an imported export or the cloud. Old ratings of Solid or Confident tick the matching check; Not yet or Shaky leave it open. Topics that were already done stay complete even if a prerequisite is not. Old ratings remain in `r` as evidence. Checkpoint tick keys (`g["s1-0"]` …) are unchanged.
- **Decks and resources** are described in the next two sections.
- **Hours** are kept in the data only for history; the UI no longer shows estimates.
## Decks

Decks live in `ae-tracker/decks/<slug>/` and are published with the app, so links work locally and on Firebase hosting. `deckBase` is `decks/`, relative to the app. `docs/README.md` at the repository root is only an index that links here. Two documents stay in `docs/` and resolve only when the repository root is served: the Fuel Smart brief and the offline DataLemur catalog (`docsBase`).

- `decks` — one entry per deck: `title`, `sub`, `file` (HTML deck or Markdown guide), `md` (companion or `null`), `slides` (numbered slides), `extras` (`[title, file]`, e.g. the data-formats one-page reference) and `guide` for the `tools/` quick guides.
- `lessonDecks` — lesson → `[slug, what it covers, partial?]`. A lesson can have two decks; the panel shows them all, whole-lesson decks first, with a *Partial* badge, **Open deck**, **Markdown ↗** and a Done tick (`lib["deck:<slug>"]`). Lessons without an entry show “No deck yet”.
- `lessonLabs` — lesson → `{ title, file, slide? , deck? }`. In an HTML file `slide` is the `#slide-N` anchor; a lab folder (dbt project) links its `README.md` and names the deck slide that walks through it. Lessons without labs show “Lab will be added with the deck”.
- `plannedDecks` / `lessonPlanned` — decks from `docs/study-planning/study-deck-roadmap.md` that do not exist yet, shown by name only. A lesson with a whole-lesson deck shows none; a lesson with only partial decks shows “Fuller deck planned”.

These tables were generated from the deck maps written when the long decks were split per lesson (2026-10-13). To add a deck: put its folder under `decks/<slug>/`, add it to `decks`, `lessonDecks` (and `lessonLabs` if it has labs), drop any planned entry it replaces, add it to `docs/README.md`, then run `npm test` — the curriculum tests fail if a deck, companion, lab, extra or `#slide-N` anchor does not exist.

## Resources and the Library

Resources are `L` (`[title, url, kind]`) and `LX` (Library extras with their own areas, time and why). Keys are permanent: saved ticks (`rc`, `lib`, `reading`) refer to them, so a resource is never deleted — moved links change the URL and keep the key. `LM` adds Library metadata for every key: `f` format (deck, article, video, docs, course, book, podcast, newsletter, practice, tool, community), `t` time (`quick` ≤30 min, `hour`, `series` pick a piece, `deep` multi-session, `ref` reference), `why`, `ok` (date the link was last checked) and `pw` (may need sign-in).

`lessonResources` holds each lesson's picks from the resource plan: `start` (one short free item), `deeper` (at most two; Data Warehouse Toolkit chapters allowed), `reading` (book chapters, shown on the area reading list with the chapter note), `sites` (“Where to find more problems”), `tools` (datasets and tools the practice tasks use), `more` (other specific pages kept with the lesson) and `drop` (broad entries in `learn[]` the panel no longer shows). Entries use `key|note`; the note is shown next to the title (chapters, page sections). `learn[]` itself is unchanged, and everything tagged to a lesson stays visible under **Also tagged** in Resources → By lesson and on its Library card. `currentBooks` names the book you said you are reading; it is badged “Your current book” until you mark a long read as Reading, after which the badge follows that status.

The **Library** (Resources → Library) has three parts:

- **Now bar** — *Currently reading*: long reads with status Reading, with an editable progress note, optional %, the chapters your lessons use and Done / Pause. Paused reads can be resumed. With nothing in progress it suggests `currentBooks` but never marks it without a click. *Quick picks*: for the roadmap's current lesson (same rule as “You are here”), the lesson's deck, then one short article or docs page and one short video, each with a done tick; other open lessons in the same roadmap row can be switched in.
- **Filters** — colour-coded format chips (multi-select, `aria-pressed`), time chips, area, status (To do / Saved ★ / Done / All) and search. **🎲 Pick something** respects every filter and skips books and courses while one is in progress unless you filtered for them.
- **Shelves** — *Quick learning* (everything except books, courses, newsletters, podcasts and communities) as cards grouped by area, decks first; *Long reads* (books and courses) with a Reading / Later / Done control and In progress, Later, Not started and Finished groups; *Stay in the loop* for newsletters, podcasts and communities.

Only one long read is in progress at a time: starting another asks “You're reading X. Pause it and start Y?” and pauses the first (`resources.startReading`). Long-read state is `reading[key] = { status: "reading"|"paused"|"later"|"done", note?, pct?, updated }`. It is a per-entry map like `lib`: each field is its own cloud record, deletions become tombstones, and it is included in JSON export/import, the folder's `progress.json` and Reset. Saving Later/Done on a long read keeps `lib` in sync, so Library ticks, lesson ticks and the long-read status agree. Reading migration v1 (`readingV`) copies saved-for-later and done books and courses from `lib` once; it never marks anything as being read and never removes `lib` or `rc` entries.

## Practice trackers

The navigation hub is `#trackers`; each registered tool has a `#trackers/<id>` route and submenu entry. The controller creates routes and navigation from `AEPracticeCatalog.tools`, so another catalog can reuse the tracker without adding tool-specific view or event code. Problem slugs must be unique within their tool. Progress keys combine tool ID and slug to avoid collisions across tools.

DataLemur currently includes only the 54 SQL problems in the public signed-out snapshot. Original site tags remain in `tags`; detailed editorial tags remain in `suggestedTags`. The UI and filters use `topics`: one or two curated broad topics per problem, drawn from 11 topic groups. Difficulty and status filters use native radio buttons; the topic picker expands only when needed. Problem statements and solutions are not hosted. The complete premium catalog is outside this snapshot.

Public source data is in `../docs/sql/datalemur/problems.json`; the reviewed SQL tag mapping is in `../docs/sql/datalemur/suggested-tags.json`. After refreshing and reviewing that source, rebuild the hosted catalog from `tracker/`:

```sh
node scripts/build-practice-catalog.cjs
```

The builder stops if the source and reviewed tag mapping have different problem counts. It filters SQL before building; Python, statistics and ML problems are excluded.

Personal state is separate: `practice[tool:slug]` stores `status` (not-started, completed, needs-review) and Markdown `notes`. Each field has an independent cloud record, so saving notes never overwrites another device's status. The UI uses compact segmented buttons, and CSV exports contain status, simplified topics and notes.

Existing confidence ratings map on read: Not yet → Not Started, Shaky → Needs Review, Solid / Confident → Completed. A current status takes precedence over an old rating. Earlier status/review data is also supported: an unflagged solved problem maps to Completed; a review flag or in-progress status maps to Needs Review. This compatibility mapping reads data without rewriting the user's saved progress.

Attempt logging is removed from the UI and model. Historical attempts and legacy rating/review fields remain in state, cloud serialization and JSON/folder backups so existing evidence is retained.

## Checks

Run from `tracker/`:

```sh
npm ci
npm test
npm run test:browser
npm run test:rules
npm run test:sync
```

`npm test` covers migrations, prerequisite order, scoring after state replacement, resource completion, Markdown round trips, SQL-only catalog validation, status transitions and legacy progress compatibility, cloud merging, tombstones and acknowledgement races. It uses Node's built-in test runner.

The browser checks use Chrome and temporary profiles with synthetic data. On macOS the runner finds the standard Google Chrome application; elsewhere set `AE_CHROME` to your Chrome/Chromium executable. The browser suite also exercises SQL filters, the tracker submenu, status controls, compact topic filters, Markdown practice notes, CSV output and the folder adapter against an in-memory directory. Fixtures are built from the current page, so they include every module and the actual styles.

Rule and sync checks require Java 21. They use a `demo-ae-tracker` Firebase emulator project, never production records. Sync checks cover two devices, offline reconnection, deletion, reload, draft preservation and unauthorized account switching. Temporary browser fixtures are deleted after each run.

## Changes and deployment

Keep authored curriculum in `data.js` and migrations in `state.js`. Changes to checklist positions need a migration that preserves previous evidence. Keep cloud record IDs and local-storage keys stable unless a migration explicitly handles the old format.

After an app change, update the build in `app.js` and asset version strings in `index.html`, run the relevant checks, then:

```sh
npm run deploy
```

Hosting publishes only `ae-tracker/`, which includes the decks in `ae-tracker/decks/` (dotfiles such as the dbt projects' `.gitignore` are skipped). Tests, scripts, notes, backups and CLI credentials are outside that directory. Generated logs and deployment caches are ignored by Git.

## Saved-folder backup

```sh
npm run backup
```

This exports **the saved folder**, not the latest cloud state, to a new timestamped private JSON file. It does not overwrite the original migration backup. For a current cloud backup, use the app's **Export JSON** button.

The completed one-time project-creation and account-migration scripts were removed after deployment. The historical review lives in `docs/`; the study plan remains at the tracker root.
