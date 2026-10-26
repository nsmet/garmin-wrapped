import {collectRecap,api} from './importer.mjs';
import {validatePeriod} from './metrics.mjs';
const $=id=>document.getElementById(id),shell=$('onboarding'),stage=$('story'),key=$('api-key'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let run=0,motionPaused=reduced.matches,app,controller,lastWasDemo=true,lastDeepLink=false;
function resetKey(){key.value='';key.type='password';key.removeAttribute('aria-invalid');$('toggle-key').textContent='Show';$('toggle-key').setAttribute('aria-label','Show API key');$('toggle-key').setAttribute('aria-pressed','false');$('key-error').textContent='';}
function syncMotion(){shell.classList.toggle('motion-paused',motionPaused||reduced.matches||document.hidden);$('loading-pause').textContent=reduced.matches?'Reduced motion':motionPaused?'Play motion':'Pause motion';$('loading-pause').disabled=reduced.matches;$('loading-pause').setAttribute('aria-pressed',String(motionPaused||reduced.matches));}
async function disconnect(){try{await api('disconnect');}catch{}}
function showConnect(focus=true){
  run++;controller?.abort();controller=null;resetKey();key.value=key.defaultValue;app?.clearRecap();
  for(const id of ['key-help-dialog','chapters-dialog','share-dialog','privacy-dialog','health-share-dialog'])$(id).close();
  stage.inert=true;stage.hidden=true;shell.hidden=false;shell.classList.remove('is-loading','loading-failed');$('connect-screen').hidden=false;$('loading-screen').hidden=true;$('entry-footer').hidden=false;document.body.classList.add('onboarding-active');document.querySelector('meta[name="theme-color"]').content='#f3f0e8';history.replaceState(null,'','#connect');window.scrollTo(0,0);if(focus)key.focus({preventScroll:true});disconnect();
}
async function start({demo=false,deepLink=false,credential=''}={}){
  controller?.abort();controller=new AbortController();const signal=controller.signal,currentRun=++run;
  lastWasDemo=demo;lastDeepLink=deepLink;resetKey();$('key-help-dialog').close();
  stage.inert=true;stage.hidden=true;shell.hidden=false;shell.classList.add('is-loading');shell.classList.remove('loading-failed');$('connect-screen').hidden=true;$('loading-screen').hidden=false;$('loading-retry').hidden=true;$('entry-footer').hidden=true;
  $('loading-status').textContent=demo?'Getting the example ready…':'Connecting securely to Garmin…';document.querySelector('.loading-bottom-row>span').textContent=demo?'FICTIONAL DATA · DEMO PREVIEW':'YOUR RECORDED YEAR · PRIVATE SESSION';document.querySelector('meta[name="theme-color"]').content='#1743ed';window.scrollTo(0,0);$('loading-title').focus({preventScroll:true});syncMotion();
  const activeController=controller;const deadline=setTimeout(()=>activeController.abort(),300000);
  try{
    const period=demo?null:validatePeriod(new Date().getFullYear(),Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
    const data=demo?null:await collectRecap({key:credential,year:period.year,timeZone:period.timeZone,signal,onProgress:message=>{if(currentRun===run)$('loading-status').textContent=message;}});
    credential='';signal.throwIfAborted();app ||= await import('./app.mjs');
    await app.prepareRecap({demo,deepLink:demo&&deepLink,data});signal.throwIfAborted();if(currentRun!==run)return;
    shell.hidden=true;stage.hidden=false;stage.inert=false;document.body.classList.remove('onboarding-active');app.revealRecap();$('story-title').tabIndex=-1;$('story-title').focus({preventScroll:true});
  }catch(e){
    credential='';if(currentRun!==run)return;app?.clearRecap();
    $('loading-status').textContent=e.name==='AbortError'?'The import timed out. No recap was saved. Return and reconnect.':e.message||'The recap could not load. Please try again.';
    shell.classList.add('loading-failed');$('loading-retry').hidden=false;$('loading-retry').textContent=demo?'Try the demo again ↗':'Return & reconnect ↗';
  }finally{credential='';clearTimeout(deadline);}
}
$('api-form').addEventListener('submit',event=>{
  event.preventDefault();
  try{if(!key.value.trim())throw Error('Paste your Garmin Personal API key, or try the demo without one.');const credential=key.value.trim();start({credential});}
  catch(e){key.setAttribute('aria-invalid','true');$('key-error').textContent=e.message;key.focus();}
});
key.addEventListener('input',()=>{key.removeAttribute('aria-invalid');$('key-error').textContent='';});
$('toggle-key').addEventListener('click',()=>{const show=key.type==='password';key.type=show?'text':'password';$('toggle-key').textContent=show?'Hide':'Show';$('toggle-key').setAttribute('aria-label',show?'Hide API key':'Show API key');$('toggle-key').setAttribute('aria-pressed',String(show));});
$('key-help').addEventListener('click',()=>$('key-help-dialog').showModal());$('close-key-help').addEventListener('click',()=>$('key-help-dialog').close());
$('demo-start').addEventListener('click',()=>start({demo:true,deepLink:true}));$('help-demo').addEventListener('click',()=>start({demo:true,deepLink:true}));
$('loading-cancel').addEventListener('click',()=>showConnect());$('loading-retry').addEventListener('click',()=>lastWasDemo?start({demo:true,deepLink:lastDeepLink}):showConnect());
$('loading-pause').addEventListener('click',()=>{motionPaused=!motionPaused;syncMotion();});$('restart-onboarding').addEventListener('click',()=>showConnect());
$('privacy-open').addEventListener('click',()=>{$('coverage-details').replaceChildren();$('privacy-dialog').showModal();});$('close-privacy').addEventListener('click',()=>$('privacy-dialog').close());$('privacy-clear').addEventListener('click',()=>showConnect());
 document.querySelector('.entry-header .brand-name').addEventListener('click',e=>{e.preventDefault();showConnect();});
document.addEventListener('visibilitychange',syncMotion);reduced.addEventListener('change',()=>{motionPaused=reduced.matches;syncMotion();});
window.addEventListener('pagehide',()=>{run++;controller?.abort();resetKey();app?.clearRecap();fetch('/api/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'same-origin',keepalive:true}).catch(()=>{});});
syncMotion();if(location.hash&&location.hash!=='#connect'){
  const notice=document.createElement('p');notice.id='reconnect-notice';notice.className='help-preview-note';notice.setAttribute('role','status');notice.textContent='Your private recap is cleared when you leave or reload. Reconnect to see your Garmin data, or choose the fictional demo below.';$('api-form').before(notice);
}
