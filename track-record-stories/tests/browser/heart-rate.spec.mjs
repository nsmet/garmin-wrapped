import {test,expect} from '@playwright/test';

const days=(month,value,field)=>Array.from({length:20},(_,i)=>({date:`2025-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,[field]:value}));
async function mockHeartImport(page,{unavailableHrv=false}={}){
 await page.clock.setFixedTime(new Date('2025-10-23T12:00:00Z'));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop(),body=route.request().postDataJSON();
  if(path==='activities')return route.fulfill({json:{activities:body.start?[]:Array.from({length:8},(_,i)=>({id:String(i),utc:Date.UTC(2025,0,i+1),type:'running',parentId:null,duration:1800,distance:5000,averageHR:120+i,maxHR:180+i})),complete:!!body.start,next:body.start?null:8}});
  if(path==='wellness')return route.fulfill({json:{daily:[...days(1,60,'restingHR'),...days(2,50,'restingHR'),...days(4,55,'restingHR')]}});
  if(path==='sleep')return route.fulfill({json:{sleep:[]}});
  if(path==='hrv')return unavailableHrv?route.fulfill({status:403,json:{error:{code:'GARMIN_PERMISSION',message:'Unavailable'}}}):route.fulfill({json:{hrv:[1,2,4].includes(body.month)?days(body.month,body.month===1?50:body.month===2?70:60,'hrv'):[]}});
  return route.fulfill({json:{connected:true,disconnected:true}});
 });
 await page.goto('/');await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my Garmin recap'}).click();await expect(page.locator('#story')).toBeVisible();
}
async function navigate(page,id){
 await page.evaluate(id=>{history.replaceState(null,'','#'+id);window.dispatchEvent(new HashChangeEvent('hashchange'));},id);
 await expect(page.locator('#chapter-name')).toHaveText(id.replaceAll('-',' ').toUpperCase());
}

test('Imported heart slides expose recorded metrics and monthly coverage and require consent for each exported card',async({page})=>{
 await mockHeartImport(page);
 for(const [id,text] of [['max-hr','187 BPM'],['activity-hr','123.5 BPM'],['resting-hr','55 BPM'],['resting-hr-monthly','JAN: 60 bpm, 20 recorded days'],['hrv-median','60 MS'],['hrv-monthly','FEB: 70 ms, 20 recorded nights']]){
  await navigate(page,id);await expect(page.locator('#story-description')).toContainText(text);
  if(id.endsWith('-monthly')){await expect(page.locator('#story-description')).toContainText('MAR: insufficient measurements (0 recorded');await expect(page.locator('#story-description')).toContainText('NOV: upcoming');}
  await page.locator('#share').click();await expect(page.locator('#health-share-dialog')).toBeVisible();
  if(id.endsWith('-monthly'))await expect(page.locator('#health-share-description')).toContainText('MONTHLY MEDIANS');
  await page.locator('#health-share-confirm').click();
  await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);await expect(page.locator('#share-preview')).toHaveJSProperty('naturalHeight',1920);await expect(page.locator('#download')).toBeEnabled();await page.locator('#close-share').click();
 }
 await page.locator('#share').click();await expect(page.locator('#health-share-dialog')).toBeVisible();await page.locator('#health-share-cancel').click();await expect(page.locator('#health-share-description')).toBeEmpty();
});

test('Unavailable HRV omits its slides and leaves peak and monthly resting HR available',async({page})=>{
 await mockHeartImport(page,{unavailableHrv:true});await navigate(page,'max-hr');await expect(page.locator('#story-description')).toContainText('187 BPM');
 await navigate(page,'resting-hr-monthly');await expect(page.locator('#story-description')).toContainText('JAN: 60 bpm');
 await page.locator('#chapters-button').click();await page.locator('#story-search').fill('YOUR OVERNIGHT');await expect(page.locator('.chapter-tile')).toHaveCount(0);
 await page.locator('#recap-details').click();await expect(page.locator('#coverage-details')).toContainText('HRV stories were omitted');
});
