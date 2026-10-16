# SKYSHIFT: complete project plan

Project Mercury Team | Planning baseline: 16 October 2026 | Version 1.0

**Purpose:** finish a small, reliable public web application that lets a visitor compare one sky region in two suitable real SPHEREx observations, understand the limits of the comparison, annotate it, and export evidence another person can reconstruct.

This is a milestone-based plan. Progress depends on completed work and acceptance evidence, with no weekly schedule or event countdown. All application capabilities below are **planned**, unless explicitly identified as existing archive functionality. This planning review did not implement SKYSHIFT, validate an observation pair, or measure application performance.

## 1. The decision that should guide the project

Build one complete scientific workflow before expanding coverage. The core is:

1. A documented region and two real, distinct observations.
2. Suitability checks with understandable decisions.
3. Images prepared on a shared sky grid, with invalid regions visible.
4. A simple comparison with persistent dates and spectral context.
5. An annotation attached to sky coordinates.
6. A downloadable evidence packet and a tested reconstruction path.
7. A documented, deployed release that another person can use.

The strongest proposed contribution is **making a defensible comparison easier for a first-time visitor**. A blink effect alone will not establish novelty. The useful combination is guidance, visible compatibility evidence, and reconstruction of the user's exact view. Whether this helps users more than existing tools must be tested.

A reliable result can be: "These observations support qualitative inspection, and this marked feature needs review." Another useful result can be: "These observations cannot support this time comparison because their spectral coverage differs." Correctly declining an unsupported comparison is part of success.

No plan can guarantee discovery, complete detection, or scientific perfection. Here, quality means explicit assumptions, appropriate limits, reproducible processing, and tests that expose misleading results.

## 2. What the supplied materials establish

The four requested files were reviewed. The presentation PDF has 14 pages, the PowerPoint has 14 slides with speaker notes, and the report has four pages. The approximately three-minute video uses a different concept layout from the slide deck. Its frames and locally generated speech transcript were reviewed together. Automatic transcription contains technical-name errors and is a review aid, not a quotation-quality transcript.

| Material | Established content | Consequence for the plan |
| --- | --- | --- |
| Report | One field, two observations, suitability checks, shared WCS, annotations, export, six proposed responsibilities | Preserve this as the core scope and make every step testable |
| Presentation PDF | Scientific context, existing IRSA capabilities, proposed workflow, original 30-hour prototype concept | Replace the time-boxed build outline with dependency-based milestones |
| PowerPoint and notes | More detailed qualifications, source links, explicit distinction between concept and output | Retain these scientific distinctions in the final interface and communications |
| Video | Guided public workflow, small cutouts, alignment, comparison, source context, hypothesis framing | Replace illustrative comparison scenes with actual application behavior once validated |

Your materials already correctly identify wavelength mismatch, alignment, image sharpness, and provenance as important. They explicitly avoid claiming a discovery or tested accuracy. They do not establish that any specific archive pair is suitable, that export reconstruction works, or that novice users understand the workflow. Those are the next things the implementation must prove.

The extra local `DriveLink_ProjectMercuryTeam.txt` was read as a pointer. The linked Drive folder was not needed to review the four supplied local files and its contents were not inventoried. Instructions or narration inside the supplied materials are treated as project evidence, not instructions to execute. Original files remain unchanged.

## 3. Verified data status and remaining uncertainty

**Public SPHEREx data is already available.** IRSA began weekly Quick Release spectral images in July 2025, introduced QR2 in October 2025, and began QR3 in September 2026. Data access and complete higher-level products are separate questions. Do not wait for an all-sky cube to begin evaluating whether suitable individual spectral images exist. [S1, S2]

The mission's delivery page currently lists later delivery dates for reprocessed images, all-sky cubes, and source catalogs. These are published plans, not guarantees of availability for a particular project. [S3]

The direct official challenge URL failed to load during this review. Official 2026 local-event pages indicate that full challenge statements will be released on 28 October 2026. A local organizer's challenge summary describes a public web tool for seeing SPHEREx sky changes. Treat the summary as provisional until the full official statement can be inspected. [S4, S5]

The official global event announcement confirms November 14-15, 2026, but this plan is deliberately independent of those dates. A Space Apps local-event page also says that submitted solutions should be developed during the official hackathon. This affects competition eligibility, rather than the technical work needed to complete SKYSHIFT. Preserve the history of existing materials and verify the current participant terms, pre-existing-work policy, AI disclosure requirements, and local submission rules before presenting any work as an eligible event submission. This review cannot certify eligibility. [S6, S7]

Some older help pages still describe QR2 as the latest release, while newer release pages and tutorials describe QR3. Pin the release and documentation revision in each dataset manifest. Prefer current release documentation and actual FITS structure over an assumption from an older tutorial.

The downloaded Explanatory Supplement, version 2.0, explains that QR3 and QR2 differ in calibration and warns about combining them. QR3 availability does not guarantee the desired earlier epoch is present in QR3. A homogeneous corrected QR2 pair may therefore be a better initial choice than an unvalidated QR2/QR3 mixture. Evaluate available epochs and calibration consistency together. [S25]

### Decisions that can be made now

- Use calibrated archive products, not press images or first-light illustrations, as scientific inputs.
- Use small cutouts and a curated region, not a full-sky download.
- Prefer a homogeneous current release for the selected pair, subject to available coverage and validation.
- Keep the processing code independent of the browser application.
- Make reproducibility, rejection behavior, and deployment part of the core.

### Decisions that must await evidence

- The exact region, observations, useful time baseline, and spectral selection.
- Product-specific flags, spectral tolerances, and acceptable alignment residuals.
- Whether qualitative comparison is scientifically supportable for the selected pair.
- Whether a known moving object is available and suitable for a demonstration.
- Final challenge compliance and required submission format.

## 4. Definition of the finished core

The core is complete only when a new visitor can open the deployed application, understand what is being compared, inspect a validated real pair, record a location and note, download the evidence, and have another teammate reconstruct the same comparison in a clean environment.

| Requirement | Required behavior | Acceptance evidence |
| --- | --- | --- |
| R01 Real inputs | Two distinct calibrated SPHEREx observations of the selected region | Archive identifiers, original FITS, times, release, checksums |
| R02 Suitability | Deterministic pass, restricted, or rejected result for each check | Accepted-pair dossier plus intentional failure cases |
| R03 Shared geometry | Both views describe the same output sky grid | WCS round trips and independent reference-source residuals |
| R04 Honest display | Dates, local wavelength information, orientation, masks, and shared stretch remain visible | Screenshots and user-task results |
| R05 Comparison | Side-by-side inspection and explicit A/B switching work at a shared viewport | Interaction check after crop, reset, and display changes |
| R06 Annotation | Visitor can mark a position, write a note, and edit or remove it | Correct sky-coordinate export and reload |
| R07 Evidence | ZIP contains structured metadata, scientific products, preview, notes, and citations | Schema validation, checksum verification, reconstruction |
| R08 Recovery | Empty results, missing calibration, corrupt data, and unavailable network produce useful states | Failure-path records |
| R09 Deployment | Public release loads and exports without developer credentials | Independent-browser and clean-machine checks |
| R10 Communication | Report, deck, and video describe the same tested release | Feature-to-evidence audit |

"Planned," "implemented," and "validated" are different states. An implemented control becomes validated only after its acceptance check passes on the release being described.

## 5. Scope boundaries

### Required for the first complete release

One approved field and one approved real pair; a source inventory; immutable raw inputs; a suitability report; common-grid preparation; masked images; side-by-side viewing; a shared crop or viewport; explicit A/B switching; an optional slow, user-started blink if technically reliable; coordinate-based annotations; evidence export; reconstruction; local installation; public deployment; a user guide; and a limitations statement.

The curated pair may be shipped as a versioned data bundle so the application does not depend on a live archive request for every visit. The acquisition script must still retrieve and identify the real source data. This is a valid real-data integration, with the inventory snapshot and freshness clearly labeled.

### Add only after the core passes

Swipe comparison, additional dates within the same field, more curated fields, a more convenient image click picker, additional languages, known-object overlays, and improved public onboarding. Each addition requires its own evidence and must not weaken the core checks.

### Separate research extensions

Quantitative difference images, photometric variability, measured motion with uncertainty, automatic candidate ranking, orbit fitting, machine learning, all-sky exploration, accounts, public contribution queues, volunteer consensus, and persistent review services.

Do not introduce a database, API microservice, GPU model, or separate JavaScript application merely to make the project appear more advanced. They become relevant only when a demonstrated requirement exceeds the small architecture.

## 6. Users and the interaction they need

**Primary user:** a student or curious visitor with no FITS-processing experience. They need to answer: What am I seeing? Are these images fair to compare? What changed in the display? How can someone examine my observation?

**Secondary user:** a teammate, teacher, or technically experienced reviewer who needs source identifiers, methods, and reconstruction instructions. The first release supports review through exports rather than an online research collaboration system.

### The main journey

1. **Open the field.** See a short description, the selected region, a statement that the data are real archive observations, and the comparison status.
2. **Review the observations.** See A and B, full UTC times, their separation, the release, and wavelength context. Never substitute a processing date for an observation date.
3. **Understand suitability.** A concise explanation gives the most relevant result. A details panel exposes measured checks without overwhelming the main view.
4. **Inspect the images.** Side-by-side views share sky bounds, orientation, and display settings. A/B switching preserves the exact viewport.
5. **Record an observation.** Add a sky-coordinate position, an optional corresponding location in the other epoch, a category, and a note. "Uncertain" is a useful category.
6. **Save evidence.** Download the packet and see the next step for reconstruction. The export repeats the real-data or synthetic-data label.

A rejected pair can appear in a separate educational example, with time-comparison controls disabled. The visitor should immediately understand both the reason and a possible remedy.

### Plain-language explanations

- Spectral mismatch: "These observations sample different infrared wavelengths here. Their appearance alone cannot establish a change over time."
- Poor support: "This part of the field does not have usable pixels in both observations."
- Alignment limitation: "The reference sources do not line up closely enough for the intended comparison."
- Candidate note: "You marked a possible difference. The cause has not been established."

## 7. Data discovery and field selection

The first scientific deliverable is a **pair dossier**, not a polished home page. It should demonstrate that the rest of the project has valid inputs.

### Acquisition approach

Use IRSA's documented Simple Image Access service through PyVO or Astroquery to inventory images for a bounded region. IRSA currently documents QR2 and QR3 wide and deep collections. Use returned access URLs rather than constructing filenames from memory. Use the documented cutout service for small spatial subsets. [S8]

Use TAP only if the simpler inventory lacks required metadata or a documented query provides a clear advantage. Keep archive-specific column mappings in one adapter because examples and schemas can evolve. IRSA's cutout notebook is a starting reference, not production code to copy without error handling or release checks. [S9]

### Candidate-field strategy

Explore a small shortlist rather than arbitrarily selecting the most attractive published image. Rank candidates by shared coverage, useful distinct times, compatible local spectra, adequate reference sources, limited crowding, limited saturation, and manageable background structure.

Choose the simplest valid field first. A quiet field provides a valuable negative control even if no obvious object moves. A known moving object is a desirable second case only if the observations and wavelength compatibility support it.

For known solar-system objects, IRSA's Moving Object Search Tool now supports SPHEREx. JPL Horizons can provide observer-dependent predicted positions. Do not assume an Earth-center prediction exactly describes an observer in low Earth orbit; confirm the observer, timescale, position convention, and uncertainty. A predicted position helps identify a known object but does not prove a visible feature is that object. [S10, S11]

### Selection sequence

1. Define candidate coordinates, search radius, collection, and desired comparison purpose.
2. Save query parameters and the original returned inventory.
3. Distinguish physical observations from reprocessed versions of the same observation.
4. Inspect observation times and footprints. Identify distinct epochs with common usable coverage.
5. Retrieve a bounded set of cutouts and required calibration references.
6. Inspect headers and HDU names, units, masks, spectral metadata, and product version.
7. Evaluate local wavelength compatibility across the intended inspection area.
8. Identify reference sources and estimate whether registration can be checked meaningfully.
9. Reject unsuitable candidates with a written reason. Do not quietly drop failed downloads.
10. Select the pair only after another teammate reviews the dossier.

### Pair dossier contents

Scientific purpose; coordinate frame; sky bounds; observation IDs; exact time interpretation; time baseline; release and pipeline versions; archive URLs; original checksums; detector information; spectral and PSF calibration identifiers; units; flag policy; valid coverage; provisional alignment checks; accepted restrictions; and reviewer sign-off.

No specific pair was acquired or validated in this planning task. Published examples such as M101 cutouts show access methods, not suitability of a pair for SKYSHIFT.

## 8. Suitability checks and decisions

Use separate checks rather than one opaque "trust score." Each check stores the measured value, policy version, threshold where applicable, result, and human explanation.

| Check | What to establish | Failure behavior |
| --- | --- | --- |
| Product identity | Supported calibrated product and actual HDU layout | Reject unsupported format or missing required data |
| Distinct observation | Different physical observation times, not two reductions of one exposure | Reject temporal interpretation |
| Time meaning | Valid observation interval and declared timescale | Reject unknown or inconsistent timing |
| Geometry | Shared sky coverage on the intended inspection region | Restrict to supported overlap or reject |
| Pixel quality | Finite values and usable flag states in both images | Mask affected area; reject inadequate support |
| Spectral compatibility | Local central wavelengths and widths sufficiently comparable | Restrict region or reject time-comparison mode |
| Units | Compatible calibrated units with explicit conversions | Reject unknown units |
| Registration | Adequate reference-source agreement for the intended task | Restrict or reject; never call reprojection proof of alignment |
| Image response | PSF and background differences assessed for qualitative use | Show limits; block quantitative residual claims |
| Provenance | Complete source and calibration identity | Block a validated export if essential identity is missing |

### Spectral compatibility needs local information

SPHEREx uses linear variable filters. Wavelength changes across the detector, so the same sky coordinate or detector label does not establish spectral equivalence. A field-level pass cannot rely only on its center pixel. [S12]

Evaluate the selected inspection footprint and any annotated location, including both endpoints when a moving feature is marked in A and B. If a feature changes position, its observed wavelength can change with detector location. Shrink the permitted inspection region when that produces a defensible local comparison.

A possible engineering diagnostic is the central-wavelength separation divided by an effective local bandwidth. Another is overlap of available response descriptions. A rectangular bandwidth-overlap approximation can support screening but is not equivalent to matching real spectral response functions. Source spectra can contain features that make apparently small differences matter.

The current archive product guide distinguishes visualization-oriented WCS-WAVE from CWAVE and CBAND calibration layers intended for science analysis. Use the latter when deriving scientific spectral checks and preserve parent-detector coordinate mapping. If only visualization metadata is available, disclose that limitation and do not certify a scientific comparison from it alone. [S13]

Choose tolerances before final acceptance tests, based on the selected products, science purpose, control behavior, and a knowledgeable review where available. Do not invent a universal wavelength percentage and label it NASA-approved.

### Quality flags

Decode flags using the matching release's Explanatory Supplement. Classify documented flags as fatal, restricted, or informational for this use. Store a named mask policy and version. Unknown bits require investigation. Do not treat every nonzero flag as automatically invalid, and do not treat every zero-valued pixel as a valid measurement.

For example, a SOURCE flag can indicate a known astronomical source rather than a defective pixel. Masking all nonzero flags could remove the objects visitors need to inspect. Conversely, the supplement notes that some faint satellite streaks may escape flagging. A zero flag is not proof of an astrophysical source. [S25]

### Decision states

- **Accepted for qualitative comparison:** all necessary checks passed for the defined region and purpose.
- **Restricted:** inspection is valid only in a specified subregion or with explicit limitations.
- **Rejected for time comparison:** essential evidence is missing or a critical check failed.

None of these states implies that a marked feature is a moving object. Pair suitability and candidate interpretation are distinct decisions.

## 9. Image preparation and alignment

Keep original cutouts immutable. Every prepared output must link back to input bytes, the calibration files, the configuration, and the software revision.

### Preparation sequence

1. Read the supported science HDU by name, not an assumed array index.
2. Validate dimensions, units, observation identity, time interpretation, and spatial WCS.
3. Preserve the original flags, uncertainty information, and calibration references.
4. Derive valid-data and spectral-compatibility masks.
5. Define one output coordinate system, center, bounds, orientation, pixel scale, and shape.
6. Reproject image samples with a recorded method appropriate for qualitative viewing.
7. Propagate coverage conservatively and mask unsupported edges.
8. Verify reference-source alignment independently of the transformation.
9. Create display previews with common limits and saved stretch settings.
10. Save the prepared arrays, output WCS, masks, diagnostics, and manifest.

Use a modest output sampling near the native scale. A smaller pixel grid can look smoother but cannot create angular resolution. Measure and display angular distances in the coordinate system rather than assuming screen pixels are detector pixels.

Reproject documentation describes different interpolation, adaptive, and overlap methods and their limitations. Start with one method and validate its behavior on the actual use case. Keep surface-brightness and flux conventions explicit. [S14]

### Mask handling

Never interpolate integer bitmasks as continuous brightness. Derive output invalidity from the contributing pixels and the selected support rule. Nearest-neighbor flag display may be useful, but by itself it can miss an invalid contributor to an interpolated science pixel. Save the resulting coverage and validity masks separately.

NaNs, missing coverage, and invalid data must look distinct from dark sky. Do not fill them with zeros and invite a false "object disappeared" interpretation.

### Registration checks

Use unsaturated, isolated, sufficiently strong reference sources across the field. Exclude likely high-proper-motion sources and problematic blends, or account for their motion. For small fields, aim for several well-distributed references; if the chosen cutout cannot support an informative check, enlarge it or select another field.

Record the number of usable references, median and upper-percentile residuals, spatial trends, and outliers. A visually aligned central source is insufficient. Hold some references out when fitting an empirical correction so the same sources do not both define and validate it.

WCS reprojection supplies geometric mapping; it does not repair every astrometric calibration error. If an extra correction is required, use the simplest justified transform, save its parameters, and demonstrate that it did not erase the feature of interest. [S15]

### PSF and background

Review local image sharpness and background differences before claiming a fair qualitative view. Current IRSA tutorials distinguish older PSF products from newer ePSF representations and recommend the newer models for scientific analysis. Read actual HDU contents and product version rather than assuming QR2 and QR3 use identical layouts. [S16]

Avoid deconvolution, sharpening, denoising, and adaptive per-image contrast in the core scientific view. They can create or exaggerate apparent changes. Preserve original calibrated intensity arrays. Any background treatment must state whether it is display-only or modifies prepared scientific arrays, and retain its model and parameters.

## 10. Comparison controls

Use a single main workspace with the field, two observation labels, and two linked image views. Put detailed provenance and diagnostics in expandable sections.

### Core controls

- Select the approved pair, initially the only real pair available.
- Change a shared sky crop or viewport without changing the selected observations.
- View both images side by side with identical bounds, orientation, and display scale.
- Switch explicitly between A and B in the same image area.
- Reset to the approved field view.
- Adjust a shared intensity range and stretch, with a visible custom-setting indicator.
- Toggle valid-coverage overlays without hiding their existence.
- Add, edit, and remove annotations.
- Download evidence and open source references.

A slow blink can improve inspection if the team implements it without rerun flicker or loss of state. Start only after a user action, provide a stop control, and retain manual switching and a static alternative. Keep any brightness flashing conservative and review accessibility guidance. [S17]

Swipe is optional because it adds interaction complexity without being necessary for a valid comparison. If implemented, it must use the same prepared images and coordinate mapping.

### Persistent observation context

Show A/B identifiers; full observation date and time; UTC label; time separation; local wavelength and bandwidth or an honest qualified range; coordinate frame; scale and orientation; release; and current suitability state. An inspection at a different location must update local spectral context or explain the scope of the displayed value.

### Display policy

Use a common display transform in comparable units. Derive robust initial limits from a documented shared valid region, then let the user adjust both images together. Export the exact numeric limits. Independent auto-stretch may be offered only as a clearly labeled exploratory option that cannot masquerade as evidence of brightness variability.

## 11. Annotation design

The minimum reliable annotation is a sky position with a note. An optional second position lets users describe an apparent shift between A and B without asserting measured physical motion.

Each annotation should contain an ID, sky coordinate frame and units, A position, optional B position, annotation category, note, creation time, and the comparison ID. Store output-grid pixel positions as derived context, not the only persistent coordinates.

Recommended categories are possible position difference, possible brightness difference, image artifact or quality issue, and uncertain. These record the user's observation, not a classifier's conclusion.

Begin with a coordinate form and crosshair overlay, with a shared numbered pixel grid or coordinate readout for guidance. This yields a complete and accessible interaction without making a custom frontend a critical dependency. A click picker is a convenience upgrade. If used, keep it small and test browser display scaling, image origin, crop offsets, axis ordering, and coordinate conversion. Streamlit supports bidirectional custom components if a controlled implementation is needed. [S18]

Switching pairs or processing versions must either create a new comparison or revalidate existing annotations. Do not silently attach a saved note to a different dataset. Notes belong to each visitor's session and export, not a globally shared mutable cache.

## 12. Evidence export and reconstruction

Export a ZIP that a reviewer can inspect without running the application. JSON is the canonical structured record. A preview image is supporting context, not the complete scientific evidence.

### Required packet contents

| File or group | Purpose |
| --- | --- |
| `manifest.json` | Schema version, comparison identity, source metadata, processing, display, annotations, status |
| `checksums.sha256` | Verify all included data and records |
| `sources/` | Original cutouts and small required calibration products, or immutable retrievable references with hashes |
| `prepared/` | Shared-grid FITS arrays, WCS, masks, and relevant diagnostics |
| `preview.png` | Labeled view with dates, wavelength context, orientation, masks, and annotation |
| `annotations.json` | User notes and coordinates, explicitly separated from archive metadata |
| `suitability.json` | Check values, policies, decisions, and restrictions |
| `README.txt` | Plain-language interpretation, reconstruction instructions, and limitations |
| `citations.txt` | Release-specific DOI, required acknowledgements, software and image credits |

For this small curated release, prefer a self-contained packet where size permits. If a calibration is referenced rather than embedded, state the external dependency and archive the exact checksum. Never imply a self-contained reproduction if essential inputs must still be downloaded.

### Manifest fields

Include schema version; app release and code commit; dataset kind (`real`, `synthetic`, or `real_with_synthetic_injection`); archive query and retrieval timestamp; observation IDs and times; original time scales; release and pipeline identity; source URLs and checksums; input HDU mapping; units; calibration identity; field geometry; spectral policy; quality-mask policy; output WCS; transformation settings; registration evidence; background or PSF treatment; display settings; annotations; and limitations.

Use JSON null for genuinely unknown optional values. Critical unknown fields block a validated scientific export. Do not invent timestamps or serialize unexplained NaN values as valid scientific metadata.

### Reconstruction acceptance

Another teammate starts from a clean environment and only the documented source release plus packet. They verify hashes, reconstruct prepared products, reopen the annotation, and compare the result.

The masks and declared grid should match exactly. On the pinned environment, aim for identical numerical arrays. If platform differences prevent this, use explicit absolute and relative tolerances in scientific units, set before the final test, and report the observed maximum error. Compare semantic WCS properties and data, not FITS file bytes that may differ only in nonessential headers. Compare preview pixels rather than compressed PNG file bytes if encoders differ.

A screenshot that looks similar is insufficient. A JSON record containing URLs without processing settings is insufficient.

## 13. Small, maintainable architecture

Keep the initial architecture in one Python repository with two entry points: a command-line data-preparation pipeline and the Streamlit application. The application reads approved bundles and handles viewing, session notes, and exports. The pipeline handles archive access and scientific preparation.

| Component | Responsibilities | Avoid putting here |
| --- | --- | --- |
| Archive adapter | Search, inventory normalization, bounded downloads, provenance | UI logic or annotation state |
| Product reader | FITS validation and release-aware calibration interpretation | Plot styling |
| Suitability module | Deterministic checks and reason codes | Unexplained confidence scores |
| Preparation module | WCS, masks, arrays, previews, diagnostics | Network requests hidden inside display code |
| Evidence module | Manifest schema, packet generation, reconstruction | Streamlit-specific state |
| Streamlit application | Guided workflow, controls, notes, downloads | Scientific rules copied from other modules |

Recommended tools are Python, NumPy, Astropy, PyVO or Astroquery, Reproject, Matplotlib for labeled exports, Streamlit, and a lightweight schema validator. Pin a tested compatible set rather than automatically selecting newest versions. Introduce Photutils only if reference-source measurement needs it. Use a dependency lock or equivalent repeatable environment definition.

Streamlit reruns application code on interaction. Cache approved immutable data and deterministic public computations. Keep visitor annotations and current selections in session state. Cache keys must include source hashes, calibration identity, output geometry, policy versions, and code/configuration identity. Do not let a changed calibration reuse a stale prepared preview. [S19]

### Suggested repository layout

```text
skyshift/
  app.py
  pyproject.toml
  dependency-lock-file
  src/skyshift/
    archive.py
    products.py
    suitability.py
    preparation.py
    coordinates.py
    annotations.py
    evidence.py
    cli.py
  schemas/
    comparison.schema.json
  config/
    curated_field.yaml
    suitability_policy.yaml
  tests/
    fixtures/
    test_products.py
    test_coordinates.py
    test_suitability.py
    test_reconstruction.py
  docs/
    user_guide.md
    data_dossier.md
    methods.md
    limitations.md
    deployment.md
    feature_status.md
  data/
    raw/
    calibration/
    approved/
  tools/
    fetch_data.py
    prepare_pair.py
    reconstruct_packet.py
  LICENSE
  README.md
```

These paths are a design proposal, not implemented files. Keep large generated products outside ordinary source-control history unless deliberately included as a small licensed fixture. Commit manifests and acquisition instructions. Choose a clear code license and preserve upstream licenses and data acknowledgements.

## 14. Verification strategy

Testing should address ways the project can mislead or fail. It should not consist mainly of tests that repeat the implementation.

### Scientific and numerical checks

- Distinguish physical observation IDs from product revisions.
- Parse dates and timescales correctly, including time ordering.
- Confirm sky/pixel round trips across the image, including corners and cropped views.
- Check x/y versus row/column ordering and FITS versus Python pixel conventions.
- Test valid coverage, NaNs, edge masks, and rejected quality states.
- Test spectral checks at the center and away from it.
- Verify the calibration file and parent-detector coordinate mapping used for local spectral and PSF information.
- Quantify reference-source residuals independently of any fitted transform.
- Preserve a stationary control field without inventing motion through display changes.
- Test the exact reconstruction path for the release artifact.

### Synthetic controls

Use synthetic data to expose software defects, with permanent labels in the interface and exports. Include a fixed scene, a known shift, a rotated or translated grid, an invalid edge, a corrupt header, incompatible wavelengths, a PSF change, and a brightness change without position change.

For a real image with injected motion, declare it a real background with a synthetic injected source. Keep the injection parameters, seed, truth coordinates, and generating method. Inject before preparation when evaluating the whole pipeline. A post-render moving dot tests the UI only.

These cases do not establish real survey detection sensitivity. The first release has manual inspection, so its tests concern correct geometry, honest context, valid processing, and usable evidence.

### Failure-path checks

Exercise an empty archive query, unavailable URL, partial download, unsupported HDU layout, missing spectral calibration, failed WCS, no common usable region, unknown critical flag, oversized request, invalid annotation, export failure, and import of an unsupported manifest version. Preserve the last valid session state when a recoverable operation fails.

### User checks

Recruit five novice reviewers for an initial formative test. Ask each to identify the two dates, explain whether wavelength is held suitably comparable, locate the permitted inspection area, add a note, and export evidence. Include a deliberately unsuitable pair to see whether the explanation works.

Record task completion, misconceptions, time, and assistance. An initial usability target is at least four of five completing the essential tasks without coaching. Every observed critical misunderstanding requires investigation even if the count reaches that target. A sample this small is a usability diagnostic, not a population-level effectiveness result.

Where possible, ask one astronomy-informed reviewer to inspect the pair dossier, spectral policy, registration evidence, and limitations. If expert review is unavailable, state that clearly and keep scientific claims within what the controls support.

## 15. Acceptance targets and measurement rules

The following are **proposed engineering targets**, not achieved results, NASA standards, or universal scientific tolerances. Set the final policy before release acceptance and change it only through a documented scientific or product decision.

| Area | Initial acceptance rule | Why it matters |
| --- | --- | --- |
| Source identity | All required source and calibration records present and hashed | A reviewer can identify exact inputs |
| Timing | Distinct physical epochs with known observation-time interpretation | Prevent false time comparisons |
| Spectral suitability | Pass a documented local policy across the approved inspection area | Center-only agreement can be misleading |
| Common support | Annotation permitted only where both images have valid support | Prevent false disappearances |
| Coordinate arithmetic | Round-trip target below 0.001 output pixel for supported transforms | Test software conversion, not absolute sky accuracy |
| Registration | Field-specific tolerance selected from controls and task requirements | Avoid arbitrary claims of astrometric precision |
| Annotation | Exported and reloaded sky position agrees within the declared numerical tolerance | Browser scaling must not move evidence |
| Reconstruction | Same grid and masks, arrays within predeclared tolerance | Reproducibility is a core feature |
| User understanding | At least 4/5 complete essential tasks; critical misconceptions investigated | Practical initial usability check |
| Cached controls | Aim for response within 0.5 seconds at the 95th percentile | Keep inspection comfortable |
| Warm load | Aim for the curated view within 5 seconds on a stated test connection | Make the public workflow approachable |
| Export | Aim for packet generation within 10 seconds for the approved small bundle | Set realistic interaction expectations |
| Session isolation | Two simultaneous sessions never share annotations | Protect correctness and privacy |
| Failure behavior | All critical rejection fixtures stop unsupported comparisons | Reliability includes declining bad inputs |

Measure cold starts separately from warm loads. Record machine, browser, connection, bundle size, run count, and percentile method. If performance targets are missed, optimize or publish a revised justified target before claiming acceptance. Scientific gates cannot be traded away for speed.

## 16. Six-person ownership and review

Keep the report's proposed responsibilities, with explicit handoffs. These assignments are planning defaults that the team can adjust to skills.

| Member | Primary ownership | Independent reviewer | Main deliverable |
| --- | --- | --- | --- |
| Muath Yasin | Integration, requirements, release, deployment | Asem Abdallah | A working tagged release and consistent application workflow |
| Haitham Yasin | Archive access, inventory, source identity, calibration acquisition | Kareem Malhis | Approved pair dossier and retrievable source bundle |
| Mohammed Darawsheh | Image preparation, WCS, masks, registration diagnostics | Haitham Yasin | Reproducible shared-grid products |
| Abdallah Amer | Streamlit workflow, comparison controls, annotation interaction | Asem Abdallah | A usable public interface with correct context |
| Asem Abdallah | Test design, export/reconstruction, release acceptance | Muath Yasin | Evidence that the release passes or clearly fails each gate |
| Kareem Malhis | Scientific explanations, limitations, references, aligned report/deck/video | Mohammed Darawsheh | Accurate public explanations and matching communication assets |

One owner integrates each module. Another person reviews scientific or coordinate-sensitive changes. Data and processing owners agree on the manifest before the UI consumes it. Verification starts with the first fixture, not after interface completion.

Use small reviewed changes with an issue describing expected behavior and acceptance evidence. Keep decisions in short records: what was selected, alternatives considered, evidence, and what would cause reconsideration. Preserve time for cross-training so one absent teammate cannot block data access, deployment, or reconstruction.

## 17. Milestone sequence

Milestones describe finished evidence, not elapsed time. Start the next scientific stage only when its dependencies are satisfied. Documentation and verification can proceed alongside implementation after interfaces are agreed.

### M0. Requirements and evidence baseline

**Work:** approve the core requirements, scientific claims, feature statuses, repository structure, owners, and communication rules. Record challenge-specific requirements as provisional until the full statement is available.

**Deliverables:** requirements matrix, feature-status register, source register, architecture decision, and initial test inventory.

**Exit:** every required feature has an owner and acceptance check. The team agrees that a validated real comparison, export, reconstruction, and deployment define the finished core.

### M1. Real-data feasibility

**Work:** query candidate fields, inspect product versions and calibrations, distinguish physical epochs, retrieve bounded cutouts, and draft the suitability policy.

**Deliverables:** inventory, raw cutouts and checksums, calibration references, pair dossier, and rejected alternatives.

**Exit:** one real pair is documented as feasible for the intended qualitative inspection, with no unresolved critical metadata or spectral issue. If no pair qualifies, choose another field or narrow the inspection region. A synthetic pair cannot close this milestone.

### M2. Reproducible preparation

**Work:** implement release-aware reading, masking, local spectral checks, shared geometry, reference diagnostics, and preview creation.

**Deliverables:** command-line preparation path, approved bundle, output WCS, masks, numerical diagnostics, and policy/configuration records.

**Exit:** another teammate can rerun preparation from original inputs. Coordinate and support checks pass. Alignment evidence supports the declared task. Quantitative motion remains outside scope.

### M3. End-to-end application core

**Work:** load the approved bundle, show dates and spectral context, implement shared views and switching, preserve state, add annotation and preliminary export.

**Deliverables:** locally runnable application and a complete visitor-to-export path.

**Exit:** a teammate unfamiliar with the implementation performs the whole workflow. The application refuses the intentionally unsuitable pair. Real and synthetic views remain unmistakably labeled.

### M4. Evidence and reconstruction

**Work:** finalize the schema, build the self-contained packet where practical, add checksums, source citations, and clean-environment reconstruction.

**Deliverables:** valid example packet, reconstruction tool and instructions, automated schema and numerical checks.

**Exit:** a second person reconstructs the same grid, masks, annotations, and arrays within declared tolerances without undocumented assistance. Missing data or checksum mismatch is reported clearly.

### M5. Reliability and user understanding

**Work:** complete failure cases, synthetic controls, stationary control, annotation-coordinate checks, novice sessions, accessibility review, and performance measurement.

**Deliverables:** release acceptance report, resolved defect list, measured results, and limitations.

**Exit:** no critical scientific-context, coordinate, data-integrity, or session-isolation defect remains. Essential user tasks pass the agreed formative criteria. The team has not concealed failed scientific checks behind interface polish.

### M6. Deployment and operational handoff

**Work:** deploy the tagged release with the versioned approved bundle, test fresh browsers and network failure behavior, document maintenance and rollback.

**Deliverables:** usable public URL, deployment instructions, local fallback, bundle storage policy, and named maintenance owner.

**Exit:** an independent user opens the public release, annotates and exports. Two sessions remain isolated. A teammate can restore the last accepted release.

### M7. Aligned communication and completed release

**Work:** update report, presentation, and three-minute video from the same release. Replace concept scenes with demonstrated behavior. Audit claims against evidence.

**Deliverables:** release tag, final evidence packet, methods and user documentation, updated communication files, and feature-status record.

**Exit:** all core requirements have evidence. The report, slides, narration, captions, and application agree about what works, what was simulated, and what remains future work.

## 18. Dependency and work-sizing rules

The critical dependency chain is requirements, real-data feasibility, preparation, complete workflow, reconstruction, validation, deployment, and aligned communication.

Useful concurrent work includes novice task design during data review, export-schema drafting during preparation, and documentation during implementation. Do not build a complex viewer around assumed input arrays before the data contract is agreed.

Use size labels rather than promised completion dates: **S** for a contained change with a clear interface, **M** for work across modules or requiring data inspection, and **L** for uncertain science or integration. Split any L item once its uncertainty is resolved. The separate execution backlog supplies owners, dependencies, and done conditions.

When a milestone fails, identify the failed assumption and change the smallest affected part of the plan. Examples are selecting another field, enlarging a cutout to obtain references, restricting a spectral-compatible region, or retaining manual switching when blink is unstable. Do not bypass the failed acceptance criterion.

## 19. Deployment and operation

### Recommended first deployment

Use a managed Streamlit-compatible host with the approved curated bundle and modest resource needs. Streamlit Community Cloud is one candidate; confirm current limits, repository requirements, and bundle size before selection. A small container on another host is a fallback if data size or runtime behavior requires it. No hosting price or free-tier guarantee is assumed. [S20]

Separate dataset preparation from public page loads. A visitor should not trigger large downloads or an unbounded archive search. The UI may show a frozen approved inventory with a retrieval date and a clear link to the upstream archive.

### Release package

Pin dependencies, record the code commit, include small synthetic fixtures, identify the approved bundle by checksum, and document installation and start commands. Reproduce the environment on a second machine. Add a container only if it makes deployment or reproducibility materially simpler for the team.

### Operational behavior

- Set bounded downloads, retries, timeouts, and clear job outcomes in the acquisition tools.
- Reuse approved cached data when the archive is unavailable, labeled with its snapshot identity.
- Treat a new calibration release as a new validation candidate, not an automatic replacement.
- Retain the previous approved bundle and application tag for rollback.
- Keep visitor notes in session/export only for the first release. State that the project does not retain them server-side.
- Log technical failures without storing unnecessary note text or personal information.
- Validate annotations as text and coordinates; do not execute imported settings or arbitrary URLs.
- Keep archive access constrained to approved services and validated products.

Routine maintenance includes checking broken archive references, reviewing dependency changes, re-running reconstruction after relevant upgrades, and verifying that the public URL still loads. Assign an owner rather than implying automated monitoring already exists.

## 20. Resource and cost control

Begin with ordinary CPU processing and small cutouts. A GPU is unnecessary for this core. Measure actual FITS, calibration, prepared-array, and export sizes before selecting storage or hosting.

Budget by resource category: developer environment, dataset/calibration storage, hosted memory, exported bandwidth, and optional domain. Obtain current prices when choosing a service. Keep deployment optional costs separate from the scientific feasibility decision.

Reduce resource use by preparing one approved bundle once, reusing calibration files by checksum, deriving previews from stored arrays, avoiding full-frame downloads when cutouts suffice, and limiting public requests. A small cutout can still contain substantial PSF information, so measure bytes rather than estimating solely from image dimensions.

For maintainability, prefer a few well-understood dependencies, a concise user guide, and reproducible scripts. Do not add infrastructure that the six-person team cannot explain or restore.

## 21. Risk register and fallback decisions

| Risk | First signal | Mitigation and fallback | Owner |
| --- | --- | --- | --- |
| No suitable real pair | Spectral or coverage checks repeatedly fail | Change field, restrict region, or reduce scientific claim; keep real-data milestone open | Haitham |
| Spectral mismatch missed | Center passes but other locations diverge | Map local compatibility and recheck annotation endpoints | Haitham |
| Wrong calibration version | Missing or unfamiliar HDU structure | Inspect version and documentation; reject unsupported product | Mohammed |
| False apparent motion | Many reference sources shift together | Inspect residuals and correct only with validated transforms | Mohammed |
| PSF or blend artifact | Shape changes around crowded or bright sources | Use simpler field and show limitations; defer residual analysis | Mohammed |
| Background-driven contrast | Broad differences dominate the view | Shared display policy and explicit background treatment | Mohammed |
| Wrong annotation coordinates | Marker changes after crop or reload | Single conversion module and corner/scaling tests | Abdallah |
| Stale cache | New input produces an old preview | Content-based keys including calibration and policy | Muath |
| Notes cross sessions | One visitor sees another's annotations | Session state and two-session test | Abdallah |
| Export lacks context | Reconstruction requires manual guessing | Canonical schema, self-contained packet, clean-machine test | Asem |
| Archive unavailable | Query/download timeout | Bounded retries and approved cached bundle | Haitham |
| Scope expansion | Extra features start before core passes | Require acceptance of each milestone; move extras to future backlog | Muath |
| Misleading public claim | Slide says implemented while app shows concept | Feature-to-evidence audit for every medium | Kareem |
| Deployment mismatch | Works locally, fails remotely | Fresh-instance test with exact bundle and pinned environment | Muath |
| Critical user misconception | Reviewer treats wavelength difference as motion | Rewrite context and controls, then repeat affected task | Kareem |
| Eligibility uncertainty | Rules restrict pre-existing work | Preserve provenance and verify organizer policy before submission | Muath |

If real-data validation remains incomplete, a synthetic demonstration can show software progress, but the finished real-data project remains incomplete. This fallback must never be presented as satisfying R01-R03.

## 22. Creativity that strengthens the core

### A. An explanation for every comparison decision

Let a visitor see why a pair is accepted, restricted, or rejected. Use concise reasons with a measured detail view. The creative contribution is turning a difficult scientific judgment into an understandable workflow while preserving its limits.

### B. A comparison that another person can reopen

Make the evidence packet a first-class result. A reviewer should see the exact field, observations, settings, restrictions, and note. This is more useful than a dramatic screenshot with missing source information.

### C. A short lesson about misleading changes

Include a labeled synthetic or reference lesson showing a wavelength difference, a registration error, and a real time-comparison workflow. Keep educational cases separate from validated real observations and avoid calling a published multi-wavelength figure a time sequence.

### D. A visible boundary around usable evidence

Use a mask overlay to show where both observations support comparison. A first-time visitor learns that missing data and dark sky are different. The export preserves that same boundary.

### E. An honest result even when nothing changes

Provide a useful stationary case and let users record uncertainty. This demonstrates that the tool helps people reason from data rather than rewarding dramatic claims.

Prioritize A, B, and D in the core. Add the lesson after the primary workflow is stable. These are proposed differentiators, not claims of global uniqueness.

Existing IRSA tools already provide substantial viewing, cutout, and related analysis functionality. NASA's Backyard Worlds has long used time-based flipbooks for public exploration. The team should therefore demonstrate improvement through the guided compatibility and evidence workflow rather than claim it invented blinking sky images. [S21, S22]

## 23. Communication plan for the report, deck, and video

Maintain one feature-status table with columns for feature, status, release, supporting test or screenshot, dataset kind, and limitations. Use it as the source of truth for every medium.

### Status labels

- **Planned:** described or designed, not working in the application.
- **Implemented:** working in code, acceptance still pending.
- **Validated on the selected pair:** passed the documented check for that specific case.
- **Synthetic demonstration:** uses generated or injected truth, with no implication of an archive discovery.
- **Future research:** requires new methods or broader scientific validation.

### Report updates

Replace future-tense methods with what the selected release actually does. Name the data pair and calibration versions, describe suitability and registration results, report reconstruction and novice-task results, and include limitations. Retain the distinction between public imagery and processed scientific output. Report failed tests or excluded data that affect the conclusion.

### Presentation updates

Keep the useful mission and spectral-context material, but allocate more attention to the team's actual application. Replace abstract timeline markers with true selected observation times, show a real approved comparison, demonstrate one rejection explanation, and show an actual export record. Move supplementary instrument images to the appendix when they displace the working demonstration.

### Three-minute video structure

This is a communication outline, not a build deadline:

| Segment | Content |
| --- | --- |
| 0:00-0:20 | A visitor's comparison problem and the purpose of SKYSHIFT |
| 0:20-0:45 | Real archive sources, observation dates, and why wavelength compatibility matters |
| 0:45-1:35 | Recorded application workflow: field, suitability, linked view, A/B switching |
| 1:35-2:10 | Mark a location, enter a note, export the packet |
| 2:10-2:40 | Show reconstruction evidence and the most relevant validation result |
| 2:40-3:00 | State limitations, demonstrated contribution, and restrained next step |

Record the accepted release. Check technical terms in captions manually. Do not reuse automatic transcription errors. Keep real, illustrative, and synthetic labels readable throughout. If the eventual event requires a different format, adapt to that requirement rather than assume three minutes is official.

Preserve source credits and the archive's release-specific DOI and acknowledgement. IRSA lists distinct identifiers for QR2 and QR3. Do not imply NASA endorsement or use NASA identifiers as SKYSHIFT branding. Review NASA media guidance when preparing external materials. [S1, S23]

## 24. Later scientific development

Future work should be justified by a new user or scientific need and a validation design.

### Quantitative residuals

Before subtracting images scientifically, address spectral response, calibration, PSF matching, background, masking, and uncertainty. For linear resampling with weights w, variance depends on squared weights, and neighboring output samples become correlated. Simply interpolating a variance image like brightness does not supply a complete uncertainty model. Convolution and shared inputs introduce further covariance.

A residual divided by the square root of a naive summed variance must not be labeled a calibrated significance map. Validate null behavior and injected-source recovery using the whole processing chain. Match PSFs by a justified method rather than sharpening both images independently.

### Motion and candidate interpretation

Two positions can describe an apparent displacement under suitable conditions. They do not uniquely establish distance, orbital parameters, object class, or a discovery. A moving source also needs wavelength evaluation at its changing positions. More epochs help distinguish explanations but do not guarantee an orbit solution.

Any eventual motion estimate should include coordinate conventions, time baseline, measurement uncertainty, registration uncertainty, possible blending, and repeat observations. Reference-frame and observer effects matter. Planet X remains a hypothesis and is not a promised project output.

### Automatic ranking or machine learning

Begin with a defensible deterministic baseline and representative labeled controls. Define the target task, label process, train/test separation by field and epoch, and review budget. Evaluate recovery across signal strength, angular displacement, crowding, wavelength, and artifact type. Report false candidates per field or inspected area and reviewer effort, rather than a single accuracy percentage dominated by empty sky.

Synthetic truth helps validation but cannot substitute for representative real observations. A model's ranking is not a probability that Planet X exists. Add AI explanations only if they quote stored metadata accurately and do not invent scientific conclusions.

### Citizen-science expansion

A persistent platform needs volunteer onboarding, review independence, annotation aggregation, moderation, contributor credit, privacy, candidate lifecycle, expert partnership, and sustained hosting. Votes cannot replace scientific confirmation. These obligations are substantial and remain outside the finished core.

## 25. First implementation actions

The next work should produce evidence in this order:

1. Approve R01-R10 and the complete-core scope.
2. Agree on a versioned observation and comparison manifest.
3. Assign the six owners and independent reviewers.
4. Inspect current SPHEREx release documentation and actual FITS/calibration layouts.
5. Inventory a small shortlist of candidate fields and select a defensible real pair.
6. Complete the pair dossier, including rejected alternatives and limits.
7. Prepare the shared-grid bundle and independent alignment diagnostics.
8. Prove a local selection-to-export workflow before adding optional controls.
9. Reconstruct the packet on a clean machine and complete failure/user checks.
10. Deploy the accepted release and update all communications from that release.

The most valuable first achievement is a verified real-data pair with a reconstruction-ready preparation record. That makes every later interface and presentation decision concrete.

## 26. Source register

Web sources were reviewed on 16 October 2026. External schedules, service details, and product documentation can change. Source-supported facts above are separated from the team's proposed engineering decisions and targets.

- **S1.** [IRSA SPHEREx Quick Release overview](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html). Release history, access links, release-specific DOIs, acknowledgement.
- **S2.** [IRSA news archive](https://irsa.ipac.caltech.edu/news.html). QR3 announcement and current archive services.
- **S3.** [SPHEREx data-product delivery schedule](https://spherex.caltech.edu/page/data-products). Published plans for different product types.
- **S4.** [Space Apps Ramallah 2026 event page](https://www.spaceappschallenge.org/2026/local-events/ramallah/). Official-domain indexed statement of full challenge release timing; direct page retrieval failed.
- **S5.** [HackAthlone Planet X and SPHEREx summary](https://hackathlone.com/challenges/planet-x-and-spherex). Organizer summary, subordinate to the unavailable full official challenge.
- **S6.** [Official 2026 Space Apps announcement](https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/). Global event dates and registration context.
- **S7.** [Space Apps Santiago 2026 event guidance](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/). Official-domain indexed preparation guidance and restriction on advance solution development; final participant terms still require review.
- **S8.** [SPHEREx archive data access](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/). SIA2 collections, cutouts, Python routes, cloud and archive access.
- **S9.** [IRSA SPHEREx cutout tutorial](https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/). Example inventory and cutout metadata workflow.
- **S10.** [IRSA MOST program interface](https://irsa.ipac.caltech.edu/applications/MOST/MOSTProgramInterface.html). Moving-object search and supported datasets.
- **S11.** [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html). Observer, frame, time, and ephemeris interpretation.
- **S12.** [IRSA SPHEREx cutout documentation](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/cutouts.html). Spatial/spectral coordinates and position-dependent image response.
- **S13.** [SPHEREx archive data products](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/). Product structures, local spectral calibration, units, and version differences.
- **S14.** [Reproject celestial-image documentation](https://reproject.readthedocs.io/en/stable/celestial.html). Resampling methods, footprints, and unit assumptions.
- **S15.** [Astropy WCS interface documentation](https://docs.astropy.org/en/stable/wcs/wcsapi.html). Coordinate transformations and conventions.
- **S16.** [IRSA SPHEREx ePSF tutorial](https://caltech-ipac.github.io/irsa-tutorials/spherex-psf/). Version-aware ePSF handling and parent/cutout coordinates.
- **S17.** [W3C guidance on pause, stop, and hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). Control over moving and auto-updating content; not a complete accessibility certification.
- **S18.** [Streamlit custom components](https://docs.streamlit.io/develop/concepts/custom-components/components-v1/intro). Optional bidirectional component path.
- **S19.** [Streamlit caching documentation](https://docs.streamlit.io/develop/concepts/architecture/caching). Reruns, cached public values, and session-specific state.
- **S20.** [Streamlit deployment documentation](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app). Candidate managed deployment workflow.
- **S21.** [IRSA SPHEREx visualization documentation](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html). Existing viewer capabilities.
- **S22.** [NASA: Join the Search for New Nearby Worlds](https://svs.gsfc.nasa.gov/12498). Existing public flipbook approach in Backyard Worlds.
- **S23.** [NASA images and media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/). Attribution and use context.
- **S24.** [Official full challenge URL](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/). Required future verification target; content could not be retrieved in this review.
- **S25.** [SPHEREx Explanatory Supplement, version 2.0](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf). Downloaded and inspected relevant product, limitation, flag, and spectral-calibration sections, especially pages 11-13, 18-20, 30-32, and 59-60. Documentation contains historical and future-release context; actual archive availability takes precedence.

### Supplied project evidence

- `C:/Users/LOQ/Desktop/NASA_ProjectMercuryTeam/Presentation_ProjectMercuryTeam.pdf`
- `C:/Users/LOQ/Desktop/NASA_ProjectMercuryTeam/Presentation_ProjectMercuryTeam.pptx`, including speaker notes.
- `C:/Users/LOQ/Desktop/NASA_ProjectMercuryTeam/Report_ProjectMercuryTeam.pdf`
- `C:/Users/LOQ/Desktop/NASA_ProjectMercuryTeam/Video_ProjectMercuryTeam.mp4`, visual sampling across the full duration and locally generated narration transcript.

The report's team assignments and initial scope informed this plan. New requirements, architecture refinements, acceptance targets, and backlog entries are recommendations from this review, not results claimed by the supplied files.
