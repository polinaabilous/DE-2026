# Development

The app is a small static website with no build step. Its script files use explicit browser namespaces so the local version can still open directly from a file. Modules receive their plan, storage helpers or current-state getter as dependencies; they do not reach into the app controller's state.

| File in `ae-tracker/` | Responsibility |
| --- | --- |
| `index.html`, `styles.css` | Page shell, navigation and visual styles |
| `data.js` | Curriculum and resource definitions |
| `utils.js` | Shared escaping, dates, IDs, filenames and downloads |
| `state.js` | State defaults and legacy schema/curriculum migrations |
| `progress.js` | Roadmap index, ratings and progress calculations |
| `resources.js` | Resource catalog and completion rules |
| `editor.js` | Safe Markdown rendering, formatting toolbar, Markdown links and keyboard/list editing |
| `plan-views.js` | Roadmap, skills map and shared topic cards |
| `practice-data.js` | Public SQL problem catalog and curated broad topics and original tag provenance |
| `practice.js` | Tool registry, practice filters, three progress statuses and problem notes |
| `store.js` | Optional local folder adapter and Markdown file format |
| `cloud-core.js` | Cloud record serialization and durable pending-change model |
| `cloud.js` | Firebase authentication, account cache, sync and reconnects |
| `firebase-config.js` | Public Firebase web configuration |
| `app.js` | Remaining views, routing, events, drafts and persistence coordination |

`getState()` is deliberately a function: imports, folder reloads and account switches replace the current state object. Holding a reference to the initial object would leave calculations and views showing another version of the data.

Shared Markdown rendering and editing serve notes, daily logs and practice notes. Bare HTTP(S) URLs and `[label](url)` links are clickable; the Link button and Cmd/Ctrl+K insert editable Markdown. HTTP(S) and mailto destinations are allowed; script/data URLs are rendered as text. URLs inside code remain literal. Date/identity helpers are shared with folder exports. Account changes and data restores clear all editor drafts; incoming cloud updates preserve drafts for the current account.

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

Hosting publishes only `ae-tracker/`. Tests, scripts, notes, backups and CLI credentials are outside that directory. Generated logs and deployment caches are ignored by Git.

## Saved-folder backup

```sh
npm run backup
```

This exports **the saved folder**, not the latest cloud state, to a new timestamped private JSON file. It does not overwrite the original migration backup. For a current cloud backup, use the app's **Export JSON** button.

The completed one-time project-creation and account-migration scripts were removed after deployment. The historical review lives in `docs/`; the study plan remains at the tracker root.
