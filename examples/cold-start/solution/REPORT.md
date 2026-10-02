# Cold-start integration report

Completed on 2026-10-02 using only this repository and `examples/cold-start/input.json`. All files I wrote are under `examples/cold-start/solution/`. I did not change library source or other documentation, commit, publish, or use browser tools.

## Deliverables and use

- `index.html` and `app.js`: plain-JavaScript lab-resource timeline with the repair package initially selected, trace controls, an explanation of `result`, selection-preserving result navigation, data refresh, and view save/restore.
- `convert.mjs`: converts the supplied field names and calls the DOM-free runtime `validateData` before writing.
- `timeline-data.json`: generated, validated TimelineData.
- `verify.test.mjs`: seven fixture-specific model/controller checks; no browser harness.

For a fresh checkout, follow the quickstart's dependency/build setup. From the repository root:

```sh
npm install
npm run build
node examples/cold-start/solution/convert.mjs
node --test examples/cold-start/solution/verify.test.mjs
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://localhost:8000/examples/cold-start/solution/` in an environment that permits that URL. I did not open this URL or execute the page in a browser. The page's three-level relative import points at the repository's `dist/index.js`; its dataset fetch resolves next to `app.js`. A built `dist/` is required, as in the repository quickstart.

The initial trace uses the library defaults: both directions, causes/enables, unlimited depth. Click **Trace downstream · depth 2** to change traversal without replacing the two selected roots. **Save view** shows ordinary saved-view JSON in the editable field and also tries to persist it in localStorage. **Restore saved view** validates and restores that JSON. A persisted view is offered only when its separately stored dataset JSON matches the current dataset; it is not restored automatically. The editable field remains usable when browser storage is unavailable.

## Mapping decisions

| Supplied field | Timeline field | Decision |
|---|---|---|
| `resources[].key/name` | `lanes[].id/label` | Preserve all three resource IDs and labels. No lane groups are invented. |
| `packages[].key/name` | `eventGroups[].id/label` | `repair` is an event group, not a lane group. |
| `actions[].key/name` | `events[].id/label` | Preserve all five action identities; do not create one event per participant. |
| `actions[].at` | `events[].time` | Parse the explicit offset into integer UTC epoch milliseconds; retain the original text in `metadata.sourceTimestamp`. |
| `actions[].resources` | `events[].laneIds` | Copy participation; do not interpret array order as movement. |
| `actions[].packages` | `events[].groupIds` | Copy only supplied package membership; omitted membership stays omitted. |
| `movement.source/destination/item` | `transfers[].from/to/itemId` | Copy declared movement endpoints and item identity. |
| `links[].key/from/to/type` | `relationships[].id/source/target/kind` | Preserve all four directed assertions, including the correlation in the dataset. |

All actions are point events because the source supplies no duration. No causal edges, inferred memberships, durations, timezone locations, or impact metrics are added. `move` remains one event participating on `lab-a` and `lab-b`, with the explicit transfer `lab-a → lab-b` for `specimen-1`.

The source offset `-05:00` is not an IANA timezone identity. I chose UTC for display and retained the original timestamp strings. For example, fault at `2026-10-01T08:00:00-05:00` becomes `1790859600000`, or `2026-10-01T13:00:00.000Z`; there is no browser-local interpretation or inferred daylight-saving rule.

## Observed acceptance results

| Requirement | Verified result | Evidence scope |
|---|---|---|
| Three resources and five actions survive | Lanes: `lab-a`, `lab-b`, `lab-c`; events: `fault`, `move`, `accept`, `result`, `note` | Generated JSON and runtime/model checks |
| Exactly two repair roots | `move`, `accept`; `expandGroups(['move'])` and public `selectGroup('repair')` both give these roots | Model plus controller stub |
| Default group trace | Upstream `fault`; downstream `result`; relationship IDs `l1`, `l2`, `l3` | Model check |
| Downstream depth 2 | Roots unchanged; upstream empty; downstream `result`; relationships `l2`, `l3`; neither `note` nor `l4` is included | Model and controller checks |
| Explicit transfer direction | `lab-a → lab-b` for `specimen-1`; reversing the input participants still preserves that direction | Conversion/model check |
| Why result is included | Shortest declared path from selected root `accept`: `l3`, `accept → result`, `enables` | Model plus public controller `explain` check |
| Runtime-valid generated JSON | `validateData` accepts the output; output equals a new conversion of the input | Runtime check against distribution and freshly compiled source |
| Saved view contains no Infinity | Unlimited depth is `null`; finite downstream depth is `2`; both serialized states validate and restore | Public controller methods with DOM/layout stubs |
| Lifecycle | One `createTimeline`; initial/refresh data uses `setData`; `pagehide` aborts app work and calls `destroy` | Application source inspection and strict JavaScript type check only |

The controller test executes the actual group-selection, trace configuration, `getViewState`, and `restoreViewState` logic through `EventTimeline.prototype`. It stubs scheduling, layout, callbacks and DOM-dependent fields, following the repository's navigation-test approach. It does not construct a DOM, instantiate a mounted timeline, draw a canvas, dispatch pointer events, or test browser storage.

Because both `move` and `accept` are selected roots, `result` is only one edge from the nearest root `accept`. Its explanation correctly returns `l3`, rather than the longer `move → accept → result` path. An additional move-only model check proves that depth 1 reaches only `accept`, while depth 2 reaches `accept` and `result` and explains the two-edge `l2`, `l3` path. This supplementary check does not change the page's package selection.

## Exact verification performed

Node was `v24.19.0`. These commands completed successfully:

```sh
node examples/cold-start/solution/convert.mjs
node --test examples/cold-start/solution/verify.test.mjs
./node_modules/.bin/tsc --noEmit -p tsconfig.json
./node_modules/.bin/tsc --allowJs --checkJs --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM,DOM.Iterable --skipLibCheck examples/cold-start/solution/app.js
./node_modules/.bin/tsc -p tsconfig.json --outDir examples/cold-start/solution/.verification --declaration false --declarationMap false --sourceMap false
COLD_START_BUILD=./.verification/ node --test examples/cold-start/solution/verify.test.mjs
```

Both test invocations passed **7/7 checks**. The second invocation used freshly compiled source for its model and controller imports to avoid assuming the existing distribution was current; the converter also validates through the existing distribution. The temporary `.verification/` output was removed after verification. No `npm run build`, full repository test suite, HTTP serving, browser interaction, visual review, FPS measurement, accessibility audit, or cross-browser acceptance was performed by this exercise. Build/type/model checks are not evidence that the UI rendered or behaved correctly in a browser.

## What to read first and documentation gaps

A future agent should read `AGENTS.md`, `docs/README.md`, and `docs/QUICKSTART.md` first, then `docs/DATA_MODEL.md` **before conversion**. `docs/API.md` and `docs/RECIPES.md` provide tracing, saved-view and lifecycle integration; `docs/VALIDATION.md` identifies the evidence limits. Exact explanation fields are in `src/types.ts`; the existing quickstart and controller tests help confirm mounting and non-browser test conventions. `docs/COLD_START.md` supplies this exercise's acceptance conditions.

The data/model documentation was sufficient to complete the task without inventing APIs. I encountered these ambiguities or documentation gaps:

1. **Initial trace mode is not specified.** The task requests downstream-only depth 2, while acceptance also requests default group tracing. I start with the default trace and expose the downstream mode as a control. Both modes preserve explicit package roots.
2. **The fixture cannot demonstrate a two-edge shortest explanation while the whole repair package is selected.** `accept` is already a root. An exercise note about this, or a later effect two edges from every selected root, would prevent mistaken expectations about `explain`.
3. **Timezone display is left to the integrator.** The modeling guide correctly separates UTC milliseconds from a chosen display zone, but the exercise does not specify one. UTC avoids inventing a geographical zone from `-05:00`.
4. **Explanation return shape needs a source/type lookup.** The API describes shortest paths, and the recipe logs an explanation, but a concrete `{eventId, rootId, direction, path}` example would make a JS sidebar easier to implement. This was a small lookup cost, not a blocker.
5. **Current limits versus historical validation are mixed.** At read time, `docs/VALIDATION.md` said no undo/redo and no advanced label collision layout and described shared lane centers, while the current API/source documented history, stacking and label placement. Historical evidence should be labeled separately from current feature limits.
6. **Transient checkout drift was observed.** The first `package.json` read reported v0.1.0 and lacked scripts referenced by AGENTS.md; a later read reported v0.2.0 and those scripts. Those package gaps were resolved during the run and are not an unresolved integration problem. This exercise did not modify package metadata.

No ambiguity prevented completion. Interactive browser acceptance remains outstanding under the environment's access restrictions. This run demonstrates successful conversion and compiler/model integration for the supplied fixture, rather than general success for arbitrary datasets or agents.
