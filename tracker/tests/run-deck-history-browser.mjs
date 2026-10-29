import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixture, debugBrowser, delay, errorCapture } from './browser-harness.mjs';

const page = await fixture({ before: errorCapture });
const browser = await debugBrowser(join(page.root, 'history-profile'));
const { evaluate, send } = browser;
async function until(expression, label) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(50); }
  assert.fail(label);
}
async function route(name) {
  await evaluate(`location.hash='#${name}'`);
  await until(`document.getElementById('view').dataset.route==='${name}'`, name);
}
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: page.url });
  await until('!!window.AE', 'tracker ready');
  assert.equal(await evaluate(`document.querySelector('[data-recent-decks]').hidden`), true, 'empty history does not add clutter');
  const completion = await evaluate(`JSON.stringify({lib:AE.state().lib,done:AE.state().done,ck:AE.state().ck,act:AE.state().act})`);
  // A real lesson link opens the deck in another tab.
  await evaluate(`AE.openItem('S5');document.querySelector('#drawer .deck-actions a').click()`);
  await until(`Object.keys(AE.state().deckVisits).length>0`, 'lesson deck recorded');
  const firstId = await evaluate(`Object.keys(AE.state().deckVisits)[0]`);
  await evaluate('AE.closePanel()');
  assert.equal(await evaluate(`document.querySelector('[data-recent-decks]').hidden`), false);
  assert.equal(await evaluate(`JSON.stringify({lib:AE.state().lib,done:AE.state().done,ck:AE.state().ck,act:AE.state().act})`), completion);
  // A direct URL has no link-click event in the tracker; the shared script must record it.
  const direct = await send('Target.createTarget', { url: page.url + 'decks/architecture-evolution/architecture-evolution.html#slide-8' });
  await until(`AE.state().deckVisits['architecture-evolution']>0`, 'direct deck open reaches tracker through storage');
  await send('Target.closeTarget', { targetId: direct.targetId });
  for (const id of ['python-foundations', 'dbt-fundamentals', 'data-file-formats']) {
    await delay(10); await evaluate(`AEDeckHistory.store.record('${id}')`);
  }
  await until(`document.querySelectorAll('.recent-deck').length===4`, 'four recent cards shown');
  assert.ok(await evaluate(`document.querySelector('.recent-deck').href.includes('data-file-formats')`));
  assert.ok(!await evaluate(`Object.values(AE.state().lib).includes('done')`));
  // Reopening promotes the same entry rather than adding a duplicate.
  const count = await evaluate('Object.keys(AE.state().deckVisits).length');
  await delay(10); await evaluate(`AEDeckHistory.store.record(${JSON.stringify(firstId)})`);
  await until(`document.querySelector('.recent-deck').href.includes(PLAN.decks[${JSON.stringify(firstId)}].file)`, 'reopen promotes deck');
  assert.equal(await evaluate('Object.keys(AE.state().deckVisits).length'), count);
  await send('Page.reload'); await until('!!window.AE', 'tracker reloads');
  assert.equal(await evaluate('Object.keys(AE.state().deckVisits).length'), count, 'history survives reload');
  for (const name of ['topics', 'roadmap', 'resources', 'dashboard']) {
    await route(name);
    assert.equal(await evaluate(`document.querySelectorAll('.recent-deck').length`), 4, name);
  }
  await route('resources');
  await evaluate(`document.querySelector('[data-rtab="lib"]').click();document.getElementById('lq').value='window';document.getElementById('lq').dispatchEvent(new Event('input',{bubbles:true}))`);
  await evaluate(`AEDeckHistory.store.record('sql-query-structure')`); await delay(30);
  assert.equal(await evaluate(`document.getElementById('lq').value`), 'window', 'history updates preserve active resource filters');
  // Search result links are also registered deck opens.
  await evaluate(`document.querySelector('[data-deck-search-open]').click();const input=document.getElementById('aeSearchInput');input.value='CTE vs subquery';input.dispatchEvent(new Event('input'))`);
  await until(`!!document.querySelector('.ae-search-result a')`, 'search results ready');
  const searchDeck = await evaluate(`AEDeckHistory.catalog(PLAN.decks,PLAN.deckBase,document.baseURI).match(document.querySelector('.ae-search-result a').href)`);
  await evaluate(`document.querySelector('.ae-search-result a').click()`);
  await until(`AE.state().deckVisits[${JSON.stringify(searchDeck)}]>0`, 'search result recorded');
  await evaluate(`document.querySelector('.ae-search-close').click()`);
  // Notes/drafts are left untouched by incoming opens in another tab.
  await route('notes');
  await evaluate(`const text=document.querySelector('.nadd textarea');text.value='Keep this draft';text.dispatchEvent(new Event('input',{bubbles:true}));AEDeckHistory.store.record('sql-aggregation')`);
  assert.equal(await evaluate(`document.querySelector('.nadd textarea').value`), 'Keep this draft');
  await route('topics');
  for (const [name, width, height, mobile] of [['desktop',1280,1000,false],['phone',390,844,true]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    for (const theme of ['light','dark']) {
      await evaluate(`document.documentElement.dataset.theme='${theme}'`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,name+' '+theme+' has no horizontal overflow');
      assert.equal(await evaluate(`document.querySelector('.recent-deck').getBoundingClientRect().height>=44`),true,'comfortable tap target');
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(join(tmpdir(),`ae-recent-decks-${name}-${theme}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  // Previously recorded anonymous opens are not handed to a different account.
  await evaluate(`AEDeckHistory.store.setAccount('another');AEDeckHistory.store.record('dim-fact-tables')`);
  assert.equal(await evaluate(`AE.state().deckVisits['dim-fact-tables']`), undefined);
  await evaluate(`AEDeckHistory.store.setAccount(null);document.querySelector('[data-act="data"]').click();document.querySelector('[data-act="reset"]').click()`);
  assert.equal(await evaluate('Object.keys(AE.state().deckVisits).length'),0,'reset clears recent decks');
  await send('Page.reload'); await until('!!window.AE','reset reload');
  assert.equal(await evaluate('Object.keys(AE.state().deckVisits).length'),0,'acknowledged opens do not return after reset');
  assert.deepEqual(await evaluate('testErrors'),[]);
  assert.deepEqual(browser.errors,[]);
  console.log('PASS: lesson/search/direct opens, cross-tab updates, deduplication, reload, four routes, filters/drafts, reset/account isolation and desktop/phone themes.');
} finally { await browser.close(); await page.close(); }
