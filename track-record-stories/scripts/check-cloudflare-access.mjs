import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Wrangler wraps these dashboard comparison requests in one generic error.
// Report only endpoint labels, HTTP statuses and numeric API codes: binding
// values, response bodies, account IDs and credentials must never enter CI logs.
export async function checkCloudflareAccess({accountId,token,workerName,request=fetch,log=console.log}){
  if(!accountId?.trim()||!token?.trim()){
    log('FAIL: Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the GitHub production environment.');
    return false;
  }
  if(!/^[a-f0-9]{32}$/i.test(accountId.trim())||!/^[a-z0-9_-]+$/.test(workerName)){
    log('FAIL: Invalid Cloudflare account ID or Worker name.');
    return false;
  }
  const account=`/accounts/${accountId.trim()}`,service=`${account}/workers/services/${workerName}`;
  async function check(label,path){
    try{
      const response=await request(`https://api.cloudflare.com/client/v4${path}`,{
        method:'GET',headers:{Authorization:`Bearer ${token.trim()}`},
        redirect:'error',signal:AbortSignal.timeout(15000),
      });
      const data=await response.json().catch(()=>null);
      const codes=(Array.isArray(data?.errors)?data.errors:[]).map(error=>error?.code).filter(Number.isInteger);
      const ok=response.ok&&data?.success===true;
      log(`${ok?'PASS':'FAIL'}: ${label} (HTTP ${response.status}${codes.length?`; Cloudflare codes ${codes.join(', ')}`:''})`);
      return {ok,data,codes,status:response.status};
    }catch{
      log(`FAIL: ${label} (network request failed or timed out)`);
      return {ok:false,codes:[]};
    }
  }
  const metadata=await check('Worker metadata',service);
  if(!metadata.ok){
    if(metadata.status===404&&metadata.codes.some(code=>code===10007||code===10090)){
      log('Worker does not exist yet; deployment will perform the first-upload checks.');
      return true;
    }
    return false;
  }
  const remote=metadata.data.result?.default_environment;
  if(!remote?.script){
    log('FAIL: Cloudflare returned incomplete Worker metadata.');
    return false;
  }
  if(remote.script.last_deployed_from!=='dash'){
    log('Dashboard comparison is not required for this Worker.');
    return true;
  }
  if(typeof remote.environment!=='string'||!remote.environment){
    log('FAIL: Cloudflare returned no default Worker environment.');
    return false;
  }
  const environment=encodeURIComponent(remote.environment),base=`${service}/environments/${environment}`;
  const checks=await Promise.all([
    check('Worker bindings',`${base}/bindings`),
    check('Worker routes',`${base}/routes?show_zonename=true`),
    check('Worker custom domains',`${account}/workers/domains/records?page=0&per_page=5&service=${workerName}&environment=${environment}`),
    check('Worker subdomain',`${base}/subdomain`),
    check('Worker environment',base),
    check('Worker schedules',`${account}/workers/scripts/${workerName}/schedules`),
  ]);
  if(checks.some(check=>!check.ok)){
    log('Cloudflare metadata access failed. For 401/403, check API token permissions and account/zone scope. For 5xx, retry after checking Cloudflare status. See DEPLOY-CLOUDFLARE.md.');
    return false;
  }
  return true;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=JSON.parse(readFileSync(new URL('../wrangler.cloudflare.jsonc',import.meta.url),'utf8'));
  const log=line=>{
    console.log(line);
    if(process.env.GITHUB_ACTIONS==='true'&&line.startsWith('FAIL:')){
      console.error(`::error title=Cloudflare metadata access::${line}`);
    }
  };
  const ok=await checkCloudflareAccess({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN,workerName:config.name,log});
  if(!ok)process.exitCode=1;
}
