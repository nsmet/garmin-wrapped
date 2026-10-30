import {test,expect} from '@playwright/test';
import {normalizeActivity} from '../../public/metrics.mjs';

test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-10-23T12:00:00Z'));});
const activity=(id,type,more={})=>normalizeActivity({activityId:id,activityType:{typeKey:type},startTimeGMT:'2026-03-10 06:00:00',distance:5000,duration:1800,...more});
async function mockImport(page,activities){
  await page.route('**/api/**',async route=>{
    const action=new URL(route.request().url()).pathname.split('/').pop(),input=route.request().postDataJSON();
    if(action==='activities')return route.fulfill({json:{activities:input.start?[]:activities,complete:!!input.start,next:input.start?null:activities.length}});
    return route.fulfill({json:{connected:true,disconnected:true}});
  });
}
async function connect(page){await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my recap'}).click();await expect(page.locator('#story')).toBeVisible();}

test('Reloading a recorded story requires reconnecting and never silently substitutes the 52-run demo',async({page})=>{
  await mockImport(page,[activity(1,'indoor_cycling')]);await page.goto('/');await connect(page);
  await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('BACK IN THE SADDLE');await page.locator('.chapter-tile').click();
  await expect(page).toHaveURL(/#cycling-sessions$/);await page.reload();
  await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#reconnect-notice')).toContainText('Reconnect to see your Garmin data');
  await expect(page.locator('#story')).not.toBeVisible();await expect(page.locator('#story-description')).toBeEmpty();
  // Real data with no running activity must never pick up the demo's runs.
  await connect(page);await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('running');await expect(page.locator('.chapter-tile')).toHaveCount(0);
});

test('The activity breakdown explains sport counts, omissions, dates and source types without leaking into exports',async({page})=>{
  const bike=activity(1,'indoor_cycling',{activityName:'Morning Run'});
  const rows=[bike,...Array.from({length:51},(_,i)=>activity(i+2,'indoor_cycling')),activity(53,'running'),activity(54,'trail_running'),activity(55,'walking'),activity(56,'unmapped_sport'),bike,activity(57,'running',{parentId:58}),activity(58,'running',{startTimeGMT:'2025-03-10 06:00:00'})];
  await mockImport(page,rows);await page.goto('/');await connect(page);
  await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#story-search').fill('RUNS, ON REPEAT');await page.locator('.chapter-tile').click();
  await expect(page.locator('#story-description')).toContainText('2 RECORDED RUNS');
  await expect(page.locator('.demo-label')).toContainText('RECORDED 2026');
  await expect(page.locator('#story footer')).not.toContainText('Some stories were omitted');
  await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#recap-details').click();
  const audit=page.locator('.activity-audit');await expect(audit).toContainText('56 activities counted from 59 returned records');
  await expect(audit).toContainText('1 duplicate records, 1 multisport child records, 1 records outside this year');
  await audit.getByText('Cycling · 52 activities',{exact:true}).click();await expect(audit.locator('li')).toHaveCount(52);
  await expect(audit).toContainText('Garmin types: indoor_cycling (52)');await expect(audit.locator('li').first()).toContainText('2026-03-10 · indoor_cycling · 30m 00s · 5.0 km');
  await expect(audit.locator('li a').first()).toHaveAttribute('href','https://connect.garmin.com/modern/activity/1');
  await expect(page.locator('#coverage-details')).toContainText('unrecognized Garmin types');
  await page.locator('#close-privacy').click();await page.locator('#close-chapters').click();await page.locator('#share:visible, #share-icon:visible').click();
  await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);
  await expect(page.locator('#share-dialog .activity-audit')).toHaveCount(0);
  await page.locator('#close-share').click();await page.locator('#chapters-button').dispatchEvent('click');await page.locator('#restart-onboarding').click();await expect(audit).toHaveCount(0);
});

test('A story URL opens the fictional demo only after the demo button is chosen',async({page})=>{
  await page.goto('/#running-sessions');await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#story')).not.toBeVisible();
  await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();await expect(page.locator('.demo-label')).toContainText('FICTIONAL');await expect(page.locator('#story-description')).toContainText('52 RECORDED RUNS');
});

test('Distance precision matches canvas labels, accessible descriptions and exported cards',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const {buildRecap}=await import('/metrics.mjs'),{datasetFromPlan,sanitizedCard,chartDescription}=await import('/story-model.mjs');
  const {cardSpec}=await import('/dot-spec.mjs'),{cardFrame,drawText}=await import('/dot-card.mjs'),{renderStill}=await import('/dot-render.mjs');
  const activities=[['running',21040],['running',5000],['cycling',68260],['cycling',10000]].map(([type,distance],i)=>({id:String(i+1),utc:Date.UTC(2025,2,10),type,parentId:null,distance,duration:1801}));
  const dataset=datasetFromPlan(buildRecap({year:2025,timeZone:'UTC',activities,indexComplete:true}));
  return dataset.stories.filter(s=>s.id.endsWith('-longest')).flatMap(story=>{
   const card=sanitizedCard(story,dataset),spec=cardSpec(card,{});
   return [[390,844,'live'],[1440,900,'live'],[1080,1920,'export']].map(([w,h,mode])=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d'),labels=[],fill=context.fillText.bind(context);
    context.fillText=(value,...args)=>{labels.push(String(value));fill(value,...args);};
    if(mode==='export')renderStill(context,w,h,spec);else drawText(context,cardFrame(w,h,{mode,bounds:{top:120,bottom:h-140,left:20,right:w-20},spec,ctx:context}),spec);
    return {id:card.id,labels,description:chartDescription(card.chart),value:card.value};
   });
  });
 });
 expect(results).toHaveLength(6);
 for(const result of results){
  const value=result.id==='running-longest'?'21.0':'68.3';
  expect(result.value).toBe(value);expect(result.labels).toContain(value);expect(result.labels).toContain('1 · '+value+' km');expect(result.description).toContain(value+' km');
  expect(result.labels).toContain(result.id==='running-longest'?'2 · 5.0 km':'2 · 10.0 km');
 }
});
