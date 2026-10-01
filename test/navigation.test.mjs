import test from 'node:test';
import assert from 'node:assert/strict';
import {EventTimeline, TimelineModel} from '../dist/index.js';

// Controller-only harness: real navigation/model logic with layout scheduling stubbed.
// This does not instantiate a DOM or verify browser drawing or pointer interactions.
function controller(){
 const model=new TimelineModel({schemaVersion:1,laneGroups:[{id:'g',label:'Group'}],lanes:[{id:'a',label:'A',groupId:'g'},{id:'b',label:'B'}],events:[
  {id:'root',label:'Root',time:100,laneIds:['a']},
  {id:'effect',label:'Effect',time:10000,endTime:11000,laneIds:['b']},
  {id:'coincidence',label:'Coincidence',time:50000,laneIds:['b']}
 ],relationships:[{id:'r',source:'root',target:'effect',kind:'causes'},{id:'c',source:'root',target:'coincidence',kind:'correlates'}]});
 const selected=new Set(['root']);
 return Object.assign(Object.create(EventTimeline.prototype),{
  model,selected,traceResult:model.trace(selected),filter:{},viewport:{start:0,end:1000},
  collapsed:new Set(['g']),laneY:new Map(),rows:[],height:420,disposed:false,
  options:{rowHeight:64},formatter:new Intl.DateTimeFormat('en-GB',{timeZone:'UTC'}),spacer:{style:{}},scroll:{scrollTop:0},live:{textContent:''},
  schedule(){},updateAccessible(){},emit(){},tip:{hidden:true}
 });
}
test('focus refuses filtered and unknown events without changing navigation or selection',()=>{
 const t=controller();t.filter={laneIds:['b']};const before=t.getViewState();
 assert.equal(t.focusEvent('root'),false);assert.equal(t.focusEvent('missing'),false);
 assert.deepEqual(t.getViewState(),before);
});
test('focus expands a collapsed lane and reveals a distant interval without replacing trace roots',()=>{
 const t=controller();assert.equal(t.focusEvent('root'),true);assert.equal(t.collapsed.has('g'),false);
 assert.equal(t.focusEvent('effect'),true);assert.ok(t.viewport.start<=10000&&t.viewport.end>=11000);
 assert.deepEqual(t.getSelection(),['root']);assert.equal(t.activeId,'effect');
});
test('fit trace includes declared effects, preserves filters, and does nothing for empty selection',()=>{
 const t=controller();t.filter={query:'Root'};t.fitTrace();
 assert.ok(t.viewport.start<100&&t.viewport.end>11000&&t.viewport.end<50000);
 assert.deepEqual(t.filter,{query:'Root'});assert.deepEqual(t.getSelection(),['root']);assert.equal(t.collapsed.has('g'),false);
 t.selected.clear();const before=t.getViewport();t.fitTrace();assert.deepEqual(t.getViewport(),before);
});
