// Presentation validation is separate from the measurement engine.
import {designs} from './visual-system.mjs';
import {formatNumber,formatDecimal} from './measurement-format.mjs';
const safeText=v=>typeof v==='string'&&v.length<=100;
const safeValue=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function validChart(chart){
 if(!chart||!Array.isArray(chart.items)||!chart.items.length||chart.items.length>19||!chart.items.every(i=>i&&safeText(i.label)))return false;
 switch(chart.kind){
  case 'summary':return chart.items.length<=5&&chart.items.every(i=>safeText(i.value)&&safeText(i.unit));
  case 'duration':return chart.items.length===2&&chart.items.every(i=>safeText(i.value));
  case 'sport-mix':return safeValue(chart.total)&&chart.total>0&&chart.items.every(i=>safeText(i.key)&&safeValue(i.value)&&i.value>0)&&chart.items.reduce((n,i)=>n+i.value,0)===chart.total;
  case 'months':return ['minutes','sessions'].includes(chart.measure)&&typeof chart.compare==='boolean'&&chart.items.length===12&&chart.items.every(i=>['complete','partial','current','future'].includes(i.state)&&(i.value===null||safeValue(i.value))&&(i.sessions===null||safeValue(i.sessions)));
  case 'health-months':return ['activityHR','restingHR','hrv'].includes(chart.measure)&&typeof chart.compare==='boolean'&&chart.items.length===12&&chart.items.filter(i=>i.value!==null).length>=(chart.measure==='activityHR'?1:2)&&chart.items.every(i=>['complete','partial','current','future'].includes(i.state)&&Number.isInteger(i.count)&&i.count>=0&&i.count<=(chart.measure==='activityHR'?20000:31)&&(i.value===null||safeValue(i.value)&&i.value>0&&i.value<=(chart.measure==='hrv'?1000:250)&&i.count>=(chart.measure==='activityHR'?1:10))&&(i.state!=='future'||i.value===null&&i.count===0))&&(!chart.compare||chart.items.every(i=>i.state!=='partial'));
  case 'record':return chart.items.length<=3&&chart.items.every(i=>safeValue(i.value));
  case 'weekdays':return chart.items.length===7&&chart.items.every(i=>safeValue(i.value));
  default:return false;
 }
}
// Copy the display schema, never nested source/evidence objects.
function displayChart(chart){
 if(!validChart(chart))return undefined;
 const items=chart.items.map(i=>{
  const item={label:i.label,value:i.value};
  if(chart.kind==='summary')item.unit=i.unit;
  if(chart.kind==='sport-mix')item.key=i.key;
  if(chart.kind==='months'){item.state=i.state;item.sessions=i.sessions;}
  if(chart.kind==='health-months'){item.state=i.state;item.count=i.count;}
  return item;
 });
 return {kind:chart.kind,items,...(chart.kind==='sport-mix'?{total:chart.total}:{}),...(['months','health-months'].includes(chart.kind)?{measure:chart.measure,compare:chart.compare}:{})};
}
export function healthMonthExtremes(chart){
 if(!validChart(chart)||chart.kind!=='health-months'||!chart.compare)return null;
 const items=chart.items.filter(i=>i.value!==null&&['complete','current'].includes(i.state));
 if(items.length<2)return null;
 const high=Math.max(...items.map(i=>i.value)),low=Math.min(...items.map(i=>i.value));
 return {high,low,highest:items.filter(i=>i.value===high),lowest:items.filter(i=>i.value===low)};
}
export function chartDescription(chart){
 if(!validChart(chart))return '';
 if(chart.kind==='health-months'){
  const unit=chart.measure==='hrv'?'ms':'bpm',countUnit=chart.measure==='hrv'?'nights':chart.measure==='activityHR'?'activities':'days';
  const values=chart.items.map(i=>`${i.label}: ${i.value===null?(i.state==='future'?'upcoming':i.state==='partial'?'unknown coverage':`insufficient measurements (${i.count} recorded ${countUnit})`):`${formatNumber(i.value)} ${unit}, ${i.count} recorded ${countUnit}`}${i.state==='current'?' (month in progress)':''}`).join('; ');
  const extremes=healthMonthExtremes(chart);if(!extremes)return values;
  if(extremes.high===extremes.low)return `${values}. All ${extremes.highest.length} recorded months are tied at ${formatNumber(extremes.high)} ${unit}.`;
  const name=items=>items.map(i=>i.label+(i.state==='current'?' (so far)':'')).join(', ');
  return `${values}. Highest monthly average${extremes.highest.length>1?'s (tied)':''}: ${name(extremes.highest)}, ${formatNumber(extremes.high)} ${unit}. Lowest monthly average${extremes.lowest.length>1?'s (tied)':''}: ${name(extremes.lowest)}, ${formatNumber(extremes.low)} ${unit}.`;
 }
 if(chart.kind==='months'){
  const values=chart.items.map(i=>`${i.label}: ${i.value===null?(i.state==='future'?'upcoming':'unknown coverage'):`${formatNumber(i.value)} ${chart.measure}, ${i.sessions} activities`}${i.state==='current'?' (month in progress)':''}`).join('; ');
  const completed=chart.items.filter(i=>i.state==='complete'&&i.value!==null);
  if(!chart.compare||!completed.length)return values;
  const max=Math.max(...completed.map(i=>i.value)),min=Math.min(...completed.map(i=>i.value));
  return values+`. Peak completed month${completed.filter(i=>i.value===max).length>1?'s (tied)':''}: ${completed.filter(i=>i.value===max).map(i=>i.label).join(', ')}. Quietest completed month${completed.filter(i=>i.value===min).length>1?'s (tied)':''}: ${completed.filter(i=>i.value===min).map(i=>i.label).join(', ')}.`;
 }
 return chart.items.map(i=>`${i.label}: ${chart.kind==='record'?formatDecimal(i.value):i.value}${chart.kind==='sport-mix'?` activities (${Math.round(i.value/chart.total*100)}%)`:chart.kind==='record'?' km':chart.kind==='weekdays'?' activities':i.unit?' '+i.unit:''}`).join('; ');
}
export function selectStories(dataset) {
  if(!dataset||!Number.isInteger(dataset.year)||!Array.isArray(dataset.stories))return [];
  const seen=new Set(),claims=new Set();
  return dataset.stories.filter(s=>{
    if(!s||typeof s.id!=='string'||seen.has(s.id)||claims.has(s.claimKey||s.id))return false;
    if(s.libraryOnly||!Object.hasOwn(designs,s.template))return false;
    if(s.chart&&!validChart(s.chart))return false;
    if(typeof s.value!=='string'||!s.value.trim()||s.value.length>100||!Array.isArray(s.title)||!s.title.length||s.title.length>8||!s.title.every(t=>typeof t==='string'&&t.length<=120))return false;
    if(typeof s.unit!=='string'||s.unit.length>180||typeof s.caption!=='string'||s.caption.length>500)return false;
    if(s.status!=='verified'||!Array.isArray(s.evidence)||!s.evidence.length||!s.evidence.every(ref=>typeof ref==='string'&&ref.trim()))return false;
    if(!dataset.exampleOnly&&(s.sanitized!==true||s.evidence.some(ref=>ref.startsWith('fictional:'))))return false;
    if(s.health&&!dataset.includeHealth)return false;
    seen.add(s.id);claims.add(s.claimKey||s.id);return true;
  });
}
export function canRequestShare(story,dataset){
  if(!story||!dataset)return false;
  if(story.promotional)return false;
  if(story.libraryOnly)return true;
  return dataset.exampleOnly===true||(story.sanitized===true&&['allow_sanitized','requires_explicit_share_consent'].includes(story.sharePolicy));
}
export function canShare(story,dataset){
  return canRequestShare(story,dataset)&&(story.libraryOnly||dataset.exampleOnly===true||(story.sharePolicy==='allow_sanitized'&&!story.health)||dataset.shareConsents?.has(story.id)===true);
}
export function sanitizedCard(story,dataset){
  if(!canShare(story,dataset))throw Error('This card needs permission before export.');
  // Renderer gets only display fields. Evidence, raw IDs, timestamps, GPS and metadata stay private.
  return displayFields(story);
}
export function displayFields(story){
  const {id,template,title,value,unit,caption,libraryOnly,group,family,variant,geometry,sports,presentation}=story;
  return {id,template,title:[...title],value,unit,caption,libraryOnly,group,family,variant,geometry,sports,presentation,...(story.chart?{chart:displayChart(story.chart)}:{})};
}
export function datasetFromPlan(plan){
  if(plan?.schemaVersion!=='3.0.0'||!Array.isArray(plan.chapters))throw Error('This story plan is not supported.');
  const dataset={...plan,stories:plan.chapters.flatMap(c=>c.stories.map(s=>({...s,chapterId:c.chapterId}))),shareConsents:new Set()};
  dataset.stories=selectStories(dataset);return dataset;
}
