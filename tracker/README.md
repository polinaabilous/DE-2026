# DE Roadmap

**Data map:** open [the reference on the live tracker](https://de-roadmap.web.app/#data-map). Locally, use `#data-map` when serving `de-tracker/`, or `tracker/de-tracker/#data-map` when serving the repository root. The reference groups 112 tools, formats and concepts by purpose, with search, common comparisons, example stacks and a side panel linking related terms and lessons. Its content is read-only and does not change your learning progress. Published on 2026-10-22, including the compact detail panels.

**[Open the tracker](https://de-roadmap.web.app)** and sign in with `polinaa.bilous@gmail.com` on your phone or computer.

Notes, daily logs, to dos, lesson checks, stage progress, resource checks and practice progress sync automatically. **Cloud saved** means the server has accepted your changes. Offline edits stay on the device and sync when connectivity returns. Use **Your data → Export JSON** for a full cloud backup, or **Notes as Markdown** for readable notes.

**[Trackers → DataLemur](https://de-roadmap.web.app/#trackers/datalemur)** contains 54 public SQL problems, with one or two broad topics per problem. Search or use compact difficulty, status and topic filters. Mark each problem Not Started, Completed or Needs Review; keep Markdown notes or solution snippets. Compact rows keep more problems visible. The tracker can export your filtered progress as CSV. DataLemur submissions are not imported automatically.

**[Trackers → LeetCode SQL 50](https://de-roadmap.web.app/#trackers/leetcode-sql50)** contains all 50 official study-plan problems, in their original order, with nine broad topics. It shares the same statuses, notes, filters, exports and cloud storage. Search by title, problem number or original section. Each tool keeps its own progress; LeetCode submissions are not imported automatically. [Catalog source and refresh instructions](content/sql/leetcode-sql50/README.md).

**Search decks:** use the floating button on the tracker or any HTML deck, the search icon in a lesson panel, or **⌘K / Ctrl+K** outside text editors. Search concepts or questions such as “CTE vs subquery” and “ROWS vs RANGE.” Results highlight matching passages, expand for reading, and link to the source slide or Markdown. All 34 registered decks/guides are included; older HTML-only decks remain searchable. Search runs in the browser, loads its static index only when opened, and uses no AI API, search subscription or database queries. It never reads or saves personal notes or progress.

**Recently opened decks:** Topics, Roadmap, Resources and Dashboard show your four latest decks or guides. Opens from lessons, search and direct HTML-deck links count automatically; opening never marks a deck done. History is included in normal saves and cloud sync when you return to the tracker. Tracking starts with this feature; earlier browser history is not imported. Deployed on 2026-10-26 as build `2026-10-26.1`.

Your existing folder data has been migrated. The original files in `de-tracker-data/` and the private pre-migration backup in `backups-private/` remain intact. Folder saving is available locally while signed out. Cloud mode and folder mode are separate.

- [Study plan](data-engineer-prep-plan.md)
- [Project brief, reading map and deck planning](planning/README.md)
- [Development and code structure](docs/development.md)
- [Firebase hosting and data](FIREBASE.md)
- [Original tracker review](docs/tracker-review-2026-10-05.md)

**Resources** has two views. **By lesson** lists each lesson's decks, labs, picks and everything else tagged to it. **Library** starts with a *Now* bar — the book you're reading with your progress note, and quick picks (deck → article → video) for your current lesson — then colour-coded format and time filters and three shelves: quick learning, long reads (one in progress at a time) and things to follow. The study decks are published with the app in `de-tracker/decks/`. Browse them through Topics or the Library.

**Topics** lists every lesson by learning area and chapter. **Roadmap** shows the learning path: each row's lessons unlock the next portfolio stage, career milestone or checkpoint. Open a lesson or stage to see what to learn, how to practise, its portfolio connection and its checks.

For local use, serve the **repository root**, then open `http://127.0.0.1:8000/tracker/de-tracker/`. Decks and the hosted Flight Reliability brief also work when serving only the app. The offline DataLemur catalog lives in `content/sql/datalemur/`, so serve the repository root or `tracker/` to open it:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

From `tracker/`, serving only `de-tracker/` also works (decks included); the offline catalog link will not resolve:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory de-tracker
```

With that variant, open `http://127.0.0.1:8000`. The local app supports direct opening of `de-tracker/index.html` for folder/browser mode in Chrome or Edge.
