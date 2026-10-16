"""Issue a documentation-only packet revision without reprocessing scientific bytes."""
from pathlib import Path
import shutil,json
from skyshift.evidence import export_packet,read_packet
from skyshift.archive import sha256_file

root=Path(__file__).resolve().parents[1];old=root/'data/prepared/m101-review-v4';new=root/'data/prepared/m101-review-v6'
# Reinstalling a source package can create build caches beside it. Always derive
# evidence revisions from the immutable, hash-verified ZIP, never a worked checkout.
manifest,payload=read_packet(root/'data/exports/m101-review-v4.zip')
archive=root/'data/exports/m101-review-v6.zip'
if not archive.exists():
 new.mkdir(parents=True,exist_ok=False)
 for name,data in payload.items():
  if name=='hashes.json':continue
  target=new/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 shutil.copyfile(root/'docs/reviewer_guide.md',new/'diagnostics/reviewer_guide.md')
 export_packet(new,archive)
current,current_payload=read_packet(archive)
assert payload['manifest.json']==current_payload['manifest.json']
assert payload['prepared/pair.fits']==current_payload['prepared/pair.fits']
assert current_payload['diagnostics/reviewer_guide.md']==(root/'docs/reviewer_guide.md').read_bytes()
result={'path':str(archive),'size_bytes':archive.stat().st_size,'sha256':sha256_file(archive),'files':len(current_payload)}
(root/'docs/evidence/review_packet_documentation_revision.json').write_text(json.dumps({'old_packet':'m101-review-v4.zip','current_packet':'m101-review-v6.zip',
 'reason':'Remove a superseded rounded residual from one specialist question; authoritative registration-v2 measurements were already correct.',
 'scientific_manifest_and_prepared_bytes_unchanged':True,'scientific_approval':'PENDING','intermediate_v5':'Unpublished packaging artifact included source-install build caches; retained but superseded by the clean canonical-ZIP derivation.', 'packet':result},indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
