import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { configureToolEnvironment } from './tool-environment.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
configureToolEnvironment(root);
process.env.DEPLOY_TARGET='cloudflare';
const [command,...args]=process.argv.slice(2);
const generated='dist/server/wrangler.json';
const source='wrangler.cloudflare.jsonc';
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(directory+'/'+entry.name):[directory+'/'+entry.name]);}

function run(script,argv){
  const result=spawnSync(process.execPath,[script,...argv],{stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}

function verifyBuild(){
  assert.ok(existsSync(generated),'Run npm run build:cloudflare first.');
  const config=JSON.parse(readFileSync(generated,'utf8'));
  assert.equal(config.name,'garmin-wrapped','Refusing to deploy a Sites build. Run npm run build:cloudflare.');
  assert.equal(config.vars.AUTH_MODE,'visitor');
  assert.equal(config.vars.GARMIN_MODE,'personal');
  assert.equal(config.vars.PUBLIC_ORIGIN,'https://garmin-wrapped.miniwatt.app');
  assert.equal(config.workers_dev,false);
  assert.equal(config.preview_urls,false);
  assert.ok(config.routes.some(r=>r.pattern==='garmin-wrapped.miniwatt.app'&&r.zone_name==='miniwatt.app'&&r.custom_domain),'The custom hostname must use the miniwatt.app parent zone.');
  for(const name of ['CONNECT_RATE_LIMITER','DATA_RATE_LIMITER'])assert.ok(config.ratelimits.some(r=>r.name===name));
  for(const name of ['SESSION_SECRET','DEV_GARMIN_API_KEY','PERSONAL_OWNER_ID'])assert.ok(!(name in config.vars),`${name} must not be embedded in the deployment.`);
  assert.ok(existsSync('dist/client/onboarding.mjs'));
  assert.ok(!files('dist').some(path=>/\/(?:\.dev\.vars|\.env)(?:\.|$)/.test(path)),'Local secret files must not be included in the deployment.');
  console.log('Cloudflare build verified: garmin-wrapped.miniwatt.app, visitor sessions, both rate limiters, no embedded secrets.');
}

function build(){
  run(fileURLToPath(new URL('./run-framework.mjs',import.meta.url)),['build']);
  // The Vite plugin copies local secrets for its preview command. They are not
  // uploaded by Wrangler, and must also be absent from distributable archives.
  for(const path of files('dist'))if(/\/(?:\.dev\.vars|\.env)(?:\.|$)/.test(path))rmSync(path);
  verifyBuild();
}

switch(command){
  case 'dev':
    run(fileURLToPath(new URL('./run-framework.mjs',import.meta.url)),['dev',...args]);break;
  case 'build':build();break;
  case 'verify':verifyBuild();break;
  case 'preview': {
    verifyBuild();
    const option=name=>args.find(value=>value.startsWith(name+'='))?.slice(name.length+1)??(args.includes(name)?args[args.indexOf(name)+1]:undefined);
    const port=option('--port')??'8787',protocol=option('--local-protocol')??'http';
    // Override only the local process. Keep the distributable's production origin
    // and secrets untouched, and let Wrangler redact this temporary session key.
    const directory=mkdtempSync(join(tmpdir(),'garmin-wrapped-preview-'));
    const envFile=join(directory,'.env');
    const cleanup=()=>rmSync(directory,{recursive:true,force:true});
    process.once('exit',cleanup);
    try{
      writeFileSync(envFile,`SESSION_SECRET=${randomBytes(32).toString('base64url')}\n`,{mode:0o600});
      run(wrangler,['dev','--config',generated,'--local','--ip','127.0.0.1','--inspector-port','0',
        ...(!option('--port')?['--port',port]:[]),
        ...(!option('--local-upstream')?['--local-upstream',`127.0.0.1:${port}`]:[]),
        ...(!option('--upstream-protocol')?['--upstream-protocol','http']:[]),
        '--env-file',envFile,'--var',`PUBLIC_ORIGIN:${protocol}://127.0.0.1:${port}`,...args]);
    }finally{cleanup();process.removeListener('exit',cleanup);}
    break;
  }
  case 'dry-run':
    build();run(wrangler,['deploy','--config',generated,'--dry-run','--outdir','.wrangler/cloudflare-dry-run',...args]);break;
  case 'deploy':
    build();run(wrangler,['deploy','--config',generated,'--keep-vars',...args]);break;
  case 'deploy-built':
    verifyBuild();run(wrangler,['deploy','--config',generated,'--keep-vars',...args]);break;
  case 'secret':run(wrangler,['secret','put','SESSION_SECRET','--config',source,...args]);break;
  default:throw new Error('Expected dev, build, verify, preview, dry-run, deploy, deploy-built or secret.');
}
