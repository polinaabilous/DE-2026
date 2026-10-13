# AE Roadmap

**[Open the tracker](https://ae-roadmap-dc348858.web.app)** and sign in with `polinaa.bilous@gmail.com` on your phone or computer.

Notes, daily logs, to dos, ratings, resource checks and practice progress sync automatically. **Cloud saved** means the server has accepted your changes. Offline edits stay on the device and sync when connectivity returns. Use **Your data → Export JSON** for a full cloud backup, or **Notes as Markdown** for readable notes.

**[Trackers → DataLemur](https://ae-roadmap-dc348858.web.app/#trackers/datalemur)** contains 54 public SQL problems, with one or two broad topics per problem. Search or use compact difficulty, status and topic filters. Mark each problem Not Started, Completed or Needs Review; keep Markdown notes or solution snippets. Compact rows keep more problems visible. The tracker can export your filtered progress as CSV. DataLemur submissions are not imported automatically.

Your existing folder data has been migrated. The original files in `ae-tracker-data/` and the private pre-migration backup in `backups-private/` remain intact. Folder saving is available locally while signed out. Cloud mode and folder mode are separate.

- [Study plan](analytics-engineer-prep-plan.md)
- [Development and code structure](docs/development.md)
- [Firebase hosting and data](FIREBASE.md)
- [Original tracker review](docs/tracker-review-2026-10-05.md)

For local use, serve the entire `ae-tracker/` directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory ae-tracker
```

Open `http://127.0.0.1:8000`. The local app supports direct opening of `ae-tracker/index.html` for folder/browser mode in Chrome or Edge.
