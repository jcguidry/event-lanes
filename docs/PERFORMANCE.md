# Measured performance and limits

Run `npm run benchmark` for DOM-free model/query/trace/density/layout timings. The seeded generator fixes the data shape and relationships. CI also runs a Chromium browser benchmark inside the acceptance suite and retains its JSON with the browser report. There is no pass/fail speed threshold, since runner hardware and dataset topology materially change the result.

## Initial core baseline

Measured October 1, 2026 (Chicago), Node v24.19.0 on AMD EPYC 9V74 80-Core Processor. Timings are milliseconds. Build and density use three samples, so their reported p95 is effectively the slowest sample and should not be treated as a robust percentile. Query/trace use 60 samples; detail layout uses ten. Full JSON/environment is in `benchmark/baseline-core.json`.

| Events | Lanes | Build p50 | Query p95 | Trace p95 | Density p50 |
|---|---|---|---|---|---|
| 1,000 | 20 | 10.1 | 0.030 | 0.019 | 0.9 |
| 10,000 | 80 | 93.3 | 0.084 | 0.020 | 4.2 |
| 100,000 | 500 | 829.0 | 0.943 | 0.005 | 85.6 |

The query is a five-minute window. Trace packages contain ten directed events; these results do not predict a giant connected graph's traversal cost. Density aggregates the full range into 80 bins per lane. Heap deltas include temporary allocations and are approximate, not retained-memory guarantees. The 100,000-event build is already close to a second on this machine; full-range density alone is about 86 ms. This rules out promising smooth continuous interaction at that volume without representative browser profiling.

## Browser method

The browser suite measures load, ten small pans, and ten selections at 1,000/10,000/100,000 events and 80 lanes. It times an API mutation through two requestAnimationFrame callbacks, including scheduling/model/rendering work. It does not measure GPU completion, user-perceived input latency, sustained FPS, or mobile performance. Browser JSON and screenshots are retained in GitHub Actions. Actual measured results are added after CI completion; do not substitute core timings for rendering timings.

## Practical limits

Start integrations at thousands of events and profile your own graph/interval shape. Many overlapping intervals grow detail row heights; many connected causal edges increase trace work; dense intervals can touch many bins. The renderer is Canvas2D on the main thread, not WebGL or a worker pipeline. Detail/trace drawing is capped by densityThreshold (default 600). The accessible list is capped at 200; lane controls list 200 search matches; pins are limited to three and available vertical room. No million-event, touch selection/pinch, full accessibility conformance, or production-scale guarantee is made.

For a representative benchmark record data volume, participating lanes per event, interval lengths, graph fan-out/cycles, selected-root count, viewport width, device/browser and action. Compare the same fixture/machine before optimizing. Candidates for future work are worker-based validation/aggregation, viewport caching, streaming patches and backend window/context fetching; current results do not establish which one your dataset needs.
