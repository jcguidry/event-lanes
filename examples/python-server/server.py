"""Local runnable example; production transport/auth belongs to your app."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from make_data import make_data

class Handler(SimpleHTTPRequestHandler):
    use_pandas=False
    def do_GET(self):
        if self.path.split('?')[0]=='/api/timeline':
            body=json.dumps(make_data(self.use_pandas),allow_nan=False).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
        else:super().do_GET()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--pandas',action='store_true');parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
    Handler.use_pandas=args.pandas
    make_data(args.pandas) # Fail early for an unavailable pandas installation.
    root=Path(__file__).resolve().parents[2]
    server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(root)))
    print(f'Open http://localhost:{args.port}/examples/python-server/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
