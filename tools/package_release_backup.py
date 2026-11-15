"""Archive the verified source, working static app, scientific packet and final media."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import subprocess,json,zipfile

root=Path(__file__).resolve().parents[1]
git='C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe'
def run(*args,cwd=root):return subprocess.check_output([git,*args],cwd=cwd).decode('utf-8').strip()
assert not run('status','--porcelain'), 'Commit the exact release source before packaging'
assert not run('status','--porcelain',cwd=root/'web'), 'Frontend source must be clean'
paths=[root/p for p in run('ls-files').splitlines() if p!='web']
paths.extend(root/'web'/p for p in run('ls-files',cwd=root/'web').splitlines())
artifact_names=[
 'data/exports/m101-review-v6.zip',
 'output/pdf/SKYSHIFT_Release_Report_0.2_final.pdf',
 'output/presentation/SKYSHIFT_Presentation_0.2_release.pptx',
 'output/video/SKYSHIFT_Three_Minute_Walkthrough_0.2_final.mp4',
 'output/video/SKYSHIFT_Walkthrough_0.2.srt',
 'output/video/Narration_and_sources.md',
 'output/video/video_verification.json',
 'output/screenshots/skyshift-production-final.png',
 'output/screenshots/skyshift-production-desktop.png',
 'output/screenshots/skyshift-production-note.png',
 'output/screenshots/skyshift-production-mobile.png']
paths.extend(root/p for p in artifact_names)
for path in paths:
 if not path.is_file():raise ValueError(f'Release file absent: {path}')
hashes={p.relative_to(root).as_posix():sha256(p.read_bytes()).hexdigest() for p in paths}
manifest=json.loads((root/'data/prepared/m101-review-v6/manifest.json').read_text(encoding='utf-8'))
for name,digest in manifest['processing']['code_hashes'].items():
 assert sha256((root/'src/skyshift'/name).read_bytes()).hexdigest()==digest, 'Scientific source differs from prepared snapshot'
inventory={'created_at_utc':datetime.now(timezone.utc).isoformat(),'app_version':'0.2.0','root_source_commit':run('rev-parse','HEAD'),'frontend_source_commit':run('rev-parse','HEAD',cwd=root/'web'),
 'url':'https://skyshift-project-mercury.surebream11.chatgpt.site','site_version':3,'pair_id':manifest['pair_id'],'scientific_approval':'PENDING','internal_human_review':'PENDING',
 'tests':{'python_passed':61,'javascript_passed':23},'file_hashes':hashes,
 'limits':['Human internal technical review pending','Qualified scientific assessment pending','Five novice sessions pending','Broader browser/device validation pending'],
 'reproduction':'Clean-environment image preparation and reference summaries pass; all ten prepared arrays reproduce exactly.'}
out=root/'output';(out/'release_inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
archive=out/'SKYSHIFT_0.2_Release_Backup.zip'
readme=('SKYSHIFT 0.2.0 release backup. Scientific approval and human technical review PENDING.\n'
 'Extract project/ as a dedicated folder. Both Python source and the complete static web app are included, without credentials or .git metadata.\n'
 'For the viewer: python -m http.server 8765 --directory web/dist --bind 127.0.0.1\n'
 'The full scientific packet is data/exports/m101-review-v6.zip. Install the project with the exact requirements-lock.txt in Python 3.12, then skyshift review packet.zip --output new-folder.\n'
 'Original inputs/calibration are embedded inside the scientific packet. Do not change scientific status manually. Read docs/reviewer_guide.md, deployment.md, release_acceptance.md and maintainer_guide.md.\n'
 'Final report, presentation, 180-second computer-narrated screenshot walkthrough and captions are under output/. Synthetic QA notes are not discoveries.\n'
 'Source repository access for web/ may require Sites authorization; this backup already includes its source/assets.\n'
 'release_inventory.json records exact source commits and every included file hash. Hashes provide integrity, not signatures or scientific approval.\n')
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('README.txt',readme)
 for path in paths:z.write(path,'project/'+path.relative_to(root).as_posix())
 z.write(out/'release_inventory.json','project/output/release_inventory.json')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name,digest in hashes.items():assert sha256(z.read('project/'+name)).hexdigest()==digest
receipt={'path':str(archive),'size_bytes':archive.stat().st_size,'sha256':sha256(archive.read_bytes()).hexdigest(),'verified_members':len(hashes),'scientific_approval':'PENDING','source_commit':inventory['root_source_commit']}
(out/'release_backup_receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps(receipt,indent=2))
