# SKYSHIFT 0.4 local handoff

Current workspace: `D:\Nasa_SKYSHIFT`. Default address: **http://localhost:3000**. Open the new workflows at `/explore.html` and `/compare.html`.

Double-click `start_skyshift.bat`. Keep its server window open. Stop with Ctrl+C or `stop_skyshift.bat`; restart with the startup script. Prepared viewing needs Python 3.11+ and a modern browser, without credentials, npm, Sites, or internet. Internet is needed for new archive/catalog acquisitions and opening external sources. Pinned scientific Python dependencies plus original inputs are needed for offline numerical reconstruction.

The standalone production snapshot is `output/local-production/skyshift-0.4-visitor-verified`. Run its own startup script after stopping the workspace server, or use `--port 3001` to keep both separate. All 77 inventoried files verified; no extra runtime state is part of the immutable release. Its 22 browser cases passed with an isolated standard-library server; that temporary verification server was stopped afterward.

## Actual completion

- Field descriptions and explicit single-exposure versus limited-comparison availability.
- Accessible source panels, contextual science explanations, clear UTC dates and guided Compare workflow.
- Question-first annotations with attached coordinates, preserved export/reopening, collapsed optional controls.
- Fail-closed loading/retry, reduced motion and responsive layouts down to 320 pixels.
- Actual app-use walkthrough video, 180 seconds, with disclosed automation and generic narration. Original footage remains preserved.
- 92 Python, 32 JavaScript and 22 browser acceptance cases on each hosting variant passed. Axe scans reported no detected violations; incomplete/manual findings remain recorded, not silently accepted as conformance.
- All ten arrays from the actual browser export reconstructed exactly offline; one annotation verified. Original pair identity, original scientific processing code and 24 published scientific/imagery assets remain unchanged.
- Rebuilding visitor HTML/controllers reproduced their checked bytes exactly; all 4,500 video frames and its audio stream decoded without error.
- Additional 45 M67 and 55 NGC 188 small-region screens yielded no candidates; unchanged policy and no additional comparison.

Evidence is in `docs/evidence/*0.4*`, `output/browser-0.4`, `output/browser-0.4-production`, `research/expansion-0.4`, and the versioned media/release folders. See `visitor_experience_0.4.md` for scope, corrected defects and reproduction commands. The complete 0.3 backup and public historical deployment remain preserved.

## Remaining work and interpretation

The user is the sole human UX evaluator. Independent novice validation **NOT CONDUCTED** and not a development blocker; no recruitment/survey infrastructure was created. Await actual direct user feedback for further corrections instead of inventing human findings.

Internal human technical review **PENDING**. Qualified scientific approval **PENDING**. Specialist questions about response equivalence, calibration associations, PSF/background behavior and permissible interpretation remain in the review packet. No approved temporal pair, photometric variability, quantitative difference significance, precision motion or confirmed discovery is claimed.

The next scientifically eligible expansion requires new suitable observations and the complete existing screening/registration/review chain. Further usability changes should follow the user's actual interaction feedback. Broader physical-device/browser and manual assistive-technology checks remain unverified; Chromium viewport automation is not a physical-device or screen-reader certification.
