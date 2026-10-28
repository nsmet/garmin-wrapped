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
