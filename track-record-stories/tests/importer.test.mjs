import test from 'node:test';
import assert from 'node:assert/strict';
import {collectRecap} from '../public/importer.mjs';
const activity={id:'fixture-1',utc:Date.UTC(2025,2,10,6),type:'running',parentId:null,distance:5000,duration:1800};
const days=Array.from({length:30},(_,i)=>({date:`2025-01-${String(i+1).padStart(2,'0')}`,steps:1000,restingHR:50}));
async function withAPI(options,run){
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,init)=>{
  const path=url.split('/').pop(),body=JSON.parse(init.body);calls.push({path,body});
  if(options.abort&&path==='activities')throw new DOMException('Cancelled','AbortError');
  if(options.authFailure&&path==='wellness')return Response.json({error:{code:'GARMIN_AUTH',message:'Expired'}},{status:401});
  if(options.optionalFailure&&['wellness','sleep','hrv'].includes(path))return Response.json({error:{code:'GARMIN_PERMISSION',message:'Unavailable'}},{status:403});
  if(path==='activities')return Response.json({activities:body.start&&!options.repeatPage?[]:[activity],next:1,complete:!!body.start&&!options.repeatPage});
  if(path==='wellness')return Response.json({daily:days});
  if(path==='sleep')return Response.json({sleep:body.month===1?days.map(d=>({date:d.date,seconds:25200})):[]});
  if(path==='hrv')return Response.json({hrv:body.month===1?days.map(d=>({date:d.date,hrv:60})):[]});
  return Response.json({connected:true,disconnected:true});
 };
 try{await run(calls);}finally{globalThis.fetch=original;}
}
const input={key:'fictional-test-key',year:2025,timeZone:'UTC'};
test('Daily steps, sleep and resting heart rate are included by default, and the connection is cleared',async()=>withAPI({},async calls=>{
 const plan=await collectRecap(input);for(const id of ['steps-total','sleep-median','resting-hr','hrv-median'])assert.ok(plan.stories.some(s=>s.id===id));assert.equal(calls.find(c=>c.path==='wellness').body.includeHealth,true);assert.equal(calls.filter(c=>c.path==='sleep').length,12);assert.equal(calls.filter(c=>c.path==='hrv').length,12);assert.equal(calls.at(-1).path,'disconnect');
}));
test('Explicit activity-only imports exclude wellness requests and health stories',async()=>withAPI({},async calls=>{
 const plan=await collectRecap({...input,includeSteps:false,includeHealth:false});assert.ok(!calls.some(c=>['wellness','sleep','hrv'].includes(c.path)));assert.ok(!plan.stories.some(s=>s.health||s.id.startsWith('steps-')));
}));
test('Steps-only import never requests sleep or admits health stories',async()=>withAPI({},async calls=>{
 const plan=await collectRecap({...input,includeSteps:true,includeHealth:false});assert.ok(plan.stories.some(s=>s.id==='steps-total'));assert.ok(!plan.stories.some(s=>s.health));assert.ok(!calls.some(c=>['sleep','hrv'].includes(c.path)));assert.equal(calls.find(c=>c.path==='wellness').body.includeHealth,false);
}));
test('Health-only import excludes steps even when the daily response contains them',async()=>withAPI({},async calls=>{
 const plan=await collectRecap({...input,includeSteps:false,includeHealth:true});assert.ok(plan.stories.some(s=>s.id==='sleep-median'));assert.ok(plan.stories.some(s=>s.id==='resting-hr'));assert.ok(!plan.stories.some(s=>s.id.startsWith('steps-')));assert.equal(calls.filter(c=>c.path==='sleep').length,12);
}));
test('Unavailable optional sources preserve activity stories and explain omissions',async()=>withAPI({optionalFailure:true},async calls=>{
 const plan=await collectRecap({...input,includeSteps:true,includeHealth:true});assert.ok(plan.stories.some(s=>s.id==='running-sessions'));assert.ok(!plan.stories.some(s=>s.health||s.id.startsWith('steps-')));assert.ok(plan.warnings.some(w=>w.includes('HRV stories were omitted')));assert.equal(calls.at(-1).path,'disconnect');
}));
test('An expired optional-source session stops the import and still disconnects',async()=>withAPI({authFailure:true},async calls=>{
 await assert.rejects(()=>collectRecap({...input,includeHealth:true}),e=>e.code==='GARMIN_AUTH');assert.equal(calls.at(-1).path,'disconnect');
}));
test('Cancellation and repeated pages never generate a partial annual recap',async()=>{
 await withAPI({abort:true},async calls=>{await assert.rejects(()=>collectRecap(input),e=>e.name==='AbortError');assert.equal(calls.at(-1).path,'disconnect');});
 await withAPI({repeatPage:true},async calls=>{await assert.rejects(()=>collectRecap(input),e=>e.code==='PAGINATION');assert.equal(calls.at(-1).path,'disconnect');});
});
