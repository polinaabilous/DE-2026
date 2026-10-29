# AE Roadmap

**Data map:** open [the reference on the live tracker](https://ae-roadmap-dc348858.web.app/#data-map). Locally, use `#data-map` when serving `ae-tracker/`, or `tracker/ae-tracker/#data-map` when serving the repository root. The reference groups 112 tools, formats and concepts by purpose, with search, common comparisons, example stacks and a side panel linking related terms and lessons. Its content is read-only and does not change your learning progress. Published on 2026-10-22, including the compact detail panels. [Markdown companion](../docs/reference/data-landscape.md).

**[Open the tracker](https://ae-roadmap-dc348858.web.app)** and sign in with `polinaa.bilous@gmail.com` on your phone or computer.

Notes, daily logs, to dos, lesson checks, stage progress, resource checks and practice progress sync automatically. **Cloud saved** means the server has accepted your changes. Offline edits stay on the device and sync when connectivity returns. Use **Your data → Export JSON** for a full cloud backup, or **Notes as Markdown** for readable notes.

**[Trackers → DataLemur](https://ae-roadmap-dc348858.web.app/#trackers/datalemur)** contains 54 public SQL problems, with one or two broad topics per problem. Search or use compact difficulty, status and topic filters. Mark each problem Not Started, Completed or Needs Review; keep Markdown notes or solution snippets. Compact rows keep more problems visible. The tracker can export your filtered progress as CSV. DataLemur submissions are not imported automatically.

**[Trackers → LeetCode SQL 50](https://ae-roadmap-dc348858.web.app/#trackers/leetcode-sql50)** contains all 50 official study-plan problems, in their original order, with nine broad topics. It shares the same statuses, notes, filters, exports and cloud storage. Search by title, problem number or original section. Each tool keeps its own progress; LeetCode submissions are not imported automatically. [Catalog source and refresh instructions](../docs/sql/leetcode-sql50/README.md).

**Search decks:** use the floating button on the tracker or any HTML deck, the search icon in a lesson panel, or **⌘K / Ctrl+K** outside text editors. Search concepts or questions such as “CTE vs subquery” and “ROWS vs RANGE.” Results highlight matching passages, expand for reading, and link to the source slide or Markdown. All 34 registered decks/guides are included; older HTML-only decks remain searchable. Search runs in the browser, loads its static index only when opened, and uses no AI API, search subscription or database queries. It never reads or saves personal notes or progress.

**Recently opened decks:** Topics, Roadmap, Resources and Dashboard show your four latest decks or guides. Opens from lessons, search and direct HTML-deck links count automatically; opening never marks a deck done. History is included in normal saves and cloud sync when you return to the tracker. Tracking starts with this feature; earlier browser history is not imported. Deployed on 2026-10-26 as build `2026-10-26.1`.

Your existing folder data has been migrated. The original files in `ae-tracker-data/` and the private pre-migration backup in `backups-private/` remain intact. Folder saving is available locally while signed out. Cloud mode and folder mode are separate.

- [Study plan](analytics-engineer-prep-plan.md)
- [Development and code structure](docs/development.md)
- [Firebase hosting and data](FIREBASE.md)
- [Original tracker review](docs/tracker-review-2026-10-05.md)

**Resources** has two views. **By lesson** lists each lesson's decks, labs, picks and everything else tagged to it. **Library** starts with a *Now* bar — the book you're reading with your progress note, and quick picks (deck → article → video) for your current lesson — then colour-coded format and time filters and three shelves: quick learning, long reads (one in progress at a time) and things to follow. The study decks are published with the app in `ae-tracker/decks/`; [`docs/README.md`](../docs/README.md) indexes them by area.

**Topics** lists every lesson by learning area and chapter. **Roadmap** shows the learning path: each row's lessons unlock the next portfolio stage, career milestone or checkpoint. Open a lesson or stage to see what to learn, how to practise, its portfolio connection and its checks.

For local use, serve the **repository root**, then open `http://127.0.0.1:8000/tracker/ae-tracker/`. Decks and the hosted Flight Reliability brief work from either root; the offline DataLemur catalog in `docs/` needs the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Serving only `ae-tracker/` also works (decks included); only the two `docs/` links will not resolve:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory ae-tracker
```

With that variant, open `http://127.0.0.1:8000`. The local app supports direct opening of `ae-tracker/index.html` for folder/browser mode in Chrome or Edge.
