import {posterLayout} from './poster-layout.mjs';
import {isSportStory,sportAssets} from './sport-art.mjs';
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
for(const name of ['gym','pool','water','studio','urban','snow','green','court','rock'])assetFiles[`scene-${name}`]=`assets/scene-${name}.webp`;
// Every photographic subject remains a replaceable, independent layer.
export function requiredAssets(story){
 if(isSportStory(story))return sportAssets(story);
 if(story.chart)return [];
 if(story.template==='cover'||story.template==='longest'||(story.presentation==='distance'&&story.template==='cycling'))return ['ridge','road-ribbon'];
 if(story.presentation==='distance')return story.template==='running'?['track']:[];
 const key=designs[story.template].asset;
 return !key?[]:key==='collage'?['shoe','crank','dumbbell','kettlebell']:key==='triad'?['goggles','crank','shoe']:[key];
}
const motionCache=new Map();
export function motionProfile(story){
 const key=(story.id||'')+':'+story.template;if(motionCache.has(key))return motionCache.get(key);
 let seed=0;for(const ch of story.id||story.template)seed=(seed*31+ch.charCodeAt(0))>>>0;
 const calm=['sleep','recovery','yoga','pilates','hrv'].includes(story.template);
 const profile=Object.freeze({phase:(seed%628)/100,rate:(calm?.10:.22)+(seed%7)*.008,amplitude:calm?5:10,turn:((seed%2)*2-1),duration:story.chart?760:calm?1150:920+(seed%4)*60});motionCache.set(key,profile);return profile;
}
export function transitionDuration(from,to){return motionProfile(to).duration+(from.template!==to.template?100:0);}
const TAU=Math.PI*2;
function poly(c,pts,color){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.fill();}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
function line(c,pts,color,width){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
export function artBox(w,h,layout){return (layout||posterLayout(w,h)).art;}
function local(c,w,h,layout){const b=artBox(w,h,layout);c.translate(b.x,b.y);c.scale(b.w/1000,b.h/1000);}
const familyShapes={distance:'track',peak:'target',habit:'calendar',technical:'signal',intensity:'pulse',terrain:'contour',location:'road',trend:'stairs',achievement:'rosette',surprise:'burst',volume:'stack',identity:'tiles',wellness:'ripple',foundation:'arch',opening:'horizon',finale:'rosette'};
export function geometryFor(story){if(story.presentation==='distance'&&story.template==='cycling')return 'road';return story.libraryOnly?familyShapes[story.family]||designs[story.template].shape:story.geometry||designs[story.template].shape;}
export function drawBackdrop(c,w,h,story,time,opacity=1,layout,palette){
 if(opacity<.001||story.chart)return;const d=designs[story.template],p=palette||d.palette,shape=geometryFor(story),v=story.variant||0;
 c.save();c.globalAlpha=opacity;local(c,w,h,layout);
 // Small variant transforms change the composition within a semantic family.
 c.translate(500,500);c.rotate(story.libraryOnly?((v%3)-1)*.08:0);c.translate(-500,-500);
 const motion=motionProfile(story),phase=time*motion.rate+motion.phase,drift=Math.sin(phase)*motion.amplitude;
 c.translate(500,500);c.rotate(Math.sin(phase*.7)*(['gear','burst','rosette','slalom'].includes(shape)?.035:.008));c.translate(-500,-500);
 if(shape==='horizon'){
   ellipse(c,610+drift,340,390,400,p[2]);
   poly(c,[[-80,820],[850,240],[1080,470],[120,1100]],p[3]);
   ellipse(c,860,700,125,155,P.blue);
 } else if(['track','orbit','gear'].includes(shape)){
   for(let i=0;i<3;i++){c.beginPath();c.ellipse(520,520,620-i*95,390-i*74,-.18,0,TAU);c.strokeStyle=i%2?p[3]:p[2];c.lineWidth=58;c.stroke();}
   if(shape==='gear')for(let i=0;i<12;i++){const a=i*TAU/12+time*.06+motion.phase;c.save();c.translate(535,500);c.rotate(a);c.fillStyle=p[2];c.fillRect(390,-22,95,44);c.restore();}
 } else if(['stairs','stack','calendar','footsteps','charge'].includes(shape)){
   const n=shape==='calendar'?4:5;for(let i=0;i<n;i++){c.fillStyle=i%2?p[3]:p[2];if(shape==='calendar'){for(let j=0;j<3;j++)c.fillRect(80+i*225,60+j*270,180,215);}else {const x=shape==='footsteps'?100+i*170:-50+i*190,y=shape==='stack'?130+i*155:720-i*125;c.fillRect(x,y+drift,shape==='stack'?1080:210,shape==='footsteps'?140:115);}}
 } else if(['sun','burst','rosette','citrus','triad'].includes(shape)){
   const n=shape==='triad'?3:shape==='citrus'?8:14;for(let i=0;i<n;i++){const a=i*TAU/n+time*(shape==='sun'?.012:.03)+motion.phase;c.save();c.translate(560,520);c.rotate(a);poly(c,[[80,-35],[640,-95],[640,95],[80,35]],i%2?p[2]:p[3]);c.restore();}
   if(shape==='sun')ellipse(c,560,520,270,360,p[2]);
 } else if(['moon','arch','balance','fold'].includes(shape)){
   if(shape==='fold'){poly(c,[[-50,80],[400,200],[400,900],[-50,780]],p[2]);poly(c,[[400,200],[1100,0],[1100,720],[400,900]],p[3]);}
   else {ellipse(c,570+drift,490,420,530,p[2]);ellipse(c,shape==='moon'?720:560,shape==='moon'?320:480,shape==='balance'?290:275,shape==='balance'?320:380,p[0]);if(shape==='balance')c.fillStyle=p[3],c.fillRect(50,760,900,90);}
 } else if(['ridge','contour','slalom','road'].includes(shape)){
   for(let i=0;i<3;i++)poly(c,[[-170+i*180,1080],[480+i*220,-80],[620+i*220,0],[i*180+15,1080]],i===1?p[3]:p[2]);
 } else if(['court','pitch','lanes'].includes(shape)){
   c.fillStyle=p[2];c.fillRect(70,60,860,920);c.strokeStyle=p[0];c.lineWidth=18;c.strokeRect(145,120,710,790);line(c,[[145,515],[855,515]],p[0],18);line(c,[[500,120],[500,910]],p[0],18);
   if(shape==='lanes')for(let i=0;i<4;i++)c.fillStyle=p[3],c.fillRect(150+i*220,-50,26,1100);
 } else if(['holds','target'].includes(shape)){
   for(let i=0;i<5;i++){if(shape==='target'){c.beginPath();c.ellipse(540,510,470-i*84,480-i*84,0,0,TAU);c.strokeStyle=i%2?p[3]:p[2];c.lineWidth=42;c.stroke();}else {const x=180+(i%3)*280,y=100+i*155;poly(c,[[x,y],[x+155,y-30],[x+200,y+90],[x+60,y+150]],i%2?p[3]:p[2]);}}
 } else if(['ripple','tide','signal','pulse','heartbeat'].includes(shape)){
   for(let j=0;j<4;j++){const pts=[];for(let i=0;i<=100;i++)pts.push([i*12-100,240+j*170+Math.sin(i/100*TAU*1.4-phase)*70]);line(c,pts,j%2?p[3]:p[2],shape==='heartbeat'?40:70);}
 } else {ellipse(c,770,160,580,650,p[2]);poly(c,[[-100,900],[1100,-100],[1100,260],[100,1100]],p[3]);}
 c.restore();
}
function cutout(c,img,x,y,width,height,angle=0){if(!img?.complete||!img.naturalWidth)return;c.save();c.translate(x,y);c.rotate(angle);const r=Math.min(width/img.naturalWidth,height/img.naturalHeight);c.drawImage(img,-img.naturalWidth*r/2,-img.naturalHeight*r/2,img.naturalWidth*r,img.naturalHeight*r);c.restore();}
function landscape(story){return story.template==='cover'||story.template==='longest'||(story.presentation==='distance'&&story.template==='cycling');}
function photoSpace(c,w,h,layout){
 const b=artBox(w,h,layout),unit=Math.min(b.w/1000,b.h/900);
 c.translate(b.x+b.w/2,b.y+b.h/2);c.scale(unit,unit);c.translate(-500,-500);
}
export function drawPhoto(c,w,h,story,time,assets,opacity=1,depth='subject',layout){
 if(opacity<.001||story.chart)return;
 const m=motionProfile(story),phase=time*m.rate+m.phase,float=Math.sin(phase)*m.amplitude;
 c.save();c.globalAlpha=opacity;photoSpace(c,w,h,layout);
 if(landscape(story)){
  // Distant mountain → intervening geometry → nearby road. No baked landscape.
  if(depth==='rear'){
   c.save();c.beginPath();c.ellipse(500,260,470,265,0,0,TAU);c.clip();
   cutout(c,assets.ridge,500+Math.sin(phase*.65)*4,260+float*.25,1000,570,0);c.restore();
  }else cutout(c,assets['road-ribbon'],590+Math.sin(phase*.8)*13,690+float,470,520,-.40+Math.sin(phase*.6)*.015);
  c.restore();return;
 }
 if(depth==='rear'){c.restore();return;}
 if(story.presentation==='distance'){
  if(story.template==='running'){
   const img=assets.track;
   if(img?.naturalWidth){
    c.save();c.translate(500,500+float*.4);c.rotate(-.22);c.beginPath();c.ellipse(0,0,480,320,0,0,TAU);c.clip();
    const scale=Math.max(960/img.naturalWidth,640/img.naturalHeight);c.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);c.restore();
   }
  }
  c.restore();return;
 }
 const d=designs[story.template],v=story.variant||0;
 const grounded=['strength','hiit','yoga','pilates'].includes(story.template),angle=d.angle+(grounded?0:Math.sin(phase*.7)*.024)+(story.libraryOnly?((v%3)-1)*.08:0);
 if(d.asset==='collage'||d.asset==='triad'){
  const names=requiredAssets(story);names.forEach((name,i)=>{
   const locations=story.template==='mix'?[[265,200],[740,360],[280,650],[735,780]]:[[250,400],[680,260],[640,720],[270,740]];
   const [x,y]=locations[i],ground=name==='dumbbell'||name==='kettlebell';
   cutout(c,assets[name],x+(ground?0:Math.sin(phase+i)*8),y+(ground?0:Math.sin(phase+i*1.7)*12),460,460,(i%2?.18:-.18)+(ground?0:Math.sin(phase*.6+i)*.025));
  });
 }else if(d.asset==='ridge')cutout(c,assets.ridge,500,470+float*.3,1130,820,0);
 else {const base=story.template==='morning'?760:story.template==='elliptical'?880:1050;cutout(c,assets[d.asset],500+(story.libraryOnly?(v%3-1)*45:0),520+(grounded?0:float),base,930,angle);}
 c.restore();
}
export function drawInterlude(c,w,h,story,time,opacity=1,layout,palette){
 if(!landscape(story)||story.chart||opacity<.001)return;
 const p=palette||palettes[story.template],m=motionProfile(story),phase=time*m.rate+m.phase;
 c.save();c.globalAlpha=opacity;photoSpace(c,w,h,layout);
 // A broad, open ribbon occupies the air between two separate photo subjects.
 c.translate(500,540);c.rotate(-.13+Math.sin(phase*.7)*.025);c.beginPath();
 c.ellipse(0,0,550,155,0,.08,Math.PI*1.95);c.strokeStyle=p[3];c.lineWidth=46;c.stroke();
 c.beginPath();c.ellipse(0,-48,570,172,0,.2,Math.PI*1.73);c.strokeStyle=p[2];c.lineWidth=5;c.stroke();
 c.restore();
}
function motif(story,u,lane,time){
 const shape=geometryFor(story),L=lane-1,a=u*TAU-Math.PI,v=story.variant||0,m=motionProfile(story),phase=time*m.rate+m.phase;
 if(shape==='horizon')return [-60+u*1160,570+Math.sin(u*TAU+phase*.25)*95+L*70];
 if(['track','gear','orbit','target','ripple'].includes(shape))return [500+Math.cos(a)*(620+L*35),520+Math.sin(a)*(300+L*45)];
 if(['stairs','ridge','contour','slalom','footsteps'].includes(shape))return [-80+u*1160,680-230*(1-Math.abs(((u*(2.1+(v%2)*.5))%1)*2-1))+L*90];
 if(['stack','calendar','charge'].includes(shape))return [-80+u*1160,640+Math.tanh(Math.sin(u*TAU*2.1))*140+L*60];
 if(['sun','rosette','citrus','burst','triad'].includes(shape)){const r=1+.17*Math.cos(a*(shape==='triad'?3:5));return [520+Math.sin(a)*500*r,540+Math.cos(a)*350*r+L*40];}
 if(['road','holds'].includes(shape))return [140+u*760+Math.sin(u*TAU*1.5)*190,80+u*870+L*50];
 if(['court','pitch','lanes'].includes(shape))return [-100+u*1200,460+Math.sin(u*Math.PI)*130+L*130];
 if(['pulse','heartbeat'].includes(shape))return [-100+u*1200,620+Math.sin(u*TAU*2.5-phase)*Math.pow(Math.abs(Math.sin(u*TAU)),4)*190+L*70];
 if(['moon','tide','signal'].includes(shape))return [-100+u*1200,580+Math.sin(u*TAU-phase)*120+L*100];
 return [500+Math.cos(a)*530,560+Math.sin(a*2)*160+L*65];
}
function point(story,u,lane,w,h,time,layout){const q=motif(story,u,lane,time),b=artBox(w,h,layout);return [b.x+q[0]*b.w/1000,b.y+q[1]*b.h/1000];}
export function drawWeave(c,w,h,from,to,t,time,front,p,layout){
 if(from.chart&&to.chart)return;
 c.save();c.lineCap='round';c.lineJoin='round';
 const visibility=from.chart?t:to.chart?1-t:1;c.globalAlpha=visibility;
 // A split at the same path parameter makes the photo visibly sit IN the graphic.
 const begin=front?75:0,end=front?150:75;
 const laneCount=s=>landscape(s)||['hiit','strength'].includes(s.template)?1:s.template==='swimming'?4:2;
 const fromLanes=laneCount(from),toLanes=laneCount(to);
 for(let lane=0;lane<Math.max(fromLanes,toLanes);lane++){
   const presence=(lane<fromLanes?1-t:0)+(lane<toLanes?t:0);if(presence<.001)continue;c.globalAlpha=visibility*presence;
   const get=u=>{const a=point(from,u,lane,w,h,time,layout),b=point(to,u,lane,w,h,time,layout);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
   c.beginPath();for(let i=begin;i<=end;i++){const q=get(i/150);i===begin?c.moveTo(...q):c.lineTo(...q);}c.strokeStyle=lane===1?p[3]:p[2];c.lineWidth=lane===1?Math.max(10,w*.018):Math.max(2,w*.003);c.stroke();
   const speed=s=>({sleep:.009,recovery:.012,yoga:.014,pilates:.014,cycling:.05,hiit:.07,strength:.02,swimming:.025}[s.template]||.028);
   const marker=s=>(time*speed(s)+motionProfile(s).phase/TAU+lane*.27)%1;
   const ua=marker(from),ub=marker(to),u=ua+(ub-ua)*t;
   if(front?u>=.5:u<.5){const a=point(from,ua,lane,w,h,time,layout),b=point(to,ub,lane,w,h,time,layout),q=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];c.globalAlpha=visibility*presence*Math.min(1,u*18,(1-u)*18);c.fillStyle=p[1];c.beginPath();c.arc(...q,Math.max(3,w*.005),0,TAU);c.fill();}
 }
 c.restore();
}
