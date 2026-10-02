# Integration recipes

## Refresh data without losing the analyst's context

```js
const response = await fetch('/api/timeline');
if (!response.ok) throw new Error(`HTTP ${response.status}`);
timeline.setData(await response.json());
// Existing viewport and surviving selected IDs remain. Do not call fit() here.
```

Stable IDs preserve selection. Data replacement clears undo history because snapshots are not dataset versions. Avoid overlapping fetches overwriting newer data: use an AbortController or monotonically increasing request token in your application.

## Trace only downstream, with a two-edge limit

```js
timeline.setTraceOptions({direction:'downstream', kinds:['causes','enables'], maxDepth:2});
timeline.setSelection(['evt-1']);
console.log(timeline.explain('evt-3'));
timeline.fitTrace();
```

Depth counts graph edges, not elapsed time. Omit maxDepth for unlimited traversal. Passing an empty kinds list follows no relationships. Explanations return shortest declared paths in each allowed direction, with original edge orientation.

## Restrict a package without losing the full selection

```js
timeline.selectGroup('recovery');
timeline.setFilter({groupIds:['recovery'], query:'handoff'});
// Selection/trace can include events excluded from the drawing.
timeline.setFilter({});
timeline.fitTrace();
```

Filter fields combine with AND; values in one list combine with OR. An empty list matches nothing. `fitTrace` fits time and expands relevant lane groups; it preserves filters and lane search. Reveal hidden context by clearing those restrictions explicitly.

## Search, pin and order lanes

```js
timeline.setLanePresentation({query:'worker'});
timeline.setLanePresentation({pinned:['worker-a'], order:['worker-b','worker-a']});
// Clear only the lane search:
timeline.setLanePresentation({query:''});
```

Order applies inside each lane group. Unknown IDs in API setters throw; stale IDs in saved views are discarded. A maximum of three pins is accepted, and the container must have enough vertical room. Lane controls are built into the library, independent of framework.

## Save, restore and undo

```js
const json = JSON.stringify(timeline.getViewState());
timeline.restoreViewState(JSON.parse(json));
if (timeline.canUndo()) timeline.undo();
if (timeline.canRedo()) timeline.redo();
```

Use a dataset identity/version beside this JSON in your application. Old schema-1 views restore with default lane/trace settings. A `view` event reports complete UI state after mutations and history replay, allowing external controls to stay synchronized. Do not mutate the instance in every view callback; doing so can create callback loops.

## Embed in React or another framework

Create once after a real HTMLElement mounts, keep the instance in a ref, and call destroy in effect cleanup. Use a second effect for setData. Do not recreate on every render. Host CSS cannot style the Shadow DOM internals; size the container and use supported options. No React runtime is required by the package.

## Exports

`exportPng()` returns a data URL of the current visible canvas; it excludes application sidebars. Use your application's download link. Export a complete dataset with `getData()`, and export a saved view separately. A selected analysis subgraph needs participating lanes and group definitions if you intend to reload it as a complete TimelineData object.
