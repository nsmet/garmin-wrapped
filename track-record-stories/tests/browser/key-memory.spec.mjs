import {test,expect} from '@playwright/test';
// "Remember my key on this device": opt-in, the only browser storage, removable at every step.
const NAME='garmin-wraped:key',KEY='not-a-real-key-123';
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2025-10-23T12:00:00Z'));});
async function mocked(page,{reject=false}={}){
  await page.route('**/api/**',async route=>{
    const action=new URL(route.request().url()).pathname.split('/').pop(),input=route.request().postDataJSON();
    if(reject&&action==='connect')return route.fulfill({status:401,json:{error:{code:'GARMIN_AUTH',message:'Your Garmin key or session has expired. Connect again with a valid key.'}}});
    if(action==='activities')return route.fulfill({json:{activities:input.start>0?[]:[{id:'1',utc:Date.UTC(2025,2,10,6),type:'running',parentId:null,distance:5000,duration:1800}],complete:true,next:null}});
    if(action==='wellness')return route.fulfill({json:{daily:[]}});
    if(action==='sleep')return route.fulfill({json:{sleep:[]}});
    if(action==='hrv')return route.fulfill({json:{hrv:[]}});
    return route.fulfill({json:{connected:true,disconnected:true}});
  });
}
const stored=page=>page.evaluate(()=>[localStorage.length,localStorage.getItem('garmin-wraped:key'),sessionStorage.length]);
const build=page=>page.locator('.connect-submit').click();

test('Nothing is stored unless the visitor ticks the box, and the consent line sits by the button',async({page})=>{
  await mocked(page);await page.goto('/');await page.locator('#connect-open').click();
  await expect(page.getByLabel('Remember my key on this device')).not.toBeChecked();
  await expect(page.locator('#health-consent')).toContainText('health data (steps, sleep, heart rate, HRV)');
  await expect(page.locator('#health-consent a')).toHaveAttribute('href','/privacy.html');
  await page.locator('#api-key').fill(KEY);await build(page);
  await expect(page.locator('#story')).toBeVisible();
  expect(await stored(page)).toEqual([0,null,0]);
});

test('A remembered key returns prefilled and can be forgotten',async({page})=>{
  await mocked(page);await page.goto('/');
  await page.locator('#connect-open').click();await page.locator('#api-key').fill(KEY);await page.getByLabel('Remember my key on this device').check();await build(page);
  await expect(page.locator('#story')).toBeVisible();
  expect(await stored(page)).toEqual([1,KEY,0]);
  await page.goto('/');await page.locator('#connect-open').click();
  await expect(page.locator('#api-key')).toHaveValue(KEY);
  await expect(page.getByLabel('Remember my key on this device')).toBeChecked();
  await expect(page.locator('#key-saved')).toBeVisible();
  await expect(page.locator('#connect-kicker')).toHaveText('Welcome back');
  await page.getByRole('button',{name:'Forget key'}).click();
  await expect(page.locator('#api-key')).toHaveValue('');
  await expect(page.locator('#api-key')).toBeFocused();
  await expect(page.locator('#key-forgotten')).toContainText('Key removed from this browser');
  await expect(page.locator('#key-saved')).toBeHidden();
  expect(await stored(page)).toEqual([0,null,0]);
});

test('Unticking forgets at once, and a wrong key is never saved',async({page})=>{
  await mocked(page,{reject:true});
  await page.goto('/');await page.evaluate(([name,key])=>localStorage.setItem(name,key),[NAME,KEY]);await page.reload();await page.locator('#connect-open').click();
  await expect(page.locator('#api-key')).toHaveValue(KEY);
  await page.getByLabel('Remember my key on this device').uncheck();
  expect(await stored(page)).toEqual([0,null,0]);
  await expect(page.locator('#api-key')).toHaveValue(KEY);
  await expect(page.locator('#key-forgotten')).toContainText('stays in the field for this visit only');
  await page.getByLabel('Remember my key on this device').check();await build(page);
  await expect(page.locator('#loading-status')).toContainText('expired');
  expect(await stored(page)).toEqual([0,null,0]);
});

test('A saved key that Garmin rejects is removed and the visitor is told',async({page})=>{
  await mocked(page,{reject:true});
  await page.goto('/');await page.evaluate(([name,key])=>localStorage.setItem(name,key),[NAME,KEY]);await page.reload();await page.locator('#connect-open').click();
  await build(page);
  await expect(page.locator('#loading-status')).toContainText('Your saved key was removed from this browser.');
  expect(await stored(page)).toEqual([0,null,0]);
  await page.locator('#loading-retry').click();
  await expect(page.locator('#api-key')).toHaveValue('');
  await expect(page.getByLabel('Remember my key on this device')).not.toBeChecked();
});

test('Clear my data also removes a remembered key',async({page})=>{
  await mocked(page);await page.goto('/');
  await page.locator('#connect-open').click();await page.locator('#api-key').fill(KEY);await page.getByLabel('Remember my key on this device').check();await build(page);
  await expect(page.locator('#story')).toBeVisible();
  await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#restart-onboarding').click();
  await expect(page.locator('#connect-screen')).toBeVisible();
  await expect(page.locator('#api-key')).toHaveValue('');
  expect(await stored(page)).toEqual([0,null,0]);
});

test.describe('Returning visitors',()=>{
  test.use({reducedMotion:'no-preference'});
  test('skip the intro once they chose to remember their key',async({page})=>{
    await page.goto('/');await expect(page.locator('#entry-intro')).toBeVisible();
    await page.evaluate(([name,key])=>localStorage.setItem(name,key),[NAME,KEY]);await page.reload();
    await expect(page.locator('#entry-intro')).toBeHidden();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    await expect(page.locator('#api-key')).toHaveValue(KEY);
    await expect(page.getByRole('button',{name:'Build my recap'})).toBeInViewport();
  });
});

test('The privacy page lists every stored item and loads nothing from elsewhere',async({page,baseURL})=>{
  const external=[],origin=new URL(baseURL).origin;
  page.on('request',request=>{if(new URL(request.url()).origin!==origin)external.push(request.url());});
  await page.goto('/privacy.html');
  await expect(page.getByRole('heading',{level:1})).toContainText('Your data.');
  const storage=page.getByRole('region',{name:'Cookies and browser storage'});
  await expect(storage).toContainText('__Host-mini-session');
  await expect(storage).toContainText(NAME);
  await expect(page.locator('main')).toContainText('Belgian Data Protection Authority');
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  expect(external).toEqual([]);
});
