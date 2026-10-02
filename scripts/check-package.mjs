import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'event-lanes-pack-'));
try{
 const packed=spawnSync('npm',['pack','--ignore-scripts','--json','--pack-destination',dir],{encoding:'utf8'});if(packed.status!==0)throw new Error(packed.stderr);
 const [{filename}]=JSON.parse(packed.stdout);const unpack=spawnSync('tar',['-xf',join(dir,filename),'-C',dir]);assert.equal(unpack.status,0);
 const pkg=JSON.parse(await readFile(join(dir,'package/package.json'),'utf8'));assert.equal(Object.keys(pkg.dependencies??{}).length,0);
 const core=await import(pathToFileURL(join(dir,'package/dist/core.js')).href);assert.equal(typeof core.TimelineModel,'function');
 const api=await import(pathToFileURL(join(dir,'package/dist/index.js')).href);assert.equal(typeof api.createTimeline,'function');
 for(const path of ['dist/index.d.ts','dist/event-lanes.global.js','schema.json','LICENSE','AGENTS.md','docs/QUICKSTART.md','examples/quickstart/data.json'])assert.ok((await readFile(join(dir,'package',path))).length);
 console.log(`Package ${pkg.version}: ESM/core imports, declarations, global build, schema and onboarding verified`);
}finally{await rm(dir,{recursive:true,force:true});}
