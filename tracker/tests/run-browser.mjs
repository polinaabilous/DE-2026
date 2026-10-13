import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, chrome, trackerRoot, errorCapture } from './browser-harness.mjs';

const seed = { v: 4, setupV: 2, curriculumV: 4, r: { S1: [3] }, log: [
  { d: '2026-10-06', h: 1.5, role: 'P', item: 'S1', note: 'Practiced joins' },
  { d: '2026-10-06', h: 0.5, role: 'T', item: 'S1', note: 'Read window docs' }
], notes: [{ id: 'old-note', track: 'sql', text: 'Existing note\n- First finding\n- Second finding', c: '2026-10-05', u: '2026-10-05' }] };
const source = await readFile(join(trackerRoot, 'ae-tracker/app.js'), 'utf8');
const build = source.match(/build: "([^"]+)"/)[1];
const page = await fixture({ before: errorCapture + `window.TEST_BUILD=${JSON.stringify(build)};localStorage.setItem('ae-prep-tracker-v2',${JSON.stringify(JSON.stringify(seed))});location.hash='#log';`,
  after: '<script src="browser-check.js"></script>' });
let browser;
try {
  await writeFile(join(page.publicDir, 'browser-check.js'), await readFile(join(trackerRoot, 'tests/browser-check.js')));
  browser = chrome(join(page.root, 'profile'), ['--virtual-time-budget=15000', '--window-size=1100,900', '--dump-dom', page.url]);
  const timeout = setTimeout(() => browser.child.kill('SIGKILL'), 45000);
  let result;
  try { result = await browser.done; } finally { clearTimeout(timeout); }
  const match = result.output.match(/<pre id="browser-test-result">([\s\S]*?)<\/pre>/);
  assert.ok(match, 'Browser suite did not finish: ' + result.errors.slice(-1000));
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
  const checks = JSON.parse(match[1].replace(/&(amp|lt|gt|quot|#39);/g, (_, key) => entities[key]));
  assert.deepEqual(checks.failures, []);
  assert.deepEqual(checks.errors, []);
  console.log(`PASS: ${checks.passed} browser checks covering editing, lists, drafts, to do tracks, exports, folder storage and reloads.`);
} finally {
  await browser?.close();
  await page.close();
}
