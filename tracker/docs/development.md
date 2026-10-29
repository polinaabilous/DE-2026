# Development

The app is a small static website with no build step. Its script files use explicit browser namespaces so the local version can still open directly from a file. Modules receive their plan, storage helpers or current-state getter as dependencies; they do not reach into the app controller's state.

| File in `ae-tracker/` | Responsibility |
| --- | --- |
| `index.html`, `styles.css` | Page shell, navigation and visual styles |
| `data.js` | Curriculum: lessons, learning areas and chapters, roadmap rows, portfolio stages, checkpoints, the deck catalog with lesson coverage and labs, per-lesson resource picks and Library metadata (`LM`) |
| `data-landscape-data.js` | Generated public reference definitions, labeled relations, source citations, comparisons and example stacks |
| `data-landscape.js` / `data-landscape.css` | Read-only Data map page, purpose/type filters, connected-term focus, comparisons and reference side panel |
| `decks/` | Study decks published with the app: one folder per deck (HTML, Markdown companion, labs and project folders) plus `tools/` quick guides |
| `utils.js` | Shared escaping, dates, IDs, filenames and downloads |
| `state.js` | State defaults and legacy schema/curriculum/check/reading migrations |
| `progress.js` | Lesson and stage index, check-based completion, prerequisite locking and stage readiness |
| `resources.js` | Resource catalog and formats, per-lesson picks, area reading lists, deck and lab links, long-read status and completion rules |
| `editor.js` | Safe Markdown rendering, formatting toolbar, Markdown links and keyboard/list editing |
| `plan-views.js` | Topics (learning areas), Roadmap (learn → build) and the lesson/stage side panel |
| `practice-data.js` | Public SQL problem catalog and curated broad topics and original tag provenance |
| `deck-search-core.js` | Pure local retrieval: weighted text matching, prefix/typo handling, snippets and one hit per source section |
| `deck-search.js` / `deck-search.css` | Shared floating search UI, lazy index loading, source links and keyboard/focus behavior on the tracker and standalone decks |
| `deck-search-index.json` | Generated public passages from the registered Markdown companions/guides, with HTML slide fallback |
| `practice.js` | Tool registry, practice filters, three progress statuses and problem notes |
| `store.js` | Optional local folder adapter and Markdown file format |
| `cloud-core.js` | Cloud record serialization and durable pending-change model |
| `cloud.js` | Firebase authentication, account cache, sync and reconnects |
| `firebase-config.js` | Public Firebase web configuration |
| `app.js` | Remaining views, routing, events, drafts and persistence coordination |

`getState()` is deliberately a function: imports, folder reloads and account switches replace the current state object. Holding a reference to the initial object would leave calculations and views showing another version of the data.

Shared Markdown rendering and editing serve notes, daily logs and practice notes. Bare HTTP(S) URLs and `[label](url)` links are clickable; the Link button and Cmd/Ctrl+K insert editable Markdown. HTTP(S) and mailto destinations are allowed; script/data URLs are rendered as text. URLs inside code remain literal. Date/identity helpers are shared with folder exports. Account changes and data restores clear all editor drafts; incoming cloud updates preserve drafts for the current account.

## Topics, roadmap and progress

- **Data map** (`#data-map`) is a separate read-only reference. `#data-map/<term>` and `#data-map/compare/<id>` open shareable panels. Filters and the selected stack remain in memory; no personal state schema, cloud records, lesson completion or notes are changed. Related lesson buttons close the reference panel and open the existing lesson drawer.

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

Decks live in `ae-tracker/decks/<slug>/` and are published with the app, so links work locally and on Firebase hosting. `deckBase` is `decks/`, relative to the app. `docs/README.md` at the repository root is only an index that links here. Project briefs live under `ae-tracker/projects/` and are published with Hosting. The Flight Reliability HTML brief and Markdown download are generated from `docs/study-planning/flights-project-brief.md`; keep the source and hosted copies synchronized. `portfolio.name` supplies the roadmap title, and `portfolio.brief` points to the hosted HTML. Stages can add explicit dataset `resources` alongside their source-topic references. The offline DataLemur catalog remains under repository `docs/` (`docsBase`) and resolves only when the repository root is served.

- `decks` — one entry per deck: `title`, `sub`, `file` (HTML deck or Markdown guide), `md` (companion or `null`), `slides` (numbered slides), `extras` (`[title, file]`, e.g. the data-formats one-page reference) and `guide` for the `tools/` quick guides.
- `lessonDecks` — lesson → `[slug, what it covers, partial?]`. A lesson can have two decks; the panel shows them all, whole-lesson decks first, with a *Partial* badge, **Open deck**, **Markdown ↗** and a Done tick (`lib["deck:<slug>"]`). Lessons without an entry show “No deck yet”.
- `lessonLabs` — lesson → `{ title, file, slide? , deck? }`. In an HTML file `slide` is the `#slide-N` anchor; a lab folder (dbt project) links its `README.md` and names the deck slide that walks through it. Lessons without labs show “Lab will be added with the deck”.
- `plannedDecks` / `lessonPlanned` — decks from `docs/study-planning/study-deck-roadmap.md` that do not exist yet, shown by name only. A lesson with a whole-lesson deck shows none; a lesson with only partial decks shows “Fuller deck planned”.

These tables were generated from the deck maps written when the long decks were split per lesson (2026-10-13). To add a deck: put its folder under `decks/<slug>/`, add it to `decks`, `lessonDecks` (and `lessonLabs` if it has labs), drop any planned entry it replaces, add it to `docs/README.md`, then run `npm test` — the curriculum tests fail if a deck, companion, lab, extra or `#slide-N` anchor does not exist.

## Resources and the Library

Resources are `L` (`[title, url, kind]`) and `LX` (Library extras with their own areas, time and why). Keys are permanent: saved ticks (`rc`, `lib`, `reading`) refer to them, so a resource is never deleted — moved links change the URL and keep the key. `LM` adds Library metadata for every key: `f` format (deck, article, video, docs, course, book, podcast, newsletter, practice, tool, community), `t` time (`quick` ≤30 min, `hour`, `series` pick a piece, `deep` multi-session, `ref` reference), `why`, `ok` (date the link was last checked) and `pw` (may need sign-in).

`lessonResources` holds each lesson's picks from the resource plan: `start` (one focused starting resource), `deeper` (at most two; Data Warehouse Toolkit chapters allowed), `reading` (book chapters, shown on the area reading list with the chapter note), `sites` (“Where to find more problems”), `tools` (datasets and tools the practice tasks use), `more` (other specific pages kept with the lesson) and `drop` (broad entries in `learn[]` the panel no longer shows). Entries use `key|note`; the note is shown next to the title (chapters, page sections). `learn[]` itself is unchanged, and active resources tagged to a lesson stay visible under **Also tagged** in Resources → By lesson and on its Library card. `currentBooks` names the book you said you are reading; it is badged “Your current book” until you mark a long read as Reading, after which the badge follows that status.

`productionReading` is the optional practical collection in `data.js`, revised on 2026-10-21 after the full resource audit. It retains worked examples, tool walkthroughs and concrete production lessons. Entries reuse existing `L` or `LX` keys (registration must check both), carry `why`, `try`, optional `gap`/`caution`, topic IDs and five `priority` picks. The catalog populates metadata and optional `lessonResources[id].production`. Articles promoted to Start here or Go deeper retain their exercise/caveat note and are shown once per lesson; the collection filter finds primary and optional selections. Do not copy entries into `learn[]` or change completion checks. The reading map is `docs/study-planning/production-reading-map.md`.

`resourceReview.retired` excludes 155 weak, broad, obsolete or redundant entries from every visible Library/recommendation surface. The raw resource identities and all saved reading state remain intact for import/export compatibility. `resources.isActive(key)` is the shared filter for lesson picks, tagged resources, area reading, stage references, roadmap practice links and Library construction. Retired long reads do not block a new active book. The 2026-10-21 audit covers the original 497 external entries plus 34 decks, adds nine worked examples and leaves 385 visible entries. `docs/study-planning/resource-quality-review.{md,json}` records every decision and its inspection scope; keep these files synchronized with catalog edits. Free article access does not imply free cloud/model services.

The **Library** (Resources → Library) has three parts:

- **Now bar** — *Currently reading*: long reads with status Reading, with an editable progress note, optional %, the chapters your lessons use and Done / Pause. Paused reads can be resumed. With nothing in progress it suggests `currentBooks` but never marks it without a click. *Quick picks*: for the roadmap's current lesson (same rule as “You are here”), the lesson's deck, then one short article or docs page and one short video, each with a done tick; other open lessons in the same roadmap row can be switched in.
- **Filters** — colour-coded format chips (multi-select, `aria-pressed`), time chips, area, status (To do / Saved ★ / Done / All) and search. **🎲 Pick something** respects every filter and skips books and courses while one is in progress unless you filtered for them.
- **Shelves** — *Quick learning* (everything except books, courses, newsletters, podcasts and communities) as cards grouped by area, decks first; *Long reads* (books and courses) with a Reading / Later / Done control and In progress, Later, Not started and Finished groups; *Stay in the loop* for newsletters, podcasts and communities.

Only one long read is in progress at a time: starting another asks “You're reading X. Pause it and start Y?” and pauses the first (`resources.startReading`). Long-read state is `reading[key] = { status: "reading"|"paused"|"later"|"done", note?, pct?, updated }`. It is a per-entry map like `lib`: each field is its own cloud record, deletions become tombstones, and it is included in JSON export/import, the folder's `progress.json` and Reset. Saving Later/Done on a long read keeps `lib` in sync, so Library ticks, lesson ticks and the long-read status agree. Reading migration v1 (`readingV`) copies saved-for-later and done books and courses from `lib` once; it never marks anything as being read and never removes `lib` or `rc` entries.

## Deck search

`npm run build:search` builds a static search index from the allowlist in `PLAN.decks`. It reads each registered Markdown companion or Markdown-only guide; seven older decks fall back to their HTML slide text. TOCs are excluded, code fences preserve literal code, long sections are split into overlapping passages, and slide links use verified HTML anchors. Labs, notes, progress and account data are not crawled.

The builder installs the shared CSS/core/UI scripts in the tracker and each registered HTML deck using a replaceable marker block. The index URL and script URLs include content hashes. Repeated builds are deterministic; `node scripts/build-deck-search.cjs --check` verifies that the generated files are current without writing them. Firebase Hosting runs the builder as a predeploy hook, so editing a companion or registering a deck is reflected in the next deployment.

The index loads only when the search window opens and stays in memory for that page. Retrieval uses weighted text matching with plural normalization, prefix/one-letter typo handling and source-section deduplication. The small dialog supports source excerpts, slide/Markdown links, Escape/focus restoration and Cmd/Ctrl K outside editors. It has no model/API dependency and makes no database requests. Hosting storage/transfer still use the site's ordinary quota.

`npm test` checks source coverage, real anchors, relevance and reproducibility. `npm run test:search` runs isolated desktop/narrow browser checks for retrieval, source links, literal HTML/code rendering, lesson-panel coexistence, standalone decks and preservation of saved state. The 390px mobile layout was also checked through Chrome device emulation.

## Recently opened decks

Deployed to Firebase Hosting on 2026-10-26 as build `2026-10-26.1`. Topics, Roadmap, both Resources views and Dashboard surface the four newest registered decks/guides. Opening a deck records its ID and timestamp in `deckVisits`; it does not change completion, reading status or activity counts. The small cards use the current catalog title and URL, deduplicate repeated opens, and sort newest first. Phone cards scroll horizontally.

`deck-history.js` is installed alongside shared search by `build:search`. On registered HTML decks it records real page loads (including bookmarked/direct URLs and restored pages); tracker link clicks also cover Markdown-only guides and Markdown companions. Downloads and lab URLs are excluded. Standalone pages queue opens in browser storage, partitioned by the last tracker account. When the tracker is open or next opens, it absorbs the queue into that account's normal saved state and acknowledges it. The queue is not a second copy of saved history, so reset/deletion cannot resurrect acknowledged opens. No historical browser activity is imported; tracking begins with this feature.

`deckVisits` participates in JSON export/import, folder storage and per-deck cloud records. Independent opens on phone/laptop merge, and an older queued offline timestamp yields to a newer remote open. Standalone pages use browser storage and do not authenticate or contact Firestore themselves; cross-device sync happens through the tracker. `npm run test:history` checks actual lesson/search/direct opens, cross-tab updates, reload, four-route visibility, filters/drafts, reset/account isolation and desktop/390px light/dark layouts. `npm run test:sync` includes real emulator-backed cross-device recent history. Verification passed on 2026-10-26: 57 unit tests, 166 existing browser checks, the dedicated recent-decks browser suite and the two-device emulator sync suite. The emulator run used a checksum-verified temporary Java 21 runtime, without installing Java system-wide.

## Practice trackers

The navigation hub is `#trackers`; each registered tool has a `#trackers/<id>` route and submenu entry. The controller creates routes and navigation from `AEPracticeCatalog.tools`, so another catalog can reuse the tracker without adding tool-specific view or event code. Problem slugs must be unique within their tool. Progress keys combine tool ID and slug to avoid collisions across tools.

DataLemur currently includes only the 54 SQL problems in the public signed-out snapshot. Original site tags remain in `tags`; detailed editorial tags remain in `suggestedTags`. The UI and filters use `topics`: one or two curated broad topics per problem, drawn from 11 topic groups. Difficulty and status filters use native radio buttons; the topic picker expands only when needed. Problem statements and solutions are not hosted. The complete premium catalog is outside this snapshot.

LeetCode SQL 50 includes all 50 official study-plan entries, preserving their section and order, with nine editorial broad topics. `docs/sql/leetcode-sql50/problems.json` records official public API metadata and provenance; `topics.json` keeps editorial labels separate. Its route is `#trackers/leetcode-sql50`. Search includes problem numbers and original sections, company metadata stays absent, and progress keys remain tool-specific. The same builder regenerates both catalogs.

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

### Architecture evolution deck

`npm run build:architecture` generates the 40-section HTML deck and matching Markdown. Authored narrative content lives in `content/architecture-evolution.cjs`, with reference-card definitions in `content/architecture-tools.cjs`; `scripts/build-architecture-deck.cjs` renders it using the existing table-formats shell. The 2026-10-22 revision follows a fictional travel company, explains each tool in a first-use side card, and keeps only the lab-results and glossary tables. A cover action and toolbar control enable continuous reading. The narrative revision and side cards were deployed to Firebase Hosting on 2026-10-22 as build `2026-10-22.3`. Use `node scripts/build-architecture-deck.cjs --check` to check the generated pair, then `npm run build:search` to refresh shared search. The lab under `decks/architecture-evolution/lab/` uses synthetic flight CSVs and DuckDB; run its README commands to assert current-file selection, typed Parquet, exact-key reconciliation, repeatable January replacement and rollback. Default outputs are temporary; kept outputs require a new directory. The new deck is full coverage for A2 and partial context for A1/A3/A5/A6. This post-audit addition brings the visible resource catalog to 386, including 35 decks.

`npm run test:architecture` opens an isolated local fixture and Chrome profile with actual 1280px/390px device emulation. It checks controls remain clickable beside shared search, slide/contents navigation, reading mode, responsive side-card placement/defaults, card toggles/navigation persistence, answer/print state and downloadable lab files. It writes screenshots to the OS temporary directory. The shared search launcher sits above standalone deck controls; the tracker keeps its existing placement.

### Data map authoring and checks

Edit `content/data-landscape.cjs`, then run `npm run build:map`. The builder validates source and relationship identities and generates `ae-tracker/data-landscape-data.js` plus `docs/reference/data-landscape.md`. `node scripts/build-data-landscape.cjs --check` checks that both outputs match the source. Each entry needs a purpose group, type, summary, definition, reason, distinction, caveat, source IDs, labeled related terms and a lesson mapping. Example stack arrows are labeled relationships, not claims that every brand/version combination is interoperable.

`npm test` validates catalog integrity, aliases, combined filters, incoming/outgoing relationships and reproducible generation. `npm run test:map` uses an isolated fixture and Chrome profile with actual desktop/390px phone emulation to check navigation, filters, comparison panels, deep links, Escape/back/focus behavior, related lessons, both themes and unchanged personal progress. Screenshots go to the OS temporary directory. Approved and deployed to Firebase Hosting on 2026-10-22 as build `2026-10-22.2`, including compact detail panels.

The architecture content module includes an editorial inventory of tool/format introductions. `architecture-content.test.cjs` checks that later edits do not use an inventoried name before its explanation, that every introduction has a reference card, that lesson/lab section identities remain stable, and that generated HTML/Markdown stay current. Definitions are beside the prose on desktop and collapsed below it on screens up to 1050px; only the first card starts expanded on desktop and readers can toggle any card. Initial responsive defaults are set once so navigation preserves choices. The Markdown and shared search include all card definitions. Source details can be expanded for each section; print opens them alongside tool cards and practice answers and restores each previous state afterward.

### Python API JSON walkthrough (2026-10-26, local)

The files-and-streams deck now includes lesson **12A**, “Nested API JSON: parse and flatten selected fields,” immediately after atomic writes. Its stable anchor is `#slide-52`; existing `slide-1` through `slide-51` retain their meanings and lesson numbers. The catalog counts 52 lessons; the toolbar counts all 54 rendered pages, including the two introductory Why sections. The companion Markdown includes the same input, code, output, API-fetch example and practice. Shared search was rebuilt. This addition has not been deployed.

The examples were executed with Python 3.13.7: exact two-row output, missing/null/empty addresses, omitted optional fields, empty input, required ID failure and invalid address types. The API-fetch snippet was checked against a temporary localhost HTTP server. Desktop/390px Chrome checks cover direct links, preserved neighboring anchors, actual page count, Contents search, Copy, expandable API code, reading mode and horizontal overflow.

### Detailed SCD Types 3, 4 and 6 (2026-10-27, local)

The Dimension tables deck now has 26 lessons plus its two introductory Why sections. Six worked sections appear immediately after the SCD overview: 9A/9B (Type 3), 9C/9D (Kimball Type 4 mini-dimensions), 9E/9F (Type 6). Stable anchors are `slide-21` through `slide-26`; original `slide-1` through `slide-20` retain their meanings. The toolbar counts all 28 pages. Overview rows link to their walkthroughs. No learning-progress identities changed. This revision has not been deployed.

Author `content/dimension-scd.cjs`, then run `npm run build:scd` and `npm run build:search`. The renderer updates a marked region in the existing HTML shell, a Markdown supplement, and an in-memory DuckDB lab. `node scripts/build-dimension-scd.cjs --check` verifies reproducibility. The supplement is a catalog extra rather than a full Markdown companion, so shared search continues indexing all original HTML lessons. The lesson panel links both the notes and runnable lab.

Primary sources are Kimball’s individual Type 3/4/6 technique pages, the 2005 hybrid discussion, Design Tip 152 and durable-key/factless-fact references. Teaching schemas are independent, synthetic extensions of Leafy, each with one fact per order and 107 of sales. Types 3 and 6 include guards for identical replays; the Type 6 example assumes strictly forward, date-grain changes. Retroactive correction and concurrent loads are explicitly outside the lab.

Verification: DuckDB 1.5.6 executed every displayed SQL block via the generated lab, asserting alternative-map/profile/city totals, reuse of profile tuples, replay, date boundaries, rollback, a third city and Type 6 invariants. `npm test` checks generation and stable links; `npm run test:scd` checks all six slides at 1280px/390px, displayed SQL parity, neighboring anchors, overview/Contents links, reading/print state, notes/lab downloads, lesson-panel links and search coverage.
