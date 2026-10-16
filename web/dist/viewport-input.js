const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function screenPixel(point,view,geometry){return {x:(point.x-geometry.width/2)/geometry.scale+view.center_x,y:-(point.y-geometry.height/2)/geometry.scale+view.center_y};}
export function moveViewport(view,geometry,bounds,from,to,factor=1){
  const anchor=screenPixel(from,view,geometry),zoom=clamp(view.zoom*factor,1,20),scale=geometry.scale*zoom/view.zoom;
  return {zoom,center_x:clamp(anchor.x-(to.x-geometry.width/2)/scale,0,bounds.width-1),center_y:clamp(anchor.y+(to.y-geometry.height/2)/scale,0,bounds.height-1)};
}
// Pointer Events provide mouse, pen and true two-finger gestures without a rendering engine.
export function attachViewportInput(canvas,{getView,getGeometry,getBounds,onView,onInspect=()=>{},onTap=()=>{}}){
  const points=new Map();let gesture=false,origin=null,moved=false,pendingTap=null;
  const local=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  function inspect(point,announce=false,pin=false){const view=getView();if(view)onInspect(screenPixel(point,view,getGeometry()),{announce,pin});}
  function reset(keepTap=false){points.clear();origin=null;moved=false;gesture=false;if(!keepTap)pendingTap=null;}
  canvas.addEventListener('pointerdown',e=>{
    if(!getView()||(e.pointerType==='mouse'&&e.button!==0))return;
    const point=local(e);pendingTap=null;points.set(e.pointerId,point);canvas.setPointerCapture(e.pointerId);
    if(points.size===1){origin=point;moved=false;gesture=false;}else{gesture=true;moved=true;}
  });
  canvas.addEventListener('pointermove',e=>{
    const view=getView();if(!view)return;
    const point=local(e);
    if(!points.has(e.pointerId)){if(e.pointerType!=='touch')inspect(point);return;}
    const before=[...points.values()];points.set(e.pointerId,point);const after=[...points.values()];
    if(origin&&Math.hypot(point.x-origin.x,point.y-origin.y)>5)moved=true;
    if(after.length===1)onView(moveViewport(view,getGeometry(),getBounds(),before[0],after[0]));
    else if(after.length===2){
      const mid=p=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
      const distance=p=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);
      const a=distance(before),b=distance(after);if(a>0&&b>0)onView(moveViewport(view,getGeometry(),getBounds(),mid(before),mid(after),b/a));
    }
    if(e.pointerType!=='touch')inspect(point);
  });
  canvas.addEventListener('pointerup',e=>{
    const wasActive=points.has(e.pointerId);points.delete(e.pointerId);
    if(wasActive&&!gesture&&!moved&&getView())pendingTap=screenPixel(local(e),getView(),getGeometry());
    if(!points.size)reset(true);
  });
  canvas.addEventListener('click',e=>{
    // Activate on click, after pointerup: opening a dialog earlier can retarget the touch's compatibility click to a dialog button.
    const view=getView(),point=pendingTap||(e.detail===0&&view?{x:view.center_x,y:view.center_y}:null);pendingTap=null;
    if(point){onInspect(point,{announce:true,pin:true});onTap(point);}
  });
  canvas.addEventListener('pointercancel',()=>{pendingTap=null;reset();});
  canvas.addEventListener('lostpointercapture',e=>{points.delete(e.pointerId);if(!points.size)reset(true);});
  window.addEventListener('blur',()=>reset());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  canvas.addEventListener('wheel',e=>{const view=getView();if(!view)return;e.preventDefault();const g=getGeometry(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?g.height:1);onView(moveViewport(view,g,getBounds(),local(e),local(e),Math.exp(-clamp(delta,-120,120)*.0018)));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    const view=getView();if(!view)return;const bounds=getBounds(),step=e.shiftKey?5:1;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();const next={...view,center_x:clamp(view.center_x+({'ArrowLeft':-step,'ArrowRight':step}[e.key]||0),0,bounds.width-1),center_y:clamp(view.center_y+({'ArrowUp':step,'ArrowDown':-step}[e.key]||0),0,bounds.height-1)};
      onView(next);onInspect({x:next.center_x,y:next.center_y},{announce:true,pin:true});
    }else if(['+','=','-'].includes(e.key)){e.preventDefault();onView({...view,zoom:clamp(view.zoom*(e.key==='-'?1/1.25:1.25),1,20)});}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();const point={x:view.center_x,y:view.center_y};onInspect(point,{announce:true,pin:true});onTap(point);}
    else if(e.key==='Home'||e.key.toLowerCase()==='r'){e.preventDefault();onView({zoom:1,center_x:(bounds.width-1)/2,center_y:(bounds.height-1)/2});}
    else if(e.key==='Escape'){onInspect(null,{announce:true,pin:false});}
  });
  return {reset};
}
