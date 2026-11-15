# SKYSHIFT

Explore NASA’s infrared sky through real SPHEREx observations. SKYSHIFT is Project Mercury Team’s entry for the 2026 NASA Space Apps challenge *Planet X and SPHEREx*. The Observations and Compare workbench lets you look up sky coordinates, browse observations by date, blink through frames, and compare two frames while seeing their wavelength, detector, and archive source.

The permanent public URL is [skyshift-j22s.onrender.com](https://skyshift-j22s.onrender.com/). Each of these challenge targets opens with a bundled 8′ preview.

- [Barnard’s Star](https://skyshift-j22s.onrender.com/compare.html?target=barnards-star)
- [Epsilon Indi B](https://skyshift-j22s.onrender.com/compare.html?target=epsilon-indi-b)
- [WISE 0855-0714](https://skyshift-j22s.onrender.com/compare.html?target=wise-0855)
- [RW Aurigae](https://skyshift-j22s.onrender.com/compare.html?target=rw-aurigae)
- [R Draconis](https://skyshift-j22s.onrender.com/compare.html?target=r-draconis)

On Render’s Free plan, the first load after inactivity can take about a minute. [Render Free plan details](https://render.com/docs/free#spinning-down-on-idle)

1. Open **Observations** and enter RA and Dec or choose one of the five 8′ target previews.
2. Review the dates, detectors, wavelengths, and archive sources. Use **Play** to blink through single images.
3. In **Compare**, choose two frames and use **Side by side** or **Wipe**. Copy the view with **Share view**.

## Run locally

Clone the submission branch and install the project with Python 3.12.

```sh
git clone --branch codex/observations-fix https://github.com/MuathYasin000/SKYSHIFT-.git
cd SKYSHIFT-
python -m pip install -r requirements-lock.txt
python -m pip install --no-deps -e .
python tools/local_server.py
```

Open [localhost:3000](http://localhost:3000/).

## Deploy

In the Render dashboard, create a **Web Service** from this repository on branch `codex/observations-fix`. Choose **Docker** and the **Free** instance type, use the root `Dockerfile`, and set the health check path to `/healthz`. The container serves the bundled previews and live archive API on Render’s `PORT`. After deploying, check the generated HTTPS URL and its `/healthz` endpoint. [Docker on Render](https://render.com/docs/docker) · [Persistent storage and monitoring instructions](docs/deploy_final.md)

## Data and credits

- The infrared images are NASA SPHEREx DR1 and QR3 Level 2 data from the NASA/IPAC Infrared Science Archive at Caltech. SPHEREx is a NASA-funded JPL and Caltech project. [Mission and citation records](https://irsa.ipac.caltech.edu/Missions/spherex.html) · [Archive releases](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-releases/)
- Target coordinates and proper motions use SIMBAD at CDS. Optional references use ESA Gaia DR3 (processed by DPAC and served by MAST), NASA AllWISE via CDS VizieR, and STScI Digitized Sky Survey imagery via CDS HiPS and Aladin Lite. The blink interaction draws inspiration from Backyard Worlds’ WiseView. [Full data and software citations](docs/submission_final.md#data-and-credits)

Differences in wavelength, processing, and masks affect image appearance. The bundled cache covers part of the archive, and the viewer makes no detection or motion claim. Live archive search depends on IRSA, which returned HTTP 502 during testing on November 15, 2026. The bundled previews work independently of IRSA.

## AI assistance

OpenAI Codex assisted with software implementation, archive integration, testing, and documentation. Some earlier illustrative assets also received AI assistance. The observation images are measurements from the SPHEREx archive.

## Project history

This repository is a submission snapshot published on November 15, 2026 from `codex/observations-fix` at source commit `c829f26`. Its Git history starts with the snapshot commit. The earlier work is preserved in the [original SKYSHIFT repository](https://github.com/MuathYasin000/SKYSHIFT) and the [full-history Project Mercury repository](https://github.com/MuathYasin000/SKYSHIFT_Project_Mercury/tree/codex/observations-fix).

A working SKYSHIFT application existed before November 14, 2026. The earliest source commit, `ce53450`, is dated October 16, 2026 and already contains the application.

The November 14 commit preserved the pre-cleanup project. The November 15 work repaired Observations and Compare, expanded live archive discovery, bundled date-spread target data, built the shared workbench, and prepared and verified the public deployment. Selected lines from the source branch's `git log --date=short --format="%h %ad %s"` follow.

```text
ee57d2c 2026-11-15 Record signed-out Render workbench verification
c1e14f6 2026-11-15 Verify the responsive workbench and document its structure
0753744 2026-11-15 Point public metadata and submission links to Render
cf51c7e 2026-11-15 Build a shared SPHEREx observation workbench
7d75bb9 2026-11-15 Bundle date-spread real eight-arcminute cutouts for all challenge targets
560b797 2026-11-15 Page live IRSA discovery and clarify preset cache coverage
0470190 2026-11-15 Repair SPHEREx Observations and Compare in place
a38e929 2026-11-14 Preserve complete pre-cleanup project state
ce53450 2026-10-16 Implement traceable SKYSHIFT review workflow and public release
```

[Submission text](docs/submission_final.md) · [Demo outline](docs/demo_final.md)
