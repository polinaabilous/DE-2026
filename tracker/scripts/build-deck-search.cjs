// Index registered public study materials only. No notes, progress, labs or account data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../ae-tracker');
const checkOnly = process.argv.includes('--check');
const write = (file, content) => checkOnly ? assert.equal(fs.readFileSync(file, 'utf8'), content, `Rebuild deck search: ${path.relative(root, file)}`) : fs.writeFileSync(file, content);
const marker = /<!-- AE deck search start -->[\s\S]*?<!-- AE deck search end -->\n?/g;
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const plan = context.window.PLAN;
const decode = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
  if (entity[0] === '#') {
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  }
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity.toLowerCase()];
});
const htmlText = text => decode(text.replace(/<(script|style|nav|button|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<\/(?:p|div|h[1-6]|li|tr|pre|section)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
function cleanMarkdown(text) {
  let fence = null;
  return text.replace(/<!--[\s\S]*?-->/g, '').split('\n').map(line => {
    const code = line.match(/^\s*(`{3,}|~{3,})/);
    if (code) { if (!fence) fence = code[1]; else if (code[1][0] === fence[0] && code[1].length >= fence.length) fence = null; return ''; }
    if (fence) return line; // SQL operators, backtick identifiers and code comments must remain literal.
    return line.replace(/!?\[([^\]]*)\]\([^\n)]*\)/g, '$1').replace(/<\/?(?:a|span|div|br|details|summary)\b[^>]*>/gi, '')
      .replace(/^\s*#{1,6}\s+/, '').replace(/\*\*|__/g, '').replace(/\*([^*\n]+)\*/g, '$1').replace(/`([^`\n]+)`/g, '$1').replace(/^\s*---+\s*$/, '');
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function markdownSections(markdown) {
  const out = []; let heading = '', anchor = '', pending = '', body = [], fence = null;
  const flush = () => {
    const text = cleanMarkdown(body.join('\n'));
    if (text.length > 25 && !/^(?:contents|table of contents)$/i.test(heading)) out.push({ heading, anchor, text });
    body = [];
  };
  for (const line of markdown.split(/\r?\n/)) {
    const code = line.match(/^\s*(`{3,}|~{3,})/);
    if (code) { if (!fence) fence = code[1]; else if (code[1][0] === fence[0] && code[1].length >= fence.length) fence = null; body.push(line); continue; }
    const id = !fence && line.match(/^\s*<a\s+id=["']([^"']+)["'][^>]*>\s*<\/a>\s*$/);
    if (id) { flush(); pending = id[1]; continue; }
    const title = !fence && line.match(/^#{1,2}\s+(.+?)\s*#*$/);
    if (title) { flush(); heading = cleanMarkdown(title[1]); anchor = pending; pending = ''; continue; }
    body.push(line);
  }
  flush(); return out;
}
function slideSections(html) {
  // These local decks use flat slide sections; split at the next slide boundary, not arbitrary nested HTML.
  const starts = [...html.matchAll(/<section\b([^>]*)>/gi)].filter(m => /\bclass=["'][^"']*\bslide\b/.test(m[1]));
  return starts.map((m, i) => {
    const content = html.slice(m.index + m[0].length, starts[i + 1]?.index ?? html.length);
    const anchor = m[1].match(/\bid=["']([^"']+)/)?.[1] || '';
    const heading = decode(m[1].match(/\bdata-title=(["'])(.*?)\1/)?.[2] || htmlText(content.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || ''));
    return { heading, anchor, text: htmlText(content) };
  }).filter(s => s.text.length > 25);
}
function chunks(text, size = 2400) {
  const out = []; let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) { const split = text.lastIndexOf('\n', end); if (split > start + size / 2) end = split; }
    out.push(text.slice(start, end).trim());
    if (end === text.length) break;
    // A short overlap keeps terms at a passage boundary searchable together.
    start = Math.max(start + 1, end - 160);
    const space = text.indexOf(' ', start); if (space >= 0 && space < start + 40) start = space + 1;
  }
  return out;
}
const sources = [], passages = [], htmlFiles = new Set(['index.html']);
const read = relative => {
  const full = path.resolve(root, relative);
  assert.ok(full.startsWith(root + path.sep), `Outside public root: ${relative}`);
  return fs.readFileSync(full, 'utf8').replace(marker, '');
};
for (const [id, deck] of Object.entries(plan.decks)) {
  const url = plan.deckBase + deck.file;
  const mdUrl = deck.md ? plan.deckBase + deck.md : url.endsWith('.md') ? url : null;
  const html = url.endsWith('.html') ? read(url) : '';
  if (html) htmlFiles.add(url);
  const anchors = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
  const sections = mdUrl ? markdownSections(read(mdUrl)) : slideSections(html);
  assert.ok(sections.length, `No searchable content in ${id}`);
  sources.push({ id, title: deck.title, url, mdUrl, kind: mdUrl ? 'markdown' : 'slides' });
  for (const section of sections) {
    const anchor = anchors.has(section.anchor) ? section.anchor : '';
    for (const text of chunks(section.text)) passages.push({ source: id, heading: section.heading || deck.title, anchor, text });
  }
}
const payload = { version: 1, sources, passages };
payload.contentHash = hash(JSON.stringify(payload));
const json = JSON.stringify(payload);
write(path.join(root, 'deck-search-index.json'), json + '\n');
const assets = ['deck-search-core.js', 'deck-search.js', 'deck-search.css', 'deck-history.js'];
const version = hash(json + assets.map(read).join(''));
for (const relative of htmlFiles) {
  const html = read(relative);
  const prefix = path.relative(path.dirname(path.join(root, relative)), root).split(path.sep).join('/');
  const base = prefix ? prefix + '/' : '';
  const deck = sources.find(source => source.url === relative);
  assert.ok(!deck || /^[a-z][a-z0-9-]{0,79}$/.test(deck.id), 'Safe deck history identity');
  const tags = `<!-- AE deck search start -->\n<link rel="stylesheet" href="${base}deck-search.css?v=${version}">\n<script src="${base}deck-history.js?v=${version}"${deck ? ` data-deck="${deck.id}"` : ''}></script>\n<script defer src="${base}deck-search-core.js?v=${version}"></script>\n<script defer src="${base}deck-search.js?v=${version}" data-index="${base}deck-search-index.json?v=${payload.contentHash}"></script>\n<!-- AE deck search end -->\n`;
  assert.ok(html.includes('</head>'), `Missing head in ${relative}`);
  write(path.join(root, relative), html.replace('</head>', tags + '</head>'));
}
console.log(`Indexed ${sources.length} decks/guides, ${passages.length} passages, ${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB before compression. Search installed in ${htmlFiles.size} pages.`);
