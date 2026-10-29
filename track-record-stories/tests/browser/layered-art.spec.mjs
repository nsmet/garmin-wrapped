import {test,expect} from '@playwright/test';

test('The photographic layers load as transparent images for every sport',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {requiredAssets,assetFiles}=await import('/visual-system.mjs');
  const names=[...new Set(registry.sports.flatMap(s=>requiredAssets({id:s.key+'-sessions',template:s.key})))],issues=[];
  if(!requiredAssets({template:'running',chart:{kind:'duration'}}).includes('shoe'))issues.push('running duration is missing its sport layers');
  if(requiredAssets({template:'heart',chart:{kind:'health-months'}}).length)issues.push('health charts must not load sport layers');
  for(const name of names){
   const src=assetFiles[name];if(!src?.endsWith('.webp')){issues.push(`${name}: missing optimized layer`);continue;}
   const img=new Image();img.src=src;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,64,64);
   const pixels=ctx.getImageData(0,0,64,64).data;let transparent=0;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]<10)transparent++;
   if(transparent<64)issues.push(`${name}: no meaningful transparent area`);
  }
  return {count:names.length,issues};
 });
 expect(result.count).toBeGreaterThan(20);expect(result.issues).toEqual([]);
});

test('Running layers move independently while grounded strength layers stay still',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {requiredAssets,assetFiles,palettes}=await import('/visual-system.mjs');
  const {drawLayeredArt}=await import('/layered-art.mjs');const {posterLayout}=await import('/poster-layout.mjs');
  const load=async s=>Object.fromEntries(await Promise.all(requiredAssets(s).map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  const track={id:'running-sessions',template:'running'},strength={id:'strength-sessions',template:'strength'};
  const positions=async(story,time)=>{
   const assets=await load(story),canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx),out={};
   ctx.drawImage=(img,...args)=>{const name=Object.keys(assets).find(key=>assets[key]===img),t=ctx.getTransform();out[name]=[t.e,t.f];return draw(img,...args);};
   drawLayeredArt(ctx,390,844,story,time,assets,posterLayout(390,844),palettes[story.template]);return out;
  };
  return {run0:await positions(track,0),run5:await positions(track,5),strength0:await positions(strength,0),strength5:await positions(strength,5)};
 });
 expect(result.run0.shoe).not.toEqual(result.run5.shoe);
 expect(result.run0['running-track']).not.toEqual(result.run5['running-track']);
 expect(result.strength0.dumbbell).toEqual(result.strength5.dumbbell);
 expect(result.strength0['gym-floor']).toEqual(result.strength5['gym-floor']);
});

test('Running hero artwork stays prominent on phone, desktop and share layouts',async({page})=>{
 await page.goto('/');
 const placements=await page.evaluate(async()=>{
  const {requiredAssets,assetFiles,palettes}=await import('/visual-system.mjs');
  const {drawLayeredArt}=await import('/layered-art.mjs');const {posterLayout}=await import('/poster-layout.mjs');
  const story={id:'running-sessions',template:'running'};
  const assets=Object.fromEntries(await Promise.all(requiredAssets(story).map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  return [[320,568,false],[390,844,false],[1440,900,false],[390,390*16/9,true]].map(([w,h,share])=>{
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),found={};
   const layout=posterLayout(w,h,share?{bounds:{top:h*.115,bottom:h*.85},chrome:'share'}:{});
   c.drawImage=(img,x,y,iw,ih)=>{
    const name=Object.keys(assets).find(key=>assets[key]===img),t=c.getTransform();
    const points=[[x,y],[x+iw,y],[x,y+ih],[x+iw,y+ih]].map(([px,py])=>t.transformPoint({x:px,y:py}));
    const left=Math.max(0,layout.art.x,Math.min(...points.map(p=>p.x))),right=Math.min(w,layout.art.x+layout.art.w,Math.max(...points.map(p=>p.x)));
    found[name]=Math.max(0,right-left)/w;return draw(img,x,y,iw,ih);
   };
   drawLayeredArt(c,w,h,story,0,assets,layout,palettes.running);
   return {w,share,...found};
  });
 });
 for(const result of placements){
  expect(result.shoe,JSON.stringify(result)).toBeGreaterThan(result.w>=700?.28:.6);
  expect(result['running-track'],JSON.stringify(result)).toBeGreaterThan(result.w>=700?.3:.85);
 }
});

test('Every other sport has a prominent photographic layer on phone and desktop',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {requiredAssets,assetFiles,palettes}=await import('/visual-system.mjs');
  const {drawLayeredArt,layerDesigns}=await import('/layered-art.mjs');const {posterLayout}=await import('/poster-layout.mjs');
  const stories=registry.sports.filter(s=>s.key!=='running').map(s=>({id:s.key+'-sessions',template:s.key}));
  const names=[...new Set(stories.flatMap(requiredAssets))];
  const assets=Object.fromEntries(await Promise.all(names.map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  return stories.flatMap(story=>[[390,844],[1440,900]].map(([w,h])=>{
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const c=canvas.getContext('2d'),draw=c.drawImage.bind(c),layout=posterLayout(w,h),subjects=layerDesigns[story.template].subjects,visible=[];
   c.drawImage=(img,x,y,iw,ih)=>{
    const name=subjects.find(key=>assets[key]===img);
    if(name){const t=c.getTransform(),points=[[x,y],[x+iw,y],[x,y+ih],[x+iw,y+ih]].map(([px,py])=>t.transformPoint({x:px,y:py}));
     const left=Math.max(0,layout.art.x,Math.min(...points.map(p=>p.x))),right=Math.min(w,layout.art.x+layout.art.w,Math.max(...points.map(p=>p.x)));
     visible.push(Math.max(0,right-left)/w);
    }
    return draw(img,x,y,iw,ih);
   };
   drawLayeredArt(c,w,h,story,0,assets,layout,palettes[story.template]);
   return {sport:story.template,w,largest:Math.max(0,...visible)};
  }));
 });
 for(const result of results)expect(result.largest,JSON.stringify(result)).toBeGreaterThan(result.w>=700?.2:.45);
});

test('Captions remain legible over enlarged artwork in every share colorway',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {requiredAssets,assetFiles,palettes}=await import('/visual-system.mjs');
  const {drawLayeredArt}=await import('/layered-art.mjs');const {posterLayout}=await import('/poster-layout.mjs');const {shareColorways}=await import('/share-card.mjs');
  const sports=registry.sports.filter(s=>s.key!=='running').flatMap(s=>[{id:s.key+'-sessions',template:s.key},{id:s.key+'-hours',template:s.key,chart:{kind:'duration'}}]);
  const other=['cover','longest','active','mix','morning','recovery','sleep','elevation','energy','nutrition','hydration','calendar','miniwatt','finale','heart','hrv'].map(template=>({id:template+'-example',template}));
  const stories=[...sports,...other];
  const names=[...new Set(stories.flatMap(requiredAssets))];
  const assets=Object.fromEntries(await Promise.all(names.map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return stories.flatMap(story=>shareColorways.map(colorway=>{
   const w=390,h=693,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d'),p=colorway.palette||palettes[story.template];
   c.fillStyle=p[0];c.fillRect(0,0,w,h);drawLayeredArt(c,w,h,story,1.4,assets,posterLayout(w,h,{bounds:{top:h*.115,bottom:h*.85},chrome:'share'}),p,story.chart?.22:1,1);
   const ink=luminance([1,3,5].map(i=>parseInt(p[1].slice(i,i+2),16))),pixels=c.getImageData(0,0,w,h).data;let min=Infinity;
   for(let y=Math.floor(h*.88);y<Math.ceil(h*.925);y+=3)for(let x=Math.floor(w*.056);x<Math.floor(w*.94);x+=3){const i=(y*w+x)*4,bg=luminance([pixels[i],pixels[i+1],pixels[i+2]]);min=Math.min(min,(Math.max(ink,bg)+.05)/(Math.min(ink,bg)+.05));}
   return {template:story.template,card:story.chart?'hours':'hero',colorway:colorway.id,contrast:min};
  }));
 });
 for(const result of results)expect(result.contrast,JSON.stringify(result)).toBeGreaterThanOrEqual(4.5);
});

test('Sport chart labels stay readable over the enlarged mobile artwork',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const registry=(await import('/sport-registry.mjs')).default;
  const {requiredAssets,assetFiles}=await import('/visual-system.mjs');const {renderPoster}=await import('/poster.mjs');
  await document.fonts.load('400 30px Anton');await document.fonts.load('600 14px "Space Grotesk"');
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const stories=registry.sports.flatMap(s=>[
   {id:s.key+'-hours',template:s.key,title:['HOURS IN','YOUR YEAR.'],value:'42.4',unit:'RECORDED HOURS',caption:'Every effort counts.\nFictional example.',chart:{kind:'duration',items:[{label:'RECORDED MINUTES',value:'2,544'},{label:'AVG TIME / ACTIVITY',value:'48m 30s'}]}},
   {id:s.key+'-longest',template:s.key,title:['YOUR LONGEST','EFFORT.'],value:'18.6',unit:'KM · LONGEST RECORDED',caption:'Every effort counts.\nFictional example.',chart:{kind:'record',items:[{label:'01',value:18.6},{label:'02',value:12.3},{label:'03',value:9.1}]}},
   {id:s.key+'-weekday',template:s.key,title:['YOUR BIGGEST','DAY.'],value:'SATURDAY',unit:'MOST RECORDED DAY',caption:'Every effort counts.\nFictional example.',chart:{kind:'weekdays',items:days.map((label,i)=>({label,value:i+1}))}}
  ]);
  const names=[...new Set(stories.flatMap(requiredAssets))];
  const assets=Object.fromEntries(await Promise.all(names.map(async name=>{const img=new Image();img.src=assetFiles[name];await img.decode();return [name,img];})));
  const lum=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),issues=[];let seen=0;
  for(const story of stories){
   const w=390,h=693,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d'),fill=c.fillText.bind(c);
   const expected=story.chart.kind==='duration'?['2,544','RECORDED MINUTES','48m 30s','AVG TIME / ACTIVITY']:story.chart.kind==='record'?['01','02','03','18.6 km','12.3 km','9.1 km']:[...days.map(day=>day.slice(0,3).toUpperCase()),...days.map((_,i)=>String(i+1))];
   c.fillText=(value,x,y,...args)=>{
    const text=String(value);
    if(expected.includes(text)&&/^#[0-9a-f]{6}$/i.test(c.fillStyle)){
     const m=c.measureText(text),t=c.getTransform(),p=t.transformPoint({x,y}),shift=c.textAlign==='center'?m.width/2:c.textAlign==='right'?m.width:0;
     const left=Math.max(0,Math.floor(p.x-shift*t.a)),right=Math.min(w,Math.ceil(p.x+(m.width-shift)*t.a)),top=Math.max(0,Math.floor(p.y-m.actualBoundingBoxAscent*t.d)),bottom=Math.min(h,Math.ceil(p.y+m.actualBoundingBoxDescent*t.d));
     if(right>left&&bottom>top){
      seen++;
      const fg=lum([1,3,5].map(i=>parseInt(c.fillStyle.slice(i,i+2),16))),pixels=c.getImageData(left,top,right-left,bottom-top).data,ratios=[];
      for(let i=0;i<pixels.length;i+=36){const bg=lum([pixels[i],pixels[i+1],pixels[i+2]]);ratios.push((Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05));}
      ratios.sort((a,b)=>a-b);const contrast=ratios[Math.floor(ratios.length*.1)],minimum=bottom-top>=18?3:4.5;
      if(contrast<minimum)issues.push({sport:story.template,kind:story.chart.kind,text,contrast,minimum});
     }
    }
    return fill(text,x,y,...args);
   };
   renderPoster(c,w,h,{from:story,time:1.4,assets,chrome:'share',year:2025,notice:'Fictional example'});
  }
  return {issues,seen};
 });
 expect(result.seen).toBe(432);expect(result.issues).toEqual([]);
});
