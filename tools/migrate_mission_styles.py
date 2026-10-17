"""One-time structural migration from the recorded 0.8 source revision.

Only geometry survives. All typography, color and component appearance belongs
to tokens/base/components now. Requires tinycss2 in the development environment.
The immutable Git baseline keeps this migration reviewable after retiring CSS.
"""
from pathlib import Path
import re
import subprocess
import tinycss2

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web/dist'
GROUPS = {
    'app': ['immersive.css', 'telescope-experience.css', 'observation-console.css',
            'website.css', 'orbital-design.css', 'infrared-experience.css',
            'control-design.css', 'observatory-design.css'],
    'document': ['style.css', 'redesign.css', 'visitor.css'],
}
CHROME = re.compile(r'\.(site-header|site-brand|site-navigation|site-footer|wordmark|menu-toggle|official-logo|local-label|header-launch|resources-menu|nav-label|skip-link|skip)(?![\w-])|#(site-header|site-more|site-sound|site-nav)(?![\w-])')
LAYOUT = set('display position inset inset-inline inset-block top bottom left right z-index width height min-width min-height max-width max-height margin margin-top margin-right margin-bottom margin-left margin-inline margin-block margin-inline-start margin-inline-end margin-block-start margin-block-end padding padding-top padding-right padding-bottom padding-left padding-inline padding-block padding-inline-start padding-inline-end gap row-gap column-gap grid grid-template grid-template-columns grid-template-rows grid-column grid-row grid-area grid-auto-flow grid-auto-rows align-items align-content align-self justify-items justify-content justify-self place-items place-content flex flex-direction flex-wrap flex-grow flex-shrink flex-basis order overflow overflow-x overflow-y overflow-wrap word-break white-space text-align vertical-align box-sizing aspect-ratio object-fit object-position pointer-events touch-action user-select cursor resize visibility clip-path contain content-visibility isolation scroll-margin scroll-margin-top scroll-margin-block scroll-padding scroll-padding-top'.split())

def selectors(tokens):
    groups = [[]]
    for t in tokens:
        if t.type == 'literal' and t.value == ',': groups.append([])
        else: groups[-1].append(t)
    return [tinycss2.serialize(g).strip() for g in groups]

def migrate(nodes, scope):
    output=[]
    for n in nodes:
        if n.type == 'at-rule' and n.content is not None and n.lower_at_keyword in ('media','supports','container'):
            body=migrate(tinycss2.parse_rule_list(n.content,skip_whitespace=True,skip_comments=True),scope)
            if body: output.append('@'+n.at_keyword+' '+tinycss2.serialize(n.prelude).strip()+'{'+body+'}')
        elif n.type == 'qualified-rule':
            selected=[]
            for s in selectors(n.prelude):
                if ':root' in s or CHROME.search(s): continue
                if s in ('html','body','*','*::before','*::after'):continue
                if re.search(r'\bbody\b',s):s=re.sub(r'\bbody\b',f'body:where([data-shell="{scope}"])',s)
                else:s=f':where(body[data-shell="{scope}"]) '+s
                selected.append(s)
            if not selected:continue
            values={}
            for d in tinycss2.parse_declaration_list(n.content,skip_comments=True,skip_whitespace=True):
                if d.type!='declaration' or d.lower_name not in LAYOUT:continue
                value=tinycss2.serialize(d.value).strip()
                if re.search(r'#[\da-fA-F]{3,8}\b',value):continue
                values[d.lower_name]=value
            if values:output.append(','.join(selected)+'{'+''.join(k+':'+v+';' for k,v in values.items())+'}')
    return '\n'.join(output)

def run():
    result=['/* Geometry migrated from f679221; no legacy presentation overrides. */','@layer structure {']
    for scope,files in GROUPS.items():
        for name in files:
            source=subprocess.check_output(['git','show','f679221:web/dist/'+name],cwd=ROOT).decode('utf-8')
            result.append(migrate(tinycss2.parse_stylesheet(source,skip_comments=True,skip_whitespace=True),scope))
    result.append('}')
    target=OUT/'components.css'
    original=target.read_text(encoding='utf-8') if target.exists() else ''
    custom=original.split('/* SHARED COMPONENTS */',1)[1] if '/* SHARED COMPONENTS */' in original else ''
    target.write_text('\n'.join(result)+'\n/* SHARED COMPONENTS */'+custom,encoding='utf-8',newline='\n')

if __name__=='__main__':run()
