import {buildRecap} from './metrics.mjs';
export class ImportError extends Error{constructor(message,code){super(message);this.code=code;}}
export async function api(path,data={},signal){
  let response;try{response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'same-origin',cache:'no-store',signal});}catch(e){if(e.name==='AbortError')throw e;throw new ImportError('The connection was interrupted. Check your network and try again.','NETWORK');}
  let value;try{value=await response.json();}catch{throw new ImportError('Your sign-in may have expired. Reload this page and try again.','BAD_RESPONSE');}
  if(!response.ok)throw new ImportError(value.error?.message||'The request failed. Please try again.',value.error?.code);
  return value;
}
export async function collectRecap({key,year,timeZone,includeSteps=true,includeHealth=true,signal,onProgress=()=>{}}){
  const activities=[],daily=[],sleep=[],hrv=[],warnings=[];let complete=false,start=0;
  try{
    onProgress('Connecting securely to Garmin…');await api('connect',{key},signal);key='';
    for(let page=0;page<204;page++){
      signal?.throwIfAborted();onProgress(`Reading activity records… ${activities.length} received`);
      const p=await api('activities',{year,timeZone,start},signal);
      if(!Array.isArray(p.activities))throw new ImportError('The activity response was incomplete.','DATA');
      if(p.activities.length&&activities.some(a=>a.id===p.activities[0].id))throw new ImportError('Garmin repeated an activity page. Try the import again.','PAGINATION');
      activities.push(...p.activities);
      if(p.complete){complete=true;break;}
      if(!Number.isInteger(p.next)||p.next<=start||activities.length>20000)throw new ImportError('The import exceeds the supported limit of 20,000 activities.','LIMIT');start=p.next;
    }
    if(!complete)throw new ImportError('The complete activity list could not be fetched. No annual totals were generated.','INCOMPLETE');
    if(includeSteps||includeHealth){
      onProgress('Reading recorded daily summaries…');
      try{daily.push(...(await api('wellness',{year,includeHealth},signal)).daily);}catch(e){if(e.name==='AbortError'||e.code==='GARMIN_AUTH'||e.code==='SESSION_EXPIRED')throw e;warnings.push('Daily movement and wellness were unavailable. These stories were omitted.'+(e.code==='GARMIN_TLS'?' A secure source connection failed. Try importing again later.':''));}
    }
    if(includeHealth){
      const today=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone,year:'numeric',month:'numeric'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
      const last=year===Number(today.year)?Number(today.month):12;
      for(let month=1;month<=last;month++){
        onProgress(`Reading recorded sleep… month ${month} of ${last}`);
        try{sleep.push(...(await api('sleep',{year,month},signal)).sleep);}catch(e){if(e.name==='AbortError'||e.code==='GARMIN_AUTH'||e.code==='SESSION_EXPIRED')throw e;warnings.push('Sleep history was incomplete. Sleep stories were omitted.'+(e.code==='GARMIN_TLS'?' A secure source connection failed. Try importing again later.':''));sleep.length=0;break;}
      }
      for(let month=1;month<=last;month++){
        onProgress(`Reading recorded HRV… month ${month} of ${last}`);
        try{const result=await api('hrv',{year,month},signal);if(!Array.isArray(result.hrv))throw new ImportError('The HRV response was incomplete.','DATA');hrv.push(...result.hrv);}
        catch(e){if(e.name==='AbortError'||e.code==='GARMIN_AUTH'||e.code==='SESSION_EXPIRED')throw e;warnings.push('HRV history was unavailable or incomplete. HRV stories were omitted.'+(e.code==='GARMIN_TLS'?' A secure source connection failed. Try importing again later.':''));hrv.length=0;break;}
      }
    }
    onProgress('Checking coverage and building your story…');
    return buildRecap({year,timeZone,activities,daily:includeSteps?daily:daily.map(({steps,floors,...d})=>d),sleep,hrv,indexComplete:complete,includeHealth,warnings});
  }finally{
    key='';activities.length=0;daily.length=0;sleep.length=0;hrv.length=0;
    // No recurring connection is needed: clear the token cookie after each import.
    try{await api('disconnect',{});}catch{}
  }
}
