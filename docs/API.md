# API v0.2

`createTimeline(container, options)` returns `EventTimeline`. Options: `height`, `rowHeight`, `labelWidth`, `timeZone` (IANA zone), `selectionMode` (`event`/`group`), `densityThreshold`, `showRelationships`, `trace`, `ariaLabel`.

| Method | Behavior |
|---|---|
| `setData(unknown)` | Validate then replace; retain surviving selected IDs and existing viewport after initial load |
| `getData()` | Defensive copy of current dataset |
| `fit(ids?)` | Fit all events, or specified IDs |
| `fitTrace()` | Fit roots, upstream and downstream; expand their lane groups; preserve selection and filters; no-op for empty selection |
| `focusEvent(id)` | Expand lane group, pan time if needed and scroll to an event without selecting it; false for unknown or filtered IDs |
| `getViewport()`, `setViewport({start,end})` | Read/write time range |
| `zoom(factor, anchorFraction=.5)` | Factor below 1 zooms in; anchor between 0 and 1 |
| `setSelection(ids,{expandGroups?})` | Replace selection; unknown IDs omitted |
| `selectGroup(id,additive=false)` | Select explicitly assigned members; unknown group throws |
| `setSelectionMode(mode)` | Change click behavior |
| `getSelection()` | Selected event IDs |
| `trace(ids?)` | Roots, upstream IDs, downstream IDs, relationship IDs |
| `setFilter({laneIds?,groupIds?,kinds?,query?})` | Combine fields with AND; list values with OR; empty list matches nothing |
| `getViewState()`, `restoreViewState(state)` | Save/restore range, filter, selection, collapsed lane groups |
| `on(name,handler)` | Subscribe; returns unsubscribe function |
| `exportPng()` | Data URL of current visible canvas, including lane/time labels |
| `destroy()` | Remove mounted content, observers, pointer handlers and pending animation |

Events: `selection` (IDs, group IDs, trace, source), `viewport` (range/source), `hover` (IDs), `activate` (IDs). Payloads are copied before delivery.

Trace options: `direction` defaults to `both`, `kinds` to `['causes','enables']`, `maxDepth` unlimited. Cycles terminate. Upstream and downstream are separate traversals; in a cycle the same non-root event may appear in both. Group expansion is direct, not recursive across overlapping group memberships. Selection survives filters and can therefore include hidden events.

`TimelineModel` offers `query(range,filter?)`, `bounds(ids?)`, `expandGroups(ids)`, and `trace(ids,options?)`. Queries include intervals that intersect either boundary, even when their start lies outside the range. Treat model data/maps as read-only; prefer rebuilding a model to mutating records. `aggregateEvents(events,range,buckets)` computes density cells; `zoomRange` and `normalizeRange` are pure helpers. See generated declarations for exact types.

ESM supports bundlers and modern browsers; the global build is for script tags. Framework wrappers should create on mount and destroy on unmount. Data can arrive from any language as JSON. No backend transport or authentication is built in.

Runtime validators `validateFilter(value)`, `validateViewState(value)`, and `validateTraceOptions(options)` are exported from the DOM-free core. They return defensive copies and throw on malformed inputs. `maxDepth` accepts a nonnegative integer or `Infinity`; unknown relation kinds/directions throw. A finite zoom anchor outside [0,1] is clamped; NaN/Infinity throws. Saved views may be passed to `restoreViewState` as unknown JSON and are fully validated before application.

## v0.2 additions

| Method / event | Behavior |
|---|---|
| `setTraceOptions({direction?,kinds?,maxDepth?})`, `getTraceOptions()` | Replace traversal settings; defaults both/causes+enables/unlimited; recompute selection trace |
| `explain(eventId)` | Shortest declared path from a selected root in each allowed direction; root returns an empty path; unknown/unreachable returns [] |
| `setLanePresentation({query?,order?,pinned?})`, `getLanePresentation()` | Merge presentation fields; order inside lane groups; at most three sticky pins; unknown setter IDs throw |
| `undo()`, `redo()`, `canUndo()`, `canRedo()` | Bounded view history; return false when no step is available; dataset replacement clears history |
| `view` event | Complete copied ViewState after mutations or history replay; use it to synchronize external controls |

Saved views keep schemaVersion 1 and add optional `lanePresentation`, `trace`, and `scrollTop`. Saved `trace.maxDepth` is null for unlimited; the runtime getter uses Infinity. Old saved views load with default lane/trace settings. Stale lane IDs are omitted during restore. History includes selection, time range, filters, collapsed groups, lane/trace settings and scroll; it excludes datasets and external application state. Rapid viewport/scroll changes coalesce into one step. Core exports `ViewHistory`, `packEventSlots`, and `placeLabels` for DOM-free testing and benchmarking.

Detail view uses per-lane interval stacking and grows rows to preserve event hit targets. Colliding labels are suppressed in favor of selected/trace labels, while hover and the accessible list keep event information. Requested pins that cannot fit while leaving an ordinary row use normal scrolling placement. `fitTrace` preserves event filters and lane search; `focusEvent` refuses events excluded by either.

## Explanation payload example

```js
// With root evt-1 and a declared evt-1 → evt-2 → evt-3 chain:
timeline.explain('evt-3');
// [{eventId:'evt-3', rootId:'evt-1', direction:'downstream', path:[
//   {id:'r12', source:'evt-1', target:'evt-2', kind:'causes'},
//   {id:'r23', source:'evt-2', target:'evt-3', kind:'enables'}
// ]}]
```

For upstream explanations, path edges remain in their declared source-to-target order, leading from the upstream event toward the root. A root explanation has `direction:'root'` and an empty path. With multiple roots the shortest path starts at the nearest reachable root, so selecting an intermediate event can shorten an explanation. Cycles can produce both upstream and downstream explanations for the same non-root event. These paths describe supplied assertions; including correlates does not turn correlation into causality.
