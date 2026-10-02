# Cold-start exercise result — October 1, 2026 (Chicago)

A fresh agent received only the repository path, AGENTS.md, exercise instructions and an unfamiliar lab-resource dataset. It created six files under `examples/cold-start/solution/`: a converter, validated JSON, a plain-JS page, seven verification tests and a detailed report. It did not receive this conversation, alter the library, publish, or use a browser.

All seven model/controller checks passed against both the distribution and freshly compiled source; strict source/JS checks passed. Stable IDs, explicit offsets, group membership, shared events, transfer direction and relationship types were preserved. Correlation remained excluded by default. Its shortest-path result correctly used the nearest selected root rather than the longest possible chain. See the complete [agent report](../examples/cold-start/solution/REPORT.md).

The exercise exposed documentation gaps: explanation payload shape, initial trace-mode instructions, timezone display choice, shortest-path/depth nuance, and stale feature limits mixed with historical evidence. The maintainer added a concrete API payload, clarified the exercise and separated current validation from historical notes. A temporary package/script mismatch observed while this implementation was in progress was resolved.

This establishes successful independent conversion and integration for this fixture. Browser acceptance is a separate CI suite; the cold-start agent did not perform it. The cold-start page is now also exercised by the browser suite so mounting/selection can be checked independently of its stub-based tests.
