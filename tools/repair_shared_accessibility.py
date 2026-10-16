"""Correct observed accessibility defects across shared static pages and authoring source."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for p in [ROOT/'tools/redesign_web.py',*(ROOT/'web/dist').glob('*.html')]:
    t=p.read_text(encoding='utf-8').replace(' aria-label="SKYSHIFT home"','').replace('Local release 0.3','Local release 0.4')
    p.write_text(t,encoding='utf-8')
p=ROOT/'web/dist/redesign.css';t=p.read_text(encoding='utf-8')
if 'p a:not(.primary)' not in t:t+='\np a:not(.primary){text-decoration:underline;text-underline-offset:3px}\n'
p.write_text(t,encoding='utf-8')
