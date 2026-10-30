"""Initialize only the managed data directories, then exec the server nonroot.

Docker volumes can inherit image ownership; managed-provider mounts often do
not. Root startup is permitted only for bounded directory ownership setup.
No recursive chown, chmod 777, data deletion, or continued root HTTP service.
"""
from pathlib import Path
import os
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
DIRECTORIES=('', 'calibration','cache','cache/cutouts','investigations')


def prepare_storage(data,owner=None):
    data=Path(data)
    for relative in DIRECTORIES:
        directory=data/relative
        if directory.is_symlink():raise ValueError('Managed data directories must not be symbolic links')
        directory.mkdir(exist_ok=True)
        if owner is not None:os.chown(directory,*owner)
    return [data/name for name in DIRECTORIES]


def check_writable(directories):
    for directory in directories:
        # Exclusive temporary probes are removed immediately; scientific files
        # and historic receipts are never touched.
        with tempfile.TemporaryFile(dir=directory):pass


def configure_runtime_home(home,uid,temporary=Path('/tmp')):
    # setuid does not replace HOME inherited from a provider's root bootstrap.
    # Astropy must not attempt /root/.astropy; caches/config stay ephemeral.
    runtime=Path(temporary)/f'skyshift-{uid}'
    if runtime.is_symlink():raise ValueError('Runtime cache directory must not be a symbolic link')
    runtime.mkdir(mode=0o700,exist_ok=True)
    os.environ['HOME']=str(home)
    for key,name in [('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache')]:
        directory=runtime/name
        if directory.is_symlink():raise ValueError('Runtime configuration must not be a symbolic link')
        directory.mkdir(mode=0o700,exist_ok=True);os.environ[key]=str(directory)
    return runtime


def acquire_service_lock(data):
    import fcntl
    path=Path(data)/'.service.lock'
    if path.is_symlink():raise ValueError('Managed service lock must not be a symbolic link')
    handle=path.open('a+b')
    try:fcntl.flock(handle.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close();raise RuntimeError('Another SKYSHIFT process owns this persistent data volume; run exactly one instance.')
    os.set_inheritable(handle.fileno(),True)
    return handle


def main():
    if os.name!='posix':raise RuntimeError('Container bootstrap requires Linux/POSIX')
    import pwd
    account=pwd.getpwnam('skyshift');data=ROOT/'data'
    directories=prepare_storage(data,(account.pw_uid,account.pw_gid) if os.geteuid()==0 else None)
    if os.geteuid()==0:
        os.setgroups([]);os.setgid(account.pw_gid);os.setuid(account.pw_uid)
    if os.geteuid()==0:raise RuntimeError('Refusing to serve HTTP as root')
    configure_runtime_home(account.pw_dir,account.pw_uid)
    check_writable(directories)
    lock=acquire_service_lock(data)
    print(f'SKYSHIFT managed storage ready; service uid={os.geteuid()}, single-volume lock held',flush=True)
    os.execv(sys.executable,[sys.executable,str(ROOT/'tools/public_server.py'),*sys.argv[1:]])


if __name__=='__main__':main()
