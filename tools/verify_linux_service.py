"""Exercise a running, loopback-only Docker service; never publish it.

Run under Linux with Docker access, passing the explicit test container name.
The verifier stops/starts that container to test completed receipt persistence.
"""
import argparse
import hashlib
from http.client import HTTPConnection
import json
import subprocess
import time
try:
    from evidence_output import fresh_run,write_report
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run,write_report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--container',required=True)
    parser.add_argument('--port',type=int,default=3301)
    args=parser.parse_args();out=fresh_run('linux-service');results=[]
    def docker(*commands):
        return subprocess.check_output(['docker',*commands],text=True,timeout=220).strip()
    def call(path,body=None,headers=None):
        connection=HTTPConnection('127.0.0.1',args.port,timeout=10)
        data=json.dumps(body).encode() if isinstance(body,dict) else body
        connection.request('POST' if body is not None else 'GET',path,data,{'Content-Type':'application/json',**(headers or {})})
        response=connection.getresponse();raw=response.read();h=dict(response.getheaders());connection.close()
        try:value=json.loads(raw)
        except ValueError:value=raw.decode(errors='replace')
        return response.status,value,h,raw
    report={'scope':'Local WSL2 Linux container verification, not public deployment or scientific approval','results':results}
    try:
        inspect=json.loads(docker('inspect',args.container))[0]
        report['container']={'image_id':inspect['Image'],'read_only_root':inspect['HostConfig']['ReadonlyRootfs'],
                             'memory_bytes':inspect['HostConfig']['Memory'],'nano_cpus':inspect['HostConfig']['NanoCpus'],
                             'pids_limit':inspect['HostConfig']['PidsLimit'],'mount_destinations':[m['Destination'] for m in inspect['Mounts']]}
        assert inspect['HostConfig']['ReadonlyRootfs'] and inspect['HostConfig']['Memory']==2147483648
        assert all(v['HostIp']=='127.0.0.1' for ports in inspect['NetworkSettings']['Ports'].values() for v in ports)
        runtime=json.loads(docker('exec',args.container,'python','-c',"import os,sys,json;print(json.dumps({'uid':os.getuid(),'python':sys.version}))"))
        assert runtime['uid']!=0;report['runtime']=runtime
        report['pip_check']=docker('exec',args.container,'pip','check')
        assert report['pip_check']=='No broken requirements found.'
        assert call('/healthz')[0]==200
        status,capabilities,headers,_=call('/api/capabilities');assert status==200 and capabilities['preparation']
        assert 'Access-Control-Allow-Origin' not in headers
        report['capabilities']=capabilities
        request={'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2',
                 'region':{'ra_deg':248.16761083294998,'dec_deg':66.75497941722,'size_deg':.04,'frame':'icrs'},
                 'detector':2,'max_frames':2,'use_cache':False,'selection':'compatible'}
        assert call('/api/capabilities',headers={'Host':'unapproved.invalid'})[0]==421
        assert call('/api/investigations',request,{'Origin':'https://unapproved.invalid'})[0]==403
        assert call('/api/investigations',{**request,'extra':True})[0]==400
        assert call('/api/investigations',b' '*4097)[0]==400
        assert call('/__skyshift_shutdown',{})[0]==405
        results.append({'name':'Nonroot Linux, dependency integrity, read-only root, resource bounds, exact Host/Origin, request limits and disabled public shutdown','status':'pass'})
        status,job,_,_=call('/api/investigations',request);assert status==202,job
        queued={**request,'region':{**request['region'],'ra_deg':248.16762}}
        status,b,_,_=call('/api/investigations',queued);assert status==202,b
        assert call('/api/investigations/'+b['id']+'/cancel',{})[0]==200
        assert call('/api/investigations',{**queued,'region':{**queued['region'],'ra_deg':248.16763}})[0]==429
        results.append({'name':'Cancelling a physically queued job does not release the full queue early','status':'pass'})
        last=None
        for _ in range(360):
            status,state,_,_=call('/api/investigations/'+job['id']);assert status==200
            if state['message']!=last:print(state['message'],flush=True);last=state['message']
            if state['state']=='complete':break
            assert state['state'] not in ['failed','cancelled'],state
            time.sleep(2)
        else:raise TimeoutError('Real archive preparation exceeded the 12-minute audit bound')
        status,value,_,raw=call('/api/investigations/'+job['id']+'/result')
        assert status==200 and len(value['frames'])==2 and value['playback_eligible']
        digest=hashlib.sha256(raw).hexdigest();assert digest==state['sha256']
        report['real_preparation']={'id':job['id'],'result_sha256':digest,'observation_ids':[f['observation']['observation_id'] for f in value['frames']],
                                    'playback_eligible':value['playback_eligible'],'selection':value['selection'],
                                    'registration':[{'status':c['registration']['status'],'references':c['registration']['reference_count']} for c in value['comparisons']]}
        results.append({'name':'Fresh bounded metadata/header selection, official cutout/calibration acquisition and native scientific comparison in Linux','status':'pass'})
        docker('stop','--time','210',args.container)
        stopped=json.loads(docker('inspect',args.container))[0]['State']
        assert stopped['ExitCode']==0 and not stopped['OOMKilled'],stopped
        report['graceful_stop']={'exit_code':stopped['ExitCode'],'oom_killed':stopped['OOMKilled']}
        docker('start',args.container)
        for _ in range(30):
            try:
                if call('/healthz')[0]==200:break
            except OSError:pass
            time.sleep(1)
        assert call('/api/investigations/'+job['id'])[1]['state']=='complete'
        assert hashlib.sha256(call('/api/investigations/'+job['id']+'/result')[3]).hexdigest()==digest
        results.append({'name':'SIGTERM exits cleanly and the exact completed result reopens after restart from persistent storage','status':'pass'})
        report['status']='pass'
    except Exception as error:
        report.update(status='fail',error=str(error));raise
    finally:
        write_report(out,'verification.json',json.dumps(report,indent=2)+'\n')
    print(json.dumps({'status':'pass','checks':len(results),'output':str(out)}))


if __name__=='__main__':main()
