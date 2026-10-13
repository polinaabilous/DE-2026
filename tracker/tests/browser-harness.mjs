// Isolated browser fixtures. Never open a personal browser profile or write real data.
import { createServer } from 'node:http';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const trackerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const chromePath = process.env.AE_CHROME || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

export async function fixture({ config = null, before = '', after = '' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'ae-tracker-test-'));
  const publicDir = join(root, 'public');
  await cp(join(trackerRoot, 'ae-tracker'), publicDir, { recursive: true });
  await writeFile(join(publicDir, 'firebase-config.js'), `window.AE_FIREBASE = ${JSON.stringify(config)};\n`);
  const original = await readFile(join(publicDir, 'index.html'), 'utf8');
  const html = original.replace('<script src="data.js', `<script>${before}</script>\n<script src="data.js`)
    .replace('</body>', `${after}\n</body>`);
  await writeFile(join(publicDir, 'index.html'), html);
  await writeFile(join(publicDir, 'reload.html'), original);
  const server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const path = resolve(publicDir, '.' + (name === '/' ? '/index.html' : name));
      if (!path.startsWith(publicDir + sep)) { res.writeHead(403).end(); return; }
      const contents = await readFile(path);
      res.writeHead(200, { 'Content-Type': types[path.slice(path.lastIndexOf('.'))] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(contents);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { root, publicDir, url: `http://127.0.0.1:${server.address().port}/`,
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await rm(root, { recursive: true, force: true });
    }
  };
}

export function chrome(profile, args = []) {
  const child = spawn(chromePath, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-extensions', '--user-data-dir=' + profile, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => resolve({ code, output, errors }));
  });
  return { child, done, async close() {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    try { await done; } finally { clearTimeout(timer); }
  } };
}
export const errorCapture = 'window.testErrors=[];window.addEventListener("error",e=>testErrors.push(e.message));window.addEventListener("unhandledrejection",e=>testErrors.push(String(e.reason)));window.confirm=()=>true;window.alert=msg=>{throw Error(msg)};window.showDirectoryPicker=undefined;';
