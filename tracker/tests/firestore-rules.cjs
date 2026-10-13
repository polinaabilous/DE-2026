const {test,before,after}=require('node:test');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,deleteDoc}=require('firebase/firestore');
let env;
const rules=readFileSync(join(__dirname,'../firestore.rules'),'utf8');
const ownerEmail=rules.match(/request.auth.token.email == '([^']+)'/)[1];
const id='a'.repeat(64),path='users/owner/records/'+id;
const record={key:'["notes","n1"]',value:JSON.stringify({id:'n1',text:'Private note'}),mutation:'m1'};
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-ae-tracker',firestore:{rules}});});
after(async()=>{await env?.cleanup();});
const owner=()=>env.authenticatedContext('owner',{email:ownerEmail,email_verified:true}).firestore();
test('owner can save and read their records',async()=>{
  const db=owner();await assertSucceeds(setDoc(doc(db,path),record));await assertSucceeds(getDoc(doc(db,path)));await assertSucceeds(getDocs(collection(db,'users/owner/records')));
});
test('anonymous readers and writers are denied',async()=>{
  const db=env.unauthenticatedContext().firestore();await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),record));
});
test('another signed-in account cannot read or write private data, including its own path',async()=>{
  const db=env.authenticatedContext('other',{email:'someone@example.com',email_verified:true}).firestore();
  await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),record));await assertFails(setDoc(doc(db,'users/other/records/'+id),record));
});
test('owner cannot access a different user path and unverified email cannot access data',async()=>{
  await assertFails(getDoc(doc(owner(),'users/other/records/'+id)));
  const unverified=env.authenticatedContext('owner',{email:ownerEmail,email_verified:false}).firestore();await assertFails(getDoc(doc(unverified,path)));
});
test('tombstones are allowed; physical deletion and malformed payloads are denied',async()=>{
  const db=owner();await assertSucceeds(setDoc(doc(db,path),{...record,value:null}));
  await assertFails(deleteDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),{...record,unexpected:true}));
  await assertFails(setDoc(doc(db,path),{...record,value:{private:'bad format'}}));
  await assertFails(setDoc(doc(db,path),{...record,mutation:''}));await assertFails(setDoc(doc(db,'users/owner/records/invalid-id'),record));
});
