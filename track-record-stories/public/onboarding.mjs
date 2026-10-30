import {collectRecap,api} from './importer.mjs';
import {validatePeriod} from './metrics.mjs';
const $=id=>document.getElementById(id),shell=$('onboarding'),stage=$('story'),key=$('api-key'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const field=window.GWField?.get()||null;
// The fictional demo exists only in dev builds; production HTML ships without its controls.
const DEMO=!!$('demo-start');
let run=0,motionPaused=reduced.matches,app,controller,lastWasDemo=false,lastDeepLink=false;
$('entry-edition').textContent=`Your year · ${new Date().getFullYear()}`;

/* ---------- connect: the card visuals play in turn beside the form ---------- */
function showReelStep(k,step){
  const label=$('reel-label'),dots=$('reel-steps');if(!label||!dots||!step)return;
  label.textContent=step.label;label.style.color=step.acc;
  [...dots.children].forEach((dot,i)=>{dot.classList.toggle('is-on',i===k);dot.style.setProperty('--c',i===k?step.acc:'');});
}
if(field)import('./entry-reel.mjs').then(({createReel})=>{
  const reel=createReel({onStep:showReelStep});
  $('reel-steps').replaceChildren(...reel.steps.map(()=>document.createElement('i')));
  field.useReel(reel);
}).catch(()=>{});

/* ---------- loading progress: the importer's own messages drive the steps and the dots ---------- */
// Each dot on the globe stands for one activity found (up to the globe's 572 dots).
const DOTS=572;
const IMPORT_STEPS=[
  {label:'Connecting securely to Garmin',match:/^Connecting/},
  {label:'Reading activity records',match:/^Reading activity records/},
  {label:'Reading recorded daily summaries',match:/^Reading recorded daily/},
  {label:'Reading recorded sleep',match:/^Reading recorded sleep/},
  {label:'Reading recorded HRV',match:/^Reading recorded HRV/},
  {label:'Checking coverage and building your story',match:/^Checking coverage/}
];
const DEMO_STEPS=[{label:'Getting the example ready'},{label:'Placing 572 fictional activities'},{label:'Building your story'}];
let steps=[],stepIndex=0,found=0,countTimer=0;
function renderSteps(failed=false){
  const list=$('loading-steps');
  if(list.children.length!==steps.length)list.replaceChildren(...steps.map(()=>{const li=document.createElement('li'),label=document.createElement('span'),detail=document.createElement('span');detail.className='gw-step-detail';li.append(label,detail);return li;}));
  steps.forEach((step,i)=>{
    const li=list.children[i];li.dataset.state=failed&&i===stepIndex?'failed':i<stepIndex?'done':i===stepIndex?'current':'pending';
    li.firstChild.textContent=step.label;li.lastChild.textContent=failed&&i===stepIndex?'stopped':i<=stepIndex?step.detail||'':'';
  });
  $('loading-meter').style.width=failed?$('loading-meter').style.width:`${Math.min(100,(stepIndex+.5)/steps.length*100).toFixed(1)}%`;
}
function setCount(n,{demo=false}={}){
  found=n;$('loading-count').textContent=n.toLocaleString('en-US');
  $('loading-count-label').textContent=`${demo?'fictional ':''}${n===1?'activity':'activities'} found`;
  field?.fill(Math.min(1,n/DOTS));
}
function onProgress(message){
  const i=IMPORT_STEPS.findIndex(s=>s.match.test(message));
  if(i>=0&&i>=stepIndex){
    stepIndex=i;
    const received=message.match(/(\d[\d,]*) received/),month=message.match(/month (\d+) of (\d+)/);
    if(received){const n=Number(received[1].replace(/,/g,''));steps[1].detail=`${n.toLocaleString('en-US')} received`;setCount(n);}
    if(month)steps[i].detail=`month ${month[1]} of ${month[2]}`;
    renderSteps();
  }
  $('loading-status').textContent=message;
}
function startDemoCount(){
  // The demo year has 572 fictional activities; count them onto the globe.
  clearInterval(countTimer);const t0=performance.now(),total=572,still=motionPaused||reduced.matches;
  if(still){setCount(total,{demo:true});stepIndex=2;renderSteps();return;}
  stepIndex=1;renderSteps();
  countTimer=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/1400),e=1-Math.pow(1-k,3);setCount(Math.round(e*total),{demo:true});if(k>=1){clearInterval(countTimer);stepIndex=2;renderSteps();}},60);
}
function loadingCopy(failed){
  $('loading-kicker').textContent=failed?'Import stopped · nothing saved':'02 · Finding the highlights';
  $('loading-line-one').textContent=failed?'Let’s try':'Good things';$('loading-line-two').textContent=failed?'that again':'take motion';
  // Restart the headline rise.
  for(const line of $('loading-title').querySelectorAll('.gw-line>span')){line.style.animation='none';void line.offsetWidth;line.style.animation='';}
}

function resetKey(){key.value='';key.type='password';key.removeAttribute('aria-invalid');$('toggle-key').textContent='Show';$('toggle-key').setAttribute('aria-label','Show API key');$('toggle-key').setAttribute('aria-pressed','false');$('key-error').textContent='';}
function syncMotion(){
  const paused=motionPaused||reduced.matches;
  shell.classList.toggle('motion-paused',paused||document.hidden);
  $('loading-pause').textContent=reduced.matches?'Reduced motion':motionPaused?'Play motion':'Pause motion';
  $('loading-pause').disabled=reduced.matches;
  $('loading-pause').setAttribute('aria-pressed',String(paused));
  $('entry-motion').setAttribute('aria-pressed',String(paused));
  $('entry-motion').setAttribute('aria-label',reduced.matches?'Homepage animation disabled for reduced motion':paused?'Play homepage animation':'Pause homepage animation');
  $('entry-motion').disabled=reduced.matches;
  field?.setPaused(paused);
}
async function disconnect(){try{await api('disconnect');}catch{}}
function showConnect(focus=true){
  run++;controller?.abort();controller=null;clearInterval(countTimer);resetKey();key.value=key.defaultValue;app?.clearRecap();
  for(const id of ['key-help-dialog','chapters-dialog','share-dialog','privacy-dialog','health-share-dialog'])$(id).close();
  stage.inert=true;stage.hidden=true;shell.hidden=false;shell.classList.remove('is-loading','loading-failed');$('connect-screen').hidden=false;$('loading-screen').hidden=true;$('entry-footer').hidden=false;document.body.classList.add('onboarding-active');
  field?.show(true);field?.fill(1);field?.to({anchor:$('connect-orb'),gather:1,alpha:1,spin:.16,mode:'reel'},900);
  history.replaceState(null,'','#connect');window.scrollTo(0,0);if(focus)key.focus({preventScroll:true});disconnect();
}
async function start({demo=false,deepLink=false,credential=''}={}){
  controller?.abort();controller=new AbortController();const signal=controller.signal,currentRun=++run;
  lastWasDemo=demo;lastDeepLink=deepLink;resetKey();$('key-help-dialog').close();clearInterval(countTimer);
  stage.inert=true;stage.hidden=true;shell.hidden=false;shell.classList.add('is-loading');shell.classList.remove('loading-failed');$('connect-screen').hidden=true;$('loading-screen').hidden=false;$('loading-retry').hidden=true;$('entry-footer').hidden=true;
  steps=(demo?DEMO_STEPS:IMPORT_STEPS).map(s=>({label:s.label,detail:''}));stepIndex=0;loadingCopy(false);setCount(0,{demo});$('loading-meter').style.width='0%';renderSteps();
  $('loading-status').textContent=demo?'Getting the example ready…':'Connecting securely to Garmin…';$('loading-mode').textContent=demo?'Fictional data · demo preview':'Your recorded year · private session';
  field?.show(true);field?.to({anchor:$('loading-orb'),gather:1,alpha:1,spin:.22,mode:'globe'},900);
  window.scrollTo(0,0);$('loading-title').focus({preventScroll:true});syncMotion();
  if(demo)startDemoCount();
  const activeController=controller;const deadline=setTimeout(()=>activeController.abort(),300000);
  try{
    const period=demo?null:validatePeriod(new Date().getFullYear(),Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
    const data=demo?null:await collectRecap({key:credential,year:period.year,timeZone:period.timeZone,signal,onProgress:message=>{if(currentRun===run)onProgress(message);}});
    credential='';signal.throwIfAborted();app ||= await import('./app.mjs');
    await app.prepareRecap({demo,deepLink:demo&&deepLink,data});signal.throwIfAborted();if(currentRun!==run)return;
    clearInterval(countTimer);shell.hidden=true;stage.hidden=false;stage.inert=false;document.body.classList.remove('onboarding-active');field?.show(false);app.revealRecap();$('story-title').tabIndex=-1;$('story-title').focus({preventScroll:true});
  }catch(e){
    credential='';if(currentRun!==run)return;app?.clearRecap();clearInterval(countTimer);
    $('loading-status').textContent=e.name==='AbortError'?'The import timed out. No recap was saved. Return and reconnect.':e.message||'The recap could not load. Please try again.';
    shell.classList.add('loading-failed');loadingCopy(true);renderSteps(true);field?.to({alpha:.4,spin:.04},700);
    $('loading-count-label').textContent=`${demo?'fictional ':''}${found===1?'activity':'activities'} before it stopped`;
    $('loading-retry').hidden=false;$('loading-retry').textContent=demo?'Try the demo again ↗':'Return & reconnect ↗';
  }finally{credential='';clearTimeout(deadline);}
}
$('api-form').addEventListener('submit',event=>{
  event.preventDefault();
  try{if(!key.value.trim())throw Error(DEMO?'Paste your Garmin Personal API key, or try the demo without one.':'Paste your Garmin Personal API key.');const credential=key.value.trim();start({credential});}
  catch(e){key.removeAttribute('aria-invalid');void key.parentElement.offsetWidth;key.setAttribute('aria-invalid','true');$('key-error').textContent=e.message;key.focus();}
});
key.addEventListener('input',()=>{key.removeAttribute('aria-invalid');$('key-error').textContent='';});
$('toggle-key').addEventListener('click',()=>{const show=key.type==='password';key.type=show?'text':'password';$('toggle-key').textContent=show?'Hide':'Show';$('toggle-key').setAttribute('aria-label',show?'Hide API key':'Show API key');$('toggle-key').setAttribute('aria-pressed',String(show));});
$('key-help').addEventListener('click',()=>$('key-help-dialog').showModal());$('close-key-help').addEventListener('click',()=>$('key-help-dialog').close());
$('help-done').addEventListener('click',()=>{$('key-help-dialog').close();key.focus();});
if(DEMO){$('demo-start').addEventListener('click',()=>start({demo:true,deepLink:true}));$('help-demo').addEventListener('click',()=>start({demo:true,deepLink:true}));}
$('loading-cancel').addEventListener('click',()=>showConnect());$('loading-retry').addEventListener('click',()=>lastWasDemo?start({demo:true,deepLink:lastDeepLink}):showConnect());
for(const id of ['loading-pause','entry-motion'])$(id).addEventListener('click',()=>{motionPaused=!motionPaused;syncMotion();});$('restart-onboarding').addEventListener('click',()=>showConnect());
$('privacy-open').addEventListener('click',()=>{$('coverage-details').replaceChildren();$('privacy-dialog').showModal();});
for(const id of ['close-privacy','privacy-done'])$(id).addEventListener('click',()=>$('privacy-dialog').close());$('privacy-clear').addEventListener('click',()=>showConnect());
document.querySelector('.gw-header .brand-name').addEventListener('click',e=>{e.preventDefault();showConnect();});
document.addEventListener('visibilitychange',syncMotion);reduced.addEventListener('change',()=>{motionPaused=reduced.matches;syncMotion();});
window.addEventListener('pagehide',()=>{run++;controller?.abort();resetKey();app?.clearRecap();fetch('/api/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'same-origin',keepalive:true}).catch(()=>{});});
syncMotion();if(DEMO&&location.hash&&location.hash!=='#connect'){
  const notice=document.createElement('p');notice.id='reconnect-notice';notice.className='help-preview-note';notice.setAttribute('role','status');notice.textContent='Your private recap is cleared when you leave or reload. Reconnect to see your Garmin data, or choose the fictional demo below.';$('api-form').before(notice);
}
