"""Preserve local source, all scientific caches and releases with verified hashes.

Excludes reproducible installed dependencies, transient state and older backup ZIPs.
The archive never overwrites a previous backup. No publication or network activity.
"""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,os,re,subprocess,zipfile

ROOT=Path(__file__).resolve().parents[1]
EXCLUDED_DIRS={'.git','.venv','.pytest_cache','__pycache__','.skyshift-local','node_modules','tmp'}

def sha256_file(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()

def selected_files(root,archive):
    for folder,dirs,files in os.walk(root):
        dirs[:]=sorted(d for d in dirs if d not in EXCLUDED_DIRS)
        for name in sorted(files):
            path=Path(folder)/name;relative=path.relative_to(root)
            if path.is_symlink():raise ValueError('Backup inputs must be ordinary files: '+str(relative))
            if path==archive or name.endswith(('.log','.pyc','.pyo')):continue
            if relative.parts[0]=='output' and 'backup' in name.lower() and path.suffix.lower()=='.zip':continue
            yield path,relative.as_posix()

def build(version='0.4'):
    if not re.fullmatch(r'[0-9]+\.[0-9]+(?:\.[0-9]+)?',version):raise ValueError('Use a numeric release version')
    archive=ROOT/f'output/SKYSHIFT_Local_Full_Backup_{version}.zip'
    if archive.exists():raise FileExistsError('Preserve the previous backup; select a new release name in the builder.')
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    manifest={'schema_version':'1.0','created_at_utc':datetime.now(timezone.utc).isoformat(),'source_commit':head,
        'scientific_approval':'PENDING','files':{},'exclusions':sorted(EXCLUDED_DIRS)+['older output backup ZIPs','*.log','*.pyc','*.pyo'],
        'notes':'Complete ordinary source/science/research/output files. Installed Python/dependencies are represented by pinned locks, not bundled binaries. Git histories are preserved in output/history/*.bundle. Runtime stop tokens are excluded.'}
    count=0;total=0
    with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as z:
        for path,relative in selected_files(ROOT,archive):
            before=path.stat();h=hashlib.sha256();size=0
            with path.open('rb') as source,z.open(relative,'w',force_zip64=True) as dest:
                for chunk in iter(lambda:source.read(1048576),b''):dest.write(chunk);h.update(chunk);size+=len(chunk)
            after=path.stat()
            if before.st_size!=after.st_size or before.st_mtime_ns!=after.st_mtime_ns:raise ValueError('Input changed while archiving: '+relative)
            manifest['files'][relative]={'sha256':h.hexdigest(),'size_bytes':size};count+=1;total+=size
            if count%150==0:print(f'Archived {count} files, {total/1e6:.1f} MB source bytes',flush=True)
        z.writestr('BACKUP_MANIFEST.json',json.dumps(manifest,indent=2))
        z.writestr('RESTORE_INSTRUCTIONS.txt','SKYSHIFT independent local backup\n\nExtract into a new empty folder. Validate BACKUP_MANIFEST.json hashes before use.\nRun start_skyshift.bat with Python 3.11+ installed. No hosted account is needed.\nOriginal source, raw/calibration/prepared data, research, evidence and production/media releases are included.\nInstalled virtual environments, transient state and older backup ZIPs are excluded. Pinned scientific dependencies and verified Git bundles are included.\nHuman technical and qualified scientific review remain PENDING.\n')
    verified=0
    with zipfile.ZipFile(archive) as z:
        for name,record in manifest['files'].items():
            h=hashlib.sha256();size=0
            with z.open(name) as f:
                for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk);size+=len(chunk)
            if h.hexdigest()!=record['sha256'] or size!=record['size_bytes']:raise ValueError('Backup verification failed: '+name)
            verified+=1
        if len(z.infolist())!=verified+2:raise ValueError('Unexpected backup members')
    result={'archive':str(archive),'sha256':sha256_file(archive),'size_bytes':archive.stat().st_size,'source_bytes':total,'files_verified':verified,'source_commit':head,'scientific_approval':'PENDING','all_member_hashes_match':True,'exclusions':manifest['exclusions']}
    (ROOT/f'output/Local_Backup_{version}_Verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version',default='0.4')
    build(parser.parse_args().version)
