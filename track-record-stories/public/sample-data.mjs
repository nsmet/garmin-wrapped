// Purpose-built FICTIONAL records. Every demo chart and story uses this one fixture.
// These are not Garmin responses or the owner's activity history.
import {buildRecap} from './metrics.mjs';
const counts=[['hiit',68],['running',52],['cycling',17],['strength',13]];
const sports=counts.flatMap(([sport,count])=>Array.from({length:count},()=>sport)).map((sport,i)=>({sport,i})).sort((a,b)=>(a.i*61%151)-(b.i*61%151));
const monthly=[7,8,10,12,18,22,14,16,15,12,9,7],activities=[];
let index=0;
for(const [month,count] of monthly.entries())for(let n=0;n<count;n++){
 const {sport}=sports[index],day=1+Math.floor(n*.75)%27,duration={hiit:2100,running:2700,cycling:5400,strength:2400}[sport]+(index%5)*120;
 activities.push({id:`fictional-${++index}`,utc:Date.UTC(2025,month,day,6+n%4),type:sport,parentId:null,duration,distance:sport==='running'?5000+index%9*1200:sport==='cycling'?18000+index%8*7500:null,averageHR:Math.round(128+{hiit:12,running:6,cycling:1,strength:-5}[sport]+6*Math.sin(month*Math.PI/6)+index%6),maxHR:160+index%29});
}
const daily=Array.from({length:330},(_,i)=>({date:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10),steps:7000+i*17%15*500,restingHR:Math.round(54-5*Math.sin(i/330*Math.PI)+i%5)}));
const sleep=daily.map((d,i)=>({date:d.date,seconds:25200+i%7*600}));
const hrv=daily.map((d,i)=>({date:d.date,hrv:Math.round(45+12*Math.sin(i/330*Math.PI)+i%9)}));
const plan=buildRecap({year:2025,timeZone:'Europe/Brussels',activities,daily,sleep,hrv,indexComplete:true,includeHealth:true});
const chapters=plan.chapters.map(ch=>({...ch,stories:ch.stories.map(s=>({...s,evidence:[`fictional://${s.id}`]}))}));
export const dataset={...plan,exampleOnly:true,notice:'Fictional data · design preview',chapters,stories:chapters.flatMap(ch=>ch.stories.map(s=>({...s,chapterId:ch.chapterId})))};
