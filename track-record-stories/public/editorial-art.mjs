// Original, people-free editorial collages. Photographs, ink and moving geometry
// remain independent layers. Nothing here encodes a route or a measurement.
const TAU=Math.PI*2;
const circle=(c,x,y,r,ink)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=ink;c.fill();};
const polygon=(c,points,ink)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=ink;c.fill();};
const stroke=(c,points,ink,width)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=ink;c.lineWidth=width;c.lineCap='butt';c.lineJoin='round';c.stroke();};
const rect=(c,x,y,w,h,ink)=>{c.fillStyle=ink;c.fillRect(x,y,w,h);};
function space(c,b){c.translate(b.x,b.y);c.scale(b.w/1000,b.h/1000);}
function ring(c,x,y,rx,ry,angle,ink,width,start=0,end=TAU){c.beginPath();c.ellipse(x,y,rx,ry,angle,start,end);c.strokeStyle=ink;c.lineWidth=width;c.stroke();}
function cutout(c,img,b,x,y,width,angle=0){
 if(!img?.naturalWidth)return;
 c.save();c.translate(b.x+x*b.w,b.y+y*b.h);c.rotate(angle);
 const iw=width*b.w,ih=iw*img.naturalHeight/img.naturalWidth;
 c.drawImage(img,-iw/2,-ih/2,iw,ih);c.restore();
}
function photoFill(c,img,b,points,dx=0){
 if(!img?.naturalWidth)return;
 c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(b.x+x*b.w,b.y+y*b.h):c.moveTo(b.x+x*b.w,b.y+y*b.h));c.closePath();c.clip();
 const scale=Math.max(b.w/img.naturalWidth,b.h/img.naturalHeight);
 c.drawImage(img,b.x+(b.w-img.naturalWidth*scale)/2+dx,b.y+(b.h-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);c.restore();
}
export const sportMotion={
 running:'lane-sweep',cycling:'chainring',hiit:'burst',strength:'load',walking:'steps',hiking:'ascent',swimming:'lanes',rowing:'wake',yoga:'breath',pilates:'balance',elliptical:'orbit',skiing:'slalom',golf:'target',racket:'court',triathlon:'three-bands',team_sports:'pitch',climbing:'holds',cardio:'pulse',other:'fold',
 cover:'horizon',longest:'road',active:'stairs',sleep:'moon',heart:'heartbeat',recovery:'rest',morning:'sun',elevation:'contour',miniwatt:'chainring',finale:'collage'
};
export function editorialReveal(c,w,h,t,kind){
 // Different masks make chapter changes feel related to the incoming sport.
 const clamp=n=>Math.max(0,Math.min(1,n));
 const poly=pts=>{pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
 c.beginPath();
 if(t>=.999){c.rect(0,0,w,h);c.clip();return;}
 switch(kind){
  case 'lane-sweep':{
   const edge=h*(1.3-1.65*t);c.moveTo(0,h);c.lineTo(0,edge);c.bezierCurveTo(w*.3,edge+h*.28,w*.6,edge-h*.32,w,edge-h*.2);c.lineTo(w,h);c.closePath();break;
  }
  case 'chainring':c.ellipse(w*.8,h*.6,Math.hypot(w,h)*t,Math.hypot(w,h)*t,0,0,TAU);break;
  case 'burst':{
   const edge=w*(-.5+2*t);poly([[0,0],[edge,0],[edge-w*.2,h*.36],[edge+w*.18,h*.3],[edge-w*.1,h*.72],[edge+w*.22,h*.67],[edge,h],[0,h]]);break;
  }
  case 'load':for(let i=0;i<4;i++)c.rect(0,i*h/4,w*clamp(t*1.5-i*.16),h/4+1);break;
  case 'steps':for(let i=0;i<6;i++){const q=clamp(t*1.55-i*.10);c.rect(i*w/6,h*(1-q),w/6+1,h*q);}break;
  case 'ascent':{const edge=h*(1.5-2.5*t);poly([[0,h],[0,edge+h*.3],[w*.45,edge],[w,edge+h*.55],[w,h]]);break;}
  case 'lanes':for(let i=0;i<6;i++){const q=clamp(t*1.5-i*.09);c.rect(i%2?w*(1-q):0,i*h/6,w*q,h/6+1);}break;
  case 'wake':{
   const edge=h*(1.3-1.6*t);c.moveTo(0,h);c.lineTo(0,edge);c.bezierCurveTo(w*.3,edge-h*.22,w*.7,edge+h*.22,w,edge);c.lineTo(w,h);c.closePath();break;
  }
  case 'breath':c.ellipse(w*.5,h*.75,Math.hypot(w,h)*t*.85,Math.hypot(w,h)*t,0,0,TAU);break;
  case 'balance':c.ellipse(w*.25,h*.55,Math.hypot(w,h)*t,Math.hypot(w,h)*t*.8,-.3,0,TAU);break;
  case 'orbit':c.ellipse(w*.7,h*.5,Math.hypot(w,h)*t*.8,Math.hypot(w,h)*t,-.45,0,TAU);break;
  case 'slalom':{
   const edge=w*(1.5-2*t);poly([[w,0],[edge+w*.3,0],[edge-w*.5,h],[w,h]]);break;
  }
  case 'target':c.ellipse(w*.72,h*.35,Math.hypot(w,h)*t,Math.hypot(w,h)*t,0,0,TAU);break;
  case 'court':for(let i=0;i<4;i++){const q=clamp(t*1.6-i*.15),x=(i%2)*w/2,y=Math.floor(i/2)*h/2;c.rect(x,y,w/2*q+1,h/2*q+1);}break;
  case 'three-bands':for(let i=0;i<3;i++){const q=clamp(t*1.6-i*.22);poly([[0,h*i/3],[w*q,h*i/3-h*.12],[w*q,h*(i+1)/3],[0,h*(i+1)/3+h*.12]]);}break;
  case 'pitch':{const q=clamp(t*1.04);c.rect(w*(1-q)/2,0,w*q,h);break;}
  case 'holds':for(let i=0;i<5;i++){const q=clamp(t*1.8-i*.18);c.rect(w*(1-q),h*(4-i)/5,w*q,h/5+1);}break;
  case 'pulse':{
   const x=w*(-.3+1.7*t);poly([[0,0],[x,0],[x,h*.2],[x+w*.10,h*.35],[x-w*.12,h*.51],[x+w*.13,h*.66],[x,h*.8],[x,h],[0,h]]);break;
  }
  case 'moon':case 'rest':c.ellipse(w,h*.3,Math.hypot(w,h)*t,Math.hypot(w,h)*t,0,0,TAU);break;
  default:{const edge=-w*.4+w*1.8*t;poly([[0,0],[edge+w*.23,0],[edge-w*.23,h],[0,h]]);}
 }
 c.clip();
}
export function editorialBackdrop(c,b,s,p,t,front=false){
 const k=s.id?.startsWith('other-')?'other':s.template,a=t*.32,drift=Math.sin(a)*12;
 c.save();space(c,b);
 if(front){
  // A foreground cut crosses the photograph rather than enclosing it in a badge.
  if(k==='running'){
   for(let i=0;i<3;i++){
    c.beginPath();c.moveTo(-100,820+i*42);c.bezierCurveTo(500,980+i*42,730,610+i*42,1120,640+i*42);c.strokeStyle=i===0?p[3]:p[1];c.lineWidth=i===0?37:2;c.stroke();
   }
  }else if(['cycling','miniwatt','longest'].includes(k))polygon(c,[[-70,950],[880,670],[1030,790],[150,1090]],p[3]);
  else if(['cover','hiking','elevation','skiing'].includes(k))polygon(c,[[650,920],[1100,470],[1100,710],[790,1080]],p[3]);
  else if(['swimming','rowing','hydration'].includes(k))for(let j=0;j<2;j++){
   c.beginPath();c.moveTo(-70,870+j*55);c.bezierCurveTo(300,750+j*55+drift,600,1010+j*55,1090,790+j*55);c.strokeStyle=j?p[1]:p[2];c.lineWidth=j?2:35;c.stroke();
  }
  else if(k==='strength')rect(c,0,870,500,78,p[3]);
  else if(k==='hiit')polygon(c,[[730,720],[840,650],[800,850],[920,780],[720,1070],[780,850],[680,910]],p[3]);
  else if(['walking','active'].includes(k))stroke(c,[[0,970],[250,970],[250,860],[490,860],[490,750]],p[3],26);
  else if(k==='sleep')ring(c,600,470,490,540,-.15,p[2],3,.2,2.6);
  else if(k==='yoga')stroke(c,[[60,920],[940,920]],p[3],24);
  else if(k==='racket')stroke(c,[[0,800],[1000,510]],p[1],5);
  else if(k==='climbing')stroke(c,[[130,1040],[290,750],[220,590],[430,380]],p[1],6);
  c.restore();return;
 }
 switch(k){
  case 'running':
   circle(c,930,300,285,p[3]);
   for(let i=0;i<4;i++)ring(c,650,620,710-i*83,440-i*72,-.28,i===1?p[3]:p[2],i===1?68:73);
   for(let i=0;i<4;i++)ring(c,650,620,710-i*83,440-i*72,-.28,p[1],2);
   break;
  case 'cycling':case 'miniwatt':
   circle(c,750,500,480,p[2]);polygon(c,[[-100,550],[1100,80],[1100,420],[-100,890]],p[3]);
   c.save();c.translate(760,520);c.rotate(t*.11);for(let i=0;i<16;i++){c.rotate(TAU/16);rect(c,390,-25,125,50,p[2]);}c.restore();
   ring(c,760,520,330,330,0,p[0],3);break;
  case 'cover':polygon(c,[[-100,600],[1100,200],[1100,470],[-100,950]],p[3]);break;
  case 'longest':case 'elevation':
   circle(c,760,440,445,p[2]);polygon(c,[[-100,600],[1100,200],[1100,470],[-100,950]],p[3]);break;
  case 'hiit':
   circle(c,620,500,480,p[2]);
   c.save();c.translate(0,Math.sin(t*.43)*8);
   polygon(c,[[-100,350],[580,90],[450,390],[1100,110],[1100,370],[300,700],[430,390],[-100,620]],p[3]);c.restore();break;
  case 'strength':
   polygon(c,[[0,130],[1000,0],[1000,290],[0,420]],p[1]);
   rect(c,180,440,1000,195,p[3]);rect(c,-100,680,1000,165,p[1]);
   for(let i=0;i<5;i++)rect(c,20+i*39,160,2,185,p[2]);break;
  case 'walking':case 'active':
   for(let i=0;i<5;i++){rect(c,-80+i*235,670-i*190+Math.sin(t*.4+i)*8,245,500,i%2?p[3]:p[2]);}break;
  case 'hiking':
   circle(c,810,220,285,p[3]);polygon(c,[[-100,1000],[410,80],[700,620],[960,240],[1100,1000]],p[2]);
   stroke(c,[[-40,1000],[430,230],[700,780],[1020,430]],p[1],3);break;
  case 'swimming':
   polygon(c,[[0,200],[1000,0],[1000,1000],[0,1000]],p[2]);
   for(let i=0;i<5;i++){const x=80+i*235;stroke(c,[[x,-100],[x-180,1100]],p[0],40);for(let j=-1;j<15;j++){const y=j*85+(t*14%85);rect(c,x-y/6,y,17,32,p[3]);}}break;
  case 'rowing':case 'hydration':
   for(let j=0;j<4;j++){c.beginPath();c.moveTo(-80,250+j*190);c.bezierCurveTo(260,100+j*190+drift,670,400+j*190,1100,220+j*190);c.strokeStyle=j%2?p[3]:p[2];c.lineWidth=j%2?40:110;c.stroke();}break;
  case 'yoga':
   circle(c,720,240,230,p[3]);c.beginPath();c.moveTo(170,1100);c.lineTo(170,450);c.bezierCurveTo(170,-150,840,-150,840,450);c.lineTo(840,1100);c.strokeStyle=p[2];c.lineWidth=150+Math.sin(t*.18)*7;c.stroke();break;
  case 'pilates':
   circle(c,670,420,470,p[2]);ring(c,670,420,385,420,-.25,p[1],3);polygon(c,[[-50,920],[1050,720],[1050,870],[-50,1070]],p[3]);break;
  case 'elliptical':
   ring(c,300,710,270,600,-.4,p[2],105);ring(c,720,710,270,600,-.4,p[3],80);break;
  case 'skiing':
   polygon(c,[[-300,1100],[700,-100],[1050,-100],[50,1100]],p[2]);polygon(c,[[500,1100],[1200,0],[1400,0],[700,1100]],p[3]);
   for(let i=0;i<4;i++)stroke(c,[[-100+i*100,1000],[800+i*100,-100]],p[1],3);break;
  case 'golf':
   circle(c,800,450,590,p[2]);for(let i=0;i<4;i++)ring(c,800,450,200+i*90,210+i*90,-.3,p[3],12);break;
  case 'racket':
   c.save();c.translate(500,550);c.rotate(-.17);rect(c,-600,-450,1200,1100,p[2]);c.strokeStyle=p[0];c.lineWidth=8;c.strokeRect(-380,-390,760,1000);stroke(c,[[-600,130],[600,130]],p[0],15);stroke(c,[[0,-390],[0,610]],p[0],6);c.restore();circle(c,850,170+Math.sin(t*.6)*25,70,p[3]);break;
  case 'triathlon':
   for(let i=0;i<3;i++)polygon(c,[[-100,180+i*330],[1050,-170+i*330],[1100,110+i*330],[-100,460+i*330]],[p[2],p[3],p[1]][i]);break;
  case 'team_sports':
   rect(c,80,0,940,1000,p[2]);c.strokeStyle=p[0];c.lineWidth=7;c.strokeRect(170,-50,770,1100);ring(c,550,500,210,210,0,p[0],7);stroke(c,[[80,500],[1040,500]],p[0],7);polygon(c,[[-30,940],[1030,590],[1030,810],[-30,1160]],p[3]);break;
  case 'climbing':
   polygon(c,[[120,1100],[650,-100],[1100,-100],[650,1100]],p[2]);
   for(let i=0;i<5;i++){const x=100+i%3*300,y=100+i*180;polygon(c,[[x,y],[x+130,y-40],[x+190,y+70],[x+30,y+130]],p[3]);}break;
  case 'sleep':case 'recovery':
   circle(c,620,530,510,p[3]);circle(c,800,290,430,p[0]);circle(c,100,740,250,p[2]);
   for(let i=0;i<5;i++)circle(c,120+i*175,80+(i%2)*80+Math.sin(t*.2+i)*6,3,p[1]);break;
  case 'heart':
   circle(c,650,550,400,p[3]);circle(c,650,550,275,p[0]);
   ring(c,650,550,340,340,0,p[1],3);
   for(let i=0;i<3;i++){c.beginPath();c.moveTo(-60,620+i*55);c.bezierCurveTo(290,620+i*55,310,310+i*55,520,430+i*55);c.bezierCurveTo(700,650+i*55,810,430+i*55,1100,450+i*55);c.strokeStyle=i===1?p[1]:p[2];c.lineWidth=i===1?4:30;c.stroke();}break;
  case 'cardio':case 'hrv':
   polygon(c,[[-100,430],[1100,180],[1100,510],[-100,760]],p[3]);
   stroke(c,[[-50,680],[190,680],[290,400],[410,850],[550,110],[690,680],[1100,680]],p[2],80);break;
  case 'morning':case 'energy':case 'nutrition':
   circle(c,600,470,480,p[2]);for(let i=0;i<8;i++){c.save();c.translate(600,470);c.rotate(i*TAU/8+t*.02);rect(c,500,-16,210,32,p[3]);c.restore();}break;
  default:
   circle(c,790,530,510,p[2]);polygon(c,[[-100,750],[1100,50],[1100,430],[-100,1100]],p[3]);
 }
 c.restore();
}
export function editorialPhoto(c,b,s,assets,t,depth){
 const k=s.template,drift=Math.sin(t*.30)*.008;
 const landscape=['cover','longest','elevation','hiking','skiing'].includes(k)||(k==='cycling'&&s.presentation==='distance');
 if(landscape){
  if(depth==='rear')cutout(c,assets.ridge,b,.49,k==='cover'?.35:.42,1.45,0);
  else if(['longest','cycling'].includes(k))cutout(c,assets['road-ribbon'],b,.64+drift,.69,.57,-.3);
  else if(k==='hiking'&&s.presentation!=='distance')cutout(c,assets.boot,b,.44,.66,.67,-.2);
  else if(k==='skiing')cutout(c,assets.skis,b,.53,.59,.91,.13);
  return;
 }
 if(k==='running'){
  if(depth==='rear')photoFill(c,assets.track,b,[[0,.35],[1,.04],[1,1],[0,1]],Math.sin(t*.2)*2);
  else if(s.presentation!=='distance')cutout(c,assets.shoe,b,.53+drift,.51,.98,-.28);
  return;
 }
 if(depth==='rear')return;
 if(k==='heart')return;
 const settings={cycling:['crank',.56,.55,1.03,.18],miniwatt:['crank',.55,.55,1.05,-.14],hiit:['kettlebell',.53,.56,.85,.08],strength:['dumbbell',.53,.52,1.09,-.27],walking:['shoe',.52,.55,1.00,.15],active:['stairs',.53,.53,.91,.03],swimming:['goggles',.51,.51,1.14,-.3],rowing:['oar',.5,.5,1.2,.55],yoga:['mat',.48,.66,.91,-.10],pilates:['ball',.58,.51,.93,0],elliptical:['elliptical',.52,.58,.91,-.06],golf:['golf',.47,.5,1.1,-.16],racket:['racket',.5,.56,1.1,.24],team_sports:['football',.58,.53,.80,.10],climbing:['carabiner',.52,.54,.94,-.18],cardio:['rope',.51,.6,1.06,.1],heart:['kettlebell',.53,.56,.83,-.14],sleep:['pillow',.55,.62,.97,.16],recovery:['bench',.52,.60,1.05,0],morning:['clock',.55,.55,.85,-.12],energy:['orange',.52,.55,.88,.14],nutrition:['orange',.52,.55,.90,-.1],hydration:['water',.55,.6,.9,-.12],hrv:['water',.55,.6,.90,.1]};
 if(['mix','finale','triathlon'].includes(k)){
  const names=k==='triathlon'?['goggles','crank','shoe']:['shoe','crank','dumbbell'];
  names.forEach((name,i)=>cutout(c,assets[name],b,[.28,.76,.48][i],[.28,.43,.78][i]+(i===2?0:Math.sin(t*.2+i)*.008),.65,i%2?.2:-.25));return;
 }
 const q=settings[k];if(!q)return;
 const grounded=['strength','hiit','yoga','pilates','recovery','heart'].includes(k);
 // The important part of each object stays above the caption cutout. The
 // photograph's aspect ratio is preserved; only position, scale and angle vary.
 const refinements={swimming:[.51,.42,.86,-.13],rowing:[.50,.43,.93,.04],golf:[.46,.45,.86,-.10],yoga:[.49,.56,.82,-.10],pilates:[.58,.51,.85,0],racket:[.55,.53,.96,.20],walking:[.52,.51,.91,.11],elliptical:[.53,.58,.85,-.06],sleep:[.55,.57,.90,.16]};
 const z=refinements[k]||[q[1],q[2]+(k==='cycling'?.13:.08),q[3],q[4]];
 cutout(c,assets[q[0]],b,z[0]+(grounded?0:drift*.5),z[1]+(grounded?0:drift),z[2],z[3]+(grounded?0:Math.sin(t*.23)*.012));
}
export function editorialFrame(c,w,h,s,p,time=0){
 if(s.template!=='cover'||s.chart)return;
 c.save();circle(c,w*.99,h*.12,w*.52,p[2]);
 polygon(c,[[w*.75,h*.24],[w*1.2,h*.22],[w*1.2,h*.44],[w*.75,h*.34]],p[3]);c.restore();
}
export function editorialMotion(c,b,s,p,t,front){
 // Each family has its own movement, kept away from stationary measurements.
 const k=s.id?.startsWith('other-')?'other':s.template;
 c.save();space(c,b);const u=(t*.045)%1,a=t*.3;
 if(!front){
  if(k==='strength')rect(c,1050-u*1400,475,130,7,p[1]);
  else if(k==='hiit')ring(c,530,520,260+Math.sin(t*.7)*14,260+Math.sin(t*.7)*14,0,p[1],3);
  else if(k==='pilates')ring(c,670,420,480,490,Math.sin(t*.23)*.06,p[3],5,.2,2.8);
  c.restore();return;
 }
 if(k==='running'){
  const v=1-u;c.globalAlpha*=Math.sin(u*Math.PI)**2;
  circle(c,-100*v**3+3*500*v*v*u+3*730*v*u*u+1120*u**3,862*v**3+3*1022*v*v*u+3*652*v*u*u+682*u**3,10,p[1]);
 }
 else if(['cycling','miniwatt'].includes(k))ring(c,760,520,360,360,0,p[1],5,a,a+1.1);
 else if(['hiking','elevation','climbing','longest','cover'].includes(k)){
  const x=250+u*570,y=960-u*770;c.globalAlpha*=Math.min(1,u*12,(1-u)*12);circle(c,x,y,10,p[1]);
 }else if(k==='elliptical'){const x=270*Math.cos(a),y=600*Math.sin(a);circle(c,300+x*Math.cos(-.4)-y*Math.sin(-.4),710+x*Math.sin(-.4)+y*Math.cos(-.4),14,p[1]);}
 else if(k==='golf'){c.globalAlpha*=Math.sin(u*Math.PI)**2;ring(c,800,450,260+u*100,270+u*100,0,p[1],3);}
 else if(k==='skiing'){c.globalAlpha*=Math.sin(u*Math.PI)**2;stroke(c,[[650-u*600,80+u*800],[680-u*600,30+u*800]],p[1],5);}
 else if(k==='team_sports')circle(c,550+Math.sin(a)*230,500+Math.cos(a)*170,10,p[3]);
 else if(k==='triathlon')for(let i=0;i<3;i++)stroke(c,[[u*1400-200,300+i*280],[u*1400-70,260+i*280]],p[0],7);
 else if(['walking','active'].includes(k)){for(let i=0;i<4;i++){c.save();c.globalAlpha*=Math.max(0,Math.sin(u*TAU-i*Math.PI/2))**3;rect(c,100+i*230,890-i*190,80,7,p[1]);c.restore();}}
 else if(k==='heart'){ring(c,650,550,340,340,0,p[0],10,-a,-a+.45);}
 else if(['cardio','hrv'].includes(k)){c.globalAlpha*=Math.sin(u*Math.PI)**2;circle(c,100+u*800,680-Math.sin(u*TAU)*80,12,p[1]);}
 else if(k==='other'){c.globalAlpha*=Math.sin(u*Math.PI)**2;stroke(c,[[100+u*700,780-u*400],[230+u*700,700-u*400]],p[1],5);}
 c.restore();
}
const textures=new WeakMap();
export function printTexture(c,w,h){
 // A fixed, tiny plate texture: no animation noise or per-frame random allocation.
 if(!textures.has(c)){
  const tile=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(96,96):c.canvas.ownerDocument?.createElement('canvas');if(!tile)return;
  tile.width=tile.height=96;const g=tile.getContext('2d');let seed=17;
  for(let i=0;i<650;i++){seed=(seed*16807)%2147483647;const x=seed%96;seed=(seed*16807)%2147483647;g.fillStyle=i%2?'#ffffff':'#000000';g.fillRect(x,seed%96,1,1);}
  textures.set(c,c.createPattern(tile,'repeat'));
 }
 c.save();c.globalAlpha=.022;c.fillStyle=textures.get(c);c.fillRect(0,0,w,h);c.restore();
}
