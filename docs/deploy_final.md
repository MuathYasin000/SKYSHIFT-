# Deploy SKYSHIFT to Render

The [public SKYSHIFT service](https://skyshift-j22s.onrender.com/) runs on Render’s Free plan. The paid Blueprint below is an option for a deployment with persistent storage.

The paid Docker Blueprint is in `deploy/render.yaml`. The application includes the five 8′ challenge previews in `web/dist/data/observation-targets` and runs the Python API for live searches. It has one instance, the `2c-4g` plan (2 CPU and 4 GB RAM), a 2 GB persistent disk at `/app/data`, and `/healthz` as its health path. These are the Blueprint settings.

The local Linux build used a 143.8 MB build context. Docker reported a 409,140,190-byte image. The served web tree is 130,758,424 bytes, including 20,523,407 bytes of bundled target caches.

1. Connect the Git repository in the Render dashboard and push `codex/observations-fix` to that repository.
2. Choose **New → Blueprint**, select the repository and `codex/observations-fix`, and set **Blueprint Path** to `deploy/render.yaml`. Review the plan and disk, then apply the Blueprint. Automatic deployments are disabled.
3. Use the generated HTTPS URL. Verify `/healthz`, verify `/api/observations/releases`, and open `/compare.html?target=rw-aurigae&fov=8` in a clean browser. Publish the submission links only after the signed-out checks pass.

| Environment variable | Value |
| --- | --- |
| `PORT` | `3000` |
| `SKYSHIFT_BOOTSTRAP_UID` | `root`, passed as a Docker build argument so the startup process can prepare the mounted disk before dropping privileges |
| `RENDER_EXTERNAL_HOSTNAME` | Set by Render for its assigned hostname |
| `SKYSHIFT_PUBLIC_HOSTS` | Unset for the default Render URL. For a custom domain, use a comma-separated list of exact allowed hostnames, including the Render hostname if it should keep working |

Bundled previews are part of the image. The persistent disk preserves downloaded FITS, cutout JSON, and discovery metadata across restarts. Search jobs live in memory and are recreated from coordinates on reopen. The service retains cached data. If the disk fills, live writes can fail and the bundled previews remain available. Without a disk, runtime cache files may be lost on restart or redeploy.

Signed-out verification covers all five target buttons, Blink, Side by side, Wipe, Difference, a copied view opened in a new session, and one custom live coordinate request. Record cached and live outcomes independently.

## Free uptime monitor

1. Fetch [SKYSHIFT health](https://skyshift-j22s.onrender.com/healthz) and look for HTTP 200 and `"status":"ok"`.

   ```sh
   curl --fail --show-error --max-time 90 https://skyshift-j22s.onrender.com/healthz
   ```
2. In UptimeRobot, add an **HTTP(s)** monitor named **SKYSHIFT health**. Enter `https://skyshift-j22s.onrender.com/healthz`, select the Free plan’s five-minute interval, and choose where to receive alerts.
3. Save the monitor and verify its first successful check. The endpoint reports application health independently of IRSA. If the service is waking from idle, allow about a minute and check again. Periodic probes count as inbound traffic and can consume free instance hours while the service stays awake.

[UptimeRobot setup guide](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide) · [Render Free plan limits](https://render.com/docs/free)

[Render Blueprint reference](https://render.com/docs/blueprint-spec) · [Docker on Render](https://render.com/docs/docker) · [Persistent disks](https://render.com/docs/disks)
