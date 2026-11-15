// A saved view references a trusted local product. It never supplies scientific data or a fetch URL.
import {equalEvidence} from './evidence-identity.js';
import {validateVisualization} from './visualization.js';
import {validateExposureQuestions,MAX_EXPOSURE_QUESTIONS} from './exposure-questions.js';

export const MAX_VIEW_RECORD_BYTES=128*1024;
const KEYS=['schema_version','record_kind','field','product_url','product_sha256','observation','region','wcs','native_shape','prepared_shape','processing','array_hashes','visualization','display','viewport','scientific_approval','limitations'];
function exactKeys(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&equalEvidence(Object.keys(value).sort(),[...keys].sort());}
function supportedRecord(record){
  const extended=['1.1','1.2'].includes(record?.schema_version);
  return exactKeys(record,extended?[...KEYS,'questions']:KEYS)&&['1.0','1.1','1.2'].includes(record.schema_version)&&record.record_kind==='single_observation_view'&&record.scientific_approval==='PENDING'&&(!extended||(Array.isArray(record.questions)&&record.questions.length<=MAX_EXPOSURE_QUESTIONS));
}

export function createExposureRecord(field,entry,product,view){
  const record={
    schema_version:'1.0',record_kind:'single_observation_view',field:field.id,
    product_url:entry.url,product_sha256:entry.sha256,observation:product.observation,
    region:product.region,wcs:product.wcs,native_shape:product.native_shape,prepared_shape:product.shape,
    processing:product.processing,array_hashes:Object.fromEntries(Object.entries(product.arrays).map(([key,value])=>[key,value.numeric_sha256])),
    visualization:{...view.visualization},
    display:{...product.display,vmax:product.display.vmin+(product.display.vmax-product.display.vmin)/view.contrast},
    viewport:{...view.viewport},scientific_approval:'PENDING',limitations:product.limitations
  };
  if(view.questions?.length){record.schema_version=view.questions.some(q=>q.category)?'1.2':'1.1';record.questions=view.questions.map(q=>({...q}));}
  return record;
}

export function parseExposureRecord(bytes){
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MAX_VIEW_RECORD_BYTES)throw Error('Saved exposure view must be a JSON file no larger than 128 KB.');
  let record;
  try{record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw Error('This file is not a valid saved exposure view. Choose the JSON downloaded from Explore.');}
  if(!supportedRecord(record))throw Error('Unsupported saved exposure view or scientific approval claim.');
  return record;
}

export function resolveExposureRecord(record,catalog){
  if(!supportedRecord(record))throw Error('Unsupported saved exposure view or scientific approval claim.');
  const field=catalog.fields.find(f=>f.id===record.field);
  const index=field?.observations.findIndex(o=>o.sha256===record.product_sha256&&o.url===record.product_url&&o.observation_id===record.observation?.observation_id);
  if(!field||index<0)throw Error('This view does not match an exposure in the local verified catalogue.');
  return {field,entry:field.observations[index],index};
}

export function validateExposureRecord(record,field,entry,product,arrays){
  resolveExposureRecord(record,{fields:[field]});
  if(record.product_url!==entry.url||record.product_sha256!==entry.sha256)throw Error('Saved view product identity mismatch.');
  const baseline=createExposureRecord(field,entry,product,{visualization:record.visualization,contrast:1,viewport:record.viewport});
  for(const key of ['observation','region','wcs','native_shape','prepared_shape','processing','array_hashes','limitations']){
    if(!equalEvidence(record[key],baseline[key]))throw Error('Saved view scientific metadata differ from the verified exposure: '+key);
  }
  if(!exactKeys(record.display,Object.keys(product.display)))throw Error('Invalid saved brightness settings.');
  for(const key of Object.keys(product.display).filter(k=>k!=='vmax'))if(record.display[key]!==product.display[key])throw Error('Saved brightness settings do not match this exposure.');
  const contrast=(product.display.vmax-product.display.vmin)/(record.display.vmax-product.display.vmin);
  if(!Number.isFinite(record.display.vmax)||!Number.isFinite(contrast)||contrast<.5-1e-12||contrast>2+1e-12)throw Error('Saved contrast is outside the supported range.');
  const v=record.viewport,[h,w]=product.shape;
  if(!exactKeys(v,['zoom','center_x','center_y'])||!Number.isFinite(v.zoom)||v.zoom<1||v.zoom>20||!Number.isFinite(v.center_x)||v.center_x<0||v.center_x>w-1||!Number.isFinite(v.center_y)||v.center_y<0||v.center_y>h-1)throw Error('Saved position or zoom is outside this exposure.');
  const visualization=validateVisualization(record.visualization);
  if(visualization.wipe||visualization.wipe_position!==50)throw Error('A single exposure does not support comparison overlay settings.');
  const questions=['1.1','1.2'].includes(record.schema_version)?validateExposureQuestions(record.questions,product,entry.sha256,arrays?.VALID):[];
  return {visualization,contrast:Math.max(.5,Math.min(2,contrast)),viewport:{...v},questions};
}
