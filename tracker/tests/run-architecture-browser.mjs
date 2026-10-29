import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixture, chrome, delay } from './browser-harness.mjs';

// An isolated profile and fixture never touch the user's tracker state.
const page = await fixture();
const profile = join(page.root, 'architecture-profile');
const browser = chrome(profile, ['--remote-debugging-port=0', 'about:blank']);
let socket;
const timer = setTimeout(() => browser.child.kill('SIGKILL'), 55000);
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await delay(100); }
  }
  assert.ok(port, 'Chrome debugger available');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), errors = [];
  socket.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.id) {
      const task = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) task.reject(Error(JSON.stringify(msg.error))); else task.resolve(msg.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Runtime.enable');
  for (const [name, width, height, mobile] of [['desktop', 1280, 1000, false], ['phone', 390, 844, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await send('Page.navigate', { url: page.url + 'decks/architecture-evolution/architecture-evolution.html?device=' + name });
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`document.body?.classList.contains('enhanced') && document.querySelectorAll('.slide').length===40`)) break;
      await delay(50);
    }
    assert.equal(await evaluate(`document.querySelectorAll('.slide').length`), 40);
    assert.equal(await evaluate(`document.querySelector('.slide.active').id`), 'slide-1');
    assert.equal(await evaluate(`document.getElementById('previous').disabled`), true);
    assert.equal(await evaluate(`innerWidth`), width, 'real device emulation');
    assert.equal(await evaluate(`[...document.querySelectorAll('.arch-tools')].every(rail=>[...rail.querySelectorAll('.arch-tool')].every((d,i)=>d.open===(${!mobile}&&i===0)))`), true, 'only first desktop card starts expanded; phone cards start collapsed');
    assert.equal(await evaluate(`(()=>{const button=document.getElementById('next'),r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===button})()`), true, 'Next is not covered by search launcher');
    await evaluate(`document.querySelector('[data-read-story]').click()`);
    await delay(50);
    assert.equal(await evaluate(`document.body.classList.contains('reading')`), true, 'cover action opens the connected story');
    assert.equal(await evaluate(`location.hash`), '#slide-2');
    assert.equal(await evaluate(`[...document.querySelectorAll('.slide')].filter(s=>getComputedStyle(s).display!=='none').length`), 40);
    assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('#slide-2 .arch-narrative>p')).fontSize)>=18`), 'prose remains readable');
    await evaluate(`document.getElementById('reading').click();document.getElementById('previous').click()`);
    await evaluate(`document.getElementById('next').click()`);
    assert.equal(await evaluate(`location.hash`), '#slide-2');
    await evaluate(`document.getElementById('previous').click();document.getElementById('open-contents').click();document.getElementById('search').value='mesh';document.getElementById('search').dispatchEvent(new Event('input'))`);
    assert.equal(await evaluate(`document.getElementById('contents').open`), true);
    assert.ok(await evaluate(`[...document.querySelectorAll('#contents-list li:not([hidden])')].some(li=>li.textContent.includes('Four principles'))`));
    await evaluate(`document.querySelector('#contents-list a[href="#slide-25"]').click()`);
    assert.equal(await evaluate(`document.querySelector('.slide.active').id`), 'slide-25');
    assert.equal(await evaluate(`document.getElementById('contents').open`), false);
    await evaluate(`document.getElementById('reading').click()`);
    assert.equal(await evaluate(`[...document.querySelectorAll('.slide')].filter(s=>getComputedStyle(s).display!=='none').length`), 40);
    assert.equal(await evaluate(`[...document.querySelectorAll('.slide')].some(s=>s.getAttribute('aria-hidden')==='true')`), false);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, name + ' no horizontal page overflow');
    await evaluate(`document.getElementById('reading').click();location.hash='#slide-35'`);
    await delay(50);
    await evaluate(`document.querySelector('#slide-35 details summary').click()`);
    assert.equal(await evaluate(`document.querySelector('#slide-35 details').open`), true);
    const expandedBeforePrint = await evaluate(`[...document.querySelectorAll('details')].map(d=>d.open)`);
    await evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
    assert.equal(await evaluate(`[...document.querySelectorAll('details')].every(d=>d.open)`), true);
    await evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    assert.equal(await evaluate(`document.querySelector('#slide-35 details').open`), true);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('details')].map(d=>d.open)`), expandedBeforePrint, 'print restores answers, sources and tool cards');
    await evaluate(`location.hash='#slide-8'`); await delay(50);
    const layout = await evaluate(`(()=>{const slide=document.getElementById('slide-8'),story=slide.querySelector('.arch-narrative').getBoundingClientRect(),rail=slide.querySelector('.arch-tools').getBoundingClientRect();return {beside:rail.left>=story.right,below:rail.top>=story.bottom,tools:slide.querySelectorAll('.arch-tool').length}})()`);
    assert.equal(layout.tools, 5);
    assert.equal(mobile ? layout.below : layout.beside, true, 'tool references beside desktop story, below phone story');
    await evaluate(`document.querySelector('#slide-8 .arch-tool summary').click()`);
    assert.equal(await evaluate(`document.querySelector('#slide-8 .arch-tool').open`), mobile, 'reference card can be toggled');
    await evaluate(`document.getElementById('next').click();document.getElementById('previous').click()`);
    assert.equal(await evaluate(`document.querySelector('#slide-8 .arch-tool').open`), mobile, 'navigation preserves reference choices');
    await evaluate(`document.querySelector('#slide-8 .arch-tool summary').click()`);
    for (const slide of [1, 8, 16, 25, 33, 34, 39]) {
      await evaluate(`location.hash='#slide-${slide}'`); await delay(25);
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, name + ' slide ' + slide);
      if ([1, 8, 16, 25, 34].includes(slide)) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(tmpdir(), `ae-architecture-${name}-${slide}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
    // The visible links and companion/lab files must be served, not SPA fallbacks.
    for (const file of ['architecture-evolution.md', 'lab/README.md', 'lab/run_lab.py', 'lab/selection.json', 'lab/raw/2025-01-v2.csv']) {
      const response = await fetch(page.url + 'decks/architecture-evolution/' + file);
      assert.equal(response.status, 200, file);
      assert.ok((await response.text()).length > 50);
    }
    console.log(`PASS: architecture navigation, contents search, reading, responsive tool cards, answer/print state, lab links and layout at ${width}px.`);
  }
  assert.deepEqual(errors, [], 'no page JavaScript exceptions');
} finally {
  clearTimeout(timer); socket?.close(); await browser.close(); await page.close();
}
