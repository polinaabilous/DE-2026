const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const content = require('../content/dimension-scd.cjs');

test('advanced SCD materials stay reproducible and preserve existing dimension lesson links', () => {
  execFileSync(process.execPath,[path.resolve(__dirname,'../scripts/build-dimension-scd.cjs'),'--check']);
  const folder=path.resolve(__dirname,'../ae-tracker/decks/dim-dimension-tables');
  const html=fs.readFileSync(path.join(folder,'dim-dimension-tables.html'),'utf8');
  const md=fs.readFileSync(path.join(folder,'scd-advanced.md'),'utf8');
  const ids=[...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,28);
  assert.equal(new Set(ids).size,28);
  for(let i=1;i<=20;i++)assert.ok(ids.includes('slide-'+i),'original anchor '+i);
  assert.deepEqual(ids.slice(ids.indexOf('slide-9')+1,ids.indexOf('slide-10')),content.slides.map(s=>'slide-'+s.id));
  for(const s of content.slides){
    assert.ok(md.includes(`<a id="slide-${s.id}"></a>`));
    assert.ok(md.includes(s.takeaway));
  }
  assert.ok(html.includes('id="slide-10" data-num="10" aria-labelledby="title-10" data-title="Date dimensions: why not just use a date column?"'));
  const decode=s=>s.replace(/&(amp|lt|gt|quot|#39);/g,(_,k)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[k]);
  for(const match of html.matchAll(/<code class="language-sql" data-scd-sql="([^"]+)">([\s\S]*?)<\/code>/g)){
    assert.equal(decode(match[2]),content.sql[match[1]],'the displayed SQL is the lab SQL');
  }
});
