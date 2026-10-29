import {test,expect} from '@playwright/test';

// Session cards: every sport has its own dot motif, one bright dot per session, and moving artwork.
test('Every sport has a distinct dot motif, one data dot per session and moving artwork',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {cardSpec}=await import('/dot-spec.mjs');const {build}=await import('/dot-engine.mjs');const {renderStill}=await import('/dot-render.mjs');const {loadThree}=await import('/dot-scene.mjs');
  await loadThree();await document.fonts.load('800 20px Sora');
  const output=[];
  for(const key of [...registry.sports.map(s=>s.key),'other']){
   const story={id:key+'-sessions',title:['YOUR YEAR'],value:'42',unit:'RECORDED ACTIVITIES',caption:'Sample\nSample'};
   const spec=cardSpec(story,{}),canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const ctx=canvas.getContext('2d');
   const hash=async time=>{const r=renderStill(ctx,360,640,spec,{time});const digest=await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,360,640).data);return {renderer:r.renderer,h:Array.from(new Uint8Array(digest)).join(',')};};
   const first=await hash(1),later=await hash(3);
   output.push({sport:key,motif:spec.p.k,dots:build(spec).pts.filter(p=>p.dat).length,first:first.h,later:later.h,renderer:first.renderer});
  }
  return output;
 });
 expect(result).toHaveLength(19);
 expect(new Set(result.map(item=>item.first)).size).toBe(19);
 for(const item of result){expect(item.motif,item.sport).toBe(item.sport);expect(item.dots,item.sport).toBe(42);expect(item.first,item.sport).not.toBe(item.later);expect(['webgl','2d']).toContain(item.renderer);}
});

test('Exports render the dot layer with Three.js and fall back to 2D without WebGL',async({page,browser})=>{
 await page.goto('/');
 const gl=await page.evaluate(async()=>{const {loadThree}=await import('/dot-scene.mjs');await loadThree();const {renderStill}=await import('/dot-render.mjs');const {cardSpec}=await import('/dot-spec.mjs');
  const c=document.createElement('canvas');c.width=1080;c.height=1920;const ctx=c.getContext('2d'),r=renderStill(ctx,1080,1920,cardSpec({id:'running-sessions',title:['RUNS, ON REPEAT.'],value:'52',unit:'RECORDED RUNS',caption:'a\nb'},{}));
  const px=[...ctx.getImageData(0,0,1080,1920).data].reduce((n,v,i)=>n+(i%4===0&&v>200?1:0),0);return {renderer:r.renderer,dots:r.dots,bright:px};});
 expect(gl.dots).toBeGreaterThan(52);expect(gl.bright).toBeGreaterThan(1000);
 // Without WebGL the same card renders with 2D sprites.
 const context=await browser.newContext();const other=await context.newPage();
 await other.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...a){return /webgl/.test(type)?null:get.call(this,type,...a);};});
 await other.goto('/');await other.locator('#demo-start').click();await expect(other.locator('#story')).toBeVisible();
 await expect(other.locator('#dots')).toHaveAttribute('data-renderer','2d');
 await other.locator('#share').click();await expect(other.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);
 await context.close();
});
