# Workbench verification

The baseline screenshots came from commit `4e7539b`, tagged `pre-redesign-2026-11-15`. All comparison images show real cached SPHEREx exposures. Browser checks used Google Chrome with desktop and phone viewports.

| Page | Before 1440 px | After 1440 px | Before 390 px | After 390 px |
| --- | --- | --- | --- | --- |
| Observations · WISE 0855-0714 | [Before](before/explore-1440.png) | [After](after/explore-1440-wise-0855.png) | [Before](before/explore-390.png) | [After](after/explore-390-wise-0855.png) |
| Compare · WISE 0855-0714 | [Before](before/compare-1440.png) | [After](after/compare-1440-wise-0855.png) | [Before](before/compare-390.png) | [After](after-touch/compare-390-wise-0855.png) |
| Home | [Before](before/index-1440.png) | [After](after-fixes/index-1440.png) | [Before](before/index-390.png) | [After](after-fixes/index-390.png) |
| Methodology | [Before](before/methodology-1440.png) | [After](after/methodology-1440.png) | [Before](before/methodology-390.png) | [After](after/methodology-390.png) |

[All 20 target screenshots](after/) · [Desktop filmstrip](after/timeline-1440.png) · [Mobile filmstrip](after/timeline-390.png) · [Mobile keyboard picker](after-touch/frame-picker-390.png)

The first visual pass showed horizontal overflow on phones and two accessible-name issues. The second moved completed-search status under the timeline, made metadata at least 14 px and fixed the overflow and labels. The next pass shortened the metadata panel and improved scale and Wipe labels. Final responsive checks met the desktop viewer-height and phone-width requirements.

- [Local Chrome matrix](after/verification.json) recorded 34 passes and five initial failures. [Focused recheck](after-fixes/verification.json) passed both Home landmark scans, both Challenge link checks and the sound test. The sound test now spaces steps outside the intended audio throttling interval.
- [Mobile follow-up](after-touch/verification.json) verified the 44 px Wipe slider, 390 px keyboard control and shared-view round trip. The five target previews passed axe in both routes and at both widths.
- [Arrival sound](arrival-sound/browser.json) verified that the animation stays silent, ordinary interface audio plays after a gesture, and no WebGL recovery still works.
- [Node regression suite](node-tests.txt) passed 167 tests and skipped 12. [Python archive, server and hosting tests](python-regression.txt) passed 27 tests. Served asset, scientific and sequence manifests passed integrity validation.
- The old browser suite stopped on an obsolete home locator that matches two headings in this version. The current verifier exercises the redesigned viewer and protected page flows with current selectors.
- [External source-link check](source-links-final.json) flags NASA pages with TLS or timeout errors in the local runner. The NASA SPHEREx mission and Vela pages loaded through the independent browser service. Their original source records remain attached. Two publisher DOI redirect links that failed the first check were replaced with the same citations in plain text alongside working archive links.
- [Pre-cleanup audit](pre-cleanup-audit.md) and [copy changes](copy-changes.md) list affected files and wording.

The first Render deployment used Docker on the Free plan with `/healthz`. [Signed-out Chrome results](render-browser.json) passed all ten cached route checks and the keyboard and share walkthrough. The first custom IRSA browser request [reached the 50 second test limit](render-live-irsa.json). The follow-up DR1 job finished as partial or unavailable after [IRSA returned HTTP 502 responses and read timeouts](render-irsa-job.json). This is an archive availability result.

The release check matched four public assets to commit `fac6e8f` by SHA-256 and confirmed both health endpoints. The first Chrome probe during the rollout missed the comparison markup. Once Render returned the page again, the signed-out 390 px comparison and keyboard flow passed, including the 44 px Wipe control. [Release checks](render-release.json) · [Rollout probe](render-rollout-sample.json) · [Final mobile check](render-mobile-final.json)

The optional 3D Universe and arrival dialog each passed their [separate axe scan](protected-axe.json). A single direct query to the official IRSA SIA endpoint, requesting at most one metadata row, also returned HTTP 502 with “Error reading from remote server.”
