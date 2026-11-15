import test from 'node:test';
import assert from 'node:assert/strict';
import {pageName,isPlainLinkClick,navigationRoute} from '../dist/navigation-links.js';
import {spectralScreenCopy} from '../dist/spectral-screen-copy.js';
test('pretty and HTML URLs identify the same route including directory-hosted home',()=>{
 for(const p of ['/','/index','/index.html','/project/','/project/index.html']){
   assert.equal(pageName(p),'index');
 }
 for(const ext of ['','.html','/'])for(const [file,route]of [['compare','compare'],['explore','observations'],['discover','discover'],['methodology','methodology']])assert.equal(navigationRoute('/'+file+ext,''),route);
 assert.equal(navigationRoute('/','#observations/m101'),'observations');
});
test('new tabs, downloads and modified clicks retain browser behavior',()=>{
 const e={button:0},anchor={hasAttribute:()=>false};assert.equal(isPlainLinkClick(e,anchor),true);
 for(const key of ['ctrlKey','metaKey','shiftKey','altKey','defaultPrevented'])assert.equal(isPlainLinkClick({...e,[key]:true},anchor),false);
 for(const button of [1,2])assert.equal(isPlainLinkClick({button},anchor),false);
 for(const attr of ['target','download'])assert.equal(isPlainLinkClick(e,{hasAttribute:n=>n===attr}),false);
});
test('spectral wording uses supplied measurements and discloses the provisional threshold',()=>{
 const check={code:'local_spectral_screen',measurements:{max_separation_bandwidths:.2466221844729019,threshold:.25}};
 assert.equal(spectralScreenCopy(check),'Maximum wavelength separation 0.247 of the bandwidth, threshold 0.25 (provisional engineering choice, not a NASA standard).');
 assert.match(spectralScreenCopy({...check,measurements:{max_separation_bandwidths:.1,threshold:.2}}),/0.100.*0.2/);
 assert.equal(spectralScreenCopy({code:'local_spectral_screen'}),null);
});
