import test from 'node:test';
import assert from 'node:assert/strict';
import {excludedCells,displayPreview} from '../dist/mask-display.js';

test('mask furniture follows only excluded native cells without changing support',()=>{
 const mask=Uint8Array.from([1,0,1,0,1,1]),before=mask.slice();
 assert.deepEqual(excludedCells(mask,[2,3]),[[1,0],[0,1]]);
 assert.deepEqual(mask,before);
 assert.deepEqual(excludedCells(new Uint8Array(6).fill(1),[2,3]),[]);
});
test('display derivatives resolve locally while the source preview identity stays unchanged',()=>{
 const original='./data/explore/m101-preview.png';
 assert.equal(displayPreview(original),'./assets/previews/m101-preview.webp');
 assert.equal(original,'./data/explore/m101-preview.png');
});
