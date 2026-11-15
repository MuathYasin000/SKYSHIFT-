try:
    from evidence_output import fresh_run
except ModuleNotFoundError:
    from tools.evidence_output import fresh_run
"""Preserve the primary interpretation source actually read for this review."""
from pathlib import Path
from urllib.request import urlopen
from datetime import datetime,timezone
from hashlib import sha256
import json

root=fresh_run('review-sources')
url='https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/'
with urlopen(url,timeout=60) as response:data=response.read(2_000_001)
if len(data)>2_000_000:raise ValueError('Documentation exceeds snapshot bound')
(root/'official_data_products.html').write_bytes(data)
(root/'official_source_record.json').write_text(json.dumps({'source_url':url,'retrieved_at_utc':datetime.now(timezone.utc).isoformat(),
    'sha256':sha256(data).hexdigest(),'interpretation':'Official guide recommends full CWAVE/CBAND for science and newer ePSF models for QR2 as well as QR3. Exact pipeline UUID-to-public-file associations still require review.',
    'original_fits_retrieval_time':'Not recorded by the initial acquisition implementation; original source URLs and file hashes are preserved. Filesystem modification times are not asserted as retrieval times.'},indent=2),encoding='utf-8')
print('Preserved official documentation and timestamped source record')
