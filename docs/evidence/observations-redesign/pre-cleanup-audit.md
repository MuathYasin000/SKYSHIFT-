# Pre-redesign comparison

Baseline `pre-redesign-2026-11-15` points to `4e7539b` on `codex/observations-fix`. Compared with `pre-cleanup-2026-11-14`.

- Home, Discover, Classic home, Guide, Challenge guide, Methodology and Native viewer HTML outside Observations and Compare had only the accessible brand name and separating space changed. The Resources menu, linked volume controls, spacecraft assets, Universe code and styles, and methodology content had no removals. Arrival was already opt-in at the older tag.
- `web/src/space-preferences.js`, its served copy and `web/tests/immersive.test.mjs` switched the sound default to off. Restored the original default with saved mute respected.
- `web/src/website.js` and its served copy redirected the bare Observations and Compare hash routes to the new pages. Specific legacy investigation routes were retained.
- `Dockerfile`, `deploy/render.yaml` and `README.md` changed for the full Docker bundle, Render branch and submission instructions. The six added submission, demo and deployment documents are listed below.
- Archive backend, local server, catalog and frame prep, and corresponding test changes support the newer observation workflow. No removals from the protected pages were found.

```text
M	Dockerfile
M	README.md
M	deploy/render.yaml
A	docs/demo_final.md
A	docs/deploy_final.md
A	docs/submission_2026-11-15.md
A	docs/submission_demo_2026-11-15.md
A	docs/submission_deploy_2026-11-15.md
A	docs/submission_final.md
M	src/skyshift/archive_index.py
A	src/skyshift/observations_archive.py
A	src/skyshift/observations_context.py
M	tests/test_exploration_assets.py
M	tests/test_mission_control_contract.py
M	tests/test_native_display.py
A	tests/test_observations_archive.py
M	tools/local_server.py
A	tools/refresh_observation_targets.py
M	web/dist/challenge.html
M	web/dist/classic-home.html
M	web/dist/discover.html
M	web/dist/guide.html
M	web/dist/index.html
M	web/dist/methodology.html
M	web/dist/native.html
M	web/dist/space-preferences.js
M	web/dist/website.js
M	web/src/classic-home.html
M	web/src/discover.html
M	web/src/guide.html
M	web/src/index.html
M	web/src/methodology.html
M	web/src/native.html
M	web/src/space-preferences.js
M	web/src/website.js
M	web/tests/immersive.test.mjs
```
