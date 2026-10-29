import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('Authored user-facing modules retain valid UTF-8 symbols after Windows edits',async()=>{
 const root=new URL('../src/',import.meta.url);
 for(const name of await fs.readdir(root)) {
  if(!/\.(js|html)$/.test(name))continue;
  const bytes=await fs.readFile(new URL(name,root));
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  assert.doesNotMatch(text,/(?:\u00e2[\u20ac\u2020\u2014]|\u00c2[\u00b7\u00b5]|\ufffd)/,name);
 }
});
