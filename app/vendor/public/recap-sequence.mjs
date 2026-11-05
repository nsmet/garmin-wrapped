import {selectStories} from './story-model.mjs';

// A product invitation is presentation copy, never a verified activity claim.
export function recapSequence(dataset){
 const stories=selectStories(dataset);
 if(!stories.some(s=>s.chapterId==='sport:cycling'&&s.template==='cycling'))return stories;
 return [...stories,{
  id:'mini-watt',template:'miniwatt',chapterId:'mini-watt',promotional:true,
  title:['KEEP RIDING','INDOORS.'],value:'MINI WATT',unit:'YOUR NEXT RIDE STARTS HERE',
  caption:'Put your bike on a smart trainer.\nMINI WATT gives you structured workouts and real routes to ride.',
  sharePolicy:'private_only'
 }];
}
