import { readPreferences, savePreferences } from './space-preferences.js';

// Optional chrome only: failure never prevents opening scientific observations.
export function installObservatoryDesign(){
  const body=document.body,reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)'),cursor=document.createElement('div');
  cursor.className='observatory-cursor';cursor.setAttribute('aria-hidden','true');body.append(cursor);
  const toggle=document.createElement('button');toggle.className='reduce-effects';toggle.textContent='Reduce effects';toggle.id='reduce-effects';
  document.querySelector('.vision-controls').append(toggle);
  function sync(){const off=!readPreferences().effects;body.classList.toggle('reduced-effects',off);toggle.setAttribute('aria-pressed',String(off));toggle.textContent=off?'Restore effects':'Reduce effects';}
  toggle.onclick=()=>{const p=readPreferences();p.effects=!p.effects;savePreferences(p);document.dispatchEvent(new CustomEvent('skyshift:effects',{detail:p.effects}));sync();};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&body.dataset.surface==='home'){e.preventDefault();document.getElementById('home-field-search').focus();return;}if(e.key.toLowerCase()==='l'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable],dialog,#space-workspace'))document.getElementById('vision-effects').click();});
  document.addEventListener('pointermove',e=>{const active=fine.matches&&!reduce.matches&&!body.classList.contains('reduced-effects')&&body.dataset.surface==='home'&&!e.target.closest('input,textarea,dialog,canvas,a,button,summary');cursor.classList.toggle('active',active);if(active)cursor.style.transform=`translate3d(${e.clientX-13}px,${e.clientY-13}px,0)`;},{passive:true});
  document.addEventListener('pointerleave',()=>cursor.classList.remove('active'));
  const header=document.getElementById('site-header'),more=document.getElementById('site-more'),menu=document.createElement('nav');
  menu.className='resources-menu';menu.id='resources-menu';menu.hidden=true;menu.setAttribute('aria-label','Resources');
  menu.innerHTML='<button id="resources-information">â“˜ Sources, methods & credits</button><button data-open-sound>â™« Sound & volume</button><a href="./methodology.html">â†— Scientific methods</a><a href="./explore.html">â†— Direct observation recovery</a><a href="./compare.html">â†— Direct comparison recovery</a>';
  header.append(menu);more.setAttribute('aria-controls',menu.id);more.setAttribute('aria-expanded','false');
  function closeMenu(){menu.hidden=true;more.setAttribute('aria-expanded','false');}
  more.onclick=()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden));};
  menu.querySelector('#resources-information').onclick=()=>{closeMenu();document.getElementById('site-information').showModal();};
  menu.addEventListener('click',e=>{if(e.target.closest('a,[data-open-sound]'))closeMenu();});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!more.contains(e.target))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();more.focus();}});
  const launch=document.createElement('a');launch.href='#compare';launch.className='header-launch';launch.textContent='Launch Compare â†—';header.insertBefore(launch,more);
  let last=scrollY,frame=0;
  addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;header.classList.toggle('nav-away',body.dataset.surface==='home'&&scrollY>250&&scrollY>last+2&&!header.contains(document.activeElement)&&menu.hidden);last=scrollY;});},{passive:true});
  new MutationObserver(()=>{header.classList.remove('nav-away');cursor.classList.remove('active');closeMenu();}).observe(body,{attributes:true,attributeFilter:['data-surface']});
  document.querySelector('.orbital-hero').addEventListener('pointermove',e=>{if(reduce.matches||body.classList.contains('reduced-effects'))return;const r=e.currentTarget.getBoundingClientRect();document.getElementById('hero-cursor-position').textContent=`DISPLAY POSITION / x ${Math.round(e.clientX-r.left)} Â· y ${Math.round(e.clientY-r.top)} px`;},{passive:true});
  try{if(!sessionStorage.getItem('skyshift.observatory.boot')&&body.dataset.surface==='home'&&!reduce.matches){sessionStorage.setItem('skyshift.observatory.boot','1');const boot=document.createElement('aside');boot.className='boot-readout';boot.setAttribute('aria-label','Interface preparation');boot.innerHTML='<p>PREPARING YOUR INFRARED EXPLORER</p><div data-spectrum></div><button>Skip intro</button>';body.append(boot);boot.querySelector('[data-spectrum]').style.background='var(--infrared)';boot.querySelector('button').onclick=()=>boot.remove();setTimeout(()=>boot.remove(),1100);}}catch{/* Private mode must not prevent exploration. */}
  sync();
}
