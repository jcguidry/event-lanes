# Troubleshooting

| Symptom | Check | Resolution |
|---|---|---|
| Bare package import fails in a browser | Bundler/import map configured? | Bundle the ESM package or use the global build |
| Canvas is blank | Container width/height, Canvas2D, input validation | Give it a visible container; inspect the thrown validation error |
| Event is selected but not drawn | Time range, event filters, lane search, collapsed lanes | Clear restrictions, expand lanes and fit the trace |
| `focusEvent` returns false | ID exists and matches effective filters? | Correct the ID or explicitly reveal it by clearing filters/lane search |
| A group includes unexpected events | Supplied membership and overlapping direct groups | Fix source memberships; expansion is one step, not transitive |
| Correlation appears in trace | Current relationship-kind choices | Restore causes/enables for the default causal view |
| Trace seems short | Direction, maxDepth, missing edges | Check trace settings and relationship endpoint IDs |
| A label disappears | Other label has higher priority | Hover, select, zoom or use the accessible list; geometry is retained |
| Interval overlap is hard to read | Density/detail mode and many concurrent events | Zoom in; detail mode stacks overlapping geometry and grows lane height |
| Pin is not fixed | Too little vertical room or filtered lane | Increase height or unpin another lane |
| Reordering crosses no group boundary | Group-aware ordering is intentional | Change group membership in your data for a different grouping |
| Python JSON contains NaN/NaT | Missing-value normalization | Omit absent optional fields; fill required values from valid source data |
| JSON timestamp is rejected | Seconds, float, naive datetime, ISO string | Convert to integer UTC epoch milliseconds |
| Refresh jumps back to start | Application calls fit after every setData | Fit initial data only; later setData preserves the viewport |
| Undo disappeared after load | Dataset replacement occurred | Expected: history snapshots never roll back datasets |
| Saved view restores unexpected records | Different dataset/version | Persist dataset identity alongside view JSON |
| PNG lacks off-screen lanes | Visible-canvas export | Scroll/export separately; full-document export is not implemented |

Validation errors list the offending fields/references. A failed `setData` or `restoreViewState` preserves the current live state. For reproducible bugs provide a small generic dataset, library version, browser, container size, saved view and exact actions. Keep private records in your own repository.
