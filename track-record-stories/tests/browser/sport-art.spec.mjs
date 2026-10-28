import {test,expect} from '@playwright/test';

test('Every sport has loaded photo layers, a distinct composition and moving artwork',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {requiredAssets,assetFiles}=await import('/visual-system.mjs');
  const {renderPoster}=await import('/poster.mjs');
  const assets={},output=[];
  const load=async name=>{if(assets[name])return;const img=new Image();assets[name]=img;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not load '+name));img.src=assetFiles[name];});};
  for(const sport of registry.sports){
   const story={id:sport.key+'-sessions',template:sport.key,title:['YOUR YEAR'],value:'42',unit:'RECORDED ACTIVITIES',caption:'Sample',presentation:'hero'};
   await Promise.all(requiredAssets(story).map(load));
   const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;const ctx=canvas.getContext('2d');
   const hash=async time=>{renderPoster(ctx,390,844,{from:story,time,assets});const digest=await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,390,844).data);return Array.from(new Uint8Array(digest)).join(',');};
   output.push({sport:sport.key,assets:requiredAssets(story),first:await hash(0),later:await hash(2)});
  }
  return output;
 });
 expect(result).toHaveLength(18);
 expect(new Set(result.map(item=>item.first)).size).toBe(18);
 for(const item of result){expect(item.assets.length,item.sport).toBeGreaterThanOrEqual(1);expect(item.first,item.sport).not.toBe(item.later);}
});
