# SKYSHIFT

Traceable qualitative inspection of real SPHEREx observations, developed by Project Mercury Team.

**The 0.7 workspace is an independent, locally hosted SPHEREx observation and comparison website. Scientific approval and internal human review remain PENDING.** The science snapshot and reconstruction engine remain version 0.2.0. Engineering screens do not establish a discovery, motion or variability.

The homepage opens directly to the scientific website: real observation previews, a prominent **Explore & Compare Observations** action, simple navigation, official contextual imagery and locally licensed Manrope / Source Sans 3 typography. **Compare** opens the existing restricted M101 pair in one action. **Observations** selects real single-exposure fields. Dates, wavelengths and availability remain visible; source records, display controls and questions use optional panels. Single-only fields do not display unusable comparison controls.

**The website and optional 3D Universe share exactly one investigation, scientific engine and Canvas2D viewports.** No Three.js or model asset is required for the initial website or scientific workflow. Universe modules load only on entry; an optional, bounded spacecraft viewer loads on request within **Discover SPHEREx**. Returning from 3D retains scientific settings and notes. Scientific inspection, synchronized side-by-side / draggable wipe / A–B / optional slow blink, coordinate questions and validated JSON/ZIP export/reopen work without WebGL. There is no scientific iframe.

Private questions and comparison settings remain in validated tab-session storage; public last-view history contains no question text. Save an investigation before closing the tab or moving devices. JSON references a hash-verified local exposure; comparison ZIPs include prepared FITS, masks, diagnostics, provenance and file hashes. The original full review packet remains downloadable. Direct `/explore.html` and `/compare.html` are independent recovery/research tools.

All supplied viewing assets/data work offline. Original audio starts muted with separate interaction/ambience volumes. Conceptual light diagrams are not optical ray traces, live pointing or simulated measurements. Published images from different missions remain contextual examples, not matched comparisons. No NASA Eyes assets were extracted. Official references and terms remain in the asset manifests.

Current browser verification: `tools/verify_website_product.mjs` (stable alias `tools/verify_immersive.mjs`) and `tools/verify_website_recovery.mjs`. Receipts use the `website07_` prefix under `docs/evidence`; prior versions' suites and receipts are historical. See [current status](docs/feature_status.md), [data dossier](docs/data_dossier.md), and [reviewer instructions](docs/reviewer_guide.md).

The earlier frozen-startup repair increases the Windows connection backlog and reuses HTTP connections. Failed website imports expose independent observation links; optional graphics failures preserve scientific access. Server identity is available at `/healthz`. The user's earlier responsiveness confirmation is not a claim of manual evaluation of this redesign.

## Use the application

Double-click **[start_skyshift.bat](start_skyshift.bat)** or run it from PowerShell:

```powershell
.\start_skyshift.bat
```

Open **http://localhost:3000** in a modern browser. Keep the server window open. Stop with Ctrl+C or `stop_skyshift.bat`; restart with `start_skyshift.bat`. Only Python 3.11+ and a modern browser are needed to view the already prepared data. No hosting account, npm installation, credentials or internet are needed for the curated application. See [local hosting and production builds](docs/local_hosting.md).

The main website distinguishes official mission composites, single exposures and prepared comparison data. Four real fields provide five single-exposure contexts, including one Orion Nebula exposure; M67/NGC 188 tested temporal pairs remain incompatible. The restricted M101 pair supports synchronized pan/zoom, side-by-side inspection, A/B switching, optional slow blinking, shared asinh/linear/log display, single-band palettes, smooth or pixel sampling, wipe overlay, coordinate questions, evidence export, and reopening compatible comparisons. Scientific approval remains pending.

The homepage provides searchable real field cards. The optional Universe and independent recovery explorer retain the ICRS locator. Attach questions to usable measured pixels and save/reopen their coordinates with the exposure JSON; version 1.0 exports remain supported. Orion is single-exposure only, with visible quality exclusions near its bright centre and no screened temporal pair.

The [0.4 visitor experience](docs/visitor_experience_0.4.md) adds meaningful field descriptions, explicit availability, guided comparison steps, question-first notes, contextual explanations, and accessible original-source panels. Optional display controls and technical records stay collapsed initially. Loading and corrupted-data failures hide stale images and disable export. The user is the sole human UX evaluator; independent novice validation is **NOT CONDUCTED**, by the user's instruction, and is not a development blocker.

The [end-to-end provenance audit](docs/provenance_audit_0.3.md) independently re-fetched originals/calibration and verified all ten browser arrays against original-source reconstruction. Inspect the audit and original-source links inside Methodology. The historical public deployment is preserved as evidence in [deployment.md](docs/deployment.md); further development does not depend on it.

Explore questions use tab-local session storage and survive navigation and reload when storage is available; its automatic Resume history stores only public source references and viewing settings. Comparison notes use tab session storage; export them to keep them after the tab closes. They are not sent to a SKYSHIFT server. No accounts, database, analytics, or developer credentials are required. The local loopback server serves read-only assets. See [the user guide](docs/user_guide.md).

## Install and test

Use Python 3.12. The lock records exact versions verified on Windows. Other platforms require verification.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
.\.venv\Scripts\python.exe -m pytest -q
node --test web/tests/*.test.mjs
```

The buildless frontend needs no npm installation. Vendored fflate 0.8.2 includes its MIT license. Real-data integration tests skip explicitly when the immutable local snapshot is absent. Synthetic scenes are software controls, not astronomical observations.

To create a standalone local production snapshot with verified assets, gzip transport compression, startup scripts and checksums:

```powershell
.\.venv\Scripts\python.exe tools/build_local_release.py --name skyshift-my-release
```

It creates a new folder in `output/local-production`; earlier snapshots are never overwritten. The same ordinary static application can later use an independent provider and domain. New observations, live Gaia/archive queries and external source links need internet. Numerical reconstruction is offline-capable when supplied the complete original review packet and installed pinned scientific dependencies.

## Reconstruct and review

Download the complete review packet. Use a new output directory every time:

```powershell
skyshift reconstruct m101-review-v6.zip --output reconstructed
skyshift review m101-review-v6.zip --output independently-reproduced
```

Reconstruction validates every archive hash and scientific input identity, reruns all ten prepared arrays and WCS, and verifies annotation support. Review additionally reruns Gaia-reference registration and response diagnostics. Neither grants approval or executes code supplied by a packet. Only trusted, separately installed code runs.

Compact comparison exports embed prepared FITS, notes, exact settings, diagnostics, citations, and original source/calibration references; older standalone exports also include a PNG preview. A separately hashed `visualization.json` preserves presentation settings (palette, log display, interpolation, wipe); the browser restores it while Python reconstruction retains its original scientific schema. Original inputs may need archive access. To use originals from an extracted full packet:

```powershell
skyshift reconstruct saved-comparison.zip --source-cache reconstructed --output reopened
```

Changed upstream bytes stop reconstruction. Hashes establish integrity, not digital signatures or scientific validity. See [reproducibility.md](docs/reproducibility.md).

## Rebuild immutable releases

```powershell
.\.venv\Scripts\python.exe tools/build_review_release.py --name new-immutable-review
.\.venv\Scripts\python.exe tools/build_web_data.py --release new-immutable-review
```

These commands require the acquired files in data/raw/m101_context and data/calibration; the full review packet preserves their exact bytes. Preserve earlier releases and failures. The initial seven-input sample is reproducible with tools/reproduce_feasibility.py and config/feasibility_sample.json.

The CLI includes inventory, download, inspect, screen, schema, export, reconstruct, and review. Screen exits 2 for rejection, 1 for tool/input failure, and 0 for a completed engineering screen. Read its JSON status: zero does not mean scientific approval.

## Architecture and limits

Python handles archive access, FITS/calibration interpretation, masks, spectral checks, Gaia fits, response diagnostics, deterministic reprojection, and reconstruction. The browser renders small immutable arrays and stores user interpretation separately. Pair identity includes input/calibration hashes, region, scientific code hashes, and numerical dependency versions.

The 24 x 24 north-up grid has 6.15-arcsecond pixels, 94.44% common support, and nominal width 2.4 arcminutes. Registration uses an 18-arcminute context: 13 references across four quadrants, median residual 0.31 arcsec and p95 2.01 arcsec. These describe this sample, not absolute precision or a detection threshold.

CWAVE/CBAND agreement is an engineering screen. PSF differences, backgrounds, blending, interpolation covariance and unflagged artifacts limit interpretation. No PSF matching, background subtraction, calibrated significance map, photometric variability, automatic detection, orbit fitting, arbitrary-field browser search, or citizen-science moderation platform is implemented. Human technical and qualified scientific reviews remain open. Independent novice sessions are NOT CONDUCTED; the user explicitly chose direct personal feedback instead of recruiting participants. This does not establish independent novice comprehension.

## Attribution

Product interpretation follows the [official IRSA guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/). QR2 DOI: [10.26131/IRSA652](https://doi.org/10.26131/IRSA652). Gaia DR3: [10.1051/0004-6361/202243940](https://doi.org/10.1051/0004-6361/202243940).

This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.

This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC). SKYSHIFT is an independent student project and does not imply NASA endorsement.
