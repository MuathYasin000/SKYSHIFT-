"""Inspect a bounded acquired sample and preserve every pair-screen result."""
from pathlib import Path
from itertools import combinations
import argparse
import json

from skyshift.models import SkyRegion
from skyshift.products import read_product, product_summary
from skyshift.suitability import screen_pair


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', type=Path, required=True)
    parser.add_argument('--calibration', type=Path, required=True)
    parser.add_argument('--ra', type=float, required=True)
    parser.add_argument('--dec', type=float, required=True)
    parser.add_argument('--size', type=float, default=0.12)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    region = SkyRegion(ra_deg=args.ra, dec_deg=args.dec, size_deg=args.size)
    paths = sorted(args.inputs.glob('*.fits'))
    if not 2 <= len(paths) <= 20:
        parser.error('Provide between 2 and 20 acquired inputs')
    if args.output.exists():
        parser.error('Choose a new output directory to preserve prior evidence')
    args.output.mkdir(parents=True)
    products = []
    failures = []
    for path in paths:
        try:
            product = read_product(path, region, calibration=args.calibration)
            products.append(product)
        except (ValueError, OSError, KeyError) as exc:
            failures.append({'path': str(path), 'error': str(exc)})
    (args.output / 'product_inspections.json').write_text(json.dumps([product_summary(p) for p in products],indent=2),encoding='utf-8')
    reports = []
    for a, b in combinations(products, 2):
        report, _ = screen_pair(a, b, region)
        reports.append(report)
    def ranking(report):
        checks = report['suitability']['checks']
        failed = sum(c['status'] == 'fail' for c in checks)
        wave = next(c['measurements']['max_separation_bandwidths'] for c in checks if c['code'] == 'local_spectral_screen')
        return failed, wave if wave is not None else float('inf')
    reports.sort(key=ranking)
    result = {'dataset_kind':'real', 'status':'feasibility_screen_only', 'input_failures':failures, 'pairs':reports}
    (args.output / 'pair_shortlist.json').write_text(json.dumps(result,indent=2,allow_nan=False),encoding='utf-8')
    print(f'Inspected {len(products)} inputs, recorded {len(reports)} pair screens, {len(failures)} input failures.')
    for report in reports[:3]:
        print(report['observation_a'], report['observation_b'], report['suitability']['status'], ranking(report))


if __name__ == '__main__':
    main()
