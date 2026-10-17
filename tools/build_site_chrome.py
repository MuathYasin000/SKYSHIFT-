"""Render one static, progressive shared header and footer on every entry page."""
from pathlib import Path
import re
from build_source_sections import run as build_source_sections
from local_server import CONTENT_SECURITY_POLICY

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'web/dist'

def run():
    build_source_sections()
    header=(ROOT/'web/templates/header.html').read_text(encoding='utf-8')
    footer=(ROOT/'web/templates/footer.html').read_text(encoding='utf-8')
    index=(OUT/'index.html').read_text(encoding='utf-8')
    information=re.search(r'<dialog\b[^>]*id="site-information"[\s\S]*?</dialog>',index).group()
    information=re.sub(r'<details>\s*<summary>Local setup</summary>[\s\S]*?</details>','',information)
    information=re.sub(r'<a[^>]+href="\./assets/fonts/website-fonts.json"[^>]*>[\s\S]*?</a>','',information)
    information=re.sub(r'<a[^>]+href="\./assets/fonts/observatory-fonts.json"[^>]*>[\s\S]*?</a>','',information)
    information=information.replace("      </details>", "")
    for p in OUT.glob('*.html'):
        if p.name=='universe-shell.html':continue
        s=p.read_text(encoding='utf-8')
        s=re.sub(r'<a\b[^>]*class="(?:skip|skip-link)"[^>]*>[\s\S]*?</a>','',s)
        if re.search(r'<header\b[^>]*class="site-header"',s):s=re.sub(r'<header\b[^>]*class="site-header"[\s\S]*?</header>',header,s,count=1)
        else:s=re.sub(r'(<body[^>]*>)',lambda m:m.group()+header,s,count=1)
        s=re.sub(r'<footer\b[^>]*class="site-footer"[\s\S]*?</footer>','',s)
        s=s.replace('</main>','</main>\n'+footer,1)
        if 'id="site-information"' in s:s=re.sub(r'<dialog\b[^>]*id="site-information"[\s\S]*?</dialog>',information,s,count=1)
        elif 'id="site-information"' not in s:s=s.replace('</body>',information+'<script type="module" src="./site-chrome.js"></script></body>')
        s=re.sub(r'<link\b[^>]*rel="icon"[^>]*>','<link rel="icon" href="./assets/skyshift-mark.svg" type="image/svg+xml">',s)
        if 'rel="icon"' not in s:s=s.replace('</head>','<link rel="icon" href="./assets/skyshift-mark.svg" type="image/svg+xml"></head>')
        s=re.sub(r'<link\b[^>]*rel="preload"[^>]*>','',s)
        s=s.replace('</head>','<link rel="preload" href="./assets/fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="./assets/fonts/IBMPlexMono-Regular.woff2" as="font" type="font/woff2" crossorigin></head>')
        if 'id="main"' not in s:s=s.replace('<main ','<main id="main" tabindex="-1" ',1)
        elif '<main id="main" tabindex' not in s:s=s.replace('<main id="main"','<main id="main" tabindex="-1"',1)
        s=re.sub(r'<a\b[^>]*target="_blank"[^>]*>',lambda m:re.sub(r'rel="[^"]*"','rel="noopener noreferrer"',m.group()) if 'rel=' in m.group() else m.group()[:-1]+' rel="noopener noreferrer">',s)
        # Preserve the existing independent-server policy, including the local
        # WASM decoder and blob worker required by verified compressed models.
        policy=CONTENT_SECURITY_POLICY.replace("frame-ancestors 'self'; ", "")
        s=re.sub(r'<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>','',s)
        s=s.replace('</head>', '<meta http-equiv="Content-Security-Policy" content="'+policy+'"></head>')
        def external(m):
            opening,body=m.group(1),m.group(2)
            opening=re.sub(r' rel="[^"]*"','',opening)
            opening=re.sub(r' target="[^"]*"','',opening)
            opening=opening[:-1]+' target="_blank" rel="noopener noreferrer">'
            return opening+body+(' ↗' if '↗' not in body else '')+'</a>'
        s=re.sub(r'(<a\b[^>]*href="https://[^>]*>)([\s\S]*?)</a>',external,s)
        shell='shell-app.css' if p.name=='index.html' else 'shell-document.css'
        if shell not in s:
            s=s.replace('</head>','<link rel="stylesheet" href="./'+shell+'"></head>')
        if p.name=='guide.html' and 'name="description"' not in s:
            s=s.replace('</head>','<meta name="description" content="Reopen and reconstruct a SPHEREx comparison with its source identities, masks, saved settings and evidence."></head>')
        s='\n'.join(line.rstrip() for line in s.splitlines())+'\n'
        # Replacing static includes must not accumulate empty lines on every run.
        s=re.sub(r'\n(?:[ \t]*\n){2,}', '\n\n', s).rstrip()+'\n'
        if s!=p.read_text(encoding='utf-8'):p.write_text(s,encoding='utf-8',newline='\n')

if __name__=='__main__':run()
