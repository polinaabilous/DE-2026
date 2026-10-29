import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, chrome, trackerRoot, errorCapture } from './browser-harness.mjs';

const before=errorCapture+`window.searchIndexFetches=0;const originalFetch=window.fetch;window.fetch=(url,...args)=>{if(String(url).includes('deck-search-index.json'))window.searchIndexFetches++;return originalFetch(url,...args);};`;
const page=await fixture({before,after:'<script src="search-browser-check.js"></script>'});
try {
  await writeFile(join(page.publicDir,'search-browser-check.js'),await readFile(join(trackerRoot,'tests/search-browser-check.js')));
  const payload=JSON.parse(await readFile(join(page.publicDir,'deck-search-index.json')));
  payload.passages.push({source:'sql-window-functions',heading:'safetyneedle <img src=x onerror=alert(1)>',anchor:'slide-1',text:'safetyneedle literal <img src=x onerror=alert(1)> and <script>alert(1)</script>. Source examples must remain plain text.'});
  await writeFile(join(page.publicDir,'deck-search-index.json'),JSON.stringify(payload));
  for(const [name,size] of [['desktop','1280,1000'],['narrow','390,844']]) {
    const browser=chrome(join(page.root,'profile-'+name),['--virtual-time-budget=22000','--window-size='+size,'--force-device-scale-factor=1','--dump-dom',page.url]);
    const timer=setTimeout(()=>browser.child.kill('SIGKILL'),55000);
    try {
      const result=await browser.done;
      const match=result.output.match(/<pre id="search-browser-result">([\s\S]*?)<\/pre>/);
      assert.ok(match,'Search suite did not finish: '+result.errors.slice(-800));
      const entities={amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"};
      const report=JSON.parse(match[1].replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>entities[key]));
      assert.deepEqual(report.failures,[],name);assert.deepEqual(report.errors,[],name);
      console.log(`PASS: ${report.passed} deck-search browser checks on ${name} (${report.width}px).`);
    } finally {clearTimeout(timer);await browser.close();}
  }
} finally {await page.close();}
