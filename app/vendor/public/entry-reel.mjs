// The connect screen's reel: the real card visuals from the recap play one after another
// (running track → bike wheel → swim → climbing wall → mountain → moon → heart → HRV wave)
// and the same pool of dots flows from one shape into the next. Fictional sample year only.
// entry-field.js owns the canvas and timing; this module supplies the shapes.
import {build,place,artBounds,clamp,ease} from './dot-engine.mjs';
import {cardSpec} from './dot-spec.mjs';
import {sampleStories,sampleContext} from './dot-samples.mjs';

export const REEL=[
 ['running-sessions','Running · one dot per run'],
 ['cycling-sessions','Cycling · one dot per ride'],
 ['swimming-sessions','Swimming · one dot per swim'],
 ['climbing-sessions','Climbing · one dot per session'],
 ['hiking-sessions','Hiking · one dot per hike'],
 ['sleep-median','Sleep · one dot per night'],
 ['max-hr','Heart rate · one dot per activity'],
 ['hrv-median','Recovery · one dot per night']
];
const HOLD=3.6,MORPH=1.5,STEP=HOLD+MORPH,INTRO=1.6;

export function createReel({seq=REEL,onStep}={}){
 const stories=sampleStories('full'),ctx=sampleContext('full');
 const steps=seq.map(([id,label])=>{
  const story=stories.find(s=>s.story===id);if(!story)return null;
  const spec=cardSpec(story,ctx),b=build(spec),box=artBounds(spec);
  // bright data dots first, so bright dots morph into bright dots
  const list=b.pts.filter(p=>!p.g).concat(b.pts.filter(p=>p.g));
  return {spec,b,list,box:{cx:box.x+box.w/2,cy:box.y+box.h/2,w:box.w,h:box.h},label,acc:spec.acc};
 }).filter(Boolean);
 const M=steps.length,N=Math.max(...steps.map(s=>s.list.length));
 let seed=9;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
 const P=Array.from({length:N},()=>({d:rnd()*.35}));
 const oa={x:0,y:0,z:0,k:1,ka:1},ob={x:0,y:0,z:0,k:1,ka:1};
 let shown=-1;
 function tell(k){if(k!==shown){shown=k;onStep?.(k,steps[k]);}}
 // dot i of step k at card time tl, in screen space for the anchor L
 function at(k,i,tl,L,o){
  const s=steps[k],p=s.list[i%s.list.length];place(s.b,p,tl,o);
  const sc=Math.min(2*L.R/s.box.w,2*L.R/s.box.h);
  o.sx=L.cx+(o.x-s.box.cx)*sc;o.sy=L.cy+(o.y-s.box.cy)*sc;o.r=p.s*o.k*clamp(Math.sqrt(sc),.75,1.6);
  o.c=p.c;o.g=p.g;o.al=i<s.list.length?p.a*(o.ka??1):0;
  return o;
 }
 return {
  steps,
  // t: seconds since the reel took over (stops while paused); from: where the dots were before
  // (the globe), so the first visual forms out of them. still: reduced motion shows one settled visual.
  frame(t,L,from,still,emit){
   let cur,nxt,m,tl=6+t;
   if(still){cur=nxt=0;m=0;tl=30;}
   else if(t<INTRO){cur=-1;nxt=0;m=t/INTRO;}
   else{const tt=t-INTRO,idx=Math.floor(tt/STEP),loc=tt-idx*STEP;cur=idx%M;nxt=(idx+1)%M;m=loc<HOLD?0:(loc-HOLD)/MORPH;}
   tell(m>.5||cur<0?nxt:cur);
   for(let i=0;i<N;i++){
    const q=P[i],e=m<=0?0:ease((m-q.d)/.65);
    if(cur<0){
     at(nxt,i,tl,L,ob);let f=from&&from.n?i%from.n:-1;if(f>=0&&from.a[f]<=.01)f=-1;
     const sx=f>=0?from.x[f]:ob.sx,sy=f>=0?from.y[f]:ob.sy,sr=f>=0?from.r[f]:ob.r,sa=f>=0?from.a[f]:0;
     emit(sx+(ob.sx-sx)*e,sy+(ob.sy-sy)*e,sr+(ob.r-sr)*e,sa+(ob.al-sa)*e,e<.5&&f>=0?from.c[f]:ob.c,e<.5&&f>=0?from.g[f]:ob.g);
     continue;
    }
    at(cur,i,tl,L,oa);
    if(e<=0){emit(oa.sx,oa.sy,oa.r,oa.al,oa.c,oa.g);continue;}
    at(nxt,i,tl,L,ob);
    let ax=oa.sx,ay=oa.sy,bx=ob.sx,by=ob.sy;
    // dots that exist on only one side grow in or shrink out where they stand
    if(oa.al<=0){ax=bx;ay=by;}if(ob.al<=0){bx=ax;by=ay;}
    const lift=Math.sin(e*Math.PI)*18*(q.d-.17);
    emit(ax+(bx-ax)*e,ay+(by-ay)*e-lift,oa.r+(ob.r-oa.r)*e,oa.al+(ob.al-oa.al)*e,e<.5?oa.c:ob.c,e<.5?oa.g:ob.g);
   }
  }
 };
}
