// Sport-specific outlines for the dot design (card space 360 × 640, artwork between y≈290 and y≈600).
// A shape has `slots` (strokes that your data dots fill, in order; the rest stay grey) and `decor`
// (faint guide strokes that only draw the object). Shapes never encode a measurement themselves.
const TAU=Math.PI*2;
export function circ(cx,cy,r,n=96,a0=0,a1=TAU){const o=[],full=Math.abs(a1-a0)>=TAU-1e-6,m=full?n:n+1;for(let i=0;i<m;i++){const a=a0+(a1-a0)*i/n;o.push([cx+r*Math.sin(a),cy-r*Math.cos(a)]);}return o;}
export function ell(cx,cy,rx,ry,n=96,rot=0){const o=[],c=Math.cos(rot),s=Math.sin(rot);for(let i=0;i<n;i++){const a=i/n*TAU,x=rx*Math.sin(a),y=-ry*Math.cos(a);o.push([cx+x*c-y*s,cy+x*s+y*c]);}return o;}
export function rr(x,y,w,h,r){const o=[],q=(cx,cy,a0)=>{for(let i=0;i<=6;i++){const a=a0+i/6*Math.PI/2;o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}};q(x+w-r,y+r,-Math.PI/2);q(x+w-r,y+h-r,0);q(x+r,y+h-r,Math.PI/2);q(x+r,y+r,Math.PI);return o;}
function rotPts(P,cx,cy,a){const c=Math.cos(a),s=Math.sin(a);return P.map(([x,y])=>[cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);}
// smooth a polyline with quadratic corners
export function smooth(P,rad,closed){
 const Q=closed?[P[P.length-1],...P,P[0]]:P,o=closed?[]:[Q[0]];
 for(let i=1;i<Q.length-1;i++){
  const a=Q[i-1],b=Q[i],c=Q[i+1],d1=Math.hypot(b[0]-a[0],b[1]-a[1]),d2=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(rad,d1/2,d2/2);
  const p1=[b[0]+(a[0]-b[0])*r/d1,b[1]+(a[1]-b[1])*r/d1],p2=[b[0]+(c[0]-b[0])*r/d2,b[1]+(c[1]-b[1])*r/d2];
  for(let k=0;k<=6;k++){const t=k/6,u=1-t;o.push([u*u*p1[0]+2*u*t*b[0]+t*t*p2[0],u*u*p1[1]+2*u*t*b[1]+t*t*p2[1]]);}
 }
 if(!closed)o.push(Q[Q.length-1]);return o;
}
const S=(P,closed=false,extra={})=>({P,closed,...extra});
const CENTER={x:180,y:0};

/* ---------- bicycle (side view) ---------- */
const BIKE={rear:[96,486],front:[266,486],r:66,bb:[176,494],seat:[150,392],head:[238,396],headLow:[246,420]};
function bikeFrame(){
 const {rear,front,bb,seat,head,headLow}=BIKE;
 return [S([rear,bb]),S([bb,seat]),S([seat,rear]),S([seat,head]),S([bb,headLow]),S([headLow,head]),S([headLow,front]),
  S([[130,382],[170,380]]),S([[150,392],[148,382]]),
  S([head,[242,378],[262,374],[270,388],[264,398]]),S(circ(bb[0],bb[1],11,18),true)];
}
function spokes([cx,cy],r,n=12){const o=[];for(let k=0;k<n;k++){const a=k/n*TAU;o.push(S([[cx+6*Math.sin(a),cy-6*Math.cos(a)],[cx+r*Math.sin(a),cy-r*Math.cos(a)]]));}return o;}

/* ---------- running shoe (side view, toe right) ---------- */
export const SHOE=smooth([[56,552],[300,554],[338,544],[344,522],[326,506],[282,494],[242,476],[212,454],[200,428],[186,412],[168,414],[160,440],[132,436],[100,424],[72,432],[58,466],[52,516]],16,true);
const SHOE_DECOR=[S([[60,534],[334,536]]),S([[214,446],[232,436]]),S([[228,462],[246,452]]),S([[244,476],[262,466]]),S(smooth([[110,500],[170,480],[230,500],[290,520]],30,false))];

/* ---------- hours: one shape per sport ---------- */
// label: 'center' puts the minutes/average stats inside the shape; otherwise they sit in a row under it.
export const HOURS={
 running:()=>({ // a 400 m track: the outer lane fills, inner lanes and the start line draw the stadium
  slots:[S(stadium(104),true)],decor:[S(stadium(92),true),S(stadium(80),true),S(stadium(68),true),S([[180,512],[180,546]])],label:{x:180,y:396}}),
 cycling:()=>{ // a chainring and crank: the ring fills, teeth and bolts draw it
  const c=[186,420],teeth=[];for(let k=0;k<34;k++){const a=k/34*TAU;teeth.push(S([[c[0]+108*Math.sin(a),c[1]-108*Math.cos(a)],[c[0]+118*Math.sin(a+.04),c[1]-118*Math.cos(a+.04)]]));}
  return {slots:[S(circ(c[0],c[1],100,140),true,{rot:[c[0],c[1],0.12]})],decor:[...teeth.map(t=>({...t,rot:[c[0],c[1],0.12]})),S(circ(c[0],c[1],70,60),true,{rot:[c[0],c[1],0.12]}),S([[c[0],c[1]],[64,560]]),S(rr(40,552,52,16,6),true)],label:{x:186,y:388}};
 },
 hiit:()=>{ // an interval timer: work segments fill, the case and buttons draw the timer
  const c=[180,436],segs=[];for(let k=0;k<12;k++){const a0=k/12*TAU+.05,a1=a0+TAU/12*.72;segs.push(S(circ(c[0],c[1],110,18,a0,a1)));}
  return {slots:segs,decor:[S(circ(c[0],c[1],124,110),true),S(rr(164,290,32,20,5),true),S([[180,310],[180,312]]),S(rotPts(rr(268,314,24,16,4),280,322,.75),true)],label:{x:180,y:404}};
 },
 strength:()=>({ // a kettlebell: handle and bell fill
  slots:[S(smooth([[124,400],[124,336],[150,306],[210,306],[236,336],[236,400]],26,false)),S(circ(180,472,98,120,.72,TAU-.72))],
  decor:[S(smooth([[146,392],[146,346],[162,330],[198,330],[214,346],[214,392]],18,false)),S([[110,560],[250,560]])],label:{x:180,y:440}}),
 walking:()=>({ // a footprint: sole, then toes
  slots:[S(smooth([[180,586],[214,580],[232,548],[236,500],[248,446],[254,396],[236,350],[196,336],[156,348],[134,396],[138,446],[146,500],[146,548],[156,580]],22,true),true),
   ...[[152,316,13],[180,304,11],[204,306,10],[224,316,9],[240,332,8]].map(([x,y,r])=>S(circ(x,y,r,22),true))],
  decor:[],label:{x:190,y:438}}),
 hiking:()=>({ // a hiking boot
  slots:[S(smooth([[70,566],[318,566],[336,548],[330,520],[300,506],[252,490],[238,446],[236,350],[214,322],[148,322],[132,350],[128,410],[96,448],[70,500],[62,540]],14,true),true)],
  decor:[S([[70,548],[332,548]]),...[0,1,2,3].map(i=>S([[214,348+i*30],[236,348+i*30]])),S([[150,322],[150,300],[214,300],[214,322]])],label:null}),
 swimming:()=>{ // a pool from above: each lane fills like a length
  const lanes=[];for(let i=0;i<5;i++){const y=330+i*46,l=[[56,y],[304,y]];lanes.push(S(i%2?l.reverse():l));}
  return {slots:lanes,decor:[S(rr(36,306,288,232,14),true),S([[56,307],[56,537]]),S([[304,307],[304,537]])],label:null};
 },
 rowing:()=>{ // an oar: shaft, then blade
  const shaft=[[64,566],[228,348]],blade=smooth([[228,348],[246,300],[270,286],[290,296],[288,326],[260,360],[228,348]],14,false);
  return {slots:[S(shaft),S(blade)],decor:[S([[52,582],[76,550]]),S([[86,536],[100,518]]),S(ell(200,560,120,14,60),true)],label:{x:330,y:430,anc:'r'}};
 },
 yoga:()=>({ // a mat, rolled at the top
  slots:[S(rr(84,332,192,252,10),true)],decor:[S(ell(180,322,100,16,60),true),S(ell(180,322,88,10,50),true),S([[100,560],[260,560]])],label:{x:180,y:430}}),
 pilates:()=>({ // a Pilates ring with pads
  slots:[S(circ(180,436,110,140),true)],decor:[S(rr(48,402,30,68,10),true),S(rr(282,402,30,68,10),true),S(circ(180,436,98,120),true)],label:{x:180,y:404}}),
 elliptical:()=>({ // an elliptical trainer: the pedal orbit fills
  slots:[S(ell(196,506,112,40,120,-.18),true)],decor:[S([[196,506],[150,330]]),S([[150,330],[96,350]]),S([[150,330],[214,318]]),S([[40,586],[320,586]]),S([[120,586],[150,540]]),S([[272,586],[262,530]]),S(rr(100,520,40,10,4),true),S(rr(250,486,40,10,4),true)],label:{x:330,y:330,anc:'r'}}),
 skiing:()=>({ // crossed skis and poles
  slots:[S(rotPts(rr(36,410,288,18,9),180,419,-.42),true),S(rotPts(rr(36,410,288,18,9),180,419,.42),true)],
  decor:[S([[110,560],[150,300]]),S([[250,560],[210,300]]),S(circ(114,532,10,16),true),S(circ(246,532,10,16),true)],label:null}),
 golf:()=>{ // a ball on a tee
  const dimples=[];for(let y=330;y<480;y+=22)for(let x=110+((y-330)/22%2)*11;x<260;x+=22)if(Math.hypot(x-180,y-400)<78)dimples.push(S(circ(x,y,4,8),true));
  return {slots:[S(circ(180,400,96,130),true)],decor:[...dimples,S([[160,500],[200,500],[188,520],[184,566],[176,566],[172,520]],true)],label:null};
 },
 racket:()=>{ // a racket: head, throat, handle
  const strings=[];for(let x=126;x<=234;x+=18)strings.push(S([[x,300+Math.abs(x-180)*.5],[x,460-Math.abs(x-180)*.5]]));for(let y=300;y<=460;y+=20)strings.push(S([[120+Math.abs(y-380)*.35,y],[240-Math.abs(y-380)*.35,y]]));
  return {slots:[S(ell(180,380,72,96,120),true),S([[154,468],[174,512],[186,512],[206,468]]),S(rr(170,512,20,72,6),true)],decor:strings,label:null};
 },
 triathlon:()=>({ // swim, bike, run: three rings
  slots:[S(circ(108,446,62,80),true),S(circ(180,376,62,80),true),S(circ(252,446,62,80),true)],decor:[S(circ(108,446,52,60),true),S(circ(180,376,52,60),true),S(circ(252,446,52,60),true)],label:null}),
 team_sports:()=>({ // a pitch
  slots:[S(rr(36,316,288,224,4),true)],decor:[S([[180,316],[180,540]]),S(circ(180,428,34,40),true),S(rr(36,384,40,88,0),true),S(rr(284,384,40,88,0),true),S(circ(180,428,3,6),true)],label:null}),
 climbing:()=>({ // a carabiner
  slots:[S(smooth([[146,310],[222,302],[262,330],[270,420],[258,540],[222,578],[164,580],[128,546],[118,420],[122,340]],40,true),true)],
  decor:[S([[132,452],[146,328]]),S(circ(150,320,6,10),true),S(smooth([[160,330],[206,326],[234,348],[240,420],[230,530],[204,556],[172,556],[148,528],[142,452]],30,false))],label:null}),
 cardio:()=>({ // a heart
  slots:[S(heart(180,420,118),true)],decor:[S(heart(180,420,104),true)],label:{x:180,y:400}}),
 other:()=>({ // a star
  slots:[S(star(180,430,130,56),true)],decor:[S(star(180,430,116,48),true)],label:null})
};
function stadium(r){const o=[],L=120;for(let i=0;i<=16;i++)o.push([180-L/2+L*i/16,436+r]);for(let i=1;i<32;i++){const a=Math.PI/2-i/32*Math.PI;o.push([180+L/2+r*Math.cos(a),436+r*Math.sin(a)]);}for(let i=0;i<=16;i++)o.push([180+L/2-L*i/16,436-r]);for(let i=1;i<32;i++){const a=-Math.PI/2-i/32*Math.PI;o.push([180-L/2+r*Math.cos(a),436+r*Math.sin(a)]);}return o;}
function heart(cx,cy,s){const o=[];for(let i=0;i<160;i++){const t=i/160*TAU,x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);o.push([cx+x/16.5*s,cy-(y+2)/16.5*s]);}return o;}
function star(cx,cy,R,r){const o=[];for(let i=0;i<10;i++){const a=i/10*TAU,q=i%2?r:R;o.push([cx+q*Math.sin(a),cy-q*Math.cos(a)]);}return smooth(o,6,true);}

/* ---------- sessions shapes where the design called for an object ---------- */
export const SESSIONS={
 cycling:(n=Infinity)=>{ // a bike whose wheel rims are made of your rides; inner rims only when needed
  const {rear,front,r}=BIKE,slots=[],perRing=Math.floor(TAU*r/8.5)*2,rings=n<=perRing?1:n<=perRing*1.85?2:3;
  for(const rad of [r,r-8,r-16].slice(0,rings))for(const w of [rear,front])slots.push(S(circ(w[0],w[1],rad,120),true,{rot:[w[0],w[1],0.5]}));
  return {slots,decor:[...bikeFrame(),...spokes(rear,r-20).map(s=>({...s,rot:[rear[0],rear[1],0.5]})),...spokes(front,r-20).map(s=>({...s,rot:[front[0],front[1],0.5]}))],label:null,minPitch:8.5};
 },
 strength:()=>({ // a dumbbell outline, traced by your sessions
  slots:[S(rr(28,352,48,156,12),true),S(rr(80,374,30,112,8),true),S([[110,414],[250,414]]),S(rr(250,374,30,112,8),true),S(rr(284,352,48,156,12),true),S([[250,446],[110,446]])],
  decor:[S([[40,560],[320,560]])],label:null,move:'lift'})
};
/* ---------- floors climbed: a switchback stairwell, filled from the ground up ---------- */
export const FLOORS={
 stairwell:()=>{
  const flights=4,rise=72,steps=5,run=40,x0=80,x1=x0+steps*run,P=[[x0-24,584]];let y=584;
  for(let f=0;f<flights;f++){const right=f%2===0;for(let k=0;k<steps;k++){const x=right?x0+k*run:x1-k*run;P.push([x,y]);y-=rise/steps;P.push([x,y]);}const end=right?x1:x0;P.push([end+(right?30:-30),y]);}
  const rails=[];y=584;for(let f=0;f<flights;f++){const right=f%2===0,ya=y-30,yb=y-rise-30;rails.push(S(right?[[x0,ya],[x1-run,yb+rise/steps]]:[[x1,ya],[x0+run,yb+rise/steps]]));y-=rise;}
  return {slots:[S(P)],decor:[...rails,S([[x0-28,592],[x1+28,592]]),S([[x0-28,592],[x0-28,y-46]]),S([[x1+28,592],[x1+28,y-46]])],label:null};
 }
};

/* ---------- distance strokes: the stream of distance dots flows along these ---------- */
export const ROUTES={
 cycling:()=>({strokes:[S(circ(...BIKE.rear,BIKE.r,120),true),S(circ(...BIKE.front,BIKE.r,120),true),S([BIKE.rear,BIKE.bb,BIKE.headLow,BIKE.head,BIKE.seat,BIKE.rear],false)],decor:[...bikeFrame(),...spokes(BIKE.rear,BIKE.r-14),...spokes(BIKE.front,BIKE.r-14),S([[20,556],[340,556]])]}),
 running:()=>({strokes:[S(SHOE,true)],decor:SHOE_DECOR}),
 hiking:()=>({strokes:null,decor:[S([[10,566],[70,470],[100,500],[150,380],[190,288],[230,360],[262,330],[300,420],[350,566]]),S([[10,568],[350,568]])]}),
 swimming:()=>({strokes:null,decor:[S(rr(28,294,304,272,14),true)]}),
 rowing:()=>({strokes:null,decor:[S(smooth([[134,258],[160,240],[186,258],[186,292],[160,306],[134,292]],10,true),true),S([[120,274],[200,274]]),...[[120,520],[240,470],[150,380]].map(([x,y])=>S(ell(x,y,30,6,24),true))]}),
 skiing:()=>({strokes:null,decor:[0.12,0.33,0.55,0.76,0.95].map((u,i)=>{const x=180+112*Math.sin(u*3.5*Math.PI)*(0.35+0.65*u),y=272+u*296,d=i%2?1:-1;return S([[x+d*26,y+18],[x+d*26,y-14],[x+d*44,y-8],[x+d*26,y-2]]);})}),
 walking:()=>({strokes:null,decor:[]}),
 triathlon:()=>({strokes:null,decor:[S(circ(108,468,26,30),true),S(circ(180,428,26,30),true),S(circ(252,468,26,30),true)]})
};
void CENTER;
