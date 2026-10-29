const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  const ctx = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
  for (const name of ['data', 'utils', 'state', 'progress', 'resources', 'editor', 'plan-views', 'store']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../de-tracker', name + '.js'), 'utf8'), ctx);
  }
  const plan = ctx.window.PLAN;
  const model = ctx.AEState.create(plan, ctx.window.AEStore);
  let state = model.blank();
  const roadmap = ctx.AEProgress.create(plan, () => state);
  const resources = ctx.AEResources.create(plan, roadmap, () => state);
  const views = ctx.AEPlanViews.create({ plan, roadmap, resources, getState: () => state });
  return { ctx, plan, model, roadmap, resources, views, state: () => state, replace: next => state = next };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('every lesson is on the roadmap once, after its prerequisites; all resources resolve', () => {
  const { plan, roadmap, resources } = fixture();
  const lessons = Object.keys(plan.items).filter(roadmap.isLesson);
  assert.equal(roadmap.order.length, lessons.length);
  assert.equal(new Set(roadmap.order).size, roadmap.order.length);
  // Position of a lesson or stage in roadmap order (stages sit at the end of their row).
  const pos = id => roadmap.isStage(id) ? roadmap.rows.indexOf(roadmap.rowOf[id]) + 0.9 : roadmap.rows.indexOf(roadmap.rowOf[id]) + roadmap.order.indexOf(id) / 1000;
  for (const id of roadmap.order) {
    for (const pre of plan.items[id].prerequisites || []) {
      assert.ok(roadmap.rowOf[pre] && pos(pre) < pos(id), `${id} requires ${pre} earlier`);
    }
  }
  for (const s of plan.stages) {
    for (const pre of [...s.req, ...s.after]) assert.ok(pos(pre) < pos(s.id), `${s.id} requires ${pre} earlier`);
  }
  for (const id of Object.keys(plan.items)) {
    for (const entry of plan.items[id].learn) {
      const resolved = resources.resolve(entry);
      assert.ok(resolved.title && resolved.kind, `${id}: ${entry}`);
      if (typeof entry === 'string') assert.ok(plan.L[entry.split('|')[0]], `${id}: ${entry}`);
    }
  }
});

test('legacy curriculum migration preserves evidence and runs only once', () => {
  const { model } = fixture();
  const legacy = { v: 4, setupV: 2, curriculumV: 3,
    r: { PF2: [3, 2, 3, 2], S1: [3, 2] }, pc: { SETUP: [true, false] },
    g: { 'apply-0': true, 'apply-1': true }, rc: { S1: { pgWindow: true } },
    notes: [{ id: 'n1', track: 'sql', text: 'SQL\nSELECT 1;', c: '2026-10-05' }],
    log: [{ d: '2026-10-05', h: 1.5, role: 'P', note: 'Practiced joins', custom: true }] };
  const next = model.migrate(structuredClone(legacy));
  assert.deepEqual(plain(next.r.PF2), [0, 2, 0, 2]);
  assert.deepEqual(plain(next.curriculumHistory[0].r.PF2), legacy.r.PF2);
  assert.deepEqual(plain(next.rc), legacy.rc);
  assert.deepEqual(plain(next.pc.SETUP), legacy.pc.SETUP);
  assert.equal(next.log[0].custom, true);
  assert.match(next.log[0].text, /Practiced joins.*\n\n1.5h/s);
  assert.deepEqual(plain(model.migrate(structuredClone(next))), plain(next));
});

test('v2 free-text and v3 typed notes migrate without losing commands or code', () => {
  const { model } = fixture();
  const next = model.migrate({ notes: { S1: 'Window frames\n`ROWS`' }, kb: { Py1: [
    { id: 'snippet', t: 'snippet', q: 'Generator', lang: 'python', a: 'yield row', tags: ['streaming'] }
  ] } });
  assert.equal(next.notes.length, 2);
  assert.equal(next.notes[0].track, 'sql');
  assert.equal(next.notes[1].track, 'py');
  assert.match(next.notes[1].text, /```python\nyield row\n```/);
  assert.match(next.notes[1].text, /#streaming/);
  assert.equal(next.kb, undefined);
});

test('legacy multiline to dos retain fields and duplicate identities are repaired', () => {
  const { model } = fixture();
  const next = model.migrate({ todo: [
    { id: 'same', text: 'Try dbt\nThen test it', track: 'dbt', custom: 7, done: true },
    { id: 'same', text: 'Read more', track: 'unknown' }
  ] });
  assert.equal(next.todo[0].text, 'Try dbt\nThen test it');
  assert.equal(next.todo[0].custom, 7);
  assert.equal(next.todo[0].done, true);
  assert.notEqual(next.todo[0].id, next.todo[1].id);
  assert.equal(next.todo[1].track, 'general');
});

test('progress and views read the latest state after an import or account switch', () => {
  const { model, roadmap, views, replace, plan } = fixture();
  assert.equal(roadmap.isDone('S1'), false);
  const next = model.migrate({ r: { S1: plan.items.S1.dod.map(() => 2) } });
  replace(next);
  assert.equal(roadmap.isDone('S1'), true);
  assert.match(views.lessonButton('S1'), /road-lesson done/);
  replace(model.blank());
  assert.equal(roadmap.isDone('S1'), false);
  assert.match(views.lessonButton('S1'), /class="road-lesson "/);
  assert.equal(roadmap.required.length, roadmap.lessons.filter(id => !plan.items[id].opt).length);
});

test('library completion stays consistent with topic resource checks', () => {
  const { state, resources, replace, model } = fixture();
  state().rc.S1 = { pgWindow: true }; state().lib.pgWindow = 'later';
  assert.equal(resources.libDone('pgWindow'), true);
  assert.equal(resources.libLater('pgWindow'), false);
  resources.setLibDone('pgWindow', false);
  assert.equal(resources.libDone('pgWindow'), false);
  assert.equal(state().rc.S1.pgWindow, undefined);
  resources.setLibDone('pgWindow', true);
  assert.equal(state().lib.pgWindow, 'done');
  replace(model.blank());
  assert.equal(resources.libDone('pgWindow'), false);
  assert.equal(new Set(resources.LIB.map(x => x.key)).size, resources.LIB.length);
});

test('shared Markdown renders nested lists and keeps HTML and code literal', () => {
  const { ctx } = fixture();
  const html = ctx.AEEditor.mdBlock('**SQL**\n- Window frames\n  3. Nested item\n\n```sql\nSELECT "<img>";\n```\n<img src=x onerror=alert(1)>');
  assert.match(html, /<b>SQL<\/b>/);
  assert.match(html, /<ul><li>Window frames<ol start="3"><li>Nested item/);
  assert.match(html, /SELECT &quot;&lt;img&gt;&quot;;/);
  assert.ok(!html.includes('<img'));
  assert.equal(ctx.AEEditor.inl('`**literal**`'), '<code>**literal**</code>');
});

test('Markdown folder export round-trips note text, identity and fenced headings', () => {
  const { ctx } = fixture();
  const note = { id: 'roundtrip', track: 'sql', text: 'SQL commands\n## A body heading\n```sql\n## inside code\nSELECT 1;\n```', c: '2026-10-05', u: '2026-10-06', topic: 'S1' };
  const store = ctx.window.AEStore;
  const result = store.parseMd(store.fileMd('sql', 'Advanced SQL', [note]));
  assert.equal(result.track, 'sql');
  const { track, ...expected } = note;
  assert.deepEqual(plain(result.notes[0]), expected);
});

test('Markdown links render safely, retain formatted labels and do not link code', () => {
  const { ctx } = fixture(), render = ctx.AEEditor.mdBlock;
  const html = render('[**Kaggle** Python](https://www.kaggle.com/learn/python)\nhttps://example.com/?a=1&b=2.\n[Parentheses](https://en.wikipedia.org/wiki/Python_(programming_language))\n[Email](mailto:person@example.com)');
  assert.match(html, /href="https:\/\/www.kaggle.com\/learn\/python"[^>]*><b>Kaggle<\/b> Python<\/a>/);
  assert.match(html, /href="https:\/\/example.com\/\?a=1&amp;b=2"/);
  assert.match(html, /href="https:\/\/en.wikipedia.org\/wiki\/Python_\(programming_language\)"/);
  assert.match(html, /href="mailto:person@example.com"/);
  assert.equal((html.match(/<a /g) || []).length, 4);
  assert.equal(ctx.AEEditor.inl('`https://example.com`'), '<code>https://example.com</code>');
  assert.equal(ctx.AEEditor.inl('`[label](https://example.com)`'), '<code>[label](https://example.com)</code>');
  assert.ok(!render('```text\n[code](https://example.com)\n```').includes('<a '));
  for (const value of ['[run](javascript:alert(1))', '[run](data:text/html,script)', '[run](vbscript:msgbox(1))', '[run](//example.com)', '[run](https://example.com/" onclick="alert(1))']) {
    const unsafe = render(value); assert.ok(!unsafe.includes('<a '), value);
  }
  assert.ok(!render('[<img src=x onerror=alert(1)>](https://example.com)').includes('<img'));
  assert.match(ctx.AEEditor.inl('(https://example.com/path).'), /<a [^>]*>https:\/\/example.com\/path<\/a>\)\./);
});
