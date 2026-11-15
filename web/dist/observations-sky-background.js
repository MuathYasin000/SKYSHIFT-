import {displayLimits} from './observations-render.js';

const survey = 'https://stpubdata.s3.us-east-1.amazonaws.com/mast/skybackgrounds/DSSColor';

function displayFits(frame, settings) {
  const {SCI,VALID,shape:[height,width]} = frame.arraysDecoded;
  const {background,lower,upper} = displayLimits(frame, settings);
  const wcs = Object.fromEntries(['CRPIX1','CRPIX2','CRVAL1','CRVAL2','CDELT1','CDELT2'].map(key=>[key,frame.wcs[key]]));
  const header = {SIMPLE:true, BITPIX:-32, NAXIS:2, NAXIS1:width, NAXIS2:height,
    CTYPE1:'RA---TAN', CTYPE2:'DEC--TAN', CUNIT1:'deg', CUNIT2:'deg', RADESYS:'ICRS', ...wcs};
  const cards = Object.entries(header).map(([key,value])=>{
    const field=typeof value==='string' ? "'"+value+"'" : value===true?'T':String(value);
    return (key.padEnd(8)+'= '+field.padStart(20)).padEnd(80);
  });
  cards.push('END'.padEnd(80));
  const text=cards.join('');
  const padding=Math.ceil(text.length/2880)*2880;
  const bytes=new Uint8Array(padding+Math.ceil(SCI.length*4/2880)*2880);
  bytes.set(new TextEncoder().encode(text.padEnd(padding)));
  const data=new DataView(bytes.buffer,padding);
  for(let i=0;i<SCI.length;i++){
    const intensity=Math.max(0,Math.min(1,(SCI[i]-background-lower)/(upper-lower)));
    const display=VALID[i] ? Math.asinh(intensity/.06)/Math.asinh(1/.06) : NaN;
    data.setFloat32(i*4,display,false);
  }
  return new Blob([bytes],{type:'application/fits'});
}

// The bundled Aladin Lite options hide the chrome inside the modal. The logo
// belongs to Aladin and stays visible.
const controls = {
  showZoomControl:false, showLayersControl:false, showFullscreenControl:false,
  showCooGridControl:false, showSettingsControl:false, showShareControl:false,
  showFrame:false, showFov:false, showCooLocation:false, showProjectionControl:false,
  showStatusBar:false, showSimbadPointerControl:false, showColorPickerControl:false,
  showSelectionModeControl:false, showContextMenu:false, showCatalog:false,
};
const requestLimit=10000;

export function attachSkyBackground({panel, host, status, opacity, output, retry}) {
  let A, view, layer, active, painted, starting, busy, grid;
  let surveyVersion=0, surveyFailed=false;
  const alpha=()=>Number(opacity.value)/100;

  function feedback(state,text){
    status.dataset.state=state;
    status.textContent=text;
    retry.hidden=state!=='error';
  }

  opacity.oninput=()=>{
    output.value=opacity.value+'%';
    layer?.setOpacity(alpha());
  };

  async function start(){
    if(starting)return;
    const request=new AbortController();
    starting=request;
    const deadline=performance.now()+requestLimit;
    const timeout=AbortSignal.timeout(requestLimit);
    const signal=AbortSignal.any([request.signal,timeout]);
    feedback('loading','Loading Digitized Sky Survey…');
    try{
      const probe=await fetch(survey+'/Norder3/Allsky.jpg',{mode:'cors',signal});
      if(!probe.ok)throw Error('DSS tiles unavailable');
      await probe.blob();
      if(!A){
        const init=import('./vendor/aladin-lite/aladin.js').then(async module=>{
          await module.default.init;
          return module.default;
        });
        const canceled=new Promise((_,reject)=>{
          signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
        });
        A=await Promise.race([init,canceled]);
      }
      signal.throwIfAborted();
      const current=++surveyVersion;
      surveyFailed=false;
      const background=A.HiPS(survey,{
        name:'DSS Color at MAST',imgFormat:'jpeg',
        errorCallback:()=>{
          if(current!==surveyVersion)return;
          surveyFailed=true;
          feedback('error','Could not load the DSS background.');
        },
      });
      if(view)view.setBaseImageLayer(background);
      else view=A.aladin(host,{...controls,survey:background,projection:'TAN',cooFrame:'ICRS',fov:.15,log:false});
      painted=null;
      if(!surveyFailed)paint(deadline);
    }catch{
      if(!request.signal.aborted)feedback('error',timeout.aborted?'Sky background timed out after 10 seconds.':'Could not load the DSS background.');
    }finally{
      if(starting===request)starting=null;
    }
  }

  function paint(deadline=performance.now()+requestLimit){
    if(!view||!panel.open||!active||active===painted||busy||surveyFailed)return;
    const item=active;
    const frame=item.frame;
    if(grid!==frame.wcs){
      grid=frame.wcs;
      view.gotoRaDec(grid.CRVAL1,grid.CRVAL2);
      view.setFoV(frame.arraysDecoded.shape[1]*Math.abs(grid.CDELT1)*1.12);
    }
    const url=URL.createObjectURL(displayFits(frame,item.settings));
    let finished=false, nextLayer;
    busy=true;
    feedback('loading','Loading the SPHEREx overlay…');
    const complete=(ok,timedOut=false)=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      busy=false;
      painted=item;
      if(ok){
        layer=nextLayer;
        layer.setOpacity(alpha());
      }
      if(!surveyFailed){
        if(ok)feedback('ready','SPHEREx image over DSS Color. Dark and transparent areas include masked pixels.');
        else feedback('error',timedOut?'SPHEREx overlay timed out after 10 seconds.':'Could not display the SPHEREx overlay.');
      }
      if(active!==item)paint();
    };
    const timer=setTimeout(()=>complete(false,true),Math.max(0,deadline-performance.now()));
    try{
      nextLayer=A.image(url,{name:frame.label??'SPHEREx observation',opacity:alpha(),
        minCut:0,maxCut:1,colormap:'grayscale',
        successCallback:()=>complete(true),errorCallback:()=>complete(false)});
      view.setOverlayImageLayer(nextLayer,'spherex');
    }catch{complete(false);}
  }

  retry.onclick=()=>{
    if(!view||surveyFailed){ start(); return; }
    painted=null;
    paint();
  };
  panel.addEventListener('toggle',()=>{
    if(panel.open){
      if(view)paint();
      else start();
    }else if(starting){
      starting.abort();
      starting=null;
    }
  });

  return (frame,settings)=>{
    if(!frame)return;
    if(active?.frame!==frame||active.revision!==settings.revision)active={frame,settings:{...settings},revision:settings.revision};
    if(panel.open&&view)paint();
  };
}
