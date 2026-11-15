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

## Coordinate and comparison links

Use `/explore.html` or `/compare.html` with a query string. [Open a tested WISE 0855 example](https://skyshift-j22s.onrender.com/explore.html?ra=133.81890825&dec=-7.247048&fov=8&release=dr1&from=2&to=5&target=wise-0855&frame=2).

| Parameter | Format |
| --- | --- |
| `ra`, `dec` | ICRS right ascension and declination. Use decimal degrees (`0 <= ra < 360`, `-90 <= dec <= 90`) or URL-encoded sexagesimal such as `ra=08h55m10.831s&dec=-07d14m42.53s`. Supply both for a custom coordinate. |
| `target` | One of `barnards-star`, `epsilon-indi-b`, `wise-0855`, `rw-aurigae`, `r-draconis`. If also supplying coordinates, the preset keeps its proper-motion model only when the decimal pair matches its reference coordinate. |
| `fov` | Square field width in arcminutes, `1` through `30` in 0.1′ increments. Default `8`. A preset can open an exact bundled 8′ preview before making an archive request. |
| `release` | `all` (default), `dr1`, or `qr3`. A release filter can reduce cached coverage. |
| `from`, `to` | One-based inclusive bounds into the selected release's date-ordered rows. Omit both to use the default preview subset. |
| `frame` | One-based frame to show in Blink within the loaded selection. |
| `mode`, `a`, `b`, `wipe` | For two-frame views use `side`, `wipe`, or `difference`. Frame A/B are zero-based loaded indices. Wipe position is a percentage (`0`–`100`, default 50). Use **Share view** to generate a working URL. |

Link to a view from other sites with an ordinary hyperlink. Cross-origin iframes are blocked by the app's framing policy. A shared custom coordinate repeats the archive request when opened. The short-lived `search` identifier is useful only on the service instance that created it.

Current release entries and collection naming are in [the release registry](src/skyshift/releases.py). Extending the currently supported collection list is a config change after a compatible release adapter exists. An unsupported release also needs an explicit product adapter, citation, archive collection and verified FITS references.

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

### Optional free uptime monitor

In UptimeRobot, add a free HTTP(S) monitor named **SKYSHIFT health** for `https://skyshift-j22s.onrender.com/healthz`. Select the five-minute interval and verify the monitor receives HTTP 200 with `"status":"ok"`. This checks the application separately from archive availability. On Render’s Free plan, traffic uses free instance hours. [Render Free plan](https://render.com/docs/free) · [UptimeRobot setup](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide)

## Data and credits

- This work uses the NASA/IPAC Infrared Science Archive, operated by Caltech under contract with NASA. The imagery uses SPHEREx DR1 and QR3 Level 2 data. SPHEREx is a joint JPL and Caltech project funded by NASA. Cite Bock et al. (2026), ApJ 999, 139 and Akeson et al. (2026), ApJS 285, 67. [IRSA acknowledgement](https://irsa.ipac.caltech.edu/ack.html) · [DR1 DOI](https://doi.org/10.26131/IRSA678) · [QR3 DOI](https://doi.org/10.26131/IRSA662)
- Target coordinates and motions use SIMBAD, operated by CDS, Strasbourg (Wenger et al. 2000, A&AS 143, 9). Optional ESA Gaia DR3 data are processed by the Gaia Data Processing and Analysis Consortium, funded by national institutions including those participating in the Gaia Multilateral Agreement, and served by MAST/STScI. Cite Gaia Collaboration, Vallenari et al. (2023), A&A 674, A1. [MAST data use](https://archive.stsci.edu/publishing/data-use).
- AllWISE (Cutri et al. 2013) combines NASA-funded WISE (UCLA and JPL/Caltech) and NEOWISE (JPL/Caltech), accessed through CDS VizieR II/328. Older optical context uses STScI Digitized Sky Survey images in the CDS-produced DSS Color HiPS tiles via MAST and Aladin Lite (Boch and Fernique 2014, CDS). MAST lists original plate credits and CC BY-NC-SA 4.0 terms for DSS. [AllWISE credits](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html) · [VizieR](https://doi.org/10.26093/cds/vizier) · [Aladin Lite source and license](web/dist/vendor/aladin-lite/README.md).
- The flipbook drew inspiration from Backyard Worlds' WiseView. The CADC NEOSSat link is an external reference. [Complete asset, font, library and archive credits](docs/third_party.md).

Differences in wavelength, processing, and masks affect appearance. The bundled previews cover part of the archive. Live searches depend on IRSA availability. Each image links to its source product.

## AI assistance

OpenAI Codex assisted with implementation, testing, documentation, archive integration, illustrative geometry and interface cue code. Anthropic Claude assisted with review and instructions for the coding agent. The on-site Sources dialog identifies the assistance. The measured pixels originate in SPHEREx observations. [File and asset disclosure](AI_DISCLOSURE.md).

## Project history

A working SKYSHIFT application existed before November 14, 2026. The earliest commit, `ce53450`, is dated October 16, 2026 and already contains the application. This public repository began as a November 15 snapshot of source commit `c829f26`. The complete development history is preserved locally with its original timestamps. The two earlier GitHub URLs were unavailable at the close of the audit.

The November 14 commit preserved the pre-cleanup project. The owner reports having obtained permission to reuse earlier work. Fresh copy dates are separate from original Git dates. The November 15 work repaired Observations and Compare, expanded live archive discovery, bundled date-spread target data, built the shared workbench, and prepared and verified the public deployment. Selected lines from the local source history’s `git log --date=short --format="%h %ad %s"` follow.

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

[Submission text](docs/submission_final.md) · [Demo materials](docs/demo_final.md) · [Compliance report](docs/nasa_compliance_report.md)
