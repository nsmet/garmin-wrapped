// Share videos: the share card as a short looping 1080 × 1920 MP4 for stories and posts.
// Timeline: the dots fly in and the numbers count up (the same intro as the story cards), the card
// holds while its ambient motion plays (hearts beat at the recorded BPM), then the dots fly back to
// where they started and the text fades. The last frame meets the first, so the loop has no seam.
// Frames are drawn with the share-card renderer (flat dots, no glow) and encoded in the browser with
// WebCodecs (H.264); mp4-muxer only packs the encoded frames into an MP4. Nothing leaves the device.
import {cardFrame,drawBackground,drawText,collectDots,createDotBuffer,drawDotsFlat,TEXT_SETTLE} from './dot-card.mjs';
import {ease} from './dot-engine.mjs';

export const VIDEO={width:1080,height:1920,fps:30,duration:7,outro:1,bitrate:8e6};
// every dot has landed by then: the longest intro delay (1.45 s) plus its 1.3 s flight and a margin
const SETTLED=3.05;

// Where the animation stands at video time tau (seconds): dot intro, text intro and text fade.
export function videoTimeline(tau,{duration=VIDEO.duration,outro=VIDEO.outro}={}){
 const out0=duration-outro;
 if(tau<out0)return {t:tau,intro:tau,textIntro:tau>=TEXT_SETTLE+.3?null:tau,textAlpha:1};
 const k=ease((tau-out0)/outro);
 return {t:tau,intro:SETTLED*(1-k),textIntro:null,textAlpha:1-k};
}

const buf=createDotBuffer();
// One video frame. The frame layout is computed once per video and passed in.
export function drawShareFrame(c,w,h,spec,frame,palette,tau,opts){
 const tl=videoTimeline(tau,opts);
 c.save();c.setTransform(1,0,0,1,0,0);
 drawBackground(c,w,h,spec,frame,palette);
 buf.n=0;collectDots(buf,spec,{t:tl.t,intro:tl.intro,frame,palette,neutralStart:true});
 c.save();c.beginPath();c.rect(0,0,w,h);c.clip();drawDotsFlat(c,buf);c.restore();
 drawText(c,frame,spec,{intro:tl.textIntro,alpha:tl.textAlpha,chromeAlpha:1,palette});
 c.restore();
}

/* ---------- encoding ---------- */
// H.264 High, then Main, then Baseline; level 4.0 holds 1080 × 1920 at 30 fps, 4.2 is the fallback.
const CODECS=['avc1.640028','avc1.4d0028','avc1.42e028','avc1.64002a','avc1.4d002a','avc1.42e02a'];
const configFor=codec=>({codec,width:VIDEO.width,height:VIDEO.height,bitrate:VIDEO.bitrate,framerate:VIDEO.fps,avc:{format:'avc'}});
let support=null;
// Resolves to a supported encoder config, or null when this browser cannot make share videos.
export function videoSupport(){
 return support||(support=(async()=>{
  if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')return null;
  for(const codec of CODECS){try{const r=await VideoEncoder.isConfigSupported(configFor(codec));if(r.supported)return r.config;}catch{}}
  return null;
 })());
}

// spec: a share-card spec (see share-card.mjs shareSpec). current(): false once the result is no longer
// wanted (another card or colour was chosen); the encoder then stops and this resolves to null.
export async function renderShareVideo(spec,{palette=null,onProgress=()=>{},current=()=>true}={}){
 const config=await videoSupport();if(!config)throw Error('Video encoding is not supported in this browser');
 const {Muxer,ArrayBufferTarget}=await import('./vendor/mp4-muxer.mjs');
 const {width:w,height:h,fps,duration}=VIDEO,frames=Math.round(duration*fps);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const c=canvas.getContext('2d',{alpha:false}),frame=cardFrame(w,h,{mode:'export',spec,ctx:c});
 const muxer=new Muxer({target:new ArrayBufferTarget(),video:{codec:'avc',width:w,height:h,frameRate:fps},fastStart:'in-memory',firstTimestampBehavior:'offset'});
 let failure=null;
 const encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{failure=e;}});
 encoder.configure(config);
 const stop=()=>{try{if(encoder.state!=='closed')encoder.close();}catch{}};
 try{
  for(let i=0;i<frames;i++){
   if(failure)throw failure;
   if(!current()){stop();return null;}
   drawShareFrame(c,w,h,spec,frame,palette,i/fps);
   const vf=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
   encoder.encode(vf,{keyFrame:i%(fps*2)===0});vf.close();
   // keep the page responsive and the encoder queue short
   if(encoder.encodeQueueSize>4||i%3===2)await new Promise(r=>setTimeout(r,encoder.encodeQueueSize>4?8:0));
   onProgress((i+1)/frames);
  }
  await encoder.flush();if(failure)throw failure;
  if(!current()){stop();return null;}
  muxer.finalize();stop();
  return new Blob([muxer.target.buffer],{type:'video/mp4'});
 }catch(error){stop();throw error;}
}
