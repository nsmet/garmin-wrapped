import {test,expect} from '@playwright/test';

test('Every sport keeps a distinct collage and moving artwork with identical data and colors',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {renderPoster}=await import('/poster.mjs');
  const {assetFiles,requiredAssets}=await import('/visual-system.mjs');
  const registry=(await import('/sport-registry.mjs')).default;
  await document.fonts.ready;
  const stories=[...registry.sports.map(s=>s.key),'other'].map(sport=>({id:sport+'-sessions',template:sport==='other'?'cardio':sport,title:['A YEAR IN MOTION.'],value:'52',unit:'RECORDED ACTIVITIES',caption:'Fictional design fixture',presentation:'hero'}));
  const assets={};await Promise.all([...new Set(stories.flatMap(requiredAssets))].map(async key=>{const img=new Image();img.src='/'+assetFiles[key];await img.decode();assets[key]=img;}));
  const hashes=[];for(const s of stories){
   const canvas=document.createElement('canvas');canvas.width=390;canvas.height=694;const c=canvas.getContext('2d'),frames=[];
   for(const time of [0,5]){renderPoster(c,390,694,{from:s,assets,time,palette:['#f3f0e8','#101519','#1743ed','#ff7038']});frames.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',c.getImageData(0,0,390,694).data))).join(','));}
   renderPoster(c,390,694,{from:{...s,id:s.id.replace('-sessions','-return')},assets,time:5,palette:['#f3f0e8','#101519','#1743ed','#ff7038']});
   const continued=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',c.getImageData(0,0,390,694).data))).join(',');
   hashes.push({id:s.id,frames,continued});
  }return hashes;
 });
 expect(result).toHaveLength(19);expect(new Set(result.map(s=>s.frames[0])).size).toBe(19);
 for(const s of result){expect(s.frames[1],s.id+' animates its artwork').not.toBe(s.frames[0]);expect(s.continued,s.id+' keeps its phase on the next slide').toBe(s.frames[1]);}
});

test('Sport transitions have distinct masks and finish without an uncovered-edge jump',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {editorialReveal,sportMotion}=await import('/editorial-art.mjs');
  const registry=(await import('/sport-registry.mjs')).default;
  const output=[];
  for(const sport of [...registry.sports.map(s=>s.key),'other']){
   const c=document.createElement('canvas').getContext('2d');c.canvas.width=120;c.canvas.height=200;
   c.save();editorialReveal(c,120,200,.53,sportMotion[sport]);c.fillStyle='#fff';c.fillRect(0,0,120,200);c.restore();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',c.getImageData(0,0,120,200).data))).join(',');
   c.clearRect(0,0,120,200);c.save();editorialReveal(c,120,200,.99,sportMotion[sport]);c.fillRect(0,0,120,200);c.restore();
   const data=c.getImageData(0,0,120,200).data;let filled=0;for(let i=3;i<data.length;i+=4)if(data[i]===255)filled++;
   output.push({sport,hash,coverage:filled/(120*200)});
  }return output;
 });
 expect(new Set(result.map(s=>s.hash)).size).toBe(19);
 for(const s of result)expect(s.coverage,s.sport+' reveal covers the final frame').toBeGreaterThan(.99);
});
