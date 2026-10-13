// Lessons, roadmap, portfolio stages, decks, resources and the ratings → checks migration.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = path.join(__dirname, '../ae-tracker');
function load(dataFile) {
  const ctx = vm.createContext({ window: {}, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(dataFile, 'utf8'), ctx);
  for (const name of ['utils', 'state', 'progress', 'resources', 'editor', 'plan-views', 'store']) {
    vm.runInContext(fs.readFileSync(path.join(app, name + '.js'), 'utf8'), ctx);
  }
  const plan = ctx.window.PLAN;
  const model = ctx.AEState.create(plan, ctx.window.AEStore);
  let state = model.blank();
  const roadmap = ctx.AEProgress.create(plan, () => state);
  const resources = ctx.AEResources.create(plan, roadmap, () => state);
  const views = ctx.AEPlanViews.create({ plan, roadmap, resources, getState: () => state });
  return { ctx, plan, model, roadmap, resources, views, state: () => state, replace: next => { state = next; } };
}
const fixture = () => load(path.join(app, 'data.js'));
// The v4 curriculum as committed before the rework; used to prove nothing was dropped.
const legacy = () => { const ctx = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(path.join(__dirname, 'fixtures/data-v4.js'), 'utf8'), ctx); return ctx.window.PLAN; };
const plain = value => JSON.parse(JSON.stringify(value));
const CODE = /\b(?:S[1-8]|P[1-5]|M[1-6]|D[1-5]|Py[1-6]|SB[1-5]|AF[1-4]|A[1-7]|Q[1-4]|BZ[1-5]|AI[1-7]|PL[1-7]|CM[1-4]|PF\d{1,2}|JOB[12]|IV[0-4]|SETUP|CERT)\b/;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');

test('no old topic, check, practice item, resource, setup step or prerequisite is lost', () => {
  const old = legacy(), { plan, roadmap } = fixture();
  const stageText = s => [s.name, s.desc || '', ...s.scope, s.boundary, s.output, s.files].join(' ');
  for (const [id, x] of Object.entries(old.items)) {
    const y = plan.items[id];
    assert.ok(y, `topic ${id} still exists`);
    assert.equal(y.name, x.name);
    assert.equal(!!y.opt, !!x.opt, `${id} keeps its optional flag`);
    assert.equal(y.dod.length, x.dod.length, `${id} keeps every check line`);
    assert.equal(y.practice.length, x.practice.length, `${id} keeps every practice item`);
    // Text is unchanged except where a topic code or phase name was replaced by a readable title.
    const same = (a, b, what) => assert.ok(a === b || (CODE.test(b) || /phase|step 1\.1|later stage/.test(b)) && !CODE.test(a), `${id} ${what} changed: ${b}`);
    same(y.c, x.c, 'description');
    x.dod.forEach((t, i) => same(y.dod[i], t, 'check ' + i));
    x.practice.forEach((t, i) => same(y.practice[i], t, 'practice ' + i));
    assert.deepEqual(plain(y.learn), plain(x.learn), `${id} keeps every resource`);
    assert.equal((y.setup || []).length, (x.setup || []).length, `${id} keeps its setup steps`);
    (x.setup || []).forEach((t, i) => same(y.setup[i], t, 'setup ' + i));
    if (roadmap.isLesson(id)) {
      assert.ok(roadmap.rowOf[id], `${id} is on the roadmap`);
      assert.ok(roadmap.areaOf(id), `${id} is in a learning area`);
      for (const pre of x.prerequisites || []) {
        const mapped = roadmap.sourceOf[pre] ? roadmap.sourceOf[pre].at(-1) : pre;
        assert.ok(y.prerequisites.includes(mapped), `${id} still requires ${pre}`);
      }
    } else {
      // Portfolio topics: every check and practice line is used by exactly one stage; the description is shown.
      const stages = roadmap.stagesFrom(id);
      assert.ok(stages.length, `${id} feeds a project stage`);
      const checks = stages.flatMap(s => s.checks.filter(c => typeof c === 'string' && c.startsWith(id + '|')));
      const tasks = stages.flatMap(s => s.tasks.filter(t => t.ref && t.ref.startsWith(id + '|')).map(t => t.ref));
      assert.deepEqual(plain(checks.sort()), plain(x.dod.map((_, i) => `${id}|${i}`).sort()), `${id} checks all reach a stage`);
      assert.deepEqual(plain(tasks.sort()), plain(x.practice.map((_, i) => `${id}|${i}`).sort()), `${id} practice items all reach a stage`);
      const desc = y.c.split(/(?<=[.?])\s/);
      assert.ok(desc.every(sentence => stages.some(s => roadmap.stageDesc(s).includes(sentence) || stageText(s).includes(sentence))), `${id} description is shown on its stage`);
      if (y.setup) assert.ok(stages.some(s => s.setup === id), `${id} setup is shown on a stage`);
      // Old portfolio prerequisites are covered by stage knowledge, earlier stages or their transitive prerequisites.
      const covered = new Set(), visit = s => { if (covered.has(s.id)) return; covered.add(s.id); s.req.forEach(r => covered.add(r)); s.after.forEach(a => visit(roadmap.stage(a))); };
      stages.forEach(visit);
      for (const pre of x.prerequisites || []) {
        const ok = roadmap.sourceOf[pre] ? roadmap.sourceOf[pre].some(st => covered.has(st)) : covered.has(pre);
        assert.ok(ok, `${id} prerequisite ${pre} is covered by its stages`);
      }
    }
  }
  assert.equal(plan.portfolio.question, old.portfolio.question);
  assert.deepEqual(plain(plan.skip), plain(old.skip));
  for (const [k, v] of Object.entries(old.L)) assert.deepEqual(plain(plan.L[k]), plain(v), `resource ${k}`);
  for (const k of Object.keys(old.LX)) assert.ok(plan.LX[k], `library extra ${k}`);
  // Old checkpoints keep their item count and keys, so saved ticks still apply.
  for (const st of old.stages) {
    for (const [key, g] of [['s' + st.n, st.gate], ...(st.apply ? [['apply', st.apply]] : [])]) {
      assert.equal(plan.checkpoints[key].items.length, g.items.length, `checkpoint ${key} keeps its items`);
      assert.ok(roadmap.rowOf['cp:' + key], `checkpoint ${key} is on the roadmap`);
    }
  }
});

test('every lesson sits in one chapter and one roadmap row; stage rows unlock their stage', () => {
  const { plan, roadmap } = fixture();
  const inAreas = plan.areas.flatMap(a => a.chapters.flatMap(c => c[2]));
  assert.equal(new Set(inAreas).size, inAreas.length);
  assert.deepEqual(plain([...inAreas].sort()), plain([...roadmap.lessons].sort()));
  for (const s of plan.stages) {
    assert.ok(roadmap.rowOf[s.id], `${s.id} is on the roadmap`);
    for (const id of s.req) assert.ok(roadmap.isLesson(id), `${s.id} requires lesson ${id}`);
    for (const id of s.after) assert.ok(roadmap.isStage(id), `${s.id} builds after stage ${id}`);
  }
  assert.deepEqual(plain(plan.road[0].rows.filter(r => r.stage).map(r => r.stage)), ['v1-frame', 'v1-ingest', 'v1-explore', 'v1-model', 'v1-marts', 'v1-release']);
  const flat = roadmap.rows.map(r => r.stage || (r.checkpoint && 'cp:' + r.checkpoint)).filter(Boolean);
  assert.ok(flat.indexOf('cp:apply') > flat.indexOf('v1-release'), 'Ready to apply follows the v1 release');
  for (const id of ['IV0', 'IV1', 'IV3', 'IV4']) assert.ok(roadmap.rows.some(r => r.milestone === id), `${id} is a career milestone`);
});

test('no topic codes appear in the Topics, Roadmap or side-panel interface', () => {
  const { plan, views, model, replace, roadmap } = fixture();
  replace(model.migrate({ curriculumV: 4, r: { S1: [3, 3, 3, 3, 3], PF1: [2, 2, 2, 2, 2] }, g: { 's1-0': true } }));
  const pages = [views.topics(), views.roadmap()];
  for (const id of [...roadmap.lessons, ...plan.stages.map(s => s.id)]) pages.push(views.panelHead(id, 'S1') + views.panelBody(id) + views.panelFoot(id));
  for (const html of pages) {
    const match = text(html).match(CODE);
    assert.equal(match, null, `code ${match && match[0]} rendered near: ${match && text(html).slice(Math.max(0, match.index - 60), match.index + 40)}`);
  }
});

test('ratings migrate to checks once; completion, gates and other progress are preserved', () => {
  const { plan, model, roadmap, replace } = fixture();
  const old = {
    v: 6, setupV: 2, curriculumV: 4,
    r: { S1: [3, 2, 2, 3, 2], S2: [2, 2, 2, 2, 2], S3: [3, 1, 0, 2], PF1: [3, 3, 2, 2, 3], PF3: [2, 2, 2, 2] },
    pc: { S1: [true, false], PF1: [true, true] }, rc: { S1: { pgWindow: true } }, g: { 's0-0': true, 'apply-1': true },
    lib: { tanimura: 'later' }, act: { '2026-10-06': 4 }, practice: { 'datalemur:x': { status: 'completed' } },
    notes: [{ id: 'n', track: 'pf', topic: 'PF3', text: 'Model notes' }], log: [{ id: 'l', d: '2026-10-06', text: 'Did SQL' }], todo: [{ id: 't', text: 'Read', track: 'sql' }]
  };
  const s = model.migrate(structuredClone(old));
  assert.equal(s.v, 7); assert.equal(s.checksV, 1);
  assert.deepEqual(plain(s.ck.S1), [true, true, true, true, true]);
  assert.deepEqual(plain(s.ck.S3), [true, false, false, true]);
  assert.ok(s.done.S1 && s.done.S2, 'topics that were Done stay complete');
  assert.ok(!s.done.S3, 'a partly rated topic is not complete');
  assert.ok(s.done.S2, 'S2 stays complete even though its new prerequisite rule did not exist before');
  assert.ok(s.built['v1-ingest'], 'a Done portfolio topic marks its stage built');
  assert.ok(s.built['v1-model'] && s.built['v1-marts'] && s.built['v1-release'], 'every stage built from a Done topic is built');
  assert.deepEqual(plain(s.ck['v1-marts']), [true]);
  assert.deepEqual(plain(s.r), plain(old.r), 'ratings are kept as evidence');
  for (const k of ['pc', 'rc', 'g', 'lib', 'act', 'practice', 'log', 'todo']) assert.deepEqual(plain(s[k]).length ?? plain(s[k]), plain(old[k]).length ?? plain(old[k]), k);
  assert.equal(s.notes[0].topic, 'PF3', 'portfolio notes keep their topic');
  replace(s);
  assert.equal(roadmap.cpDone('s0'), true);
  assert.equal(roadmap.isDone('S2'), true);
  // Idempotent, and later edits survive another migration (e.g. a reload or cloud refresh).
  assert.deepEqual(plain(model.migrate(structuredClone(plain(s)))), plain(s));
  const edited = structuredClone(plain(s)); edited.ck.S3[0] = false; delete edited.done.S1;
  const again = model.migrate(edited);
  assert.equal(again.ck.S3[0], false); assert.equal(again.done.S1, undefined);
});

test('real saved data and backups migrate without losing anything', () => {
  const { model } = fixture();
  const dir = path.join(__dirname, '../ae-tracker-data');
  const progress = JSON.parse(fs.readFileSync(path.join(dir, 'progress.json'), 'utf8')).data;
  const files = [progress, ...fs.readdirSync(path.join(dir, 'backups')).map(f => JSON.parse(fs.readFileSync(path.join(dir, 'backups', f), 'utf8')))];
  for (const data of files) {
    const s = model.migrate(structuredClone(data));
    assert.deepEqual(plain(s.r), plain(data.r || {}));
    assert.equal(s.log.length, (data.log || []).length);
    assert.equal(s.notes.length, (data.notes || []).length);
    assert.deepEqual(plain(s.g), plain(data.g || {}));
    if ((data.r?.SETUP || []).every(v => v >= 2) && data.r?.SETUP) {
      assert.ok(s.done.SETUP); assert.deepEqual(plain(s.ck.SETUP), [true, true, true, true]);
    }
    assert.deepEqual(plain(model.migrate(structuredClone(plain(s)))), plain(s));
  }
});

test('cloud records round-trip checks, completed lessons and built stages per entry', () => {
  const { model } = fixture();
  const ctx = vm.createContext({ structuredClone, crypto: globalThis.crypto });
  vm.runInContext(fs.readFileSync(path.join(app, 'cloud-core.js'), 'utf8'), ctx);
  const { pack, unpack } = ctx.AECloudCore;
  const s = model.migrate({ curriculumV: 4, r: { S1: [3, 3, 3, 3, 3], PF1: [2, 2, 2, 2, 2] } });
  const records = pack(s);
  for (const k of ['["ck","S1","0"]', '["done","S1"]', '["built","v1-ingest"]']) assert.ok(records[k], k + ' in ' + Object.keys(records).join(' '));
  const back = model.migrate(unpack(records, model.blank()));
  assert.deepEqual(plain(back.ck), plain(s.ck)); assert.deepEqual(plain(back.done), plain(s.done)); assert.deepEqual(plain(back.built), plain(s.built));
  // An unmigrated cloud state (old records only) migrates the same way on every device.
  const oldRecords = pack({ r: { S1: [3, 3, 3, 3, 3] }, v: 6 });
  const a = model.migrate(unpack(oldRecords, model.blank())), b = model.migrate(unpack(oldRecords, model.blank()));
  assert.deepEqual(plain(a.ck), plain(b.ck)); assert.ok(a.done.S1);
});

test('prerequisites lock lesson completion; stages unlock after lessons and earlier stages', () => {
  const { model, roadmap, replace, plan } = fixture();
  const s = model.blank(); replace(s);
  s.ck.S2 = plan.items.S2.dod.map(() => true);
  assert.equal(roadmap.canComplete('S2'), false, 'locked until Window functions is complete');
  assert.deepEqual(plain(roadmap.missingPrereqs('S2')), ['S1']);
  s.done.S1 = '2026-10-13';
  assert.equal(roadmap.canComplete('S2'), true);
  s.ck.S2[0] = false;
  assert.equal(roadmap.canComplete('S2'), false, 'every check must be ticked');
  assert.equal(roadmap.missingPrereqs('SB4')[0], 'x-lakehouse', 'a lesson can wait for a portfolio stage');
  const frame = roadmap.stage('v1-frame'), ingest = roadmap.stage('v1-ingest');
  assert.equal(roadmap.stageStatus(frame), 'locked');
  s.done.SETUP = s.done.CM1 = 'x';
  assert.equal(roadmap.stageStatus(frame), 'ready');
  assert.equal(roadmap.canBuild(frame), false, 'completion checks first');
  roadmap.stageChecks(frame).forEach(c => { (s.ck[c.owner] ||= [])[c.idx] = true; });
  assert.equal(roadmap.canBuild(frame), true);
  for (const id of ingest.req) s.done[id] = 'x';
  assert.equal(roadmap.stageStatus(ingest), 'locked', 'needs the earlier stage');
  s.built['v1-frame'] = 'x';
  assert.equal(roadmap.stageStatus(ingest), 'ready');
  const checks = roadmap.stageChecks(ingest);
  assert.deepEqual(plain(checks.map(c => c.owner + '|' + c.idx)), ['PF1|0', 'PF1|1', 'PF1|2', 'PF1|3', 'PF1|4']);
  assert.equal(checks[0].text, plan.items.PF1.dod[0]);
});

test('lessons show a deck slot and at most three resources; practice sites and broad books move out', () => {
  const { plan, roadmap, resources } = fixture();
  for (const id of roadmap.lessons) {
    const r = resources.lessonRes(id);
    const shown = [r.start, ...r.deeper].filter(Boolean);
    assert.ok(shown.length <= 3, `${id} shows ${shown.length} resources`);
    assert.ok(shown.every(x => x.kind !== 'practice'), `${id} lists practice sites as resources`);
    assert.ok(r.sites.every(x => x.kind === 'practice'), `${id} problem sites`);
    // Nothing tagged to the lesson disappears: shown, reading list, problem sites or the Library.
    const placed = new Set([...shown, ...r.reading, ...r.more, ...r.sites].map(x => x.key));
    for (const e of plan.items[id].learn) assert.ok(placed.has(e.split('|')[0]), `${id} keeps ${e}`);
  }
  const libKeys = new Set(resources.LIB.map(x => x.key));
  for (const k of [...Object.keys(plan.L), ...Object.keys(plan.LX)]) assert.ok(libKeys.has(k), `${k} stays in the Library`);
  for (const id of Object.keys(plan.items)) for (const e of plan.items[id].learn) {
    assert.ok(resources.LIB.find(x => x.key === e.split('|')[0]).topics.includes(id), `${e} stays tagged with ${id}`);
  }
  assert.ok(resources.areaReading('sql').some(r => r.key === 'tanimura'), 'broad SQL books are on the area reading list');
});

test('deck links point only to existing files and slide anchors', () => {
  const { plan, resources, roadmap, views } = fixture();
  const repo = path.join(__dirname, '../..');
  for (const [key, d] of Object.entries(plan.decks)) {
    const file = path.join(repo, 'docs', d.file);
    assert.ok(fs.existsSync(file), `${key}: ${d.file} exists`);
  }
  assert.equal(path.resolve(app, plan.deckBase), path.join(repo, 'docs'));
  const html = {};
  for (const id of roadmap.lessons) {
    const d = resources.deckFor(id);
    for (const x of [...d.decks, ...d.labs]) {
      const [file, hash] = x.url.split('#');
      const abs = path.resolve(app, file);
      assert.ok(fs.existsSync(abs), `${id}: ${file}`);
      if (hash) {
        html[abs] ||= fs.readFileSync(abs, 'utf8');
        assert.ok(html[abs].includes(`id="${hash}"`), `${id}: ${hash} exists in ${file}`);
      }
    }
    const panel = views.panelBody(id);
    const links = [...panel.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(h => !/^(https?:|#|mailto:)/.test(h));
    for (const href of links) assert.ok(fs.existsSync(path.resolve(app, href.split('#')[0])), `${id} links ${href}`);
    if (!d.decks.length) assert.match(panel, /No deck yet/);
  }
  assert.ok(Object.values(plan.plannedDecks).every(name => !Object.values(plan.decks).some(d => d.title === name)), 'planned decks are not linked');
});
