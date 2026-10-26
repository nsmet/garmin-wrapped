import {test,expect} from '@playwright/test';

test.use({reducedMotion:'no-preference'});
const frame=page=>page.locator('#poster').evaluate(c=>c.toDataURL());
const frames=page=>page.evaluate(()=>new Promise(resolve=>{let n=0;const next=()=>++n===12?resolve():requestAnimationFrame(next);requestAnimationFrame(next);}));

test('Ambient layers move, pause holds the exact frame, and paused navigation stays still',async({page})=>{
 await page.goto('/');await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
 const moving=await frame(page);await expect.poll(()=>frame(page)).not.toBe(moving);
 await page.locator('#motion').click();await expect(page.locator('#motion')).toHaveText('Play');
 const paused=await frame(page);await frames(page);expect(await frame(page)).toBe(paused);
 await page.keyboard.press('ArrowRight');await expect(page.locator('#chapter-name')).toHaveText('YEAR SUMMARY');await expect(page.locator('#story')).not.toHaveClass(/transitioning/);
 const still=await frame(page);await frames(page);expect(await frame(page)).toBe(still);
});

test('Switching to reduced motion completes an active transition and stops the renderer',async({page})=>{
 await page.goto('/');await page.locator('#demo-start').click();await expect(page.locator('#story')).toBeVisible();
 await page.keyboard.press('ArrowRight');await expect(page.locator('#story')).toHaveClass(/transitioning/);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#chapter-name')).toHaveText('YEAR SUMMARY');
 await expect(page.locator('#story')).not.toHaveClass(/transitioning/);await expect(page.locator('#motion')).toHaveText('Still');await expect(page.locator('#motion')).toBeDisabled();
 const still=await frame(page);await frames(page);expect(await frame(page)).toBe(still);
});
