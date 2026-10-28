import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const baseURL=process.env.E2E_BASE_URL||'http://127.0.0.1:5187';
await mkdir('../output/layered-preview',{recursive:true});
for(const [name,viewport,ids] of [['mobile',{width:390,height:844},['running-sessions','running-hours','cycling-distance','hiit-sessions','strength-sessions','resting-hr-monthly','year-summary']],['desktop',{width:1440,height:900},['running-sessions','running-hours','cycling-distance','hiit-sessions','year-summary']]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>console.error('PAGE ERROR',e));
 await page.goto(baseURL);await page.locator('#demo-start').click();await page.locator('#story').waitFor({state:'visible'});
 for(const id of ids){await page.evaluate(id=>{history.replaceState(null,'','#'+id);window.dispatchEvent(new HashChangeEvent('hashchange'));},id);await page.waitForFunction(expected=>document.querySelector('#chapter-name').textContent===expected,id.replaceAll('-',' ').toUpperCase());await page.screenshot({path:`../output/layered-preview/${name}-${id}.png`});}
 await page.close();
}
const page=await browser.newPage({viewport:{width:1220,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
await page.goto(baseURL);
await page.evaluate(async()=>{
 const registry=(await import('/sport-registry.mjs')).default,{requiredAssets,assetFiles}=await import('/visual-system.mjs'),{renderPoster}=await import('/poster.mjs');
 await document.fonts.load('400 30px Anton');await document.fonts.load('600 14px "Space Grotesk"');
 const samples=registry.sports.map(s=>({id:s.key+'-sessions',template:s.key,title:['YOUR YEAR',s.label.toUpperCase()],value:'42',unit:'RECORDED ACTIVITIES',caption:'Every effort counts.\nFictional example.',presentation:'hero'}));
 const names=[...new Set(samples.flatMap(requiredAssets))],assets=Object.fromEntries(await Promise.all(names.map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
 document.body.innerHTML='<main id="gallery"></main>';document.body.style.cssText='margin:0;background:#e5e2da;padding:22px;font-family:Arial,sans-serif';
 const grid=document.querySelector('#gallery');grid.style.cssText='display:grid;grid-template-columns:repeat(4,270px);gap:20px;justify-content:center';
 for(const story of samples){const canvas=document.createElement('canvas');canvas.width=270;canvas.height=480;const ctx=canvas.getContext('2d');ctx.scale(270/390,270/390);renderPoster(ctx,390,390*16/9,{from:story,time:1.4,assets,chrome:'share',year:2025,notice:'Fictional example'});grid.append(canvas);}
});
await page.screenshot({path:'../output/layered-preview/all-sports.png',fullPage:true});await page.close();
await browser.close();
