// Runs in the head before first paint. No network or 3D dependencies.
(() => {
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const home=()=>['','#home'].includes(location.hash);
  if(!home())return;
  root.dataset.arrival='loading';
  root.dataset.arrivalExperience='true';
  const started=performance.now();
  let active=true,initialized=false,revealing=false,screen,stage,canvas,placeholder,timer,delay,wake,observer,generation=0,animations=[],state='loading',renderedAt=null;
  const wait=ms=>new Promise(resolve=>{wake=resolve;delay=setTimeout(()=>{wake=null;resolve();},ms);});
  const reducedMotion=()=>reduce.matches||document.body.classList.contains('reduced-effects');
  async function waitUntilVisible(){while(active&&document.hidden)await wait(200);}
  const locked=new Map();
  const setState=value=>{state=value;root.dataset.arrival=value;};
  function restoreCanvas(){
    if(placeholder?.isConnected&&canvas){placeholder.replaceWith(canvas);canvas.tabIndex=0;}
    if(stage){stage.hidden=true;stage.style.cssText='';}
  }
  function finish(reason='complete'){
    if(!active)return;
    active=false;state=reason;++generation;clearTimeout(timer);clearTimeout(delay);wake?.();wake=null;
    animations.forEach(a=>a.cancel());animations=[];
    observer?.disconnect();
    restoreCanvas();
    delete root.dataset.arrival;delete root.dataset.arrivalPaused;
    for(const [node,inert] of locked)node.inert=inert;
    locked.clear();
    screen?.removeAttribute('aria-modal');
    if(screen?.contains(document.activeElement))document.getElementById('main')?.focus({preventScroll:true});
    window.dispatchEvent(new Event('skyshift:arrival-end'));
  }
  function fail(message){
    if(!active||!screen)return;
    if(state==='failed')return;
    revealing=false;++generation;clearTimeout(delay);wake?.();wake=null;animations.forEach(a=>a.cancel());animations=[];
    setState('failed');if(stage)stage.style.opacity='0';
    document.getElementById('arrival-title').textContent='Spacecraft unavailable.';
    document.getElementById('arrival-status').textContent=message||'3D could not start. Retry, or enter without it.';
    document.getElementById('arrival-retry').hidden=false;
    document.getElementById('arrival-skip').textContent='Enter without 3D ↗';
    clearTimeout(timer);
  }
  function positionStage(){
    const target=placeholder.getBoundingClientRect(),ratio=target.width/Math.max(1,target.height);
    const landscape=innerHeight<550&&innerWidth>600;
    const top=document.querySelector('.arrival-wordmark').getBoundingClientRect().bottom+8;
    const bottom=document.querySelector('.arrival-copy').getBoundingClientRect().top-42;
    const availableHeight=landscape?innerHeight*.65:Math.max(120,bottom-top);
    const width=Math.min(innerWidth*(landscape?.48:.94),900,availableHeight*ratio),height=width/ratio;
    const y=landscape?Math.max(75,innerHeight*.52-height/2):top+(availableHeight-height)/2;
    stage.style.cssText=`left:${innerWidth*(landscape?.3:.5)-width/2}px;top:${y}px;width:${width}px;height:${height}px;`;
  }
  const animate=async(el,frames,options)=>{
    const a=el.animate(frames,{fill:'forwards',...options});animations.push(a);
    try{await a.finished;}catch{}return active;
  };
  function stopMotionForPreference(){
    if(!active||!revealing||!reducedMotion())return;
    animations.forEach(a=>a.cancel());animations=[];
    if(stage)stage.style.opacity='1';
  }
  async function reveal(){
    if(!active||revealing||!initialized||document.hidden)return;
    revealing=true;const ticket=++generation;renderedAt=performance.now();clearTimeout(timer);
    await wait(Math.max(0,650-(performance.now()-started)));
    if(!active||ticket!==generation)return;
    setState('reveal');
    document.getElementById('arrival-status').textContent='SPHEREx ready · exploring the infrared sky.';
    if(reducedMotion()){
      stage.style.opacity='1';
      await wait(1650);await waitUntilVisible();
      if(active&&ticket===generation)finish();
      return;
    }
    window.skyshiftHero?.arrivalOrbit?.(2200);
    await animate(stage,[{opacity:0,transform:'scale(.86)'},{opacity:1,transform:'scale(1)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
    if(!active||ticket!==generation)return;
    await wait(1650);
    if(!active||ticket!==generation)return;
    await waitUntilVisible();
    if(!active||ticket!==generation)return;
    if(reducedMotion()){
      stage.style.opacity='1';finish();return;
    }
    setState('settling');
    const from=stage.getBoundingClientRect(),to=placeholder.getBoundingClientRect();
    const flight=animate(stage,[{opacity:1,transform:'translate(0,0) scale(1,1)'},{opacity:1,transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`}],{duration:1050,easing:'cubic-bezier(.65,0,.25,1)'});
    animate(screen,[{opacity:1},{opacity:0}],{duration:950,easing:'ease-in-out'});
    await flight;if(active&&ticket===generation)finish();
  }
  function checkReady(){
    const hero=document.querySelector('.hero-observatory');
    if(hero?.dataset.modelState==='failed')fail();
    else if(window.skyshiftHero?.diagnostics().model?.frames>0)reveal();
  }
  function init(){
    if(!active)return;
    try{
      screen=document.getElementById('arrival-screen');stage=document.getElementById('arrival-model-stage');canvas=document.getElementById('hero-model-canvas');
      if(!screen||!stage||!canvas){finish('unavailable');return;}
      window.scrollTo({top:0,behavior:'instant'});
      const stars=document.getElementById('arrival-stars');let seed=71;
      const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
      const fragment=document.createDocumentFragment();
      for(let i=0;i<95;i++){const s=document.createElement('i');s.style.cssText=`--x:${random()*100}%;--y:${random()*100}%;--size:${random()> .88?2:1}px;--alpha:${.25+random()*.65};--delay:${-random()*5}s`;fragment.append(s);}stars.append(fragment);
      placeholder=document.createElement('div');placeholder.className=canvas.className;placeholder.setAttribute('aria-hidden','true');
      canvas.before(placeholder);stage.append(canvas);canvas.tabIndex=-1;stage.hidden=false;positionStage();
      for(const node of document.querySelectorAll('#main,#site-header,.site-footer,.skip-link,#infrared-lens,#site-information')){locked.set(node,node.inert);node.inert=true;}
      document.getElementById('arrival-skip').onclick=()=>finish('skipped');
      document.getElementById('arrival-retry').onclick=()=>location.assign('./index.html?intro=1');
      screen.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();finish('skipped');}
        if(event.key==='Tab'){
          const items=[...screen.querySelectorAll('button:not([hidden]),a[href]')];
          const first=items[0],last=items.at(-1);
          if(event.shiftKey&&(document.activeElement===first||document.activeElement===screen)){event.preventDefault();last.focus();}
          else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===screen)){event.preventDefault();first.focus();}
        }
      });
      initialized=true;screen.focus({preventScroll:true});
      timer=setTimeout(()=>fail('The spacecraft is taking longer to arrive. Retry, or enter without 3D.'),18000);
      observer=new MutationObserver(()=>{if(active)checkReady();});
      observer.observe(document.querySelector('.hero-observatory'),{attributes:true,attributeFilter:['data-model-state']});
      window.dispatchEvent(new Event('skyshift:arrival-start'));checkReady();
    }catch(error){console.warn('Arrival presentation unavailable:',error);finish('unavailable');}
  }
  window.skyshiftArrival=Object.freeze({diagnostics:()=>({state,active,initialized,rendered_at_ms:renderedAt,elapsed_ms:performance.now()-started,same_canvas:canvas===document.getElementById('hero-model-canvas')})});
  window.addEventListener('skyshift:hero-frame',checkReady);
  window.addEventListener('skyshift:hero-failed',()=>fail());
  window.addEventListener('skyshift:hero-import-failed',()=>fail());
  window.addEventListener('hashchange',()=>{if(!home())finish('navigation');});
  window.addEventListener('pagehide',()=>finish('pagehide'));
  window.addEventListener('resize',()=>{if(!active||!initialized)return;positionStage();});
  document.addEventListener('visibilitychange',()=>{
    if(!active)return;
    root.toggleAttribute('data-arrival-paused',document.hidden);
    for(const a of animations)document.hidden?a.pause():a.play();
    if(!document.hidden)checkReady();
  });
  reduce.addEventListener('change',stopMotionForPreference);
  document.addEventListener('skyshift:effects',stopMotionForPreference);
  document.addEventListener('DOMContentLoaded',init,{once:true});
})();
