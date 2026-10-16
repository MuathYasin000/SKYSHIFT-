# Current methods and limits

Release 0.2.0 adds the engineering diagnostics below. Scientific approval and human internal review remain PENDING.

## Supported input

The initial reader supports ICRS Level 2 cutouts with IMAGE, FLAGS, VARIANCE, and WCS-WAVE, a passing L2 assessment, supported pipeline versions, declared observation times, and compatible calibrated surface-brightness units. It rejects unsupported inputs rather than guessing their structure.

Pipeline versions 6.x are treated as QR2 and 7.x as QR3 only when the supplied archive URL agrees. This is a deliberately narrow current adapter, not a general future-release classifier. A new release or different product layout requires adapter review and new fixtures.

## Provenance

Downloads preserve the exact source URL, file size, and SHA-256 in an adjacent `.source.json`. Existing files are reused only when URL and checksum agree. Product inspection verifies available sidecars before interpreting the arrays. Inventory errors retain available raw server responses and do not become successful empty results.

## Quality policy

`conservative-v0.1` reads named bit positions from the FLAGS header. A SOURCE flag alone is retained because it identifies a known astronomical source. Every other declared flag is conservatively masked in this initial implementation, including FULLSAMPLE. Unknown active bits invalidate affected pixels and fail the pair screen. Nonfinite intensity or variance and nonpositive variance are invalid.

This policy is intentionally conservative and still requires scientific review for the selected use. It does not imply that all flagged measurements are universally unusable or that unflagged pixels are artifact-free.

## Spectral calibration and pixel conventions

Scientific screening uses the full detector CWAVE and CBAND calibration arrays, with detector, orientation, shape, and units checked. Parent coordinates follow the documented alternate WCS convention:

```text
x_parent_zero_based = x_cutout_zero_based + 1 - CRPIX1A
y_parent_zero_based = y_cutout_zero_based + 1 - CRPIX2A
```

Only the supported LINEAR alternate WCS with the documented offsets is accepted. Calibration arrays are sampled at those parent coordinates. Approximate WCS-WAVE values are available for inspection without a calibration but cannot pass the scientific-calibration gate.

The science calibration product version and association must still be reviewed against the selected observations. Downloading the file and matching its detector do not prove that every calibration assumption is valid.

## Shared support and screening

The screen uses a north-up ICRS tangent grid with 6.15-arcsecond output pixels. Bilinear projection of the validity field accepts an output pixel only when all contributing samples are valid within numerical tolerance. This avoids interpreting invalid pixels as dark sky. Wavelength and bandwidth maps are evaluated on the same grid.

The provisional spectral diagnostic is:

```text
abs(wavelength_A - wavelength_B) / min(bandwidth_A, bandwidth_B)
```

Every common supported pixel must be at most 0.25 for the region to pass this engineering check. At least 50% of the requested grid needs common valid spectral support. Distinct physical epochs, identical supported release/pipeline versions, known flag bits, numerical coordinate round trips below 0.001 output pixel, and complete source/calibration URLs are also required. The 0.01-day minimum epoch separation is a provisional screening choice, not a detectability claim.

These thresholds are named and versioned engineering choices. They do not establish matched response functions, photometric comparability, motion detectability, or scientific suitability. A passing screen remains `pending`; subsequent diagnostics do not automatically grant approval.

## Numerical versus scientific checks

Coordinate round-trip error measures consistency of transformations. It is not an estimate of absolute astrometric accuracy. SOURCE flag behavior, rejected edge incompatibility, unknown bits, corrupt cached files, and model acceptance constraints have automated tests. There are no automated sensitivity, discovery, orbit, or calibrated-significance results.

## Independent reference registration

Gaia DR3 references are selected independently of any image-to-image correlation. Positions are propagated to each epoch using available proper motions. Sources with absolute parallax above 5 mas or proper motion above 100 mas/year are excluded, as are catalogue neighbors within 30 arcsec. A weighted pixel-integrated axis-aligned Gaussian plus local background plane is fit independently in each native image, using robust soft-L1 residuals. Fit support, SNR and profile checks are explicit; no transform is fitted to correct away a measured mismatch.

Registration-v2 requires at least six references, three quadrants, convex-hull area fraction at least 0.1, median residual at most 0.25 output pixel and p95 at most 0.5 pixel. The larger M101 context yields 13 references, four quadrants and hull fraction 0.27138. Median inter-epoch residual is 0.050689 pixel (0.31174 arcsec), p95 0.326388 pixel (2.00729 arcsec). All accepted/rejected fits remain recorded. The original two-reference result fails coverage and remains preserved.

These are empirical reference-sample residuals, not formal measurement precision, an absolute astrometric solution, or a validated detection limit. Gaussian profiles are diagnostic approximations in undersampled images. Surrounding-context agreement does not prove absence of local distortion inside the restricted extended-galaxy field.

## Image response and backgrounds

The official IRSA product guide recommends newer oversampled ePSF models for QR2 as well as QR3. The nearest parent-detector zone is selected for descriptive effective-area and positive-wing moment diagnostics. Original models, negative wings and science arrays are preserved. No deconvolution or PSF matching is performed.

The median fitted profile-width ratio B/A is 0.98262 and p95 absolute deviation from unity is 0.25379. Local ePSF effective-area ratio is 0.97595. Native valid pixels without SOURCE flags give an estimated B-A background offset of 0.01393 MJy/sr; diffuse astrophysical emission can contaminate this estimate. Zodiacal models are inspected, not subtracted. These differences prevent an established photometric-equivalence or variability claim.

Pipeline HISTORY spectral UUIDs agree across the two exposures. Public calibration files do not expose those same identifiers. Documentation-supported association is recorded; independent specialist confirmation is still required. Unflagged artifacts and blending remain possible.

## Prepared products and reconstruction

Preparation-v1 performs bilinear reprojection onto the declared grid. Validity requires every contributing sample to be usable. Unsupported SCI values remain NaN in both images. Native variances are preserved in originals, but no resampled variance/significance map is asserted because interpolation induces covariance.

The prepared FITS stores SCI_A/B, VALID_A/B, COMMON, WAVE_A/B, BAND_A/B and SEPARATION, each with the same WCS. Masks reconstruct exactly, float arrays within at most 1e-6 absolute/relative tolerance, including missing-value patterns. Current checked snapshots reproduce with maximum array error zero. Numerical hashes normalize byte order and NaN representation. Pair identity changes with scientific inputs, preparation code and relevant numerical dependency versions.

The review packet and reviewer guide support independent reproduction. Automated arithmetic and reference-policy passes never replace internal human review or qualified scientific assessment.
