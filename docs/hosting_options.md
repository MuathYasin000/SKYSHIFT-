# Public hosting options — verified sources, 30 October 2026

These are reviewed deployment configurations, not purchased or published services.
Both serve the existing Python engine and static frontend from one HTTPS origin.
One process/instance owns one persistent `/app/data` volume. No separate static
frontend is substituted. Generated provider domains avoid needing a DNS change.

| Option | Resources and persistence | Estimated monthly charge |
|---|---|---|
| Railway Hobby | Set one instance, a 2-vCPU / 4-GB ceiling and a 2-GB volume at `/app/data`. The free/trial RAM and volume limits are below the verified baseline. | $5 minimum including usage. RAM is $10/GB-month, CPU $20/vCPU-month, volume $0.15/GB-month, egress $0.05/GB. An illustrative **average** of 2 GB RAM + 0.2 vCPU + 2 GB disk is about **$24.30/month** before egress/tax; continuous use of 4 GB + 2 vCPU is about $80.30. These are arithmetic scenarios, not a measured bill or availability promise. |
| Render paid Docker web service | `2c-4g` (legacy `pro`): 2 CPU / 4 GB RAM, one instance, 2-GB persistent disk at `/app/data`. Hobby workspace is sufficient; this is paid compute. | $85/month compute + $0.50/month disk, approximately **$85.50/month**, excluding additional bandwidth/tax/optional workspace upgrades. The cheaper $25/month `1c-2g` service has one CPU and does not match the verified two-CPU baseline. |

Pricing was checked against [Railway pricing](https://docs.railway.com/pricing/plans),
the actual web-service table in [Render pricing](https://render.com/pricing), and
[Render disk pricing](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses).
Do not confuse Render's similarly named Postgres plans with its web-service
plans. Render changed plan identifiers in August 2026; see
[the current mapping](https://render.com/docs/compute-plans-update).

## Prepared configuration and exact account action

Railway: select `deploy/railway.json` as the service's config file; build the root
Dockerfile. Attach one 2-GB volume to `/app/data`, set `RAILWAY_RUN_UID=0`, create a
generated public domain, set the resource ceilings and spending alerts/limit,
and keep exactly one instance. The root phase only creates/chowns the fixed data
directories; `container_start.py` clears supplementary groups and drops to the
image's `skyshift` account before execing the HTTP process. No recursive ownership
rewrite is performed. Never override startup to run `public_server.py` as root.

Railway documents [root-owned volume mounts](https://docs.railway.com/volumes) and
[one volume/no replica restrictions](https://docs.railway.com/volumes/reference).
It also sends [health probes with Host `healthcheck.railway.app`](https://docs.railway.com/deployments/healthchecks).
That Host is accepted only for GET/HEAD `/healthz`; API and other paths retain
the exact public-host restriction. The config requests zero deployment overlap
and 210 seconds for SIGTERM draining. Continuous external uptime monitoring is
separate; Railway's probe is a deployment check.

Render: use `deploy/render.yaml` as a reviewed Blueprint after approval. It fixes
one paid `2c-4g` service, disables automatic deploys, sets the disk and health
endpoint, and sets the nonsecret build argument `SKYSHIFT_BOOTSTRAP_UID=root`
through Render's environment-to-build-argument behavior. This enables the same
bounded ownership bootstrap, then a nonroot HTTP process. Default local Docker
builds retain `USER skyshift`. See [Docker behavior](https://render.com/docs/docker)
and [persistent-disk restrictions](https://render.com/docs/disks). A disk entails
brief redeployment downtime, no horizontal replicas, and platform-specific
shutdown limits; interrupted acquisitions remain preserved and do not resume.

Both: the service reads the exact generated hostname from `RAILWAY_PUBLIC_DOMAIN`
or `RENDER_EXTERNAL_HOSTNAME` when `SKYSHIFT_PUBLIC_HOSTS` is not explicitly set.
For a later custom domain, explicitly list all authorized exact hosts. No
wildcard hosts, forwarded-host guessing, permissive CORS, or archive credentials.
An advisory kernel lock survives exec and prevents a second bootstrap from
owning the same volume. Keep the existing original/cache/receipt quotas and
review full storage before accepting more jobs. See `public_service.md` for
reconstruction, restart and rollback boundaries.

**User decision:** preparation only; public deployment and spending are deferred
for later discussion. Do not provision, publish, purchase or modify DNS.

**Current blocker:** no Railway/Render account access or deployment destination
has been authorized; neither provider CLI is installed, and this Git checkout
has no remote. The user must choose a host and spending ceiling, authorize
provisioning/publication and source transfer, and provide access through the
provider's normal account connection. Do not paste credentials into repository
files or chat. A paid service, source upload, custom domain or DNS change has not
been created. These account actions must precede external acceptance testing.

After authorization, deploy the reviewed commit and verify anonymously:
coordinates → filters/discovery → real preparation → dates/A-B/blink/wipe → source
and target-quality inspection → ZIP export → fresh-session reopen. Check Host/
Origin refusals, cancellation, restart byte identity, archive outages and quota
recovery. Until those checks pass on the actual external URL, public release
remains **NOT VERIFIED**.
