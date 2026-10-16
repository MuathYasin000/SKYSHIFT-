import {pixelToSky,skyToPixel} from './science.js';
import {validateExposureQuestions,MAX_EXPOSURE_QUESTIONS,MAX_QUESTION_LENGTH} from './exposure-questions.js';

// Tab-local questions are deliberately separate from automatic view history.
export function createExposureNotebook({getExposure,onLocate,onChange}){
  const $=id=>document.getElementById(id),notes=new Map(),dialog=$('exposure-question-dialog');let editing=null,position=null,opener=null;
  const sessionKey=sha=>'skyshift.questions.v1.'+sha;
  function persist(exposure){try{sessionStorage.setItem(sessionKey(exposure.entry.sha256),JSON.stringify(current()));return true;}catch{return false;}}
  function restoreSession(){
    const e=getExposure();if(!e||notes.has(e.entry.sha256))return;
    try{const text=sessionStorage.getItem(sessionKey(e.entry.sha256));if(text&&new TextEncoder().encode(text).length>112*1024)throw Error('Oversized saved questions');notes.set(e.entry.sha256,text?validateExposureQuestions(JSON.parse(text),e.product,e.entry.sha256,e.arrays.VALID):[]);}
    catch{notes.set(e.entry.sha256,[]);$('exposure-question-feedback').textContent='Tab question history could not be restored. JSON save and reopen still work.';}
  }
  const current=()=>notes.get(getExposure()?.entry.sha256)||[];
  function render(){
    const exposure=getExposure(),questions=exposure?current():[];$('exposure-question-list').replaceChildren();$('exposure-question-count').textContent=String(questions.length);$('exposure-questions-empty').hidden=questions.length>0;
    for(const [i,q]of questions.entries()){
      const item=document.createElement('article');item.className='exposure-question';const text=document.createElement('p');text.textContent=q.question;
      const coordinate=document.createElement('small');coordinate.textContent=`${i+1} · ICRS ${q.ra_deg.toFixed(6)}°, ${q.dec_deg.toFixed(6)}°`;
      const controls=document.createElement('div');
      for(const [label,action]of [['Locate',()=>{onLocate(skyToPixel(q.ra_deg,q.dec_deg,exposure.product.wcs));}],['Edit',()=>open(q)],['Delete',()=>{notes.set(exposure.entry.sha256,questions.filter(n=>n.id!==q.id));if(!persist(exposure))$('exposure-question-feedback').textContent='Tab storage is unavailable. Download this exposure view before navigating away.';render();onChange();$('exposure-questions-title').focus({preventScroll:true});}]]){
        const button=document.createElement('button');button.type='button';button.textContent=label;button.className='plain-link';button.setAttribute('aria-label',label+' question '+(i+1));button.onclick=action;controls.append(button);
      }
      item.append(coordinate,text,controls);$('exposure-question-list').append(item);
    }
  }
  function open(question=null,point=null){
    const e=getExposure();if(!e)return;
    if(!question&&current().length>=MAX_EXPOSURE_QUESTIONS){$('exposure-question-feedback').textContent='This exposure has 16 questions. Export them, or edit or delete an existing question.';return;}
    editing=question;position=question?{ra_deg:question.ra_deg,dec_deg:question.dec_deg}:pixelToSky(point.x,point.y,e.product.wcs);
    opener=document.activeElement;$('exposure-question-text').value=question?.question||'';$('exposure-question-error').textContent='';$('exposure-question-position').textContent=`ICRS ${position.ra_deg.toFixed(6)}°, ${position.dec_deg.toFixed(6)}°`;dialog.showModal();$('exposure-question-text').focus();
  }
  $('exposure-question-text').maxLength=MAX_QUESTION_LENGTH;
  for(const id of ['close-exposure-question','cancel-exposure-question'])$(id).onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{editing=null;position=null;(opener?.isConnected&&!opener.disabled?opener:$('explore-canvas')).focus({preventScroll:true});});
  $('exposure-question-form').onsubmit=event=>{
    event.preventDefault();const e=getExposure();if(!e||!position)return;
    const question={id:editing?.id||crypto.randomUUID(),product_sha256:e.entry.sha256,frame:'icrs',...position,question:$('exposure-question-text').value.trim(),created_at:editing?.created_at||new Date().toISOString()};
    const next=editing?current().map(q=>q.id===editing.id?question:q):[...current(),question];
    try{notes.set(e.entry.sha256,validateExposureQuestions(next,e.product,e.entry.sha256,e.arrays.VALID));const retained=persist(e);render();onChange();dialog.close();$('exposure-question-feedback').textContent=retained?'Question kept in this tab. Download the exposure view to preserve it.':'Tab storage is unavailable. Download this exposure view before navigating away.';}
    catch(error){$('exposure-question-error').textContent=error.message;}
  };
  return {
    current,
    ask(point){if(!point)return;const e=getExposure();if(!e)return;const [h,w]=e.product.shape,x=Math.round(point.x),y=Math.round(point.y);if(x<0||y<0||x>=w||y>=h||!e.arrays.VALID[y*w+x])return;open(null,{x,y});},
    changed(){if(dialog.open)dialog.close();$('exposure-question-feedback').textContent='';restoreSession();render();},
    restore(questions){const e=getExposure();notes.set(e.entry.sha256,validateExposureQuestions(questions,e.product,e.entry.sha256,e.arrays.VALID));if(!persist(e))$('exposure-question-feedback').textContent='Tab storage is unavailable. Download this exposure view before navigating away.';render();}
  };
}
