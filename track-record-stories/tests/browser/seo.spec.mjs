import {test,expect} from '@playwright/test';

const origin='https://garmin-wrapped.miniwatt.app';

test('Crawlers receive the homepage content, canonical metadata and public discovery files',async({request})=>{
  const response=await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(response.headers()['x-robots-tag']||'').not.toMatch(/noindex/i);
  const html=await response.text();
  expect(html).toContain('<link rel="canonical" href="'+origin+'/">');
  expect(html).toContain('Your Garmin Connect Year in Review | MINI WATT</title>');
  expect(html).not.toMatch(/<meta[^>]+(?:name="robots"[^>]+content="[^"]*noindex|content="[^"]*noindex[^>]+name="robots")/i);
  // Search and share crawlers need these in the HTTP response before scripts run.
  expect(html).toContain('What is Garmin Wrapped?');
  expect(html).toContain('Can I see my Garmin year in review before December?');
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const application=schema['@graph'].find(entity=>entity['@type']==='WebApplication');
  expect(application.url).toBe(origin+'/');
  const image=await request.get(new URL(application.image).pathname);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/jpeg');
  const robots=await request.get('/robots.txt'),sitemap=await request.get('/sitemap.xml');
  expect(robots.status()).toBe(200);expect(sitemap.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: '+origin+'/sitemap.xml');
  expect(await robots.text()).not.toMatch(/^Disallow:\s*\/\s*$/m);
  expect(await sitemap.text()).toContain('<loc>'+origin+'/</loc>');
});

test.describe('Without JavaScript',()=>{
  test.use({javaScriptEnabled:false});
  test('The homepage stays readable and the native FAQ opens on desktop and small screens',async({page})=>{
    await page.goto('/');
    const main=page.getByRole('main',{name:'Your Garmin year, wrapped'});
    await expect(main.getByRole('heading',{level:1})).toBeVisible();
    await expect(main.locator('.noscript')).toBeVisible();
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.locator('.entry-about > summary').click();
    const question=page.locator('.recap-faq details').first();
    await question.locator('summary').click();
    await expect(question.locator('p')).toBeVisible();
    await expect(question.locator('p')).toContainText('independent MINI WATT project');
  });
});
