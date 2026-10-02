import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {convertInput} from './convert.mjs';

// Override only to test freshly compiled source without writing outside solution.
const build = new URL(process.env.COLD_START_BUILD ?? '../../../dist/', import.meta.url);
const {TimelineModel, validateData, validateViewState, ViewHistory} = await import(new URL('core.js', build));
const {EventTimeline} = await import(new URL('timeline.js', build));
const input = JSON.parse(await readFile(new URL('../input.json', import.meta.url), 'utf8'));
const data = JSON.parse(await readFile(new URL('./timeline-data.json', import.meta.url), 'utf8'));
const model = new TimelineModel(data);

test('generated JSON validates and preserves every source identity and declared edge', () => {
  assert.deepEqual(validateData(data), convertInput(input));
  assert.deepEqual(data.lanes.map(lane => lane.id), input.resources.map(resource => resource.key));
  assert.deepEqual(data.events.map(event => event.id), input.actions.map(action => action.key));
  assert.deepEqual(data.eventGroups.map(group => group.id), ['repair']);
  assert.deepEqual(data.relationships, input.links.map(link => ({
    id: link.key, source: link.from, target: link.to, kind: link.type
  })));
  assert.equal(data.lanes.length, 3);
  assert.equal(data.events.length, 5);
});

test('offset timestamps preserve their UTC instants and original source text', () => {
  const expectedUTC = {
    fault: '2026-10-01T13:00:00.000Z', move: '2026-10-01T13:05:00.000Z',
    accept: '2026-10-01T13:07:00.000Z', result: '2026-10-01T13:10:00.000Z',
    note: '2026-10-01T13:06:00.000Z'
  };
  for (const action of input.actions) {
    const event = model.events.get(action.key);
    assert.ok(Number.isSafeInteger(event.time));
    assert.equal(new Date(event.time).toISOString(), expectedUTC[action.key]);
    assert.equal(event.metadata.sourceTimestamp, action.at);
  }
  const naive = structuredClone(input);
  naive.actions[0].at = '2026-10-01T08:00:00';
  assert.throws(() => convertInput(naive), /explicit timezone offset/);
});

test('explicit repair membership expands exactly two roots and default trace excludes correlation', () => {
  assert.deepEqual(model.groups.get('repair'), ['move', 'accept']);
  assert.deepEqual(model.expandGroups(['move']), ['move', 'accept']);
  const trace = model.trace(model.groups.get('repair'));
  assert.deepEqual(trace.roots, ['move', 'accept']);
  assert.deepEqual(trace.upstream, ['fault']);
  assert.deepEqual(trace.downstream, ['result']);
  assert.deepEqual(new Set(trace.relationshipIds), new Set(['l1', 'l2', 'l3']));
  assert.ok(!trace.relationshipIds.includes('l4'));
});

const downstream = {direction: 'downstream', kinds: ['causes', 'enables'], maxDepth: 2};
test('downstream depth 2 preserves package roots and excludes upstream and correlation', () => {
  const trace = model.trace(model.groups.get('repair'), downstream);
  assert.deepEqual(trace.roots, ['move', 'accept']);
  assert.deepEqual(trace.upstream, []);
  assert.deepEqual(trace.downstream, ['result']);
  assert.deepEqual(trace.relationshipIds, ['l2', 'l3']);
  assert.ok(!trace.downstream.includes('note'));
  // Both repair events are roots, so result is one edge away from accept.
  // A move-only model check demonstrates that depth really counts graph edges.
  assert.deepEqual(model.trace(['move'], {...downstream, maxDepth: 1}).downstream, ['accept']);
  assert.deepEqual(model.trace(['move'], downstream).downstream, ['accept', 'result']);
});

test('explanations use shortest declared paths with original edge orientation', () => {
  const explanation = model.explain('result', ['move', 'accept'], downstream);
  assert.equal(explanation.length, 1);
  assert.equal(explanation[0].rootId, 'accept');
  assert.equal(explanation[0].direction, 'downstream');
  assert.deepEqual(explanation[0].path.map(edge => edge.id), ['l3']);
  assert.deepEqual(model.explain('result', ['move'], downstream)[0].path.map(edge => edge.id), ['l2', 'l3']);
  assert.deepEqual(model.explain('note', ['move', 'accept'], downstream), []);
  const upstream = model.explain('fault', ['move', 'accept']);
  assert.equal(upstream[0].direction, 'upstream');
  assert.equal(upstream[0].path[0].source, 'fault');
  assert.equal(upstream[0].path[0].target, 'move');
});

test('one shared move retains explicit movement endpoints regardless of participant order', () => {
  const move = model.events.get('move');
  assert.deepEqual(move.laneIds, ['lab-a', 'lab-b']);
  assert.deepEqual(move.transfers, [{from: 'lab-a', to: 'lab-b', itemId: 'specimen-1'}]);
  assert.equal(data.events.filter(event => event.id === 'move').length, 1);
  const reversed = structuredClone(input);
  reversed.actions.find(action => action.key === 'move').resources.reverse();
  const reversedMove = convertInput(reversed).events.find(event => event.id === 'move');
  assert.deepEqual(reversedMove.laneIds, ['lab-b', 'lab-a']);
  assert.deepEqual(reversedMove.transfers, move.transfers);
});

// Controller-only harness based on the repository's navigation tests. There is
// no browser, no DOM mount, no canvas, and no pointer/layout execution here.
function controller() {
  return Object.assign(Object.create(EventTimeline.prototype), {
    model, selected: new Set(), filter: {}, viewport: model.bounds(), collapsed: new Set(),
    lanePresentation: {query: '', order: [], pinned: []}, options: {trace: {}},
    history: new ViewHistory(100), scroll: {scrollTop: 0}, tip: {hidden: true},
    live: {textContent: ''}, disposed: false,
    schedule() {}, rebuildRows() {}, updateLaneControls() {}, updateAccessible() {}, emit() {}
  });
}

test('public group selection and finite/unlimited view serialization round-trip in a controller stub', () => {
  const timeline = controller();
  timeline.selectGroup('repair');
  assert.deepEqual(timeline.getSelection(), ['move', 'accept']);
  const unlimitedJSON = JSON.stringify(timeline.getViewState());
  assert.ok(!unlimitedJSON.includes('Infinity'));
  assert.equal(JSON.parse(unlimitedJSON).trace.maxDepth, null);
  validateViewState(JSON.parse(unlimitedJSON));
  timeline.setTraceOptions(downstream);
  const savedJSON = JSON.stringify(timeline.getViewState());
  assert.ok(!savedJSON.includes('Infinity'));
  assert.equal(JSON.parse(savedJSON).trace.maxDepth, 2);
  timeline.setSelection(['fault']);
  timeline.setTraceOptions({});
  timeline.restoreViewState(JSON.parse(savedJSON));
  assert.deepEqual(timeline.getSelection(), ['move', 'accept']);
  assert.deepEqual(timeline.getTraceOptions(), downstream);
  assert.deepEqual(timeline.getViewState(), JSON.parse(savedJSON));
  assert.equal(timeline.explain('result')[0].rootId, 'accept');
  timeline.restoreViewState(JSON.parse(unlimitedJSON));
  assert.equal(timeline.getTraceOptions().maxDepth, Infinity);
  assert.equal(timeline.getViewState().trace.maxDepth, null);
});
