import {initialSkyCamera,normalizeSkyCamera,projectSky,interpolateSkyCamera} from './sky-projection.js';
import {stories,availability} from './field-guide.js';

export function createSkyAtlas(catalogue,onChoose){
  const canvas=document.getElementById('atlas-canvas'),layer=document.getElementById('atlas-markers'),ctx=canvas.getContext('2d');layer.replaceChildren();
  const lifetime=new AbortController(),listen=(element,type,handler,options={})=>element.addEventListener(type,handler,{...options,signal:lifetime.signal});
  let camera={...initialSkyCamera},selected=null,frame=0,animation=null;const pointers=new Map(),markers=new Map(),visibleFields=new Set(catalogue.fields.map(f=>f.id));
  function requestDraw(){if(!frame)frame=requestAnimationFrame(draw);}
  function dimensions(){const rect=canvas.getBoundingClientRect(),compact=rect.width<500;return {width:rect.width,height:rect.height,radius:Math.min(rect.width*(compact?.41:.45),rect.height*(compact?.29:.40))*camera.zoom,cx:rect.width/2,cy:rect.height*(compact?.47:.52)};}
  function draw(now){
    frame=0;
    if(animation){const t=Math.min(1,(now-animation.start)/350);camera=interpolateSkyCamera(animation.from,animation.to,1-Math.pow(1-t,3));if(t===1)animation=null;else requestDraw();}
    const g=dimensions(),dpr=Math.min(devicePixelRatio||1,2);if(!g.width||!g.height)return;
    canvas.width=Math.round(g.width*dpr);canvas.height=Math.round(g.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,g.width,g.height);
    const glow=ctx.createRadialGradient(g.cx,g.cy,0,g.cx,g.cy,g.radius*1.15);glow.addColorStop(0,'#193655');glow.addColorStop(.85,'#0c1a2e');glow.addColorStop(1,'#07101d');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(g.cx,g.cy,g.radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#678fb256';ctx.lineWidth=.8;
    function curve(points){ctx.beginPath();let active=false;for(const [ra,dec]of points){const p=projectSky(ra,dec,camera);if(p.z<0){active=false;continue;}const x=g.cx+p.x*g.radius,y=g.cy+p.y*g.radius;if(active)ctx.lineTo(x,y);else{ctx.moveTo(x,y);active=true;}}ctx.stroke();}
    for(let dec=-60;dec<=60;dec+=30)curve(Array.from({length:181},(_,i)=>[i*2,dec]));
    for(let ra=0;ra<360;ra+=30)curve(Array.from({length:91},(_,i)=>[ra,-90+i*2]));
    ctx.strokeStyle='#638dad';ctx.lineWidth=1;ctx.beginPath();ctx.arc(g.cx,g.cy,g.radius,0,Math.PI*2);ctx.stroke();
    const north=projectSky(0,90,camera);if(north.z>=0){ctx.fillStyle='#95b7d6';ctx.font='11px Segoe UI';ctx.textAlign='center';ctx.fillText('N',g.cx+north.x*g.radius+16,g.cy+north.y*g.radius-14);}
    for(const field of catalogue.fields){const p=projectSky(field.ra_deg,field.dec_deg,camera),button=markers.get(field.id),x=g.cx+p.x*g.radius,y=g.cy+p.y*g.radius;button.hidden=!visibleFields.has(field.id)||p.z<.015||x<24||x>g.width-24||y<95||y>g.height-120;button.style.left=x+'px';button.style.top=y+'px';const label=button.querySelector('.atlas-marker-name');label.style.left=x>g.width*.75?'auto':x<g.width*.25?'0':'50%';label.style.right=x>g.width*.75?'0':'auto';label.style.transform=x>g.width*.75||x<g.width*.25?'none':'translateX(-50%)';}
    document.getElementById('atlas-zoom').textContent=camera.zoom.toFixed(1)+'×';
  }
  for(const field of catalogue.fields){
    const button=document.createElement('button');button.type='button';button.className='atlas-marker';button.dataset.atlasField=field.id;button.setAttribute('aria-label','Explore '+field.title);button.title=field.title+' · ICRS '+field.ra_deg+'°, '+field.dec_deg+'°';
    const dot=document.createElement('span');dot.className='atlas-marker-dot';dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='atlas-marker-name';label.textContent=field.id==='m101'?'M101 · Pinwheel Galaxy':field.id==='m67'?'M67 outskirts':field.title;
    button.append(dot,label);button.classList.toggle('limited',availability(field).limited);button.onclick=()=>onChoose(field.id);layer.append(button);markers.set(field.id,button);
  }
  function move(next){animation=null;camera=normalizeSkyCamera(next);requestDraw();}
  listen(canvas,'pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);animation=null;});
  listen(canvas,'pointermove',e=>{
    if(!pointers.has(e.pointerId))return;const before=[...pointers.values()],old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=[...pointers.values()];
    if(after.length===1)move({...camera,ra:camera.ra+(e.clientX-old.x)*.25/camera.zoom,dec:camera.dec+(e.clientY-old.y)*.25/camera.zoom});
    else if(after.length===2){const dist=p=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),a=dist(before);if(a)move({...camera,zoom:camera.zoom*dist(after)/a});}
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,event,e=>pointers.delete(e.pointerId));
  listen(canvas,'wheel',e=>{e.preventDefault();move({...camera,zoom:camera.zoom*Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.0018)});},{passive:false});
  listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move({...camera,ra:camera.ra+({'ArrowLeft':-10,'ArrowRight':10}[e.key]||0),dec:camera.dec+({'ArrowUp':-10,'ArrowDown':10}[e.key]||0)});}else if(['+','=','-'].includes(e.key)){e.preventDefault();move({...camera,zoom:camera.zoom*(e.key==='-'?1/1.2:1.2)});}else if(e.key==='Home'){e.preventDefault();move({...initialSkyCamera});}});
  document.getElementById('atlas-reset').onclick=()=>{search.value='';filter();move({...initialSkyCamera});};
  document.getElementById('atlas-plus').onclick=()=>move({...camera,zoom:camera.zoom*1.2});document.getElementById('atlas-minus').onclick=()=>move({...camera,zoom:camera.zoom/1.2});
  const search=document.getElementById('field-search'),clear=document.getElementById('clear-field-search'),feedback=document.getElementById('field-search-feedback');
  function filter(){const query=search.value.trim().toLowerCase();let count=0;visibleFields.clear();for(const field of catalogue.fields){const story=stories[field.id],match=[field.id,field.title,field.description,story?.name,story?.kind,story?.constellation].join(' ').toLowerCase().includes(query);const link=document.querySelector('[data-field="'+field.id+'"]');if(link)link.closest('.field-card').hidden=!match;if(match){count++;visibleFields.add(field.id);}}clear.hidden=!query;feedback.textContent=query?(count?count+' curated '+(count===1?'field matches.':'fields match.'):'No curated field matches. Clear search to see the available regions.'):'Only these '+catalogue.fields.length+' curated fields are available; this is not an archive-wide search.';requestDraw();}
  listen(search,'input',filter);listen(search,'keydown',e=>{if(e.key==='Escape'){search.value='';filter();}});clear.onclick=()=>{search.value='';filter();search.focus();};filter();
  const observer=new ResizeObserver(requestDraw);observer.observe(canvas);requestDraw();
  return {
    select(id,fly=true){selected=id;const field=catalogue.fields.find(f=>f.id===id);if(!field)return;for(const [key,button]of markers)button.setAttribute('aria-pressed',String(key===selected));if(!fly)return;const to=normalizeSkyCamera({ra:field.ra_deg,dec:field.dec_deg,zoom:1.1});if(matchMedia('(prefers-reduced-motion:reduce)').matches)move(to);else{animation={from:{...camera},to,start:performance.now()};requestDraw();}},
    reset(){move({...initialSkyCamera});},
    destroy(){animation=null;if(frame)cancelAnimationFrame(frame);observer.disconnect();lifetime.abort();}
  };
}
