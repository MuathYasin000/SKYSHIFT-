import importlib.util
from pathlib import Path
import pytest

spec=importlib.util.spec_from_file_location('evidence_output',Path(__file__).resolve().parents[1]/'tools/evidence_output.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)


def test_evidence_collision_refuses_directory_and_report_replacement(tmp_path):
    run=helper.fresh_run('test',tmp_path/'run')
    file=helper.write_report(run,'historical.json','original')
    with pytest.raises(FileExistsError):helper.fresh_run('test',run)
    with pytest.raises(FileExistsError):helper.write_report(run,'historical.json','replacement')
    assert file.read_text()=='original'
