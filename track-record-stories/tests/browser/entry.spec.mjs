import {test,expect} from '@playwright/test';

test('The compact homepage fits phone, tablet and desktop widths and keeps details optional',async({page})=>{
  await page.goto('/');
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const title=page.locator('#entry-title');
    await expect(title).toBeVisible();
    expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await expect(page.getByRole('button',{name:'Build my Garmin recap'})).toBeInViewport();
    const formBottom=await page.locator('.connect-panel').evaluate(el=>el.getBoundingClientRect().bottom);
    const headlineTop=await title.evaluate(el=>el.getBoundingClientRect().top);
    expect(headlineTop).toBeGreaterThanOrEqual(formBottom);
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
    await page.addInitScript(()=>{
      window.entryHandoff=null;
      new MutationObserver(()=>{
        if(window.entryHandoff||!document.documentElement.classList.contains('entry-intro-art-settled'))return;
        window.entryHandoff={
          foregroundArtwork:document.querySelectorAll('.intro-shared-art').length,
          backgroundVisibility:getComputedStyle(document.querySelector('.entry-poster .entry-art')).visibility,
          headlineOpacity:Number(getComputedStyle(document.querySelector('#entry-title')).opacity),
          formOpacity:Number(getComputedStyle(document.querySelector('.connect-panel')).opacity),
          introCopyOpacity:Number(getComputedStyle(document.querySelector('.intro-second')).opacity),
        };
      }).observe(document,{subtree:true,attributes:true,attributeFilter:['class']});
    });
    await page.goto('/');
    await expect(page.locator('#entry-intro')).toBeVisible();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',true);
    await expect(page.locator('.intro-shared-art .entry-shoe')).toBeAttached();
    await expect(page.locator('.intro-shared-art .entry-track')).toBeAttached();
    await expect(page.locator('#intro-year')).toHaveText(String(new Date().getFullYear()));
    await expect.poll(()=>page.locator('.intro-second').evaluate(el=>Number(getComputedStyle(el).opacity)),{timeout:5000}).toBeGreaterThan(.9);
    await expect(page.locator('#entry-intro')).not.toBeVisible({timeout:8000});
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    expect(await page.evaluate(()=>window.entryHandoff)).toEqual({foregroundArtwork:0,backgroundVisibility:'visible',headlineOpacity:0,formOpacity:0,introCopyOpacity:0});
    await expect(page.locator('.intro-shared-art')).toHaveCount(0);
    await expect(page.locator('#api-key')).toBeInViewport();
    await expect(page.locator('#api-key')).toBeEditable();
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

  test('Slow artwork loads stay hidden, then enter with a fade',async({page})=>{
    let release;
    const ready=new Promise(resolve=>{release=resolve;});
    await page.route('**/assets/shoe-blue.webp',async route=>{await ready;await route.continue();});
    try{
      await page.goto('/',{waitUntil:'domcontentloaded'});
      await expect(page.locator('.intro-shared-art')).toBeAttached();
      await expect(page.locator('#entry-intro')).not.toHaveClass(/intro-playing/);
      await expect(page.locator('.intro-orbit')).toHaveCSS('opacity','0');
      await expect(page.locator('.intro-shared-art')).toHaveCSS('opacity','0');
      await expect(page.locator('.entry-poster .entry-art')).toHaveCSS('visibility','hidden');
      release();
      await expect(page.locator('#entry-intro')).toHaveClass(/intro-playing/);
      await expect.poll(()=>page.locator('.intro-shared-art').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.9);
      await page.keyboard.press('Escape');
      await expect(page.locator('#api-key')).toBeEditable();
    }finally{release();}
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
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.locator('#entry-intro')).not.toBeVisible();
    await expect(page.locator('#onboarding')).toHaveJSProperty('inert',false);
    await expect(page.locator('#entry-motion')).toBeDisabled();
  });
});
