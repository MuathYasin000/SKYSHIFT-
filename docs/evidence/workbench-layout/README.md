# Workbench layout verification

The before screenshots use `pre-layout-2026-11-15` at `0753744`. The after screenshots cover both routes, RW Aurigae and WISE 0855-0714, and the top, middle and bottom of the page at each width. Tab screenshots show all four tools tabs for both targets in Compare.

| Width | Compare · WISE 0855-0714 before | Compare · WISE 0855-0714 after |
| --- | --- | --- |
| 1920 px | [Top](before/compare-wise-0855-1920-top.jpg) · [Middle](before/compare-wise-0855-1920-middle.jpg) · [Bottom](before/compare-wise-0855-1920-bottom.jpg) | [Top](after/compare-wise-0855-1920-top.jpg) · [Middle](after/compare-wise-0855-1920-middle.jpg) · [Bottom](after/compare-wise-0855-1920-bottom.jpg) |
| 1440 px | [Top](before/compare-wise-0855-1440-top.jpg) | [Top](after/compare-wise-0855-1440-top.jpg) |
| 1280 px | [Top](before/compare-wise-0855-1280-top.jpg) | [Top](after/compare-wise-0855-1280-top.jpg) |
| 1024 px | [Top](before/compare-wise-0855-1024-top.jpg) | [Top](after/compare-wise-0855-1024-top.jpg) |
| 768 px | [Top](before/compare-wise-0855-768-top.jpg) | [Top](after/compare-wise-0855-768-top.jpg) |
| 390 px | [Top](before/compare-wise-0855-390-top.jpg) | [Top](after/compare-wise-0855-390-top.jpg) |

[All before captures](before/) · [All after and tab captures](after/) · [Desktop DSS dialog](after/dss-dialog-1920.jpg) · [Mobile DSS dialog](after/dss-dialog-390.jpg)

The first pass introduced the fixed desktop workbench. Review at 1280 px found that the stage occupied less than 60% of the viewport. The second pass added compact filmstrip tiles for short desktop windows and recovered space. A final mobile pass put Speed on the playback row and corrected a Compare link that was visible in its own observation list.

- The [layout checks](after/verification.json) passed 28 cases. They cover both routes at the six widths, every tab, panel bounds, the 1100 px boundary, and the 10-second AllWISE timeout and Retry. Desktop stage dimensions remained stable when the tools scrolled. Axe reported zero violations in every scanned state.
- The [Chrome regression run](chrome-regression.json) passed 38 cases. One test matched both Find buttons after the search moved to a dialog. The scoped selector [recheck](search-recheck.json) passed. The [arrival sound checks](arrival-sound.json) all passed. The [Node suite](node-tests.txt) passed 167 tests with 12 skips.
- [Live catalog results](catalog-check.json) recorded 366 Gaia sources and the capped first 500 AllWISE sources for the test field. Both DSS modal checks used the live DSS tiles and a real SPHEREx frame.
- Changing targets now takes one extra click through Find. The fit view preserves the extent of the original square field within the larger desktop stage. Tool panels scroll independently at desktop widths.

## Changed source and generated files

- `web/src` and `web/dist` copies of `compare.html`, `explore.html`, `observations-compare.css`, `observations-compare.js`, `observations-sky-background.js`, and `observations-tools.js`.
- `web/dist/data/release-integrity.json` from the normal build. The rebuild refreshed the application content identity using the existing archive files.
- `tools/verify_workbench_layout.mjs`, `tools/verify_observation_workbench.mjs`, [UI structure](../../ui-structure.md), and the screenshots and reports in this directory.

[Render verification](render-release.json) matched commit `c1e14f6` to the public stylesheet and health receipt. Signed-out Chrome opened all five target links and mobile Observations. The three public HTML fetches contained the Render canonical and Open Graph URLs, and the share image responded as WebP.
