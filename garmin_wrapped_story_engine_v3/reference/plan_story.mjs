/**
 * Offline count-based editorial STORY selector only. No API, no visual renderer.
 * It intentionally does NOT compute 176 metrics or validate FIT.
 * Input figures are already validated by the ingestion/metric layer.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const registry=JSON.parse(fs.readFileSync(path.join(here,'../catalog/sport_registry.json'),'utf8'));
const allowed=new Set(registry.sports.map(x=>x.key));
const display=Object.fromEntries(registry.sports.map(x=>[x.key,x.label]));
const pct=(x,y)=> y>0?x/y:0;
const verifiedFact=(id,type,claim,amount,unit,sport='all')=>({id,type,sport,claim,fact:{value:amount,unit},evidence:{source:'prevalidated_activity_index',status:'verified'},sharePolicy:'allow_sanitized'});
export function planStory(input){
 const errors=[];
 const year=input.year;
 if(!Number.isInteger(year)||year<2000||year>2100)errors.push('INVALID_YEAR');
 if(input.indexComplete!==true)errors.push('INCOMPLETE_INDEX');
 const sportCounts=input.sportCounts||{};
 for(const [k,v] of Object.entries(sportCounts))if(!allowed.has(k)||!Number.isInteger(v)||v<0)errors.push('INVALID_SPORT_COUNT:'+k);
 const pairs=Object.entries(sportCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const total=pairs.reduce((sum,[,n])=>sum+n,0);
 if(total!==input.activityCount)errors.push('COUNT_MISMATCH');
 if(!total)errors.push('NO_ACTIVITIES');
 if(input.chosenFavorite && !allowed.has(input.chosenFavorite))errors.push('INVALID_CHOSEN_FAVORITE');
 if(errors.length)return {status:'blocked',errors};
 const [first,second]=pairs;
 const shareFirst=pct(first[1],total);const gap=second?(first[1]-second[1])/total:shareFirst;
 const topTwoShare=second?pct(first[1]+second[1],total):0;
 const balanced=second && pct(second[1],total)>=.2 && topTwoShare>=.65 && gap<=.10;
 const dominant=first[1]>=10 && shareFirst>=.45 && gap>=.15;
 const diversified=pairs.filter(([,n])=>pct(n,total)>=.15).length>=3;
 const identity=balanced?'dual_headline':dominant?'clear_count_leader':diversified?'multisport':'mixed_or_sparse';
 const countLeader=first[0];const explicitFavorite=(input.chosenFavorite&&sportCounts[input.chosenFavorite]>0)?input.chosenFavorite:null;
 const topHours= input.sportDurationHours && Object.entries(input.sportDurationHours).every(([k,v])=>allowed.has(k)&&typeof v==='number'&&Number.isFinite(v)&&v>=0) && input.durationCoverage==='verified'
   ?Object.entries(input.sportDurationHours).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]:null;
 const primary=[];
 if(explicitFavorite)primary.push(explicitFavorite);
 if(balanced){for(const [k] of pairs.slice(0,2))if(!primary.includes(k))primary.push(k)}
 else if(!primary.includes(countLeader))primary.push(countLeader);
 if(identity==='multisport')for(const [k] of pairs.slice(1,3))if(!primary.includes(k))primary.push(k);
 const secondary=pairs.map(([k])=>k).filter(k=>!primary.includes(k));
 const scenes=[];
 const prefix=input.yearComplete===false?'SO FAR, ':' ';
 scenes.push(verifiedFact('open','opening',`Your ${year} in motion${input.yearComplete===false?' — so far':''}`,year,'year'));
 scenes.push(verifiedFact('annual_sessions','cumulative',`${total} recorded activities${input.yearComplete===false?' so far':''}`,total,'sessions'));
 if(pairs.length>=2)scenes.push(verifiedFact('sport_mix','identity',`${pairs.length} kinds of sport in your recorded year`,pairs.length,'sport_families'));
 if(identity==='dual_headline')scenes.push(verifiedFact('dual','identity',`${display[first[0]]} and ${display[second[0]]} shared the spotlight: ${first[1]} and ${second[1]} sessions`,first[1]+second[1],'sessions'));
 else if(identity==='clear_count_leader')scenes.push(verifiedFact('count_leader','identity',`${display[first[0]]} was your most recorded sport`,first[1],'sessions',first[0]));
 else if(identity==='multisport')scenes.push(verifiedFact('variety','identity',`No single sport defined the entire year`,pairs.length,'sport_families'));
 if(explicitFavorite && explicitFavorite!==countLeader)scenes.push(verifiedFact('chosen_favorite','identity',`${display[explicitFavorite]} is your chosen favorite`,sportCounts[explicitFavorite],'sessions',explicitFavorite));
 if(topHours && topHours!==countLeader)scenes.push(verifiedFact('time_leader','contrast',`${display[topHours]} accounted for your most recorded training time`,input.sportDurationHours[topHours],'hours',topHours));
 // Each headline sport receives a chapter. This count-only reference has no fabricated deep data.
 for(const k of primary){scenes.push(verifiedFact(`sport_${k}`,'sport_intro',`${sportCounts[k]} recorded ${display[k]} sessions`,sportCounts[k],'sessions',k));}
 // Secondary sports appear as a concise combined supporting beat.
 if(secondary.length){const mentioned=secondary.slice(0,3).map(k=>`${sportCounts[k]} ${display[k]}`).join(', ');scenes.push(verifiedFact('supporting_sports','surprise',`Your other recorded sports included ${mentioned}`,secondary.reduce((n,k)=>n+sportCounts[k],0),'sessions'));}
 scenes.push(verifiedFact('finale','finale',identity==='dual_headline'?`Your year, in two main rhythms: ${display[first[0]]} and ${display[second[0]]}`:`Your recorded ${year} sports story was uniquely yours`,total,'sessions'));
 return {status:'ok',schemaVersion:'2.0.0',engineVersion:'0.2-count-reference',year,yearComplete:input.yearComplete!==false,identity,countLeader,chosenFavorite:explicitFavorite,mostRecordedHoursSport:topHours,headlineSports:primary,secondarySports:secondary,scenes,notes:['This reference planner only supports count-backed scenes and supplied verified duration ranks. Full metrics and all catalog gates remain future implementation.','Story copy should be localized and copy-reviewed before production.']};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const fp=process.argv[2]||path.join(here,'../examples/audit_2025_counts.json');
 const result=planStory(JSON.parse(fs.readFileSync(fp,'utf8')));
 const out=process.argv[3]||path.join(here,'../examples/example_story_plan.json');
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 process.stdout.write(`Wrote ${out} (${result.scenes?.length||0} story briefs)\n`);
}
