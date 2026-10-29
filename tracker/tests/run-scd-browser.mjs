import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { fixture, debugBrowser, delay } from './browser-harness.mjs';
const require = createRequire(import.meta.url);
const { slides, sql } = require('../content/dimension-scd.cjs');
const page = await fixture();
const browser = await debugBrowser(join(page.root, 'scd-profile'));
const { send, evaluate } = browser;
const until = async expression => {
  for (let i=0;i<100;i++) { if(await evaluate(expression))return;await delay(50); }
  assert.fail(expression);
};
const deck = 'decks/dim-dimension-tables/';
try {
  for (const [name,width,height,mobile] of [['desktop',1280,1000,false],['phone',390,844,true]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await send('Page.navigate',{url:page.url+deck+'dim-dimension-tables.html?screen='+name+'#slide-21'});
    await until(`document.querySelector('.slide.active')?.id==='slide-21'`);
    assert.equal(await evaluate(`document.querySelectorAll('.slide').length`),28);
    const ids=await evaluate(`[...document.querySelectorAll('.slide')].map(s=>s.id)`);
    assert.equal(new Set(ids).size,28,'unique section identities');
    assert.deepEqual(ids.slice(ids.indexOf('slide-9')+1,ids.indexOf('slide-10')),slides.map(s=>'slide-'+s.id));
    assert.equal(await evaluate(`document.getElementById('counter').textContent`),'12 / 28');
    await evaluate(`document.getElementById('previous').click()`);
    assert.equal(await evaluate('location.hash'),'#slide-9');
    await evaluate(`document.querySelector('#slide-9 a[href="#slide-23"]').click()`);
    await until(`document.querySelector('.slide.active').id==='slide-23'`);
    for(const s of slides) {
      await evaluate(`location.hash='#slide-${s.id}'`);
      await until(`document.querySelector('.slide.active').id==='slide-${s.id}'`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,name+' '+s.label+' page fits');
      const keys=await evaluate(`[...document.querySelectorAll('#slide-${s.id} [data-scd-sql]')].map(c=>[c.dataset.scdSql,c.textContent])`);
      for(const [key,text] of keys)assert.equal(text,sql[key],'displayed SQL matches executed lab');
      await evaluate(`document.querySelectorAll('#slide-${s.id} details').forEach(d=>d.open=true)`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,name+' '+s.label+' expanded page fits');
      await evaluate(`document.querySelectorAll('#slide-${s.id} details').forEach(d=>d.open=false)`);
      if([21,23,25].includes(s.id)) {
        const shot=await send('Page.captureScreenshot',{format:'png'});
        await writeFile(join(tmpdir(),`ae-scd-${name}-${s.id}.png`),Buffer.from(shot.data,'base64'));
      }
    }
    await evaluate(`document.getElementById('next').click()`);
    assert.equal(await evaluate('location.hash'),'#slide-10','existing date-dimension link retained');
    await evaluate(`document.getElementById('open-contents').click();const input=document.getElementById('search');input.value='Type 6';input.dispatchEvent(new Event('input'))`);
    assert.ok(await evaluate(`!!document.querySelector('#contents-list li:not([hidden]) a[href="#slide-25"]')`));
    await evaluate(`document.querySelector('#contents-list a[href="#slide-25"]').click();document.getElementById('reading').click()`);
    assert.equal(await evaluate(`[...document.querySelectorAll('.slide')].filter(s=>getComputedStyle(s).display!=='none').length`),28);
    const before=await evaluate(`[...document.querySelectorAll('details')].map(d=>d.open)`);
    await evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
    assert.ok(await evaluate(`[...document.querySelectorAll('details')].every(d=>d.open)`));
    await evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('details')].map(d=>d.open)`),before);
    for(const file of ['scd-advanced.md','lab/run_scd_lab.py','lab/README.md']) {
      const response=await fetch(page.url+deck+file);
      assert.equal(response.status,200);
      assert.ok((await response.text()).length>200,file+' serves actual content');
    }
    console.log(`PASS: ${name} SCD walkthroughs, exact SQL, stable neighbors, Contents, reading/print, downloads and layout.`);
  }
  await send('Page.navigate',{url:page.url+'#topics'});await until('!!window.AE');
  await evaluate(`AE.openItem('M3')`);
  assert.ok(await evaluate(`!!document.querySelector('#drawer a[href$="dim-dimension-tables/scd-advanced.md"]')`));
  assert.ok(await evaluate(`!!document.querySelector('#drawer a[href$="dim-dimension-tables/lab/README.md"]')`));
  assert.deepEqual(browser.errors,[]);
  const index=JSON.parse(await readFile(join(page.publicDir,'deck-search-index.json'),'utf8'));
  for(const s of slides) assert.ok(index.passages.some(p=>p.source==='dim-dimension-tables'&&p.anchor==='slide-'+s.id));
  console.log('PASS: the lesson panel links notes/lab and shared search includes all six new sections.');
} finally { await browser.close();await page.close(); }
