"""Single-worker, bounded preparation jobs with cancellation and immutable receipts."""
from concurrent.futures import ThreadPoolExecutor
from collections import deque
import hashlib
import json
from pathlib import Path
import secrets
import threading
import time

from .archive import sha256_file
from .sequence import SequenceRequest, build_sequence, Cancelled


class PreparationBusy(ValueError):
    """Transient admission refusal; callers can retry without changing a request."""
    retryable = True


class JobStore:
    def __init__(self, directory, builder=build_sequence, *, clock=time.monotonic):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True,exist_ok=True)
        self.builder = builder
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='skyshift-prepare')
        self.jobs, self.lock = {}, threading.RLock()
        # Count submitted work until its Future terminates, regardless of the
        # user-visible cancellation state. A cancelled queued job still occupies
        # an executor work item; cancelling its Future would not remove that item.
        self.inflight = set()
        self.closed = False
        self.clock, self.starts = clock, deque()
        self.revision=hashlib.sha256(b''.join(Path(__file__).with_name(n).read_bytes() for n in ('sequence.py','products.py','coordinates.py','registration.py','suitability.py','preparation.py'))).hexdigest()

    def create(self, payload):
        request = SequenceRequest.model_validate(payload)
        request_key=hashlib.sha256(json.dumps(request.model_dump(mode='json'),sort_keys=True).encode()).hexdigest()
        with self.lock:
            if self.closed:
                raise PreparationBusy('Preparation service is shutting down; retry after restart.')
            for j in self.jobs.values():
                if request.use_cache and j['state']=='complete' and time.time()-j['created']<900 and j['request']==request:
                    return {**self.status(j['id']),'cached_receipt':True}
            for path in sorted(self.directory.glob('*/job.json'),key=lambda p:p.stat().st_mtime,reverse=True)[:32]:
                try:
                    info=json.loads(path.read_text())
                    if request.use_cache and info.get('request_key')==request_key and info.get('revision')==self.revision and 0<=time.time()-info['created']<900:
                        return {**self.status(path.parent.name),'cached_receipt':True}
                except (ValueError, OSError, KeyError, TypeError):
                    # Preserve corrupt receipts for diagnosis, but do not let one
                    # unrelated saved job disable every subsequent request.
                    continue
            if len(self.inflight) >= 2:
                raise PreparationBusy('Preparation queue is full. Cancelled work retains its slot until archive I/O and queued work terminate.')
            now = self.clock()
            while self.starts and now-self.starts[0] >= 60:
                self.starts.popleft()
            if len(self.starts) >= 12:
                raise PreparationBusy('Preparation rate limit reached: twelve new jobs per minute for this service. Retry later or reopen an existing investigation.')
            reserved=(1+len(self.inflight))*32*1024*1024
            if sum(p.stat().st_size for p in self.directory.glob('*/sequence.json'))+reserved>512*1024*1024:
                raise ValueError('Preparation receipt storage reached 512 MiB. Existing investigations are preserved; no new job was started.')
            while len(self.jobs) >= 16:
                old = next((k for k,v in self.jobs.items() if k not in self.inflight), None)
                if old is None:
                    raise ValueError('Preparation queue is full')
                del self.jobs[old]
            key = secrets.token_hex(16)
            job = {'id':key, 'state':'queued', 'message':'Waiting for the bounded preparation worker',
                   'cancel':threading.Event(), 'created':time.time(), 'request':request, 'request_key':request_key,'result_path':None}
            self.jobs[key] = job
            self.inflight.add(key)
            try:
                future = self.executor.submit(self._run, key)
            except Exception:
                self.inflight.discard(key)
                del self.jobs[key]
                raise
            self.starts.append(now)
            future.add_done_callback(lambda _: self._finished(key))
            return self.status(key)

    def _finished(self, key):
        with self.lock:
            self.inflight.discard(key)

    def _run(self, key):
        with self.lock:
            job = self.jobs[key]
            if job['cancel'].is_set():
                job.update(state='cancelled',message='Cancelled before preparation started')
                return
            job['state'] = 'running'
        # A new folder is an investigation receipt, not a release copy.
        output = self.directory/key
        def progress(message):
            with self.lock:
                job['message'] = message
        try:
            result = self.builder(job['request'], output, progress=progress, cancel=job['cancel'])
            with self.lock:
                if job['cancel'].is_set():
                    raise Cancelled('Investigation cancelled')
                path = output/'sequence.json'
                job.update(state='complete', result_path=path, result_sha256=sha256_file(path),
                           frame_count=len(result['frames']), message='Prepared images ready' if result['frames'] else 'No supported images for this request')
                (output/'job.json').write_text(json.dumps({'request_key':job['request_key'],'revision':self.revision,'created':job['created']}),encoding='utf-8')
        except Exception as exc:
            with self.lock:
                job.update(state='cancelled' if job['cancel'].is_set() or isinstance(exc,Cancelled) else 'failed', message=str(exc))
            output.mkdir(parents=True, exist_ok=True)
            (output/'failure.json').write_text(json.dumps({'state':job['state'],'reason':str(exc),'request':job['request'].model_dump(mode='json')},indent=2),encoding='utf-8')

    def status(self, key):
        with self.lock:
            if key not in self.jobs:
                path=self.directory/key/'sequence.json'
                if not path.is_file() or not path.with_name('sequence.sha256').is_file():raise KeyError(key)
                expected=(self.directory/key/'sequence.sha256').read_text()
                if sha256_file(path)!=expected:raise ValueError('Saved investigation receipt failed its checksum')
                value=json.loads(path.read_bytes())
                return {'id':key,'state':'complete','message':'Reopened saved preparation receipt',
                        'result_url':f'/api/investigations/{key}/result','sha256':expected,'frame_count':len(value['frames'])}
            j = self.jobs[key]
            result = {k:j[k] for k in ('id','state','message')}
            if j['state'] == 'complete':
                result.update(result_url=f'/api/investigations/{key}/result', sha256=j['result_sha256'], frame_count=j['frame_count'])
            return result

    def cancel(self, key):
        with self.lock:
            job = self.jobs[key]
            if job['state'] in ('complete','failed','cancelled'):return self.status(key)
            job['cancel'].set()
            job.update(state='cancelled',message='Cancelled; in-flight archive I/O may finish but will not be displayed')
            return self.status(key)

    def result(self, key):
        with self.lock:
            if key not in self.jobs:
                state=self.status(key)
                return (self.directory/key/'sequence.json').read_bytes()
            j = self.jobs[key]
            if j['state'] != 'complete':
                raise ValueError('Investigation is not complete')
            raw = j['result_path'].read_bytes()
            if hashlib.sha256(raw).hexdigest() != j['result_sha256']:
                raise ValueError('Prepared result failed its checksum')
            return raw

    def close(self):
        with self.lock:
            self.closed = True
            for key in self.inflight:
                j = self.jobs[key]
                j['cancel'].set()
                j.update(state='cancelled',message='Service stopping; in-flight work will terminate without publishing a result')
        self.executor.shutdown(wait=False, cancel_futures=True)
