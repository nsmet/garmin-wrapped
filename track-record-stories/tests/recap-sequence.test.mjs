import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecap} from '../public/metrics.mjs';
import {datasetFromPlan,canRequestShare,canShare,sanitizedCard} from '../public/story-model.mjs';
import {recapSequence} from '../public/recap-sequence.mjs';
import {dataset as demo} from '../public/sample-data.mjs';

const activity=(type,extra={})=>({id:type,utc:Date.UTC(2025,2,10,6),type,parentId:null,distance:null,duration:null,...extra});
const dataset=activities=>datasetFromPlan(buildRecap({year:2025,timeZone:'UTC',indexComplete:true,activities,now:new Date('2026-01-01T12:00:00Z')}));

test('Any admitted cycling family adds one invitation after the year receipt, even without distance or duration',()=>{
 for(const type of ['cycling','indoor_cycling','road_biking','mountain_biking','gravel_cycling','e_bike']){
  const data=dataset([activity(type)]),sequence=recapSequence(data);
  assert.equal(sequence.at(-2).id,'finale');assert.equal(sequence.at(-1).id,'mini-watt');
  assert.equal(sequence.filter(s=>s.promotional).length,1);assert.equal(data.stories.some(s=>s.promotional),false);
 }
});
test('Running, unknown types, excluded cycling records and unverified cycling do not trigger the invitation',()=>{
 for(const activities of [[activity('running')],[activity('unknown-bike')],[activity('running'),activity('cycling',{parentId:12})],[activity('running'),activity('cycling',{utc:Date.UTC(2024,5,1)})],[]]){
  assert.ok(recapSequence(dataset(activities)).every(s=>!s.promotional));
 }
 const data=dataset([activity('cycling')]);
 assert.equal(recapSequence({...data,stories:data.stories.map(s=>s.template==='cycling'?{...s,evidence:[]}:s)}).some(s=>s.promotional),false);
});
test('The invitation cannot enter personal exports, including in the fictional demo',()=>{
 for(const data of [demo,dataset([activity('cycling')])]){
  const invitation=recapSequence(data).at(-1);
  assert.equal(canRequestShare(invitation,data),false);assert.equal(canShare(invitation,data),false);
  assert.throws(()=>sanitizedCard(invitation,data));
  assert.equal(recapSequence(data).at(-2).id,'finale');
 }
});
