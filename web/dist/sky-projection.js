// Orthographic ICRS locator. These are field centres, never footprints or measured survey coverage.
const rad=Math.PI/180;
export const initialSkyCamera={ra:160,dec:45,zoom:1};
export function normalizeSkyCamera(camera){
  if(![camera.ra,camera.dec,camera.zoom].every(Number.isFinite))throw Error('Invalid sky camera');
  return {ra:((camera.ra%360)+360)%360,dec:Math.max(-89.9,Math.min(89.9,camera.dec)),zoom:Math.max(1,Math.min(3,camera.zoom))};
}
export function projectSky(ra,dec,camera){
  const a=(ra-camera.ra)*rad,d=dec*rad,d0=camera.dec*rad;
  return {x:-Math.cos(d)*Math.sin(a),y:-(Math.cos(d0)*Math.sin(d)-Math.sin(d0)*Math.cos(d)*Math.cos(a)),z:Math.sin(d0)*Math.sin(d)+Math.cos(d0)*Math.cos(d)*Math.cos(a)};
}
export function interpolateSkyCamera(from,to,t){
  const delta=((to.ra-from.ra+540)%360)-180;
  return normalizeSkyCamera({ra:from.ra+delta*t,dec:from.dec+(to.dec-from.dec)*t,zoom:from.zoom+(to.zoom-from.zoom)*t});
}
