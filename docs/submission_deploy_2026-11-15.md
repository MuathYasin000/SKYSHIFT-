# SKYSHIFT submission deployment

The [public preview](https://astronomy-licensed-made-successfully.trycloudflare.com/) runs the existing Dockerfile on the Ubuntu Docker host through Cloudflare Quick Tunnel. The preview requires this machine, the SKYSHIFT container, and the tunnel to stay running. The tunnel assigns a new hostname if recreated. A managed Render service needs an authenticated account and a connected Git repository.

## Sizes

The Docker build context was reported as 133.5 MB. The display update's Docker image measured 504,784,803 bytes. It serves 120,565,419 bytes from `web/dist`, including 10,357,197 bytes of manifests and cutouts for the five challenge targets. The optional DSS overlay loads its tiles from MAST when opened.

## Reproduce the preview

From the root of `codex/observations-fix` on the Docker host, build with the repository Dockerfile. Start the tunnel to allocate its public hostname, then pass that exact hostname to the Python service.

```bash
docker build -t skyshift:observations-display .
docker run -d --name skyshift-observations-tunnel --network host --restart unless-stopped \
  cloudflare/cloudflared@sha256:b94b96edf2c9c4360f8879c8580cfaa99077f19c849ec595ca2f711b27d4f344 \
  tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:39015
docker logs skyshift-observations-tunnel
docker run -d --name skyshift-observations-display --restart unless-stopped \
  -p 127.0.0.1:39015:3000 -e PORT=3000 \
  -e SKYSHIFT_PUBLIC_HOSTS=astronomy-licensed-made-successfully.trycloudflare.com \
  skyshift:observations-display
```

For a fresh tunnel, replace the hostname in `SKYSHIFT_PUBLIC_HOSTS` with the one printed in that tunnel's log. The hostname takes no scheme or path. The Dockerfile starts the Python server as an unprivileged user. Check [the health endpoint](https://astronomy-licensed-made-successfully.trycloudflare.com/healthz) and [the archive release endpoint](https://astronomy-licensed-made-successfully.trycloudflare.com/api/observations/releases).

## Use the same Dockerfile on Render

1. Connect a repository that contains `codex/observations-fix` to Render. In the Render dashboard choose **New → Web Service**, select that repository and branch, and set language to **Docker**. Use the repository root as the build context and `./Dockerfile` as the Dockerfile path.
2. Set the health check path to `/healthz` and add `PORT=3000`. Render provides `RENDER_EXTERNAL_HOSTNAME` automatically. If using a custom domain, set `SKYSHIFT_PUBLIC_HOSTS` to the exact hostnames the service should accept, separated by commas. Deploy one instance. The bundled cutouts are in the image. Live downloads on an instance without a persistent disk can disappear on restart.
3. Deploy and copy the assigned public HTTPS URL from the dashboard. In a fresh browser profile, open the five presets, play each flipbook, test wipe, open a pasted coordinate URL, and perform one new coordinate search. Check the returned archive ID and detector before treating the live test as passed.

[Render Docker documentation](https://render.com/docs/docker) · [Render environment variables](https://render.com/docs/environment-variables) · [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
