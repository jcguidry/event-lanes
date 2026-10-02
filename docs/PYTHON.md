# Python DataFrames to a browser timeline

The complete example is `examples/python-server/`. It uses a standard-library HTTP server and the public adapter. It supplies lanes, events and relationships as three separate tables. pandas is optional.

```sh
npm install
npm run build
python3 examples/python-server/server.py
```

Open `http://localhost:8000/examples/python-server/`. The page fetches `/api/timeline`, validates JSON, selects the known package and fits its trace. The server binds loopback and serves the repository's generic assets. It is an integration example, not a production server.

To run the same path with actual pandas DataFrames, install pandas in your own environment and run:

```sh
python3 examples/python-server/server.py --pandas
```

The converter calls `DataFrame.to_dict(orient='records')`; the browser contract is identical in both modes. See `make_data.py` for explicit normalization of missing optional fields. Required IDs/labels/participants must be present, not guessed. Datetimes must be timezone-aware. pandas nullable scalars and NaT must be omitted/normalized before the adapter's strict JSON serialization.

```python
from event_lanes import dataset
payload = dataset(entity_records, event_records,
                  relationships=relationship_records,
                  event_groups=[{'id':'recovery','label':'Recovery'}])
```

The adapter's timestamp/JSON checks are not a replacement for JavaScript cross-reference validation. `npm run check:examples` generates this payload and validates it with TimelineModel, including expected group/trace behavior. Production backends can use Flask, FastAPI or an existing service; return the same JSON contract and handle transport/authentication there.

For larger datasets, filter server-side to a meaningful population/window while retaining all referenced lanes/groups and intended boundary context. A sliced trace may be incomplete if its predecessor edges/events were omitted. The current library accepts full replacements, not incremental patches or backend paging.
