import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,access} from 'node:fs/promises';
import {layerDesigns} from '../public/layered-art.mjs';

// Source PNGs are kept independently editable; the browser uses optimized
// alpha WebPs from the corresponding separate layers.
test('Every artwork layer has an RGBA PNG source and a browser delivery image',async()=>{
 const names=new Set(Object.values(layerDesigns).flatMap(d=>[d.ground,d.extra,...d.subjects].filter(Boolean)));
 for(const name of names){
  const file=name==='shoe'?'shoe-blue':name;
  const png=await readFile(new URL(`../source-assets/layers/${file}.png`,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${file} is a PNG`);
  assert.equal(png[25],6,`${file} has an alpha channel`);
  await access(new URL(`../public/assets/layers/${file}.webp`,import.meta.url));
 }
});
