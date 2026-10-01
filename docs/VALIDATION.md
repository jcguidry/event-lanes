# Validation and current limits

Verified in this workspace on 2026-09-28: TypeScript compilation, standalone bundle generation, 14 Node core tests (including randomized interval-index comparisons), and Python adapter tests. The separate demo bundles successfully and generates 14-event and 5,000-event fixtures. Browser interaction acceptance is **not yet verified**: the remote browser blocked localhost, and its runtime did not permit a local HTTP listener. No FPS, million-event, mobile, or cross-browser performance claim is made.

## Acceptance checklist before production

- Select a group with three roots, one upstream cause and two downstream effects; correlation must remain excluded.
- Verify click, modifier toggle, marquee, pointer-anchored zoom, horizontal pan and vertical native scrolling.
- Verify collapsed lane groups, hidden selected events, empty filters, resize and repeated mount/destroy.
- Load 5,000 events and 80 lanes; inspect density cells, deep lane scrolling, labels, and drill-down.
- Export PNG/selection/view; restore a view; invalid JSON must preserve existing data.
- Test Safari/Firefox/Chromium, keyboard-only operation, screen reader announcements, and narrow containers.

## Limits

Canvas2D with interval indexing and visible-row drawing, not WebGL. No streaming patches, worker pipeline, backend pagination, automatic relationship discovery, undo/redo, advanced label collision layout, hierarchical event aggregation, PDF/SVG export, or automatic optimization. Overlapping intervals share a lane center and may obscure each other. Dense trace overlays are capped at 600 events. Relationship curves carry arrowheads toward their target events. Touch supports native scrolling; touch event selection and pinch gestures are not implemented. PNG is viewport-only. Text alternative is capped at 200 records. No full accessibility conformance audit has been performed.

A real operational deployment needs representative volume profiling, API versioning policy, integration/security review, and domain-specific validation in its own application. This library renders supplied relationships; it does not establish the truth of a causal claim or compute operational impact metrics.

## Follow-up review — September 28, 2026

Both initial GitHub Actions workflows completed successfully on clean runners. Source review found and fixed hit targets leaking into the fixed axis/label regions, scroll-dependent double-click coordinates, and retained handlers from repeatedly rebuilding the accessible list. Relationship curves now respect the active event filters. The separate demo preserves filters while restoring a saved view and can build a self-contained offline HTML review copy.

The follow-up browser attempt also rejected `file:` navigation under its URL policy. These changes have compiler/model/build validation, **not** interactive acceptance evidence. The checklist above remains required.

## Integration hardening — October 1, 2026

18 JavaScript core tests now cover malformed trace options, sparse-array rejection, saved-view validation and defensive copying, and one-millisecond ranges at the Date limits. The existing four Python tests remain part of CI. Trace configuration is validated and copied before mounting, so caller mutation cannot invalidate later selections. Toolbar buttons use `type="button"` for embedding inside forms. Saved-view restoration validates the full payload before updating live state. These are automated/model checks and source-reviewed DOM changes; interactive browser acceptance is still outstanding.

## Navigation and inspection — October 1, 2026

Added `fitTrace()` and selection-preserving `focusEvent(id)`, automatic expansion of relevant collapsed lane groups, disabled empty-selection toolbar actions, and directed relationship arrowheads. 21 JavaScript tests (including three controller-only navigation tests), four Python tests, and build checks cover this revision. The controller tests use layout stubs and do not exercise DOM rendering; interactive acceptance remains outstanding. Verify focus from off-screen/collapsed lanes, filtered-event refusal, trace fitting, and arrow directions including backward-time links before production.
