import {MAX_VIEW_RECORD_BYTES,parseExposureRecord} from './exposure-records.js';
const KEY='skyshift.exploration.v1';
// Public source references and viewing settings only; no notes, accounts or network storage.
export function createExplorationMemory(storage=()=>globalThis.localStorage){
  return {
    read(){try{const text=storage().getItem(KEY),record=text?parseExposureRecord(new TextEncoder().encode(text)):null;if(record?.questions)throw Error('Private questions are not stored in exploration history');return {record,error:null};}catch{return {record:null,error:'Local exploration history is unavailable. JSON save and reopen still work.'};}},
    write(record){try{if(record.questions)return false;const bytes=new TextEncoder().encode(JSON.stringify(record));if(bytes.length>MAX_VIEW_RECORD_BYTES)return false;parseExposureRecord(bytes);storage().setItem(KEY,new TextDecoder().decode(bytes));return true;}catch{return false;}}
  };
}
