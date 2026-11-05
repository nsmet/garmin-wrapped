// Still renders of a dot card (chapter thumbnails, share previews, 1080 × 1920 exports):
// background -> Three.js dot layer (2D sprites without WebGL) -> typography.
import {cardFrame,drawBackground,drawText,collectDots,createDotBuffer,drawDots2D,additiveFor} from './dot-card.mjs';
import {drawDotsOffscreen,threeReady} from './dot-scene.mjs';
const buf=createDotBuffer();
export const STILL_TIME=6;
export function renderStill(c,w,h,spec,{palette=null,time=STILL_TIME}={}){
 const frame=cardFrame(w,h,{mode:'export',spec,ctx:c}),additive=additiveFor(palette);
 c.save();c.setTransform(1,0,0,1,0,0);
 drawBackground(c,w,h,spec,frame,palette);
 buf.n=0;collectDots(buf,spec,{t:time,frame,palette});
 const viaGL=threeReady()&&drawDotsOffscreen(c,buf,{width:w,height:h,additive});
 if(!viaGL){c.save();c.beginPath();c.rect(0,0,w,h);c.clip();drawDots2D(c,buf,{additive});c.restore();}
 drawText(c,frame,spec,{palette});
 c.restore();
 return {renderer:viaGL?'webgl':'2d',dots:buf.n};
}
