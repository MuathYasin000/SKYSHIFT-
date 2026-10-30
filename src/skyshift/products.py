"""Read calibrated cutouts without discarding masks or source identity."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from datetime import timezone
import re

import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.time import Time
from astropy.wcs import WCS
import numpy as np
from scipy.ndimage import map_coordinates

from .archive import record_file, sha256_file
from .models import FileRecord, Observation, SkyRegion
from .releases import product_adapter


@dataclass
class Product:
    observation: Observation
    image: np.ndarray
    flags: np.ndarray
    variance: np.ndarray
    valid: np.ndarray
    wavelength_um: np.ndarray
    bandwidth_um: np.ndarray
    wcs: WCS
    header: fits.Header
    flag_definitions: dict[str, int]
    unknown_flag_pixels: int
    fatal_flag_names: list[str]
    spectral_basis: str


def flag_definitions(header, release):
    """Read each release's explicit bitmap schema; never guess flag meanings.

    QR2 MP_NAME cards give bit indices. QR3 MSKNnnnn gives the name of
    bit nnnn and MSKMnnnn repeats its integer mask. Both identities must agree.
    """
    definitions = {}
    if release == 'qr2':
        cards = [(key[3:], value) for key, value in header.items() if key.startswith('MP_')]
    elif release == 'qr3':
        cards = []
        names = {key[4:] for key in header if re.fullmatch(r'MSKN\d{4}', key)}
        masks = {key[4:] for key in header if re.fullmatch(r'MSKM\d{4}', key)}
        if names != masks:
            raise ValueError('QR3 mask names and bitmask definitions differ')
        for suffix in sorted(names):
            bit = int(suffix)
            if not 0 <= bit <= 31 or type(header['MSKM'+suffix]) is not int or header['MSKM'+suffix] != 1 << bit:
                raise ValueError('QR3 mask integer disagrees with its bit index')
            cards.append((header['MSKN'+suffix], bit))
    else:
        raise ValueError('Unknown quality flag release')
    for name, bit in cards:
        if not isinstance(name, str) or not name.strip() or type(bit) is not int or not 0 <= bit <= 31:
            raise ValueError('Invalid quality flag definition')
        name = name.strip()
        if name in definitions or bit in definitions.values():
            raise ValueError('Ambiguous duplicate quality flag definitions')
        definitions[name] = bit
    if not definitions or 'SOURCE' not in definitions:
        raise ValueError('Release-aware flag definitions are missing')
    return definitions


def quality_mask(image, flags, variance, definitions):
    """Conservative v0.1 policy: retain SOURCE, mask all other declared flags."""
    flags = np.asarray(flags, dtype=np.uint32)
    if any(not 0 <= bit <= 31 for bit in definitions.values()):
        raise ValueError("Flag bit indices must be between 0 and 31")
    if len(set(definitions.values())) != len(definitions):
        raise ValueError("Ambiguous duplicate flag bit definitions")
    known = sum(1 << bit for bit in set(definitions.values()))
    fatal = sum(1 << bit for name, bit in definitions.items() if name != "SOURCE")
    unknown = flags & np.uint32((~known) & 0xFFFFFFFF)
    valid = np.isfinite(image) & np.isfinite(variance) & (variance > 0)
    valid &= (flags & np.uint32(fatal)) == 0
    valid &= unknown == 0
    return valid, int(np.count_nonzero(unknown)), sorted(name for name in definitions if name != "SOURCE")


def parent_pixel_coordinates(header: fits.Header, shape: tuple[int, int]):
    if header.get("WCSNAMEA") != "0-based active pixel coordinates":
        raise ValueError("Unknown cutout-to-parent coordinate convention")
    for key in ("CRPIX1A", "CRPIX2A"):
        if key not in header:
            raise ValueError(f"Missing parent-detector coordinate {key}")
    for key, expected in {"CRVAL1A": 0, "CRVAL2A": 0, "CDELT1A": 1, "CDELT2A": 1, "CTYPE1A": "LINEAR", "CTYPE2A": "LINEAR"}.items():
        if header.get(key) != expected:
            raise ValueError("Unsupported alternate parent-detector WCS")
    y, x = np.indices(shape, dtype=float)
    return x + 1 - header["CRPIX1A"], y + 1 - header["CRPIX2A"]


def read_spectral_calibration(path: Path, header: fits.Header, shape):
    px, py = parent_pixel_coordinates(header, shape)
    with fits.open(path, memmap=False) as hdul:
        for name in ("CWAVE", "CBAND"):
            if name not in hdul:
                raise ValueError(f"Spectral calibration lacks {name}")
            layer = hdul[name]
            if layer.header.get("DETECTOR") != header["DETECTOR"]:
                raise ValueError("Calibration and observation detectors differ")
            if layer.header.get("DETCOORD") != header.get("DETCOORD"):
                raise ValueError("Calibration and observation detector orientation differ")
            if layer.data.shape != (2040, 2040):
                raise ValueError("Unsupported spectral calibration dimensions")
            if not u.Unit(layer.header.get("BUNIT", "")).is_equivalent(u.um):
                raise ValueError("Spectral calibration has unsupported units")
        arrays = []
        for name in ("CWAVE", "CBAND"):
            values = map_coordinates(np.asarray(hdul[name].data, dtype=float), [py, px], order=1, mode="constant", cval=np.nan, prefilter=False)
            values *= u.Unit(hdul[name].header["BUNIT"]).to(u.um)
            arrays.append(values)
    return tuple(arrays)


def visualization_spectra(hdul, header, shape):
    """Approximate metadata only: never sufficient to approve a scientific pair."""
    clean_header = header.copy()
    for key in list(clean_header):
        if re.match(r"^(A|B|AP|BP)_(ORDER|\d+_\d+)$", key):
            del clean_header[key]
    spectral_wcs = WCS(clean_header, fobj=hdul, key="W")
    y, x = np.indices(shape, dtype=float)
    values = spectral_wcs.pixel_to_world(x, y)
    return tuple(np.asarray(v.to_value(u.um)) for v in values)


def read_product(path: Path, region: SkyRegion, *, calibration: Path | None = None, source_url: str | None = None, calibration_url: str | None = None) -> Product:
    # A sidecar keeps archive identity available to all commands, not only downloads.
    for current, explicit in ((path, source_url), (calibration, calibration_url)):
        if current is None:
            continue
        sidecar = current.with_suffix(current.suffix + ".source.json")
        if sidecar.exists():
            saved = FileRecord.model_validate_json(sidecar.read_text(encoding="utf-8"))
            if sha256_file(current) != saved.sha256:
                raise ValueError(f"Input checksum disagrees with its provenance: {current.name}")
            if explicit is not None and explicit != saved.source_url:
                raise ValueError("Explicit source URL disagrees with saved provenance")
            if current == path:
                source_url = saved.source_url
            else:
                calibration_url = saved.source_url
    with fits.open(path, memmap=False) as hdul:
        for name in ("IMAGE", "FLAGS", "VARIANCE", "WCS-WAVE"):
            if name not in hdul:
                raise ValueError(f"Missing required HDU: {name}")
        header = hdul["IMAGE"].header.copy()
        version = hdul[0].header.get("VERSION")
        adapter = product_adapter(version, header.get('DETECTOR'), source_url,
            calibration_sha256=sha256_file(calibration) if calibration is not None else None)
        if header.get("RADESYS") != "ICRS":
            raise ValueError("Only ICRS calibrated inputs are currently supported")
        if not u.Unit(header.get("BUNIT", "")).is_equivalent(u.MJy / u.sr):
            raise ValueError("Expected calibrated surface brightness in MJy/sr")
        variance_unit = u.Unit(hdul['VARIANCE'].header.get('BUNIT', ''))
        if not variance_unit.is_equivalent((u.MJy / u.sr) ** 2):
            raise ValueError("Variance units are missing or incompatible with calibrated surface brightness")
        if header.get("L2DQAFLG") != "Pass":
            raise ValueError("Product has no passing Level 2 data-quality assessment")
        image = np.asarray(hdul["IMAGE"].data, dtype=float).copy()
        if not np.issubdtype(hdul['FLAGS'].data.dtype, np.integer):
            raise ValueError("Quality flags must use an integer array")
        flags = np.asarray(hdul["FLAGS"].data, dtype=np.uint32).copy()
        variance = np.asarray(hdul["VARIANCE"].data, dtype=float).copy()
        if image.ndim != 2 or flags.shape != image.shape or variance.shape != image.shape:
            raise ValueError("Science, flags, and variance must have matching two-dimensional shapes")
        definitions = flag_definitions(hdul['FLAGS'].header, adapter['release'])
        valid, unknown_count, fatal_names = quality_mask(image, flags, variance, definitions)
        factor = u.Unit(header["BUNIT"]).to(u.MJy / u.sr)
        image *= factor
        variance *= variance_unit.to((u.MJy / u.sr) ** 2)
        if calibration is None:
            wave, band = visualization_spectra(hdul, header, image.shape)
            basis = "visualization_wcs_wave_only"
        else:
            wave, band = read_spectral_calibration(calibration, header, image.shape)
            basis = "calibration_cwave_cband"
        spatial_wcs = WCS(header).celestial
        if not spatial_wcs.has_celestial:
            raise ValueError("Input has no usable celestial WCS")
        scale = str(header.get("TIMESYS", "")).lower()
        if scale not in {"utc", "tai", "tt", "tdb"}:
            raise ValueError("Observation timescale is missing or unsupported")
        begin = Time(header["DATE-BEG"], format="isot", scale=scale)
        end = Time(header["DATE-END"], format="isot", scale=scale)
        for keyword, t in (("MJD-BEG", begin), ("MJD-END", end)):
            if keyword not in header or abs(float(header[keyword]) - t.mjd) * 86400 > 0.01:
                raise ValueError("FITS date and MJD observation timestamps disagree")
        x, y = spatial_wcs.world_to_pixel(SkyCoord(region.ra_deg, region.dec_deg, unit="deg", frame="icrs"))
        cx, cy = int(np.rint(x)), int(np.rint(y))
        if not (0 <= cy < image.shape[0] and 0 <= cx < image.shape[1]):
            raise ValueError("Requested center is outside this cutout")
        observation = Observation(
            observation_id=header["OBSID"], release=adapter['release'],
            detector=int(header["DETECTOR"]), pipeline_version=str(version),
            time_start_utc=begin.utc.to_datetime(timezone=timezone.utc),
            time_end_utc=end.utc.to_datetime(timezone=timezone.utc), original_timescale=scale,
            science_unit="MJy/sr", source=record_file(path, source_url),
            spectral_calibration=record_file(calibration, calibration_url) if calibration else None,
            center_wavelength_um=float(wave[cy, cx]), center_bandwidth_um=float(band[cy, cx]),
            hdus=[h.name for h in hdul],
        )
    return Product(observation, image, flags, variance, valid, wave, band, spatial_wcs, header, definitions, unknown_count, fatal_names, basis)


def product_summary(product: Product) -> dict:
    o = product.observation
    return {
        "observation": o.model_dump(mode="json"), "shape": list(product.image.shape),
        "usable_fraction": float(np.mean(product.valid)), "unknown_flag_pixels": product.unknown_flag_pixels,
        "spectral_basis": product.spectral_basis, "flag_policy": "conservative-v0.1",
        "masked_flags": product.fatal_flag_names, "retained_flag": "SOURCE",
        "psf_fwhm_header_arcsec": product.header.get("PSF_FWHM"),
        "fine_astrometry_flag": product.header.get("FINAST"),
        "limitations": ["Inspection and screening do not establish pair suitability.", "SOURCE alone is retained; all other declared flags are masked.", "Unflagged pixels can still contain artifacts."],
    }

