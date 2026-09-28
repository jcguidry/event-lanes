import sys, unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'examples/python'))
from event_lanes import dataset, epoch_ms
class Conversion(unittest.TestCase):
    def test_zone(self):
        self.assertEqual(epoch_ms(datetime(1970,1,1,2,tzinfo=timezone(timedelta(hours=2)))),0)
    def test_reject_ambiguous(self):
        for value in [datetime(2026,1,1),1.5,True,'2026-01-01']:
            with self.assertRaises(ValueError): epoch_ms(value)
    def test_records(self):
        value=dataset([dict(id='a',label='Worker A')],[dict(id='e',label='Job',time=0,laneIds=['a'])])
        self.assertEqual(value['events'][0]['time'],0)
    def test_nan(self):
        with self.assertRaises(ValueError): dataset([],[],event_groups=[dict(metadata=float('nan'))])
if __name__=='__main__': unittest.main()
