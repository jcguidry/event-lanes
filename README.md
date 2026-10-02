# Event Lanes

A small, framework-neutral TypeScript library for events, transfers, known groups, and declared causal relationships over time. Entity lanes run vertically; time runs horizontally. MIT licensed, independently implemented, with no domain-specific model or runtime dependencies.

**Status: 0.2, pre-1.0.** Generic library with runnable examples, agent onboarding, explicit data contracts, overlap handling, lane controls, trace explanations and view history. Real Chromium/Firefox/WebKit acceptance and benchmarks run in CI; consult the validation page for the evidence status. This is not a production-readiness claim.

Start with [the documentation index](docs/README.md), [runnable quickstart](docs/QUICKSTART.md), and [data modeling guide](docs/DATA_MODEL.md). Coding agents should read [AGENTS.md](AGENTS.md) first. The [Python walkthrough](docs/PYTHON.md) includes a runnable HTTP/DataFrame example.

## Build and try

Requires Node 20+ and npm. From this directory:

```sh
npm install
npm test
python3 -m unittest discover -s test -p 'test_python.py'
npm pack
```

Install the resulting `.tgz` in any JavaScript app with `npm install /path/to/jcguidry-event-lanes-0.2.0.tgz`. The package has not been published to npm.

```ts
import { createTimeline } from '@jcguidry/event-lanes';

const timeline = createTimeline(document.querySelector('#timeline')!, {
  height: 480,
  selectionMode: 'group',
  timeZone: 'UTC',
});
timeline.setData(await fetch('/api/timeline').then(r => r.json()));
timeline.on('selection', ({ eventIds, trace }) => {
  console.log(eventIds, trace.upstream, trace.downstream);
});
// Call timeline.destroy() when your component unmounts.
```

ES modules, declaration files and a standalone browser global bundle are built into `dist/`. For an ordinary HTML page, load `dist/event-lanes.global.js`, then call `EventLanes.createTimeline(...)`. The container must have a nonzero width. Styling is isolated in Shadow DOM. Import `@jcguidry/event-lanes/core` for DOM-free validation, queries, and tracing in Node.

## JSON contract

```json
{
  "schemaVersion": 1,
  "lanes": [{"id":"a","label":"Worker A"},{"id":"b","label":"Worker B"}],
  "eventGroups": [{"id":"batch-1","label":"Known batch"}],
  "events": [
    {"id":"ready","label":"Ready","time":1789473600000,"laneIds":["a"]},
    {"id":"handoff","label":"Job handoff","time":1789474200000,
     "laneIds":["a","b"],"groupIds":["batch-1"],
     "transfers":[{"from":"a","to":"b","itemId":"job-42"}]}
  ],
  "relationships": [{"id":"r1","source":"ready","target":"handoff","kind":"enables"}]
}
```

Times are integer **UTC epoch milliseconds**, never seconds or naive strings. Optional `endTime` produces an interval. Every participating entity occurs once in `laneIds`; optional transfers describe directed handoffs between those participants. Event groups and lane groups are separate concepts. Relationship endpoints reference event IDs. Supported kinds: `causes`, `enables`, `correlates`, `supersedes`. Tracing follows only `causes` and `enables` by default. The library never infers causality from time, a transfer, or group membership.

`schema.json` checks structure. Runtime `validateData` additionally checks uniqueness, references, interval ordering, and JSON-safe metadata. Labels are plain text. Colors support six-digit hex values. Stable IDs preserve selection across data replacement. Do not put secrets into a browser dataset.

## Interaction

- Scroll vertically through lanes; drag the plot to pan time.
- Ctrl/Command + wheel zooms around the pointer; Shift + wheel pans time.
- Click an event; group mode expands its directly assigned groups. Ctrl/Command-click toggles.
- Shift-drag selects a rectangular region. Double-click a density cell to zoom in.
- Collapse lane groups by clicking their headers.
- Keyboard: up/down browse events, Enter select, left/right pan, +/- zoom, F/Home fit, Escape clear.
- Search, reorder and pin lanes with the built-in lane controls.
- Change trace direction, kinds and depth through the API; inspect shortest declared paths with `explain`.
- Undo/redo view changes with toolbar buttons or Ctrl/Command Z and Shift Z.
- Detail events stack on overlapping intervals; selected context gets priority for labels.
- Accessible event list provides a textual alternative (first 200 matching events).

Dense views aggregate into per-lane time cells; cell counts retain event IDs. One multi-party event is counted once per participating lane. Selected events and their trace are drawn over density cells, up to 600 events. Counts are not fleet-wide totals.

## Python / pandas

Use `examples/python/event_lanes.py`. Rename dataframe columns to the camelCase contract, use list-valued columns for `laneIds` and `groupIds`, then call `dataset(lanes_df, events_df, event_groups=groups_df, relationships=edges_df)`. Aware Python/pandas datetime values in `time` and `endTime` become UTC milliseconds. Naive dates are rejected. Normalize missing optional values and non-native metadata scalars before conversion; NaN and Infinity are rejected. The adapter does not invent IDs, groupings, or causal edges.

Return this dictionary from your backend as JSON. No Python process, pandas dependency, server, or network call is required inside the library. Backend filtering and authorization remain application responsibilities.

See [release policy](docs/RELEASES.md), [measured performance](docs/PERFORMANCE.md), [cold-start agent exercise](docs/COLD_START.md), [API](docs/API.md), [limitations and validation](docs/VALIDATION.md), and [contributing](CONTRIBUTING.md).
