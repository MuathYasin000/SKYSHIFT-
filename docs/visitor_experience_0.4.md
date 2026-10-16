# Visitor experience 0.4

16 October 2026. Local engineering release. The immutable scientific snapshot remains 0.2.0, pair `pair-52ad675d929b0740c23b`. No scientific approval or astronomical discovery is claimed.

## Implemented experience

Explore presents three real sky regions with an object description, real exposure preview, available dates and explicit availability. Every field can be explored as a single exposure. Only the small M101 field offers a limited comparison, with scientific approval PENDING. M67 and NGC 188 remain single-exposure contexts. Educational object descriptions link to official NASA pages and do not identify every bright patch or infer cluster membership.

The larger M101 context is explicitly distinguished from the 24 × 24 prepared comparison. The image is infrared intensity, not visible color; the cutout does not show the galaxy's full spiral structure. Blue areas are excluded or unsupported data. Zoom and smooth interpolation add no scientific resolution.

Compare provides three visible steps: look at both dates, explore a detail, save a question. UTC dates use readable month names. Side by side, switch dates, zoom/reset and Add a note are immediately available. Wipe/blinking, appearance settings, precise intensity limits and dense diagnostic records remain available under collapsed sections. Blinking remains optional, slow and disabled for reduced-motion preferences.

The annotation dialog asks a question first and keeps click-derived coordinates attached under an advanced section. Explicit coordinate entry remains available. Export/reopen preserves the original scientific schema, prepared FITS, hashes, notes and viewport, plus the separately hashed 0.3 visualization extension. No server upload, database or account was added.

Both viewers offer a Data & original sources panel. The first layer explains original exposure → preparation → view. Original FITS/calibration URLs and exact processing/hash records remain clickable or expandable. Hash agreement is described as integrity, not scientific approval. Technical metadata is not removed; it is deferred until requested.

Explore loading clears the previous product, hides the previous image and disables source/export until the selected file's identity is verified. Stale asynchronous responses cannot replace a newer selection. Corrupt bytes produce an explicit error and retry, not an empty-sky result. Loading animation respects reduced motion.

## Executed engineering checks

- 92 Python tests passed, including synthetic registration controls, scientific integrity, real reconstruction, packet security, local server and independent release snapshots. JUnit: `docs/evidence/python_0.4.xml`.
- 32 JavaScript tests passed, including the added field-availability, educational-source, UTC-date and contextual-help contracts. JUnit: `docs/evidence/javascript_0.4.xml`.
- 22 fresh-profile Playwright Chromium acceptance cases passed on the workspace application. These cover field selection/history, source dialogs and focus return, date selection, export, linked comparison settings, notes, optional viewing modes, ZIP reopening, invalid coordinates, corruption, exact full-packet download, delayed/damaged exposures and reduced motion. Responsive checks use 1440×1000, 1024×768, 390×844 and 320×740 viewports. The two narrow layouts also exercise date switching, click-to-note, export and reopening.
- The same 22 cases passed independently against the standalone production snapshot on port 3001, hosted with Python `-I -S` (isolated mode, without site packages). The temporary port-3001 server was stopped afterward. All 77 inventoried production files matched their checksums; all 24 preserved scientific/imagery assets matched the 0.3 snapshot and workspace byte for byte. Scientific processing code remains unchanged from the completed 0.3 handoff. Receipt: `docs/evidence/release_0.4_integrity.json`.
- Axe-core 4.14.0 WCAG 2.1 A/AA tagged scans cover five main pages and an open provenance dialog. No detected violations remain in those scans. Manual-review/incomplete findings are preserved; this is not a WCAG conformance certification. Keyboard information dialogs, Escape/focus return, navigation, narrow-page overflow and reduced-motion behavior were separately exercised.
- The actual browser comparison export reconstructed with the original local cache. All ten scientific arrays matched with maximum absolute error 0.0, one annotation passed support validation, and original pair identity remained unchanged. Result: `docs/evidence/reconstruction_0.4.json`.
- The complete review packet download retains SHA-256 `2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78`.

Chromium is the tested browser, not a claim of verified support on every browser or physical device. Network routing was restricted to localhost during browser checks; no external runtime requests or uncaught page errors were observed. Work's integrated browser permission was not changed. The user explicitly authorized independent local Playwright testing.

## Defects found and corrected

The actual new annotation dialog originally lacked an accessible name; it now uses its visible heading. Axe exposed a header accessible-name mismatch and color-only inline links; the header now uses its complete visible text and paragraph links are underlined. The delayed-load check protects against showing a previous image under a newly selected field's label. Responsive checks protect against horizontal overflow and exercise the saved-question workflow on narrow screens.

The first video capture failed because its automation clicked an off-screen position after scrolling. The incomplete raw capture was retained separately, and the recording script now scrolls the image into the viewport before clicking. This was a capture-script failure, not a successful recorded annotation or a human usability finding.

## Actual application walkthrough

`output/video/SKYSHIFT_Actual_Application_Walkthrough_0.4.mp4` is a three-minute continuous recording of the actual localhost application. It shows field choices, available exposures, source/context panels, the limited M101 comparison, linked viewing controls, a clearly labeled demonstration question, browser download and reopening. Its interactions are scripted Playwright actions. Narration uses a disclosed generic installed Windows voice; English captions are embedded as a selectable subtitle track and supplied as an SRT. No human presenter or human usability study is claimed. The last recorded frame is held briefly to fill the exact 180-second encode; no astronomical imagery is generated or enhanced for the video.

Verification: 1280×720, H.264 at 25 fps, 4,500 frames, AAC audio, one subtitle track, 180.0 seconds. The raw continuous WebM, actual example ZIP, exact action timeline, browser version and capture metadata are retained in `output/video/visitor-0.4-raw`. Eight extracted QA frames were visually inspected. Incomplete capture and the first short encode are preserved separately in `visitor-0.4-rejected-01`; neither is a successful demonstration. Original project media, 0.2 materials and 0.3 screenshot-based update remain unchanged. This is an application demo; any later event-specific presenter rules still require explicit assessment and genuine human footage where required.

## Responsible expansion investigation

The existing wider-region rejections are retained. A new bounded experiment screened smaller 0.04-degree regions with the same policy, original QR2 data and full calibration: 45 M67 pairings and 55 NGC 188 pairings, **zero engineering candidates**. One additional file in each field could not cover the requested center and was recorded as an input failure. No thresholds changed, no registration was asserted for those pairs, and no new temporal comparison was enabled. Summary: `docs/evidence/expansion_0.4.json`; full per-pair diagnostics: `research/expansion-0.4/`.

This rejects those sampled pairs at the tested center/size; it does not establish that the whole archive or every future observation is unsuitable. Expanding comparison responsibly still requires suitable native observations, masks/calibration, the unchanged engineering checks, independent source registration and appropriately qualified assessment.

## Human review and remaining limits

The user explicitly chose to be the sole human UX evaluator. Their direct feedback is the primary human input. **Independent novice validation: NOT CONDUCTED**, not a development blocker. No recruitment, surveys or participant management were created. Automated tests and scripted demonstration actions do not establish human comprehension or user-study outcomes. See `usability_protocol.md`.

Internal human technical review: **PENDING**. Suitably qualified scientific approval: **PENDING**. Full response equivalence, calibration UUID associations, local registration interpretation, PSF/background differences, blending and instrumental artifacts still need the documented specialist assessment. The application offers qualitative engineering inspection with visible restrictions, not quantitative variability, precision astrometry or confirmed discovery.

## Local operation and maintenance

Run `start_skyshift.bat`, then use http://localhost:3000/explore.html or http://localhost:3000/compare.html. Stop with Ctrl+C or `stop_skyshift.bat`; restart with the startup script. Python 3.11+ and a modern browser suffice for prepared viewing. Source, assets, original scientific data and releases remain in `D:\Nasa_SKYSHIFT`. No hosting credential or internet is needed for the curated viewers, source metadata, notes, exports or reopening. Opening external NASA/archive links, new observations and live catalog queries need internet. Numerical offline reconstruction additionally needs pinned scientific dependencies and the complete source cache/review packet.

Frontend is buildless. For regenerating these two pages/controllers, run `tools/build_visitor_pages.py` and `tools/upgrade_visitor_controllers.py`; their preserved 0.3 templates make the migration reproducible. The current built HTML/JS/CSS are ordinary tracked source. `redesign_web.py` is the original base editorial builder; if rerun, follow it with the visitor page builder to retain the new Explore/Compare layout. Scientific arrays/FITS are not rewritten by these builders.

The versioned production snapshot and checksums are under `output/local-production/skyshift-0.4-visitor-verified`. It uses the same independent standard-library local server with gzip transport compression. Earlier public deployment, 0.3 snapshot, complete backup, Git histories and original project media remain preserved. No public publication was attempted.
