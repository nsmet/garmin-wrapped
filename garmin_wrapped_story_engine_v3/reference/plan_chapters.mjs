/**
 * Garmin Wrapped v3: chapter-first reference editorial selector.
 * Input is ALREADY-NORMALIZED counts and ALREADY-VERIFIED candidates.
 * It does not fetch Garmin, parse FIT, compute 176 metrics, or validate medical data.
 * Only candidate metrics explicitly supplied by callers will appear.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planStory} from './plan_story.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sportRegistry = JSON.parse(fs.readFileSync(path.join(here, '../catalog/sport_registry.json'), 'utf8'));
const label = Object.fromEntries(sportRegistry.sports.map(s => [s.key, s.label]));
const phaseRank = Object.fromEntries(['position','scale','pattern','peak','twist','payoff'].map((v, i) => [v, i]));
const permittedChapters = new Set(['year_overview','other_sports','cross_sport','everyday_movement','heart_and_effort','wellness_recovery','sleep','finale']);
const title = {
  year_overview:'Your sporting year', other_sports:'Your other sports', cross_sport:'Across sports',
  everyday_movement:'Your everyday movement',heart_and_effort:'Your heart and effort',
  wellness_recovery:'Your wellness and recovery',sleep:'Your sleep story',finale:'Your year, in a nutshell'
};
const question = {
  year_overview:'What defined your recorded sporting year?',other_sports:'What else did you do?',
  cross_sport:'What unusual contrast exists across sports?',everyday_movement:'What did recorded daily movement look like?',
  heart_and_effort:'What intensity patterns occurred during activities?',wellness_recovery:'What recorded recovery/energy patterns can be described?',
  sleep:'What sleep habits were actually measured?',finale:'What uniquely sums up this recorded year?'
};
const privacyOpts = {includeEverydayMovement:true, includeActivityHR:true, includeWellness:false,includeSleep:false};

function makeStory(storyId, phase, primaryClaim, claimKey, whySelected, sharePolicy='allow_sanitized') {
  return {storyId,definitionId:null,phase,kind:null,primaryClaim,supportingCopy:null,claimKey,
    evidenceStatus:'verified',verifiedFacts:[],evidenceRefs:['prevalidated_activity_index'],sharePolicy,whySelected};
}

export function planChapters(input) {
  const base = planStory(input);
  if (base.status!=='ok') return {status:'blocked',schemaVersion:'3.0.0',period:{year:input.year,complete:input.yearComplete!==false},chapters:[],omittedChapters:[],errors:base.errors};
  const option={...privacyOpts,...(input.options||{})};
  const used=new Set();const omitted=[];const trace=[];const chapters=[];
  const inputCandidates=Array.isArray(input.storyCandidates)?input.storyCandidates:[];
  const candByChapter = new Map();
  for (const c of inputCandidates) {
    const id=c?.storyId;const ck=c?.claimKey;const ch=c?.chapterId;
    const validChapter=permittedChapters.has(ch) || (ch?.startsWith('sport:') && (ch.slice(6) in label));
    const validClaim=c?.evidenceStatus==='verified' && typeof c?.primaryClaim==='string' && c.primaryClaim.length>0 &&
      typeof id==='string'&&id.length>0 && typeof ck==='string'&&ck.length>0 &&
      Array.isArray(c?.evidenceRefs)&&c.evidenceRefs.length>0 && phaseRank[c.phase]!==undefined;
    if(!validChapter||!validClaim){trace.push({id:id||'unknown',reason:'NOT_PREVALIDATED_OR_BAD_CHAPTER'});continue;}
    if(!candByChapter.has(ch))candByChapter.set(ch,[]);
    candByChapter.get(ch).push({...c});
  }
  function candidates(id) {return (candByChapter.get(id)||[]).sort((a,b)=>phaseRank[a.phase]-phaseRank[b.phase] || (b.editorialScore||0)-(a.editorialScore||0) || a.storyId.localeCompare(b.storyId));}
  function addCandidate(c) {
    if(used.has(c.claimKey)){trace.push({id:c.storyId,reason:'DUPLICATE_CLAIM_KEY'});return null;}
    used.add(c.claimKey);
    return {storyId:c.storyId,definitionId:c.definitionId||null,phase:c.phase,kind:c.kind||null,
      primaryClaim:c.primaryClaim,supportingCopy:c.supportingCopy||null,claimKey:c.claimKey,
      evidenceStatus:'verified',verifiedFacts:c.verifiedFacts||[],evidenceRefs:c.evidenceRefs,
      sharePolicy:(c.sensitive===true || c.locationPrecision==='exact')?'private_only':(c.chapterId==='wellness_recovery'||c.chapterId==='sleep'?'private_only':c.chapterId==='heart_and_effort'?'requires_explicit_share_consent':(c.sharePolicy||'private_only')),
      whySelected:c.whySelected||'Prevalidated nonduplicate insight'};
  }
  function put(chapterId, kind, sportKey, included, minStories=1, depth=null) {
    const items=[];
    for(const s of included){
      if(s && !used.has(s.claimKey)){used.add(s.claimKey);items.push(s);}
      else if(s)trace.push({id:s.storyId,reason:'DUPLICATE_CLAIM_KEY'});
    }
    if(items.length<minStories){omitted.push({chapterId,reason:items.length===0?'NO_VALID_STORIES':'INSUFFICIENT_DISTINCT_STORIES'});return;}
    chapters.push({chapterId,kind,sportKey,order:chapters.length,title:sportKey?`Your ${label[sportKey]} year`:title[chapterId],
      editorialQuestion:sportKey?`What made ${label[sportKey]} part of your recorded year?`:question[chapterId],
      thesis:null,depth:depth|| (items.length>=3?'deep':items.length===2?'compact':'spotlight'),
      whyIncluded:'Supported by the prevalidated evidence and chapter policy',stories:items});
  }
  const combined = Object.entries(input.sportCounts).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const overview=[
    makeStory('overview_activity_count','position',`${input.activityCount} recorded activities${input.yearComplete===false?' so far':''}`,`all:activity_count:${input.year}`,'Core yearly foundation'),
    ...(combined.length>1?[makeStory('overview_sport_mix','scale',`${combined.length} sport families in the recorded year`,`all:sport_family_count:${input.year}`,'Shows breadth of sport participation')]:[])
  ];
  put('year_overview','core',null,overview,1,'core');

  const headline=new Set(base.headlineSports);
  const supporting=[];
  for (const [key,n] of combined) {
    const chapterId=`sport:${key}`;const eligible=candidates(chapterId);
    const isHeadline=headline.has(key);
    const qualifyingSupport=!isHeadline && eligible.length>=2 && (n>=8||base.chosenFavorite===key||eligible.some(x=>(x.editorialScore||0)>=85));
    if(!isHeadline && !qualifyingSupport){supporting.push([key,n]);continue;}
    const count=makeStory(`sport_${key}_count`,'position',`${n} recorded ${label[key]} sessions${input.yearComplete===false?' so far':''}`,`sport:${key}:session_count:${input.year}`,'Establishes sport chapter with verified count');
    const chosen=[count];
    for(const c of eligible){
      if(chosen.length>=7){trace.push({id:c.storyId,reason:'CHAPTER_BUDGET'});continue;}
      if(chosen.some(x=>x.claimKey===c.claimKey)){trace.push({id:c.storyId,reason:'DUPLICATE_LOCAL'});continue;}
      const story=addCandidate(c);if(story)chosen.push(story);
    }
    // addCandidate claims are pre-reserved to avoid duplicates across later chapters.
    for(const s of chosen){if(used.has(s.claimKey) && s.storyId!==count.storyId)used.delete(s.claimKey);}
    put(chapterId,'sport',key,chosen,1,chosen.length>=3?'deep':chosen.length===2?'compact':'spotlight');
  }
  if(supporting.length){
    const summary=supporting.map(([k,n])=>`${n} ${label[k]}`).join(', ');
    const story=makeStory('supporting_sports','scale',`Your other recorded sports included ${summary}`,`all:supporting_sports:${input.year}`,'Adds genuine variety without padding each small sport');
    put('other_sports','supporting_sports',null,[story],1,'compact');
  } else omitted.push({chapterId:'other_sports',reason:'NO_SUPPORTING_SPORTS'});
  function candidateChapter(id,enabled,min=2){
    if(!enabled){omitted.push({chapterId:id,reason:'NOT_OPTED_IN'});return;}
    const selection=[];
    for(const c of candidates(id)){if(selection.length>=4)break;const s=addCandidate(c);if(s)selection.push(s);}
    for(const s of selection)used.delete(s.claimKey);
    put(id,'general',null,selection,min);
  }
  candidateChapter('cross_sport',true,1);
  candidateChapter('everyday_movement',option.includeEverydayMovement,2);
  candidateChapter('heart_and_effort',option.includeActivityHR,2);
  candidateChapter('wellness_recovery',option.includeWellness,2);
  candidateChapter('sleep',option.includeSleep,2);
  const finale=makeStory('finale','payoff',base.identity==='dual_headline'
    ?`Two headline sports shaped your ${input.year}: ${label[combined[0][0]]} and ${label[combined[1][0]]}`
    :`Your recorded ${input.year} in motion: ${input.activityCount} activities`,`all:finale:${input.year}`,
    'Synthesizes earlier verified facts; no new performance claim');
  put('finale','core',null,[finale],1,'core');
  return {status:'ok',schemaVersion:'3.0.0',generationVersion:'0.3-reference-chapters',period:{year:input.year,complete:input.yearComplete!==false},
    athleteIdentity:{profile:base.identity,headlineSports:base.headlineSports,chosenFavorite:base.chosenFavorite,countLeader:base.countLeader},
    chapters,omittedChapters:omitted,privateTrace:trace,notes:[
      'REFERENCE ONLY: assumes complete activity index and validated count metrics supplied by caller; additional storyCandidates are already verified.',
      'Full sport-specific metric calculators, temporal completeness, FIT parsing, 176 story gates and localized copy are specified but not implemented here.',
      'No visual designs, motion instructions, API keys or health measurements are produced.'
    ]};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const inputFile=process.argv[2]||path.join(here,'../examples/audit_2025_counts.json');
  const outFile=process.argv[3]||path.join(here,'../examples/audit_2025_chapter_plan.json');
  const result=planChapters(JSON.parse(fs.readFileSync(inputFile,'utf8')));
  fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');
  process.stdout.write(`Wrote ${outFile} (${result.chapters.length} chapters)\n`);
}
