import {canShare,canRequestShare,sanitizedCard,datasetFromPlan,displayFields,chartDescription} from './story-model.mjs';
import {renderPoster,palettes} from './poster.mjs';
import {renderShareCard,shareColorways} from './share-card.mjs';
import {requiredAssets,assetFiles,transitionDuration} from './visual-system.mjs';
import {makeLibrary,extensions} from './story-library.mjs';
import {appendActivityAudit} from './activity-audit.mjs';
import {recapSequence} from './recap-sequence.mjs';

let dataset=null,demoDataset,recap=[],library=[],libraryLoad;
async function ensureLibrary(){if(!libraryLoad)libraryLoad=fetch('./story-catalog.json').then(r=>{if(!r.ok)throw Error('Library unavailable');return r.json();}).then(c=>{library=[...makeLibrary(c),...extensions];for(const group of [...new Set(library.map(s=>s.group))]){const o=document.createElement('option');o.value=group;o.textContent=group;$('story-group').append(o);}return library;}).catch(e=>{libraryLoad=null;throw e;});return libraryLoad;}
let stories=recap,libraryMode=false,page=0,gridVersion=0;
const $=id=>document.getElementById(id),canvas=$('poster'),ctx=canvas.getContext('2d'),stage=$('story');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),assets={};
const state={index:0,from:0,to:0,progress:1,elapsed:0,duration:1000,time:0,last:0,raf:0,paused:reduced.matches,busy:false,w:0,h:0};
let shareURL=null,shareBlob=null,toastTimer,loadingStory=false,viewVersion=0,shareStory=null;
let shareColorway='original',shareVersion=0,sharePickerVersion=0;
const assetPromises={};
function loadAssets(story){if(!story)return Promise.resolve();return Promise.all(requiredAssets(story).map(name=>assetPromises[name]||(assetPromises[name]=new Promise(resolve=>{const img=new Image();assets[name]=img;const timer=setTimeout(fail,8000);function fail(){clearTimeout(timer);delete assetPromises[name];resolve();}img.onload=()=>{clearTimeout(timer);draw();resolve();};img.onerror=()=>{toast('An image could not load. The story remains available.');fail();};img.src=assetFiles[name];}))));}
const fonts=document.fonts?Promise.all([document.fonts.ready,document.fonts.load('400 30px Anton')]):Promise.resolve();
const ready=fonts;

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function draw(){if(!state.w||!stories[state.from]||!stories[state.to])return;renderPoster(ctx,state.w,state.h,{from:stories[state.from],to:stories[state.to],progress:state.progress,time:state.time,assets,bounds:state.bounds});const p=palettes[stories[state.busy&&state.progress<.5?state.from:state.to].template];stage.style.setProperty('--ink',p[1]);stage.style.setProperty('--paper',p[0]);}
function preloadNeighbors(){for(const i of [state.index+1,state.index-1])if(stories[i])void loadAssets(stories[i]);}
function sync(){
  const s=stories[state.index];if(!s)return;const p=palettes[s.template];stage.style.setProperty('--ink',p[1]);stage.style.setProperty('--paper',p[0]);
  $('chapter-name').textContent=s.promotional?'ONE MORE RIDE?':s.libraryOnly?s.group.toUpperCase():s.id.replaceAll('-',' ').toUpperCase();$('position').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(stories.length).padStart(2,'0')}`;
  document.querySelector('.demo-label').textContent=s.libraryOnly?'TEMPLATE · NO PERSONAL DATA':dataset.exampleOnly?'FICTIONAL DATA · DESIGN PREVIEW':dataset.notice.toUpperCase();
  $('edition-year').textContent=s.libraryOnly?'DESIGN LIBRARY':`${dataset.year}${dataset.exampleOnly?' / DEMO':''}`;
  $('caption').textContent=s.caption;$('story-title').textContent=s.title.join(' ');$('story-description').textContent=`${s.value.replace('\n',' ')} ${s.unit}. ${s.caption.replace('\n',' ')} ${chartDescription(s.chart)} ${s.libraryOnly?'Template. No personal data. '+s.eligibility:dataset.notice}.`;
  $('mini-watt-offer').hidden=!s.promotional;stage.classList.toggle('is-promotion',!!s.promotional);
  $('back').disabled=state.index===0;$('advance').setAttribute('aria-label',state.index===stories.length-1?'Choose a share card':'Next story');
  $('share').textContent=state.index===stories.length-1?'Choose a card ↗':'Share card ↗';
  $('motion').textContent=reduced.matches?'Still':state.paused?'Play':'Pause';$('motion').disabled=reduced.matches;$('motion').setAttribute('aria-pressed',String(state.paused));
  const shareable=s.promotional?recap.some(card=>canRequestShare(card,dataset)):canRequestShare(s,dataset);
  $('share').disabled=!shareable;$('advance').disabled=state.index===stories.length-1&&!shareable;
  [...$('progress').children].forEach((el,i)=>el.className=i===Math.floor(state.index/stories.length*$('progress').children.length)?'current':i<state.index/stories.length*$('progress').children.length?'passed':'');
  document.querySelectorAll('.chapter-tile').forEach((el,i)=>el.setAttribute('aria-current',String(i===state.index)));
  document.querySelector('meta[name="theme-color"]').content=p[0];measureBounds();
}
async function go(index){
  if(state.busy||loadingStory||index<0||index>=stories.length||index===state.index)return;
  const version=viewVersion;loadingStory=true;await loadAssets(stories[index]);if(version!==viewVersion)return;loadingStory=false;
  state.from=state.index;state.to=index;state.elapsed=0;state.duration=transitionDuration(stories[state.from],stories[state.to]);state.progress=0;state.busy=true;stage.classList.add('transitioning');
  if(reduced.matches||state.paused)finish();
  history.replaceState(null,'','#'+stories[index].id);start();
}
function finish(){state.index=state.to;state.from=state.to;state.progress=1;state.busy=false;stage.classList.remove('transitioning');sync();draw();preloadNeighbors();}
function tick(now){
  state.raf=0;if(stage.hidden||document.hidden||$('chapters-dialog').open||$('share-dialog').open||$('privacy-dialog').open||$('health-share-dialog').open)return;
  const dt=Math.min(state.last?now-state.last:16,50);state.last=now;
  if(!state.paused&&!reduced.matches)state.time+=dt/1000;
  if(state.busy){state.elapsed+=dt;state.progress=Math.min(1,state.elapsed/state.duration);if(state.progress===1)finish();}
  draw();if(state.busy||(!state.paused&&!reduced.matches))state.raf=requestAnimationFrame(tick);
}
function start(){if(!stage.hidden&&!state.raf&&!document.hidden&&!$('chapters-dialog').open&&!$('share-dialog').open&&!$('privacy-dialog').open&&!$('health-share-dialog').open){state.last=0;state.raf=requestAnimationFrame(tick);}}
function measureBounds(){if(stage.hidden)return;const r=stage.getBoundingClientRect(),label=stage.querySelector('.chapter-label').getBoundingClientRect(),footer=stage.querySelector('footer').getBoundingClientRect();state.bounds={top:label.bottom-r.top+24,bottom:footer.top-r.top-20,pad:parseFloat(getComputedStyle(stage.querySelector('.story-chrome')).paddingLeft)};}
function resize(){measureBounds();const r=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);state.w=r.width;state.h=r.height;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);draw();}
function closeDialog(id){$(id).close();if(id==='chapters-dialog')$('chapters-button').setAttribute('aria-expanded','false');start();}
function outputCanvas(story,index,width=1080){const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*16/9);const c=out.getContext('2d');c.scale(width/390,width/390);renderPoster(c,390,390*16/9,{from:displayCard(story),time:1.4,assets,chrome:true,index,total:story.libraryOnly?library.length:recap.length,year:dataset.year,notice:story.libraryOnly?'Template · no personal data':dataset.notice});return out;}
async function openChapters(){
  if(state.busy||loadingStory)return;$('chapters-dialog').showModal();$('chapters-button').setAttribute('aria-expanded','true');
  await fonts;page=0;renderGrid();
}
function progressBars(){ $('progress').replaceChildren();for(let i=0;i<Math.min(stories.length,24);i++)$('progress').append(document.createElement('span'));}
function activate(s){stories=s.libraryOnly?library:recap;libraryMode=!!s.libraryOnly;state.index=state.from=state.to=stories.indexOf(s);state.progress=1;state.busy=false;progressBars();history.replaceState(null,'','#'+s.id);sync();draw();preloadNeighbors();closeDialog('chapters-dialog');}
async function renderGrid(){
 const version=++gridVersion,isLibrary=$('library-mode').value==='library',query=$('story-search').value.trim().toLowerCase(),group=$('story-group').value;
 if(isLibrary){try{await ensureLibrary();}catch{$('library-count').textContent='The design library could not load. Try again.';return;}if(version!==gridVersion)return;}
 const items=(isLibrary?library:recap).filter(s=>(!isLibrary||!group||s.group===group)&&(!query||(s.title.join(' ')+' '+s.id+' '+(s.group||'')).toLowerCase().includes(query)));
 const recordedCount=items.filter(s=>!s.promotional).length;
 $('library-count').textContent=recordedCount===0&&items.some(s=>s.promotional)?'A MINI WATT invitation':`${recordedCount} ${isLibrary?'templates · metrics appear only with supporting data':dataset.exampleOnly?'fictional example stories':'verified recorded stories'}${items.some(s=>s.promotional)?' + a MINI WATT invitation':''}`;
 $('story-group').hidden=!isLibrary;$('chapter-grid').replaceChildren();$('more-stories').hidden=(page+1)*12>=items.length;
 for(const s of items.slice(0,(page+1)*12)){
  const button=document.createElement('button');button.type='button';button.className='chapter-tile';button.setAttribute('aria-label',s.title.join(' '));button.setAttribute('aria-current',String(s.id===stories[state.index].id));
  const img=document.createElement('img');img.alt='';const label=document.createElement('span');label.textContent=s.title.join(' ');button.append(img,label);
  if(s.libraryOnly){const detail=document.createElement('small');detail.textContent=s.group+' · '+s.family;button.append(detail);button.title=s.eligibility+' — '+s.claimGuard;}
  button.addEventListener('click',()=>activate(s));$('chapter-grid').append(button);
  await loadAssets(s);if(version!==gridVersion)return;img.src=outputCanvas(s,(s.libraryOnly?library:recap).indexOf(s),270).toDataURL('image/png');
 }
}
for(const id of ['library-mode','story-group','story-search'])$(id).addEventListener(id==='story-search'?'input':'change',()=>{page=0;renderGrid();});
$('more-stories').addEventListener('click',()=>{page++;renderGrid();});
function displayCard(s){return displayFields(s);}
function resetShareImage(){if(shareURL)URL.revokeObjectURL(shareURL);shareURL=null;shareBlob=null;$('share-preview').removeAttribute('src');$('native-share').hidden=true;$('download').disabled=true;}
function clearShare(){shareVersion++;sharePickerVersion++;if(shareStory)dataset?.shareConsents?.delete(shareStory.id);resetShareImage();shareStory=null;shareColorway='original';$('share-cards').replaceChildren();$('share-colors').replaceChildren();$('share-selection').textContent='';$('share-error').textContent='';$('share-preview-frame').setAttribute('aria-busy','false');}
function shareCanvas(story,width=1080,colorway=shareColorway){
 const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*16/9);const c=out.getContext('2d');c.scale(width/390,width/390);
 renderShareCard(c,390,390*16/9,{story:displayFields(story),colorway,assets,year:dataset.year,notice:story.libraryOnly?'Template · no personal data':dataset.exampleOnly?'Fictional data':dataset.notice});return out;
}
function encodeShareCanvas(out,version){
 return new Promise((resolve,reject)=>{
  // Chromium can defer its idle PNG encoder for several seconds after a dialog closes.
  const timer=setTimeout(()=>{
   if(version!==shareVersion){resolve(null);return;}
   try{const bytes=atob(out.toDataURL('image/png').split(',')[1]);resolve(new Blob([Uint8Array.from(bytes,c=>c.charCodeAt(0))],{type:'image/png'}));}catch(error){reject(error);}
  },1200);
  try{out.toBlob(blob=>{clearTimeout(timer);resolve(blob);},'image/png');}catch(error){clearTimeout(timer);reject(error);}
 });
}
function requestShareConsent(story){
 if(canShare(story,dataset))return Promise.resolve(true);
 const currentDataset=dataset;
 $('health-share-description').textContent=`${story.title.join(' ')}: ${story.value} ${story.unit}. ${story.caption}`;
 $('health-share-dialog').showModal();
 return new Promise(resolve=>{
  const cleanup=()=>{$('health-share-confirm').removeEventListener('click',confirm);$('health-share-dialog').removeEventListener('close',cancel);};
  const confirm=()=>{cleanup();currentDataset.shareConsents.add(story.id);$('health-share-dialog').close();resolve(true);};
  const cancel=()=>{cleanup();resolve(false);};
  $('health-share-confirm').addEventListener('click',confirm,{once:true});$('health-share-dialog').addEventListener('close',cancel,{once:true});
 });
}
function syncShareChoices(){
 for(const button of $('share-cards').children)button.setAttribute('aria-pressed',String(button.dataset.storyId===shareStory?.id));
 for(const button of $('share-colors').children)button.setAttribute('aria-pressed',String(button.dataset.colorway===shareColorway));
 $('share-selection').textContent=shareStory?.title.join(' ')||'';
}
async function renderSharePicker(){
 const version=++sharePickerVersion,items=(shareStory.libraryOnly?[shareStory]:recap).filter(s=>canRequestShare(s,dataset));
 $('share-card-count').textContent=shareStory.libraryOnly?'Design template':`${items.length} cards from your year`;
 $('share-cards').replaceChildren();
 const previews=items.map(story=>{
  const button=document.createElement('button');button.type='button';button.className='share-card-option';button.dataset.storyId=story.id;button.setAttribute('aria-label',`Choose ${story.title.join(' ')}`);
  const img=document.createElement('img');img.alt='';img.width=90;img.height=160;const label=document.createElement('span');label.textContent=story.title.join(' ');button.append(img,label);
  if(story.health&&!dataset.exampleOnly){const note=document.createElement('small');note.textContent='Permission required';button.append(note);}
  button.addEventListener('click',()=>chooseShareCard(story));$('share-cards').append(button);return {story,img};
 });
 syncShareChoices();
 await fonts;
 await Promise.all(previews.map(async({story,img})=>{await loadAssets(story);if(version!==sharePickerVersion||!$('share-dialog').open)return;img.src=shareCanvas(story,180,'original').toDataURL('image/png');}));
}
function renderShareColors(){
 $('share-colors').replaceChildren();
 for(const color of shareColorways){
  const button=document.createElement('button');button.type='button';button.className='share-color-option';button.dataset.colorway=color.id;button.setAttribute('aria-label',`${color.label} colors`);
  const swatch=document.createElement('span');swatch.className='share-swatch';swatch.style.setProperty('--swatch',color.color);swatch.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=color.label;button.append(swatch,label);
  button.addEventListener('click',()=>{if(color.id===shareColorway)return;shareColorway=color.id;syncShareChoices();void renderSelectedShare();});$('share-colors').append(button);
 }
 syncShareChoices();
}
async function chooseShareCard(story){
 if(story===shareStory||!canRequestShare(story,dataset))return;
 const version=viewVersion,allowed=await requestShareConsent(story);
 if(!allowed||version!==viewVersion||!$('share-dialog').open)return;
 if(shareStory)dataset.shareConsents?.delete(shareStory.id);shareStory=story;syncShareChoices();void renderSelectedShare();
}
async function openShare(){
  const current=stories[state.index],story=current.promotional?recap.findLast(s=>canRequestShare(s,dataset)):current,version=viewVersion;
  if(state.busy||!canRequestShare(story,dataset))return;
  clearShare();
  const allowed=await requestShareConsent(story);if(!allowed||version!==viewVersion)return;
  shareStory=story;
  $('share-dialog').showModal();$('share-error').textContent='';
  renderShareColors();void renderSharePicker();void renderSelectedShare();
}
async function renderSelectedShare(){
  const story=shareStory,version=++shareVersion;
  resetShareImage();$('share-error').textContent='';$('share-preview-frame').setAttribute('aria-busy','true');
  document.querySelector('.share-note').textContent=story.libraryOnly?'1080 × 1920 · template · no personal data':dataset.exampleOnly?'1080 × 1920 · fictional data':'1080 × 1920 · only this card’s metric and caption';
  try{
    await Promise.all([ready,loadAssets(story)]);if(version!==shareVersion||!$('share-dialog').open)return;
    const safe=sanitizedCard(story,dataset),out=shareCanvas(safe);
    const blob=await encodeShareCanvas(out,version);if(!blob)throw Error('Image encoding failed');
    if(version!==shareVersion||!$('share-dialog').open)return;
    shareBlob=blob;shareURL=URL.createObjectURL(blob);$('share-preview').src=shareURL;$('share-preview').alt=`${story.title.join(' ')} — ${shareColorways.find(c=>c.id===shareColorway).label} share card`;$('download').disabled=false;
    const file=new File([blob],filename(),{type:'image/png'});$('native-share').hidden=!(navigator.canShare&&navigator.canShare({files:[file]}));
  }catch{if(version===shareVersion)$('share-error').textContent='The card could not be created. Choose a card or color to try again.';}
  finally{if(version===shareVersion)$('share-preview-frame').setAttribute('aria-busy','false');}
}
function filename(){return `garmin-wraped-${dataset.year}-${shareStory?.id||stories[state.index].id}${shareColorway==='original'?'':'-'+shareColorway}${dataset.exampleOnly?'-fictional-demo':''}.png`;}
$('download').addEventListener('click',()=>{if(!shareURL||!canShare(shareStory,dataset))return;const a=document.createElement('a');a.href=shareURL;a.download=filename();document.body.append(a);a.click();a.remove();toast('Your card is ready to save.');});
$('native-share').addEventListener('click',async()=>{if(!shareBlob||!canShare(shareStory,dataset))return;try{await navigator.share({files:[new File([shareBlob],filename(),{type:'image/png'})],title:'My Garmin Wraped · a MINI WATT product ⚡️'});}catch(e){if(e.name!=='AbortError')$('share-error').textContent='Sharing is unavailable here. You can download the PNG instead.';}});
$('advance').addEventListener('click',()=>state.index===stories.length-1?openShare():go(state.index+1));
$('back').addEventListener('click',()=>go(state.index-1));$('share').addEventListener('click',openShare);
$('motion').addEventListener('click',()=>{state.paused=!state.paused;if(state.paused&&state.busy)finish();sync();draw();start();});
$('chapters-button').addEventListener('click',openChapters);$('close-chapters').addEventListener('click',()=>closeDialog('chapters-dialog'));$('close-share').addEventListener('click',()=>closeDialog('share-dialog'));
stage.querySelector('.brand-name').addEventListener('click',async e=>{e.preventDefault();if(libraryMode){await loadAssets(recap[0]);activate(recap[0]);$('library-mode').value='recap';}else go(0);});
for(const id of ['chapters-dialog','share-dialog','privacy-dialog','health-share-dialog']){$(id).addEventListener('close',()=>{$('chapters-button').setAttribute('aria-expanded','false');start();});$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(id);}});}
document.addEventListener('keydown',e=>{if(stage.hidden||$('chapters-dialog').open||$('share-dialog').open||$('privacy-dialog').open||$('health-share-dialog').open||e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();go(state.index+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(state.index-1);}});
let touchStart=null;
stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('button,a'))return;touchStart={x:e.clientX,y:e.clientY};});
stage.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)go(state.index+(dx<0?1:-1));});
stage.addEventListener('pointercancel',()=>touchStart=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(state.raf);state.raf=0;}else start();});
reduced.addEventListener('change',()=>{state.paused=reduced.matches;if(state.busy)finish();sync();draw();start();});
window.addEventListener('hashchange',()=>{const i=stories.findIndex(s=>s.id===location.hash.slice(1));if(i>=0)go(i);});
const layoutObserver=new ResizeObserver(resize);for(const element of [stage,stage.querySelector('footer'),stage.querySelector('.chapter-label')])layoutObserver.observe(element);

export async function prepareRecap({demo=false,deepLink=false,data=null}={}) {
  viewVersion++;gridVersion++;clearShare();
  if((demo&&data)||(!demo&&!data))throw Error('Connect to Garmin to build your recap, or explicitly choose the fictional demo.');
  if(demo)demoDataset ||= (await import('./sample-data.mjs')).dataset;
  dataset=demo?{...demoDataset,shareConsents:new Set()}:datasetFromPlan(data);recap=recapSequence(dataset);
  if(!recap.length)throw Error('No supported activities were recorded for this year. Choose another year.');
  stories=recap;libraryMode=false;state.index=state.from=state.to=0;state.progress=1;state.busy=false;loadingStory=false;
  if(demo&&deepLink&&location.hash.startsWith('#template-')){await ensureLibrary();stories=library;libraryMode=true;}
  if(deepLink){const initial=stories.findIndex(s=>s.id===location.hash.slice(1));if(initial>=0)state.index=state.from=state.to=initial;}
  stage.classList.remove('transitioning');$('library-mode').value=libraryMode?'library':'recap';
  $('library-mode').options[0].textContent=dataset.exampleOnly?'The example recap':'My recorded year';progressBars();
  await Promise.all([ready,loadAssets(stories[state.index])]);
}
export function revealRecap(){history.replaceState(null,'','#'+stories[state.index].id);sync();resize();start();preloadNeighbors();}
export function clearRecap(){viewVersion++;gridVersion++;cancelAnimationFrame(state.raf);state.raf=0;loadingStory=false;clearShare();dataset=null;recap=[];stories=recap;$('mini-watt-offer').hidden=true;stage.classList.remove('is-promotion');state.index=state.from=state.to=0;state.busy=false;state.progress=1;ctx.clearRect(0,0,state.w,state.h);$('chapter-grid').replaceChildren();$('story-title').textContent='Your year in motion';$('story-description').textContent='';$('caption').textContent='';$('coverage-details').replaceChildren();$('health-share-description').textContent='';}
$('health-share-cancel').addEventListener('click',()=>$('health-share-dialog').close());
function showCoverage(){
  if(!dataset)return;
  const root=$('coverage-details');root.replaceChildren();const p=document.createElement('p');p.textContent=dataset.exampleOnly?'This is a fictional demo. No Garmin account is connected.':`${dataset.notice}. Activities use ${dataset.period.timeZone}. ${recap.length} supported stories. Data was fetched only for this recap.`;root.append(p);
  if(dataset.warnings?.length){const heading=document.createElement('h3');heading.textContent='Data coverage';root.append(heading);const list=document.createElement('ul');for(const warning of dataset.warnings){const li=document.createElement('li');li.textContent=warning;list.append(li);}root.append(list);}
  if(!dataset.exampleOnly)appendActivityAudit(root,dataset.activityAudit);
  $('privacy-dialog').showModal();
}
$('recap-details').addEventListener('click',showCoverage);
$('share-dialog').addEventListener('close',clearShare);
$('health-share-dialog').addEventListener('close',()=>{$('health-share-description').textContent='';});
