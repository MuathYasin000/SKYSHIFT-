# Maintainer handoff

The six-person responsibility baseline remains in the master plan. No owner's review or completion signature is inferred. Current scientific and internal human review both remain PENDING.

## Code and source

The root Python project contains archive, products, coordinates, suitability, registration, response, preparation, evidence and CLI modules, with tests and exact Windows dependency lock. The browser implementation is modular: science.js handles coordinates/arrays/display validation; packets.js handles bounded ZIP import/integrity/trusted-baseline validation; app.js handles rendering and user interaction. Static HTML/CSS requires no framework build.

The frontend web/ is a separate Sites source repository, linked to the root repository. Its hosting project identity is persisted in .openai/hosting.json. Source repository access may require a short-lived Sites credential through the native source helper even though the website is public. Never persist a token. Restore to the exact source commit recorded in deployment.md; no force push is needed.

Large scientific inputs and prepared/export artifacts are excluded from source control and preserved in the full hashed review packet. Treat the immutable ZIP as canonical. Installing a reproduction source package can create build/egg-info caches in its extracted working directory; do not use that worked directory as a new evidence snapshot. A documentation revision must derive from a verified immutable packet, as the correction tool demonstrates.

## Tests and preparation

Run Python tests and node --test web/tests/*.test.mjs. Optional real-data integration tests skip explicitly if the local source snapshot is absent. Inspect skips. Do not infer scientific approval from test completion or a CLI zero exit status.

Use tools/build_review_release.py with a new immutable name for actual scientific preparation changes. Use tools/build_web_data.py for browser arrays/metadata and hashed review parts. Re-run affected unit/failure checks, clean reconstruction, browser comparison/export/reopening and public integrity checks. A changed scientific identity must not reuse saved-comparison state.

The current package supports only the declared QR2/QR3 layout, bilinear preparation, no background subtraction or PSF matching, and pending/rejected scientific decisions. Adding calibrated photometric comparison requires a justified uncertainty/covariance model, response assessment, controls and qualified review before enabling claims in the UI.

## Deployment and artifacts

Follow deployment.md and the Sites skill. Source and hosting assets must match a pushed commit. The Windows Bash-wrapper packaging limitation has a documented equivalent staging/native-tar workaround using the unchanged plugin preparation helper. Keep the exact scientific packet, source commit, site version and final artifact inventory in separate backups.

The PDF builder uses ReportLab and Windows fonts. The presentation builder uses the Codex bundled artifact-tool runtime and validates package/layout/import before visual inspection. The walkthrough builder uses actual slide/screenshot renders, local Windows SAPI narration, PyAV and bundled ffmpeg. These authoring dependencies are separate from the runtime application environment. Authoring source and narration text are preserved under tools/; rendered assets are under output/ and private build files under tmp/.

The user interface has no account system, analytics or remote notes storage. Do not add a server dependency, external upload or automatic detection feature without an explicit need and the corresponding tests/acceptance evidence. Imported notes are untrusted text and must remain textContent-based. Scientific metadata remain separate from user interpretation.

## Work requiring people

Provide the complete packet and reviewer guide to an independent team member. Record actual findings and limitations. Obtain specialist assessment of spectral response, calibration association, local registration and instrumental effects. Conduct five novice sessions with the recorded protocol and fix/retest observed issues. These gates cannot be closed by an automated report or a fabricated identity.
