// Presentation mapping: an admitted story's display fields -> a "one dot per activity" card spec.
// Reads only what the story already displays (value, unit, caption, chart items). It never
// calculates a metric: counts quoted in a caption are read back from that caption, and a card
// that cannot read a number it needs falls back to a guide-only drawing with no dot legend.
import {autoUnit,fmt,hourText,distUnit,topUnit,kmText,stepUnit,activityUnit,MOTIF,FLOW_SPORTS,shapeCapacity,fracDots,shapeHasCenterLabel} from './dot-engine.mjs';
import {SESSIONS} from './dot-shapes.mjs';
import {healthMonthExtremes} from './story-model.mjs';
import {formatNumber} from './measurement-format.mjs';

//  key: chapter label, plural, accent
export const SPORTS={
 running:['RUNNING','runs','#FFB35C'],cycling:['CYCLING','rides','#6FA8FF'],hiit:['HIIT','HIIT sessions','#FF7A4D'],
 strength:['STRENGTH','strength sessions','#FF79B0'],walking:['WALKING','walks','#FFD86B'],hiking:['HIKING','hikes','#7FE0A8'],
 swimming:['SWIMMING','swims','#6FD8FF'],rowing:['ROWING','rowing sessions','#8FB8FF'],yoga:['YOGA','yoga practices','#9FF0D8'],
 pilates:['PILATES','Pilates sessions','#C3B2FF'],elliptical:['ELLIPTICAL','elliptical sessions','#FF9A6B'],
 skiing:['SKIING & SNOWBOARDING','snow-sport sessions','#E2F2FF'],golf:['GOLF','golf activities','#C8F56A'],
 racket:['RACKET SPORTS','racket-sport sessions','#E8F56A'],triathlon:['TRIATHLON / MULTISPORT','multisport activities','#FF8C7A'],
 team_sports:['TEAM SPORTS','team-sport activities','#9BE36A'],climbing:['CLIMBING & BOULDERING','climbing sessions','#FFA64D'],
 cardio:['CARDIO & FITNESS','cardio sessions','#FF6B7A'],other:['OTHER ACTIVITIES','other activities','#E3B8FF']
};
export const sportAccent=k=>SPORTS[k]?.[2]||'#E3B8FF';
function shortName(k){const ch=SPORTS[k]?.[0]||'OTHER';return ch.startsWith('TRIATHLON')?'TRIATHLON':ch.replace(' & BOULDERING','').replace(' & SNOWBOARDING','').replace(' & FITNESS','').replace(' ACTIVITIES','');}
const MFULL=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

/* ---------- copy helpers (case and line balance only; the words are the story's) ---------- */
export function sentence(t){
 const s=t.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());
 return s.replace(/\bhiit\b/gi,'HIIT').replace(/\bhrv\b/gi,'HRV').replace(/\bhr\b/gi,'HR').replace(/\bpilates\b/gi,'Pilates').replace(/\bmini watt\b/gi,'MINI WATT');
}
export function split2(t){
 const w=t.split(' ');if(w.length<2)return [t,''];
 let best=1,bd=1e9;
 for(let i=1;i<w.length;i++){const a=w.slice(0,i).join(' ').length,b=w.slice(i).join(' ').length,d=Math.max(a,b)-(/[.,]$/.test(w[i-1])?7:0);if(d<bd){bd=d;best=i;}}
 return [w.slice(0,best).join(' '),w.slice(best).join(' ')];
}
export function single(pl){if(/activities$/.test(pl))return pl.replace(/activities$/,'activity');return pl.replace(/s$/,'');}

/* ---------- reading displayed numbers ---------- */
// "3,465,000" -> 3465000, "52.8" -> 52.8. Anything else (words, units) -> null.
export function readFigure(text){
 if(typeof text!=='string'||!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(text.trim()))return null;
 const n=Number(text.trim().replaceAll(',',''));return Number.isFinite(n)?n:null;
}
const decimalsOf=text=>(String(text).split('.')[1]||'').length;
// A hero can count up only when the formatted end value is exactly the displayed text.
function heroFrom(text){const n=readFigure(text);return n!=null&&fmt(n,decimalsOf(text))===text.trim()?{text,n,dec:decimalsOf(text)}:{text:String(text)};}
// Leading count in a pipeline caption: "330 nights with…", "150 of 150 activities…"
function leadingCount(caption){const m=/^(\d[\d,]*)\b/.exec(caption||'');return m?readFigure(m[1]):null;}
function ofCount(caption){const m=/(?:^|\n)(\d[\d,]*) of (\d[\d,]*) activities/.exec(caption||'');return m?{lit:readFigure(m[1]),total:readFigure(m[2])}:null;}
function minutesOf(text){const m=/^(\d+)h (\d{2})m$/.exec(text||'');return m?Number(m[1])*60+Number(m[2]):null;}

/* Recap-level context taken from other admitted stories' display charts (never from records). */
export function recapContext(stories){
 const mix=stories.find(s=>s.id==='sport-mix'&&s.chart?.kind==='sport-mix')?.chart,summary=stories.find(s=>s.id==='year-summary'&&s.chart?.kind==='summary')?.chart;
 return {total:mix?.total??null,mix:mix?mix.items.map(i=>({key:i.key,label:i.label,value:i.value})):[],summary:summary?summary.items.map(i=>({label:i.label,value:i.value,unit:i.unit})):[]};
}
// Dot colours for the activity globe/ring: one per activity (or unit), grouped by sport.
function activityDots(total,mix){
 const unit=activityUnit(total),cols=[],keys=[];
 if(mix?.length&&mix.reduce((a,m)=>a+m.value,0)===total){for(const m of mix){const k=Math.max(1,Math.round(m.value/unit));for(let j=0;j<k;j++){cols.push(sportAccent(m.key));keys.push(m.key);}}}
 const n=cols.length||Math.max(1,Math.round(total/unit));
 return {n,cols,keys:cols.length?keys:null,unit};
}
const perActivityNote=(dots,unit,extra='')=>unit===1?`${fmt(dots)} ${dots===1?'DOT · ONE ACTIVITY':'DOTS · ONE PER ACTIVITY'}${extra}`:`${fmt(dots)} DOTS · EACH ≈ ${unit} ACTIVITIES${extra}`;

/* ---------- the card spec ---------- */
function seedOf(id){let h=2166136261;for(const ch of String(id))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
function base(story,extra){
 const [t1,t2]=split2(sentence(story.title.join(' ')));
 const [cap1,cap2]=(story.caption||'').split('\n');
 return {id:story.id,seed:seedOf(story.id),grp:'GARMIN WRAPED',right:'GARMIN WRAPED',t1,t2,hero:heroFrom(story.value),unit:String(story.unit||'').toUpperCase(),note:'',health:!!story.health,cap1:cap1||'',cap2:cap2||'',acc:'#FFB35C',...extra};
}
const SUFFIX=/-(sessions|hours|distance|weekday|longest)$/;

// "EACH DOT = 1 HOUR · 60 DOTS PER LAP" -> "1 dot = 1 hour": a short dot key for the bottom of a card.
const keep=w=>w.replace(/\bHIIT\b/i,'HIIT').replace(/\bpilates\b/i,'Pilates');
export function legendFrom(note){
 if(!note)return '';
 const parts=note.split(' · ');let m;
 for(const part of parts){
  if((m=/^EACH (?:BRIGHT )?DOT (=|≈) (.+)$/.exec(part)))return keep(`1 dot ${m[1]} ${m[2].replace(/^ONE /,'1 ').replace(/ WITH SLEEP RECORDED$/,'').toLowerCase()}`);
  if((m=/^EACH (=|≈) (.+)$/.exec(part)))return keep(`1 dot ${m[1]} ${m[2].toLowerCase()}`);
  if((m=/^ONE (?:DOT )?PER (.+)$/.exec(part)))return keep(`1 dot = 1 ${m[1].toLowerCase()}`);
 }
 return '';
}
export function cardSpec(story,context={}){const spec=mapStory(story,context);spec.legend=spec.concept?'Concept · no data dots':legendFrom(spec.note);return spec;}
function mapStory(story,context={}){
 const id=story.sample?story.story:story.id,ctx=context||{},chart=story.chart;
 if(story.libraryOnly&&!story.sample)return conceptSpec(story);
 const m=SUFFIX.exec(id);
 if(m){
  const k=id.slice(0,-m[0].length),sport=SPORTS[k]?k:'other',[ch,plural,acc]=SPORTS[sport],sg=single(plural),kind=m[1],value=readFigure(story.value);
  const g={grp:ch,acc};
  if(kind==='sessions'&&value>0&&SESSIONS[sport]){const u=autoUnit(value,[1,2,5,10,20,50,100],shapeCapacity('sessions',sport));return base(story,{...g,L:'shape',p:{kind:'sessions',k:sport,n:Math.max(1,Math.round(value/u))},note:u===1?'EACH DOT = ONE '+sg.toUpperCase():`EACH DOT ≈ ${u} ${plural.toUpperCase()}`});}
  if(kind==='sessions'&&value>0){const u=activityUnit(value);return base(story,{...g,L:'motif',p:{k:sport,n:Math.max(1,Math.round(value/u))},note:u===1?'EACH BRIGHT DOT = ONE '+sg.toUpperCase():`EACH BRIGHT DOT ≈ ${u} ${plural.toUpperCase()}`});}
  if(kind==='hours'&&value>0){
   const items=chart?.kind==='duration'?chart.items:[],n=(ctx.mix||[]).find(i=>i.key===k)?.value;
   const labels=[items[0]&&{t:items[0].value,s:'RECORDED MINUTES'},items[1]&&{t:items[1].value,s:(n===1?'IN ONE ':'AVG PER ')+(sg.length>12?'SESSION':sg.toUpperCase())}].filter(Boolean);
   const unit=autoUnit(value,[1/6,1,2,5,10,20,50,100,250,500,1000],shapeCapacity('hours',sport)),fd=fracDots(value,unit);
   // stats sit inside shapes with room for them; otherwise they form a row under the unit, like the cover
   const inside=shapeHasCenterLabel('hours',sport);
   return base(story,{...g,L:'shape',p:{kind:'hours',k:sport,n:fd.total,partial:fd.partial,labels:inside?labels:null,unit},note:hourText(unit),...(inside?{}:{row:labels.map(l=>({...heroFrom(l.t),l:l.s})),rowAfterUnit:true})});
  }
  if(kind==='distance'&&value>0&&FLOW_SPORTS.includes(sport))return base(story,{...g,L:'flow',p:{k:sport,km:value},note:'EACH DOT = '+kmText(distUnit(sport,value))});
  if(kind==='weekday'&&chart?.kind==='weekdays'){const total=chart.items.reduce((a,i)=>a+i.value,0),u=autoUnit(Math.max(...chart.items.map(i=>i.value)),[1,2,5,10,20,50,100],300),week=chart.items.map(i=>u===1?i.value:Math.round(i.value/u));return base(story,{...g,L:'week',p:{k:sport,week,n:Math.max(1,Math.round(total/u)),counts:chart.items.map(i=>i.value)},heroColor:acc,heroSmall:story.value.length>8,note:u===1?'EACH DOT = ONE '+sg.toUpperCase():`EACH DOT ≈ ${u} ${plural.toUpperCase()}`});}
  if(kind==='longest'&&chart?.kind==='record'){const values=chart.items.map(i=>i.value);return base(story,{...g,L:'top3',p:{k:sport,values},note:'EACH DOT = '+kmText(topUnit(values[0]))});}
  return base(story,{...g,L:'concept',p:{k:sport}});
 }
 switch(id){
  case 'cover':{
   const total=ctx.total??leadingCount(story.caption);
   const row=['ACTIVITIES','ACTIVE DAYS'].map(l=>ctx.summary?.find(i=>i.label===l)).filter(Boolean).map(i=>({...heroFrom(i.value),l:i.label}));
   if(!total)return base(story,{grp:'YEAR OVERVIEW',hero:{text:story.value},L:'concept',p:{k:'other'}});
   const d=activityDots(total,ctx.mix);
   return base(story,{grp:'YEAR OVERVIEW',hero:{text:story.value},L:'sphere',p:{n:d.n,cols:d.cols,keys:d.keys,cy:402,R:127},note:perActivityNote(d.n,d.unit),row,rowTop:536});
  }
  case 'year-summary':{
   const total=readFigure(story.value),d=total?activityDots(total,ctx.mix):null;
   const grid=chart?.kind==='summary'?chart.items.map(i=>({...heroFrom(i.value),l:i.label,s:i.unit})):[];
   return base(story,{grp:'YEAR OVERVIEW',acc:'#6FA8FF',heroMax:92,...(d?{L:'ring',p:{n:d.n,cols:d.cols,keys:d.keys},note:perActivityNote(d.n,d.unit)}:{L:'concept',p:{k:'other'}}),grid,gridTop:424});
  }
  case 'sport-mix':{
   if(chart?.kind!=='sport-mix')break;
   const unit=activityUnit(chart.total),items=chart.items.map(i=>({key:i.key,short:shortName(i.key),n:i.value,dots:Math.max(1,Math.round(i.value/unit)),acc:sportAccent(i.key)}));
   return base(story,{grp:'YEAR OVERVIEW',acc:items[0].acc,heroSmall:true,L:'mix',p:{items,unit},note:(unit===1?'EACH DOT = ONE ACTIVITY':`EACH DOT ≈ ${unit} ACTIVITIES`)+' · EACH WEDGE = ONE SPORT'});
  }
  case 'year-calendar':{
   if(chart?.kind!=='months')break;
   const minutes=chart.measure==='minutes',items=chart.items.map(i=>({label:i.label,state:i.state,v:i.value==null?null:minutes?i.value/60:i.value}));
   const maxV=Math.max(0,...items.map(i=>i.v??0)),unit=autoUnit(Math.max(maxV,1),[1,2,5,10],56);
   // Busiest = highest completed month, exactly as the chart description compares them; ties stay ties.
   // The busiest month may be the one in progress: it is then labelled BUSIEST · SO FAR.
   const completed=chart.compare?items.map((i,ix)=>({...i,ix})).filter(i=>['complete','current'].includes(i.state)&&i.v!=null):[];
   const peak=completed.length?Math.max(...completed.map(i=>i.v)):null,leaders=completed.filter(i=>i.v===peak);
   const best=leaders.length===1&&peak>0?leaders[0].ix:-1,cur=items.findIndex(i=>i.state==='current');
   const unitNote=minutes?hourText(unit):unit===1?'EACH DOT = 1 ACTIVITY':`EACH DOT = ${unit} ACTIVITIES`;
   const hero=best>=0?{hero:{text:MFULL[best]},heroColor:'#FFB35C',heroSmall:true,unit:`YOUR BUSIEST MONTH${best===cur?' SO FAR':''} · ${minutes?fmt(peak,1)+' HOURS':fmt(peak)+(peak===1?' ACTIVITY':' ACTIVITIES')}`}:{};
   return base(story,{grp:'YEAR OVERVIEW',L:'months',p:{items,unit,best,cur,measure:chart.measure,ties:leaders.length>1?leaders.map(i=>i.ix):[]},note:unitNote+' · ONE COLUMN PER MONTH',...hero});
  }
  case 'steps-total':{const steps=readFigure(story.value);if(!steps)break;return base(story,{grp:'EVERYDAY MOVEMENT',acc:'#FFE2B8',L:'galaxy',p:{steps},note:'EACH DOT ≈ '+fmt(stepUnit(steps))+' STEPS'});}
  case 'steps-peak':{const peak=readFigure(story.value);if(!peak)break;return base(story,{grp:'EVERYDAY MOVEMENT',acc:'#FFD86B',L:'stairs',p:{peak},note:'EACH DOT = 1,000 STEPS'});}
  case 'floors-total':{
   const floors=readFigure(story.value);if(!floors)break;
   const unit=autoUnit(floors,[1,2,5,10,25,50,100,250],shapeCapacity('floors','stairwell')),fd=fracDots(floors,unit);
   return base(story,{grp:'EVERYDAY MOVEMENT',acc:'#9BD8FF',L:'shape',p:{kind:'floors',k:'stairwell',n:fd.total,partial:fd.partial},note:unit===1?'EACH DOT = ONE FLOOR':`EACH DOT = ${unit} FLOORS`});
  }
  case 'sleep-median':{
   const nights=leadingCount(story.caption),mins=minutesOf(story.value);
   return base(story,{grp:'SLEEP',acc:'#FFF1D6',hero:mins!=null?{text:story.value,mins}:{text:story.value},L:'moon',p:{nights:nights||0},note:nights?'EACH DOT = ONE NIGHT WITH SLEEP RECORDED':''});
  }
  case 'max-hr':{
   const c=ofCount(story.caption);if(!c)return base(story,{grp:'HEART AND EFFORT',acc:'#FF6B7A',L:'concept',p:{k:'cardio',base:'heart'}});
   const unit=activityUnit(c.total),total=Math.max(1,Math.round(c.total/unit)),lit=Math.round(c.lit/unit);
   return base(story,{grp:'HEART AND EFFORT',acc:'#FF6B7A',L:'heart',p:{total,lit},note:perActivityNote(total,unit,' · LIT = HAS A PEAK')});
  }
  case 'activity-hr':{
   const c=ofCount(story.caption),bpm=readFigure(story.value);if(!c||!bpm)return base(story,{grp:'HEART AND EFFORT',acc:'#FF8FA8',L:'concept',p:{k:'cardio',base:'heart'}});
   const unit=activityUnit(c.total),total=Math.max(1,Math.round(c.total/unit)),lit=Math.round(c.lit/unit);
   return base(story,{grp:'HEART AND EFFORT',acc:'#FF8FA8',L:'pulseRing',p:{total,lit,bpm},note:(unit===1?'ONE DOT PER ACTIVITY':`EACH DOT ≈ ${unit} ACTIVITIES`)+' · BEATING AT '+Math.round(bpm)+' BPM'});
  }
  case 'resting-hr':{
   const days=leadingCount(story.caption),bpm=readFigure(story.value);if(!days||!bpm)break;
   return base(story,{grp:'HEART AND EFFORT',acc:'#5FE0C4',L:'breath',p:{days,bpm},note:fmt(days)+' DOTS · ONE PER RECORDED DAY · BEATING AT '+Math.round(bpm)+' BPM'});
  }
  case 'hrv-median':{
   const nights=leadingCount(story.caption);if(!nights)break;
   return base(story,{grp:'HEART AND EFFORT',acc:'#B9A7FF',L:'wave',p:{nights},note:fmt(nights)+' DOTS · ONE PER RECORDED NIGHT'});
  }
  case 'activity-hr-monthly':case 'resting-hr-monthly':case 'hrv-monthly':{
   if(chart?.kind!=='health-months'||!chart.items.some(i=>i.value!=null))break;
   const color={'activity-hr-monthly':'#FF9AAE','resting-hr-monthly':'#5FE0C4','hrv-monthly':'#B9A7FF'}[id],ex=healthMonthExtremes(chart);
   const high=ex&&ex.high!==ex.low?ex.highest.map(i=>chart.items.indexOf(i)):[],low=ex&&ex.high!==ex.low?ex.lowest.map(i=>chart.items.indexOf(i)):[];
   return base(story,{grp:'HEART AND EFFORT',acc:color,heroColor:color,heroSmall:true,hero:{text:sentence(story.value)},L:'monthLine',p:{values:chart.items.map(i=>i.value),labels:chart.items.map(i=>i.label.slice(0,1)),color,format:formatNumber,high,low},note:'ONE DOT PER MONTH · HEIGHT = MONTHLY '+(id==='hrv-monthly'?'MEDIAN':'AVERAGE')});
  }
  case 'finale':{
   const total=ctx.total??leadingCount(story.caption),grid=chart?.kind==='summary'?chart.items.map(i=>({...heroFrom(i.value),l:i.label})):[];
   const bare={bare:true,lift:24,brand:'GARMIN WRAPED · A MINI WATT PRODUCT'};
   if(!total)return base(story,{grp:'FINALE',hero:{text:story.value},L:'concept',p:{k:'other'},grid,gridTop:466,gridSmall:true,share:true,...bare});
   const d=activityDots(total,ctx.mix);
   return base(story,{grp:'FINALE',hero:{text:story.value},heroMax:96,L:'sphere',p:{n:d.n,cols:d.cols,keys:d.keys,cy:350,R:100},note:perActivityNote(d.n,d.unit),grid,gridTop:466,gridSmall:true,share:true,...bare});
  }
  case 'mini-watt':
   return base(story,{grp:'MINI WATT',right:'PROMOTION · NOT A DATA CARD',heroColor:'#FFB35C',heroSmall:true,L:'road',p:{},cta:true,promo:true});
 }
 // A story this mapping does not know yet: its own words over a guide-only drawing.
 return base(story,{L:'concept',p:{k:'other'}});
}

/* Design-library concepts carry no metric: guide dots only, no dot legend. */
const CONCEPT_BASE={heart:'heart',hrv:'heart',sleep:'moon',recovery:'moon',energy:'moon'};
export function conceptSpec(story){
 const k=MOTIF[story.template]?story.template:'other';
 const [t1,t2]=split2(sentence(story.title.join(' ')));const [cap1,cap2]=(story.caption||'').split('\n');
 return {id:story.id,seed:seedOf(story.id),concept:true,grp:String(story.group||'DESIGN LIBRARY').toUpperCase(),right:'DESIGN LIBRARY',t1,t2,hero:{text:story.value||'—'},heroSmall:true,heroColor:'#6C7BA0',unit:String(story.unit||'').toUpperCase(),note:'CONCEPT · NO DATA DOTS',health:false,cap1:cap1||'',cap2:cap2||'',acc:SPORTS[k]?.[2]||'#6C7BA0',L:'concept',p:{k,base:CONCEPT_BASE[story.template]}};
}
