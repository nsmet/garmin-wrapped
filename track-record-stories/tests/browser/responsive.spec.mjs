import {test,expect} from '@playwright/test';

async function captureText(page){
 await page.addInitScript(()=>{
  const prototype=CanvasRenderingContext2D.prototype,fill=prototype.fillText,clear=prototype.clearRect;
  prototype.clearRect=function(...args){if(this.canvas.id==='poster')window.posterText=[];return clear.apply(this,args);};
  prototype.fillText=function(value,x,y,...args){
   if(this.canvas.id==='poster'&&this.globalAlpha>.95){
    const m=this.measureText(String(value)),t=this.getTransform(),ratio=this.canvas.width/this.canvas.clientWidth;
    const shift=this.textAlign==='center'?m.width/2:this.textAlign==='right'?m.width:0;
    const a=t.transformPoint({x:x-shift,y:y-m.actualBoundingBoxAscent}),b=t.transformPoint({x:x-shift+m.width,y:y+m.actualBoundingBoxDescent});
    (window.posterText??=[]).push({value,left:a.x/ratio,top:a.y/ratio,right:b.x/ratio,bottom:b.y/ratio});
   }
   return fill.call(this,value,x,y,...args);
  };
 });
}
async function navigate(page,id,browserName){
 // WebKit limits history updates to 100 per ten seconds. Keep a full-library
 // sweep below that browser limit; each navigation also updates the app URL.
 if(browserName==='webkit')await page.waitForTimeout(230);
 await page.evaluate(id=>{history.replaceState(null,'','#'+id);window.dispatchEvent(new HashChangeEvent('hashchange'));},id);
}

async function fits(page,label){
 const result=await page.evaluate(()=>{
  const stage=document.querySelector('#story').getBoundingClientRect(),header=document.querySelector('.chapter-label').getBoundingClientRect(),footer=document.querySelector('#story footer').getBoundingClientRect();
  return {overflow:document.documentElement.scrollWidth>innerWidth,clipped:(window.posterText||[]).filter(t=>t.left< -1||t.right>stage.width+1||t.top<header.bottom-stage.top+5||t.bottom>footer.top-stage.top-5)};
 });
 expect(result.overflow,`${label}: horizontal overflow`).toBe(false);
 expect(result.clipped,`${label}: story text overlaps chrome or leaves the viewport`).toEqual([]);
}

test('Every recap slide fits desktop, tablet and compact mobile layouts after resizing',async({page,browserName})=>{
 test.setTimeout(90000);await captureText(page);await page.goto('/');await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
 const ids=await page.evaluate(async()=>{const {dataset}=await import('/sample-data.mjs');const {recapSequence}=await import('/recap-sequence.mjs');return recapSequence(dataset).map(s=>s.id);});
 for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  // Wait for the responsive canvas to redraw before measuring its text.
  await expect.poll(()=>page.locator('#poster').evaluate(canvas=>{
   const ratio=Math.min(devicePixelRatio||1,2),box=canvas.getBoundingClientRect();
   return canvas.width===Math.round(box.width*ratio)&&canvas.height===Math.round(box.height*ratio);
  })).toBe(true);
  for(const id of ids){
   await navigate(page,id,browserName);await expect(page.locator('#story')).toHaveAttribute('data-story',id);
   await fits(page,`${width}×${height} ${id}`);
  }
 }
});

test('All 184 design templates keep their typography clear at desktop and mobile sizes',async({page,browserName})=>{
 test.setTimeout(180000);await captureText(page);await page.goto('/');await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
 await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#library-mode').selectOption('library');await expect(page.locator('#library-count')).toContainText('184 templates');await page.locator('.chapter-tile').first().click();
 const templates=await page.evaluate(async()=>{const {makeLibrary,extensions}=await import('/story-library.mjs');const catalog=await fetch('/story-catalog.json').then(r=>r.json());return [...makeLibrary(catalog),...extensions].map(s=>({id:s.id,title:s.title.join(' ')}));});
 for(const [width,height] of [[1440,900],[768,1024],[320,568]]){
  await page.setViewportSize({width,height});
  await expect.poll(()=>page.locator('#poster').evaluate(canvas=>{const ratio=Math.min(devicePixelRatio||1,2),box=canvas.getBoundingClientRect();return canvas.width===Math.round(box.width*ratio)&&canvas.height===Math.round(box.height*ratio);})).toBe(true);
  for(const {id,title} of templates){
   await navigate(page,id,browserName);await expect(page.locator('#story-title')).toHaveText(title);
   await fits(page,`${width}×${height} ${id}`);
  }
 }
});

test('Onboarding, loading, dialogs and export controls remain usable at each screen size',async({page})=>{
 test.setTimeout(60000);
 for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#key-help').click();await expect(page.locator('#close-key-help')).toBeInViewport();await page.locator('#close-key-help').click();
  await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
  await page.locator('#chapters-button').dispatchEvent('click');await expect(page.locator('#close-chapters')).toBeInViewport();await expect(page.locator('#story-search')).toBeVisible();await page.locator('#close-chapters').click();
  await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#download')).toBeEnabled();await page.locator('#download').scrollIntoViewIfNeeded();await expect(page.locator('#download')).toBeInViewport();
  await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);await expect(page.locator('#share-preview')).toHaveJSProperty('naturalHeight',1920);
 }
});

test('Phones get slim recap chrome: share icon in the header, tap zones and a one-line footer',async({page})=>{
 await page.setViewportSize({width:390,height:664});await page.goto('/');await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
 for(const selector of ['#chapters-button','#share','#motion','#caption','.demo-label','.story header .brand-product'])await expect(page.locator(selector),selector).toBeHidden();
 await expect(page.locator('#share-icon')).toBeVisible();await expect(page.locator('.footer-credit')).toBeVisible();await expect(page.locator('#chapter-key')).toHaveText(/^1 dot/);
 const progress=await page.locator('#progress').boundingBox(),header=await page.locator('.story header').boundingBox(),footer=await page.locator('#story footer').boundingBox();
 expect(progress.y).toBeGreaterThan(header.y);expect(footer.height).toBeLessThanOrEqual(44);
 await page.locator('#advance').click({position:{x:120,y:200}});await expect(page.locator('#story')).toHaveAttribute('data-story','year-summary');
 await page.locator('#back').click({position:{x:40,y:200}});await expect(page.locator('#story')).toHaveAttribute('data-story','cover');
 await page.locator('#share-icon').click();await expect(page.locator('#download')).toBeEnabled();
});
