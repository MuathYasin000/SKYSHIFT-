// HTTP + real-data evidence integration control. Does not claim a browser test.
import fs from 'node:fs/promises';
import path from 'node:path';
import {sha256,decodeArray,pixelToSky,validateDisplay} from '../web/dist/science.js';
import {openComparison} from '../web/dist/packets.js';
import {defaultVisualization} from '../web/dist/visualization.js';
import {zipSync,strToU8} from '../web/dist/vendor/fflate.js';
const base=process.argv[2]||'http://localhost:3000/';
const output=process.argv[3]||'tmp/local-evidence-control.zip';
async function get(url,hash){const r=await fetch(new URL(url,base));if(!r.ok)throw Error('HTTP '+r.status+' '+url);const b=new Uint8Array(await r.arrayBuffer());if(hash&&await sha256(b)!==hash)throw Error('HTTP scientific hash mismatch '+url);return b;}
const catalog=JSON.parse(new TextDecoder().decode(await get('./data/catalog.json')));
const bundle=JSON.parse(new TextDecoder().decode(await get(catalog.bundle_url,catalog.bundle_sha256)));
const m=structuredClone(bundle.manifest),common=decodeArray(bundle.arrays.COMMON),[h,w]=m.processing.shape;
const i=common.findIndex((v,i)=>v&&i%w>3&&i%w<w-3&&Math.floor(i/w)>3);
const sky=pixelToSky(i%w,Math.floor(i/w),m.processing.output_wcs);
m.annotations=[{annotation_id:'local-qa-control-0.3',pair_id:m.pair_id,...sky,frame:'icrs',category:'quality_issue',note:'AUTOMATED LOCAL QA CONTROL. No astronomical finding asserted.',created_at:new Date().toISOString()}];
m.display=validateDisplay({...m.display,zoom:2,selected_epoch:'B',view_mode:'single'},m);
const visual={...defaultVisualization,stretch:'log',palette:'ice',interpolation:'nearest',wipe:true,wipe_position:35};
const payload={'manifest.json':strToU8(JSON.stringify(m)),'prepared/pair.fits':await get(bundle.prepared_fits_url,m.prepared_files[0].sha256),'visualization.json':strToU8(JSON.stringify(visual)),'packet.json':strToU8(JSON.stringify({mode:'references',scientific_approval:'PENDING'})),'annotations.json':strToU8(JSON.stringify(m.annotations))};
payload['hashes.json']=strToU8(JSON.stringify(Object.fromEntries(await Promise.all(Object.entries(payload).map(async([name,data])=>[name,await sha256(data)])))));
const bytes=zipSync(payload,{level:6}),saved=await openComparison(bytes,m,common);
if(saved.annotations[0].note!==m.annotations[0].note||saved.visualization.palette!=='ice'||saved.display.zoom!==2)throw Error('Evidence roundtrip failed');
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,bytes);
console.log(JSON.stringify({http_base:base,pair_id:m.pair_id,dataset_kind:m.dataset_kind,original_science_unchanged:true,annotation_control:'QA only',saved_visualization:saved.visualization,export_sha256:await sha256(bytes),export_bytes:bytes.length,output,scientific_approval:'PENDING',browser_test:false},null,2));
