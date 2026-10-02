import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {cpus,totalmem} from 'node:os';
import {TimelineModel,aggregateEvents,packEventSlots} from '../dist/core.js';
import {syntheticData,BASE} from './fixture.mjs';
const quantile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*q))];
const measured=(fn,n)=>{const samples=[];let value;for(let i=0;i<n;i++){const start=performance.now();value=fn();samples.push(performance.now()-start);}return {p50Ms:quantile(samples,.5),p95Ms:quantile(samples,.95),samples:n,value};};
const results=[];
for(const [count,lanes] of [[1000,20],[10000,80],[100000,500]]){
 const input=syntheticData(count,lanes);globalThis.gc?.();const heapBefore=process.memoryUsage().heapUsed;
 const build=measured(()=>new TimelineModel(input),3),model=build.value,heapDelta=process.memoryUsage().heapUsed-heapBefore;
 let queryIndex=0;const query=measured(()=>{const start=BASE+(queryIndex++%60)*100000;return model.query({start,end:start+300000});},60);
 const trace=measured(()=>model.trace(['event-4']),60),density=measured(()=>aggregateEvents(model.sorted,model.bounds(),80),3);
 const layout=measured(()=>packEventSlots(model.sorted.slice(0,600),model.bounds(),900),10);
 const metric=x=>({p50Ms:Number(x.p50Ms.toFixed(3)),p95Ms:Number(x.p95Ms.toFixed(3)),samples:x.samples});
 results.push({events:count,lanes,modelBuild:metric(build),query:metric(query),trace:metric(trace),density:metric(density),detailLayout600:metric(layout),heapDeltaBytes:heapDelta});
}
const report={measuredAt:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,cpuCount:cpus().length,totalMemoryBytes:totalmem(),method:'Seeded fixture; 10-event directed packages; 5-minute range queries; wall clock; build/density only three samples; heap delta is approximate and includes temporary allocations.',results};
await mkdir('benchmark/results',{recursive:true});await writeFile('benchmark/results/core.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
