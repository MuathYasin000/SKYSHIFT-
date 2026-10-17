"""Validate release identities, local HTML links and the requested stale-copy screen."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import hashlib,json,re,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from local_server import content_identity
from build_local_release import validate_scientific_assets

class Document(HTMLParser):
    def __init__(self,text):
        super().__init__();self.ids=set();self.refs=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.add(a['id'])
        for attr in ('href','src'):
            if a.get(attr):self.refs.append((tag,attr,a[attr]))

def verify(root):
    root=Path(root).resolve();errors=[];references=0
    docs={p:Document(p.read_text(encoding='utf-8')) for p in root.rglob('*.html')}
    # Universe is a deliberately lazy fragment inserted into index's one DOM.
    if root/'universe-shell.html' in docs:docs[root/'index.html'].ids.update(docs[root/'universe-shell.html'].ids)
    routes={'observations','compare','universe','mission','classic','home'}
    for path,doc in docs.items():
        for tag,attr,reference in doc.refs:
            url=urlsplit(reference)
            if url.scheme or url.netloc:continue
            references+=1
            target=(root/url.path.lstrip('/') if url.path.startswith('/') else path.parent/unquote(url.path)).resolve() if url.path else path
            if target.is_dir():target=target/'index.html'
            if not target.exists() and not target.suffix and target.with_suffix('.html').exists():target=target.with_suffix('.html')
            if not target.is_relative_to(root) or not target.is_file():errors.append({'file':str(path.relative_to(root)),'link':reference,'error':'Missing local file'});continue
            if url.fragment:
                fragment=unquote(url.fragment)
                known_route=target.name=='index.html' and fragment.split('/')[0] in routes
                if target not in docs or (fragment not in docs[target].ids and not known_route):errors.append({'file':str(path.relative_to(root)),'link':reference,'error':'Missing fragment'})
    release=json.loads((root/'release.json').read_text());hashes=release['source_asset_sha256']
    for name,sha in hashes.items():
        if not (root/name).is_file() or hashlib.sha256((root/name).read_bytes()).hexdigest()!=sha:errors.append({'file':name,'error':'Release SHA-256 mismatch'})
    if release['content_id']!=content_identity(root):errors.append({'error':'Content identity mismatch'})
    for name in ['version.json','healthz']:
        m=json.loads((root/name).read_text())
        if m['content_id']!=release['content_id']:errors.append({'file':name,'error':'Metadata identity mismatch'})
    validate_scientific_assets(root)
    stale=[]
    def strings(v):
        if isinstance(v,str):yield v
        elif isinstance(v,list):
            for x in v:yield from strings(x)
        elif isinstance(v,dict):
            for x in v.values():yield from strings(x)
    for path in root.rglob('*'):
        if path.suffix not in ['.js','.html','.json','.css','.txt']:continue
        text=path.read_text(encoding='utf-8')
        decoded='\n'.join(strings(json.loads(text))) if path.suffix=='.json' else text
        for pattern in ['â€','Â','blue gap','release 0.3','local production server','vengenceui','orbital-']:
            if pattern.lower() in decoded.lower():stale.append({'file':str(path.relative_to(root)),'pattern':pattern})
    if 'healthz' in (root/'universe-shell.html').read_text():errors.append({'error':'Ops link remains'})
    return {'release_files_hashed':len(hashes),'html_documents':len(docs),'local_references':references,'hash_errors':errors,'stale_copy':stale,'data_catalog':'PASS','content_id':release['content_id']}

if __name__=='__main__':
    result=verify(sys.argv[1] if len(sys.argv)>1 else 'tmp/skyshift-upload/dist')
    text=json.dumps(result,indent=2,ensure_ascii=False)+'\n';print(text)
    out=Path('tmp/link-audit/package-verification.json');out.parent.mkdir(parents=True,exist_ok=True);out.write_text(text,encoding='utf-8')
    raise SystemExit(bool(result['hash_errors'] or result['stale_copy']))
