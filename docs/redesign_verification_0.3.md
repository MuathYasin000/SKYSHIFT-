# Local release 0.3 verification

SKYSHIFT runs independently from `D:\Nasa_SKYSHIFT` at **http://localhost:3000**. Double-click `start_skyshift.bat`; stop with Ctrl+C or `stop_skyshift.bat`, and restart with the startup script. The original public 0.2 deployment is historical and unchanged. No hosting credentials or account restoration are required.

## Actual implementation

Five responsive pages: Home, Explore, Compare, Discover SPHEREx, and Methodology. Locally stored official NASA/JPL-Caltech SPHEREx composites have explicit categories, credits, source links and hashes. Educational Hubble imagery is labeled separately in credits. No NASA insignia or endorsement is used.

Four reproducible single-exposure contexts cover M101, M67 outskirts and NGC 188. Native/prepared geometry, grid scale, spectral ranges/bandwidths, exact UTC exposure times, detector/pipeline, archive/calibration URLs and hashes are inspectable. An ICRS schematic marks only our three regions. Single-exposure JSON export preserves source identity, numeric array hashes, viewport and display settings. Wider temporal comparison remains unsupported.

The restricted M101 workflow retains science snapshot 0.2.0 and pair `pair-52ad675d929b0740c23b`. It supports synchronized pan/zoom, keyboard pan, side-by-side, A/B, optional blinking, wipe overlay, masks, ICRS notes, ZIP export/reopen and full review-packet download. Display choices include shared linear/asinh/log, grayscale/ember/ice palettes, and smooth or prepared-pixel sampling. Log applies `log1p(100 × normalized display intensity) / log1p(100)` after display clipping. Negative measured flux remains unchanged. Mask overlay stays nearest sampled. No sharpening, generative fill or super-resolution is present.

`visualization.json` is a separately hashed, strictly validated extension. The science manifest stays schema 1.0 and Python science package stays 0.2.0 to preserve evidence identity. Browser reopen restores the full extension. Python reconstructs scientific arrays, validates annotations and restores core manifest display settings. Older exports remain supported.

## Executed checks

| Check | Actual result | Evidence |
| --- | --- | --- |
| Python suite | **92 passed** | `docs/evidence/python_0.3.xml` |
| JavaScript suite | **28 passed** | `docs/evidence/javascript_0.3.xml` |
| Independent local Chromium suite | **17 passed**, no script errors or external runtime requests | `docs/evidence/browser_0.3.json` |
| Source authenticity | Four re-fetched M101/calibration hashes match; all ten browser arrays match FITS and fresh preparation | `docs/evidence/provenance_audit_0.3.json` |
| Context preparation | Four contexts reproduce byte-for-byte, native science and conservative-mask checks pass | `tests/test_exploration_assets.py` |
| Actual browser export/reopen | QA note, log display, ice palette, pixel sampling and 35% wipe restore | `output/browser-0.3/browser-comparison.zip`, `comparison-reopened.png` |
| Actual browser review-packet download | 40,697,263 bytes; SHA-256 `2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78` | `output/browser-0.3/m101-review-v6-browser.zip` |
| Offline reconstruction from browser export | All ten maximum errors **0.0**, one labeled QA annotation verified | `docs/evidence/browser_reconstruction_0.3.json` |

The user explicitly requested the independent Playwright path after Work's browser integration reported disabled local browser use. The runner uses a fresh test profile and never modifies Work permissions, accesses a signed-in profile, restores Sites credentials or publishes. Its route guard blocks all non-local runtime destinations; none were attempted.

Desktop 1440×1000, tablet 1024×768, mobile 390×844 and narrow 320×740 viewports were exercised. All five pages had no horizontal overflow. Screenshots were inspected. Mobile navigation, reduced-motion blink disabling, keyboard navigation/pan, actual downloads, corrupt-import rejection preserving the current note, and changed-bundle integrity failure were tested. These are Chromium viewport checks, not physical-device or all-browser certification. No novice-user result is claimed.

For a new development machine, install Node and the declared Playwright dev dependency (`npm --prefix web install`), install its matching Chromium (`npx playwright install chromium` from `web`), start SKYSHIFT, then run `node tools/verify_browser.mjs`. Existing browser/module paths can be supplied in `SKYSHIFT_CHROMIUM_EXECUTABLE` and `SKYSHIFT_PLAYWRIGHT_MODULE`. Website startup requires neither Node nor Playwright.

## Passed and open gates

Passed: preserved science identity; archive-to-browser authenticity; conservative masks; reproducible single contexts; local HTTP/security controls; inspected Chromium layouts; browser annotation/export/reopen; full-packet integrity; offline numerical reconstruction.

PENDING: real independent human technical review; qualified astronomical assessment; full spectral-response/calibration-UUID interpretation; five novice sessions; broader browser/physical-device testing. No confirmed motion, variability, significance map or discovery. Tested wider M67/NGC 188 pairs remain rejected.

All supplied pages, imagery, curated data, controls, notes and evidence exports/reopening use localhost. New observations, live catalog queries and external source links require internet. Reconstruction works offline with pinned dependencies and local originals from the full packet. `tools/build_local_release.py` creates an independent static production snapshot with server, launchers, metadata, gzip transport and checksums, preserving previous releases. The same assets can later use an independent provider and domain.
