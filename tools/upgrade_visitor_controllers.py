"""Reproduce the 0.4 controller migration from preserved 0.3 source templates."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];WEB=ROOT/'web/dist';T=ROOT/'tools/templates'
for name in ['site.js','app.js']:
    template=T/(name.replace('.js','_0.3.js'))
    if not template.exists():template.write_bytes((WEB/name).read_bytes())

site=(T/'site_0.3.js').read_text(encoding='utf-8')
start=site.index('export function galleries(');end=site.index('\nnavigation();',start)
gallery='''export function galleries(catalog,onChoose){
  for(const gallery of document.querySelectorAll('[data-gallery]')){
    gallery.replaceChildren();
    for(const field of catalog.fields){
      const obs=field.observations[0],story=stories[field.id],status=availability(field);
      const card=make('article',undefined,'field-card'),a=make('a');
      a.href=`./explore.html?field=${field.id}#explorer`;a.dataset.field=field.id;
      const preview=make('div',undefined,'field-preview'),img=make('img');
      img.src=obs.preview;img.alt=`Real single-band SPHEREx exposure of ${field.title}; excluded data shown in blue`;img.loading='lazy';
      preview.append(img,make('span','REAL SPHEREx EXPOSURE','preview-label'));
      const body=make('div',undefined,'field-card-body');
      body.append(make('span',status.label,'field-status'),make('div',story?.kind||'Curated sky region','field-kind'));
      body.append(make('h3',story?.name||field.title),make('p',story?.short||field.description));
      const meta=make('div',undefined,'field-meta');
      meta.append(make('span',friendlyDate(obs.time_start_utc)+' UTC'),make('span',field.observations.length+' curated '+(field.observations.length===1?'exposure':'exposures')));
      const action=make('div',status.action,'field-action');action.append(make('span','↗'));body.append(meta,action);a.append(preview,body);card.append(a);gallery.append(card);
      if(onChoose)a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',`?field=${field.id}#explorer`);onChoose(field.id);document.querySelector('#explorer').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
    }
  }
}'''
site="import {stories,availability,friendlyDate} from './field-guide.js';\n"+site[:start]+gallery+site[end:]
(WEB/'site.js').write_text(site,encoding='utf-8')

app=(T/'app_0.3.js').read_text(encoding='utf-8')
app="import {showSources,markStep} from './visitor.js';\nimport {friendlyDate} from './field-guide.js';\n"+app
app=app.replace("function setViewport(zoom,cx=state.display.center_x,cy=state.display.center_y){", "function setViewport(zoom,cx=state.display.center_x,cy=state.display.center_y){markStep(2);")
app=app.replace("function setMarking(value){state.marking=value;", "function setMarking(value){if(value)markStep(3);state.marking=value;")
app=app.replace("$('note-dialog').showModal();setMarking(false);", "$('note-location').open=position.ra_deg===undefined&&!existing;$('note-dialog').showModal();markStep(3);setMarking(false);")
app=app.replace("toast('Field note saved in this tab. Export the comparison to keep it.');", "toast('Question saved in this tab. Download the comparison to keep it after closing.');")
app=app.replace("Click a location in the common usable area to add a note", "Click a visible spot in either image. Blue gaps cannot hold a note.")
app=app.replace("button.textContent='↓ Export comparison';", "button.textContent='↓ Save comparison (.zip)';")
app=app.replace("$('blink').textContent='▷ Blink';", "$('blink').textContent='▷ Blink between dates';")
app=app.replace("reflectDisplay();populateEvidence();$('loading').hidden=true;", "reflectDisplay();populateEvidence();$('comparison-source').disabled=false;$('comparison-source').onclick=event=>showSources(state.manifest.observations,state.manifest.processing,event.currentTarget);$('loading').hidden=true;")
app=app.replace("renderScience();renderNotes();if(matchMedia", "renderScience();renderNotes();markStep(1);if(matchMedia")
app=app.replace("date.toISOString().slice(0,10)+' · '+date.toISOString().slice(11,19)","friendlyDate(o.time_start_utc,true)")
app=app.replace("state.manifest.observations.map((o,i)=>'AB'[i]+' · '+o.time_start_utc+' UTC')", "state.manifest.observations.map((o,i)=>'AB'[i]+' · '+friendlyDate(o.time_start_utc,true))")
app=app.replace("$('comparison-source').disabled=false;", "$('epoch-a').textContent=friendlyDate(state.manifest.observations[0].time_start_utc);$('epoch-b').textContent=friendlyDate(state.manifest.observations[1].time_start_utc);$('comparison-source').disabled=false;")
app=app.replace("initialize();", "for(const id of ['side-mode','single-mode','epoch-a','epoch-b'])$(id).addEventListener('click',()=>markStep(2));\ninitialize();")
# Arrow shortcuts remain scoped to canvases; preserve the scientific evidence interface.
(WEB/'app.js').write_text(app,encoding='utf-8')
