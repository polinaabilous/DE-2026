const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const data = require('../content/data-landscape.cjs');
const app = path.resolve(__dirname, '../de-tracker');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(app, 'data-landscape.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(app, 'data.js'), 'utf8'), context);
const model = context.AELandscape.index(data);
const ids = options => Array.from(model.search(options), e => e.id);

test('reference entries have traceable sources and valid relations, lessons and deck links', () => {
  assert.ok(data.entries.length >= 100);
  assert.equal(model.entries.size, data.entries.length);
  for (const e of data.entries) {
    assert.ok(data.groups.some(g => g.id === e.group));
    assert.ok(e.sources.length && e.related.length && e.lessons.length, e.id);
    for (const field of ['what', 'why', 'difference', 'good']) assert.ok(e[field], `${e.id}: ${field}`);
    e.sources.forEach(id => assert.ok(data.sources[id]?.url.startsWith('https://'), `${e.id}: ${id}`));
    e.related.forEach(r => assert.ok(model.entries.has(r.to) && r.to !== e.id && r.label, `${e.id}: ${r.to}`));
    e.lessons.forEach(id => assert.ok(context.window.PLAN.items[id], `${e.id}: lesson ${id}`));
  }
  for (const group of data.groups) for (const id of group.decks) {
    const deck = context.window.PLAN.decks[id];
    assert.ok(deck, id); assert.ok(fs.existsSync(path.join(app, context.window.PLAN.deckBase, deck.file)));
  }
});

test('map search recognizes aliases, purpose and combined filters without mutating data', () => {
  const before = JSON.stringify(data);
  for (const [query, id] of [['HMS', 'hms'], ['PrestoSQL', 'trino'], ['NDJSON', 'jsonl'], ['GCS', 'gcs'], ['K8s', 'kubernetes'], ['schema evolution', 'schema-evolution'], ['rerun', 'idempotency']]) assert.ok(ids({ query }).includes(id), query);
  assert.ok(ids({ query: 'columnar', kind: 'format' }).includes('parquet'));
  assert.ok(model.search({ kind: 'format' }).every(e => e.kind === 'format'));
  const hiveEngines = model.search({ query: 'Hive', kind: 'tool', group: 'compute' });
  assert.ok(hiveEngines.some(e => e.id === 'hive'));
  assert.ok(hiveEngines.every(e => e.kind === 'tool' && e.group === 'compute'));
  assert.ok(!hiveEngines.some(e => e.id === 'hms'), 'catalog results obey the purpose filter');
  assert.deepEqual(ids({ query: 'unfindableabcxyz' }), []);
  assert.equal(JSON.stringify(data), before);
});

test('connection focus includes incoming references as well as outgoing relationships', () => {
  const nearby = ids({ focus: 'hms' });
  assert.ok(nearby.includes('hms'));
  assert.ok(nearby.includes('hive') && nearby.includes('trino'));
  assert.ok(nearby.includes('catalog'), 'incoming-only catalog relationship remains visible');
  assert.ok(!nearby.includes('ruff'), 'unrelated infrastructure is excluded');
  assert.ok(model.search({ focus: 'hms', kind: 'concept' }).every(e => e.kind === 'concept'));
});

test('reference browser data is generated consistently and registered locally', () => {
  execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/build-data-landscape.cjs'), '--check']);
  const generated = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(app, 'data-landscape-data.js'), 'utf8'), generated);
  assert.equal(JSON.stringify(generated.AELandscapeData), JSON.stringify(data));
  const html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
  assert.ok(html.includes('href="#data-map"'));
  assert.ok(html.indexOf('href="#data-map"') < html.indexOf('href="#dashboard"'));
  for (const asset of ['data-landscape-data.js', 'data-landscape.js', 'data-landscape.css']) assert.ok(html.includes(asset));
});
