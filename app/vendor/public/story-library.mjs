// A design catalogue, deliberately separate from verified recap selection.
const yearDesign={year_sessions:'hiit',year_sport_mix:'mix',year_recorded_hours:'cycling',year_active_days:'active',year_peak_month:'calendar',year_weekday:'calendar',year_hour:'morning',year_weekly_streak:'calendar',year_hybrid:'triathlon',year_dominant:'strength',year_top_time:'cardio',year_longest_event:'longest',year_sport_surprise:'racket',year_activity_pr:'elevation',year_heart_zones:'heart',year_steps:'walking',year_resting_hr:'heart',year_body_battery:'energy',year_sleep:'sleep',year_finale:'finale'};
function wrap(title){const lines=[];let line='';for(const word of title.split(' ')){if((line+' '+word).trim().length>20&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;}
export function makeLibrary(catalog){return catalog.stories.map((s,i)=>({id:'template-'+s.id,sourceId:s.id,template:s.sport==='all'?yearDesign[s.id]||'calendar':s.sport,group:s.sport==='all'?'Year & health':s.sport.replaceAll('_',' '),family:s.story_family,variant:i,title:wrap(s.headline),value:'—',unit:'DATA REQUIRED',caption:'A possible chapter.\nOnly appears with supporting data.',libraryOnly:true,status:'template',eligibility:s.eligibility,evidenceNeeded:s.required_evidence,claimGuard:s.claim_guard,sharePolicy:'template_only'}));}
export const extensions=[
 ['recovery','recovery','THE QUIETER DAYS','Daily stress records with adequate coverage.'],
 ['hrv','hrv','YOUR NIGHTLY RHYTHM','Supported overnight HRV records; no diagnostic interpretation.'],
 ['hydration','hydration','EVERY SIP ADDS UP','Explicitly logged hydration with units and known coverage.'],
 ['nutrition','nutrition','FUEL FOR YOUR YEAR','An approved nutrition source with actual logged records.'],
 ['sleep-timing','sleep','WHEN YOU SWITCHED OFF','Sleep start/end timestamps with timezone and coverage.'],
 ['sleep-consistency','sleep','FINDING YOUR RHYTHM','Enough recorded nights for a validated timing distribution.'],
 ['energy','energy','YOUR DAILY RECHARGE','Supported Body Battery samples; no invented recovery score.'],
 ['elevation','elevation','ALL THE WAY UP','Valid recorded ascent; meaningful outdoor elevation only.']
].map(([id,template,title,eligibility],i)=>({id:'template-extra-'+id,template,group:'More health & movement',family:'concept',variant:i,title:wrap(title),value:'—',unit:'DATA REQUIRED',caption:'A possible chapter.\nOnly appears with supporting data.',libraryOnly:true,status:'template',eligibility,evidenceNeeded:['Source availability and permission must be validated'],claimGuard:'Concept only. Source/API support is unconfirmed.',sharePolicy:'template_only'}));
