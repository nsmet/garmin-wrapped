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
 // The artwork bleeds past the grid; the measured text area remains protected.
 const art=wide?{x:pad+content.w*.45,y:top-content.h*.06,w:content.w*.61,h:h-top+content.h*.06}:{x:-w*.06,y:top+content.h*.49,w:w*1.12,h:h-top-content.h*.49};
 return {wide,pad,content,text,art,gap,unit};
}
