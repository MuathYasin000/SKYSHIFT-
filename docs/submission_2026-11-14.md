# SKYSHIFT submission handoff

**Project Mercury Team · Planet X and SPHEREx · v0.12.0 · November 14, 2026**

## Submission title and summary

**SKYSHIFT: Inspecting the infrared sky over time**

SPHEREx images the same sky at different dates and wavelengths. SKYSHIFT lets anyone enter sky coordinates, step through real infrared observations, and check whether an apparent shift could come from the wavelength, a bad pixel or uncertain alignment. Viewers can inspect native detector images and quality flags, leave a question at a sky position, and save an investigation with the dates, archive IDs and source checksums. The release includes a fresh two-date DR1 example, an earlier matched-wavelength demonstration screened against Gaia DR3, and five openable challenge fields. This is a tool for gathering and checking evidence. It establishes no discovery, target motion or calibrated variability.

## Reviewer route

1. Open the [challenge guide](http://localhost:3000/challenge.html) and select **Open two DR1 dates**. Step between December 7 and 10, 2025. The centre wavelengths are approximately 1.1008 and 1.3980 µm, a concrete example of why an apparent brightness difference needs a wavelength check. The Sources panel leads back to the public FITS products.
2. Open [M101 matched-wavelength playback](http://localhost:3000/#target-example/m101-time-explorer). The existing QR2/D2 wavelength and stationary-reference engineering checks enable this comparison. Toggle the Gaia reference overlay to see the checks' propagated reference positions. The motion and variability result remains open.
3. Open [R Draconis](http://localhost:3000/#target-example/r-draconis-temporal). Its propagated catalogue position falls on invalid pixels in both of the focused comparison frames. The viewer explains why they cannot measure the star's variability. The other four target fields open directly from the challenge guide.
4. In [Coordinates](http://localhost:3000/#sky-search), search a field or choose a preset. Live searches use one selected release. **Discover DR1 and QR3 metadata** checks both wide and both deep collections within one bounded request budget. An archive failure or missing frame is reported as an availability result.

## Critical audit and release choices

| Finding | November 14 disposition |
| --- | --- |
| The homepage intro gated the page on optional graphics, obscuring the main competition task. | The homepage opens immediately. The existing SPHEREx model loads when visible, and the previous animation is opt-in. Direct science routes and recovery remain usable without WebGL. |
| Live discovery was centered on QR2, which IRSA retired from search. R7's pipeline version alone cannot distinguish DR1 and QR3. | DR1 is the default. SIA2 and TAP use the current collections, and R7 product identity uses the approved archive path plus the FITS header. Historical QR2 is labeled as such and remains available in prepared evidence. [IRSA data access](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/) |
| A chronological flipbook can exaggerate apparent changes when wavelength, mask or PSF varies. | The current-release examples use Survey Timeline and native inspection. The existing calibration, registration and support thresholds continue to govern matched tools. The two workflows and their limitations are visible to the reviewer. |
| The five target outcomes were hidden behind preset interactions and older milestone docs. | The guide links all five cases directly. It identifies historical QR2/D2 frame counts and leaves physical conclusions unclaimed. A new R Draconis metadata receipt demonstrates current coverage without upgrading the earlier scientific assessment. |
| The existing public URL points to an older static build. The same-origin service is needed to fulfill the challenge's public coordinate-search objective. | The handoff includes the current source and application with its public-start container path. Public access and the actual judge-facing URL still need to be established. [Hosting guide](public_service.md) |

## Resources and credits

- **SPHEREx** powers the image and science workflow. IRSA's documentation and notebooks establish the release, image, masks and wavelength handling. [NASA/IPAC IRSA](https://irsa.ipac.caltech.edu/Missions/spherex.html) · [Notebooks](https://caltech-ipac.github.io/irsa-tutorials/spherex/) · [Usage terms](https://irsa.ipac.caltech.edu/data_use_terms.html) · [DR1](https://doi.org/10.26131/IRSA678) · [QR3](https://doi.org/10.26131/IRSA662) · [QR2](https://doi.org/10.26131/IRSA652)
- **Gaia DR3** provides astrometric reference stars in the screened QR2/D2 workflow. The matched investigation carries the reference query and identities. [MAST Gaia mission](https://archive.stsci.edu/missions-and-data/gaia) · [Gaia DR3 citation](https://doi.org/10.1051/0004-6361/202243940)
- **WiseView** is the interaction precedent. SKYSHIFT steps through SPHEREx dates with the native SKYSHIFT engine. The WiseView endpoint returned a gateway error during the source review. [WiseView](https://byw.tools/wiseview)
- **CSA and CADC** are cited as mission and archive context. No NEOSSat measurements enter a SPHEREx timeline. The direct dataset page timed out during the source review. [NEOSSat mission](https://www.asc-csa.gc.ca/eng/satellites/neossat/) · [CADC](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/) · [NEOSSat tutorial](https://github.com/asc-csa/NEOSSAT_Tutorial) · [Dataset](https://data.asc-csa.gc.ca/dataset/neossat)

**AI disclosure for the submission form.** OpenAI Codex assisted with software implementation, data integration, automated testing, and documentation. Earlier project records also disclose AI assistance on illustrative assets. The dated scientific images in these demonstrations are archive measurements. The spacecraft model is a photo-informed illustration.

## Verification and original dates

- Working checkout tests recorded 203 Python passes and one skipped optional context model fixture. JavaScript recorded 167 passes. In isolated Chromium, 19 product, seven recovery, six challenge workflow and nine opt-in intro journeys passed. The checks include responsive widths, keyboard controls, automated accessibility checks, saved investigations and no-WebGL access. [Verification receipts](evidence/submission-2026-11-14/)
- A bounded live DR1 SIA2 request through the local HTTP preparation API returned a renderable detector-2 observation. A separate R Draconis metadata request returned 76 DR1 and 19 QR3 rows. Those totals describe that search footprint and filter. A different M101 QR3 request and an M101 TAP attempt returned HTTP 502. The unsuccessful query receipts are included alongside the successes.
- Historical development predates the November 14 release. The team reports that organizers told it prior work was permitted. The assembly and revision dates in the package describe this release. Observation dates, source acquisition and preparation records, earlier rejection evidence and repository history retain their actual dates. Qualified scientific approval and internal human review remain **PENDING**. Independent novice evaluation was **NOT CONDUCTED**.

## Portal checklist

- Paste the title, summary, resource citations and AI disclosure into Project Mercury Team's official Project tab. Keep the provenance disclosure with the release.
- Enter a public final-project URL. Publish via the team's approved host or public source repository, then check the link from a signed-out browser. For a public application that accepts new coordinate searches, run the included same-origin Python service and test a live request on that host.
- Attach the separate public demo URL required by the 2026 organizer guidance, either a video of up to 30 seconds or a presentation of up to seven slides. Current handoff includes the application and source package. [Organizer submission instructions](https://github.com/nasa/spaceapps/discussions/1973) · [Project and demo links](https://github.com/nasa/spaceapps/discussions/1991)
- The organizer guidance gives November 15 at 11:59 p.m. local time as the submission deadline. Use the local event's instructions for any additional requirements. [Official submission resources](https://www.spaceappschallenge.org/resources/)
