import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'ae-tracker-data');
const ctx = { window: {}, Date, Map, Set, setTimeout, clearTimeout };
vm.createContext(ctx);
for (const name of ['utils.js', 'store.js']) vm.runInContext(readFileSync(resolve(root, 'ae-tracker', name), 'utf8'), ctx);
const progress = JSON.parse(readFileSync(resolve(source, 'progress.json'), 'utf8'));
const notes = [];
for (const name of readdirSync(resolve(source, 'notes'))) {
  if (!name.endsWith('.md')) continue;
  const parsed = ctx.window.AEStore.parseMd(readFileSync(resolve(source, 'notes', name), 'utf8'));
  for (const note of parsed.notes) notes.push({ ...note, track: parsed.track || 'general' });
}
const data = { ...progress.data, notes };
mkdirSync(resolve(root, 'backups-private'), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = resolve(root, 'backups-private', `saved-folder-${stamp}.json`);
writeFileSync(target, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
console.log(`Private backup saved: ${notes.length} notes, ${data.log?.length || 0} log entries, ${data.todo?.length || 0} to dos.`);
console.log(target);
