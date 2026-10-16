# Independent review packet

Scientific approval: **PENDING**. Human internal technical review: **PENDING**. No reviewer has signed this release. A team reviewer should be independent of selection, processing and validation. This does not make them a qualified astronomer.

## Packet contents and provenance

Two original native M101 context FITS, full CWAVE/CBAND calibration, public ePSF model, Gaia DR3 catalogue and exact ADQL query, accepted/rejected reference fits, spectral checks and masks, response/background/flag diagnostics, original failed registration, rejected alternative pairings, official documentation snapshot/hash, source URLs and hashes, exact source and lock, blank review record, and ten-array prepared FITS. Native variance and zodiacal models remain in the originals.

Exact retrieval times for the initial scientific inputs were not recorded and remain unknown. Filesystem times are not substituted. Original bytes, URLs and hashes are preserved. New downloads record explicit retrieval timestamps. The documentation snapshot records its actual retrieval time.

## Internal reviewer procedure

1. Record the actual reviewer name, role, independence declaration, and relevant limitations. Leave identity and findings blank until supplied by that person.
2. Preserve the packet and record its externally supplied SHA-256. Inspect manifest.json, hashes.json, review.json and this guide. Hashes are not a signature.
3. Inspect the source, then install reproduction/ in a fresh Python 3.12 environment with the supplied lock. Do not execute unknown code from an untrusted sender.
4. Run skyshift review packet.zip --output new-independent-folder. Save output, OS/dependency versions, reconstruction_result.json and independent_reproduction.json.
5. Examine every reference rejection and retained high-residual source. Inspect native stamps and residual vectors. Check proper-motion propagation, isolation, fit support, flags, undersampling and spatial coverage. Do not remove outliers to obtain a pass.
6. Verify the maximum spectral diagnostic across all common supported pixels, not only the center. Check parent-detector indexing, units, timestamps, release/pipeline identity, calibration HISTORY and public references.
7. Inspect profile widths, ePSF zone choice, background distributions, zodiacal models, flags, blending and visible/unflagged artifacts. Gaussian profile fits are descriptive, not a calibrated ePSF estimator. No resampled variance or independent-pixel significance is asserted.
8. Exercise notes, viewport changes, export/reopen, and reconstruction. Confirm persistent labels and rejection of altered scientific metadata.
9. Complete a copy of review.json with actual findings and supporting paths. Preserve the unsigned original. Internal findings must describe engineering conclusions and uncertainties without granting external scientific approval.

Reproduction requires exact masks/WCS, identical missing-value support and float arrays within recorded tolerances no larger than 1e-6 absolute/relative. Registration summary agreement uses 1e-9 absolute/relative tolerance. Investigate mismatches instead of revising thresholds to pass. The current machine observed exact preparation-array equality.

## Questions for a qualified astronomer / instrument specialist

1. Is the 0.25 CWAVE/CBAND diagnostic appropriate for qualitative spatial inspection of extended M101 emission? Could spectral features or source colors mimic morphology changes? Assess full response functions and source spectra where necessary.
2. Does the public spectral calibration file correspond correctly to the pipeline HISTORY UUIDs? Documentation supports release/ePSF use, but UUID-to-file association is not independently proven by a filename and detector match.
3. Do these 13 native Gaia fits adequately constrain registration in the 2.4-arcminute field? They cover an 18-arcminute context. Assess local distortions, blending, color effects, undersampling, selection bias and whether a calibrated ePSF fit is essential. The measured sample median is not absolute precision.
4. Are response, background and artifact differences acceptable for the explicitly restricted qualitative task? Median profile-width ratio is approximately 0.983, with p95 absolute variation approximately 25%. No PSF matching or background subtraction is applied. Brightness variability and quantitative subtraction remain unsupported.
5. Which further restrictions, alternatives, tests or uncertainty models are necessary before calling this pair scientifically defensible? Reject unsuitable data rather than weaken requirements.

An external assessment must identify the actual reviewer, relevant qualifications, packet/code identities, methodology, permitted claims, restrictions, unresolved concerns, date and supporting evidence. No automated test or internal review replaces that assessment. Approval requires a reviewed release change, not manual editing of one manifest field.
