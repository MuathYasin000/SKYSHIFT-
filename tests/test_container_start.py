import importlib.util
from pathlib import Path
import pytest

spec=importlib.util.spec_from_file_location('container_start',Path(__file__).resolve().parents[1]/'tools/container_start.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


def test_fresh_managed_storage_preserves_existing_scientific_files(tmp_path):
    data=tmp_path/'data';directories=module.prepare_storage(data)
    original=data/'cache/cutouts/original.fits';original.write_bytes(b'authenticated original fixture')
    module.check_writable(directories);module.prepare_storage(data)
    assert original.read_bytes()==b'authenticated original fixture'
    assert {p.name for p in (data/'cache/cutouts').iterdir()}=={'original.fits'}


def test_privilege_drop_replaces_root_home_and_uses_writable_runtime_config(tmp_path,monkeypatch):
    monkeypatch.setenv('HOME','/root')
    monkeypatch.setenv('XDG_CONFIG_HOME','/root/config')
    monkeypatch.setenv('XDG_CACHE_HOME','/root/cache')
    runtime=module.configure_runtime_home('/home/skyshift',999,tmp_path)
    assert module.os.environ['HOME']=='/home/skyshift'
    for key in ['XDG_CONFIG_HOME','XDG_CACHE_HOME']:
        assert Path(module.os.environ[key]).parent==runtime
        assert Path(module.os.environ[key]).is_dir()


@pytest.mark.skipif(__import__('os').name!='posix',reason='POSIX kernel-lock behavior is exercised in the Linux container')
def test_service_volume_cannot_be_owned_by_two_bootstraps(tmp_path):
    first=module.acquire_service_lock(tmp_path)
    try:
        with pytest.raises(RuntimeError,match='exactly one'):module.acquire_service_lock(tmp_path)
    finally:first.close()
    module.acquire_service_lock(tmp_path).close()
