import {posterLayout} from './poster-layout.mjs';
import {palettes,motionProfile} from './visual-system.mjs';
import {drawDataPoster} from './data-poster.mjs';
import {drawLayeredArt} from './layered-art.mjs';
export {palettes};
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
function color(a,b,t){return 'rgb('+[1,3,5].map(k=>Math.round(parseInt(a.slice(k,k+2),16)*(1-t)+parseInt(b.slice(k,k+2),16)*t)).join(',')+')';}
function type(c,str,x,y,size,max,ink,weight=800,family='Anton',align='left'){
 c.save();c.font=`${weight} ${size}px "${family}",Impact,Arial,sans-serif`;const width=c.measureText(str).width;if(width>max)size*=max/width;
 c.font=`${weight} ${size}px "${family}",Impact,Arial,sans-serif`;c.fillStyle=ink;c.textBaseline='alphabetic';c.textAlign=align;c.fillText(str,x,y);c.restore();
}
function typography(c,w,h,s,alpha,offset,time,layout,palette){
 if(s.chart){c.save();c.translate(0,offset);drawDataPoster(c,w,h,s,time,alpha,layout,palette);c.restore();return;}
 if(alpha<.002)return;c.save();c.globalAlpha=alpha;c.translate(0,offset);
 const p=palette||palettes[s.template],b=layout.text,max=b.w,lines=s.title.length,values=s.value.split('\n');
 if(s.template==='miniwatt'){
  const size=Math.min(max*.30,b.h*.70/(lines*.87));
  const top=b.y+size*.82;
  s.title.forEach((line,i)=>type(c,line,b.x,top+i*size*.87,size,max,p[1]));
  const labelY=top+(lines-1)*size*.87+size*.48;
  type(c,'MINI WATT ⚡',b.x,labelY,Math.min(22*layout.unit,b.h*.09),max,p[1],700,'Space Grotesk');
  type(c,s.unit,b.x,labelY+Math.min(24*layout.unit,b.h*.12),Math.min(10*layout.unit,b.h*.05),max,p[1],600,'Space Grotesk');
 }else if(['cover','finale'].includes(s.template)&&!s.libraryOnly){
  const size=Math.min(max*.31,b.h/(lines*.87+.8));
  const top=b.y+size*.82;
  s.title.forEach((line,i)=>type(c,line,b.x,top+i*size*.87,size,max,p[1]));
  type(c,s.template==='cover'?s.value:s.value+' '+s.unit,b.x,top+(lines-1)*size*.87+size*.66,s.template==='cover'?size*.43:15*layout.unit,max,p[1],700,s.template==='cover'?'Anton':'Space Grotesk');
 }else{
  const titleSize=Math.min(74*layout.unit,max*.18,b.h*.34/Math.max(lines,1)),gap=titleSize*.94,top=b.y+titleSize*.83;
  s.title.forEach((line,i)=>type(c,line,b.x,top+i*gap,titleSize,max,p[1]));
  const labelSize=12*layout.unit,labelGap=24*layout.unit;
  const metric=Math.min(max*.63,(b.h-lines*gap-labelGap)/(1+(values.length-1)*.8));
  const start=top+(lines-1)*gap+metric*.94;
  values.forEach((line,i)=>type(c,line,b.x,start+i*metric*.8,metric,max,p[1]));
  type(c,s.unit,b.x,start+(values.length-1)*metric*.8+labelGap,labelSize,max,p[1],600,'Space Grotesk');
 }
 c.restore();
}
function reveal(c,w,h,t,story){
 const m=motionProfile(story);c.beginPath();
 if(['sleep','recovery','pilates','yoga'].includes(story.template))c.ellipse(w*.72,h*.58,Math.hypot(w,h)*t,Math.hypot(w,h)*t,0,0,Math.PI*2);
 else if(m.turn>0){const edge=-w*.35+w*1.7*t;c.moveTo(0,0);c.lineTo(edge+w*.22,0);c.lineTo(edge-w*.22,h);c.lineTo(0,h);c.closePath();}
 else {const edge=w*1.35-w*1.7*t;c.moveTo(w,0);c.lineTo(edge-w*.22,0);c.lineTo(edge+w*.22,h);c.lineTo(w,h);c.closePath();}
 c.clip();
}
function artLayer(c,w,h,story,phase,time,draw,layout){
 if(phase.alpha<.001)return;
 const m=motionProfile(story);c.save();c.translate(w*.035*phase.offset*m.turn,h*.025*phase.offset);
 const b={x:layout.art.x+layout.art.w/2,y:layout.art.y+layout.art.h/2};
 c.translate(b.x,b.y);c.rotate(phase.offset*m.turn*.025);c.scale(1-.025*Math.abs(phase.offset),1-.025*Math.abs(phase.offset));c.translate(-b.x,-b.y);
 draw(phase.alpha);c.restore();
}
export function renderPoster(c,w,h,{from,to=from,progress=1,time=0,assets={},chrome=false,index=0,total=10,year=2025,notice='Fictional data · design preview',bounds,palette}){
 const layout=posterLayout(w,h,{bounds:chrome==='share'?{top:h*.115,bottom:h*.85,...bounds}:bounds,chrome});
 const transition=from.id!==to.id&&progress<1,t=ease(progress),a=palette||palettes[from.template],b=palette||palettes[to.template],p=a.map((v,i)=>color(v,b[i],t));
 c.clearRect(0,0,w,h);c.fillStyle=transition?a[0]:b[0];c.fillRect(0,0,w,h);
 if(transition){c.save();reveal(c,w,h,t,to);c.fillStyle=b[0];c.fillRect(0,0,w,h);c.restore();}
 const outgoing={alpha:1-ease(progress/.64),offset:-t},incoming={alpha:ease((progress-.20)/.80),offset:1-t};
 const layers=transition?[[from,outgoing],[to,incoming]]:[[to,{alpha:1,offset:0}]];
 // Composition layers move independently; portrait art may extend behind the footer.
 for(const [s,phase] of layers){
  // Sport data cards retain their visual identity. In portrait, the artwork is
  // subdued so measured charts stay readable; in wide layouts it occupies the
  // spare column beneath the headline.
  const artLayout=s.chart&&layout.wide?{...layout,art:{x:layout.content.x,y:layout.content.y+layout.content.h*.43,w:layout.content.w*.42,h:layout.content.h*.55}}:layout;
  const strength=s.chart?(layout.wide?.85:.22):1;
  // The edge fade follows the transition, not the subdued chart-art opacity.
  artLayer(c,w,h,s,phase,time,alpha=>drawLayeredArt(c,w,h,s,time,assets,artLayout,palette||palettes[s.template],alpha*strength,s.template==='running'?alpha*strength:alpha),artLayout);
 }
 if(transition){typography(c,w,h,from,1-ease(progress/.36),-h*.018*t,time,layout,palette);typography(c,w,h,to,ease((progress-.45)/.55),h*.023*(1-t),time,layout,palette);}else typography(c,w,h,to,1,0,time,layout,palette);
 if(chrome){
  const pad=w*.056;type(c,'GARMIN WRAPED',pad,h*.048,w*.048,w*.68,b[1],800);type(c,String(year),w-pad,h*.048,w*.03,w*.18,b[1],600,'Space Grotesk','right');
  type(c,'a MINI WATT product ⚡',pad,h*.073,w*.027,w*.8,b[1],700,'Space Grotesk');
  if(chrome!=='share'){
   const count=Math.min(total,24),gap=w*.008,bar=(w-pad*2-gap*(count-1))/count;c.fillStyle=b[1];for(let i=0;i<count;i++){c.globalAlpha=i===Math.floor(index/total*count)?1:.3;c.fillRect(pad+i*(bar+gap),h*.09,bar,h*.002);}c.globalAlpha=1;
   type(c,`${String(index+1).padStart(2,'0')} / ${total}`,pad,h*.12,w*.025,w*.4,b[1],600,'Space Grotesk');
   c.fillStyle=b[1];c.globalAlpha=.3;c.fillRect(pad,h*.945,w-pad*2,1);c.globalAlpha=1;
  }
  to.caption.split('\n').slice(0,2).forEach((line,i)=>type(c,line,pad,h*(.90+i*.021),w*.032,w-pad*2,b[1],600,'Space Grotesk'));
  type(c,notice.toUpperCase(),pad,h*.972,w*.019,w-pad*2,b[1],500,'Space Grotesk');
 }
 return p;
}
