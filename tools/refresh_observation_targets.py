"""Resume the five on-disk challenge caches with real regional cutouts."""
from __future__ import annotations

import argparse
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from skyshift.archive import sha256_file
from skyshift.models import SkyRegion
from skyshift.observations_archive import CoreSearchRequest, frame_quality, load_targets, prepare_frame, search_observations, utc_now, write_cache_json
from skyshift.products import read_product


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def enrich(row, root, fits_by_hash):
    frame = read(root / row["frame_url"])
    digest = frame["cutout_sha256"]
    source = fits_by_hash.get(digest)
    if frame.get("quality"):
        row["quality"] = frame["quality"]
    elif source and "quality" not in row and sha256_file(source) == digest:
        region = SkyRegion.model_validate(frame["region"])
        product = read_product(source, region, source_url=frame["cutout_source_url"])
        row["quality"] = frame_quality(product, region, row)


def refresh(target, limit, fits_by_hash, offline):
    root = ROOT / "web" / "dist"
    folder = root / "data" / "observation-targets" / target["id"]
    manifest_path = folder / "manifest.json"
    manifest = read(manifest_path)
    rows = {r["access_url"]: r for r in manifest["observations"]}
    for row in rows.values():
        try:
            enrich(row, root, fits_by_hash)
        except (OSError, ValueError, KeyError) as exc:
            print(f"{target['id']} quality {row['observation_id']}: {exc}", flush=True)
    if offline:
        write_cache_json(manifest_path, manifest, indent=2)
        print(f"{target['id']}: {len(rows)} frames, {sum('quality' in x for x in rows.values())} flag records", flush=True)
        return
    request = CoreSearchRequest(
        region=SkyRegion(ra_deg=target["ra_deg"], dec_deg=target["dec_deg"], size_deg=manifest["field_arcmin"] / 60),
        target_id=target["id"],
    )
    result = search_observations(request, progress=lambda message: print(f"{target['id']}: {message}", flush=True), directory=ROOT / "data" / "cache" / "observations" / "metadata")
    for row in result["observations"]:
        if row["access_url"] in rows:
            continue
        name = f"frame-{hashlib.sha256(row['access_url'].encode()).hexdigest()[:20]}.json"
        path = folder / name
        if path.is_file():
            try:
                frame = read(path)
                if frame["archive_id"] == row["observation_id"] and frame["dataset_kind"] == "real" and frame["archive_source_url"] == row["access_url"]:
                    rows[row["access_url"]] = {**row, "frame_url": f"./data/observation-targets/{target['id']}/{name}", "quality": frame["quality"]}
            except (OSError, ValueError, KeyError):
                pass
    pending = [(i, row) for i, row in enumerate(result["observations"]) if row["access_url"] not in rows]
    old_attempts = manifest.get("cutout_failures", {})
    buckets = defaultdict(deque)
    for item in pending:
        row = item[1]
        attempts = old_attempts.get(row["access_url"], {}).get("attempts", 0)
        buckets[(attempts, row["release"], row["detector"], (row["time_start_utc"] or "")[:7])].append(item)
    pending = []
    for attempts in sorted({k[0] for k in buckets}):
        batch = deque(buckets[k] for k in sorted(buckets) if k[0] == attempts)
        while batch:
            bucket = batch.popleft()
            pending.append(bucket.popleft())
            if bucket:
                batch.append(bucket)
    attempted = pending if limit is None else pending[:limit]
    failed = dict(old_attempts)

    def prepare(item):
        index, row = item
        try:
            frame = prepare_frame(result, index, ROOT / "data" / "cache" / "observations")
            name = f"frame-{hashlib.sha256(row['access_url'].encode()).hexdigest()[:20]}.json"
            write_cache_json(folder / name, frame)
            return {**row, "frame_url": f"./data/observation-targets/{target['id']}/{name}", "quality": frame["quality"]}
        except (OSError, ValueError, KeyError) as exc:
            return {"error": str(exc), "attempts": old_attempts.get(row["access_url"], {}).get("attempts", 0) + 1}

    def checkpoint():
        missing = sum(row["access_url"] not in rows for row in result["observations"])
        if result["failures"]:
            manifest["last_incomplete_discovery"] = result["collections"]
            missing = max(missing, manifest.get("missing_cutouts", 0))
        else:
            manifest.pop("last_incomplete_discovery", None)
            manifest.update(collections=result["collections"], metadata_query_position=result["metadata_query_position"])
        manifest.update(
            status="partial" if result["failures"] or missing else "complete",
            refreshed_at_utc=utc_now().isoformat(), missing_cutouts=missing, cutout_failures=failed,
            failure_reason=" | ".join([*result["failures"], *([f"{missing} cutouts pending or inaccessible"] if missing else [])]),
            observations=sorted(rows.values(), key=lambda row: (row["time_start_utc"] or "", row["detector"], row["observation_id"])),
        )
        write_cache_json(manifest_path, manifest, indent=2)

    checkpoint()
    with ThreadPoolExecutor(max_workers=2) as pool:
        for item, output in zip(attempted, pool.map(prepare, attempted)):
            url = item[1]["access_url"]
            if "error" in output:
                failed[url] = output
            else:
                rows[url] = output
                failed.pop(url, None)
            checkpoint()
    print(f"{target['id']}: {len(rows)} cached, {len(pending)} missing at start, {len(attempted)} attempted, {manifest['missing_cutouts']} still missing; {result['failures']}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", choices=load_targets(), action="append")
    parser.add_argument("--limit", type=int, help="Maximum number of missing cutouts to attempt per target")
    parser.add_argument("--reuse-fits", type=Path, help="Directory of existing FITS cutouts with SHA-256 source receipts")
    parser.add_argument("--offline", action="store_true", help="Populate missing quality metadata from local FITS only")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 0:
        parser.error("--limit must be at least zero")
    fits = {}
    if args.reuse_fits:
        for receipt in args.reuse_fits.glob("*.fits.source.json"):
            fits[read(receipt)["sha256"]] = receipt.with_suffix("").with_suffix("")
    for target in load_targets().values():
        if args.target is None or target["id"] in args.target:
            refresh(target, args.limit, fits, args.offline)
