import { TimelineModel, aggregateEvents, normalizeRange, zoomRange } from './core.js';
import type { TimelineData, TimelineOptions, TimelineEvents, TemporalEvent, TimeRange, TimelineFilter, TraceResult, ViewState } from './types.js';

const EMPTY: TimelineData={schemaVersion:1,lanes:[],events:[]};
const PALETTE=['#5267df','#ba5e24','#157f80','#9b50b7','#62742b','#ba4f68'];
const CSS=`:host{display:block;font:13px/1.45 system-ui,sans-serif;color:#172a3a;contain:content}*{box-sizing:border-box}button{font:inherit;color:inherit;background:white;border:1px solid #d6e0e8;border-radius:6px;padding:5px 10px;cursor:pointer}button:hover{background:#edf4fa}button:focus-visible,summary:focus-visible,.scroll:focus-visible{outline:3px solid #5267df;outline-offset:-3px}.bar{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #dde5eb;background:#f9fbfd;flex-wrap:wrap}.zone{margin-left:auto;color:#617384;font-size:11px}.stage{position:relative;min-height:180px;background:#fff;border:1px solid #dce5ed;border-top:0;overflow:hidden}.scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;cursor:crosshair}.spacer{width:1px;pointer-events:none}canvas{position:absolute;left:0;top:0;pointer-events:none}.tip{position:absolute;z-index:2;pointer-events:none;background:#182d3d;color:#fff;padding:9px 12px;border-radius:7px;max-width:310px;white-space:pre-line;box-shadow:0 5px 20px #172a3a25;font-size:12px}.status{padding:7px 12px;font-size:11px;color:#5d7182;border:1px solid #dce5ed;border-top:0}.access{font-size:12px;border:1px solid #dce5ed;border-top:0;padding:8px 12px}summary{cursor:pointer}.access-list{max-height:190px;overflow:auto;display:flex;flex-direction:column;gap:5px;margin-top:8px}.access-list button{text-align:left}.access-list button[aria-pressed=true]{border-color:#e39820;background:#fff7e6}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}`;
interface Row { id: string; label: string; top: number; height: number; group: boolean }
interface Hit { ids: string[]; x1: number; x2: number; y1: number; y2: number; groupId?: string; range?: TimeRange }
interface Drag { x: number; y: number; lastX: number; lastY: number; moved: boolean; shift: boolean; range: TimeRange; pointerId: number }
export class EventTimeline {
  private model=new TimelineModel(EMPTY);
  private selected=new Set<string>();
  private filter: TimelineFilter={};
  private viewport: TimeRange={start:0,end:3600000};
  private traceResult: TraceResult={roots:[],upstream:[],downstream:[],relationshipIds:[]};
  private upstream=new Set<string>();private downstream=new Set<string>();
  private collapsed=new Set<string>();private rows: Row[]=[];private laneY=new Map<string,number>();
  private hits: Hit[]=[];private frame=0;private disposed=false;private initialized=false;private drag: Drag|undefined;
  private hoverKey='';private activeId: string|undefined;private width=800;private height=420;
  private readonly host: HTMLDivElement;private readonly shadow: ShadowRoot;private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;private readonly stage: HTMLDivElement;private readonly scroll: HTMLDivElement;
  private readonly spacer: HTMLDivElement;private readonly tip: HTMLDivElement;private readonly status: HTMLDivElement;private readonly list: HTMLDivElement;private readonly live: HTMLDivElement;
  private readonly observer: ResizeObserver;private readonly controller=new AbortController();
  private readonly handlers=new Map<keyof TimelineEvents,Set<(detail: never)=>void>>();
  private readonly options: Required<Omit<TimelineOptions,'trace'>> & Pick<TimelineOptions,'trace'>;
  private readonly formatter: Intl.DateTimeFormat;private readonly dateFormatter: Intl.DateTimeFormat;
  constructor(container: HTMLElement,options: TimelineOptions={}) {
    if(!container || typeof container.appendChild!=='function')throw new TypeError('A container HTMLElement is required');
    this.options={height:420,rowHeight:64,labelWidth:170,timeZone:'UTC',selectionMode:'event',densityThreshold:600,showRelationships:true,ariaLabel:'Interactive event timeline',...options};
    for(const key of ['height','rowHeight','labelWidth','densityThreshold'] as const)if(!Number.isFinite(this.options[key])||this.options[key]<=0)throw new RangeError(`${key} must be positive`);
    this.options.height=Math.max(180,this.options.height);this.options.rowHeight=Math.max(36,this.options.rowHeight);
    this.formatter=new Intl.DateTimeFormat('en-GB',{timeZone:this.options.timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    this.dateFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:this.options.timeZone,day:'2-digit',month:'short',year:'numeric'});
    this.host=document.createElement('div');this.shadow=this.host.attachShadow({mode:'open'});
    this.shadow.innerHTML=`<style>${CSS}</style><div class="bar"><button data-action="in" aria-label="Zoom in">＋</button><button data-action="out" aria-label="Zoom out">−</button><button data-action="fit">Fit all</button><button data-action="selection">Fit selection</button><button data-action="clear">Clear selection</button><span class="zone"></span></div><div class="stage"><div class="scroll" tabindex="0" role="region"><div class="spacer"></div></div><canvas aria-hidden="true"></canvas><div class="tip" hidden></div></div><div class="status"></div><details class="access"><summary>Accessible event list</summary><div class="access-list"></div></details><div class="sr" aria-live="polite" aria-atomic="true"></div>`;
    this.stage=this.shadow.querySelector('.stage')!;this.scroll=this.shadow.querySelector('.scroll')!;this.canvas=this.shadow.querySelector('canvas')!;this.spacer=this.shadow.querySelector('.spacer')!;this.tip=this.shadow.querySelector('.tip')!;this.status=this.shadow.querySelector('.status')!;this.list=this.shadow.querySelector('.access-list')!;this.live=this.shadow.querySelector('.sr')!;
    const context=this.canvas.getContext('2d');if(!context)throw new Error('Canvas2D is unavailable');this.context=context;
    this.scroll.setAttribute('aria-label',`${this.options.ariaLabel}. Drag to pan time. Shift drag to select. Control wheel to zoom. Arrow up/down browses events; Enter selects; plus/minus zooms; F fits all; Escape clears.`);
    this.shadow.querySelector('.zone')!.textContent=this.options.timeZone;
    this.stage.style.height=`${this.options.height}px`;container.appendChild(this.host);
    const signal=this.controller.signal;
    this.shadow.querySelector('.bar')!.addEventListener('click',e=>{const action=(e.target as HTMLElement).closest('button')?.dataset.action;if(action==='in')this.zoom(.7);if(action==='out')this.zoom(1/.7);if(action==='fit')this.fit();if(action==='selection'&&this.selected.size)this.fit(this.selected);if(action==='clear')this.select([],false,'user');},{signal});
    this.scroll.addEventListener('scroll',()=>{this.tip.hidden=true;this.schedule();},{signal});
    this.scroll.addEventListener('wheel',e=>this.wheel(e),{signal,passive:false});
    this.scroll.addEventListener('pointerdown',e=>this.pointerDown(e),{signal});
    this.scroll.addEventListener('pointermove',e=>this.pointerMove(e),{signal});
    this.scroll.addEventListener('pointerup',e=>this.pointerUp(e),{signal});
    this.scroll.addEventListener('pointercancel',()=>{this.drag=undefined;this.schedule();},{signal});
    this.scroll.addEventListener('pointerleave',()=>{this.tip.hidden=true;},{signal});
    this.scroll.addEventListener('dblclick',e=>{const hit=this.hit(e.offsetX,e.offsetY);if(hit?.range){this.setViewport(hit.range);return;}if(hit?.ids.length){this.select(this.model.expandGroups(hit.ids),false,'user');this.fit(this.selected);this.emit('activate',{eventIds:[...this.selected]});}},{signal});
    this.scroll.addEventListener('keydown',e=>this.keydown(e),{signal});
    this.shadow.querySelector('details')!.addEventListener('toggle',()=>this.updateAccessible(),{signal});
    this.observer=new ResizeObserver(()=>{this.width=this.scroll.clientWidth;this.height=this.stage.clientHeight;this.schedule();});this.observer.observe(this.stage);
    this.rebuildRows();this.schedule();
  }
  /** Replaces data atomically; valid selected IDs and the viewport survive refreshes. */
  setData(data: unknown): void {
    this.assertAlive();const next=new TimelineModel(data);this.model=next;
    this.selected=new Set([...this.selected].filter(id=>next.events.has(id)));
    this.collapsed=new Set([...this.collapsed].filter(id=>next.data.laneGroups?.some(g=>g.id===id)));
    if(!this.initialized){this.viewport=next.bounds();this.initialized=true;}
    this.refreshTrace();this.rebuildRows();this.updateAccessible();this.schedule();this.emitSelection('data');
  }
  getData(): TimelineData { return structuredClone(this.model.data); }
  getViewport(): TimeRange { return {...this.viewport}; }
  setViewport(range: TimeRange): void { this.changeViewport(range,'api'); }
  zoom(factor: number,anchorFraction=.5): void { this.changeViewport(zoomRange(this.viewport,factor,anchorFraction),'api'); }
  fit(ids?: Iterable<string>): void { this.setViewport(this.model.bounds(ids)); }
  setSelection(ids: Iterable<string>,options: {expandGroups?: boolean}={}): void {this.select(options.expandGroups?this.model.expandGroups(ids):[...ids],false,'api');}
  selectGroup(groupId: string,additive=false): void {this.assertAlive();if(!this.model.data.eventGroups?.some(g=>g.id===groupId))throw new RangeError(`Unknown event group: ${groupId}`);this.select(this.model.groups.get(groupId)??[],additive,'api');}
  setSelectionMode(mode: 'event'|'group'): void {this.assertAlive();if(mode!=='event'&&mode!=='group')throw new TypeError('Invalid selection mode');this.options.selectionMode=mode;}
  getSelection(): string[] {return [...this.selected];}
  trace(ids: Iterable<string>=this.selected): TraceResult {return this.model.trace(ids,this.options.trace);}
  setFilter(filter: TimelineFilter): void {this.assertAlive();this.filter=validateFilter(filter);this.rebuildRows();this.updateAccessible();this.schedule();}
  getViewState(): ViewState {return {schemaVersion:1,viewport:this.getViewport(),selectedEventIds:this.getSelection(),filter:structuredClone(this.filter),collapsedLaneGroupIds:[...this.collapsed]};}
  restoreViewState(state: ViewState): void {
    this.assertAlive();if(state.schemaVersion!==1)throw new RangeError('Unsupported view-state version');const range=normalizeRange(state.viewport);
    if(!Array.isArray(state.selectedEventIds)||!Array.isArray(state.collapsedLaneGroupIds)||!state.filter||typeof state.filter!=='object')throw new TypeError('Invalid view state');
    const filter=validateFilter(state.filter);if(![...state.selectedEventIds,...state.collapsedLaneGroupIds].every(id=>typeof id==='string'))throw new TypeError('Invalid view-state IDs');this.viewport=range;this.filter=filter;this.collapsed=new Set(state.collapsedLaneGroupIds);this.selected=new Set(state.selectedEventIds.filter(id=>this.model.events.has(id)));this.refreshTrace();this.rebuildRows();this.updateAccessible();this.schedule();this.emitSelection('api');this.emit('viewport',{...range,source:'api'});
  }
  on<K extends keyof TimelineEvents>(name: K,handler:(detail: TimelineEvents[K])=>void):()=>void {
    this.assertAlive();let list=this.handlers.get(name);if(!list){list=new Set();this.handlers.set(name,list);}list.add(handler as (detail:never)=>void);return ()=>list!.delete(handler as (detail:never)=>void);
  }
  /** Current visible canvas only. Call after layout; labels include display zone. */
  exportPng(): string {this.assertAlive();this.render();return this.canvas.toDataURL('image/png');}
  destroy(): void {if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.controller.abort();this.handlers.clear();this.host.remove();}
  private assertAlive(){if(this.disposed)throw new Error('Timeline has been destroyed');}
  private emit<K extends keyof TimelineEvents>(name:K,detail:TimelineEvents[K]){for(const h of this.handlers.get(name)??[])h(structuredClone(detail) as never);}
  private emitSelection(source:'user'|'api'|'data'){this.emit('selection',{eventIds:[...this.selected],groupIds:[...new Set([...this.selected].flatMap(id=>this.model.events.get(id)?.groupIds??[]))],trace:structuredClone(this.traceResult),source});}
  private refreshTrace(){this.traceResult=this.model.trace(this.selected,this.options.trace);this.upstream=new Set(this.traceResult.upstream);this.downstream=new Set(this.traceResult.downstream);}
  private select(ids:Iterable<string>,additive:boolean,source:'user'|'api'|'data'){
    this.assertAlive();const next=[...ids].filter(id=>this.model.events.has(id));this.selected=new Set(additive?[...this.selected,...next]:next);this.refreshTrace();this.tip.hidden=true;this.updateAccessible();this.schedule();this.live.textContent=`${this.selected.size} events selected. ${this.upstream.size} upstream and ${this.downstream.size} downstream events.`;this.emitSelection(source);
  }
  private changeViewport(range:TimeRange,source:'api'|'user'){this.assertAlive();this.viewport=normalizeRange(range);this.tip.hidden=true;this.updateAccessible();this.schedule();this.emit('viewport',{...this.viewport,source});}
  private rebuildRows(){
    this.rows=[];this.laneY.clear();let top=0;const lanes=this.model.data.lanes.filter(l=>!this.filter.laneIds||this.filter.laneIds.includes(l.id));
    const append=(lane: typeof lanes[number])=>{this.rows.push({id:lane.id,label:lane.label,top,height:this.options.rowHeight,group:false});this.laneY.set(lane.id,top+this.options.rowHeight/2);top+=this.options.rowHeight;};
    for(const group of this.model.data.laneGroups??[]){const members=lanes.filter(l=>l.groupId===group.id);if(!members.length)continue;this.rows.push({id:group.id,label:`${this.collapsed.has(group.id)?'▸':'▾'} ${group.label} · ${members.length}`,top,height:30,group:true});top+=30;if(!this.collapsed.has(group.id))members.forEach(append);}
    lanes.filter(l=>!l.groupId).forEach(append);this.spacer.style.height=`${Math.max(this.height,top+44)}px`;
  }
  private labelWidth(){return Math.min(this.options.labelWidth,Math.max(70,this.width*.32));}
  private plotWidth(){return Math.max(1,this.width-this.labelWidth()-16);}
  private tx(time:number){return this.labelWidth()+(time-this.viewport.start)/(this.viewport.end-this.viewport.start)*this.plotWidth();}
  private yt(lane:string){const y=this.laneY.get(lane);return y===undefined?undefined:44+y-this.scroll.scrollTop;}
  private schedule(){if(!this.disposed&&!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.render();});}
  private color(e:TemporalEvent){if(this.selected.has(e.id))return '#dc8613';if(this.upstream.has(e.id))return '#3575cf';if(this.downstream.has(e.id))return '#168b70';if(e.color&&/^#[\da-f]{6}$/i.test(e.color))return e.color;const g=this.model.data.eventGroups?.find(x=>e.groupIds?.includes(x.id));if(g?.color&&/^#[\da-f]{6}$/i.test(g.color))return g.color;let hash=0;for(const ch of e.groupIds?.[0]??e.kind??e.id)hash=(hash*31+ch.charCodeAt(0))>>>0;return PALETTE[hash%PALETTE.length]!;}
  private alpha(e:TemporalEvent){return this.selected.size&&!this.selected.has(e.id)&&!this.upstream.has(e.id)&&!this.downstream.has(e.id)? .16:1;}
  private render(){
    if(this.disposed)return;this.width=this.scroll.clientWidth||this.width;this.height=this.stage.clientHeight||this.options.height;
    const c=this.context,dpr=Math.min(window.devicePixelRatio||1,3);if(this.canvas.width!==Math.round(this.width*dpr)||this.canvas.height!==Math.round(this.height*dpr)){this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.canvas.style.width=`${this.width}px`;this.canvas.style.height=`${this.height}px`;}
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,this.width,this.height);c.fillStyle='#fff';c.fillRect(0,0,this.width,this.height);this.hits=[];
    const left=this.labelWidth(),plot=this.plotWidth(),offset=this.scroll.scrollTop;
    c.font='12px system-ui';c.textBaseline='middle';
    for(const row of this.rows){const y=44+row.top-offset;if(y+row.height<44||y>this.height)continue;c.fillStyle=row.group?'#eaf0f5':(this.rows.indexOf(row)%2?'#f8fafc':'#fff');c.fillRect(0,Math.max(44,y),this.width,Math.min(row.height,y+row.height-44));c.strokeStyle='#e8eef3';c.beginPath();c.moveTo(0,y+row.height);c.lineTo(this.width,y+row.height);c.stroke();if(row.group)this.hits.push({ids:[],x1:0,x2:left,y1:Math.max(44,y),y2:y+row.height,groupId:row.id});}
    const events=this.model.query(this.viewport,this.filter),dense=events.length>this.options.densityThreshold;
    c.save();c.beginPath();c.rect(left,44,plot,this.height-44);c.clip();
    const span=this.viewport.end-this.viewport.start,target=span/Math.max(2,Math.floor(plot/125));
    const intervals=[1,10,100,1000,5000,15000,30000,60000,300000,900000,1800000,3600000,10800000,21600000,43200000,86400000,604800000,2592000000,31536000000];const step=intervals.find(s=>s>=target)??target;
    const ticks:number[]=[];for(let t=Math.ceil(this.viewport.start/step)*step;t<=this.viewport.end&&ticks.length<200;t+=step){ticks.push(t);const x=this.tx(t);c.strokeStyle='#e4eaf0';c.beginPath();c.moveTo(x,44);c.lineTo(x,this.height);c.stroke();}
    if(dense){const bins=Math.max(1,Math.floor(plot/14));for(const cell of aggregateEvents(events,this.viewport,bins)){const y=this.yt(cell.laneId);if(y===undefined||y<25||y>this.height+20)continue;const x=this.tx(cell.start),w=plot/bins;const selected=cell.eventIds.some(id=>this.selected.has(id));c.globalAlpha=Math.min(.95,.2+Math.log2(cell.eventIds.length+1)/7);c.fillStyle=selected?'#dc8613':'#5267df';c.fillRect(x+1,y-12,Math.max(1,w-2),24);c.globalAlpha=1;this.hits.push({ids:cell.eventIds,x1:x,x2:x+w,y1:y-14,y2:y+14,range:{start:cell.start,end:cell.end}});}}
    const drawn=dense?events.filter(e=>this.selected.has(e.id)||this.upstream.has(e.id)||this.downstream.has(e.id)).slice(0,this.options.densityThreshold):events;
    if(this.options.showRelationships&&this.selected.size){const relations=new Set(this.traceResult.relationshipIds);for(const r of this.model.data.relationships??[]){if(!relations.has(r.id))continue;const source=this.model.events.get(r.source)!,targetEvent=this.model.events.get(r.target)!;const ay=this.eventY(source),by=this.eventY(targetEvent);if(ay===undefined||by===undefined)continue;const ax=this.tx(source.time),bx=this.tx(targetEvent.time);c.globalAlpha=.45;c.strokeStyle='#6b7b8c';c.setLineDash([4,4]);c.beginPath();c.moveTo(ax,ay);c.bezierCurveTo(ax+25,ay-20,bx-25,by-20,bx,by);c.stroke();c.setLineDash([]);c.globalAlpha=1;}}
    for(const e of drawn)this.drawEvent(e);
    if(this.drag?.shift&&this.drag.moved){c.fillStyle='#5267df18';c.strokeStyle='#5267df';const x=Math.min(this.drag.x,this.drag.lastX),y=Math.min(this.drag.y,this.drag.lastY),w=Math.abs(this.drag.x-this.drag.lastX),h=Math.abs(this.drag.y-this.drag.lastY);c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);}
    c.restore();
    // Labels and scale always paint over clipped plot geometry.
    c.fillStyle='#f5f8fb';c.fillRect(0,44,left,this.height-44);c.save();c.beginPath();c.rect(8,44,left-16,this.height-44);c.clip();for(const row of this.rows){const y=44+row.top-offset;if(y+row.height<44||y>this.height)continue;c.fillStyle=row.group?'#2b4357':'#42596d';c.font=row.group?'600 11px system-ui':'12px system-ui';this.text(row.label,12,y+row.height/2,left-24);}c.restore();
    c.fillStyle='#f0f5f9';c.fillRect(0,0,this.width,44);c.strokeStyle='#d6e0e8';c.beginPath();c.moveTo(left,0);c.lineTo(left,this.height);c.moveTo(0,44);c.lineTo(this.width,44);c.stroke();c.fillStyle='#657b8e';c.font='10px system-ui';c.fillText(this.options.timeZone,12,14);c.font='600 11px system-ui';c.fillStyle='#213e53';c.fillText('Entities',12,31);c.save();c.beginPath();c.rect(left+3,0,plot-3,44);c.clip();for(const t of ticks){const x=this.tx(t);c.font='10px system-ui';c.fillStyle='#63798b';c.fillText(this.dateFormatter.format(t),x+4,12);c.font='11px system-ui';c.fillStyle='#27475d';c.fillText(this.formatter.format(t),x+4,29);}c.restore();
    if(!events.length){c.fillStyle='#6b7f90';c.font='13px system-ui';c.fillText(this.model.data.events.length?'No events in this view. Adjust filters or Fit all.':'Pass a dataset to begin.',left+20,90);}
    this.status.textContent=`${events.length.toLocaleString()} events in range · ${this.selected.size} selected · ${dense?'Density view — double-click a cell to inspect':'Detail view'} · Drag: pan · Shift-drag: select · Ctrl/⌘ wheel: zoom`;
  }
  private eventY(e:TemporalEvent){return e.laneIds.map(id=>this.yt(id)).find(y=>y!==undefined);}
  private text(value:string,x:number,y:number,max:number){const c=this.context;let text=value;if(c.measureText(text).width>max){while(text.length&&c.measureText(text+'…').width>max)text=text.slice(0,-1);text+='…';}c.fillText(text,x,y);}
  private drawEvent(e:TemporalEvent){
    const c=this.context,x=this.tx(e.time),end=this.tx(e.endTime??e.time),left=this.labelWidth();const ys=e.laneIds.map(id=>this.yt(id)).filter((y):y is number=>y!==undefined);if(!ys.length||Math.max(...ys)<44||Math.min(...ys)>this.height)return;
    const color=this.color(e);c.globalAlpha=this.alpha(e);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=this.selected.has(e.id)?3:1.6;
    if(!e.transfers?.length&&ys.length>1){c.beginPath();c.moveTo(x,Math.min(...ys));c.lineTo(x,Math.max(...ys));c.stroke();this.hits.push({ids:[e.id],x1:x-6,x2:x+6,y1:Math.max(44,Math.min(...ys)),y2:Math.min(this.height,Math.max(...ys))});}
    for(const tr of e.transfers??[]){const from=this.yt(tr.from),to=this.yt(tr.to);if(from===undefined||to===undefined)continue;c.beginPath();c.moveTo(x,from);c.lineTo(x,to);c.stroke();const direction=to>=from?1:-1;c.beginPath();c.moveTo(x,to);c.lineTo(x-5,to-8*direction);c.lineTo(x+5,to-8*direction);c.closePath();c.fill();this.hits.push({ids:[e.id],x1:x-7,x2:x+7,y1:Math.max(44,Math.min(from,to)-5),y2:Math.min(this.height,Math.max(from,to)+5)});}
    for(const y of ys){if(y<38||y>this.height+8)continue;if(e.endTime!==undefined&&end>x){c.globalAlpha=this.alpha(e)*.22;c.fillRect(Math.max(left,x),y-9,Math.max(2,end-Math.max(left,x)),18);c.globalAlpha=this.alpha(e);c.strokeRect(x,y-9,Math.max(2,end-x),18);this.hits.push({ids:[e.id],x1:Math.max(left,x-5),x2:Math.min(this.width,end+5),y1:y-12,y2:y+12});}
      c.beginPath();c.arc(x,y,this.selected.has(e.id)?5:3.8,0,Math.PI*2);c.fill();this.hits.push({ids:[e.id],x1:x-8,x2:x+8,y1:y-9,y2:y+9});
    }
    const labelY=ys.find(y=>y>=60&&y<this.height-10);if(labelY!==undefined&&(this.plotWidth()>350||this.selected.has(e.id))){c.font=this.selected.has(e.id)?'600 11px system-ui':'11px system-ui';this.text(e.label,Math.max(left+4,x+8),labelY-15,130);}
    if(this.activeId===e.id){c.strokeStyle='#152d42';c.setLineDash([2,2]);c.strokeRect(x-9,(labelY??ys[0]!)-10,18,20);c.setLineDash([]);}c.globalAlpha=1;
  }
  private point(e:PointerEvent){const r=this.scroll.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  private hit(x:number,y:number){return [...this.hits].reverse().find(h=>x>=h.x1&&x<=h.x2&&y>=h.y1&&y<=h.y2);}
  private wheel(e:WheelEvent){const scale=e.deltaMode===1?16:e.deltaMode===2?this.height:1;if(e.ctrlKey||e.metaKey){e.preventDefault();const r=this.scroll.getBoundingClientRect();this.changeViewport(zoomRange(this.viewport,Math.exp(Math.max(-1,Math.min(1,e.deltaY*scale*.003))),(e.clientX-r.left-this.labelWidth())/this.plotWidth()),'user');}else if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();const delta=(e.deltaX||e.deltaY)*scale/this.plotWidth()*(this.viewport.end-this.viewport.start);this.changeViewport({start:this.viewport.start+delta,end:this.viewport.end+delta},'user');}}
  private pointerDown(e:PointerEvent){if(e.button!==0||e.pointerType==='touch')return;const {x,y}=this.point(e);this.scroll.focus();this.scroll.setPointerCapture(e.pointerId);this.drag={x,y,lastX:x,lastY:y,moved:false,shift:e.shiftKey,range:this.getViewport(),pointerId:e.pointerId};}
  private pointerMove(e:PointerEvent){const {x,y}=this.point(e);if(this.drag){const d=this.drag;d.lastX=x;d.lastY=y;d.moved ||= Math.abs(x-d.x)+Math.abs(y-d.y)>4;if(d.moved&&!d.shift&&d.x>=this.labelWidth()){const delta=(d.x-x)/this.plotWidth()*(d.range.end-d.range.start);this.changeViewport({start:d.range.start+delta,end:d.range.end+delta},'user');}this.schedule();return;}
    const hit=this.hit(x,y),key=hit?.ids.join('|')??'';if(key!==this.hoverKey){this.hoverKey=key;this.emit('hover',{eventIds:hit?.ids??[]});}if(!hit?.ids.length){this.tip.hidden=true;return;}const e0=this.model.events.get(hit.ids[0]!)!;this.tip.textContent=hit.ids.length>1?`${hit.ids.length} events in this cell\nClick to select · Double-click to zoom`:`${e0.label}\n${this.dateFormatter.format(e0.time)} ${this.formatter.format(e0.time)} ${this.options.timeZone}${e0.description?'\n'+e0.description:''}`;this.tip.hidden=false;this.tip.style.left=`${Math.max(5,Math.min(this.width-320,x+14))}px`;this.tip.style.top=`${Math.max(48,Math.min(this.height-95,y+15))}px`;
  }
  private pointerUp(e:PointerEvent){const d=this.drag;if(!d)return;const {x,y}=this.point(e);this.drag=undefined;if(this.scroll.hasPointerCapture(e.pointerId))this.scroll.releasePointerCapture(e.pointerId);
    if(d.moved&&d.shift){const x1=Math.max(this.labelWidth(),Math.min(d.x,x)),x2=Math.max(d.x,x),y1=Math.max(44,Math.min(d.y,y)),y2=Math.max(d.y,y);let ids=[...new Set(this.hits.filter(h=>!h.groupId&&h.x2>=x1&&h.x1<=x2&&h.y2>=y1&&h.y1<=y2).flatMap(h=>h.ids))];if(this.options.selectionMode==='group')ids=this.model.expandGroups(ids);this.select(ids,e.ctrlKey||e.metaKey,'user');}
    else if(!d.moved){const hit=this.hit(x,y);if(hit?.groupId){this.collapsed.has(hit.groupId)?this.collapsed.delete(hit.groupId):this.collapsed.add(hit.groupId);this.rebuildRows();}else if(hit?.ids.length){const ids=this.options.selectionMode==='group'?this.model.expandGroups(hit.ids):hit.ids;if(e.ctrlKey||e.metaKey){const next=new Set(this.selected);const all=ids.every(id=>next.has(id));for(const id of ids)all?next.delete(id):next.add(id);this.select(next,false,'user');}else this.select(ids,false,'user');}else if(!e.ctrlKey&&!e.metaKey)this.select([],false,'user');}this.schedule();
  }
  private keydown(e:KeyboardEvent){
    if(e.key==='Escape'){this.drag=undefined;this.select([],false,'user');e.preventDefault();return;}
    if(e.key==='+'||e.key==='='){this.zoom(.7);e.preventDefault();return;}if(e.key==='-'){this.zoom(1/.7);e.preventDefault();return;}if(e.key.toLowerCase()==='f'||e.key==='Home'){this.fit();e.preventDefault();return;}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const delta=(this.viewport.end-this.viewport.start)*.15*(e.key==='ArrowLeft'?-1:1);this.changeViewport({start:this.viewport.start+delta,end:this.viewport.end+delta},'user');e.preventDefault();return;}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){const items=this.model.query({start:-8.64e15,end:8.64e15},this.filter);if(!items.length)return;const index=items.findIndex(x=>x.id===this.activeId),next=items[Math.max(0,Math.min(items.length-1,index+(e.key==='ArrowDown'?1:-1)))]!;this.activeId=next.id;if(next.time<this.viewport.start||next.time>this.viewport.end){const span=this.viewport.end-this.viewport.start;this.changeViewport({start:next.time-span/2,end:next.time+span/2},'user');}const y=this.laneY.get(next.laneIds[0]!);if(y!==undefined)this.scroll.scrollTop=Math.max(0,y-this.height/2);this.live.textContent=`${next.label}. ${this.formatter.format(next.time)}. Press Enter to select.`;this.schedule();e.preventDefault();return;}
    if((e.key==='Enter'||e.key===' ')&&this.activeId){const ids=this.options.selectionMode==='group'?this.model.expandGroups([this.activeId]):[this.activeId];this.select(ids,e.shiftKey,'user');e.preventDefault();}
  }
  private updateAccessible(){const details=this.shadow.querySelector('details')!;if(!details.open)return;const items=this.model.query(this.viewport,this.filter);this.list.replaceChildren();const note=document.createElement('span');note.textContent=`${items.length} events in range. First 200 listed; narrow the viewport or filters to see others. Arrow keys in the timeline browse all filtered events.`;this.list.append(note);for(const e of items.slice(0,200)){const button=document.createElement('button');button.type='button';button.textContent=`${this.formatter.format(e.time)} — ${e.label} — ${e.laneIds.join(', ')}`;button.setAttribute('aria-pressed',String(this.selected.has(e.id)));button.addEventListener('click',()=>this.select(this.options.selectionMode==='group'?this.model.expandGroups([e.id]):[e.id],false,'user'),{signal:this.controller.signal});this.list.append(button);}}
}
export function createTimeline(container: HTMLElement,options?:TimelineOptions): EventTimeline {return new EventTimeline(container,options);}

function validateFilter(value: TimelineFilter): TimelineFilter {if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Invalid filter');for(const key of ['laneIds','groupIds','kinds'] as const){if(value[key]!==undefined&&(!Array.isArray(value[key])||!value[key]!.every(v=>typeof v==='string')))throw new TypeError('Filter lists must contain strings');}if(value.query!==undefined&&typeof value.query!=='string')throw new TypeError('Filter query must be a string');return structuredClone(value);}
