import {canShare,canRequestShare,sanitizedCard,datasetFromPlan,displayFields,chartDescription} from './story-model.mjs';
import {shareColorways,renderShareCard} from './share-card.mjs';
import {makeLibrary,extensions} from './story-library.mjs';
import {appendActivityAudit} from './activity-audit.mjs';
import {recapSequence} from './recap-sequence.mjs';
import {cardSpec,recapContext} from './dot-spec.mjs';
import {sampleStories,sampleContext,SAMPLE_GROUPS} from './dot-samples.mjs';
import {cardFrame,drawBackground,drawText,collectDots,createDotBuffer,drawDots2D,snapshotDots,TEXT_SETTLE} from './dot-card.mjs';
import {renderStill} from './dot-render.mjs';
import {loadThree,createDotRenderer} from './dot-scene.mjs';
import {ease} from './dot-engine.mjs';

let dataset=null,demoDataset,recap=[],library=[],libraryLoad,context={};
const sampleCtx={full:sampleContext('full'),light:sampleContext('light')};
async function ensureLibrary(){if(!libraryLoad)libraryLoad=fetch('./story-catalog.json').then(r=>{if(!r.ok)throw Error('Library unavailable');return r.json();}).then(c=>{library=[...sampleStories('full'),...sampleStories('light'),...makeLibrary(c),...extensions];for(const group of [...new Set(library.map(s=>s.group))]){const o=document.createElement('option');o.value=group;o.textContent=group;$('story-group').append(o);}return library;}).catch(e=>{libraryLoad=null;throw e;});return libraryLoad;}
let stories=recap,libraryMode=false,page=0,gridVersion=0;
const $=id=>document.getElementById(id),canvas=$('poster'),ctx=canvas.getContext('2d'),stage=$('story'),backdrop=$('backdrop'),bctx=backdrop.getContext('2d');
// The chapter menu is a development tool: it shows on local hosts (or with ?dev) and never in production.
const devTools=/^(localhost|127\.0\.0\.1|\[::1\]|.+\.local)$/.test(location.hostname)||new URLSearchParams(location.search).has('dev');
$('chapters-button').hidden=!devTools;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// clock: seconds of animation time (stops while paused); enter: clock time the current card appeared
const state={index:0,from:0,to:0,progress:1,elapsed:0,duration:900,clock:0,enter:0,fromEnter:0,last:0,raf:0,paused:reduced.matches,busy:false,w:0,h:0,dpr:1,lastDots:0,textDirty:true,bgDirty:true,morph:null};
let shareURL=null,shareBlob=null,toastTimer,loadingStory=false,viewVersion=0,shareStory=null;
let shareColorway='original',shareVersion=0,sharePickerVersion=0;
const fonts=document.fonts?Promise.all([document.fonts.load('800 40px Sora'),document.fonts.load('600 12px Sora'),document.fonts.load('400 12px Sora')]).then(()=>document.fonts.ready).catch(()=>{}):Promise.resolve();
const ready=Promise.all([fonts,loadThree()]);

/* ---------- specs and frames ---------- */
const specCache=new Map(),frameCache=new Map();
function healthTag(s){if(!s.health)return '';return s.sample||!dataset?.exampleOnly?'HEALTH CARD · ASKS BEFORE SHARING':'HEALTH CARD · FICTIONAL DEMO';}
function specFor(s){
 let sp=specCache.get(s);if(sp)return sp;
 sp=cardSpec(s,s.sample?sampleCtx[s.sample]:context);sp.healthTag=healthTag(s);specCache.set(s,sp);return sp;
}
function frameFor(s){
 const key=s.id+'|'+state.w+'x'+state.h+'|'+JSON.stringify(state.bounds);let f=frameCache.get(s);
 if(!f||f.key!==key){f={key,frame:cardFrame(state.w,state.h,{mode:'live',bounds:state.bounds,spec:specFor(s),ctx})};frameCache.set(s,f);}
 return f.frame;
}
// Export / thumbnail spec: built from the sanitized display fields, never the full story.
function exportSpec(display,source,{notice,year}){
 const sp=source.sample?cardSpec(source,sampleCtx[source.sample]):cardSpec(display,source.libraryOnly?{}:context);
 return {...sp,notice,right:sp.right==='GARMIN WRAPED'?`GARMIN WRAPED · ${year}`:sp.right};
}

/* ---------- dot layer: Three.js when available, 2D sprites otherwise ---------- */
let dotCanvas=null,dotGL=null,dot2d=null;const dotBuf=createDotBuffer();
function mountDotLayer(){
 dotCanvas?.remove();dotGL?.dispose();dotGL=null;dot2d=null;
 dotCanvas=document.createElement('canvas');dotCanvas.id='dots';dotCanvas.setAttribute('aria-hidden','true');backdrop.after(dotCanvas);
 dotGL=createDotRenderer(dotCanvas,{opaque:true});
 if(dotGL){dotCanvas.dataset.renderer='webgl';dotCanvas.addEventListener('webglcontextlost',()=>{toast('The 3D layer was reset. The story continues in 2D.');fallback2D();});}
 else fallback2D();
 sizeDots();
}
function fallback2D(){dotGL?.dispose();dotGL=null;dotCanvas?.remove();dotCanvas=document.createElement('canvas');dotCanvas.id='dots';dotCanvas.dataset.renderer='2d';dotCanvas.setAttribute('aria-hidden','true');backdrop.after(dotCanvas);dot2d=dotCanvas.getContext('2d');sizeDots();}
function sizeDots(){if(!dotCanvas||!state.w)return;if(dotGL)dotGL.setSize(state.w,state.h,state.dpr);else{dotCanvas.width=Math.round(state.w*state.dpr);dotCanvas.height=Math.round(state.h*state.dpr);dot2d.setTransform(state.dpr,0,0,state.dpr,0,0);}}

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
const settled=()=>reduced.matches;
function introOf(enter){return settled()?null:Math.max(0,state.clock-enter);}
function ambientOf(enter){return settled()?30:Math.max(0,state.clock-enter);}

function draw(force=false){
 if(!state.w||!stories[state.to])return;
 const to=stories[state.to],from=stories[state.from],transition=state.busy&&from!==to,k=ease(state.progress);
 const toFrame=frameFor(to),toSpec=specFor(to),fromSpec=transition?specFor(from):null,fromFrame=transition?frameFor(from):null;
 if(state.bgDirty||transition||force){
  drawBackground(bctx,state.w,state.h,toSpec,toFrame,null);
  if(transition&&k<1){bctx.save();bctx.globalAlpha=1-k;drawBackground(bctx,state.w,state.h,fromSpec,fromFrame,null);bctx.restore();}
  state.bgDirty=transition;
 }
 // dots
 dotBuf.n=0;
 const clip=toFrame.wide?toFrame.clip:null;
 if(transition&&!fromSpec.promo)collectDots(dotBuf,fromSpec,{t:ambientOf(state.fromEnter),intro:null,fade:1-ease(state.progress/.45),frame:fromFrame});
 if(!toSpec.promo)collectDots(dotBuf,toSpec,{t:ambientOf(state.enter),intro:introOf(state.enter),frame:toFrame,from:state.morph});
 if(dotGL)dotGL.draw(dotBuf,{additive:true,clip});
 else if(dot2d){dot2d.clearRect(0,0,state.w,state.h);dot2d.save();if(clip){dot2d.beginPath();dot2d.rect(clip.x,clip.y,clip.w,clip.h);dot2d.clip();}drawDots2D(dot2d,dotBuf);dot2d.restore();}
 // text: only while it animates or after a change
 const intro=introOf(state.enter);
 if(force||state.textDirty||transition||(intro!=null&&intro<TEXT_SETTLE+.2)){
  ctx.clearRect(0,0,state.w,state.h);
  if(transition&&!fromSpec.promo)drawText(ctx,fromFrame,fromSpec,{intro:null,alpha:1-ease(state.progress/.3)});
  if(!toSpec.promo)drawText(ctx,toFrame,toSpec,{intro:transition?Math.max(0,intro-.15):intro});
  state.textDirty=false;
 }
 placeActions(to,toFrame);
}
// Finale: a small popup offers the share card once the numbers have counted up. Dismissed or used, it stays away for this recap.
let promptTimer=0,promptFor=null,promptDismissed=false;
function sharePrompt(s,show){
 const el=$('share-prompt');
 if(!show||promptDismissed){if(promptFor||!el.hidden){clearTimeout(promptTimer);promptFor=null;el.classList.remove('show');el.hidden=true;}return;}
 if(promptFor===s)return;
 promptFor=s;clearTimeout(promptTimer);
 promptTimer=setTimeout(()=>{if(promptFor!==s)return;el.hidden=false;requestAnimationFrame(()=>el.classList.add('show'));},reduced.matches?0:2400);
}
function dismissSharePrompt(){promptDismissed=true;sharePrompt(null,false);}
function placeActions(s,frame){
 const sp=specFor(s),actions=$('card-actions');
 const showShare=!!sp.share&&!s.libraryOnly,showCta=!!sp.cta&&!!s.promotional;
 sharePrompt(s,showShare&&!state.busy);
 $('mini-watt-offer').hidden=!showCta;actions.hidden=!showCta;
 if(actions.hidden)return;
 // The MINI WATT slide is an HTML panel that fills the card area between the chapter row and the footer.
 const b=state.bounds||{top:0,bottom:state.h,left:0,right:state.w};
 actions.style.setProperty('--top',b.top+'px');actions.style.setProperty('--bottom',Math.max(0,state.h-b.bottom)+'px');
 actions.style.setProperty('--left',b.left+'px');actions.style.setProperty('--right',Math.max(0,state.w-b.right)+'px');
 actions.classList.toggle('is-wide',!!frame.wide);
}
function sync(){
 const s=stories[state.index];if(!s)return;const sp=specFor(s);
 $('chapter-name').textContent=s.promotional?'ONE MORE RIDE?':s.libraryOnly?String(s.group).toUpperCase():sp.grp;$('position').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(stories.length).padStart(2,'0')}`;
 document.querySelector('.demo-label').textContent=s.sample?'FICTIONAL SAMPLE · DESIGN PREVIEW':s.libraryOnly?'TEMPLATE · NO PERSONAL DATA':dataset.exampleOnly?'FICTIONAL DATA · DESIGN PREVIEW':dataset.notice.toUpperCase();
 $('edition-year').textContent=s.libraryOnly?'DESIGN LIBRARY':`${dataset.year}${dataset.exampleOnly?' / DEMO':''}`;
 {const [c1,...rest]=s.caption.split('\n'),r=document.createElement('span');r.className='caption-rest';r.textContent=rest.join('\n');$('caption').replaceChildren(c1,...(rest.length?['\n',r]:[]));}$('dot-key').textContent=sp.legend;$('dot-key').hidden=!sp.legend;$('chapter-key').textContent=sp.legend;$('chapter-key').hidden=!sp.legend;$('story-title').textContent=s.title.join(' ');
 $('story-description').textContent=`${s.value.replace('\n',' ')} ${s.unit}. ${s.caption.replace('\n',' ')} ${chartDescription(s.chart)} ${sp.legend?sp.legend.charAt(0).toUpperCase()+sp.legend.slice(1)+'.':''} ${s.sample?'Fictional sample from the dot design. Not a recap result.':s.libraryOnly?'Template. No personal data. '+s.eligibility:dataset.notice}.`;
 stage.classList.toggle('is-promotion',!!s.promotional);
 $('back').disabled=state.index===0;$('advance').setAttribute('aria-label',state.index===stories.length-1?'Choose a share card':'Next story');
 $('share').textContent=state.index===stories.length-1?'Choose a card ↗':'Share card ↗';
 $('motion').textContent=reduced.matches?'Still':state.paused?'Play':'Pause';$('motion').disabled=reduced.matches;$('motion').setAttribute('aria-pressed',String(state.paused));
 const shareable=s.promotional?recap.some(card=>canRequestShare(card,dataset)):canRequestShare(s,dataset);
 $('share').disabled=!shareable;$('share-icon').disabled=!shareable;$('advance').disabled=state.index===stories.length-1&&!shareable;
 [...$('progress').children].forEach((el,i)=>el.className=i===Math.floor(state.index/stories.length*$('progress').children.length)?'current':i<state.index/stories.length*$('progress').children.length?'passed':'');
 document.querySelectorAll('.chapter-tile').forEach((el,i)=>el.setAttribute('aria-current',String(i===state.index)));
 stage.dataset.story=s.id;stage.style.setProperty('--accent',sp.acc);measureBounds();state.textDirty=true;state.bgDirty=true;
}
async function go(index){
 if(state.busy||loadingStory||index<0||index>=stories.length||index===state.index)return;
 const version=viewVersion;loadingStory=true;await ready;if(version!==viewVersion)return;loadingStory=false;
 const from=stories[state.index];
 // the incoming dots fly in from where the outgoing ones are now
 state.morph=reduced.matches||state.paused||specFor(from).promo?null:snapshotDots(specFor(from),{t:ambientOf(state.enter),intro:introOf(state.enter),frame:frameFor(from)});
 state.from=state.index;state.to=index;state.fromEnter=state.enter;state.enter=state.clock;state.elapsed=0;state.duration=900;state.progress=0;state.busy=true;stage.classList.add('transitioning');
 if(reduced.matches||state.paused)finish();
 history.replaceState(null,'','#'+stories[index].id);sync();start();
}
function finish(){state.index=state.to;state.from=state.to;state.progress=1;state.busy=false;if(state.paused||reduced.matches){state.morph=null;state.enter=state.clock-10;}stage.classList.remove('transitioning');sync();draw(true);}
function blocked(){return stage.hidden||document.hidden||$('chapters-dialog').open||$('share-dialog').open||$('privacy-dialog').open||$('health-share-dialog').open;}
function tick(now){
 state.raf=0;if(blocked())return;
 const dt=Math.min(state.last?now-state.last:16,50);state.last=now;
 const moving=!state.paused&&!reduced.matches;
 if(moving)state.clock+=dt/1000;
 if(state.busy){state.elapsed+=dt;state.progress=Math.min(1,state.elapsed/state.duration);if(state.progress===1){finish();state.raf=requestAnimationFrame(tick);return;}}
 // ambient loops settle to ~30 fps once the intro is over
 const intro=state.clock-state.enter;
 if(state.busy||intro<TEXT_SETTLE+.3||now-state.lastDots>=32){state.lastDots=now;draw();}
 if(state.busy||moving)state.raf=requestAnimationFrame(tick);
}
function start(){if(!blocked()&&!state.raf){state.last=0;state.raf=requestAnimationFrame(tick);}}
function stop(){cancelAnimationFrame(state.raf);state.raf=0;}
function measureBounds(){
 if(stage.hidden)return;const r=stage.getBoundingClientRect(),label=stage.querySelector('.chapter-label').getBoundingClientRect(),footer=stage.querySelector('footer').getBoundingClientRect(),pad=parseFloat(getComputedStyle(stage.querySelector('.story-chrome')).paddingLeft);
 // Phones: the card runs edge to edge (it carries its own inner margin).
 const side=r.width<600?0:pad*(r.width>=900?1:.4);
 const b={top:label.bottom-r.top+8,bottom:footer.top-r.top-8,left:side,right:r.width-side};
 const fb=stage.querySelector('.footer-bottom').getBoundingClientRect();
 stage.style.setProperty('--prompt-bottom',Math.max(4,r.width<600?r.bottom-fb.bottom+4:r.bottom-fb.top+10)+'px');
 if(JSON.stringify(b)!==JSON.stringify(state.bounds)){state.bounds=b;state.textDirty=state.bgDirty=true;}
}
function resize(){measureBounds();const r=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);state.w=r.width;state.h=r.height;state.dpr=d;
 for(const c of [canvas,backdrop]){c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);}ctx.setTransform(d,0,0,d,0,0);bctx.setTransform(d,0,0,d,0,0);sizeDots();state.textDirty=state.bgDirty=true;draw(true);}
function closeDialog(id){$(id).close();if(id==='chapters-dialog')$('chapters-button').setAttribute('aria-expanded','false');start();}
function thumbnail(story,width=270){
 const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*16/9);
 const notice=story.sample?'Fictional sample · design preview':story.libraryOnly?'Template · no personal data':dataset.exampleOnly?'Fictional data':dataset.notice;
 renderStill(out.getContext('2d'),out.width,out.height,exportSpec(story.libraryOnly?story:displayFields(story),story,{notice,year:dataset.year}));return out;
}
async function openChapters(){
 if(!devTools||state.busy||loadingStory)return;$('chapters-dialog').showModal();$('chapters-button').setAttribute('aria-expanded','true');
 await ready;page=0;renderGrid();
}
function progressBars(){$('progress').replaceChildren();for(let i=0;i<Math.min(stories.length,24);i++)$('progress').append(document.createElement('span'));}
function activate(s){stories=s.libraryOnly?library:recap;libraryMode=!!s.libraryOnly;state.index=state.from=state.to=stories.indexOf(s);state.progress=1;state.busy=false;state.morph=null;state.enter=state.clock;progressBars();history.replaceState(null,'','#'+s.id);sync();draw(true);closeDialog('chapters-dialog');}
async function renderGrid(){
 const version=++gridVersion,isLibrary=$('library-mode').value==='library',query=$('story-search').value.trim().toLowerCase(),group=$('story-group').value;
 if(isLibrary){try{await ensureLibrary();}catch{$('library-count').textContent='The design library could not load. Try again.';return;}if(version!==gridVersion)return;}
 const items=(isLibrary?library:recap).filter(s=>(!isLibrary||!group||s.group===group)&&(!query||(s.title.join(' ')+' '+s.id+' '+(s.group||'')).toLowerCase().includes(query)));
 const recordedCount=items.filter(s=>!s.promotional).length,samples=items.filter(s=>s.sample).length;
 $('library-count').textContent=recordedCount===0&&items.some(s=>s.promotional)?'A MINI WATT invitation':isLibrary?`${recordedCount-samples} templates · metrics appear only with supporting data${samples?` · ${samples} dot-design previews with fictional sample data`:''}`:`${recordedCount} ${dataset.exampleOnly?'fictional example stories':'verified recorded stories'}${items.some(s=>s.promotional)?' + a MINI WATT invitation':''}`;
 $('story-group').hidden=!isLibrary;$('chapter-grid').replaceChildren();$('more-stories').hidden=(page+1)*12>=items.length;
 for(const s of items.slice(0,(page+1)*12)){
  const button=document.createElement('button');button.type='button';button.className='chapter-tile';button.setAttribute('aria-label',s.title.join(' '));button.setAttribute('aria-current',String(s.id===stories[state.index].id));
  const img=document.createElement('img');img.alt='';const label=document.createElement('span');label.textContent=s.title.join(' ');button.append(img,label);
  if(s.libraryOnly){const detail=document.createElement('small');detail.textContent=s.group+' · '+s.family;button.append(detail);button.title=s.eligibility+' — '+s.claimGuard;}
  button.addEventListener('click',()=>activate(s));$('chapter-grid').append(button);
  await new Promise(r=>setTimeout(r));if(version!==gridVersion)return;img.src=thumbnail(s).toDataURL('image/png');
 }
}
for(const id of ['library-mode','story-group','story-search'])$(id).addEventListener(id==='story-search'?'input':'change',()=>{page=0;renderGrid();});
$('more-stories').addEventListener('click',()=>{page++;renderGrid();});
function resetShareImage(){$('share-saved').textContent='';if(shareURL)URL.revokeObjectURL(shareURL);shareURL=null;shareBlob=null;$('share-preview').removeAttribute('src');$('native-share').hidden=true;$('download').disabled=true;}
function clearShare(){shareVersion++;sharePickerVersion++;if(shareStory)dataset?.shareConsents?.delete(shareStory.id);resetShareImage();shareStory=null;shareColorway='original';$('share-cards').replaceChildren();$('share-colors').replaceChildren();$('share-selection').textContent='';$('share-error').textContent='';$('share-preview-frame').setAttribute('aria-busy','false');}
// display: sanitized display fields (exports) or display fields (previews); source: the in-memory story
function shareCanvas(display,source,width=1080,colorway=shareColorway){
 const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*16/9);
 const notice=source.sample?'Fictional sample · design preview':source.libraryOnly?'Template · no personal data':dataset.exampleOnly?'Fictional data':dataset.notice;
 renderShareCard(out.getContext('2d'),out.width,out.height,{spec:exportSpec(display,source,{notice,year:dataset.year}),colorway});return out;
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
 $('health-share-description').textContent=`${story.title.join(' ').replace(/[.!?]$/,'')}: ${story.value} ${story.unit}. ${story.caption}`;
 try{$('health-share-preview').src=thumbnail(story,432).toDataURL('image/png');$('health-share-preview').alt=`Preview of ${story.title.join(' ')}`;}catch{$('health-share-preview').removeAttribute('src');}
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
  if(story.health&&!dataset.exampleOnly){const note=document.createElement('small');note.textContent='Asks first';button.append(note);}
  button.addEventListener('click',()=>chooseShareCard(story));$('share-cards').append(button);return {story,img};
 });
 syncShareChoices();
 await ready;
 for(const {story,img} of previews){await new Promise(r=>setTimeout(r));if(version!==sharePickerVersion||!$('share-dialog').open)return;img.src=shareCanvas(story.libraryOnly?story:displayFields(story),story,180,'original').toDataURL('image/png');}
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
 document.querySelector('.share-note').textContent=story.sample?'1080 × 1920 · fictional sample · design preview':story.libraryOnly?'1080 × 1920 · template · no personal data':dataset.exampleOnly?'1080 × 1920 · fictional data':'1080 × 1920 · only this card’s metric and caption';
 try{
  await ready;if(version!==shareVersion||!$('share-dialog').open)return;
  const safe=sanitizedCard(story,dataset),out=shareCanvas(safe,story);
  const blob=await encodeShareCanvas(out,version);if(!blob)throw Error('Image encoding failed');
  if(version!==shareVersion||!$('share-dialog').open)return;
  shareBlob=blob;shareURL=URL.createObjectURL(blob);$('share-preview').src=shareURL;$('share-preview').alt=`${story.title.join(' ')} — ${shareColorways.find(c=>c.id===shareColorway).label} share card`;$('download').disabled=false;
  const file=new File([blob],filename(),{type:'image/png'});$('native-share').hidden=!(navigator.canShare&&navigator.canShare({files:[file]}));
 }catch{if(version===shareVersion)$('share-error').textContent='The card could not be created. Choose a card or color to try again.';}
 finally{if(version===shareVersion)$('share-preview-frame').setAttribute('aria-busy','false');}
}
function filename(){return `garmin-wraped-${dataset.year}-${shareStory?.id||stories[state.index].id}${shareColorway==='original'?'':'-'+shareColorway}${dataset.exampleOnly?'-fictional-demo':''}.png`;}
$('download').addEventListener('click',()=>{if(!shareURL||!canShare(shareStory,dataset))return;const a=document.createElement('a');a.href=shareURL;a.download=filename();document.body.append(a);a.click();a.remove();$('share-saved').textContent=`Saved to your device · ${a.download}`;});
$('native-share').addEventListener('click',async()=>{if(!shareBlob||!canShare(shareStory,dataset))return;try{await navigator.share({files:[new File([shareBlob],filename(),{type:'image/png'})],title:'My Garmin Wraped · a MINI WATT product ⚡️'});}catch(e){if(e.name!=='AbortError')$('share-error').textContent='Sharing is unavailable here. You can download the PNG instead.';}});
// On phones Back and Next are invisible tap zones over the card; a swipe that starts on them must not also tap.
let swipedAt=0;const swiped=()=>performance.now()-swipedAt<450;
$('advance').addEventListener('click',()=>{if(swiped())return;state.index===stories.length-1?openShare():go(state.index+1);});
$('back').addEventListener('click',()=>{if(!swiped())go(state.index-1);});$('share').addEventListener('click',openShare);$('share-icon').addEventListener('click',openShare);$('finale-share').addEventListener('click',()=>{dismissSharePrompt();openShare();});$('share-prompt-close').addEventListener('click',dismissSharePrompt);
$('motion').addEventListener('click',()=>{state.paused=!state.paused;if(state.paused&&state.busy)finish();sync();draw(true);start();});
// Tap a progress segment to jump to its story. With more stories than segments, a segment opens the first story it covers.
$('progress').addEventListener('click',e=>{const bar=$('progress'),seg=e.target.closest('#progress>span');if(!seg)return;const n=bar.children.length,i=[...bar.children].indexOf(seg);go(Math.ceil(i*stories.length/n));});
$('chapters-button').addEventListener('click',openChapters);$('close-chapters').addEventListener('click',()=>closeDialog('chapters-dialog'));$('close-share').addEventListener('click',()=>closeDialog('share-dialog'));
stage.querySelector('.brand-name').addEventListener('click',async e=>{e.preventDefault();if(libraryMode){activate(recap[0]);$('library-mode').value='recap';}else go(0);});
for(const id of ['chapters-dialog','share-dialog','privacy-dialog','health-share-dialog']){$(id).addEventListener('close',()=>{$('chapters-button').setAttribute('aria-expanded','false');start();});$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(id);}});}
document.addEventListener('keydown',e=>{if(stage.hidden||$('chapters-dialog').open||$('share-dialog').open||$('privacy-dialog').open||$('health-share-dialog').open||e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();go(state.index+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(state.index-1);}});
let touchStart=null;
stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('a,button:not(#back):not(#advance)'))return;touchStart={x:e.clientX,y:e.clientY};});
stage.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){swipedAt=performance.now();go(state.index+(dx<0?1:-1));}});
stage.addEventListener('pointercancel',()=>touchStart=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
reduced.addEventListener('change',()=>{state.paused=reduced.matches;if(state.busy)finish();sync();draw(true);start();});
window.addEventListener('hashchange',()=>{const i=stories.findIndex(s=>s.id===location.hash.slice(1));if(i>=0)go(i);});
const layoutObserver=new ResizeObserver(resize);for(const element of [stage,stage.querySelector('footer'),stage.querySelector('.chapter-label')])layoutObserver.observe(element);

export async function prepareRecap({demo=false,deepLink=false,data=null}={}) {
 viewVersion++;gridVersion++;clearShare();
 if((demo&&data)||(!demo&&!data))throw Error('Connect to Garmin to build your recap, or explicitly choose the fictional demo.');
 if(demo)demoDataset ||= (await import('./sample-data.mjs')).dataset;
 dataset=demo?{...demoDataset,shareConsents:new Set()}:datasetFromPlan(data);recap=recapSequence(dataset);
 if(!recap.length)throw Error('No supported activities were recorded for this year. Choose another year.');
 specCache.clear();frameCache.clear();context=recapContext(recap);
 stories=recap;libraryMode=false;state.index=state.from=state.to=0;state.progress=1;state.busy=false;state.morph=null;loadingStory=false;
 if(demo&&deepLink&&location.hash.startsWith('#template-')||demo&&deepLink&&location.hash.startsWith('#sample-')){await ensureLibrary();stories=library;libraryMode=true;}
 if(deepLink){const initial=stories.findIndex(s=>s.id===location.hash.slice(1));if(initial>=0)state.index=state.from=state.to=initial;}
 stage.classList.remove('transitioning');$('library-mode').value=libraryMode?'library':'recap';
 $('library-mode').options[0].textContent=dataset.exampleOnly?'The example recap':'My recorded year';progressBars();
 await ready;if(!dotCanvas)mountDotLayer();
}
export function revealRecap(){history.replaceState(null,'','#'+stories[state.index].id);document.querySelector('meta[name="theme-color"]').content='#0B1222';state.enter=state.clock;sync();resize();start();}
export function clearRecap(){viewVersion++;gridVersion++;stop();loadingStory=false;clearShare();dataset=null;recap=[];stories=recap;context={};specCache.clear();frameCache.clear();$('mini-watt-offer').hidden=true;sharePrompt(null,false);promptDismissed=false;$('card-actions').hidden=true;stage.classList.remove('is-promotion');state.index=state.from=state.to=0;state.busy=false;state.progress=1;state.morph=null;ctx.clearRect(0,0,state.w,state.h);bctx.clearRect(0,0,state.w,state.h);if(dotGL){dotBuf.n=0;dotGL.draw(dotBuf);}else dot2d?.clearRect(0,0,state.w,state.h);$('chapter-grid').replaceChildren();$('story-title').textContent='Your year in motion';$('story-description').textContent='';$('caption').textContent='';$('coverage-details').replaceChildren();$('health-share-description').textContent='';}
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
$('health-share-dialog').addEventListener('close',()=>{$('health-share-description').textContent='';$('health-share-preview').removeAttribute('src');$('health-share-preview').alt='';});
$('share-back').addEventListener('click',()=>closeDialog('share-dialog'));
$('chapters-share').addEventListener('click',()=>{closeDialog('chapters-dialog');openShare();});
// Release GPU resources when the page goes away.
window.addEventListener('pagehide',()=>{stop();dotGL?.dispose();});
void SAMPLE_GROUPS;
