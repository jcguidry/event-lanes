import {test,expect} from 'playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const selected=page=>page.evaluate(()=>window.timeline.getSelection());
const settle=page=>page.evaluate(()=>window.settle());
async function point(page,id,lane=0){
 // Independent initial-fixture geometry: 30px group heading, 64px rows, 24px first slot.
 return page.evaluate(({id,lane})=>{const t=window.timeline,e=window.fixture.events.find(e=>e.id===id),v=t.getViewport(),scroll=document.querySelector('#timeline>div').shadowRoot.querySelector('.scroll'),r=scroll.getBoundingClientRect(),left=Math.min(140,Math.max(70,r.width*.32)),plot=r.width-left-16;return {x:r.x+left+(e.time-v.start)/(v.end-v.start)*plot,y:r.y+44+30+lane*64+(lane>=4?30:0)+24-scroll.scrollTop};},{id,lane});
}
test.beforeEach(async({page})=>{page.__errors=[];page.on('pageerror',error=>page.__errors.push(error.message));await page.goto('/test/browser/harness.html');await page.waitForFunction(()=>Boolean(window.timeline));await settle(page);});
test.afterEach(async({page})=>{expect(page.__errors).toEqual([]);});
test('click, modifier toggle, keyboard and marquee selection',async({page})=>{
 const p=await point(page,'e1');await page.mouse.click(p.x,p.y);await expect.poll(()=>selected(page)).toEqual(['e1','e2']);
 await page.keyboard.down('Control');await page.mouse.click(p.x,p.y);await page.keyboard.up('Control');await expect.poll(()=>selected(page)).toEqual([]);
 const q=await point(page,'e2',1);await page.keyboard.down('Shift');await page.mouse.move(p.x-12,p.y-12);await page.mouse.down();await page.mouse.move(q.x+15,q.y+15,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await expect.poll(()=>selected(page)).toEqual(['e1','e2']);
 await page.locator('.scroll').focus();await page.keyboard.press('Escape');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect.poll(()=>selected(page)).toEqual(['e0']);
});
test('pointer-anchored zoom and drag pan preserve the expected time direction',async({page})=>{
 const r=await page.locator('.scroll').boundingBox(),v=await page.evaluate(()=>window.timeline.getViewport());const x=r.x+140+(r.width-156)*.75;await page.evaluate(()=>{const scroll=document.querySelector('#timeline>div').shadowRoot.querySelector('.scroll');scroll.addEventListener('wheel',e=>{const rect=scroll.getBoundingClientRect();window.lastWheelFraction=(e.clientX-rect.left-140)/(scroll.clientWidth-156);},{once:true});});
 await page.mouse.move(x,r.y+190);await page.keyboard.down('Control');await page.mouse.wheel(0,-100);await page.keyboard.up('Control');await settle(page);
 const zoomed=await page.evaluate(()=>window.timeline.getViewport());expect(zoomed.end-zoomed.start).toBeLessThan(v.end-v.start);const fraction=await page.evaluate(()=>window.lastWheelFraction);expect(Math.abs((v.start+(v.end-v.start)*fraction)-(zoomed.start+(zoomed.end-zoomed.start)*fraction))).toBeLessThan(2);
 await page.mouse.move(x,r.y+190);await page.mouse.down();await page.mouse.move(x+80,r.y+190,{steps:6});await page.mouse.up();await settle(page);expect((await page.evaluate(()=>window.timeline.getViewport())).start).toBeLessThan(zoomed.start);
});
test('native scrolling, collapsed lane groups and selection-preserving event focus',async({page})=>{
 await page.locator('#group').click();const r=await page.locator('.scroll').boundingBox();await page.mouse.click(r.x+25,r.y+59);expect((await page.evaluate(()=>window.timeline.getViewState())).collapsedLaneGroupIds).toContain('north');
 expect(await page.evaluate(()=>window.timeline.focusEvent('e1'))).toBe(true);expect((await page.evaluate(()=>window.timeline.getViewState())).collapsedLaneGroupIds).not.toContain('north');
 await page.mouse.move(r.x+300,r.y+250);await page.mouse.wheel(0,500);await expect.poll(()=>page.locator('.scroll').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.timeline.focusEvent('late'))).toBe(true);expect(await selected(page)).toEqual(['e1','e2']);
 await page.getByLabel('Event search').fill('e1');expect(await page.evaluate(()=>window.timeline.focusEvent('late'))).toBe(false);
});
test('lane search, sticky pins and group-aware ordering are operable controls',async({page},info)=>{
 await page.getByText('Lane controls · search, order and pin',{exact:true}).click();await page.getByRole('button',{name:'Pin Resource 2',exact:true}).click();
 expect((await page.evaluate(()=>window.timeline.getLanePresentation())).pinned).toEqual(['lane-1']);
 await page.getByRole('button',{name:'Move up Resource 2',exact:true}).click();expect((await page.evaluate(()=>window.timeline.getLanePresentation())).order.slice(0,2)).toEqual(['lane-1','lane-0']);
 await page.getByLabel('Find lanes').fill('Resource 2');expect(await page.locator('.lane-control').count()).toBe(1);await page.getByLabel('Find lanes').fill('');
 const r=await page.locator('.scroll').boundingBox();await page.mouse.move(r.x+300,r.y+250);await page.mouse.wheel(0,400);await settle(page);
 await page.screenshot({path:info.outputPath('pinned-lanes.png'),fullPage:true});
});
test('trace settings and explanations follow supplied directed paths',async({page})=>{
 await page.locator('#group').click();const initial=JSON.parse(await page.locator('#selection').textContent());expect(initial.trace.upstream).toEqual(['e0']);expect(initial.trace.downstream).toEqual(['e3']);expect(await page.locator('#explanation').textContent()).toContain('r23');
 await page.getByLabel('Trace direction',{exact:true}).selectOption('downstream');await page.getByLabel('Trace depth',{exact:true}).fill('0');await page.getByLabel('Trace depth',{exact:true}).blur();expect(JSON.parse(await page.locator('#selection').textContent()).trace.downstream).toEqual([]);
 await page.getByLabel('Trace depth',{exact:true}).fill('1');await page.getByLabel('Trace depth',{exact:true}).blur();expect(JSON.parse(await page.locator('#selection').textContent()).trace.downstream).toEqual(['e3']);expect(await page.locator('#explanation').textContent()).not.toContain('rn');
});
test('undo, redo, saved views, invalid restoration and PNG export',async({page})=>{
 await page.locator('#group').click();await page.getByRole('button',{name:'Clear selection',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await selected(page)).toEqual(['e1','e2']);await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await selected(page)).toEqual([]);
 await page.locator('#group').click();await page.locator('#save').click();const saved=await page.getByLabel('View JSON').inputValue();await page.getByRole('button',{name:'Clear selection',exact:true}).click();await page.locator('#restore').click();expect(await selected(page)).toEqual(['e1','e2']);expect(saved).not.toContain('Infinity');
 const before=await page.evaluate(()=>window.timeline.getViewState());await page.getByLabel('View JSON').fill('{"schemaVersion":1,"viewport":null}');await page.locator('#restore').click();expect(await page.evaluate(()=>window.timeline.getViewState())).toEqual(before);
 const pending=page.waitForEvent('download');await page.locator('#png').click();const file=await (await pending).path();expect((await readFile(file)).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
});
test('detail stacking, dense drill-down, resize and lifecycle',async({page},info)=>{
 await page.evaluate(()=>{const d=structuredClone(window.fixture);d.events.push({id:'overlap-a',label:'Overlapping A',time:d.events[1].time,endTime:d.events[2].time+1000,laneIds:['lane-0']},{id:'overlap-b',label:'Overlapping B',time:d.events[1].time,endTime:d.events[2].time+2000,laneIds:['lane-0']});window.timeline.setData(d);window.timeline.setSelection(['overlap-a','overlap-b']);});await settle(page);await page.screenshot({path:info.outputPath('stacked-events.png'),fullPage:true});
 // Verify two selected markers occupy distinct vertical positions in the rendered canvas.
 const rows=await page.evaluate(()=>{const host=document.querySelector('#timeline>div'),c=host.shadowRoot.querySelector('canvas'),v=window.timeline.getViewport(),time=window.fixture.events[1].time,left=140,width=c.clientWidth-156,x=Math.round((left+(time-v.start)/(v.end-v.start)*width)*(c.width/c.clientWidth)),pixels=c.getContext('2d').getImageData(x,0,1,c.height).data,ys=[];for(let y=0;y<c.height;y++)if(pixels[y*4]>180&&pixels[y*4+1]>80&&pixels[y*4+1]<180&&pixels[y*4+2]<60)ys.push(y);return ys;});expect(Math.max(...rows)-Math.min(...rows)).toBeGreaterThan(20);
 await page.evaluate(()=>window.loadStress(5000));await settle(page);await expect(page.locator('.status')).toContainText('Density view');const before=await page.evaluate(()=>window.timeline.getViewport());
 const densePoint=await page.evaluate(()=>{const t=window.timeline,v=t.getViewport(),e=t.getData().events.find(e=>e.laneIds.includes('lane-0'));return {time:e.time};});await settle(page);const box=await page.locator('.scroll').boundingBox(),plot=box.width-156,bins=Math.floor(plot/14),bucket=Math.floor((densePoint.time-before.start)/(before.end-before.start)*bins);await page.mouse.dblclick(box.x+140+(bucket+.5)*plot/bins,box.y+44+32);await settle(page);const after=await page.evaluate(()=>window.timeline.getViewport());expect(after.end-after.start).toBeLessThan(before.end-before.start);
 await page.setViewportSize({width:380,height:800});await settle(page);expect((await page.locator('.scroll').boundingBox()).width).toBeLessThan(380);await page.screenshot({path:info.outputPath('narrow-container.png'),fullPage:true});
 await page.evaluate(()=>window.timeline.destroy());expect(await page.locator('#timeline>div').count()).toBe(0);await page.evaluate(async()=>{const {createTimeline}=await import('/dist/index.js');for(let i=0;i<10;i++){const t=createTimeline(document.getElementById('timeline'));t.setData(window.fixture);t.destroy();}});expect(await page.locator('#timeline>div').count()).toBe(0);
});
test('runnable quickstart and Python HTTP integration load a real dataset',async({page})=>{
 await page.goto('/examples/cold-start/solution/');await expect(page.locator('#analysis')).toContainText('move');
 await page.goto('/examples/quickstart/');await expect(page.locator('#status')).toContainText('handoff');await page.locator('#locate').click();await expect(page.locator('#status')).toContainText('handoff');
 await page.goto('/examples/quickstart/global.html');await expect(page.locator('#status')).toContainText('handoff');
 await page.goto('http://127.0.0.1:4174/examples/python-server/');await expect(page.locator('#status')).toContainText('complete');await expect(page.locator('#status')).toContainText('hold');
});
test('browser load, pan and selection benchmark',async({page},info)=>{
 test.skip(info.project.name!=='chromium','Rendering timings collected once in Chromium, not compared across engines');test.setTimeout(180000);
 const report=await page.evaluate(async()=>{
  const quantile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*q))],results=[];
  for(const count of [1000,10000,100000]){
   const start=performance.now();window.loadStress(count);await window.settle();const loadMs=performance.now()-start,pan=[],selection=[];
   for(let i=0;i<10;i++){const v=window.timeline.getViewport(),delta=(v.end-v.start)*.005,t=performance.now();window.timeline.setViewport({start:v.start+delta,end:v.end+delta});await window.settle();pan.push(performance.now()-t);}
   for(let i=0;i<10;i++){const t=performance.now();window.timeline.setSelection([`event-${i*10+4}`]);await window.settle();selection.push(performance.now()-t);}
   results.push({events:count,lanes:80,loadMs,panP50Ms:quantile(pan,.5),panP95Ms:quantile(pan,.95),selectionP50Ms:quantile(selection,.5),selectionP95Ms:quantile(selection,.95),samples:10});
  }
  return {measuredAt:new Date().toISOString(),userAgent:navigator.userAgent,method:'API mutation to two requestAnimationFrame callbacks; includes scheduling/model/rendering; not GPU completion or FPS; warm runner, 80 lanes, seeded 10-event packages.',results};
 });
 console.log('BROWSER_BENCHMARK '+JSON.stringify(report));await writeFile(info.outputPath('browser-benchmark.json'),JSON.stringify(report,null,2));
});
