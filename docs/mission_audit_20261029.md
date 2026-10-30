# SKYSHIFT: eligibility gate and initial mission audit

## Next execution milestone — October 30, 2026

Implemented bounded local-wavelength preselection and UTC date/wavelength filters,
with unchanged scientific gates. A fresh R Draconis query returned 95 metadata
rows; 81 contained the requested 2.4-arcminute grid. Twelve 64-KiB original-header
prefixes were probed and two 18-arcminute context cutouts acquired. Observations
`2025W49_1A_0009_3` and `2025W50_2A_0259_3` are 11.339608 days apart, both QR2,
pipeline `6.4+psffix1`, D2. The final common fraction is 0.807292; maximum local
spectral separation is 0.155418 bandwidths (threshold 0.25). Sixteen stationary
references span four quadrants: median 0.109091 and p95 0.280378 pixels. The
geocentric solar elongations are approximately 88.51 and 90.22 degrees. These
are field/geometry and provisional engineering results, not an identified target
or detected physical change. Both earlier comet rejections and the broader
R Draconis failure remain intact.

The cached native route is `#target-example/r-draconis-temporal`; it exposes real
dates, wavelengths, masks, reference checks, source identities and ZIP export/
reopen without WebGL or the preparation API. All eight numerical arrays reproduce
exactly in Windows and Linux. Linux continuous Gaussian-fit diagnostics differ
from Windows by at most about 1.30e-7 in their recorded units. Reconstruction now
allows 1e-6 absolute/1e-9 relative error only for continuous registration
diagnostics; classifications, policies, IDs, all screening results and array
hashes must remain exact. No scientific threshold was relaxed.

Local WSL2 Docker verification replaces the earlier Docker-unavailable finding.
The service runs nonroot under a read-only root filesystem and CPU/memory/process
limits, acquires official observations, enforces Host/Origin/queue bounds and
reopens the exact completed result after restart. The first stop test exited 137;
SIGTERM handling was corrected and the rebuilt service exited 0. The portable
procedure and storage/redeployment limits are in `public_service.md`. External
publication is still unperformed; a Python-capable host, deployment access and
same-origin HTTPS routing are required.

Verification/evidence tools now allocate fresh run directories. Browser reports
use exclusive writes; screenshot/download destinations are exclusively claimed.
Legacy scientific validators and audit snapshots also refuse historical output
directories. Storage admission now reserves 80 MiB per physically unfinished job
for bounded metadata/header/reference evidence plus the final sequence. The four
unrecovered historical screenshots remain disclosed in the existing preservation
notice; no recovery is claimed.

The Skiper transition study is retired from the running interface. Current links
use ordinary color/text-decoration states; the launch arrow uses color only.
Historical source, custom terms and attribution remain recorded. The publisher's
free-use terms have not been relabeled as OSI or Apache-2.0. Existing NASA imagery,
fonts, Three.js/Draco and Lenis retain their own recorded sources and terms.
Organizer acceptance of prior development and final packaging remains based on
the user's report, not independently verified correspondence. Qualified science
and internal human approval remain PENDING; novice validation NOT CONDUCTED.

Exact run scopes, failures, source changes and test receipts accompany the new
milestone verification record at
`docs/evidence/next-milestone-20261030/verification.json`; the complete changed-file
list is `changes.json` beside it. Earlier counts below describe the accepted prior
milestone, not the final counts of this increment.

## Implementation update — October 30, 2026 (Asia/Hebron)

The October 29 findings below remain a historical audit. The user subsequently reported organizer approval and explicitly authorized current implementation in the final-development directive. The user's follow-up summary was: “we can finalize our work as we want, but on november 14 we will have the submitted project as completely new files that are historically dated to the submission date.” This is **user-reported approval**, not independently verified organizer correspondence. Local development has resumed on `codex/scientific-completion`. A future release will retain its authentic creation date and disclose the prior development; no old dates or history were rewritten. No final competition submission is being prepared now.

| Audit issue | Current implementation/evidence | Remaining limit |
|---|---|---|
| Queue safety | Actual in-flight accounting retains cancelled queued/running work and storage reservations; twelve-starts/minute service cap; busy HTTP 429; corrupt-receipt recovery and shutdown handling. Regression tests cover concurrent admission and repeated cancellation. | External proxy/rate-limit configuration remains deployment-specific. |
| Real temporal example | Both predeclared comet pairs were downloaded and screened without changing thresholds. December: spectral mismatch 4.234 bandwidths, reference registration passed with seven stars. August: mismatch 5.480, reference catalogue reached its row limit. | Neither establishes motion or calibrated variability. December is available as independent observations with playback disabled. |
| Other bounded candidate strategy | Metadata plus an approximate fixed-roll calibration mapping examined December's 13 D2 entries: predicted local wavelengths progress through the detector range. | No alternative matching pair established; no additional candidate FITS batch was run. |
| Tests / CSS | CSS contract violations repaired; original browser sound-default expectation updated. Native animation replaces GSAP runtime use. | Test receipts must be assessed separately from human/scientific approval. |
| Reproducibility | Version aligned to 0.10.1; Apache-2.0 license and notices added; isolated locked dependency installation succeeds. Docker recipe no longer requires ignored local originals. | Linux container build not verified: Docker is unavailable. Source-history capture and final clean-checkout checks are tracked below. |
| Public backend | Updated service runs at localhost:3000; real original-cache preparation and native viewer entry verified after restart. | Existing public Netlify API remains unverified/unavailable; no Python hosting destination or credentials supplied. User was asked for the host. |
| Licensing | Restricted GSAP runtime files preserved under ignored `research/licensing/retired-gsap-20261030/`, outside `web/dist`; native observers/counters retain presentation behavior. Runtime manifests retain Lenis MIT, Three.js MIT, Draco Apache-2.0 and font OFL notices. | Skiper adaptation terms and all photographic/branding rights are not certified OSI-compatible merely by adding the team-code license. |
| Human/scientific review | No review identities or approvals invented. | Qualified scientific approval and internal human review PENDING; independent novice validation NOT CONDUCTED. |

Verified milestone: main workspace Python **144 passed**, JavaScript **145 passed**; product journeys **19 passed in Chrome** and **19 passed in Edge**. Focused desktop/mobile comet-rejection and restarted-backend journeys **3 passed**. Arrival journeys **9 passed**, subject to the screenshot collision disclosed below. A clean source checkout built with no frontend byte changes and ran **136 Python passes, 8 explicit skips** for optional historical datasets; its initial two missing-input failures were addressed with the bounded, hash-verified fixture bootstrap. A clean isolated dependency environment installed successfully with `pip check` reporting no broken requirements. The comet ZIP reconstructed all eight SCI/WAVE/BAND/VALID arrays using that environment. This verifies repeatability, not target detection or expert approval.

After the final storage-quota repair, **19 focused backend/resource tests passed**. Failed/partial receipt files now count toward the byte budget and a separate 512-receipt ceiling prevents accumulation of tiny failure directories. These 19 tests overlap the full-suite count; they are not an additional 19 distinct tests.

The current public site was opened in a fresh anonymous browser: its existing two-frame cached M101 sequence works, with no page errors; `/api/capabilities` returns 404. It still serves the previous static release. The new local build has not been published. The Skiper publisher's current Quick Start still grants free use/modification with attribution, but does not establish an OSI license; competition compatibility remains unresolved.

Engineering receipts and the screenshot-collision disclosure are under `docs/evidence/completion-20261030/`. The existing arrival verifier overwrote five historical screenshots before its hard-coded output path was noticed; one identical original was recovered, four were not. No scientific original or rejection evidence was overwritten. The verifier now uses a fresh output path and refuses an existing directory. This is a recorded preservation failure, not a claim that every previous artifact remained intact.

The working fallback remains the restricted M101 comparison plus real single-observation inspection and explicit rejected-comparison explanations. A validated motion demonstration and external public preparation remain unresolved. No award-readiness claim follows from the engineering repairs.

---

Recorded October 29, 2026. Team: Project Mercury Team. Intended event: Universal Virtual Event; challenge: Planet X and SPHEREx. This is an initial engineering and scientific-method audit, not NASA judging, a qualified astronomer's approval, or a completed submission review.

**Decision: SKYSHIFT is not ready to be represented as an eligible, scientifically validated award submission. Preserve the existing application; suspend implementation until the rules on its reuse and the development window are resolved.** Research, documentation and isolated audits continue under Phase 0 of the user's mission brief.

## 1. Rules and eligibility

### Confirmed and unresolved requirements

| Topic | Verified source and implication | Status |
|---|---|---|
| Event window | The [2026 event page](https://www.spaceappschallenge.org/2026/) gives November 14–15, project editing from November 14 at 09:00 through November 15 at 23:59 local time, registration and teams of at most six. | Verified through indexed production-page text; direct fetch returned 502. |
| Binding participant terms | The [2026 Participant Terms](https://www.spaceappschallenge.org/legal/), updated August 7, require registration before the event start; solutions must address a challenge. Original content must be unrestricted or OSI licensed; absent a specified compliant license, NASA distributes it under Apache 2.0. Third-party rights and resource acknowledgements also need checking. These terms include additional personal eligibility and privacy conditions; team compliance has not been verified. | Verified indexed text, not an organizer ruling on this project. |
| Work before the event | The official-platform [Santiago 2026 page](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/) allows learning, data exploration and team formation, but says competition solution development must occur during the event. [Tel Aviv University's organizer guidance](https://space.tau.ac.il/SpaceApps2026) independently makes the same distinction. | Strong reason to stop implementation. These local pages do not establish a Universal Event exception or resolve reuse of this application. |
| Universal rules and timezone | [Universal Event page](https://www.spaceappschallenge.org/2026/local-events/universal-event/) could not be retrieved. | Applicable reuse policy, start time, deadline timezone and any nomination procedure unresolved. Do not import a previous year's team-owner timezone rule. |
| Exact challenge and resources | [Official challenge](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/) returned 502. The user supplied its full statement; an official-platform [2026 team page](https://www.spaceappschallenge.org/2026/find-a-team/spectral-x/) corroborates the basic objective. | Detailed mapping below is provisional against the supplied statement, not a certified complete final-page comparison. |
| Final submission and judging guides | No final production 2026 guide was verified in this search. Staging results contained old October dates and placeholders. | Unknown: final rubric, award categories, AI disclosures, submission fields and media limits. Search failure does not prove nonpublication. November 13 is an anticipated date, not established here as a binding deadline. |

Do not interpret free use of a library, or the existence of other teams advertising ready backends, as permission to submit pre-event development. Written clarification is necessary. This is a compliance assessment, not a definitive disqualification ruling.

A daily 09:00 thread follow-up was created: `skyshift-2026-rules-watch`. It checks final production guidance and stays quiet on unchanged information or inaccessible pages. It does not authorize implementation, external communication or submission.

### Truthful pre-existing-work inventory

The receipt [preexisting-work.json](evidence/mission-audit-20261029/preexisting-work.json) records 37 commits, the full visible commit sequence, expanded dirty/untracked paths, and 1,072 existing files under implementation, documentation and output directories, plus root-file metadata. Small files include SHA-256 hashes; large media and backups are inventoried without copying or re-encoding them. Runtime dependencies, caches and most ignored temporary scientific inputs are excluded. This is a scoped inventory, not a complete forensic disk image. Local dates and hashes do not independently authenticate authorship.

- Root commit: `ce5345066661512dbd1708688d009d6a47354bdc`, October 16, 2026 at 17:50:04 +03:00, already describing a traceable workflow and public release.
- HEAD: `2766b635d5bc3b34fbce8a52fb96d8c8a97d3025`, October 17 at 23:21:38 +03:00. Branch `main`; no tags observed.
- Many subsequent native-preparation and presentation files are modified or untracked. Examples: `src/skyshift/sequence.py`, `jobs.py`, `Dockerfile`, and `web/src/arrival.js`. A clean checkout of HEAD cannot reproduce the current local application.
- Existing output includes 19 ZIP files, four PDFs, five slide decks and five MP4 files, plus two WebM files and other assets. Earlier releases and backups date to October 16–17. They are pre-existing artifacts, not new hackathon deliverables. They were preserved; their substantive content was not all re-reviewed in this pass.
- Existing working features, prepared datasets, scientific reports, source assets and AI-assisted work must be disclosed as pre-existing if any reuse is permitted. No claim is made that October development occurred during November event hours.

### Draft organizer inquiry — NOT SENT

Subject: 2026 Universal Event eligibility clarification — pre-existing SKYSHIFT application

Hello NASA Space Apps Global Organizing / Universal Event Team,

Project Mercury Team intends to participate in the 2026 Universal Event on Planet X and SPHEREx. We already developed SKYSHIFT before November 14. Our repository has 37 commits beginning October 16, plus later uncommitted work. It includes a public web interface, real SPHEREx FITS preparation, restricted time comparison, evidence exports, tests, prepared examples and existing presentation artifacts. AI assistance was used. We will disclose this work and will not attribute it to hackathon hours.

Could you confirm in writing whether this pre-existing application or any parts may be reused, extended or submitted for 2026 Global Judging? If reuse is allowed, which parts qualify as background material, what must be created during the event, and what disclosures are required? If it is not allowed, may we retain only general skills, public documentation and dataset research while building a fresh implementation during the permitted window? Please also confirm the Universal Event start/deadline timezone and point us to the applicable final rules.

We have paused implementation while seeking clarification. Thank you.

Use the verified current official contact channel before sending. No recipient identity or special approval is inferred from older or staging pages.

### Permitted scope now and fallback

Continue reading official data documentation, learning tools, reviewing existing code, running isolated audits, recording limitations, drafting inquiries and checking final rules. Do not acquire large new candidate batches, build the intended submission, deploy changes, create new submission media or send messages under the present unresolved gate.

If reuse is refused, preserve this repository as a disclosed prior project. Do not redate or relabel it. During the confirmed event window, create a separate clean implementation using only materials organizers expressly permit. Scope it to coordinates, two compatible real observations, honest blink comparison and an evidence receipt; omit the optional Universe. A fresh repository alone does not erase reuse of copied pre-event solution code, designs or datasets. Confirm what may be carried forward first.

## 2. Current application: verified condition

The local application and the public static site both respond. [Delivery receipt](evidence/mission-audit-20261029/delivery-check.json) records URLs and responses. Local `/api/capabilities` advertises preparation, six frames maximum, a 30 arcminute field maximum, two active jobs and one calibrated temporal adapter, `qr2/D2`. Public `https://skyshiftt.netlify.app/api/capabilities` returns 404. Its public health response identifies `public-static`; it is not proof of a running Python preparation service. Public release metadata matches current local hashes for its declared source assets; no declared-asset drift was found. Public homepage HTML is not byte-identical to local HTML. A clean external-browser scientific journey has not been certified by these HTTP checks.

| Capability | Evidence and scope |
|---|---|
| Genuine observations | Existing target receipts retain official IRSA cutout URLs, observation IDs, FITS HDUs, timestamps, MJy/sr units and hashes. Synthetic fixtures are separate. No new archive acquisition was performed in this audit. |
| Coordinate intake | Numeric and sexagesimal parsing, ICRS requests, bounded field sizes and native preparation are implemented locally. Public arbitrary-position preparation is unavailable at the checked host. |
| Time comparison | Cached restricted M101 pair opens, blinks and wipes, with linked viewport and dates. This is qualitative engineering inspection, not measured motion or calibrated variability. |
| Evidence workflow | Browser checks exercised pixel inspection, question create/edit/locate, ZIP save and reopen, source identities and optional diagnostics. An existing reconstruction receipt records exact agreement for eight SCI/WAVE/BAND/VALID arrays and one question from two original observations. It does not certify interpretation. |
| Scientific screening | Full CWAVE/CBAND association for QR2/D2, common support, coordinate roundtrip and local wavelength tests, plus separate stationary-reference registration checks. Rejections remain explicit. These are engineering gates; full spectral-response equivalence is not established. |
| Five challenge fields | Existing bounded QR2/D2 preparation provides 1, 2, 2, 3 and 2 frames respectively for Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae and R Draconis. **All five have playback disabled.** Presence of the named target, motion and variability are not established. See `web/dist/data/target-status.json` and `docs/evidence/challenge-readiness-20261029/target-results.json`. |
| Spectral presentation | The 102-channel homepage strip uses representative colors and schematic positions. It is not calibrated channel selection, a spectrum, or 102-band temporal coverage. |
| Accessibility and 3D | Science has a direct no-WebGL path. The illustrative real-model hero loads automatically; the optional Universe shares the investigation. Root arrival temporarily makes the scientific page inert; skip and direct scientific links bypass it. Physical-device and human accessibility certification remain absent. |
| Sounds | Normal interactions default on, with saved mute respected. Startup/loading sounds were removed at the user's request. |

### Fresh QA results

- `npm test` in `web`: **143 passed, zero failed**. Log: `tmp/mission-audit-js.log`.
- `.venv/Scripts/python.exe -m pytest -q`: **135 passed, one failed**. `tests/test_mission_control_contract.py:22` rejects `!important` in `web/dist/arrival.css`. This is an actual failing style contract, not evidence that the astrophysical algorithms failed. Log: `tmp/mission-audit-pytest.log`.
- Original product browser run: nine groups passed, tenth failed, later groups not executed. Failure is the old expectation that Universe audio defaults off (`tools/verify_website_product.mjs`, around line 446). The immediately preceding assertions verified questions and display preservation. No page errors or external requests were recorded up to failure. Receipt: `docs/evidence/mission_audit_product_tests.json`.
- An additional audit run adjusted only that stale expectation in memory to match the explicit sound-on preference: **19 of 19 groups passed**, with no page errors or external requests. It exercised fresh-profile imports, 1024/390/320 px layouts, no-WebGL recovery, reduced motion, corrupt-data refusal, keyboard inspection and automated accessibility checks. Those checks had zero violations and one incomplete item each on home and science; this is not full accessibility certification. Receipt: `docs/evidence/mission_audit_current_preferences_product_tests.json`. The application and original test remain unchanged; this does not make the original suite green.
- A bounded synthetic scheduler probe confirmed twelve cancelled tasks remained in the executor queue while only one job counted active. No archive requests occurred. [Probe and reproduction script](evidence/mission-audit-20261029/collect_audit.py), [result](evidence/mission-audit-20261029/queue-probe.json).

Passing software checks do not establish astronomical validity, independent usability or impact. Qualified scientific approval and internal human review remain **PENDING**; independent novice validation remains **NOT CONDUCTED**.

## 3. Top ten issues, ranked by effect on a credible submission

All issues are OPEN. Recommendations below are implementation plans, not completed fixes.

| Rank / severity | Evidence, reproduction and affected files | Corrective action / acceptance condition |
|---|---|---|
| 1 — BLOCKER: reuse eligibility unresolved | Inspect the 37 commits and October artifacts; compare with the official event window and preparation guidance. Entire intended submission affected. | Obtain applicable written rules or organizer ruling covering existing code and data. Preserve disclosure inventory. Follow a fresh-build strategy if required. |
| 2 — CRITICAL: no demonstrated astronomical change | Open cached M101; inspect its limitations. Open all five preset sequence receipts: every `playback_eligible` is false. `sequence.py`, `target-status.json`, `sequence-example.json`. | One real, identified, comparable-epoch case with astrometric controls, original IDs, uncertainty and reconstruction; or explicitly bounded scientifically meaningful non-motion example. Never lower thresholds to manufacture success. |
| 3 — HIGH: public coordinate workflow incomplete | GET public `/api/capabilities` gives 404; localhost returns preparation true. `Dockerfile`, `tools/public_server.py`, `tools/local_server.py`, deployment configuration. | When authorized, deploy and verify the same bounded preparation engine behind HTTPS, persistent storage and exact hosts. Clean anonymous browser must complete coordinate → status → observations → evidence, including unavailable archive recovery. Container build not verified. |
| 4 — HIGH: cancellation bypasses queue bound | Run the isolated probe. One blocked worker plus twelve create/cancel cycles leaves twelve executor items despite the two-active limit. `src/skyshift/jobs.py:create,cancel,_run`. | Retain/cancel queued Futures, account for actual queued/running work until termination, preserve in-flight storage reservation, and add admission/rate controls. Verify repeated cancellation cannot grow work or evade limits. Resolve before public API exposure. |
| 5 — HIGH: spectral and photometric scope narrower than desired science | Read `sequence.py:CALIBRATION,LIMITATIONS` and `/api/capabilities`. Only QR2/D2 is pinned; no PSF matching, background correction, significance image or validated flux-change measurement. | Add only release-specific methods justified by mission documentation and tests. Keep unsupported comparisons blocked. A six-detector sum is not automatically a comparable broadband time series. |
| 6 — HIGH: submission license compatibility unresolved | No root `LICENSE*` found. `web/dist/vendor/scroll/manifest.json` and `GSAP-LICENSE.txt` explicitly identify GSAP's restricted Standard License. | Establish team-owned source license and complete asset/dependency attribution inventory. Resolve GSAP compatibility with terms or remove its optional use when implementation is permitted. Free commercial use does not establish OSI compliance. Other asset rights remain to be fully audited. |
| 7 — HIGH: clean checkout cannot reproduce current product | `git status --porcelain=v1 --untracked-files=all`; native backend, Dockerfile and `web/src` files untracked; no release tag. `pyproject.toml` says 0.2.0; frontend says 0.10.0. README still names older fonts. | When allowed, use `codex/` branch, review specific changes, synchronize accurate version/docs, include all necessary source and lockfiles, and verify a clean install plus immutable release identity. Do not commit private artifacts or bulk-stage the workspace. |
| 8 — HIGH: scientific validation does not establish detection performance | Read `suitability.py`, `registration.py`, target results and reconstruction scope. Reference checks do not identify moving targets; reconstruction proves numerical repeatability, not physical truth. | Define a narrow claim, blinded known-shift/artifact controls and real source verification; report misses and rejected cases. Obtain actual qualified review if possible. Never substitute this AI audit for independent approval. |
| 9 — HIGH: claimed public benefit and originality unmeasured | No documented independent novice study or controlled baseline. Existing tools already provide astronomical data access, FITS display and blinking. Product copy, README and prospective judging narrative affected. | Demonstrate the concrete evidence workflow and measure the user's completion and interpretation first. Record actual observations. Independent novices remain NOT CONDUCTED under current working rules; seek no participants or surveys. Do not claim superiority from this desk review. |
| 10 — MEDIUM: presentation/tests create first-visit and maintenance debt | Original browser suite stops at stale audio default; Python CSS contract fails. `arrival.js` has a 650 ms minimum wait plus 650 + 1,650 + 1,050 ms reveal stages, with an 18 s loading warning. Root science is inert until completion/skip; direct science bypasses it. | Align tests with deliberate current preferences; resolve style contract without weakening functional coverage. Measure time to useful science on a throttled connection. Preserve the requested model but make the science entry unmistakable. Do not claim a novice 10-second comprehension result without measurement. |

## 4. Scientific review and next candidate strategy

The [IRSA mission page](https://irsa.ipac.caltech.edu/Missions/spherex.html) now exposes QR2/QR3, cutout, mosaic, spectrophotometry, source-discovery and moving-object tools. Existing archive functionality sets a high baseline: access to SPHEREx alone is not differentiation.

The [current data-product guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/) specifies that IMAGE includes zodiacal light, WCS-WAVE is intended for visualization, and science analysis should use CWAVE/CBAND. It recommends newer ePSF models, describes the PSF/cutout indexing convention, and provides release-specific flux corrections for combining QR2 with QR3. A matching detector or nominal wavelength is insufficient to justify mixing releases. The current limited adapter and explicit rejections are safer than silently substituting a release, but remain incomplete science coverage.

Registration policy requires at least six references and checks field distribution plus residuals; its median and 95th-percentile limits are 0.25 and 0.50 pixels. Those are current engineering policy values, not independently approved astronomical tolerances. Preserve them and all failures. Determine whether each proposed case supports the claimed physical inference before extending processing.

A focused research lead is [IRSA's 3I/ATLAS resource](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/comet3iatlas/index.html). It supplies an observation table with exposure-specific predicted positions and warns about low signal-to-noise and spatial extension. **This audit has not established a usable SKYSHIFT pair.** During permitted research, inspect metadata, release, wavelength, cadence, field overlap and background-star controls. When implementation is allowed, process a small explicitly selected candidate set with recorded rejection criteria. A target-following cutout can hide sky motion; a demonstration must explain its coordinate frame. Point-source photometry is inappropriate for an extended coma without a justified method.

Do not run another broad pair batch merely to obtain a positive image. If no motion case survives, say so and choose the strongest honest illustration of compatible observation inspection and its limits.

## 5. Challenge coverage and differentiation

Mapping uses the user's supplied statement pending retrieval of the final official page.

| Objective / consideration | Current coverage | Missing proof |
|---|---|---|
| Public coordinates and time sequence | Local native preparation and restricted cached comparison | Public arbitrary-query service and a convincing real change sequence |
| Five named test targets | All fields have real bounded preparation receipts | Target identification and eligible temporal playback |
| Update for new releases | Versioned requests, provenance and explicit unsupported states | Validated QR3 temporal adapter and release-update procedure |
| 102 bands / detector grouping / spectra | Representative illustrative strip; one calibrated temporal detector adapter | Analytical channel selection, valid coadds and spectra; optional in statement |
| Addition/subtraction | Existing restricted qualitative comparison | Validated PSF/background/uncertainty-aware physical differences |
| Field size | Local bounded 1–30 arcminute request | Public reliability and larger-field resource behavior |
| Other telescope context | Gaia stationary references and secondary illustrative/context surfaces | A checked user-facing Gaia/WISE overlay workflow |
| URL queries and metadata | Coordinate state, source identities, timestamps, flags and evidence exports implemented | Clean external-browser query/share verification and user comprehension |

### Bounded comparison with existing tools

This is a primary-documentation desk comparison, not a usability experiment. Absence of a feature in the inspected documentation does not prove its absence from a product.

| Platform | Established capability and relevance | Consequence for SKYSHIFT |
|---|---|---|
| [IRSA SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html) and [MOST](https://irsa.ipac.caltech.edu/applications/MOST/) | Official observations, spectral tools and finding exposures covering predicted moving-object positions. | Do not claim novel archive access, spectra or ephemeris search. Cite original tools and focus on explanation and portable evidence. |
| [Aladin documentation](https://aladin.cds.unistra.fr/java/AladinScriptManual.gml) | Its blink command resamples multiple images using the first image's astrometric solution; image arithmetic and related operations are established. | Blink, reprojection and differences alone cannot support originality claims. |
| [ESA's ESASky description](https://www.esa.int/About_Us/ESAC/Explore_the_cosmos_with_ESASky) | Browser sky exploration, multiwavelength observations, footprints, catalogs and Solar System trajectories. | A sky browser with multiple missions is an established category; adding 3D does not establish better scientific access. |
| [WorldWide Telescope FITS documentation](https://docs.worldwidetelescope.org/webgl-reference/latest/tutorial/fits-images/) | FITS rendering, interactive stretches/color maps and progressive imagery are already supported, with documented format constraints. | Attractive FITS rendering is useful implementation, not evidence of unique scientific capability. |
| [PROJECT SPECTRALx, 2026](https://www.spaceappschallenge.org/2026/find-a-team/spectral-x/) | Public team description proposes an accessible image library and design-focused experience. | Team-authored claims only; no working implementation or eligible reuse was verified. Avoid inferring a competitive ranking. |

Past-winner comparison remains incomplete: a secondary index mentioned 2025 exoplanet projects, but their implementations and current official award pages were not verified here. No claims about beating past winners follow from that search.

**Defensible present positioning:** SKYSHIFT packages a restricted SPHEREx comparison with explicit eligibility/rejection information, original-product provenance and portable user questions that can be reconstructed from the originals. Its intended beneficiaries are curious visitors and educators who need to understand why a comparison can or cannot support a claim. The browser and existing reconstruction receipts support this workflow. No evidence yet establishes that these users complete it faster or more accurately than in other tools. Treat superiority and uniqueness as hypotheses, not submission claims.

## 6. Judging gap matrix and simulated review

These are provisional historical dimensions requested in the mission brief, not confirmed final 2026 criteria or official scores. No numerical award prediction is justified.

| Dimension | Best evidence | Weakness | Highest-value next action after eligibility |
|---|---|---|---|
| Impact | No-account access and saved questions | No measured beneficiary outcome | Observe the user's real task and uncertainty explanation; document results honestly |
| Creativity | Traceable rejection-to-evidence workflow | Established comparison tools already exist | Demonstrate one complete rejected-versus-valid decision and reconstruct its evidence |
| Validity | Real product IDs, masks, wavelength/reference checks and numerical reconstruction | No verified physical change; expert approval pending | One carefully controlled real case plus scientific review |
| Relevance | Native SPHEREx coordinate-to-images engine | Five requested fields cannot currently play; public API absent | Resolve access and meaningful time comparison before optional features |
| Presentation | Coherent homepage, working controls and optional detail | Arrival delay and engineering example can obscure the reason to use it | Direct real-science entry with one concise, defensible explanation |

Simulated perspectives below are analytical roles exercised by this assistant, not independent reviewers or recruited people:

- **Skeptical astrophysicist:** The provenance is encouraging, but no changing point has been identified and shown to survive spectral-response, alignment, PSF and noise alternatives. Refusal to play invalid pairs is a strength, not proof that a valid discovery case exists.
- **Senior software/data engineer:** The native engine and portable receipts are substantial. A static public site, untracked backend source, failing contracts and a bypassable job bound prevent a production-readiness claim. Require clean-clone and external-failure evidence.
- **Nontechnical judge perspective:** The spacecraft is memorable, but the central question is what changed in these real images and why the answer should be trusted. The current engineering example does not yet supply that clear result. Do not turn the evidence panel into another wall of text.

Most compelling: genuine NASA observations, transparent failures, inspectable pixel/metadata controls, no-account direct science, and a reconstruction-oriented question workflow. Most concerning: eligibility first, then lack of a scientifically meaningful central example and the difference between local capability and public delivery.

## 7. Prioritized execution and acceptance gates

1. **Now — Phase 0:** Preserve inventory and source links; retain this report and inquiry draft; monitor final rules. User approval is required before sending the inquiry. An organizer ruling, not a generic user approval to code, must resolve the applicable competition rule.
2. **Now — permitted preparation:** Study current release/calibration documentation and a small candidate observation table; record hypotheses and rejection criteria. Review licensing, security and test debt without changing intended submission implementation. No new broad scientific search, media production or deployment.
3. **First permitted implementation block — P0:** Use an isolated `codex/` branch after scope is clear. Fix job admission/cancellation and test regressions; include necessary source in a reproducible release. Accept only when original suites, cancellation bounds and clean-clone checks pass. Do not weaken science thresholds.
4. **P1 — central proof:** Identify one real astronomical case; verify source and observing frame, compatible wavelengths, stationary controls, artifacts and uncertainty. Export and independently reconstruct it. If it fails, retain rejection evidence and narrow the claim rather than force a result.
5. **P1 — public delivery:** Bring the bounded engine to a user-approved host; verify anonymous coordinate search, cancellation, cache recovery, remote outage and export from a fresh browser. Keep a genuinely supported cached fallback and a direct scientific URL.
6. **P2 — credibility:** Carry out the user's own UX evaluation with measured task time and uncertainty explanation; no independent novice study is claimed. Seek qualified scientific feedback only through an approved communication. Compare the actual same task with established tools before asserting superiority.
7. **P3 — final submission:** Apply the actual 2026 rubric, license/disclosure and format limits; verify source and public links. Prepare project-page text and any newly requested media only when permitted. Clearly separate prior work from work completed in the official window.
8. **P4:** Additional 3D, sounds, spectra or detectors only if the central proof is complete and the remaining time supports meaningful validation.

Completion criteria remain unmet: eligibility resolved; valid core claim; reproducible clean release; functioning public workflow; known high-severity defects addressed; honest human-review status; compliant final submission. This initial audit completes useful preparatory work while leaving the mission itself open.
