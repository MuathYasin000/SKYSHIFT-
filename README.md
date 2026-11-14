# SKYSHIFT

SKYSHIFT is a WiseView-style browser for real NASA SPHEREx observations. Enter ICRS coordinates—or choose Barnard's Star, Epsilon Indi B, WISE 0855-0714, RW Aurigae, or R Draconis—to retrieve DR1 and QR3 observations from NASA/IPAC IRSA across all six detectors.

Observations are ordered by date and downloaded progressively. The viewer provides a fast flipbook, previous/next controls, a scrubber, keyboard playback, shared pan and zoom, target-position markers, and unrestricted side-by-side or wipe comparison. A wavelength difference produces a visible warning; it never disables comparison. Invalid or masked target pixels remain visible and labeled.

## Run locally

```powershell
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements-lock.txt
.venv\Scripts\python tools\build_frontend.py
.venv\Scripts\python tools\local_server.py --port 3000
```

Open <http://localhost:3000>. Live searches require internet access to IRSA. The Python service is required because it performs archive queries, bounded FITS downloads, quality masking, reprojection, and caching.

## Data and astrometry

- SPHEREx images and metadata: [NASA/IPAC IRSA](https://irsa.ipac.caltech.edu/Missions/spherex.html), DR1 and QR3 only.
- Challenge-target reference positions and proper motions: SIMBAD mirror records, with the source and reference epoch displayed in the app.
- Gaia DR3 via [MAST](https://archive.stsci.edu/missions-and-data/gaia) is an optional reference source; it is not required to view SPHEREx frames.
- Target positions use linear ICRS proper-motion propagation from J2000.0 to each observation epoch. Parallax and radial-velocity perspective corrections are not applied.

On November 14, 2026, live IRSA cache-building attempts for all five targets returned HTTP 502 responses or timed out for every DR1/QR3 wide/deep collection. SKYSHIFT records those failures and offers retry; it does not substitute QR2 or generated images.

## What existed before and what was built during the event

The Git history begins on October 16, 2026. Before November 14 it already contained a standalone SPHEREx viewer, curated M101/M67/NGC 188/M42 material, QR2 comparison and evidence workflows, 3D and sound presentation work, and bounded DR1/QR3 archive experiments. On November 14 the complete prior state was preserved on `pre-cleanup-2026-11-14`, and the challenge-centered DR1/QR3 coordinate search, six-detector retrieval, proper-motion handling, progressive cache, observation list, flipbook, and general comparison workspace were built on `codex/challenge-core`.

## AI assistance

OpenAI Codex assisted with repository analysis, implementation, tests, documentation, and browser verification. Scientific data are retrieved from the cited archives; AI-generated astronomical observations or test results are not used.

SKYSHIFT is an independent educational project. NASA does not endorse this application.
