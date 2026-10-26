// Each sport has its own editorial vocabulary. Measurement and admission stay in metrics.mjs.
const profiles = {
 running: ['RUNS, ON REPEAT.', 'HOURS IN YOUR STRIDE.', 'A YEAR, ON FOOT.', 'YOUR LONGEST RUN.', 'RUNNING DAY', 'runs', 'track'],
 cycling: ['BACK IN THE SADDLE.', 'HOURS IN THE SADDLE.', 'THE KILOMETRES ROLLED.', 'YOUR LONGEST RIDE.', 'RIDE DAY', 'rides', 'gear'],
 hiit: ['INTERVALS. ON REPEAT.', 'THE INTERVAL HOURS.', null, null, 'HIIT DAY', 'HIIT sessions', 'burst'],
 strength: ['A YEAR UNDER LOAD.', 'HOURS ON THE TRAINING FLOOR.', null, null, 'LIFTING DAY', 'strength sessions', 'stack'],
 walking: ['WALKS WORTH COUNTING.', 'TIME ON YOUR FEET.', 'YOUR WALKING FOOTPRINT.', 'YOUR LONGEST WALK.', 'WALKING DAY', 'walks', 'footsteps'],
 hiking: ['THE HIKING CHAPTER.', 'HOURS ON THE TRAIL.', 'THE TRAIL ADDS UP.', 'YOUR LONGEST HIKE.', 'HIKING DAY', 'hikes', 'ridge'],
 swimming: ['BACK TO THE WATER.', 'HOURS IN THE WATER.', 'YOUR YEAR IN THE WATER.', 'YOUR LONGEST SWIM.', 'SWIMMING DAY', 'swims', 'lanes'],
 rowing: ['RETURN TO THE ROW.', 'HOURS AT THE OARS.', 'THE ROWING DISTANCE.', 'YOUR LONGEST ROW.', 'ROWING DAY', 'rowing sessions', 'ripple'],
 yoga: ['ROOM FOR THE MAT.', 'HOURS ON THE MAT.', null, null, 'YOGA DAY', 'yoga practices', 'arch'],
 pilates: ['PILATES IN PRACTICE.', 'HOURS OF PILATES.', null, null, 'PILATES DAY', 'Pilates sessions', 'balance'],
 elliptical: ['ANOTHER TURN.', 'HOURS IN THE ELLIPSE.', null, null, 'ELLIPTICAL DAY', 'elliptical sessions', 'orbit'],
 skiing: ['A SEASON ON SNOW.', 'HOURS ON SNOW.', 'DISTANCE ON SNOW.', 'YOUR LONGEST SNOW SESSION.', 'SNOW DAY', 'snow-sport sessions', 'slalom'],
 golf: ['ROUNDS ON RECORD.', 'HOURS ON THE COURSE.', null, null, 'GOLF DAY', 'golf activities', 'target'],
 racket: ['BACK ON COURT.', 'HOURS ON COURT.', null, null, 'COURT DAY', 'racket-sport sessions', 'court'],
 triathlon: ['MORE THAN ONE DISCIPLINE.', 'HOURS ACROSS DISCIPLINES.', 'YOUR MULTISPORT DISTANCE.', 'YOUR LONGEST MULTISPORT ACTIVITY.', 'MULTISPORT DAY', 'multisport activities', 'triad'],
 team_sports: ['PART OF THE TEAM.', 'HOURS IN THE GAME.', null, null, 'TEAM-SPORT DAY', 'team-sport activities', 'pitch'],
 climbing: ['BACK TO THE WALL.', 'HOURS AT THE WALL.', null, null, 'CLIMBING DAY', 'climbing sessions', 'holds'],
 cardio: ['CARDIO ON THE CALENDAR.', 'HOURS OF CARDIO.', null, null, 'CARDIO DAY', 'cardio sessions', 'pulse'],
 other: ['THE REST OF YOUR REPERTOIRE.', 'HOURS BEYOND THE USUAL.', null, null, 'ACTIVITY DAY', 'other activities', 'tiles']
};
function wrap(text, limit=18) {
 const lines=[]; let line='';
 for(const word of text.split(' ')){if(line&&line.length+word.length+1>limit){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
 if(line)lines.push(line);return lines;
}
export function sportContent(sport, kind) {
 const [sessions,hours,distance,longest,day,noun,geometry]=profiles[sport]||profiles.other;
 const headline={sessions,hours,distance,longest,weekday:`YOUR ${day}.`}[kind];
 return {title:wrap(headline),noun,geometry};
}
