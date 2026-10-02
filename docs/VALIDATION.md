# Validation status and current limits

## v0.2 verification — October 1, 2026 (Chicago)

Local checks pass: TypeScript/library and typed example compilation; 33 JavaScript model/controller/cold-start tests; four Python adapter tests; record and pandas DataFrame conversion equivalence; package tarball imports/content; core benchmarks at 1,000/10,000/100,000 events; separate private demo fixture and portable-build checks. Controller stubs do not exercise a DOM.

The real browser suite is implemented for Chromium, Firefox and WebKit in GitHub Actions. It covers canvas click/modifier/marquee selection, pointer-anchored zoom, pan, native scroll, collapsed groups, focus, lane controls, trace direction/depth, explanations, undo/redo, view restoration, invalid input, PNG, density drill-down, resize, repeated lifecycle, all quickstart formats, the cold-start page and a Python HTTP endpoint. It records screenshots and failure traces. CI run [36946159871](https://github.com/jcguidry/event-lanes/actions/runs/36946159871) passed 25 browser checks (eight interactions in each of Chromium, Firefox and WebKit, plus one Chromium benchmark); two benchmark instances were intentionally skipped in the other engines. The same run passed model/Python/example/package gates and published v0.2.0. The initial browser run exposed a test assumption about fractional pointer coordinates; using the actual WheelEvent coordinate made the unchanged strict two-millisecond anchor assertion pass in all three engines. The v0.2.1 revision adds a right-edge label placement adjustment and repeats release gates.

## Current limits

Canvas2D on the main thread, with interval indexing and visible-row drawing. No streaming patches, worker pipeline, backend paging, automatic relationship discovery, PDF/SVG or full-document PNG export. Event geometry stacks within lanes; label collision handling prioritizes/suppresses text rather than performing global optimization. Trace overlays are capped at densityThreshold (600 default). Up to three requested sticky pins must fit while leaving an ordinary row; other pins use normal placement. Accessible event lists and lane controls each show at most 200 matches. Touch native scrolling works, but touch selection and pinch are not implemented. No accessibility conformance or real mobile-device audit has been performed.

Undo/redo stores at most 100 views and coalesces short viewport/scroll gestures. Dataset replacement resets history. Explanations show shortest supplied paths, not proof of causality or computed operational impact. See [performance](PERFORMANCE.md) for measured scope and fixture limitations.

## Remaining human acceptance

A maintainer reviewed the actual Chromium stacked-event/pinned-lane screenshots and private-demo wide/narrow screenshots from CI. They show separate interval tracks, sticky pin placement and a contained stacked page at 390px width. That review led to the right-edge label adjustment in v0.2.1. Further review should include check long labels and heavy interval overlap using representative data, test keyboard/screen-reader behavior, and profile the intended graph topology on real target devices. Automated interaction acceptance and visual review are separate forms of evidence.

## Historical implementation notes

The v0.1 local preview was blocked by browser URL restrictions; no alternate browser was used to evade them. Initial core/build checks and subsequent controller hardening were accurately limited to model/source evidence. That earlier feature inventory preceded overlap layout, lane controls, adjustable tracing, explanations and undo/redo in v0.2. The reusable cold-start exercise identified this distinction and prompted this separation of current status from historical notes.
