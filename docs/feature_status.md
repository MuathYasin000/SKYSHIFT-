# Implementation status

Local release 0.3, 16 October 2026. Scientific snapshot 0.2.0 is preserved unchanged. This evidence register supplements the unchanged master plan and backlog. Completion is independent of an event deadline.

Current additions: independent localhost production server and Windows launchers; Home/Explore/Compare/Discover/Methodology redesign; authentic attributed mission composites; four larger single-exposure contexts across three real fields; asinh/linear/log display, grayscale/false-color palettes, smooth/pixel sampling, wipe overlay; versioned presentation extension in evidence exports; end-to-end authenticity audit and independently re-fetched archive/calibration matches. Ordinary static assets, source, data, scripts and release snapshots remain local. No ChatGPT hosting service is required. See [0.3 verification](redesign_verification_0.3.md).

**Acceptance distinction:** the 0.2 browser checks below are historical. Release 0.3 additionally passes 17 explicitly authorized independent Playwright Chromium checks, including inspected desktop/mobile layouts, browser export/reopen, full-packet download, reduced-motion and integrity-failure behavior. Work's integrated browser permission is unchanged. Broader browser/device testing and real novice sessions remain open.

| Area | Actual status | Evidence / remaining work |
| --- | --- | --- |
| Python package, CLI, environment | Implemented and tested | Exact Windows lock; inventory, inspect, screen, schema, export, reconstruct, review |
| Archive acquisition/provenance | Implemented and exercised | Seven initial cutouts, two larger M101 context cutouts, calibration, alternative samples |
| FITS, units, timestamps, flags | Implemented and tested | Supported QR2/QR3 adapter; DATE/MJD consistency; conservative named-flag masks |
| Full original M101 field | Rejected | All 21 sample pairings fail; decisions preserved |
| Restricted M101 field | Engineering pass, scientific PENDING | Width 0.04 deg; 94.44% support; maximum spectral diagnostic 0.24662 |
| Initial registration sample | Failed and preserved | Two references insufficient for coverage gate |
| Independent reference registration | Numeric policy passes | 13 Gaia references, four quadrants, median 0.31 arcsec, p95 2.01 arcsec; no fitted correction |
| Calibration/PSF/background/artifacts | Diagnostics implemented, specialist interpretation PENDING | Public ePSF, pipeline HISTORY, original flags; no photometric equivalence established |
| Alternative fields | Bounded investigation completed | 45 M67 and 55 NGC188 pairings all rejected by unchanged spectral policy |
| Common-grid arrays and masks | Implemented and reconstructed | Ten arrays, WCS, hashes; unsupported intensity remains NaN |
| Browser application | Implemented | Static HTML/JS replaces planned Streamlit frontend; scientific Python retained |
| Shared viewport, side-by-side, A/B | Implemented and browser exercised | Shared orientation, pan/zoom, intensity transform and limits |
| Optional blinking | Implemented | User initiated, slow; hidden-tab stop and reduced-motion support |
| Coordinate notes | Implemented and browser exercised | Add/edit/delete/locate; ICRS and common-support validation; tab-local |
| Export / reopening | Implemented and browser exercised | Compact comparison ZIP plus complete source review packet |
| Reconstruction | Implemented and exercised | Ten arrays reproduce exactly; saved annotation and viewport verified |
| Internal human technical review | PENDING | Complete packet and independent-review instructions prepared; no sign-off invented |
| Qualified scientific approval | PENDING | Specialist questions documented |
| Synthetic/failure/security controls | Implemented and tested | Shifts, PSF/background changes, masks, corruption, unsafe ZIPs, forged approval |
| Public deployment | Implemented and verified | Public Sites version 3; exact source/packet identities in deployment.md |
| Usability | PENDING | Five novice sessions still require real participants |
| Report/deck/demo | Implemented and verified | Seven-page report, eight slides, 180-second narrated screenshot walkthrough; original concept artifacts preserved |

Tests establish checked software behavior, not discovery sensitivity, scientific suitability, reviewer qualifications, or novice-user effectiveness.
