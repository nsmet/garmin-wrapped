import {test,expect} from '@playwright/test';

// Hours cards: a sport-specific outline per sport, filled with one dot per stated unit.
test('Every sport hours card keeps the verified measurements and draws one dot per stated unit',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {buildRecap}=await import('/metrics.mjs');
  const registry=(await import('/sport-registry.mjs')).default;
  const {displayFields}=await import('/story-model.mjs');
  const {cardSpec}=await import('/dot-spec.mjs');
  const {build,fracDots,shapeCapacity}=await import('/dot-engine.mjs');
  const {renderStill}=await import('/dot-render.mjs');
  await document.fonts.load('800 20px Sora');
  const activities=[...registry.sports.map(s=>s.aliases_to_validate[0]),'unmapped_sport'].map((type,i)=>({id:`duration-fixture-${i}`,utc:Date.UTC(2025,2,10),type,parentId:null,duration:10890,distance:5000}));
  const plan=buildRecap({year:2025,timeZone:'UTC',activities,indexComplete:true,now:new Date('2026-01-01T12:00:00Z')});
  const output=[];
  for(const s of plan.stories.filter(s=>s.chart?.kind==='duration').map(displayFields)){
   const spec=cardSpec(s,{}),b=build(spec),hours=Number(s.value),canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;
   const labels=[],c=canvas.getContext('2d'),fill=c.fillText.bind(c);c.fillText=(value,...args)=>{labels.push(String(value));fill(value,...args);};
   renderStill(c,360,640,spec);
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',c.getImageData(0,0,360,640).data))).join(',');
   output.push({id:s.id,layout:spec.L,shape:spec.p.k,hash:digest,labels,expected:[s.value,...s.chart.items.map(i=>i.value)],dots:b.pts.filter(p=>p.dat).length,want:fracDots(hours,spec.p.unit).total,cap:shapeCapacity('hours',spec.p.k)});
  }
  return output;
 });
 expect(result).toHaveLength(19);
 expect(new Set(result.map(s=>s.hash)).size).toBe(19);
 for(const s of result){
  expect(s.layout,s.id).toBe('shape');expect(s.shape,s.id).toBeTruthy();expect(s.dots,s.id).toBe(s.want);expect(s.dots,s.id).toBeLessThanOrEqual(s.cap);
  for(const value of s.expected)expect(s.labels,s.id+' keeps '+value).toContain(value);
 }
});

test('Small and very large hours fit the card in portrait, tablet and wide layouts',async({page})=>{
 await page.goto('/');
 const clipped=await page.evaluate(async()=>{
  const {cardSpec}=await import('/dot-spec.mjs');const {cardFrame,drawText}=await import('/dot-card.mjs');const {build}=await import('/dot-engine.mjs');
  const registry=(await import('/sport-registry.mjs')).default;
  await document.fonts.load('800 20px Sora');const clipped=[];
  for(const [w,h,bounds] of [[320,568,{top:110,bottom:470,left:9,right:311}],[390,844,{top:120,bottom:700,left:9,right:381}],[768,1024,{top:120,bottom:880,left:15,right:753}],[1440,900,{top:130,bottom:740,left:65,right:1375}],[844,390,{top:90,bottom:300,left:38,right:806}]]){
   for(const sport of [...registry.sports.map(s=>s.key),'other']){
    for(const value of ['0.1','99,999.9']){
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d'),fill=c.fillText.bind(c);
     c.fillText=(text,x,y,...args)=>{
      const m=c.measureText(String(text)),t=c.getTransform(),shift=c.textAlign==='center'?m.width/2:c.textAlign==='right'?m.width:0;
      const a=t.transformPoint({x:x-shift,y:y-m.actualBoundingBoxAscent}),b=t.transformPoint({x:x-shift+m.width,y:y+m.actualBoundingBoxDescent});
      if(a.x<-1||b.x>w+1||a.y<bounds.top-6||b.y>bounds.bottom+6)clipped.push({sport,w,h,value,text});
      fill(text,x,y,...args);
     };
     const story={id:sport+'-hours',title:['HOURS ON THE','TRAINING FLOOR.'],value,unit:'RECORDED HOURS · so far',caption:'x\ny',chart:{kind:'duration',items:[{label:'RECORDED MINUTES',value:'5,999,994'},{label:'AVG TIME / ACTIVITY',value:'999h 59m 59s'}]}};
     const spec=cardSpec(story,{});if(build(spec).pts.filter(p=>p.dat).length>400)clipped.push({sport,value,tooManyDots:true});
     drawText(c,cardFrame(w,h,{mode:'live',bounds,spec,ctx:c}),spec);
    }
   }
  }
  return clipped;
 });
 expect(clipped).toEqual([]);
});
