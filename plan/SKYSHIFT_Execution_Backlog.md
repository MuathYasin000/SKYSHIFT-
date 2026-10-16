# SKYSHIFT: execution backlog

Companion to the master plan | Version 1.0 | Baseline: 16 October 2026

**Subsequent user direction, 16 October 2026:** independent localhost is the default runtime. The user is the sole human UX evaluator and explicitly declined external novice recruitment/studies. Original T22/E11 sessions remain NOT CONDUCTED, not a blocker for software development; they must not be marked complete or replaced with automated test outcomes. Scientific human-review gates remain PENDING. Current executed evidence is in `docs/feature_status.md` and `docs/visitor_experience_0.4.md`; original rows below are retained for traceability.

All tasks are **planned**. No implementation or real-pair validation is claimed. Work is organized by dependencies and acceptance evidence, not dates or weekly availability. S, M, and L are relative complexity labels, not time estimates. Split large tasks after their uncertainty is resolved.

## 1. Work board

| ID | Work item | Owner | Depends on | Size | Done when |
| --- | --- | --- | --- | --- | --- |
| T01 | Approve core requirements and limits | Muath | None | S | R01-R10, allowed claims, and exclusions have team agreement |
| T02 | Create source and feature-status registers | Kareem | T01 | S | Every existing and planned feature has an honest status |
| T03 | Define observation and comparison contracts | Asem | T01 | M | Schema distinguishes inputs, checks, processing, display, and user notes |
| T04 | Establish repository and repeatable environment | Muath | T01 | S | Another teammate installs and runs a minimal entry point |
| T05 | Inspect current product and calibration layouts | Haitham | T03 | M | Actual headers/HDU names and documentation revisions are recorded |
| T06 | Implement bounded archive inventory | Haitham | T04, T05 | M | Query and original response are saved; errors and empty results are explicit |
| T07 | Shortlist candidate fields and real pairs | Haitham | T06 | L | Candidates are ranked by usable scientific criteria, with rejected alternatives |
| T08 | Acquire immutable cutouts and calibration inputs | Haitham | T07 | M | Files, metadata, checksums, and provenance agree |
| T09 | Specify release-aware flag policy | Mohammed | T05, T08 | M | Fatal, restricted, and informational states have documented reasons |
| T10 | Specify and implement local spectral checks | Haitham | T08 | L | Checks cover the approved area and use appropriate calibration data |
| T11 | Complete independently reviewed pair dossier | Haitham | T09, T10 | M | Kareem reviews real pair identity, restrictions, and intended interpretation |
| T12 | Implement common-grid preparation | Mohammed | T04, T11 | M | Arrays, WCS, masks, units, and transformations are saved consistently |
| T13 | Validate registration and coordinate handling | Mohammed | T12 | L | Reference diagnostics and coordinate fixtures pass declared criteria |
| T14 | Create approved data bundle and shared previews | Mohammed | T13 | M | Bundle is identified by checksum; shared display settings are explicit |
| T15 | Build guided Streamlit application | Abdallah | T03, T04, T14 | M | Visitor can load the field and understand the comparison state |
| T16 | Add linked crop, side-by-side, and A/B switching | Abdallah | T15 | M | Both views keep identical geometry and persistent context |
| T17 | Add annotation form and crosshair overlay | Abdallah | T16 | M | Note survives state changes and exports correct sky coordinates |
| T18 | Build evidence ZIP and schema validation | Asem | T03, T14, T17 | M | Packet contains declared inputs, settings, annotations, and checksums |
| T19 | Implement and test packet reconstruction | Asem | T18 | L | Another teammate reconstructs it in a clean environment |
| T20 | Build targeted synthetic and failure fixtures | Asem | T03, T05 | M | Truth and dataset-kind labels are saved for every fixture |
| T21 | Verify rejection behavior and data integrity | Asem | T10, T13, T18, T20 | M | Unsupported comparisons stop; corruption and missing metadata are explicit |
| T22 | Run novice usability checks | Kareem | T16, T17, T18 | M | Five sessions have recorded tasks, assistance, misconceptions, and outcomes |
| T23 | Fix critical defects and retest affected behavior | Relevant owner | T19, T21, T22 | M | No unresolved critical defect remains and evidence matches final code |
| T24 | Measure performance and session isolation | Muath | T23 | M | Warm/cold conditions and two-session results are documented |
| T25 | Finalize methods, user, and maintainer documentation | Kareem | T19, T23, T24 | M | A new teammate can install, use, interpret, reconstruct, and restore the release |
| T26 | Deploy accepted application and bundle | Muath | T24, T25 | M | Public workflow works without developer credentials |
| T27 | Verify deployed export, failure states, and rollback | Asem | T26 | M | Fresh-browser checks and restoration succeed |
| T28 | Update report from actual evidence | Kareem | T23, T27 | M | Methods and results describe the accepted release and limitations |
| T29 | Update presentation and three-minute video | Kareem | T28 | M | Actual behavior replaces concept scenes, with consistent labels and claims |
| T30 | Close release acceptance and tag completed core | Muath | T27, T28, T29 | S | R01-R10 link to evidence and all six owners review the release record |

Independent reviews follow the master plan's responsibility table. An owner may ask another teammate to implement a contained part, but retains responsibility for integration and acceptance evidence.

## 2. Milestone mapping

| Milestone | Tasks | Required output |
| --- | --- | --- |
| M0 Requirements | T01-T04 | Requirements, schema draft, owners, and repeatable environment |
| M1 Real-data feasibility | T05-T11 | Approved real-pair dossier and original source bundle |
| M2 Preparation | T12-T14 | Reproducible shared-grid bundle and diagnostics |
| M3 Application core | T15-T17 and initial T18 | Complete local visitor-to-export workflow |
| M4 Reconstruction | T18-T19 | Valid evidence packet and independent reconstruction |
| M5 Validation | T20-T24 | Scientific, failure, usability, and performance evidence |
| M6 Deployment | T25-T27 | Public release, operating instructions, and rollback |
| M7 Communication | T28-T30 | Consistent report/deck/video and completed release record |

T20 can begin early using clearly labeled fixtures. T25 is finalized near release but should be drafted alongside implementation. The mapping does not require serial work by all six people.

## 3. Data contracts to agree before UI integration

### Observation record

Required identity includes archive, collection/release, physical observation ID, product revision, pipeline version, retrieval timestamp, original URL, and SHA-256. Required scientific context includes observation interval and timescale, coordinate frame, sky footprint, calibrated units, supported science-HDU name, quality-HDU name, uncertainty interpretation, and calibration references.

Keep local wavelength and bandwidth access tied to detector coordinates and calibration identity. Do not collapse an observation to a filename, detector name, and one assumed wavelength. If an optional value is unknown, use null and explain its effect. Missing critical metadata prevents acceptance.

### Suitability record

Each check contains a reason code, measured value or structured diagnostic, threshold or rule where applicable, policy version, result, explanation, and relevant region. Overall status is accepted for qualitative comparison, restricted, or rejected. Preserve per-check outcomes even when the overall result is rejected.

### Prepared-pair record

Link both observation records; the output WCS, shape, bounds and scale; masks and footprints; reprojection and background settings; spectral policy; registration diagnostics; calibration files; prepared-array hashes; and software/configuration identity. Make a new pair identity when scientific preparation changes.

### View and annotation record

The view references a prepared pair plus current crop, orientation, display transform and limits, and mask presentation. An annotation references the same comparison and stores a sky coordinate, optional second-epoch coordinate, category, note, and timestamp. Scientific input metadata and user interpretation must remain separate.

## 4. Acceptance evidence index

For every gate, save a short record describing the input, procedure, expected result, actual result, release/configuration identity, reviewer, and outcome. A failure is useful evidence and stays recorded until a documented fix and retest close it.

| Evidence ID | What to save | Closes |
| --- | --- | --- |
| E01 | Approved requirements and status baseline | R01-R10 scope |
| E02 | Original archive query and returned inventory | Source discovery |
| E03 | Pair dossier, source/calibration checksums, review | R01, R02 |
| E04 | Flag and spectral policy with known failure cases | R02 |
| E05 | WCS round trips, mask checks, reference residuals | R03 |
| E06 | Real-pair screenshots and interaction checks | R04, R05 |
| E07 | Annotation round trip after crop and reload | R06 |
| E08 | Example ZIP, schema report, checksums | R07 |
| E09 | Clean-environment reconstruction report | R07 |
| E10 | Synthetic and failure-case matrix | R02, R03, R08 |
| E11 | Five novice-task records and corrections | R04-R07 |
| E12 | Performance and session-isolation record | R08, R09 |
| E13 | Public deployment and rollback verification | R09 |
| E14 | Feature-to-claim audit across all media | R10 |

Suggested statuses are pending, pass, restricted, and fail. A restricted result closes a requirement only if the requirement explicitly allows the restriction and the application enforces it.

## 5. Minimal test matrix

| Case | Expected result |
| --- | --- |
| Accepted real pair | Same region, distinct epochs, documented compatible local spectra, inspectable shared view |
| Same physical exposure in two revisions | No temporal comparison claim |
| Same detector but incompatible local wavelengths | Rejection or enforced spatial restriction |
| Center compatible, edge incompatible | Edge excluded and annotation blocked there |
| Missing source or calibration metadata | Validated scientific status blocked |
| No common usable footprint | No comparison, useful explanation |
| Invalid pixels and unsupported edges | Visible masks, no artificial disappearance |
| Translated or rotated synthetic grid | Correct sky mapping within declared arithmetic tolerance |
| Stationary scene with different display range | Shared policy prevents unsupported brightness interpretation |
| Synthetic position shift | Annotation/reconstruction preserve known geometry; synthetic label remains |
| PSF-only or background-only change | No claim that it proves movement |
| Annotation after crop, display scaling, and reset | Saved sky position stays fixed |
| Corrupt or partial download | Explicit failure and no cached approval |
| Input or calibration checksum changes | New prepared identity; stale cache excluded |
| Packet modified or unsupported schema | Import/reconstruction stops with specific reason |
| Archive unavailable with approved bundle present | Curated release remains usable with snapshot context |
| Two browser sessions | Notes and settings stay isolated |
| Fresh deployment and clean reconstruction | All required steps work from documentation |

## 6. Feature-status baseline

| Feature or evidence | Status at this planning baseline |
| --- | --- |
| Existing report, presentation, and concept video | Reviewed project materials |
| Public SPHEREx archive availability | Verified through current IRSA sources |
| Full official challenge requirements | Pending direct verification |
| Selected real observation pair | Planned, not validated |
| Acquisition and preparation pipeline | Planned |
| Validated common-grid outputs | Planned |
| Comparison interface | Planned; concept views are not implementation evidence |
| Annotations and evidence ZIP | Planned |
| Clean reconstruction | Planned |
| User-test and performance results | Planned |
| Public deployment | Planned |
| Automated detection, motion measurement, citizen-science platform | Future research |

## 7. Decisions for implementation leads

1. Use Streamlit and separate Python processing modules for the core.
2. Begin with a versioned curated data bundle and a documented acquisition path.
3. Use side-by-side viewing and manual A/B switching as required comparison modes.
4. Begin annotations with coordinates and a crosshair, then add click convenience if useful.
5. Treat evidence export and reconstruction as required product behavior.
6. Keep local spectral checks and data-integrity gates independent of UI state.
7. Defer quantitative residuals, automated detection, and persistent public accounts.
8. Require a release record and acceptance evidence before updating public claims.

If a decision proves unsuitable, replace it through a short record that explains the requirement, evidence, alternative, migration, and retesting needed. Revisit the architecture only for a demonstrated problem.
