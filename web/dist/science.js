export function decodeArray(entry) {
  if (!entry || !['float32','uint8'].includes(entry.dtype) || entry.shape.length!==2) throw Error('Unsupported array encoding');
  const size=entry.shape[0]*entry.shape[1];
  if(!Number.isInteger(size)||size<1||size>1000000)throw Error('Array exceeds supported dimensions');
  const raw=Uint8Array.from(atob(entry.data),c=>c.charCodeAt(0));
  if(raw.byteLength!==size*(entry.dtype==='float32'?4:1))throw Error('Array size does not match its geometry');
  // Explicit little endian decoding works on every browser architecture.
  if(entry.dtype==='uint8')return raw;
  const view=new DataView(raw.buffer);return Float32Array.from({length:size},(_,i)=>view.getFloat32(i*4,true));
}

export function pixelToSky(x,y,wcs) {
  const rad=Math.PI/180;
  const xi=(x+1-wcs.CRPIX1)*wcs.CDELT1*rad,eta=(y+1-wcs.CRPIX2)*wcs.CDELT2*rad;
  const ra0=wcs.CRVAL1*rad,dec0=wcs.CRVAL2*rad,den=Math.cos(dec0)-eta*Math.sin(dec0);
  const ra=ra0+Math.atan2(xi,den),dec=Math.atan2(Math.sin(dec0)+eta*Math.cos(dec0),Math.hypot(den,xi));
  return {ra_deg:((ra/rad)%360+360)%360,dec_deg:dec/rad};
}

export function skyToPixel(ra,dec,wcs) {
  const rad=Math.PI/180;const a=ra*rad,d=dec*rad,a0=wcs.CRVAL1*rad,d0=wcs.CRVAL2*rad;
  let da=a-a0;da=Math.atan2(Math.sin(da),Math.cos(da));
  const den=Math.sin(d)*Math.sin(d0)+Math.cos(d)*Math.cos(d0)*Math.cos(da);
  if(den<=0)throw Error('Coordinate is outside the supported tangent plane');
  const xi=Math.cos(d)*Math.sin(da)/den,eta=(Math.sin(d)*Math.cos(d0)-Math.cos(d)*Math.sin(d0)*Math.cos(da))/den;
  return {x:xi/rad/wcs.CDELT1+wcs.CRPIX1-1,y:eta/rad/wcs.CDELT2+wcs.CRPIX2-1};
}

export function validateAnnotation(note,manifest,common) {
  if(!note||note.pair_id!==manifest.pair_id||typeof note.note!=='string'||note.note.length>2000||typeof note.annotation_id!=='string')throw Error('Annotation does not match this comparison');
  const categories=['uncertain','possible_position_difference','possible_brightness_difference','quality_issue'];
  if(!categories.includes(note.category)||note.frame!=='icrs'||!Number.isFinite(note.ra_deg)||!Number.isFinite(note.dec_deg)||note.ra_deg<0||note.ra_deg>=360||Math.abs(note.dec_deg)>90||typeof note.created_at!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(note.created_at)||!Number.isFinite(Date.parse(note.created_at)))throw Error('Invalid annotation values');
  const {x,y}=skyToPixel(note.ra_deg,note.dec_deg,manifest.processing.output_wcs);
  const [h,w]=manifest.processing.shape,ix=Math.round(x),iy=Math.round(y);
  if(ix<0||iy<0||ix>=w||iy>=h||!common[iy*w+ix])throw Error('Choose a position inside the common usable area');
  return {x,y};
}

export function validateDisplay(input,manifest) {
  const d={...manifest.display,...input};
  if(!Number.isFinite(d.vmin)||!Number.isFinite(d.vmax)||d.vmax<=d.vmin||!['linear','asinh'].includes(d.stretch)||!Number.isFinite(d.zoom)||!(d.zoom>=1&&d.zoom<=20)||!Number.isFinite(d.asinh_a)||!(d.asinh_a>0&&d.asinh_a<=1))throw Error('Invalid display settings');
  const [h,w]=manifest.processing.shape;
  d.center_x=d.center_x??(w-1)/2;d.center_y=d.center_y??(h-1)/2;
  if(!Number.isFinite(d.center_x)||!Number.isFinite(d.center_y)||d.center_x<-.5||d.center_x>=w-.5||d.center_y<-.5||d.center_y>=h-.5)throw Error('Viewport center is outside this field');
  if(!['side_by_side','single'].includes(d.view_mode)||!['A','B'].includes(d.selected_epoch))throw Error('Invalid comparison mode');
  d.blink_interval_ms=1500;return d;
}

export async function sha256(bytes) {
  const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',view)),b=>b.toString(16).padStart(2,'0')).join('');
}

export function intensity(value,display) {
  let x=Math.max(0,Math.min(1,(value-display.vmin)/(display.vmax-display.vmin)));
  if(display.stretch==='asinh')x=Math.asinh(x/display.asinh_a)/Math.asinh(1/display.asinh_a);
  return Math.round(x*255);
}
