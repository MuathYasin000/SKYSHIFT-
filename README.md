# SKYSHIFT

**Project Mercury Team · Planet X and SPHEREx · November 14, 2026 release**

SKYSHIFT is a browser tool for inspecting how the infrared sky looks in real SPHEREx observations taken on different dates. Search by right ascension and declination, step through the dated images, and check wavelengths and masked pixels before interpreting a shift. Save a sky-coordinate question and export the investigation with observation IDs, source URLs, and checksums.

## Open the application

Run [start_skyshift.bat](start_skyshift.bat) in the project folder and open [SKYSHIFT](http://localhost:3000/). Python 3.11+ and a modern browser are enough for the prepared examples. Use [stop_skyshift.bat](stop_skyshift.bat) to shut down the local server.

- [Challenge guide](http://localhost:3000/challenge.html) opens the five challenge fields, current data sources and credits.
- [M101 DR1 timeline](http://localhost:3000/#target-example/m101-dr1) opens two observation dates acquired from IRSA for this release. Step between frames and inspect each native detector image. Their wavelengths differ, so the timeline is for independent inspection.
- [M101 matched-wavelength viewer](http://localhost:3000/#target-example/m101-time-explorer) shows the earlier provisionally screened QR2/D2 example. The [direct comparison](http://localhost:3000/#compare) also offers a checked M101 pair, side-by-side, wipe and blink.
- [Coordinates](http://localhost:3000/#sky-search) accepts decimal or sexagesimal coordinates and a square field from 1 to 30 arcminutes. Live archive preparation uses DR1 or QR3, an internet connection and the Python dependencies below.
- [M101 wavelength map](http://localhost:3000/#sky-map/m101) displays 102 planes from a published IRSA tutorial cube. Each plane loads on demand and a selected position can be sent to coordinate search.

Prepared examples, scientific viewports and exports work without WebGL or live archive access. The visible homepage loads an interactive photo-informed SPHEREx model independently. The 3D Universe is optional and uses the same investigation state.

## Install, build and test

Use Python 3.12 for the pinned scientific environment. The checked-in browser build runs without npm installation.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
.\.venv\Scripts\python.exe tools/build_frontend.py
.\.venv\Scripts\python.exe -m pytest -q
node --test web/tests/*.test.mjs
```

`tools/bootstrap_test_inputs.py` can retrieve a small set of pinned original FITS and Gaia inputs for optional integration tests. See [local operation](docs/local_hosting.md), [same-origin hosting](docs/public_service.md), and [reconstruction](docs/reproducibility.md). A static host can serve the prepared examples. New archive requests need the Python service on the same origin.

## Science and provenance

DR1 and QR3 expose dates, conservative masks, and approximate wavelength coordinates. Matched-wavelength tools require the separately screened QR2/D2 calibration and Gaia DR3 reference checks. Mixed wavelengths, contamination, blending and registration uncertainty can all imitate a change. The five field tests show bounded preparation and usability of the frames. Qualified scientific approval and internal human review remain **PENDING**. Independent novice validation was **NOT CONDUCTED**.

The [November 14 handoff](docs/submission_2026-11-14.md) records the audit, changes, validation and submission fields. The source ZIP manifest gives each packaged file a SHA-256 and describes its relationship to the earlier repository baseline. The [October archive integration](docs/irsa_upgrade_20261030.md), [earlier field tests](docs/completion_20261030.md), and [review protocol](docs/reviewer_guide.md) retain their original dates and scope.

## Attribution

This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration. [IRSA archive and terms](https://irsa.ipac.caltech.edu/Missions/spherex.html) · [DR1 spectral images](https://doi.org/10.26131/IRSA678) · [QR3 spectral images](https://doi.org/10.26131/IRSA662) · [QR2 spectral images](https://doi.org/10.26131/IRSA652)

This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC). [Gaia DR3](https://doi.org/10.1051/0004-6361/202243940)

SKYSHIFT is an independent student project. Team-owned source is Apache-2.0. Third-party assets and data retain their own terms. See [NOTICE](NOTICE) and the [challenge resource credits](http://localhost:3000/challenge.html#challenge-sources).
