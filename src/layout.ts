import type {TemporalEvent, TimeRange} from './types.js';

/** Greedy interval coloring, per lane. A pixel gap separates point events too. */
export function packEventSlots(events: TemporalEvent[],range: TimeRange,width: number,gapPixels=14): Map<string,Map<string,number>> {
  const gap=(range.end-range.start)/Math.max(1,width)*gapPixels;
  const result=new Map<string,Map<string,number>>(),ends=new Map<string,number[]>();
  for(const e of [...events].sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id))){
    for(const lane of e.laneIds){
      const slots=ends.get(lane)??[],map=result.get(lane)??new Map<string,number>();
      const start=Math.max(range.start,e.time),end=Math.min(range.end,e.endTime??e.time);
      let slot=slots.findIndex(t=>t+gap<start);if(slot<0)slot=slots.length;
      slots[slot]=end;map.set(e.id,slot);ends.set(lane,slots);result.set(lane,map);
    }
  }
  return result;
}
export interface LabelBox {id:string;x:number;y:number;width:number;height:number;priority:number}
/** Highest-priority labels win. Geometry is untouched; hover/list retain suppressed labels. */
export function placeLabels(candidates: LabelBox[]): LabelBox[] {
  const placed: LabelBox[]=[];
  for(const candidate of [...candidates].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))){
    if(!placed.some(b=>candidate.x<b.x+b.width+4&&candidate.x+candidate.width+4>b.x&&candidate.y<b.y+b.height+2&&candidate.y+candidate.height+2>b.y))placed.push(candidate);
  }
  return placed;
}
