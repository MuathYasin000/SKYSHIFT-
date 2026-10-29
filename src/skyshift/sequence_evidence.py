"""Reconstruct sequence arrays from authenticated originals; never execute packet code."""
import base64
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit
import zipfile
import math
import re

import numpy as np
from astropy.wcs import WCS

from .archive import download, sha256_file
from .models import Observation
from .products import read_product
from .sequence import SequenceRequest, prepare_exposure


def read_sequence_packet(path):
    if path.stat().st_size > 32*1024*1024:
        raise ValueError('Sequence packet exceeds 32 MiB')
    with zipfile.ZipFile(path) as archive:
        members=archive.infolist()
        names={m.filename for m in members}
        if len(members)!=4 or names!={'sequence.json','session.json','README.txt','hashes.json'} or sum(m.file_size for m in members)>32*1024*1024:
            raise ValueError('Unsupported or oversized sequence archive')
        if any(m.flag_bits&1 or m.compress_type not in (0,8) for m in members):
            raise ValueError('Unsupported sequence archive encoding')
        payload={m.filename:archive.read(m) for m in members}
    hashes=json.loads(payload['hashes.json'])
    if set(hashes)!=names-{'hashes.json'} or any(hashlib.sha256(payload[n]).hexdigest()!=h for n,h in hashes.items()):
        raise ValueError('Sequence packet checksum mismatch')
    bundle,session=json.loads(payload['sequence.json']),json.loads(payload['session.json'])
    if bundle.get('schema_version')!='1.0' or bundle.get('kind')!='spherex_sequence' or bundle.get('dataset_kind')!='real' or bundle.get('scientific_approval')!='PENDING':
        raise ValueError('Unsupported sequence scientific identity')
    if not 1<=len(bundle.get('frames',[]))<=6:
        raise ValueError('Sequence frame count is outside its bounds')
    SequenceRequest.model_validate(bundle['request'])
    return bundle,session


def reconstruct_sequence(packet, output, source_cache=None):
    bundle,session=read_sequence_packet(Path(packet))
    request=SequenceRequest.model_validate(bundle['request'])
    questions=session.get('questions',{})
    if not isinstance(questions,dict) or any(not str(k).isdigit() or not 0<=int(k)<len(bundle['frames']) for k in questions):
        raise ValueError('Questions reference an unknown sequence epoch')
    output=Path(output)
    output.mkdir(parents=True,exist_ok=False)
    cache=Path(source_cache) if source_cache else None
    index={}
    if cache and cache.is_dir():
        for sidecar in cache.rglob('*.fits.source.json'):
            try:
                record=json.loads(sidecar.read_text())
                index.setdefault(record['sha256'],sidecar.with_suffix('').with_suffix(''))
            except (ValueError,KeyError):
                continue
    def original(record):
        cached=index.get(record.sha256)
        if cached and cached.is_file() and sha256_file(cached)==record.sha256:
            return cached
        u=urlsplit(record.source_url or '')
        if u.scheme!='https' or u.hostname not in {'irsa.ipac.caltech.edu','nasa-irsa-spherex.s3.us-east-1.amazonaws.com'} or '/spherex/' not in u.path and not u.path.startswith(('/qr2/','/qr3/')):
            raise ValueError('Unsupported original archive reference')
        path=output/'originals'/(record.sha256+'.fits')
        download(record.source_url,path,max_bytes=40_000_000)
        if sha256_file(path)!=record.sha256:
            raise ValueError('Original archive bytes changed')
        return path
    reports=[]
    for i,frame in enumerate(bundle['frames']):
        obs=Observation.model_validate(frame['observation'])
        if obs.release!=request.release or obs.detector!=request.detector:
            raise ValueError('Sequence observation differs from its request')
        path=original(obs.source)
        cal=original(obs.spectral_calibration) if obs.spectral_calibration else None
        p=read_product(path,request.region,calibration=cal,source_url=obs.source.source_url,
                       calibration_url=obs.spectral_calibration.source_url if cal else None)
        prepared=prepare_exposure(p,request.region)
        checks={}
        for name in ('SCI','WAVE','BAND','VALID'):
            entry=frame['arrays'][name]
            expected=entry['numeric_sha256']
            if hashlib.sha256(base64.b64decode(entry['data'],validate=True)).hexdigest()!=expected:
                raise ValueError('Saved numeric array identity failed')
            checks[name]=prepared['arrays'][name]['numeric_sha256']==expected
        if not all(checks.values()) or prepared['wcs']!=frame['wcs'] or prepared['shape']!=frame['shape']:
            raise ValueError('Reconstructed sequence differs from its prepared evidence')
        valid=np.frombuffer(base64.b64decode(prepared['arrays']['VALID']['data']),dtype=np.uint8).reshape(prepared['shape'])
        for q in session.get('questions',{}).get(str(i),[]):
            if len(session['questions'][str(i)])>16 or not isinstance(q.get('question'),str) or not q['question'].strip() or len(q['question'])>1500 or not re.fullmatch(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}',q.get('id','')):
                raise ValueError('Invalid sequence question text or identity')
            if not all(type(q.get(k)) in (int,float) and math.isfinite(q[k]) for k in ('ra_deg','dec_deg')) or not 0<=q['ra_deg']<360 or abs(q['dec_deg'])>90:
                raise ValueError('Invalid question coordinates')
            if q['product_sha256']!=obs.source.sha256 or q['frame']!='icrs':raise ValueError('Question source identity differs')
            x,y=WCS(prepared['wcs']).world_to_pixel_values(q['ra_deg'],q['dec_deg'])
            x,y=int(np.rint(x)),int(np.rint(y))
            if not 0<=y<valid.shape[0] or not 0<=x<valid.shape[1] or not valid[y,x]:raise ValueError('Question lies outside usable support')
        reports.append({'observation_id':obs.observation_id,'numeric_array_agreement':checks,'questions':len(session.get('questions',{}).get(str(i),[]))})
    report={'status':'pass','sequence_id':bundle['sequence_id'],'frames':reports,
            'scope':'Common-grid arrays and annotation support reconstructed; registration/interpretation are not newly approved',
            'scientific_approval':'PENDING','internal_human_review':'PENDING'}
    (output/'reconstruction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return report
