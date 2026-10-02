export const BASE=1790856000000;
export function syntheticData(count=1000,laneCount=80){
 let seed=79;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const lanes=Array.from({length:laneCount},(_,i)=>({id:`lane-${i}`,label:`Resource ${String(i+1).padStart(3,'0')}`}));
 const events=[],relationships=[],eventGroups=[];
 for(let i=0;i<count;i++){
  const lane=Math.floor(random()*laneCount),other=(lane+1)%laneCount,time=BASE+Math.floor(random()*7200000),group=Math.floor(i/10);
  if(i%10===0)eventGroups.push({id:`group-${group}`,label:`Package ${group+1}`});
  events.push({id:`event-${i}`,label:`Action ${i+1}`,time,...(i%3===0?{endTime:time+Math.floor(random()*60000)}:{}),laneIds:[lanes[lane].id,lanes[other].id],groupIds:[`group-${group}`],transfers:[{from:lanes[lane].id,to:lanes[other].id,itemId:`item-${i}`}],kind:'handoff'});
  if(i%10!==0)relationships.push({id:`edge-${i}`,source:`event-${i-1}`,target:`event-${i}`,kind:'enables'});
 }
 return {schemaVersion:1,lanes,events,eventGroups,relationships};
}
