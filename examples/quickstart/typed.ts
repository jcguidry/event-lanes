import {createTimeline} from '../../src/index.js';
import type {ViewState} from '../../src/types.js';
export async function mount(container:HTMLElement,url:string){
 const timeline=createTimeline(container,{selectionMode:'group'});
 const response=await fetch(url);if(!response.ok){timeline.destroy();throw new Error(`HTTP ${response.status}`);}
 try{timeline.setData(await response.json());}catch(error){timeline.destroy();throw error;}
 timeline.selectGroup('recovery');timeline.fitTrace();
 const saved:ViewState=timeline.getViewState();
 return {timeline,saved,dispose:()=>timeline.destroy()};
}
