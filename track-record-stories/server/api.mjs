import {ApiError,exchangeKey,activityPage,wellness,sleepMonth} from './garmin.mjs';
const COOKIE='__Host-mini-session',MAX_AGE=1200;
const budget=new Map();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function keyFor(secret){if(typeof secret!=='string'||secret.length<43)throw new ApiError('NOT_CONFIGURED','Connection is being configured. You can still try the demo.',503);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function seal(session,secret){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await keyFor(secret);return encode(iv)+'.'+encode(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(session)))));}
export async function unseal(value,secret,user,now=Date.now()){
  try{const [iv,data,...extra]=value.split('.');if(extra.length)throw Error();const key=await keyFor(secret),s=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},key,decode(data))));if(typeof s.user!=='string'||!s.user||(user!==undefined&&s.user!==user)||!Number.isFinite(s.exp)||s.exp<=now||typeof s.token!=='string')throw Error();return s;}
  catch{throw new ApiError('SESSION_EXPIRED','Your connection expired. Enter your Garmin key again.',401);}
}
function json(value,status=200,extra={}){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
function cookie(value,age=MAX_AGE){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;}
function checkRate(user,path,now){
  const k=user+':'+(path==='/api/connect'?'connect':'data'),b=budget.get(k)||{at:now,count:0};if(now-b.at>60000){b.at=now;b.count=0;}b.count++;budget.set(k,b);
  if(budget.size>1000)for(const [id,v] of budget)if(now-v.at>60000)budget.delete(id);
  if(b.count>(path==='/api/connect'?6:300))throw new ApiError('RATE_LIMIT','Too many requests. Wait a minute and try again.',429);
}
async function checkVisitorRate(request,env,path){
  const limiter=path==='/api/connect'?env.CONNECT_RATE_LIMITER:env.DATA_RATE_LIMITER;
  if(!limiter?.limit)throw new ApiError('NOT_CONFIGURED','Connection is being configured. You can still try the demo.',503);
  // Cloudflare sets this header at its edge. Never use a client-supplied identity
  // header, API key or token as a rate-limit key in the public deployment.
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const key=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('garmin-wrapped:'+ip))));
  if(!(await limiter.limit({key})).success)throw new ApiError('RATE_LIMIT','Too many requests. Wait a minute and try again.',429);
}
async function body(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError('CONTENT_TYPE','Send a JSON request.',415);
  const reader=request.body?.getReader();let text='',size=0;const decoder=new TextDecoder();
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new ApiError('BODY_TOO_LARGE','The request is too large.',413);}text+=decoder.decode(value,{stream:true});}
  try{const value=JSON.parse(text+decoder.decode());if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new ApiError('INVALID_JSON','The request could not be read.');}
}
export async function handleApi(request,env={},deps={}) {
  const path=new URL(request.url).pathname,start=Date.now(),requestId=crypto.randomUUID();
  if(path==='/api/health')return json({status:'ok',version:'1.0.0'});
  const visitor=env.AUTH_MODE==='visitor';
  const user=visitor?undefined:request.headers.get('oai-authenticated-user-id');
  if(!visitor&&!user)return json({error:{code:'SIGN_IN_REQUIRED',message:'Sign in to connect your Garmin account.'}},401);
  if(path==='/api/config')return json({personalEnabled:env.GARMIN_MODE==='personal',sessionMinutes:20});
  try{
    if(!['/api/connect','/api/disconnect','/api/activities','/api/wellness','/api/sleep'].includes(path))throw new ApiError('NOT_FOUND','This action does not exist.',404);
    if(request.method!=='POST')throw new ApiError('METHOD','Use POST for this action.',405);
    if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')throw new ApiError('ORIGIN','Open this page directly to continue.',403);
    if(visitor&&(!env.PUBLIC_ORIGIN||new URL(request.url).origin!==env.PUBLIC_ORIGIN))throw new ApiError('ORIGIN','Open this page directly to continue.',403);
    if(path==='/api/disconnect')return json({disconnected:true},200,{'Set-Cookie':cookie('',0)});
    if(visitor)await checkVisitorRate(request,env,path);else checkRate(user,path,start);
    if(env.GARMIN_MODE!=='personal')throw new ApiError('INTEGRATION_DISABLED','Personal-account connection is not enabled on this site.',503);
    if(!visitor&&env.PERSONAL_OWNER_ID&&env.PERSONAL_OWNER_ID!==user)throw new ApiError('OWNER_ONLY','This connection is available only to the site owner.',403);
    const input=await body(request);
    if(path==='/api/connect'){
      await keyFor(env.SESSION_SECRET);
      let token=await exchangeKey(input.key,{...deps,signal:request.signal});input.key='';
      const session=await seal({token,user:visitor?crypto.randomUUID():user,exp:start+MAX_AGE*1000},env.SESSION_SECRET);token='';
      if(session.length>3800)throw new ApiError('TOKEN_SIZE','Garmin returned a token that cannot fit in a secure session.',502);
      return json({connected:true,expiresIn:MAX_AGE},200,{'Set-Cookie':cookie(session)});
    }
    const match=request.headers.get('Cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE+'='));
    const session=await unseal(match?.slice(COOKIE.length+1)||'',env.SESSION_SECRET,user);
    const options={...deps,token:session.token,signal:request.signal};
    if(path==='/api/activities')return json(await activityPage(input,options));
    if(path==='/api/wellness'){const result=await wellness(input,options);if(input.includeHealth!==true)result.daily=result.daily.map(d=>({date:d.date,steps:d.steps}));return json(result);}
    if(path==='/api/sleep')return json(await sleepMonth(input,options));
    throw new ApiError('NOT_FOUND','This action does not exist.',404);
  }catch(error){
    const known=error instanceof ApiError,status=known?error.status:request.signal.aborted?499:500,code=known?error.code:'REQUEST_FAILED';
    // Explicit allowlist. No headers, user IDs, keys, URLs, bodies, or upstream errors.
    (deps.log||console.info)(JSON.stringify({event:'api_error',requestId,route:['/api/connect','/api/activities','/api/wellness','/api/sleep','/api/disconnect'].includes(path)?path:'unknown',code,status,...(known&&error.upstreamStatus?{upstreamStatus:error.upstreamStatus}:{}),durationMs:Date.now()-start}));
    return json({error:{code,message:known?error.message:'The request could not complete. Please try again.',requestId}},status,status===401?{'Set-Cookie':cookie('',0)}:status===429?{'Retry-After':'60'}:status===405?{'Allow':'POST'}:{});
  }
}
export function secureResponse(response){
  const r=new Response(response.body,response);r.headers.set('X-Content-Type-Options','nosniff');r.headers.set('Referrer-Policy','no-referrer');r.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://chat.openai.com;");
  return r;
}
