from skyshift.messages import public_error_message


def test_host_paths_are_private_but_science_reasons_and_official_urls_survive():
    for path in [r'D:\private\observations\frame.fits','C:/private/frame.fits','/app/data/frame.fits','/tmp/credentials.pem']:
        assert path not in public_error_message(OSError('Cannot open '+repr(path)))
    message='Wavelength mismatch at https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/file.fits?size=0.3'
    assert public_error_message(message)==message
    assert public_error_message('No usable measurements; common support 0.1 < 0.5')=='No usable measurements; common support 0.1 < 0.5'
