import test from 'node:test';
import assert from 'node:assert/strict';
import {selectStories,canShare} from '../public/story-model.mjs';
import {dataset} from '../public/sample-data.mjs';
test('The fictional fixture uses the production planner, including the year overview',()=>{assert.equal(selectStories(dataset).length,dataset.stories.length);assert.ok(selectStories(dataset).some(s=>s.id==='year-summary'));assert.ok(selectStories(dataset).some(s=>s.id==='year-calendar'));assert.ok(!selectStories(dataset).some(s=>s.template==='elevation'));});
test('Missing evidence and unverified values cannot create chapters',()=>{const stories=dataset.stories.map(s=>({...s,evidence:[]}));assert.equal(selectStories({...dataset,stories}).length,0);assert.equal(selectStories({...dataset,stories:dataset.stories.map(s=>({...s,status:'unverified'}))}).length,0);});
test('Fictional evidence cannot be used in production mode',()=>{assert.equal(selectStories({...dataset,exampleOnly:false}).length,0);});
test('Wellness chapters require inclusion and sharing rules remain independent',()=>{const withoutHealth=selectStories({...dataset,includeHealth:false});assert.ok(withoutHealth.every(s=>!s.health));assert.equal(withoutHealth.length,dataset.stories.filter(s=>!s.health).length);const sleep=dataset.stories.find(s=>s.id==='sleep-median');assert.equal(canShare(sleep,{exampleOnly:false}),false);assert.equal(canShare({...sleep,sharePolicy:'private_only'},{exampleOnly:false}),false);assert.equal(canShare({...sleep,sanitized:true,sharePolicy:'allow_sanitized'},{exampleOnly:false}),false);});
test('Duplicate story identities are omitted',()=>{assert.equal(selectStories({...dataset,stories:[...dataset.stories,dataset.stories[0]]}).length,dataset.stories.length);});
import {readFileSync,existsSync} from 'node:fs';
import {makeLibrary,extensions} from '../public/story-library.mjs';
import {designs,requiredAssets,assetFiles} from '../public/visual-system.mjs';
const catalog=JSON.parse(readFileSync(new URL('../public/story-catalog.json',import.meta.url))),library=[...makeLibrary(catalog),...extensions];
test('All 176 candidates and eight extensions have original visual assets',()=>{assert.equal(catalog.stories.length,176);assert.equal(library.length,184);assert.equal(new Set(library.map(s=>s.id)).size,184);for(const s of library){assert.ok(designs[s.template],s.id);for(const key of requiredAssets(s))assert.ok(existsSync(new URL('../public/'+assetFiles[key],import.meta.url)));}});
test('Library concepts never become verified recap claims',()=>{assert.equal(selectStories({...dataset,stories:library.map(s=>({...s,status:'verified',evidence:['real://record']}))}).length,0);assert.ok(library.every(s=>s.value==='—'));});
import {renderPoster} from '../public/poster.mjs';
import {recapSequence} from '../public/recap-sequence.mjs';
test('Every recap and library template renders finite geometry at mobile and desktop sizes',()=>{
 const c=new Proxy({measureText:s=>({width:s.length*30}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),String(k));},set:(o,k,v)=>{o[k]=v;return true;}});
 const all=[...recapSequence(dataset),...library];for(const [w,h] of [[320,620],[390,844],[1280,800]])for(let i=0;i<all.length;i++){renderPoster(c,w,h,{from:all[i],chrome:true});renderPoster(c,w,h,{from:all[i],to:all[(i+1)%all.length],progress:.5,time:8});}
});
