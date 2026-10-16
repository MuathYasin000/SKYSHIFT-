# SKYSHIFT 0.3 data-provenance audit

This is a measured software/data audit. Scientific approval remains **PENDING**.

Audit timestamp (UTC): 2026-10-16T15:21:49.549769+00:00. Immutable source release: `m101-review-v6`; pair: `pair-52ad675d929b0740c23b`.

## What the visitor sees

The comparison contains **24 × 24 measured grid samples**, at **6.15 arcseconds per pixel** (2.46 arcminutes edge to edge). The requested comparison width is 0.04 degrees; rounding to complete pixels makes the grid slightly wider. This small field was selected to preserve the existing spectral compatibility gate. Enlarging a browser canvas does not create astronomical resolution.

The original 0.3-degree archive requests returned detector-coordinate rectangles of different sizes because the sky field is rotated and clipped near an active-detector edge. The full active detector is 2040 × 2040 samples. A larger context can be shown for one-epoch inspection with wavelength and quality labels, but it must not be presented as having passed temporal-comparison checks over its whole area.

## Traceable stages

| Stage | Measured evidence | Result |
| --- | --- | --- |
| Archive → native FITS | Exact SIA observation/detector IDs, source URLs, UTC intervals, native hashes | Pass |
| Stored files | 4 manifest file checksums | Pass |
| Native + spectral calibration → prepared FITS | Re-ran unchanged bilinear preparation, conservative quality masks and all ten arrays | Exact numeric match |
| Prepared FITS → local browser payload | Strict base64 decoding and canonical numeric hashes for all ten arrays | Exact numeric match |

The browser receives SCI_A/B, VALID_A/B, COMMON, WAVE_A/B, BAND_A/B and SEPARATION. Invalid science pixels remain NaN; masking, stretching, color mapping and display interpolation must not replace underlying calibrated values.

## Identifiable observations

### 2025W49_2A_0756_3 / D2

- UTC interval: 2025-12-07T22:47:38.056000Z to 2025-12-07T22:49:33.174000Z.
- QR2, pipeline `6.4+psffix1`, IMAGE unit MJy/sr; native shape y/x [116, 176].
- At selected center: 1.10060024 µm central wavelength, 0.02492572 µm bandwidth.
- [Original archive cutout](https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W49_2A/l2b-v20-2025-342/2/level2_2025W49_2A_0756_3D2_spx_l2b-v20-2025-342.fits?center=210.80227%2C54.34895&size=0.3) · SHA-256 `48acaf60861e1ca7eac5cc0119c63f3c5ecf5714fd7f9eaefa59aa1e69a5cd03`.
- Archive publisher identifier: `ivo://irsa.ipac/spherex_qr2?2025W49_2A_0756_3/D2`.
- Archive/FITS time differences (rounded SIA values), seconds: `{'start': 0.0016420148313045502, 'end': 0.034301262348890305}`.

### 2025W50_1A_0736_3 / D2

- UTC interval: 2025-12-11T05:01:27.448000Z to 2025-12-11T05:03:22.566000Z.
- QR2, pipeline `6.4+psffix1`, IMAGE unit MJy/sr; native shape y/x [137, 176].
- At selected center: 1.10595465 µm central wavelength, 0.02642685 µm bandwidth.
- [Original archive cutout](https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W50_1A/l2b-v20-2025-345/2/level2_2025W50_1A_0736_3D2_spx_l2b-v20-2025-345.fits?center=210.80227%2C54.34895&size=0.3) · SHA-256 `27943f13c77d7b1b6927fcbba15341d2589f79a923322732ab8608fbb4940dbb`.
- Archive publisher identifier: `ivo://irsa.ipac/spherex_qr2?2025W50_1A_0736_3/D2`.
- Archive/FITS time differences (rounded SIA values), seconds: `{'start': 0.04000305198132992, 'end': 0.013737729750573635}`.

## Independent live retrievals

Every request, response identity, HTTP status and failure is preserved in the machine-readable audit. Fresh network retrieval times are distinct from exposure times.
- `native-A.fits`: retrieved; exact expected byte hash.
- `native-B.fits`: retrieved; exact expected byte hash.
- `spectral-calibration.fits`: retrieved; exact expected byte hash.
- `epsf-calibration.fits`: retrieved; exact expected byte hash.
- `archive-sia.xml`: retrieved; identity recorded.
- `official-guide.html`: retrieved; identity recorded.
- `deployed-catalog.json`: retrieved; identity recorded.
- `deployed-bundle.json`: retrieved; exact expected byte hash.
- `deployed-pair.fits`: retrieved; exact expected byte hash.
- `deployed-review-part-0.bin`: retrieved; exact expected byte hash.
- `deployed-review-part-1.bin`: retrieved; exact expected byte hash.
- `deployed-review-part-2.bin`: retrieved; exact expected byte hash.
- `deployed-review-part-3.bin`: retrieved; exact expected byte hash.
- `deployed-review-part-4.bin`: retrieved; exact expected byte hash.
- `deployed-review-part-5.bin`: retrieved; exact expected byte hash.
- `native-A.fits`: byte-identical=True; all HDU scientific data identical=True. Header differences are listed per HDU in JSON.
- `native-B.fits`: byte-identical=True; all HDU scientific data identical=True. Header differences are listed per HDU in JSON.
- An earlier independently retained retrieval at 2026-10-16T15:20:11.875103+00:00 authenticated the exact original hash `48acaf60861e1ca7eac5cc0119c63f3c5ecf5714fd7f9eaefa59aa1e69a5cd03`. Evidence: `research/audit_0.3/20261016T151954631473Z/audit.json`. A later request failure does not erase that earlier evidence, and the later failure remains recorded above.
- An earlier independently retained retrieval at 2026-10-16T15:20:06.966722+00:00 authenticated the exact original hash `27943f13c77d7b1b6927fcbba15341d2589f79a923322732ab8608fbb4940dbb`. Evidence: `research/audit_0.3/20261016T151954631473Z/audit.json`. A later request failure does not erase that earlier evidence, and the later failure remains recorded above.
- Preserved earlier unsuccessful request `native-A.fits` at 2026-10-16T15:14:33.357831+00:00: HTTPError: HTTP Error 503: Service Unavailable. Evidence: `research/audit_0.3/20261016T151432997858Z/audit.json`. This failure is not represented as a successful retrieval.

## Historical public-release payload verification

This independently inspected the previously published 0.2 release. The 0.3 redesign uses local hosting by default; this audit does not publish or modify the historical public website.

```json
{
  "base_url": "https://skyshift-project-mercury.surebream11.chatgpt.site/",
  "catalog_declared_hash_match": true,
  "scope": "Historical public 0.2 release; 0.3 redesign is local-first and does not modify this site",
  "bundle_matches_local_bytes": true,
  "pair_id": "pair-52ad675d929b0740c23b",
  "manifest_matches_immutable_release": true,
  "array_comparisons": {
    "SCI_A": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "c4b61076a1f5d73d2899997a18dcf53220418131a697140054486f5542d1e2d3",
      "numeric_sha256_b": "c4b61076a1f5d73d2899997a18dcf53220418131a697140054486f5542d1e2d3",
      "max_absolute_difference": 0.0,
      "finite_count": 544
    },
    "SCI_B": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "221413f1452f612e8916c516fcd0f68169efb7411e0616774e63d70310b19d0f",
      "numeric_sha256_b": "221413f1452f612e8916c516fcd0f68169efb7411e0616774e63d70310b19d0f",
      "max_absolute_difference": 0.0,
      "finite_count": 544
    },
    "VALID_A": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "1de1806047108f7ad5c91108001b7a87934c04b12188514c335af01873fa7e67",
      "numeric_sha256_b": "1de1806047108f7ad5c91108001b7a87934c04b12188514c335af01873fa7e67",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "VALID_B": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "6c6897240943a4e1218c0016a09d07f5ce5f57fe99c390cad571e4c2adb30015",
      "numeric_sha256_b": "6c6897240943a4e1218c0016a09d07f5ce5f57fe99c390cad571e4c2adb30015",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "COMMON": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "1de1806047108f7ad5c91108001b7a87934c04b12188514c335af01873fa7e67",
      "numeric_sha256_b": "1de1806047108f7ad5c91108001b7a87934c04b12188514c335af01873fa7e67",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "WAVE_A": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "777a76afafaf3fb85a18b0d8b7015472517feaed7498b9437109a1b8bc7c1e9e",
      "numeric_sha256_b": "777a76afafaf3fb85a18b0d8b7015472517feaed7498b9437109a1b8bc7c1e9e",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "WAVE_B": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "483efe59c272b2020b802812009f1512c666e62cff267d249f7856215a236b0a",
      "numeric_sha256_b": "483efe59c272b2020b802812009f1512c666e62cff267d249f7856215a236b0a",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "BAND_A": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "b9d66b8bfd9e9fe13b60d0a9423fd828634c24b95fef81a28c98a44933119f70",
      "numeric_sha256_b": "b9d66b8bfd9e9fe13b60d0a9423fd828634c24b95fef81a28c98a44933119f70",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "BAND_B": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "aa49861d3f2de1e0eb2260df810f5628c388abc0daca0437eed844b60e15c51f",
      "numeric_sha256_b": "aa49861d3f2de1e0eb2260df810f5628c388abc0daca0437eed844b60e15c51f",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    },
    "SEPARATION": {
      "match": true,
      "shape": [
        24,
        24
      ],
      "numeric_sha256_a": "61b56f984adfd5b610f0672cdf2be0ea63cba058febb0460df2d77e3ff9606e5",
      "numeric_sha256_b": "61b56f984adfd5b610f0672cdf2be0ea63cba058febb0460df2d77e3ff9606e5",
      "max_absolute_difference": 0.0,
      "finite_count": 576
    }
  },
  "prepared_fits_hash_match": true,
  "review_packet_part_hashes_match": true,
  "review_packet_sha256": "2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78",
  "review_packet_matches_local_archive": true,
  "review_packet_manifest_matches_immutable_release": true
}
```

## Calibration and scientific limits

The exact full CWAVE/CBAND spectral calibration file is retained and hashed. The official IRSA guide recommends full CWAVE/CBAND for science, describes cutout-parent mapping, and recommends newer ePSFs for QR2 as well as QR3. These documentation statements do not prove the pipeline UUID association or approve a comparison. [Official data-product guide](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/).

The existing engineering registration gate uses 13 references inside the declared context; residuals are diagnostic, not precision-motion measurements. No local background subtraction or PSF matching has been applied. The extended-galaxy spectral response, PSF effects and local registration adequacy require qualified scientific assessment.

Original retrieval times are unknown. Public source URLs and retained hashes are known. Public downloadable products can change; a fresh cutout hash mismatch is recorded as a mismatch, even if arrays prove identical. No identity is silently rewritten.

## Reproduce

`python tools/audit_provenance_redesign.py --network` re-runs the audit, retaining a new timestamped network-evidence directory. Use `--release m101-review-v6` to select the immutable baseline explicitly. Tests use synthetic fixtures only, clearly separate from displayed real observations.
