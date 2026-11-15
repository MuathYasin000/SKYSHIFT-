"""Index the explicitly requested debugging screenshots, without rendering media."""
from pathlib import Path
from html import escape

ROOT=Path(__file__).resolve().parents[1]/'tmp/refinement'

def pair(label, file):
    return '<section><h2>'+escape(label)+'</h2><div class="pair">'+''.join(
        '<figure><figcaption>'+phase.title()+'</figcaption><a href="'+phase+'/'+file+'"><img loading="lazy" src="'+phase+'/'+file+'" alt="'+escape(label+' '+phase)+'"></a></figure>'
        for phase in ['before','after'])+'</div></section>'

def run():
    sections=[]
    for width in [1440,390]:
        sections.append('<h2 class="size">'+str(width)+'px viewport</h2>')
        for label, file in [
            ('1 · Image labels / both panels','both-panels'),
            ('2 · One icon and numeral per principle','principles'),
            ('3 · Hero word / first screen','home'),
            ('4 · Universe information card','universe'),
            ('5 · Wavelength caption and ruler','ruler'),
            ('6 · Document typography and inline links','guide'),
            ('7 · Comparison within the first screen','compare'),
            ('Explore','explore'),('Discover SPHEREx','discover'),
            ('Methodology','methodology'),('Home / full page','home-full'),
            ('Native comparison','native-compare'),
        ]:
            sections.append(pair(label,file+'-'+str(width)+'.png'))
    html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYSHIFT · Layout verification</title>
<style>body{margin:0;padding:32px;background:#000;color:#fff;font:16px/1.6 system-ui}main{max-width:1500px;margin:auto}h1{font-size:32px}h2{font-size:20px}p{max-width:80ch;color:#aaa}a{color:#9bbdff}section{border-top:1px solid #444;padding:24px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;min-width:0}figcaption{font:14px monospace;padding:8px 0}img{width:100%;height:auto;border:1px solid #333}.size{margin-top:64px;font-size:28px}@media(max-width:700px){body{padding:16px}.pair{grid-template-columns:1fr}}</style><main>
<h1>SKYSHIFT · Before / after</h1><p>Actual Chromium screenshots at 1440 × 900 and 390 × 844. Click an image for its full size. Full-page Home images show the complete page. These automated checks do not substitute for human usability testing or qualified scientific review.</p>
<p>All seven requested pages and the native comparison are included. The original baseline is revision aa0189c. The original data and scientific restrictions are unchanged.</p>'''+''.join(sections)+'</main></html>'
    (ROOT/'index.html').write_text(html,encoding='utf-8',newline='\n')
    print(ROOT/'index.html')

if __name__=='__main__':run()
