"""The shared visual system must not alter the measured scientific snapshot."""
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


def test_one_token_authority_and_no_retired_presentation_layers():
    css = list(WEB.glob('*.css'))
    assert sum(p.read_text(encoding='utf-8').count(':root') for p in css) == 1
    for p in css:
        text = p.read_text(encoding='utf-8')
        assert '!important' not in text, p.name
        assert not FORBIDDEN.search(text), p.name
        if p.name != 'tokens.css':
            assert not re.search(r'#[0-9a-f]{3,8}\b', text, re.I), p.name
        assert not re.search(r'font-size\s*:\s*(?:[0-9](?:\.\d+)?|1[01](?:\.\d+)?)px\b', text), p.name
    for name in RETIRED:
        assert not (WEB / (name + '.css')).exists()
    for p in [*WEB.glob('*.html'), *WEB.glob('*.js')]:
        assert not FORBIDDEN.search(p.read_text(encoding='utf-8')), p.name


def test_all_entry_pages_embed_identical_progressive_chrome():
    for p in WEB.glob('*.html'):
        if p.name == 'universe-shell.html':
            continue
        s = p.read_text(encoding='utf-8')
        for name, tag in [('header', 'header'), ('footer', 'footer')]:
            canonical = (ROOT / 'web/templates' / (name + '.html')).read_text(encoding='utf-8')
            actual = re.findall(fr'<{tag}\b[^>]*class="site-{name}"[\s\S]*?</{tag}>', s)
            assert len(actual) == 1, p.name
            expected = canonical[canonical.index('<' + tag):].strip()
            if name == 'header':
                expected = expected.replace(
                    'aria-label="SKYSHIFT home"', 'aria-label="SKYSHIFT SPHEREX OBSERVATION EXPLORER home"', 1,
                ).replace('>SKYSHIFT<small>', '>SKYSHIFT <small>', 1)
            if name == 'footer' and p.name in {'compare.html', 'explore.html'}:
                expected = expected.replace(' Scientific approval PENDING.', '', 1)
            assert actual[0].strip() == expected, p.name
        assert 'tokens.css' in s and 'base.css' in s and 'components.css' in s
        assert s.count('as="font"') == 2, p.name
        assert "default-src 'self'" in s or p.name == 'index.html'
        assert 'start_skyshift.bat' not in s


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
