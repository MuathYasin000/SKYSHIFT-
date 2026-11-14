// Versioned presentation-only extension. Scientific arrays and schema are unchanged.
export const defaultVisualization={schema_version:'1.0',stretch:'asinh',palette:'grayscale',interpolation:'smooth',wipe:false,wipe_position:50};
export function validateVisualization(v=defaultVisualization){
  if(!v||Object.keys(v).some(k=>!Object.hasOwn(defaultVisualization,k))||v.schema_version!=='1.0'||!['linear','asinh','log'].includes(v.stretch)||!['grayscale','ember','ice'].includes(v.palette)||!['nearest','smooth'].includes(v.interpolation)||typeof v.wipe!=='boolean'||!Number.isFinite(v.wipe_position)||v.wipe_position<0||v.wipe_position>100)throw Error('Invalid visualization extension');
  return {...v};
}
export function displayLevel(value,display,visual){
  if(!Number.isFinite(value))return 0;
  let x=Math.max(0,Math.min(1,(value-display.vmin)/(display.vmax-display.vmin)));
  if(visual.stretch==='asinh')x=Math.asinh(x/display.asinh_a)/Math.asinh(1/display.asinh_a);
  // Defined even with negative measured flux: normalize/clip for display first.
  if(visual.stretch==='log')x=Math.log1p(100*x)/Math.log1p(100);
  return Math.round(x*255);
}
export function paletteRGB(level,palette){
  const x=Math.max(0,Math.min(255,level))/255;
  if(palette==='ember')return [Math.round(255*Math.min(1,x*1.8)),Math.round(255*Math.pow(x,1.5)),Math.round(255*Math.pow(x,3))];
  if(palette==='ice')return [Math.round(255*Math.pow(x,2.3)),Math.round(255*Math.pow(x,1.25)),Math.round(255*Math.min(1,x*1.5))];
  return [level,level,level];
}
