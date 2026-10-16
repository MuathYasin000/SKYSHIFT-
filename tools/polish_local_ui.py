"""Apply small review refinements without changing the scientific snapshot."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
app=ROOT/'web/dist/app.js'
t=app.read_text(encoding='utf-8')
t=t.replace('else state.annotations.push(note);','else {if(state.annotations.length>=500)throw Error("A comparison supports up to 500 notes. Export these notes before starting a new record.");state.annotations.push(note);}')
if "'comparison-timeline'" not in t:
    t=t.replace("populateObservation('a','A');populateObservation('b','B');", "populateObservation('a','A');populateObservation('b','B');$('comparison-timeline').textContent=state.manifest.observations.map((o,i)=>'AB'[i]+' · '+o.time_start_utc+' UTC').join('    /    ');")
if 'ArrowLeft' not in t:
    t=t.replace("canvas.addEventListener('pointercancel',()=>drag=null);", "canvas.addEventListener('keydown',event=>{if(!state.manifest||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();setViewport(state.display.zoom,state.display.center_x+({'ArrowLeft':-1,'ArrowRight':1}[event.key]||0),state.display.center_y+({'ArrowUp':1,'ArrowDown':-1}[event.key]||0));});canvas.addEventListener('pointercancel',()=>drag=null);")
app.write_text(t,encoding='utf-8')
for filename in ['compare.html']:
    p=ROOT/'web/dist'/filename;t=p.read_text(encoding='utf-8')
    if 'id="comparison-timeline"' not in t:t=t.replace('<div class="toolbar">','<div id="comparison-timeline" class="comparison-timeline" aria-label="Both observation start times"></div><div class="toolbar">',1)
    p.write_text(t,encoding='utf-8')
css=ROOT/'web/dist/redesign.css';t=css.read_text(encoding='utf-8').replace('#e4433d','#cf342e')
if '.comparison-timeline{' not in t:t+='\n.comparison-timeline{padding:12px 0 16px;color:#bdcde5;font:11px/1.8 Consolas,monospace;overflow-wrap:anywhere}.segmented button[aria-pressed=true]{background:#2b4269;color:white}\n'
css.write_text(t,encoding='utf-8')
explore=ROOT/'web/dist/explore.js';t=explore.read_text(encoding='utf-8')
if "if(['ArrowLeft'" not in t:
    t=t.replace("canvas.addEventListener('keydown',e=>{", "canvas.addEventListener('keydown',e=>{if(state.product&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const [h,w]=state.product.shape;state.cx=Math.max(0,Math.min(w-1,state.cx+({'ArrowLeft':-1,'ArrowRight':1}[e.key]||0)));state.cy=Math.max(0,Math.min(h-1,state.cy+({'ArrowUp':1,'ArrowDown':-1}[e.key]||0)));draw();}")
explore.write_text(t,encoding='utf-8')
# Preserve the original DOM template as an ordinary tracked source, rather than a temp dependency.
template=ROOT/'tools/templates/comparison_core_0.2.html';template.parent.mkdir(exist_ok=True)
if not template.exists():template.write_bytes((ROOT/'tmp/comparison-before-redesign.html').read_bytes())
builder=ROOT/'tools/redesign_web.py';t=builder.read_text(encoding='utf-8')
start=t.index("    original=ROOT/'tmp/comparison-before-redesign.html'");end=t.index('    old=original.read_text',start)
t=t[:start]+"    original=ROOT/'tools/templates/comparison_core_0.2.html'\n"+t[end:]
t=t.replace("content=content.replace('<div class=\"viewer-layout\">'", "content=content.replace('<div class=\"toolbar\">','<div id=\"comparison-timeline\" class=\"comparison-timeline\" aria-label=\"Both observation start times\"></div><div class=\"toolbar\">',1)\n    content=content.replace('<div class=\"viewer-layout\">'") if 'id="comparison-timeline"' not in t else t
t=t.replace('with glowing clouds in blue, purple and orange','with a dense starfield and yellow gas-and-dust clouds')
builder.write_text(t,encoding='utf-8')
