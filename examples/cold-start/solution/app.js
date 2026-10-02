// @ts-check
import {createTimeline} from '../../../dist/index.js';

/** @param {string} id */
function element(id) {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing page element: ${id}`);
  return found;
}

const message = element('message');
const analysis = element('analysis');
const explanation = element('explanation');
const path = element('path');
const savedView = /** @type {HTMLTextAreaElement} */ (element('saved-view'));
const restoreButton = /** @type {HTMLButtonElement} */ (element('restore'));
const reloadButton = /** @type {HTMLButtonElement} */ (element('reload'));
const buttons = [...document.querySelectorAll('button')];
const lifecycle = new AbortController();
const storageKey = 'event-lanes:cold-start:lab-resources:v1';
let loaded = false;
let disposed = false;

// One mounted instance. Refreshes reuse setData; page exit releases the instance.
const timeline = createTimeline(element('timeline'), {
  selectionMode: 'group', timeZone: 'UTC', height: 360,
  ariaLabel: 'Lab resource timeline'
});
window.addEventListener('pagehide', () => {
  disposed = true;
  lifecycle.abort();
  timeline.destroy();
}, {once: true});
// A page restored from the browser's back/forward cache needs a fresh document,
// because the original timeline was deliberately disposed on pagehide.
window.addEventListener('pageshow', event => {
  if (event.persisted && disposed) window.location.reload();
});

/** @param {unknown} error */
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function renderAnalysis() {
  const options = timeline.getTraceOptions();
  const trace = timeline.trace();
  analysis.textContent = JSON.stringify({
    selectedRoots: timeline.getSelection(),
    direction: options.direction,
    maxDepth: options.maxDepth === Infinity ? 'unlimited' : options.maxDepth,
    kinds: options.kinds,
    upstream: trace.upstream,
    downstream: trace.downstream,
    relationshipIds: trace.relationshipIds
  }, null, 2);
  const reasons = timeline.explain('result');
  if (!reasons.length) {
    explanation.textContent = 'Result is unreachable from the current selected roots under these trace settings.';
    path.textContent = '';
    return;
  }
  explanation.textContent = reasons.map(reason => reason.direction === 'root'
    ? 'Result is itself a selected root.'
    : `Result is ${reason.direction} of selected root ${reason.rootId}; this is a shortest declared path.`
  ).join(' ');
  path.textContent = reasons.flatMap(reason => reason.path.map(edge =>
    `${edge.id}: ${edge.source} → ${edge.target} (${edge.kind})`
  )).join('\n');
}

// Listen before setData/selectGroup so the initial selection is displayed.
timeline.on('view', renderAnalysis);

/** @param {string} id @param {() => void} action */
function onClick(id, action) {
  element(id).addEventListener('click', () => {
    try { action(); } catch (error) { message.textContent = errorText(error); }
  }, {signal: lifecycle.signal});
}
onClick('repair', () => {
  timeline.selectGroup('repair');
  timeline.fitTrace();
  message.textContent = 'Repair package selected: move and accept.';
});
onClick('default-trace', () => {
  timeline.setTraceOptions({});
  timeline.fitTrace();
  message.textContent = 'Tracing causes and enables in both directions with unlimited depth.';
});
onClick('downstream', () => {
  timeline.setTraceOptions({direction: 'downstream', kinds: ['causes', 'enables'], maxDepth: 2});
  timeline.fitTrace();
  message.textContent = 'Tracing downstream, at most two edges from each selected root.';
});
onClick('locate', () => {
  message.textContent = timeline.focusEvent('result')
    ? 'Result located; selected roots are unchanged.'
    : 'Result cannot be located with the current filters.';
});
onClick('save', () => {
  const view = timeline.getViewState();
  savedView.value = JSON.stringify(view, null, 2);
  restoreButton.disabled = false;
  try {
    // Dataset identity is kept beside the view, rather than added to ViewState.
    localStorage.setItem(storageKey, JSON.stringify({dataset: JSON.stringify(timeline.getData()), view}));
    message.textContent = 'View saved below and in this browser.';
  } catch (error) {
    message.textContent = `View saved below; browser storage unavailable: ${errorText(error)}`;
  }
});
onClick('restore', () => {
  timeline.restoreViewState(JSON.parse(savedView.value));
  message.textContent = 'Saved view restored.';
});
savedView.addEventListener('input', () => {
  restoreButton.disabled = !loaded || !savedView.value.trim();
}, {signal: lifecycle.signal});

/** @param {boolean} initial */
async function loadData(initial) {
  reloadButton.disabled = true;
  try {
    const response = await fetch(new URL('./timeline-data.json', import.meta.url), {signal: lifecycle.signal});
    if (!response.ok) throw new Error(`Dataset request failed: HTTP ${response.status}`);
    timeline.setData(await response.json());
    if (initial) {
      timeline.selectGroup('repair');
      timeline.fitTrace();
      loaded = true;
      for (const button of buttons) button.disabled = false;
      restoreButton.disabled = !savedView.value.trim();
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (stored?.dataset === JSON.stringify(timeline.getData())) {
          savedView.value = JSON.stringify(stored.view, null, 2);
          restoreButton.disabled = false;
        }
      } catch {
        // The editable JSON field remains usable without persistent storage.
      }
    }
    message.textContent = initial
      ? 'Repair selected. Default trace includes fault upstream and result downstream.'
      : 'Data reloaded in the existing timeline; viewport and surviving selected IDs are preserved.';
  } catch (error) {
    if (!disposed) message.textContent = `Could not load data: ${errorText(error)}`;
  } finally {
    if (!disposed) reloadButton.disabled = !loaded;
  }
}
element('reload').addEventListener('click', () => { void loadData(false); }, {signal: lifecycle.signal});
await loadData(true);
