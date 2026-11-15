"""Readable, script-independent source panels generated from unchanged records."""
from pathlib import Path
from html import escape
import json
import re

WEB=Path(__file__).resolve().parents[1]/'web/dist'
START='<!-- GENERATED SOURCE PANELS -->'
END='<!-- END GENERATED SOURCE PANELS -->'

def link(url,label,download=False):
    extra=' download' if download else ' target="_blank" rel="noopener noreferrer"' if url.startswith('https://') else ''
    return '<a href="'+escape(url,quote=True)+'"'+extra+'>'+escape(label)+'</a>'

def record(title,entry,base):
    rows=[]
    labels={'credit':'Credit','status':'Availability','reason':'Limitations','license':'License',
        'modifications':'Modifications','modification':'Modifications','modifications_summary':'Modifications',
        'purpose':'Purpose','scope':'Scope','reuse_status':'Reuse','file':'Recorded file',
        'version':'Version','sha256':'SHA-256','original_sha256':'Original SHA-256',
        'original_bytes':'Original bytes','bytes':'Bytes','local_implementation':'Implementation'}
    for key,label in labels.items():
        value=entry.get(key)
        if value is None:continue
        text=', '.join(map(str,value)) if isinstance(value,list) else str(value)
        value_html='<code>'+escape(text)+'</code>' if key.endswith('sha256') or key=='file' else escape(text)
        rows.append('<dt>'+label+'</dt><dd>'+value_html+'</dd>')
    refs=[]
    for key,label in [('source_page','Original source'),('source','Source / terms'),('website','Project website'),('source_url','Original code'),('download_url','Upstream download'),('terms','Usage terms'),('license_reference','License terms')]:
        value=entry.get(key)
        if isinstance(value,str) and value.startswith('https://'):refs.append(link(value,label))
    for key in ['license_file','notice','local_license']:
        value=entry.get(key)
        if value:
            path=value if value.startswith('vendor/') else base+'/'+value
            if (WEB/path).is_file():refs.append(link('./'+path,'Read '+value.split('/')[-1]))
    return '<details class="source-entry"><summary>'+escape(title)+'</summary><dl>'+''.join(rows)+'</dl><p class="source-links">'+' · '.join(refs)+'</p></details>'

def run():
    sections=[]
    for section,title,intro,path,key in [
        ('models','Models, terms & hashes','Contextual spacecraft and planetary assets are illustrations, separate from astronomical measurements. Entries retain their recorded availability, original sources, modifications and checksums.','assets/space/manifest.json','assets'),
        ('fonts','Inter & IBM Plex Mono','Locally supplied interface fonts, their license notices, modifications and exact file identities.','assets/fonts/mission-fonts.json','assets'),
        ('patterns','Original pattern notices','Interface studies and adaptations, with original authors and applicable notices. Inspiration-only entries do not imply copied or licensed source code.','vendor/ui-patterns/sources.json','adaptations'),
        ('libraries','GSAP, ScrollTrigger & Lenis','Optional locally supplied presentation libraries. Scientific loading does not depend on these animations or an external CDN.','vendor/scroll/manifest.json','libraries'),
    ]:
        data=json.loads((WEB/path).read_text(encoding='utf-8'));base=str(Path(path).parent).replace('\\','/')
        entries=[]
        for entry in data[key]:
            name=entry.get('title') or entry.get('name') or entry.get('id') or entry.get('file')
            entries.append(record(name,entry,base))
        if section=='models':
            entries.extend(record(e['name'],e,base) for e in data.get('libraries',[]))
        if section=='patterns':
            entries.extend(record(e['name'],e,base) for e in data.get('inspiration_only',[]))
            entries.append('<p>'+link('./vendor/ui-patterns/NOTICES.txt','Read full adaptation and attribution notices')+'</p>')
        sections.append('<section id="'+section+'" class="editorial-section source-record-section"><p class="eyebrow">SOURCES &amp; ACKNOWLEDGMENTS</p><h2>'+escape(title)+'</h2><p>'+escape(intro)+'</p><p>'+link('./'+path,'Download original source record (.json)',True)+'</p>'+''.join(entries)+'</section>')
    markup=START+'\n'+''.join(sections)+'\n'+END
    target=WEB/'methodology.html';source=target.read_text(encoding='utf-8')
    updated=re.sub(re.escape(START)+r'[\s\S]*?'+re.escape(END),lambda _:markup,source) if START in source else source.replace('</main>',markup+'</main>',1)
    if updated!=source:target.write_text(updated,encoding='utf-8',newline='\n')

if __name__=='__main__':run()
