"""Reacquire exact documented inputs; stop rather than substitute changed data."""
from pathlib import Path
import json
import sys
from skyshift.archive import download, utc_now

ROOT = Path(__file__).resolve().parents[1]


def main():
    config = json.loads((ROOT / 'config/feasibility_sample.json').read_text(encoding='utf-8'))
    outcomes = []
    for entry in [*config['inputs'], config['calibration']]:
        try:
            path = ROOT / entry['path']
            record = download(entry['source_url'], path)
            if record.sha256 != entry['sha256']:
                raise ValueError('Archive bytes differ from the recorded scientific snapshot')
            outcomes.append({'path':entry['path'], 'status':'verified', 'sha256':record.sha256})
            print('Verified', entry['path'], flush=True)
        except (OSError, ValueError) as exc:
            outcomes.append({'path':entry['path'], 'status':'failed', 'error':str(exc)})
            print('Failed',entry['path'],str(exc),file=sys.stderr,flush=True)
    output = ROOT / 'data/acquisition'
    output.mkdir(parents=True,exist_ok=True)
    stamp = utc_now().strftime('%Y%m%dT%H%M%S%fZ')
    (output / f'reproduction_{stamp}.json').write_text(json.dumps({'completed_at':utc_now().isoformat(),'outcomes':outcomes},indent=2),encoding='utf-8')
    return 1 if any(row['status']=='failed' for row in outcomes) else 0


if __name__ == '__main__':
    raise SystemExit(main())
