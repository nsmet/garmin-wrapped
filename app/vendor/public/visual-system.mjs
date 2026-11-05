import {layeredAssets} from './layered-art.mjs';
// Original compositions: rear geometry → rear motif → photo cutout → front motif.
// Motifs are decorative, never measurements or GPS traces.
const P={cream:'#f3f0e8',black:'#101519',white:'#fffaf0',blue:'#1743ed',orange:'#ff7038',pink:'#f23897',mint:'#8de4c4',yellow:'#f2e630'};
export const designs={
 cover:{asset:'ridge',shape:'horizon',palette:[P.cream,P.black,P.orange,P.pink],angle:0},
 running:{asset:'shoe',shape:'track',palette:[P.black,P.white,P.orange,P.pink],angle:-.22},
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
 strength:{asset:'dumbbell',shape:'stack',palette:[P.black,P.white,P.yellow,P.pink],angle:-.2},
 walking:{asset:'shoe',shape:'footsteps',palette:[P.pink,P.black,P.orange,P.blue],angle:.18},
 hiking:{asset:'boot',shape:'ridge',palette:[P.mint,P.black,P.blue,P.orange],angle:-.18},
 swimming:{asset:'goggles',shape:'lanes',palette:[P.blue,P.white,P.mint,P.yellow],angle:-.17},
 rowing:{asset:'oar',shape:'ripple',palette:[P.mint,P.black,P.blue,P.orange],angle:.05},
 yoga:{asset:'mat',shape:'arch',palette:[P.cream,P.black,P.yellow,P.pink],angle:-.12},
 pilates:{asset:'ball',shape:'balance',palette:[P.pink,P.black,P.orange,P.yellow],angle:0},
 elliptical:{asset:'elliptical',shape:'orbit',palette:[P.yellow,P.black,P.blue,P.pink],angle:-.04},
 skiing:{asset:'skis',shape:'slalom',palette:[P.cream,P.black,P.orange,P.blue],angle:.10},
 golf:{asset:'golf',shape:'target',palette:[P.mint,P.black,P.blue,P.yellow],angle:-.12},
 racket:{asset:'racket',shape:'court',palette:[P.orange,P.black,P.blue,P.yellow],angle:.13},
 triathlon:{asset:'triad',shape:'triad',palette:[P.blue,P.white,P.mint,P.orange],angle:0},
 team_sports:{asset:'football',shape:'pitch',palette:[P.black,P.white,P.mint,P.pink],angle:.12},
 climbing:{asset:'carabiner',shape:'holds',palette:[P.pink,P.black,P.yellow,P.blue],angle:-.08},
 cardio:{asset:'rope',shape:'pulse',palette:[P.black,P.white,P.orange,P.pink],angle:.04},
 heart:{asset:'kettlebell',shape:'heartbeat',palette:[P.pink,P.black,P.orange,P.blue],angle:-.1},
 energy:{asset:'orange',shape:'charge',palette:[P.yellow,P.black,P.orange,P.pink],angle:.12},
 hrv:{asset:'water',shape:'signal',palette:[P.blue,P.white,P.mint,P.pink],angle:.1},
 nutrition:{asset:'orange',shape:'citrus',palette:[P.mint,P.black,P.orange,P.yellow],angle:-.12},
 hydration:{asset:'water',shape:'tide',palette:[P.mint,P.black,P.blue,P.pink],angle:-.13},
 calendar:{asset:'kettlebell',shape:'calendar',palette:[P.cream,P.black,P.pink,P.blue],angle:.08},
 finale:{asset:'collage',shape:'rosette',palette:[P.cream,P.black,P.blue,P.pink],angle:0}
};
export const palettes=Object.fromEntries(Object.entries(designs).map(([k,v])=>[k,v.palette]));
export const assetFiles={...Object.fromEntries(['ridge','shoe','crank','stairs','bench','pillow','clock','kettlebell','dumbbell','goggles','mat','orange','water','boot','oar','ball','elliptical','skis','golf','racket','football','carabiner','rope','road','road-ribbon','track'].map(name=>[name,`assets/${name}.webp`])),shoe:'assets/shoe-blue.webp'};
// All photographic subjects and scenery are independent transparent PNGs.
for(const name of ['ridge','crank','stairs','bench','pillow','clock','kettlebell','dumbbell','goggles','mat','orange','water','boot','oar','ball','elliptical','skis','racket','football','carabiner','rope','road-ribbon','running-track','gym-floor','pool-water','open-water','crosswalk','green','court','studio-floor','bike-wheel','bike-bars','golf-ball','golf-club'])assetFiles[name]=`assets/layers/${name}.webp`;
assetFiles.shoe='assets/layers/shoe-blue.webp';
export function requiredAssets(story){return layeredAssets(story);}
const motionCache=new Map();
export function motionProfile(story){
 const key=(story.id||'')+':'+story.template;if(motionCache.has(key))return motionCache.get(key);
 let seed=0;for(const ch of story.template)seed=(seed*31+ch.charCodeAt(0))>>>0;
 const calm=['sleep','recovery','yoga','pilates','hrv'].includes(story.template);
 const profile=Object.freeze({phase:(seed%628)/100,rate:(calm?.10:.22)+(seed%7)*.008,amplitude:calm?5:10,turn:((seed%2)*2-1),duration:story.chart?760:calm?1150:920+(seed%4)*60});motionCache.set(key,profile);return profile;
}
export function transitionDuration(from,to){return motionProfile(to).duration+(from.template!==to.template?100:0);}
