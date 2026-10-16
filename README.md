# SKYSHIFT

Traceable qualitative inspection of real SPHEREx observations, developed by Project Mercury Team.

**Release 0.2.0 is a working scientific review application. Scientific approval and human internal technical review remain PENDING.** The restricted M101 field passes declared engineering screens and Gaia-reference registration checks. These do not confirm motion, variability, a discovery, or human scientific approval.

The authoritative planning baseline remains [the master plan](plan/SKYSHIFT_Master_Plan.md) and [execution backlog](plan/SKYSHIFT_Execution_Backlog.md). See [current status](docs/feature_status.md), [acceptance evidence](docs/release_acceptance.md), [data dossier](docs/data_dossier.md), and [reviewer instructions](docs/reviewer_guide.md).

## Use the application

The verified hosted URL and deployment identity are recorded in [deployment.md](docs/deployment.md). To run locally in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m http.server 8765 --directory web/dist --bind 127.0.0.1
```

Open http://127.0.0.1:8765 in a modern browser. One curated M101 pair supports synchronized pan/zoom, side-by-side inspection, A/B switching, optional slow blinking, shared display scaling, coordinate notes, evidence export, and reopening compatible comparisons.

Notes remain in this browser tab until exported. They are not sent to a SKYSHIFT server. No accounts, database, analytics, or developer credentials are required. Hosting infrastructure handles ordinary HTTP requests. See [the user guide](docs/user_guide.md).

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

## Reconstruct and review

Download the complete review packet. Use a new output directory every time:

```powershell
skyshift reconstruct m101-review-v6.zip --output reconstructed
skyshift review m101-review-v6.zip --output independently-reproduced
```

Reconstruction validates every archive hash and scientific input identity, reruns all ten prepared arrays and WCS, and verifies annotation support. Review additionally reruns Gaia-reference registration and response diagnostics. Neither grants approval or executes code supplied by a packet. Only trusted, separately installed code runs.

Compact browser exports embed prepared FITS, notes, exact settings, diagnostics, preview, citations, and original source/calibration references. They may need archive access. To use originals from an extracted full packet:

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
