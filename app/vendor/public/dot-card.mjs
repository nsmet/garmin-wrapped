// Shared card renderer for the dot design: layout frames, background, typography and the
// CPU side of the dot layer. Live stories, thumbnails and 1080 × 1920 exports all use it.
import {build,place,ease,clamp,artBounds,COLORS} from './dot-engine.mjs';

export const CARD_W=360,CARD_H=640;
const FONT='Sora';
const hexRgb=h=>{const n=parseInt(h.slice(1,7),16);return [(n>>16)&255,(n>>8)&255,n&255];};
const mixHex=(a,b,t)=>'#'+hexRgb(a).map((v,i)=>Math.round(v*(1-t)+hexRgb(b)[i]*t).toString(16).padStart(2,'0')).join('');
const easeOut3=x=>1-Math.pow(1-clamp(x,0,1),3);
// cubic-bezier(.2,.8,.2,1) is close to an exponential ease-out
const riseEase=x=>{x=clamp(x,0,1);return 1-Math.pow(1-x,3.4);};

/* ---------- colourways (share picker): bg, ink, accent, second accent ---------- */
export function colorRoles(spec,palette){
 if(!palette)return null;
 const [bg,ink,a1,a2]=palette,cats=[a1,a2,ink,mixHex(a1,ink,.5),mixHex(a2,ink,.5),mixHex(ink,bg,.35)];
 const order=[...new Set((spec.p?.items||[]).map(i=>i.key).concat(spec.p?.keys||[]))];
 const cat=k=>cats[Math.max(0,order.indexOf(k))%cats.length];
 return {bg,ink,a1,a2,cat,accents:new Set([spec.acc,spec.heroColor,'#FFE2B8'].filter(Boolean))};
}
function dotColor(p,roles){
 if(!roles)return [p.c,1];
 if(p.sk)return [roles.cat(p.sk),1];
 if(p.g)return [roles.ink,.45];
 if(p.c===COLORS.DIM)return [roles.ink,.22];
 if(roles.accents.has(p.c))return [roles.a1,1];
 return [roles.ink,.85];
}
function textColor(c,roles,sk){if(!roles)return c;if(sk)return roles.cat(sk);if(roles.accents.has(c))return roles.a1;return roles.ink;}

/* ---------- frames: where the card's text and artwork sit on a surface ---------- */
// mode 'export': the whole 360 × 640 card fills the canvas.
// mode 'live': fit inside the DOM chrome bounds; wide screens split text and art into columns.
export function cardFrame(w,h,{mode='export',bounds,spec,ctx}={}){
 if(mode!=='live'){const s=w/CARD_W;const t={x:0,y:-(spec?.lift||0)*s,s};return {mode,wide:false,text:t,art:t,clip:{x:0,y:0,w,h},textLayout:layoutText(ctx,spec,{mode})};}
 const b={top:0,bottom:h,left:0,right:w,...bounds},aw=Math.max(1,b.right-b.left),ah=Math.max(1,b.bottom-b.top);
 const wide=(w>=900&&w/h>=1.15)||(w>=600&&w/h>=1.5);
 if(!wide&&w<600){
  // Phones stack the card in three blocks, each scaled on its own: the headline block fills the width
  // at the page gutter, the artwork takes the room that is left (as wide as the screen allows), and a
  // grid, row or share pill placed under the artwork follows at the text scale. Nothing overlaps.
  // share cards keep the floating share prompt clear of the last grid row
  const B=artBounds(spec),G=16,gA=12,cx=w/2,room=ah-(spec.share&&!spec.cta?20:0);
  const solve=lay=>{
   const head={y0:lay.top,y1:Math.max(lay.head,spec.cta?240:0)},tail=lay.tail;
   const tH=s=>((head.y1-head.y0)+(tail?tail.y1-tail.y0:0))*s;
   const gap=(d,s)=>Math.max(10,Math.min(32,d*s));
   // the artwork keeps its place around the card's centre line, so the composition reads the same
   const sAw=Math.min((cx-gA)/Math.max(1,180-B.x),(cx-gA)/Math.max(1,B.x+B.w-180),2.4);
   let sT=Math.min((aw-2*G)/324,1.5),sA=0,g1=0,g2=0;
   for(let i=0;i<40;i++){
    g1=gap(B.y-head.y1,sT);g2=tail?gap(tail.y0-(B.y+B.h),sT):0;
    sA=Math.min(sAw,(room-tH(sT)-g1-g2)/B.h,sT*1.7);
    if(sA>=Math.min(sAw,sT*.9))break;sT*=.97;
   }
   return {head,tail,sT,sA,g1,g2,H:tH(sT)+g1+g2+B.h*sA};
  };
  // captions and labels read at 10.5 px or more on a phone
  let lay=layoutText(ctx,spec,{mode,minPx:10.5,boost:{artTop:B.y,stacked:true}}),f=solve(lay);
  lay=layoutText(ctx,spec,{mode,minPx:10.5/f.sT,boost:{artTop:B.y,stacked:true}});f=solve(lay);
  const y0=b.top+Math.max(0,(room-f.H)/2),text={x:b.left+G-18*f.sT,y:y0-f.head.y0*f.sT,s:f.sT};
  const artTop=y0+(f.head.y1-f.head.y0)*f.sT+f.g1,art={x:cx-180*f.sA,y:artTop-B.y*f.sA,s:f.sA};
  const tail=f.tail?{x:text.x,y:artTop+B.h*f.sA+f.g2-f.tail.y0*f.sT,s:f.sT}:null;
  return {mode,wide,phone:true,text,art,tail,clip:{x:0,y:b.top,w,h:ah},textLayout:lay};
 }
 if(!wide){
  const y0=34,y1=612,s=Math.min(aw/CARD_W,ah/(y1-y0),2.4),x=b.left+(aw-CARD_W*s)/2,y=b.top+(ah-(y1-y0)*s)/2-y0*s,t={x,y,s};
  return {mode,wide,text:t,art:t,clip:{x:Math.max(0,x),y:b.top,w:Math.min(w,CARD_W*s),h:ah},textLayout:layoutText(ctx,spec,{mode,minPx:9/s})};
 }
 const gap=aw*.05,tw=aw*.43,artX=b.left+tw+gap,artW=b.right-artX;
 const probe=layoutText(ctx,spec,{mode,stack:true,minPx:9}),pill=spec.cta?56:0,blockH=probe.bottom-probe.top+pill;
 const sT=Math.min(tw/336,ah/blockH,2.3),lay=sT===1?probe:layoutText(ctx,spec,{mode,stack:true,minPx:9/sT});
 const text={x:b.left-16*sT,y:b.top+(ah-(lay.bottom-lay.top+pill)*sT)/2-lay.top*sT,s:sT};
 const B=artBounds(spec),sA=Math.min(artW/B.w,ah/B.h,2.8)*.9,art={x:artX+(artW-B.w*sA)/2-B.x*sA,y:b.top+(ah-B.h*sA)/2-B.y*sA,s:sA};
 return {mode,wide,text,art,clip:{x:artX-gap*.5,y:b.top-8,w:b.right-artX+gap*.5,h:ah+16},textLayout:lay,artScale:sA};
}

/* ---------- typography ---------- */
const hasLetterSpacing=typeof CanvasRenderingContext2D!=='undefined'&&'letterSpacing' in CanvasRenderingContext2D.prototype;
function font(c,size,weight){c.font=`${weight} ${size}px "${FONT}","Space Grotesk",Arial,sans-serif`;}
function measure(c,text,size,weight,ls){if(!c)return text.length*size*.6+ls*size*text.length;font(c,size,weight);if(hasLetterSpacing){c.letterSpacing=ls?ls*size+'px':'0px';const w=c.measureText(text).width;c.letterSpacing='0px';return w;}return c.measureText(text).width+ls*size*Math.max(0,text.length-1);}
function fillSpaced(c,text,x,y,size,ls){
 if(!ls){c.fillText(text,x,y);return;}
 if(hasLetterSpacing){c.letterSpacing=ls*size+'px';c.fillText(text,x,y);c.letterSpacing='0px';return;}
 const align=c.textAlign;let w=0;for(const ch of text)w+=c.measureText(ch).width+ls*size;w-=ls*size;
 let cx=align==='center'?x-w/2:align==='right'?x-w:x;c.textAlign='left';
 for(const ch of text){c.fillText(ch,cx,y);cx+=c.measureText(ch).width+ls*size;}c.textAlign=align;
}
function wrap(c,text,size,weight,ls,max){
 if(!text)return [];const words=String(text).split(' '),lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(line&&measure(c,next,size,weight,ls)>max){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
const heroFinal=h=>h.mins!=null?Math.floor(h.mins/60)+'h '+String(h.mins%60).padStart(2,'0')+'m':h.text;
function heroAt(h,e){
 if(e>=1||(h.n==null&&h.mins==null))return h.text;
 if(h.mins!=null){const m=Math.round(h.mins*e);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';}
 return (h.n*e).toLocaleString('en-US',{minimumFractionDigits:h.dec||0,maximumFractionDigits:h.dec||0});
}
const countAt=(item,e)=>item.n!=null&&e<1?(item.n*e).toLocaleString('en-US',{minimumFractionDigits:item.dec||0,maximumFractionDigits:item.dec||0}):item.text;

// Text elements in card units, following the design's positions. stack: grid/row follow the
// unit block (wide layouts) instead of sitting at their fixed card positions.
// boost (live phones only): {artTop} lets the hero, grid and row figures grow while the hero block
// stays clear of the artwork; otherwise the design sizes hold.
export function layoutText(c,spec,{mode='export',stack=false,minPx=0,boost=null}={}){
 const ops=[],live=mode==='live',fin=heroFinal(spec.hero),textHero=spec.hero.n==null&&spec.hero.mins==null;
 const grow=size=>Math.max(size,Math.min(minPx,size*1.4));
 // Sizes follow the design, then shrink to the measured width so long words (WEDNESDAY) always fit.
 const cap=spec.heroSmall?50:(spec.heroMax||110);let hs=Math.round(Math.min(cap,324/(fin.length*(textHero?0.66:0.62))));
 const hw=measure(c,fin,hs,800,-.04);if(hw>326)hs=Math.floor(hs*326/hw);
 if(boost){
  // Grow the hero up to the width, but keep the unit lines (and a row that follows them) above the art.
  let big=Math.round(Math.min(spec.heroSmall?(boost.stacked?96:80):cap*1.15,324/(fin.length*(textHero?0.66:0.62))));
  const bw=measure(c,fin,big,800,-.04);if(bw>326)big=Math.floor(big*326/bw);
  const unitH=wrap(c,spec.unit,Math.max(10,Math.min(minPx,14)),600,.16,320).length*12.5,rowH=spec.row?.length&&spec.rowAfterUnit?50:0;
  const room=(boost.artTop-10-126-unitH-rowH)/.9;
  // stacked phone layouts place the artwork below the headline block, so only the width limits the hero
  hs=Math.max(hs,boost.stacked?big:Math.min(big,Math.floor(room)));
 }
 const ml=Math.max(spec.t1.length,spec.t2.length);let ts=Math.min(34,Math.floor(324/(Math.max(ml,1)*0.6)));
 const tw=Math.max(measure(c,spec.t1,ts,800,-.04),measure(c,spec.t2,ts,800,-.04));if(tw>322)ts=Math.floor(ts*322/tw*10)/10;
 if(!live&&!spec.bare){
  ops.push({k:'text',t:spec.grp,x:18,y:16,size:10,w:600,ls:.14,alpha:.85,base:'top'});
  ops.push({k:'text',t:spec.right,x:342,y:16,size:10,w:600,ls:.14,alpha:.85,base:'top',align:'right'});
 }
 ops.push({k:'rise',t:spec.t1,x:18,y:44,size:ts,w:800,ls:-.04,lh:.9,delay:0});
 ops.push({k:'rise',t:spec.t2,x:18,y:44+ts*.9,size:ts,w:800,ls:-.04,lh:.9,delay:.08});
 ops.push({k:'hero',hero:spec.hero,x:14,y:118,size:hs,w:800,ls:-.04,lh:.9,color:spec.heroColor||'#FFFFFF',delay:.3});
 let y=118+Math.round(hs*.9)+8;
 const capSize=grow(10);
 for(const line of wrap(c,spec.unit,capSize,600,.16,320)){ops.push({k:'text',t:line,x:20,y,size:capSize,w:600,ls:.16,delay:.5,base:'top'});y+=capSize*1.25;}
 y+=20-capSize*1.25;
  let bottom=y,head=y,tail=null;
 if(spec.row?.length){
  const top=stack||spec.rowAfterUnit?y+(spec.rowAfterUnit?6:18):spec.rowTop,part=stack||spec.rowAfterUnit?null:'tail';let x=18;
  // the row shrinks as a whole when long values (2h 23m 48s) would pass the card edge
  const rv=boost?34:30,widths=spec.row.map(r=>Math.max(measure(c,r.text,rv,800,-.04),measure(c,r.l,capSize,600,.16))),k=Math.min(1,324/(widths.reduce((a,b)=>a+b,0)+32*(spec.row.length-1))),vs=rv*k,ls=Math.max(capSize*Math.max(k,.82),7.5);
  spec.row.forEach((r,i)=>{ops.push({k:'count',item:r,x,y:top,size:vs,w:800,ls:-.04,delay:1.6,base:'top',part});ops.push({k:'text',t:r.l,x,y:top+vs*1.07,size:ls,w:600,ls:k<.9?.08:.16,alpha:.8,delay:1.6,base:'top',part});x+=widths[i]*k+32*k;});
  bottom=Math.max(bottom,top+vs*1.07+ls*1.3);
  if(part)tail={y0:top,y1:top+vs*1.07+ls*1.3};else head=bottom;
 }
 if(spec.grid?.length){
  const top=stack?y+20:spec.gridTop,part=stack?null:'tail',row=spec.gridSmall?40:(spec.grid.some(g=>g.s)?72:58),pad=spec.gridSmall?6:10,colW=162,ls2=grow(9.5);
  let fs=spec.gridSmall?(boost?21:18):(boost?28:24);
  if(boost){const widest=Math.max(...spec.grid.map(g=>measure(c,g.text,fs,800,-.04)));if(widest>colW-8)fs=Math.max(spec.gridSmall?18:24,fs*(colW-8)/widest);}
  ops.push({k:'rule',x:18,y:top,w:324,part});
  spec.grid.forEach((g,i)=>{
   const gx=18+(i%2)*colW,gy=top+Math.floor(i/2)*row,d=1+i*.1;
   ops.push({k:'count',item:g,x:gx,y:gy+pad,size:fs,w:800,ls:-.04,delay:d,base:'top',part});
   ops.push({k:'gridlabel',t:g.l,s:g.s,x:gx,y:gy+pad+fs*.9+5,size:ls2,delay:d,base:'top',max:colW-6,part});
   if(i%2===0||i===spec.grid.length-1)ops.push({k:'rule',x:18,y:gy+row,w:324,delay:d,part});
  });
  bottom=Math.max(bottom,top+Math.ceil(spec.grid.length/2)*row);
  if(part)tail={y0:Math.min(tail?.y0??top,top),y1:Math.max(tail?.y1??0,top+Math.ceil(spec.grid.length/2)*row)};else head=bottom;
 }
 if(!live){
  // Exports keep the caption and add the required data notice under it.
  const lines=[...wrap(c,spec.cap1,11,600,0,324).map(t=>({t,w:600,a:1})),...wrap(c,spec.cap2,11,400,0,324).map(t=>({t,w:400,a:.7}))];
  // The footer stays anchored to the card bottom when the content is lifted; a brand line sits below the notice.
  const L=spec.lift||0,B=spec.brand?16:0;
  let cy=640+L-B-(spec.notice?26:12)-(spec.legend?16:0)-lines.length*15.4;
  for(const l of lines){ops.push({k:'text',t:l.t,x:18,y:cy,size:11,w:l.w,alpha:l.a,base:'top',delay:1.8});cy+=15.4;}
  if(spec.legend){ops.push({k:'legend',t:spec.legend,x:18,y:cy+3,size:8.5,w:600,ls:.06,alpha:.75,base:'top'});}
  if(spec.notice)ops.push({k:'text',t:spec.notice.toUpperCase(),x:18,y:620+L-B,size:7.5,w:600,ls:.14,alpha:.62,base:'top'});
  if(spec.brand)ops.push({k:'text',t:spec.brand,x:18,y:620+L,size:8.5,w:700,ls:.14,alpha:.9,base:'top'});
 }
 return {ops,top:44-2,bottom,head,tail};
}

/* draw: intro = seconds since the card appeared (null = settled); alpha = transition fade */
export function drawText(c,frame,spec,{intro=null,alpha=1,palette=null,labels=true}={}){
 const roles=colorRoles(spec,palette),ink=roles?.ink||'#FFFFFF',T0=frame.text,lay=frame.textLayout;
 const fadeK=d=>intro==null?1:easeOut3((intro-d)/.9);
 const countE=intro==null?1:easeOut3((intro-.5)/1.5);
 c.save();c.textBaseline='alphabetic';
 for(const op of lay.ops){
 const T=op.part==='tail'&&frame.tail?frame.tail:T0;
  if(op.k==='rule'){const a=fadeK(op.delay||1)*alpha;if(a<.01)continue;c.globalAlpha=a*(roles?.35:.2);c.fillStyle=ink;c.fillRect(T.x+op.x*T.s,T.y+op.y*T.s,op.w*T.s,Math.max(1,T.s*.9));continue;}
  const size=op.size*T.s;font(c,size,op.w);c.textAlign=op.align||'left';
  const col=textColor(op.color||'#FFFFFF',roles),base=op.base==='top'?size*.8:size*.82;
  const x=T.x+op.x*T.s,y=T.y+op.y*T.s+base;
  if(op.k==='rise'){
   if(!op.t)continue;const p=intro==null?1:riseEase((intro-op.delay)/.8),lineH=op.size*op.lh*T.s*1.12;
   c.save();c.beginPath();c.rect(x-size*.2,T.y+op.y*T.s-size*.1,Math.max(10,measure(c,op.t,size,op.w,op.ls))+size*.4,lineH+size*.15);c.clip();
   c.globalAlpha=alpha;c.fillStyle=col;fillSpaced(c,op.t,x,y+(1-p)*1.05*lineH,size,op.ls);c.restore();continue;
  }
  const a=(op.delay==null?1:fadeK(op.delay))*(op.alpha??1)*alpha;if(a<.01)continue;
  c.globalAlpha=a;c.fillStyle=col;
  if(op.k==='hero'){fillSpaced(c,heroAt(op.hero,countE),x,y,size,op.ls);continue;}
  if(op.k==='count'){fillSpaced(c,countAt(op.item,countE),x,y,size,op.ls);continue;}
  if(op.k==='gridlabel'){font(c,size,600);fillSpaced(c,op.t,x,y,size,.04);if(op.s){font(c,size,400);c.globalAlpha=a*.65;const max=op.max*T.s;let t=op.s;while(t.length>3&&c.measureText(t).width>max)t=t.slice(0,-2)+'…';fillSpaced(c,t,x,y+size*1.35,size,0);}continue;}
  if(op.k==='legend'){const r=size*.32;c.fillStyle=textColor(spec.acc,roles);c.beginPath();c.arc(x+r,y-size*.32,r,0,Math.PI*2);c.fill();c.fillStyle=col;fillSpaced(c,op.t,x+r*2+size*.6,y,size,op.ls);continue;}
  fillSpaced(c,op.t,x,y,size,op.ls||0);
 }
 if(labels){
  const b=build(spec),A=frame.art,la=intro==null?1:easeOut3((intro-1.5)/.9);
  for(const l of b.labels){
   const a=la*alpha;if(a<.01)break;
   // phones: chart labels 15% larger (checked collision-free on every card design and both sample years)
   const k=frame.phone?1.15:1,ts=Math.max((l.ts||10)*k,Math.min(9/A.s,(l.ts||10)*1.3)),ss=Math.max((l.ss||8)*k,Math.min(8.5/A.s,(l.ss||8)*1.3)),hi=l.flip||l.sb;
   c.textAlign=l.anc==='c'?'center':l.anc==='r'?'right':'left';
   const x=A.x+l.x*A.s,y=A.y+l.y*A.s;
   font(c,ts*A.s,l.tw||800);c.globalAlpha=a;c.fillStyle=textColor(l.c||'#FFFFFF',roles,l.sk);c.fillText(l.t,x,y+ts*A.s*.92);
   if(l.s){font(c,ss*A.s,hi?800:500);c.globalAlpha=a*(hi?1:.75);c.fillStyle=textColor(l.sc||l.c||'#FFFFFF',roles,l.sk);c.fillText(l.s,x,y+ts*A.s*1.2+ss*A.s*.95);}
  }
 }
 c.restore();
}
// Static text needs no redraw after its intro has finished.
export const TEXT_SETTLE=2.8;

/* ---------- background ---------- */
export function backgroundStops(spec,palette){
 if(palette)return {base:palette[0],glow:mixHex(palette[2],palette[0],.82),glowA:1,cta:false};
 return {base:COLORS.NAVY,glow:spec.cta?'#C7FF3F':spec.acc,glowA:spec.cta?.08:.16,cta:!!spec.cta};
}
export function drawBackground(c,w,h,spec,frame,palette){
 const st=backgroundStops(spec,palette),T=frame.mode==='live'&&(frame.wide||frame.phone)?frame.art:frame.text;
 c.fillStyle=st.base;c.fillRect(0,0,w,h);
 const cx=frame.mode==='live'&&frame.wide?T.x+180*T.s:T.x+180*T.s,cy=T.y+(st.cta?.56:.64)*640*T.s,rx=Math.max(w,360*T.s)*.68,ry=640*T.s*.68;
 c.save();c.translate(cx,cy);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,0,0,0,rx),[r,gg,bb]=hexRgb(st.glow);
 g.addColorStop(0,`rgba(${r},${gg},${bb},${palette?.55:st.glowA})`);g.addColorStop(1,`rgba(${r},${gg},${bb},0)`);c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();
 if(st.cta){const lg=c.createLinearGradient(0,0,0,h);lg.addColorStop(.72,'rgba(6,10,20,0)');lg.addColorStop(1,'rgba(6,10,20,.92)');c.fillStyle=lg;c.fillRect(0,0,w,h);}
}

/* ---------- dot layer, CPU side ---------- */
// Fills `out` with screen-space dots for one card at ambient time t.
// intro: seconds since the card appeared (null = settled); fade: card opacity;
// from: optional Float32Array of [x,y] screen positions the dots fly in from (morph).
export function createDotBuffer(capacity=4096){const n=capacity;return {n:0,cap:n,x:new Float32Array(n),y:new Float32Array(n),r:new Float32Array(n),c:new Float32Array(n*3),a:new Float32Array(n),core:new Float32Array(n)};}
function grow(buf,need){if(need<=buf.cap)return;const nb=createDotBuffer(Math.max(need,buf.cap*2));for(const k of ['x','y','r','a','core'])nb[k].set(buf[k]);nb.c.set(buf.c);Object.assign(buf,nb,{n:buf.n});}
const RGB={};const rgbOf=h=>RGB[h]||(RGB[h]=hexRgb(h).map(v=>v/255));
const tmp={x:0,y:0,z:0,k:1,ka:1};
export function collectDots(buf,spec,{t=30,intro=null,fade=1,frame,palette=null,from=null,minR=0}={}){
 const b=build(spec),A=frame.art,roles=colorRoles(spec,palette),introLen=b.intro||1.3;
 grow(buf,buf.n+b.pts.length);
 const cache=roles?(spec._roleCache||(spec._roleCache=new Map())):null;
 for(let i=0;i<b.pts.length;i++){
  const p=b.pts[i];place(b,p,t,tmp);
  const e=intro==null?1:ease((intro-0.2-p.d)/introLen);
  let sx,sy;
  if(from&&from.length){const j=(i%(from.length/2))*2;sx=from[j];sy=from[j+1];}else{sx=A.x+p.sx*A.s;sy=A.y+p.sy*A.s;}
  const tx=A.x+tmp.x*A.s,ty=A.y+tmp.y*A.s,x=sx+(tx-sx)*e,y=sy+(ty-sy)*e;
  let r=p.s*tmp.k*A.s,[hex,am]=roles?(cache.get(p)||(cache.set(p,dotColor(p,roles)),cache.get(p))):[p.c,1];
  const a=p.a*tmp.ka*(0.15+0.85*e)*fade*am;
  if(a<=0.01||r<=0.05)continue;
  if(minR&&!p.g)r=Math.max(r,minR);
  const k=buf.n++,col=rgbOf(hex);
  buf.x[k]=x;buf.y[k]=y;buf.r[k]=r;buf.a[k]=Math.min(1,a);buf.c[k*3]=col[0];buf.c[k*3+1]=col[1];buf.c[k*3+2]=col[2];buf.core[k]=!p.g&&r>2.5*A.s?1:0;
 }
 return buf;
}
// Current screen positions of a card's dots (used as the start of the next card's morph).
export function snapshotDots(spec,{t,intro,frame}){
 const b=build(spec),A=frame.art,out=new Float32Array(b.pts.length*2),hasData=b.pts.some(q=>q.dat);let k=0;
 for(const p of b.pts){if(hasData&&!p.dat)continue;place(b,p,t,tmp);const e=intro==null?1:ease((intro-0.2-p.d)/(b.intro||1.3));out[k++]=A.x+(p.sx+(tmp.x-p.sx)*e)*A.s;out[k++]=A.y+(p.sy+(tmp.y-p.sy)*e)*A.s;}
 return out.slice(0,k);
}

/* 2D sprites: same falloff as the WebGL shader */
const SPR=new Map();
function sprite(rgb,core){
 const key=rgb.join()+(core?'*':'');if(SPR.has(key))return SPR.get(key);
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),s=rgb.map(v=>Math.round(v*255)).join(','),gr=g.createRadialGradient(32,32,0,32,32,32);
 gr.addColorStop(0,core?'rgba(255,255,255,1)':`rgba(${s},1)`);gr.addColorStop(.28,`rgba(${s},1)`);gr.addColorStop(.5,`rgba(${s},.32)`);gr.addColorStop(1,`rgba(${s},0)`);
 g.fillStyle=gr;g.fillRect(0,0,64,64);SPR.set(key,c);return c;
}
export function drawDots2D(c,buf,{additive=true}={}){
 c.save();c.globalCompositeOperation=additive?'lighter':'source-over';
 for(let i=0;i<buf.n;i++){const r=buf.r[i];c.globalAlpha=buf.a[i];c.drawImage(sprite([buf.c[i*3],buf.c[i*3+1],buf.c[i*3+2]],buf.core[i]>0),buf.x[i]-r*1.6,buf.y[i]-r*1.6,r*3.2,r*3.2);}
 c.restore();
}
export const additiveFor=palette=>!palette;
