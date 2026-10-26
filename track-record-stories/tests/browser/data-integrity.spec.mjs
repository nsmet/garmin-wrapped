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
async function connect(page){await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my Garmin recap'}).click();await expect(page.locator('#story')).toBeVisible();}

test('Reloading a recorded story requires reconnecting and never silently substitutes the 52-run demo',async({page})=>{
  await mockImport(page,[activity(1,'indoor_cycling')]);await page.goto('/');await connect(page);
  await page.locator('#chapters-button').click();await page.locator('#story-search').fill('BACK IN THE SADDLE');await page.locator('.chapter-tile').click();
  await expect(page).toHaveURL(/#cycling-sessions$/);await page.reload();
  await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#reconnect-notice')).toContainText('Reconnect to see your Garmin data');
  await expect(page.locator('#story')).not.toBeVisible();await expect(page.locator('#story-description')).toBeEmpty();
  // Real data with no running activity must never pick up the demo's runs.
  await connect(page);await page.locator('#chapters-button').click();await page.locator('#story-search').fill('running');await expect(page.locator('.chapter-tile')).toHaveCount(0);
});

test('The activity breakdown explains sport counts, omissions, dates and source types without leaking into exports',async({page})=>{
  const bike=activity(1,'indoor_cycling',{activityName:'Morning Run'});
  const rows=[bike,...Array.from({length:51},(_,i)=>activity(i+2,'indoor_cycling')),activity(53,'running'),activity(54,'trail_running'),activity(55,'walking'),activity(56,'unmapped_sport'),bike,activity(57,'running',{parentId:58}),activity(58,'running',{startTimeGMT:'2025-03-10 06:00:00'})];
  await mockImport(page,rows);await page.goto('/');await connect(page);
  await page.locator('#chapters-button').click();await page.locator('#story-search').fill('RUNS, ON REPEAT');await page.locator('.chapter-tile').click();
  await expect(page.locator('#story-description')).toContainText('2 RECORDED RUNS');
  await expect(page.locator('.demo-label')).toContainText('RECORDED 2026');
  await expect(page.locator('#story footer')).not.toContainText('Some stories were omitted');
  await page.locator('#chapters-button').click();await page.locator('#recap-details').click();
  const audit=page.locator('.activity-audit');await expect(audit).toContainText('56 activities counted from 59 returned records');
  await expect(audit).toContainText('1 duplicate records, 1 multisport child records, 1 records outside this year');
  await audit.getByText('Cycling · 52 activities',{exact:true}).click();await expect(audit.locator('li')).toHaveCount(52);
  await expect(audit).toContainText('Garmin types: indoor_cycling (52)');await expect(audit.locator('li').first()).toContainText('2026-03-10 · indoor_cycling · 30 min · 5 km');
  await expect(audit.locator('li a').first()).toHaveAttribute('href','https://connect.garmin.com/modern/activity/1');
  await expect(page.locator('#coverage-details')).toContainText('unrecognized Garmin types');
  await page.locator('#close-privacy').click();await page.locator('#close-chapters').click();await page.locator('#share').click();
  await expect(page.locator('#share-preview')).toHaveJSProperty('naturalWidth',1080);
  await expect(page.locator('#share-dialog .activity-audit')).toHaveCount(0);
  await page.locator('#close-share').click();await page.locator('#chapters-button').click();await page.locator('#restart-onboarding').click();await expect(audit).toHaveCount(0);
});

test('A story URL opens the fictional demo only after the demo button is chosen',async({page})=>{
  await page.goto('/#running-sessions');await expect(page.locator('#connect-screen')).toBeVisible();await expect(page.locator('#story')).not.toBeVisible();
  await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();await expect(page.locator('.demo-label')).toContainText('FICTIONAL');await expect(page.locator('#story-description')).toContainText('52 RECORDED RUNS');
});
