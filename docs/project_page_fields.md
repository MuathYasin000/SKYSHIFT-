# Project Mercury Team portal copy

## Project Name

SKYSHIFT

## High-Level Project Summary

SKYSHIFT turns real NASA SPHEREx infrared observations into a browser flipbook. Choose one of five challenge targets or enter sky coordinates. Blink through exposures taken at similar wavelengths, compare dates, and inspect each frame’s detector and pixel masks. The project gives students and citizen scientists a way to explore changes in the infrared sky and decide what deserves a closer look.

## Link to Project Demo

[PUBLIC DEMO URL]

## Link to Final Project

https://skyshift-j22s.onrender.com/

Source repository and project history: https://github.com/MuathYasin000/SKYSHIFT-

## Detailed Project Description

SKYSHIFT is an interactive viewer for the Planet X and SPHEREx challenge. Visitors can choose Barnard’s Star, Epsilon Indi B, WISE 0855-0714, RW Aurigae, or R Draconis, or enter right ascension and declination. Select a field width and release, then blink through dated exposures. The Same band control selects cached frames from a single detector with similar wavelengths. Compare two frames side by side, with a wipe, or through an exploratory difference. A shared link preserves the target, wavelength window and comparison settings.

Python queries NASA/IPAC IRSA for calibrated SPHEREx DR1 and QR3 Level 2 products. Astropy interprets FITS time, WCS and wavelength information. NumPy, SciPy and reproject help prepare real cutouts on a common sky grid. The JavaScript workbench displays usable samples with masked pixels labelled, and each frame links back to its original archive product. The five bundled previews let visitors start without waiting for a new archive search. Optional Gaia DR3 and AllWISE markers and DSS optical imagery provide context. The spectrum view plots exploratory samples from loaded exposures.

Different wavelengths, coverage and processing can alter image appearance. The viewer helps users inspect these effects and decide what to investigate. A future version could expand date and wavelength coverage as more observations arrive. The web interface uses HTML, CSS, JavaScript and Canvas. Docker packages the Python service on Render. Three.js powers the optional illustrative spacecraft model.

The team adapted an existing SKYSHIFT application for the challenge and developed the challenge-target workbench, dated previews and public submission workflow during the event. The README’s Project history section documents the timeline and earlier work.

## Use of Super Intelligence (SI)

We used OpenAI Codex for application implementation, archive integration, testing, documentation, the procedural SPHEREx model and interface cue implementation. Anthropic Claude assisted with project review and written instructions for the coding agent. The site and repository disclose assisted code, illustrations, derived metadata and browser-synthesized cues. Scientific images come from SPHEREx observations. OpenAI Codex also assisted with demo and submission copy. The demo images are screen captures of the application.

## NASA Data

- NASA SPHEREx Data Release 1 and Quick Release 3 calibrated Level 2 spectral images, from the NASA/IPAC Infrared Science Archive. SKYSHIFT uses real regional cutouts, FITS observation times, detector information, WCS, approximate wavelength metadata and native quality flags for the date-ordered flipbook and comparisons. SPHEREx is a NASA-funded JPL and Caltech mission. See https://irsa.ipac.caltech.edu/Missions/spherex.html, https://doi.org/10.26131/IRSA678 and https://doi.org/10.26131/IRSA662.
- ESA Gaia DR3, processed by the Gaia Data Processing and Analysis Consortium and served by NASA-funded MAST at STScI. SKYSHIFT uses it for optional catalog position markers and propagates positions to the observation epoch where the necessary proper motions are available. See https://archive.stsci.edu/missions-and-data/gaia.
- NASA-funded WISE and NEOWISE observations form the AllWISE catalog for optional reference markers. DSS Color provides older optical context through the MAST mirror. Source and use details follow.

## Space Agency Partner Data and Other References

- ESA Gaia DR3/DPAC, Gaia Collaboration and Vallenari et al. (2023), with DPAC funding from national institutions including the Gaia Multilateral Agreement. MAST/STScI provides archive access. https://doi.org/10.5270/esa-qa4lep3
- CDS SIMBAD for challenge positions and proper motions. Wenger et al. (2000), A&AS 143, 9. https://simbad.cds.unistra.fr/
- NASA-funded AllWISE via CDS VizieR II/328, Cutri et al. (2013). https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/index.html and https://doi.org/10.26093/cds/vizier
- STScI Digitized Sky Survey and CDS Color HiPS via MAST. CDS Aladin Lite 3.9.2-beta (LGPL-3.0-or-later), Boch and Fernique (2014). https://archive.stsci.edu/publishing/data-use and https://github.com/cds-astro/aladin-lite
- SPHEREx archive documentation and tutorial notebooks. https://caltech-ipac.github.io/irsa-tutorials/spherex/
- CADC archive link for CSA/DRDC NEOSSat. SKYSHIFT links to the archive and uses no NEOSSat exposure. https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/neossat/
- Backyard Worlds WiseView inspired the flipbook interaction. https://github.com/backyardworlds/wiseview
- NASA/JPL-Caltech SPHEREx official imagery and JPL spacecraft references. Hubble, Webb and optional solar-system educational assets from NASA, ESA, CSA, STScI and the credited contributors. Asset-specific sources, licenses and modifications are in the public inventory.
- The homepage reference photos use ESO/DSS2, ESO/2MASS, Webb NIRCam from NASA/ESA/CSA program 1230 with a credited composite by Melina Thévenot, and Pan-STARRS1 from the PS1 Science Consortium through MAST. These are reference photos. The compared exposures are SPHEREx measurements. https://github.com/MuathYasin000/SKYSHIFT-/blob/codex/observations-fix/web/dist/assets/challenge-context/manifest.json
- Python, Astropy, NumPy, SciPy, reproject, Pydantic, PyVO, Matplotlib, Photutils and Streamlit. HTML, CSS, JavaScript, Canvas and Web Audio. Three.js r180 and loaders, Draco, fflate 0.8.2, Lenis 1.3.11, axe-core 4.14.0 and Playwright. Inter and IBM Plex Mono are under SIL OFL-1.1. Docker and Render package and serve the app.
- Vengeance UI kinetic loader adapted under MIT. Skiper UI and the earlier Vengeance navigation adaptation are historical. dqnamo Kitchen is visual inspiration. OpenAI Codex and Anthropic Claude assisted as described above.
- Submission and verification tools include Git, Chromium/Playwright, the Codex presentation runtime, Microsoft PowerPoint PDF export, and Gitleaks. The live app pictures are screenshots.
- Complete source links, versions, license notices and asset credits: https://github.com/MuathYasin000/SKYSHIFT-/blob/codex/observations-fix/docs/third_party.md

## FortiGuard

| Form field | Value |
| --- | --- |
| Site URL | `https://skyshift-j22s.onrender.com/` |
| Category recommendation | Web-based application |
| Company name | N/A |
| Description | Public educational web application for viewing and comparing dated NASA SPHEREx infrared observations. |

Use the [Web Filter Rating Submission](https://www.fortiguard.com/faq/wfratingsubmit) workflow. The organizer lists this as optional.
