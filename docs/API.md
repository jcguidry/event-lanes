# API v0.1

`createTimeline(container, options)` returns `EventTimeline`. Options: `height`, `rowHeight`, `labelWidth`, `timeZone` (IANA zone), `selectionMode` (`event`/`group`), `densityThreshold`, `showRelationships`, `trace`, `ariaLabel`.

| Method | Behavior |
|---|---|
| `setData(unknown)` | Validate then replace; retain surviving selected IDs and existing viewport after initial load |
| `getData()` | Defensive copy of current dataset |
| `fit(ids?)` | Fit all events, or specified IDs |
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
