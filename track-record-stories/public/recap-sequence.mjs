import {selectStories} from './story-model.mjs';

// A product invitation is presentation copy, never a verified activity claim.
export function recapSequence(dataset){
 const stories=selectStories(dataset);
 if(!stories.some(s=>s.chapterId==='sport:cycling'&&s.template==='cycling'))return stories;
 return [...stories,{
  id:'mini-watt',template:'miniwatt',chapterId:'mini-watt',promotional:true,
  title:['KEEP THE','WATTS','COMING.'],value:'MINI WATT',unit:'YOUR NEXT RIDE STARTS HERE',
  caption:'Structured workouts. Real routes. Your own entertainment.\nMeet your next indoor cycling app.',
  sharePolicy:'private_only'
 }];
}
