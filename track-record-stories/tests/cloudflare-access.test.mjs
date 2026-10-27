import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkCloudflareAccess} from '../scripts/check-cloudflare-access.mjs';

const metadata={default_environment:{environment:'production',script:{last_deployed_from:'dash'}}};
const reply=(result,status=200,errors=[])=>new Response(JSON.stringify({success:status===200,result,errors}),{status});
const options={accountId:'a'.repeat(32),token:'private-test-token',workerName:'garmin-wrapped'};

test('Cloudflare preflight checks dashboard metadata using GET without logging credentials or bindings',async()=>{
  const logs=[],requests=[];
  const ok=await checkCloudflareAccess({...options,log:line=>logs.push(line),request:async(url,init)=>{
    requests.push(url);
    assert.equal(init.method,'GET');
    assert.equal(init.redirect,'error');
    assert.equal(init.headers.Authorization,'Bearer private-test-token');
    return reply(requests.length===1?metadata:{value:'private-binding-value'});
  }});
  assert.equal(ok,true);
  assert.equal(requests.length,7);
  assert.ok(requests.some(url=>url.endsWith('/schedules')));
  assert.ok(requests.some(url=>url.includes('/domains/records?')));
  assert.doesNotMatch(logs.join('\n'),/private-test-token|private-binding-value|aaaaaaaa/);
});

test('A forbidden route lookup identifies the endpoint and API code and blocks deployment',async()=>{
  const logs=[];
  const ok=await checkCloudflareAccess({...options,log:line=>logs.push(line),request:async url=>{
    if(url.endsWith('/garmin-wrapped'))return reply(metadata);
    if(url.includes('/routes?'))return reply(null,403,[{code:10000,message:'private remote response'}]);
    return reply([]);
  }});
  assert.equal(ok,false);
  assert.ok(logs.some(line=>line==='FAIL: Worker routes (HTTP 403; Cloudflare codes 10000)'));
  assert.doesNotMatch(logs.join('\n'),/private remote response/);
});

test('Unavailable metadata reports the HTTP status even when Cloudflare returns HTML',async()=>{
  const logs=[];
  assert.equal(await checkCloudflareAccess({...options,log:line=>logs.push(line),request:async()=>new Response('upstream unavailable',{status:503})}),false);
  assert.ok(logs.includes('FAIL: Worker metadata (HTTP 503)'));
});

test('Network errors and missing credentials fail without exposing request details',async()=>{
  const logs=[];
  assert.equal(await checkCloudflareAccess({...options,log:line=>logs.push(line),request:async()=>{throw Error('private-test-token');}}),false);
  assert.equal(await checkCloudflareAccess({...options,token:'',log:line=>logs.push(line),request:async()=>{assert.fail('Must not make a request without credentials');}}),false);
  assert.doesNotMatch(logs.join('\n'),/private-test-token/);
});

test('A missing Worker permits first deployment; authorization failures never count as missing',async()=>{
  for(const [status,code,expected] of [[404,10007,true],[404,10090,true],[403,10000,false],[404,99999,false]]){
    const ok=await checkCloudflareAccess({...options,log:()=>{},request:async()=>reply(null,status,[{code}])});
    assert.equal(ok,expected);
  }
});

test('Workers last deployed through Wrangler do not require the dashboard-only reads',async()=>{
  let requests=0;
  assert.equal(await checkCloudflareAccess({...options,log:()=>{},request:async()=>{
    requests++;
    return reply({default_environment:{environment:'production',script:{last_deployed_from:'wrangler'}}});
  }}),true);
  assert.equal(requests,1);
});
