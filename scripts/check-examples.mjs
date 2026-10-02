import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {TimelineModel} from '../dist/core.js';
const fixture=new TimelineModel(JSON.parse(await readFile('examples/quickstart/data.json','utf8')));
assert.deepEqual(fixture.trace(fixture.groups.get('recovery')).upstream,['hold']);
function python(args){const r=spawnSync('python3',['examples/python-server/make_data.py',...args],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return JSON.parse(r.stdout);}
const plain=python([]),m=new TimelineModel(plain),trace=m.trace(m.groups.get('recovery'));
assert.deepEqual(trace.roots,['handoff']);assert.deepEqual(trace.upstream,['hold']);assert.deepEqual(trace.downstream,['complete']);
if(process.env.EVENT_LANES_TEST_PANDAS==='1'){assert.deepEqual(python(['--pandas']),plain);console.log('pandas DataFrames and Python records produce identical validated JSON');}
console.log('JS/TS quickstart and Python examples verified');
