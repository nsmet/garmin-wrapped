import {renderPoster} from './poster.mjs';

export const shareColorways=[
 {id:'original',label:'Original',color:'#101519'},
 {id:'paper',label:'Paper',color:'#f3f0e8',palette:['#f3f0e8','#101519','#1743ed','#ff7038']},
 {id:'cobalt',label:'Cobalt',color:'#1743ed',palette:['#1743ed','#fffaf0','#f2e630','#f23897']},
 {id:'orange',label:'Orange',color:'#ff7038',palette:['#ff7038','#101519','#1743ed','#f2e630']},
 {id:'mint',label:'Mint',color:'#8de4c4',palette:['#8de4c4','#101519','#1743ed','#f23897']}
];

export function renderShareCard(c,w,h,{story,colorway='original',assets,year,notice}){
 return renderPoster(c,w,h,{from:story,time:1.4,assets,chrome:'share',year,notice,palette:shareColorways.find(p=>p.id===colorway)?.palette});
}
