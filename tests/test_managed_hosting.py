import sys
from pathlib import Path
from http.client import HTTPConnection
import threading
import pytest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from public_server import configured_hosts
from local_server import LocalServer


def test_provider_domain_is_exact_and_explicit_hosts_take_precedence():
    assert configured_hosts({'RAILWAY_PUBLIC_DOMAIN':'skyshift-example.up.railway.app'})=={'skyshift-example.up.railway.app'}
    assert configured_hosts({'RENDER_EXTERNAL_HOSTNAME':'skyshift-example.onrender.com'})=={'skyshift-example.onrender.com'}
    assert configured_hosts({'SKYSHIFT_PUBLIC_HOSTS':'owned.example','RAILWAY_PUBLIC_DOMAIN':'other.example'})=={'owned.example'}
    for value in ['', '*','https://example.com','user@example.com','host:99999','example.com/path']:
        with pytest.raises(ValueError):configured_hosts({'SKYSHIFT_PUBLIC_HOSTS':value})


def test_provider_probe_host_grants_only_exact_health_get_and_head(tmp_path):
    (tmp_path/'index.html').write_text('<!doctype html><title>synthetic hosting test</title>')
    server=LocalServer(tmp_path,port=0,public_hosts={'public.example'},health_hosts={'healthcheck.railway.app'})
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    def request(path,method='GET',host='healthcheck.railway.app'):
        c=HTTPConnection('127.0.0.1',server.server_address[1],timeout=3)
        c.request(method,path,headers={'Host':host});r=c.getresponse();r.read();c.close();return r.status
    try:
        assert request('/healthz')==200 and request('/healthz','HEAD')==200
        assert request('/api/capabilities')==421
        assert request('/healthz','POST')==421
        assert request('/healthz?route=/api/capabilities')==421
        assert request('/healthz',host='unapproved.example')==421
    finally:server.shutdown();server.server_close();thread.join(timeout=3)
