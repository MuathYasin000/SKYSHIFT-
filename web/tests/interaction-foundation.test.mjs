import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalogue,fetchCatalogue} from '../dist/catalogue.js';
import {moveViewport,screenPixel} from '../dist/viewport-input.js';
import {projectSky,initialSkyCamera,interpolateSkyCamera} from '../dist/sky-projection.js';
import {createExplorationMemory} from '../dist/exploration-memory.js';
const catalogue=JSON.parse(await readFile(new URL('../dist/data/explore-catalog.json',import.meta.url)));

test('actual curated catalogue has valid local links, unique products and honest comparison states',()=>assert.equal(validateCatalogue(catalogue),catalogue));
test('malformed, empty, duplicate, remote, oversized and approval-forging catalogues fail before selection',()=>{
  for(const mutate of [c=>c.fields=[],c=>c.fields.push(c.fields[0]),c=>c.fields[0].ra_deg=360,c=>c.fields[0].dec_deg=91,c=>c.fields[0].comparison_status='approved',c=>c.fields[0].observations[0].url='https://example.com/fake.json',c=>c.fields[0].observations[0].preview='./../private.png',c=>c.fields[0].observations[0].sha256='bad',c=>c.fields[0].observations[0].shape=[10000,10000],c=>c.fields[0].observations[0].time_start_utc='unknown',c=>c.fields[0].observations.push(c.fields[0].observations[0])]){
    const bad=structuredClone(catalogue);mutate(bad);assert.throws(()=>validateCatalogue(bad));
  }
});
test('catalogue HTTP, syntax and timeout errors offer actionable recovery',async()=>{
  await assert.rejects(fetchCatalogue(async()=>({ok:false})),/try again/);
  await assert.rejects(fetchCatalogue(async()=>({ok:true,json:async()=>{throw new SyntaxError();}})),/not valid JSON/);
  await assert.rejects(fetchCatalogue((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))),5),/taking too long/);
});
test('zoom preserves the sky pixel beneath the mouse or pinch midpoint',()=>{
  const view={zoom:2,center_x:80,center_y:70},geometry={width:800,height:600,scale:8},bounds={width:176,height:176},from={x:500,y:220},to={x:540,y:210};
  const before=screenPixel(from,view,geometry),next=moveViewport(view,geometry,bounds,from,to,1.5),after=screenPixel(to,next,{...geometry,scale:12});
  assert.ok(Math.abs(before.x-after.x)<1e-12);assert.ok(Math.abs(before.y-after.y)<1e-12);assert.equal(next.zoom,3);
});
test('drag and zoom stay bounded with image north up and east left',()=>{
  const v={zoom:1,center_x:10,center_y:10},g={width:200,height:200,scale:5},bounds={width:24,height:24};
  const next=moveViewport(v,g,bounds,{x:100,y:100},{x:120,y:120});assert.equal(next.center_x,6);assert.equal(next.center_y,14);
  assert.equal(moveViewport(v,g,bounds,{x:100,y:100},{x:10000,y:-10000},1000).zoom,20);
  const edge=moveViewport(v,g,bounds,{x:100,y:100},{x:-10000,y:10000},.001);assert.equal(edge.zoom,1);assert.equal(edge.center_x,23);assert.equal(edge.center_y,23);
});
test('orthographic locator has correct ICRS orientation, visibility, poles and RA wrap',()=>{
  const camera={ra:0,dec:0,zoom:1},near=projectSky(0,0,camera),far=projectSky(180,0,camera),east=projectSky(45,0,camera),north=projectSky(0,45,camera);
  assert.ok(Math.abs(near.x)<1e-12&&Math.abs(near.y)<1e-12&&near.z===1);assert.ok(far.z<0);assert.ok(east.x<0);assert.ok(north.y<0);
  const a=projectSky(359,20,camera),b=projectSky(-1,20,camera);assert.ok(Math.abs(a.x-b.x)<1e-12);
  for(const f of catalogue.fields){const p=projectSky(f.ra_deg,f.dec_deg,initialSkyCamera);assert.ok(p.z>0,'All available fields must be visible in the reset view');assert.ok(Math.abs(p.x*p.x+p.y*p.y+p.z*p.z-1)<1e-12);}
  assert.equal(interpolateSkyCamera({ra:350,dec:0,zoom:1},{ra:10,dec:0,zoom:1},.5).ra,0);
});
test('curated field positions agree with independently computed Astropy offset-frame geometry',async()=>{
  const reference=JSON.parse(await readFile(new URL('./fixtures/sky-projection-reference.json',import.meta.url)));
  for(const expected of reference.values){const actual=projectSky(expected.ra_deg,expected.dec_deg,initialSkyCamera);for(const key of ['x','y','z'])assert.ok(Math.abs(actual[key]-expected[key])<1e-12,expected.field+' '+key);}
});
test('resume memory handles unavailable storage and a corrupted saved record without throwing',()=>{
  const broken=createExplorationMemory(()=>{throw new Error('blocked');});assert.equal(broken.read().record,null);assert.equal(broken.write({bad:true}),false);
  const corrupted=createExplorationMemory(()=>({getItem:()=>'{bad'}));assert.equal(corrupted.read().record,null);
});
test('resume memory preserves a real compatible view without adding accounts or notes',async()=>{
  const record=JSON.parse(await readFile(new URL('./fixtures/single-view-0.4.json',import.meta.url))),data=new Map(),memory=createExplorationMemory(()=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}));
  assert.equal(memory.write(record),true);assert.deepEqual(memory.read().record,record);assert.equal(data.size,1);assert.equal(Object.hasOwn(memory.read().record,'annotations'),false);
});
