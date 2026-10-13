const fs=require('fs'),assert=require('node:assert/strict');
const root=process.env.AE_BROWSER_TEST_ROOT;
if (!root || !process.env.AE_BROWSER_TEST_URL) throw Error('Use npm run test:sync; this test requires an isolated emulator fixture.');
async function connect(profile){
 const port=fs.readFileSync(`${root}/${profile}/DevToolsActivePort`,'utf8').split('\n')[0];
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let seq=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.t);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result)}});
 const send=(method,params={})=>new Promise((r,j)=>{const id=++seq,t=setTimeout(()=>j(Error('Timeout '+method)),15000);pending.set(id,{r,j,t});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value};
 const until=async(expression,label)=>{for(let n=0;n<120;n++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout '+label+': '+JSON.stringify(await evaluate('AECloud.info()')))};
 return {ws,send,evaluate,until};
}
(async()=>{
 const a=await connect('test-laptop'),b=await connect('test-phone');
 const email=fs.readFileSync(`${root}/account.txt`,'utf8').trim();
 const token=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'demo-ae-tracker',sub:'google-owner',email,email_verified:true,name:'Tracker owner',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.';
 const login=`(async()=>{const sdk=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');await sdk.signInWithCredential(sdk.getAuth(),sdk.GoogleAuthProvider.credential(${JSON.stringify(token)}));})()`;
 const note=(id,text)=>`(()=>{location.hash='#notes';window.dispatchEvent(new HashChangeEvent('hashchange'));const f=document.querySelector('.nadd form');f.elements.text.value=${JSON.stringify(text)};f.elements.text.dispatchEvent(new Event('input',{bubbles:true}));f.requestSubmit();return AE.state().notes.at(-1).id})()`;
 try{
  for(const p of [a,b]){await p.send('Page.enable');await p.send('Network.enable');await p.send('Page.navigate',{url:process.env.AE_BROWSER_TEST_URL+'#notes'});await p.until("window.AECloud?.info().status==='signed-out'",'SDK ready');}
  await a.evaluate(login);await a.until("AECloud.info().status==='synced'",'first migration');assert.equal(await a.evaluate('AE.state().notes.length'),1);assert.equal(await a.evaluate('AE.state().r.S1[0]'),3);console.log('PASS: first Google sign-in migrates existing browser data.');
  await b.evaluate(login);await b.until("AECloud.info().status==='synced' && AE.state().notes.length===1",'phone load');console.log('PASS: second device loads the same private account.');
  const firstId=await a.evaluate(note(null,'Laptop note\n- SQL FILTER\n- CASE'));await a.until("AECloud.info().status==='synced'",'laptop save');await b.until('AE.state().notes.length===2','phone receives');assert.ok(await b.evaluate("AE.state().notes.some(n=>n.text.includes('SQL FILTER'))"));console.log('PASS: notes automatically sync to the phone.');
  await a.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  const offlineId=await a.evaluate(note(null,'Offline laptop note\nQueued until reconnect'));assert.ok(await a.evaluate("AECloud.info().pending>0"));
  const phoneId=await b.evaluate(note(null,'Phone note\nIndependent change'));await b.until("AECloud.info().status==='synced'",'phone independent save');
  await a.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await a.until("AECloud.info().status==='synced' && AE.state().notes.length===4",'offline reconnect');await b.until('AE.state().notes.length===4','merged notes');
  assert.ok(await b.evaluate(`AE.state().notes.some(n=>n.id===${JSON.stringify(offlineId)}) && AE.state().notes.some(n=>n.id===${JSON.stringify(phoneId)})`));console.log('PASS: independent offline/online edits both survive reconnection.');
  await b.evaluate(`document.querySelector('[data-nid="${firstId}"][data-act="ndel"]').click()`);await b.until("AECloud.info().status==='synced'",'delete save');await a.until('AE.state().notes.length===3','delete sync');console.log('PASS: deletion syncs without resurrecting old entries.');
  await a.evaluate("location.hash='#todo';window.dispatchEvent(new HashChangeEvent('hashchange'));let f=document.querySelector('.todoform');f.elements.text.value='Try DuckDB';f.elements.track.value='sql';f.requestSubmit()");await a.until("AECloud.info().status==='synced'",'todo save');await b.until('AE.state().todo.length===1','todo sync');assert.equal(await b.evaluate('AE.state().todo[0].track'),'sql');
  await b.evaluate("location.hash='#todo';window.dispatchEvent(new HashChangeEvent('hashchange'));let c=document.querySelector('[data-todo]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))");await b.until("AECloud.info().status==='synced'",'complete');await a.until('AE.state().todo[0].done','completion sync');console.log('PASS: to do tracks and completion sync across devices.');
  await a.evaluate("(()=>{location.hash='#log';window.dispatchEvent(new HashChangeEvent('hashchange'));let f=document.querySelector('.entryform');f.elements.text.value="+JSON.stringify('Progress\n1. Reviewed joins\n2. Solved SQL exercise')+";f.requestSubmit()})()");await a.until("AECloud.info().status==='synced'",'log save');await b.until('AE.state().log.length===1','log sync');console.log('PASS: daily logs sync.');
  const practiceSlug='sql-histogram-tweets',practiceKey='datalemur:'+practiceSlug;
  const practiceRoute="location.hash='#trackers/datalemur';window.dispatchEvent(new HashChangeEvent('hashchange'));";
  const setStatus=(slug,status)=>`(()=>{${practiceRoute}document.querySelector('[data-practice-status="${slug}"][data-status="${status}"]').click()})()`;
  const saveNotes=text=>`(()=>{${practiceRoute}document.querySelector('[data-practice-open="${practiceSlug}"]').click();const f=document.querySelector('.practice-notes-form');f.elements.text.value=${JSON.stringify(text)};f.requestSubmit();document.querySelector('[data-practice-action="close"]').click()})()`;
  const secondSlug='sql-page-with-no-likes',secondKey='datalemur:'+secondSlug;
  await a.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await a.evaluate(setStatus(practiceSlug,'completed'));assert.ok(await a.evaluate('AECloud.info().pending>0'));
  await b.evaluate(setStatus(secondSlug,'needs-review'));await b.until("AECloud.info().status==='synced'",'phone status save');
  await b.evaluate(saveNotes('Aggregate twice; check the grain.'));
  await b.until("AECloud.info().status==='synced'",'phone practice notes');
  await a.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await a.until(`AECloud.info().status==='synced' && AE.state().practice[${JSON.stringify(secondKey)}]?.status==='needs-review'`,'practice offline merge');
  await b.until(`AE.state().practice[${JSON.stringify(practiceKey)}]?.status==='completed'`,'phone receives offline status');
  for(const p of [a,b]){
    assert.equal(await p.evaluate(`AE.state().practice[${JSON.stringify(practiceKey)}].status`),'completed');
    assert.equal(await p.evaluate(`AE.state().practice[${JSON.stringify(secondKey)}].status`),'needs-review');
    assert.equal(await p.evaluate(`AE.state().practice[${JSON.stringify(practiceKey)}].notes`),'Aggregate twice; check the grain.');
    assert.equal(await p.evaluate('AE.state().attempts.length'),0);
  }
  console.log('PASS: offline status and phone notes merge independently; no attempts created.');
  await b.evaluate(setStatus(practiceSlug,'not-started'));await b.until("AECloud.info().status==='synced'",'status reset');
  await a.until(`AE.state().practice[${JSON.stringify(practiceKey)}]?.status==='not-started'`,'status reset sync');
  assert.equal(await a.evaluate(`AE.state().practice[${JSON.stringify(practiceKey)}].notes`),'Aggregate twice; check the grain.');
  console.log('PASS: resetting status preserves problem notes across devices.');
  await a.send('Page.reload');await a.until("window.AECloud?.info().status==='synced'",'reload');assert.equal(await a.evaluate('AE.state().notes.length'),3);assert.equal(await a.evaluate('AE.state().log.length'),1);assert.equal(await a.evaluate(`AE.state().practice[${JSON.stringify(secondKey)}].status`),'needs-review');console.log('PASS: account, status and records survive reload.');
  await b.evaluate("(()=>{location.hash='#notes';window.dispatchEvent(new HashChangeEvent('hashchange'));const f=document.querySelector('.nadd form');f.elements.text.value='Unsaved owner draft';f.elements.text.dispatchEvent(new Event('input',{bubbles:true}))})()");
  const crossDeviceId=await a.evaluate(note(null,'Sync while drafting'));
  await a.until("AECloud.info().status==='synced'",'save during draft');await b.until('AE.state().notes.length===4','receive during draft');
  assert.equal(await b.evaluate("document.querySelector('.nadd form').elements.text.value"),'Unsaved owner draft');
  await a.evaluate(`document.querySelector('[data-nid="${crossDeviceId}"][data-act="ndel"]').click()`);
  await a.until("AECloud.info().status==='synced'",'draft fixture cleanup');await b.until('AE.state().notes.length===3','receive cleanup');
  console.log('PASS: incoming sync preserves unsaved editor drafts.');
  const otherToken=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'demo-ae-tracker',sub:'other-user',email:'other@example.com',email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.';
  await b.evaluate(login.replace(JSON.stringify(token),JSON.stringify(otherToken)));await b.until("AECloud.info().status==='error'",'unauthorized account rejected');assert.equal(await b.evaluate('AE.state().notes.length'),0);assert.equal(await b.evaluate("document.querySelector('.nadd form').elements.text.value"),'');
  await b.evaluate('AECloud.retry()');await b.until("AECloud.info().status==='error'",'retry preserves denied access');assert.equal(await b.evaluate('AE.state().notes.length'),0);assert.equal(await b.evaluate("document.querySelector('.nadd form').elements.text.value"),'');
  await b.evaluate(login);await b.until("AECloud.info().status==='synced' && AE.state().notes.length===3",'owner restored');assert.equal(await b.evaluate(`AE.state().practice[${JSON.stringify(secondKey)}].status`),'needs-review');console.log('PASS: switching accounts isolates cached data; retry cannot bypass access rules; returning to owner restores records.');
  await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await b.evaluate("location.hash='#notes'");await new Promise(r=>setTimeout(r,200));assert.ok(await b.evaluate('document.documentElement.scrollWidth<=390'));const shot=await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(root+'/cloud-phone.png',Buffer.from(shot.data,'base64'));
  for(const p of [a,b])assert.deepEqual(await p.evaluate('testErrors'),[]);console.log('PASS: phone layout and no browser errors.');
 }finally{a.ws.close();b.ws.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
