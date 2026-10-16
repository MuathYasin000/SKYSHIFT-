"""Versioned evidence contracts, independent of the user interface."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Record(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class FileRecord(Record):
    path: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    size_bytes: int = Field(ge=1)
    source_url: str | None = None
    retrieved_at_utc: datetime | None = None

    @field_validator('retrieved_at_utc')
    @classmethod
    def retrieval_requires_timezone(cls,value):
        if value is not None and value.tzinfo is None:raise ValueError('Retrieval timestamp requires an explicit timezone')
        return value


class SkyRegion(Record):
    ra_deg: float = Field(ge=0, lt=360)
    dec_deg: float = Field(ge=-90, le=90)
    size_deg: float = Field(gt=0, le=0.5)
    frame: Literal["icrs"] = "icrs"


class Observation(Record):
    observation_id: str
    release: Literal["qr2", "qr3"]
    detector: int = Field(ge=1, le=6)
    pipeline_version: str
    time_start_utc: datetime
    time_end_utc: datetime
    original_timescale: str
    science_unit: str
    source: FileRecord
    spectral_calibration: FileRecord | None = None
    center_wavelength_um: float | None = Field(default=None, gt=0)
    center_bandwidth_um: float | None = Field(default=None, gt=0)
    hdus: list[str]

    @field_validator("time_start_utc", "time_end_utc")
    @classmethod
    def require_timezone(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Observation times require an explicit timezone")
        return value

    @model_validator(mode="after")
    def ordered_times(self):
        if self.time_end_utc <= self.time_start_utc:
            raise ValueError("Observation end must follow its start")
        return self

    @field_validator("hdus")
    @classmethod
    def hdus_not_empty(cls, value):
        if not value:
            raise ValueError("Observation must identify its data extensions")
        return value


class CheckResult(Record):
    code: str
    status: Literal["pass", "restricted", "fail", "pending"]
    explanation: str
    measurements: dict[str, float | int | str | None] = Field(default_factory=dict)


class Suitability(Record):
    policy_version: str
    status: Literal["accepted_qualitative", "restricted", "rejected", "pending"]
    checks: list[CheckResult]
    limitations: list[str]

    @model_validator(mode="after")
    def consistent_decision(self):
        states = {check.status for check in self.checks}
        if self.status in {"accepted_qualitative", "restricted"} and (not self.checks or states & {"fail", "pending"}):
            raise ValueError("An accepted/restricted pair cannot have failed or pending required checks")
        if self.status == "accepted_qualitative" and "restricted" in states:
            raise ValueError("Restricted checks require a restricted overall decision")
        if "fail" in states and self.status != "rejected":
            raise ValueError("A failed required check must reject the pair")
        return self


class Annotation(Record):
    annotation_id: str
    pair_id: str
    ra_deg: float = Field(ge=0, lt=360)
    dec_deg: float = Field(ge=-90, le=90)
    category: Literal["uncertain", "possible_position_difference", "possible_brightness_difference", "quality_issue"]
    note: str = Field(max_length=2000)
    created_at: datetime
    frame: Literal["icrs"] = "icrs"

    @field_validator('created_at')
    @classmethod
    def timestamp_has_timezone(cls,value):
        if value.tzinfo is None:raise ValueError('Annotation timestamps require an explicit timezone')
        return value


class DisplaySettings(Record):
    vmin: float
    vmax: float
    stretch: Literal["linear", "asinh"] = "asinh"
    asinh_a: float = Field(default=0.1,gt=0,le=1)
    zoom: float = Field(default=1,ge=1,le=20)
    center_x: float | None = None
    center_y: float | None = None
    view_mode: Literal['side_by_side','single'] = 'side_by_side'
    selected_epoch: Literal['A','B'] = 'A'
    blink_interval_ms: int = Field(default=1500,ge=1000,le=3000)

    @model_validator(mode="after")
    def limits(self):
        if self.vmax <= self.vmin:
            raise ValueError("Display upper limit must exceed lower limit")
        return self


class ComparisonManifest(Record):
    schema_version: Literal["1.0"] = "1.0"
    app_version: str
    pair_id: str
    dataset_kind: Literal["real", "synthetic", "real_with_synthetic_injection"]
    created_at: datetime
    region: SkyRegion
    observations: list[Observation] = Field(min_length=2, max_length=2)
    suitability: Suitability
    processing: dict
    prepared_files: list[FileRecord]
    display: DisplaySettings
    annotations: list[Annotation] = Field(default_factory=list)
    software_versions: dict[str, str]
    citations: list[str]

    @model_validator(mode="after")
    def annotation_identity(self):
        if any(a.pair_id != self.pair_id for a in self.annotations):
            raise ValueError("Annotations must reference this comparison")
        ids = [a.annotation_id for a in self.annotations]
        if len(ids) != len(set(ids)):
            raise ValueError("Annotation IDs must be unique")
        return self

