const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../de-tracker/cloud-core.js');
const { pack, unpack, Model } = globalThis.AECloudCore;
const empty = () => ({v:7,setupV:2,curriculumV:4,savedAt:0,ui:{res:'topic'},r:{},pc:{},rc:{},g:{},ck:{},done:{},built:{},lib:{},reading:{},deckVisits:{},act:{},notes:[],log:[],todo:[],practice:{},attempts:[]});
const base = () => ({...empty(),checksV:1,r:{S1:[0,2]},pc:{S1:[true,false]},ck:{S1:[true,false],'v1-frame':[true]},done:{SETUP:'migrated'},built:{'v1-frame':'2026-10-13'},rc:{S1:{'https://example.com/a/b':true}},g:{'1.1-0':true},lib:{url:'later',dwt:'later'},reading:{dwt:{status:'reading',note:'Ch. 6 · Order Management',pct:35,updated:'2026-10-13'},corr:{status:'later',updated:'2026-10-12'}},act:{'2026-10-06':2},
  notes:[{id:'note-a',text:'SQL\n**FILTER**\n- One\n```sql\nSELECT 1;\n```',track:'sql',c:'2026-10-06'}],
  log:[{id:'log-a',d:'2026-10-06',text:'Practiced joins',h:1.5,role:'P',note:'legacy',custom:{retained:true}}],
  todo:[{id:'todo-a',text:'Try dbt\nand tests',done:false,track:'dbt'}],curriculumHistory:[{r:{S1:[3,2]}}],custom:{nested:'kept'}});
test('all persisted data round-trips; UI and timestamps stay device-local',()=>{
  const s=base(),decoded=unpack(pack(s),empty());
  assert.deepEqual(decoded,s);
  const other={...s,savedAt:999,ui:{res:'lib'}};
  assert.deepEqual(pack(s),pack(other));
});
test('independent offline phone/laptop edits and individual checklist cells both survive',()=>{
  const s=base(),a=new Model(pack(s)),b=new Model(pack(s));
  a.receive(pack(s));b.receive(pack(s));
  const phone=structuredClone(s);phone.r.S1[0]=3;phone.notes.push({id:'phone',text:'Phone note',track:'sql'});a.edit(pack(phone));
  const laptop=structuredClone(s);laptop.r.S1[1]=1;laptop.todo.push({id:'laptop',text:'Laptop task',track:'py'});b.edit(pack(laptop));
  const remote={...pack(s),...Object.fromEntries(Object.entries(b.pending).map(([k,v])=>[k,v.value]))};
  const merged=unpack(a.receive(remote),empty());
  assert.deepEqual(merged.r.S1,[3,1]);assert.equal(merged.notes.length,2);assert.equal(merged.todo.length,2);
});
test('deletions propagate to stale devices without resurrection on unrelated edits',()=>{
  const s=base(),device=new Model(pack(s));device.receive(pack(s));
  const deleted={...pack(s),'["notes","note-a"]':null};
  const next=unpack(device.receive(deleted),empty());assert.equal(next.notes.length,0);
  next.todo[0].done=true;device.edit(pack(next));
  assert.equal(device.pending['["notes","note-a"]'],undefined);
});
test('late acknowledgements cannot discard newer edits; outbox survives reload',()=>{
  let n=0;const s=base(),a=new Model(pack(s),{},()=>String(++n));a.receive(pack(s));
  s.notes[0].text='First';a.edit(pack(s));const old=a.pending['["notes","note-a"]'].mutation;
  s.notes[0].text='Second';a.edit(pack(s));a.ack({'["notes","note-a"]':old});assert.equal(a.count(),1);
  const reloaded=new Model(a.view,a.pending);const view=unpack(reloaded.receive(pack(base())),empty());
  assert.equal(view.notes[0].text,'Second');assert.equal(reloaded.count(),1);
  reloaded.ack({'["notes","note-a"]':a.pending['["notes","note-a"]'].mutation});assert.equal(reloaded.count(),0);
});
test('remote changes never become new local writes',()=>{
  const a=new Model(pack(base()));a.receive(pack(base()));const remote=base();remote.notes[0].text='Changed elsewhere';
  a.receive(pack(remote));a.edit(pack(remote));assert.equal(a.count(),0);
});
test('recent deck opens sync independently and a late offline open cannot move a deck backwards',()=>{
  const s=empty(),a=new Model(pack(s)),b=new Model(pack(s));a.receive(pack(s));b.receive(pack(s));
  const laptop=structuredClone(s),phone=structuredClone(s);
  laptop.deckVisits['sql-window-functions']=1000;phone.deckVisits['python-foundations']=2000;
  a.edit(pack(laptop));b.edit(pack(phone));
  const remote={...pack(s),...Object.fromEntries(Object.entries(b.pending).map(([k,v])=>[k,v.value]))};
  const merged=unpack(a.receive(remote),empty());
  assert.deepEqual(merged.deckVisits,{'sql-window-functions':1000,'python-foundations':2000});
  const key='["deckVisits","sql-window-functions"]';
  const newer={...remote,[key]:'3000'};
  const result=unpack(a.receive(newer),empty());
  assert.equal(result.deckVisits['sql-window-functions'],3000);
  assert.equal(a.pending[key],undefined,'older queued timestamp is discarded');
  const before=pack(result);result.deckVisits={};a.edit(pack(result));
  assert.equal(a.pending[key].value,null,'reset still deletes history');
  assert.ok(Object.hasOwn(before,key));
});
test('special JSON keys cannot pollute objects; malformed cloud data is rejected',()=>{
  assert.throws(()=>unpack({'["extra","__proto__"]':'{}'},empty()));
  assert.throws(()=>unpack({'["r","S1","999999"]':'3'},empty()));
  assert.throws(()=>unpack({'["unknown","a"]':'true'},empty()));
  assert.equal({}.polluted,undefined);
});

test('to do ordering is stable when Firestore returns records in a different order',()=>{
  const s=empty();s.todo=[{id:'nnew',text:'new',c:'2026-10-06'},{id:'nold',text:'old',c:'2026-10-05'}];
  const records=pack(s),reverse=Object.fromEntries(Object.entries(records).reverse());
  assert.deepEqual(unpack(records,empty()).todo,unpack(reverse,empty()).todo);
  assert.equal(unpack(records,empty()).todo.at(-1).text,'new');
});

test('practice fields and attempts merge independently across offline devices',()=>{
  const s=empty();s.practice['datalemur:sql-histogram-tweets']={status:'todo',review:false,notes:''};
  const phone=new Model(pack(s)),laptop=new Model(pack(s));phone.receive(pack(s));laptop.receive(pack(s));
  const a=structuredClone(s),b=structuredClone(s);
  a.practice['datalemur:sql-histogram-tweets'].status='completed';
  a.attempts.push({id:'phone-attempt',tool:'datalemur',problem:'sql-histogram-tweets',outcome:'independent',d:'2026-10-06',c:'2026-10-06T12:00:00Z'});
  b.practice['datalemur:sql-histogram-tweets'].notes='Aggregate twice';
  b.attempts.push({id:'laptop-attempt',tool:'datalemur',problem:'sql-histogram-tweets',outcome:'help',d:'2026-10-05',c:'2026-10-06T13:00:00Z'});
  phone.edit(pack(a));laptop.edit(pack(b));
  const remote={...pack(s),...Object.fromEntries(Object.entries(laptop.pending).map(([k,v])=>[k,v.value]))};
  const merged=unpack(phone.receive(remote),empty());
  assert.equal(merged.practice['datalemur:sql-histogram-tweets'].status,'completed');
  assert.equal(merged.practice['datalemur:sql-histogram-tweets'].notes,'Aggregate twice');
  assert.equal(merged.attempts.length,2);
  assert.deepEqual(unpack(pack(merged),empty()),merged);
  const deleted={...pack(merged),'["attempts","phone-attempt"]':null};
  const stale=new Model(pack(merged));const after=unpack(stale.receive(deleted),empty());
  assert.equal(after.attempts.length,1);after.practice['datalemur:sql-histogram-tweets'].review=true;stale.edit(pack(after));
  assert.equal(stale.pending['["attempts","phone-attempt"]'],undefined);
});

test('long-read status, note and progress merge per field across offline devices; removals become tombstones',()=>{
  const s=base(),phone=new Model(pack(s)),laptop=new Model(pack(s));phone.receive(pack(s));laptop.receive(pack(s));
  for(const k of ['["reading","dwt","status"]','["reading","dwt","note"]','["reading","dwt","pct"]']) assert.ok(pack(s)[k],k);
  const a=structuredClone(s),b=structuredClone(s);
  a.reading.dwt.note='Ch. 7 · Accounting';
  b.reading.dwt.pct=50;b.reading.dwt.status='paused';b.reading.ddia={status:'reading',updated:'2026-10-14'};
  phone.edit(pack(a));laptop.edit(pack(b));
  const remote={...pack(s),...Object.fromEntries(Object.entries(laptop.pending).map(([k,v])=>[k,v.value]))};
  const merged=unpack(phone.receive(remote),empty());
  assert.deepEqual(merged.reading.dwt,{status:'paused',note:'Ch. 7 · Accounting',pct:50,updated:'2026-10-13'});
  assert.equal(merged.reading.ddia.status,'reading');
  assert.deepEqual(unpack(pack(merged),empty()),merged);
  const cleared=structuredClone(merged);delete cleared.reading.corr;phone.edit(pack(cleared));
  assert.equal(phone.pending['["reading","corr","status"]'].value,null,'a removed status is a tombstone, not a silent gap');
  assert.equal(unpack(phone.view,empty()).reading.corr,undefined);
});
