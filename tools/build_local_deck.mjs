import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root='D:/Nasa_SKYSHIFT',work=root+'/tmp/slides-local-0.3';
const modules='C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const req=createRequire(pathToFileURL(modules+'/package.json'));
const {Presentation,PresentationFile}=await import(pathToFileURL(req.resolve('@oai/artifact-tool')).href);
const skill='C:/Users/LOQ/.codex/plugins/cache/openai-primary-runtime/presentations/26.1013.11914/skills/presentations';
const python='C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
process.env.RUNTIME_NODE_MODULES=modules;
await fs.mkdir(work+'/renders',{recursive:true});await fs.mkdir(root+'/output/presentation',{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});p.theme.defaultFont='Arial';
const fg='#F0F5FF',muted='#B5C4DA',blue='#A9C6FF',amber='#E5C28B';
function text(s,t,x,y,w,h,size=28,color=fg,bold=false){const sh=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});sh.text=t;sh.text.style={typeface:'Arial',fontSize:size,color,bold};return sh;}
function slide(title,notes){const s=p.slides.add();s.background.fill='#07101E';text(s,title,64,47,1152,90,44,fg,true);text(s,'SKYSHIFT 0.3 / Project Mercury Team',64,677,600,24,13,muted);text(s,'Scientific approval PENDING',820,677,400,24,13,amber);s.speakerNotes.text=notes;return s;}
async function image(s,file,x,y,w,h,alt){const b=await fs.readFile(root+'/'+file);s.images.add({blob:new Uint8Array(b),contentType:file.endsWith('.jpg')?'image/jpeg':'image/png',position:{left:x,top:y,width:w,height:h},fit:'contain',alt});}
{
const s=slide('', 'Independent local release. Scientific data and source snapshot remain 0.2.0. 17 independently run local Chromium checks passed for this redesigned interface. The Work integrated-browser permission remains unchanged. Official Vela composite: https://science.nasa.gov/photojournal/spherex-vela-molecular-ridge/ . NASA/JPL-Caltech credit. No NASA endorsement.');
text(s,'SKYSHIFT',64,115,800,110,92,fg,true);text(s,'Explore the infrared sky',64,240,1100,65,43,blue);
await image(s,'web/dist/assets/spherex-vela.jpg',64,340,700,300,'Official SPHEREx Vela infrared composite, NASA/JPL-Caltech');
text(s,'Independent local application',800,360,410,100,29,fg,true);text(s,'http://localhost:3000\nstart_skyshift.bat',800,480,410,100,27,blue);
text(s,'Official mission composite / NASA/JPL-Caltech',64,640,720,24,13,muted);
}
{
const s=slide('SPHEREx observations and mission imagery','Source: https://science.nasa.gov/mission/spherex/ . All-sky image: https://www.jpl.nasa.gov/images/pia26600-spherexs-first-all-sky-map/ . Official composite combines May–December 2025 data with heavily reduced spatial resolution, not an interactive SKYSHIFT all-sky data product. NASA/JPL-Caltech.');
await image(s,'web/dist/assets/spherex-all-sky.jpg',64,167,700,410,'Official first SPHEREx all-sky infrared composite');
text(s,'102 spectral channels',800,190,410,70,32,blue,true);text(s,'Infrared light carries information about stars, dust and galaxies.',800,280,410,145,27,muted);text(s,'SKYSHIFT offers three curated fields. Official composites support education.',800,465,410,145,25,muted);
text(s,'Official composite / NASA/JPL-Caltech / resolution reduced for the published map',64,612,1152,32,16,muted);
}
{
const s=slide('Larger contexts for single-exposure exploration','Source: local real SPHEREx QR2 FITS and data/explore-catalog.json. Every product preserves native and prepared dimensions, exact UTC time, detector, pipeline, source URL and hash, full CWAVE/CBAND references and numeric array hashes. M67 and NGC188 wider temporal pairs remain incompatible. No new qualified approval.');
const catalog=JSON.parse(await fs.readFile(root+'/web/dist/data/explore-catalog.json','utf8'));const obs=catalog.fields.find(f=>f.id==='m67').observations[0];
await image(s,'web/dist/'+obs.preview.slice(2),64,180,520,420,'Real prepared single-band M67 context with masked regions shown dark blue');
text(s,'M101, M67 and NGC 188',640,190,560,62,32,blue,true);text(s,'Four real exposures, exact source records and larger inspection contexts.',640,275,560,105,29,muted);text(s,'Asinh, linear and log display\nGrayscale or single-band false color\nSmooth display or pixel inspection',640,420,560,160,27,muted);
text(s,`M67 single exposure / ${obs.time_start_utc.slice(0,10)} UTC / ${obs.shape[1]} x ${obs.shape[0]} prepared pixels`,64,617,1152,30,16,muted);
}
{
const s=slide('A restricted temporal comparison','Source: m101-review-v6.zip. Pair pair-52ad675d929b0740c23b. Exact native-source dates in the scientific manifest. Larger .12 and .06 degree tests failed unchanged wavelength policy. 13 Gaia references give median residual .3117394702 arcsec and p95 2.0072888599 arcsec. Full response equivalence, calibration UUID association and qualified scientific interpretation remain pending.');
await image(s,'docs/evidence/prepared_pair_v2.png',64,170,1152,340,'Actual prepared M101 pair and local spectral diagnostic');
text(s,'24 x 24 pixels at 6.15 arcsec per pixel',64,535,1152,46,32,blue,true);text(s,'7 and 11 December 2025 UTC. 94.44% common support. Scientific review remains pending.',64,595,1152,60,25,muted);
}
{
const s=slide('Authenticity and reproducibility audit','Source: docs/evidence/provenance_audit_0.3.json and docs/provenance_audit_0.3.md. Four independently re-fetched originals/calibration hashes match. Ten arrays match prepared FITS and fresh source reconstruction. Historical public bundle/FITS/full packet match original release. Local HTTP evidence control exports a labeled QA note and presentation extension, reopens with actual packet parser, and reconstructs offline with all ten errors zero. Independent browser verification additionally exercised export/reopen and full-packet download. The browser-created comparison reconstructed all ten arrays offline with zero error.');
text(s,'4 / 4',64,205,450,100,77,blue,true);text(s,'Independently downloaded originals\nand calibration hashes match',64,325,490,110,28,muted);
text(s,'10 / 10',680,205,500,100,77,blue,true);text(s,'Prepared arrays reproduced exactly\nMaximum array error: 0.0',680,325,520,110,28,muted);
text(s,'92 Python tests and 28 JavaScript tests pass',64,520,1152,57,32,fg,true);text(s,'Local HTTP export/reopen and cached offline reconstruction pass. 17 independent local Chromium browser checks pass.',64,600,1152,52,23,amber);
}
{
const s=slide('The locally running exploration workspace','Actual independent Playwright Chromium screenshot at http://localhost:3000. Single-exposure real SPHEREx M101 context, source records and exact UTC dates visible. Screenshot is an engineering demonstration, not a science approval.');
await image(s,'output/browser-0.3/explore-desktop.png',64,158,1152,480,'Actual locally running SPHEREx explorer with real masked scientific data and source facts');
}
{
const s=slide('A saved question can be reopened','Actual local browser QA screenshot. The annotation is explicitly a QA control, not an astronomical finding. Browser export/reopen restores a log display, ice palette, native-pixel sampling and 35 percent wipe. Compact browser-created packet then reconstructs offline with all ten array errors zero. Complete review-packet browser download matches original SHA-256.');
await image(s,'output/browser-0.3/comparison-reopened.png',64,158,1152,480,'Actual reopened browser comparison with a clearly labeled QA note');
}
{
const s=slide('Local execution and remaining acceptance gates','Start using start_skyshift.bat, stop with Ctrl+C or stop_skyshift.bat, restart with the startup script. Python3.11+ suffices to serve the prepared application. Scientific reconstruction uses pinned Python dependencies. All mission assets and curated data are local. Archive acquisition/live queries/external sources need internet. 17 independent local Playwright Chromium checks passed, including desktop/mobile views and browser evidence export/reopen. The Work browser permission remains unchanged. Broader cross-browser/device checks remain open. Internal human technical review, qualified science approval and novice sessions remain pending. Historical 0.2 public deployment is unchanged.');
text(s,'http://localhost:3000',64,200,1152,73,51,blue,true);text(s,'Start: start_skyshift.bat\nStop: Ctrl+C or stop_skyshift.bat\nRestart: run the startup script again',64,310,560,180,29,muted);
text(s,'Remaining gates',690,310,500,50,30,amber,true);text(s,'Broader browser/device testing\nIndependent human technical review\nQualified astronomical assessment\nNovice usability sessions',690,385,530,180,26,muted);
text(s,'Curated viewing works locally. New archive retrieval requires internet access.',64,597,1152,60,25,fg);
}
for(const [i,s]of p.slides.items.entries()){const b=await p.export({slide:s,format:'png',scale:1});await fs.writeFile(work+`/renders/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await b.arrayBuffer()));}
const candidate=work+'/candidate.pptx';await(await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(skill+'/container_tools/artifact_tool_utils.mjs').href);
const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:root+'/output/presentation/SKYSHIFT_Local_Release_0.3_final.pptx',pythonExecutable:python,integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:8,fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:work+'/validation-final.json'});
console.log(JSON.stringify(result));
