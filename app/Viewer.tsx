'use dom';
import React, {useEffect, useRef, useState} from 'react';
// @ts-ignore The renderer is copied verbatim from the verified website commit.
import {sampleStories, sampleContext} from './vendor/public/dot-samples.mjs';
// @ts-ignore
import {datasetFromPlan} from './vendor/public/story-model.mjs';
// @ts-ignore
import {recapSequence} from './vendor/public/recap-sequence.mjs';
// @ts-ignore
import {recapContext} from './vendor/public/dot-spec.mjs';
// @ts-ignore
import {cardSpec} from './vendor/public/dot-spec.mjs';
// @ts-ignore
import {cardFrame, drawBackground, drawText, collectDots, createDotBuffer, drawDots2D} from './vendor/public/dot-card.mjs';
// @ts-ignore
import {loadThree, createDotRenderer} from './vendor/public/dot-scene.mjs';

export default function Viewer({plan}: {plan: any}) {
  const stories = React.useMemo(() => plan ? recapSequence(datasetFromPlan(plan)) : sampleStories('full'), [plan]);
  const context = React.useMemo(() => plan ? recapContext(stories) : sampleContext('full'), [plan, stories]);
  const container = useRef<HTMLDivElement>(null);
  const background = useRef<HTMLCanvasElement>(null);
  const dots = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let disposed = false, raf = 0, renderer: any = null, start = performance.now();
    const buffer = createDotBuffer();
    const spec = cardSpec(stories[index], context);
    const bg = background.current!, dot = dots.current!, text = labels.current!;
    const draw = () => {
      if (disposed) return;
      const bounds = container.current!.getBoundingClientRect();
      const w = Math.max(1, bounds.width), h = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [bg, text]) { if (c.width !== Math.round(w*dpr) || c.height !== Math.round(h*dpr)) {c.width=Math.round(w*dpr); c.height=Math.round(h*dpr);} }
      const b = bg.getContext('2d')!, t = text.getContext('2d')!;
      b.setTransform(dpr,0,0,dpr,0,0); t.setTransform(dpr,0,0,dpr,0,0);
      const frame = (cardFrame as any)(w,h,{mode:'live', bounds:{top:38,bottom:h-56,left:0,right:w},spec,ctx:t});
      drawBackground(b,w,h,spec,frame,null); buffer.n=0;
      (collectDots as any)(buffer,spec,{t:paused?6:(performance.now()-start)/1000,frame});
      if(renderer) {renderer.setSize(w,h,dpr); renderer.draw(buffer,{additive:true});}
      else {if(dot.width!==Math.round(w*dpr)||dot.height!==Math.round(h*dpr)){dot.width=Math.round(w*dpr);dot.height=Math.round(h*dpr);} const c=dot.getContext('2d'); if(c){c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);drawDots2D(c,buffer);}}
      t.clearRect(0,0,w,h);drawText(t,frame,spec,{});
      if(!paused) raf=requestAnimationFrame(draw);
    };
    // A canvas cannot switch from 2D to WebGL after its context is created.
    loadThree().then(() => {if(disposed)return; renderer=createDotRenderer(dot,{opaque:false}); draw();});
    return () => {disposed=true;cancelAnimationFrame(raf);renderer?.dispose();};
  },[index,paused,stories,context]);
  const canvasStyle: React.CSSProperties = {position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'};
  return <div ref={container} style={{position:'relative',width:'100%',height:'100%',background:'#0B1222',overflow:'hidden',color:'white',fontFamily:'sans-serif'}}>
    <canvas ref={background} style={canvasStyle}/><canvas key={index+'-'+paused} ref={dots} style={canvasStyle}/><canvas ref={labels} style={canvasStyle}/>
    <div style={{position:'absolute',top:16,left:18,right:18,fontSize:11,display:'flex',justifyContent:'space-between'}}><span>{plan ? "YOUR RECAP" : "FICTIONAL PREVIEW"}</span><span>{index+1} / {stories.length}</span></div>
    <div style={{position:'absolute',bottom:20,left:18,right:18,display:'flex',justifyContent:'space-between',gap:8}}>
      <button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>Previous</button><button onClick={()=>setPaused(p=>!p)}>{paused?'Play':'Pause'}</button><button disabled={index===stories.length-1} onClick={()=>setIndex(i=>i+1)}>Next</button>
    </div>
  </div>;
}
