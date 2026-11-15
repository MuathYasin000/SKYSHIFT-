# AI assistance in SKYSHIFT

| Tool | Work | Where it appears |
| --- | --- | --- |
| OpenAI Codex | Software implementation, archive integration, tests, documentation, release tooling, audit and demo editing | Team-authored Python, JavaScript, HTML, CSS and tooling. The work includes coordinate search, response validation, World Coordinate System handling, mask-aware rendering, browser tests, the submission text and this audit. |
| Anthropic Claude | Project review and written instructions for the coding agent | Review and task brief supplied by the project owner. Claude's output informed this audit. There is no Claude inference in the served application. |
| OpenAI Codex | Source-informed procedural SPHEREx illustration, surfaces, studio lighting and sky scenery | `web/dist/spherex-model.js`, `spherex-materials.js`, `hardware-studio.js`, `space-atmosphere.js`, the home and Universe renderers, and the screenshots listed in the [interface asset manifest](web/dist/assets/mission-control-assets.json). JPL assembly photographs informed the geometry. The model is an educational illustration. |
| OpenAI Codex | Vector implementation of the owner's S/orbit/star mark and Inter-outline SKYSHIFT wordmark | `web/dist/assets/skyshift-mark.svg`, `web/dist/assets/skyshift-wordmark.svg`. The SVG metadata identifies the implementation assistance. The underlying mark came from the owner. Neither vector incorporates a NASA emblem. |
| OpenAI Codex | Browser-generated interface sound cues | `web/src/space-audio.js`, `web/src/application-sound.js` and their served copies. Cues use local Web Audio oscillators and noise after a user gesture. The project bundles no sound recording, voice or generated audio file. Source carries the acknowledgement as metadata. |
| OpenAI Codex | Processing scripts and derived metadata for real observations | SPHEREx cutouts, frame/target lists, WCS output grids, flags, scales, normalization receipts, alternate display products and evidence manifests. Pixels originate in NASA/IPAC IRSA observations or in explicitly credited optical/catalog context. Code creates derived arrays from the observations. The [data processing manifest](web/dist/data/ai-provenance.json) identifies the relevant data families. |
| OpenAI Codex | Demo script, slide copy, screenshot capture workflow and compliance evidence | `docs/demo_final.md`, `docs/demo/` and `docs/evidence/nasa-compliance-2026-11-15/`. Captures are from the actual app. The sky examples are real measurements. |
| Tool attribution unavailable per individual edit | Historic SKYSHIFT code, text, and assets | The earliest Git commits record revisions and author/committer fields, which do not establish tool-level authorship. The inventory includes the authored groups as potentially assisted. Attribution is based on the current owner brief, comments, manifest records, and history. |

The scientific inputs keep their existing provider, release, URL and content identity. The visible scientific views use real archive observations. Runtime spectral plots and comparisons derive from those observations. Official NASA/JPL illustrations, source models and survey images retain their upstream credits in the [source inventory](docs/third_party.md). Some official media was compressed or captured for display, as its source record describes.

## Assets and file-level record

- [Published mission imagery and credit](web/dist/assets/assets.json) records the byte-identical NASA/JPL-Caltech spacecraft concept, SPHEREx and Hubble imagery and mission composites. These do not receive an AI-generated label.
- The active social preview `mission-control-disclosed.png` and Universe thumbnail `spherex-thumbnail-disclosed.png` contain a visible AI-generated geometry label and PNG text metadata. The original renders remain historical assets.
- The home model label and the Universe model caption disclose the geometry. No archived measurement pixel is used as an illustration.
- `hubble-thumbnail.webp` and `webb-b-thumbnail.webp` are ordinary captures of official models rendered by assisted software. Source metadata retains that distinction. The current favicon is the project's S/orbit/star mark.
- [Shipped 3D provenance](web/dist/assets/space/manifest.json) distinguishes official source files and deterministic optimizations from original procedural geometry, materials and lighting.
- [Path inventory](docs/evidence/nasa-compliance-2026-11-15/si-file-inventory.tsv) indexes the submission tree by evidence class. A path-level class groups probable assistance where precise historical tool attribution is unavailable.

The Project Submission Guide places the solution idea and the originality declaration with the team. Earlier app work and subsequent event changes are recorded under [Project history](README.md#project-history).
