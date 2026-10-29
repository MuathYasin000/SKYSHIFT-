# Serving the same application and preparation engine

The local service is verified on Windows. Docker is not installed on this
machine; the Linux image build and external deployment remain unverified.
The existing public Netlify site is static and its preparation API returns 404.

Run from a complete source checkout, install `requirements-lock.txt`, then
install this package with `pip install --no-deps .`. Build the authored frontend
with `python tools/build_frontend.py`. Run:

```
python tools/public_server.py --hosts skyshift.example --port 3000
```

Replace the example with the actual host; wildcard hosts are refused. Terminate
TLS in a trusted reverse proxy which preserves that exact Host header. Serve the
frontend and API from the same origin; a cross-origin backend requires a separate
explicit design and is not silently enabled. Keep the ordinary local startup
loopback-only. Set `PORT` if the host requires it; container health monitoring
uses the same value (the default is 3000).

The source Dockerfile builds the same site without relying on ignored local
research inputs. Calibrations and observations are downloaded from approved
official sources on demand and checked against their identities. Mount persistent
storage for `data/calibration`, `data/cache`, and `data/investigations`; ensure the
non-root service user can write to them. Bound upstream request rates, connections,
body size and timeouts at the proxy. The application accepts requests up to 4 KiB,
at most two unfinished jobs, twelve new job starts/minute across the service,
bounded image transfers and bounded receipt/cache storage. Cancelled I/O retains
its admission slot until it terminates. Shared research hosting is not an unlimited
multi-user compute service.
Run one preparation process per storage volume. Coordinating quotas across
multiple replicas is not implemented.

Before declaring a host ready, verify anonymously: `/healthz`,
`/api/capabilities`, a real coordinate request, progress/result identity, cancelled
and rejected requests, export/reopen, original-data reconstruction, restart, and
remote archive outage recovery. Confirm the served release identity. A 200 health
response, local browser test or Docker recipe alone does not establish external
readiness. Preserve cached examples when the archive is unavailable.

No hosting account, paid service, DNS change, public upload or final competition
submission has been performed by this engineering milestone. A Python-capable
deployment destination and access to that authorized host are still needed.
