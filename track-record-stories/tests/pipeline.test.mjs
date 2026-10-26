import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeActivity,normalizeDaily,normalizeSleep,buildRecap,validatePeriod} from '../public/metrics.mjs';
import {datasetFromPlan,canShare,canRequestShare,sanitizedCard} from '../public/story-model.mjs';
const raw=(id,more={})=>({activityId:id,startTimeGMT:'2025-03-10 06:00:00',activityType:{typeKey:'running'},distance:5000,duration:1800,...more});
const run=(id,more={})=>normalizeActivity(raw(id,more));
const make=(more={})=>buildRecap({year:2025,timeZone:'Europe/Brussels',activities:[run(1),run(2)],indexComplete:true,...more});
test('GMT timestamps are explicitly UTC, numeric strings and missing metrics never become zero',()=>{const r=run(1,{distance:'5000',duration:undefined});assert.equal(r.utc,Date.UTC(2025,2,10,6));assert.equal(r.distance,null);assert.equal(r.duration,null);assert.throws(()=>normalizeActivity(raw(1,{startTimeGMT:null})));});
test('Annual totals require every eligible record, while supported session counts remain',()=>{const p=make({activities:[run(1),run(2,{distance:null})]});assert.ok(p.stories.some(s=>s.id==='running-sessions'));assert.ok(!p.stories.some(s=>s.id==='running-distance'));assert.ok(!p.stories.some(s=>s.id==='running-longest'));assert.equal(p.metrics.find(m=>m.key==='running.distance_sum').coverage,.5);assert.ok(p.warnings.length);});
test('Deduplication excludes multisport children and rejects conflicting copies',()=>{const a=run(1),p=make({activities:[a,a,run(2,{parentId:1})]});assert.equal(p.stories.find(s=>s.id==='running-sessions').value,'1');assert.throws(()=>make({activities:[a,{...a,distance:6}]}),/Conflicting/);});
test('Year boundaries follow the requested timezone rather than process timezone',()=>{const p=make({activities:[run(1,{startTimeGMT:'2024-12-31 23:30:00'}),run(2,{startTimeGMT:'2025-12-31 23:30:00'})]});assert.equal(p.stories.find(s=>s.id==='running-sessions').value,'1');});
test('Partial indexes never claim a longest-of-year and qualify the imported totals',()=>{const p=make({indexComplete:false});assert.ok(!p.stories.some(s=>s.id==='running-longest'));assert.match(p.notice,/partial/);assert.match(p.stories.find(s=>s.id==='running-distance').unit,/imported/);});
test('Current year is qualified as so far',()=>{const p=buildRecap({year:2025,timeZone:'UTC',activities:[run(1)],indexComplete:true,now:new Date('2025-06-01')});assert.equal(p.period.complete,false);assert.match(p.stories.find(s=>s.id==='running-sessions').unit,/so far/);});
test('No activities yields an explicit empty result, not fabricated totals',()=>{assert.equal(make({activities:[]}).stories.length,0);});
test('Unknown activity types are preserved as other and not invented sports',()=>{const p=make({activities:[run(1,{activityType:{typeKey:'unmapped_sport'}})]});assert.ok(p.chapters.some(c=>c.chapterId==='sport:other'));assert.ok(!p.chapters.some(c=>c.chapterId==='sport:running'));});
test('Source breakdown reconciles every returned record and preserves the exact Garmin types behind each count',()=>{
 const bike=run(1,{activityType:{typeKey:'indoor_cycling'},activityName:'Morning Run'});
 const p=make({activities:[bike,bike,run(2,{parentId:1}),run(3,{startTimeGMT:'2024-01-01 10:00:00'}),run(4,{activityType:{typeKey:'trail_running'}}),run(5,{activityType:{typeKey:'walking'}}),run(6,{activityType:{typeKey:'unknown_type'}})]});
 const audit=p.activityAudit;
 assert.equal(audit.received,7);assert.equal(audit.counted,4);assert.deepEqual(audit.excluded,{duplicates:1,children:1,outsidePeriod:1});
 assert.equal(audit.counted+Object.values(audit.excluded).reduce((a,b)=>a+b,0),audit.received);
 assert.deepEqual(audit.sports.find(s=>s.key==='cycling').types,[{type:'indoor_cycling',count:1}]);
 assert.deepEqual(audit.sports.find(s=>s.key==='running').types,[{type:'trail_running',count:1}]);
 assert.equal(p.stories.find(s=>s.id==='running-sessions').value,'1');
 assert.match(p.warnings.join(' '),/unrecognized Garmin types/);
 assert.deepEqual(Object.keys(audit.sports[0].activities[0]).sort(),['date','distance','duration','id','type']);
 const d=datasetFromPlan(p);for(const s of d.stories)assert.ok(!JSON.stringify(sanitizedCard(s,d)).includes('activityAudit'));
});
test('Missing or negative daily wellness values stay absent',()=>{assert.equal(normalizeDaily({calendarDate:'2025-01-01',includesWellnessData:false,movement:{steps:{value:123}}}).steps,null);assert.equal(normalizeSleep({calendarDate:'2025-01-01',sleepTimeSeconds:-1}).seconds,null);});
test('Sleep requires opt-in and enough recorded nights',()=>{const sleep=Array.from({length:30},(_,i)=>({date:`2025-01-${String(i+1).padStart(2,'0')}`,seconds:25200}));assert.ok(!make({sleep}).stories.some(s=>s.health));const p=make({sleep,includeHealth:true});assert.equal(p.stories.find(s=>s.id==='sleep-median').value,'7h 00m');assert.ok(!make({sleep:sleep.slice(0,29),includeHealth:true}).stories.some(s=>s.id==='sleep-median'));});
test('A health card requires per-card consent even if incorrectly marked allow_sanitized',()=>{const d=datasetFromPlan(make()),s={...d.stories[1],health:true,sharePolicy:'allow_sanitized'};assert.equal(canRequestShare(s,d),true);assert.equal(canShare(s,d),false);d.shareConsents.add(s.id);assert.equal(canShare(s,d),true);d.shareConsents.clear();assert.equal(canShare(s,d),false);});
test('Export allowlist strips identifiers, evidence, coordinates and arbitrary properties',()=>{const d=datasetFromPlan(make()),s={...d.stories[1],name:'Private Name',latitude:12,evidence:['private-id'],locationPrecision:'exact',raw:{secret:'x'}};const card=sanitizedCard(s,d);for(const key of ['name','latitude','evidence','locationPrecision','raw'])assert.ok(!(key in card));assert.ok(!JSON.stringify(card).includes('private-id'));});
test('Story plans are chapter-first, deterministic, and admitted by presentation validation',()=>{const a=make(),b=make();assert.deepEqual(a,b);assert.equal(datasetFromPlan(a).stories.length,a.stories.length);assert.ok(a.chapters.every(c=>c.stories.length));assert.equal(new Set(a.stories.map(s=>s.claimKey)).size,a.stories.length);});
test('Invalid years and timezones fail before import',()=>{assert.throws(()=>validatePeriod(1999,'UTC'));assert.throws(()=>validatePeriod(2025,'Mars/Olympus'));});

// Independent annual fixture: two sessions share a day; a duplicate and multisport child must not count.
const annual=()=>{
 const a=run(101,{startTimeGMT:'2025-01-04 06:00:00',duration:1800});
 return make({activities:[a,a,run(102,{startTimeGMT:'2025-01-04 08:00:00',activityType:{typeKey:'hiit'},duration:3600}),run(103,{startTimeGMT:'2025-02-07 06:00:00',activityType:{typeKey:'indoor_cycling'},duration:7200}),run(104,{startTimeGMT:'2025-02-08 06:00:00',parentId:103})]});
};
import {chartDescription,validChart} from '../public/story-model.mjs';
import {monthExtremes} from '../public/data-poster.mjs';
test('Year overview counts each activity, active day and sport exactly once and sums recorded minutes',()=>{
 const p=annual(),stats=p.stories.find(s=>s.id==='year-summary').chart.items;
 assert.deepEqual(stats.map(i=>[i.label,i.value]),[['ACTIVITIES','3'],['MINUTES','210'],['ACTIVE DAYS','2'],['SPORTS','3']]);
 const mix=p.stories.find(s=>s.id==='sport-mix').chart;
 assert.equal(mix.total,3);assert.deepEqual(mix.items.map(i=>[i.key,i.value]),[['cycling',1],['hiit',1],['running',1]]);
 const calendar=p.stories.find(s=>s.id==='year-calendar').chart;
 assert.equal(calendar.measure,'minutes');assert.equal(calendar.items[0].value,90);assert.equal(calendar.items[1].value,120);assert.equal(calendar.items[2].value,0);
 assert.equal(monthExtremes(calendar).peak[0].label,'FEB');assert.equal(monthExtremes(calendar).quiet.length,10);
 assert.match(chartDescription(calendar),/Quietest completed months \(tied\): MAR, APR/);
});
test('Monthly chart falls back to activity counts if even one activity duration is missing',()=>{
 const p=make({activities:[run(1,{duration:null}),run(2)]});
 assert.ok(!p.stories.find(s=>s.id==='year-summary').chart.items.some(i=>i.label==='MINUTES'));
 assert.equal(p.stories.find(s=>s.id==='year-calendar').chart.measure,'sessions');
});
test('Partial coverage never assigns zero to unobserved months or ranks them as quietest',()=>{
 const calendar=make({indexComplete:false}).stories.find(s=>s.id==='year-calendar').chart;
 assert.equal(calendar.items[0].value,null);assert.equal(calendar.items[2].value,60);assert.equal(monthExtremes(calendar),null);
});
test('Current and future months are excluded from completed-month comparisons in the chosen timezone',()=>{
 const p=make({now:new Date('2025-04-30T22:30:00Z'),activities:[run(1,{startTimeGMT:'2025-04-30 22:00:00'}),run(2,{startTimeGMT:'2025-06-01 10:00:00'})]});
 const chart=p.stories.find(s=>s.id==='year-calendar').chart;
 assert.equal(p.stories.find(s=>s.id==='year-summary').value,'1');
 assert.equal(chart.items[3].state,'complete');assert.equal(chart.items[4].state,'current');assert.equal(chart.items[4].value,30);assert.equal(chart.items[5].state,'future');assert.equal(chart.items[5].value,null);
 assert.equal(monthExtremes(chart).peak.length,4);
});
test('Sport stories have distinct copy and a different visual treatment for each measurement',()=>{
 const p=annual(),sessions=p.stories.filter(s=>s.id.endsWith('-sessions'));
 assert.equal(new Set(sessions.map(s=>s.title.join(' '))).size,sessions.length);
 assert.ok(p.stories.every(s=>!/YOU SHOWED UP|TIME WELL SPENT/.test(s.title.join(' '))));
 assert.equal(p.stories.find(s=>s.id==='running-sessions').presentation,'hero');
 assert.equal(p.stories.find(s=>s.id==='running-hours').chart.kind,'duration');
 assert.equal(p.stories.find(s=>s.id==='running-distance').presentation,'distance');
});
test('Chart export preserves displayed aggregates while stripping nested private fields and refusing malformed data',()=>{
 const d=datasetFromPlan(annual()),s=d.stories.find(s=>s.id==='sport-mix');
 const poisoned={...s,chart:{...s.chart,raw:{secret:'private'},items:s.chart.items.map(i=>({...i,evidence:['private-id'],latitude:12}))}};
 const card=sanitizedCard(poisoned,d);
 assert.deepEqual(card.chart,s.chart);assert.ok(!JSON.stringify(card).includes('private'));
 assert.equal(validChart({...s.chart,total:999}),false);assert.equal(validChart({...s.chart,items:[{label:'Bad',value:NaN}]}),false);
 assert.ok(!datasetFromPlan({...annual(),chapters:[{stories:[{...s,chart:{...s.chart,total:999}}]}]}).stories.length);
});
