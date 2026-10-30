# Serving the same application and preparation engine

The service is verified on Windows and locally in a WSL2 Linux Docker container
(Python 3.12.16, amd64). The container completed fresh archive preparation,
reopened the exact result after a clean SIGTERM/restart, and ran with a nonroot
user, read-only root filesystem, two CPUs, 2 GiB memory and persistent volumes.
This is local verification. The existing public Netlify site is static and its
preparation API returns 404; the new backend has not been publicly deployed.

Run from a complete source checkout, install `requirements-lock.txt`, then
install this package with `pip install --no-deps .`. Build the authored frontend
with `python tools/build_frontend.py`. Run:

```
python tools/public_server.py --hosts skyshift.example --port 3000
```

Managed-host preparation is now in `hosting_options.md` and `deploy/`. The user
explicitly deferred publication and spending. Default Docker startup uses
`container_start.py`: fixed data directories are checked, a single-volume lock
is held, and the HTTP process runs as the `skyshift` user. Root-owned managed
mounts may enable the bounded root bootstrap described there; direct root HTTP
startup is refused. No recursive chown or deletion is performed. Kernel locking
protects against accidentally starting a second service on the same volume.
The lock is released by process exit, including forced termination.

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

The Dockerfile pins the observed Python base-image digest and the dependency
lock. Source changes reuse the dependency layer. A portable single-service start
(replace the trusted host and terminate HTTPS in your proxy) is:

```sh
docker build -t skyshift:reviewed .
docker volume create skyshift-calibration
docker volume create skyshift-cache
docker volume create skyshift-investigations
docker run -d --name skyshift --restart unless-stopped \
  -p 127.0.0.1:3000:3000 --read-only --tmpfs /tmp:rw,nosuid,size=256m \
  --cpus 2 --memory 2g --pids-limit 128 --stop-timeout 210 \
  -e SKYSHIFT_PUBLIC_HOSTS=skyshift.example \
  -v skyshift-calibration:/app/data/calibration \
  -v skyshift-cache:/app/data/cache \
  -v skyshift-investigations:/app/data/investigations skyshift:reviewed
```

Two CPUs/2 GiB were verified for the two-frame demonstration, not certified for
every maximum-size request or a public load. Provision 4 GiB for initial wider
use and measure actual peak memory. Allow at least 2 GiB persistent writable
data space in addition to image/runtime storage (5 GiB total is a practical
starting allocation). The app bounds receipts and cutout cache separately at
512 MiB each; it now reserves 80 MiB per physically unfinished job for the final
sequence plus bounded metadata, header prefixes and reference evidence. It never
automatically deletes scientific evidence to make room. Monitor these quotas and
archive reviewed receipts before accepting more requests. Calibrations have
their own persistent volume. Internet HTTPS egress to approved IRSA and official
SPHEREx S3 endpoints is required; no archive credential is required.

For redeployment, stop accepting new preparation at the proxy, stop with the
210-second grace period, retain all three volumes, and start the reviewed image
against those volumes. Only one process may own them. Completed receipts survive
restart; interrupted jobs do not automatically resume. Partial/failed acquisitions
remain preserved and may require operator review. Never delete or replace them
silently. Verify health, capabilities and a saved receipt before enabling new
preparations. Roll back by starting the prior reviewed image with the same
volumes; never rewrite historical result bytes to match new code.

Reproduce the local checks with `tools/verify_linux_service.py` under Linux,
passing the exact loopback test container name. This verifier stops/restarts that
container. `tools/reconstruct_temporal_example.py --output NEW_DIRECTORY`
rebuilds the pinned R Draconis field from its exact originals with the native
engine and recorded reference catalogue. Numerical arrays must match exactly.
All scientific decisions and thresholds must match exactly; continuous
registration-fit diagnostics permit only 1e-6 absolute/1e-9 relative platform
numerical differences. This reconstruction tolerance never changes a scientific
acceptance gate. Verification output directories are fresh and collision-safe.

Before declaring a host ready, verify anonymously: `/healthz`,
`/api/capabilities`, a real coordinate request, progress/result identity, cancelled
and rejected requests, export/reopen, original-data reconstruction, restart, and
remote archive outage recovery. Confirm the served release identity. A 200 health
response, local browser test or Docker recipe alone does not establish external
readiness. Preserve cached examples when the archive is unavailable.

No hosting account, paid service, DNS change, public upload or final competition
submission has been performed by this engineering milestone. A Python-capable
deployment destination and access to that authorized host are still needed.
