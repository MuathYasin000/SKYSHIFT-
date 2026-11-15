# SKYSHIFT 0.12.0 — November 14, 2026

- Live coordinate search defaults to IRSA DR1. DR1 and QR3 are indexed independently with release-specific source identities and conservative masks. Archived QR2/D2 remains supported for prepared examples and screened comparisons.
- Added a two-date DR1 M101 example with native detector views and explicit wavelength differences. DR1 playback is for surveying observations. The earlier M101 matched-wavelength example retains its original reference checks.
- The homepage opens with direct science links, and the visible SPHEREx model loads independently. The introductory animation is available from the information dialog.
- Added a challenge field guide and a dated source-package manifest. Original dates, checksums and prior scientific decisions are preserved.

## Earlier release notes

### SKYSHIFT 0.9-mission-control — Link and content audit patch

2026-10-17T20:08:58.353977+00:00

The black/white design, CSP, existing routes and scientific restrictions are preserved. All 21 tracked scientific files under `web/dist/data/` remain byte-unchanged from `284b95f`. Qualified scientific approval and internal human review remain **PENDING**; independent novice validation remains **NOT CONDUCTED**.

## Follow-up: readable footer source links

The four JSON destinations reported by the user are now readable, same-tab Methodology panels: `#models`, `#fonts`, `#patterns` and `#libraries`. The original four source records are unchanged and remain available as byte-identical JSON downloads. All seven shared footers and corresponding information-dialog links are updated. Panels are generated statically from the records and remain readable without JavaScript.

Verification for this follow-up: 16 focused Chromium checks pass (all seven footers; all four actual links at 1440×900 and 390×844; four original-record downloads; no-JavaScript rendering). Zero page errors, HTTP errors or failed resource requests. Nine targeted Python frontend contracts pass. All 158 release file hashes and 323 local HTML references pass. Release metadata regenerated with the existing build script. No scientific files or source records changed. The earlier full regression and external-link results below describe the preceding audit; no new external availability claim is made.

## Numbered audit disposition

1. **FIXED** — Unassigned mission image, mission explanation and object-source anchors are hidden in static HTML; they appear only after assigning a source. Published-image links reset and wait for verified image decoding.

2. **FIXED** — Removed the operational /healthz anchor from the Universe shell. Release metadata remains available to diagnostics, without an exposed raw-JSON navigation link.

3. **FIXED** — Guide Back to SKYSHIFT now points to index.html.

4. **FIXED** — All seven shared footers link Image source records to methodology.html#imagery. The raw JSON download remains in Methodology.

5. **FIXED** — Vengeance UI credits and website record now use https://github.com/Ashutoshx7/VengeanceUI.

6. **FIXED** — The shared click interceptor preserves ctrl/meta/shift/alt, middle-button, target and download behavior. Repeated routes scroll to top and rerun routing. Root and index.html links preserve the same live scientific controller. Atlas cards also respect modified clicks.

7. **FIXED** — Shared route parsing accepts extensionless and .html paths, root home and directory home. Pretty-URL highlighting was tested with explicit HTML rewrite fixtures; a hosting provider must still serve those URLs.

8. **FIXED** — Added scripts/check-external-links.sh plus its standard-library extractor. Executed curl HEAD with normal TLS verification for every unique literal HTTP(S) URL found in HTML/JS and assets JSON. All non-200/non-3xx results are listed below; remote success is not assumed.

9. **FIXED** — Decoded corrupted editorial JSON strings as valid UTF-8. Also corrected existing encoding errors in vendor explanatory comments only; executable library logic is unchanged and its source notice records this. Decoded JSON/HTML/JS scans find no requested mojibake tokens.

10. **FIXED** — The four field-guide descriptions and other active Blue gaps guidance now describe neutral dark hatching and excluded measurements.

11. **FIXED** — Removed the stale guide display-release label; Methodology explicitly distinguishes the 0.2.0 preparation tooling from website release 0.9. The scientific bundle is byte-unchanged.

12. **FIXED** — Comparison log caption now states log(1 + 100 × normalized display intensity) / log(1 + 100). Guide wording also includes the denominator.

13. **FIXED** — Guide now says Open a saved comparison, matching the standalone button.

14. **FIXED** — Hosting-neutral static-file/browser storage wording replaces the misleading server phrases. Session diagnostics wording is updated. The historical page-generator template is corrected too.

15. **FIXED** — UI-pattern notices point to existing mission-interactions.js, home.css and components.css. They accurately identify retired spotlight/transition studies rather than claiming the current navigation still runs them. Existing cosmetic class names using the obsolete prefix were renamed consistently without style changes.

16. **FIXED** — Methodology credit thumbnails accept JPEG, WebP and PNG; Chromium confirms the Webb WebP card image.

17. **FIXED** — The duplicate Hubble credit in telescope-stories.js now exactly matches assets.json.

18. **FIXED** — The original asset URL and 1024×800 original_dimensions were already accurate. NASA SVS explicitly lists this filename as a 1024×800 print rendition. Clarified modifications/rendition rather than inventing a resize or changing the correct URL. A fresh HTTPS download has SHA-256 16da1f3b51cb85543fd2c104993d6b454faea7aabf58316aeba6f416a682d907, identical to the shipped image. Source: https://svs.gsfc.nasa.gov/30793/ .

19. **FIXED** — Inspected the actual assembled review ZIP: reproduction/pyproject.toml, reproduction/requirements-lock.txt and reproduction/src/skyshift/cli.py are present. Guide now gives Windows venv/package installation and explicit environment command paths. No new package was installed on behalf of a visitor.

20. **FIXED** — Deleted unused space-bootstrap.js after checking source references; regenerated release metadata does not list it.

21. **FIXED** — Discover mission motivation now says water and other ices.

22. **FIXED** — Standalone comparison, native M101 Sources & suitability, and Methodology use the shared read-only spectral-screen formatter. It reads manifest.suitability.checks[local_spectral_screen].measurements, displaying maximum 0.247 versus threshold 0.25 and stating this is a provisional engineering choice, not a NASA standard. No decision or measurement was changed.

23. **FIXED** — Regenerated the staged release.json, version.json, healthz and _headers with tools/prepare_public_static.py. SHA-256 and content_id come from the existing project implementation (tools/local_server.py content_identity); no algorithm was guessed and no hashes were hand-edited.

24. **NOT FIXED** — Complete external-link availability cannot be certified: 33 externally hosted URLs returned errors or transport failures in the HEAD run, including third-party code-comment examples and a historical NASA image-rendition URL. All achievable local integrity, local fragment/link, browser/CSP, navigation, stale-copy and regression checks PASS as detailed below. External responses are reported honestly; archived source identities were not replaced to manufacture a passing result.

## Executed verification

- Python: **108 passed**. JavaScript: **109 passed**.
- Full product workflow suite: **19 passed**, including notes/export/reopening, recovery, no-WebGL science and responsive interactions.
- Targeted refinement suite: **24 passed** at 1440×900 and 390×844.
- Static browser audit: **55 passed**, including 12 direct page/hash/query entry checks with the CSP from `_headers`, 37 homepage links, source visibility, repeated/root route behavior, modified clicks, pretty-URL fixtures and Resources panels.
- Zero page errors, console errors, CSP violations, HTTP errors or failed resource requests during the static browser audit. Navigation-cancelled requests are excluded from the failed-resource count. External-click tests validate native navigation intent using isolated response fixtures; their real remote responses are checked separately with curl.
- All **158 release file hashes**, release `content_id`, version/health metadata and `data/catalog.json` references match. **308 local HTML references** across **8 documents** resolve, including anchors and known application routes.
- Active shipped JSON (decoded), JS, HTML, CSS and notices contain none of the requested stale tokens. Historical project records outside the shipped build are preserved.
- Fresh NASA print-rendition download matches the existing image SHA-256. Review packet reproduction package contents inspected.
- Actual CLI installation commands are documented from packet contents; no new clean-machine package installation was claimed. Safari, physical mobile hardware and public deployment are outside this run.

Content ID: `613835334d50f0f8ad898b463bcd30a1be12003a9904f5cf06c23916a7675ac4`

Commands:

```text
.venv/Scripts/python.exe tools/build_site_chrome.py
.venv/Scripts/python.exe tools/prepare_public_static.py --destination tmp/skyshift-upload/dist
.venv/Scripts/python.exe scripts/verify_static_package.py
bash scripts/check-external-links.sh
node tools/verify_link_audit.mjs
node tools/verify_website_product.mjs
node tools/verify_refinement.mjs
.venv/Scripts/python.exe -m pytest -q
node --test web/tests/*.test.mjs
```

The browser audit uses the staged package at localhost:3001 with the project server and asserts its response CSP equals `_headers`. Runtime viewing remains at localhost:3000. Windows can run the external checker with Git Bash; `SKYSHIFT_PYTHON` can select the project interpreter.

## External HEAD results — every exception

Tested 257 unique URLs. Status counts: `000`: 4, `200`: 222, `301`: 1, `308`: 1, `403`: 13, `404`: 5, `406`: 1, `410`: 1, `429`: 9. The `000` example domains are literal upstream documentation examples. A 403/429 or HEAD failure does not prove a page is permanently unavailable; no GET fallback or authentication bypass is claimed. A 404/410 is retained as an explicit failed check. These links are provenance/reference destinations, not external runtime dependencies.

| Requested URL | HTTP status | Final URL |
|---|---|---|
| `http://jsperf.com/comparison-to-undefined/3` | 410 | `https://jsperf.com/comparison-to-undefined/3` |
| `http://geomalgorithms.com/a05-_intersect-1.html` | 403 | `https://fit-juice.com/recipes/` |
| `http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136` | 403 | `https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136` |
| `http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/` | 403 | `https://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/` |
| `http://www.gamedev.net/reference/articles/article1199.asp` | 403 | `https://gamedev.net/reference/articles/article1199.asp` |
| `http://www.terathon.com/code/tangent.html` | 406 | `http://www.terathon.com/code/tangent.html` |
| `https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/07/STScI-01G8H15R2PGEXQD7TYYBFJ3FT4.png/jcr:content/renditions/cq5dam.web.1280.1280.png` | 404 | `https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/07/STScI-01G8H15R2PGEXQD7TYYBFJ3FT4.png/jcr:content/renditions/cq5dam.web.1280.1280.png` |
| `https://computergraphics.stackexchange.com/a/4765` | 403 | `https://computergraphics.stackexchange.com/questions/1736/vr-and-frustum-culling/4765#4765` |
| `https://docs.unrealengine.com/latest/INT/Engine/Rendering/Materials/PhysicallyBased/` | 403 | `https://docs.unrealengine.com/latest/INT/Engine/Rendering/Materials/PhysicallyBased/` |
| `https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParamete` | 404 | `https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParamete` |
| `https://doi.org/10.1051/0004-6361/202243940` | 403 | `https://www.aanda.org/10.1051/0004-6361/202243940` |
| `https://en.wikipedia.org/wiki/Orthographic_projection` | 429 | `https://en.wikipedia.org/wiki/Orthographic_projection` |
| `https://en.wikipedia.org/wiki/Perspective_(graphical)` | 429 | `https://en.wikipedia.org/wiki/Perspective_(graphical)` |
| `https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion` | 429 | `https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion` |
| `https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order` | 429 | `https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order` |
| `https://en.wikipedia.org/wiki/Smoothstep#Variations` | 429 | `https://en.wikipedia.org/wiki/Smoothstep#Variations` |
| `https://en.wikipedia.org/wiki/Spherical_coordinate_system` | 429 | `https://en.wikipedia.org/wiki/Spherical_coordinate_system` |
| `https://en.wikipedia.org/wiki/Universally_unique_identifier` | 429 | `https://en.wikipedia.org/wiki/Universally_unique_identifier` |
| `https://en.wikipedia.org/wiki/X11_color_names#Color_name_chart` | 429 | `https://en.wikipedia.org/wiki/X11_color_names#Color_name_chart` |
| `https://en.wikipedia.org/wiki/parallax_barrier` | 429 | `https://en.wikipedia.org/wiki/parallax_barrier` |
| `https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/EXT_materials_bump` | 404 | `https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/EXT_materials_bump` |
| `https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_avif` | 404 | `https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_texture_avif` |
| `https://my-cnd-server.com/` | 000 | `https://my-cnd-server.com/` |
| `https://my-cnd-server.com/assets/models/` | 000 | `https://my-cnd-server.com/assets/models/` |
| `https://my-cnd-server.com/assets/models/model.bin` | 000 | `https://my-cnd-server.com/assets/models/model.bin` |
| `https://my-cnd-server.com/assets/textures/texture.png` | 000 | `https://my-cnd-server.com/assets/textures/texture.png` |
| `https://serverfault.com/questions/482875/why-does-nginx-remove-content-length-header-for-chunked-content` | 403 | `https://serverfault.com/questions/482875/why-does-nginx-remove-content-length-header-for-chunked-content` |
| `https://www.gamedev.net/articles/programming/math-and-physics/do-we-really-need-quaternions-r1199` | 403 | `https://gamedev.net/articles/programming/math-and-physics/do-we-really-need-quaternions-r1199` |
| `https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/inverse-lerp-a-super-useful-yet-often-overlooked-function-r5230/` | 403 | `https://gamedev.net/tutorials/programming/general-and-gameplay-programming/inverse-lerp-a-super-useful-yet-often-overlooked-function-r5230/` |
| `https://www.jpl.nasa.gov/jpl-image-use-policy/` | 403 | `https://www.jpl.nasa.gov/jpl-image-use-policy/` |
| `https://www.jpl.nasa.gov/images/pia26600-spherexs-first-all-sky-map/` | 403 | `https://www.jpl.nasa.gov/images/pia26600-spherexs-first-all-sky-map/` |
| `https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/spacecraft/` | 403 | `https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/spacecraft/` |
| `https://www.blenderkit.com/asset-gallery?query=SPHEREx` | 404 | `https://www.blendkit.com/?query=SPHEREx` |

## Package contents

`dist/` is the complete rebuilt static site. `CHANGELOG.md` is this disposition. `verification/` contains raw external responses, local package checks, browser results/output and regression output. Checker source remains in the project’s `scripts/` and `tools/` folders; the commands above were run from the project root. Serve the contents of `dist/` as the web root; do not open HTML with file://. No public deployment was performed.
