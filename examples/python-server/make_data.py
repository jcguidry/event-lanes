"""Three tables -> normalized records -> adapter JSON. pandas is optional."""
import math
import sys
from datetime import datetime
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'python'))
from event_lanes import dataset

def make_data(use_pandas=False):
    entities=[{'id':'worker-a','label':'Worker A'},{'id':'worker-b','label':'Worker B'}]
    events=[
        {'id':'hold','label':'Resource unavailable','time':datetime.fromisoformat('2026-10-01T08:00:00-05:00'),'laneIds':['worker-a'],'endTime':None},
        {'id':'handoff','label':'Hand off job 19','time':datetime.fromisoformat('2026-10-01T08:05:00-05:00'),'laneIds':['worker-a','worker-b'],'groupIds':['recovery'],'transfers':[{'from':'worker-a','to':'worker-b','itemId':'job-19'}]},
        {'id':'complete','label':'Job completed','time':datetime.fromisoformat('2026-10-01T08:10:00-05:00'),'endTime':datetime.fromisoformat('2026-10-01T08:12:00-05:00'),'laneIds':['worker-b']}
    ]
    edges=[{'id':'r1','source':'hold','target':'handoff','kind':'causes'},{'id':'r2','source':'handoff','target':'complete','kind':'enables'}]
    if use_pandas:
        import pandas as pd
        entities,events,edges=(pd.DataFrame(rows) for rows in (entities,events,edges))
        # Mixed optional columns introduce NaN/NaT. Omit missing optional scalars.
        def normalize(frame):
            return [{key:value for key,value in row.items() if isinstance(value,(list,dict)) or not pd.isna(value)} for row in frame.to_dict(orient='records')]
        entities,events,edges=(normalize(frame) for frame in (entities,events,edges))
    else:
        events=[{k:v for k,v in row.items() if v is not None} for row in events]
    return dataset(entities,events,relationships=edges,event_groups=[{'id':'recovery','label':'Recovery'}])

if __name__=='__main__':
    import json
    print(json.dumps(make_data('--pandas' in sys.argv),allow_nan=False))
