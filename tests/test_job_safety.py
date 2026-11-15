"""Admission counts physical work, including cancelled but unfinished tasks."""
from concurrent.futures import ThreadPoolExecutor
import json
import threading
import time

import pytest

from skyshift.jobs import JobStore, PreparationBusy
from skyshift.sequence import Cancelled

REQUEST = {'schema_version':'1.0','kind':'skyshift-observation-request','release':'qr2',
           'region':{'ra_deg':10.,'dec_deg':10.,'size_deg':.04}, 'use_cache':False}


def wait_finished(store):
    deadline = time.monotonic()+5
    while time.monotonic() < deadline:
        with store.lock:
            if not store.inflight:
                return
        time.sleep(.005)
    pytest.fail('Fixture worker did not terminate')


def test_repeated_cancellation_cannot_accumulate_executor_work(tmp_path):
    entered, release = threading.Event(), threading.Event()
    calls=[]
    def builder(request, output, **kwargs):
        calls.append(output)
        entered.set()
        assert release.wait(5)
        raise Cancelled('Synthetic cancelled I/O')
    store=JobStore(tmp_path,builder)
    try:
        running=store.create(REQUEST)
        assert entered.wait(3)
        queued=store.create(REQUEST)
        store.cancel(running['id']); store.cancel(queued['id'])
        for _ in range(100):
            with pytest.raises(PreparationBusy,match='full'):
                store.create(REQUEST)
        assert len(store.inflight)==2
        assert store.executor._work_queue.qsize()==1
        release.set(); wait_finished(store)
        assert len(calls)==1  # cancelled queued work never invokes the builder
        assert all(store.status(j['id'])['state']=='cancelled' for j in [running,queued])
        assert not list(tmp_path.glob('*/sequence.json'))
    finally:
        release.set();store.close()


def test_concurrent_admission_is_atomic_and_bounded(tmp_path):
    release=threading.Event()
    def builder(*args,**kwargs):
        assert release.wait(5)
        raise Cancelled('Synthetic fixture finished')
    store=JobStore(tmp_path,builder)
    def attempt(_):
        try:return store.create(REQUEST)
        except PreparationBusy:return None
    try:
        with ThreadPoolExecutor(max_workers=16) as clients:
            accepted=[r for r in clients.map(attempt,range(64)) if r]
        assert len(accepted)==2 and len(store.inflight)==2
    finally:
        release.set();wait_finished(store);store.close()


def test_cancelled_io_retains_storage_reservation(tmp_path,monkeypatch):
    entered,release=threading.Event(),threading.Event()
    def builder(*args,**kwargs):
        entered.set();assert release.wait(5)
        raise Cancelled('Synthetic fixture finished')
    store=JobStore(tmp_path,builder)
    try:
        job=store.create(REQUEST);assert entered.wait(3);store.cancel(job['id'])
        # 400 MiB + two 80 MiB evidence reservations exceeds 512 MiB.
        # Reserving only the 32 MiB sequence would incorrectly admit this job.
        real_stat=type(tmp_path).stat
        saved=tmp_path/'existing'/'failure.json';saved.parent.mkdir();saved.write_text('{}')
        class LargeReceipt:
            st_size=400*1024*1024
            st_mode=real_stat(saved).st_mode
        monkeypatch.setattr(type(tmp_path),'stat',lambda p,*a,**kw:LargeReceipt() if p==saved else real_stat(p,*a,**kw))
        with pytest.raises(ValueError,match='512 MiB'):store.create(REQUEST)
    finally:
        release.set();wait_finished(store);store.close()


def test_fast_failures_are_rate_limited_and_recover_after_window(tmp_path):
    now=[0.]
    def builder(*args,**kwargs):raise ValueError('Synthetic unavailable archive')
    store=JobStore(tmp_path,builder,clock=lambda:now[0])
    try:
        for _ in range(12):
            store.create(REQUEST);wait_finished(store)
        with pytest.raises(PreparationBusy,match='rate limit'):store.create(REQUEST)
        now[0]=60.
        job=store.create(REQUEST);wait_finished(store)
        assert store.status(job['id'])['state']=='failed'
        assert len(store.jobs)<=16
    finally:store.close()


def test_close_refuses_new_work_and_never_publishes_cancelled_result(tmp_path):
    entered,release=threading.Event(),threading.Event()
    def builder(request,output,**kwargs):
        entered.set();assert release.wait(5)
        output.mkdir();(output/'sequence.json').write_text('{"frames":[]}')
        return {'frames':[]}
    store=JobStore(tmp_path,builder)
    job=store.create(REQUEST);assert entered.wait(3)
    store.close()
    with pytest.raises(PreparationBusy,match='shutting down'):store.create(REQUEST)
    release.set();wait_finished(store)
    assert store.status(job['id'])['state']=='cancelled'
    with pytest.raises(ValueError,match='not complete'):store.result(job['id'])


def test_corrupt_unrelated_receipt_does_not_disable_new_jobs(tmp_path):
    folder=tmp_path/'bad';folder.mkdir();(folder/'job.json').write_text('{broken')
    def builder(*args,**kwargs):raise ValueError('Synthetic unavailable archive')
    store=JobStore(tmp_path,builder)
    try:
        store.create({k:v for k,v in REQUEST.items() if k!='use_cache'})
        wait_finished(store)
        assert (folder/'job.json').read_text()=='{broken'
    finally:store.close()
