"""One-time, idempotent migration of the existing browser comparison controller."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'web/dist/app.js'
text=path.read_text(encoding='utf-8')
if "from './visualization.js'" in text: raise SystemExit('Comparison controller already upgraded')
text=text.replace("import {openComparison}","import {navigation} from './site.js';\nimport {defaultVisualization,validateVisualization,displayLevel,paletteRGB} from './visualization.js';\n\nimport {openComparison}")
text=text.replace('const $=id=>', 'navigation();\nconst $=id=>')  # site.js initializes nav already; remove duplicate below
text=text.replace('navigation();\nconst $=','const $=')
text=text.replace('dirty:false};','dirty:false,visual:{...defaultVisualization}};')
text=text.replace('display:state.display,annotations:state.annotations','display:state.display,visual:state.visual,annotations:state.annotations')
text=text.replace("const v=intensity(data[i],state.display);pixels.data.set([v,v,v,255],k);","const v=displayLevel(data[i],state.display,state.visual);pixels.data.set([...paletteRGB(v,state.visual.palette),255],k);")
text=text.replace('ctx.imageSmoothingEnabled=false;ctx.drawImage(offscreens[epoch],-g.cx-.5,-g.cy-.5);ctx.restore();', '''ctx.imageSmoothingEnabled=state.visual.interpolation==='smooth';ctx.imageSmoothingQuality='high';ctx.drawImage(offscreens[epoch],-g.cx-.5,-g.cy-.5);
  if(state.visual.wipe&&canvas.id==='canvas-a'){const boundary=g.cx+(state.visual.wipe_position/100-.5)*g.width/g.scale;ctx.save();ctx.beginPath();ctx.rect(boundary,-10000,20000,20000);ctx.clip();ctx.drawImage(offscreens.B,-g.cx-.5,-g.cy-.5);ctx.restore();}
  const [mh,mw]=state.manifest.processing.shape;ctx.fillStyle='#243642';for(let y=0;y<mh;y++)for(let x=0;x<mw;x++)if(!state.arrays.COMMON[y*mw+x])ctx.fillRect(x-g.cx-.5,y-g.cy-.5,1,1);ctx.restore();
  if(state.visual.wipe&&canvas.id==='canvas-a'){const split=g.width*state.visual.wipe_position/100;ctx.strokeStyle='#dce8ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(split,0);ctx.lineTo(split,g.height);ctx.stroke();ctx.fillStyle='#e3ecff';ctx.font='12px Consolas,monospace';ctx.fillText('A',12,20);ctx.fillText('B',g.width-65,20);}''')
text=text.replace('function setMode(mode){stopBlink();',"function setMode(mode,keepWipe=false){stopBlink();if(!keepWipe)state.visual.wipe=false;$('wipe-controls').hidden=!state.visual.wipe;$('overlay-mode').setAttribute('aria-pressed',String(state.visual.wipe));")
text=text.replace("function setEpoch(epoch){state.display.selected_epoch=epoch;", "function setEpoch(epoch){if(state.visual.wipe)epoch='A';state.display.selected_epoch=epoch;")
text=text.replace("if(inside){const sky=", "if(inside){const sky=")
text=text.replace("${valid?'':' · outside common support'}`;", "${valid?' · A '+state.arrays.SCI_A[iy*w+ix].toPrecision(6)+' / B '+state.arrays.SCI_B[iy*w+ix].toPrecision(6)+' MJy/sr':' · outside common support'}`;")
text=text.replace("function reflectDisplay(){$('stretch')", "function reflectDisplay(){for(const key of ['stretch','palette','interpolation'])$('visual-'+key).value=state.visual[key];$('wipe').value=state.visual.wipe_position;$('stretch')")
text=text.replace("state.display=validateDisplay({...state.display,vmin:Number($('vmin').value),vmax:Number($('vmax').value),stretch:$('stretch').value},state.manifest);persist();renderScience();", "state.display=validateDisplay({...state.display,vmin:Number($('vmin').value),vmax:Number($('vmax').value),stretch:$('stretch').value},state.manifest);state.visual.stretch=state.display.stretch;reflectDisplay();persist();renderScience();")
text=text.replace("stretch:state.manifest.display.stretch};reflectDisplay();", "stretch:state.manifest.display.stretch};state.visual={...defaultVisualization,wipe:state.visual.wipe,wipe_position:state.visual.wipe_position};reflectDisplay();")
text=text.replace("ctx.imageSmoothingEnabled=false;ctx.drawImage(offscreens[epoch],-state.display.center_x-.5,-state.display.center_y-.5);ctx.restore();", "ctx.imageSmoothingEnabled=state.visual.interpolation==='smooth';ctx.drawImage(offscreens[epoch],-state.display.center_x-.5,-state.display.center_y-.5);ctx.fillStyle='#243642';for(let yy=0;yy<gh;yy++)for(let xx=0;xx<gw;xx++)if(!state.arrays.COMMON[yy*gw+xx])ctx.fillRect(xx-state.display.center_x-.5,yy-state.display.center_y-.5,1,1);ctx.restore();")
text=text.replace('${state.display.stretch} · limits','${state.visual.stretch}/${state.visual.palette}/${state.visual.interpolation} · limits')
text=text.replace("ctx.fillText('Exact source identities, wavelength context, masks, and settings are in manifest.json.',28,648);", "ctx.fillText(`Reference A/B panels · active view: ${state.visual.wipe?'wipe '+state.visual.wipe_position+'%':state.display.view_mode} · visualization.json preserves display extensions.`,28,648);")
text=text.replace("'manifest.json':strToU8", "'visualization.json':strToU8(JSON.stringify(validateVisualization(state.visual),null,2)), 'manifest.json':strToU8")
text=text.replace('Notes are user observations, not confirmed discoveries.','Display extensions (log, palette, interpolation, wipe) are in visualization.json and restored by this browser; Python reconstructs scientific arrays and core manifest settings. Notes are user observations, not confirmed discoveries.')
text=text.replace('state.display=saved.display;state.annotations=', 'state.display=saved.display;state.visual=validateVisualization(saved.visualization??defaultVisualization);state.annotations=')
text=text.replace('setMode(saved.display.view_mode);','setMode(saved.display.view_mode,state.visual.wipe);')
text=text.replace('state.display=d;state.annotations=saved.annotations;', 'state.display=d;state.visual=validateVisualization(saved.visual??defaultVisualization);state.annotations=saved.annotations;')
text=text.replace('setMode(state.display.view_mode);renderScience();','setMode(state.display.view_mode,state.visual.wipe);renderScience();')
text=text.replace('initialize();', '''for(const key of ['stretch','palette','interpolation'])$('visual-'+key).addEventListener('change',event=>{state.visual=validateVisualization({...state.visual,[key]:event.target.value});if(key==='stretch'&&state.visual.stretch!=='log')state.display.stretch=state.visual.stretch;reflectDisplay();persist();renderScience();});
$('overlay-mode').addEventListener('click',()=>{if(!state.manifest)return;const enabled=!state.visual.wipe;state.visual.wipe=enabled;state.display.selected_epoch='A';setMode(enabled?'single':'side_by_side',enabled);$('single-controls').hidden=enabled;drawAll();persist();});
$('wipe').addEventListener('input',event=>{state.visual=validateVisualization({...state.visual,wipe_position:Number(event.target.value)});drawAll();persist();});
initialize();''')
# Entering a wipe restoration hides epoch switching; manual epoch selection exits wipe via setMode.
text=text.replace("$('single-controls').hidden=mode!=='single';", "$('single-controls').hidden=mode!=='single'||state.visual.wipe;")
path.write_text(text,encoding='utf-8')
