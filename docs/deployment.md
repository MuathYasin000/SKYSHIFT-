# Public deployment

Verified production URL: https://skyshift-project-mercury.surebream11.chatgpt.site

The deployed release is a scientific review workspace. Scientific approval and human internal review remain PENDING. It contains real SPHEREx QR2 data and does not assert motion, variability, a discovery or NASA endorsement.

| Identity | Value |
| --- | --- |
| Sites project | appgprj_6ad224d35b908191a0566896f57187a7 |
| Audience | Public, explicitly requested by the user |
| Current saved version | 3 |
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

The source/archive manifest, exact commit, saved version and scientific packet are the restoration units. A future revision must preserve scientific status and immutable identities until justified review evidence changes them. Redeploying version 3 restores the verified current source. Version 1 is retained only as superseded audit history because registration context membership was subsequently corrected; do not use it as a scientific rollback target.

The site is static, so there are no database migrations to reverse. A deployment failure leaves the previous published version intact. Restoration commands and artifact identity checks were exercised locally; a second production redeployment solely to simulate rollback was not performed. Monitoring/automations and a custom domain have not been configured.

## Verification limits

Browser inspection covered the available in-app browser at 1265 x 720 and 314 x 655 content sizes, without horizontal overflow. Production corruption rejection and note restoration worked; two tabs retained different note counts. This is engineering QA, not five human novice sessions or cross-browser/device certification. HTTP transfer timings are recorded separately and are not browser-paint or controlled cold-cache benchmarks.

Version 3 corrects a stale rounded number in one reviewer-guide question. Its scientific manifest, prepared FITS and comparison identity are byte-identical to version 2. The updated full packet is derived from the immutable hash-verified original ZIP, excluding source-install build caches.
