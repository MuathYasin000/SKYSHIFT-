"""Serve the same site and bounded preparation API behind a same-origin HTTPS proxy.

Public hosting is explicitly opt-in; the ordinary startup remains loopback-only.
"""
import argparse
import os
from local_server import LocalServer, ROOT


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--port',type=int,default=int(os.environ.get('PORT','3000')))
    p.add_argument('--bind',default='0.0.0.0')
    p.add_argument('--hosts',default=os.environ.get('SKYSHIFT_PUBLIC_HOSTS',''),help='Comma-separated exact trusted Host headers, including ports where used')
    args = p.parse_args()
    hosts = {h.strip().lower() for h in args.hosts.split(',') if h.strip()}
    if not hosts or any('/' in h or '*' in h for h in hosts):
        p.error('Configure exact public host names; wildcards are not accepted')
    server = LocalServer(ROOT/'web/dist',args.port,bind=args.bind,public_hosts=hosts)
    try:
        server.serve_forever()
    finally:
        if server.preparation: server.preparation.close()
        server.server_close()


if __name__ == '__main__': main()
