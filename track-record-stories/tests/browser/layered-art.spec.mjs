import {test,expect} from '@playwright/test';

test('The photographic layers load as transparent images for every sport',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {requiredAssets,assetFiles}=await import('/visual-system.mjs');
  const names=[...new Set(registry.sports.flatMap(s=>requiredAssets({id:s.key+'-sessions',template:s.key})))],issues=[];
  if(!requiredAssets({template:'running',chart:{kind:'duration'}}).includes('shoe'))issues.push('running duration is missing its sport layers');
  if(requiredAssets({template:'heart',chart:{kind:'health-months'}}).length)issues.push('health charts must not load sport layers');
  for(const name of names){
   const src=assetFiles[name];if(!src?.endsWith('.webp')){issues.push(`${name}: missing optimized layer`);continue;}
   const img=new Image();img.src=src;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,64,64);
   const pixels=ctx.getImageData(0,0,64,64).data;let transparent=0;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]<10)transparent++;
   if(transparent<64)issues.push(`${name}: no meaningful transparent area`);
  }
  return {count:names.length,issues};
 });
 expect(result.count).toBeGreaterThan(20);expect(result.issues).toEqual([]);
});

test('Running layers move independently while grounded strength layers stay still',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {requiredAssets,assetFiles,palettes}=await import('/visual-system.mjs');
  const {drawLayeredArt}=await import('/layered-art.mjs');const {posterLayout}=await import('/poster-layout.mjs');
  const load=async s=>Object.fromEntries(await Promise.all(requiredAssets(s).map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  const track={id:'running-sessions',template:'running'},strength={id:'strength-sessions',template:'strength'};
  const positions=async(story,time)=>{
   const assets=await load(story),canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx),out={};
   ctx.drawImage=(img,...args)=>{const name=Object.keys(assets).find(key=>assets[key]===img),t=ctx.getTransform();out[name]=[t.e,t.f];return draw(img,...args);};
   drawLayeredArt(ctx,390,844,story,time,assets,posterLayout(390,844),palettes[story.template]);return out;
  };
  return {run0:await positions(track,0),run5:await positions(track,5),strength0:await positions(strength,0),strength5:await positions(strength,5)};
 });
 expect(result.run0.shoe).not.toEqual(result.run5.shoe);
 expect(result.run0['running-track']).not.toEqual(result.run5['running-track']);
 expect(result.strength0.dumbbell).toEqual(result.strength5.dumbbell);
 expect(result.strength0['gym-floor']).toEqual(result.strength5['gym-floor']);
});

test('Running hero artwork stays prominent on phone, desktop and share layouts',async({page})=>{
 await page.goto('/');
 const placements=await page.evaluate(async()=>{
  const {requiredAssets,assetFiles,palettes}=await import('/visual-system.mjs');
  const {drawLayeredArt}=await import('/layered-art.mjs');const {posterLayout}=await import('/poster-layout.mjs');
  const story={id:'running-sessions',template:'running'};
  const assets=Object.fromEntries(await Promise.all(requiredAssets(story).map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  return [[320,568,false],[390,844,false],[1440,900,false],[390,390*16/9,true]].map(([w,h,share])=>{
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),found={};
   const layout=posterLayout(w,h,share?{bounds:{top:h*.115,bottom:h*.85},chrome:'share'}:{});
   c.drawImage=(img,x,y,iw,ih)=>{
    const name=Object.keys(assets).find(key=>assets[key]===img),t=c.getTransform();
    const points=[[x,y],[x+iw,y],[x,y+ih],[x+iw,y+ih]].map(([px,py])=>t.transformPoint({x:px,y:py}));
    const left=Math.max(0,layout.art.x,Math.min(...points.map(p=>p.x))),right=Math.min(w,layout.art.x+layout.art.w,Math.max(...points.map(p=>p.x)));
    found[name]=Math.max(0,right-left)/w;return draw(img,x,y,iw,ih);
   };
   drawLayeredArt(c,w,h,story,0,assets,layout,palettes.running);
   return {w,share,...found};
  });
 });
 for(const result of placements){
  expect(result.shoe,JSON.stringify(result)).toBeGreaterThan(result.w>=700?.28:.6);
  expect(result['running-track'],JSON.stringify(result)).toBeGreaterThan(result.w>=700?.3:.85);
 }
});
