"""The public entry point stays focused on the SPHEREx search workflow."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web/dist'
RETIRED = ('immersive', 'telescope-experience', 'observation-console', 'website',
           'orbital-design', 'infrared-experience', 'control-design',
           'observatory-design', 'style', 'redesign', 'visitor', 'immersive-science')
FORBIDDEN = re.compile(r'#(?:f4f1e9|edbf78|ffcf8a|f0e6d5|8cd9db|8adbc9|92ddc9|090c0e|060b15|08131d|070a12|05070a)\b', re.I)


def test_public_entry_point_uses_only_the_core_visual_layer():
    page = (WEB / 'index.html').read_text(encoding='utf-8')
    assert page.count('<link rel="stylesheet"') == 1
    assert './core.css' in page and './core-app.js' in page
    assert 'universe' not in page.lower()
    assert 'sound' not in page.lower()
    assert 'qr2' not in page.lower()


def test_public_entry_point_exposes_the_complete_core_flow():
    s = (WEB / 'index.html').read_text(encoding='utf-8')
    ids = set(re.findall(r'\bid="([^"]+)"', s))
    required = {'search-form', 'target-buttons', 'download-progress', 'observation-rows',
                'frame-a', 'frame-b', 'prev', 'play', 'next', 'scrubber', 'speed',
                'single', 'side', 'wipe', 'canvas-a', 'canvas-b', 'control-reason'}
    assert not required - ids
    assert 'all six detectors' in s.lower()
    assert 'brightness may differ because of wavelength, not change.' in s


def test_fonts_keep_exact_local_woff2_bytes_and_licenses():
    record = json.loads((WEB/'assets/fonts/mission-fonts.json').read_text(encoding='utf-8'))
    for a in record['assets']:
        p = WEB/'assets/fonts'/a['file']
        assert p.stat().st_size == a['bytes']
        assert hashlib.sha256(p.read_bytes()).hexdigest() == a['sha256']
        assert (p.parent/a['license_file']).is_file()
        if p.suffix == '.woff2':
            assert p.read_bytes()[:4] == b'wOF2'
    css = (WEB/'tokens.css').read_text(encoding='utf-8')
    assert css.count('@font-face') == 2
    assert 'InterVariable.woff2' in css and 'IBMPlexMono-Regular.woff2' in css


def test_redesign_preserves_every_scientific_data_file_from_baseline():
    # These SHA-256 values were computed from the original Git blobs. The
    # exact-byte check also works in a source ZIP without a .git directory.
    baseline = json.loads((ROOT/'tests/science_baseline.json').read_text(encoding='utf-8'))
    assert baseline['git_baseline'] == 'f679221' and len(baseline['sha256']) == 21
    for name, expected in baseline['sha256'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == expected, name


def test_external_document_links_have_visible_source_affordance_and_safe_rel():
    class Links(HTMLParser):
        def __init__(self, s):
            super().__init__(); self.current = None; self.links = []; self.feed(s)
        def handle_starttag(self, tag, attrs):
            if tag == 'a': self.current = [dict(attrs), '']
        def handle_data(self, data):
            if self.current: self.current[1] += data
        def handle_endtag(self, tag):
            if tag == 'a' and self.current:
                self.links.append(self.current); self.current = None
    for p in WEB.glob('*.html'):
        for a, text in Links(p.read_text(encoding='utf-8')).links:
            if not a.get('href', '').startswith('https://'):
                continue
            assert 'noopener' in a.get('rel', ''), (p.name, a)
            assert '↗' in text, (p.name, text)
