// Display-only adapter. No changes to scientific masks, arrays, or admission gates.
import {sha256} from './science.js';
import {displayLevel,paletteRGB} from './visualization.js';

const roles={SCI:'<f4',VALID:'|u1',FLAGS:'<u4',VARIANCE:'<f4',WAVE:'<f4',RA:'<f8',DEC:'<f8'};
export async function decodeNative(p) {
  if(p?.schema_version!=='1.0'||p.kind!=='spherex_native_display'||p.usage!=='single_observation_only'||p.temporal_comparison_allowed!==false||p.scientific_approval!=='PENDING'||
    !Array.isArray(p.shape)||p.shape.length!==2||p.shape.some(n=>!Number.isInteger(n)||n<1)||p.shape[0]*p.shape[1]>1000000||
    Object.keys(p.arrays||{}).sort().join()!==Object.keys(roles).sort().join())throw Error('Unsupported native observation identity');
  const result={},n=p.shape[0]*p.shape[1];
  for(const [role,dtype] of Object.entries(roles)) {
    const a=p.arrays[role],size=dtype==='<f8'?8:dtype==='|u1'?1:4;
    if(a.dtype!==dtype||JSON.stringify(a.shape)!==JSON.stringify(p.shape)||!/^[a-f0-9]{64}$/.test(a.sha256)||typeof a.data!=='string'||a.data.length>n*size*2+8)throw Error('Native array geometry differs');
    const bytes=Uint8Array.from(atob(a.data),x=>x.charCodeAt(0));
    if(bytes.length!==n*size||await sha256(bytes)!==a.sha256)throw Error('Native array checksum mismatch');
    const view=new DataView(bytes.buffer);
    result[role]=dtype==='|u1'?bytes:dtype==='<u4'?Uint32Array.from({length:n},(_,i)=>view.getUint32(i*4,true)):
      dtype==='<f8'?Float64Array.from({length:n},(_,i)=>view.getFloat64(i*8,true)):Float32Array.from({length:n},(_,i)=>view.getFloat32(i*4,true));
  }
  for(let i=0;i<n;i++)if(![0,1].includes(result.VALID[i])||result.VALID[i]&&(!Number.isFinite(result.SCI[i])||!Number.isFinite(result.VARIANCE[i])||result.VARIANCE[i]<=0))throw Error('Invalid native support');
  return result;
}
export function nativeRGBA(p,arrays,settings) {
  if(!['percentile','zscale'].includes(settings.limits)||!['linear','asinh','log'].includes(settings.stretch)||!['grayscale','ember','ice'].includes(settings.palette)||!['overlay','excluded'].includes(settings.mask)||!Number.isFinite(settings.contrast)||settings.contrast<.25||settings.contrast>4||!Number.isFinite(settings.asinh_a)||settings.asinh_a<.01||settings.asinh_a>1)throw Error('Invalid native display settings');
  const base=p.diagnostics.display[settings.limits],mid=(base.vmin+base.vmax)/2,half=(base.vmax-base.vmin)/2/settings.contrast;
  const display={vmin:mid-half,vmax:mid+half,asinh_a:settings.asinh_a},rgba=new Uint8ClampedArray(arrays.SCI.length*4);
  for(let i=0;i<arrays.SCI.length;i++) {
    const rgb=arrays.VALID[i]?paletteRGB(displayLevel(arrays.SCI[i],display,settings),settings.palette):settings.mask==='overlay'?[67,23,75]:[24,24,24];
    rgba.set([...rgb,255],i*4);
  }
  return {rgba,display};
}
export function nativePixel(p,a,x,y) {
  const [h,w]=p.shape;
  if(x<0||y<0||x>=w||y>=h)return {reason:'Outside native cutout: no coverage',valid:false};
  const i=y*w+x,flags=Object.entries(p.flag_definitions).filter(([,b])=>(a.FLAGS[i]&(2**b))!==0).map(([n])=>n);
  return {x,y,valid:Boolean(a.VALID[i]),value:a.SCI[i],variance:a.VARIANCE[i],ra_deg:a.RA[i],dec_deg:a.DEC[i],wavelength_um:a.WAVE[i],flags,
    reason:a.VALID[i]?'Usable measurement; noise and unflagged artifacts remain possible':flags.includes('MISSING_DATA')?'Missing data flagged in original FITS':!Number.isFinite(a.SCI[i])?'Nonfinite original science value':'Excluded by conservative quality / variance policy'};
}
