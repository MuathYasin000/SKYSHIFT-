# SKYSHIFT

Traceable qualitative inspection of real SPHEREx observations, developed by Project Mercury Team.

**Release 0.3 is an independent, locally hosted scientific exploration application. Scientific approval and human internal technical review remain PENDING.** The original science snapshot, pair identity and reconstruction code remain version 0.2.0. The restricted M101 field passes declared engineering screens and Gaia-reference registration checks. These do not confirm motion, variability, a discovery, or human scientific approval.

The authoritative planning baseline remains [the master plan](plan/SKYSHIFT_Master_Plan.md) and [execution backlog](plan/SKYSHIFT_Execution_Backlog.md). See [current status](docs/feature_status.md), [acceptance evidence](docs/release_acceptance.md), [data dossier](docs/data_dossier.md), and [reviewer instructions](docs/reviewer_guide.md).

## Use the application

Double-click **[start_skyshift.bat](start_skyshift.bat)** or run it from PowerShell:

```powershell
.\start_skyshift.bat
```

Open **http://localhost:3000** in a modern browser. Keep the server window open. Stop with Ctrl+C or `stop_skyshift.bat`; restart with `start_skyshift.bat`. Only Python 3.11+ and a modern browser are needed to view the already prepared data. No hosting account, npm installation, credentials or internet are needed for the curated application. See [local hosting and production builds](docs/local_hosting.md).

The redesigned Home, Explore, Compare, Discover SPHEREx and Methodology pages distinguish official mission composites from scientific data. Three real fields provide larger single-exposure contexts; M67/NGC 188 tested temporal pairs remain incompatible. The restricted M101 pair supports synchronized pan/zoom, side-by-side inspection, A/B switching, optional slow blinking, shared asinh/linear/log display, single-band palettes, smooth or pixel sampling, wipe overlay, coordinate notes, evidence export, and reopening compatible comparisons. Scientific approval remains pending.

The [end-to-end provenance audit](docs/provenance_audit_0.3.md) independently re-fetched originals/calibration and verified all ten browser arrays against original-source reconstruction. Inspect the audit and original-source links inside Methodology. The historical public deployment is preserved as evidence in [deployment.md](docs/deployment.md); further development does not depend on it.

Notes remain in this browser tab until exported. They are not sent to a SKYSHIFT server. No accounts, database, analytics, or developer credentials are required. The local loopback server serves read-only assets. See [the user guide](docs/user_guide.md).

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

Compact browser exports embed prepared FITS, notes, exact settings, diagnostics, preview, citations, and original source/calibration references. A separately hashed `visualization.json` preserves the 0.3 presentation extension (palette, log display, interpolation, wipe); the browser restores it while Python reconstruction retains its original scientific schema. They may need archive access. To use originals from an extracted full packet:

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

CWAVE/CBAND agreement is an engineering screen. PSF differences, backgrounds, blending, interpolation covariance and unflagged artifacts limit interpretation. No PSF matching, background subtraction, calibrated significance map, photometric variability, automatic detection, orbit fitting, arbitrary-field browser search, or citizen-science moderation platform is implemented. Human review and five novice usability sessions remain open.

## Attribution

Product interpretation follows the [official IRSA guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/). QR2 DOI: [10.26131/IRSA652](https://doi.org/10.26131/IRSA652). Gaia DR3: [10.1051/0004-6361/202243940](https://doi.org/10.1051/0004-6361/202243940).

This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.

This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC). SKYSHIFT is an independent student project and does not imply NASA endorsement.
