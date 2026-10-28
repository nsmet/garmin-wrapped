import {posterLayout} from './poster-layout.mjs';
import {palettes} from './visual-system.mjs';
import {drawDurationPoster} from './duration-posters.mjs';
import {formatNumber as fmt,formatDecimal} from './measurement-format.mjs';
import {healthMonthExtremes} from './story-model.mjs';

const colors=['#1743ed','#ff7038','#f23897','#8de4c4','#f2e630','#a18ce4','#0699ac','#b65c23','#79ac29','#ed8bad','#6d99fa','#d3bd87','#923e79','#24715d','#dfbf13','#677a94','#cf4646','#745ab9','#aaaaaa'];
export function chartColor(key,index=0){const keys=['running','cycling','hiit','strength','walking','hiking','swimming','rowing','yoga','pilates','elliptical','skiing','golf','racket','triathlon','team_sports','climbing','cardio','other'];return colors[Math.max(0,keys.indexOf(key))]||colors[index%colors.length];}
function text(c,value,x,y,size,max,ink,{bold=false,align='left',condensed=false}={}){
 c.save();const family=condensed?'"Anton",Impact':'"Space Grotesk",Arial';c.font=`${bold?800:500} ${size}px ${family}`;
 const width=c.measureText(String(value)).width;if(width>max)size*=max/width;
 c.font=`${bold?800:500} ${size}px ${family}`;c.fillStyle=ink;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(String(value),x,y);c.restore();
}
function rule(c,x,y,w,ink,alpha=.25){c.save();c.globalAlpha=alpha;c.fillStyle=ink;c.fillRect(x,y,w,1);c.restore();}
function donut(c,x,y,r,items,total,ink,paper){
 let angle=-Math.PI/2;c.lineWidth=r*.28;
 for(const [i,item] of items.entries()){const arc=item.value/total*Math.PI*2;c.beginPath();c.strokeStyle=chartColor(item.key,i);c.arc(x,y,r,angle+.012,angle+Math.max(.013,arc-.012));c.stroke();angle+=arc;}
 text(c,fmt(total),x,y+r*.12,r*.65,r*1.4,ink,{bold:true,condensed:true,align:'center'});
 text(c,'ACTIVITIES',x,y+r*.40,r*.13,r*1.3,ink,{align:'center'});
}
function summary(c,b,chart,p,receipt){
 const {x,y,w,h}=b,items=chart.items;
 if(receipt){
  items.forEach((item,i)=>{const row=h/items.length,top=y+i*row;rule(c,x,top,w,p[1]);text(c,item.label,x,top+row*.57,11,w*.45,p[1]);text(c,item.value,x+w,top+row*.69,row*.68,w*.48,p[1],{bold:true,condensed:true,align:'right'});});return;
 }
 const rows=Math.ceil(items.length/2),cw=w/2,ch=h/rows;
 items.forEach((item,i)=>{const left=x+(i%2)*cw,top=y+Math.floor(i/2)*ch;rule(c,left,top,cw-12,p[1]);c.fillStyle=i%2?p[3]:p[2];c.fillRect(left,top,Math.min(32,cw*.18),3);text(c,item.label,left,top+22,10,cw-15,p[1]);text(c,item.value,left,top+ch*.68,Math.min(ch*.49,88),cw-16,i===0?p[2]:p[1],{bold:true,condensed:true});text(c,item.unit,left,top+ch*.88,10,cw-16,p[1]);});
}
function mix(c,b,chart,p){
 const {x,y,w,h}=b,two=chart.items.length>8,rows=Math.ceil(chart.items.length/(two?2:1));
 const row=Math.min(25,(h*.51)/Math.max(rows,1)),legendH=row*rows,r=Math.min(w*.22,(h-legendH-16)/2.45,105);
 donut(c,x+w/2,y+r*1.15,r,chart.items,chart.total,p[1],p[0]);
 const top=y+Math.max(r*2.5,h-legendH);
 chart.items.forEach((item,i)=>{const col=two?Math.floor(i/rows):0,offset=two?i%rows:i,cw=w/(two?2:1),left=x+col*cw,base=top+offset*row;c.fillStyle=chartColor(item.key,i);c.fillRect(left,base+2,7,7);text(c,item.label,left+13,base+9,two?9:11,cw*.62,p[1]);text(c,`${fmt(item.value)}  ${Math.round(item.value/chart.total*100)}%`,left+cw-5,base+9,two?9:11,cw*.29,p[1],{bold:true,align:'right'});});
}
export function monthExtremes(chart){
 const items=chart.items.filter(i=>i.state==='complete'&&i.value!==null);
 if(!chart.compare||!items.length)return null;
 const max=Math.max(...items.map(i=>i.value)),min=Math.min(...items.map(i=>i.value));
 return {max,min,peak:items.filter(i=>i.value===max),quiet:items.filter(i=>i.value===min)};
}
function months(c,b,chart,p){
 const {x,y,w,h}=b,gap=7,cw=(w-gap*2)/3,comparison=monthExtremes(chart),footer=comparison?58:24,ch=(h-footer-gap*3)/4;
 text(c,`RECORDED ${chart.measure.toUpperCase()} · DARKER = MORE`,x,y-10,8,w,p[1]);
 const max=Math.max(1,...chart.items.map(i=>i.value||0));
 chart.items.forEach((item,i)=>{
  const left=x+i%3*(cw+gap),top=y+Math.floor(i/3)*(ch+gap),level=item.value===null?0:item.value/max;
  const tone=Math.ceil(level*4);c.fillStyle=item.value===null?'#deddd5':['#ece9df','#d9def5','#b9c6f3','#91a7ee','#1743ed'][tone];c.fillRect(left,top,cw,ch);
  const ink=tone===4?'#fffaf0':'#101519';text(c,item.label+(item.state==='current'?' · SO FAR':''),left+9,top+16,9,cw-18,ink,{bold:true});
  text(c,item.value===null?'—':fmt(item.value),left+9,top+ch*.64,Math.min(29,ch*.36),cw-18,ink,{bold:true,condensed:true});
  text(c,item.value===null?(item.state==='future'?'UPCOMING':'UNKNOWN'):chart.measure==='minutes'?`${item.sessions} ACTIVITIES`:'ACTIVITIES',left+9,top+ch-9,Math.min(8,ch*.13),cw-18,ink);
 });
 const bottom=y+h-footer;
 if(comparison){
  const label=a=>a.length===1?a[0].label:`${a[0].label} + ${a.length-1}`;
  for(const [i,[name,items,value]] of [['PEAK MONTH',comparison.peak,comparison.max],['QUIETEST MONTH',comparison.quiet,comparison.min]].entries()){
   const left=x+i*w/2;rule(c,left,bottom+10,w/2-10,p[1]);text(c,name+(items.length>1?' · TIED':''),left,bottom+27,8,w/2-12,p[1]);text(c,`${label(items)} / ${fmt(value)}`,left,bottom+47,19,w/2-12,p[1],{bold:true,condensed:true});
  }
 }else text(c,chart.compare?'NO COMPLETED MONTHS YET':'IMPORTED RECORDS · NO ANNUAL RANKING',x,bottom+21,9,w,p[1]);
}
function record(c,b,s,p){
 const {x,y,w,h}=b,max=Math.max(...s.chart.items.map(i=>i.value),1);
 text(c,s.value,x,y+h*.28,Math.min(h*.32,100),w,p[1],{bold:true,condensed:true});text(c,'KM · LONGEST RECORDED',x,y+h*.37,10,w,p[1]);
 s.chart.items.forEach((item,i)=>{const top=y+h*.52+i*h*.15,bw=(w-90)*item.value/max;c.fillStyle=i===0?p[2]:p[3];c.fillRect(x+27,top,bw,Math.max(9,h*.055));text(c,item.label,x,top+12,10,24,p[1]);text(c,formatDecimal(item.value)+' km',x+w,top+12,11,58,p[1],{align:'right'});});
}
function healthMonths(c,b,chart,p){
 const {x,y,w,h}=b,items=chart.items,values=items.filter(i=>i.value!==null).map(i=>i.value),isHrv=chart.measure==='hrv',isActivity=chart.measure==='activityHR',extremes=healthMonthExtremes(chart);
 const low=Math.max(0,Math.floor((Math.min(...values)-5)/5)*5),high=Math.ceil((Math.max(...values)+5)/5)*5;
 const badgeH=Math.min(43,Math.max(28,h*.12)),left=x+28,right=x+w-9,top=y+(extremes?badgeH+29:27),bottom=y+h*(extremes?.52:.55),step=(right-left)/11;
 const pointY=value=>bottom-(value-low)/(high-low)*(bottom-top);
 text(c,`MONTHLY ${isHrv?'MEDIAN':'AVERAGE'} · ${isHrv?'MS':'BPM'}`,x,y+6,9,w*.7,p[1],{bold:true});
 if(items.some(item=>item.state==='current'))text(c,'* SO FAR',x+w,y+6,8,w*.27,p[1],{align:'right'});
 if(extremes){
  const ink=color=>{const n=parseInt(color.slice(1),16),l=.299*(n>>16)+.587*((n>>8)&255)+.114*(n&255);return l>130?'#101519':'#fffaf0';};
  const label=list=>list[0].label+(list[0].state==='current'?'*':'')+(list.length>1?` +${list.length-1}`:'');
  const tied=extremes.high===extremes.low,boxes=tied?[['ALL RECORDED MONTHS TIED',extremes.highest,extremes.high,p[1]]]:[['HIGHEST AVERAGE',extremes.highest,extremes.high,p[2]],['LOWEST AVERAGE',extremes.lowest,extremes.low,p[3]]];
  boxes.forEach(([name,list,value,color],i)=>{const bw=(w-(boxes.length-1)*7)/boxes.length,bx=x+i*(bw+7),by=y+13;c.fillStyle=color;c.fillRect(bx,by,bw,badgeH);const foreground=ink(color);text(c,name,bx+8,by+11,8,bw-16,foreground,{bold:true});text(c,`${tied?'':label(list)+'  '}${fmt(value)} ${isHrv?'MS':'BPM'}`,bx+8,by+badgeH-5,Math.min(22,badgeH*.52),bw-16,foreground,{bold:true,condensed:true});});
 }
 for(let i=0;i<=2;i++){const value=low+(high-low)*i/2,py=pointY(value);rule(c,left,py,right-left,p[1],.18);text(c,fmt(value),left-7,py+3,8,24,p[1],{align:'right'});}
 c.strokeStyle=p[1];c.lineWidth=2.5;c.lineJoin='round';c.beginPath();let previous=false;
 items.forEach((item,i)=>{if(item.value===null){previous=false;return;}const px=left+i*step,py=pointY(item.value);if(previous)c.lineTo(px,py);else c.moveTo(px,py);previous=true;});c.stroke();
 items.forEach((item,i)=>{const px=left+i*step;if(item.value!==null){const hi=extremes&&extremes.high!==extremes.low&&item.value===extremes.high,lo=extremes&&extremes.high!==extremes.low&&item.value===extremes.low;c.fillStyle=hi?p[2]:lo?p[3]:p[1];c.beginPath();c.arc(px,pointY(item.value),hi||lo?5:3.5,0,Math.PI*2);c.fill();}text(c,item.label[0],px,bottom+13,8,step,p[1],{align:'center'});});
 // A ruled table gives each month its value and source count, including gaps.
 const tableTop=bottom+23,row=(y+h-tableTop)/4,cw=w/3;
 items.forEach((item,i)=>{const px=x+i%3*cw,py=tableTop+Math.floor(i/3)*row,hi=extremes&&extremes.high!==extremes.low&&item.value===extremes.high,lo=extremes&&extremes.high!==extremes.low&&item.value===extremes.low;rule(c,px,py,cw-10,p[1],.25);if(hi||lo){c.fillStyle=hi?p[2]:p[3];c.fillRect(px,py+2,5,5);}text(c,(hi?'↑ ':lo?'↓ ':'')+item.label+(item.state==='current'?'*':''),px+(hi||lo?8:0),py+row*.32,8,cw*.48,p[1]);text(c,item.value===null?'—':fmt(item.value),px+cw-12,py+row*.43,Math.min(23,row*.42),cw*.48,p[1],{bold:true,condensed:true,align:'right'});text(c,item.state==='future'?'UPCOMING':`${item.count} ${isHrv?'NIGHTS':isActivity?'ACTIVITIES':'DAYS'}${item.value===null&&!isActivity?' / <10':''}`,px,py+row*.83,7,cw-12,p[1]);});
}
function weekdays(c,b,s,p){
 const {x,y,w,h}=b,max=Math.max(...s.chart.items.map(i=>i.value),1),cw=w/7;
 text(c,s.value,x,y+h*.17,Math.min(w*.13,49),w,p[1],{bold:true,condensed:true});
 s.chart.items.forEach((item,i)=>{const bh=(h*.46)*item.value/max,left=x+i*cw+4,base=y+h*.81;c.fillStyle=item.value===max?p[2]:p[3];c.fillRect(left,base-bh,cw-10,Math.max(2,bh));text(c,item.value,left+(cw-10)/2,base-bh-10,12,cw-6,p[1],{align:'center'});text(c,item.label.slice(0,3).toUpperCase(),left+(cw-10)/2,base+23,9,cw-6,p[1],{align:'center'});});
}
export function drawDataPoster(c,w,h,s,time=0,alpha=1,layout=posterLayout(w,h),palette){
 if(!s.chart||alpha<.001)return;
 const p=palette||palettes[s.template],{wide,content,unit}=layout;
 c.save();c.globalAlpha=alpha;
 const size=Math.min((wide?62:36)*unit,content.w*(wide?.115:.098),content.h*.15),titleX=content.x;
 const top=wide?content.y+content.h*.22:content.y+size*.83,max=wide?content.w*.42:content.w;
 s.title.forEach((line,i)=>text(c,line,titleX,top+i*size*.91,size,max,p[1],{bold:true,condensed:true}));
 if(wide)text(c,s.unit,titleX,top+(s.title.length-1)*size*.91+32*unit,12*unit,max,p[1]);
 const chartTop=wide?content.y+20*unit:top+(s.title.length-1)*size*.91+28*unit;
 const box=wide?{x:content.x+content.w*.50,y:chartTop,w:content.w*.50,h:content.y+content.h-chartTop}:{x:content.x,y:chartTop,w:content.w,h:content.y+content.h-chartTop};
 // Scale the complete chart, including its labels, for large screens.
 c.translate(box.x,box.y);c.scale(unit,unit);
 const b={x:0,y:0,w:box.w/unit,h:box.h/unit};
 switch(s.chart.kind){
  case 'summary':summary(c,b,s.chart,p,s.presentation==='receipt');break;
  case 'sport-mix':mix(c,b,s.chart,p);break;
  case 'months':months(c,b,s.chart,p);break;
  case 'health-months':healthMonths(c,b,s.chart,p);break;
  case 'duration':drawDurationPoster(c,b,s,p,time);break;
  case 'record':record(c,b,s,p);break;
  case 'weekdays':weekdays(c,b,s,p);break;
 }
 c.restore();
}
