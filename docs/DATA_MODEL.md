# Modeling supplied events

Choose event grain before making JSON. One event should represent one meaningful observed action or interval with one stable identity. An event may involve several entities and several explicitly directed transfers. Split records only when your source supports separate event identities; do not create fictitious simultaneity or duplicate an event once per participant.

| Object | Meaning | Example |
|---|---|---|
| Lane | An entity whose activity you follow | Worker A, machine 7 |
| Lane group | A visual grouping of entities | Team North |
| Event | An action at `time`, optionally lasting through `endTime` | Job handoff, resource unavailable |
| Transfer | Movement within that event, from one participating lane to another | Job 19 moves A → B |
| Event group | A package of known related actions | Recovery package 42 |
| Relationship | A directed assertion between event IDs | Unavailability causes handoff |

Lane groups and event groups are different namespaces. `Lane.groupId` refers to a lane group; `Event.groupIds` refers to event groups. Multiple group memberships are allowed. Selecting an event in group mode expands its direct groups once; overlapping memberships do not recursively select every connected group.

## Minimal data

```json
{"schemaVersion":1,"lanes":[{"id":"worker-a","label":"Worker A"}],"events":[{"id":"evt-1","label":"Job begins","time":1790856000000,"laneIds":["worker-a"]}]}
```

Times are integer UTC epoch **milliseconds**. Use timezone-aware source timestamps, convert explicitly, and display in a chosen IANA timezone. Seconds, ISO strings, naive datetimes, NaN and Infinity fail the contract. Zero is a valid time. An interval has `endTime >= time`; omitted end means a point event. Intersections at both boundaries are included in range queries.

Stable IDs identify the same entity/event across refreshes. Do not generate IDs from DataFrame row positions unless that identity is stable by design. Labels can change while IDs remain stable. IDs are unique within each object collection; a relationship cannot point at a lane or unknown event.

## Correct transfer

```json
{"id":"handoff-19","label":"Hand off job 19","time":1790856060000,"laneIds":["worker-a","worker-b"],"groupIds":["recovery"],"transfers":[{"from":"worker-a","to":"worker-b","itemId":"job-19"}]}
```

Both transfer endpoints must be in `laneIds`, and both lanes must exist. The array order of `laneIds` is not a transfer direction; use `transfers.from/to`. A multi-lane event without transfers is shared participation, displayed with a connector. Transfer direction is separate from cause/effect direction between events.

## Relationships and evidence

`source` and `target` always mean the direction of the supplied relationship, even for an upstream traversal. `causes` and `enables` are traced by default. `correlates` and `supersedes` are excluded until the caller explicitly includes them. If correlation is included, call the results related/upstream/downstream links rather than proved causes. Cycles are allowed and traversal terminates. Timestamp order does not constrain edge direction.

Keep confidence, provenance, source record IDs and measured impact in JSON metadata if your application has them. The library neither validates the truth of those statements nor computes an impact forecast. A trace explanation is a shortest declared path under the current traversal settings. It is not a statistical explanation or proof of causation.

| Incorrect assumption | Correct approach |
|---|---|
| Events one minute apart must be one package | Supply group assignments from your own grouping logic |
| Every shared group member caused the next | Supply individual directed relationships |
| First participant gave an item to the second | Supply a transfer explicitly |
| Missing end time should be `null` | Omit the optional field |
| pandas NaN means JSON null everywhere | Normalize missing values by field semantics; required fields cannot be missing |
| An exported view contains all records | Persist dataset and view separately |

The JSON Schema checks structure. Runtime `validateData` additionally checks cross-references, duplicate IDs and strict JSON values. Validate a converted dataset with the DOM-free core before mounting. On error the current timeline remains intact. Unknown extra JSON fields are retained in data, but applications should use `metadata` for extensions.
