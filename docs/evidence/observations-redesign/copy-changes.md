# Site copy and link changes

This is the item 3 inventory. Paired lines show prior and revised visible copy. The served HTML is used for the comparison, with corresponding source files listed below.

## Changed files

- `docs/demo_final.md`
- `docs/submission_final.md`
- `web/dist/challenge.html`
- `web/dist/classic-home.html`
- `web/dist/compare.html`
- `web/dist/discover.html`
- `web/dist/explore.html`
- `web/dist/guide.html`
- `web/dist/index.html`
- `web/dist/methodology.html`
- `web/dist/native.html`
- `web/dist/site.js`
- `web/dist/sky-search.js`
- `web/dist/website.js`
- `web/src/challenge.html`
- `web/src/classic-home.html`
- `web/src/compare.html`
- `web/src/discover.html`
- `web/src/explore.html`
- `web/src/guide.html`
- `web/src/index.html`
- `web/src/methodology.html`
- `web/src/native.html`
- `web/src/site.js`
- `web/src/sky-search.js`
- `web/src/website.js`
- `web/templates/footer.html`
- `web/templates/header.html`
- `docs/evidence/observations-redesign/copy-changes.md`

## Shared header, footer and information dialog

- Observations and Compare now link directly to their HTML pages. Universe and the original source-record links keep their destinations.
- The Resources menu opens the updated archive guide and the information dialog links to Methods, the challenge targets and Replay intro. Shared labels are recorded with the home page.

## challenge.html

```diff
-Skip to content
-Open two genuine SPHEREx dates and check their wavelengths, masks and registration before interpreting a shift. Save a question with its sky coordinates and export the source records with your investigation.
-Open two DR1 dates →
-Try matched-wavelength playback →
+Choose a challenge target in the SPHEREx DR1 and QR3 archive. Blink through dates, then compare two frames and check their wavelengths, releases and masks.
+Open a challenge target in Compare →
-The five challenge fields
-These bounded QR2/D2 field tests use cached sky cutouts. Each link opens measured pixels with its observation dates and source records. The tests establish which frames were usable in these requests. Scientific review is pending.
+The five challenge targets
+Each target opens cached 8′ cutouts from NASA/IPAC IRSA. More observations may be available from the live archive. The dates, detector, wavelength and source links are visible in the viewer.
-1 frame. A single frame cannot show motion. The preset uses a J2000 search centre for this high proper-motion star.
+Check the target marker for this high proper-motion star. Bright-source flags can mask its central pixel.
-2 frames. The data prepared here do not resolve the Ba/Bb components or establish motion.
-WISE 0855
-2 frames. The test uses the challenge coordinates. Identifying a moving source needs independent checks.
+Browse the observations of this nearby brown dwarf pair. The images can show an unresolved source at this sampling.
+WISE 0855-0714
+Check multiple dates and detector bands around this cold brown dwarf. Compare source positions with the epoch marked on each frame.
-3 frames. Masked support and wavelength comparisons limit interpretation of apparent brightness changes.
+Compare this young variable star across dates and read the wavelength and mask details before interpreting brightness changes.
-2 frames in the original bounded test.
-Open the focused two-date assessment
-for individual measurements and rejection evidence. Calibrated variability remains unestablished.
+Inspect the mask around this pulsating red giant. A central masked area can appear even when the surrounding signal is bright.
-SPHEREx images, masks, timestamps and calibration records come from NASA/IPAC IRSA. The official notebooks explain cutouts and FITS extensions.
-Mission archive ↗
+SPHEREx mission archive ↗
-Tutorial notebooks ↗
-·
-DR1 spectral images DOI ↗
+DR1 DOI ↗
-·
-QR2 DOI ↗
-·
-IRSA usage terms ↗
-Gaia DR3 provides astrometric references for the screened historical comparison and the matched-wavelength example.
-Gaia at MAST ↗
-·
-Gaia DR3 citation ↗
-WiseView’s flipbook is the interaction precedent for stepping through infrared observations.
-WiseView ↗
-NEOSSat is an independent near-Earth observing mission. These partner resources provide background and a separate path to its observations.
-CSA mission ↗
-·
-Canadian Astronomy Data Centre ↗
-·
-CSA tutorial ↗
-·
-NEOSSat dataset ↗
-This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.
-This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC). SKYSHIFT is an independent Project Mercury Team application.
-Methods, provenance and additional credits →
+Preset coordinates and proper motions are credited to CDS SIMBAD. The flipbook interaction was inspired by WiseView.
+Read the full archive, catalog and imagery credits ↗
```

## classic-home.html

```diff
-Meet the universe beyond visible light. Explore real observations from NASA’s SPHEREx telescope, look across dates, and keep the evidence behind every question.
+Explore real SPHEREx DR1 and QR3 images, blink through dated exposures and follow each frame to the NASA/IPAC IRSA archive.
-SPHEREx maps the sky in infrared light. SKYSHIFT brings a small, carefully documented selection of its observations into your browser.
+SPHEREx maps the sky in infrared light. SKYSHIFT opens calibrated cutouts for five challenge targets and searches the archive by sky position.
-Visit four curated regions. See what a real infrared exposure looks like, with its date and wavelength in view.
+Choose a challenge target or enter right ascension and declination in Observations.
-Compare the restricted M101 field across two dates. Shared controls keep the view fair; suitability limits stay visible.
+Press Play to blink through dates, or choose two frames and compare them side by side or with Wipe.
-Keep the question.
-Save the evidence.
-Mark a sky coordinate, write a note, and export the data references, settings and checks needed to reopen your view.
-See how evidence works ↗
+Check the frame.
+Share the view.
+Read the date, detector, wavelength and masks before sharing a link to the comparison.
+Learn how to read a frame ↗
-Find your field.
-Real, calibrated SPHEREx exposures.
-A curated collection, not an all-sky viewer.
-Previews show single-band SPHEREx data with an asinh brightness stretch. They are not visible-light photographs. Temporal comparison requires separate checks.
+Earlier sky previews.
+These historical examples show calibrated SPHEREx exposures. Open the archive viewer from any card to make a new search.
+These infrared previews use an asinh intensity stretch. Inspect each exposure’s wavelength and mask before comparing dates.
-From NASA/IPAC’s archive to the image on your screen, source identities and processing records stay attached. Inspect the audit, download the evidence, and reproduce the result.
+From NASA/IPAC’s archive to the image on your screen, source identities and processing records stay attached. Follow an IRSA source link in Frame details or read the methods and archive credits.
-01 NASA/IPAC IRSA archive↓02 Original calibrated FITS↓03 Validated preparation & masks↓04 Your view & evidence record
-Authenticity checked. Scientific approval remains pending.
+01 NASA/IPAC IRSA archive↓02 Original calibrated FITS↓03 Cutout preparation & masks↓04 Viewer and source record
+Dates and source identifiers travel with each exposure.
```

## discover.html

```diff
-SKYSHIFT checks spectral overlap and registration before offering a provisional comparison. A possible difference is a question for review, not proof of change.
-Understand the checks ↗
+The viewer aligns cutouts to a common sky grid and labels detector, wavelength and release. Check those labels and the quality masks before interpreting an apparent shift.
+Read about alignment and masks ↗
-SKYSHIFT uses calibrated observations distributed by NASA/IPAC IRSA. Our curated explorer shows individual detector cutouts, with quality masks and their spectral context preserved.
+NASA/IPAC IRSA distributes the calibrated DR1 and QR3 spectral images used here. In Observations you can open five cached targets or search around any sky coordinate covered by the survey.
-Start exploring ↗
+Open Observations ↗
```

## guide.html

```diff
-EVIDENCE THAT CAN BE REOPENED
-Reconstruct a comparison.
-Saved notes describe a user's observation. Scientific approval remains PENDING in this release. Reconstruction verifies the source identity and processing arithmetic; it does not establish an astronomical discovery.
-Reopen your view in the browser
-Choose “Open a saved comparison” and select your exported ZIP. SKYSHIFT verifies the files and source identities, then restores the shared viewport, intensity settings and optional display extension, and annotations. Scientific metadata must match the curated dataset.
-Display extensions (current release)
-Browser exports add a hashed visualization.json record for log display, palette, interpolation and wipe position. Browser reopen restores it after validation. The scientific manifest retains its original schema and numerical reconstruction remains unchanged. Python reconstructs arrays and the core viewport; the browser restores the optional visualization extension. Log applies log(1 + 100 × normalized display intensity) / log(1 + 100), not a logarithm of measured flux.
-Choose the appropriate evidence packet
-Comparison export: a compact ZIP with prepared FITS, notes, exact settings, diagnostics, and original archive URLs/hashes. Python reconstruction retrieves missing original inputs from approved archive services. It stops if the retrieved bytes differ from the recorded snapshot.
-Complete review packet: preserves the original FITS, spectral calibration, ePSF model, Gaia reference query, diagnostics, reproduction source, and pinned dependencies. Use this packet for independent review and when archive files have changed.
-Reproduce the numerical arrays
-The complete review packet includes the SKYSHIFT Python package in reproduction/, including pyproject.toml, src/skyshift/cli.py and requirements-lock.txt. After extracting the packet, open a terminal in reproduction/ and install its pinned environment:
-Windows PowerShell
-py -3 -m venv .venv .\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt .\.venv\Scripts\python.exe -m pip install --no-deps -e . .\.venv\Scripts\skyshift.exe reconstruct ..\comparison.zip --output ..\reconstructed-comparison
-macOS / Linux
-python3 -m venv .venv .venv/bin/python -m pip install -r requirements-lock.txt .venv/bin/python -m pip install --no-deps -e . .venv/bin/skyshift reconstruct ../comparison.zip --output ../reconstructed-comparison
-Use Python 3.12 and adjust the ZIP location to your saved packet. Run these commands inside the extracted reproduction/ directory. The dependency lock was verified on Windows; macOS/Linux installation and numerical reproduction remain unverified. On macOS/Linux replace .venv\Scripts\skyshift in the following examples with .venv/bin/skyshift.
-The output must be a new folder. The tool validates archive paths and hashes, checks the manifest, repeats common-grid preparation, verifies masks and WCS, and reports numerical differences for every prepared array. Annotation coordinates must remain in common usable support.
-Use the original snapshot offline
-After extracting the complete review packet, supply its original inputs for a compact saved comparison. Their hashes are verified before reuse:
-.venv\Scripts\skyshift reconstruct comparison.zip --source-cache extracted-review --output reconstructed-note
-Reproduce registration and response diagnostics
-.venv\Scripts\skyshift review full-review-packet.zip --output independently-reproduced
-This reruns native Gaia reference fits and response diagnostics, preserving all rejections. It does not complete a human review. The packet includes a detailed reviewer guide and exact specialist questions.
-Review the science separately
-The complete packet contains review.json with separate internal technical-review and external scientific-review records. No reviewer identity or approval is prefilled.
-Reproduce the registration measurements from the native images and saved Gaia query.
-Evaluate spectral response compatibility for the intended qualitative task.
-Inspect image sharpness, backgrounds, masks, and potential artifacts.
-Document qualifications, methods, limitations, and a reasoned conclusion.
-An internal team member's technical review is distinct from approval by a qualified astronomical reviewer. No pair becomes scientifically approved through a software checkbox.
-Display and interpretation
-Both images share an ICRS tangent grid, viewport, and intensity transform. Gray pixels lack common usable support. No background subtraction, PSF matching, significance map, or precision motion measurement is applied. The 13 Gaia reference measurements come from a larger context surrounding the small inspection field.
-Data:
-SPHEREx QR2 ↗
-and
-Gaia DR3 ↗
-. Independent student project; no NASA endorsement.
+SPHEREx OBSERVATIONS GUIDE
+Compare the infrared sky over time.
+Start in
+Observations
+with one of five
+challenge targets
+or enter right ascension and declination. Coordinates can be in decimal degrees or sexagesimal. The bundled target previews open at 8′. You can request more frames from IRSA.
+Browse the dates
+Choose a thumbnail or move the scrubber. Press Play to blink through the timeline and adjust Speed to change how long frames stay on screen. On the canvas, Left and Right step through frames and Space plays or pauses. Home fits the image and + or − adjusts zoom.
+Choose two exposures
+In
+Compare
+, use Frame A and Frame B or select a thumbnail for A and Shift-select for B. Use “Use current as B” to set B by touch or keyboard. When the viewer suggests a pair, it chooses different dates on one detector, with similar wavelengths and usable target pixels. You can compare other frames manually.
+Side by side shows both images. Wipe uncovers the second exposure as you move the slider. Difference shows A minus B on pixels usable in both exposures. A change in wavelength, release, coverage or processing can affect the appearance.
+Read the image and follow its source
+The marker shows the reference target position for that exposure. Frame details lists the date, detector and target wavelength. Open the quality flags for the native mask and archive identifiers. Use the IRSA link to inspect the original spectral image.
+Image options controls the brightness stretch, display background subtraction and masks. Gap fill is for display only. Overlay catalogs and the DSS optical background give context. A spectrum samples usable positions across the loaded observations.
+Share a view
+Select Share view to copy the coordinates or target, release selection and current frame or comparison pair. A cached target opens in a new session. Other coordinates may request archive data again.
+Read the methods and source credits →
```

## index.html

```diff
-IR LENS / M101 FIELD CENTRE
+IR LENS / HISTORICAL IMAGE CENTRE
-Explore the sky atlas →
+Find SPHEREx observations →
-Standalone comparison →
-Reconstruction guide →
+Compare SPHEREx dates →
+Observation guide →
-Compare real SPHEREx images of the same sky position. Inspect available dates, understand their limits and keep your evidence.
-SPHEREx / OBSERVATION LABExplore & CompareTwo dates. One field. Your evidence. ↗
-Search sky coordinates ↗
-Review the five challenge fields ↗
-M101 offers a restricted two-date comparison. Scientific approval PENDING
+Blink through real SPHEREx DR1 and QR3 observations. Compare two dates at the same sky position and check the wavelength, mask and archive source for each.
+SPHEREx / OBSERVATION LABExplore & CompareBlink, align and compare real exposures. ↗
+Find observations by coordinates ↗
+Read the challenge guide ↗
+Challenge targets ·
+Barnard’s Star
+·
+Epsilon Indi B
+·
+WISE 0855-0714
+·
+RW Aurigae
+·
+R Draconis
-LOCAL VIEW STANDBYM101 · RA 210.802° / Dec +54.349°Curated field centre · not spacecraft pointing DISPLAY POSITION / move over the hero
+LOCAL VIEW STANDBYBarnard’s Star · RA 269.452° / Dec +4.693°Challenge reference position · ICRS J2000 DISPLAY POSITION / move over the hero
-Enter coordinates or choose a target.
+Open the full date browser in
+Observations
+. This form prepares a small set of exposures for the local workspace.
-Load observations →
+Prepare this field →
-Explore M101 in 102 wavelengths ↗
-M101 · two DR1 dates ↗
-M101 · matched dates & native images ↗
-R Draconis field · two dates ↗
-Inspect 3I/ATLAS · wavelength check ↗
+Open Observations →
+Open Compare →
+Browse the challenge guide →
-QR2 · historical inputs
+Historical release · offline
-Prefer matching wavelengths
+Group by similar wavelengths
-DR1 and QR3 provide independently viewable dated observations. Their wavelength coordinates are approximate in SKYSHIFT. The cached QR2/D2 examples can use matched-wavelength playback only where the observations pass the calibration and reference checks. IRSA has retired live QR2 searches.
+Observations and Compare open real DR1 and QR3 exposures with dates, detectors, wavelength labels and quality masks. Use the image controls to look for differences and the source records to check them.
-THE OBSERVATION COLLECTION
-Real windows into the sky.
+HISTORICAL SPHEREX PREVIEWS
+Earlier windows into the sky.
-↺ Resume investigation
+Open Observations ↗
-Loading the verified local catalogue…
-Retry observation catalogue
+Loading earlier SPHEREx previews…
+Retry image previews
-Your observations and questions are preserved.
+Explore the spacecraft in 3D, or open the archive viewer directly.
-Observation collection →
+Observations →
-Reconstruct your evidence →
+How to use the viewer →
-Independent educational application. No NASA endorsement. Scientific approval PENDING.
+Independent educational application. No NASA endorsement.
-Challenge fields & data sources →
-SKYSHIFT is an independent Project Mercury Team application. It uses real SPHEREx observations with original source identities, calibration records and conservative quality masks.
-The restricted M101 comparison has passed documented engineering screens. Internal human review and qualified scientific approval remain PENDING. Questions are user hypotheses, not detections or confirmed changes.
-Scientific methods & provenance audit ↗
-Mission imagery: sources, hashes & usage terms ↗
-3D models: sources, hashes & usage terms ↗
+SKYSHIFT is an independent Project Mercury Team application. It displays dated SPHEREx DR1 and QR3 cutouts with their detector, wavelength and archive source.
+Wavelength, processing and masked pixels can change how the same field looks. Treat visual differences as questions to investigate.
+Archive, catalogs, background and credits ↗
+Challenge targets and how to compare ↗
+Mission imagery, hashes and usage terms ↗
+3D models, hashes and usage terms ↗
```

## methodology.html

```diff
-SKYSHIFT is an independent student application for inspecting real SPHEREx observations. Authenticity, engineering validation, and scientific approval are separate questions.
-ARCHIVE → FITS → PREPARATION → BROWSER
-Follow the data.
+SKYSHIFT is an independent Project Mercury Team application for inspecting calibrated SPHEREx DR1 and QR3 observations. Each exposure retains its archive source, measurement date, detector and wavelength information.
+FROM CALIBRATED EXPOSURE TO SKY VIEW
+A common sky grid.
+Observations
+opens dated cutouts from bundled challenge previews or searches IRSA by sky position. The four viewing modes in
+Compare
+use a north-up ICRS tangent grid with an angular sampling of 6.15″ per pixel.
+When grids differ, the viewer maps exposures to the same grid using the world coordinate system and the available valid pixels. The target marker accounts for the preset’s proper motion at the observation epoch.
+The asinh stretch, optional median background subtraction and display-only gap fill affect the view. “Show masked pixels” exposes missing or flagged samples. Difference and coadds use usable measurements.
+Check the dates, wavelengths, release, masks and source records before interpreting a difference. The tools support visual inspection. Quantitative motion and variability require separate calibration and analysis.
+DATA SOURCES & CREDITS
+Where the data comes from.
+SPHEREx DR1 and QR3
+The dated cutouts use calibrated Level 2 spectral images from NASA/IPAC IRSA. DR1 reprocesses Surveys 1 and 2. QR3 covers Surveys 3 and 4, with additional data released as it becomes available. SPHEREx is a NASA-funded project of JPL and Caltech.
+SPHEREx mission archive ↗
+·
+Release documentation ↗
+·
+DR1 DOI ↗
+·
+QR3 DOI ↗
+SIMBAD target astrometry
+Challenge coordinates and proper motions use SIMBAD, operated by CDS in Strasbourg. Cite Wenger et al. (2000), A&AS 143, 9. SKYSHIFT propagates the reference position to each observation epoch. The five preset records include their original astrometric citations.
+SIMBAD at CDS ↗
+·
+Target source records ↗
+Gaia DR3 and AllWISE overlays
+The optional Gaia overlay uses ESA Gaia Data Release 3, processed by DPAC and served through MAST at STScI. Cite Gaia Collaboration, Vallenari et al. (2023), A&A 674, A1. AllWISE combines NASA-funded WISE and NEOWISE survey data. SKYSHIFT queries the AllWISE source catalog, II/328 (Cutri et al., 2013), through CDS VizieR.
+Gaia at MAST ↗
+·
+AllWISE release and citation ↗
+·
+CDS VizieR citation ↗
+Aladin Lite and DSS Color
+The optional optical background uses CDS Aladin Lite (Boch & Fernique, 2014, ASP Conference Series 485, 277). DSS photographic plates were digitized by STScI. CDS produced the color HiPS tiles served through the MAST mirror.
+Aladin Lite and license ↗
+·
+DSS and MAST data-use policy ↗
+·
+Bundled source and licence ↗
+CADC and WiseView
+The Canadian Astronomy Data Centre link leads to separate NEOSSat observations from CSA and DRDC. WiseView, developed for Backyard Worlds, inspired the blink interaction. SKYSHIFT uses SPHEREx pixels for its flipbook.
+NEOSSat at CADC ↗
+·
+WiseView project and citation ↗
+HISTORICAL PROVENANCE AUDIT
+Earlier engineering records.
-The historical audit independently downloaded the original cutouts and calibration files again, checked archive exposure identities and times, and compared all ten browser arrays against prepared FITS and a fresh reconstruction. The historical public release was also checked; local execution now has no dependency on that host.
+The historical audit independently downloaded the original cutouts and calibration files again, checked archive exposure identities and times, and compared all ten browser arrays against prepared FITS and a fresh reconstruction. That audit covers the earlier prepared comparison package. The live archive viewer has its own source and quality records.
-Inspect observations, sources and diagnostics in the workspace ↗
-The scientific data bundle was prepared with SKYSHIFT 0.2.0 tooling; the website release is 0.9. Their version identifiers describe separate products.
-WHY DOES THE COMPARISON HAVE 24 × 24 PIXELS?
-Small for a reason.
-Larger where it is honest.
-The active detector calibration covers 2040 × 2040 pixels. The downloaded M101 native contexts have 176 × 116 and 176 × 137 pixels (width × height); a cutout can be clipped by the detector edge. Neither is the size of the whole instrument.
-The comparison grid is a separate, north-up 24 × 24 grid at 6.15 arcseconds per pixel, covering 2.4 arcminutes. A 0.12° test failed the spectral criterion; even a 0.06° test exceeded it. A 0.04° region passed the provisional engineering screen.
-Loading the recorded wavelength-screen margin… We keep that threshold: every common pixel must have wavelength separation no larger than 0.25 of the smaller local bandwidth. The explorer’s larger contexts are individual exposures, not approved wider temporal comparisons.
-Linear, asinh and log display stretches reveal different brightness levels. Single-band false color and smooth display interpolation change presentation only. Hover reads the actual nearest prepared pixel. No super-resolution, sharpening, inpainting or artificial astronomical detail is used.
-WHAT THE CHECKS ESTABLISH
-Evidence has boundaries.
-01
-Authentic inputs
-Identifiable QR2 calibrated FITS, exact source URLs, SHA-256 hashes, release-aware masks, full CWAVE/CBAND spectral calibration, and per-pixel provenance.
-02
-Engineering screens
-13 independently fitted Gaia references: median inter-epoch residual 0.312 arcsec, 95th percentile 2.007 arcsec. Common usable support: 94.4%. These are measured residuals, not absolute-position precision.
-03
-Scientific approval: pending
-No completed human internal technical review or qualified external scientific approval is claimed. Questions remain about full response equivalence, calibration UUID associations, PSF differences and acceptable interpretation.
-No confirmed motion, brightness variability, source identification, or discovery. No PSF matching, background subtraction, calibrated difference image or significance map. Resampled pixel covariance prevents naïve precision claims.
-The saved review packet retains rejected wider fields, an initial insufficient-reference test, the corrected reference-membership audit, uncertainties, reproducible code and separate blank human-review records. M67 and NGC 188 tested wider pairs remain incompatible. No three-date comparison is supported.
-Reproduction and review guide ↗
+Open the current archive viewer ↗
+Earlier spectral screen
+Loading the recorded wavelength-screen margin…
-Official mission composites combine wavelengths and use published color assignments. Our scientific canvases use single-band calibrated surface brightness. These categories are never interchangeable. NASA logos and insignia are not used.
+Official mission composites combine wavelengths and use published color assignments. The viewer displays surface brightness from individual spectral exposures, with separate tools to combine frames. NASA logos and insignia are not used.
-Assets and curated data are served as static files. Viewing, annotations, display controls and evidence exports run in your browser. Your notes and exports stay in your browser and are never uploaded. New archive retrieval and external links require internet access; numerical reconstruction uses Python and can run offline from the full review packet. Export notes before closing a tab.
+The bundled preview cutouts open locally. Custom archive searches send sky coordinates and field width to the application service and IRSA. Live cutouts, reference catalog overlays and external links require internet access.
```

## web/src/site.js

```diff
-import {stories,availability,friendlyDate} from './field-guide.js';
+import {stories,friendlyDate} from './field-guide.js';
-      const obs=field.observations[0],story=stories[field.id],status=availability(field);
+      const obs=field.observations[0],story=stories[field.id];
-      a.href=`./explore.html?field=${field.id}#explorer`;a.dataset.field=field.id;
+      a.href='./explore.html?'+new URLSearchParams({ra:field.ra_deg,dec:field.dec_deg,fov:Number((field.size_deg*60).toFixed(1))});a.dataset.field=field.id;
-      body.append(make('span',status.label,'field-status'),make('div',story?.kind||'Curated sky region','field-kind'));
+      body.append(make('span','Historical preview','field-status'),make('div',story?.kind||'SPHEREx sky field','field-kind'));
-      meta.append(make('span',friendlyDate(obs.time_start_utc)+' UTC'),make('span',field.observations.length+' curated '+(field.observations.length===1?'exposure':'exposures')));
-      const action=make('div',status.action,'field-action');action.append(make('span','↗'));body.append(meta,action);a.append(preview,body);card.append(a);gallery.append(card);
+      meta.append(make('span',friendlyDate(obs.time_start_utc)+' UTC'),make('span',field.observations.length+' recorded '+(field.observations.length===1?'exposure':'exposures')));
+      const action=make('div','Search these coordinates','field-action');action.append(make('span','↗'));body.append(meta,action);a.append(preview,body);card.append(a);gallery.append(card);
-if(document.querySelector('.hero-actions')&&createExplorationMemory().read().record){const resume=make('a','Resume exploration ↗','quiet-link');resume.href='./explore.html?resume=1#explorer';document.querySelector('.hero-actions').append(resume);}
+if(document.querySelector('.hero-actions')&&createExplorationMemory().read().record){const resume=make('a','Open Observations ↗','quiet-link');resume.href='./explore.html';document.querySelector('.hero-actions').append(resume);}
-    for(const [number,label]of [[s.files?`${s.files.passed} / ${s.files.total}`:'UNVERIFIED','Historical scientific file hashes'],[s.arrays?`${s.arrays.passed} / ${s.arrays.total}`:'UNVERIFIED','Historical reconstructed arrays · current bytes checked'],['PENDING','Qualified scientific approval']]){const d=make('div',undefined,'audit-stat');d.append(make('strong',number),make('span',label));summary.append(d);}
+    for(const [number,label]of [[s.files?`${s.files.passed} / ${s.files.total}`:'UNVERIFIED','Historical scientific file hashes'],[s.arrays?`${s.arrays.passed} / ${s.arrays.total}`:'UNVERIFIED','Historical reconstructed arrays · current bytes checked'],[s.sourceRelease||'UNVERIFIED','Historical source release']]){const d=make('div',undefined,'audit-stat');d.append(make('strong',number),make('span',label));summary.append(d);}
-  }).catch(e=>{document.querySelector('#audit-summary').textContent='UNVERIFIED · '+e.message;document.querySelector('#audit-traceability').textContent='Historical audit unavailable. Qualified scientific approval remains PENDING.';});
+  }).catch(e=>{document.querySelector('#audit-summary').textContent='UNVERIFIED · '+e.message;document.querySelector('#audit-traceability').textContent='The earlier provenance audit could not be loaded.';});
```

## web/src/sky-search.js

```diff
-        link.href = '#observations/' + field.id;
+        link.href = './explore.html?'+new URLSearchParams({ra:field.ra_deg,dec:field.dec_deg,fov:Number((field.size_deg*60).toFixed(1))});
-        context.textContent = ` · ${field.observations.length} prepared observation(s), ${(field.size_deg * 60).toFixed(1)}′ original width. Temporal comparison: ${field.comparison_status === 'provisional_restricted' ? 'restricted M101 region only' : 'unavailable'}.`;
+        context.textContent = ` · ${field.observations.length} prepared observation(s), ${(field.size_deg * 60).toFixed(1)}′ original width.`;
-      const status=tested?.targets?.find(t=>t.id===target.id);if(status)button.title=`${status.prepared_frames} genuine cached observation(s); no verified target motion or variability`;
-        const result=tested?.targets?.find(t=>t.id===target.id);
-        $('sky-target-context').textContent = target.coordinate_context + (result?` QR2/D2 test: ${result.prepared_frames||0} prepared frame(s). ${result.interpretation}`:' SPHEREx target validation: not yet tested.');
+        $('sky-target-context').textContent = target.coordinate_context;
-          if(expected===sequence&&result?.url) {
+          if(expected===sequence) {
-            link.href='#target-example/'+target.id;link.textContent=`Open ${target.name} · ${result.prepared_frames} cached frames ↗`;
+            link.href='./compare.html?target='+encodeURIComponent(target.id);link.textContent=`Compare ${target.name} ↗`;
```

## web/src/website.js

```diff
-      `${catalogue.fields.length} curated fields · ${catalogue.fields.reduce((n, f) => n + f.observations.length, 0)} individual observations · ${catalogue.fields.filter(f => f.comparison_status === 'provisional_restricted').length} restricted comparison · scientific approval PENDING`;
+      `${catalogue.fields.length} earlier regions · ${catalogue.fields.reduce((n, f) => n + f.observations.length, 0)} recorded exposures`;
-    link.href = "#observations/" + field.id;
+    link.href = "./explore.html?" + new URLSearchParams({ra:field.ra_deg,dec:field.dec_deg,fov:Number((field.size_deg*60).toFixed(1))});
-        field.comparison_status === "provisional_restricted"
-          ? "Two dates · restricted comparison available"
-          : field.comparison_status === "incompatible_tested_pairs"
-            ? "Single observation · tested pairs incompatible"
-            : "Single observation · no suitable pair installed",
+        "Search these coordinates in Observations ↗",
-        "No matching sky region. Clear search to see the four curated fields.",
+        "No earlier preview matches. Clear the filter to see all earlier previews.",
-    "Search applies to the four supplied fields; this is not an all-sky archive search.";
+    "Filtering earlier previews. Use Observations for archive searches.";
-$("home-resume").onclick = () => navigate("observations");
+$("home-resume").onclick = () => location.assign("./explore.html");
```

## docs/submission_final.md

```diff
-SKYSHIFT lets visitors look up a place in the sky and explore NASA’s infrared observations in date order. Start with one of five challenge targets or enter right ascension and declination. Blink through real cutouts, compare two dates side by side, or move a wipe across them. Each frame shows its date, detector, wavelength, and archive source. The five targets open from bundled 8′ previews and can request additional observations from NASA/IPAC IRSA. The viewer shows when wavelength, release, or pixel coverage differs between frames.
+SKYSHIFT lets visitors look up a place in the sky and explore NASA’s infrared observations in date order. Start with one of five challenge targets or enter right ascension and declination. Browse real cutout thumbnails, blink through dates, compare frames side by side or with a wipe, and view a signed difference on mutually usable pixels. Each frame shows its date, detector, wavelength, and archive source. The five targets open from bundled 8′ previews and can request additional observations from NASA/IPAC IRSA. The viewer shows when wavelength, release, or pixel coverage differs between frames.
-2. Read the dates, detectors, and wavelengths. Select **Play** in the viewer to blink through single frames.
-3. Choose Frame A and Frame B in **Compare** and select **Side by side** or **Wipe**. Use **Share this view** to copy the exact selection.
+2. Read the dates, detectors, and wavelengths. Choose a thumbnail or select **Play** to blink through single frames.
+3. Choose Frame A and Frame B in **Compare** and select **Side by side** or **Wipe**. Use **Share view** to copy the selection.
+- **Flipbook interaction inspiration.** WiseView from the Backyard Worlds team. [WiseView project and citation](https://github.com/backyardworlds/wiseview)
+
+cf51c7e 2026-11-15 Build a shared SPHEREx observation workbench
+4bb5ee5 2026-11-15 Restore first-visit arrival and gesture-enabled sound
```

## docs/demo_final.md

```diff
-| 5–10 s | Scroll to the observation list and show the dates, detector, wavelength, and archive link. | Real NASA SPHEREx exposures. |
-| 10–17 s | Go to the viewer and press Play. Pause on a labelled frame. | Blink through single observations. |
-| 17–24 s | In Compare, show side by side for the suggested pair, then move the wipe. Leave the dates and any warnings visible. | Compare two dates on one detector. |
-| 24–30 s | Show the source, mask label, and Share this view button. | NASA/IPAC IRSA · Display differences are exploratory. |
+| 5–10 s | Show the filmstrip thumbnails and frame details, including the wavelength and archive link. | Real NASA SPHEREx exposures. |
+| 10–17 s | Press Play in the viewer and pause on a labelled frame. | Blink through single observations. |
+| 17–24 s | In Compare, choose frames A and B and show them side by side, then move the wipe. Leave the dates and any warnings visible. | Check the detector and wavelength for both dates. |
+| 24–30 s | Show the source, mask label, and Share view button. | NASA/IPAC IRSA · Display differences are exploratory. |
```
