# Working on Event Lanes

Read this file first, then [the documentation index](docs/README.md). This is an original, MIT-licensed, framework-neutral TypeScript timeline library. The public repository contains generic examples only. Aircraft-specific fixtures and UI belong to the separate private `jcguidry/event-lanes-demo` repository. Do not copy proprietary SDK code or private domain data into this repository.

## Start here

1. Read `docs/QUICKSTART.md` and run `examples/quickstart/index.html`.
2. Read `docs/DATA_MODEL.md` before mapping an unfamiliar dataset.
3. Read `docs/API.md` and `docs/RECIPES.md` for integration behavior.
4. Read `docs/ARCHITECTURE.md` before changing implementation.
5. Read `docs/VALIDATION.md` for evidence and remaining limits.

## Commands

Node >=20 and Python >=3.10 are sufficient for core work. Browser tests use Node 22 in CI.

```sh
npm install
npm test
python3 -m unittest discover -s test -p 'test_python.py'
npm run check:examples
npm run benchmark
npm pack
```

Browser acceptance: `npx playwright install --with-deps chromium firefox webkit`, then `npm run test:browser`. This suite runs real browsers against generic local fixtures. It retains reports, screenshots, and failure traces. Core tests and controller stubs are not browser evidence. Do not claim FPS, cross-browser support, or visual review without corresponding results. Follow environment access restrictions; do not switch browser tools to evade a blocked URL.

## Implementation boundaries

- `src/types.ts`: JSON data and view contracts.
- `src/core.ts`: validation, interval index, trace traversal and explanations; no DOM.
- `src/layout.ts`: interval stacking and label collision placement; no DOM.
- `src/history.ts`: bounded view snapshots; no dataset snapshots.
- `src/timeline.ts`: Shadow DOM, Canvas2D, controls, pointer and keyboard interactions.
- `examples/python/event_lanes.py`: standard-library adapter, optional DataFrame input.
- `test/`: model/controller regression tests. `test/browser/`: real interaction tests.

Validate unknown input before changing live state. Preserve stable IDs, integer UTC milliseconds, explicitly supplied group memberships, and directed relationships. Group membership and timestamp proximity do not establish causality. Default tracing includes `causes` and `enables`; adding other kinds is an explicit caller choice. Never sum arbitrary metadata into an impact metric.

Use public methods rather than renderer internals in applications. Call `destroy()` on unmount. Data refresh preserves surviving selected IDs and the viewport but resets undo history. View schema 1 remains additive in v0.2; old saved views still load. Unlimited trace depth serializes as `null`, never JSON Infinity.

Keep changes reviewable. Run the checks relevant to a change; do not add tests that merely mirror source text. Record behavior changes in `CHANGELOG.md` and API docs. Generated `dist/`, test reports and benchmark output are ignored. `npm pack` includes built distributions, schema, docs, examples and source; npm registry publication is a separate credentialed action.

For the cold-start documentation exercise, use only `docs/COLD_START.md` and the repository. Record ambiguities as evidence; do not assume undocumented APIs.
