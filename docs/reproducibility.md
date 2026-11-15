# Reconstruction and review

The full review ZIP embeds native scientific images, spectral calibration, ePSF, Gaia inputs, prepared FITS, diagnostics and reproduction source. It preserves the exact scientific snapshot for offline reconstruction after installing dependencies.

The compact browser comparison ZIP embeds prepared FITS, preview, notes, exact viewport/stretch, diagnostics, citations, hashes and original source references. It reopens directly in the matching curated browser release. Python reconstruction fetches missing inputs only from approved services, or uses originals supplied through --source-cache. Changed upstream bytes stop reconstruction.

## Trusted installation and commands

Use Python 3.12 on a verified platform. Inspect the reproduction source before installation. Create a fresh environment, install reproduction/requirements-lock.txt, then pip install --no-deps extracted/reproduction.

```powershell
skyshift review m101-review-v6.zip --output reproduced
skyshift reconstruct saved-comparison.zip --source-cache reproduced --output reconstructed-note
```

Output directories must be new. Reconstruction never executes packet-supplied code. Installed code supports only the declared bilinear preparation, without background subtraction or PSF matching, and PENDING scientific status.

## Integrity and numerical checks

Every archive member except hashes.json must be covered exactly once by SHA-256. Native image/calibration and prepared-product identities must match. Archive member names/counts/sizes are bounded. Masks and WCS must agree exactly. Float arrays must agree within 1e-6 absolute/relative tolerance, including missing-value support. Notes must refer to the same pair and fall inside common support. Viewport/display settings are bounded.

Pair identity includes original/calibration hashes, region, scientific code hashes and numerical dependency versions. Browser reopening also compares scientific metadata against the trusted curated baseline; a self-consistent forged packet cannot change that baseline. Hashes provide integrity, not signatures.

The review command recomputes native Gaia registration and response diagnostics, checking reference count, quadrants, convex hull and median/p95 residuals at 1e-9 absolute/relative tolerance. Human review still examines methodology and supporting data. Automated reports leave internal and external approval PENDING.

## Preservation and restoration

Back up the unchanged packet, external packet SHA-256, source commit, lock and deployment version separately. Keep failed decisions. Never overwrite immutable scientific releases. Restore the independent local application from its matching static assets and source commit. The Sites deployment is historical evidence only. A changed preparation identity cannot silently reuse saved comparisons.

Single-exposure JSONs reopen against exact local catalogue/product identities; version 1.1 additionally validates coordinate questions against the original prepared quality mask. They reference scientific arrays rather than embedding original FITS. Orion can also be reconstructed offline from its preserved original cutout and calibration using `.venv/Scripts/python.exe tools/reconstruct_orion_context.py --output <new-directory>`. Its JSON and preview must reproduce byte for byte; this does not grant scientific approval.
