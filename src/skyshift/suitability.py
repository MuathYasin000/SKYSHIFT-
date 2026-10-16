"""Conservative feasibility screening; scientific approval remains a separate gate."""
from dataclasses import dataclass, asdict
import numpy as np
from reproject import reproject_interp
from .coordinates import common_grid, roundtrip_error
from .models import CheckResult, SkyRegion, Suitability
from .products import Product


@dataclass(frozen=True)
class ScreeningPolicy:
    version: str = "screening-v0.1"
    max_wavelength_separation_in_bandwidths: float = 0.25
    minimum_common_fraction: float = 0.5
    maximum_roundtrip_pixel: float = 0.001
    minimum_time_separation_days: float = 0.01


def _conservative_support(product, output_wcs, shape):
    values, footprint = reproject_interp((product.valid.astype(float), product.wcs), output_wcs, shape_out=shape, order="bilinear")
    return (footprint > 0) & np.isfinite(values) & (values >= 1 - 1e-10)


def screen_pair(a: Product, b: Product, region: SkyRegion, policy: ScreeningPolicy | None = None):
    policy = policy or ScreeningPolicy()
    out_wcs, shape = common_grid(region)
    checks = []
    def add(code, ok, explanation, **measurements):
        checks.append(CheckResult(code=code, status="pass" if ok else "fail", explanation=explanation, measurements=measurements))
    oa, ob = a.observation, b.observation
    days = abs((ob.time_start_utc - oa.time_start_utc).total_seconds()) / 86400
    add("distinct_epochs", oa.observation_id != ob.observation_id and days >= policy.minimum_time_separation_days,
        "Physical observations must differ and have a useful declared time separation.", time_separation_days=days)
    add("homogeneous_release", oa.release == ob.release and oa.pipeline_version == ob.pipeline_version,
        "This initial screen requires identical release and pipeline version.")
    calibrated = a.spectral_basis == b.spectral_basis == "calibration_cwave_cband"
    add("science_spectral_calibration", calibrated, "Scientific screening requires full CWAVE/CBAND calibration data.")
    add("archive_provenance", bool(oa.source.source_url and ob.source.source_url and oa.spectral_calibration and ob.spectral_calibration and oa.spectral_calibration.source_url and ob.spectral_calibration.source_url),
        "Source and calibration archive URLs and verified file identities are required.")
    add("known_quality_flags", a.unknown_flag_pixels == b.unknown_flag_pixels == 0,
        "Unknown active flag bits must be investigated.", unknown_pixels_a=a.unknown_flag_pixels, unknown_pixels_b=b.unknown_flag_pixels)
    errors = [roundtrip_error(p.wcs, p.image.shape) for p in (a, b)]
    add("coordinate_roundtrip", max(errors) <= policy.maximum_roundtrip_pixel,
        "Coordinate arithmetic check; this does not measure absolute alignment.", max_pixel_error=max(errors))
    support = _conservative_support(a, out_wcs, shape) & _conservative_support(b, out_wcs, shape)
    waves, bands = [], []
    for p in (a, b):
        wave, _ = reproject_interp((p.wavelength_um, p.wcs), out_wcs, shape_out=shape, order="bilinear")
        band, _ = reproject_interp((p.bandwidth_um, p.wcs), out_wcs, shape_out=shape, order="bilinear")
        waves.append(wave); bands.append(band)
    finite = np.isfinite(waves[0]) & np.isfinite(waves[1]) & np.isfinite(bands[0]) & np.isfinite(bands[1]) & (bands[0] > 0) & (bands[1] > 0)
    with np.errstate(divide="ignore", invalid="ignore"):
        separation = np.abs(waves[0] - waves[1]) / np.minimum(bands[0], bands[1])
    usable = support & finite
    fraction = float(np.mean(usable))
    add("common_coverage", fraction >= policy.minimum_common_fraction,
        "Both observations need common unflagged and calibrated support.", common_fraction=fraction)
    spectral_values = separation[usable]
    max_sep = float(np.max(spectral_values)) if spectral_values.size else None
    spectral_ok = spectral_values.size > 0 and bool(np.all(spectral_values <= policy.max_wavelength_separation_in_bandwidths))
    add("local_spectral_screen", spectral_ok,
        "Engineering screening threshold across all common supported pixels; not equivalence of spectral response functions.",
        max_separation_bandwidths=max_sep, threshold=policy.max_wavelength_separation_in_bandwidths,
        compatible_fraction_of_grid=float(np.mean(usable & (separation <= policy.max_wavelength_separation_in_bandwidths))))
    rejected = any(c.status == "fail" for c in checks)
    if not rejected:
        checks.append(CheckResult(code="scientific_review", status="pending", explanation="Registration residuals, local image response, calibration association, and independent scientific review remain required."))
    decision = Suitability(policy_version=policy.version, status="rejected" if rejected else "pending", checks=checks,
        limitations=["Engineering feasibility screen only. No validated motion, photometry, or discovery.", "Thresholds are provisional engineering choices, not NASA standards.", "WCS reprojection does not establish reference-source alignment."])
    report = {"region": region.model_dump(), "observation_a": oa.observation_id, "observation_b": ob.observation_id,
              "policy": asdict(policy), "suitability": decision.model_dump(mode="json")}
    return report, {"common_support": usable, "spectral_separation": separation, "wcs": out_wcs, "shape": shape}

