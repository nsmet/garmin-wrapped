import {test,expect} from '@playwright/test';

test('Every sport has a distinct hours composition even with identical colors and figures',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {buildRecap}=await import('/metrics.mjs');
  const registry=(await import('/sport-registry.mjs')).default;
  const {displayFields}=await import('/story-model.mjs');
  const {drawDurationPoster}=await import('/duration-posters.mjs');
  await document.fonts.ready;
  const activities=[...registry.sports.map(s=>s.aliases_to_validate[0]),'unmapped_sport'].map((type,i)=>({id:`duration-fixture-${i}`,utc:Date.UTC(2025,2,10),type,parentId:null,duration:10890,distance:5000}));
  const plan=buildRecap({year:2025,timeZone:'UTC',activities,indexComplete:true,now:new Date('2026-01-01T12:00:00Z')});
  const stories=plan.stories.filter(s=>s.chart?.kind==='duration').map(displayFields),p=['#f3f0e8','#101519','#1743ed','#ff7038'];
  const output=[];
  for(const s of stories){
   const canvas=document.createElement('canvas');canvas.width=390;canvas.height=390;const c=canvas.getContext('2d'),labels=[];
   const fill=c.fillText.bind(c);c.fillText=(value,...args)=>{labels.push(String(value));fill(value,...args);};
   c.fillStyle=p[0];c.fillRect(0,0,390,390);
   drawDurationPoster(c,{x:10,y:10,w:370,h:370},s,p,0);
   const pixels=new Uint8Array(await crypto.subtle.digest('SHA-256',c.getImageData(0,0,390,390).data));
   const firstLabels=[...labels];c.fillStyle=p[0];c.fillRect(0,0,390,390);drawDurationPoster(c,{x:10,y:10,w:370,h:370},s,p,5);
   const later=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',c.getImageData(0,0,390,390).data))).join(',');
   output.push({id:s.id,hash:Array.from(pixels).join(','),later,labels:firstLabels,expected:[s.value,'RECORDED HOURS',...s.chart.items.flatMap(i=>[i.value,i.label])]});
  }
  return output;
 });
 expect(result).toHaveLength(19);
 expect(new Set(result.map(s=>s.hash)).size).toBe(19);
 for(const s of result){expect(s.labels.sort(),s.id+' keeps the verified measurements').toEqual(s.expected.sort());expect(s.later,s.id+' keeps its own ambient motion').not.toBe(s.hash);}
});

test('All sport hours fit small and large measurements inside portrait and landscape compositions',async({page})=>{
 await page.goto('/');
 const clipped=await page.evaluate(async()=>{
  const {drawDurationPoster}=await import('/duration-posters.mjs');
  const registry=(await import('/sport-registry.mjs')).default;
  await document.fonts.ready;const clipped=[],p=['#f3f0e8','#101519','#1743ed','#ff7038'];
  for(const [w,h] of [[320,300],[390,360],[650,460],[350,130]]){
   for(const sport of [...registry.sports.map(s=>s.key),'other']){
    for(const value of ['0.1','999,999.9']){
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
     const fill=c.fillText.bind(c),bounds={x:10,y:10,w:w-20,h:h-20};
     c.fillText=(text,x,y,...args)=>{
      const m=c.measureText(String(text)),t=c.getTransform(),shift=c.textAlign==='center'?m.width/2:c.textAlign==='right'?m.width:0;
      const a=t.transformPoint({x:x-shift,y:y-m.actualBoundingBoxAscent}),b=t.transformPoint({x:x-shift+m.width,y:y+m.actualBoundingBoxDescent});
      if(a.x<bounds.x-1||b.x>bounds.x+bounds.w+1||a.y<bounds.y-1||b.y>bounds.y+bounds.h+1)clipped.push({sport,w,h,value,text});
      fill(text,x,y,...args);
     };
     const s={id:sport+'-hours',template:sport==='other'?'cardio':sport,value,chart:{kind:'duration',items:[{label:'RECORDED MINUTES',value:'1,234,567'},{label:'AVG TIME / ACTIVITY',value:'999h 59m 59s'}]}};
     drawDurationPoster(c,bounds,s,p,0);
    }
   }
  }
  return clipped;
 });
 expect(clipped).toEqual([]);
});
