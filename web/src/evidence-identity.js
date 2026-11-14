// Object key order is irrelevant; array order and recorded values must match exactly.
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
export function equalEvidence(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
