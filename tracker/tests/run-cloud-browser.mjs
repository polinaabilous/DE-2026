import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fixture, chrome, trackerRoot, errorCapture, delay } from './browser-harness.mjs';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw Error('Run through npm run test:sync so both Firebase emulators are available.');
}
const rules = await readFile(join(trackerRoot, 'firestore.rules'), 'utf8');
const email = rules.match(/request.auth.token.email == '([^']+)'/)[1];
const seed = { v: 5, setupV: 2, curriculumV: 4, r: { S1: [3] }, notes: [
  { id: 'seed', track: 'sql', text: 'Existing local note', c: '2026-10-06', u: '2026-10-06' }
] };
const page = await fixture({ config: { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-ae-tracker',
  appId: 'demo-app', emulators: { auth: 9099, firestore: 8080 } },
  before: errorCapture + `if(!localStorage.getItem('ae-prep-tracker-v2'))localStorage.setItem('ae-prep-tracker-v2',${JSON.stringify(JSON.stringify(seed))});`
});
const browsers = [];
try {
  await writeFile(join(page.root, 'account.txt'), email);
  for (const name of ['test-laptop', 'test-phone']) {
    const profile = join(page.root, name);
    const browser = chrome(profile, ['--remote-debugging-port=0', 'about:blank']);
    browsers.push(browser);
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { await access(join(profile, 'DevToolsActivePort')); ready = true; break; } catch { await delay(100); }
    }
    if (!ready) throw Error('Chrome debugger did not start. Set AE_CHROME to a Chrome/Chromium executable.');
  }
  const child = spawn(process.execPath, [join(trackerRoot, 'tests/cloud-browser.cjs')], {
    env: { ...process.env, AE_BROWSER_TEST_ROOT: page.root, AE_BROWSER_TEST_URL: page.url }, stdio: 'inherit'
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 120000);
  try {
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
    if (code !== 0) throw Error('Cloud browser checks failed.');
  } finally { clearTimeout(timeout); }
} finally {
  for (const browser of browsers) await browser.close();
  await page.close();
}
