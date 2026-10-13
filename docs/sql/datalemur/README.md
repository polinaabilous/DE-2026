# DataLemur problem tags

Snapshot: 2026-10-06T20:11:11.065Z

Source: [DataLemur public catalog](https://datalemur.com/questions).

- [Browse the searchable catalog](index.html). Opens locally and works offline.
- [All problems CSV](problems.csv): 106 rows, one per problem.
- [SQL CSV](problems-sql.csv): 54 rows.
- [JSON](problems.json): arrays of exact tag names, source, extraction time, and per-tag validation/counts.

CSV columns: id, title, company, category, difficulty, tags, url. Multiple tags use ` | ` as the separator. CSVs include a UTF-8 BOM for spreadsheet compatibility.

## How it was extracted

An isolated, signed-out Chrome browser opened the normal questions page through Chrome DevTools Protocol. The public page's catalog state supplied the problem metadata and available tag controls. For each tag, automation deselected the previous tag, selected the next one, and read the exact public list response used by the browser. Every displayed problem URL was compared with that response. All 22 checks passed; no solutions or problem statements were extracted.

## Coverage limits

All problems returned by the public signed-out catalog, across all categories. No private session or premium problem content accessed.

Sidebar badges can exceed the number of problems returned by the corresponding public filter. Those additional problem identities and tag memberships were not returned, so this export does not claim to cover the full premium catalog.

An empty tags array means no membership was returned by any available public tag filter; it does not infer the problem has no topics. 52 records have empty tag arrays. Tags reflect the site's taxonomy, which can mix SQL topics, approaches, and book references. Do not treat them as a complete taxonomy of everything a problem might teach.

The JSON tag records preserve both the sidebar badge counts and the accessible counts, together with the exact accessible problem slugs. Counts are a snapshot and can change.

## Refresh

Requires Node.js 22 or newer and Google Chrome installed. No npm packages or DataLemur credentials are needed. From the repository root:

```sh
node scripts/export-datalemur.cjs
```

On systems where Chrome is installed elsewhere, set `CHROME_PATH` to its executable. An optional first argument chooses the export folder. The script uses a temporary browser profile and closes it afterward. It validates all tag results before overwriting the snapshot; schema changes or access failures stop the extraction with an error.
