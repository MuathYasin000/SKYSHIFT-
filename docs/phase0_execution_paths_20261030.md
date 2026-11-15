# SKYSHIFT Phase 0: decision-ready execution paths

Prepared October 30, 2026, Asia/Hebron; research receipts were recorded October 29 UTC. This is a planning and metadata-research document. No competition implementation was changed. Neither path is authorized to start. Independent organizer, scientific and human review remain pending.

## Decision to make

**Highest-priority scientific objective:** establish one reproducible, fixed-sky comparison of two genuine SPHEREx observations in which an identified object's displacement can be distinguished from wavelength, registration, PSF, masking and noise effects. A moving marker at a predicted position is not a detection. A visually interesting pair is not automatically a valid time comparison.

The new research identifies two geometrically plausible 3I/ATLAS pairs, but neither is validated. The minimum success target is a public, no-account coordinate-to-observations workflow with one defensible temporal example, clear limitations and an original-data evidence receipt. A discovery claim, spectrum, full-sky coverage and new 3D features are outside the minimum.

### Organizer ruling → action

| Ruling / condition | Decision | What may start |
|---|---|---|
| Existing application reuse expressly approved, with allowed components, modifications and development window identified | Path A, limited to that written scope | Only the approved work, when that window opens and user authorization covers it |
| Existing solution reuse prohibited; fresh entry and specified preparation/tools/materials allowed; event window confirmed | Path B | Fresh development during that window, using the approved material list only |
| Partial reuse approval | Classify every component/material separately. Treat unapproved items as excluded; use a reduced A or B scope | Only after ambiguities affecting the intended solution are resolved |
| Reuse allowed but pre-event modification not allowed | Retain Path A plan and existing evidence | No implementation before the event start |
| No response, contradictory guidance, unclear time zone, or no permission for a fresh entry after prior work | HOLD | Continue permitted reading/documentation only; do not presume either entry eligible |

The organizer ruling must answer: whether the team can enter at all after prior development; reuse of code, design, data products, tests, AI prompts/assets and documentation; what counts as new event work; whether these planning/research outputs can be consulted or carried forward; permitted tools and third-party licenses; exact Universal Event start/end/timezone; required prior-work and AI disclosures. Preserve the ruling's source/date and map its wording to the inventory. Do not interpret a general encouragement to prepare as an exception.

The prior report contains a concrete [unsent inquiry](mission_audit_20261029.md). No organizer communication has been sent. No approval has been invented. The existing daily rules watch remains in place; no duplicate automation was created.

### The nominal 48-hour window is not established

The indexed [2026 event page](https://www.spaceappschallenge.org/2026/) says project submission opens Saturday November 14 at 09:00 and closes Sunday November 15 at 23:59 local time: **38 hours 59 minutes**, not 48 full hours. A submission opening time alone does not prove the authorized development start. Universal-specific timing still needs confirmation. Direct Universal and team-guide fetches again returned 502; no new final ruling was verified.

The plans below fit within that shorter elapsed span, with a target submission at H36 and contingency through H38:59. H0 means the **confirmed authorized development start**. If it differs from submission opening, recompute the budget using the earlier applicable deadline. Do not assume Asia/Hebron or an old team-owner timezone rule governs Universal. H39–H48 are unavailable for pre-deadline work unless organizers expressly establish a longer window. A shorter ruling means dropping scope, not starting early or submitting late.

## Common controls before either path starts

1. Record an applicable organizer decision and the actual authorized window, plus final challenge/submission requirements. Registration/team eligibility, source rights and current guide compliance remain separate checks.
2. Preserve the October project, commit dates, evidence and releases. Never relabel research or old outputs as work produced during the event.
3. Create an approved-material register with source, license, origin date, ruling reference, permitted purpose and approval status. Missing or conditional approval is not a checked permission.
4. Confirm one individual can run the plan; team size, available hours, hosting capacity and budget are not established. The elapsed schedules are estimates with rest/recovery allowances, not verified delivery forecasts.
5. Keep the user as the sole human UX evaluator. Do not recruit participants, send expert requests, buy hosting, publish, or create media under this planning authorization. Scientific and human approval stay pending until actually documented.

### Material boundaries

| Material | Path A | Path B |
|---|---|---|
| Existing source, scientific algorithms and tests | Reuse only components expressly covered by ruling | Excluded; do not copy, port, paraphrase code, or feed it to AI to reproduce a fresh-looking version |
| Existing frontend, CSS, 3D, sounds, fonts and other assets | Preserve approved working features; resolve individual rights | Excluded unless separately and expressly permitted; use a fresh minimal interface during event |
| Existing processed FITS arrays, masks, prepared pairs, notes, schemas and exports | Use only if approved, with pre-event origin disclosed | Excluded by default; fresh acquisition alone does not make copied processing or analysis eligible |
| Generic installed tools / public libraries | License and competition-use approval required | Only specifically allowed tools; candidate list is Python, Astropy, NumPy, a browser and basic web tooling. Being installed or open source does not itself establish event permission |
| Official public mission docs, metadata and raw archive products | Cite sources, respect rights and ruling | Use/reacquire only as permitted; independently available raw data is distinct from SKYSHIFT's derived products |
| This plan, candidate shortlist, research calculations and past AI conversation | Disclose as pre-event planning; consultation/reuse scope must be allowed | Not presumed eligible background. Obtain explicit permission to consult/use; do not smuggle them into a new project's prompts or source |
| Organizer-provided starters/resources | Follow their final terms | Only expressly permitted starters; record exact version/license and any limits |

If Path B disallows using the shortlist, the team must conduct permitted discovery afresh during the event and disclose its prior research. This report does not certify a “clean room”: the same people already know the prior project. Ask the organizers how their fresh-entry rule handles that fact.

## Path A — approved reuse, minimum changes

### Ordered work and acceptance gates

| Priority | Minimum intervention after authorization | Evidence required to accept it | Stop / scope reduction |
|---|---|---|---|
| A0 Scientific feasibility | Start with a two-epoch QR2/D2 case; examine originals, masks, local calibration and reference stars. Keep existing thresholds and rejected cases | Original observation/calibration identities, verified headers, stable-sky frame, measured reference residuals and target evidence; explicit uncertainty | If no case survives the fixed investigation budget, retain independent-frame inspection. Do not market it as successful motion comparison |
| A1 One real temporal demonstration | Use the existing native investigation engine and viewer. Add only case-specific explanation, source identification and necessary scientifically justified processing | Export/reconstruct the approved pair; show measured source behavior separately from predicted track and display stretch | No target-fitted alignment, threshold relaxation, silent release fallback or unsupported flux claims |
| A2 Queue safety before public preparation | Fix admission/cancellation accounting against actual executor work; hold reservations until in-flight work ends; limit abuse and storage | Existing twelve-cancel reproduction cannot grow pending work beyond policy; queued/running/final states and restart/outage behavior checked | Keep public preparation disabled until safe. Static cached inspection is a fallback, not arbitrary-query preparation |
| A3 Reproducible release | Review necessary untracked source, lock dependencies, resolve source/asset licensing, align version/docs and fix known test regressions | Clean checkout/install builds the approved release; scientific numerical identities match; original suites and focused regressions pass | No bulk staging, history rewriting or mixing old/new work without disclosure |
| A4 Public end-to-end delivery | Serve the same bounded engine over HTTPS with exact host rules, persistent cache and a genuine cached fallback | Fresh anonymous browser: coordinates → truthful job status → observations → supported comparison → source evidence → export/reopen; archive outage and no-WebGL recovery exercised | Hosting requires user approval before publication; failure is reported as a public-service gap, not hidden behind a static health response |
| A5 Submission quality | Concise statement of the tested claim, working public/source links, methods, limitations, licenses, AI and prior-work disclosures | Final 2026 field/format checks, source-link checks and user review | No media or branding work unless separately authorized and permitted |

The previous audit's findings are inputs, not newly repaired issues: Python had 135 passes and one CSS-contract failure; the original browser suite had a stale sound-default assertion. The audit-adjusted browser run passed 19 groups. No test suite was rerun here because implementation did not change. Updating assertions to reflect deliberate current behavior must not weaken scientific tests.

No general rewrite, extra Universe feature, new sound design, six-detector coadd, automated detector, significance map or spectra is necessary for the minimum. A new detector adapter enters scope only if a justified candidate requires it and the time budget supports validation.

### Conservative event schedule

| Elapsed | Planned outcome / decision |
|---|---|
| H0–H2 | Confirm ruling/window, approved baseline and material register; open an isolated `codex/` branch only when authorized |
| H2–H6 | Inspect a bounded candidate set: at most the two D2 pairs below, no broad pair search. Make go/no-go decision on motion case |
| H6–H10 | Resolve queue safety and failing contracts; keep unsafe public work closed |
| H10–H14 | Complete one valid native comparison, reconstruction and concise case explanation; narrow scope if science fails |
| H14–H20 | Rest/recovery allowance and contingency; not assumed productive work |
| H20–H26 | Clean release and approved public deployment; exact identities and error recovery |
| H26–H30 | Scientific/software regression plus fresh-browser primary journey |
| H30–H34 | Final submission requirements, disclosures and user review |
| H34–H36 | Freeze and submit only with authorization and confirmed compliance |
| H36–deadline | Buffer for genuine failures and permitted corrections; no optional expansion |

These are budget caps, not a promise that scientific feasibility will be solved in four hours. If a blocked stage consumes the next stage's safety or verification allowance, reduce deliverable scope.

### Minimum achievable target, conditional on evidence

One approved, reproducible two-epoch comparison in the existing public interface, coordinate entry for supported requests, original-data evidence, clear refusal of unsuitable observations, safe bounded public preparation, and honest submission disclosures. If the backend cannot be deployed, a public cached example with coordinate-based selection is a useful **partial** deliverable; it does not fulfill arbitrary sky-position preparation. If source motion cannot be established, a real observation inspector is also partial and must be described that way.

## Path B — reuse prohibited, fresh solution during permitted window

### Scope and provenance

At the confirmed start, create a separate empty project in a separate directory. Do not fork/copy the old repository, extract its bundled libraries/assets, reuse its processing schemas or pass old solution code into a generator. Leave SKYSHIFT intact. A new Git history proves neither independent creation nor eligibility by itself; keep the material register, actual timestamps and truthful attribution.

Use only specifically approved generic libraries and official source materials. Design and write the new implementation during the authorized period. Do not create a scaffold, app template, preprocessing notebook or submission-ready dataset now. This document supplies planning decisions, not prepared competition code.

The minimum product has one scientific workflow: enter RA/declination, retrieve a bounded supported field, list real observation dates and local wavelength/quality information, compare only compatible observations on a common fixed-sky view, and download a small evidence record referencing the originals and processing method. One known example provides a repeatable path into the tool. There is no account system, Universe, 3D loader, sound system, automatic discovery claim or broad spectral analysis.

For a small public deployment, prefer an easily auditable finite admission policy over building a complex scheduler. Whatever design is written during the event must bound work, transfer size and storage and recover truthfully from errors. If reliable live preparation is not achieved, a finite set of freshly prepared, permitted real fields can support coordinate lookup; clearly state its limited coverage. Do not present lookup as all-sky archive retrieval.

### Build sequence within a nominal 48-hour event

| Elapsed, capped at actual deadline | Fresh work planned | Exit condition |
|---|---|---|
| H0–H2 | Verify fresh-entry eligibility, materials and exact deadline; initialize empty project and disclosures | No prohibited material admitted |
| H2–H6 | Independently acquire permitted metadata and a small raw-data set; test a single scientific claim | At least one usable pair or explicit decision that only single-frame inspection is supported |
| H6–H10 | Write the smallest acquisition/preparation path using approved public tools; handle coordinates, units, masks and source identities | Two real frames have defensible common support/calibration and separately checked registration |
| H10–H14 | Write one simple web view with date selection, manual A/B and optional blink, concise uncertainty and evidence download | User can inspect the actual supported field without local developer assistance |
| H14–H20 | Rest/recovery and contingency | No assumption of continuous 48-hour staffing |
| H20–H26 | Bound the public service, deploy with approval, add a truthful permitted cached fallback | Anonymous public coordinate workflow or documented finite-field limitation |
| H26–H30 | Focused malformed-input, mask/alignment, corrupt-source, outage, keyboard/mobile and evidence-reconstruction checks | No known unreported blocker; failures narrow the claim |
| H30–H34 | Clean-install verification, original-source/third-party attribution, final required project text and AI disclosure | Another environment can reproduce the stated result; review still pending where not obtained |
| H34–H36 | User review, compliance check and authorized submission | Links/fields work within final 2026 requirements |
| H36–H38:59 | Deadline buffer if this is the confirmed window | No last-minute new science feature |
| H39–H48 | Not available under the currently published submission span | Use only if a written applicable ruling actually grants these hours before deadline |

If the team cannot establish a defensible pair by H6, stop pursuing a motion claim. A real single-frame/availability inspector with refusal reasons is an honest fallback but not the requested temporal-success result. If the minimum cannot be built and checked within the window, submit only what is actually eligible and functional, if final rules allow; do not label a plan, simulator or predicted marker as implemented science.

## Scientific feasibility research — shared questions, not an approved dataset

### Source record and independent cross-check limits

[IRSA's 3I/ATLAS resource](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/comet3iatlas/index.html) provides exposure-specific predicted positions and warns that the comet has low signal-to-noise at many wavelengths and is spatially extended. It discourages point-source spectrophotometry for the extended object. The [December study](https://arxiv.org/abs/2601.06759) reports resolved dust/gas structures and a large CO2 coma; that does not establish detectability in these D2 frames or validate our proposed pairing.

The [official observation table](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/comet3iatlas/obscore_3I_Atlas.vot) was retrieved as 276,887 bytes, SHA-256 `11ff6a524c1b344b3c15c4875429b5b89fd053a18eef4d66328a5632382ef4af`. It contains 259 detector rows and 133 distinct observation IDs, all labelled `spherex_qr2`. This snapshot does not show whether QR3 reprocessing exists elsewhere.

Research receipts are under [phase0-paths-20261029](evidence/phase0-paths-20261029/metadata-inventory.json). XML and Astropy parsers agreed on all row IDs, detectors, releases, epochs and predicted coordinates. Spherical separations were recomputed with an independent haversine formula and agreed within 0.0000001 arcsec. Time intervals agreed between MJD arithmetic and datetime conversion within 0.001 s. Tangent-plane polygon results were cross-checked using spherical edge half-spaces. These are numerical-method cross-checks by this assistant, **not independent scientific approval**. No separate human reviewer has verified the research or plan.

No FITS image, calibration array, cutout or new scientific image product was downloaded or processed. Five deliberately selected metadata pairs were examined, not a candidate batch search. Five small DataLink responses resolved product/calibration URLs. No intended-submission code or ready-to-submit imagery was produced.

### Candidate decisions

Identifiers and date/cadence facts below come from the official table; displacements, trail estimates and geometric checks are our calculations. Detailed coordinates and URLs are retained in `candidate-geometry.json` and `resolved-product-links.json`.

| Candidate | Epochs / detector | Metadata-derived geometry | Decision now |
|---|---|---|---|
| DEC-D2, first investigation priority | `2025W50_2A_0685_1` → `2025W50_2A_0698_1`; December 14, 2025; D2 | 94.421 min; predicted displacement 275.170 arcsec, about 44.74 native 6.15 arcsec pixels | Geometric candidate only. Large visible-scale displacement and existing A-path adapter are reasons to inspect it first; D2 detectability is unknown |
| AUG-D2, alternate | `2025W32_2D_0189_1` → `2025W32_2D_0201_1`; August 8; D2 | 101.175 min; 167.522 arcsec, about 27.24 pixels | Geometric candidate only; an alternate if December is unusable, not a verified backup |
| AUG-D5, conditional research lead | Same August observation IDs, D5 | Essentially the same displacement | Strong molecular-band interest from published science, but unsupported by the existing D2-only adapter. No assumption of compatible local wavelengths or detected emission |
| SHORT-D2 | August 1, `2025W31_2A_0219_1` → `_0219_3`; D2 | 4.298 min; 7.069 arcsec, about 1.15 pixels | Reject for Path A's unchanged minimum cadence of 14.4 min; also a weak visual-motion example. Not a claim that subpixel astrometry is impossible |
| SEASONS-D2 | August candidate's first epoch → December candidate's first epoch | Approximately 82.40 degrees apart; both positions are not in both footprints | Reject as a same-patch small-field blink. Separately recentered comet images would answer another question and must not imply a fixed-sky motion comparison |

For DEC-D2 and AUG-D2, both predicted positions and the corners of a proposed 12 arcminute field lie in both metadata polygons. Suggested research centres are respectively (167.242872°, +5.134202°) and (247.691511°, −16.914681°). Those fields are not prepared and their common valid-pixel support is unknown.

### Release and calibration compatibility

DataLink resolves both AUG-D2 products under `qr2/.../l2b-v20-2025-264`, and both DEC-D2 products under `qr2/.../l2b-v20-2025-349`. Both pairs point to D2 spectral calibration `cal-wcs-v4-2025-254`. This supports an internally consistent metadata lead **within each pair**, not proof that actual FITS `CAL_VER`/pipeline headers, hashes or response functions match. D5 resolves a different detector calibration and is not substitutable for D2.

The [current IRSA data-product guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/) requires science use of CWAVE/CBAND rather than the visualization WCS-WAVE approximation. IMAGE has not had zodiacal light removed. The guide describes updated ePSFs and release-specific corrections for mixing QR2 with QR3. For this minimum, prefer one release and compatible processing within a pair; do not combine QR2/QR3 without a justified, tested method. A whole-detector wavelength range does not establish the passband at the moving source or stationary references. The same source at different detector positions can be measured at different wavelengths.

### Observing geometry and unresolved quantities

Keep a common celestial frame fixed to background sources; do not align on the comet. Label any comet-centred view separately. Compare predicted positions with observed extended emission, not a forced point-source fit. The pixel displacement above uses native sampling, not measured PSF resolution or detection significance.

Nominal exposure-smear estimates from pair-average rates are approximately 5.52 arcsec for DEC-D2 and 3.13 arcsec for AUG-D2. These assume linear motion during an exposure and are not measured trailing. Frame-specific angular rates, spacecraft orbital parallax and integration timing can change them. A coma's morphology and wavelength dependence make a nucleus-centroid displacement especially uncertain.

The VOTable supplies exposure start/end and predicted coordinates but does not document the prediction's observer, orbital solution, uncertainty or exact within-exposure epoch. Its converted dates are nominal UTC interpretations consistent with observation titles; verify original FITS time system and midpoint before an astrometric claim. Heliocentric/observer distance, phase angle, solar elongation, projected anti-solar direction and a proper positional error budget are **not measured here**.

[JPL Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html) documents observer-dependent, light-time-aware ephemerides and uncertainty outputs. [MOST instructions](https://irsa.ipac.caltech.edu/applications/MOST/instructions.html) describe midpoint predictions and geocentric distance/phase fields. Do not silently substitute geocentric or apparent coordinates for spacecraft-observed ICRS/J2000 positions. Verify the observer and frame, preserve query/solution identity, and quantify any difference. Neither a fresh Horizons result nor a spacecraft ephemeris was obtained in this pass.

### Acceptance / rejection contract for later permitted investigation

All thresholds are engineering policy until scientifically reviewed. For Path A preserve current policy; Path B must choose and justify its own method during the event without copying prohibited implementation.

1. **Identity:** originals, calibration associations, times, units, release and processing versions must be verified. Stop on unavailable/corrupt/mismatched originals or unknown active flags.
2. **Spectral comparability:** inspect calibrated local wavelength/bandwidth at both comet locations and common background support. A-path current maximum separation is 0.25 of the smaller bandwidth across common usable pixels; this remains only a necessary engineering screen, not response-function equivalence. Reject failures and unsupported calibration.
3. **Coverage:** ensure both source locations, a justified extended-source aperture and reference region have valid support in both epochs. Preserve at least the existing 50% common-support policy for A, but do not let an overall fraction excuse a masked source.
4. **Alignment:** verify independent stationary sources, field distribution and residuals. A currently requires at least six references, median ≤0.25 pixel and 95th percentile ≤0.50 pixel, plus distribution controls. Never fit the comet into alignment or relax these criteria to save the case. A WCS roundtrip is not registration evidence.
5. **Source evidence:** require real image support for the identification at both epochs, consistent with verified predictions and uncertainty. Inspect blends, ghosts, saturation, flags, PSF differences and background structure. Unknown or marginal signal is rejection of the claimed demonstration, not permission to draw a synthetic source.
6. **Claim scope:** no calibrated flux change, morphology change, significance map or new discovery without appropriate PSF/background/noise treatment and uncertainty. Unnormalised display brightness is not photometry. Difference images are optional and carry a higher validation burden than honest manual A/B inspection.
7. **Repeatability:** preserve all attempted/rejected cases and reconstruct the accepted example from exact original identities in a separate environment. External scientific approval remains pending unless actually obtained.

Budget the first permitted investigation to the two D2 pairs: at most four science cutouts and the required associated calibration/reference material, with bounded retrieval. No full-archive download. If both fail, record why. D5 is a separate methodological decision, not an automatic expansion. During Phase 0, remain at metadata/documents only.

## Minimum deliverable and release decision

| Outcome by the allowed deadline | Defensible deliverable | Claim not allowed |
|---|---|---|
| Valid pair, safe public service, reproducibility verified | Public coordinates → real observations → supported comparison → evidence receipt; clear provenance and uncertainty | Discovery, full-sky temporal capability or broader validation than actually tested |
| Valid pair; live service not ready | Public finite-field comparison with exact supported coordinates, original sources, reproducible evidence and honest coverage statement | Arbitrary-position preparation or production backend readiness |
| Images available; no valid comparison | Real observation/availability inspector, independent epochs, explicit refusal reasons and limitations | Successful motion/variability demonstration; full challenge completion |
| Eligibility/window/material permissions unresolved | Preserved prior project plus planning/research report only | An eligible completed competition entry |

Planned independent checks before final acceptance are a clean-environment reconstruction and fresh-browser journey; they have not been executed for these candidates. The user may review the plans now. Organizer eligibility review, qualified scientific review, internal human review and new-solution delivery are all **PENDING**. The only substantiated results of this pass are sourced metadata, explicitly limited calculations and documented conditional plans.
