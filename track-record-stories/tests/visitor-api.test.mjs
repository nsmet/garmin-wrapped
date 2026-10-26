import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, unseal } from '../server/api.mjs';

const origin='https://garmin-wrapped.miniwatt.app';
const secret='test-only-session-secret-'.repeat(3);
const limiter={async limit(){return {success:true};}};
const env={AUTH_MODE:'visitor',GARMIN_MODE:'personal',PUBLIC_ORIGIN:origin,SESSION_SECRET:secret,CONNECT_RATE_LIMITER:limiter,DATA_RATE_LIMITER:limiter};
const quiet={log(){}};
function request(action,input={},headers={},base=origin){
  return new Request(base+'/api/'+action,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(input)});
}
const cookie=response=>response.headers.get('Set-Cookie').split(';')[0];

test('Public visitors connect without Sites identity and receive separate encrypted sessions',async()=>{
  const connect=key=>handleApi(request('connect',{key}),env,{...quiet,fetcher:async(url,init)=>new Response(init.headers.Authorization.endsWith('alice')?'alice.token.signature':'bob.token.signature')});
  const alice=await connect('fake-personal-key-alice'),bob=await connect('fake-personal-key-bob');
  assert.equal(alice.status,200);assert.equal(bob.status,200);
  const aliceCookie=cookie(alice),bobCookie=cookie(bob);
  assert.notEqual(aliceCookie,bobCookie);
  const a=await unseal(aliceCookie.split('=')[1],secret),b=await unseal(bobCookie.split('=')[1],secret);
  assert.notEqual(a.user,b.user);assert.equal(a.token,'alice.token.signature');assert.equal(b.token,'bob.token.signature');
  assert.ok(a.exp>Date.now()&&a.exp<=Date.now()+1200000);
  for(const [session,token] of [[aliceCookie,a.token],[bobCookie,b.token]]){
    const response=await handleApi(request('activities',{year:2026,timeZone:'UTC',start:0},{Cookie:session,'oai-authenticated-user-id':'spoofed-owner'}),env,{...quiet,fetcher:async(url,init)=>{assert.equal(init.headers.Authorization,'Bearer '+token);return Response.json([]);}});
    assert.equal(response.status,200);assert.equal((await response.json()).complete,true);
  }
  assert.ok(!(await alice.text()).includes('alice.token'));
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=1200'])assert.ok(alice.headers.get('Set-Cookie').includes(flag));
});

test('Public data rejects absent, tampered, expired and differently encrypted sessions',async()=>{
  const {seal}=await import('../server/api.mjs');
  const valid=await seal({user:'visitor',token:'test.token.signature',exp:Date.now()+10000},secret);
  const expired=await seal({user:'visitor',token:'test.token.signature',exp:Date.now()-1},secret);
  for(const [value,settings] of [['',env],[valid+'tamper',env],[expired,env],[valid,{...env,SESSION_SECRET:'another-secret-'.repeat(4)}]]){
    const response=await handleApi(request('activities',{year:2026,timeZone:'UTC',start:0},{Cookie:'__Host-mini-session='+value}),settings,{...quiet,fetcher(){assert.fail('Invalid sessions must never reach Garmin');}});
    assert.equal(response.status,401);assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
  }
});

test('Public mode rejects cross-origin requests, unconfigured origins and alternate hostnames',async()=>{
  for(const req of [request('connect',{}, {Origin:'https://evil.example'}),request('connect',{}, {'Sec-Fetch-Site':'cross-site'}),request('connect',{}, {},'https://unexpected.workers.dev')]){
    assert.equal((await handleApi(req,env,quiet)).status,403);
  }
  assert.equal((await handleApi(request('connect'),{...env,PUBLIC_ORIGIN:undefined},quiet)).status,403);
});

test('Cloudflare rate limits use a stable hashed IP, independent of spoofed identity headers',async()=>{
  const keys=[];
  const settings={...env,CONNECT_RATE_LIMITER:{async limit({key}){keys.push(key);return {success:keys.length===1};}}};
  const deps={...quiet,fetcher:async()=>new Response('test.token.signature')};
  const first=await handleApi(request('connect',{key:'fake-personal-key-123'},{'oai-authenticated-user-id':'one'}),settings,deps);
  const second=await handleApi(request('connect',{key:'fake-personal-key-456'},{'oai-authenticated-user-id':'two'}),settings,deps);
  assert.equal(first.status,200);assert.equal(second.status,429);assert.equal(second.headers.get('Retry-After'),'60');
  assert.equal(keys[0],keys[1]);assert.ok(!keys[0].includes('192.0.2.1'));
});

test('Missing rate limiter or session secret fails closed before contacting Garmin',async()=>{
  for(const settings of [{...env,CONNECT_RATE_LIMITER:undefined},{...env,SESSION_SECRET:undefined}]){
    const response=await handleApi(request('connect',{key:'fake-personal-key-123'}),settings,{...quiet,fetcher(){assert.fail('Unconfigured public connections must not reach Garmin');}});
    assert.equal(response.status,503);assert.equal((await response.json()).error.code,'NOT_CONFIGURED');
  }
});

test('Anonymous visitors can inspect config and disconnect, but cannot read records without a cookie',async()=>{
  const config=await handleApi(new Request(origin+'/api/config'),env,quiet);
  assert.equal(config.status,200);assert.equal((await config.json()).personalEnabled,true);
  const disconnect=await handleApi(request('disconnect'),env,quiet);
  assert.equal(disconnect.status,200);assert.match(disconnect.headers.get('Set-Cookie'),/Max-Age=0/);
  const data=await handleApi(request('activities',{year:2026,timeZone:'UTC',start:0}),env,quiet);
  assert.equal(data.status,401);
  assert.equal((await handleApi(request('missing'),env,quiet)).status,404);
  const get=await handleApi(new Request(origin+'/api/connect'),env,quiet);
  assert.equal(get.status,405);assert.equal(get.headers.get('Allow'),'POST');
});
