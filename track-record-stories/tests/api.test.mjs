import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi,seal,unseal,secureResponse} from '../server/api.mjs';
import {exchangeKey,activityPage,garmin} from '../server/garmin.mjs';
const secret='x'.repeat(43),env={SESSION_SECRET:secret,GARMIN_MODE:'personal'};
const token='a.b.c';
function request(path,data={},headers={}){return new Request('https://mini.test/api/'+path,{method:'POST',headers:{Origin:'https://mini.test','Content-Type':'application/json','oai-authenticated-user-id':crypto.randomUUID(),...headers},body:JSON.stringify(data)});}
test('Current Garmin plain-text JWT authentication is supported',async()=>{const result=await exchangeKey('not-a-real-key-123',{fetcher:async(url,init)=>{assert.ok(url.startsWith('https://personal.connectapi.garmin.com/'));assert.equal(init.headers.Authorization,'ApiKey not-a-real-key-123');return new Response(token);}});assert.equal(result,token);});
test('Authentication uses Worker-compatible manual redirects and disables fetch caching',async()=>{
  let calls=0;
  const result=await exchangeKey('not-a-real-key-123',{fetcher:async(url,init)=>{
    calls++;assert.equal(init.redirect,'manual');assert.equal(init.cache,'no-store');return new Response(token);
  }});
  assert.equal(result,token);assert.equal(calls,1);
});
test('Redirects never forward credentials and are rejected without retries',async()=>{
  let calls=0;
  await assert.rejects(()=>exchangeKey('not-a-real-key-123',{fetcher:async(url,init)=>{
    calls++;assert.equal(init.redirect,'manual');return new Response('',{status:302,headers:{Location:'https://untrusted.example/token'}});
  }}),e=>e.code==='GARMIN_REDIRECT');
  assert.equal(calls,1);
});
test('Sessions are encrypted, bound to the user, expire and reject tampering',async()=>{const sealed=await seal({user:'u',token,exp:Date.now()+1000},secret);assert.ok(!sealed.includes(token));assert.equal((await unseal(sealed,secret,'u')).token,token);await assert.rejects(()=>unseal(sealed,secret,'other'));await assert.rejects(()=>unseal(sealed,secret,'u',Date.now()+2000));await assert.rejects(()=>unseal(sealed+'corrupt',secret,'u'));});
test('API requires platform identity and rejects cross-origin and oversized input',async()=>{const anon=request('connect');anon.headers.delete('oai-authenticated-user-id');assert.equal((await handleApi(anon,env,{log(){}})).status,401);assert.equal((await handleApi(request('connect',{}, {Origin:'https://evil.test'}),env,{log(){}})).status,403);assert.equal((await handleApi(request('connect',{key:'k'.repeat(9000)}),env,{log(){}})).status,413);});
test('Personal integration is disabled by default and can be restricted to one owner',async()=>{assert.equal((await handleApi(request('connect'),{}, {log(){}})).status,503);assert.equal((await handleApi(request('connect'),{...env,PERSONAL_OWNER_ID:'another'}, {log(){}})).status,403);});
test('Token never enters response JSON; cookie is secure, HttpOnly and short lived',async()=>{const r=await handleApi(request('connect',{key:'not-a-real-key-123'}),env,{fetcher:async()=>new Response(token),log(){}});assert.equal(r.status,200);assert.ok(!(await r.text()).includes(token));const c=r.headers.get('Set-Cookie');for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=1200'])assert.ok(c.includes(flag));});
test('Disconnect clears the connection cookie',async()=>{const r=await handleApi(request('disconnect'),env);assert.equal(r.status,200);assert.match(r.headers.get('Set-Cookie'),/Max-Age=0/);});
test('401 is not retried and log output contains no upstream text or credential',async()=>{let calls=0,logs=[];const r=await handleApi(request('connect',{key:'not-a-real-key-123'}),env,{fetcher:async()=>{calls++;return new Response('private upstream information',{status:401});},log:s=>logs.push(s)});assert.equal(calls,1);assert.equal(r.status,401);assert.ok(!JSON.stringify(logs).includes('not-a-real-key'));assert.ok(!JSON.stringify(logs).includes('private upstream'));});
test('Transient errors are retried with a bounded wait; 403 is never retried',async()=>{let calls=0,waits=[];await garmin('/test',{token,fetcher:async()=>++calls===1?new Response('',{status:429,headers:{'Retry-After':'1000'}}):Response.json([]),sleep:async ms=>waits.push(ms)});assert.equal(calls,2);assert.deepEqual(waits,[5000]);calls=0;await assert.rejects(()=>garmin('/test',{token,fetcher:async()=>{calls++;return new Response('',{status:403});}}));assert.equal(calls,1);});
test('Pagination advances by returned count and completes only on an empty page',async()=>{const row={activityId:1,startTimeGMT:'2025-01-01 10:00:00',activityType:{typeKey:'running'}};const p=await activityPage({year:2025,timeZone:'UTC',start:0},{token,fetcher:async url=>{assert.match(url,/excludeChildren=true/);assert.match(url,/2024-12-31/);return Response.json([row]);}});assert.equal(p.next,1);assert.equal(p.complete,false);const end=await activityPage({year:2025,timeZone:'UTC',start:1},{token,fetcher:async()=>Response.json([])});assert.equal(end.complete,true);});
test('Health fields are removed from daily summaries when health was not requested',async()=>{const user='owner',cookie=await seal({user,token,exp:Date.now()+10000},secret);const r=await handleApi(request('wellness',{year:2025,includeHealth:false},{'oai-authenticated-user-id':user,Cookie:'__Host-mini-session='+cookie}),env,{fetcher:async()=>Response.json({data:[{calendarDate:'2025-01-01',includesWellnessData:true,movement:{steps:{value:1}},heartRate:{restingValue:50}}]}),log(){}});const d=await r.json();assert.equal(d.daily[0].steps,1);assert.ok(!('restingHR' in d.daily[0]));});
test('Security policy prevents external script and network exfiltration',()=>{const r=secureResponse(new Response('ok'));assert.match(r.headers.get('Content-Security-Policy'),/connect-src 'self'/);assert.match(r.headers.get('Content-Security-Policy'),/script-src 'self'/);assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');});
test('An upstream rejection logs its HTTP status without its body or credential',async()=>{
 const logs=[];
 const response=await handleApi(request('connect',{key:'not-a-real-key-123'}),env,{fetcher:async()=>new Response('private upstream body',{status:400}),log:s=>logs.push(JSON.parse(s))});
 assert.equal(response.status,502);assert.equal(logs[0].upstreamStatus,400);assert.ok(!JSON.stringify(logs).includes('private upstream'));assert.ok(!JSON.stringify(logs).includes('not-a-real-key'));
});
test('Upstream certificate failures keep TLS validation intact and return a specific retryable error',async()=>{
 let calls=0;
 await assert.rejects(()=>exchangeKey('not-a-real-key-123',{fetcher:async(url,init)=>{calls++;assert.ok(url.startsWith('https://personal.connectapi.garmin.com/'));assert.equal(init.redirect,'manual');return new Response('untrusted vendor body',{status:526});},sleep:async()=>{}}),e=>e.code==='GARMIN_TLS'&&e.upstreamStatus===526&&e.status===503);
 assert.equal(calls,3);
});
