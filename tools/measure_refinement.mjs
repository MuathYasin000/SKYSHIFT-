import {createEvidenceDirectory,evidenceFile,writeEvidenceFile} from './evidence-output.mjs';
const evidenceRun=await createEvidenceDirectory('measure_refinement',process.env.SKYSHIFT_EVIDENCE_OUTPUT);
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],phase=process.argv[3]||'before';
const {default:lighthouse}=await import(pathToFileURL(path.join(root,'core/index.js')));
const {launch}=await import(pathToFileURL(path.join(root,'../chrome-launcher/dist/index.js')));
const chrome=await launch({chromePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeFlags:['--headless=new']});
const results=[];
try{for(const [name,route]of [['home','/'],['compare','/compare.html']]){
 const {lhr}=await lighthouse('http://localhost:3000'+route,{port:chrome.port,onlyCategories:['performance','accessibility'],logLevel:'error'});
 const metrics={page:name,performance:lhr.categories.performance.score*100,accessibility:lhr.categories.accessibility.score*100,lcp_ms:lhr.audits['largest-contentful-paint'].numericValue,tbt_ms:lhr.audits['total-blocking-time'].numericValue,cls:lhr.audits['cumulative-layout-shift'].numericValue,version:lhr.lighthouseVersion,fetch_time:lhr.fetchTime};
 results.push(metrics);console.log(metrics);await writeEvidenceFile(evidenceFile(evidenceRun,`tmp/refinement/${phase}/lighthouse-${name}.json`),JSON.stringify(lhr)+'\n');
}await writeEvidenceFile(evidenceFile(evidenceRun,`tmp/refinement/${phase}/performance.json`),JSON.stringify({phase,scope:'Local Lighthouse mobile simulated throttling; hardware/frame-rate and field performance are not certified.',results},null,2)+'\n');}finally{await chrome.kill();}
