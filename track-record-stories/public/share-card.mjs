import {renderStill} from './dot-render.mjs';

// Colourways in the dot design: bg, ink, accent, second accent (see dot-card.mjs colorRoles).
export const shareColorways=[
 {id:'original',label:'Original',color:'#0B1222'},
 {id:'paper',label:'Paper',color:'#F3EFE6',palette:['#F3EFE6','#0B1222','#F2780D','#1F5FE0']},
 {id:'cobalt',label:'Cobalt',color:'#1C34D9',palette:['#1C34D9','#FFFFFF','#FFE14D','#FF9BC8']},
 {id:'ember',label:'Ember',color:'#FF5A1F',palette:['#FF5A1F','#0B1222','#FFFFFF','#FFE14D']}
];

// The one title line a share card carries at its top.
export const shareTitle=year=>`Garmin Wrapped – ${year}, a miniwatt.app ⚡️ product`;

// A portrait card (1080 × 1920 for exports) from a card spec built from sanitized display fields.
// Colourways recolour type and dots by role; data highlights keep their contrast with the rest.
// Share cards are quieter than the story cards: one title line, no caption, the dot key and the
// data notice in a compact footer, and flat dots without glow (the glow smears on light colourways).
export function shareSpec(spec,year){
 const title=shareTitle(year??new Date().getFullYear());
 // the finale has no top bar: its brand line at the bottom carries the same title
 return {...spec,shareCard:true,top:spec.bare?'':title,...(spec.bare&&spec.brand?{brand:title}:{})};
}
export const sharePalette=colorway=>shareColorways.find(p=>p.id===colorway)?.palette||null;
export function renderShareCard(c,w,h,{spec,colorway='original',year}){
 return renderStill(c,w,h,shareSpec(spec,year),{palette:sharePalette(colorway),flat:true});
}
// The same card as a looping MP4 (share-video.mjs, loaded only when a video is asked for).
export async function renderShareCardVideo({spec,colorway='original',year,onProgress,current}){
 const {renderShareVideo}=await import('./share-video.mjs');
 return renderShareVideo(shareSpec(spec,year),{palette:sharePalette(colorway),onProgress,current});
}
