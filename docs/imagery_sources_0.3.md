# SKYSHIFT 0.3 official imagery and design source record

Research and downloads: **16 October 2026 (UTC)**. The assets are editorial and educational mission imagery. They are **not** the calibrated arrays, preview renderings, masks, or evidence used by the SKYSHIFT comparison workflow.

## Ready-to-integrate files

All files below are in `research/redesign_assets/`. Each image was opened and visually inspected. Exact original and web-image checksums, source-page URLs, direct download URLs, publication dates, dimensions, file sizes, credits, image-category labels, recommended captions, and interpretation limits are in `assets.json`. Unmodified originals and downloaded source-page HTML are retained beside the web copies.

| File | Dimensions | Bytes | Intended use | Required distinction |
| --- | --- | ---: | --- | --- |
| `spherex-vela.jpg` | 2400 × 1187 | 800,697 | Wide hero or introduction; a rich starfield with an infrared-emitting cloud | Official **SPHEREx infrared composite**, not a SKYSHIFT temporal comparison |
| `spherex-all-sky.jpg` | 2400 × 1350 | 578,557 | Mission overview or full-image sky-map context | Published **May–December 2025 composite**, not a single observation or astrometric map |
| `spherex-spacecraft-concept.jpg` | 1920 × 1080 | 113,694 | Explain the telescope in Discover SPHEREx | **Artist’s concept**, not a spacecraft photograph or measurement |
| `m101-hubble-context.jpg` | 1024 × 800 | 244,232 | Educational introduction to the Pinwheel Galaxy | **Hubble mosaic, not SPHEREx data**; different instrument, detail, wavelengths and dates |

### SPHEREx Vela Molecular Ridge

Source: [NASA Photojournal PIA26354](https://science.nasa.gov/photojournal/spherex-vela-molecular-ridge/), published 2 July 2025. Credit: **NASA/JPL-Caltech**.

This published composite represents infrared wavelength intervals with visible colors: red 4.54–4.65 μm, green 2.83–3.20 μm, and blue 0.74–0.88 μm. The yellow feature toward the right is the emission nebula RCW 36. These are wavelength colors, not evidence that the sky changed over time. The black edges of the published mosaic are retained; they have not been filled. The publication date must not be repurposed as an exposure timestamp.

Recommended adjacent caption: **“Vela Molecular Ridge · Official SPHEREx infrared composite · NASA/JPL-Caltech”**, with a source link. A gallery card must not imply that a registered Vela temporal pair is available in SKYSHIFT unless the scientific pipeline later validates one.

### SPHEREx first all-sky map

Sources: [JPL PIA26600](https://www.jpl.nasa.gov/images/pia26600-spherexs-first-all-sky-map/) and the [official SPHEREx mission image page](https://spherex.caltech.edu/image/spherex20251218a-spherex-all-sky-map-2025), published 18 December 2025. Credit: **NASA/JPL-Caltech**.

The mosaic combines selected infrared wavelengths from observations collected May–December 2025. Visible colors distinguish emissions from stars, gas, and dust. JPL explicitly describes the published images as having spatial resolution reduced to 0.1% of the full-resolution data images. This is a striking overview, not a precision coordinate reference or a product from which users should measure variability.

Use the complete oval map in an accessible full-image view, even if a presentation hero crops its edges. Do not place exact field-position markers on it without independently verifying the projection, orientation, coordinate transformation, and the marker accuracy. An approximate educational schematic should be separate and explicitly labeled as such.

### SPHEREx spacecraft

Source: [NASA Photojournal PIA26531](https://science.nasa.gov/photojournal/spherex-in-orbit-artists-concept/), published 23 January 2025. Credit: **NASA/JPL-Caltech**.

The artwork depicts the spacecraft and its conical photon shields above Earth. The label **“Artist’s concept”** must remain visible next to the image. Never use it as an observation preview or substitute it for a science image in the comparison tool.

### M101 context from a different telescope

Source: [NASA Scientific Visualization Studio 30793](https://svs.gsfc.nasa.gov/30793/), released on that page 27 February 2017. Full credit: **NASA, ESA, K. Kuntz (JHU), F. Bresolin (U Hawaii), J. Trauger (JPL), J. Mould (NOAO), Y.-H. Chu (UIUC), and STScI**.

The published image is assembled from Hubble exposures, with elements from ground-based images near the edges. It is useful for explaining what the Pinwheel Galaxy is. Its fine structure is not detail measured by SPHEREx, and the image is not a registered third epoch of the SKYSHIFT comparison. The SVS publication date is not asserted to be the date of the underlying exposures.

The full credit should be available in an accessible credits area even if a short card caption reads **“M101 · Hubble mosaic, not SPHEREx data · Educational context.”**

## Reuse and identity

The usage basis is educational/informational presentation with attribution and source links, subject to the [NASA images and media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and, for the JPL imagery, the [JPL image-use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/). This record does not assert a Creative Commons license or blanket worldwide public-domain status. Respect source-specific credits and third-party restrictions; no additional restriction was displayed for the selected editorial assets in the reviewed captions.

NASA/JPL/Caltech endorsement must not be stated or implied. No NASA or JPL logo was acquired for SKYSHIFT branding. Keep **SKYSHIFT · Project Mercury Team** as the application identity. A suitable site statement is: **“An independent Project Mercury Team application using publicly available mission data. Not operated or endorsed by NASA, JPL, or Caltech.”**

## Presentation processing and verification

- `spherex-all-sky.jpg` and `spherex-vela.jpg` were downsampled proportionally with Pillow Lanczos resampling, then encoded as progressive JPEG at quality 90. Compression changes rendered pixels; these derivatives are presentation assets, not calibrated measurements. No crop, sharpening, color adjustment, enhancement, inpainting, generated detail, or scientific-array processing was applied.
- The spacecraft and M101 web JPEGs are byte-identical copies of the publisher-provided JPEGs. All four are under 1.5 MB each.
- `build_asset_index.py` reconstructs the derivatives and records original/web SHA-256 identities and Pillow version. The unmodified originals remain available for audit.
- Source downloads used Windows `curl` with HTTPS certificate verification enabled. Python urllib’s trust chain initially failed; no insecure-TLS option was used to work around it. JPL’s HTML page and policy were readable through the web tool but returned HTTP 403 to direct curl downloads. The exact JPL image download succeeded; the alternate official Caltech page HTML is retained.
- This asset record makes no claim about the provenance of the independent SKYSHIFT numerical pipeline; that requires its separate archive-to-browser audit.

## Observations from the requested design references

The current official page content and linked image structures were inspected on 16 October 2026; downloaded reference HTML is retained in `research/redesign_assets/design-*.html`. These are information-architecture observations, not a claim of completed pixel-by-pixel visual or accessibility certification of the NASA websites.

| Reference | Observed organizing approach | SKYSHIFT application |
| --- | --- | --- |
| [NASA homepage](https://www.nasa.gov/) | A compact global Explore entry leads to mission/topic navigation; editorial features and strong topic headings organize large image content. | Keep global navigation short and present an obvious first action before technical controls. |
| [NASA Science](https://science.nasa.gov/) | Science topics, mission discovery, and image-led articles are distinct from deeper mission information. | Separate the first-time visitor’s introduction from the observation workspace, then disclose methods through clear links and expandable sections. |
| [SPHEREx mission](https://science.nasa.gov/mission/spherex/) | A mission identity and introduction lead into stories, imagery, press-kit and mission resources. | Start Discover SPHEREx with what infrared observations reveal, then make original archive/source material easy to find. |
| [NASA Eyes](https://eyes.nasa.gov/) → [current Eyes landing page](https://science.nasa.gov/eyes/) | Visitors choose an experience by a familiar subject: Solar System, asteroids, Earth, or exoplanets; action labels name the subject they will explore. | Name entry points after a user goal or sky region. Keep unavailable and provisional data states clear; do not imitate full-sky access that SKYSHIFT does not provide. |
| [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/30793/) | A clear visualization title, downloadable media, original release context, and explicit credits stay together. | Give each mission image a category and credit; give each measured observation direct source identity and reproducible evidence. |

For the new visual hierarchy, use authentic wide imagery, ample whitespace, bold readable type, near-black/navy foundations, and restrained blue/red accents in SKYSHIFT’s own layout. This is a design recommendation; it does not claim to reproduce NASA’s branding, confer endorsement, or imply that decorative imagery is measurement evidence.
