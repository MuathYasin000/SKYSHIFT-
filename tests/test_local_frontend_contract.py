"""Static interface contracts and HTTP integrity, without claiming browser QA."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import hashlib
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web/dist'

class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.ids=[];self.refs=[];self.scripts=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        for key in ['href','src']:
            if a.get(key):self.refs.append(a[key])
        if tag=='script' and a.get('src'):self.scripts.append(a['src'])

def test_all_pages_have_unique_ids_and_resolvable_local_links():
    for path in WEB.glob('*.html'):
        p=Page(path.read_text(encoding='utf-8'));assert len(set(p.ids))==len(p.ids),path.name
        for ref in p.refs:
            if ref.startswith(('https:','http:','mailto:','#','data:')):continue
            # These read-only routes are provided by LocalHandler and exercised
            # over HTTP in test_local_server, rather than static disk files.
            if ref in ('/healthz', '/version.json'):continue
            file,_,anchor=ref.partition('#');file=file.partition('?')[0]
            target=path.parent/file
            if target.is_dir():target=target/'index.html'
            assert target.is_file(),(path.name,ref)
            if anchor and target.suffix=='.html':
                # The main website uses explicit same-document application routes.
                # Conventional document anchors elsewhere must still resolve.
                if path.name=='index.html' and not file and anchor in {'home','observations','compare','mission','universe'}:
                    assert './website-bootstrap.js' in p.scripts
                    continue
                assert anchor in Page(target.read_text(encoding='utf-8')).ids,(path.name,ref)

def test_comparison_and_explorer_controllers_find_every_static_dom_id():
    for controller,page in [('app.js','compare.html'),('explore.js','explore.html')]:
        ids=set(Page((WEB/page).read_text(encoding='utf-8')).ids)
        used=set(re.findall(r"\$\('([^']+)'\)",(WEB/controller).read_text(encoding='utf-8')))
        assert not used-ids,(controller,used-ids)

def test_science_snapshot_unchanged_and_independent_hosting_has_no_active_registration():
    catalog=json.loads((WEB/'data/catalog.json').read_text());bundle_bytes=(WEB/'data/bundle.json').read_bytes()
    assert hashlib.sha256(bundle_bytes).hexdigest()==catalog['bundle_sha256']
    m=json.loads(bundle_bytes)['manifest'];assert m['pair_id']=='pair-52ad675d929b0740c23b'
    assert m['processing']['scientific_approval']=='PENDING'
    assert hashlib.sha256((WEB/'data/pair.fits').read_bytes()).hexdigest()==m['prepared_files'][0]['sha256']
    for path in WEB.glob('*.js'):
        text=path.read_text(encoding='utf-8')
        assert 'chatgpt.site' not in text and 'create_source_repository_write_credential' not in text
    assert not (ROOT/'web/.openai/hosting.json').exists()

def test_every_runtime_module_import_is_local_and_present():
    for path in WEB.glob('*.js'):
        imports=re.findall(r"(?m)^\s*import(?:[^'\"\n]+from\s*)?['\"]([^'\"]+)['\"]",path.read_text(encoding='utf-8'))
        for ref in imports:assert ref.startswith('./') and (path.parent/ref).is_file(),(path.name,ref)
