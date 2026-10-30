import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2025-10-23T12:00:00Z'));});
const activity=(id,more={})=>({id:String(id),utc:Date.UTC(2025,2,10,6),type:'running',parentId:null,distance:5000,duration:1800,...more});
async function mocked(page,{empty=false,health=false,error=false,delay=false,optionalFailure=false,sport='running'}={}){
 await page.route('**/api/**',async route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop(),input=route.request().postDataJSON();
  if(delay&&action==='activities')await new Promise(r=>setTimeout(r,1500));
  if(error&&action==='connect')return route.fulfill({status:401,json:{error:{code:'GARMIN_AUTH',message:'Your Garmin key or session has expired. Connect again with a valid key.'}}});
  if(optionalFailure&&['wellness','sleep'].includes(action))return route.fulfill({status:503,json:{error:{code:'GARMIN_TLS',message:'A secure connection to Garmin could not be verified. Please try again later.'}}});
  if(action==='activities')return route.fulfill({json:{activities:empty||input.start>0?[]:[activity(1,{type:sport}),activity(2,{type:sport})],complete:empty||input.start>0,next:input.start?null:2}});
  if(action==='wellness')return route.fulfill({json:{daily:[]}});
  if(action==='sleep')return route.fulfill({json:{sleep:health&&input.month===1?Array.from({length:30},(_,i)=>({date:`2025-01-${String(i+1).padStart(2,'0')}`,seconds:25200})):[]}});
  return route.fulfill({json:{connected:true,disconnected:true}});
 });
}
async function connect(page){await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my recap'}).click();}
async function checkProductCredit(page,selector,placement='header'){
 const link=page.locator(selector),expected='https://miniwatt.app/?utm_source=garmin_wraped&utm_medium=referral&utm_campaign=product_credit&utm_content='+placement;
 await expect(link).toHaveAttribute('href',expected);
 await page.context().route('https://miniwatt.app/**',route=>route.fulfill({contentType:'text/html',body:'MINI WATT'}));
 const opened=page.waitForEvent('popup');await link.click();const popup=await opened;
 await expect(popup).toHaveURL(expected);await popup.close();
}
test('Garmin Wraped branding carries through to the recap and cycling ends with a MINI WATT invitation',async({page})=>{
 await mocked(page,{sport:'indoor_cycling'});await page.goto('/');
 await expect(page).toHaveTitle('Garmin Wrapped: Your Garmin Connect Year in Review | MINI WATT');
 await expect(page.locator('.gw-header .brand')).toContainText('GARMIN WRAPED');
 await expect(page.locator('.gw-header .brand')).toContainText('a MINI WATT product');
 await checkProductCredit(page,'.gw-header .brand-product');
 await connect(page);await expect(page.locator('#story')).toBeVisible();
 // Phones carry the credit in the slim footer instead of under the wordmark.
 const footerCredit=await page.locator('.story-chrome .footer-credit').isVisible();
 await checkProductCredit(page,'.story-chrome .product-credit:visible',footerCredit?'footer':'header');
 await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('KEEP RIDING');await page.locator('.chapter-tile').click();
 await expect(page.locator('#story-title')).toHaveText('KEEP RIDING INDOORS.');
 await expect(page.locator('#mini-watt-offer')).toBeVisible();
 await expect(page.locator('.mini-watt-cta')).toHaveAttribute('href','https://www.miniwatt.app/download');
 await expect(page.locator('.mini-watt-cta')).toHaveAttribute('rel','noopener noreferrer');
 const position=await page.locator('#position').innerText(),[index,total]=position.split(' / ').map(Number);expect(index).toBe(total);
 await page.locator('#back').click();await expect(page.locator('#chapter-name')).toHaveText('FINALE');await expect(page.locator('#mini-watt-offer')).toBeHidden();
 await page.locator('#advance').click();await expect(page.locator('#mini-watt-offer')).toBeVisible();
 await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#download')).toBeEnabled();
 await expect(page.locator('#share-cards [data-story-id="mini-watt"]')).toHaveCount(0);
 await page.locator('#close-share').click();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#restart-onboarding').click();
 await expect(page.locator('#mini-watt-offer')).toBeHidden();
});
test('A recap without cycling finishes at the year receipt without a MINI WATT invitation',async({page})=>{
 await mocked(page);await page.goto('/');await connect(page);await expect(page.locator('#story')).toBeVisible();
 await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('KEEP RIDING');await expect(page.locator('.chapter-tile')).toHaveCount(0);
 await page.locator('#story-search').fill('TRACK RECORD');await page.locator('.chapter-tile').click();
 await expect(page.locator('#chapter-name')).toHaveText('FINALE');await expect(page.locator('#advance')).toHaveAttribute('aria-label','Choose a share card');await expect(page.locator('#mini-watt-offer')).toBeHidden();
});
for(const {timeZone,year,lastMonth} of [{timeZone:'Pacific/Kiritimati',year:2027,lastMonth:1},{timeZone:'America/Los_Angeles',year:2026,lastMonth:12}]){
 test.describe(`Automatic recap period in ${timeZone}`,()=>{
  test.use({timezoneId:timeZone});
  test('Uses the device’s current year at import time without year or timezone controls',async({page})=>{
   const requests=[];
   await page.route('**/api/**',async route=>{
    const action=new URL(route.request().url()).pathname.split('/').pop(),input=route.request().postDataJSON();requests.push({action,input});
    if(action==='activities')return route.fulfill({json:{activities:input.start?[]:[activity(1,{utc:Date.parse('2026-12-31T23:45:00Z')})],complete:!!input.start,next:input.start?null:1}});
    if(action==='wellness')return route.fulfill({json:{daily:[]}});
    if(action==='sleep')return route.fulfill({json:{sleep:[]}});
    return route.fulfill({json:{connected:true,disconnected:true}});
   });
   await page.goto('/');await expect(page.locator('#recap-year, #recap-zone, [name="year"], [name="timeZone"], #include-steps, #include-health, .data-choices')).toHaveCount(0);
   // The page was opened in 2025; detect the current period again when importing.
   await page.clock.setFixedTime(new Date('2027-01-01T00:30:00Z'));
   await connect(page);
   await expect(page.locator('#story')).toBeVisible();await expect(page.locator('#edition-year')).toHaveText(String(year));await expect(page.locator('#story-description')).toContainText('so far');
   expect(requests.filter(r=>r.action==='activities').map(r=>r.input)).toEqual([{year,timeZone,start:0},{year,timeZone,start:1}]);
   expect(requests.find(r=>r.action==='wellness').input).toEqual({year,includeHealth:true});
   expect(requests.filter(r=>r.action==='sleep').map(r=>r.input)).toEqual(Array.from({length:lastMonth},(_,i)=>({year,month:i+1})));
   await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#recap-details').click();await expect(page.locator('#coverage-details')).toContainText(timeZone);
  });
 });
}
test('Demo stays fictional, supports keyboard navigation and exports a PNG',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:'Try the demo'}).click();await expect(page.locator('#story')).toBeVisible();await expect(page.locator('.demo-label')).toHaveText(/FICTIONAL/);await page.keyboard.press('ArrowRight');await expect(page.locator('#story')).toHaveAttribute('data-story','year-summary');await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#download')).toBeEnabled();await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);await expect(page.locator('#share-preview')).toHaveJSProperty('naturalHeight',1920);const download=page.waitForEvent('download');await page.locator('#download').click();expect((await download).suggestedFilename()).toContain('fictional-demo.png');expect(errors).toEqual([]);
});
test('Real import produces verified stories and clearing removes visible personal results',async({page})=>{
 await mocked(page);await page.goto('/');await connect(page);await expect(page.locator('#story')).toBeVisible();await expect(page.locator('.demo-label')).toHaveText('RECORDED 2025 · YEAR TO DATE');await expect(page.locator('#edition-year')).toHaveText('2025');await expect(page.locator('#api-key')).toHaveValue('');await page.locator('#chapters-button').dispatchEvent('click');await expect(page.locator('#library-count')).toContainText('verified recorded stories');await page.locator('#restart-onboarding').click();await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#story-description')).toBeEmpty();expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
});
test('Default health inclusion still requires per-card export consent and consent expires after preview',async({page})=>{
 await mocked(page,{health:true});await page.goto('/');await connect(page);await expect(page.locator('#story')).toBeVisible();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('OFF THE CLOCK');await page.locator('.chapter-tile').click();await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#health-share-dialog')).toBeVisible();await page.locator('#health-share-cancel').click();await expect(page.locator('#share-dialog')).not.toBeVisible();await page.locator('#share:visible, #share-icon:visible').click();await page.locator('#health-share-confirm').click();await expect(page.locator('#download')).toBeEnabled();await page.locator('#close-share').click();await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#health-share-dialog')).toBeVisible();
});
test('Empty years and expired keys show a recoverable state without fictional fallback',async({page})=>{
 await mocked(page,{empty:true});await page.goto('/');await connect(page);await expect(page.locator('#loading-status')).toContainText('No supported activities');await expect(page.locator('#story')).not.toBeVisible();await page.locator('#loading-retry').click();await expect(page.locator('#connect-screen')).toBeVisible();await page.unroute('**/api/**');await mocked(page,{error:true});await connect(page);await expect(page.locator('#loading-status')).toContainText('expired');await expect(page.locator('#story')).not.toBeVisible();
});
test('Cancellation cannot reveal a late recap',async({page})=>{
 await mocked(page,{delay:true});await page.goto('/');await connect(page);await expect(page.locator('#loading-status')).toContainText('Reading activity');await page.locator('#loading-cancel').click();await page.waitForTimeout(1800);await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#story')).not.toBeVisible();
});
test('Library remains separate and privacy dialog is keyboard accessible',async({page})=>{
 await page.goto('/');await page.locator('#privacy-open').click();await expect(page.getByRole('dialog',{name:'YOUR DATA. YOUR CALL.'})).toBeVisible();await page.keyboard.press('Escape');await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#library-mode').selectOption('library');await expect(page.locator('#library-count')).toContainText('184 templates');await page.locator('#story-search').fill('fuel for your year');await page.locator('.chapter-tile').click();await expect(page.locator('.demo-label')).toContainText('TEMPLATE');
});
test('Dismissing health consent and clearing data removes hidden health text',async({page})=>{
 await mocked(page,{health:true});await page.goto('/');await connect(page);await expect(page.locator('#story')).toBeVisible();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('OFF THE CLOCK');await page.locator('.chapter-tile').click();await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#health-share-description')).toContainText('MEDIAN RECORDED SLEEP');await page.locator('#health-share-cancel').click();await expect(page.locator('#health-share-description')).toBeEmpty();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#restart-onboarding').click();await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#health-share-description')).toBeEmpty();await expect(page.locator('#story-description')).toBeEmpty();await expect(page.locator('#share-preview')).not.toHaveAttribute('src',/.+/);
});
test('A failed health export cannot preserve consent for another preview',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){if(window.failNextCard){window.failNextCard=false;callback(null);return;}return original.call(this,callback,...args);};});
 await mocked(page,{health:true});await page.goto('/');await connect(page);await expect(page.locator('#story')).toBeVisible();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('OFF THE CLOCK');await page.locator('.chapter-tile').click();await page.evaluate(()=>{window.failNextCard=true;});await page.locator('#share:visible, #share-icon:visible').click();await page.locator('#health-share-confirm').click();await expect(page.locator('#share-error')).toContainText('could not be created');await page.locator('#close-share').click();await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#health-share-dialog')).toBeVisible();
});

test('Unavailable optional sources leave the recap uninterrupted and explain coverage in its menu',async({page})=>{
 await mocked(page,{optionalFailure:true});await page.goto('/');await connect(page);
 await expect(page.locator('#story')).toBeVisible();await expect(page.locator('.demo-label')).toHaveText('RECORDED 2025 · YEAR TO DATE');
 await expect(page.locator('#story footer')).not.toContainText('Some stories were omitted');await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.keyboard.press('ArrowRight');await expect(page.locator('#story')).toHaveAttribute('data-story','year-summary');
 await expect(page.locator('#story footer')).not.toContainText('Some stories were omitted');
 await page.locator('#chapters-button').dispatchEvent('click');await page.getByRole('button',{name:'Activity breakdown, coverage & privacy'}).click();
 await expect(page.locator('#coverage-details')).toContainText('Sleep stories were omitted');await expect(page.locator('#coverage-details')).toContainText('A secure source connection failed');
 await page.locator('#close-privacy').click();await page.locator('#story-search').fill('OFF THE CLOCK');await expect(page.locator('.chapter-tile')).toHaveCount(0);
});

test('Imported recap exposes year totals, per-sport counts and a complete monthly heat map in reading and export',async({page})=>{
 await page.route('**/api/**',async route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop(),input=route.request().postDataJSON();
  if(action==='activities')return route.fulfill({json:{activities:input.start>0?[]:[activity(1,{utc:Date.UTC(2025,0,4,6),duration:1800}),activity(2,{utc:Date.UTC(2025,0,4,8),type:'hiit',duration:3600}),activity(3,{utc:Date.UTC(2025,1,7,6),type:'cycling',duration:7200})],complete:input.start>0,next:input.start?null:3}});
  return route.fulfill({json:{connected:true,disconnected:true}});
 });
 await page.goto('/');await connect(page);await expect(page.locator('#story')).toBeVisible();
 await page.keyboard.press('ArrowRight');await expect(page.locator('#story-description')).toContainText('MINUTES: 210');await expect(page.locator('#story-description')).toContainText('ACTIVE DAYS: 2');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#story-description')).toContainText('HIIT: 1 activities (33%)');await expect(page.locator('#story-description')).toContainText('Cycling: 1 activities (33%)');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#story-description')).toContainText('JAN: 90 minutes, 2 activities');await expect(page.locator('#story-description')).toContainText('FEB: 120 minutes, 1 activities');await expect(page.locator('#story-description')).toContainText('MAR: 0 minutes, 0 activities');await expect(page.locator('#story-description')).toContainText('Peak completed month: FEB');
 await page.locator('#share:visible, #share-icon:visible').click();await expect(page.locator('#download')).toBeEnabled();await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);await expect(page.locator('#share-preview')).toHaveJSProperty('naturalHeight',1920);
});
