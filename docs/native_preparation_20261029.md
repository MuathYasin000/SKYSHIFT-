# Native coordinate preparation and competition handoff

This revision connects a public visitor workflow to the existing scientific engine: enter ICRS coordinates and field width, prepare real SPHEREx cutouts, inspect chronological frames, attach a question and save/reopen a self-contained prepared-data ZIP. The real hero model and optional Universe remain separate from scientific loading. No discovery, measured target motion, calibrated variability, human review or NASA approval is asserted.

## Requirement and acceptance register

| Objective | Implemented behavior | Limitation / next work | Observable acceptance |
| --- | --- | --- | --- |
| Coordinates → images | Homepage form and `/api/investigations` prepare a fixed north-up requested field with real arrays | Availability and preparation can fail upstream; selection is bounded, not exhaustive | Clean-profile browser submits coordinates and receives real frames without a terminal |
| Actual field width | Same existing 6.15″/pixel ICRS grid at 1–30′ requested width; native support remains masked | Requested area is not a promise of full usable coverage | Metadata/shape and support masks correspond to the request; no unrelated field substitution |
| Chronological sequence | 1–6 frames in one native investigation, gaps, previous/next, play/pause, wipe and side-by-side against a reference epoch | Playback and paired presentation require every temporal link to pass existing wavelength/support and stationary-reference checks | Manual frames always work when prepared; rejected links cannot enable comparison modes |
| Scientific comparability | Existing `screen_pair`, `RegistrationPolicy` and native Gaia reference fitting reused unchanged | PSF/background/response-function limitations remain; no photometry or target identification | Export includes every decision and rejection, not only accepted links |
| Five required targets | Real QR2/D2 cutouts prepared at all five supplied search centres | Field inspection only; no target identification, motion or calibrated variability established | Each has a hashed cached example and documented outcome; unsuitable playback stays disabled |
| Evidence | Versioned sequence ZIP includes prepared arrays/masks, source/calibration URLs/hashes, decisions, notes, epoch and display | Original FITS are references, not embedded; hashes are not signatures | Browser round trip and original-FITS numerical reconstruction agree |
| First minute | Coordinate entry in the hero, explicit group/release, direct verified example and native scientific access | Subjective user acceptance is still for the user to evaluate | Primary coordinate action remains visible at tested narrow widths; no WebGL required |
| Optional enhancement | Toggle for proper-motion propagated Gaia reference positions when available | Predictions are not SPHEREx detections; only measured registration references are included, not a full Gaia overlay | Toggle is absent without reference data; labels distinguish predictions |
| New releases | Explicit release/group requests, archive adapter and pinned calibration registry | Full scientific calibration adapter currently QR2/D2 only; other supported inputs are manual visualization unless calibrated checks can run | Unknown versions/calibrations/flags cannot silently gain comparison eligibility |
| Public delivery | Same-origin Python site/API entrypoint and container recipe; static stage retains cached examples | Docker/Linux build and actual external HTTPS deployment have not been verified | Public readiness requires testing the actual deployed URL signed out |

Scientific approval and internal human review remain **PENDING**. Independent novice validation remains **NOT CONDUCTED**. The user is the sole human UX evaluator. Browser checks use isolated profiles and mobile emulation, not recruited participants or physical-device certification.

## Five real-data test outcomes

The bounded test requests QR2, D2, 12′ width and at most three fixed chronological samples per target. The initial broad metadata timeouts are retained. Retrying those failures adds the documented SIA BAND restriction for the requested detector, rather than repeating the same search strategy. Download failures, product rejection, spectral mismatch and failed/incomplete reference checks are preserved.

| Search field | Prepared frames | Temporal playback | Interpretation |
| --- | ---: | --- | --- |
| Barnard’s Star | 1 | Unavailable | Independent field inspection |
| Epsilon Indi B | 2 | Disabled | Independent field inspection; Ba/Bb not claimed resolved |
| WISE 0855 | 2 | Disabled | Independent field inspection; challenge position has no inferred reference epoch |
| RW Aurigae | 3 | Disabled | Independent field inspection; no calibrated variability; reference catalogue truncation is retained |
| R Draconis | 2 | Disabled | Independent field inspection; rejected cutout and comparison evidence retained |

These are actual acquisition/preparation tests, not five successful astronomical detections. Source coordinates retain their catalog/challenge epoch context. No target proper motion was silently propagated; the 12′ query is a fixed search footprint, not a position prediction. Gaia reference propagation and exclusion policies are unchanged. The engineering M101 example supports screened playback but does not demonstrate measured motion or brightness variability.

Full outcomes: `docs/evidence/challenge-readiness-20261029/target-results.json`. Browser-delivered example identities: `web/dist/data/target-status.json`. Exact source FITS are stored once in the content-addressed `data/cache/cutouts` cache, with provenance sidecars. Acquisition and failure receipts remain in `data/investigations`. `tools/stage_target_examples.py` copies only changed prepared JSON into the site; it does not regenerate scientific arrays or media.

## Architecture, resource limits and privacy

`tools/local_server.py` still defaults to loopback. For the workspace it additionally serves the same-origin preparation API. Static snapshots without the scientific runtime report that preparation is unavailable; cached examples and imported evidence still work.

One worker runs preparations; at most two jobs may be active/queued. Requests accept at most six frames and 30′ width. Each cutout transfer is capped at 20 MB, metadata at 8 MB, prepared results at 32 MiB, and acquisition/receipt caches have separate 512 MiB admission limits. Limits stop new work without deleting scientific evidence. In-flight archive I/O can finish after cancellation, but cancelled results cannot replace the active view. Identical completed requests reuse recent receipts, including across server restart when their code revision matches.

The service processes coordinates/release/group only. Questions are not submitted to it. Small sequence settings and private questions use tab session storage when available; arrays stay in immutable receipts or exported packets. Export before closing the tab. Public history does not contain question text. Imported packets never cause the browser to fetch their supplied source URLs. Large/unsafe ZIP layouts and inconsistent arrays/metadata are rejected before replacing the current view.

The explicit archive-refresh option bypasses installed-original and recent-receipt shortcuts. Cached originals are not used to stand in for a larger requested field. Existing single-exposure JSON 1.0/1.1 remains supported; new categorized single-exposure questions export as version 1.2. Temporal sequence ZIPs use their own versioned record kind.

Sequence results include source/calibration identities, acquisition context, code hashes and numerical dependency versions. Reconstruct prepared arrays and supported annotations with installed trusted code:

```powershell
.venv/Scripts/python.exe -m skyshift.cli reconstruct-sequence path/to/investigation.zip --output tmp/new-reconstruction --source-cache data
```

This does not newly approve registration or scientific interpretation and does not execute packet-supplied code. The existing comparison JSON/ZIP formats and reconstruction commands remain supported.

## Public deployment candidate

An ordinary static upload cannot provide on-demand FITS preparation. It can serve the verified examples, existing comparison and self-contained sequence imports. Full preparation requires the Python runtime and persisted cache/receipt directories.

`tools/public_server.py` serves both the same static application and `/api` behind a same-origin HTTPS reverse proxy. It requires exact allowed Host headers through `SKYSHIFT_PUBLIC_HOSTS` or `--hosts`; no wildcard or cross-origin preparation is enabled. The local shutdown endpoint is unavailable in public mode. Put the service behind HTTPS, preserve the public Host header and route both documents and `/api` to the same service.

The root `Dockerfile` packages the pinned runtime, existing site, two authenticated M101 originals, their pinned calibration and reference catalogue. It does not package the full raw-data workspace or create a second scientific implementation. Persist `/app/data/cache` and `/app/data/investigations`. Configure a host name and writable volume ownership for the container user. Docker was not available in this environment, so the recipe is **not build-verified**; Windows local runtime tests do not establish Linux compatibility.

No external deployment was performed. The Netlify/static candidate must be described as cached-example capable unless it is connected to a deployed same-origin preparation service. Verify the actual hosted build, original-source retrieval, recovery and export/reopen signed out before claiming public readiness.

## Competition and AI disclosure

The development record is pre-event work. [Official 2026 local-event guidance](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/) states that teams must not develop the solution they intend to submit before the official hackathon begins. This is a material eligibility issue for this existing application. A Universal Event organizer determination and the final 2026 submission/judging guidance remain unverified; no eligibility or organizer approval is claimed. Do not relabel pre-event development as hackathon work.

This implementation used Codex assistance for code, tests and drafting. The new astronomical frames derive from original SPHEREx FITS through numerical processing; no AI-generated astronomical frames were added. Existing asset manifests retain their separate sources and terms. Final project-page declarations must follow the current organizer requirements, not historical assumed rules.

For the project explanation, describe the demonstrated value as **guided, traceable qualitative temporal inspection with explicit compatibility limits**. Explain the exact working visitor path, the five limited target-field outcomes, source data and citations. Do not promise Planet X discovery, all-sky availability, 102-channel extraction, calibrated difference images or validated photometric variability.

Direct checks of the production 2026 Universal Event, participant FAQ and resources URLs returned HTTP 502 during this audit. Search exposed a staging Universal Event page with test content; it was not treated as a final rulebook. Current Universal Event treatment of pre-existing work and AI assistance therefore remains **UNVERIFIED**, rather than inferred from 2025 guides. The local-event guidance above is a documented eligibility concern, not a Universal Event ruling.

## Final engineering verification

- Python: **136 passed**. JavaScript: **142 passed**, including all five cached target grids and rejection of a deliberately shifted centre. FITS decimal-header rounding is allowed only within 1e-10 degrees; scientific screening thresholds were not changed.
- Browser checks: **7 native-sequence**, **19 existing product**, **7 recovery**, **8 homepage/hero startup** and **5 coordinate-search** groups passed. Evidence is in `docs/evidence/native-sequence-20261029/browser.json`, `native010_product_tests.json`, `native010_recovery_tests.json`, `home-startup-20261029/browser.json` and `coordinate-search-010-20261029/browser.json`.
- The final browser-exported sequence ZIP reconstructed all **8 numerical arrays** exactly from original FITS and retained one supported question. Receipt: `tmp/native010-final-reconstruction/reconstruction.json`. This verifies reconstruction, not the question's interpretation.
- One measured cached/recent-receipt run loaded two real 24 × 24 frames for a 2.4′ request in **2,007 ms**, with a **121,764-byte** prepared response on this Windows machine in isolated Chrome. This is not a fresh-archive or public-network performance claim.
- The existing staging directory `tmp/skyshift-upload/dist` was incrementally updated as `skyshift-native-preparation-20261029`: **177 source files**, content identity `5bf6278013b96d5bf719c3be34cd2f9a34df52009c6168e020c7845bf240a759`. Asset, scientific-array and sequence checks passed. This is a local static deployment candidate; full on-demand service, Docker/Linux execution and actual published signed-out behavior remain unverified.

No videos, recordings, presentations, voiceovers, promotional media or PDF reports were created for this revision.
