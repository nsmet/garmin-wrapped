// Editorial sport photography and graphics are independent layers. The paths
// are decorative and never represent a measured route, lap or workout segment.
export const sportScenes={
 running:{scene:'track',subject:'shoe',motif:'track'},cycling:{scene:'road',subject:'crank',motif:'wheel'},
 hiit:{scene:'scene-gym',subject:'kettlebell',motif:'burst'},strength:{scene:'scene-gym',subject:'dumbbell',motif:'stack'},
 walking:{scene:'scene-urban',subject:'shoe',motif:'steps'},hiking:{scene:'scene-rock',subject:'boot',motif:'contour'},
 swimming:{scene:'scene-pool',subject:'goggles',motif:'lanes'},rowing:{scene:'scene-water',subject:'oar',motif:'ripple'},
 yoga:{scene:'scene-studio',subject:'mat',motif:'arch'},pilates:{scene:'scene-studio',subject:'ball',motif:'balance'},
 elliptical:{scene:'scene-gym',subject:'elliptical',motif:'orbit'},skiing:{scene:'scene-snow',subject:'skis',motif:'slalom'},
 golf:{scene:'scene-green',subject:'golf',motif:'target'},racket:{scene:'scene-court',subject:'racket',motif:'court'},
 triathlon:{scene:'scene-water',subject:'triad',motif:'triad'},team_sports:{scene:'scene-green',subject:'football',motif:'pitch'},
 climbing:{scene:'scene-rock',subject:'carabiner',motif:'holds'},cardio:{scene:'scene-gym',subject:'rope',motif:'pulse'}
};
export const isSportStory=s=>!!sportScenes[s.template];
export function sportAssets(s){const d=sportScenes[s.template];if(!d)return [];return [d.scene,...(d.subject==='triad'?['goggles','crank','shoe']:[d.subject])];}
const tau=Math.PI*2;
function poly(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,tau);c.fillStyle=color;c.fill();}
function stroke(c,color,width,draw){c.beginPath();draw(c);c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.stroke();}
function cover(c,img){if(!img?.naturalWidth)return;const scale=Math.max(1000/img.naturalWidth,1000/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;c.drawImage(img,(1000-w)/2,(1000-h)/2,w,h);}
function subject(c,img,x,y,size,angle){if(!img?.naturalWidth)return;c.save();c.translate(x,y);c.rotate(angle);const scale=size/Math.max(img.naturalWidth,img.naturalHeight);c.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);c.restore();}
function variant(s){let n=0;for(const ch of s.id||s.template)n=(n*31+ch.charCodeAt(0))>>>0;return n;}
function planes(c,p,kind,drift,distance){
 // The large forms are deliberately different, even where sports share a scene.
 c.globalAlpha*=.88;
 if(distance){circle(c,180+drift,550,240,p[2]);poly(c,[[-100,380+drift],[1100,760],[1100,950],[-100,550+drift]],p[3]);return;}
 switch(kind){
  case 'track':circle(c,850+drift,80,310,p[3]);poly(c,[[-100,820],[1100,180],[1100,350],[100,1000]],p[2]);break;
  case 'wheel':circle(c,760+drift,230,340,p[2]);poly(c,[[-100,800],[1100,200],[1100,420],[70,1000]],p[3]);break;
  case 'burst':poly(c,[[640,-80],[200,610],[480,520],[280,1050],[960,240],[670,340],[940,-80]],p[2]);poly(c,[[-80,840],[1100,420],[1100,510],[-80,960]],p[3]);break;
  case 'stack':for(let i=0;i<4;i++)poly(c,[[0+i*120,840-i*130],[1100,570-i*130],[1100,655-i*130],[i*120,925-i*130]],i%2?p[3]:p[2]);break;
  case 'steps':poly(c,[[-80,360],[440,620],[1100,370],[1100,505],[440,770],[-80,500]],p[2]);poly(c,[[-80,610],[420,840],[1100,570],[1100,700],[420,980],[-80,750]],p[3]);break;
  case 'contour':poly(c,[[-100,990],[400,340],[620,690],[800,450],[1100,800],[1100,1100]],p[2]);poly(c,[[-100,1040],[520,700],[1100,1000],[1100,1100]],p[3]);break;
  case 'lanes':poly(c,[[-50,750],[1100,430],[1100,610],[-50,930]],p[2]);circle(c,940,50,300,p[3]);break;
  case 'ripple':circle(c,270+drift,740,280,p[2]);poly(c,[[380,1000],[1100,330],[1100,530],[600,1000]],p[3]);break;
  case 'arch':circle(c,760+drift,320,380,p[2]);circle(c,760+drift,320,265,p[0]);circle(c,115,850,230,p[3]);break;
  case 'balance':circle(c,700+drift,360,340,p[2]);circle(c,180,800,250,p[3]);break;
  case 'orbit':circle(c,780,340,350,p[2]);circle(c,780,340,255,p[0]);poly(c,[[-50,900],[1100,440],[1100,600],[-50,1050]],p[3]);break;
  case 'slalom':poly(c,[[-60,1000],[280,1000],[1000,-80],[720,-80]],p[2]);poly(c,[[320,1100],[520,1100],[1100,200],[1100,-30]],p[3]);break;
  case 'target':circle(c,770+drift,350,360,p[2]);circle(c,770+drift,350,260,p[3]);circle(c,770+drift,350,175,p[2]);break;
  case 'court':poly(c,[[-100,1000],[1100,280],[1100,520],[200,1100]],p[2]);poly(c,[[0,1000],[1100,340],[1100,390],[0,1050]],p[3]);break;
  case 'triad':for(let i=0;i<3;i++)poly(c,[[-100+i*260,1080],[450+i*260,-80],[610+i*260,-80],[60+i*260,1080]],i%2?p[3]:p[2]);break;
  case 'pitch':poly(c,[[-100,900],[1100,400],[1100,560],[-100,1060]],p[3]);poly(c,[[0,700],[1100,250],[1100,310],[0,760]],p[2]);break;
  case 'holds':poly(c,[[410,0],[1100,0],[1100,770]],p[2]);poly(c,[[-100,900],[500,600],[710,850],[220,1100]],p[3]);break;
  case 'pulse':poly(c,[[-100,220],[1100,700],[1100,860],[-100,380]],p[2]);poly(c,[[-100,850],[1100,350],[1100,470],[-100,980]],p[3]);break;
 }
}
function curves(c,p,time,kind,front=false){
 const drift=Math.sin(time*.22)*18;
 if(kind==='track'){
  for(let i=0;i<4;i++)stroke(c,i===1?p[3]:i===2?'#fffaf0':p[2],i===1?38:8,ctx=>{ctx.moveTo(-140,810+i*75+drift);ctx.bezierCurveTo(210,1020+i*75,620,1030+i*40,1120,400+i*55+drift);});
 }else if(kind==='wheel'||kind==='orbit'||kind==='target'||kind==='balance'||kind==='ripple'){
  const cx=kind==='ripple'?360:790,cy=kind==='ripple'?760:410;
  for(let i=0;i<3;i++)stroke(c,i===1?p[3]:p[2],i===1?13:6,ctx=>ctx.ellipse(cx,cy,190+i*85+drift*.3,kind==='ripple'?55+i*32:190+i*85,0,front?.05:Math.PI,front?Math.PI:tau));
 }else if(kind==='lanes'||kind==='slalom'||kind==='contour'||kind==='steps'||kind==='pulse'){
  for(let i=0;i<3;i++)stroke(c,i===1?p[3]:p[2],i===1?24:7,ctx=>{ctx.moveTo(-80,650+i*90);ctx.bezierCurveTo(220,460+i*80+drift,400,1020-i*70,1080,400+i*100-drift);});
 }else if(kind==='arch'){
  for(let i=0;i<3;i++)stroke(c,i===1?p[3]:p[2],i===1?22:6,ctx=>{ctx.moveTo(230-i*65,1050);ctx.lineTo(230-i*65,500);ctx.bezierCurveTo(230-i*65,-30,920+i*65,-30,920+i*65,500);ctx.lineTo(920+i*65,1050);});
 }else if(kind==='court'||kind==='pitch'){
  stroke(c,p[2],9,ctx=>{ctx.moveTo(40,830+drift);ctx.lineTo(960,280+drift);ctx.lineTo(1100,420+drift);});
  stroke(c,p[3],22,ctx=>{ctx.moveTo(-100,990);ctx.lineTo(1050,330);});
 }else if(kind==='holds'){
  for(let i=0;i<5;i++){const x=130+i*190,y=850-i*140+drift;poly(c,[[x,y],[x+70,y-22],[x+100,y+28],[x+25,y+50]],i%2?p[2]:p[3]);}
 }else if(kind==='stack'){
  for(let i=0;i<4;i++){c.fillStyle=i%2?p[2]:p[3];c.fillRect(-70+i*110,760-i*120+drift,260,30);}
 }else if(kind==='burst'||kind==='triad'){
  for(let i=0;i<3;i++)poly(c,[[80+i*140,1000],[560+i*160,-80],[650+i*160,-80],[200+i*140,1000]],i%2?p[3]:p[2]);
 }
}
export function drawSportArt(c,w,h,s,time,assets,layout,p,opacity=1){
 const d=sportScenes[s.template];if(!d||opacity<.001)return;
 const area=layout.wide?{x:layout.content.x+layout.content.w*.48,y:layout.content.y,w:layout.content.w*.52+layout.pad,h:layout.content.h}:{x:0,y:layout.content.y+layout.content.h*.30,w,h:layout.content.h*.70};
 const n=variant(s),chart=!!s.chart,distance=s.presentation==='distance';
 c.save();c.globalAlpha=opacity*(chart?.13:1);c.beginPath();c.rect(area.x,area.y,area.w,area.h);c.clip();c.translate(area.x,area.y);c.scale(area.w/1000,area.h/1000);
 c.save();c.translate(Math.sin(time*.12+n%7)*8,0);c.translate(500,500);c.scale(1.025,1.025);c.translate(-500,-500);cover(c,assets[d.scene]);c.restore();
 if(chart){c.restore();return;}
 // Large color planes sit in front of the scene and behind the subject.
 const drift=Math.sin(time*.18+n%7)*14;
 c.globalAlpha=opacity;planes(c,p,d.motif,drift,distance);
 c.globalAlpha=opacity*.8;curves(c,p,time,d.motif);
 c.globalAlpha=opacity;
 const grounded=['hiit','strength','yoga','pilates','cardio'].includes(s.template),slide=distance?2:n%3,tilt=(slide-1)*.055;
 if(d.subject==='triad'){
  subject(c,assets.goggles,250,710,450,-.12);subject(c,assets.crank,805,390,610,.12);subject(c,assets.shoe,750,805,480,-.12);
 }else subject(c,assets[d.subject],distance?840:700+(slide-1)*65,distance?770:grounded?720:650,distance?540:grounded?660:750,tilt+(grounded?0:Math.sin(time*.22+n)*.012));
 c.save();c.beginPath();c.rect(0,730,1000,270);c.clip();c.globalAlpha=opacity*.8;curves(c,p,time,d.motif,true);c.restore();
 // Text overlaps the top of the photo on portrait screens, so its background
 // remains the actual paper color rather than an unpredictable photograph.
 if(!layout.wide){const g=c.createLinearGradient(0,0,0,480);g.addColorStop(0,p[0]);g.addColorStop(.35,p[0]);g.addColorStop(1,p[0]+'00');c.globalAlpha=opacity;c.fillStyle=g;c.fillRect(0,0,1000,480);}
 c.restore();
}
