"""Release changes cannot silently acquire calibrated-science capabilities."""
from copy import deepcopy
import numpy as np
import pytest
from astropy.io import fits

from skyshift.releases import CALIBRATION, collection_for, product_adapter, release_capabilities
from skyshift.products import flag_definitions, quality_mask


def test_discovery_and_science_capabilities_are_explicit_and_independent():
    value = release_capabilities()
    assert value['releases']['qr3']['discovery']
    assert value['releases']['qr3']['calibrated_detectors'] == []
    assert value['releases']['qr2']['calibrated_detectors'] == [2]
    assert collection_for('qr3', True) == 'spherex_qr3_deep'
    assert 'path' not in str(value['releases']['qr2']['calibration_dependencies'])
    value['releases']['qr2']['calibrated_detectors'].append(6)
    assert release_capabilities()['releases']['qr2']['calibrated_detectors'] == [2]


@pytest.mark.parametrize('release', ['qr1', 'qr4', '', 'QR2'])
def test_unknown_releases_are_disabled(release):
    with pytest.raises(ValueError, match='explicit tested adapter'):
        collection_for(release)


def test_processing_versions_and_calibration_association_fail_closed():
    pin = CALIBRATION['qr2', 2]['sha256']
    assert product_adapter('6.4+psffix1', 2, calibration_sha256=pin)['release'] == 'qr2'
    assert product_adapter('7.0.5', 2)['mode'] == 'visualization_only'
    assert product_adapter('6.99.1', 2)['mode'] == 'visualization_only'
    for version, detector, digest in [('6.99.1', 2, pin), ('7.0.5', 2, pin), ('6.5.6', 3, pin), ('6.5.6', 2, '0'*64)]:
        with pytest.raises(ValueError, match='calibration association'):
            product_adapter(version, detector, calibration_sha256=digest)
    for version in ['8.0.0', '7.guessed', None, '6.5.6/qr3']:
        with pytest.raises(ValueError, match='Unsupported pipeline'):
            product_adapter(version, 2)


def test_source_path_release_cannot_be_hidden_in_query_or_neighboring_path():
    good = 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/a.fits'
    assert product_adapter('7.0.5', 2, good)['release'] == 'qr3'
    for bad in [good.replace('/qr3/', '/qr2/'), 'https://irsa.ipac.caltech.edu/other/a.fits?hint=/qr3/', 'https://example.com/qr3/level2/a.fits']:
        with pytest.raises(ValueError):
            product_adapter('7.0.5', 2, bad)


def test_qr3_mask_schema_retains_source_but_rejects_bad_and_unknown_bits():
    h = fits.Header({'MSKN0001': 'OVERFLOW', 'MSKM0001': 2,
                     'MSKN0021': 'SOURCE', 'MSKM0021': 1 << 21})
    definitions = flag_definitions(h, 'qr3')
    valid, unknown, fatal = quality_mask(np.ones(4), np.array([0, 1 << 21, 2, 1 << 30]), np.ones(4), definitions)
    assert valid.tolist() == [True, True, False, False]
    assert unknown == 1 and fatal == ['OVERFLOW']
    bad = h.copy(); bad['MSKM0001'] = 1
    with pytest.raises(ValueError, match='bit index'): flag_definitions(bad, 'qr3')
    bad = h.copy(); del bad['MSKM0001']
    with pytest.raises(ValueError, match='definitions differ'): flag_definitions(bad, 'qr3')
    bad = h.copy(); bad['MSKN0001'] = 'SOURCE'
    with pytest.raises(ValueError, match='duplicate'): flag_definitions(bad, 'qr3')


def test_qr2_original_bit_schema_remains_distinct():
    assert flag_definitions(fits.Header({'MP_SOURCE': 21, 'MP_OVERFLOW': 1}), 'qr2') == {'SOURCE': 21, 'OVERFLOW': 1}
    with pytest.raises(ValueError, match='missing'):
        flag_definitions(fits.Header({'MP_SOURCE': 21}), 'qr3')
