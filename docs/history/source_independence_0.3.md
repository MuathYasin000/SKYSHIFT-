# Independent local source tree

The 0.3 frontend is now an ordinary directory in the root SKYSHIFT repository. A new checkout no longer needs a ChatGPT-hosted Git submodule to obtain its source or static scientific assets. No remote push, public publication, old-site change or credential restoration occurred.

Before converting the gitlink, the complete nested frontend history was committed and preserved:

- Historical public frontend: `6807f11336594c2182f8251246427f48b8c775f8`.
- Last nested 0.3 frontend commit: `f2d29d88ad8e9854a77602ad3981539b7f795c5f`.
- Verified portable bundle: `output/history/SKYSHIFT_frontend_full_history.bundle`.
- Original nested Git metadata retained under the root repository's `.git/historical-web-20261016`.
- Former source URL, recorded as history only: `https://git.chatgpt-team.site/3aa4d165-e214-4b64-8ac3-29a39087fad7/appgprj_6ad224d35b908191a0566896f57187a7.git`.

The bundle contains complete history and was verified with `git bundle verify`. The release backup includes it. Restore that separate historical repository, if needed, using `git clone path-to-bundle restored-historical-frontend`. Current application startup and independent static hosting do not use the historical URL or metadata.

Root `.gitattributes` disables text conversion so recorded source/asset bytes remain exact across checkouts. Scientific input caches and production/media artifacts remain local and enter the complete checksum-verified release backup separately from Git. The old public hosting identity remains in `public_hosting_0.2.json`.
