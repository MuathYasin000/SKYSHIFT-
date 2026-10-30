# SKYSHIFT 0.11 — implemented scope and acceptance evidence

30 October 2026, Asia/Hebron. Local engineering release; no publication or submission occurred. The latest supplied directive supersedes the earlier planning hold and authorizes this engineering work. It reports organizer approval but supplies no organizer ruling, date, wording or component/development-window scope. Those details remain unverified; no exception or competition eligibility is invented.

Application implementation HEAD: `ddb9759b14ad6275c3e95d0e848f68786d4c33db`, on `codex/scientific-completion`. The baseline was `211c38520880f32596a50f10acb3e5e9e5d8cef0`, with pre-existing uncommitted native-viewer work. Tooling/reporting changes follow the application HEAD. Existing dates and history are preserved.

| Commit | Reviewable change |
|---|---|
| `861b32d` | All-pairs candidate groups, explicit release adapters, native payload generation and scientific tests |
| `765e577` | Survey/Matched timeline controls and inline native originals; preserved and committed the existing standalone native viewer |
| `00f84bf` | Portable exact Gaia snapshots and a real QR3 reference identity |
| `2800361` | Authenticated clean-checkout numerical fixture acquisition |
| `6e57126` | Live-discovered M101 example, native imagery and offline browser validation |
| `ddb9759` | Private filesystem diagnostics and API rejection regression |
| `22c20f4` | Collision-safe native evidence utilities and read-only resource audit |

## What changed

The original application, visual tokens, homepage model, optional Universe, scientific masks, source arrays, comparison engine, notes, exports and independent recovery routes remain in use. There is no second application or new frontend framework.

Discovery queries official SIA metadata, checks spatial footprints and dates, probes at most twelve 64-KiB headers, and acquires one to six selected cutouts. Selection ranks mutually compatible groups by cardinality, time span, worst spectral separation and stable observation identity. Neighboring compatibility never grants approval to an entire group. Full data, mask, wavelength and stationary-reference gates still follow preselection.

Survey Timeline plays genuine chronological observations on a fixed ICRS grid, with each date, wavelength, release, detector and quality fraction visible. It explicitly establishes no physical change. Matched-Wavelength Time Series uses a subset whose every included pair passes the existing engineering checks. Wipe and side-by-side comparisons require the actual screened pair. Shared display limits, stepping, scrubbing, playback speed and optional looping remain separate from scientific calculations. Reduced motion retains manual access and disables automatic playback. Saved investigations retain mode, loop preference, viewport and per-epoch notes.

Native observation inspection is now inside the main workspace: exact detector samples, fit/1:1, pan/zoom, keyboard inspection, original intensity/variance/flags/ICRS/wavelength, percentile or Astropy ZScale limits, linear/asinh/log stretches, palettes and mask display. Native detector axes are explicitly independent of the north-up time grid; starting playback returns to the fixed-sky view. Live preparations carry their own authenticated native payloads, bounded to 400,000 total native pixels and a 32-MiB prepared result. Missing originals and checksum failures never substitute another source. The existing separately attributed DSS2 context remains available through the native viewer.

The versioned release registry distinguishes discovery, visualization and calibrated screening. QR3's real `MSKNnnnn`/`MSKMnnnn` mask schema now works; its integer masks must agree with the declared bit indices. QR2's `MP_` convention remains supported. SOURCE alone remains usable; unknown active bits and other declared quality flags remain conservatively excluded. Cache identities now include native-display, release-registry and public-message code. Public errors redact server paths, while private failure records preserve diagnostics.

## Real observations and release coverage

The new [M101 time explorer](http://localhost:3000/#target-example/m101-time-explorer) is a repeatable cached result from a live coordinate discovery: 85 metadata rows, 82 containing candidates, twelve bounded header probes and two acquisitions. Sources are `2026W20_2A_0464_3` (2026-05-17T10:58:03 UTC) and `2026W26_1A_0500_1` (2026-06-24T03:19:00 UTC), QR2/D2, approximately 1.4893 and 1.4897 micrometres at the requested centre. Eight independent Gaia references pass registration: median residual 0.04559 output pixels, p95 0.29646. This is qualitative matched-wavelength inspection, with scientific approval pending; it establishes neither target motion nor calibrated variability. Its full source/calibration identities, decisions and native arrays are in [the shipped sequence](../web/dist/data/sequence-m101-time-explorer.json).

Actual product tests cover QR2/D2 and QR3/D2. The QR3 sample is observation `2026W30_1B_0001_1`, pipeline 7.0.5, with a 23 × 24 native cutout. Its authoritative SIA smoke query intentionally returned one row with OVERFLOW; that sample is never represented as a complete coverage inventory. Approximate WCS-WAVE supports visualization only. QR3 calibrated temporal analysis, cross-release photometry and authenticated calibration for other detectors remain disabled. Reader declarations for all six detectors do not mean six real-detector validation cases were conducted.

The official [product guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/) and [access guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/) were checked on October 30. They distinguish approximate WCS-WAVE from science CWAVE/CBAND and describe SIA ingestion lag. An empty SIA result is not mission-wide absence. [Endpoint receipts](evidence/master-official-resources-20261030T112005.429540Z-1fab28c0/resources.json) record status, content type, access time, hashes and failures. Challenge/event/terms failed local certificate validation and the independent web fetch returned HTTP 502; Aladin timed out. TLS verification was not disabled.

## Five required targets and the moving-object case

The current engine re-evaluated exact originals and available recorded Gaia references. Every prepared array matches its preserved earlier result exactly. These bounded 12-arcminute search-field tests are not target detections or exhaustive archive searches. Search coordinates retain their recorded epoch context; no target position is silently propagated. Gaia stationary references use the existing proper-motion policy. WISE 0855's supplied coordinate epoch is unspecified.

| Case | Frames | Actual outcome |
|---|---:|---|
| Barnard's Star | 1 | One usable field; no temporal measurement. Earlier centre-excluding selections remain rejected. |
| Epsilon Indi B | 2 | Pipeline and wavelength mismatch; stationary registration fails. No resolved Ba/Bb or motion claim. The separate 68-candidate/12-header negative investigation remains bounded, not exhaustive. |
| WISE 0855 | 2 | Pipeline and wavelength mismatch; registration passes. No source detection or variability established. |
| RW Aurigae | 3 | Wavelength mismatch, some pipeline mismatch, reference catalogue truncation prevents registration approval. |
| R Draconis | 2 | The original wider-field sample fails wavelength comparison despite passing registration. The separately prepared December restricted field passes qualitative comparison, but its target-aperture supports remain invalid: 29/29 and 30/30 pixels. No target flux or variability significance is reported. |
| 3I/ATLAS December corridor | 2 | Actual originals and reference registration pass transport/registration checks; wavelength mismatch rejects comparison. Neither predicted positions nor the field identity establish a measured comet detection or displacement. Earlier rejected August/December alternatives are preserved. |

Individual reports and source identities are in [the six-case summary](evidence/master-scientific-validation-20261030T105955.226440Z-691cc28b/summary.json), which links the exact receipts. Initial verification failures from missing fixture lookup were preserved in the preceding run; only failed cases were retried after fixing lookup. Successful live discovery and QR3 tests were reused rather than unnecessarily reacquired.

## Verification and practical limits

| Check | Measured result |
|---|---|
| Current full Windows Python suite | 189 passed, 1 skipped; two expected FITS long-keyword warnings. [Aggregate receipt and 21-file preservation inventory](evidence/master-final-acceptance-20261030T112607.686782Z-8ea11fd0/verification.json) |
| Clean source at implementation HEAD | Build and dependency checks pass; 181 Python passed, 9 skipped; 162 JavaScript passed. Skips require additional optional historical research caches. Exact seven-original bootstrap fixes the previously discovered missing-input failures. [Receipt and logs](evidence/master-clean-checkout-20261030T111849.148132Z-15d7d284/verification.json) |
| Existing full product journeys | 19/19 Chrome and 19/19 Edge. [Chrome](evidence/verify_website_product-2026-10-30T11-02-16-603Z-9182ac03/master_20261030_product_tests.json), [Edge](evidence/verify_website_product-2026-10-30T11-05-42-990Z-17a1129e/master_20261030_product_tests_edge.json) |
| Existing coordinate/sequence regressions | Seven journeys pass: preparation, private notes, export/reopen, no-WebGL/API outage, responsive access, cancellation and changed field width. [Receipt](evidence/verify_native_sequence-2026-10-30T10-59-24-876Z-cbdf7ba7/browser.json) |
| New timeline/native journeys | Chrome and Edge at 1440 and 390 CSS px; Survey vs Matched restrictions, scrubbing, export/reopen, native payloads without installed native catalogue, disabled WebGL, API outage, keyboard inspection, reduced motion and zero checked WCAG rule violations. [Chrome](evidence/master-mission-2026-10-30T11-14-38-926Z-0bd497da/results.json), [Edge](evidence/master-mission-2026-10-30T11-14-50-540Z-cd103974/results.json) |
| Cached frame switching | Recorded browser-driver click round trips 15–41 ms on this machine across both browsers/widths. This includes automation scheduling, is not an FPS measurement and does not certify internet/mobile-device performance. |
| Independent native reference | Preserved NumPy/reference comparison: 99,792 native pixels, zero differing RGB channels; exact originals, flags and variance are checked again by current tests. [Original comparison](evidence/scientific-visualization-20261030/reference-results.json) |
| Final Linux image/service | Fresh pinned dependency installation, build from clean source, nonroot UID 999, read-only root, 2 CPUs/2 GiB, trusted Host/Origin and request limits, bounded cancellation, real two-frame preparation and identical result after SIGTERM/restart. [Final receipt](evidence/master-linux-ddb9759-20261030T1120/verification.json) |

The final Docker image is `skyshift:time-explorer-ddb9759`; deployment templates continue to prepare one same-origin Python service with persistent storage. The verification containers expose loopback ports only. The normal local application remains [localhost:3000](http://localhost:3000/), version 0.11.0, UI content identity `f23779040caf5438a81e85d925dfe636306a0c4c62d197fbff2d1314398cd725`. No account, DNS, spending, public deployment or submission was performed.

Before/after UI screenshots use unique directories. [Before, 1440 px](evidence/master-mission-2026-10-30T10-39-12-758Z-460d4e62/before-1440.png), [after, 1440 px](evidence/master-mission-2026-10-30T11-14-38-926Z-0bd497da/after-1440.png), [native M101 desktop](evidence/master-mission-2026-10-30T11-14-38-926Z-0bd497da/m101-native-1440.png), [native M101 mobile](evidence/master-mission-2026-10-30T11-14-38-926Z-0bd497da/m101-native-390.png). These illustrate interface changes, not astrophysical change. Historical evidence was not overwritten; the earlier incident involving four unrecovered historical screenshots remains documented and unresolved.

## Acceptance disposition and remaining dependencies

| Gate | Disposition |
|---|---|
| A Coordinate-to-observation | PASS locally: authoritative live query, bounded acquisition and truthful failures |
| B Temporal experience | PASS locally: explicit chronological Survey Timeline and matched subset playback |
| C Scientific comparability | PASS engineering checks; thresholds and rejection gates unchanged; scientific approval pending |
| D Moving-object investigation | PASS bounded negative case; no verified source displacement |
| E Five named targets | PASS bounded field evaluations and evidence; target detections are not established |
| F Native imagery | PASS integrated native originals and independent viewer retained |
| G Updates | PASS supported QR2/QR3 discovery and real D2 ingestion; unknown conventions require adapter work |
| H Reproducibility | PASS measured-array reconstruction and exact source/reference identities; original FITS are referenced, not invented |
| I Unified design | PASS internal automated/visual inspection; user remains the sole human UX evaluator |
| J Reliability | PASS reported suites and local Linux checks; no claim of physical-device or external load certification |
| K Deployment preparation | PASS local preparation; publication intentionally on hold |
| L Scientific honesty | No motion, calibrated variability, expert approval or NASA endorsement claimed |

The entire competition mission is not declared unconditionally finished. Final official challenge/resources/judging guidance could not be verified; the organizer's exact reuse ruling and development window have not been supplied. Future resources must first exist and then be tested. Publication is expressly deferred. Qualified scientific approval and internal human review remain PENDING; independent novice evaluation remains NOT CONDUCTED by user direction. These statuses are not replaced with automated test counts.

Optional validated difference images, detector coaddition, fitted spectra and additional catalogue overlays remain unsupported where their calibration/PSF/background/uncertainty validation has not been established. They are not represented by subtraction of stretched images, pooled epochs, guessed channel availability or predicted motion vectors. Existing 102-channel explanatory graphics are not advertised as 102 interchangeable observed temporal frames.

Four internal simulated reviews agree on the boundary: the astronomer sees authentic but conservative qualitative evidence; the engineer sees bounded reproducible processing; the first-time-visitor simulation can find coordinates, play actual dates and inspect native pixels; the challenge-judge simulation sees the requested workflow locally, with public publication and final eligibility still unresolved. These are internal AI review perspectives, not independent people or NASA review.

## Reproduction and release integration

From a clean checkout: install `requirements-lock.txt`, install this package with `pip install --no-deps -e .`, run `python tools/bootstrap_test_inputs.py`, then `python tools/build_frontend.py`, `python -m pytest -q` and `node --test web/tests/*.test.mjs`. Additional research-cache tests may skip until their documented exact inputs are supplied. `tools/verify_master_checkout.py CHECKOUT --acquire-fixtures` captures these stages in a fresh directory. The root workspace's complete existing research cache exercises the larger 189-pass suite.

`tools/verify_mission_science.py` repeats exact named-target/comet inputs, a pinned real QR3 sample and one bounded live M101 search; it never overwrites historical runs. `tools/verify_master_mission.mjs` exercises the new UI, and existing browser suites remain available. Under Linux, `tools/verify_linux_service.py --container EXPLICIT_LOCAL_CONTAINER --port LOOPBACK_PORT` verifies preparation and restart; it intentionally stops and restarts that named test container.

For a new release: record official documentation and access date; discover authoritative URLs; declare an explicit registry entry; check product/HDU, pipeline, flags, dimensions, time/WCS and calibration changes; pin exact calibration associations and reference identities; run rejection controls and real fixtures; verify rendering and portable evidence; enable only the operations that passed. New observations within supported conventions require no hard-coded manual source insertion. Unseen releases, detector/calibration associations and product conventions do not gain automatic scientific support.
