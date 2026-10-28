// One composition grid for live stories, design templates and portrait exports.
export function posterLayout(w,h,{bounds,chrome=false}={}){
 const wide=w>=700&&w/h>=1.05;
 const pad=bounds?.pad??(wide?Math.min(88,w*.045):w*.0564);
 const top=bounds?.top??(chrome?h*.17:Math.max(136,h*.17));
 const bottom=bounds?.bottom??h*.82;
 const content={x:pad,y:top,w:w-pad*2,h:Math.max(120,bottom-top)};
 const unit=Math.min(wide?1.7:1.45,wide?Math.max(.7,Math.min(w/1120,h/740)):w/390);
 const gap=wide?content.w*.055:16*unit;
 const text=wide?{...content,y:top+content.h*.13,w:content.w*.43,h:content.h*.74}:{...content,h:content.h*.49};
 const art=wide?{x:pad+content.w*.49,y:top,w:w-(pad+content.w*.49),h:content.h}:{x:0,y:top+content.h*.42,w,h:content.h*.58};
 return {wide,pad,content,text,art,gap,unit};
}
