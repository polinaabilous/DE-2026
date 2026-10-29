import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixture, debugBrowser, delay, errorCapture } from './browser-harness.mjs';

const page = await fixture({ before: errorCapture + `document.documentElement.dataset.theme='light';` });
let browser;
try {
  browser = await debugBrowser(join(page.root, 'map-profile'));
  const { send, evaluate } = browser;
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const input = async value => { await evaluate(`document.getElementById('landscapeSearch').value=${JSON.stringify(value)};document.getElementById('landscapeSearch').dispatchEvent(new Event('input',{bubbles:true}))`); };
  const waitFor = async expression => {
    for (let i = 0; i < 120; i++) {
      try { if (await evaluate(expression)) return; }
      catch (error) { if (!/context|active page/i.test(error.message)) throw error; }
      await delay(50);
    }
    throw Error('Timed out: ' + expression);
  };
  const screenshot = async (name, full = false) => {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
    await writeFile(join(tmpdir(), `ae-data-map-${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  for (const [name, width, height, mobile] of [['desktop', 1440, 1000, false], ['phone', 390, 844, true]]) {
    console.log(`Checking fresh ${name} page…`);
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await send('Page.navigate', { url: page.url + '?map-test=' + name + '#data-map' });
    await waitFor(`window.AE && document.querySelectorAll('.landscape-node').length===112`);
    await delay(250);
    assert.equal(await evaluate(`innerWidth`), width);
    assert.equal(await evaluate(`document.querySelectorAll('.landscape-group').length`), 14);
    assert.equal(await evaluate(`document.querySelector('.landscape-examples').open`), !mobile, 'examples start collapsed on phone');
    assert.equal(await evaluate(`document.querySelector('nav > a:last-child').getAttribute('href')`), '#dashboard');
    assert.equal(await evaluate(`document.querySelector('nav a[href="#data-map"]').getAttribute('aria-current')`), 'page');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, name + ': page fits');
    await screenshot(name);
    const progress = await evaluate(`JSON.stringify(AE.state())`);
    await input('HMS');
    assert.ok(await evaluate(`!!document.querySelector('#landscapeResults [data-map-term="hms"]')`));
    await click('#landscapeResults [data-map-term="hms"]');
    assert.equal(await evaluate(`document.getElementById('landscapeDialog').open`), true);
    assert.equal(await evaluate(`document.getElementById('landscapeTitle').textContent`), 'Hive Metastore');
    assert.equal(await evaluate(`location.hash`), '#data-map/hms');
    assert.ok(await evaluate(`document.querySelectorAll('#landscapeDialog .landscape-source-links a[href^="https:"]').length >= 1`));
    assert.equal(await evaluate(`document.getElementById('landscapeDialog').scrollWidth <= document.getElementById('landscapeDialog').clientWidth`), true, name + ': dialog fits');
    await screenshot(name + '-panel');
    await click('#landscapeDialog [data-map-term="trino"]');
    assert.equal(await evaluate(`document.getElementById('landscapeTitle').textContent`), 'Trino');
    await click('[data-map-back]');
    assert.equal(await evaluate(`document.getElementById('landscapeTitle').textContent`), 'Hive Metastore');
    await click('[data-map-focus]');
    assert.equal(await evaluate(`document.getElementById('landscapeDialog').open`), false);
    assert.ok(await evaluate(`!!document.querySelector('.landscape-node.is-root[data-map-term="hms"]')`));
    assert.ok(await evaluate(`!!document.querySelector('#landscapeResults [data-map-term="catalog"]')`));
    assert.equal(await evaluate(`!!document.querySelector('#landscapeResults [data-map-term="ruff"]')`), false);
    await screenshot(name + '-connections');
    await click('[data-map-clear]');
    await click('[data-map-kind="format"]');
    assert.equal(await evaluate(`document.querySelectorAll('.landscape-node').length===AELandscapeData.entries.filter(e=>e.kind==='format').length`), true);
    await input('columnar');
    assert.ok(await evaluate(`!!document.querySelector('#landscapeResults [data-map-term="parquet"]')`));
    await input('not-found-xyz');
    assert.ok(await evaluate(`!!document.querySelector('.landscape-empty')`));
    await click('.landscape-empty [data-map-clear]');
    assert.equal(await evaluate(`document.querySelectorAll('.landscape-node').length`), 112);
    await input('<img src=x onerror=alert(1)>');
    assert.equal(await evaluate(`document.querySelectorAll('.landscape-page img').length`), 0);
    await click('[data-map-clear]');
    await click('[data-map-group="compute"]');
    assert.equal(await evaluate(`document.querySelectorAll('.landscape-group').length`), 1);
    await click('[data-map-ungroup]');
    await click('[data-map-compare="hive"]');
    assert.equal(await evaluate(`document.querySelectorAll('.landscape-compare-cards > section').length`), 2);
    await click('#landscapeDialog [data-map-term="hive"]');
    await click('[data-map-copy]');
    await waitFor(`document.getElementById('landscapeCopyStatus').textContent.length>0`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor(`!document.getElementById('landscapeDialog').open && location.hash==='#data-map'`);
    assert.equal(await evaluate(`location.hash`), '#data-map');
    assert.equal(await evaluate(`JSON.stringify(AE.state())`), progress, 'reference does not mutate progress or notes');
    await click('#landscapeResults [data-map-term="hive"]');
    await click('#landscapeDialog [data-map-lesson="A2"]');
    assert.equal(await evaluate(`document.getElementById('landscapeDialog').open`), false);
    assert.equal(await evaluate(`document.getElementById('drawer').open`), true, 'related learning opens the existing lesson panel');
    await evaluate(`AE.closePanel();location.hash='#notes'`);
    await waitFor(`document.getElementById('view').dataset.route==='notes'`);
    await click('nav a[href="#data-map"]');
    await waitFor(`document.querySelectorAll('.landscape-node').length===112`);
    // Direct links must survive reload; unknown identities safely return to the map.
    await send('Page.navigate', { url: page.url + '?map-deep-link=' + name + '#data-map/trino' });
    await waitFor(`document.getElementById('landscapeDialog')?.open && document.getElementById('landscapeTitle')?.textContent==='Trino'`);
    await evaluate(`location.hash='#data-map/not-a-term'`);
    await waitFor(`location.hash==='#data-map' && !document.getElementById('landscapeDialog').open`);
    await evaluate(`document.documentElement.dataset.theme='dark';window.scrollTo(0,0)`);
    await screenshot(name + '-dark');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    assert.deepEqual(await evaluate(`window.testErrors`), []);
    console.log(`PASS: data map search, aliases, filters, connections, comparisons, focus/back/Escape, deep links, lesson links, unchanged progress and layout at ${width}px.`);
  }
  assert.deepEqual(browser.errors, []);
} finally { await browser?.close(); await page.close(); }
