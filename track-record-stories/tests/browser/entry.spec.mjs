import {test,expect} from '@playwright/test';

test('The compact homepage fits phone, tablet and desktop widths and keeps details optional',async({page})=>{
  await page.goto('/');
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const title=page.locator('#connect-title');
    await expect(title).toBeVisible();
    expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await expect(page.getByRole('button',{name:'Build my recap'})).toBeInViewport();
    // The globe sits beside the form on wide screens and above it on narrow ones, never over it.
    const [orb,form]=await Promise.all([page.locator('#connect-orb').boundingBox(),page.locator('#api-form').boundingBox()]);
    const overlap=orb.x<form.x+form.width&&form.x<orb.x+orb.width&&orb.y<form.y+form.height&&form.y<orb.y+orb.height;
    expect(overlap).toBe(false);
    await expect(page.locator('.entry-privacy')).toContainText('Your recap stays on your device.');
  }
  await expect(page.locator('.recap-faq')).not.toBeVisible();
  await page.locator('.entry-about > summary').click();
  const local=page.locator('.recap-faq details').last();
  await local.locator('summary').click();
  await expect(local.locator('p')).toContainText('import passes securely through this site’s server');
  await page.locator('#privacy-open').click();
  await expect(page.locator('#privacy-dialog')).toBeVisible();
});

test('Reduced motion goes straight to a usable homepage, with fonts served locally',async({page,baseURL})=>{
  const external=[],origin=new URL(baseURL).origin;
  page.on('request',request=>{if(new URL(request.url()).origin!==origin)external.push(request.url());});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('#entry-intro')).not.toBeVisible();
  await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
  await expect(page.locator('#entry-motion')).toBeDisabled();
  expect(await page.locator('#entry-field').getAttribute('data-frames')).not.toBeNull();
  expect(external).toEqual([]);
  await page.getByRole('button',{name:'Build my recap'}).click();
  await expect(page.locator('#key-error')).toContainText('Paste your Garmin Personal API key');
  await expect(page.locator('#api-key')).toHaveAttribute('aria-invalid','true');
  await page.locator('#key-help').click();
  await expect(page.locator('#key-help-dialog')).toBeVisible();
  await page.locator('#help-done').click();
  await expect(page.locator('#key-help-dialog')).not.toBeVisible();
  await expect(page.locator('#api-key')).toBeFocused();
});

test.describe('Animated entry',()=>{
  test.use({reducedMotion:'no-preference'});
  const frames=page=>page.locator('#entry-field').evaluate(el=>Number(el.dataset.frames||0));

  test('The dot intro plays both scenes, hands over to the form and the globe can be paused',async({page})=>{
    await page.goto('/');
    await expect(page.locator('#entry-intro')).toBeVisible();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',true);
    await expect(page.locator('#entry-intro')).toHaveAttribute('data-phase','one');
    await expect.poll(()=>page.locator('.gw-intro-one').evaluate(el=>Number(getComputedStyle(el).opacity)),{timeout:3000}).toBeGreaterThan(.9);
    await expect(page.locator('#entry-intro')).toHaveAttribute('data-phase','two',{timeout:5000});
    await expect.poll(()=>page.locator('.gw-intro-two').evaluate(el=>Number(getComputedStyle(el).opacity)),{timeout:3000}).toBeGreaterThan(.9);
    await expect(page.locator('#entry-intro')).not.toBeVisible({timeout:8000});
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    await expect(page.locator('#api-key')).toBeInViewport();
    await expect(page.locator('#api-key')).toBeEditable();
    const moving=await frames(page);
    await expect.poll(()=>frames(page)).toBeGreaterThan(moving+3);
    await page.getByRole('button',{name:'Pause homepage animation'}).click();
    await expect(page.locator('#entry-field')).toHaveAttribute('data-paused','true');
    await page.waitForTimeout(150);
    const still=await page.locator('#entry-field').evaluate(el=>el.toDataURL());
    await page.waitForTimeout(400);
    expect(await page.locator('#entry-field').evaluate(el=>el.toDataURL())).toBe(still);
    await expect(page.getByRole('button',{name:'Play homepage animation'})).toHaveAttribute('aria-pressed','true');
  });

  test('Beside the form, the card visuals play in turn and switch to the globe for loading',async({page})=>{
    await page.goto('/');await page.keyboard.press('Escape');
    await expect(page.locator('#entry-field')).toHaveAttribute('data-mode','reel');
    const first=await page.locator('#reel-label').textContent();
    await expect(page.locator('#reel-steps i.is-on')).toHaveCount(1);
    await expect(page.locator('#reel-label')).not.toHaveText(first,{timeout:9000});
    await page.route('**/api/**',route=>new Promise(()=>{}));
    await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my recap'}).click();
    await expect(page.locator('#entry-field')).toHaveAttribute('data-mode','globe');
    await page.locator('#loading-cancel').click();
    await expect(page.locator('#entry-field')).toHaveAttribute('data-mode','reel');
  });

  test('The intro can be skipped with the keyboard and respects a changed motion preference',async({page})=>{
    await page.goto('/');
    await expect(page.locator('#entry-intro')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('#intro-skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#entry-intro')).not.toBeVisible();
    await expect(page.locator('#connect-title')).toBeFocused();
    await page.reload();
    await expect(page.locator('#entry-intro')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#entry-intro')).not.toBeVisible();
    await expect(page.locator('#api-key')).toBeEditable();
    await page.reload();
    await expect(page.locator('#entry-intro')).toBeVisible();
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.locator('#entry-intro')).not.toBeVisible();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    await expect(page.locator('#entry-motion')).toBeDisabled();
  });

});

test('Loading fills the globe one dot per activity and a failure keeps the steps honest',async({page})=>{
  await page.clock.setFixedTime(new Date('2025-10-23T12:00:00Z'));
  await page.route('**/api/**',async route=>{
    const action=new URL(route.request().url()).pathname.split('/').pop();
    if(action==='connect')return route.fulfill({status:401,json:{error:{code:'GARMIN_AUTH',message:'Your Garmin key or session has expired. Connect again with a valid key.'}}});
    return route.fulfill({json:{connected:true,disconnected:true}});
  });
  await page.goto('/#connect');
  await page.locator('#api-key').fill('not-a-real-key-123');await page.getByRole('button',{name:'Build my recap'}).click();
  await expect(page.locator('#loading-status')).toContainText('expired');
  await expect(page.locator('#loading-steps li[data-state=failed]')).toHaveCount(1);
  await expect(page.locator('#loading-title')).toContainText('that again');
  await expect(page.locator('#loading-retry')).toBeVisible();
  await page.locator('#loading-retry').click();
  await expect(page.locator('#connect-screen')).toBeVisible();
});
