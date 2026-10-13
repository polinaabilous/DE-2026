// Export the signed-out DataLemur catalog and verify each tag against browser results.
// Run: node scripts/export-datalemur.cjs [output-folder]
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const os = require('node:os');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function withBrowser(task) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'datalemur-export-'));
  fs.mkdirSync(profile, { recursive: true });
  fs.rmSync(path.join(profile, 'DevToolsActivePort'), { force: true });
  const chrome = spawn(process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome'), ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--user-data-dir=' + profile, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
  let ws;
  let launchError;
  chrome.on('error', error => { launchError = error; });
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      if (launchError) throw Error('Could not launch Chrome: ' + launchError.message + '. Set CHROME_PATH to its executable.');
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch { await delay(100); }
    }
    if (!port) throw Error('Chrome did not start');
    const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    let seq = 0;
    const pending = new Map();
    ws.addEventListener('message', e => {
      const message = JSON.parse(e.data);
      if (!message.id || !pending.has(message.id)) return;
      const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
      message.error ? p.reject(Error(JSON.stringify(message.error))) : p.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(Error('Timeout: ' + method)); }, 30000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await send('Page.enable'); await send('Runtime.enable');
    await task({ send, evaluate, delay });
  } finally {
    ws?.close();
    if (chrome.pid && chrome.exitCode === null) {
      await new Promise(resolve => { chrome.once('exit', resolve); chrome.kill('SIGTERM'); });
    }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}


function writeExports(data, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cell = value => '"' + String(value).replace(/"/g, '""') + '"';
  const csv = problems => '\ufeff' + ['id,title,company,category,difficulty,tags,url', ...problems.map(p => [p.id,p.title,p.company,p.category,p.difficulty,p.tags.join(' | '),p.url].map(cell).join(','))].join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(outDir, 'problems.json'), JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'problems.csv'), csv(data.problems));
  fs.writeFileSync(path.join(outDir, 'problems-sql.csv'), csv(data.problems.filter(p => p.category === 'SQL')));
  const categories = [...new Set(data.problems.map(p => p.category))].sort();
  const options = list => list.map(x => '<option value="' + escape(x) + '">' + escape(x) + '</option>').join('');
  const rows = data.problems.map(p => `<tr><td data-label="Problem"><a href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">${escape(p.title)}<span aria-hidden="true"> ↗</span></a><span class="company">${escape(p.company)}</span></td><td data-label="Category">${escape(p.category)}</td><td data-label="Difficulty"><span class="difficulty ${p.difficulty.toLowerCase()}">${escape(p.difficulty)}</span></td><td data-label="Tags"><div class="tags">${p.tags.length ? p.tags.map(t => `<button class="tag" type="button" data-tag="${escape(t)}" title="Filter by ${escape(t)}">${escape(t)}</button>`).join('') : '<span class="untagged">No public tags returned</span>'}</div></td></tr>`).join('\n');
  const summary = data.tags.map(t => `<tr><td>${escape(t.name)}</td><td>${t.accessible_count}</td><td>${t.site_badge_count}</td></tr>`).join('');
  const payload = JSON.stringify(data.problems).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DataLemur · Problems & tags</title>
<style>
:root{color-scheme:light;--ink:#19392e;--muted:#5a7065;--green:#176b45;--line:#dce6de;--paper:#fffefa;--wash:#f3f7ee}*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1240px;margin:auto;padding:48px 32px 64px}.eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;font-weight:750;color:var(--green)}h1{font-size:clamp(32px,4.5vw,54px);line-height:1.1;letter-spacing:-.04em;margin:14px 0}h2{font-size:20px;margin:0}p{max-width:850px;color:var(--muted);margin:12px 0}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.counts{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}.stat{padding:12px 18px;background:var(--paper);border:1px solid var(--line);border-radius:12px}.stat strong{font-size:23px;margin-right:6px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}a{color:var(--green)}button,input,select{font:inherit}button,.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border-radius:9px;border:1px solid var(--line);background:var(--paper);padding:9px 15px;color:var(--ink);cursor:pointer;text-decoration:none;font-weight:650}button:hover,.button:hover{background:#e9f3e7;border-color:#7daf8e}.primary{background:var(--green);color:white;border-color:var(--green)}.primary:hover{background:#115437;color:white}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #62a97d;outline-offset:3px}.panel{border:1px solid var(--line);border-radius:16px;background:var(--paper);overflow:hidden}.filters{display:grid;grid-template-columns:1.6fr 1fr .8fr 1.6fr;gap:16px;padding:24px;border-bottom:1px solid var(--line)}label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:700}input,select{min-width:0;width:100%;height:46px;padding:9px 11px;border:1px solid #c7d7ca;border-radius:8px;color:var(--ink);background:white;font-size:15px}.result-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 24px}.result-bar p{margin:0;font-size:14px}.result-bar button{font-size:14px}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th{font-size:12px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;background:#f6f8f1}th,td{padding:17px 24px;border-top:1px solid var(--line);vertical-align:top}th:first-child{width:30%}th:last-child{width:44%}td a{font-weight:700;text-decoration:none}td a:hover{text-decoration:underline}.company{display:block;color:var(--muted);font-size:13px;margin-top:5px}.difficulty{display:inline-block;border-radius:6px;padding:3px 9px;font-size:12px;font-weight:700;background:#eaf3e4;color:#397024}.medium{background:#fff0d9;color:#805415}.hard{background:#fde9e2;color:#994631}.tags{display:flex;flex-wrap:wrap;gap:6px}.tag{min-height:32px;font-weight:500;font-size:12px;line-height:1.3;padding:6px 9px;background:#eef5ed;border-color:#d8e7d7;color:#2d6545;text-align:left}.untagged{font-size:13px;color:var(--muted)}#empty{padding:32px;text-align:center;color:var(--muted)}[hidden]{display:none!important}.coverage{margin-top:22px;padding:20px 24px;background:#eaf1e3;border:1px solid #d6e1ce;border-radius:12px}.coverage p{font-size:14px}.coverage summary{cursor:pointer;font-weight:700;padding:3px 0}.coverage table{margin-top:16px;font-size:14px}.coverage th,.coverage td{padding:10px 14px}footer{margin-top:24px;color:var(--muted);font-size:13px}.js-only{display:none}body.enhanced .js-only{display:initial}
@media(max-width:900px){.filters{grid-template-columns:1fr 1fr}th,td{padding:14px 16px}.top{display:block}}@media(max-width:600px){main{padding:28px 16px}.stat{padding:10px 12px}.stat strong{font-size:20px}.filters{padding:16px;gap:12px}.filters label:first-child,.filters label:last-child{grid-column:1/-1}.result-bar{padding:14px 16px;align-items:flex-start;flex-wrap:wrap}thead{display:none}table,tbody,tr,td{display:block;width:100%}tbody tr{padding:16px;border-top:1px solid var(--line)}td{padding:4px 0;border:0}td:first-child{padding-bottom:8px}td:nth-child(2),td:nth-child(3){display:inline-block;width:auto;margin-right:14px;font-size:13px}td:last-child{padding-top:12px}.coverage{padding:16px}.coverage table{display:table}.coverage thead{display:table-header-group}.coverage tbody{display:table-row-group}.coverage tr{display:table-row}.coverage td,.coverage th{display:table-cell;width:auto;padding:9px 7px;font-size:12px}.coverage td:nth-child(2),.coverage td:nth-child(3){display:table-cell}.actions>*{flex:1 1 auto}.tag{min-height:40px}}@media print{body{background:white}main{padding:0}.filters,.actions,.result-bar button{display:none!important}.panel{border:0}.table-scroll{overflow:visible}.tag{border:0;background:none;padding:0;min-height:0;cursor:default}.tags{gap:5px}.tags .tag::after{content:";"}tr{break-inside:avoid}th,td{padding:8px}a{color:inherit;text-decoration:none}}
</style></head><body><main>
<header class="top"><div><div class="eyebrow">Interview practice · Topic index</div><h1>DataLemur, with the tags.</h1><p>The public problem catalog in one place. Search a question, pick a topic, or click a tag to find related practice.</p></div><a class="button" href="${data.source_url}" target="_blank" rel="noopener noreferrer">Open DataLemur ↗</a></header>
<div class="counts"><div class="stat"><strong>${data.coverage.problem_count}</strong> public problems</div><div class="stat"><strong>${data.coverage.sql_problem_count}</strong> SQL problems</div><div class="stat"><strong>${data.coverage.tag_count}</strong> tag filters checked</div></div>
<div class="actions"><button id="sql-only" class="primary js-only" type="button">Show SQL only</button><button id="export" class="js-only" type="button">Export current results</button><a class="button" href="problems.csv" download>All problems · CSV</a><a class="button" href="problems-sql.csv" download>SQL · CSV</a></div>
<section class="panel" aria-label="Problem catalog"><form class="filters" id="filters"><label>Search<input id="search" type="search" placeholder="Problem, company, or tag…" autocomplete="off"></label><label>Category<select id="category"><option value="">All categories</option>${options(categories)}</select></label><label>Difficulty<select id="difficulty"><option value="">Any difficulty</option>${options(['Easy','Medium','Hard'])}</select></label><label>Tag<select id="tag"><option value="">All tags</option><option value="__none__">No public tags returned</option>${data.tags.map(t=>`<option value="${escape(t.name)}">${escape(t.name)} (${t.accessible_count})</option>`).join('')}</select></label></form>
<div class="result-bar"><p id="result-count" role="status" aria-live="polite">Showing ${data.problems.length} of ${data.problems.length} problems</p><button id="clear" type="button" class="js-only">Clear filters</button></div><noscript><p style="padding:0 24px">Enable JavaScript to filter this list. All exported problems and their tags are displayed below.</p></noscript>
<div class="table-scroll"><table><caption style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">DataLemur problem titles, companies, categories, difficulty, and observed public filter tags</caption><thead><tr><th scope="col">Problem / company</th><th scope="col">Category</th><th scope="col">Difficulty</th><th scope="col">Tags</th></tr></thead><tbody id="problems">${rows}</tbody></table><div id="empty" hidden>No matches. Try another search or clear the filters.</div></div></section>
<aside class="coverage"><h2>What this snapshot covers</h2><p>All ${data.coverage.problem_count} problems returned by DataLemur’s signed-out catalog. Each tag was checked by selecting its filter and comparing the displayed problem URLs with the site’s public response. Tags are copied from those memberships; they are not inferred from solutions.</p><p>DataLemur’s sidebar badges sometimes count more problems than its public filters return. Additional problems may require account access; their identities and memberships are absent from the public response. This is not a complete premium-catalog export. ${data.coverage.problems_without_returned_tags} problems have no membership returned by any of the 22 public filters.</p><details><summary>Accessible results vs. site badge counts</summary><div class="table-scroll"><table><thead><tr><th scope="col">Tag</th><th scope="col">Accessible</th><th scope="col">Site badge</th></tr></thead><tbody>${summary}</tbody></table></div></details></aside>
<footer>Snapshot: <time datetime="${data.extracted_at}">${data.extracted_at.slice(0,10)} UTC</time> · <a href="problems.json">JSON with provenance</a> · <a href="README.md">Extraction notes</a> · Problem statements, solutions, and personal progress are not included.</footer>
</main><script type="application/json" id="data">${payload}</script><script>
(()=>{'use strict';const data=JSON.parse(document.getElementById('data').textContent);const ids=['search','category','difficulty','tag'];const fields=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));const rows=[...document.querySelectorAll('#problems tr')];let visible=data;document.body.classList.add('enhanced');
function filter(){const text=fields.search.value.trim().toLocaleLowerCase();visible=[];data.forEach((p,i)=>{const match=(!text||[p.title,p.company,p.category,p.difficulty,...p.tags].join(' ').toLocaleLowerCase().includes(text))&&(!fields.category.value||p.category===fields.category.value)&&(!fields.difficulty.value||p.difficulty===fields.difficulty.value)&&(!fields.tag.value||(fields.tag.value==='__none__'?!p.tags.length:p.tags.includes(fields.tag.value)));rows[i].hidden=!match;if(match)visible.push(p)});document.getElementById('result-count').textContent='Showing '+visible.length+' of '+data.length+' problems';document.getElementById('empty').hidden=visible.length>0;document.getElementById('export').disabled=visible.length===0;}
ids.forEach(id=>fields[id].addEventListener(id==='search'?'input':'change',filter));document.getElementById('filters').addEventListener('submit',e=>e.preventDefault());document.getElementById('clear').addEventListener('click',()=>{ids.forEach(id=>fields[id].value='');filter()});document.getElementById('sql-only').addEventListener('click',()=>{ids.forEach(id=>fields[id].value='');fields.category.value='SQL';filter();fields.search.focus()});document.getElementById('problems').addEventListener('click',e=>{const button=e.target.closest('[data-tag]');if(!button)return;fields.tag.value=button.dataset.tag;filter();fields.tag.focus()});document.getElementById('export').addEventListener('click',()=>{const cell=v=>'"'+String(v).replace(/"/g,'""')+'"';const body=['id,title,company,category,difficulty,tags,url',...visible.map(p=>[p.id,p.title,p.company,p.category,p.difficulty,p.tags.join(' | '),p.url].map(cell).join(','))].join('\\r\\n');const url=URL.createObjectURL(new Blob(['\\ufeff'+body+'\\r\\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='datalemur-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});filter();})();
</script></body></html>`;
  fs.writeFileSync(path.join(outDir,'index.html'),html);
  fs.writeFileSync(path.join(outDir,'README.md'),`# DataLemur problem tags\n\nSnapshot: ${data.extracted_at}\n\nSource: [DataLemur public catalog](${data.source_url}).\n\n- [Browse the searchable catalog](index.html). Opens locally and works offline.\n- [All problems CSV](problems.csv): ${data.coverage.problem_count} rows, one per problem.\n- [SQL CSV](problems-sql.csv): ${data.coverage.sql_problem_count} rows.\n- [JSON](problems.json): arrays of exact tag names, source, extraction time, and per-tag validation/counts.\n\nCSV columns: id, title, company, category, difficulty, tags, url. Multiple tags use \` | \` as the separator. CSVs include a UTF-8 BOM for spreadsheet compatibility.\n\n## How it was extracted\n\nAn isolated, signed-out Chrome browser opened the normal questions page through Chrome DevTools Protocol. The public page's catalog state supplied the problem metadata and available tag controls. For each tag, automation deselected the previous tag, selected the next one, and read the exact public list response used by the browser. Every displayed problem URL was compared with that response. All ${data.coverage.tag_count} checks passed; no solutions or problem statements were extracted.\n\n## Coverage limits\n\n${data.coverage.scope}\n\n${data.coverage.badge_count_note}\n\n${data.coverage.empty_tags_note} ${data.coverage.problems_without_returned_tags} records have empty tag arrays. Tags reflect the site's taxonomy, which can mix SQL topics, approaches, and book references. Do not treat them as a complete taxonomy of everything a problem might teach.\n\nThe JSON tag records preserve both the sidebar badge counts and the accessible counts, together with the exact accessible problem slugs. Counts are a snapshot and can change.\n\n## Refresh\n\nRequires Node.js 22 or newer and Google Chrome installed. No npm packages or DataLemur credentials are needed. From the repository root:\n\n\`\`\`sh\nnode scripts/export-datalemur.cjs\n\`\`\`\n\nOn systems where Chrome is installed elsewhere, set \`CHROME_PATH\` to its executable. An optional first argument chooses the export folder. The script uses a temporary browser profile and closes it afterward. It validates all tag results before overwriting the snapshot; schema changes or access failures stop the extraction with an error.\n`);
}

withBrowser(async({send,evaluate,delay})=>{
 await send('Page.navigate',{url:'https://datalemur.com/questions'});
 for(let i=0;i<100;i++){if(await evaluate("!!document.querySelector('table')"))break;await delay(200)}
 await delay(1000);
 const base=await evaluate(`JSON.parse(document.querySelector('#__NEXT_DATA__').textContent).props.pageProps.dehydratedState.queries.find(q=>q.queryKey[0]==='QuestionsList').state.data`);
 const records=new Map(base.questions.map(q=>[q.slug,{id:q.id,title:q.title,company:q.companyName,category:q.category==='MachineLearning'?'Machine Learning':q.category,difficulty:q.difficulty,url:'https://datalemur.com/questions/'+q.slug,tags:[]} ]));
 const rowSlugs=()=>evaluate(`[...document.querySelectorAll('tbody tr')].map(r=>r.querySelector('a[href*="/questions/"]')?.getAttribute('href')?.split('/').pop()).filter(Boolean).sort()`);
 assert.deepEqual(await rowSlugs(),[...records.keys()].sort());
 const tags=[];
 let previousTag=null;
 for(const tag of base.tags){
  if(previousTag){
   await evaluate(`[...document.querySelectorAll('p')].find(p=>p.textContent===${JSON.stringify(previousTag)}).click()`);
   for(let i=0;i<80;i++){if(JSON.stringify(await rowSlugs())===JSON.stringify([...records.keys()].sort()))break;await delay(150)}
   assert.deepEqual(await rowSlugs(),[...records.keys()].sort(),'Failed to clear previous tag');
  }
  await evaluate(`(()=>{const p=[...document.querySelectorAll('p')].find(p=>p.textContent===${JSON.stringify(tag.title)});if(!p)throw Error('Tag control missing');p.click()})()`);
  const response=await evaluate(`fetch(${JSON.stringify('https://backend.prod.datalemur.com/list-questions?search=&tags='+encodeURIComponent(tag.id))},{credentials:'omit'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})`);
  const expected=response.questions.map(q=>q.slug).sort();
  let actual;
  for(let i=0;i<80;i++){actual=await rowSlugs();if(JSON.stringify(actual)===JSON.stringify(expected))break;await delay(150)}
  assert.deepEqual(actual,expected,'UI/API mismatch for '+tag.title);
  assert.equal(response.bonusQuestions.length,0,'Unexpected bonus metadata: inspect schema before continuing');
  for(const q of response.questions){
   assert.ok(records.has(q.slug),'Filtered problem missing from base catalog: '+q.slug);
   records.get(q.slug).tags.push(tag.title);
  }
  tags.push({id:tag.id,name:tag.title,site_badge_count:Number(tag.amountQuestions),accessible_count:expected.length,problem_slugs:expected,validation:'browser filter rows equal public catalog response'});
  previousTag=tag.title;
  console.log(tag.title+': '+expected.length+' accessible / '+tag.amountQuestions+' badge');
  await delay(300);
 }
 const problems=[...records.values()];
 const output={source_url:'https://datalemur.com/questions',extracted_at:new Date().toISOString(),method:'Isolated signed-out Chrome via DevTools Protocol; each of 22 tag controls clicked and displayed problem URLs compared with the same public list-questions response used by the site.',coverage:{scope:'All problems returned by the public signed-out catalog, across all categories. No private session or premium problem content accessed.',problem_count:problems.length,sql_problem_count:problems.filter(q=>q.category==='SQL').length,tag_count:tags.length,problems_without_returned_tags:problems.filter(q=>!q.tags.length).length,badge_count_note:'Sidebar badges can exceed the number of problems returned by the corresponding public filter. Those additional problem identities and tag memberships were not returned, so this export does not claim to cover the full premium catalog.',empty_tags_note:'An empty tags array means no membership was returned by any available public tag filter; it does not infer the problem has no topics.'},tags,problems};
 writeExports(output, path.resolve(process.argv[2] || path.join(__dirname, '../docs/sql/datalemur')));
 console.log(JSON.stringify(output.coverage,null,2));
}).catch(e=>{console.error(e);process.exitCode=1});
