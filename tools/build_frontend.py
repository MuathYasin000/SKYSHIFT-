"""Incrementally build authored frontend repairs; never regenerate scientific inputs.

Existing buildless modules remain in web/dist. Files adopted into web/src are
authoritative there; this build copies only changed bytes, then validates assets.
"""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone
from build_local_release import validate_assets, validate_scientific_assets, validate_sequence_assets
from local_server import content_identity

ROOT = Path(__file__).resolve().parents[1]


def build():
    source, dist = ROOT/'web/src', ROOT/'web/dist'
    changed = []
    for path in sorted(source.rglob('*')):
        if not path.is_file() or path.suffix not in {'.js', '.css', '.html'}:
            continue
        target = dist/path.relative_to(source)
        data = path.read_bytes()
        if not target.exists() or target.read_bytes() != data:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            changed.append(target.relative_to(dist).as_posix())
    # Search presets are metadata, separate from immutable scientific products.
    preset = ROOT/'config/challenge_targets.json'
    target = dist/'challenge-targets.json'
    data = preset.read_bytes()
    if not target.exists() or target.read_bytes() != data:
        target.write_bytes(data)
        changed.append(target.name)
    examples=ROOT/'config/time_explorer_examples.json'
    if examples.exists():
        target=dist/'data/time-explorer-examples.json'
        data=examples.read_bytes()
        if not target.exists() or target.read_bytes()!=data:
            target.write_bytes(data)
            changed.append('data/time-explorer-examples.json')
    products=ROOT/'config/sky_products.json'
    if products.exists():
        data=products.read_bytes();target=dist/'data/sky-products.json'
        if not target.exists() or target.read_bytes()!=data:target.write_bytes(data);changed.append('data/sky-products.json')
        for entry in json.loads(data)['entries']:
            relative=entry.get('manifest_url') or entry['image_url']
            path=(dist/relative.removeprefix('./')).resolve()
            if not path.is_relative_to(dist.resolve()) or hashlib.sha256(path.read_bytes()).hexdigest()!=entry.get('manifest_sha256',entry.get('sha256')):
                raise ValueError('Sky product manifest or published source identity differs')
    validate_assets(dist)
    validate_scientific_assets(dist)
    validate_sequence_assets(dist)
    catalog = json.loads((dist/'data/catalog.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256()
    for part in catalog['review_packet']['parts']:
        digest.update((dist/part['url'].removeprefix('./')).read_bytes())
    audit = json.loads((dist/'data/provenance-audit.json').read_text(encoding='utf-8'))
    if digest.hexdigest() != audit['deployed']['review_packet_sha256']:
        raise ValueError('Final review archive differs from its immutable historical identity')
    receipt = dict(schema_version='1.0', scope='Local build integrity; not production deployment or scientific approval',
                   baseline_release='skyshift-0.9-mission-control', content_id=content_identity(dist),
                   deployment_id=None, scientific_approval='PENDING',
                   historical_audit_at_utc=audit['created_at_utc'], source_release=audit['local']['release'],
                   review_packet_sha256=digest.hexdigest(),
                   scientific_assets_sha256={p.relative_to(dist).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
                       for p in sorted((dist/'data').rglob('*')) if p.is_file() and p.name!='release-integrity.json'})
    path=dist/'data/release-integrity.json'
    previous=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    if {k:v for k,v in previous.items() if k!='verified_at_utc'} != receipt:
        receipt['verified_at_utc']=datetime.now(timezone.utc).isoformat()
        path.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(dict(changed=changed,content_id=receipt['content_id'],scientific_approval='PENDING')))


if __name__ == '__main__':
    build()
