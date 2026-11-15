"""Serve the same site and bounded preparation API behind a same-origin HTTPS proxy.

Public hosting is explicitly opt-in; the ordinary startup remains loopback-only.
"""
import argparse
import os
import signal
import threading
import re
from local_server import LocalServer, ROOT


def configured_hosts(environment):
    value=environment.get('SKYSHIFT_PUBLIC_HOSTS')
    if value is None:
        value=environment.get('RAILWAY_PUBLIC_DOMAIN') or environment.get('RENDER_EXTERNAL_HOSTNAME') or ''
    hosts={h.strip().lower() for h in value.split(',') if h.strip()}
    if not hosts or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::[0-9]{1,5})?',h) or '..' in h or (':' in h and not 1<=int(h.rsplit(':',1)[1])<=65535) for h in hosts):
        raise ValueError('Configure exact public Host names; URLs, credentials and wildcards are not accepted')
    return hosts


def main():
    if hasattr(os,'geteuid') and os.geteuid()==0:
        raise RuntimeError('Refusing a root HTTP service. Use tools/container_start.py to initialize storage and drop privileges.')
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--port',type=int,default=int(os.environ.get('PORT','3000')))
    p.add_argument('--bind',default='0.0.0.0')
    p.add_argument('--hosts',default=None,help='Comma-separated exact trusted Host headers; otherwise explicit environment or known provider hostname')
    args = p.parse_args()
    environment=dict(os.environ)
    if args.hosts is not None:environment['SKYSHIFT_PUBLIC_HOSTS']=args.hosts
    try:hosts=configured_hosts(environment)
    except ValueError as error:p.error(str(error))
    health_hosts={'healthcheck.railway.app'} if os.environ.get('RAILWAY_PUBLIC_DOMAIN') else set()
    server = LocalServer(ROOT/'web/dist',args.port,bind=args.bind,public_hosts=hosts,health_hosts=health_hosts)
    # Container termination follows the same cancellation/close path as a local
    # shutdown. shutdown() must run outside serve_forever's thread.
    signal.signal(signal.SIGTERM,lambda *_:threading.Thread(target=server.shutdown,daemon=True).start())
    try:
        server.serve_forever()
    finally:
        if server.preparation: server.preparation.close()
        server.server_close()


if __name__ == '__main__': main()
