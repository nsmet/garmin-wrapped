// EXPLICITLY FICTIONAL sample years from the dot design (a busy 572-activity year and a
// low-count year with 1–3 sessions per sport). They exist only as design-library previews,
// shaped like display stories so they render through the same card mapping as a recap.
// They never enter a recap, are never admitted by selectStories, and carry no evidence.
import {formatNumber as fmtN,formatDecimal as fmtD,formatActivityTime} from './measurement-format.mjs';

const META=[
 ['running','runs','running','RUNNING',['RUNS, ON REPEAT.','HOURS IN YOUR STRIDE.','A YEAR, ON FOOT.','YOUR RUNNING DAY.','YOUR LONGEST RUN.']],
 ['cycling','rides','cycling','CYCLING',['BACK IN THE SADDLE.','HOURS IN THE SADDLE.','THE KILOMETRES ROLLED.','YOUR RIDE DAY.','YOUR LONGEST RIDE.']],
 ['hiit','HIIT sessions','HIIT','HIIT',['INTERVALS. ON REPEAT.','THE INTERVAL HOURS.',null,'YOUR HIIT DAY.',null]],
 ['strength','strength sessions','strength training','STRENGTH TRAINING',['A YEAR UNDER LOAD.','HOURS ON THE TRAINING FLOOR.',null,'YOUR LIFTING DAY.',null]],
 ['walking','walks','walking','WALKING',['WALKS WORTH COUNTING.','TIME ON YOUR FEET.','YOUR WALKING FOOTPRINT.','YOUR WALKING DAY.','YOUR LONGEST WALK.']],
 ['hiking','hikes','hiking','HIKING',['THE HIKING CHAPTER.','HOURS ON THE TRAIL.','THE TRAIL ADDS UP.','YOUR HIKING DAY.','YOUR LONGEST HIKE.']],
 ['swimming','swims','swimming','SWIMMING',['BACK TO THE WATER.','HOURS IN THE WATER.','YOUR YEAR IN THE WATER.','YOUR SWIMMING DAY.','YOUR LONGEST SWIM.']],
 ['rowing','rowing sessions','rowing','ROWING',['RETURN TO THE ROW.','HOURS AT THE OARS.','THE ROWING DISTANCE.','YOUR ROWING DAY.','YOUR LONGEST ROW.']],
 ['yoga','yoga practices','yoga','YOGA',['ROOM FOR THE MAT.','HOURS ON THE MAT.',null,'YOUR YOGA DAY.',null]],
 ['pilates','Pilates sessions','pilates','PILATES',['PILATES IN PRACTICE.','HOURS OF PILATES.',null,'YOUR PILATES DAY.',null]],
 ['elliptical','elliptical sessions','elliptical','ELLIPTICAL',['ANOTHER TURN.','HOURS IN THE ELLIPSE.',null,'YOUR ELLIPTICAL DAY.',null]],
 ['skiing','snow-sport sessions','skiing & snowboarding','SKIING & SNOWBOARDING',['A SEASON ON SNOW.','HOURS ON SNOW.','DISTANCE ON SNOW.','YOUR SNOW DAY.','YOUR LONGEST SNOW SESSION.']],
 ['golf','golf activities','golf','GOLF',['ROUNDS ON RECORD.','HOURS ON THE COURSE.',null,'YOUR GOLF DAY.',null]],
 ['racket','racket-sport sessions','racket sports','RACKET SPORTS',['BACK ON COURT.','HOURS ON COURT.',null,'YOUR COURT DAY.',null]],
 ['triathlon','multisport activities','triathlon / multisport','TRIATHLON / MULTISPORT',['MORE THAN ONE DISCIPLINE.','HOURS ACROSS DISCIPLINES.','YOUR MULTISPORT DISTANCE.','YOUR MULTISPORT DAY.','YOUR LONGEST MULTISPORT ACTIVITY.']],
 ['team_sports','team-sport activities','team sports','TEAM SPORTS',['PART OF THE TEAM.','HOURS IN THE GAME.',null,'YOUR TEAM-SPORT DAY.',null]],
 ['climbing','climbing sessions','climbing & bouldering','CLIMBING & BOULDERING',['BACK TO THE WALL.','HOURS AT THE WALL.',null,'YOUR CLIMBING DAY.',null]],
 ['cardio','cardio sessions','cardio & fitness','CARDIO & FITNESS',['CARDIO ON THE CALENDAR.','HOURS OF CARDIO.',null,'YOUR CARDIO DAY.',null]],
 ['other','other activities','other activities','OTHER ACTIVITIES',['THE REST OF YOUR REPERTOIRE.','HOURS BEYOND THE USUAL.',null,'YOUR ACTIVITY DAY.',null]]
];
const LABEL={running:'Running',cycling:'Cycling',hiit:'HIIT',strength:'Strength training',walking:'Walking',hiking:'Hiking',swimming:'Swimming',rowing:'Rowing',yoga:'Yoga',pilates:'Pilates',elliptical:'Elliptical',skiing:'Skiing & snowboarding',golf:'Golf',racket:'Racket sports',triathlon:'Triathlon / multisport',team_sports:'Team sports',climbing:'Climbing & bouldering',cardio:'Cardio & fitness',other:'Other activities'};
//  n, hours, km, week Mon..Sun, top distances (all fictional)
const NUM={
 full:{running:[126,112.4,1248.0,[14,22,12,25,9,16,28],[32.7,25.1,21.3]],cycling:[88,191.2,5312.4,[6,10,8,9,5,31,19],[184.2,162.0,141.7]],hiit:[24,14.8,null,[5,3,8,2,4,1,1]],strength:[48,32.1,null,[12,6,11,5,9,3,2]],walking:[61,41.5,238.6,[7,9,6,8,10,12,9],[18.4,15.2,12.9]],hiking:[31,74.3,236.2,[1,0,2,1,3,9,15],[24.6,21.8,19.3]],swimming:[30,19.4,86.0,[3,8,2,9,4,3,1],[3.8,3.2,3.0]],rowing:[12,9.6,98.4,[2,1,3,1,2,2,1],[14.2,12.0,10.6]],yoga:[22,18.3,null,[3,2,4,2,1,4,6]],pilates:[14,11.7,null,[1,5,1,4,1,1,1]],elliptical:[9,6.2,null,[3,1,2,1,1,0,1]],skiing:[11,38.6,412.8,[1,1,1,1,1,4,2],[62.4,55.1,48.0]],golf:[10,41.0,null,[0,0,1,0,2,5,2]],racket:[18,22.5,null,[1,6,1,7,1,1,1]],triathlon:[9,26.4,412.5,[0,0,0,0,0,2,7],[113.0,52.4,51.5]],team_sports:[16,24.0,null,[1,2,1,9,1,1,1]],climbing:[20,31.2,null,[2,7,2,5,2,1,1]],cardio:[15,11.1,null,[2,2,6,2,1,1,1]],other:[8,5.3,null,[1,1,1,1,1,3,0]]},
 light:{running:[3,2.6,21.4,[0,1,0,0,0,0,2],[9.8,6.4,5.2]],cycling:[2,3.4,71.6,[0,0,0,0,0,2,0],[41.3,30.3]],hiit:[2,0.9,null,[0,2,0,0,0,0,0]],strength:[1,0.7,null,[0,0,0,1,0,0,0]],walking:[3,2.1,9.6,[0,0,1,0,0,2,0],[4.1,3.2,2.3]],hiking:[1,3.8,12.4,[0,0,0,0,0,0,1],[12.4]],swimming:[2,1.3,3.1,[0,2,0,0,0,0,0],[1.6,1.5]],rowing:[1,0.5,5.2,[0,0,1,0,0,0,0],[5.2]],yoga:[3,2.5,null,[1,0,0,0,0,0,2]],pilates:[2,1.6,null,[0,0,0,2,0,0,0]],elliptical:[1,0.6,null,[0,0,0,0,1,0,0]],skiing:[2,9.1,64.0,[0,0,0,0,0,2,0],[35.2,28.8]],golf:[1,4.2,null,[0,0,0,0,0,1,0]],racket:[3,3.1,null,[0,2,0,1,0,0,0]],triathlon:[1,2.9,51.5,[0,0,0,0,0,0,1],[51.5]],team_sports:[2,2.8,null,[0,0,0,2,0,0,0]],climbing:[3,4.4,null,[0,2,0,1,0,0,0]],cardio:[2,1.1,null,[0,0,2,0,0,0,0]],other:[1,0.8,null,[0,0,0,0,0,1,0]]}
};
const DATA={
 full:{total:572,days:248,minutes:43896,families:19,months:[3120,3480,4210,4630,5480,5120,6050,5560,4020,2226,null,null],steps:2847320,stepDays:300,stepPeak:31204,sleep:'7h 18m',sleepNights:298,maxHr:191,avgHr:138.4,hrUsable:548,
  hrMonthly:[141.2,139.8,138.5,137.9,140.6,136.4,135.1,137.2,139.0,138.1,null,null],rest:52,restDays:300,restMonthly:[54,53,53,52,51,51,50,51,52,52,null,null],hrv:61.5,hrvNights:296,hrvMonthly:[58.5,60.0,61.5,62.0,63.5,64.0,65.5,null,62.5,61.0,null,null]},
 light:{total:9,days:9,minutes:528,families:4,months:[null,null,null,null,null,null,null,62,190,276,null,null],steps:412300,stepDays:61,stepPeak:18940,sleep:'7h 32m',sleepNights:58,maxHr:184,avgHr:142.6,hrUsable:8,
  hrMonthly:[null,null,null,null,null,null,null,144.0,141.9,142.4,null,null],rest:58,restDays:61,restMonthly:[null,null,null,null,null,null,null,59,58,57,null,null],hrv:48.2,hrvNights:55,hrvMonthly:[null,null,null,null,null,null,null,47.0,48.5,49.1,null,null],only:['running','walking','cycling','strength']}
};
const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],CUR=9;
const wrapTitle=t=>{const lines=[];let line='';for(const w of t.split(' ')){if(line&&(line+' '+w).length>18){lines.push(line);line=w;}else line=(line+' '+w).trim();}if(line)lines.push(line);return lines;};
const word=(n,pl)=>n===1?(pl.endsWith('activities')?pl.replace(/activities$/,'activity'):pl.replace(/s$/,'')):pl;
const state=i=>i<CUR?'complete':i===CUR?'current':'future';

export const SAMPLE_GROUPS={full:'Dot design · busy sample year',light:'Dot design · low-count sample year'};
export function sampleStories(profile){
 const D=DATA[profile],q=' · so far',stories=[],fam=D.families===1?'one sport family':D.families+' sport families';
 const sports=META.filter(m=>!D.only||D.only.includes(m[0])).map(m=>({m,v:NUM[profile][m[0]]})).sort((a,b)=>b.v[0]-a.v[0]);
 let card=0;const add=(s)=>{card++;stories.push({libraryOnly:true,sample:profile,status:'template',sharePolicy:'template_only',group:SAMPLE_GROUPS[profile],family:'card '+String(card).padStart(3,'0'),eligibility:'Fictional sample data from the dot design. Not a recap result.',claimGuard:'Design preview only.',...s,id:`sample-${profile}-${s.id}`,story:s.id});};
 const summary=[{label:'ACTIVITIES',value:fmtN(D.total),unit:'recorded sessions'},{label:'MINUTES',value:fmtN(D.minutes),unit:fmtD(D.minutes/60)+' recorded hours'},{label:'ACTIVE DAYS',value:fmtN(D.days),unit:'days with an activity'},{label:'SPORTS',value:fmtN(D.families),unit:'recorded activity families'}];
 add({id:'cover',template:'cover',title:['YOUR YEAR','IN MOTION.'],value:'2026',unit:'YOUR RECORDED EFFORT',caption:`${D.total} activities. ${D.days} active days${q}.\nThe numbers. The sports. The standout moments.`});
 add({id:'year-summary',template:'summary',title:['THE WHOLE','YEAR, IN VIEW.'],value:String(D.total),unit:'RECORDED ACTIVITIES'+q,caption:`${D.days} days with recorded activity${q}.\n${fmtN(D.minutes)} recorded minutes across ${fam}.`,chart:{kind:'summary',items:summary}});
 add({id:'sport-mix',template:'mix',title:['YOUR YEAR.','YOUR SPORTS.'],value:String(D.total),unit:'ACTIVITIES BY SPORT'+q,caption:`${LABEL[sports[0].m[0]]}: ${sports[0].v[0]} recorded activities.\nEach slice counts activities, not time.`,chart:{kind:'sport-mix',total:D.total,items:sports.map(s=>({key:s.m[0],label:LABEL[s.m[0]],value:s.v[0]}))}});
 add({id:'year-calendar',template:'heatmap',title:['EVERY MONTH,','A DIFFERENT PACE.'],value:'2026',unit:'MONTHLY RECORDED MINUTES'+q,caption:'Recorded minutes. Darker means more.\nPeak and quietest compare completed months only.',chart:{kind:'months',measure:'minutes',compare:true,items:D.months.map((v,i)=>({label:MONTHS[i],state:state(i),sessions:v==null?null:1,value:v}))}});
 for(const {m:[k,plural,hlab,dlab,titles],v:[n,h,km,week,top]} of META.map(m=>({m,v:NUM[profile][m[0]]}))){
  const one=n===1,tpl=k==='other'?'cardio':k;
  add({id:`${k}-sessions`,template:tpl,title:wrapTitle(titles[0]),value:String(n),unit:'RECORDED '+word(n,plural).toUpperCase()+q,caption:`${n} ${word(n,plural)} in your recorded year${q}.\n${fmtN(n/D.total*100)}% of all recorded activities.`});
  add({id:`${k}-hours`,template:tpl,title:wrapTitle(titles[1]),value:fmtD(h),unit:'RECORDED HOURS'+q,caption:`${fmtN(h*60)} recorded minutes of ${hlab}.\n${one?'All of it in one '+word(1,plural)+'.':formatActivityTime(h*3600/n)+' per activity, on average.'}`,chart:{kind:'duration',items:[{label:'RECORDED MINUTES',value:fmtN(h*60)},{label:'AVG TIME / ACTIVITY',value:formatActivityTime(h*3600/n)}]}});
  if(titles[2])add({id:`${k}-distance`,template:tpl,title:wrapTitle(titles[2]),value:fmtD(km),unit:'RECORDED KILOMETRES'+q,caption:`${one?'All in one '+word(1,plural)+'.':fmtD(km/n)+' km per '+word(1,plural)+', on average.'}\nTotal distance across ${n} recorded ${one?'activity':'activities'}.`});
  const M=Math.max(...week),di=week.indexOf(M);
  add({id:`${k}-weekday`,template:tpl,title:wrapTitle(titles[3]),value:DAYS[di].toUpperCase(),unit:'MOST RECORDED '+dlab+' DAY'+q,caption:`${one?'Your only '+word(1,plural)+' fell on a '+DAYS[di]+'.':M+' of '+n+' '+plural+' fell on '+DAYS[di]+'.'}`,chart:{kind:'weekdays',items:DAYS.map((label,i)=>({label,value:week[i]}))}});
  if(titles[4]&&top){const t3=top.slice(0,Math.min(3,n));add({id:`${k}-longest`,template:tpl,title:wrapTitle(titles[4]),value:fmtD(t3[0]),unit:'KM · LONGEST RECORDED'+q,caption:`${one?'Your one recorded '+word(1,plural)+'.':'The longest distance among '+n+' recorded '+plural+'.'}\n${t3.length===1?'One distance, in dots.':'Your '+(t3.length===2?'two':'three')+' longest distances, side by side.'}`,chart:{kind:'record',items:t3.map((value,i)=>({label:String(i+1).padStart(2,'0'),value}))}});}
 }
 add({id:'steps-total',template:'walking',title:['SMALL STEPS.','BIG PICTURE.'],value:fmtN(D.steps),unit:'STEPS · '+D.stepDays+' RECORDED DAYS',caption:'Steps from recorded days only.\nMissing days are never zero.'});
 add({id:'steps-peak',template:'active',title:['YOUR BIGGEST','RECORDED STEP DAY.'],value:fmtN(D.stepPeak),unit:'STEPS IN ONE RECORDED DAY',caption:`${D.stepDays} days with step records.\nDaily dates follow Garmin.`});
 add({id:'sleep-median',template:'sleep',health:true,title:['OFF THE','CLOCK.'],value:D.sleep,unit:'MEDIAN RECORDED SLEEP',caption:`${D.sleepNights} nights with sleep records.\nNo sleep is inferred for missing nights.`});
 add({id:'max-hr',template:'heart',health:true,title:['YOUR HIGHEST','RECORDED HR.'],value:fmtN(D.maxHr),unit:'BPM · ACTIVITY PEAK'+q,caption:`Highest reported peak across your imported activities.\n${D.hrUsable} of ${D.total} activities include a usable maximum.`});
 add({id:'activity-hr',template:'heart',health:true,title:['YOUR HEART','AT WORK.'],value:fmtN(D.avgHr),unit:'BPM · AVERAGE ACTIVITY HEART RATE'+q,caption:`${D.hrUsable} of ${D.total} activities have heart-rate averages.\nEach activity counts once, regardless of duration.`});
 const hm=(vals,measure,count)=>({kind:'health-months',measure,compare:measure!=='hrv',items:vals.map((value,i)=>({label:MONTHS[i],state:state(i),count:value==null?0:count,value}))});
 add({id:'activity-hr-monthly',template:'heart',health:true,title:['YOUR HEART RATE,','MONTH BY MONTH.'],value:'MONTHLY AVERAGES',unit:'BPM · ACTIVITY HEART RATE',caption:'Average of recorded activity averages in each month.\nHigh and low compare the months shown.',chart:hm(D.hrMonthly,'activityHR',12)});
 add({id:'resting-hr',template:'heart',health:true,title:['YOUR RESTING','HEART RATE.'],value:fmtN(D.rest),unit:'BPM · AVERAGE RESTING HEART RATE',caption:`${D.restDays} days with Garmin resting-heart-rate records.\nAverage across recorded days only.`});
 add({id:'resting-hr-monthly',template:'heart',health:true,title:['RESTING HR,','MONTH BY MONTH.'],value:'MONTHLY AVERAGES',unit:'BPM · RESTING HEART RATE',caption:'Monthly averages, with at least 10 recorded days per point.\nHigh and low compare the months shown.',chart:hm(D.restMonthly,'restingHR',28)});
 add({id:'hrv-median',template:'hrv',health:true,title:['YOUR OVERNIGHT','HRV.'],value:fmtN(D.hrv),unit:'MS · MEDIAN OVERNIGHT HRV',caption:`${D.hrvNights} nights with recorded overnight HRV averages.\nMedian across recorded nights only.`});
 add({id:'hrv-monthly',template:'hrv',health:true,title:['HRV THROUGH','THE YEAR.'],value:'MONTHLY MEDIANS',unit:'MS · OVERNIGHT HRV',caption:'Monthly medians, with at least 10 recorded nights per point.\nGaps show months without enough measurements.',chart:hm(D.hrvMonthly,'hrv',28)});
 {const km=sports.reduce((a,s)=>a+(s.v[2]||0),0),items=km>0?[summary[0],{label:'KILOMETRES',value:km>=10?fmtN(Math.round(km)):fmtD(km),unit:'recorded distance'},...summary.slice(1)]:summary;
  add({id:'finale',template:'finale',title:['THAT’S YOUR','TRACK RECORD.'],value:'2026',unit:'YOUR RECORDED YEAR'+q,caption:'',chart:{kind:'summary',items}});}
 add({id:'mini-watt',template:'miniwatt',promotionPreview:true,title:['KEEP RIDING','INDOORS.'],value:'MINI WATT',unit:'YOUR NEXT RIDE STARTS HERE',caption:'Put your bike on a smart trainer.\nMINI WATT gives you structured workouts and real routes to ride.'});
 return stories;
}
// The recap context a sample year's cards read (same shape as recapContext()).
export function sampleContext(profile){const s=sampleStories(profile),mix=s.find(x=>x.story==='sport-mix').chart,sum=s.find(x=>x.story==='year-summary').chart;return {total:mix.total,mix:mix.items,summary:sum.items};}
