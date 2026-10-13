const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../ae-tracker/practice-data.js');
require('../ae-tracker/practice.js');
const catalog = globalThis.AEPracticeCatalog;
const { createModel } = globalThis.AEPractice;
const blank = () => ({practice:{},attempts:[]});
const filters = changes => ({q:'',category:'',difficulty:'',status:'',tag:'',...changes});
test('SQL catalog keeps its provenance and has at most two broad topics per problem',()=>{
  const tool=catalog.tools[0],snapshot=require('../../docs/sql/datalemur/problems.json');
  assert.equal(tool.problems.length,54);
  assert.equal(new Set(tool.problems.map(p=>p.slug)).size,54);
  assert.equal(new Set(tool.problems.flatMap(p=>p.topics)).size,11);
  for(const p of tool.problems){
    assert.equal(p.category,'SQL');assert.ok(p.topics.length>=1 && p.topics.length<=2);
    assert.deepEqual(p.tags,snapshot.problems.find(q=>q.id===p.id).tags);
    assert.ok(p.url.startsWith('https://datalemur.com/questions/'));
  }
});
test('progress statuses, compact topics and search follow replacement state',()=>{
  let state=blank();const m=createModel(catalog,()=>state),p=m.tool('datalemur').problems[0];
  assert.equal(m.entry('datalemur',p.slug).status,'not-started');
  m.update('datalemur',p.slug,{status:'completed',notes:'Tested SQL'});
  assert.equal(m.stats('datalemur').completed,1);
  assert.equal(m.matches('datalemur',p,filters({tag:'Aggregation',status:'completed'})),true);
  assert.equal(m.matches('datalemur',p,filters({q:'Twitter',status:'needs-review'})),false);
  assert.equal(m.matches('datalemur',p,filters({difficulty:'Hard'})),false);
  state=blank();assert.equal(m.stats('datalemur').completed,0);
  assert.equal(m.matches('datalemur',p,filters({status:'not-started'})),true);
});
test('legacy ratings and review flags map to statuses without rewriting progress',()=>{
  const state=blank(),m=createModel(catalog,()=>state),slug=m.tool('datalemur').problems[0].slug,k='datalemur:'+slug;
  for(const [saved,expected] of [[{status:'todo'},'not-started'],[{status:'attempted'},'needs-review'],[{status:'solved'},'completed'],[{status:'solved',review:true},'needs-review'],[{rating:3,status:'attempted',review:true},'completed'],[{rating:2},'completed'],[{rating:1},'needs-review'],[{rating:0,status:'solved'},'not-started'],[{status:'needs-review',rating:3},'needs-review'],[{status:'not-started',rating:3,review:true},'not-started']]){
    state.practice[k]=saved;assert.equal(m.entry('datalemur',slug).status,expected);assert.deepEqual(state.practice[k],saved);
  }
  state.attempts.push({id:'historical-attempt',tool:'datalemur',problem:slug,text:'Preserve this evidence'});
  m.update('datalemur',slug,{status:'not-started'});assert.equal(m.stats('datalemur').todo,54);
  assert.equal(state.attempts[0].text,'Preserve this evidence');
  for(const status of ['solved','todo',2,'']) assert.throws(()=>m.update('datalemur',slug,{status}));
  m.update('datalemur',slug,{status:'needs-review'});assert.equal(m.stats('datalemur').review,1);
  m.update('datalemur',slug,{status:'completed'});assert.equal(m.stats('datalemur').completed,1);
  assert.equal(m.record,undefined);
});
test('saving notes does not overwrite status; status changes preserve existing notes',()=>{
  const state=blank(),m=createModel(catalog,()=>state),slug=m.tool('datalemur').problems[0].slug;
  m.update('datalemur',slug,{notes:'Keep this explanation'});
  assert.deepEqual(state.practice['datalemur:'+slug],{notes:'Keep this explanation'});
  assert.equal(m.entry('datalemur',slug).status,'not-started');
  m.update('datalemur',slug,{status:'completed'});m.update('datalemur',slug,{notes:'Edited notes'});
  assert.deepEqual(state.practice['datalemur:'+slug],{notes:'Edited notes',status:'completed'});
});
