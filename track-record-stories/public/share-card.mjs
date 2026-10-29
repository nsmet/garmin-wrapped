import {renderStill} from './dot-render.mjs';

export const shareColorways=[
 {id:'original',label:'Original',color:'#0B1222'},
 {id:'paper',label:'Paper',color:'#f3f0e8',palette:['#f3f0e8','#101519','#1743ed','#ff7038']},
 {id:'cobalt',label:'Cobalt',color:'#1743ed',palette:['#1743ed','#fffaf0','#f2e630','#f23897']},
 {id:'orange',label:'Orange',color:'#ff7038',palette:['#ff7038','#101519','#1743ed','#f2e630']},
 {id:'mint',label:'Mint',color:'#8de4c4',palette:['#8de4c4','#101519','#1743ed','#f23897']}
];

// A portrait card (1080 × 1920 for exports) from a card spec built from sanitized display fields.
// Colourways recolour type and dots by role; data highlights keep their contrast with the rest.
export function renderShareCard(c,w,h,{spec,colorway='original'}){
 return renderStill(c,w,h,spec,{palette:shareColorways.find(p=>p.id===colorway)?.palette||null});
}
