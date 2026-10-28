import {posterLayout} from './poster-layout.mjs';
import {isSportStory,sportAssets} from './sport-art.mjs';
import {editorialBackdrop,editorialPhoto,editorialMotion,sportMotion} from './editorial-art.mjs';
// Original compositions: rear geometry → rear motif → photo cutout → front motif.
// Motifs are decorative, never measurements or GPS traces.
const P={cream:'#f3f0e8',black:'#101519',white:'#fffaf0',blue:'#1743ed',orange:'#ff7038',pink:'#f23897',mint:'#8de4c4',yellow:'#f2e630'};
export const designs={
 cover:{asset:'ridge',shape:'horizon',palette:[P.cream,P.black,P.orange,P.pink],angle:0},
 running:{asset:'shoe',shape:'track',palette:[P.black,P.white,P.orange,P.blue],angle:-.22},
 cycling:{asset:'crank',shape:'gear',palette:[P.blue,P.white,P.yellow,P.pink],angle:.12},
 miniwatt:{asset:'crank',shape:'gear',palette:[P.blue,P.yellow,P.orange,P.pink],angle:-.14},
 longest:{asset:'road',shape:'road',palette:[P.mint,P.black,P.blue,P.orange],angle:0},
 active:{asset:'stairs',shape:'stairs',palette:[P.yellow,P.black,P.blue,P.pink],angle:.06},
 mix:{asset:'collage',shape:'tiles',palette:[P.black,P.white,P.orange,P.pink],angle:0},
 summary:{asset:null,shape:'tiles',palette:[P.cream,P.black,P.blue,P.orange],angle:0},
 heatmap:{asset:null,shape:'calendar',palette:[P.cream,P.black,P.blue,P.orange],angle:0},
 morning:{asset:'clock',shape:'sun',palette:[P.cream,P.black,P.orange,P.pink],angle:-.13},
 recovery:{asset:'bench',shape:'fold',palette:[P.pink,P.black,P.cream,P.orange],angle:-.05},
 sleep:{asset:'pillow',shape:'moon',palette:[P.blue,P.white,P.pink,P.mint],angle:.15},
 elevation:{asset:'ridge',shape:'contour',palette:[P.blue,P.white,P.orange,P.yellow],angle:0},
 hiit:{asset:'kettlebell',shape:'burst',palette:[P.orange,P.black,P.yellow,P.blue],angle:.16},
 strength:{asset:'dumbbell',shape:'stack',palette:[P.yellow,P.black,P.pink,P.blue],angle:-.2},
 walking:{asset:'shoe',shape:'footsteps',palette:[P.pink,P.black,P.orange,P.blue],angle:.18},
 hiking:{asset:'boot',shape:'ridge',palette:[P.mint,P.black,P.blue,P.orange],angle:-.18},
 swimming:{asset:'goggles',shape:'lanes',palette:[P.blue,P.white,P.mint,P.yellow],angle:-.17},
 rowing:{asset:'oar',shape:'ripple',palette:[P.mint,P.black,P.blue,P.orange],angle:.05},
 yoga:{asset:'mat',shape:'arch',palette:[P.cream,P.black,P.pink,P.yellow],angle:-.12},
 pilates:{asset:'ball',shape:'balance',palette:[P.pink,P.black,P.orange,P.yellow],angle:0},
 elliptical:{asset:'elliptical',shape:'orbit',palette:[P.yellow,P.black,P.blue,P.pink],angle:-.04},
 skiing:{asset:'skis',shape:'slalom',palette:[P.cream,P.black,P.orange,P.blue],angle:.10},
 golf:{asset:'golf',shape:'target',palette:[P.mint,P.black,P.blue,P.yellow],angle:-.12},
 racket:{asset:'racket',shape:'court',palette:[P.orange,P.black,P.blue,P.yellow],angle:.13},
 triathlon:{asset:'triad',shape:'triad',palette:[P.blue,P.white,P.mint,P.orange],angle:0},
 team_sports:{asset:'football',shape:'pitch',palette:[P.black,P.white,P.mint,P.pink],angle:.12},
 climbing:{asset:'carabiner',shape:'holds',palette:[P.pink,P.black,P.yellow,P.blue],angle:-.08},
 cardio:{asset:'rope',shape:'pulse',palette:[P.black,P.white,P.orange,P.pink],angle:.04},
 heart:{asset:null,shape:'heartbeat',palette:[P.pink,P.black,P.orange,P.blue],angle:-.1},
 energy:{asset:'orange',shape:'charge',palette:[P.yellow,P.black,P.orange,P.pink],angle:.12},
 hrv:{asset:'water',shape:'signal',palette:[P.blue,P.white,P.mint,P.pink],angle:.1},
 nutrition:{asset:'orange',shape:'citrus',palette:[P.mint,P.black,P.orange,P.yellow],angle:-.12},
 hydration:{asset:'water',shape:'tide',palette:[P.mint,P.black,P.blue,P.pink],angle:-.13},
 calendar:{asset:'kettlebell',shape:'calendar',palette:[P.cream,P.black,P.pink,P.blue],angle:.08},
 finale:{asset:'collage',shape:'rosette',palette:[P.cream,P.black,P.blue,P.pink],angle:0}
};
export const palettes=Object.fromEntries(Object.entries(designs).map(([k,v])=>[k,v.palette]));
export const assetFiles={...Object.fromEntries(['ridge','shoe','crank','stairs','bench','pillow','clock','kettlebell','dumbbell','goggles','mat','orange','water','boot','oar','ball','elliptical','skis','golf','racket','football','carabiner','rope','road','road-ribbon','track'].map(name=>[name,`assets/${name}.webp`])),shoe:'assets/shoe-blue.webp'};
for(const name of ['gym','pool','water','studio','urban','snow','green','court','rock'])assetFiles[`scene-${name}`]=`assets/scene-${name}.webp`;
// Every photographic subject remains a replaceable, independent layer.
export function requiredAssets(story){
 if(isSportStory(story))return sportAssets(story);
 if(story.chart)return [];
 if(story.template==='cover')return ['ridge'];
 if(story.template==='longest'||(story.presentation==='distance'&&story.template==='cycling'))return ['ridge','road-ribbon'];
 if(story.template==='running')return story.presentation==='distance'?['track']:['track','shoe'];
 if(story.template==='hiking')return story.presentation==='distance'?['ridge']:['ridge','boot'];
 if(story.template==='skiing')return ['ridge','skis'];
 const key=designs[story.template].asset;
 return !key?[]:key==='collage'?['shoe','crank','dumbbell']:key==='triad'?['goggles','crank','shoe']:[key];
}
const motionCache=new Map();
export function motionProfile(story){
 const key=(story.id||'')+':'+story.template;if(motionCache.has(key))return motionCache.get(key);
 // Keep the same animation clock across consecutive slides in a sport.
 let seed=0;for(const ch of story.id?.startsWith('other-')?'other':story.template)seed=(seed*31+ch.charCodeAt(0))>>>0;
 const calm=['sleep','recovery','yoga','pilates','hrv'].includes(story.template);
 const profile=Object.freeze({kind:sportMotion[story.id?.startsWith('other-')?'other':story.template]||'fold',phase:(seed%628)/100,rate:(calm?.10:.22)+(seed%7)*.008,amplitude:calm?5:10,turn:((seed%2)*2-1),duration:story.chart?760:calm?1150:920+(seed%4)*60});motionCache.set(key,profile);return profile;
}
export function transitionDuration(from,to){return motionProfile(to).duration+(from.template!==to.template?100:0);}
export function artBox(w,h,layout){return (layout||posterLayout(w,h)).art;}
export function geometryFor(story){return story.presentation==='distance'&&story.template==='cycling'?'road':story.geometry||designs[story.template].shape;}
export function drawBackdrop(c,w,h,story,time,opacity=1,layout,palette){
 if(story.chart||opacity<.001)return;
 c.save();c.globalAlpha=opacity;editorialBackdrop(c,artBox(w,h,layout),story,palette||palettes[story.template],time+motionProfile(story).phase);c.restore();
}
export function drawPhoto(c,w,h,story,time,assets,opacity=1,depth='subject',layout){
 if(story.chart||opacity<.001)return;
 c.save();c.globalAlpha=opacity;editorialPhoto(c,artBox(w,h,layout),story,assets,time+motionProfile(story).phase,depth);c.restore();
}
export function drawInterlude(c,w,h,story,time,opacity=1,layout,palette){
 if(story.chart||opacity<.001)return;
 const p=palette||palettes[story.template],b=artBox(w,h,layout);
 c.save();c.globalAlpha=opacity;editorialMotion(c,b,story,p,time+motionProfile(story).phase,false);c.restore();
}
export function drawWeave(c,w,h,from,to,t,time,front,p,layout,include=()=>true){
 // Crossfade independent sport signatures; the shared geometry continues between
 // consecutive cards in a sport without resetting its animation clock.
 const layers=from.id===to.id?[[to,1]]:[[from,1-t],[to,t]];
 for(const [s,opacity] of layers){
  if(s.chart||opacity<.001||!include(s))continue;
  c.save();c.globalAlpha=opacity;const b=artBox(w,h,layout),clock=time+motionProfile(s).phase;
  if(front)editorialBackdrop(c,b,s,p,clock,true);
  editorialMotion(c,b,s,p,clock,front);c.restore();
 }
}
