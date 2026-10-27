import {test,expect} from '@playwright/test';

test('The compact homepage fits phone, tablet and desktop widths and keeps details optional',async({page})=>{
  await page.goto('/');
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const title=page.locator('#entry-title');
    await expect(title).toBeVisible();
    expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await expect(page.getByRole('button',{name:'Build my Garmin recap'})).toBeVisible();
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

test('Reduced motion goes straight to a usable homepage, with fonts served locally',async({page})=>{
  const external=[];
  page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:5173/'))external.push(request.url());});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('#entry-intro')).not.toBeVisible();
  await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
  await expect(page.locator('#entry-motion')).toBeDisabled();
  expect(external).toEqual([]);
  await page.getByRole('button',{name:'Build my Garmin recap'}).click();
  await expect(page.locator('#key-error')).toContainText('Paste your Garmin Personal API key');
  await page.locator('#key-help').click();
  await expect(page.locator('#key-help-dialog')).toBeVisible();
});

test.describe('Animated entry',()=>{
  test.use({reducedMotion:'no-preference'});

  test('The intro reveals the homepage and the ambient motion can be paused',async({page})=>{
    await page.goto('/');
    await expect(page.locator('#entry-intro')).toBeVisible();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',true);
    await expect(page.locator('#entry-intro')).not.toBeVisible({timeout:5000});
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    const shoe=page.locator('.entry-shoe');
    const transform=()=>shoe.evaluate(el=>getComputedStyle(el).transform);
    const moving=await transform();
    await expect.poll(transform).not.toBe(moving);
    await page.getByRole('button',{name:'Pause homepage animation'}).click();
    const still=await transform();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    expect(await transform()).toBe(still);
    await expect(page.getByRole('button',{name:'Play homepage animation'})).toHaveAttribute('aria-pressed','true');
  });

  test('The intro can be skipped with the keyboard and respects a changed motion preference',async({page})=>{
    await page.goto('/');
    await expect(page.locator('#entry-intro')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('#intro-skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#entry-intro')).not.toBeVisible();
    await expect(page.locator('#entry-title')).toBeFocused();
    await page.reload();
    await expect(page.locator('#entry-intro')).toBeVisible();
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.locator('#entry-intro')).not.toBeVisible();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    await expect(page.locator('#entry-motion')).toBeDisabled();
  });
});
