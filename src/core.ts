export * from './types.js';
import type { TimelineData, TemporalEvent, TimelineFilter, TraceOptions, TraceResult, Relationship, RelationKind, TimeRange, ViewState } from './types.js';

export class DataValidationError extends Error {
  constructor(public readonly issues: string[]) { super(`Invalid timeline data:\n${issues.join('\n')}`); this.name = 'DataValidationError'; }
}
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const time = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && Math.abs(v) <= 8.64e15;
const relationKinds: RelationKind[] = ['causes', 'enables', 'correlates', 'supersedes'];
/** Validate before making any changes to a live timeline. Returns a defensive JSON copy. */
export function validateData(input: unknown): TimelineData {
  const issues: string[] = [];
  if (!isObject(input)) throw new DataValidationError(['data must be an object']);
  const record = input;
  if (input.schemaVersion !== 1) issues.push('schemaVersion must be 1');
  function records(key: string, required = false): Record<string, unknown>[] {
    const value = record[key];
    if (value === undefined && !required) return [];
    if (!Array.isArray(value)) { issues.push(`${key} must be an array`); return []; }
    return value.filter((v, i) => { if (!isObject(v)) { issues.push(`${key}[${i}] must be an object`); return false; } return true; });
  }
  const lanes = records('lanes', true), events = records('events', true), lg = records('laneGroups'), eg = records('eventGroups'), relations = records('relationships');
  function ids(items: Record<string, unknown>[], label: string): Set<string> {
    const result = new Set<string>();
    items.forEach((v, i) => { if (!str(v.id)) issues.push(`${label}[${i}].id must be nonempty`); else if (result.has(v.id)) issues.push(`${label}: duplicate id ${v.id}`); else result.add(v.id); });
    return result;
  }
  const laneIds=ids(lanes,'lanes'), eventIds=ids(events,'events'), laneGroupIds=ids(lg,'laneGroups'), groupIds=ids(eg,'eventGroups');ids(relations,'relationships');
  function optionalString(v: Record<string, unknown>, key: string, path: string) { if (v[key] !== undefined && typeof v[key] !== 'string') issues.push(`${path}.${key} must be a string`); }
  function members(value: unknown, known: Set<string>, path: string, required = false): string[] {
    if (value === undefined && !required) return [];
    if (!Array.isArray(value) || (required && value.length === 0)) { issues.push(`${path} must be ${required ? 'a nonempty' : 'an'} array`); return []; }
    const seen = new Set<string>();
    value.forEach(id => { if (!str(id) || !known.has(id)) issues.push(`${path}: unknown id ${String(id)}`); else if (seen.has(id)) issues.push(`${path}: duplicate id ${id}`); else seen.add(id); });
    return [...seen];
  }
  for (const [name, list] of [['lanes',lanes],['laneGroups',lg],['eventGroups',eg],['events',events]] as const) {
    list.forEach((v,i) => { if (typeof v.label !== 'string') issues.push(`${name}[${i}].label must be a string`); });
  }
  lanes.forEach((v,i) => { if (v.groupId !== undefined && (!str(v.groupId) || !laneGroupIds.has(v.groupId))) issues.push(`lanes[${i}].groupId is unknown`); });
  eg.forEach((v,i) => { for (const key of ['description','color']) optionalString(v,key,`eventGroups[${i}]`); });
  events.forEach((v,i) => {
    const path=`events[${i}]`;
    if (!time(v.time)) issues.push(`${path}.time must be UTC epoch milliseconds (safe integer within Date range)`);
    if (v.endTime !== undefined && (!time(v.endTime) || (time(v.time) && v.endTime < v.time))) issues.push(`${path}.endTime must be at or after time`);
    const participants = members(v.laneIds,laneIds,`${path}.laneIds`,true);
    members(v.groupIds,groupIds,`${path}.groupIds`);
    for (const key of ['kind','color','description']) optionalString(v,key,path);
    if (v.transfers !== undefined) {
      if (!Array.isArray(v.transfers)) issues.push(`${path}.transfers must be an array`);
      else v.transfers.forEach((tr,j) => {
        if (!isObject(tr)) { issues.push(`${path}.transfers[${j}] must be an object`); return; }
        if (!str(tr.from) || !participants.includes(tr.from) || !str(tr.to) || !participants.includes(tr.to)) issues.push(`${path}.transfers[${j}] endpoints must be participating lanes`);
        for (const key of ['itemId','label']) optionalString(tr,key,`${path}.transfers[${j}]`);
      });
    }
  });
  relations.forEach((v,i) => {
    if (!str(v.source) || !eventIds.has(v.source) || !str(v.target) || !eventIds.has(v.target)) issues.push(`relationships[${i}] endpoints must be existing events`);
    if (!relationKinds.includes(v.kind as RelationKind)) issues.push(`relationships[${i}].kind is invalid`);
    optionalString(v,'label',`relationships[${i}]`);
  });
  // Strict JSON boundary: no NaN, Infinity, bigint, Date, undefined, functions, or cycles.
  const active = new Set<object>();
  function jsonValue(v: unknown, path: string) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number' && Number.isFinite(v)) return;
    if (typeof v !== 'object' || !v || (Object.getPrototypeOf(v) !== Object.prototype && !Array.isArray(v) && Object.getPrototypeOf(v) !== null)) { issues.push(`${path} must contain JSON values only`); return; }
    if (active.has(v)) { issues.push(`${path} is cyclic`); return; }
    if(Array.isArray(v)){for(let i=0;i<v.length;i++)if(!(i in v)){issues.push(`${path}[${i}] must not be a sparse array entry`);return;}}
    active.add(v); for (const [k,x] of Object.entries(v)) jsonValue(x,`${path}.${k}`);active.delete(v);
  }
  jsonValue(input,'data');
  if (issues.length) throw new DataValidationError(issues);
  return JSON.parse(JSON.stringify(input)) as TimelineData;
}

interface Node { event: TemporalEvent; maxEnd: number; left?: Node; right?: Node }
function tree(items: TemporalEvent[], start=0, end=items.length): Node | undefined {
  if (start>=end) return undefined;
  const middle=(start+end)>>>1, event=items[middle]!;
  const node: Node={event,maxEnd:event.endTime??event.time};
  const left=tree(items,start,middle),right=tree(items,middle+1,end);
  if(left){node.left=left;node.maxEnd=Math.max(node.maxEnd,left.maxEnd);}if(right){node.right=right;node.maxEnd=Math.max(node.maxEnd,right.maxEnd);}return node;
}
export function normalizeRange(range: TimeRange, minimumSpan=1): TimeRange {
  if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end<=range.start) throw new RangeError('Viewport end must be greater than start');
  if (!Number.isFinite(minimumSpan) || minimumSpan<1 || minimumSpan>1.728e16) throw new RangeError('minimumSpan must be between 1 and the Date range');
  const span=Math.max(minimumSpan,Math.min(range.end-range.start,1.728e16));
  const center=range.start/2+range.end/2;
  const start=Math.max(-8.64e15,Math.min(8.64e15-span,center-span/2));
  return {start,end:start+span};
}
export function zoomRange(range: TimeRange, factor: number, fraction=.5): TimeRange {
  if (!Number.isFinite(factor) || factor<=0) throw new RangeError('Zoom factor must be positive');
  if(!Number.isFinite(fraction))throw new RangeError('Zoom anchor must be finite');
  fraction=Math.max(0,Math.min(1,fraction));const old=normalizeRange(range),span=Math.max(1,Math.min(1.728e16,(old.end-old.start)*factor)),anchor=old.start+(old.end-old.start)*fraction;
  return normalizeRange({start:anchor-span*fraction,end:anchor+span*(1-fraction)});
}
export class TimelineModel {
  readonly data: TimelineData;
  readonly events = new Map<string,TemporalEvent>();
  readonly groups = new Map<string,string[]>();
  readonly sorted: TemporalEvent[];
  private readonly root: Node | undefined;
  private readonly incoming = new Map<string,Relationship[]>();
  private readonly outgoing = new Map<string,Relationship[]>();
  constructor(input: unknown) {
    this.data=validateData(input);
    for(const e of this.data.events){this.events.set(e.id,e);for(const g of e.groupIds??[]){const list=this.groups.get(g)??[];list.push(e.id);this.groups.set(g,list);}}
    this.sorted=[...this.events.values()].sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));this.root=tree(this.sorted);
    for(const r of this.data.relationships??[]){const out=this.outgoing.get(r.source)??[];out.push(r);this.outgoing.set(r.source,out);const inc=this.incoming.get(r.target)??[];inc.push(r);this.incoming.set(r.target,inc);}
  }
  query(range: TimeRange,filter: TimelineFilter={}): TemporalEvent[] {
    const result: TemporalEvent[]=[],lanes=filter.laneIds?new Set(filter.laneIds):null,groups=filter.groupIds?new Set(filter.groupIds):null,kinds=filter.kinds?new Set(filter.kinds):null,q=filter.query?.toLowerCase().trim();
    const visit=(n: Node|undefined)=>{
      if(!n||n.maxEnd<range.start)return;
      visit(n.left);const e=n.event;
      if(e.time<=range.end&&(e.endTime??e.time)>=range.start&&(!lanes||e.laneIds.some(x=>lanes.has(x)))&&(!groups||(e.groupIds??[]).some(x=>groups.has(x)))&&(!kinds||kinds.has(e.kind??''))&&(!q||`${e.id} ${e.label} ${e.description??''} ${(e.transfers??[]).map(t=>`${t.itemId??''} ${t.label??''}`).join(' ')}`.toLowerCase().includes(q)))result.push(e);
      if(e.time<=range.end)visit(n.right);
    };visit(this.root);return result;
  }
  expandGroups(ids: Iterable<string>): string[] {
    const selected=new Set([...ids].filter(id=>this.events.has(id)));
    // Expand direct group membership once; overlapping groups do not recursively select the whole dataset.
    const gs=new Set([...selected].flatMap(id=>this.events.get(id)!.groupIds??[]));
    for(const g of gs)for(const id of this.groups.get(g)??[])selected.add(id);return [...selected];
  }
  bounds(ids?: Iterable<string>): TimeRange {
    const items=ids?[...ids].map(id=>this.events.get(id)).filter((x): x is TemporalEvent=>!!x):this.sorted;
    if(!items.length)return {start:0,end:3600000};
    let start=Infinity,end=-Infinity;for(const e of items){start=Math.min(start,e.time);end=Math.max(end,e.endTime??e.time);}
    const pad=Math.max(1000,(end-start)*.08);return normalizeRange({start:start-pad,end:end+pad});
  }
  trace(ids: Iterable<string>,options: TraceOptions={}): TraceResult {
    const checked=validateTraceOptions(options);
    const roots=[...new Set([...ids].filter(id=>this.events.has(id)))],rootSet=new Set(roots),kinds=new Set(checked.kinds),relationships=new Set<string>();
    const maxDepth=checked.maxDepth;
    const walk=(direction:'upstream'|'downstream')=>{
      const found=new Set<string>(),seen=new Set(roots),queue=roots.map(id=>({id,depth:0}));
      for(let i=0;i<queue.length;i++){const current=queue[i]!;if(current.depth>=maxDepth)continue;
        for(const r of (direction==='upstream'?this.incoming:this.outgoing).get(current.id)??[]){if(!kinds.has(r.kind))continue;relationships.add(r.id);const next=direction==='upstream'?r.source:r.target;if(!rootSet.has(next))found.add(next);if(!seen.has(next)){seen.add(next);queue.push({id:next,depth:current.depth+1});}}
      }return [...found];
    };
    const direction=checked.direction;return {roots,upstream:direction==='downstream'?[]:walk('upstream'),downstream:direction==='upstream'?[]:walk('downstream'),relationshipIds:[...relationships]};
  }
}
export interface DensityCell { laneId: string; bucket: number; start: number; end: number; eventIds: string[] }
/** A cell counts participating events intersecting its interval, never transfer pairs. */
export function aggregateEvents(events: TemporalEvent[],range: TimeRange,buckets: number): DensityCell[] {
  if(!Number.isInteger(buckets)||buckets<1||buckets>10000)throw new RangeError('buckets must be an integer from 1 to 10000');
  normalizeRange(range);const width=(range.end-range.start)/buckets,cells=new Map<string,DensityCell>();
  for(const e of events){if(e.time>range.end||(e.endTime??e.time)<range.start)continue;
    const a=Math.max(0,Math.min(buckets-1,Math.floor((e.time-range.start)/width))),b=Math.max(a,Math.min(buckets-1,Math.floor(((e.endTime??e.time)-range.start)/width)));
    for(const laneId of e.laneIds)for(let bucket=a;bucket<=b;bucket++){const key=JSON.stringify([laneId,bucket]);let cell=cells.get(key);if(!cell){cell={laneId,bucket,start:range.start+bucket*width,end:range.start+(bucket+1)*width,eventIds:[]};cells.set(key,cell);}cell.eventIds.push(e.id);}
  }return [...cells.values()];
}

/** Validate options from plain JavaScript as strictly as TypeScript callers. */
export function validateTraceOptions(value: TraceOptions={}): Required<TraceOptions> {
  if(!isObject(value))throw new TypeError('Trace options must be an object');
  const direction=value.direction??'both',kinds=value.kinds??['causes','enables'],maxDepth=value.maxDepth??Infinity;
  if(typeof direction!=='string'||!['upstream','downstream','both'].includes(direction))throw new TypeError('Invalid trace direction');
  if(!Array.isArray(kinds)||!kinds.every(kind=>relationKinds.includes(kind)))throw new TypeError('Invalid relationship kind');
  if(typeof maxDepth!=='number'||(maxDepth!==Infinity&&(!Number.isInteger(maxDepth)||maxDepth<0)))throw new RangeError('maxDepth must be a nonnegative integer or Infinity');
  return {direction:direction as Required<TraceOptions>['direction'],kinds:[...kinds],maxDepth};
}
export function validateFilter(value: unknown): TimelineFilter {
  if(!isObject(value))throw new TypeError('Filter must be an object');
  const result: TimelineFilter={};
  for(const key of ['laneIds','groupIds','kinds'] as const){const list=value[key];if(list!==undefined){if(!Array.isArray(list)||!list.every(id=>typeof id==='string')||Object.keys(list).length!==list.length)throw new TypeError('Filter lists must contain strings');result[key]=[...list];}}
  if(value.query!==undefined){if(typeof value.query!=='string')throw new TypeError('Filter query must be a string');result.query=value.query;}
  return result;
}
/** Fully validate before a renderer mutates its current state. */
export function validateViewState(value: unknown): ViewState {
  if(!isObject(value)||value.schemaVersion!==1)throw new TypeError('Unsupported or invalid view state');
  const ids=(key:string):string[]=>{const list=value[key];if(!Array.isArray(list)||!list.every(str)||Object.keys(list).length!==list.length)throw new TypeError(`Invalid ${key}`);return [...new Set(list)];};
  if(!isObject(value.viewport))throw new TypeError('Invalid viewport');
  return {schemaVersion:1,viewport:normalizeRange(value.viewport as unknown as TimeRange),filter:validateFilter(value.filter),selectedEventIds:ids('selectedEventIds'),collapsedLaneGroupIds:ids('collapsedLaneGroupIds')};
}
