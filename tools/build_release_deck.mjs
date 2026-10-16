import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const runtimeModules=process.env.RUNTIME_NODE_MODULES??'C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const artifactRequire=createRequire(pathToFileURL(runtimeModules+'/package.json'));
const {Presentation,PresentationFile}=await import(pathToFileURL(artifactRequire.resolve('@oai/artifact-tool')).href);

const root='D:/Nasa_SKYSHIFT',work=root+'/tmp/slides';
const skill='C:/Users/LOQ/.codex/plugins/cache/openai-primary-runtime/presentations/26.1013.11914/skills/presentations';
const python='C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
process.env.RUNTIME_NODE_MODULES='C:/Users/LOQ/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const p=Presentation.create({slideSize:{width:1280,height:720}});
p.theme.defaultFont='Arial';
const assets=new Map();
for(const file of ['docs/evidence/prepared_pair_v2.png','docs/evidence/registration_v2.png','output/screenshots/skyshift-production-final.png','output/screenshots/skyshift-production-note.png'])assets.set(file,new Uint8Array(await fs.readFile(root+'/'+file)));
const colors={bg:'#08131D',fg:'#E7EEF2',muted:'#A2BCC7',accent:'#92DDC9',amber:'#E7C48C'};
function text(slide,value,x,y,w,h,size=25,color=colors.fg,bold=false){const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});s.text=value;s.text.style={typeface:'Arial',fontSize:size,color,bold};return s;}
function rule(slide,x,y,w,color=colors.accent){slide.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:2},fill:color,line:{fill:'none',width:0}});}
function slide(title,subtitle=''){const s=p.slides.add();s.background.fill=colors.bg;text(s,title,64,48,1152,66,40,colors.fg,true);if(subtitle)text(s,subtitle,64,120,1152,58,22,colors.muted);rule(s,64,679,1152,'#29414E');text(s,'SKYSHIFT 0.2.0 / Project Mercury Team',64,690,500,20,12,colors.muted);text(s,'Scientific approval PENDING',770,690,400,20,12,colors.amber);return s;}
function image(s,file,x,y,w,h,alt){s.images.add({blob:assets.get(file),contentType:'image/png',fit:'contain',position:{left:x,top:y,width:w,height:h},alt});}
function notes(s,content){s.speakerNotes.text=content+'\nRelease pair: pair-52ad675d929b0740c23b. Original concept files are preserved. No NASA endorsement.';}

{
const s=slide('');text(s,'SKYSHIFT',64,170,1100,120,94,colors.fg,true);rule(s,68,316,106);
text(s,'Traceable inspection of the infrared sky',64,352,1120,70,36,colors.accent);
text(s,'Real SPHEREx observations. Reproducible comparisons.',64,440,1100,50,25,colors.muted);
text(s,'Public engineering review release',64,520,1100,42,24,colors.amber);
text(s,'skyshift-project-mercury.surebream11.chatgpt.site',64,592,1120,35,21,colors.muted);
notes(s,'Public release verified 16 October 2026. Internal technical review and qualified scientific approval are PENDING. The application supports qualitative inspection; it does not confirm motion, brightness variability or a discovery.');
}
{
const s=slide('One region, two real observations','M101 nucleus / nominal 2.4-arcminute field / SPHEREx QR2 detector 2');
image(s,'docs/evidence/prepared_pair_v2.png',64,196,1152,370,'Two real prepared SPHEREx observations and the local spectral diagnostic');
text(s,'7 December 2025 and 11 December 2025 UTC',64,589,1100,38,24,colors.accent);
text(s,'24 x 24 north-up pixels at 6.15 arcsec per pixel. Common usable support: 94.44%.',64,632,1152,32,18,colors.muted);
notes(s,'Sources: obsids 2025W49_2A_0756_3 and 2025W50_1A_0736_3, pipeline 6.4+psffix1, source hashes and archive URLs in manifest.json. Original arrays are unchanged apart from declared bilinear reprojection and common masking. QR2 DOI https://doi.org/10.26131/IRSA652. Full calibration uses CWAVE/CBAND as required by https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/.');
}
{
const s=slide('Registration measured in native images','13 Gaia references inside the declared 18-arcminute context / no fitted corrective transform');
image(s,'docs/evidence/registration_v2.png',64,188,1152,406,'Measured residual vectors and empirical cumulative registration residuals');
text(s,'Median 0.31 arcsec     95th percentile 2.01 arcsec',64,613,1152,42,27,colors.accent);
notes(s,'Registration-v2 requires six references, three quadrants, hull fraction 0.1, median <=0.25 pixel and p95 <=0.5 pixel. Current sample has 13 references, four quadrants and hull fraction 0.2713769. Three out-of-context references in v1 were excluded by a corrected boundary check; prior results are preserved as superseded evidence. Exact residuals: median 0.3117394702 arcsec, p95 2.0072888599 arcsec. These are empirical sample residuals, not absolute astrometric precision, formal uncertainties, or motion sensitivity. Gaia DR3 DOI https://doi.org/10.1051/0004-6361/202243940.');
}
{
const s=slide('Spectral and image response restrictions','The engineering screens pass. Scientific interpretation still requires qualified review.');
text(s,'Local wavelength diagnostic',64,210,580,45,28,colors.accent,true);
text(s,'Maximum 0.24662 against a declared threshold of 0.25. Full response equality is not established.',64,265,580,125,25,colors.muted);
text(s,'PSF and background differences',64,424,580,45,28,colors.accent,true);
text(s,'Median profile-width ratio 0.983. The p95 absolute deviation is about 25%. Background offset is +0.01393 MJy/sr.',64,480,580,150,25,colors.muted);
rule(s,711,218,2,'#29414E');
text(s,'Permitted now',765,212,420,48,28,colors.fg,true);
text(s,'Inspect structure, geometry, masks and source evidence. Record questions for review.',765,272,420,140,26,colors.muted);
text(s,'Unsupported claims',765,437,420,48,28,colors.amber,true);
text(s,'Confirmed motion, brightness variability, calibrated subtraction or discovery.',765,495,420,140,26,colors.muted);
notes(s,'Source: diagnostics/response.json and screen.json in m101-review-v6.zip. No background subtraction or PSF matching is applied. The official IRSA guide recommends newer ePSFs for QR2, but direct public calibration-to-pipeline UUID association remains pending independent assessment. Background estimates may contain diffuse emission. Unflagged artifacts and blending remain possible.');
}
{
const s=slide('Working browser comparison','Synchronized zoom and pan, shared scale, side-by-side inspection and A/B switching');
image(s,'output/screenshots/skyshift-production-final.png',64,184,1152,448,'Actual deployed SKYSHIFT comparison with real SPHEREx data and pending-review labels');
notes(s,'Actual browser screenshot from the deployed version 3, source commit 6807f11336594c2182f8251246427f48b8c775f8. Slow blinking is optional, user initiated and disabled for reduced-motion preference. Desktop and narrow-screen layouts were inspected in the in-app browser. No cross-browser/device certification or novice-user result is claimed.');
}
{
const s=slide('Notes remain tied to sky coordinates','Annotations preserve ICRS positions through comparison and display changes');
image(s,'output/screenshots/skyshift-production-note.png',64,188,840,446,'Actual deployed comparison with an explicitly labeled QA annotation');
text(s,'Add, edit, delete and locate',937,208,285,100,27,colors.accent,true);
text(s,'Only positions in common valid support are allowed.',937,330,285,112,24,colors.muted);
text(s,'Notes stay in the tab until exported. The pictured note is a QA example.',937,469,285,155,24,colors.muted);
notes(s,'The pictured note is explicitly labeled QA and is not an astronomical finding. Production export/reopen restored it, and clean-environment Python reconstruction verified its coordinate support. Two production tabs retained different note counts. No notes database or sharing backend exists.');
}
{
const s=slide('Evidence can be reconstructed','Original identities, calibration, processing, masks, notes and exact view settings travel together');
text(s,'Complete review packet',64,216,520,46,29,colors.accent,true);
text(s,'Original FITS and full calibration\nGaia catalogue and diagnostics\nExact source and dependency lock\n43 files, approximately 40.7 MB',64,288,520,210,26,colors.muted);
text(s,'Compact comparison export',690,216,526,46,29,colors.accent,true);
text(s,'Prepared FITS and preview\nICRS notes and display settings\nSource URLs and hashes\nReopen or reconstruct with originals',690,288,526,210,26,colors.muted);
rule(s,64,550,1152,'#29414E');
text(s,'61 Python tests     23 JavaScript tests     10 arrays reconstructed exactly',64,581,1152,58,28,colors.fg,true);
notes(s,'Tests executed locally, with JUnit records in docs/evidence. A fresh isolated Python environment installed the packet reproduction package and reran preparation and registration. Maximum prepared-array error observed: 0.0. Packet SHA-256: 2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78. Compact exports reference large originals and may require archive access or an extracted full-packet source cache. Automated reproduction does not complete human independent review.');
}
{
const s=slide('Current release and remaining gates','A working public review application with explicit scientific limits');
text(s,'Implemented and verified',64,217,530,48,31,colors.accent,true);
text(s,'Real-data comparison and masks\nCoordinate notes and evidence exports\nClean-environment reconstruction\nPublic deployment and failure checks',64,290,530,224,27,colors.muted);
text(s,'Still pending',690,217,526,48,31,colors.amber,true);
text(s,'Independent human technical review\nQualified astronomical assessment\nFive novice usability sessions\nBroader browser and device checks',690,290,526,224,27,colors.muted);
text(s,'Every scientific approval stays PENDING until the actual review is documented.',64,583,1152,62,29,colors.amber);
notes(s,'No reviewer identity, signature, qualified approval, owner sign-off, or novice participant result has been fabricated. Bounded alternative-field search rejected 45 M67 and 55 NGC188 pairings without lowering thresholds. Full project scientific acceptance remains incomplete. Long-term citizen-science collaboration, automatic detections and quantitative variability are future work, not demonstrated functionality.');
}
await fs.mkdir(work+'/renders',{recursive:true});
for(const [i,s]of p.slides.items.entries()){const b=await p.export({slide:s,format:'png',scale:1});await fs.writeFile(work+`/renders/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await b.arrayBuffer()));}
const candidate=work+'/candidate.pptx';await(await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(skill+'/container_tools/artifact_tool_utils.mjs').href);
const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:root+'/output/presentation/SKYSHIFT_Presentation_0.2_release.pptx',pythonExecutable:python,
integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',
layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:8,
fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:work+'/validation-release.json'});
console.log(JSON.stringify(result));
