import {renderStill} from './dot-render.mjs';

// Colourways in the dot design: bg, ink, accent, second accent (see dot-card.mjs colorRoles).
export const shareColorways=[
 {id:'original',label:'Original',color:'#0B1222'},
 {id:'paper',label:'Paper',color:'#F3EFE6',palette:['#F3EFE6','#0B1222','#F2780D','#1F5FE0']},
 {id:'cobalt',label:'Cobalt',color:'#1C34D9',palette:['#1C34D9','#FFFFFF','#FFE14D','#FF9BC8']},
 {id:'ember',label:'Ember',color:'#FF5A1F',palette:['#FF5A1F','#0B1222','#FFFFFF','#FFE14D']}
];

// A portrait card (1080 × 1920 for exports) from a card spec built from sanitized display fields.
// Colourways recolour type and dots by role; data highlights keep their contrast with the rest.
export function renderShareCard(c,w,h,{spec,colorway='original'}){
 return renderStill(c,w,h,spec,{palette:shareColorways.find(p=>p.id===colorway)?.palette||null});
}
