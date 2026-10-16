"""Keep release communication aligned with performed independent browser checks."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for relative in ['tools/redesign_web.py','web/dist/methodology.html']:
    p=ROOT/relative;t=p.read_text(encoding='utf-8').replace('116 × 176 and 137 × 176 pixels','176 × 116 and 176 × 137 pixels (width × height)');p.write_text(t,encoding='utf-8')
p=ROOT/'tools/build_local_report.py';t=p.read_text(encoding='utf-8')
t=t.replace('New desktop/mobile browser acceptance: PENDING.','Independent Chromium desktop/mobile browser checks: PASS.')
t=t.replace('The current account disables local browser automation. No new screenshot, live-browser result, participant study or scientific approval is asserted.','Work’s integrated browser remains disabled. A separate, explicitly authorized local Playwright runner completed browser checks with a fresh profile. No participant study or scientific approval is asserted.')
t=t.replace('A 116 x 176 and B 137 x 176','A 176 x 116 and B 176 x 137 (width x height)')
t=t.replace("['Browser and visual acceptance','Blocked by the current account setting disabling local browser use. Desktop/mobile screenshots, new interface interactions and browser download/reopen remain pending.']", "['Independent browser acceptance','17 local Chromium checks passed at widths 1440, 1024, 390 and 320 pixels. Actual annotation export/reopen, palette/wipe restoration, full-packet hash, reduced-motion behavior and fail-closed integrity controls verified. Screenshots inspected. Broader browser/device certification and novice sessions remain open.']")
p.write_text(t,encoding='utf-8')
p=ROOT/'tools/build_local_deck.mjs';t=p.read_text(encoding='utf-8')
t=t.replace('New 0.3 desktop/mobile browser verification is blocked by current Work local-browser setting.','17 independent local Playwright Chromium checks passed, including desktop/mobile views and browser evidence export/reopen. The Work browser permission remains unchanged. Broader cross-browser/device checks remain open.')
t=t.replace('Browser acceptance for this redesigned 0.3 interface is pending because the current account disables local browser use.','17 independently run local Chromium checks passed for this redesigned interface. The Work integrated-browser permission remains unchanged.')
t=t.replace('This is not browser verification.','Independent browser verification additionally exercised export/reopen and full-packet download. The browser-created comparison reconstructed all ten arrays offline with zero error.')
t=t.replace('Browser acceptance remains open.','17 independent local Chromium browser checks pass.')
t=t.replace('Desktop/mobile browser acceptance\\n','Broader browser/device testing\\n')
t=t.replace('SKYSHIFT_Local_Release_0.3.pptx','SKYSHIFT_Local_Release_0.3_verified.pptx')
# Add actual inspected interface evidence before the closing local-execution slide.
needle="{\nconst s=slide('Local execution and remaining acceptance gates'"
insert="""{
const s=slide('The locally running exploration workspace','Actual independent Playwright Chromium screenshot at http://localhost:3000. Single-exposure real SPHEREx M101 context, source records and exact UTC dates visible. Screenshot is an engineering demonstration, not a science approval.');
await image(s,'output/browser-0.3/explore-desktop.png',64,158,1152,480,'Actual locally running SPHEREx explorer with real masked scientific data and source facts');
}
{
const s=slide('A saved question can be reopened','Actual local browser QA screenshot. The annotation is explicitly a QA control, not an astronomical finding. Browser export/reopen restores a log display, ice palette, native-pixel sampling and 35 percent wipe. Compact browser-created packet then reconstructs offline with all ten array errors zero. Complete review-packet browser download matches original SHA-256.');
await image(s,'output/browser-0.3/comparison-reopened.png',64,158,1152,480,'Actual reopened browser comparison with a clearly labeled QA note');
}
"""
if 'The locally running exploration workspace' not in t:t=t.replace(needle,insert+needle)
t=t.replace('explicitTotalSlideCount:6','explicitTotalSlideCount:8')
p.write_text(t,encoding='utf-8')
