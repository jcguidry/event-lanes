import type {ViewState} from './types.js';
/** Stores view snapshots, never datasets. Data replacement starts a new history. */
export class ViewHistory {
  private past: ViewState[]=[];private future: ViewState[]=[];private present: ViewState|undefined;
  private lastKey='';private lastTime=-Infinity;
  constructor(readonly limit=100){if(!Number.isInteger(limit)||limit<1||limit>1000)throw new RangeError('History limit must be 1–1000');}
  reset(state:ViewState){this.past=[];this.future=[];this.present=structuredClone(state);this.lastKey='';this.lastTime=-Infinity;}
  capture(state:ViewState,key='',now=Date.now()){
    if(!this.present){this.reset(state);return;}
    if(JSON.stringify(state)===JSON.stringify(this.present))return;
    if(!(key&&key===this.lastKey&&now-this.lastTime<350))this.past.push(this.present);
    if(this.past.length>this.limit)this.past.shift();this.present=structuredClone(state);this.future=[];this.lastKey=key;this.lastTime=now;
  }
  get canUndo(){return this.past.length>0;}get canRedo(){return this.future.length>0;}
  undo():ViewState|undefined{const state=this.past.pop();if(!state)return;this.future.push(this.present!);this.present=state;this.lastKey='';return structuredClone(state);}
  redo():ViewState|undefined{const state=this.future.pop();if(!state)return;this.past.push(this.present!);this.present=state;this.lastKey='';return structuredClone(state);}
}
