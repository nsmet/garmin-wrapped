// Every image is an independent transparent PNG. Geometry and paths remain
// vector instructions so they can be colored and animated separately.
const sport={
 running:{ground:'running-track',subjects:['shoe'],motif:'track',angle:-.15},
 cycling:{ground:'ridge',extra:'road-ribbon',subjects:['bike-wheel','bike-bars'],motif:'wheel',angle:.1},
 hiit:{ground:'gym-floor',subjects:['kettlebell'],motif:'burst',grounded:true},
 strength:{ground:'gym-floor',subjects:['dumbbell'],motif:'stack',grounded:true},
 walking:{ground:'crosswalk',subjects:['shoe'],motif:'steps',angle:.12},
 hiking:{ground:'ridge',subjects:['boot'],motif:'contour',angle:-.08},
 swimming:{ground:'pool-water',subjects:['goggles'],motif:'lanes',angle:-.08},
 rowing:{ground:'open-water',subjects:['oar'],motif:'ripple',angle:-.12},
 yoga:{ground:'studio-floor',subjects:['mat'],motif:'arch',grounded:true},
 pilates:{ground:'studio-floor',subjects:['ball','mat'],motif:'balance',grounded:true},
 elliptical:{ground:'studio-floor',subjects:['elliptical'],motif:'orbit',angle:-.04},
 skiing:{ground:'ridge',subjects:['skis'],motif:'slalom',angle:.16},
 golf:{ground:'green',subjects:['golf-ball','golf-club'],motif:'target',grounded:true},
 racket:{ground:'court',subjects:['racket'],motif:'court',angle:-.1},
 triathlon:{ground:'open-water',subjects:['goggles','crank','shoe'],motif:'triad'},
 team_sports:{ground:'green',subjects:['football'],motif:'pitch',grounded:true},
 climbing:{ground:'ridge',subjects:['carabiner'],motif:'holds',angle:-.14},
 cardio:{ground:'gym-floor',subjects:['rope'],motif:'pulse',grounded:true}
};
const other={
 summary:{subjects:[],motif:'steps'},heatmap:{subjects:[],motif:'steps'},
 cover:{ground:'ridge',extra:'road-ribbon',subjects:[],motif:'horizon'},
 longest:{ground:'ridge',extra:'road-ribbon',subjects:[],motif:'contour'},
 active:{subjects:['stairs'],motif:'steps'},mix:{subjects:['shoe','crank','dumbbell'],motif:'triad'},
 morning:{subjects:['clock'],motif:'target'},recovery:{subjects:['bench'],motif:'arch',grounded:true},
 sleep:{subjects:['pillow'],motif:'moon',grounded:true},elevation:{ground:'ridge',subjects:[],motif:'contour'},
 heart:{subjects:[],motif:'pulse'},hrv:{subjects:[],motif:'ripple'},energy:{subjects:['orange'],motif:'burst'},
 nutrition:{subjects:['orange'],motif:'target'},hydration:{subjects:['water'],motif:'ripple'},
 calendar:{subjects:['clock'],motif:'steps'},miniwatt:{subjects:['crank'],motif:'wheel'},
 finale:{subjects:['shoe','crank','dumbbell'],motif:'triad'}
};
export const layerDesigns={...sport,...other};
export function layeredAssets(s){
 if(s.chart&&(!sport[s.template]||!['duration','record','weekdays'].includes(s.chart.kind)))return [];
 const d=layerDesigns[s.template];if(!d)return [];
 return [...new Set([d.ground,d.extra,...d.subjects].filter(Boolean))];
}
const familyMotifs={distance:'track',peak:'target',habit:'steps',intensity:'burst',technical:'pulse',terrain:'contour',location:'contour',trend:'steps',achievement:'target',identity:'triad',volume:'stack',surprise:'burst',wellness:'ripple',opening:'horizon',foundation:'arch',finale:'triad'};
// Each scene has its own focal point and scale. Coordinates are in the
// artwork's 1000-unit space; the image helper preserves the asset's aspect.
const subjectPlacement={
 hiit:[690,510,1250,1000],strength:[690,530,1450,1100],walking:[720,500,1350,1000],
 hiking:[700,510,1350,1000],swimming:[610,540,1400,1000],rowing:[700,500,1300,1050],
 yoga:[650,540,1400,1000],elliptical:[700,490,1250,1100],skiing:[700,490,1250,1100],
 racket:[690,510,1400,1050],team_sports:[700,510,1300,1050],climbing:[700,510,1300,1050],
 cardio:[610,530,1400,1000],active:[700,500,1300,1050],morning:[700,500,1300,1050],
 recovery:[680,530,1400,1050],sleep:[680,530,1400,1050],energy:[680,510,1300,1050],
 nutrition:[680,510,1300,1050],hydration:[680,510,1300,1050],calendar:[700,500,1300,1050],
 miniwatt:[700,500,1300,1050]
};
const groupedSubjects={
 cycling:[[770,570,1050,1120],[670,390,1050,750]],
 pilates:[[710,450,1050,950],[410,710,1050,800]],
 golf:[[350,660,780,780],[690,440,1050,1000]],
 triathlon:[[250,690,820,760],[700,420,850,820],[720,680,850,760]],
 mix:[[250,690,820,760],[700,420,850,820],[720,680,850,760]],
 finale:[[250,690,820,760],[700,420,850,820],[720,680,850,760]]
};
const TAU=Math.PI*2;
function disk(c,x,y,r,color,ratio=1){c.beginPath();c.ellipse(x,y,r/ratio,r,0,0,TAU);c.fillStyle=color;c.fill();}
function poly(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function stroke(c,color,width,draw){c.beginPath();draw(c);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function image(c,img,x,y,maxW,maxH,ratio,angle=0){
 if(!img?.complete||!img.naturalWidth)return;
 // The art box is not necessarily square; compensate for its transform so that
 // the PNG always retains its natural proportions at every viewport size.
 const aspect=img.naturalWidth/img.naturalHeight/ratio;
 let h=maxH,w=h*aspect;if(w>maxW){w=maxW;h=w/aspect;}
 c.save();c.translate(x,y);c.scale(1,ratio);c.rotate(angle);c.scale(1,1/ratio);c.drawImage(img,-w/2,-h/2,w,h);c.restore();
}
function background(c,p,m,t,ratio){
 const sway=Math.sin(t*.32)*16;
 const diskColor=m==='track'&&p[0]==='#101519'&&p[2]==='#ff7038'?'#1743ed':p[2];
 disk(c,760+sway,340,285,diskColor,ratio);
 if(m==='burst'){
  poly(c,[[630,80],[310,560],[515,510],[290,950],[980,310],[710,390],[920,80]],p[3]);
 }else if(m==='stack'){
  for(let i=0;i<4;i++){const x=20+i*100,y=950-i*135+sway*.3;poly(c,[[x,y],[x+750,y-240],[x+750,y-145],[x,y+95]],i%2?p[2]:p[3]);}
 }else if(m==='steps'||m==='holds'){
  for(let i=0;i<4;i++){const x=-80+i*220,y=850-i*100+sway*.3;poly(c,[[x,y],[x+290,y-85],[x+290,y+10],[x,y+95]],i%2?p[2]:p[3]);}
 }else if(m==='arch'||m==='moon'){
  disk(c,750+sway,300,285,p[3],ratio);disk(c,750+sway,300,185,p[0],ratio);disk(c,200,800,210,p[2],ratio);
 }else if(m==='balance'){
  disk(c,280-sway,710,250,p[3],ratio);disk(c,760+sway,360,285,p[2],ratio);
 }else if(m==='target'||m==='ripple'||m==='orbit'||m==='wheel'){
  c.save();c.translate(760+sway,340);for(let i=0;i<3;i++)stroke(c,i%2?p[3]:p[2],i===1?65:12,k=>k.arc(0,0,170+i*65,0,TAU));c.restore();
  poly(c,[[-100,870],[1050,390],[1050,480],[-100,960]],p[3]);
 }else if(m==='slalom'||m==='court'||m==='pitch'||m==='triad'){
  for(let i=0;i<3;i++)poly(c,[[-100+i*180,1050],[680+i*180,-80],[790+i*180,-80],[10+i*180,1050]],i%2?p[2]:p[3]);
 }else if(m==='pulse'){
  poly(c,[[-100,850],[300,650],[420,790],[580,370],[700,480],[1100,270],[1100,410],[680,630],[580,520],[440,960],[290,800],[-100,1000]],p[3]);
 }else if(m==='contour'||m==='horizon'){
  poly(c,[[-80,910],[260,470],[460,690],[650,430],[1080,900],[1080,1100],[-80,1100]],p[3]);
 }else{
  stroke(c,p[3],115,k=>{k.moveTo(-100,830+sway);k.bezierCurveTo(140,1030,600,880,1100,200+sway);});
  stroke(c,p[2],35,k=>{k.moveTo(-100,940);k.bezierCurveTo(140,1100,620,970,1100,310);});
 }
}
function paths(c,p,m,t,front){
 const drift=Math.sin(t*.35)*22,ink=front?p[1]:p[3];
 if(['track','lanes','triad','slalom'].includes(m)){
  for(let i=0;i<3;i++)stroke(c,i===1?p[2]:ink,i===1?12:4,k=>{k.moveTo(-90,760+i*70);k.bezierCurveTo(140,1000+i*60,640,940+i*20,1100,330+i*55+drift);});
 }else if(['wheel','orbit','target','balance','ripple','moon'].includes(m)){
  for(let i=0;i<3;i++)stroke(c,i===1?p[2]:ink,i===1?10:4,k=>k.ellipse(520,570,300+i*70+Math.sin(t*.3+i)*8,130+i*45,0,front?0:Math.PI,front?Math.PI:TAU));
 }else if(m==='arch'){
  for(let i=0;i<3;i++)stroke(c,i===1?p[2]:ink,6,k=>{k.moveTo(180-i*40,1000);k.lineTo(180-i*40,560);k.bezierCurveTo(180-i*40,80,820+i*40,80,820+i*40,560);k.lineTo(820+i*40,1000);});
 }else if(m==='pulse'){
  stroke(c,ink,12,k=>{k.moveTo(-40,710);k.lineTo(240,710);k.lineTo(330,540+drift);k.lineTo(420,850-drift);k.lineTo(505,650);k.lineTo(1100,650);});
 }else if(m==='contour'||m==='horizon'){
  for(let i=0;i<3;i++)stroke(c,i===1?p[2]:ink,5,k=>{k.moveTo(-50,780+i*55);k.bezierCurveTo(200,500+i*55,350,960+i*55,610,670+i*55);k.bezierCurveTo(770,490+i*55,920,730+i*55,1100,510+i*55);});
 }else{
  stroke(c,ink,7,k=>{k.moveTo(-40,900+drift);k.lineTo(1050,390+drift);});
  stroke(c,p[2],14,k=>{k.moveTo(-40,960);k.lineTo(1050,450);});
 }
}
export function drawLayeredArt(c,w,h,s,time,assets,layout,p,opacity=1,edgeOpacity=opacity){
 const d=layerDesigns[s.template];if(!d||(s.chart&&!layeredAssets(s).length)||opacity<.001)return;
 const motif=s.libraryOnly?(familyMotifs[s.family]||d.motif):d.motif;
 const running=s.template==='running';
 const b=!layout.wide?{...layout.art,h:h-layout.art.y}:layout.art,ratio=b.w/b.h,rate=({running:1,cycling:.85,hiit:1.15,strength:.55,walking:.7,hiking:.55,swimming:.8,rowing:.6,yoga:.38,pilates:.45,elliptical:.85,skiing:.95,golf:.48,racket:.85,triathlon:.78,team_sports:.72,climbing:.6,cardio:1.05,sleep:.36,recovery:.4,hrv:.4})[s.template]||.65,phase=time*rate+(s.template.length%7)*.4,drift=Math.sin(phase*.30);
 c.save();c.globalAlpha=opacity;c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.clip();c.translate(b.x,b.y);c.scale(b.w/1000,b.h/1000);
 background(c,p,motif,phase,ratio);
 if(d.ground){
  c.save();c.translate(d.grounded?0:drift*9,d.grounded?0:Math.sin(phase*.17)*5);
  // The mountain source has a straight lower edge: give it an organic lower
  // silhouette, while leaving its naturally cut-out skyline intact.
  if(d.ground==='ridge'){c.beginPath();c.ellipse(500,560,620,420,0,0,TAU);c.clip();}
  if(running)image(c,assets[d.ground],layout.wide?500:440,layout.wide?500:590,1500,layout.wide?1000:1200,ratio);
  else image(c,assets[d.ground],d.ground==='open-water'?650:500,layout.wide?530:590,1500,layout.wide?1050:1200,ratio);c.restore();
 }
 if(d.extra){c.save();c.translate(-drift*8,0);c.beginPath();c.ellipse(500,610,500,430,-.16,0,TAU);c.clip();image(c,assets[d.extra],500,610,1100,1000,ratio,-.25);c.restore();}
 c.save();c.globalAlpha*=.85;paths(c,p,motif,phase,false);c.restore();
 if(d.subjects.length===1){
  const [px,py,maxW,maxH]=subjectPlacement[s.template]||[700,510,1300,1050];
  const x=running?(layout.wide?(s.chart?620:750):790):px-(layout.wide&&s.chart?130:0),y=running?(layout.wide?500:480):py;
  const move=d.grounded?0:drift*9;
  image(c,assets[d.subjects[0]],x+move,y+move*.5,running?1350:maxW,running?950:maxH,ratio,(d.angle||0)+(d.grounded?0:Math.sin(phase*.23)*.018));
 }else d.subjects.forEach((name,i)=>{
  const [px,y,size,maxHeight]=(groupedSubjects[s.template]||[])[i]||[500,520,1000,900];
  const x=px-(layout.wide&&s.chart?100:0);
  image(c,assets[name],x+(d.grounded?0:Math.sin(phase*.22+i)*6),y,size,maxHeight,ratio,(i-1)*.10);
 });
 c.save();c.globalAlpha*=.75;paths(c,p,motif,phase,true);c.restore();
 c.restore();
 if(!running){
  // Hide the straight top of the artwork's safe region as large elements
  // emerge behind the typography, especially on the multi-object cards.
  const top=c.createLinearGradient(0,b.y-1,0,b.y+b.h*.13);
  top.addColorStop(0,p[0]);top.addColorStop(.08,p[0]);top.addColorStop(1,p[0]+'00');
  c.save();c.globalAlpha=edgeOpacity;c.fillStyle=top;c.fillRect(b.x,b.y-1,b.w,b.h*.13+1);c.restore();
 }
 if(layout.wide){
  // Fade the artwork into the paper at the edge of the art column.
  const left=c.createLinearGradient(b.x,0,b.x+b.w*.2,0);
  left.addColorStop(0,p[0]);left.addColorStop(1,p[0]+'00');
  const bottom=c.createLinearGradient(0,b.y+b.h*.82,0,b.y+b.h);
  bottom.addColorStop(0,p[0]+'00');bottom.addColorStop(1,p[0]);
  c.save();c.globalAlpha=edgeOpacity;c.fillStyle=left;c.fillRect(b.x,b.y,b.w*.2,b.h);c.fillStyle=bottom;c.fillRect(b.x,b.y+b.h*.82,b.w,b.h*.18);
  if(s.chart){const right=c.createLinearGradient(b.x+b.w*.82,0,b.x+b.w,0);right.addColorStop(0,p[0]+'00');right.addColorStop(1,p[0]);c.fillStyle=right;c.fillRect(b.x+b.w*.82,b.y,b.w*.18,b.h);}
  c.restore();
 }else{
  // Let the scene reach the footer, then fade it into its paper color before
  // the caption and navigation so small text stays readable on every palette.
  const start=layout.content.y+layout.content.h-(running?0:h*.04),g=c.createLinearGradient(0,start,0,h);
  g.addColorStop(0,p[0]+'00');g.addColorStop(running?.55:.30,running?p[0]+'d9':p[0]);g.addColorStop(1,p[0]);
  c.save();c.globalAlpha=edgeOpacity;c.fillStyle=g;c.fillRect(0,start,w,h-start);c.restore();
 }
}
