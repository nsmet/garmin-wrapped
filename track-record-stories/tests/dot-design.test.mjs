import test from 'node:test';
import assert from 'node:assert/strict';
import {dataset} from '../public/sample-data.mjs';
import {recapSequence} from '../public/recap-sequence.mjs';
import {buildRecap} from '../public/metrics.mjs';
import {datasetFromPlan,displayFields,selectStories,sanitizedCard} from '../public/story-model.mjs';
import {cardSpec,recapContext,readFigure} from '../public/dot-spec.mjs';
import {build,fracDots,distUnit,topUnit,stepUnit,shapeCapacity} from '../public/dot-engine.mjs';
import {sampleStories} from '../public/dot-samples.mjs';

const stories=recapSequence(dataset),context=recapContext(stories);
const dataDots=spec=>build(spec).pts.filter(p=>p.dat).length;

test('every admitted demo story maps to its dot design without fabricating values',()=>{
 for(const s of stories){
  const spec=cardSpec(s,context);
  assert.notEqual(spec.L,'concept',`${s.id} has a design`);
  if(s.id==='year-calendar'||s.id.endsWith('-monthly'))assert.equal(spec.hero.text.toUpperCase(),s.id==='year-calendar'?spec.hero.text:s.value,s.id);
  else assert.equal(spec.hero.text,s.value,`${s.id} shows the pipeline value`);
  assert.deepEqual([spec.cap1,spec.cap2].filter(Boolean).join('\n'),s.caption,`${s.id} keeps its caption`);
 }
});

test('data dots match each card legend',()=>{
 for(const s of stories){
  const spec=cardSpec(s,context),n=dataDots(spec),v=readFigure(s.value);
  if(s.id.endsWith('-sessions'))assert.equal(n,v,s.id);
  if(s.id==='year-calendar'&&spec.p.best>=0)assert.equal(spec.hero.text.slice(0,3),s.chart.items[spec.p.best].label.slice(0,3),s.id);
  if(s.id.endsWith('-hours')){assert.equal(spec.L,'shape',s.id);assert.equal(n,fracDots(v,spec.p.unit).total,s.id);assert.ok(n<=shapeCapacity('hours',spec.p.k),s.id);}
  if(s.id.endsWith('-distance'))assert.equal(n,fracDots(v,distUnit(spec.p.k,v)).total,s.id);
  if(s.id.endsWith('-weekday'))assert.equal(n,s.chart.items.reduce((a,i)=>a+i.value,0),s.id);
  if(s.id.endsWith('-longest')){const u=topUnit(s.chart.items[0].value);assert.equal(n,s.chart.items.reduce((a,i)=>a+fracDots(i.value,u).total,0),s.id);}
  if(['cover','year-summary','finale','sport-mix'].includes(s.id))assert.equal(n,context.total,s.id);
  if(s.id==='steps-total')assert.equal(n,Math.round(v/stepUnit(v)),s.id);
  if(['sleep-median','resting-hr','hrv-median'].includes(s.id))assert.equal(n,Number(s.caption.match(/^\d+/)[0]),s.id);
  if(s.id.endsWith('-monthly'))assert.equal(n,s.chart.items.filter(i=>i.value!==null).length,s.id);
 }
 // peak HR: lit dots are the activities with a usable maximum
 const max=stories.find(s=>s.id==='max-hr'),spec=cardSpec(max,context),[lit,total]=max.caption.match(/(\d+) of (\d+)/).slice(1).map(Number);
 assert.equal(build(spec).pts.filter(p=>p.dat&&p.c!=='#3E4D74').length,lit);assert.equal(dataDots(spec),total);
});

test('exports build the same card from sanitized display fields only',()=>{
 for(const s of stories.filter(s=>!s.health&&!s.promotional)){
  const live=cardSpec(s,context),exported=cardSpec(sanitizedCard(s,dataset),context);
  assert.equal(exported.L,live.L,s.id);assert.deepEqual(exported.p,live.p,s.id);assert.deepEqual(exported.hero,live.hero,s.id);
 }
 for(const s of stories.filter(s=>s.health)){const a=cardSpec(s,context),b=cardSpec(displayFields(s),context);assert.equal(b.L,a.L,s.id);assert.deepEqual(b.p,a.p,s.id);}
});

test('partial imports never crown a busiest month and unknown months stay blank',()=>{
 const activities=[1,1,2,3].map((m,i)=>({id:String(i),utc:Date.UTC(2025,m,5),type:'running',parentId:null,duration:1800,distance:5000}));
 const partial=datasetFromPlan(buildRecap({year:2025,timeZone:'UTC',activities,indexComplete:false,now:new Date('2025-10-23T12:00:00Z')}));
 const cal=partial.stories.find(s=>s.id==='year-calendar'),spec=cardSpec(cal,recapContext(partial.stories));
 assert.equal(spec.p.best,-1);assert.equal(spec.hero.text,'2025');
 const labels=build(spec).labels;assert.ok(!labels.some(l=>l.t==='BUSIEST'));
 assert.equal(labels.find(l=>l.t==='JAN').s,'–','unknown coverage is not zero');
 const complete=datasetFromPlan(buildRecap({year:2025,timeZone:'UTC',activities,indexComplete:true,now:new Date('2025-10-23T12:00:00Z')}));
 const full=cardSpec(complete.stories.find(s=>s.id==='year-calendar'),recapContext(complete.stories));
 assert.equal(full.hero.text,'FEBRUARY');assert.equal(build(full).labels.find(l=>l.t==='JAN').s,'0h','a complete empty month is zero');
});

test('a caption without a readable count falls back to guide dots and no legend',()=>{
 const spec=cardSpec({id:'sleep-median',title:['OFF THE','CLOCK.'],value:'7h 30m',unit:'MEDIAN RECORDED SLEEP',caption:'Sleep records.\nNo sleep is inferred.',health:true},{});
 assert.equal(dataDots(spec),0);assert.equal(spec.note,'');
 const unknown=cardSpec({id:'something-new',title:['NEW'],value:'12',unit:'UNIT',caption:'a\nb'},{});
 assert.equal(unknown.L,'concept');assert.equal(dataDots(unknown),0);
});

test('very large years switch to a stated larger unit instead of drawing tens of thousands of dots',()=>{
 const spec=cardSpec({id:'running-hours',title:['HOURS IN','YOUR STRIDE.'],value:'99,999.9',unit:'RECORDED HOURS',caption:'a\nb',chart:{kind:'duration',items:[{label:'RECORDED MINUTES',value:'5,999,994'},{label:'AVG TIME / ACTIVITY',value:'1h 00m 00s'}]}},{});
 assert.ok(dataDots(spec)<=shapeCapacity('hours','running'));assert.match(spec.note,/EACH DOT = \d+ HOURS/);
 const sessions=cardSpec({id:'walking-sessions',title:['WALKS'],value:'12,000',unit:'RECORDED WALKS',caption:'a\nb'},{});
 assert.ok(dataDots(sessions)<=2400);assert.match(sessions.note,/EACH BRIGHT DOT ≈ 5 WALKS/);
});

test('fictional dot-design samples are library previews that never enter a recap',()=>{
 for(const profile of ['full','light']){
  const samples=sampleStories(profile);assert.equal(samples.length,89);
  assert.ok(samples.every(s=>s.libraryOnly&&s.sample===profile&&!s.evidence));
  assert.deepEqual(selectStories({year:2026,stories:samples,exampleOnly:true,includeHealth:true}),[]);
  for(const s of samples)assert.notEqual(cardSpec(s,{}).L,undefined,s.id);
 }
});

test('the busiest month can be the month in progress, labelled so far',()=>{
 const activities=[1,1,2,9,9,9,9].map((m,i)=>({id:String(i),utc:Date.UTC(2025,m,3+i),type:'running',parentId:null,duration:3600,distance:5000}));
 const d=datasetFromPlan(buildRecap({year:2025,timeZone:'UTC',activities,indexComplete:true,now:new Date('2025-10-23T12:00:00Z')}));
 const spec=cardSpec(d.stories.find(s=>s.id==='year-calendar'),recapContext(d.stories));
 assert.equal(spec.hero.text,'OCTOBER');assert.match(spec.unit,/BUSIEST MONTH SO FAR/);
 const label=build(spec).labels.find(l=>l.t==='BUSIEST');assert.equal(label.s,'SO FAR');
});

test('cards carry a short dot key instead of a legend line under the number',()=>{
 for(const s of stories){const spec=cardSpec(s,context);if(s.promotional)continue;assert.match(spec.legend,/^1 dot [=≈] /,s.id);}
});

test('cycling and strength sessions fill an object outline: grey dots show the rest',()=>{
 for(const id of ['cycling-sessions','strength-sessions']){
  const s=stories.find(x=>x.id===id),spec=cardSpec(s,context),b=build(spec);
  assert.equal(spec.L,'shape');assert.equal(b.pts.filter(p=>p.dat).length,readFigure(s.value));assert.ok(b.pts.some(p=>p.g),'outline guides');
 }
});
