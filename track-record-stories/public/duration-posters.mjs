// Sport-specific time posters. Geometry is decorative: it never encodes laps,
// intervals, sets, routes or a split between multisport disciplines.
const TAU=Math.PI*2;
function accentInk(hex){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#101519':'#fffaf0';
}
function type(c,value,x,y,size,max,ink,align='left',label=false){
 c.save();const family=label?'"Space Grotesk",Arial':'"Barlow Condensed",Impact,Arial';
 // Art can stretch to the available space; the font keeps its natural shape.
 const matrix=c.getTransform(),sx=Math.hypot(matrix.a,matrix.b),sy=Math.hypot(matrix.c,matrix.d),cx=Math.min(1,sy/sx),cy=Math.min(1,sx/sy);
 c.translate(x,y);c.scale(cx,cy);max/=cx;
 c.font=`${label?600:800} ${size}px ${family}`;
 const width=c.measureText(String(value)).width;if(width>max)size*=max/width;
 c.font=`${label?600:800} ${size}px ${family}`;c.fillStyle=ink;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(String(value),0,0);c.restore();
}
function rect(c,x,y,w,h,ink){c.fillStyle=ink;c.fillRect(x,y,w,h);}
function path(c,points,ink,width=8,closed=false){
 c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(closed)c.closePath();
 if(width){c.strokeStyle=ink;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}else{c.fillStyle=ink;c.fill();}
}
function oval(c,x,y,rx,ry,ink,width=0,angle=0){
 c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);if(width){c.strokeStyle=ink;c.lineWidth=width;c.stroke();}else{c.fillStyle=ink;c.fill();}
}
function hours(c,s,p,x,y,size,max,align='left',ink=p[1]){
 type(c,s.value,x,y,size,max,ink,align);
 type(c,'RECORDED HOURS',x,y+46,28,max,ink,align,true);
}
function stat(c,s,p,i,x,y,max,{align='left',ink=p[1],size=100}={}){
 const item=s.chart.items[i];type(c,item.value,x,y,size,max,ink,align);
 type(c,item.label,x,y+42,26,max,ink,align,true);
}
function running(c,s,p,t){
 // A sweeping track, with the figures tucked into its open infield.
 for(let i=0;i<3;i++){
  c.beginPath();c.moveTo(20,970-i*40);c.bezierCurveTo(890,1040-i*60,1130,380,810-i*92,130);
  c.strokeStyle=i===1?p[3]:p[2];c.lineWidth=i===1?22:34;c.stroke();
 }
 const u=(t*.045)%1,v=1-u;
 c.save();c.globalAlpha*=Math.sin(Math.PI*u)**2;
 oval(c,20*v**3+3*890*v*v*u+3*1130*v*u*u+810*u**3,970*v**3+3*1040*v*v*u+3*380*v*u*u+130*u**3,12,12,p[1]);c.restore();
 hours(c,s,p,15,390,370,740);
 stat(c,s,p,0,20,640,450);
 stat(c,s,p,1,20,800,450);
}
function cycling(c,s,p,t){
 // Chainring, crank arm and a pair of compact specifications below it.
 c.save();c.translate(500,355);c.rotate(t*.045);
 for(let i=0;i<16;i++){c.save();c.rotate(i*TAU/16);rect(c,276,-20,48,40,p[2]);c.restore();}
 oval(c,0,0,278,278,p[2],30);
 for(let i=0;i<5;i++){const a=i*TAU/5;path(c,[[Math.cos(a)*202,Math.sin(a)*202],[Math.cos(a)*260,Math.sin(a)*260]],p[3],18);}
 c.restore();
 hours(c,s,p,500,421,285,470,'center');
 path(c,[[500,635],[635,710],[720,710]],p[3],22);
 stat(c,s,p,0,30,885,435);stat(c,s,p,1,970,885,435,{align:'right'});
}
function hiit(c,s,p,t){
 // A lightning cut through an oversized interval block.
 const shift=Math.sin(t*.8)*8;
 path(c,[[680+shift,10],[440,420],[600,420],[360+shift,900],[900,270],[705,270],[890,10]],p[3],0);
 hours(c,s,p,20,320,340,680);
 rect(c,0,520,475,184,p[1]);stat(c,s,p,0,24,640,420,{ink:p[0],size:98});
 rect(c,490,770,510,184,p[1]);stat(c,s,p,1,520,890,450,{ink:p[0],size:98});
}
function strength(c,s,p,t){
 // Loaded plates and staggered blocks give this card physical weight.
 path(c,[[600,145],[965,145]],p[1],24);
 for(const [x,h] of [[670,140],[720,220],[780,280],[840,220],[890,140]])rect(c,x,145-h/2,32,h,x===780?p[3]:p[1]);
 hours(c,s,p,15,485,390,960);
 rect(c,0,620,790,140,p[1]);stat(c,s,p,0,28,710,725,{ink:p[0],size:90});
 rect(c,190,810,810,140,p[3]);stat(c,s,p,1,222,900,745,{ink:accentInk(p[3]),size:90});
 rect(c,30+(Math.sin(t*.32)+1)*240,590,115,6,p[3]);
}
function walking(c,s,p,t){
 // Alternating stepping stones, with two statistics at different heights.
 hours(c,s,p,10,310,340,760);
 const drift=Math.sin(t*.35)*8;
 oval(c,830,185+drift,53,93,p[3],0,-.32);oval(c,700,390+drift,53,93,p[2],0,.25);
 oval(c,875,610+drift,53,93,p[3],0,-.32);
 path(c,[[25,700],[455,700]],p[2],12);stat(c,s,p,0,30,630,500);
 path(c,[[400,965],[985,965]],p[3],12);stat(c,s,p,1,975,885,550,{align:'right'});
}
function hiking(c,s,p,t){
 hours(c,s,p,975,305,330,850,'right');
 path(c,[[0,740],[280,400],[510,705],[700,510],[1000,850],[1000,1000],[0,1000]],p[2],0);
 path(c,[[130,590],[280,400],[425,590],[320,555],[265,600],[220,550]],p[0],0);
 path(c,[[30,790],[245,670],[360,780],[530,660],[610,735]],p[3],9);
 oval(c,280,385+Math.sin(t*.3)*6,13,13,p[1]);
 stat(c,s,p,0,28,885,440,{ink:accentInk(p[2])});stat(c,s,p,1,965,885,440,{ink:accentInk(p[2]),align:'right'});
}
function swimming(c,s,p,t){
 // Pool-lane ropes become horizontal bands instead of a universal dial.
 hours(c,s,p,500,325,345,950,'center');
 for(const [i,y] of [510,755,980].entries()){
  path(c,[[0,y],[1000,y]],p[2],5);
  for(let x=0;x<1000;x+=48)rect(c,x,y-8+Math.sin(t*.4+x*.008)*3,24,16,i%2?p[3]:p[2]);
 }
 stat(c,s,p,0,30,665,920);stat(c,s,p,1,970,910,920,{align:'right'});
}
function rowing(c,s,p,t){
 // Two oars cross an open expanse; the wake stays below the measurements.
 for(const [x,ink,angle] of [[170,p[2],-.32],[360,p[3],.32]]){
  c.save();c.translate(x,350);c.rotate(angle+Math.sin(t*.25)*.015);rect(c,-8,-290,16,615,ink);oval(c,0,350,48,115,ink);c.restore();
 }
 hours(c,s,p,985,340,300,600,'right');
 stat(c,s,p,0,985,640,550,{align:'right'});stat(c,s,p,1,985,850,550,{align:'right'});
 for(let j=0;j<3;j++){c.beginPath();c.moveTo(0,930+j*24);c.bezierCurveTo(240,880+j*24,320,985+j*24,570,940+j*24);c.strokeStyle=p[2];c.lineWidth=6;c.stroke();}
}
function yoga(c,s,p,t){
 // A quiet open arch and a balanced, centered figure.
 c.beginPath();c.moveTo(160,650);c.lineTo(160,360);c.bezierCurveTo(160,5,840,5,840,360);c.lineTo(840,650);c.strokeStyle=p[2];c.lineWidth=42;c.stroke();
 oval(c,500,105+Math.sin(t*.18)*7,38,38,p[3]);
 hours(c,s,p,500,505,330,680,'center');
 path(c,[[360,700],[640,700]],p[1],4);
 stat(c,s,p,0,0,875,450);stat(c,s,p,1,1000,875,450,{align:'right'});
}
function pilates(c,s,p,t){
 // A reformer rail meets a large balance ball, with a side-aligned time total.
 oval(c,765,410,220,280,p[2]);oval(c,765,410,185,246,p[3],5);
 c.save();c.translate(765,410);c.rotate(Math.sin(t*.23)*.025);path(c,[[0,-275],[0,275]],p[0],5);c.restore();
 hours(c,s,p,0,390,305,570);
 stat(c,s,p,0,15,675,500);
 path(c,[[20,745],[975,745]],p[1],14);path(c,[[70,745],[70,960],[980,960]],p[1],7);
 stat(c,s,p,1,950,887,750,{align:'right'});
}
function elliptical(c,s,p,t){
 // A pair of offset elliptical paths; the type sits above the pedals.
 oval(c,330,520,260,400,p[2],30,-.35);oval(c,680,520,260,400,p[3],30,.35);
 const a=t*.23;oval(c,330+Math.cos(a)*200,520+Math.sin(a)*340,17,17,p[1]);
 rect(c,170,245,660,240,p[0]);hours(c,s,p,500,418,285,640,'center');
 rect(c,0,790,1000,210,p[0]);stat(c,s,p,0,0,910,450);stat(c,s,p,1,1000,910,450,{align:'right'});
}
function skiing(c,s,p,t){
 // The statistics descend with a pair of slalom lines.
 hours(c,s,p,0,290,325,800);
 for(const [x,ink] of [[190,p[2]],[270,p[3]]]){
  c.beginPath();c.moveTo(x+600,0);c.bezierCurveTo(x+100,270,x+650,450,x+170,650);c.bezierCurveTo(x-140,780,x+100,850,x-50,1000);c.strokeStyle=ink;c.lineWidth=18;c.stroke();
 }
 rect(c,15,450,480,185,p[0]);stat(c,s,p,0,35,560,420);
 rect(c,490,760,510,190,p[0]);stat(c,s,p,1,980,875,460,{align:'right'});
 oval(c,815,85+Math.sin(t*.28)*6,14,14,p[1]);
}
function golf(c,s,p,t){
 // An organic putting green with a single flag and a low scorecard strip.
 c.beginPath();c.moveTo(620,100);c.bezierCurveTo(980,30,1120,500,850,665);c.bezierCurveTo(600,810,490,550,610,410);c.bezierCurveTo(760,260,400,190,620,100);c.fillStyle=p[2];c.fill();
 oval(c,795,547,45,16,p[1]);path(c,[[795,547],[795,165]],p[1],7);
 path(c,[[795,165],[930,205+Math.sin(t*.5)*5],[795,250]],p[3],0);
 hours(c,s,p,0,410,320,710);oval(c,685,575,18,18,p[0]);
 path(c,[[0,760],[1000,760]],p[1],3);
 stat(c,s,p,0,0,885,450);stat(c,s,p,1,1000,885,450,{align:'right'});
}
function racket(c,s,p,t){
 // A court becomes the structure of the layout, including its service boxes.
 rect(c,25,40,950,920,p[2]);c.strokeStyle=p[0];c.lineWidth=6;c.strokeRect(60,75,880,850);
 path(c,[[60,490],[940,490]],p[0],12);path(c,[[500,490],[500,925]],p[0],6);
 const ink=accentInk(p[2]);hours(c,s,p,500,340,320,810,'center',ink);
 stat(c,s,p,0,280,735,380,{align:'center',ink});stat(c,s,p,1,720,835,380,{align:'center',ink});
 oval(c,880+Math.sin(t*.4)*12,440,22,22,p[3]);
}
function triathlon(c,s,p,t){
 // Three linked chevrons suggest disciplines without implying time splits.
 for(const [i,ink] of [p[2],p[3],p[1]].entries()){const d=Math.sin(t*.35+i*1.4)*12;path(c,[[90+i*290+d,60],[310+i*290+d,60],[440+i*290+d,290],[220+i*290+d,290]],ink,0);}
 hours(c,s,p,500,640,370,950,'center');
 path(c,[[500,770],[500,975]],p[2],6);
 stat(c,s,p,0,20,895,440);stat(c,s,p,1,980,895,440,{align:'right'});
}
function team(c,s,p,t){
 // A scoreboard over a stylized pitch, with distinct home/away-sized cells.
 rect(c,0,55,1000,520,p[2]);rect(c,20,75,960,480,p[1]);
 hours(c,s,p,500,405,350,900,'center',p[0]);
 rect(c,0,620,610,320,p[3]);rect(c,640,620,360,320,p[0]);
 stat(c,s,p,0,25,810,555,{ink:accentInk(p[3]),size:125});stat(c,s,p,1,975,810,310,{align:'right',size:125});
 path(c,[[0,980],[1000,980]],p[2],6);oval(c,500,980,100,80,p[2],6);
 oval(c,500+Math.sin(t*.3)*250,970,10,10,p[3]);
}
function climbing(c,s,p,t){
 // Ascending holds and ledges give the statistics a vertical progression.
 for(const [x,y,ink] of [[80,190,p[2]],[450,90,p[3]],[870,475,p[2]],[300,900,p[3]]])path(c,[[x,y],[x+85,y-26],[x+115,y+36],[x+30,y+67]],ink,0);
 hours(c,s,p,1000,350,310,750,'right');
 stat(c,s,p,0,10,650,550);path(c,[[10,715],[565,715]],p[2],16);
 stat(c,s,p,1,975,865,550,{align:'right'});path(c,[[420,930],[990,930]],p[3],16);
 oval(c,870,380+Math.sin(t*.3)*10,10,10,p[1]);
}
function cardio(c,s,p,t){
 // An energetic pulse cuts a full-width path around a compact time block.
 path(c,[[0,510],[140,510],[220,370],[310,660],[405,130],[510,690],[600,510],[1000,510]],p[2],22);
 rect(c,500,50,500,380,p[0]);hours(c,s,p,985,295,290,490,'right');
 oval(c,80+Math.sin(t*.5)*25,510,15,15,p[3]);
 stat(c,s,p,0,0,855,460);stat(c,s,p,1,1000,855,460,{align:'right'});
 path(c,[[0,940],[450,940]],p[3],18);path(c,[[550,940],[1000,940]],p[2],18);
}
function other(c,s,p,t){
 // A loose typographic collage for activities outside the named families.
 c.save();c.translate(730,140);c.rotate(-.12);rect(c,-240,-120,480,240,p[3]);stat(c,s,p,1,0,20,430,{align:'center',ink:accentInk(p[3]),size:95});c.restore();
 path(c,[[0,275],[960,500],[900,750],[0,535]],p[2],0);
 rect(c,20,365,840,275,p[0]);hours(c,s,p,40,570,330,800);
 path(c,[[0,790],[0,990],[680,990],[680,790]],p[1],0);stat(c,s,p,0,28,915,620,{ink:p[0],size:110});
 path(c,[[780,900],[930,900+Math.sin(t*.32)*16]],p[3],8);
}
const compositions={running,cycling,hiit,strength,walking,hiking,swimming,rowing,yoga,pilates,elliptical,skiing,golf,racket,triathlon,team_sports:team,climbing,cardio,other};
export function drawDurationPoster(c,b,s,p,time=0){
 // Other activities share the cardio palette, but keep their own composition.
 const sport=s.id?.startsWith('other-')?'other':s.template;
 c.save();c.translate(b.x,b.y);c.scale(b.w/1000,b.h/1000);
 (compositions[sport]||other)(c,s,p,time);c.restore();
}
