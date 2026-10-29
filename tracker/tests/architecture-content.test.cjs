const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const content = require('../content/architecture-evolution.cjs');
const toolDefinitions = require('../content/architecture-tools.cjs');
function authoredSections() {
  const slides = [];
  const node = type => (...args) => ({ type, args });
  content({ slide: (category, title, nodes, takeaway, refs) => slides.push({ title, nodes, takeaway, refs }),
    p: node('p'), table: node('table'), flow: node('flow'), call: node('call'), code: node('code'), answer: node('answer') });
  return slides;
}

test('new tools and formats are explained before the narrative uses their names later', () => {
  const slides = authoredSections();
  const bodies = slides.map(s => JSON.stringify(s.nodes));
  for (const [name, section, introducedAs] of content.introductions) {
    const regex = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    assert.equal(bodies.findIndex(text => regex.test(text)) + 1, section, `${name} is not named before its explanation`);
    assert.ok(bodies[section - 1].includes(introducedAs), `${name} appears in its introduction section`);
    const [role, explanation, source] = toolDefinitions[name] || [];
    assert.ok(role && explanation && source, `${name} has a complete first-use reference card`);
  }
  assert.deepEqual(Object.keys(toolDefinitions).sort(), content.introductions.map(t => t[0]).sort(), 'no orphan or missing definitions');
});

test('narrative revision keeps lesson/lab sections stable and confines tables to reference comparisons', () => {
  const slides = authoredSections();
  assert.equal(slides.length, 38);
  assert.ok(slides[16].title.includes('query'), 'catalog/engine walkthrough remains section 17');
  assert.ok(slides[21].title.includes('Medallion'));
  assert.ok(slides[24].title.includes('Four principles'));
  assert.ok(slides[32].title.includes('lab') && slides[33].title.includes('Run it'));
  assert.deepEqual(slides.flatMap((s, i) => s.nodes.some(n => n.type === 'table') ? [i + 1] : []), [33, 37]);
});

test('architecture HTML and Markdown match the authored narrative', () => {
  execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/build-architecture-deck.cjs'), '--check']);
  const folder = path.resolve(__dirname, '../ae-tracker/decks/architecture-evolution');
  const html = fs.readFileSync(path.join(folder, 'architecture-evolution.html'), 'utf8');
  assert.equal((html.match(/<section class="slide/g) || []).length, 40);
  assert.equal((html.match(/<table>/g) || []).length, 2);
  assert.ok(html.includes('data-read-story'));
  const md = fs.readFileSync(path.join(folder, 'architecture-evolution.md'), 'utf8');
  assert.equal((html.match(/class="arch-tool"/g) || []).length, content.introductions.length);
  for (const [name] of content.introductions) {
    const [, description] = toolDefinitions[name];
    assert.ok(md.includes(description), `${name} definition remains searchable in companion Markdown`);
  }
});
