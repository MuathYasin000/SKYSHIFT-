# Maintainer handoff

The six-person responsibility baseline remains in the master plan. No owner's review or completion signature is inferred. Current scientific and internal human review both remain PENDING.

## Code and source

The root Python project contains archive, products, coordinates, suitability, registration, response, preparation, evidence and CLI modules, with tests and exact Windows dependency lock. The browser implementation is modular: science.js handles coordinates/arrays/display validation; packets.js handles bounded ZIP import/integrity/trusted-baseline validation; app.js handles rendering and user interaction. Static HTML/CSS requires no framework build.

The frontend `web/` is an ordinary tracked directory in the root repository. SKYSHIFT's default development and execution environment is independent localhost hosting. No Sites credential, source helper, active hosting identity or external account is needed. Historical frontend Git history and public identity are preserved separately in `output/history/` and `docs/history/`; do not restore the old hosting dependency. See `local_hosting.md` and `local_release_handoff_0.4.md`.

The visitor layer consists of `field-guide.js` (educational copy), `visitor.js` (context/provenance), `catalogue.js` (validated local catalogue), `viewport-input.js` (shared mouse/keyboard/touch gestures), `sky-projection.js` / `sky-atlas.js` (ICRS field-centre locator), `exploration-memory.js` (public local view history), `exposure-questions.js` / `exposure-notebook.js` (validated, tab-local questions), and `explore.js` (single-exposure viewer). Rebuild only HTML using `tools/build_visitor_pages.py`; it does not rewrite unchanged files. JS controllers are maintained directly. The historical `tools/upgrade_visitor_controllers.py` refuses to overwrite newer functionality. Preserve scientific arrays and pair identity when changing presentation only.

Explore emits the unchanged 1.0 record when no questions are included; 1.1 adds bounded coordinate questions tied to the exact product hash. Import validates all scientific metadata and every question against the decoded quality mask. Private question text uses separate session storage, never automatic localStorage view history or a remote service. Storage denial has an explicit JSON-save fallback.

Orion’s source/inventory/independent four-array checks are in `docs/evidence/m42_single_context.json`; originals are in `data/raw/m42_context`, with query evidence in `research/m42-targeted`. `tools/add_orion_context.py` records the one-off targeted acquisition; do not rerun it to reproduce. Offline reconstruction uses `.venv/Scripts/python.exe tools/reconstruct_orion_context.py --output <new-directory>`. The historical base preparer fingerprint and previous four payloads remain unchanged. Calibration retrieval time was not recorded in the original sidecar and remains null. No temporal test or qualified approval is asserted for Orion.

Large scientific inputs and prepared/export artifacts are excluded from source control and preserved in the full hashed review packet. Treat the immutable ZIP as canonical. Installing a reproduction source package can create build/egg-info caches in its extracted working directory; do not use that worked directory as a new evidence snapshot. A documentation revision must derive from a verified immutable packet, as the correction tool demonstrates.

## Tests and preparation

Run Python tests and node --test web/tests/*.test.mjs. Optional real-data integration tests skip explicitly if the local source snapshot is absent. Inspect skips. Do not infer scientific approval from test completion or a CLI zero exit status.

Use tools/build_review_release.py with a new immutable name for actual scientific preparation changes. Use tools/build_web_data.py for browser arrays/metadata and hashed review parts. Re-run affected unit/failure checks, clean reconstruction, browser comparison/export/reopening and public integrity checks. A changed scientific identity must not reuse saved-comparison state.

The current package supports only the declared QR2/QR3 layout, bilinear preparation, no background subtraction or PSF matching, and pending/rejected scientific decisions. Adding calibrated photometric comparison requires a justified uncertainty/covariance model, response assessment, controls and qualified review before enabling claims in the UI.

## Deployment and artifacts

Use `start_skyshift.bat` for the workspace and `tools/build_local_release.py` for an independent, versioned production folder. Verify its hashes and browser workflow. Keep the exact scientific packet, source commit and final artifact inventory in separate backups. `deployment.md` records the historical public release; no public publication or credential restoration is required. Future independent public hosting should use the ordinary static files under the user's chosen provider/domain.

The PDF builder uses ReportLab and Windows fonts. The presentation builder uses the Codex bundled artifact-tool runtime and validates package/layout/import before visual inspection. The 0.3 walkthrough uses actual slide/screenshot renders. The 0.4 walkthrough records the actual localhost browser using `tools/record_visitor_demo.mjs`, with disclosed automated actions. `tools/synthesize_visitor_demo.ps1` supplies generic Windows narration and `tools/build_visitor_video.py` encodes real footage/captions using PyAV and ffmpeg. No human presenter is synthesized. These authoring dependencies are separate from the runtime application environment. Source and narration text are under tools/, rendered assets under output/, private build files under tmp/.

The user interface has no account system, analytics or remote notes storage. Do not add a server dependency, external upload or automatic detection feature without an explicit need and the corresponding tests/acceptance evidence. Imported notes are untrusted text and must remain textContent-based. Scientific metadata remain separate from user interpretation.

## Work requiring people

Provide the complete packet and reviewer guide to an independent team member. Record actual findings and limitations. Obtain specialist assessment of spectral response, calibration association, local registration and instrumental effects. Human scientific gates cannot be closed by an automated report or a fabricated identity.

The user explicitly chose to be the sole human UX evaluator and declined participant recruitment/studies. Use direct user feedback for design corrections; do not create surveys or repeatedly request other testers. Independent novice validation remains NOT CONDUCTED, not a development blocker. Automated browser checks and recorded actions are engineering evidence, not independent human comprehension results.
