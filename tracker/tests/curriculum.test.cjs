// Lessons, roadmap, portfolio stages, decks, resources and the ratings → checks migration.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = path.join(__dirname, '../de-tracker');
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
// The portfolio now uses Flight Reliability; IDs/list positions remain stable for saved progress.
// These project examples may change; list lengths stay stable so saved ticks still apply.
const PROJECT_SWAP = new Set(['S2 practice 2', 'S7 practice 0', 'D3 practice 1', 'D3 practice 2', 'Py1 practice 0', 'Py1 practice 6',
  'Py3 practice 0', 'Py3 practice 1', 'Py3 setup 1', 'AF2 practice 0', 'AF2 practice 2', 'BZ2 practice 1', 'BZ5 practice 0', 'AI5 practice 0',
  'D1 practice 2', 'Py1 practice 1', 'PF3 check 1', 'PF3 practice 2', 'PF6 description', 'PF6 check 1', 'PF8 practice 0', 'PL4 practice 0', 'PF1 description', 'PF1 practice 1', 'PF1 check 4', 'PF2 description', 'PF3 description', 'PF3 practice 0',
  'PF3 practice 1', 'PF3 check 0', 'PF4 description', 'PF4 practice 1', 'PF4 check 0', 'PF8 description', 'PF8 check 3']);
const PROJECT_DATA = new Set(['ghArchive', 'foodcom', 'fdc', 'offData', 'btsFlights', 'noaaHourly']);
const OLD_PROJECT = /GH Archive|GitHub|\bGH\b|\bPR\b|repositor|contributor|24-hour UTC|hourly|per hour/i;
// Verified moved links from the resource plan's issues list (2026-10-13). Keys stay; only these fields change.
// Format/kind corrections (newsletter, community …) live in LM, so the [title, url, kind] entries keep their kind.
const RESOURCE_FIXES = {
  modeSql: { 0: 'ThoughtSpot SQL tutorial (formerly Mode)', 1: 'https://www.thoughtspot.com/sql-tutorial' },
  duckdb: { 1: 'https://duckdb.org/docs/current/' },
  dbtContracts: { 1: 'https://docs.getdbt.com/docs/mesh/govern/model-contracts' },
  dbtVersions: { 1: 'https://docs.getdbt.com/docs/mesh/govern/model-versions' },
  dbtAccess: { 1: 'https://docs.getdbt.com/docs/mesh/govern/model-access' },
  pydantic: { 1: 'https://pydantic.dev/docs/' },
  skillsBoost: { 0: 'Google Skills (formerly Cloud Skills Boost) – LookML labs', 1: 'https://www.skills.google/course_templates/327' },
  bqSandbox: { 1: 'https://docs.cloud.google.com/bigquery/docs/sandbox' },
  learningSpark: { 0: 'Learning Spark, 2nd ed. (Damji, Wenig, Das & Lee)' },
  dbtDocs: { 0: 'dbt docs (search: state, defer, exposures, environments)' }
};
const LX_FIXES = {
  arAstroLearn: { 0: 'Astronomer docs: Airflow guides (formerly Learn)', 1: 'https://www.astronomer.io/docs/airflow/overview' },
  ytBtree: { 4: 'deep' }
};
const fixed = (v, fix) => plain(Object.assign([...v], fix || {}));

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
    // Presentation renames preserve topic IDs, checks and practice positions in saved progress.
    const renamed = text => text.replace(/analytics([ -])engineer(ing|s)?/gi, (_, separator, suffix = '') => `data${separator}engineer${suffix}`)
      .replace(/AE-focused/g, 'DE-focused');
    // Other text changes remain limited to the existing readable-title and project migrations.
    const same = (a, b, what) => assert.ok(a === b || (CODE.test(b) || /phase|step 1\.1|later stage/.test(b)) && !CODE.test(a)
      || a === renamed(b) || PROJECT_SWAP.has(`${id} ${what}`) && !OLD_PROJECT.test(a), `${id} ${what} changed: ${b}`);
    same(y.c, x.c, 'description');
    x.dod.forEach((t, i) => same(y.dod[i], t, 'check ' + i));
    x.practice.forEach((t, i) => same(y.practice[i], t, 'practice ' + i));
    const general = keys => plain(keys).filter(k => !PROJECT_DATA.has(k));
    assert.deepEqual(general(y.learn), general(x.learn), `${id} keeps every resource`);
    if (x.learn.includes('ghArchive')) assert.ok(y.learn.some(k => PROJECT_DATA.has(k)), `${id} keeps a project dataset`);
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
  assert.match(plan.portfolio.question, /airline.*departure window/);
  assert.ok(!OLD_PROJECT.test(plan.portfolio.question + plan.portfolio.scope), 'portfolio no longer describes GitHub activity');
  for (const s of plan.stages) assert.ok(!/GH Archive|GitHub|\bPR\b|repositories/.test([s.name, s.desc || '', ...s.scope, s.boundary, ...s.tasks.map(t => (t.t || '') + ' ' + (t.d || ''))].join(' ')), `stage ${s.id} uses flight data`);
  assert.deepEqual(plain(plan.skip), plain(old.skip));
  for (const [k, v] of Object.entries(old.L)) assert.deepEqual(plain(plan.L[k]), fixed(v, RESOURCE_FIXES[k]), `resource ${k}`);
  for (const [k, v] of Object.entries(old.LX)) assert.deepEqual(plain(plan.LX[k]), fixed(v, LX_FIXES[k]), `library extra ${k}`);
  for (const k of [...Object.keys(RESOURCE_FIXES), ...Object.keys(LX_FIXES)]) assert.ok(old.L[k] || old.LX[k], `fix ${k} names an existing resource`);
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
  const dir = path.join(__dirname, '../de-tracker-data');
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

test('lessons show their decks and at most three resources; practice sites, tools and book chapters move out', () => {
  const { plan, roadmap, resources, views } = fixture();
  for (const id of roadmap.lessons) {
    const r = resources.lessonRes(id);
    const shown = [r.start, ...r.deeper].filter(Boolean);
    assert.ok(shown.length <= 3, `${id} shows ${shown.length} resources`);
    assert.ok(r.deeper.length <= 2, `${id} has at most two Go deeper picks`);
    assert.ok(shown.every(x => x.kind !== 'practice'), `${id} lists practice sites as resources`);
    assert.ok(r.sites.every(x => x.kind === 'practice'), `${id} problem sites`);
    // The panel renders at most three Start here / Go deeper rows.
    const tiers = (views.panelBody(id).match(/class="res-tier"/g) || []).length;
    assert.ok(tiers <= 3, `${id} panel shows ${tiers} resources`);
    // Nothing tagged to the lesson disappears: shown, reading list, problem sites, tools or "Also tagged".
    const placed = new Set(resources.tagged(id).map(x => x.key));
    for (const e of plan.items[id].learn) {
      const key = e.split('|')[0];
      assert.ok(placed.has(key) || plan.resourceReview.retired[key], `${id} keeps or explicitly retires ${e}`);
    }
    // Broad entries dropped from the panel stay tagged with the lesson in the Library and the By lesson view.
    for (const k of plan.lessonResources[id]?.drop || []) {
      if (!resources.isActive(k)) continue;
      assert.ok(!shown.some(x => x.key === k), `${id} hides dropped ${k}`);
      assert.ok([...r.more, ...r.tools, ...r.sites, ...r.reading].some(x => x.key === k), `${id} keeps ${k} under Also tagged (or as a tool, site or chapter)`);
      assert.ok(resources.libItem[k].topics.includes(id), `${k} stays tagged with ${id} in the Library`);
    }
  }
  const libKeys = new Set(resources.LIB.map(x => x.key));
  for (const k of [...Object.keys(plan.L), ...Object.keys(plan.LX)]) assert.equal(libKeys.has(k), resources.isActive(k), `${k} matches its review decision`);
  for (const k of Object.keys(legacy().L).concat(Object.keys(legacy().LX))) assert.ok(libKeys.has(k) || plan.resourceReview.retired[k], `old ${k} is retained or explicitly retired`);
  for (const id of Object.keys(plan.items)) for (const e of plan.items[id].learn) {
    if (!resources.isActive(e.split('|')[0])) continue;
    assert.ok(resources.LIB.find(x => x.key === e.split('|')[0]).topics.includes(id), `${e} stays tagged with ${id}`);
  }
  assert.ok(resources.areaReading('sql').some(r => r.key === 'tanimura'), 'broad SQL books are on the area reading list');
});

test('resource plan picks resolve, new resources are verified, every resource has a format and time', () => {
  const { plan, resources } = fixture();
  const old = legacy(), oldKeys = new Set([...Object.keys(old.L), ...Object.keys(old.LX)]);
  for (const [id, o] of Object.entries(plan.lessonResources)) {
    assert.ok(plan.items[id], `${id} is a curriculum item`);
    for (const e of [o.start, ...(o.deeper || []), ...(o.production || []), ...(o.reading || []), ...(o.sites || []), ...(o.tools || []), ...(o.more || []), ...(o.drop || [])].filter(Boolean)) {
      const k = e.split('|')[0];
      assert.ok(plan.L[k] || plan.LX[k], `${id} references ${k}`);
    }
  }
  const added = Object.keys(plan.L).filter(k => !oldKeys.has(k));
  assert.ok(added.length >= 200, `${added.length} specific pages added`);
  for (const k of added) {
    assert.match(plan.L[k][1] || '', /^https:\/\//, `${k} has a URL`);
    assert.match(plan.LM[k]?.ok || '', /^\d{4}-\d{2}-\d{2}$/, `${k} was checked`);
  }
  for (const [k, v] of Object.entries(plan.L)) if (!v[1]) assert.ok(['book', 'docs', 'practice', 'article'].includes(v[2]), `${k} has no URL only when it is print or a bundle`);
  for (const x of resources.LIB) {
    assert.ok(resources.FORMATS[x.format], `${x.key} format ${x.format}`);
    assert.ok(resources.TIME[x.time], `${x.key} time ${x.time}`);
  }
  assert.ok(resources.LIB.filter(x => x.format === 'deck').length >= 20, 'decks are in the Library');
});

test('production reading resolves once in the Library, maps to lessons and keeps full practice context', () => {
  const { plan, resources, views } = fixture();
  const entries = plan.productionReading;
  const audit = fs.readFileSync(path.join(app, '../planning/production-reading-map.md'), 'utf8');
  const keys = new Set(), urls = new Set();
  assert.equal(entries.filter(r => r.priority).length, 5, 'five manageable starting picks');
  for (const r of entries) {
    assert.ok(!keys.has(r.key), `unique curated key ${r.key}`); keys.add(r.key);
    const resolved = resources.resolve(r.key);
    assert.ok(!urls.has(resolved.url), `no duplicate article ${resolved.url}`); urls.add(resolved.url);
    assert.match(plan.LM[r.key].ok, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.why && r.try && audit.includes(resolved.url), `${r.key} has research context and an audit link`);
    assert.equal(resources.LIB.filter(x => x.key === r.key).length, 1, `${r.key} appears once in the Library`);
    assert.ok(resources.libItem[r.key].text.includes('production reading'), 'collection is searchable in the Library');
    for (const id of r.topics) {
      const picks = resources.lessonRes(id);
      const resource = [picks.start, ...picks.deeper, ...picks.production].find(x => x?.key === r.key);
      assert.ok(resource && resource.note.includes(r.try), `${id} keeps the suggested exercise`);
      assert.ok(!r.caution || resource.note.includes(r.caution), `${id} keeps implementation caveats`);
      assert.ok(resources.libItem[r.key].topics.includes(id), `${r.key} links back to ${id}`);
      assert.ok(!picks.more.some(x => x.key === r.key), `${r.key} is not repeated under Also tagged`);
      assert.ok(picks.production.length <= 2, `${id} has at most two optional reads`);
      const panel = views.panelBody(id);
      if (picks.production.length) assert.match(panel, /<details class="[^"]*production-reading">/, 'extra production reading starts collapsed');
      assert.ok(panel.includes(resolved.url), `${id} exposes the source`);
    }
  }
});

test('optional production reading shares completion across lessons without completing required checks', () => {
  const { resources, roadmap, state } = fixture();
  const before = JSON.stringify({ checks: state().ck, done: state().done, practice: state().pc });
  // Existing resource key retained when its article is promoted from Also tagged.
  state().rc.Py4 = { sdeIntegrationTest: true };
  assert.ok(resources.libDone('sdeIntegrationTest'));
  assert.ok(resources.lessonRes('Py4').production.some(r => r.key === 'sdeIntegrationTest'));
  resources.setLibDone('prodRetryJitter', true);
  assert.ok(resources.libDone(resources.lessonRes('AF2').production.find(r => r.key === 'prodRetryJitter').key));
  assert.ok(!roadmap.isDone('Py3') && !roadmap.isDone('AF2'));
  assert.equal(JSON.stringify({ checks: state().ck, done: state().done, practice: state().pc }), before);
  resources.setLibDone('prodRetryJitter', false);
  assert.ok(!resources.libDone('prodRetryJitter'));
});

test('review decisions remove resources from every recommendation surface and cover the full catalog', () => {
  const { plan, roadmap, resources } = fixture();
  const report = JSON.parse(fs.readFileSync(path.join(app, '../planning/archive/resource-quality-review.json'), 'utf8'));
  const decisions = new Map(report.decisions.map(x => [x.key, x]));
  assert.equal(decisions.size, report.decisions.length, 'one audit decision per permanent key');
  const rawKeys = new Set([...Object.keys(plan.L), ...Object.keys(plan.LX)]);
  for (const key of rawKeys) {
    assert.ok(decisions.has(key), `audit covers ${key}`);
    assert.equal(decisions.get(key).decision, resources.isActive(key) ? 'keep' : 'remove');
    const r = resources.resolve(key);
    assert.ok(r.title, `${key} remains resolvable, including reused Library extras`);
  }
  assert.equal(decisions.size, rawKeys.size + Object.keys(plan.decks).length);
  assert.equal(report.summary.removed, Object.keys(plan.resourceReview.retired).length);
  assert.equal(report.summary.retained, resources.LIB.length);
  for (const id of roadmap.lessons) {
    const picks = resources.lessonRes(id);
    if (!['IV1', 'IV4'].includes(id)) assert.ok(picks.start, `${id} retains a useful starting resource`);
    const visible = [picks.start, ...picks.deeper, ...picks.production, ...picks.reading, ...picks.sites, ...picks.tools, ...picks.more].filter(Boolean);
    for (const r of visible.concat(resources.quickPicks(id))) assert.ok(resources.isActive(r.key), `${id} cannot recommend retired ${r.key}`);
    const primary = [picks.start, ...picks.deeper, ...picks.production].filter(Boolean).map(r => r.key);
    assert.equal(new Set(primary).size, primary.length, `${id} does not repeat an article promoted to a primary pick`);
  }
  for (const a of plan.areas) for (const r of resources.areaReading(a)) assert.ok(resources.isActive(r.key));
  for (const s of plan.stages) for (const [, r] of resources.stageRefs(s)) assert.ok(resources.isActive(r.key));
  for (const [key, decision] of Object.entries(plan.resourceReview.retired)) {
    assert.ok(rawKeys.has(key) && decision.reason, 'retirement has a real identity and an explicit reason');
    if (decision.replacement) assert.ok(resources.libItem[decision.replacement], 'replacement is visible');
    assert.ok(!resources.libItem[key] && !plan.productionReading.some(r => r.key === key));
  }
});

test('retired reading evidence survives migration and cloud export without blocking current reading', () => {
  const { model, state, replace, resources } = fixture();
  const old = model.blank();
  old.lib.kimballGrain = 'done'; old.rc.M1 = { kimballFourStep: true };
  old.reading.effPandas = { status: 'reading', note: 'Keep this old note', pct: 35, updated: '2026-10-20' };
  replace(model.migrate(old));
  const ctx = vm.createContext({ structuredClone, crypto: globalThis.crypto });
  vm.runInContext(fs.readFileSync(path.join(app, 'cloud-core.js'), 'utf8'), ctx);
  const back = model.migrate(ctx.AECloudCore.unpack(ctx.AECloudCore.pack(state()), model.blank()));
  assert.equal(back.lib.kimballGrain, 'done');
  assert.equal(back.rc.M1.kimballFourStep, true);
  assert.deepEqual(plain(back.reading.effPandas), plain(old.reading.effPandas));
  assert.ok(!resources.readingNow().includes('effPandas'));
  assert.deepEqual(plain(resources.readingConflicts('dwt')), []);
  assert.ok(!resources.libItem.kimballGrain && resources.libDone('kimballGrain'));
});

test('book chapters show with their notes; the current book is badged', () => {
  const { resources, views, plan } = fixture();
  const m1 = resources.lessonRes('M1');
  const dwt = m1.deeper.find(r => r.key === 'dwt');
  assert.match(dwt.note, /ch\. 1/);
  const panel = views.panelBody('M1');
  assert.match(panel, /ch\. 1 and ch\. 3: business process/);
  assert.match(panel, /Your current book/);
  assert.match(views.panelBody('S1'), /ch\. 3 Time Series Analysis/, 'reading-list chapters show in the panel');
  assert.deepEqual(plain(plan.currentBooks), ['dwt']);
  // Once you mark another book as Reading, the badge follows it.
  resources.startReading('ddia');
  assert.ok(!/Your current book/.test(views.panelBody('M1')), 'the badge moves to the book you are reading');
  assert.match(views.panelBody('P2'), /Your current book/);
});

test('deck, lab, extra and document links point to existing files and slide anchors', () => {
  const { plan, resources, roadmap, views } = fixture();
  const repo = path.join(__dirname, '../..');
  assert.equal(plan.deckBase, 'decks/', 'decks are published with the app');
  const deckDir = path.resolve(app, plan.deckBase);
  assert.equal(deckDir, path.join(app, 'decks'));
  for (const [slug, d] of Object.entries(plan.decks)) {
    for (const f of [d.file, d.md, ...(d.extras || []).map(x => x[1])].filter(Boolean)) assert.ok(fs.existsSync(path.join(deckDir, f)), `${slug}: ${f} exists`);
  }
  for (const [id, labs] of Object.entries(plan.lessonLabs)) for (const l of labs) {
    assert.ok(fs.existsSync(path.join(deckDir, l.file)), `${id} lab ${l.file}`);
    if (l.deck) assert.ok(plan.decks[l.deck], `${id} lab deck ${l.deck}`);
  }
  const html = {};
  const exists = (href, where) => {
    const [file, hash] = href.split('#');
    const abs = path.resolve(app, decodeURI(file));
    assert.ok(fs.existsSync(abs), `${where}: ${href}`);
    if (hash) { html[abs] ||= fs.readFileSync(abs, 'utf8'); assert.ok(html[abs].includes(`id="${hash}"`), `${where}: #${hash} exists in ${file}`); }
  };
  for (const id of roadmap.lessons) {
    const d = resources.deckFor(id);
    for (const x of d.decks) [x.url, x.mdUrl, ...x.extras.map(e => e.url)].filter(Boolean).forEach(u => exists(u, id));
    for (const l of d.labs) [l.url, l.slideUrl].filter(Boolean).forEach(u => exists(u, id + ' lab'));
    const panel = views.panelBody(id);
    const links = [...panel.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')).filter(h => !/^(https?:|#|mailto:)/.test(h));
    links.forEach(href => exists(href, id));
    if (!d.decks.length) assert.match(panel, /No deck yet/);
    else assert.equal((panel.match(/class="deck-card/g) || []).length, d.decks.length, `${id} shows every deck`);
    if (!d.labs.length) assert.match(panel, /Lab will be added with the deck/);
    if (d.decks.some(x => !x.partial)) assert.equal(d.planned.length, 0, `${id} has a full deck, so no planned deck`);
  }
  for (const x of resources.LIB.filter(x => x.format === 'deck')) [x.url, x.mdUrl].filter(Boolean).forEach(u => exists(u, x.key));
  exists(resources.docUrl(plan.portfolio.brief), 'project brief');
  exists(resources.docUrl(plan.dlCatalog), 'DataLemur catalog');
  assert.ok(Object.values(plan.plannedDecks).every(name => !Object.values(plan.decks).some(d => d.title === name)), 'planned decks are not linked');
});

test('reading status migrates once from saved Library entries without losing lib or resource ticks', () => {
  const { model } = fixture();
  const old = { v: 7, setupV: 2, curriculumV: 4, checksV: 1, lib: { dwt: 'later', ddia: 'done', ytKahanStar: 'done', podAE: 'later' }, rc: { M1: { dwt: true } } };
  const s = model.migrate(structuredClone(old));
  assert.equal(s.readingV, 1);
  assert.deepEqual(plain(s.lib), old.lib, 'lib entries stay');
  assert.deepEqual(plain(s.rc), old.rc, 'resource ticks stay');
  assert.equal(s.reading.dwt.status, 'later'); assert.equal(s.reading.ddia.status, 'done');
  assert.equal(s.reading.ytKahanStar, undefined, 'videos are not long reads'); assert.equal(s.reading.podAE, undefined);
  assert.ok(!Object.values(s.reading).some(r => r.status === 'reading'), 'nothing is marked as being read');
  assert.deepEqual(plain(model.migrate(structuredClone(plain(s)))), plain(s), 'idempotent');
  const edited = structuredClone(plain(s)); delete edited.reading.dwt;
  assert.equal(model.migrate(edited).reading.dwt, undefined, 'a cleared status is not resurrected');
  assert.deepEqual(plain(model.blank().reading), {});
});

test('one long read at a time: starting a second asks to pause the first; status stays consistent with Library ticks', () => {
  const { resources, model, replace, state } = fixture();
  replace(model.migrate({}));
  assert.deepEqual(plain(resources.startReading('dwt')), { paused: [] });
  assert.deepEqual(plain(resources.readingNow()), ['dwt']);
  assert.deepEqual(plain(resources.startReading('ddia')), { confirm: ['dwt'] }, 'second book needs confirmation');
  assert.deepEqual(plain(resources.readingNow()), ['dwt'], 'nothing changes before confirming');
  resources.startReading('ddia', true);
  assert.equal(resources.longStatus('dwt'), 'paused'); assert.equal(resources.longStatus('ddia'), 'reading');
  resources.setProgress('ddia', { note: ' Ch. 3 · Storage ', pct: '140' });
  assert.equal(state().reading.ddia.note, 'Ch. 3 · Storage'); assert.equal(state().reading.ddia.pct, 100);
  resources.setLongStatus('ddia', 'done');
  assert.equal(resources.libDone('ddia'), true); assert.equal(state().lib.ddia, 'done');
  resources.setLibDone('ddia', false);
  assert.equal(resources.longStatus('ddia'), ''); assert.equal(state().lib.ddia, undefined);
  resources.setLongStatus('corr', 'later');
  assert.equal(resources.libLater('corr'), true);
  resources.setLongStatus('corr', '');
  assert.equal(resources.libLater('corr'), false); assert.equal(state().reading.corr, undefined);
  // Quick picks: deck first, then a short article/docs page and a short video.
  const picks = resources.quickPicks('M1');
  assert.equal(picks[0].format, 'deck');
  assert.ok(picks.every(x => x.format === 'deck' || ['quick', 'hour'].includes(x.time)));
});
