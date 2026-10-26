import {readFileSync,readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
assert.equal(manifest.project_id,'appgprj_6ada43661f988191accfbfee8e03ecf2');assert.ok(!manifest.static,'Server deployment must not be packaged as static');
function walk(dir){return readdirSync(dir).flatMap(n=>{const p=dir+'/'+n;return statSync(p).isDirectory()?walk(p):[p];});}
for(const path of [...walk('public'),...walk('server')].filter(p=>/\.(mjs|js)$/.test(p))){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status)process.exit(r.status);}
assert.ok(walk('public/assets').every(p=>statSync(p).size<750000),'Images must stay below the mobile asset budget');
for(const p of walk('public').filter(p=>/\.(mjs|html|json|css)$/.test(p))){const source=readFileSync(p,'utf8');assert.ok(!/personalapitoken-service|Authorization:\s*['"]?ApiKey/.test(source),'Garmin credentials must be exchanged only on the server');assert.ok(!/localStorage|sessionStorage/.test(source),'Personal recaps must remain in memory');}
if(process.argv.includes('--public')){
 const config=JSON.parse(readFileSync('wrangler.cloudflare.jsonc','utf8'));
 assert.equal(config.vars.AUTH_MODE,'visitor');
 assert.equal(config.vars.PUBLIC_ORIGIN,'https://garmin-wrapped.miniwatt.app');
 assert.ok(config.routes.some(r=>r.pattern==='garmin-wrapped.miniwatt.app'&&r.zone_name==='miniwatt.app'&&r.custom_domain),'The custom hostname must use the miniwatt.app parent zone.');
 assert.ok(config.ratelimits.some(r=>r.name==='CONNECT_RATE_LIMITER'));
 assert.ok(config.ratelimits.some(r=>r.name==='DATA_RATE_LIMITER'));
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
 assert.ok(!('SESSION_SECRET' in config.vars)&&!('DEV_GARMIN_API_KEY' in config.vars));
}
console.log('Source, server configuration, privacy boundaries, and asset budgets passed.');
