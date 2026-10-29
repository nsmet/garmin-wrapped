// Purpose-built FICTIONAL records. Every demo chart and story uses this one fixture.
// These are not Garmin responses or the owner's activity history.
// The fixture covers every sport family with enough sessions for each card the
// production planner can admit (sessions, hours, distance, weekday, longest).
import {buildRecap} from './metrics.mjs';
//  sport (Garmin type), count, base duration (s), base distance (m) or null, HR offset
const SPORTS=[
 ['hiit','hiit',68,2100,null,12],['running','running',52,2700,5000,6],['cycling','cycling',17,5400,18000,1],['strength','strength',13,2400,null,-5],
 ['walking','walking',26,2700,3000,-12],['hiking','hiking',14,9000,9000,-2],['swimming','swimming',18,2400,1500,0],['rowing','rowing',9,2700,6000,4],
 ['yoga','yoga',16,3300,null,-25],['pilates','pilates',10,3000,null,-20],['elliptical','elliptical',8,2400,null,2],['skiing','skiing',9,14400,24000,-4],
 ['golf','golf',8,14400,null,-22],['racket','tennis',12,4200,null,8],['triathlon','triathlon',8,9000,25000,10],['team_sports','soccer',10,5400,null,9],
 ['climbing','climbing',11,6000,null,-6],['cardio','cardio',9,2400,null,7],['other','unmapped_sport',8,3600,null,-8]
];
const total=SPORTS.reduce((n,s)=>n+s[2],0),weights=[7,8,10,12,18,22,14,16,15,12,9,7],w=weights.reduce((a,b)=>a+b,0);
const monthly=weights.map(x=>Math.floor(x/w*total));monthly[5]+=total-monthly.reduce((a,b)=>a+b,0);
// a deterministic shuffle so sports spread through the year
const sports=SPORTS.flatMap(s=>Array.from({length:s[2]},()=>s)).map((s,i)=>({s,i})).sort((a,b)=>(a.i*61%331)-(b.i*61%331)||a.i-b.i);
const activities=[];let index=0;
for(const [month,count] of monthly.entries())for(let n=0;n<count;n++){
 const [sport,type,,dur,dist,hr]=sports[index].s,day=1+Math.floor(n*27/count),k=index;
 activities.push({id:`fictional-${++index}`,utc:Date.UTC(2025,month,day,6+n%4),type,parentId:null,sport,duration:dur+(k%5)*120,
  distance:dist===null?null:dist+(k%9)*dist*.12,averageHR:Math.round(128+hr+6*Math.sin(month*Math.PI/6)+k%6),maxHR:160+k%29});
}
// Each sport gets one clear favourite weekday: move one session onto the leading day when two days tie.
for(const [sport] of SPORTS){
 const mine=activities.filter(a=>a.sport===sport),days=d=>new Date(d.utc).getUTCDay(),count=()=>{const c=Array(7).fill(0);mine.forEach(a=>c[days(a)]++);return c;};
 let c=count(),max=Math.max(...c);
 if(c.filter(v=>v===max).length>1){const top=c.indexOf(max),mover=mine.find(a=>days(a)!==top&&c[days(a)]===max)||mine.find(a=>days(a)!==top);mover.utc+=((top-days(mover)+7)%7)*86400000;if(new Date(mover.utc).getUTCFullYear()!==2025)mover.utc-=7*86400000;}
}
for(const a of activities)delete a.sport;
const daily=Array.from({length:330},(_,i)=>({date:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10),steps:7000+i*17%15*500,floors:4+i*7%11,restingHR:Math.round(54-5*Math.sin(i/330*Math.PI)+i%5)}));
const sleep=daily.map((d,i)=>({date:d.date,seconds:25200+i%7*600}));
const hrv=daily.map((d,i)=>({date:d.date,hrv:Math.round(45+12*Math.sin(i/330*Math.PI)+i%9)}));
const plan=buildRecap({year:2025,timeZone:'Europe/Brussels',activities,daily,sleep,hrv,indexComplete:true,includeHealth:true});
const chapters=plan.chapters.map(ch=>({...ch,stories:ch.stories.map(s=>({...s,evidence:[`fictional://${s.id}`]}))}));
export const dataset={...plan,exampleOnly:true,notice:'Fictional data · design preview',chapters,stories:chapters.flatMap(ch=>ch.stories.map(s=>({...s,chapterId:ch.chapterId})))};
