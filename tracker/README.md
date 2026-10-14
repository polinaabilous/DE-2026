# AE Roadmap

**[Open the tracker](https://ae-roadmap-dc348858.web.app)** and sign in with `polinaa.bilous@gmail.com` on your phone or computer.

Notes, daily logs, to dos, lesson checks, stage progress, resource checks and practice progress sync automatically. **Cloud saved** means the server has accepted your changes. Offline edits stay on the device and sync when connectivity returns. Use **Your data → Export JSON** for a full cloud backup, or **Notes as Markdown** for readable notes.

**[Trackers → DataLemur](https://ae-roadmap-dc348858.web.app/#trackers/datalemur)** contains 54 public SQL problems, with one or two broad topics per problem. Search or use compact difficulty, status and topic filters. Mark each problem Not Started, Completed or Needs Review; keep Markdown notes or solution snippets. Compact rows keep more problems visible. The tracker can export your filtered progress as CSV. DataLemur submissions are not imported automatically.

Your existing folder data has been migrated. The original files in `ae-tracker-data/` and the private pre-migration backup in `backups-private/` remain intact. Folder saving is available locally while signed out. Cloud mode and folder mode are separate.

- [Study plan](analytics-engineer-prep-plan.md)
- [Development and code structure](docs/development.md)
- [Firebase hosting and data](FIREBASE.md)
- [Original tracker review](docs/tracker-review-2026-10-05.md)

**Resources** has two views. **By lesson** lists each lesson's decks, labs, picks and everything else tagged to it. **Library** starts with a *Now* bar — the book you're reading with your progress note, and quick picks (deck → article → video) for your current lesson — then colour-coded format and time filters and three shelves: quick learning, long reads (one in progress at a time) and things to follow. The study decks are published with the app in `ae-tracker/decks/`; [`docs/README.md`](../docs/README.md) indexes them by area.

**Topics** lists every lesson by learning area and chapter. **Roadmap** shows the learning path: each row's lessons unlock the next portfolio stage, career milestone or checkpoint. Open a lesson or stage to see what to learn, how to practise, its portfolio connection and its checks.

For local use, serve the **repository root**, then open `http://127.0.0.1:8000/tracker/ae-tracker/`. Deck links work from either root; the project brief and offline DataLemur catalog in `docs/` need the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Serving only `ae-tracker/` also works (decks included); only the two `docs/` links will not resolve:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory ae-tracker
```

With that variant, open `http://127.0.0.1:8000`. The local app supports direct opening of `ae-tracker/index.html` for folder/browser mode in Chrome or Edge.
