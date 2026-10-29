# Challenge readiness — current engineering matrix, 30 October 2026

The complete official challenge page again returned HTTP 502 on this pass. Mandatory/optional classifications below therefore refer to the **full statement supplied by the user**, not independently verified final-page compliance. Indexed [2026 Participant Terms](https://www.spaceappschallenge.org/legal/) were retrieved; the complete final judging/resources guidance was not verified. Historical judging dimensions remain provisional. The initial tables farther below are preserved as superseded records.

| Requirement / source classification | Current status | Evidence / practical limit |
|---|---|---|
| Public genuine SPHEREx images — core | Implemented; local journeys passing | Real cached FITS-derived frames and source identities. Public current scientific journey still needs fresh anonymous verification after deployment. |
| RA/declination entry — core | Implemented; parser/API tests passing | Numeric/sexagesimal inputs and bounded preparation. External arbitrary-position preparation unavailable on the checked Netlify host. |
| Available observations and dates — core | Implemented locally | Bounded archive discovery and per-epoch metadata; empty/error/truncated responses are distinct states. |
| Series showing changes over time — core | Partially implemented | Supported M101 engineering comparison works. Both investigated comet pairs are scientifically rejected; no measured motion or calibrated variability established. |
| Comparability/alignment — necessary scientific integrity | Implemented conservative engineering gates | Masks, local CWAVE/CBAND, overlap, processing identity and independent stationary-reference checks. Scientific expert approval PENDING. |
| Five requested fields — explicit test objective | Partially tested | Real bounded field preparations exist; none proves target identification or valid temporal playback. Detailed reasons below. |
| New data releases — optional design consideration | Partial | Explicit QR2/QR3 requests, no silent fallback. Only QR2/D2 has a pinned calibrated temporal adapter; QR3 temporal support is not validated. |
| 102 bands / detector sums / live spectra — optional | Analytical workflow unsupported | Homepage strip is schematic with representative colors; it is not analytical channel selection or a measured spectrum. |
| Add/subtract epochs — optional | Restricted qualitative tools only | No calibrated PSF/background/noise-aware variability product. |
| Adjustable field size — optional | Implemented; bounded | One to thirty arcminutes; bigger requests can fail or take longer. |
| Gaia/WISE overlays — optional | Partial | Gaia registration references/predictions exist. General Gaia/WISE image-overlay workflow not established. |
| URL coordinate query — optional | Implemented | Shareable request state; not a promise of coverage or equivalent to an evidence packet. |
| Quality metadata and astronomy-tool integration — optional | Metadata implemented; external tools linked | Sources, flags, units and calibration identities preserved. No claim that Astropy/Aladin techniques are original inventions. |
| Evidence export/reconstruction — our enhancement | Implemented; browser round trips passing | Exact original URLs/hashes, prepared arrays and questions. Hash agreement is not scientific approval. |
| Accessibility / Explore and Research detail — product requirement | Automated journeys passing within tested scope | Desktop/mobile emulation, keyboard, reduced motion and no-WebGL access; human usability and physical-device certification remain absent. |

Five-target outcomes (QR2/D2, bounded sampled observations, not mission-wide nondetections): Barnard's Star has one prepared frame; two selected cutouts excluded the requested centre. Epsilon Indi B has two frames, processing/spectral mismatch and only five accepted registration references. WISE 0855 has two frames, processing/spectral mismatch despite passing registration. RW Aurigae has three frames, processing/spectral mismatch and a reference catalogue row-limit failure. R Draconis has two frames, spectral mismatch despite passing registration; a third acquisition returned 422. Preserve these results and thresholds.

No 2026 award category, media limit, final rubric, independent approval or full challenge compliance is inferred from these engineering states. Current issue progress is maintained in [the mission audit](mission_audit_20261029.md).

## Superseded preparation baseline — 29 October 2026

**Superseded baseline:** the table below describes the earlier preparation-only revision. Current implementation, acceptance conditions, five real-data outcomes, public-service architecture and competition limitations are recorded in [native coordinate preparation and handoff](native_preparation_20261029.md).

This is the current engineering scope for **Planet X and SPHEREx**, based on the updated challenge statement supplied by the user. It supersedes the original implementation-baseline table. Event: **Universal Virtual Event**. This is a local preparation milestone, not a submitted or scientifically approved project.

The challenge Resources tab is expected on **13 November 2026**, according to the supplied statement. Existing public archive data and future challenge resources are separate inputs. [Official 2026 event information](https://www.spaceappschallenge.org/2026/) lists the hackathon on November 14–15; Universal-specific submission requirements, team settings, eligibility of pre-existing work, and deadline timezone still require verification against current organizer guidance. Historical 2025 judging limits are not adopted as 2026 rules.

| Challenge outcome | Current implementation | Remaining acceptance work |
| --- | --- | --- |
| Enter RA and declination | Homepage accepts decimal degrees and explicit sexagesimal coordinates; invalid ranges rejected | Arbitrary-coordinate images are not yet fetched into the viewer |
| Choose field of view | Requests accept 1–30 arcminute square widths; archive query encloses square corners | Prepared fields retain their original widths; requested width does not crop or replace their data |
| Share coordinate searches | `?ra=…&dec=…&fov=…&release=qr3#sky-search`; reload/Back restore the request | This is a search link, not a claim of available images or a saved investigation |
| See changes over time | Native restricted M101 comparison, wipe, A/B, optional slow blink and linked views | General multi-epoch sequence preparation and compatibility screening for arbitrary targets |
| Test the five named targets | Sourced search presets, browser request downloads and cross-language intake plans | Actual SPHEREx images and scientific target tests: **NOT CONDUCTED for all five** |
| Add new releases quickly | Versioned observation requests; offline intake plans; optional bounded QR2/QR3 wide/deep metadata inventory; raw responses/hashes/failures retained | Inspect new resources, product versions, calibration and flag definitions before adding an adapter |
| Honest flags and wavelengths | Existing conservative masks and wavelength records preserved; incoming payload schema, projection, numeric hashes and usable measurements validated | Release-specific specialist assessment remains pending |
| Evidence and recovery | Existing source identities, JSON/ZIP export/reopen, direct scientific routes and no-WebGL access retained | Qualified scientific approval and internal human review **PENDING** |
| Optional enhancements | Existing Gaia registration context | Six-detector coadds, calibrated difference/sum images, live spectra and Gaia/WISE image overlays are not implemented |
| Public submission | Local site at localhost:3000; static hosting workflow retained | Current changes have not been publicly deployed or submitted |

Independent novice validation remains **NOT CONDUCTED** by user instruction. The user is the sole human UX evaluator. Automated accessibility and emulated mobile checks do not substitute for that evaluation.

## Resource intake workflow

1. Open `http://localhost:3000/#sky-search`. Choose a target or enter a position and width, then **Save observation request**. This file contains coordinates, width and requested release; it contains no user notes or scientific results.
2. Create an offline plan, using a new output directory:

   ```powershell
   .venv/Scripts/python.exe -m skyshift.cli intake path/to/skyshift-observation-request.json --output tmp/new-target-plan
   ```

3. To make one bounded metadata request, add `--query`; use `--deep` only when the deep survey is the intended input. QR2 and QR3 stay explicit. An existing output directory is never overwritten.

   ```powershell
   .venv/Scripts/python.exe -m skyshift.cli intake path/to/skyshift-observation-request.json --output tmp/new-target-inventory --query
   ```

4. Inspect `intake.json`, `inventory/query.json`, the exact `response.xml`, and `observations.json`. `INVENTORIED` means metadata was retrieved. It does not approve a pair, declare distinct usable epochs or establish a detection. Failure/overflow stops intake; no FITS files are automatically downloaded.
5. When the challenge resources arrive, record the official resource URL, release, product/version documentation and required citation. Select bounded source identities and detector/release-matched calibrations. Use the established `download`, `inspect`, `screen`, `reconstruct` and `review` commands; retain rejection evidence and all existing thresholds. Unknown versions/flags need explicit adapter work. Do not pool releases, wavelength channels or detector images merely because they cover the same sky position.
6. Add only verified prepared products to the local catalog, retain source/calibration hashes, and leave review status explicit. Recheck the five targets for actual time coverage, usable support, wavelength compatibility, proper-motion/epoch context, registration and brightness/PSF/background limitations. An empty query is an availability outcome, not a failed scientific detection test.
7. Run the incremental frontend build, relevant unit tests, the new search journeys and the established product/recovery journeys before preparing the existing upload stage. Validate the actual published URL after an authorized deployment; no local receipt proves public availability.

## Target provenance and engineering evidence

`config/challenge_targets.json` is the single authored source for the five presets. The incremental build copies it to `web/dist/challenge-targets.json`. SIMBAD coordinates retain the displayed J2000 epoch; WISE 0855 retains the supplied challenge position with unspecified epoch. Neither is silently propagated to SPHEREx observation times. Epsilon Indi B is the B brown-dwarf system, not the primary star; no resolved Ba/Bb claim is made.

The browser engineering receipt and five downloaded request files are in `docs/evidence/challenge-readiness-20261029/`. `tools/verify_challenge_readiness.mjs` tests search/reload/Back, downloads, native viewer entry, stale requests, failure recovery, four widths, keyboard use, accessibility and disabled WebGL. These are engineering checks, not the five scientific target tests.

A single live QR3 wide-survey query for WISE 0855 returned **0 candidate rows** on October 29. The exact successful VOTable response and query metadata are retained with the intake report. This narrow result does not establish mission-wide absence, a nondetection or lack of QR2/deep/future coverage. No candidate-pair batch or FITS download was performed.

Primary archive references: [IRSA data access](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/), [data products and release history](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/), [SPHEREx mission delivery schedule](https://spherex.caltech.edu/page/data-products).
