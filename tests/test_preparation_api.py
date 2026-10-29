import hashlib
from http.client import HTTPConnection
import json
from pathlib import Path
import threading
import time

from test_local_server import server_module
from skyshift.jobs import JobStore


def test_same_origin_bounded_job_api_works_and_reopens_receipts(tmp_path,monkeypatch):
    web=tmp_path/'web';web.mkdir();(web/'index.html').write_text('<title>Synthetic transport fixture</title>')
    def builder(request,output,progress,cancel):
        output.mkdir();data={'frames':[]};raw=json.dumps(data).encode();(output/'sequence.json').write_bytes(raw);(output/'sequence.sha256').write_text(hashlib.sha256(raw).hexdigest());return data
    store=JobStore(tmp_path/'jobs',builder)
    server=server_module.LocalServer(web,0);server.preparation_enabled=True;server.preparation=store
    thread=threading.Thread(target=server.serve_forever,kwargs={'poll_interval':.01},daemon=True);thread.start()
    payload={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2','region':{'ra_deg':1,'dec_deg':2,'size_deg':.1}}
    def request(path,method='GET',body=None,origin=None,host=None):
        c=HTTPConnection('127.0.0.1',server.server_address[1],timeout=3)
        headers={'Content-Type':'application/json'}
        if origin:headers['Origin']=origin
        if host:headers['Host']=host
        c.request(method,path,body=json.dumps(body) if body is not None else None,headers=headers)
        r=c.getresponse();value=json.loads(r.read());status=r.status;c.close();return status,value
    try:
        assert request('/api/capabilities')[1]['preparation']
        assert request('/api/investigations','POST',payload,'https://unrelated.example')[0]==403
        assert request('/api/investigations','POST',{**payload,'max_frames':999})[0]==400
        code,job=request('/api/investigations','POST',payload);assert code==202
        path='/api/investigations/'+job['id']
        for _ in range(100):
            status,value=request(path)
            if value['state']=='complete':break
            time.sleep(.01)
        assert value['state']=='complete'
        assert request(path+'/result')[1]=={'frames':[]}
        from skyshift.jobs import PreparationBusy
        def busy(payload):raise PreparationBusy('Preparation queue is full')
        with monkeypatch.context() as m:
            m.setattr(store,'create',busy)
            assert request('/api/investigations','POST',payload)[0]==429
        store.jobs.clear()
        assert request(path)[1]['state']=='complete'
        assert request(path+'/result')[1]=={'frames':[]}
        assert request('/api/investigations/'+'f'*32)[0] in (400,404)
        server.public_hosts.add('skyshift.example')
        assert request('/api/capabilities',host='skyshift.example')[0]==200
        assert request('/api/capabilities',host='unapproved.example')[0]==421
        assert request('/__skyshift_shutdown','POST',{},host='skyshift.example')[0]==405
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2);store.close()
