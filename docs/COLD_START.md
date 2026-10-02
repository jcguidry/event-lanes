# Cold-start agent exercise

Give an agent a fresh checkout, this file, and `examples/cold-start/input.json`. Do not give it project history or integration code. It may read repository docs and source. Ask it to create an integration in `examples/cold-start/solution/` and record its decisions in `REPORT.md`.

## Task

Build a generic lab-resource timeline from the supplied input, whose fields intentionally do not match TimelineData. Preserve source IDs, timezone meaning, shared events, explicit package membership and declared edge direction. Show resource lanes, select the `repair` package, start with the default both-direction trace and provide a control for downstream-only depth-2 tracing, and display why an effect is included. Save/restore a view and dispose the timeline on page exit. Do not infer new causal edges or transfer direction from participant order.

Produce a JS page, generated TimelineData JSON and a conversion script. It must work when served from the repository root. Explain what a future agent should read first, any ambiguity encountered, and what was actually verified. Do not claim browser interaction from a build or model test.

## Acceptance

- All three resource IDs and five action IDs survive conversion.
- Two actions are members of `repair`; group selection expands exactly those roots.
- Default group trace has one upstream and one downstream neighbor; correlation is excluded.
- Downstream-only depth 2 preserves two selected roots and excludes the correlation.
- Transfer endpoints follow the explicit source/destination fields.
- Generated JSON passes runtime validation; saved view JSON contains no Infinity.
- DOM lifecycle uses create once, setData and destroy.

Use UTC for display unless a display timezone is explicitly supplied. The offset in a source timestamp does not identify an IANA zone. Because `accept` is a selected root, `result` has a one-edge shortest path; also test move-only depth 1 versus 2 to demonstrate the edge-depth bound.

The maintainer records the run in `docs/COLD_START_RESULTS.md`, fixes documentation gaps, and keeps the exercise as a reusable evaluation. A single agent's success is evidence of that exercise, not a guarantee that all agents or datasets will be handled correctly.
