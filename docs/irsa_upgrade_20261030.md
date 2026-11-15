# SKYSHIFT 0.11 — official IRSA integration

Implemented locally on 30 October 2026. Start the existing application with `start_skyshift.bat`. No hosting was published or purchased. Scientific approval remains PENDING; the user remains the sole human UX evaluator.

Open [M101 / 102 wavelengths](http://localhost:3000/#sky-map/m101), [Cygnus](http://localhost:3000/#sky-map/cygnus), [NGC 1760](http://localhost:3000/#sky-map/ngc1760), or the existing [M101 observation dates and native detector images](http://localhost:3000/#target-example/m101-time-explorer).

Application commits, following baseline `ae66923d9378150edb639e2b243cfe3949999ec3`:

| Commit | Implementation |
|---|---|
| `329846d` | Bounded multi-collection metadata index and authenticated FITS mosaic ingestion |
| `c4944e1` | Integrated M101 102-plane viewer, genuine Cygnus/NGC 1760 images, same-coordinate navigation |
| `8265ad217201722297164671912b60bbae5975fc` | Bounded TAP/CAOM metadata with ObsCore columns, canonical product deduplication and authoritative DataLink associations |
| `08350c24391e604b00749592d41b478b66da2962` | Failed partial network reads consume the shared metadata transfer budget |

Current static content identity: `f74662e4c3f33dce4c56963bd89b3b0117762c5f8db3708f8586384f3edc43be`. Subsequent reporting commits do not change the application payload.

## Delivered experience

M101 opens with the real 3.293 µm plane (63/102), a large nearest-pixel canvas, wavelength slider, percentile/ZScale limits, linear/asinh/log stretches, three palettes, fit/1:1, pan/zoom and keyboard controls. Inspection reports original intensity in MJy/sr, NHITS, FLAGS, valid status and ICRS coordinates. Every plane has its own wavelength, bandwidth and support metadata; no neighboring channel substitutes for a failed load. False-color palettes are display mappings.

The surface uses the existing typography, dark palette, navigation and shared style tokens. It is lazy-loaded inside the current application, works without WebGL, and supports 390-pixel mobile layouts. Source records and technical controls use progressive disclosure. Map-to-coordinate and native-to-map navigation preserve the selected coordinates and do not reload the application. A selected map pixel becomes the exact search centre for bounded observations. The gallery images offer their published target centre only; clicking a publication image does not invent celestial coordinates.

Cygnus provides a genuine Galactic dust/star field. NGC 1760 provides a genuine nebular view in the Large Magellanic Cloud, complementing extragalactic M101. Their original published JPEG bytes, dimensions, retrieval times, credits, source pages and SHA-256 values are in [the product catalogue](../config/sky_products.json) and adjacent `.source.json` files. Cygnus uses the published 0.8/1.63/2.6 µm color mapping. NGC 1760 is a published 3.29 µm map assembled from four preparatory pointings. Publication dates are labeled as such. Both explicitly have unvalidated pixel astrometry and prohibit temporal comparisons.

Survey Timeline and Matched-Wavelength Time Series continue to use actual dated observations and the existing pairwise wavelength, mask, calibration and registration gates. Native samples, conservative exclusions, rejected comparisons, notes and ZIP export/reopen remain in the original scientific engine. Neither the cube nor the JPEGs enter a time-series bundle. All 21 scientific assets from baseline `f679221` remain byte-for-byte unchanged; [the final integrity receipt](evidence/irsa-delivery-20261030T125502.429800Z-40527773/integrity.json) records every Git blob identity.

## Archive discovery and access

In Coordinates → Options & data notes, choose SIA2 or TAP and select **Discover QR2/QR3 wide & deep metadata**. The result lists collection counts and completeness, displays sample metadata and downloads the complete JSON receipt. Ordinary image preparation still uses bounded SIA-selected cutouts, one to six images, with at most twelve 64-KiB header probes before selection. The new metadata-only action downloads no observation FITS or calibration arrays.

The SQLite index covers `spherex_qr2`, `spherex_qr2_deep`, `spherex_qr3` and `spherex_qr3_deep` for arbitrary validated coordinate fields, dates and detector filters. Every query is bounded to eight total metadata requests, a shared 16,000,000-byte response-body budget, and 5,000 accepted rows per partition. TAP requests one extra sentinel row. Unmeasured failed partial reads reserve their full possible body size, including the one-byte overflow sentinel; the receipt separately records successful bytes and the failed-transfer upper bound. Overflow partitions are split by observation time within the same request budget; overflow rows are discarded. Incomplete scopes remain explicitly partial/unavailable and are never cached as complete. The index is capped at 200,000 records and 128 MiB. Complete scope snapshots expire after five minutes.

Refresh re-queries the bounded scope and upserts new/changed metadata. It does not use a latest-observation watermark that could conceal reprocessed old epochs. The canonical key includes collection, observation ID and authoritative FITS URL: the same SIA/TAP product is not ingested twice, while a different processing URL remains a distinct revision. TAP enrichment does not get erased by a later SIA refresh for the same source. Metadata candidates are not distinct validated time-series epochs merely because an archive revision exists.

Fields include observation ID, collection/release, detector, centre, footprint with encoding, MJD and UTC time, wavelength bounds, pipeline version where supplied, product version, archive checksum where supplied, quality metadata, authoritative source URL, DataLink URL, cloud information where supplied, and sampled calibration associations. Missing values stay unknown. TAP geometry is preserved as EWKB; SIA footprints are STC-S. TAP uses IRSA's documented `observation`/`plane`/`artifact` tables with ObsCore-equivalent column names and their authoritative science artifact URI. The full ObsCore-to-artifact join was too slow in bounded probes; no unbounded join is used by the application.

For TAP, at most one observation per nonempty collection receives a DataLink association lookup, sharing the same eight-request/16-MB limit. Its `#this` URL must exactly match the TAP science artifact before calibration links attach. The URL's release, observation and detector identity are checked. Unqueried or failed associations remain unknown; association discovery does not approve or download the calibration. Real sampled M101 metadata returned nine calibration URLs, including spectral WCS, dichroic, gain, dark, PSF and detector-quality products.

Live bounded evidence:

| Search | Result | Received response payload | Repeat |
|---|---|---|---|
| SIA, four collections, 2.4′ M101 field | 374 QR2 wide rows, 4 requests; other three collections empty in this requested scope | 886,691 bytes | 0 requests |
| TAP, same field and collections | 375 QR2 wide rows, 4 catalogue requests + 1 DataLink request | 353,836 bytes | 0 requests |

See [SIA/real QR3 receipt](evidence/irsa-index-live-20261030T121023.541604Z-acbe4e85/summary.json) and [TAP receipt](evidence/irsa-tap-live-20261030T124028.393044Z-6bd38994/summary.json). The additional TAP row illustrates why zero rows or matching service counts cannot be assumed: IRSA documents SIA ingestion lag. These are field-scoped results, not an all-sky census, a claim of no QR3 data, or proof of continuous coverage. Recorded payload bytes exclude HTTP/TLS overhead and unsuccessful partial transfers.

## Exact mosaic identity and processing

Original: [IRSA M101 tutorial FITS](https://irsa.ipac.caltech.edu/data/demos/notebooks/spherex/M101_irsa.fits), 87,295,680 bytes, acquired `2026-10-30T11:58:41.945746Z`.

SHA-256: `44e89f460c55f46f7e384ba7dfe8927fa8e56163875aba3766499a5646813447`.

The inspected cube contains 102 × 267 × 267 float32 IMAGE samples, NHITS and FLAGS cubes, SPECTRAL_CHANNELS, and the WCS-WAVE lookup table. Celestial coordinates are ICRS TAN at 9 arcsec/pixel. The FITS footprint is about 40.05′ across, despite the tutorial's nominal 30′ request instructions. Plane labels come from the tables, whose identities must agree; they are not interpolated from channel number. All 102 planes have some usable support, with different masks/gaps.

`skyshift.mosaics` requires this exact source hash, supported HDUs, units, shapes, flag definitions, wavelength tables and celestial projection. SCI, NHITS and FLAGS are preserved. Usable support requires finite SCI, NHITS > 0, no overflow/outlier bit and no unknown active bit. SOURCE alone remains retained. Gray denotes no hits; purple denotes quality exclusion. No flux conversion, inpainting, background fitting, PSF processing, detail generation or new resampling occurs. Stretching only changes display shades. NHITS is coverage, not uncertainty.

The cube supplies no variance map and no exposure list or independently established per-epoch composition. Its release/date composition remains unspecified. It is wavelength/sky context only; no temporal inference, calibrated spectrum or photometric measurement is enabled.

## Storage and bandwidth

| Product/cache | Recorded local size or bound |
|---|---|
| Original FITS, separate ignored `data/mosaics/originals` | 87,295,680 bytes; excluded from Git and Docker context |
| Immutable `web/dist/data/mosaics/m101-v1` | 33,794,128 bytes including manifest |
| 102 independently fetched gzip planes | 33,718,422 bytes total; largest 338,887 bytes |
| Manifest | 75,706 bytes; SHA-256 `67bf2770a825d533d2e63a9ada648d28e429d1f8c721bf93e9121580cb7efd22` |
| Six-plane browser LRU | At most 5,560,542 bytes of retained measured typed arrays, plus transient decode/display objects |
| Credited published JPEGs | Cygnus 1,046,122 bytes; NGC 1760 363,450 bytes |
| Metadata index at integrity snapshot | 1,675,264 bytes; bounded growth, no archive mirror |

Opening M101 fetches its manifest and selected plane, rather than the 87-MB FITS or all 102 planes. A 267² image does not justify an additional tile pyramid. Compressed plane and array SHA-256 values, declared expansion bounds and recomputed masks are verified before display. Cache identity uses original hash and plane number, with versioned immutable paths and bounded decoded LRU. Failed loads remain retryable. Published-image caches have their own source identities. Existing original cutout, calibration and prepared-job caches remain separate. Code changes invalidate prepared jobs; changed mosaic bytes require a new explicit version rather than overwriting v1.

The public source was downloaded once for ingestion. Two official viewer attempts uploaded that same 87,295,680-byte public cube; no private data were uploaded. Browser and numerical comparisons then reused local data. The entire mission archive was never mirrored. The AWS registry and existing pinned S3 calibration path support justified selective research access; ordinary visitor queries do not retrieve full-frame originals or list the whole bucket.

## Official resources and usage

The nine requested resources were read and their actual capabilities applied. The [endpoint audit](evidence/master-official-resources-20261030T122244.482344Z-6e48cd3a/resources.json) preserves retrieval status, timestamps and response hashes. NASA's guideline page failed TLS validation in the local Python probe and was successfully read through the web tool; TLS validation was not disabled.

| Official resource | Verified scope and consequence |
|---|---|
| [Mission](https://irsa.ipac.caltech.edu/Missions/spherex.html) | QR2/QR3 access, acknowledgments, cutout/mosaic tools; an all-sky mission goal is not an available calibrated cube assertion |
| [Archive guide](https://caltech-ipac.github.io/spherex-archive-documentation/) | Evolving release guide, dated 28 September 2026 |
| [Access](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/) | Four wide/deep collections, SIA2, authoritative on-prem/cloud URLs, bounded cutouts, TAP tutorials and ingestion lag |
| [Products](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/) | MEF science/flags/variance/wavelength/PSF and separate calibration products; QR1 retired, QR2 PSF-header correction and QR3 distinctions |
| [Mosaic tool](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/mosaic.html) | Custom 102-channel or subset cubes; documented limits 5° × 5°, minimum 6.15″ pixels; exploratory cube extraction differs from validated spectrophotometry |
| [Mosaic tutorial](https://caltech-ipac.github.io/irsa-tutorials/spherex-mosaic/) | Exact provided M101 FITS, wavelength-table interpretation and quick-view analysis; only authenticated cube exploration is enabled here |
| [SPHEREx gallery](https://spherex.caltech.edu/images) | Genuine published visual products with per-image credits; no automatic photometric or pixel-WCS authority |
| [AWS registry](https://registry.opendata.aws/spherex-qr/) | Public `us-east-1` source/calibration holdings, FITS/YAML and IRSA usage terms; registry naming does not certify future products |
| [NASA imagery guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) | Educational use, source credit and no endorsement; protected identifiers, third-party content and personal likenesses require separate consideration |

New JPEG use also follows the [SPHEREx image policy](https://spherex.caltech.edu/page/image-use-policy). Data use follows [IRSA's public terms](https://irsa.ipac.caltech.edu/data_use_terms.html); existing DSS attribution remains separate. Original raster bytes and required credits are preserved. No NASA logo, fabricated NASA approval, AI sky texture or new synthetic astronomical detail was added. SKYSHIFT's display/analysis remains its own output.

## Verification and genuine comparisons

| Check | Outcome / preserved evidence |
|---|---|
| Full Windows Python | 202 passed, 1 skipped; two expected FITS long-keyword warnings; [final log](evidence/irsa-final-python-20261030T125142.869303Z-03a21806/pytest.txt) |
| Full JavaScript | 166 passed, including all 102 authenticated planes and corruption/mask/cache controls |
| Clean source at `08350c2` | 193 Python passed / 10 skipped, 166 JS passed, dependency check/build pass; [logs](evidence/master-clean-checkout-20261030T125132.724765Z-b2dc40b5/verification.json) |
| Why clean-source skips differ | The large ignored mosaic original and optional historical research fixtures are absent; original-backed numerical tests pass in the working checkout and Linux mount |
| New Chrome and Edge journeys | Both pass at 1440/390 px, no WebGL, 1/63/102 channels, exact pixel/WCS reference, keyboard/display controls, no overflow, zero automated accessibility violations, gallery identity, no-reload coordinate handoff and real TAP receipt download; [Chrome](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/results.json), [Edge](evidence/irsa-upgrade-browser-2026-10-30T12-44-04-280Z-a136fb4c/results.json) |
| Existing full browser suites | 19 product journeys pass in [Chrome](evidence/verify_website_product-2026-10-30T12-46-29-859Z-02abcc64/irsa_final_20261030_product_tests.json) and [Edge](evidence/verify_website_product-2026-10-30T12-47-31-000Z-ba4548ea/irsa_final_20261030_product_tests__edge.json); all 7 [recovery journeys](evidence/verify_website_recovery-2026-10-30T12-47-11-667Z-8126b687/irsa_final_20261030_recovery_tests.json) pass |
| Existing temporal integration | All 7 journeys pass; [receipt](evidence/verify_native_sequence-2026-10-30T12-17-17-029Z-eb73d9ed/browser.json) |
| Linux original-backed new tests | 13 passed in the pinned Python 3.12 image, including failed-transfer budgeting and all 102 planes versus exact original; [receipt](evidence/irsa-linux-final-tests-20261030T125357.620567Z-d5932789/verification.json) |
| Linux service at `08350c2` | Four groups pass: nonroot/read-only/resource and Host/Origin controls, queue/cancel limits, actual archive acquisition/calibration/reference preparation, graceful restart with identical completed result; [receipt](evidence/irsa-linux-08350c2-20261030T1255/verification.json) |

NumPy independently reconstructed the displayed 267² plane-63 RGBA image: all 71,289 pixels match exactly, SHA-256 `27023589ba52c304536deb07ec8cf80d342c02566f9b7311bc7cdfadf06044dc`. Five sampled browser sky coordinates agree with Astropy's full original-FITS celestial WCS within 1e-9 degree. This tests the renderer, not absolute astrometric accuracy of the source. See [reference](evidence/irsa-mosaic-reference-20261030T121156.468862Z-1493a9c9/reference.json).

The exact original also rendered in the [official IRSA viewer](evidence/irsa-official-mosaic-2026-10-30T12-14-02-684Z-26d525ea/official-initial.png), plane 1 at 0.753 µm. The [same SKYSHIFT source/plane](evidence/irsa-same-plane-2026-10-30T12-44-44-913Z-52c2e9f1/skyshift-plane-001.png) retains corresponding structures and orientation, with independently chosen display limits/palette and explicit quality exclusions. IRSA uses inverted grayscale in this capture; bitmap equality between viewers is not claimed. An optional IRSA plane-63 re-fit attempt timed out and remains [recorded as unavailable](evidence/irsa-official-mosaic-2026-10-30T12-16-56-590Z-9cd60af4/result.json).

Genuine before/after: [existing M101 native UI](evidence/master-mission-2026-10-30T11-14-50-540Z-cd103974/m101-native-1440.png), [new M101 map UI](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/m101-1440.png), [mobile map](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/m101-390.png). These compare available UI/product contexts, not changes in the galaxy. The native original remains accessible. Larger image access and controls are implemented and automated; subjective human visual acceptance remains unclaimed.

Additional genuine region captures: [Cygnus](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/cygnus-1440.png), [NGC 1760](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/ngc1760-1440.png), [mobile Cygnus](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/cygnus-390.png), [mobile NGC 1760](evidence/irsa-upgrade-browser-2026-10-30T12-42-58-461Z-b584c180/ngc1760-390.png).

## Future product ingestion procedure

1. Verify an official release announcement, exact collection, documentation revision, usage terms and an authoritative product URL. Record retrieval times independently of exposure times. A publicity all-sky map does not establish availability of a downloadable calibrated all-sky FITS cube.
2. Preserve a bounded authentic reference file and source/hash receipt outside shipped data. Inspect HDUs, dimensions/dtypes/units, WCS including spectral table dependencies, time scales, flag definitions, unknown active bits, calibration identifiers and pipeline version. Unknown conventions fail closed.
3. Add an explicit release or mosaic adapter and authenticated test fixture. Update `releases.py` calibration pins only after checking exact source/calibration associations. QR2 D2 currently supports pinned provisional screening; QR3 supports source-verified individual visualization and survey context, without a calibrated temporal adapter. A real QR3 7.0.5 reference was read successfully; that does not enable QR2/QR3 flux comparisons.
4. Compare raw arrays, masks, wavelength identity and celestial coordinates against independent Astropy/NumPy calculations and the official viewer for the same original. Preserve failures and rejected comparisons. Require variance/exposure composition for any new quantitative/temporal method; a successful image decode is insufficient.
5. Generate a new immutable product version, with manifest, original/calibration/code hashes, processing description, source dates, units, support maps and bounded per-plane or tiled outputs appropriate to its dimensions. Never replace an existing v1 asset with different bytes. Choose acquisition/storage/transfer limits before downloading a large product.
6. Run Python/JS, installed Chrome/Edge, numerical source reconstruction and Linux service tests, including corruption, missing calibration/unknown release, cache invalidation, offline failure and export/reopen. Enable scientific operations separately from discovery/visualization only when their actual calibration, spectral, quality and registration gates pass; qualified scientific approval remains an independent PENDING gate.

No upcoming all-sky cube, new release, calibrated variability, motion measurement, source detection, physical-device/Safari certification, external novice study or human scientific approval is asserted. Hosting remains preparation-only. The implemented field discovery is scalable through bounded incremental scopes; it deliberately does not build a mission-wide mirror.
