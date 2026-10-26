const fmt=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
function element(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}

export function appendActivityAudit(root,audit){
  if(!audit)return;
  const section=element('section');section.className='activity-audit';
  section.append(element('h3','Activity breakdown'),element('p',`${audit.counted} activities counted from ${audit.received} returned records. Counts follow Garmin’s saved activity type. Activity names are not used to guess the sport.`));
  const {duplicates,children,outsidePeriod}=audit.excluded;
  if(duplicates||children||outsidePeriod)section.append(element('p',`Excluded: ${duplicates} duplicate records, ${children} multisport child records, ${outsidePeriod} records outside this year or in the future.`));
  section.append(element('p','Open a sport to check the dates and Garmin types behind its count. Compare a listed activity in Garmin if a count looks wrong.'));
  for(const sport of audit.sports){
    const details=element('details'),summary=element('summary',`${sport.label} · ${sport.count} activities`);
    const types=element('p','Garmin types: '+sport.types.map(t=>`${t.type} (${t.count})`).join(', '));
    const list=element('ol'),more=element('button','Show more activities');more.type='button';more.className='secondary-button';let shown=0;
    function appendPage(){
      for(const a of sport.activities.slice(shown,shown+100)){
        const measures=[a.duration===null?'duration unavailable':`${fmt(a.duration/60)} min`,a.distance===null?'distance unavailable':`${fmt(a.distance/1000)} km`];
        const item=element('li',`${a.date} · ${a.type} · ${measures.join(' · ')} `);
        if(/^\d+$/.test(a.id)){const link=element('a','View in Garmin ↗');link.href='https://connect.garmin.com/modern/activity/'+a.id;link.target='_blank';link.rel='noopener noreferrer';item.append(link);}
        list.append(item);
      }
      shown=Math.min(shown+100,sport.activities.length);more.hidden=shown===sport.activities.length;
    }
    details.addEventListener('toggle',()=>{if(details.open&&!shown)appendPage();});more.addEventListener('click',appendPage);
    details.append(summary,types,list,more);section.append(details);
  }
  root.append(section);
}
