import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeActivity,normalizeHrv,buildRecap} from '../public/metrics.mjs';
import {hrvMonth} from '../server/garmin.mjs';
import {handleApi,seal} from '../server/api.mjs';
import {collectRecap} from '../public/importer.mjs';
import {datasetFromPlan,sanitizedCard,validChart,chartDescription,canShare,healthMonthExtremes} from '../public/story-model.mjs';

const activity=(id,extra={})=>({id:String(id),utc:Date.UTC(2025,0,2),type:'running',parentId:null,duration:1800,distance:5000,...extra});
const days=(month,count,value,field='restingHR')=>Array.from({length:count},(_,i)=>({date:`2025-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,[field]:value}));
const input={year:2025,timeZone:'Europe/Brussels',activities:Array.from({length:8},(_,i)=>activity(i,{averageHR:120+i,maxHR:170+i})),indexComplete:true,includeHealth:true,now:new Date('2026-01-01T12:00:00Z')};
const make=extra=>buildRecap({...input,...extra});
const story=(plan,id)=>plan.stories.find(s=>s.id===id);

test('Recorded peaks and mean activity averages use valid observed activities and retain coverage',()=>{
 const p=make({activities:[...input.activities,activity(20),activity(21,{maxHR:999,averageHR:0}),activity(22,{maxHR:100,averageHR:180}),activity(23,{maxHR:240,parentId:'parent'}),activity(24,{maxHR:249,utc:Date.UTC(2024,0,1)})]});
 assert.equal(story(p,'max-hr').value,'177');assert.match(story(p,'max-hr').caption,/8 of 11/);assert.equal(story(p,'activity-hr').value,'123.5');
 assert.ok(!story(make({includeHealth:false}),'max-hr'));
 const p2=make({indexComplete:false});assert.match(story(p2,'max-hr').unit,/imported records/);
 const current=make({now:new Date('2025-06-01T12:00:00Z')});assert.match(story(current,'max-hr').unit,/so far/);
});
test('Activity normalization rejects zero, strings, out-of-range and contradictory HR readings',()=>{
 const raw={activityId:1,startTimeGMT:'2025-01-02 06:00:00',activityType:{typeKey:'running'}};
 for(const [averageHR,maxHR] of [[0,999],['130','180'],[170,140]]){const d=normalizeActivity({...raw,averageHR,maxHR});assert.equal(d.averageHR,null);assert.equal(d.maxHR,null);}
});
test('Activity HR uses the mean of recorded activity averages and compares monthly means including ties',()=>{
 const activities=[
  activity(1,{utc:Date.UTC(2025,0,1),averageHR:100,maxHR:200,duration:60}),
  activity(2,{utc:Date.UTC(2025,0,2),averageHR:110,maxHR:200,duration:3600}),
  activity(3,{utc:Date.UTC(2025,1,1),averageHR:180,maxHR:200,duration:600}),
  activity(4,{utc:Date.UTC(2025,3,1),averageHR:180,maxHR:200,duration:7200}),
  activity(5,{utc:Date.UTC(2025,4,1),averageHR:190,maxHR:200}),
  activity(6,{utc:Date.UTC(2025,1,2),averageHR:null,maxHR:200})
 ];
 const p=make({activities,now:new Date('2025-04-15T12:00:00Z')}),summary=story(p,'activity-hr'),s=story(p,'activity-hr-monthly');
 assert.equal(summary.value,'142.5');assert.match(summary.caption,/4 of 5 activities/);assert.match(summary.unit,/AVERAGE ACTIVITY HEART RATE/);
 assert.equal(s.chart.items.length,12);assert.equal(s.chart.items[0].value,105);assert.equal(s.chart.items[0].count,2);assert.equal(s.chart.items[1].value,180);assert.equal(s.chart.items[2].value,null);assert.equal(s.chart.items[3].state,'current');assert.equal(s.chart.items[3].value,180);assert.equal(s.chart.items[4].state,'future');assert.equal(s.chart.items[4].value,null);
 assert.deepEqual(healthMonthExtremes(s.chart).highest.map(i=>i.label),['FEB','APR']);assert.deepEqual(healthMonthExtremes(s.chart).lowest.map(i=>i.label),['JAN']);
 assert.match(chartDescription(s.chart),/Highest monthly averages \(tied\): FEB, APR \(so far\), 180 bpm/);assert.match(chartDescription(s.chart),/Lowest monthly average: JAN, 105 bpm/);
 const partial=story(make({activities,indexComplete:false,now:new Date('2025-04-15T12:00:00Z')}),'activity-hr-monthly');assert.equal(healthMonthExtremes(partial.chart),null);assert.match(partial.caption,/not ranked/);
 const onePlan=make({activities:[activities[0]]}),one=story(onePlan,'activity-hr-monthly');assert.ok(one);assert.ok(validChart(one.chart));assert.ok(datasetFromPlan(onePlan).stories.some(s=>s.id===one.id));assert.equal(healthMonthExtremes(one.chart),null);assert.match(one.caption,/One month/);
});
test('Monthly comparison preserves rounded ties and never treats missing months as zero',()=>{
 const activities=[activity(1,{utc:Date.UTC(2025,0,1),averageHR:140.03,maxHR:200}),activity(2,{utc:Date.UTC(2025,1,1),averageHR:140.04,maxHR:200})];
 const chart=story(make({activities}),'activity-hr-monthly').chart;
 assert.equal(chart.items[0].value,140);assert.equal(chart.items[1].value,140);assert.equal(chart.items[2].value,null);
 assert.equal(healthMonthExtremes(chart).highest.length,2);assert.match(chartDescription(chart),/All 2 recorded months are tied at 140 bpm/);
});
test('Monthly resting HR uses daily averages, preserves missing months and counts duplicate dates once',()=>{
 const daily=[...days(1,20,60),...days(2,10,50),...days(3,9,40)];
 const p=make({daily:[...daily,daily[0]]}),s=story(p,'resting-hr-monthly');
 assert.equal(story(p,'resting-hr').value,'52.8');assert.equal(s.chart.items[0].value,60);assert.equal(s.chart.items[1].value,50);assert.equal(s.chart.items[2].value,null);assert.equal(s.chart.items[2].count,9);assert.equal(s.chart.items[3].value,null);
 assert.match(chartDescription(s.chart),/MAR: insufficient measurements \(9 recorded days\)/);
 assert.equal(s.value,'MONTHLY AVERAGES');assert.equal(s.unit,'BPM · RESTING HEART RATE');assert.match(chartDescription(s.chart),/Highest monthly average: JAN, 60 bpm/);assert.match(chartDescription(s.chart),/Lowest monthly average: FEB, 50 bpm/);
 assert.throws(()=>make({daily:[...daily,{...daily[0],restingHR:99}]}),/Conflicting daily/);
 assert.equal(story(make({daily:days(1,29,55)}),'resting-hr'),undefined);
 assert.equal(story(make({daily:days(1,30,55)}),'resting-hr-monthly'),undefined);
});
test('Health months omit future dates in the requested timezone and mark the current month',()=>{
 const p=make({daily:[...days(1,20,60),...days(2,20,50),...days(3,20,40)],now:new Date('2025-02-09T23:30:00Z')});
 const chart=story(p,'resting-hr-monthly').chart;
 assert.equal(chart.items[1].state,'current');assert.equal(chart.items[1].count,10);assert.equal(chart.items[1].value,50);assert.equal(chart.items[2].state,'future');assert.equal(chart.items[2].count,0);assert.equal(chart.items[2].value,null);
});
test('HRV uses overnight averages, never weekly averages, and omits unavailable measurements',()=>{
 assert.deepEqual(normalizeHrv({calendarDate:'2025-01-01',lastNightAvg:52,weeklyAvg:99,userProfilePk:'private'}),{date:'2025-01-01',hrv:52});
 for(const extra of [{weeklyAvg:55},{lastNightAvg:0},{lastNightAvg:-1},{lastNightAvg:'55'},{lastNightAvg:1001},{lastNightAvg:55,status:'INVALID'}])assert.equal(normalizeHrv({calendarDate:'2025-01-01',...extra}).hrv,null);
 assert.throws(()=>normalizeHrv({calendarDate:'2025-02-30',lastNightAvg:50}));
 const p=make({hrv:[...days(1,20,50,'hrv'),...days(2,10,70,'hrv')]});
 assert.equal(story(p,'hrv-median').value,'50');assert.equal(story(p,'hrv-monthly').chart.items[1].value,70);assert.equal(story(make({hrv:days(1,29,50,'hrv')}),'hrv-median'),undefined);
 assert.ok(!make({hrv:[]}).stories.some(s=>s.template==='hrv'));
});
test('HRV adapter uses the documented range response, handles no data, and strips identifiers and status',async()=>{
 const result=await hrvMonth({year:2024,month:2},{fetcher:async url=>{assert.equal(new URL(url).pathname,'/hrv-service/hrv/daily/2024-02-01/2024-02-29');return Response.json({userProfilePk:123,hrvSummaries:[{calendarDate:'2024-02-01',lastNightAvg:53,weeklyAvg:77,status:'BALANCED'}]});}});
 assert.deepEqual(result,{hrv:[{date:'2024-02-01',hrv:53}]});
 assert.deepEqual(await hrvMonth({year:2025,month:1},{fetcher:async()=>new Response(null,{status:204})}),{hrv:[]});
 await assert.rejects(()=>hrvMonth({year:2025,month:13}),e=>e.code==='MONTH_INVALID');
 await assert.rejects(()=>hrvMonth({year:2025,month:1},{fetcher:async()=>Response.json({hrvSummaries:{}})}),e=>e.code==='UPSTREAM_DATA');
});
test('HRV API requires a session and returns only normalized fields',async()=>{
 const secret='x'.repeat(43),env={SESSION_SECRET:secret,GARMIN_MODE:'personal'},user='heart-test-owner';
 const request=cookie=>new Request('https://mini.test/api/hrv',{method:'POST',headers:{Origin:'https://mini.test','Content-Type':'application/json','oai-authenticated-user-id':user,...(cookie?{Cookie:'__Host-mini-session='+cookie}:{})},body:JSON.stringify({year:2025,month:1})});
 assert.equal((await handleApi(request(),env,{log(){}})).status,401);
 const cookie=await seal({user,token:'a.b.c',exp:Date.now()+10000},secret);
 const r=await handleApi(request(cookie),env,{fetcher:async()=>Response.json({userProfilePk:123,hrvSummaries:[{calendarDate:'2025-01-01',lastNightAvg:52}]}),log(){}});
 assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.deepEqual(await r.json(),{hrv:[{date:'2025-01-01',hrv:52}]});
});
test('All heart slides need separate export consent and monthly exports copy only display aggregates',()=>{
 const d=datasetFromPlan(make({daily:[...days(1,20,60),...days(2,10,50)],hrv:[...days(1,20,50,'hrv'),...days(2,10,70,'hrv')]}));
 const heart=d.stories.filter(s=>s.chapterId==='heart_and_effort');assert.equal(heart.length,7);
 for(const s of heart){assert.equal(s.health,true);assert.equal(canShare(s,d),false);assert.throws(()=>sanitizedCard(s,d));d.shareConsents.add(s.id);assert.equal(canShare(s,d),true);}
 const s=heart.find(s=>s.id==='hrv-monthly'),poisoned={...s,chart:{...s.chart,userProfilePk:123,items:s.chart.items.map(i=>({...i,raw:{secret:'private'},evidence:['private-id']}))}};
 const card=sanitizedCard(poisoned,d);assert.deepEqual(card.chart,s.chart);assert.ok(!JSON.stringify(card).includes('private'));assert.ok(!JSON.stringify(card).includes('userProfilePk'));
 assert.equal(validChart({...s.chart,items:s.chart.items.map(i=>({...i,value:0}))}),false);
 assert.equal(validChart({...s.chart,items:s.chart.items.map(i=>({...i,value:null}))}),false);
});
test('A failed HRV month discards partial HRV history and preserves resting HR and activity stories',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,init)=>{const path=url.split('/').pop(),body=JSON.parse(init.body);calls.push({path,body});
  if(path==='activities')return Response.json({activities:body.start?[]:input.activities,complete:!!body.start,next:body.start?null:8});
  if(path==='wellness')return Response.json({daily:[...days(1,20,60),...days(2,10,50)]});
  if(path==='sleep')return Response.json({sleep:[]});
  if(path==='hrv')return body.month===1?Response.json({hrv:days(1,30,55,'hrv')}):Response.json({error:{code:'GARMIN_PERMISSION',message:'Unavailable'}},{status:403});
  return Response.json({connected:true,disconnected:true});
 };
 try{const p=await collectRecap({key:'fictional-test-key',year:2025,timeZone:'UTC'});assert.ok(story(p,'resting-hr-monthly'));assert.ok(story(p,'max-hr'));assert.ok(!story(p,'hrv-median'));assert.equal(calls.filter(c=>c.path==='hrv').length,2);assert.equal(calls.at(-1).path,'disconnect');}finally{globalThis.fetch=original;}
});
