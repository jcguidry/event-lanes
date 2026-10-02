import test from 'node:test';
import assert from 'node:assert/strict';
import {TimelineModel,packEventSlots,placeLabels,ViewHistory,validateViewState,validateLanePresentation} from '../dist/core.js';
const state=(n=0)=>({schemaVersion:1,viewport:{start:n,end:n+100},selectedEventIds:[],filter:{},collapsedLaneGroupIds:[]});
test('stacking separates overlapping intervals and point markers, and is deterministic',()=>{
 const events=[{id:'a',time:0,endTime:50,laneIds:['x']},{id:'b',time:10,endTime:30,laneIds:['x','y']},{id:'c',time:70,laneIds:['x']}];
 const slots=packEventSlots(events,{start:0,end:100},100,5);
 assert.notEqual(slots.get('x').get('a'),slots.get('x').get('b'));assert.equal(slots.get('x').get('a'),slots.get('x').get('c'));assert.equal(slots.get('y').get('b'),0);
 assert.deepEqual(packEventSlots([...events].reverse(),{start:0,end:100},100,5),slots);
 const points=packEventSlots([{id:'p1',time:20,laneIds:['x']},{id:'p2',time:20,laneIds:['x']}],{start:0,end:100},100);assert.notEqual(points.get('x').get('p1'),points.get('x').get('p2'));
});
test('colliding labels give priority to selected context and preserve noncolliding labels',()=>{
 const labels=[{id:'unrelated',x:0,y:0,width:80,height:12,priority:1},{id:'selected',x:20,y:0,width:80,height:12,priority:3},{id:'other',x:0,y:30,width:80,height:12,priority:1}];
 assert.deepEqual(new Set(placeLabels(labels).map(x=>x.id)),new Set(['selected','other']));
});
test('history coalesces gestures, copies snapshots, bounds memory and discards redo branches',()=>{
 const h=new ViewHistory(2);h.reset(state());h.capture(state(1),'pan',100);h.capture(state(2),'pan',200);h.capture(state(3),'',800);
 assert.equal(h.undo().viewport.start,2);const restored=h.undo();assert.equal(restored.viewport.start,0);restored.viewport.start=99;assert.equal(h.redo().viewport.start,2);
 h.capture(state(4));assert.equal(h.canRedo,false);h.capture(state(5));h.capture(state(6));assert.equal(h.undo().viewport.start,5);assert.equal(h.undo().viewport.start,4);assert.equal(h.undo(),undefined);assert.throws(()=>new ViewHistory(0));
});
test('view additions round-trip JSON and old schema-1 views remain valid',()=>{
 const saved={...state(),lanePresentation:{query:'A',order:['a'],pinned:['a']},trace:{direction:'downstream',kinds:['enables'],maxDepth:null},scrollTop:50};
 assert.deepEqual(validateViewState(JSON.parse(JSON.stringify(saved))),saved);assert.deepEqual(validateViewState(state()),state());
 for(const patch of [{scrollTop:-1},{trace:{maxDepth:-1}},{lanePresentation:{query:'',order:[],pinned:['a','b','c','d']}}])assert.throws(()=>validateViewState({...state(),...patch}));
 assert.throws(()=>validateLanePresentation({query:'',order:Array(2),pinned:[]}));
});
test('explanations use shortest declared paths with original direction and exclude correlation by default',()=>{
 const m=new TimelineModel({schemaVersion:1,lanes:[{id:'x',label:'X'}],events:['a','b','c','d'].map((id,i)=>({id,label:id,time:i,laneIds:['x']})),relationships:[{id:'ab',source:'a',target:'b',kind:'causes'},{id:'bc',source:'b',target:'c',kind:'enables'},{id:'ad',source:'a',target:'d',kind:'correlates'},{id:'ca',source:'c',target:'a',kind:'enables'}]});
 assert.deepEqual(m.explain('c',['a'],{direction:'downstream'})[0].path.map(r=>r.id),['ab','bc']);assert.deepEqual(m.explain('a',['c'],{direction:'upstream'})[0].path.map(r=>r.id),['ab','bc']);
 assert.deepEqual(m.explain('d',['a']),[]);assert.equal(m.explain('d',['a'],{kinds:['correlates']})[0].path[0].id,'ad');assert.deepEqual(m.explain('c',['a'],{direction:'downstream',maxDepth:1}),[]);assert.equal(m.explain('a',['a'])[0].direction,'root');assert.deepEqual(m.explain('missing',['a']),[]);
});
