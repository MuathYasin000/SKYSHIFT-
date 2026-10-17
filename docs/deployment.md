# Independent hosting and publication history

**Default development and execution:** the independent application at http://localhost:3000, started with `start_skyshift.bat`. See [local hosting](local_hosting.md). No public hosting account is required for localhost or the curated offline application.

**Previous public deployment (preserved, no further publishing):** [SKYSHIFT](https://skyshift-project-mercury.surebream11.chatgpt.site), updated on 17 October 2026 following the user's explicit request for public availability. Visitors need no login. Public static hosting does not require the Windows computer to stay on. Local notes remain in each visitor's browser; export before closing a tab or moving devices. This is optional publication of the same application, not a new hosting dependency. It can also be staged for another conventional static provider and the user's future domain.

## Publish the corrected application independently

The latest user instruction stops ChatGPT Sites development. The layout repair is available on localhost and in the prepared independent upload folder; it has **not** been published to a new provider. The previous public site below remains historical and does not contain this layout repair. No new hosting account or public project was created.

1. Run `D:\Nasa_SKYSHIFT\prepare_web_upload.bat` whenever you want to refresh the upload. It validates and stages the static application at `D:\Nasa_SKYSHIFT\tmp\skyshift-upload\dist`. Python is needed only for this local preparation. The hosted app needs no Python, database or npm build.
2. Create or sign in to your own [Cloudflare account](https://dash.cloudflare.com/). Open **Workers & Pages → Create application → Get started → Drag and drop your files**. Choose **Pages / Direct Upload** if the dashboard shows a Workers/Pages choice.
3. Choose an available project name, for example `skyshift-mercury`. Drag the prepared **dist folder** into the upload area. Its `index.html`, `assets`, `data` and `vendor` must be at the deployed site's root. Upload the entire prepared folder; do not upload the full project, virtual environment or old Sites archive.
4. Select **Deploy site** (or **Save and Deploy**). Cloudflare supplies the actual `https://<available-project-name>.pages.dev` address. The name is not reserved by this project. Share that address; your PC can then be off.
5. Open the result in a fresh browser: check the full-width homepage, drag the telescope, open Compare, export an investigation and reopen it. In this workspace, `node tools/verify_public_workspace.mjs https://YOUR-ACTUAL-SITE.pages.dev` runs the automated public smoke/integrity/export checks. The new provider's deployment is unverified until those checks are run there.

The prepared upload has 149 files; its largest file is 8,000,000 bytes. These fit the documented drag-and-drop limits of 1,000 files and 25 MiB per file. It includes static security headers, public runtime metadata, original source identities, all viewing assets and all six hashed review-packet parts. It contains no hosting credentials or ChatGPT runtime integration. Curated views, 3D, sound, notes and evidence reconstruction run in visitors' browsers. Retrieving new observations and following external NASA references require internet. Private notes remain browser-local and should be exported to move between devices; there is no shared user database.

For later updates, rerun the preparation script, then choose **Create a new deployment** in that same Pages project and upload the refreshed folder. Direct Upload projects cannot be switched to Git integration in place; automatic Git deployments would require a separate Git-integrated Pages project. To add your own domain later, open the Pages project's **Custom domains → Set up a custom domain** and follow the DNS instructions before sharing it.

Official instructions checked on 17 October 2026: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/). No cloud subscription, credentials or domain purchase has been assumed on the user's behalf.

**Verification of this revision:** 17 homepage/workflow scenarios each in Chrome and Edge, 91 JavaScript unit tests and 24 Python frontend/server checks pass. A separate ordinary Python static server (no SKYSHIFT server routes and no Sites integration) passed four static-host smoke/integrity/export/3D/audio checks. See `evidence/home_layout_tests_chrome.json`, `evidence/home_layout_tests_edge.json` and `evidence/independent_static_tests.json`. Browser widths 320–2560 pixels are emulated; these are not physical-device or subjective design certifications. Scientific approval and human internal review remain PENDING.

---

## Previous Sites version 4 (historical)

| Historical identity | Value |
| --- | --- |
| Existing project, preserved | appgprj_6ad224d35b908191a0566896f57187a7 |
| Release | skyshift-0.7-sine-orbital |
| Saved version | 4 |
| Version ID | appgprj_6ad224d35b908191a0566896f57187a7~appgver_5140e65923588191928d0f45222e8119 |
| Deployment ID | appgdep_6ad36b34bf28819185c5302f5bea5bb4 |
| Native result | succeeded, 2026-10-17T12:34:19.163365Z |
| Published source commit | 2d9881094c2e6bf5d5d363d1153bbd9b2ee031b8 |
| Content ID | 109f74f560b64594303641fd1155edef3da83b35d343e0412f859adf27c82b42 |
| Scientific approval / internal human review | PENDING / PENDING |

The 145 frontend assets were copied byte for byte from `web/dist`; the public stage adds only runtime identity JSON and static security/cache headers. Prepared scientific data and telescope assets are unchanged. The package was verified before publication and saved against the exact source commit. The previous version and source history remain available.

**Executed public verification:** four fresh-profile Chrome scenarios passed, without login, publishing credentials or auth bypass. They verified the public hero and 3D model, exact bundle/FITS/all six review-part hashes, comparison ZIP download and changed-viewport reopening, sine playback/mute and all three optional telescope models with the optical explanation. See [the machine-readable receipt](evidence/public_workspace_tests.json). Local verification additionally passed 91 JavaScript tests, 24 Python frontend/server checks, ten targeted scenarios each in Chrome and Edge and 19 full product journeys in Chrome. Public smoke coverage is not a physical-device, subjective listening, scientific or independent novice certification.

## Historical Sites publication procedure (superseded)

Keep local source under `web/dist` independent. Open the existing hosting source into `tmp/publication-source` using the Sites source helper, then run `tools/prepare_public_static.py --destination tmp/publication-source/dist`. Validate the exact staged hashes, use the source helper to push/package, save the exact version and deploy it. On this Windows host, Git Bash must be on PATH and GNU tar needs `TAR_OPTIONS=--force-local` to interpret the drive-letter archive path. Credentials belong only in memory/stdin, never files, logs or command arguments. The hosting metadata is confined to the temporary publication checkout.

Run `node tools/verify_public_workspace.mjs https://skyshift-project-mercury.surebream11.chatgpt.site` against the actual published version. A future scientific change requires its own integrity/reconstruction checks before replacing assets. Version 4 is the current interface rollback target; historical versions retain their original limitations. No rollback redeployment was performed solely to test restoration.

---

## Historical public deployment (0.2)

The record below describes the superseded 0.2 public release. Local execution subsequently became the default; the renewed publication request is implemented above. Historical version identifiers and scientific evidence are retained.

Verified production URL: https://skyshift-project-mercury.surebream11.chatgpt.site

The deployed release is a scientific review workspace. Scientific approval and human internal review remain PENDING. It contains real SPHEREx QR2 data and does not assert motion, variability, a discovery or NASA endorsement.

| Identity | Value |
| --- | --- |
| Sites project | appgprj_6ad224d35b908191a0566896f57187a7 |
| Audience | Public, explicitly requested by the user |
| Historical saved version | 3 |
| Version ID | appgprj_6ad224d35b908191a0566896f57187a7~appgver_6ef7133ac99c8191a7de8d024152698f |
| Deployment ID | appgdep_6ad23708f23c8191be29d3801201751a |
| Native deployment result | succeeded, 2026-10-16T14:39:36Z |
| Published frontend source commit | 6807f11336594c2182f8251246427f48b8c775f8 |
| Prepared comparison | pair-52ad675d929b0740c23b |
| Scientific packet | m101-review-v6.zip |
| Packet SHA-256 | 2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78 |

Native hosting reported success. A separate browser visit loaded the exact pair identity and corrected registration-v2 diagnostics. Unauthenticated HTTP requests verified HTML/catalogue/bundle/prepared-FITS identities with no cookies or developer credentials. A production browser download of the 40.7 MB full packet matched its original SHA-256. Its compact annotation export reconstructed all ten arrays exactly in a fresh Python environment.

The viewer's immutable JSON bundle is approximately 125 KB; prepared FITS is 60,480 bytes. Original review data are downloaded only on request. The full review packet is split into six individually hashed assets under the hosting size limit and reconstructed client-side. No database or scientific server runtime is needed. Session notes remain tab-local.

## Deployment procedure and restoration

The frontend in web/ has its own Sites source Git repository. Preserve .openai/hosting.json and its exact project ID. Use the Sites source helper to commit/push the exact tested source, save a version and deploy that saved version. Keep source credentials only in memory and stdin. No token belongs in tracked files, logs or shell arguments.

On this Windows host, the plugin's Bash packaging wrapper cannot interpret its Windows script path. Source synchronization succeeded. The final archive used the plugin's unchanged prepare-site-build.cjs and native Windows tar to perform the same staging/packaging steps; the exact archive was uploaded with the verified source commit. No plugin code or credentials were changed. The first version used the documented remote-build fallback.

The source/archive manifest, exact commit, saved version and scientific packet are the restoration units. A future revision must preserve scientific status and immutable identities until justified review evidence changes them. Redeploying version 3 restores the historical 0.2 frontend, not the current 0.7 interface. Version 1 is retained only as superseded audit history because registration context membership was subsequently corrected; do not use it as a scientific rollback target.

The site is static, so there are no database migrations to reverse. A deployment failure leaves the previous published version intact. Restoration commands and artifact identity checks were exercised locally; a second production redeployment solely to simulate rollback was not performed. Monitoring/automations and a custom domain have not been configured.

## Verification limits

Browser inspection covered the available in-app browser at 1265 x 720 and 314 x 655 content sizes, without horizontal overflow. Production corruption rejection and note restoration worked; two tabs retained different note counts. This is engineering QA, not five human novice sessions or cross-browser/device certification. HTTP transfer timings are recorded separately and are not browser-paint or controlled cold-cache benchmarks.

Version 3 corrects a stale rounded number in one reviewer-guide question. Its scientific manifest, prepared FITS and comparison identity are byte-identical to version 2. The updated full packet is derived from the immutable hash-verified original ZIP, excluding source-install build caches.
