const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../ae-tracker/deck-history.js');
const { create, catalog } = globalThis.AEDeckHistory;
const memoryStorage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('standalone opens queue across tabs, deduplicate and acknowledge without losing a newer open', () => {
  const storage = memoryStorage(); let at = 1000;
  const tracker = create({ storage, now: () => ++at }), deck = create({ storage, now: () => ++at });
  deck.record('sql-window-functions');
  const pending = tracker.read();
  deck.record('sql-window-functions');deck.record('python-foundations');
  tracker.acknowledge(pending);
  assert.deepEqual(tracker.read(), { 'python-foundations': 1003, 'sql-window-functions': 1002 });
  tracker.acknowledge(tracker.read());
  assert.deepEqual(deck.read(), {});
});
test('account switches isolate queued opens and unavailable/corrupt storage does not break the app', () => {
  const storage = memoryStorage(), h = create({ storage, now: () => 1000 });
  h.record('local-deck');h.setAccount('alice');h.record('alice-deck');h.setAccount('bob');
  assert.deepEqual(h.read(), {});h.record('bob-deck');
  h.setAccount('alice');assert.deepEqual(h.read(), { 'alice-deck': 1000 });
  h.setAccount(null);assert.deepEqual(h.read(), { 'local-deck': 1000 });
  storage.setItem('ae-deck-opens-v1:local', '{bad json');assert.deepEqual(h.read(), {});
  storage.setItem('ae-deck-opens-v1:local', '{"constructor":5,"valid":-1,"too-big":9000000000000000}');
  assert.deepEqual(h.read(), {});
  const blocked=create({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('full')}},now:()=>2000});
  blocked.record('sql-aggregation');assert.deepEqual(blocked.read(), {'sql-aggregation':2000});
  blocked.clear();assert.deepEqual(blocked.read(), {});
});
test('recent decks use the current catalog, newest first, and URL matching ignores external lookalikes and labs', () => {
  const decks={one:{file:'one/one.html',md:'one/one.md',title:'One'},two:{file:'two/two.html',title:'Two'}};
  const c=catalog(decks,'decks/','https://example.com/tracker/index.html');
  assert.equal(c.match('decks/one/one.html?x=1#slide-8'),'one');
  assert.equal(c.match('decks/one/one.md'),'one');
  assert.equal(c.match('https://other.example/tracker/decks/one/one.html'),null);
  assert.equal(c.match('decks/one/lab/README.md'),null);
  assert.equal(c.match('javascript:alert(1)'),null);
  assert.deepEqual(c.recent({one:1000,two:2000,removed:3000}).map(d=>d.id),['two','one']);
  assert.equal(c.recent({one:1000,two:2000},1).length,1);
});
test('all registered HTML decks record direct visits through the generated shared script', () => {
  const root=path.resolve(__dirname,'../ae-tracker'),ctx={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
  for(const [id,deck] of Object.entries(ctx.window.PLAN.decks)) {
    if(!deck.file.endsWith('.html'))continue;
    const html=fs.readFileSync(path.join(root,ctx.window.PLAN.deckBase+deck.file),'utf8');
    assert.ok(html.includes(`data-deck="${id}"`),id);
  }
});
