import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDaily,buildRecap} from '../public/metrics.mjs';
import {handleApi,seal} from '../server/api.mjs';
import {collectRecap} from '../public/importer.mjs';
import {cardSpec} from '../public/dot-spec.mjs';
import {build,fracDots} from '../public/dot-engine.mjs';

// Garmin Personal API: UserDailySummaryV2DTO.movement.floorsAscended.value (whole floors).
const summary=(date,floors,wellness=true)=>({calendarDate:date,includesWellnessData:wellness,movement:{steps:{value:4000},floorsAscended:{goal:10,value:floors,distanceInMeters:floors*3.05}}});
const activity={id:'1',utc:Date.UTC(2025,2,10,6),type:'running',parentId:null,distance:5000,duration:1800};
const recap=daily=>buildRecap({year:2025,timeZone:'UTC',activities:[activity],daily,indexComplete:true,now:new Date('2025-10-23T12:00:00Z')});

test('floors climbed are read from movement.floorsAscended.value and stay absent when unrecorded',()=>{
 assert.equal(normalizeDaily(summary('2025-01-01',12)).floors,12);
 assert.equal(normalizeDaily(summary('2025-01-01',12,false)).floors,null);
 assert.equal(normalizeDaily({calendarDate:'2025-01-01',includesWellnessData:true,movement:{steps:{value:1}}}).floors,null);
 assert.equal(normalizeDaily(summary('2025-01-01',-3)).floors,null);
});

test('a floors story sums recorded days only and is omitted when nothing was climbed',()=>{
 const daily=[summary('2025-01-01',10),summary('2025-01-02',0),{calendarDate:'2025-01-03',includesWellnessData:true,movement:{steps:{value:1}}}].map(normalizeDaily);
 const story=recap(daily).stories.find(s=>s.id==='floors-total');
 assert.equal(story.value,'10');assert.equal(story.unit,'FLOORS CLIMBED · 2 RECORDED DAYS');assert.equal(story.chapterId,'everyday_movement');assert.equal(story.health,false);
 assert.ok(!recap([summary('2025-01-01',0)].map(normalizeDaily)).stories.some(s=>s.id==='floors-total'));
 assert.ok(!recap([]).stories.some(s=>s.id==='floors-total'));
});

test('floors are everyday movement: kept without health consent, dropped with steps',async()=>{
 const secret='x'.repeat(43),user='owner',cookie=await seal({user,token:'a.b.c',exp:Date.now()+10000},secret);
 const r=await handleApi(new Request('https://mini.test/api/wellness',{method:'POST',headers:{Origin:'https://mini.test','Content-Type':'application/json','oai-authenticated-user-id':user,Cookie:'__Host-mini-session='+cookie},body:JSON.stringify({year:2025,includeHealth:false})}),{SESSION_SECRET:secret,GARMIN_MODE:'personal'},{fetcher:async()=>Response.json({data:[{...summary('2025-01-01',7),heartRate:{restingValue:50}}]}),log(){}});
 const d=await r.json();assert.equal(d.daily[0].floors,7);assert.ok(!('restingHR' in d.daily[0]));
 const original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{const path=url.split('/').pop(),body=JSON.parse(init.body);
  if(path==='activities')return Response.json({activities:body.start?[]:[activity],next:1,complete:!!body.start});
  if(path==='wellness')return Response.json({daily:[{date:'2025-01-01',steps:4000,floors:7}]});
  return Response.json({connected:true,disconnected:true});};
 try{
  const without=await collectRecap({key:'fictional-test-key',year:2025,timeZone:'UTC',includeSteps:false,includeHealth:true});
  assert.ok(!without.stories.some(s=>s.id==='floors-total'));
  const withSteps=await collectRecap({key:'fictional-test-key',year:2025,timeZone:'UTC'});
  assert.equal(withSteps.stories.find(s=>s.id==='floors-total')?.value,'7');
 }finally{globalThis.fetch=original;}
});

test('the floors card fills a stairwell with one dot per stated number of floors',()=>{
 const story={id:'floors-total',title:['ONE FLOOR','AT A TIME.'],value:'2,970',unit:'FLOORS CLIMBED · 330 RECORDED DAYS',caption:'330 days with floor records.\nMissing days are never zero.'};
 const spec=cardSpec(story,{});assert.equal(spec.L,'shape');assert.equal(spec.p.kind,'floors');
 const unit=Number(spec.legend.match(/= (\d+) floor/)[1]);assert.equal(build(spec).pts.filter(p=>p.dat).length,fracDots(2970,unit).total);
});
