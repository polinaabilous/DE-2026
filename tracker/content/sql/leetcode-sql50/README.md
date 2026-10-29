# LeetCode SQL 50 catalog

The tracker includes all 50 problems in the [official SQL 50 study plan](https://leetcode.com/studyplan/top-sql-50/), preserving the original section and problem order. The imported catalog contains 32 Easy, 17 Medium and 1 Hard problem across seven official sections.

- `problems.json`: official problem numbers, titles, slugs, difficulties and section names retrieved from LeetCode's public `studyPlanV2Detail` GraphQL query. The source endpoint, query, extraction time and method are recorded in the file.
- `topics.json`: editorial mapping to nine broad topics, with one or two topics per problem. These labels describe plausible solving approaches, not official LeetCode question tags. The original `section` remains separate and `tags` is empty because individual question tags were not imported.

No problem statements, solutions, private company tags, account information or submissions are copied. The tracker links to the original problem pages. Progress is entered manually with Not Started, Completed and Needs Review; notes use the shared Markdown editor and existing cloud/folder storage.

The live route is [Trackers → LeetCode SQL 50](https://de-roadmap.web.app/#trackers/leetcode-sql50). Search accepts title, number, original section and broad topic. Difficulty, status and topic filters work as in DataLemur. CSV exports include problem number and official section; unavailable company metadata remains blank.

To refresh, run the recorded public query, update the metadata snapshot, and review the topic mapping against its exact problem IDs. The page itself may present an automated-browser challenge; no signed-in browser or session cookies are required for the recorded public API query. From the repository root, rebuild both hosted catalogs together:

```sh
node tracker/scripts/build-practice-catalog.cjs
```

The builder validates the 50-problem membership, unique slugs, topic mapping and official URLs. Keep tool ID `leetcode-sql50` and each problem slug stable: saved progress is keyed as `leetcode-sql50:<slug>`, independently from `datalemur:<slug>`.
