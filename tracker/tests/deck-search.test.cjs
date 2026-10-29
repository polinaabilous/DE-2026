const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
require('../ae-tracker/deck-search-core.js');
const root = path.join(__dirname, '../ae-tracker');
const data = JSON.parse(fs.readFileSync(path.join(root, 'deck-search-index.json')));
const index = AEDeckSearch.createIndex(data);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const plan = context.window.PLAN;

test('search covers every registered deck/guide and links to real source sections', () => {
  assert.deepEqual(data.sources.map(s => s.id).sort(), Object.keys(plan.decks).sort());
  const sources = new Map(data.sources.map(s => [s.id, s]));
  const anchors = new Map();
  for (const source of data.sources) {
    assert.ok(data.passages.some(p => p.source === source.id), source.id);
    assert.equal(source.url, plan.deckBase + plan.decks[source.id].file);
    assert.ok(fs.existsSync(path.join(root, source.url)));
    if (source.mdUrl) assert.ok(fs.existsSync(path.join(root, source.mdUrl)));
    const html = source.url.endsWith('.html') ? fs.readFileSync(path.join(root, source.url), 'utf8') : '';
    anchors.set(source.id, new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1])));
  }
  for (const passage of data.passages) {
    assert.ok(sources.has(passage.source));
    assert.ok(passage.text.length > 0 && passage.text.length <= 2400);
    if (passage.anchor) assert.ok(anchors.get(passage.source).has(passage.anchor), `${passage.source}#${passage.anchor}`);
    assert.ok(!/^contents$/i.test(passage.heading), 'TOCs do not crowd out explanations');
  }
  assert.equal(sources.get('sql-window-functions').kind, 'slides', 'older decks remain searchable without Markdown');
});

test('study searches find explanations, examples, partial terms and common misspellings', () => {
  const expected = [
    ['CTE vs subquery', 'sql-query-structure'],
    ['What is the difference between ROWS and RANGE?', 'sql-time-analysis'],
    ['SCD2', 'dbt-incremental-snapshots'],
    ['pytest fixtures', 'python-quality-tooling'],
    ['qualfy', 'sql-aggregation'],
    ['recurs', 'sql-query-structure']
  ];
  for (const [query, source] of expected) assert.ok(index.search(query).results.slice(0, 3).some(p => p.source.id === source), query);
  assert.equal(index.search('zzzzqqqxxx').total, 0);
  assert.equal(index.search('the and how to').total, 0);
  const hits = index.search('SCD2').results;
  assert.equal(new Set(hits.map(p => p.source.id + '|' + (p.anchor || p.heading))).size, hits.length, 'one hit per source section');
  assert.ok(index.search('uv quick guide').results.some(p => p.source.url.endsWith('.md')), 'Markdown-only guides are searchable');
});

test('passage excerpts preserve literal source text and invalid indexes are rejected', () => {
  const text = 'A '.repeat(250) + 'ROW_NUMBER() < 3; <img src=x onerror=alert(1)> ' + 'B '.repeat(250);
  const snippet = AEDeckSearch.excerpt(text, ['row_number']);
  assert.ok(snippet.includes('ROW_NUMBER() < 3'));
  assert.ok(snippet.length < 300);
  assert.throws(() => AEDeckSearch.createIndex({ version: 9, sources: [], passages: [] }));
  assert.throws(() => AEDeckSearch.createIndex({ version: 1, sources: [], passages: [{ source: 'missing', text: 'test', heading: 'test' }] }));
});

test('generated search content and shared assets are current and reproducible', () => {
  execFileSync(process.execPath, [path.join(__dirname, '../scripts/build-deck-search.cjs'), '--check'], { stdio: 'pipe' });
});
