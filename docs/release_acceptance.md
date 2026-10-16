# Release acceptance record

Release 0.2.0 is an engineering review release. It is **not a completed scientifically accepted project**. Human technical review, external scientific assessment and the planned novice sessions remain open. The user's instruction permits independent software development while these assessments are pending.

The master plan and original backlog remain authoritative. Their original all-planned text is a historical baseline; this register records executed work. The original Streamlit frontend choice was replaced with a small static browser application so public inspection/export needs no Python server or credentials. Scientific processing remains in Python. This is a recorded engineering decision, not a relaxation of scientific gates.

| Requirement | Actual evidence / status |
| --- | --- |
| R01 Real inputs | Two distinct native QR2 exposures and full calibration, hashes and archive URLs preserved |
| R02 Suitability | Engineering checks/rejections implemented; human scientific defensibility PENDING |
| R03 Shared geometry | Common-grid masks/WCS and Gaia residual policy pass; specialist interpretation of local registration PENDING |
| R04 Honest display | Dates, wavelength context, masks, shared scale and review labels implemented; novice comprehension PENDING |
| R05 Comparison | Shared pan/zoom, side-by-side, A/B and optional blink implemented and browser exercised |
| R06 Annotation | Add/edit/delete/locate; coordinate/export/reopen/reconstruction checks implemented |
| R07 Evidence | Full and reference packets, hashes/schema and all-array reconstruction implemented; human independent run PENDING |
| R08 Recovery | Archive/input/metadata/corruption and unsafe packet controls tested |
| R09 Deployment | Actual hosting/version/smoke-test evidence recorded in deployment.md |
| R10 Communication | Verified release materials and claim audit; originals preserved |

T01-T10 have engineering implementations/evidence. T11 internal review is PENDING. T12-T19 exist as explicitly pending-science review components, without an approved scientific bundle. T20-T21 are tested. T22 requires five real novice participants. T23 closes observed engineering defects but cannot close unknown usability findings. T24-T29 have separate executed evidence below as completed. T30 cannot close until real human reviews and remaining acceptance evidence exist.

Do not mark T11, T14's approved bundle, T22, or T30 complete by inference from a passing test suite. Do not invent owner approvals, reviewer signatures or user-test outcomes.

## Release evidence

Machine-readable test/reproduction/deployment records and actual browser screenshots are in docs/evidence and output. Release packet: data/exports/m101-review-v6.zip. Exact published source commit, version, access mode and returned URL are recorded after deployment. Every measurement is linked to the original scientific snapshot and policy.

## Open acceptance work

- An independent team member reproduces and documents the internal technical review.
- A qualified astronomical reviewer assesses the specialist questions and permitted interpretation.
- Five novice sessions record task completion, assistance, misconceptions and corrections.
- Additional browsers/devices/platforms receive explicit compatibility checks before a broad support claim.
- Any scientific rejection triggers alternative selection under justified criteria, not removal of review labels.
