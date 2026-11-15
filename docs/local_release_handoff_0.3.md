# SKYSHIFT 0.3 local handoff

**Open http://localhost:3000.** The workspace application is running as an independent local background process. Stop it with `stop_skyshift.bat`. To restart, run `start_skyshift.bat`, which opens your browser and keeps the server in its own window. Python 3.11+ and a modern browser are sufficient for prepared-data viewing; this computer already has the required interpreter and pinned scientific environment.

The redesigned Home, Explore, Compare, Discover and Methodology pages use local assets and real SPHEREx data. Three real fields provide larger single-exposure contexts. The original restricted M101 comparison preserves the exact science snapshot, engineering thresholds and pending approval state. Annotations, saved comparisons, full review-packet download and offline source-based reconstruction work without Sites.

## Verified release

- Source milestone: `2f914976e436a9aff0a0df37c687b85055319a57`.
- Production folder: `output/local-production/skyshift-0.3-local-verified` (run its own startup script after stopping the workspace server).
- Production verification: all 71 inventoried files match `SHA256SUMS.json`. Its self-excluding inventory makes 72 files total. The snapshot ran with isolated Python and third-party packages disabled.
- Automated checks: 92 Python, 28 JavaScript, and 17 independent Chromium checks against both the workspace and standalone production snapshot.
- Browser widths: 1440, 1024, 390 and 320 pixels. Layout screenshots inspected. No horizontal overflow, script errors or external runtime requests in the test suite.
- Actual browser comparison export/reopen restores the explicit QA note and presentation settings. All ten scientific arrays reconstruct offline with maximum error 0.0. Browser review-packet download matches its original exact SHA-256.

## Backup and restoration

Complete backup: `output/SKYSHIFT_Local_Full_Backup_0.3.zip`.

- Size: 1,794,053,182 bytes.
- SHA-256: `dd7df5852375eae12afb2eb5994934938ea366a189123225390a4a3b55810b0a`.
- 1,088 source/scientific/research/output members verified by hashes, plus backup manifest and restoration instructions.
- Includes all raw, calibration, prepared and exported scientific datasets; source and pinned locks; research/source snapshots; official assets; current and historical release materials; production snapshot; and verified portable root/frontend Git histories.
- Excludes installed virtual environments/dependencies, transient state, stop tokens, caches, temporary directories and older backup ZIPs. Existing excluded backup ZIPs remain on disk. See `docs/evidence/local_backup_0.3.json` for the exact declared exclusions.

Extract into a new empty folder, validate `BACKUP_MANIFEST.json`, and run the startup script with Python installed. Reinstall pinned scientific dependencies if reconstructing on a new computer. For application rollback, stop the current server and start an older production folder. The historical public 0.2 deployment and identity are unchanged.

## Offline scope and remaining gates

The supplied site, images, curated observations, controls, notes, export/reopen and review-packet downloads use localhost only. New NASA/IRSA observations, live catalog queries and external links require internet. Numerical reconstruction can use local originals from the full review packet, with the pinned scientific dependencies installed.

Human internal technical review, suitably qualified astronomical assessment, five novice usability sessions and broader browser/physical-device checks remain open. Full spectral-response equivalence and calibration UUID association need specialist judgment. Scientific approval remains **PENDING**. No astronomical discovery or reviewer approval is asserted.

Optional Work browser integration instructions are in `browser_work_permissions.md`; the separate Playwright tests required no change to that setting. Future independent hosting can serve the same ordinary static assets under your own domain. The frontend is now part of the root repository rather than an account-dependent hosted Git submodule; its complete prior history is preserved.
