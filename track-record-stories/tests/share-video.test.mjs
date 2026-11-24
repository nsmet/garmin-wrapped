import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleStories,sampleContext} from '../public/dot-samples.mjs';
import {cardSpec} from '../public/dot-spec.mjs';
import {cardFrame,collectDots,createDotBuffer} from '../public/dot-card.mjs';
import {shareSpec} from '../public/share-card.mjs';
import {VIDEO,videoTimeline} from '../public/share-video.mjs';

const ctx=sampleContext('full');
const specOf=id=>shareSpec({...cardSpec(sampleStories('full').find(s=>s.story===id),ctx),notice:'Fictional sample · design preview'},2026);
function dotsAt(spec,tau){
 const frame=cardFrame(1080,1920,{mode:'export',spec}),tl=videoTimeline(tau),buf=createDotBuffer();
 collectDots(buf,spec,{t:tl.t,intro:tl.intro,frame,neutralStart:true});
 return Array.from({length:buf.n},(_,i)=>[buf.x[i],buf.y[i],buf.a[i]]);
}

test('Share videos loop without a seam: the last frame meets the first',()=>{
 for(const id of ['running-hours','max-hr','activity-hr','resting-hr','cover','year-calendar','finale','cycling-hours']){
  const spec=specOf(id),first=dotsAt(spec,0),last=dotsAt(spec,VIDEO.duration);
  assert.equal(last.length,first.length,`${id}: same dots at both ends`);
  first.forEach((d,i)=>d.forEach((v,j)=>assert.ok(Math.abs(v-last[i][j])<1e-3,`${id}: dot ${i} matches at the loop point`)));
  assert.equal(videoTimeline(VIDEO.duration).textAlpha,0,'card text has faded out when the loop restarts');
 }
});

test('Share videos hold the settled card before the outro, with the heart beating at its BPM',()=>{
 const out0=VIDEO.duration-VIDEO.outro;
 assert.ok(out0-3.05>=2.5,'at least 2.5 s of settled card');
 const hold=videoTimeline(out0-0.01);assert.equal(hold.textAlpha,1);assert.ok(hold.intro>=3.05,'every dot has landed');
 // max-hr sample: 191 BPM -> the data dots swell once every 60/191 s
 const spec=specOf('max-hr'),frame=cardFrame(1080,1920,{mode:'export',spec}),radius=tau=>{const buf=createDotBuffer();collectDots(buf,spec,{t:tau,intro:null,frame});return Math.max(...buf.r.subarray(0,buf.n));};
 const period=60/191;assert.ok(Math.abs(radius(3.5)-radius(3.5+period))<1e-6,'the beat repeats at the recorded rate');
});
