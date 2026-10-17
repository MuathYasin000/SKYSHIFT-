import { readPreferences, savePreferences } from './space-preferences.js';

// Optional chrome only: failure never prevents opening scientific observations.
export function installObservatoryDesign(){
  const body=document.body,reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)'),cursor=document.createElement('div');
  cursor.className='observatory-cursor';cursor.setAttribute('aria-hidden','true');body.append(cursor);
  const toggle=document.createElement('button');toggle.className='reduce-effects';toggle.textContent='Reduce effects';toggle.id='reduce-effects';
  document.querySelector('.vision-controls').append(toggle);
  function sync(){const off=!readPreferences().effects;body.classList.toggle('reduced-effects',off);toggle.setAttribute('aria-pressed',String(off));toggle.textContent=off?'Restore effects':'Reduce effects';}
  toggle.onclick=()=>{const p=readPreferences();p.effects=!p.effects;savePreferences(p);document.dispatchEvent(new CustomEvent('skyshift:effects',{detail:p.effects}));sync();};
  document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='l'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable],dialog,#space-workspace'))document.getElementById('vision-effects').click();});
  document.addEventListener('pointermove',e=>{const active=fine.matches&&!reduce.matches&&!body.classList.contains('reduced-effects')&&body.dataset.surface==='home'&&!e.target.closest('input,textarea,dialog,canvas,a,button,summary');cursor.classList.toggle('active',active);if(active)cursor.style.transform=`translate3d(${e.clientX-13}px,${e.clientY-13}px,0)`;},{passive:true});
  document.addEventListener('pointerleave',()=>cursor.classList.remove('active'));
  sync();
}
