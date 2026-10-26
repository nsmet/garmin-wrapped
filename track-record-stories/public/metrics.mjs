// Versioned measurement + chapter pipeline. Only allowlisted, typed fields enter it.
import registry from './sport-registry.mjs';
import {sportContent} from './story-content.mjs';
const aliases = new Map(registry.sports.flatMap(s=>[s.key,...s.aliases_to_validate].map(k=>[k,s.key])));
const labels = Object.fromEntries(registry.sports.map(s=>[s.key,s.label]));
labels.other='Other activities';
const distanceSports=new Set(['running','cycling','walking','hiking','swimming','rowing','skiing','triathlon']);
const fmt=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER;
const dateValid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const median=a=>{const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
const sum=a=>a.reduce((x,y)=>x+y,0);
export function validatePeriod(year,timeZone,now=new Date()) {
  try {new Intl.DateTimeFormat('en',{timeZone}).format(now);}catch{throw Error('Choose a valid time zone.');}
  const currentYear=Number(new Intl.DateTimeFormat('en',{timeZone,year:'numeric'}).format(now));
  if(!Number.isInteger(year)||year<2000||year>currentYear)throw Error('Choose a year between 2000 and this year.');
  return {year,timeZone,complete:year<currentYear};
}
export function normalizeActivity(a) {
  if(!a||!['string','number'].includes(typeof a.activityId)||String(a.activityId).length>100)throw Error('An activity has no valid identifier.');
  const stamp=typeof a.startTimeGMT==='string'?a.startTimeGMT.replace(' ','T'):'';
  const utc=stamp?Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(stamp)?stamp:stamp+'Z'):NaN;
  if(!Number.isFinite(utc))throw Error('An activity has no valid UTC start time.');
  const fields=['distance','duration','elevationGain','averageSpeed','maxSpeed','averageHR','maxHR','avgPower'];
  const record={id:String(a.activityId),utc,type:typeof a.activityType?.typeKey==='string'?a.activityType.typeKey:'unknown',parentId:a.parentId??null};
  for(const f of fields)record[f]=num(a[f])?a[f]:null;
  return record;
}
export function normalizeDaily(d) {
  if(!d||!dateValid(d.calendarDate))throw Error('A daily summary has no valid date.');
  const value=(v,max=Infinity)=>num(v)&&v<=max?v:null;
  return {date:d.calendarDate,steps:d.includesWellnessData===true?value(d.movement?.steps?.value):null,stress:d.includesWellnessData===true?value(d.stress?.avgLevel,100):null,restingHR:d.includesWellnessData===true?value(d.heartRate?.restingValue,250):null};
}
export function normalizeSleep(d) {
  if(!d||!dateValid(d.calendarDate))throw Error('A sleep summary has no valid date.');
  return {date:d.calendarDate,seconds:num(d.sleepTimeSeconds)&&d.sleepTimeSeconds>0&&d.sleepTimeSeconds<=86400?d.sleepTimeSeconds:null};
}
export function buildRecap({year,timeZone,activities,daily=[],sleep=[],indexComplete=false,includeHealth=false,warnings=[],now=new Date()}) {
  const period=validatePeriod(year,timeZone,now);
  if(!Array.isArray(activities)||activities.length>20000||!Array.isArray(daily)||!Array.isArray(sleep))throw Error('The imported data is too large or invalid.');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'long'});
  const ids=new Map(),quality=[],ledger=[],chapters=[],used=new Set();
  const excluded={children:0,duplicates:0,outsidePeriod:0};
  for(const a of activities){
    if(!a||typeof a.id!=='string'||!a.id||!Number.isFinite(a.utc)||typeof a.type!=='string')throw Error('The activity data is invalid.');
    if(a.parentId!==null&&a.parentId!==undefined&&a.parentId!==0&&a.parentId!=='0'){excluded.children++;continue;}
    const old=ids.get(a.id);if(old&&JSON.stringify(old)!==JSON.stringify(a))throw Error('Conflicting duplicate activities were returned. Please import again.');
    if(old)excluded.duplicates++;
    ids.set(a.id,a);
  }
  const records=[...ids.values()].map(a=>{const p=Object.fromEntries(parts.formatToParts(new Date(a.utc)).map(p=>[p.type,p.value]));return {...a,sport:aliases.get(a.type)||'other',date:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour),weekday:p.weekday};}).filter(a=>a.date.startsWith(year+'-')&&a.utc<=now.getTime()).sort((a,b)=>a.utc-b.utc||a.id.localeCompare(b.id));
  excluded.outsidePeriod=ids.size-records.length;
  const groups=Map.groupBy(records,r=>r.sport);
  const ordered=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
  // Keep only the fields needed to check a count. This stays in tab memory and
  // is never included in the card export schema.
  const activityAudit={received:activities.length,counted:records.length,excluded,sports:ordered.map(([key,rows])=>({key,label:labels[key],count:rows.length,types:[...Map.groupBy(rows,r=>r.type)].map(([type,items])=>({type,count:items.length})),activities:rows.map(({id,type,date,duration,distance})=>({id,type,date,duration:num(duration)?duration:null,distance:num(distance)?distance:null}))}))};
  if(!records.length)return {schemaVersion:'3.0.0',year,period,exampleOnly:false,includeHealth,activityAudit,notice:'No activities recorded for this year',chapters:[],stories:[],metrics:[],warnings:[...warnings,'No activities were returned for the selected year.']};
  const qualified=!indexComplete?' · imported records':!period.complete?' · so far':'';
  if(groups.has('other'))quality.push(`${groups.get('other').length} activities have unrecognized Garmin types. They are counted under Other activities; inspect the activity breakdown for details.`);
  function metric(key,rows,field,calculate,unit) {
    const valid=rows.filter(r=>num(r[field])),coverage=rows.length?valid.length/rows.length:0;
    const m={key,period,sport:rows[0]?.sport||'all',value:coverage===1?calculate(valid.map(r=>r[field])):null,unit,status:coverage===1?'verified':'partial',observed_count:valid.length,eligible_count:rows.length,coverage,source_fields:[field],source_evidence_ids:valid.map(r=>'activity:'+r.id),calculation_version:'1.0.0'};
    if(!num(m.value)){m.value=null;m.status=coverage===1?'invalid':'partial';}ledger.push(m);if(m.status!=='verified')quality.push(`${key}: ${valid.length}/${rows.length} records had a usable ${field}.`);return m;
  }
  function story(ch,id,template,title,value,unit,caption,evidence,{health=false,phase='scale',...extra}={}) {
    if(used.has(id))return;used.add(id);
    ch.stories.push({id,claimKey:id,template,title,value:String(value),unit,caption,status:'verified',evidence,health,phase,sharePolicy:health?'requires_explicit_share_consent':'allow_sanitized',sanitized:true,...extra});
  }
  function chapter(chapterId,title){const c={chapterId,title,order:chapters.length,stories:[]};chapters.push(c);return c;}
  const overview=chapter('year_overview','Your recorded year');
  const allEvidence=records.map(r=>'activity:'+r.id);
  const annualDuration=metric('year.duration_sum',records,'duration',sum,'s');
  const activeDays=new Set(records.map(r=>r.date)).size;
  const stats=[{label:'ACTIVITIES',value:fmt(records.length),unit:'recorded sessions'},
    ...(annualDuration.status==='verified'?[{label:'MINUTES',value:fmt(annualDuration.value/60),unit:`${fmt(annualDuration.value/3600)} recorded hours`}]:[]),
    {label:'ACTIVE DAYS',value:fmt(activeDays),unit:'days with an activity'},
    {label:'SPORTS',value:fmt(groups.size),unit:'recorded activity families'}];
  story(overview,'cover','cover',['YOUR YEAR','IN MOTION.'],year,'YOUR RECORDED EFFORT',`${records.length} activities. ${activeDays} active days${qualified}.\nThe numbers. The sports. The standout moments.`,allEvidence,{phase:'position'});
  story(overview,'year-summary','summary',['THE WHOLE','YEAR, IN VIEW.'],records.length,'RECORDED ACTIVITIES'+qualified,`${activeDays} days with recorded activity${qualified}.\n${annualDuration.status==='verified'?fmt(annualDuration.value/60)+' recorded minutes across '+groups.size+' sport families.':'Duration totals omitted: some measurements are missing.'}`,allEvidence,{chart:{kind:'summary',items:stats}});
  const leaders=ordered.filter(([,rows])=>rows.length===ordered[0][1].length);
  story(overview,'sport-mix','mix',['YOUR YEAR.','YOUR SPORTS.'],records.length,'ACTIVITIES BY SPORT'+qualified,`${leaders.length>1?leaders.length+' sport families share the lead.':labels[ordered[0][0]]+': '+ordered[0][1].length+' recorded activities.'}\nEach slice counts activities, not time.`,allEvidence,{chart:{kind:'sport-mix',total:records.length,items:ordered.map(([key,rows])=>({key,label:labels[key],value:rows.length}))}});
  const localNow=Object.fromEntries(parts.formatToParts(now).map(p=>[p.type,p.value]));
  const months=Array.from({length:12},(_,i)=>{
    const rows=records.filter(r=>Number(r.date.slice(5,7))===i+1),future=year>Number(localNow.year)||(year===Number(localNow.year)&&i+1>Number(localNow.month));
    const state=future?'future':!indexComplete?'partial':year===Number(localNow.year)&&i+1===Number(localNow.month)?'current':'complete';
    const observed=rows.length>0||indexComplete;
    return {label:new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(year,i,1))).toUpperCase(),state,sessions:future||!observed?null:rows.length,value:future||!observed?null:annualDuration.status==='verified'?sum(rows.map(r=>r.duration))/60:rows.length};
  });
  const measure=annualDuration.status==='verified'?'minutes':'sessions';
  story(overview,'year-calendar','heatmap',['EVERY MONTH,','A DIFFERENT PACE.'],year,'MONTHLY RECORDED '+measure.toUpperCase()+qualified,`${measure==='minutes'?'Recorded minutes':'Activity counts; duration measurements are incomplete'}. Darker means more.\n${!indexComplete?'Partial import: blank months have unknown coverage.':!period.complete?'Peak and quietest compare completed months only.':'Peak and quietest include months with no recorded activity.'}`,allEvidence,{chart:{kind:'months',measure,compare:!!indexComplete,items:months}});
  for(const [sport,rows] of ordered){
    const template=sport==='other'?'cardio':sport,ch=chapter('sport:'+sport,labels[sport]);
    const evidence=rows.map(r=>'activity:'+r.id);
    const content=kind=>sportContent(sport,kind);
    story(ch,`${sport}-sessions`,template,content('sessions').title,rows.length,'RECORDED '+content('sessions').noun.toUpperCase()+qualified,`${rows.length} ${content('sessions').noun} in your recorded year${qualified}.\n${fmt(rows.length/records.length*100)}% of all recorded activities.`,evidence,{phase:'position',presentation:'hero',geometry:content('sessions').geometry});
    const duration=metric(`${sport}.duration_sum`,rows,'duration',sum,'s');
    if(duration.value>0)story(ch,`${sport}-hours`,template,content('hours').title,fmt(duration.value/3600),'RECORDED HOURS'+qualified,`${fmt(duration.value/60)} recorded minutes of ${labels[sport].toLowerCase()}.\n${fmt(duration.value/60/rows.length)} minutes per activity, on average.`,[duration.key],{presentation:'duration',chart:{kind:'duration',items:[{label:'RECORDED MINUTES',value:fmt(duration.value/60)},{label:'AVG MIN / ACTIVITY',value:fmt(duration.value/60/rows.length)}]}});
    if(distanceSports.has(sport)){
      const distance=metric(`${sport}.distance_sum`,rows,'distance',sum,'m');
      if(distance.value>0)story(ch,`${sport}-distance`,template,content('distance').title,fmt(distance.value/1000),'RECORDED KILOMETRES'+qualified,`${fmt(distance.value/1000/rows.length)} km per ${content('sessions').noun==='runs'?'run':sport==='cycling'?'ride':'activity'}, on average.\nTotal distance across ${rows.length} recorded activities.`,[distance.key],{presentation:'distance',geometry:content('distance').geometry});
      const longest=metric(`${sport}.distance_max`,rows,'distance',a=>Math.max(...a),'m');
      if(longest.value>0&&rows.length>1&&indexComplete)story(ch,`${sport}-longest`,template,content('longest').title,fmt(longest.value/1000),'KM · LONGEST RECORDED'+qualified,`The longest distance among ${rows.length} recorded ${content('sessions').noun}.\nYour ${rows.length===2?'two':'three'} longest distances, side by side.`,[longest.key],{phase:'peak',presentation:'record',chart:{kind:'record',items:rows.map(r=>r.distance/1000).sort((a,b)=>b-a).slice(0,3).map((value,i)=>({label:String(i+1).padStart(2,'0'),value}))}});
    }
    if(rows.length>=8){
      const days=Object.entries(Object.groupBy(rows,r=>r.weekday)).map(([k,v])=>[k,v.length]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
      if(days[0][1]>days[1]?.[1]||days.length===1)story(ch,`${sport}-weekday`,template,content('weekday').title,days[0][0].toUpperCase(),'MOST RECORDED '+labels[sport].toUpperCase()+' DAY'+qualified,`${days[0][1]} of ${rows.length} ${content('sessions').noun} fell on ${days[0][0]}.\nActivity dates use ${timeZone}.`,evidence,{phase:'pattern',presentation:'weekday',chart:{kind:'weekdays',items:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(label=>({label,value:days.find(d=>d[0]===label)?.[1]||0}))}});
    }
    ch.stories.sort((a,b)=>['position','scale','pattern','peak'].indexOf(a.phase)-['position','scale','pattern','peak'].indexOf(b.phase));
  }
  function dailyRecords(data,field){
    const map=new Map();for(const d of data){if(!d||typeof d.date!=='string'||!dateValid(d.date))throw Error('Invalid daily record.');if(!d.date.startsWith(year+'-'))continue;const old=map.get(d.date);if(old&&JSON.stringify(old)!==JSON.stringify(d))throw Error('Conflicting daily records. Please import again.');map.set(d.date,d);}
    return [...map.values()].filter(d=>num(d[field]));
  }
  const steps=dailyRecords(daily,'steps');
  if(steps.length){const ch=chapter('everyday_movement','Everyday movement');
    story(ch,'steps-total','walking',['SMALL STEPS.','BIG PICTURE.'],fmt(sum(steps.map(d=>d.steps))),'STEPS · '+steps.length+' RECORDED DAYS', 'Steps from recorded days only.\nMissing days are never zero.',steps.map(d=>'daily:'+d.date));
    story(ch,'steps-peak','active',['YOUR BIGGEST','RECORDED STEP DAY.'],fmt(Math.max(...steps.map(d=>d.steps))),'STEPS IN ONE RECORDED DAY',`${steps.length} days with step records.\nDaily dates follow Garmin.`,steps.map(d=>'daily:'+d.date),{phase:'peak'});
  }
  if(includeHealth){
    const nights=dailyRecords(sleep,'seconds').filter(d=>d.seconds>0&&d.seconds<=86400);
    if(nights.length>=30){const ch=chapter('sleep','Your recorded sleep'),seconds=median(nights.map(d=>d.seconds)),mins=Math.round(seconds/60);story(ch,'sleep-median','sleep',['OFF THE','CLOCK.'],`${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}m`,'MEDIAN RECORDED SLEEP',`${nights.length} nights with sleep records.\nNo sleep is inferred for missing nights.`,nights.map(d=>'sleep:'+d.date),{health:true});}
    else if(nights.length)quality.push('Sleep: at least 30 recorded nights are required for a sleep pattern.');
    const hr=dailyRecords(daily,'restingHR').filter(d=>d.restingHR>0&&d.restingHR<=250);
    if(hr.length>=30){const ch=chapter('heart_and_effort','Recorded resting heart rate');story(ch,'resting-hr','heart',['A RECORDED','RHYTHM.'],fmt(median(hr.map(d=>d.restingHR))),'BPM · MEDIAN RESTING HEART RATE',`${hr.length} recorded days.\nA measurement, without medical interpretation.`,hr.map(d=>'daily:'+d.date),{health:true});}
  }
  const finale=chapter('finale','Your track record');story(finale,'finale','finale',['THAT’S YOUR','TRACK RECORD.'],year,'YOUR RECORDED YEAR'+qualified,`${records.length} activities. ${groups.size} sport families.\nA year with a shape all your own.`,allEvidence,{phase:'payoff',presentation:'receipt',chart:{kind:'summary',items:stats}});
  return {schemaVersion:'3.0.0',calculationVersion:'1.0.0',year,period,indexComplete:!!indexComplete,exampleOnly:false,includeHealth,activityAudit,notice:`Recorded ${year}${!period.complete?' · year to date':''}${!indexComplete?' · partial import':''}`,chapters,stories:chapters.flatMap(c=>c.stories.map(s=>({...s,chapterId:c.chapterId}))),metrics:ledger,warnings:[...warnings,...quality]};
}
