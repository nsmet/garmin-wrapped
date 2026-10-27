import {test,expect} from '@playwright/test';

async function demo(page){
 const {dataset}=await import('../../public/sample-data.mjs');
 const {recapSequence}=await import('../../public/recap-sequence.mjs');
 await page.goto('/#'+recapSequence(dataset).at(-1).id);await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
}
async function previewPixel(page,x,y){
 return page.locator('#share-preview').evaluate(async(img,{x,y})=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(x,y,1,1).data];},{x,y});
}

test('The final card opens a recap picker, changes colors, and downloads the selected card',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await demo(page);await expect(page.locator('#share')).toHaveText('Choose a card');await page.getByRole('button',{name:'Choose a share card',exact:true}).click();
 const options=page.locator('#share-cards button');expect(await options.count()).toBeGreaterThan(5);await expect(page.locator('#download')).toBeEnabled();
 const chosen=options.nth(1),id=await chosen.getAttribute('data-story-id');await chosen.click();await expect(chosen).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Cobalt colors',exact:true}).click();await expect(page.locator('#download')).toBeEnabled();
 await expect.poll(()=>previewPixel(page,5,5)).toEqual([23,67,237,255]);
 await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);await expect(page.locator('#share-preview')).toHaveJSProperty('naturalHeight',1920);
 const download=page.waitForEvent('download');await page.locator('#download').click();const file=await download;expect(file.suggestedFilename()).toBe(`garmin-wraped-2025-${id}-cobalt-fictional-demo.png`);await file.saveAs(testInfo.outputPath('selected-card.png'));
 // The old navigation bar at 9% height is now completely clear paper.
 expect(await previewPixel(page,65,174)).toEqual([23,67,237,255]);
 await page.locator('#close-share').click();await expect(page.locator('#share-cards button')).toHaveCount(0);await expect(page.locator('#share-preview')).not.toHaveAttribute('src',/.+/);expect(errors).toEqual([]);
});

test('Fast card/color changes cannot replace the latest preview with an older export',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){return original.call(this,blob=>setTimeout(()=>callback(blob),window.delayCardEncoding?250:0),...args);};});
 await demo(page);await page.locator('#share').click();await expect(page.locator('#download')).toBeEnabled();await page.evaluate(()=>window.delayCardEncoding=true);
 await page.getByRole('button',{name:'Cobalt colors',exact:true}).click();await page.getByRole('button',{name:'Mint colors',exact:true}).click();await expect(page.locator('#download')).toBeEnabled();
 await expect.poll(()=>previewPixel(page,5,5)).toEqual([141,228,196,255]);await page.waitForTimeout(350);expect(await previewPixel(page,5,5)).toEqual([141,228,196,255]);
});

test('A deferred PNG encoder still produces the selected card promptly',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(...args){if(window.stallCardEncoding)return;return original.apply(this,args);};});
 await demo(page);await page.locator('#share').click();await expect(page.locator('#download')).toBeEnabled();await page.evaluate(()=>window.stallCardEncoding=true);
 await page.getByRole('button',{name:'Cobalt colors',exact:true}).click();await expect(page.locator('#download')).toBeEnabled();await expect.poll(()=>previewPixel(page,5,5)).toEqual([23,67,237,255]);
});

test('Choosing a health card asks consent and switching away revokes that choice',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2025-10-23T12:00:00Z'));
 await page.route('**/api/**',async route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop(),input=route.request().postDataJSON();
  if(action==='activities')return route.fulfill({json:{activities:input.start?[]:[{id:'1',utc:Date.UTC(2025,2,10,6),type:'running',parentId:null,distance:5000,duration:1800}],complete:!!input.start,next:input.start?null:1}});
  if(action==='sleep')return route.fulfill({json:{sleep:input.month===1?Array.from({length:30},(_,i)=>({date:`2025-01-${String(i+1).padStart(2,'0')}`,seconds:25200})):[]}});
  if(action==='wellness')return route.fulfill({json:{daily:[]}});return route.fulfill({json:{connected:true,disconnected:true}});
 });
 await page.goto('/');await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my Garmin recap'}).click();await expect(page.locator('#story')).toBeVisible();await page.locator('#share').click();await expect(page.locator('#download')).toBeEnabled();
 const previous=await page.locator('#share-preview').getAttribute('src'),health=page.getByRole('button',{name:'Choose OFF THE CLOCK.',exact:true});
 await health.click();await expect(page.locator('#health-share-dialog')).toBeVisible();await page.locator('#health-share-cancel').click();await expect(page.locator('#share-preview')).toHaveAttribute('src',previous);await expect(health).toHaveAttribute('aria-pressed','false');
 await health.click();await page.locator('#health-share-confirm').click();await expect(health).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#download')).toBeEnabled();
 await page.locator('#share-cards button').first().click();await expect(page.locator('#download')).toBeEnabled();await health.click();await expect(page.locator('#health-share-dialog')).toBeVisible();expect(errors).toEqual([]);
});
