# Release notes

## 0.13.0 — 2026-11-14

- Rebuilt the main application around coordinate and challenge-target searches.
- Limited live and cached user data to SPHEREx DR1 and QR3.
- Search now requests all six detectors and returns every metadata match in date order.
- Added observation-epoch proper-motion propagation for all five challenge targets, with the reference epoch shown in the interface.
- Added progressive cutout downloads, persistent caching, progress and retry messages.
- Added detector and wavelength filtering, thumbnails, target markers, and visible invalid-pixel status.
- Added 0.3–1.0 second playback, previous/next, scrubber, keyboard controls, shared pan/zoom, side-by-side, and wipe comparison.
- Wavelength differences now display a warning and never disable visual comparison.
- Removed QR2 from the main interface and live API; purged QR2 metadata and cutout cache entries.
- Attempted fresh DR1/QR3 caches for all five targets. IRSA returned HTTP 502 or timed out for every collection, so no target frames were claimed or substituted.

## Earlier repository history

From October 16–30, 2026 the project developed local SPHEREx viewing, curated field comparisons, evidence exports, presentation experiments, and initial DR1/QR3 discovery support. That complete state is preserved by tag `pre-cleanup-2026-11-14`.
