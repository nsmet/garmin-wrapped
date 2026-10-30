// "One dot per activity" engine (Garmin Wraped dot design, engine v2).
// Pure geometry: it turns a card spec (see dot-spec.mjs) into dots and labels in a
// 360 × 640 card coordinate space. It never reads records or calculates metrics.
//  - data dots: bright, one per activity / hour / km unit, as stated on the card.
//  - guide dots: small and faint; they draw the shape so few data dots still read.
import {HOURS,SESSIONS,ROUTES,FLOORS,rr} from './dot-shapes.mjs';
const TAU=Math.PI*2;
export const COLORS={DIM:'#3E4D74',MID:'#6C7BA0',SOFT:'#CFDDF5',GUIDE:'#5B6C98',NAVY:'#0B1222'};
const {DIM,MID,SOFT,GUIDE}=COLORS;

/* ---------- helpers ---------- */
export function rng(seed){let s=(seed>>>0)%2147483647||7;return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}
function gauss(r){let u=0;while(u===0)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*r());}
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function ease(x){x=clamp(x,0,1);return x*x*(3-2*x);}
const mod=(a,n)=>((a%n)+n)%n;
function pt(x,y,c,s,a,d){return {x,y,z:0,c,s,a:a==null?1:a,d:d==null?-1:d};}
function polyLen(P){const L=[0];for(let i=1;i<P.length;i++){const dx=P[i][0]-P[i-1][0],dy=P[i][1]-P[i-1][1];L.push(L[i-1]+Math.sqrt(dx*dx+dy*dy));}return L;}
function sampler(P,closed){
 if(closed)P=P.concat([P[0]]);
 const L=polyLen(P),T=L[L.length-1]||1;
 const f=u=>{
  u=closed?mod(u,1):clamp(u,0,1);
  const d=u*T;let lo=0,hi=L.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(L[m]<=d)lo=m;else hi=m;}
  const seg=(L[hi]-L[lo])||1,k=(d-L[lo])/seg;
  return [P[lo][0]+(P[hi][0]-P[lo][0])*k,P[lo][1]+(P[hi][1]-P[lo][1])*k];
 };
 f.len=T;return f;
}
function fnLen(fn){let l=0,a=fn(0);for(let i=1;i<=300;i++){const b=fn(i/300);l+=Math.hypot(b[0]-a[0],b[1]-a[1]);a=b;}return l;}
function along(P,n,closed){const s=sampler(P,closed),o=[];for(let i=0;i<n;i++)o.push(s(closed?i/n:(n===1?0.5:i/(n-1))));return o;}
function byPitch(P,pitch,closed){const s=sampler(P,closed);return along(P,Math.max(2,Math.round(s.len/pitch)),closed);}
function circle(cx,cy,r,n,a0){const o=[];for(let i=0;i<n;i++){const a=(a0||0)+i/n*TAU;o.push([cx+r*Math.sin(a),cy-r*Math.cos(a)]);}return o;}
function ellipse(cx,cy,rx,ry,n,rot){const o=[],c=Math.cos(rot||0),s=Math.sin(rot||0);for(let i=0;i<n;i++){const a=i/n*TAU,x=rx*Math.sin(a),y=-ry*Math.cos(a);o.push([cx+x*c-y*s,cy+x*s+y*c]);}return o;}
function sunflower(cx,cy,rx,ry,n){if(n===1)return [[cx,cy]];const o=[],ga=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const rr=Math.sqrt((i+0.5)/n),a=i*ga;o.push([cx+rr*rx*Math.cos(a),cy+rr*ry*Math.sin(a)]);}return o;}
function sunN(cx,cy,n,pitch,sq){const R=pitch*Math.sqrt(n/Math.PI)*1.05;return sunflower(cx,cy,R,R*(sq||1),n);}
function line(a,b,n){const o=[];for(let i=0;i<n;i++){const k=n===1?0.5:i/(n-1);o.push([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]);}return o;}
function lineP(a,b,pitch){return line(a,b,Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/pitch)+1));}
function roundPath(P,rad,steps){
 const o=[P[0]];
 for(let i=1;i<P.length-1;i++){
  const a=P[i-1],b=P[i],c=P[i+1],d1=Math.hypot(b[0]-a[0],b[1]-a[1]),d2=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(rad,d1/2,d2/2);
  const p1=[b[0]+(a[0]-b[0])*r/d1,b[1]+(a[1]-b[1])*r/d1],p2=[b[0]+(c[0]-b[0])*r/d2,b[1]+(c[1]-b[1])*r/d2];
  for(let k=0;k<=(steps||8);k++){const t=k/(steps||8),u=1-t;o.push([u*u*p1[0]+2*u*t*b[0]+t*t*p2[0],u*u*p1[1]+2*u*t*b[1]+t*t*p2[1]]);}
 }
 o.push(P[P.length-1]);return o;
}
function rot(cx,cy,w){return(p,t,o)=>{const a=t*w,c=Math.cos(a),s=Math.sin(a),dx=p.x-cx,dy=p.y-cy;o.x=cx+dx*c-dy*s;o.y=cy+dx*s+dy*c;};}
function spinXY(o,cx,cy,a){const c=Math.cos(a),s=Math.sin(a),dx=o.x-cx,dy=o.y-cy;o.x=cx+dx*c-dy*s;o.y=cy+dx*s+dy*c;}
export function fmt(v,dec){return v.toLocaleString('en-US',{minimumFractionDigits:dec||0,maximumFractionDigits:dec||0});}
function fadeEnds(u){return clamp(Math.min(u,1-u)/0.07,0,1);}
const sum=a=>a.reduce((x,y)=>x+y,0);

/* data-dot size: big when there are few, never so big that neighbours touch */
function rD(n){return clamp(5.2-1.05*Math.log10(Math.max(1,n)),2.4,5.2);}
function sz(n,pitch){return Math.max(1.6,Math.min(rD(n),pitch*0.34));}
function data(x,y,c,s,a){const p=pt(x,y,c,s,a);p.dat=1;return p;}
function datas(pts,arr,c,s,a,extra){arr.forEach(q=>{const p=data(q[0],q[1],c,s,a);if(extra)extra(p);pts.push(p);});}
function guide(x,y,c,s,a){const p=pt(x,y,c||GUIDE,s||1.25,a==null?0.5:a);p.g=1;return p;}
function guides(pts,arr,c,s,a,extra){arr.forEach(q=>{const p=guide(q[0],q[1],c,s,a);if(extra)extra(p);pts.push(p);});}

/* pick the smallest unit that keeps a card readable */
export function autoUnit(v,cands,maxDots){for(const c of cands)if(v/c<=maxDots)return c;return cands[cands.length-1];}
export function fracDots(v,unit){const exact=v/unit,full=Math.floor(exact+1e-9),fr=exact-full;return {full,fr,total:Math.max(1,full+(fr>0.05?1:0)),partial:fr>0.05};}
export function stepUnit(steps){return autoUnit(steps,[1000,2000,5000,10000,20000,50000,100000],700);}
export function kmText(u){return u<1?fmt(u*1000)+' M':fmt(u)+' KM';}
/* one dot per activity, unless a year is so large the dots would fuse */
export function activityUnit(n){return autoUnit(n,[1,2,5,10,20,50,100],2400);}

/* even fill of any shape: hex grid, pitch shrinks until it holds n */
function hexFill(inside,box,n,order){
 let pitch=Math.min(30,Math.sqrt((box[2]-box[0])*(box[3]-box[1])/Math.max(1,n))),P=[];
 for(let it=0;it<90;it++){
  P=[];const h=pitch*0.866;
  for(let y=box[1]+h/2,r=0;y<box[3];y+=h,r++)for(let x=box[0]+(r%2?pitch*0.75:pitch*0.25);x<box[2];x+=pitch)if(inside(x,y))P.push([x,y]);
  if(P.length>=n)break;pitch*=0.95;
 }
 if(order)P.sort((a,b)=>order(a)-order(b));
 return {P:P.slice(0,n),pitch};
}

/* ---------- count motifs: one bright dot per session of this sport, guide dots draw the sport ---------- */
const CX=180,CY=420;
function oval(r,s,o){
 const P=240+TAU*r,d=mod(s,1)*P;let x,y;
 if(d<120){x=120+d;y=CY+r;}
 else if(d<120+Math.PI*r){const f=Math.PI/2-(d-120)/r;x=240+r*Math.cos(f);y=CY+r*Math.sin(f);}
 else if(d<240+Math.PI*r){x=240-(d-120-Math.PI*r);y=CY-r;}
 else{const g=-Math.PI/2-(d-240-Math.PI*r)/r;x=120+r*Math.cos(g);y=CY+r*Math.sin(g);}
 o.x=x;o.y=y;
}
/* spread n across slots with capacities, filling the first slots first */
function fillCaps(n,caps){
 const out=caps.map(()=>0),tot=sum(caps);let left=n;
 if(n>tot){let acc=0;caps.forEach((c,i)=>{out[i]=i===caps.length-1?n-acc:Math.round(n*c/tot);acc+=out[i];});return out;}
 caps.forEach((c,i)=>{out[i]=Math.min(left,c);left-=out[i];});return out;
}

/* a pool from above: wall + gutter, lane ropes whose floats brighten near the walls, starting blocks on the left */
function pool(pts,[x0,y0,x1,y1],ropes=[],blocks=[]){
 guides(pts,byPitch(rr(x0,y0,x1-x0,y1-y0,12),7,true),MID,1.35,0.7);
 guides(pts,byPitch(rr(x0+7,y0+7,x1-x0-14,y1-y0-14,7),8,true),GUIDE,1.15,0.4);
 for(const y of ropes)for(let x=x0+12;x<=x1-12;x+=6){const near=x<x0+40||x>x1-40;pts.push(guide(x,y,near?SOFT:GUIDE,near?1.35:1.2,near?0.6:0.45));}
 for(const y of blocks)guides(pts,byPitch(rr(x0-13,y-7,15,14,3),5,true),MID,1.25,0.6);
}
export const MOTIF={
 running(n,acc){
  // one snake of runs, nose to tail around the track; a long year continues into the next lane
  const pts=[],lanes=[90,78,66,54],per=r=>240+TAU*r,total=sum(lanes.map(per));
  [48,60,72,84,96].forEach(r=>{const m=Math.round(per(r)/9);for(let j=0;j<m;j++){const p=guide(0,0,GUIDE,1.2,0.45);oval(r,j/m,p);pts.push(p);}});
  const gap=Math.min(Math.max(7.5,sz(n,30)*2.7+1.5),total/n),s=sz(n,gap);let left=n;
  lanes.forEach((r,k)=>{
   const m=k===lanes.length-1?left:Math.min(left,Math.floor(per(r)/gap));left-=m;
   for(let j=0;j<m;j++){const p=data(CX,CY,acc,s);p.r=r;p.s0=0.3+k*0.07-j*gap/per(r);p.v=30/per(r);p.m=(p,t,o)=>oval(p.r,p.s0+t*p.v,o);pts.push(p);}
  });
  return {pts};
 },
 cycling(n,acc){
  const pts=[];
  guides(pts,circle(CX,CY,121,96,0.03),MID,1.5,0.75);
  for(let sp=0;sp<28;sp++){const a=sp/28*TAU,ah=a+(sp%2?0.34:-0.34);guides(pts,line([CX+24*Math.sin(ah),CY-24*Math.cos(ah)],[CX+116*Math.sin(a),CY-116*Math.cos(a)],10),DIM,1.35,0.85);}
  guides(pts,circle(CX,CY,13,12),MID,1.5,0.8);guides(pts,circle(CX,CY,21,18),MID,1.5,0.8);
  const R=[134,143,152,161],cnt=fillCaps(n,R.map(r=>Math.floor(TAU*r/9)));let minP=99;
  R.forEach((r,k)=>{if(cnt[k])minP=Math.min(minP,TAU*r/cnt[k],k?9:99);});
  const s=sz(n,minP);
  R.forEach((r,k)=>{if(cnt[k])datas(pts,circle(CX,CY,r,cnt[k],k*0.05),acc,s);});
  return {pts,move:rot(CX,CY,0.22)};
 },
 hiit(n,acc){
  /* an interval equaliser: guide columns pump work / rest, each session is a bright dot riding a column */
  const pts=[],bars=Math.min(n,30),pitch=Math.min(46,300/bars),cols=clamp(Math.floor(pitch/10),1,3),colP=7,base=552,step=7,rows=30;
  const hiOf=i=>0.55+0.45*(0.5+0.5*Math.sin(i*2.3+0.7));
  const H=(i,t)=>{const ph=mod(t*0.45-i*0.05,1),e=ph<0.6?ease(ph/0.09):1-ease((ph-0.6)/0.14);return 18+(rows*step-30)*hiOf(i)*(0.18+0.82*e);};
  for(let i=0;i<bars;i++){
   const x=CX+(i-(bars-1)/2)*pitch;
   for(let c=0;c<cols;c++)for(let j=0;j<rows;j++){const p=guide(x+(c-(cols-1)/2)*colP,base-j*step,GUIDE,1.3,0.55);p.bi=i;p.j=j;p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;o.ka=p.j*step<=H(p.bi,t)?1:0.12;};pts.push(p);}
  }
  const s=sz(n,Math.min(pitch,13));
  for(let q=0;q<n;q++){const bi=q%bars,st=Math.floor(q/bars),d=data(CX+(bi-(bars-1)/2)*pitch,base,acc,s);d.bi=bi;d.st=st;d.gap=s*2.7+2;d.m=(p,t,o)=>{o.x=p.x;o.y=base-H(p.bi,t)-10-p.st*p.gap;};pts.push(d);}
  return {pts};
 },
 strength(n,acc){
  const pts=[],cy=430,half=Math.ceil(n/2),rx=clamp(Math.sqrt(half)*2.6,9,22),ry=80,ix=[78,282];
  guides(pts,lineP([18,cy],[342,cy],7),MID,1.25,0.6);
  ix.forEach((x,k)=>{
   guides(pts,byPitch(ellipse(x,cy,rx+5,ry+5,120),7.5,true),MID,1.35,0.7);
   const x2=k?x-rx-18:x+rx+18;
   guides(pts,byPitch(ellipse(x2,cy,7,58,90),7.5,true),GUIDE,1.25,0.6);
   guides(pts,lineP([x2+(k?-14:14),cy-14],[x2+(k?-14:14),cy+14],7),GUIDE,1.25,0.6);
  });
  if(n===1)pts.push(data(CX,cy,acc,sz(1,30)));
  else{
   const plate=(x,m)=>{
    const cols=Math.max(1,Math.min(4,Math.round(2*rx/10))),rows=Math.ceil(m/cols),pv=Math.min(16,2*ry*0.9/rows),ph=Math.min(10,(2*rx)/cols),o=[];
    for(let j=0;j<m;j++){const r=Math.floor(j/cols),c=j%cols,inRow=r===rows-1?m-r*cols:cols;o.push([x+(c-(inRow-1)/2)*ph,cy+(r-(rows-1)/2)*pv]);}
    return {P:o,p:Math.min(pv,ph)};
   };
   const L1=plate(ix[0],half),R1=plate(ix[1],n-half),s=sz(n,Math.min(L1.p,R1.p||99));
   datas(pts,L1.P,acc,s);datas(pts,R1.P,acc,s);
  }
  return {pts,move:(p,t,o)=>{o.x=p.x;o.y=p.y+Math.sin(t*1.3)*6;}};
 },
 walking(n,acc){
  const pts=[],F=22,path=u=>[CX+72*Math.sin(u*Math.PI*1.6-0.8),568-u*290],len=fnLen(path);
  for(let f=0;f<F;f++){
   const u=(f+0.5)/F,c=path(u),c2=path(u+0.01);let dx=c2[0]-c[0],dy=c2[1]-c[1];const L=Math.hypot(dx,dy);dx/=L;dy/=L;
   const lx=-dy,ly=dx,side=f%2?1:-1,ox=c[0]+lx*17*side,oy=c[1]+ly*17*side,local=[];
   ellipse(0,0,6.5,11,14).forEach(q=>local.push(q));
   [-5,0,5].forEach(tx=>local.push([tx*side*-1,-16+Math.abs(tx)*0.3]));
   local.forEach(q=>{const p=guide(ox+q[0]*lx+(-q[1])*dx,oy+q[0]*ly+(-q[1])*dy,GUIDE,1.2,0.5);p.d=f*0.05;pts.push(p);});
  }
  const files=n<=26?1:3,perFile=Math.ceil(n/files),pitch=len/perFile,s=sz(n,Math.min(pitch,files>1?9:pitch));
  for(let i=0;i<n;i++){
   const fl=i%files,idx=Math.floor(i/files),p2=data(CX,CY,acc,s);p2.u0=idx/perFile+fl*0.011;p2.off=(fl-(files-1)/2)*9;
   p2.m=(p,t,o)=>{const u=mod(p.u0+t*0.022,1),q=path(u),q2=path(Math.min(1,u+0.004)),ddx=q2[0]-q[0],ddy=q2[1]-q[1],LL=Math.hypot(ddx,ddy)||1;o.x=q[0]-ddy/LL*p.off;o.y=q[1]+ddx/LL*p.off;o.ka=fadeEnds(u);};
   pts.push(p2);
  }
  return {pts};
 },
 hiking(n,acc){
  const pts=[];
  guides(pts,byPitch([[10,566],[70,470],[100,500],[150,380],[190,288],[230,360],[262,330],[300,420],[350,566]],7),DIM,1.4,0.85);
  guides(pts,lineP([10,568],[350,568],8),GUIDE,1.2,0.5);
  guides(pts,[[190,288],[181,298],[199,298],[174,306],[206,306]],SOFT,1.5,0.7);
  const T=roundPath([[120,562],[205,522],[140,482],[208,442],[160,404],[202,366],[176,330],[190,300]],10,6),f=sampler(T,false);
  guides(pts,byPitch(T,8),GUIDE,1.2,0.55);
  const files=n<=40?1:2,per=Math.ceil(n/files),s=sz(n,Math.min(f.len/per,files>1?8:99));
  for(let i=0;i<n;i++){const p=data(CX,CY,acc,s);p.u0=Math.floor(i/files)/per+(i%files)*0.012;p.off=files>1?(i%files?4:-4):0;p.m=(p,t,o)=>{const u=mod(p.u0+t*0.016,1),q=f(u);o.x=q[0]+p.off;o.y=q[1];o.ka=fadeEnds(u);};pts.push(p);}
  return {pts};
 },
 swimming(n,acc){
  /* a pool from above: every session is a swimmer doing lengths in a lane, keeping right so swimmers pass cleanly */
  const pts=[],L=5,top=292,lw=52,x0=26,x1=334,wa=x0+20,wb=x1-20,span=wb-wa,laneY=k=>top+lw/2+k*lw;
  pool(pts,[x0,top,x1,top+L*lw],Array.from({length:L-1},(_,k)=>top+(k+1)*lw),Array.from({length:L},(_,k)=>laneY(k)));
  for(let k=0;k<L;k++){const y=laneY(k);guides(pts,lineP([wa+14,y],[wb-14,y],8),GUIDE,1.15,0.4);for(const x of [wa+14,wb-14])guides(pts,lineP([x,y-9],[x,y+9],6),GUIDE,1.15,0.45);}
  const order=[2,1,3,0,4],cnt=[0,0,0,0,0];for(let i=0;i<n;i++)cnt[order[i%5]]++;
  const maxL=Math.max(...cnt),s=sz(n,Math.min(2*span/maxL,40));
  cnt.forEach((c,k)=>{for(let j=0;j<c;j++){const p=data(0,0,acc,s);p.k=k;p.u0=j/c+k*0.13;p.v=0.045+k*0.004;
   p.m=(p,t,o)=>{const u=mod(p.u0+t*p.v,1),out=u<0.5,f=out?u*2:2-u*2,e=f*f*(3-2*f)*0.12+f*0.88;o.x=wa+e*span;o.y=laneY(p.k)+(out?-7:7)+Math.sin(t*3+p.k+j)*0.8;};pts.push(p);}});
  return {pts};
 },
 rowing(n,acc){
  const pts=[],cy=430,surge=t=>-3*Math.sin(t*1.4);
  guides(pts,byPitch(ellipse(CX,cy,22,116,160),7.5,true),MID,1.35,0.75);
  [[[160,404],[40,372],-1],[[200,404],[320,372],1]].forEach(([piv,tip,sg])=>{
   lineP(piv,tip,6.5).forEach(q=>{const p=guide(q[0],q[1],MID,1.3,0.75);p.piv=piv;p.sg=sg;p.m=(p,t,oo)=>{const a=Math.sin(t*1.4)*0.22*p.sg,c=Math.cos(a),s=Math.sin(a),dx=p.x-p.piv[0],dy=p.y-p.piv[1];oo.x=p.piv[0]+dx*c-dy*s;oo.y=p.piv[1]+dx*s+dy*c+surge(t);};pts.push(p);});
  });
  [[30,368],[330,368]].forEach(c=>{[[12,10],[22,16],[32,22]].forEach(r=>guides(pts,circle(c[0],c[1],r[0],r[1]),GUIDE,1.2,0.45));});
  guides(pts,lineP([CX,552],[136,590],8),GUIDE,1.2,0.45);guides(pts,lineP([CX,552],[224,590],8),GUIDE,1.2,0.45);
  const cols=n<=14?1:n<=30?2:3,rows=Math.ceil(n/cols),pv=Math.min(22,196/rows),ph=9,s=sz(n,Math.min(pv,cols>1?ph:99));
  for(let i=0;i<n;i++){const r=Math.floor(i/cols),c=i%cols,inRow=r===rows-1?n-r*cols:cols,p=data(CX+(c-(inRow-1)/2)*ph,cy+(r-(rows-1)/2)*pv,acc,s);p.m=(p,t,o)=>{o.x=p.x;o.y=p.y+surge(t);};pts.push(p);}
  return {pts,move:(p,t,o)=>{o.x=p.x;o.y=p.y+surge(t);}};
 },
 yoga(n,acc){
  const pts=[],pitch=12,Rc=n===1?0:pitch*Math.sqrt(n/Math.PI)*1.05,r0=Math.max(30,Rc+10);
  const petal=(ang,a0,a1,wmax,cnt,c,al)=>{for(let side=-1;side<=1;side+=2)for(let j=0;j<cnt;j++){const t=j/(cnt-1),r=a0+(a1-a0)*t,w=wmax*Math.sin(Math.PI*t)*side,a=ang+w;pts.push(guide(CX+r*Math.sin(a),CY-r*Math.cos(a),c,1.3,al));}};
  for(let k=0;k<8;k++)petal(k/8*TAU,r0,r0+84,0.3,14,MID,0.7);
  for(let q=0;q<8;q++)petal(q/8*TAU+TAU/16,r0-4,r0+36,0.22,6,GUIDE,0.55);
  guides(pts,circle(CX,CY,r0+104,84),GUIDE,1.2,0.5);
  datas(pts,sunN(CX,CY,n,pitch),acc,sz(n,pitch));
  return {pts,move:(p,t,o)=>{const a=t*0.05,sc=1+0.03*Math.sin(t*1.05),c=Math.cos(a),s=Math.sin(a),dx=(p.x-CX)*sc,dy=(p.y-CY)*sc;o.x=CX+dx*c-dy*s;o.y=CY+dx*s+dy*c;}};
 },
 pilates(n,acc){
  const pts=[],half=Math.ceil(n/2),pitch=10,pr=n<=2?10:pitch*Math.sqrt(half/Math.PI)*1.05+7;
  guides(pts,circle(CX,CY,104,70),MID,1.4,0.75);guides(pts,circle(CX,CY,114,76),GUIDE,1.3,0.6);
  [CX-124,CX+124].forEach(x=>guides(pts,circle(x,CY,pr+3,Math.max(12,Math.round(TAU*(pr+3)/7))),MID,1.3,0.7));
  datas(pts,sunN(CX-124,CY,half,pitch),acc,sz(n,pitch));
  if(n-half)datas(pts,sunN(CX+124,CY,n-half,pitch),acc,sz(n,pitch));
  return {pts,move:(p,t,o)=>{const sx=1-0.07*(0.5+0.5*Math.sin(t*1.3));o.x=CX+(p.x-CX)*sx;o.y=p.y;}};
 },
 elliptical(n,acc){
  /* another turn: every session is a bright dot circling one ring; a big year adds rings outside it */
  const pts=[],R=[112,122,132,142],cnt=fillCaps(n,R.map(r=>Math.floor(TAU*r/9)));let minP=99;
  guides(pts,circle(CX,CY,100,Math.round(TAU*100/7)),GUIDE,1.25,0.55);
  R.forEach((r,k)=>{if(cnt[k])minP=Math.min(minP,TAU*r/cnt[k],k?9:99);});
  const s=sz(n,Math.min(minP,40));
  R.forEach((r,k)=>{if(!cnt[k])return;guides(pts,circle(CX,CY,r,Math.round(TAU*r/7)),GUIDE,1.2,0.45);datas(pts,circle(CX,CY,r,cnt[k],k*0.05),acc,s);});
  return {pts,move:rot(CX,CY,0.18),rotOnlyData:true};
 },
 skiing(n,acc,rnd){
  const pts=[],spin=rot(CX,CY,0.08);
  for(let k=0;k<6;k++){
   const a=k/6*TAU,dir=[Math.sin(a),-Math.cos(a)];
   guides(pts,lineP([CX+dir[0]*16,CY+dir[1]*16],[CX+dir[0]*130,CY+dir[1]*130],7),SOFT,1.3,0.55);
   [[52,30],[92,22]].forEach(b=>{const base=[CX+dir[0]*b[0],CY+dir[1]*b[0]];[-0.9,0.9].forEach(off=>{const a2=a+off;guides(pts,lineP(base,[base[0]+Math.sin(a2)*b[1],base[1]-Math.cos(a2)*b[1]],7),SOFT,1.25,0.5);});});
  }
  guides(pts,circle(CX,CY,16,14),SOFT,1.3,0.55);
  const depth=Math.ceil(n/6),pr=Math.min(13,118/Math.max(1,depth)),s=sz(n,Math.min(pr,TAU*(140-(depth-1)*pr)/6));
  for(let i=0;i<n;i++){const arm=i%6,dd=Math.floor(i/6),aa=arm/6*TAU,r=140-dd*pr;pts.push(data(CX+Math.sin(aa)*r,CY-Math.cos(aa)*r,acc,s));}
  pts.forEach(p=>{p.m=spin;});
  for(let w=0;w<50;w++){const sn=guide(rnd()*360,250+rnd()*320,SOFT,1.1,0.35);sn.y0=sn.y;sn.m=(p,t,o)=>{o.x=p.x+Math.sin(t+p.y0)*4;o.y=250+mod(p.y0-250+t*14,320);};pts.push(sn);}
  return {pts};
 },
 golf(n){
  const pts=[],hole=[212,500];
  guides(pts,sunflower(CX,505,146,52,150),'#3F6150',1.3,0.6);
  guides(pts,byPitch(ellipse(CX,505,158,62,200),7.5,true),'#4E7A62',1.35,0.75);
  guides(pts,circle(hole[0],hole[1],6,10),MID,1.4,0.8);
  guides(pts,lineP([hole[0],494],[hole[0],300],6.5),SOFT,1.25,0.65);
  for(let r=0;r<6;r++){const w=6-r;for(let c=0;c<w;c++){const p=guide(hole[0]+6+c*9.5,304+r*7,'#C8F56A',1.4,0.65);p.m=(p,t,o)=>{const k=(p.x-hole[0])/60;o.x=p.x;o.y=p.y+Math.sin(t*3-(p.x-hole[0])*0.12)*4*k;};pts.push(p);}}
  const pitch=18,P=n===1?[[hole[0]-22,hole[1]+6]]:sunN(hole[0]-40,hole[1]+4,n,pitch,0.55);
  datas(pts,P,'#FFFFFF',sz(n,pitch*0.5));
  return {pts};
 },
 racket(n,acc){
  const pts=[];
  guides(pts,byPitch([[60,300],[300,300],[300,560],[60,560]],7,true),MID,1.3,0.7);
  [[[84,300],[84,560]],[[276,300],[276,560]],[[84,365],[276,365]],[[84,495],[276,495]],[[180,365],[180,495]]].forEach(l=>guides(pts,lineP(l[0],l[1],7),GUIDE,1.25,0.55));
  guides(pts,lineP([40,430],[320,430],5.5),SOFT,1.3,0.6);
  /* each ball is a rally loop at constant speed: over the net on a high arc, back on a low one; its tail is evenly spaced */
  const balls=Math.ceil(n/12),q2=(A,B,C,u)=>{const v=1-u;return [v*v*A[0]+2*v*u*B[0]+u*u*C[0],v*v*A[1]+2*v*u*B[1]+u*u*C[1]];};let left=n;
  for(let b=0;b<balls;b++){
   const cnt=Math.ceil(left/(balls-b));left-=cnt;
   const A=[96+(b%3)*30,548-(b%2)*30],C=[264-(b%3)*24,320+(b%2)*20],B1=[(A[0]+C[0])/2-40,262+(b%3)*10],B2=[(A[0]+C[0])/2+50,420+(b%2)*16],loop=[];
   for(let k=0;k<=60;k++)loop.push(q2(A,B1,C,k/60));
   for(let k2=1;k2<60;k2++)loop.push(q2(C,B2,A,k2/60));
   const s=sz(n,24),f=sampler(loop,true),tail=Math.max(10,s*2.8)/f.len;
   for(let i=0;i<cnt;i++){const p=data(CX,CY,acc,s*(1-i*0.04),1-i*0.055);p.f=f;p.u0=b*0.37-i*tail;p.m=(p,t,o)=>{const q=p.f(p.u0+t*0.16);o.x=q[0];o.y=q[1];};pts.push(p);}
  }
  return {pts};
 },
 triathlon(n,acc){
  /* two disciplines, two rings turning against each other; every multisport activity sits where they overlap */
  const pts=[],cy=430,R=92,C=[[132,cy],[228,cy]];
  C.forEach((c,k)=>{[R,R+9].forEach(r=>{circle(c[0],c[1],r,Math.round(TAU*r/7)).forEach(q=>{const p=guide(q[0],q[1],k?MID:GUIDE,1.3,0.65);p.cx=c[0];p.cy=c[1];p.w=0.12*(k?-1:1);p.m=(p,t,o)=>{const aa=t*p.w,cc=Math.cos(aa),ss=Math.sin(aa),dx=p.x-p.cx,dy=p.y-p.cy;o.x=p.cx+dx*cc-dy*ss;o.y=p.cy+dx*ss+dy*cc;};pts.push(p);});});});
  const inset=R-12,inLens=(x,y)=>Math.hypot(x-C[0][0],y-cy)<=inset&&Math.hypot(x-C[1][0],y-cy)<=inset;
  const P=n===1?{P:[[CX,cy]],pitch:30}:hexFill(inLens,[CX-inset,cy-inset,CX+inset,cy+inset],n,q=>Math.hypot(q[0]-CX,q[1]-cy)),s=Math.min(sz(n,P.pitch),P.pitch*0.36);
  P.P.forEach((q,i)=>{const p=data(q[0],q[1],acc,s);p.i=i;p.m=(p,t,o)=>{const k=1+0.04*Math.sin(t*1.2);o.x=CX+(p.x-CX)*k;o.y=cy+(p.y-cy)*k;};pts.push(p);});
  return {pts};
 },
 team_sports(n,acc){
  const pts=[],ga=Math.PI*(3-Math.sqrt(5)),phi=(1+Math.sqrt(5))/2;
  const V=[[0,1,phi],[0,-1,phi],[0,1,-phi],[0,-1,-phi],[1,phi,0],[-1,phi,0],[1,-phi,0],[-1,-phi,0],[phi,0,1],[-phi,0,1],[phi,0,-1],[-phi,0,-1]].map(v=>{const l=Math.hypot(v[0],v[1],v[2]);return [v[0]/l,v[1]/l,v[2]/l];});
  const G=340;
  for(let i=0;i<G;i++){const y=1-(i/(G-1))*2,r=Math.sqrt(1-y*y),th=ga*i,p=guide(Math.cos(th)*r,y,GUIDE,1.5,0.6);p.z=Math.sin(th)*r;let best=9;V.forEach(v=>{best=Math.min(best,Math.acos(clamp(p.x*v[0]+p.y*v[1]+p.z*v[2],-1,1)));});if(best<0.36){p.c=MID;p.a=0.85;}pts.push(p);}
  const v0=V[0],u0=[1,0,0];let w0=[v0[1]*u0[2]-v0[2]*u0[1],v0[2]*u0[0]-v0[0]*u0[2],v0[0]*u0[1]-v0[1]*u0[0]];const wl=Math.hypot(...w0);w0=w0.map(x=>x/wl);
  const u1=[w0[1]*v0[2]-w0[2]*v0[1],w0[2]*v0[0]-w0[0]*v0[2],w0[0]*v0[1]-w0[1]*v0[0]];
  const cap=clamp(Math.sqrt(n)*0.11,0.1,1.3),s=sz(n,128*cap*Math.sqrt(Math.PI/n));
  for(let j=0;j<n;j++){
   const ct=n===1?1:1-(1-Math.cos(cap))*(j+0.5)/n,st=Math.sqrt(1-ct*ct),fi=j*ga,cf=Math.cos(fi)*st,sf=Math.sin(fi)*st;
   const d=data(v0[0]*ct+u1[0]*cf+w0[0]*sf,v0[1]*ct+u1[1]*cf+w0[1]*sf,acc,s);d.z=v0[2]*ct+u1[2]*cf+w0[2]*sf;pts.push(d);
  }
  return {pts,view:{cx:CX,cy:428,R:128,tilt:0.25,spin:0.3,dist:4}};
 },
 climbing(n,acc,rnd){
  const pts=[],holds=[];
  for(let r=0;r<6;r++)for(let c=0;c<4;c++)holds.push([62+c*78+(rnd()-0.5)*34,298+r*50+(rnd()-0.5)*20]);
  guides(pts,byPitch([[34,276],[326,276],[326,566],[34,566]],8,true),GUIDE,1.2,0.45);
  const route=[21,18,13,10,5,2],R=clamp(Math.ceil(n/4),1,6),per=Math.ceil(n/R),pitch=9,s=sz(n,per>1?pitch*0.85:24);let used=0;
  holds.forEach((h,i)=>{if(route.slice(0,R).indexOf(i)<0)guides(pts,sunflower(h[0],h[1],10+rnd()*4,8+rnd()*3,9),DIM,1.4,0.75);});
  route.slice(R).forEach(hi=>{const h=holds[hi];guides(pts,circle(h[0],h[1],11,10),MID,1.25,0.55);});
  for(let k=0;k<R;k++){const cnt=Math.ceil((n-used)/(R-k));used+=cnt;const h=holds[route[k]];sunN(h[0],h[1],cnt,pitch,0.85).forEach(q=>{const p=data(q[0],q[1],acc,s);p.hk=k;p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;o.k=1+0.22*Math.sin(t*2.6-p.hk*0.7);};pts.push(p);});}
  return {pts};
 },
 cardio(n,acc){
  const pts=[],base=440,yAt=x=>{
   const f=mod(x,120);
   if(f>10&&f<30)return base-8*Math.sin((f-10)/20*Math.PI);
   if(f>=44&&f<48)return base+(f-44)*2.5;
   if(f>=48&&f<52)return base+10-(f-48)*30;
   if(f>=52&&f<57)return base-110+(f-52)*30;
   if(f>=57&&f<62)return base+40-(f-57)*8;
   if(f>78&&f<104)return base-16*Math.sin((f-78)/26*Math.PI);
   return base;
  };
  const P=[];for(let x=0;x<=360;x+=0.5)P.push([x,yAt(x)]);
  byPitch(P,4).forEach(q=>{const p=guide(q[0],q[1],GUIDE,1.3,0.6);p.x0=q[0];p.m=(p,t,o)=>{const nx=mod(p.x0-t*36,360);o.x=nx;o.y=yAt(nx);};pts.push(p);});
  const cnt=[0,0,0];for(let i=0;i<n;i++)cnt[i%3]++;
  const maxC=Math.max(...cnt),gap=Math.min(16,150/maxC),s=sz(n,gap);
  for(let k=0;k<3;k++)for(let j=0;j<cnt[k];j++){const d=data(52+k*120,330,acc,s);d.x0=52+k*120+0.5;d.j=j;d.gap=gap;d.m=(p,t,o)=>{const nx=mod(p.x0-t*36,360);o.x=nx;o.y=yAt(nx)-10-p.j*p.gap;o.ka=clamp(Math.min(nx,360-nx)/16,0,1);};pts.push(d);}
  return {pts};
 },
 other(n,acc,rnd){
  const pts=[],base=[[64,336],[128,300],[196,344],[254,302],[306,372],[246,452],[168,482],[96,440],[140,396],[214,404],[300,500],[60,530]];
  const stars=n<=12?base.slice(0,n):sunflower(CX,430,140,130,n).map(q=>[q[0]+(rnd()-0.5)*8,q[1]+(rnd()-0.5)*8]);
  if(n<=24)for(let i=0;i<stars.length-1;i++)guides(pts,line(stars[i],stars[i+1],24).slice(3,21),MID,1.2,0.5);
  for(let w=0;w<70;w++){const g=guide(rnd()*360,270+rnd()*310,GUIDE,1.0+rnd()*0.6,0.3+rnd()*0.35);g.i=w;g.m=(p,t,o)=>{o.x=p.x;o.y=p.y;o.k=1+0.3*Math.sin(t*1.3+p.i);};pts.push(g);}
  const s=sz(n,n<=12?40:140*2/Math.sqrt(n));
  stars.forEach((q,i)=>{const p=data(q[0],q[1],acc,s);p.i=i;p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;o.k=1+0.25*Math.sin(t*2+p.i);};pts.push(p);});
  return {pts};
 }
};

/* ---------- hours dial shapes (closed outlines, clockwise from the top) ---------- */
function radial(fn){const o=[];for(let i=0;i<360;i++){const a=i/360*TAU,r=fn(a);o.push([r*Math.sin(a),-r*Math.cos(a)]);}return o;}
const SHAPE={
 circle:()=>radial(()=>1),
 ellipse:()=>radial(a=>1/Math.sqrt(Math.pow(Math.sin(a)/1.15,2)+Math.pow(Math.cos(a)/0.82,2))),
 stadium:()=>radial(a=>Math.pow(Math.pow(Math.abs(Math.sin(a)/1.18),3)+Math.pow(Math.abs(Math.cos(a)/0.82),3),-1/3)),
 squircle:()=>radial(a=>Math.pow(Math.pow(Math.abs(Math.sin(a)),4)+Math.pow(Math.abs(Math.cos(a)),4),-1/4)*0.92),
 pool:()=>radial(a=>Math.pow(Math.pow(Math.abs(Math.sin(a)/1.15),5)+Math.pow(Math.abs(Math.cos(a)/0.86),5),-1/5)),
 triangle:()=>radial(a=>{const k=mod(a+Math.PI/3,TAU/3)-Math.PI/3;return (0.5/Math.cos(k))*0.82+0.3;}).map(q=>[q[0],q[1]+0.12]),
 hexagon:()=>radial(a=>{const k=mod(a,Math.PI/3)-Math.PI/6;return (Math.cos(Math.PI/6)/Math.cos(k))*0.8+0.18;}),
 heart:()=>{const o=[];for(let i=0;i<400;i++){const t=i/400*TAU,x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);o.push([x/16.5,-(y+2)/16.5]);}return o;}
};
export const DIALSHAPE={running:'stadium',cycling:'circle',hiit:'squircle',strength:'squircle',walking:'circle',hiking:'triangle',swimming:'pool',rowing:'ellipse',yoga:'circle',pilates:'circle',elliptical:'ellipse',skiing:'hexagon',golf:'circle',racket:'pool',triathlon:'circle',team_sports:'circle',climbing:'hexagon',cardio:'heart',other:'circle'};
export function hourUnit(h){return h<30?1/6:autoUnit(h,[1,2,5,10,20,50,100,250,500,1000],300);}
export function hourText(u){return u<1?'EACH DOT = 10 MINUTES':u===1?'EACH DOT = 1 HOUR':'EACH DOT = '+u+' HOURS';}

/* ---------- distance paths ---------- */
/* switchbacks: horizontal legs joined by true semicircle turns, so the path never folds onto itself */
function hairpins(x0,ends,yBottom,gap){
 const o=[[x0,yBottom]];
 ends.forEach((e,i)=>{
  const y=yBottom-i*gap,prev=o[o.length-1][0],dir=e>prev?1:-1;
  o.push([e,y]);
  if(i<ends.length-1){const r=gap/2,cy=y-r;for(let k=1;k<14;k++){const a=Math.PI/2-k/14*Math.PI;o.push([e+dir*r*Math.cos(a),cy+r*Math.sin(a)]);}o.push([e,y-gap]);}
 });
 return o;
}
const FLOW={
 running:{f:u=>[CX+100*Math.sin(u*2.6*Math.PI)*(1-0.55*u),572-u*300]},
 cycling:{P:hairpins(52,[300,70,290,88,272,110,250,136,222,180],566,32),lw:5},
 walking:{f:u=>[CX+72*Math.sin(u*Math.PI*1.6-0.8),568-u*290],lw:4.5,prints:true},
 hiking:{P:roundPath([[120,562],[205,522],[140,482],[208,442],[160,404],[202,366],[176,330],[190,300]],10,6),lw:6},
 swimming:{P:(()=>{const o=[];let y=548,left=true;for(let i=0;i<9;i++){o.push(left?[40,y]:[320,y]);o.push(left?[320,y]:[40,y]);y-=32;left=!left;}return roundPath(o,14,8);})()},
 rowing:{P:roundPath([[176,572],[104,506],[158,436],[246,386],[226,322],[160,272]],60,14),lw:13},
 skiing:{f:u=>[CX+112*Math.sin(u*3.5*Math.PI)*(0.35+0.65*u),272+u*296]},
 triathlon:{f:u=>{const s=u*TAU;return [CX+140*Math.sin(s),420+90*Math.sin(s)*Math.cos(s)];},lw:5,closed:true}
};
export const FLOW_SPORTS=Object.keys(FLOW);
const WATER={swimming:1,rowing:1};
export function distUnit(k,km){return autoUnit(km,WATER[k]?[0.1,0.5,1,2,5,10,25,50]:[1,2,5,10,20,50,100,250,500,1000],220);}
export function topUnit(km){return autoUnit(km,[0.1,0.5,1,2,5,10,25,50,100,250],40);}
const WEEKV={cycling:'radial',swimming:'lanes',rowing:'lanes',hiking:'piles',skiing:'piles',golf:'piles',triathlon:'piles'};
const TOPV={cycling:'arcs',hiking:'climbs',skiing:'climbs',swimming:'pool'};
const DSHORT=['MON','TUE','WED','THU','FRI','SAT','SUN'];

/* ---------- layouts: each reads only the numbers in spec.p ---------- */
export const L={};
function globe(pts,n,r){const ga=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-(i/(n-1))*2,rr=Math.sqrt(1-y*y),th=ga*i+0.4,p=guide(Math.cos(th)*rr*r,y*r,GUIDE,1.2,0.4);p.z=Math.sin(th)*rr*r;pts.push(p);}}
/* one dot per activity on a slowly turning globe, coloured by sport */
L.sphere=c=>{
 const {n,cols,keys}=c.p,pts=[],ga=Math.PI*(3-Math.sqrt(5)),s=clamp(rD(n)+0.6,3.0,6.0);
 globe(pts,240,0.985);
 for(let i=0;i<n;i++){const y=n===1?0:1-(i/(n-1))*2,r=Math.sqrt(1-y*y),th=ga*i,p=data(Math.cos(th)*r,y,cols[i]||c.acc,s);p.z=Math.sin(th)*r;if(keys)p.sk=keys[i];pts.push(p);}
 return {pts,view:{cx:CX,cy:c.p.cy,R:c.p.R,tilt:0.35,spin:0.18,dist:4}};
};
L.ring=c=>{
 const {n,cols,keys}=c.p,pts=[];let s=clamp(rD(n)+0.4,2.8,6.0);
 for(let g=0;g<120;g++){const a0=g/120*TAU,gp=guide(Math.cos(a0)*1.2,0,GUIDE,1.2,0.45);gp.z=Math.sin(a0)*1.2;pts.push(gp);}
 /* up to 60 dots: one clean ring. Above that: an even grid on a thin torus (around × across the tube) */
 const tube=n>60?0.18:0,nu=tube?Math.round(Math.sqrt(n*1.2/tube)):n,nv=Math.ceil(n/nu);
 if(tube)s=sz(n,Math.min(TAU*1.2*116/nu,TAU*tube*116/nv));
 for(let i=0;i<n;i++){const a=(i%nu)/nu*TAU,v=Math.floor(i/nu),b=tube?(v+(i%2)*0.5)/nv*TAU:0,R=1.2+Math.cos(b)*tube,p=data(Math.cos(a)*R,Math.sin(b)*tube,cols[i]||c.acc,s);p.z=Math.sin(a)*R;if(keys)p.sk=keys[i];pts.push(p);}
 return {pts,view:{cx:CX,cy:332,R:116,tilt:0.5,spin:0.12,dist:5}};
};
/* sport mix: a pie made of dots. Each dot is one activity (or the stated unit); each wedge is one sport. Top five get a legend line. */
L.mix=c=>{
 const {items,unit}=c.p,n=sum(items.map(i=>i.dots)),total=sum(items.map(i=>i.n)),cy=300,pitch=n>1?Math.min(24,92*Math.sqrt(Math.PI/n)):24,R=n>1?Math.min(92,pitch*Math.sqrt(n/Math.PI)*1.05):0;
 const ang=q=>mod(Math.atan2(q[0]-CX,-(q[1]-cy)),TAU);
 const P=sunflower(CX,cy,R,R,n).sort((a,b)=>ang(a)-ang(b)),pts=[],labels=[],s=sz(n,pitch);let k=0;
 guides(pts,circle(CX,cy,R+14,Math.max(24,Math.round(TAU*(R+14)/7))),GUIDE,1.2,0.45);
 items.forEach((sp,si)=>{
  const mine=P.slice(k,k+sp.dots);k+=sp.dots;if(!mine.length)return;
  const mid=mine.reduce((a,q)=>a+ang(q),0)/mine.length,ex=items.length>1?4:0;
  mine.forEach((q,j)=>{const p=data(q[0]+Math.sin(mid)*ex,q[1]-Math.cos(mid)*ex,sp.acc,s,1);p.d=0.2+si*0.12+j*0.002;p.sk=sp.key;pts.push(p);});
 });
 const pctText=v=>{const pct=v/total*100;return pct>=10||pct===0?fmt(pct):pct.toFixed(1);};
 const y0=422,gapY=21;
 items.slice(0,5).forEach((sp,r)=>{
  const y=y0+r*gapY,lg=guide(28,y+7,sp.acc,3.8,1);lg.d=0.8+r*0.08;lg.sk=sp.key;lg.legend=1;pts.push(lg);
  labels.push({x:44,y,t:sp.short,anc:'l',ts:12,c:'#FFFFFF',tw:700});
  labels.push({x:334,y,t:fmt(sp.n)+'  ·  '+pctText(sp.n)+'%',anc:'r',ts:12,c:sp.acc,sk:sp.key,tw:800});
 });
 if(items.length>5){
  const rest=items.slice(5),rn=sum(rest.map(s2=>s2.n)),yR=y0+5*gapY;
  labels.push({x:44,y:yR,t:'+ '+rest.length+' MORE SPORT'+(rest.length===1?'':'S'),anc:'l',ts:12,c:'#FFFFFF',tw:500});
  labels.push({x:334,y:yR,t:fmt(rn)+'  ·  '+pctText(rn)+'%',anc:'r',ts:12,c:SOFT,tw:700});
 }
 void unit;
 return {pts,labels,move:rot(CX,cy,0.04),rotOnlyData:true};
};
/* months: one column per month, each dot one (or more) hours or activities; the busiest finished month is lit */
L.months=c=>{
 const {items,unit,best,cur,measure,ties=[]}=c.p,maxV=Math.max(0,...items.map(i=>i.v??0)),dotsMax=Math.max(1,Math.ceil(maxV/unit-1e-9));
 const cols=dotsMax>36?3:dotsMax>14?2:1,rowsMax=Math.ceil(dotsMax/cols),pv=Math.min(18,196/rowsMax),ph=Math.min(pv,21/cols),s=sz(dotsMax*6,cols>1?Math.min(pv,ph*1.3):pv);
 const pts=[],labels=[],valueText=v=>measure==='minutes'?(v===0?'0':v<10?v.toFixed(1):fmt(v))+'h':fmt(v);
 items.forEach((m,i)=>{
  const x=34+i*26.5,fut=m.state==='future',isCur=i===cur,isBest=i===best||ties.includes(i),v=m.v;
  if(v==null||v===0){pts.push(guide(x,506,GUIDE,1.5,fut?0.35:0.6));labels.push({x,y:522,t:m.label,s:v===0?valueText(0):'–',anc:'c',ts:8.5,ss:7.5,c:fut||v==null?'#7B88A8':'#FFFFFF'});return;}
  const fd=fracDots(v,unit),col=isBest?c.acc:isCur?'#FFFFFF':SOFT,rows=Math.ceil(fd.total/cols);
  for(let j=0;j<fd.total;j++){const r=Math.floor(j/cols),cc=j%cols,p=data(x+(cc-(cols-1)/2)*ph,506-r*pv,col,s,fd.partial&&j===fd.total-1?0.35:1);p.d=0.3+i*0.05+j*0.006;pts.push(p);}
  labels.push({x,y:522,t:m.label,s:valueText(v),anc:'c',ts:8.5,ss:7.5,c:isBest?c.acc:'#FFFFFF',sc:isBest?c.acc:'#FFFFFF'});
  if(isBest||isCur)labels.push({x,y:506-(rows-1)*pv-s-(isBest&&isCur?26:16),t:isBest?'BUSIEST':'SO FAR',s:isBest&&isCur?'SO FAR':'',anc:'c',ts:7.5,ss:7,c:isBest?c.acc:'#FFFFFF',sc:c.acc,tw:800});
 });
 return {pts,labels};
};
/* outline fill: your dots fill a sport-specific outline in order; grey dots show the rest of it */
function fitShape(sh,box){
 const all=[...sh.slots,...sh.decor].flatMap(st=>st.P);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const [x,y] of all){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const k=Math.min(1.12,(box[2]-box[0])/(x1-x0),(box[3]-box[1])/(y1-y0)),ox=(box[0]+box[2])/2-(x0+x1)/2*k,oy=(box[1]+box[3])/2-(y0+y1)/2*k,T=([x,y])=>[ox+x*k,oy+y*k];
 const tf=st=>({...st,P:st.P.map(T),rot:st.rot?[ox+st.rot[0]*k,oy+st.rot[1]*k,st.rot[2]]:null});
 return {...sh,slots:sh.slots.map(tf),decor:sh.decor.map(tf),label:sh.label?{...sh.label,x:ox+sh.label.x*k,y:oy+sh.label.y*k}:null,k};
}
export function shapeOf(kind,k,n){const lib=kind==='hours'?HOURS:kind==='floors'?FLOORS:SESSIONS,raw=(lib[k]||HOURS.other)(n);return fitShape(raw,raw.label||kind!=='hours'?[22,290,338,560]:[26,322,334,560]);}
export function shapeHasCenterLabel(kind,k){const lib=kind==='hours'?HOURS:kind==='floors'?FLOORS:SESSIONS;return !!(lib[k]||HOURS.other)().label;}
export function shapeCapacity(kind,k){const sh=shapeOf(kind,k);return Math.floor(sum(sh.slots.map(st=>sampler(st.P,st.closed).len))/(sh.minPitch||7.5));}
L.shape=c=>{
 const {kind,k,n,partial,labels}=c.p,sh=shapeOf(kind,k,n),strokes=sh.slots.map(st=>{const f=sampler(st.P,st.closed);return {...st,f,len:f.len};});
 const Lt=sum(strokes.map(st=>st.len)),slots=Math.max(n,Math.round(Lt/11)),pitch=Lt/slots,counts=strokes.map(st=>Math.max(1,Math.round(st.len/pitch)));
 while(sum(counts)<n){let b=0;counts.forEach((m,i)=>{if(strokes[i].len/m>strokes[b].len/counts[b])b=i;});counts[b]++;}
 const pts=[],s=sz(n,pitch),spin=st=>st.rot?rot(st.rot[0],st.rot[1],st.rot[2]):null;let idx=0;
 strokes.forEach((st,i)=>{const m=counts[i],mv=spin(st);for(let j=0;j<m;j++){
  const q=st.f(st.closed?j/m:(m===1?0.5:j/(m-1))),on=idx<n;let p;
  if(on){p=data(q[0],q[1],c.acc,s,partial&&idx===n-1?0.35:1);p.d=0.15+idx*(1.3/Math.max(n,40));p.i=idx;}else{p=guide(q[0],q[1],GUIDE,Math.max(1.3,s*0.42),0.5);p.d=0.1+idx*0.002;}
  if(kind==='hours'&&on)p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;if(mv)mv(p,t,o);const dd=mod(t*0.14-p.i/n,1);o.k=dd<0.06?1+0.35*(1-dd/0.06):1;};else if(mv)p.m=mv;
  pts.push(p);idx++;}});
 for(const d of sh.decor){const mv=spin(d);guides(pts,byPitch(d.P,7,d.closed),MID,1.3,0.6,mv?p=>{p.m=mv;}:null);}
 const out={pts,labels:[]};
 if(sh.move==='lift')out.move=(p,t,o)=>{o.x=p.x;o.y=p.y+Math.sin(t*1.3)*5;};
 if(labels?.length){
  if(sh.label){const {x,y,anc='c'}=sh.label;labels.forEach((l,i)=>out.labels.push({x,y:y-26+(i?60:0),t:l.t,s:l.s,anc,ts:i?24:32,ss:9.5,tw:800}));}
 }
 return out;
};
L.motif=(c,rnd)=>{const r=MOTIF[c.p.k](c.p.n,c.acc,rnd);return {pts:r.pts,move:r.move,view:r.view};};
/* hours: dots fill laps around a sport-shaped dial from the outside in; a pacer dot runs the outer lap */
L.dial=c=>{
 const {k,hours}=c.p,unit=hourUnit(hours),fd=fracDots(hours,unit),total=fd.total,laps=Math.ceil(total/60);
 const outline=SHAPE[DIALSHAPE[k]||'circle'](),samp=sampler(outline,true),R=132,ringP=Math.min(10,56/laps),cy=424,pts=[],spin=k==='cycling'?0.22:0;
 const pointy={heart:0.62,triangle:0.78,hexagon:0.92}[DIALSHAPE[k]]||1;
 const lapPitch=TAU*(R-(laps-1)*ringP)/60,ds=sz(total,Math.min(lapPitch,laps>1?ringP*1.1:99))*pointy;
 for(let i=0;i<total;i++){
  const lap=Math.floor(i/60),j=i%60,sc=(R-lap*ringP)/R,q=samp(j/60);
  const p=data(CX+q[0]*R*sc,cy+q[1]*R*sc,c.acc,ds,fd.partial&&i===total-1?0.35:1);p.d=0.15+i*(1.4/Math.max(total,40));p.j=j;
  p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;const f=mod(t/7,1)*60,dd=mod(f-p.j,60);o.k=dd<6?1+0.3*(1-dd/6):1;if(spin)spinXY(o,CX,cy,t*spin);};
  pts.push(p);
 }
 const lastLap=Math.floor((total-1)/60),filled=total-lastLap*60;
 for(let g=filled;g<60;g++){const q2=samp(g/60),sc2=(R-lastLap*ringP)/R,gp=guide(CX+q2[0]*R*sc2,cy+q2[1]*R*sc2,GUIDE,1.3,0.5);if(spin)gp.m=rot(CX,cy,spin);pts.push(gp);}
 if(k==='cycling'){
  const inner=R-laps*ringP-4;
  guides(pts,circle(CX,cy,inner,Math.round(TAU*inner/7)),MID,1.3,0.6,p=>{p.m=rot(CX,cy,spin);});
  for(let s2=0;s2<28;s2++){const a=s2/28*TAU,ah=a+(s2%2?0.12:-0.12);guides(pts,lineP([CX+76*Math.sin(ah),cy-76*Math.cos(ah)],[CX+(inner-6)*Math.sin(a),cy-(inner-6)*Math.cos(a)],7),DIM,1.2,0.7,p=>{p.m=rot(CX,cy,spin);});}
 }
 const pacer=pt(CX,cy,'#FFFFFF',3.4,1);pacer.pace=1;pacer.d=1.2;
 pacer.m=(p,t,o)=>{const q=samp(mod(t/7,1)),r=R+11;o.x=CX+q[0]*r;o.y=cy+q[1]*r;if(spin)spinXY(o,CX,cy,t*spin);};
 pts.push(pacer);
 const labels=c.p.labels.map((l,i)=>({x:CX,y:i?cy+10:cy-30,t:l.t,s:l.s,anc:'c',ts:i?15:22,ss:8}));
 return {pts,labels};
};
L.flow=c=>{
 const {k,km}=c.p,F=FLOW[k],unit=distUnit(k,km),fd=fracDots(km,unit),n=fd.total,pts=[],R=ROUTES[k]?.();
 for(const d of R?.decor||[])guides(pts,byPitch(d.P,7,d.closed),MID,1.2,0.45);
 if(F?.prints)for(const p of MOTIF.walking(0,MID).pts)if(p.g)pts.push(p);
 if(R?.strokes){
  // the stream follows the object itself (a bike, a shoe): dots split across its strokes by length
  const st=R.strokes.map(x=>{const f=sampler(x.P,x.closed);return {...x,f,len:f.len};}),Lt=sum(st.map(x=>x.len)),pitch=Lt/n,s0=sz(n,Math.min(pitch,9));let used=0;
  st.forEach((x,si)=>{
   guides(pts,byPitch(x.P,9,x.closed),GUIDE,1.2,0.5);
   const m=si===st.length-1?n-used:Math.round(n*x.len/Lt);used+=m;
   for(let i=0;i<m;i++){const g=used-m+i,p=data(CX,CY,g%3===0?'#FFFFFF':c.acc,s0,fd.partial&&g===n-1?0.35:0.95);p.u0=i/Math.max(m,1);p.f=x.f;p.cl=x.closed;
    p.m=(p,t,o)=>{const u=mod(p.u0+t*0.02,1),q=p.f(u);o.x=q[0];o.y=q[1];o.ka=p.cl?1:fadeEnds(u);};pts.push(p);}
  });
  return {pts};
 }
 let Pc=[];if(F.f){for(let i0=0;i0<=400;i0++)Pc.push(F.f(i0/400));}else Pc=F.P;
 const fn=sampler(Pc,!!F.closed),len=fn.len; // arc-length, so dots never bunch on the bends
 guides(pts,byPitch(Pc,9,!!F.closed),GUIDE,1.2,0.5);
 /* when dots would sit closer than 10 px the stream splits into three staggered lanes, so neighbours never touch */
 const pitch=len/n,lanes=pitch<10?3:1,lw=F.lw||7,lat=lanes===3?[-1,0,1]:[0],s0=sz(n,lanes===3?Math.min(Math.hypot(pitch,lw),2.6*pitch,9):pitch);
 for(let i=0;i<n;i++){
  const last=fd.partial&&i===n-1,p=data(CX,CY,i%3===0?'#FFFFFF':c.acc,s0,last?0.35:0.95);
  p.u0=i/n;p.lat=lat[i%lanes];
  p.m=(p,t,o)=>{const u=mod(p.u0+t*0.016,1),q=fn(u),q2=fn(Math.min(0.999,u+0.002)),dx=q2[0]-q[0],dy=q2[1]-q[1],Lh=Math.hypot(dx,dy)||1;o.x=q[0]+(-dy/Lh)*p.lat*lw;o.y=q[1]+(dx/Lh)*p.lat*lw;o.ka=F.closed?1:fadeEnds(u);};
  pts.push(p);
 }
 return {pts};
};
L.week=c=>{
 const {k,week:W,n:total,counts=W}=c.p,M=Math.max(...W),top=counts.indexOf(Math.max(...counts)),v=WEEKV[k]||'columns',pts=[],labels=[];
 const col=d=>d===top?c.acc:SOFT,lab=d=>d===top?c.acc:'#FFFFFF';
 if(v==='columns'){
  const kk=M<=12?1:M<=36?2:3,rows=Math.ceil(M/kk),sp=Math.min(17,210/rows),hs=Math.min(sp,30/kk),z=sz(total,kk>1?Math.min(sp,hs*1.25):sp);
  W.forEach((n,d)=>{const x=40+d*46.67;if(!n)pts.push(guide(x,506,GUIDE,1.5,0.6));for(let j=0;j<n;j++)pts.push(pt(x+(j%kk-(kk-1)/2)*hs,506-Math.floor(j/kk)*sp,col(d),z,1,0.3+d*0.06+j*0.01));labels.push({x,y:522,t:DSHORT[d],s:String(counts[d]),anc:'c',ts:9.5,ss:11,sb:true,c:lab(d)});});
 }else if(v==='radial'){
  const k2=M<=12?1:M<=30?2:3,rows2=Math.ceil(M/k2),sp2=Math.min(15,112/rows2),cy=410,z2=sz(total,Math.min(sp2,k2>1?9:99));
  W.forEach((n,d)=>{
   const a=d/7*TAU,dir=[Math.sin(a),-Math.cos(a)],perp=[Math.cos(a),Math.sin(a)];
   if(!n)pts.push(guide(CX+dir[0]*30,cy+dir[1]*30,GUIDE,1.5,0.6));
   for(let j=0;j<n;j++){const r=30+Math.floor(j/k2)*sp2,off=(j%k2-(k2-1)/2)*8;pts.push(pt(CX+dir[0]*r+perp[0]*off,cy+dir[1]*r+perp[1]*off,col(d),z2,1,0.3+d*0.06+j*0.012));}
   const rl=30+Math.ceil(n/k2)*sp2+16;labels.push({x:CX+dir[0]*rl,y:cy+dir[1]*rl-10,t:DSHORT[d],s:String(counts[d]),anc:'c',ts:9,ss:10.5,sb:true,c:lab(d)});
  });
 }else if(v==='lanes'){
  const k3=M<=14?1:2,per=Math.ceil(M/k3),sp3=Math.min(24,230/per),z3=sz(total,Math.min(sp3,k3>1?9:99));
  if(k==='swimming')pool(pts,[70,282,350,534],[1,2,3,4,5,6].map(i=>282+i*36));
  W.forEach((n,d)=>{const y=300+d*36;if(!n)pts.push(guide(84,y,GUIDE,1.5,0.6));for(let j=0;j<n;j++)pts.push(pt(84+Math.floor(j/k3)*sp3,y+(k3>1?(j%2?4.5:-4.5):0),col(d),z3,1,0.3+d*0.06+j*0.02));labels.push({x:18,y:y-7,t:DSHORT[d],anc:'l',ts:9.5,c:lab(d)});labels.push({x:84+Math.max(1,Math.ceil(n/k3))*sp3+4,y:y-8,t:String(counts[d]),anc:'l',ts:11,c:lab(d)});});
 }else{
  const sp4=clamp(36/Math.sqrt(M),9,16),z4=sz(total,sp4);
  W.forEach((n,d)=>{const x=40+d*46.67,w0=Math.max(1,Math.ceil((Math.sqrt(8*n+1)-1)/2));let left=n,row=0;if(!n)pts.push(guide(x,506,GUIDE,1.5,0.6));while(left>0){const w=Math.max(1,w0-row),cnt=Math.min(w,left);for(let j=0;j<cnt;j++)pts.push(pt(x+(j-(cnt-1)/2)*sp4,506-row*sp4*0.9,col(d),z4,1,0.3+d*0.06+row*0.05));left-=cnt;row++;}labels.push({x,y:522,t:DSHORT[d],s:String(counts[d]),anc:'c',ts:9.5,ss:11,sb:true,c:lab(d)});});
 }
 pts.forEach(p=>{if(!p.g)p.dat=1;});
 return {pts,labels};
};
L.top3=c=>{
 const {k,values:V}=c.p,unit=topUnit(V[0]),F=V.map(v=>fracDots(v,unit)),cnt=F.map(f=>f.total),max=cnt[0],tv=TOPV[k]||'bars',pts=[],labels=[],tot=sum(cnt);
 const cols=[c.acc,'#FFFFFF',SOFT],lbl=b=>(V.length>1?(b+1)+' · ':'')+fmt(V[b],1)+' km';
 const dot=(x,y,b,j,z)=>{const p=data(x,y,cols[b],z,F[b].partial&&j===cnt[b]-1?0.35:1);p.d=0.3+b*0.15+j*(0.9/max);pts.push(p);};
 if(tv==='pool'){
  /* each of your longest swims gets a lane: the dots run its length, lane ropes and walls draw the pool */
  const rows=Math.max(1,Math.ceil(max/30)),perRow=Math.ceil(max/rows),sp=Math.min(20,276/Math.max(1,perRow-1)),z=sz(tot,Math.min(sp,rows>1?sp:99)),lh=78,top=300,bot=top+cnt.length*lh;
  pool(pts,[14,top,346,bot],cnt.slice(1).map((_,b)=>top+(b+1)*lh),cnt.map((_,b)=>top+b*lh+lh/2));
  cnt.forEach((n,b)=>{const y0=top+b*lh+44-(rows-1)*sp/2;for(let j=0;j<n;j++)dot(42+Math.floor(j/rows)*sp,y0+(j%rows)*sp,b,j,z);labels.push({x:42,y:top+b*lh+12,t:lbl(b),anc:'l',ts:10.5,c:cols[b]});});
 }else if(tv==='bars'){
  const rows=Math.max(1,Math.ceil(max/30)),perRow=Math.ceil(max/rows),sp=Math.min(20,296/Math.max(1,perRow-1)),z=sz(tot,Math.min(sp,rows>1?sp:99));
  cnt.forEach((n,b)=>{const y0=330+b*84;for(let j=0;j<n;j++)dot(26+Math.floor(j/rows)*sp,y0+(j%rows)*sp,b,j,z);labels.push({x:26,y:y0-26,t:lbl(b),anc:'l',ts:10.5,c:cols[b]});});
 }else if(tv==='arcs'){
  const radii=[128,100,72],cy=436;let z2=99;cnt.forEach((n,b)=>{if(n>1)z2=Math.min(z2,radii[b]*(n/max*300/360*TAU)/(n-1));});z2=sz(tot,z2);
  cnt.forEach((n,b)=>{const span=n/max*300/360*TAU;for(let j=0;j<n;j++){const a=n===1?0:j/(n-1)*span;dot(CX+radii[b]*Math.sin(a),cy-radii[b]*Math.cos(a),b,j,z2);}guides(pts,circle(CX,cy,radii[b],Math.round(TAU*radii[b]/8)),GUIDE,1.15,0.35);labels.push({x:CX-8,y:cy-radii[b]-7,t:lbl(b),anc:'r',ts:9.5,c:cols[b]});});
 }else{
  let z3=99;cnt.forEach(n=>{if(n>1)z3=Math.min(z3,(n/max*280)/(n-1));});z3=sz(tot,z3);
  cnt.forEach((n,b)=>{const x0=30,y0=560-b*74,len=n/max*280,ang=-0.5;for(let j=0;j<n;j++){const d=n===1?0:j/(n-1)*len;dot(x0+d*Math.cos(ang),y0+d*Math.sin(ang),b,j,z3);}const ex=x0+len*Math.cos(ang),ey=y0+len*Math.sin(ang);labels.push({x:ex+10,y:ey-18,t:lbl(b),anc:'l',ts:10,c:cols[b]});});
 }
 return {pts,labels,unit};
};
L.galaxy=(c,rnd)=>{
 const n=Math.max(1,Math.round(c.p.steps/stepUnit(c.p.steps))),pts=[];
 for(let i=0;i<n;i++){const t=Math.pow(rnd(),0.7),arm=i%2,a=t*4*Math.PI+arm*Math.PI+gauss(rnd)*0.28,rr=0.1+t*1.1+gauss(rnd)*0.05;const p=data(Math.cos(a)*rr,gauss(rnd)*0.05*(1-t),t<0.35?'#FFE2B8':t<0.7?'#CFE0FF':'#7FA6E8',n>1500?2.2:2.6);p.z=Math.sin(a)*rr;pts.push(p);}
 return {pts,view:{cx:CX,cy:404,R:118,tilt:1.05,spin:0.12,dist:6}};
};
L.stairs=c=>{
 const fd=fracDots(c.p.peak,1000),n=fd.total,P=[[30,566]],pts=[];let x=30,y=566;
 for(let k=0;k<12;k++){y-=22;P.push([x,y]);x+=25;P.push([x,y]);}
 guides(pts,byPitch(P,6),GUIDE,1.2,0.5);
 const f=sampler(P,false),s=sz(n,f.len/n);
 for(let i=0;i<n;i++){const q=f(n===1?0.5:i/(n-1)),p=data(q[0],q[1]-7,i%2?'#FFD86B':'#FFFFFF',s,fd.partial&&i===n-1?0.35:1);p.d=0.2+i/n*1.2;p.u=i/n;p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;const dd=mod(t*0.2-p.u,1);o.k=dd<0.08?1+0.6*(1-dd/0.08):1;};pts.push(p);}
 return {pts};
};
L.moon=c=>{
 const n=c.p.nights,pts=[],inside=(x,y)=>{const a=(x-190)*(x-190)+(y-392)*(y-392),b=(x-236)*(x-236)+(y-360)*(y-360);return a<=108*108&&b>102*102;};
 guides(pts,circle(190,392,118,140).filter(q=>(q[0]-236)*(q[0]-236)+(q[1]-360)*(q[1]-360)>108*108),GUIDE,1.2,0.5);
 if(!n)return {pts};
 const H=hexFill(inside,[70,270,310,520],n,q=>108-Math.hypot(q[0]-190,q[1]-392)),s=Math.min(sz(n,H.pitch),H.pitch*0.3);
 H.P.forEach((q,i)=>{const p=data(q[0],q[1],'#FFF1D6',s);p.i=i;p.m=(p,t,o)=>{o.x=p.x+Math.sin(t*0.8+p.i)*0.6;o.y=p.y+Math.cos(t*0.7+p.i)*0.6;};pts.push(p);});
 return {pts};
};
function inPoly(P,x,y){let inside=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
/* peak HR: one dot per activity (or unit); dots without a usable peak stay dim */
L.heart=(c,rnd)=>{
 const {total,lit}=c.p,pts=[],col='#FF6B7A',cy=418;
 const outline=[];for(let i=0;i<160;i++){const t=i/160*TAU,x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);outline.push([CX+x*7.6,cy-8-y*7.6]);}
 guides(pts,byPitch(outline,7,true),GUIDE,1.25,0.5);
 const inset=outline.map(q=>[CX+(q[0]-CX)*0.9,cy-8+(q[1]-cy+8)*0.9]);
 const H=hexFill((x,y)=>inPoly(inset,x,y),[CX-130,cy-125,CX+130,cy+130],total,q=>Math.hypot(q[0]-CX,q[1]-cy+10)),s=Math.min(sz(total,H.pitch),H.pitch*0.36);
 H.P.forEach(q=>pts.push(data(q[0],q[1],col,s)));
 const dat=pts.filter(p=>p.dat),idx=dat.map((p,i)=>i);
 for(let a=idx.length-1;a>0;a--){const b=Math.floor(rnd()*(a+1)),tmp=idx[a];idx[a]=idx[b];idx[b]=tmp;}
 for(let k=0;k<total-lit&&k<idx.length;k++){dat[idx[k]].c=DIM;dat[idx[k]].s=s*0.8;}
 return {pts,move:(p,t,o)=>{const f=mod(t,1.1),bb=Math.exp(-f*9)+0.6*Math.exp(-Math.max(0,f-0.22)*9)*(f>0.22?1:0),k2=1+0.035*bb;o.x=CX+(p.x-CX)*k2;o.y=cy+(p.y-cy)*k2;}};
};
L.pulseRing=c=>{
 /* a band of concentric rings around 118 px; as many rings as needed to keep ~9 px between dots */
 const {total:n,lit,bpm}=c.p,pts=[],col='#FF8FA8',rings=clamp(Math.ceil(n*9.5/(TAU*118)),1,7),step=9.5;
 const radii=[];for(let q=0;q<rings;q++)radii.push(118+(q-(rings-1)/2)*step);
 const tot=sum(radii);let used=0,cnt=radii.map((r,i)=>{const c2=i===radii.length-1?n-used:Math.round(n*r/tot);used+=c2;return c2;});
 if(rings===1){cnt=[n];guides(pts,circle(CX,420,118,110),GUIDE,1.2,0.45);}
 const s=sz(n,rings===1?TAU*118/n:9.5),dimIdx={},need=n-lit;for(let k=0;k<need;k++)dimIdx[Math.floor((k+0.5)*n/Math.max(1,need))]=1;
 let idx=0;
 radii.forEach((r,ri)=>{for(let j=0;j<cnt[ri];j++){const a=(j+(ri%2)*0.5)/cnt[ri]*TAU,on=!dimIdx[idx++];pts.push(data(CX+r*Math.sin(a),420-r*Math.cos(a),on?col:DIM,on?s:s*0.8));}});
 const hz=bpm/60;
 return {pts,move:(p,t,o)=>{const f=mod(t*hz,1),k2=1+0.04*Math.exp(-f*7);o.x=CX+(p.x-CX)*k2;o.y=420+(p.y-420)*k2;}};
};
L.breath=c=>{
 const {days:n,bpm}=c.p,hz=bpm/60,pitch=Math.min(16,120*Math.sqrt(Math.PI/n)/1.05),pts=[];
 datas(pts,sunN(CX,420,n,pitch),'#5FE0C4',sz(n,pitch));
 return {pts,move:(p,t,o)=>{const f=mod(t*hz,1),k2=1+0.05*Math.exp(-f*5);o.x=CX+(p.x-CX)*k2;o.y=420+(p.y-420)*k2;}};
};
/* HRV: one dot per night, laid in strands of up to 50 so they never fuse into a line */
L.wave=c=>{
 /* every strand sits on the same column grid and the wave is driven by the column, so strands stay parallel;
    a shorter last strand is centred on whole columns instead of drifting half a column out of phase */
 const n=c.p.nights,strands=Math.ceil(n/50),per=Math.ceil(n/strands),pitchX=312/Math.max(1,per-1),gapY=Math.min(26,120/strands),pts=[],s=sz(n,Math.min(pitchX,gapY));
 for(let i=0;i<n;i++){
  const st=Math.floor(i/per),j=i%per,inS=st===strands-1?n-st*per:per,col=inS===1&&per===1?0:j+Math.floor((per-inS)/2),x=per===1?180:24+col*pitchX;
  const p=data(x,420+(st-(strands-1)/2)*gapY,'#B9A7FF',s,1);p.d=0.2+i*0.004;p.col=col;p.y0=p.y;
  p.m=(p,t,o)=>{o.x=p.x;o.y=p.y0+34*Math.sin(p.col*0.2+t*0.9)*(0.35+0.65*Math.abs(Math.sin(p.col*0.04+t*0.15)));};
  pts.push(p);
 }
 return {pts};
};
/* one big dot per month at its height, a faint stem down to the axis, faint links between neighbours */
L.monthLine=c=>{
 const {values:V,labels:ML,color:col,high,low}=c.p,F=c.p.format||(v=>fmt(v,c.p.dec)),vals=V.filter(v=>v!=null),lo=Math.min(...vals),hi=Math.max(...vals),pad=(hi-lo)*0.25+0.5;
 const Y=v=>300+(hi+pad-v)/(hi-lo+2*pad)*170,X=i=>36+i*26,pts=[],labels=[];
 V.forEach((v,i)=>{
  if(v==null){pts.push(guide(X(i),482,GUIDE,1.5,0.5));return;}
  lineP([X(i),Y(v)+9],[X(i),482],6).forEach(q=>{const g=guide(q[0],q[1],GUIDE,1.15,0.45);g.d=0.3+i*0.06;pts.push(g);});
  const p=data(X(i),Y(v),col,5.0,1);p.d=0.4+i*0.06;p.i=i;p.m=(p,t,o)=>{o.x=p.x;o.y=p.y;const dd=mod(t*0.35-p.i/12,1);o.k=dd<0.08?1+0.35*(1-dd/0.08):1;};pts.push(p);
 });
 for(let i=0;i<11;i++){const a=V[i],b=V[i+1];if(a==null||b==null)continue;const A=[X(i),Y(a)],B=[X(i+1),Y(b)],dl=Math.hypot(B[0]-A[0],B[1]-A[1]),m=Math.max(1,Math.floor((dl-16)/6));for(let j=1;j<=m;j++){const t=8/dl+(dl-16)/dl*j/(m+1);pts.push(guide(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,col,1.3,0.55));}}
 V.forEach((v,i)=>{
  labels.push({x:X(i),y:500,t:ML[i],s:v==null?'–':F(v),anc:'c',ts:10,ss:7.5});
  if(high?.includes(i))labels.push({x:X(i),y:Y(v)-30,t:'HIGH '+F(v),anc:'c',ts:8.5});
  if(low?.includes(i))labels.push({x:X(i),y:Y(v)+14,t:'LOW '+F(v),anc:'c',ts:8.5});
 });
 return {pts,labels};
};
L.road=(c,rnd)=>{
 const pts=[],lanes=[-1.3,-0.45,0.45,1.3];
 for(let i=0;i<520;i++){const p=pt(0,0,i%4===1||i%4===2?'#FFB35C':'#CFE0FF',1);p.lx=lanes[i%4]+gauss(rnd)*0.03;p.r0=rnd();p.m=(p,t,o)=>{const d=30.6-mod(p.r0+t*0.06,1)*30;o.x=CX+p.lx*300/d;o.y=352+0.55*300/d;o.k=clamp(16/d,0.4,7);o.ka=clamp(1.2-d/30,0.1,1);};pts.push(p);}
 return {pts,intro:0.6};
};
/* a design-library concept: only faint guide dots draw the shape, so no value is implied */
L.concept=(c,rnd)=>{
 const k=c.p.k,base=c.p.base==='heart'?L.heart({p:{total:60,lit:60}},rnd):c.p.base==='moon'?L.moon({p:{nights:0}}):MOTIF[MOTIF[k]?k:'other'](8,MID,rnd);
 const pts=base.pts.map(p=>{if(!p.g){p.g=1;p.dat=0;p.c=GUIDE;p.s=Math.min(p.s,1.5);p.a=0.5;}return p;});
 return {pts,move:base.move,view:base.view};
};

/* ---------- build + place ---------- */
export function build(spec){
 if(spec._b)return spec._b;
 const rnd=rng(spec.seed??7),r=L[spec.L](spec,rnd)||{pts:[]};
 r.labels=r.labels||[];
 for(const p of r.pts){if(p.d<0)p.d=rnd()*0.6;p.sx=180+gauss(rnd)*150;p.sy=400+gauss(rnd)*230;}
 Object.defineProperty(spec,'_b',{value:r,enumerable:false});
 return r;
}
function project(v,o,t){
 const a=(v.spin||0)*t,ca=Math.cos(a),sa=Math.sin(a),x=o.x*ca+o.z*sa,z=-o.x*sa+o.z*ca,y=o.y;
 const cb=Math.cos(v.tilt||0),sb=Math.sin(v.tilt||0),y2=y*cb-z*sb,z2=y*sb+z*cb,Dd=v.dist||4,k=Dd/(Dd+z2);
 o.x=v.cx+x*v.R*k;o.y=v.cy-y2*v.R*k;o.k*=k;o.ka=(o.ka||1)*(0.5+0.5*clamp((1-z2)/2,0,1));
}
/* where every dot of a card sits at time t (used by the renderers and the tests) */
export function place(b,p,t,o){
 o.k=1;o.ka=1;o.z=p.z||0;
 if(p.m)p.m(p,t,o);else if(b.move&&!(b.rotOnlyData&&p.g))b.move(p,t,o);else{o.x=p.x;o.y=p.y;}
 if(b.view)project(b.view,o,t);
 return o;
}
/* the card-space box the artwork occupies when settled (used to fit art in wide layouts) */
export function artBounds(spec){
 const b=build(spec),o={x:0,y:0,z:0,k:1,ka:1};let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const t of [0,2.5,5]){for(const p of b.pts){place(b,p,t,o);if(o.ka*p.a<0.05)continue;const r=p.s*o.k*1.6;x0=Math.min(x0,o.x-r);x1=Math.max(x1,o.x+r);y0=Math.min(y0,o.y-r);y1=Math.max(y1,o.y+r);}}
 for(const l of b.labels){const w=String(l.t).length*(l.ts||10)*0.62,lx=l.anc==='c'?l.x-w/2:l.anc==='r'?l.x-w:l.x;x0=Math.min(x0,lx);x1=Math.max(x1,lx+w);y0=Math.min(y0,l.y);y1=Math.max(y1,l.y+(l.ts||10)*1.2+(l.s?(l.ss||8)*1.3:0));}
 if(!Number.isFinite(x0))return {x:0,y:260,w:360,h:340};
 x0=Math.max(0,x0);x1=Math.min(360,x1);y0=Math.max(150,y0);y1=Math.min(640,y1);
 return {x:x0,y:y0,w:Math.max(40,x1-x0),h:Math.max(40,y1-y0)};
}
