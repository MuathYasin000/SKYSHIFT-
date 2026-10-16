# Running SKYSHIFT locally

Double-click **start_skyshift.bat** in the project folder. SKYSHIFT opens at **http://localhost:3000**. Keep the server window open while using the application. Press **Ctrl+C** in that window, or double-click **stop_skyshift.bat**, to stop it.

The launcher uses the existing project `.venv` interpreter when available, then the installed Windows Python launcher, then `python`. Python **3.11 or newer** is required. Starting the website does not install packages, retrieve astronomical data, request credentials, or publish a website. Browser interaction uses already prepared data. External reference links require internet access when opened; the local application and its supplied imagery do not.

The previous public 0.2 website is a separate historical release. Local development and local production builds do not modify it. Scientific approval remains **PENDING**.

## Command-line operation

```powershell
.venv/Scripts/python.exe tools/local_server.py --open-browser
```

If another application uses port 3000, the launcher reports the conflict and does not stop that application. Use a different port explicitly:

```powershell
start_skyshift.bat --port 3001
stop_skyshift.bat --port 3001
```

The browser address is then http://localhost:3001. The server binds only to `127.0.0.1`; it is not exposed to a local network or the public internet. There is no user login, remote database, tracking service, or telemetry in this hosting layer. Notes belong to the existing browser application and evidence exports; this static server does not accept annotation uploads.

`/healthz` returns the application health and release identity. `/version.json` returns the release identity. These endpoints expose no machine paths or shutdown token. The local stop script authenticates using an unguessable runtime token stored under `.skyshift-local`; an unrelated process cannot be stopped through this script merely because it occupies the selected port.

## Independent production release

After finishing and testing the website source:

```powershell
.venv/Scripts/python.exe tools/build_local_release.py --name skyshift-0.4-local-release --app-version 0.4.0
```

This creates a new folder under `output/local-production`. An existing release with that name is never overwritten. The folder contains the complete static website, local server, startup and stop scripts, release metadata, and `SHA256SUMS.json`. Copy the whole folder together; run its own startup script to use that snapshot. A system Python 3.11 or newer is sufficient for static hosting; scientific reconstruction has its own pinned Python dependencies in the exported evidence packet.

Text assets are precompressed in the release folder for browsers that request gzip. The uncompressed scientific arrays and FITS files remain intact. Gzip is transport compression, not image enhancement or data alteration. The checksum inventory includes every release file except the checksum inventory itself. Release metadata records hashes of all copied original website assets.

Restore an older version by stopping the current server and starting the older release folder's startup script. This procedure changes the served snapshot without editing previous scientific evidence or the old public release. Browser notes are stored by origin and pair identity; export important notes before switching releases or ports.

## Security and verification

The host serves GET/HEAD requests, rejects traversal and hidden paths, disables directory listing, checks local Host headers, sets explicit scientific-file MIME types, and adds content security, framing, permissions and content-type headers. Scripts, fonts, images and data should be vendored under `web/dist` to work with the local-only content policy. Display images may use data/blob URLs; network data requests are restricted to the local origin.

Run the meaningful HTTP and fault controls:

```powershell
.venv/Scripts/python.exe -m pytest tests/test_local_server.py tests/test_provenance_redesign.py -q
```

The suite covers exact HTTP file bytes, FITS/JS/CSS MIME types, health/version, traversal attempts, disallowed hosts and uploads, authenticated shutdown, occupied ports, gzip equivalence, and preservation and checksum verification of independent release snapshots. These are engineering tests and do not substitute for a qualified scientific review or a novice usability study.
