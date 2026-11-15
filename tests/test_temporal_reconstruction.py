import importlib.util
from pathlib import Path
import pytest

spec=importlib.util.spec_from_file_location('temporal_reconstruction',Path(__file__).resolve().parents[1]/'tools/reconstruct_temporal_example.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)


def test_platform_diagnostic_tolerance_never_changes_policies_or_decisions():
    a={'screen':{'limit':.25},'registration':{'policy':{'limit':.25},'status':'pass','references':16,'median_residual_pixels':.109091147788}}
    import copy
    b=copy.deepcopy(a);b['registration']['median_residual_pixels']+=1e-9
    assert len(helper.compare_diagnostics(a,b))==1
    for section,key,value in [('screen','limit',.2500000001),('registration','status','fail'),('registration','references',15),('registration','median_residual_pixels',.11)]:
        b=copy.deepcopy(a);b[section][key]=value
        with pytest.raises(AssertionError):helper.compare_diagnostics(a,b)
    b=copy.deepcopy(a);b['registration']['policy']['limit']+=1e-10
    with pytest.raises(AssertionError):helper.compare_diagnostics(a,b)
