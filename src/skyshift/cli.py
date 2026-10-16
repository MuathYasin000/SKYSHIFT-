"""Small inspectable commands for the first data-feasibility milestone."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from .archive import inventory, download
from .models import SkyRegion, ComparisonManifest
from .products import read_product, product_summary
from .suitability import screen_pair


def write_json(value, output: Path | None):
    text = json.dumps(value, indent=2, allow_nan=False)
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("x", encoding="utf-8") as stream:
            stream.write(text + "\n")
    else:
        print(text)


def main(argv=None):
    parser = argparse.ArgumentParser(prog="skyshift", description="Traceable SPHEREx data feasibility tools")
    sub = parser.add_subparsers(dest="command", required=True)
    inv = sub.add_parser("inventory", help="Save an IRSA query, raw response, and normalized inventory")
    inv.add_argument("--release", choices=["qr2", "qr3"], default="qr2")
    inv.add_argument("--output", type=Path, required=True)
    fetch = sub.add_parser("download", help="Fetch an approved archive URL and provenance sidecar")
    fetch.add_argument("url");fetch.add_argument("--output", type=Path, required=True)
    inspect = sub.add_parser("inspect", help="Inspect one cutout and its quality/spectral context")
    inspect.add_argument("path", type=Path);inspect.add_argument("--calibration", type=Path)
    inspect.add_argument("--output", type=Path)
    screen = sub.add_parser("screen", help="Screen a real pair; passing screens remain pending scientific review")
    screen.add_argument("a", type=Path);screen.add_argument("b", type=Path)
    screen.add_argument("--calibration", type=Path, required=True);screen.add_argument("--output", type=Path)
    schema = sub.add_parser("schema", help="Write the versioned comparison JSON schema")
    schema.add_argument("--output", type=Path)
    packet = sub.add_parser('export',help='Create a self-contained review evidence ZIP')
    packet.add_argument('bundle',type=Path);packet.add_argument('--output',type=Path,required=True)
    reconstruct = sub.add_parser('reconstruct',help='Verify hashes and independently rerun common-grid preparation')
    reconstruct.add_argument('packet',type=Path);reconstruct.add_argument('--output',type=Path,required=True)
    reconstruct.add_argument('--source-cache',type=Path,help='Extracted full review packet providing hash-verified original inputs')
    review=sub.add_parser('review',help='Reproduce preparation, Gaia registration, and response diagnostics; approval stays pending')
    review.add_argument('packet',type=Path);review.add_argument('--output',type=Path,required=True)
    for command in (inv, inspect, screen):
        command.add_argument("--ra", type=float, required=True)
        command.add_argument("--dec", type=float, required=True)
        command.add_argument("--size", type=float, default=0.12, help="Square cutout width in degrees")
    args = parser.parse_args(argv)
    try:
        if args.command == 'review':
            from .evidence import review_packet
            report=review_packet(args.packet,args.output);print(json.dumps(report,indent=2))
            return 0 if report['reconstruction']=='pass' and report['registration']=='pass' and all(report['registration_agreement'].values()) else 2
        elif args.command == 'export':
            from .evidence import export_packet
            print(json.dumps(export_packet(args.bundle,args.output),indent=2))
        elif args.command == 'reconstruct':
            from .evidence import reconstruct_packet
            report=reconstruct_packet(args.packet,args.output,args.source_cache)
            print(json.dumps(report,indent=2))
            return 0 if report['status']=='pass' else 2
        elif args.command == "schema":
            write_json(ComparisonManifest.model_json_schema(), args.output)
        elif args.command == "download":
            print(download(args.url, args.output).model_dump_json(indent=2))
        else:
            region = SkyRegion(ra_deg=args.ra, dec_deg=args.dec, size_deg=args.size)
            if args.command == "inventory":
                rows = inventory(region, args.release, args.output)
                print(f"Saved {len(rows)} inventory rows to {args.output}")
            elif args.command == "inspect":
                p = read_product(args.path, region, calibration=args.calibration)
                write_json(product_summary(p), args.output)
            elif args.command == "screen":
                a = read_product(args.a, region, calibration=args.calibration)
                b = read_product(args.b, region, calibration=args.calibration)
                report, _ = screen_pair(a, b, region)
                write_json(report, args.output)
                if report["suitability"]["status"] == "rejected":
                    return 2
        return 0
    except (ValueError, OSError, KeyError) as exc:
        parser.exit(1, f"SKYSHIFT: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
