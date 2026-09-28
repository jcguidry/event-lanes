"""Convert mapped Python records or pandas DataFrames to Event Lanes JSON.
No pandas runtime dependency. IDs must already be stable strings.
"""
import json
from datetime import datetime, timezone

def epoch_ms(value):
    if isinstance(value, datetime):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError('Timestamps must be timezone-aware')
        value = int(value.astimezone(timezone.utc).timestamp() * 1000)
    if hasattr(value, 'item'):
        value = value.item()
    if isinstance(value, bool) or not isinstance(value, int) or abs(value) > 8640000000000000:
        raise ValueError('Use integer UTC epoch milliseconds or an aware datetime')
    return value

def records(table):
    return table.to_dict(orient='records') if hasattr(table, 'to_dict') else list(table)

def dataset(lanes, events, *, event_groups=(), lane_groups=(), relationships=()):
    """Columns must match the documented camelCase JSON contract.
    Omit absent optional columns; normalize pandas NaN/NaT explicitly first.
    """
    rows=[]
    for raw in records(events):
        row=dict(raw)
        row['time']=epoch_ms(row['time'])
        if 'endTime' in row:
            row['endTime']=epoch_ms(row['endTime'])
        rows.append(row)
    result=dict(schemaVersion=1,lanes=records(lanes),events=rows,
                eventGroups=records(event_groups),laneGroups=records(lane_groups),
                relationships=records(relationships))
    # Fail before shipping non-standard NaN/Infinity JSON to a browser.
    return json.loads(json.dumps(result,allow_nan=False))
