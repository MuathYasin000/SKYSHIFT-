"""Evidence-based 0.3 local release addendum; keeps historical materials intact."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Image,Table,TableStyle,PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/SKYSHIFT_Local_Release_0.3.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Sky','C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SkyBold','C:/Windows/Fonts/segoeuib.ttf'))
S={'body':ParagraphStyle('body',fontName='Sky',fontSize=10.5,leading=16,spaceAfter=11,textColor=colors.HexColor('#24344d')),
   'title':ParagraphStyle('title',fontName='SkyBold',fontSize=34,leading=40,spaceAfter=20,textColor=colors.HexColor('#102442')),
   'heading':ParagraphStyle('heading',fontName='SkyBold',fontSize=22,leading=28,spaceAfter=18,textColor=colors.HexColor('#16375f')),
   'small':ParagraphStyle('small',fontName='Sky',fontSize=8.4,leading=12,spaceAfter=8,textColor=colors.HexColor('#465b79'))}
story=[]
def p(t,style='body'):story.append(Paragraph(t,S[style]))
def photo(file,width=480):
    path=ROOT/file
    with PILImage.open(path) as im:w,h=im.size
    story.append(Image(str(path),width=width,height=width*h/w));story.append(Spacer(1,12))
def page():story.append(PageBreak())
def table(rows,widths):
    data=[[Paragraph(escape(str(v)),S['small']) for v in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e3eaf5')),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#bbc8d9')),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]));story.append(t);story.append(Spacer(1,15))
def footer(c,d):
    c.setStrokeColor(colors.HexColor('#b0bfd4'));c.line(48,43,A4[0]-48,43);c.setFont('Sky',8);c.setFillColor(colors.HexColor('#526987'));c.drawString(48,28,'SKYSHIFT 0.3 / Project Mercury Team / 16 October 2026');c.drawRightString(A4[0]-48,28,str(d.page))

p('SKYSHIFT','title');p('Independent local exploration release','heading')
p('Release 0.3 adds an editorial exploration experience around the unchanged, reproducible scientific snapshot 0.2.0. It runs directly from D:/Nasa_SKYSHIFT with ordinary Python static hosting at http://localhost:3000. No ChatGPT hosting account, credential or deployment service is required.')
photo('web/dist/assets/spherex-vela.jpg')
p('Official SPHEREx Vela Molecular Ridge infrared composite. NASA/JPL-Caltech. Published mission imagery for storytelling, separate from the scientific comparison data. Source: science.nasa.gov/photojournal/spherex-vela-molecular-ridge/','small')
p('<b>Scientific approval: PENDING. Internal human technical review: PENDING. Independent Chromium desktop/mobile browser checks: PASS.</b> Work’s integrated browser remains disabled. A separate, explicitly authorized local Playwright runner completed browser checks with a fresh profile. No participant study or scientific approval is asserted.')
p('This addendum supplements the previous scientific report and preserves its evidence history. The historical public 0.2 deployment remains unchanged. Local production is now the default.')
page()
p('The implemented experience','heading')
table([['Section','Actual implementation'],['Home','Official infrared hero, clear exploration entry, three-step introduction, authentic field previews and source path.'],['Explore','Three curated fields and four single-exposure contexts, exact dates, spectral information, masks, coordinates, source records, larger-context inspection and a coordinate schematic.'],['Compare','Restricted M101 pair, synchronized pan/zoom, side-by-side view, A/B switching, optional slow blinking, wipe overlay, common masks, coordinate notes and evidence packets.'],['Discover SPHEREx','Mission explanation, official all-sky composite, spacecraft concept labeled as illustration, wavelength and interpretation guidance.'],['Methodology','Inspectable end-to-end provenance audit, resolution explanation, engineering/scientific-review distinction, credits and reconstruction links.']],[105,375])
p('Display choices include linear, asinh and log of normalized display intensity, grayscale and labeled single-band false-color palettes, and smooth or nearest-pixel sampling. The scientific arrays remain unchanged. Masked pixels stay explicitly masked when displaying a smoothed image.')
p('The 0.3 browser export adds a hashed visualization.json extension. Browser reopening validates and restores its palette, stretch, interpolation and wipe settings. The original scientific manifest schema and Python reconstruction remain intact. Python reconstructs the arrays and core viewport; the browser applies the presentation extension.')
p('Offline functionality includes the supplied pages, mission images, curated scientific datasets, viewing controls, tab-local notes, evidence downloads and reopening. New archive acquisitions, live reference catalog queries and external source links require internet access.')
page()
p('Archive to browser authenticity','heading')
p('The independent audit re-downloaded both M101 native cutouts, full spectral calibration and ePSF calibration from their recorded NASA/IPAC endpoints. All four SHA-256 hashes matched the immutable review packet. A fresh archive inventory confirmed both detector-2 product URLs and exposure times. Rounded inventory/FITS time discrepancies were no larger than 0.0401 seconds.')
table([['Audit stage','Measured outcome'],['Original cutouts','Both original-source hashes match. Native image dimensions: A 176 x 116 and B 176 x 137 (width x height).'],['Calibration','CWAVE/CBAND and ePSF files match. Public calibration-to-pipeline UUID association remains unresolved for specialist assessment.'],['Preparation','Fresh source-based reprojection matches all ten prepared arrays and masks exactly.'],['Browser arrays','All ten decoded browser arrays match the prepared FITS and fresh preparation, including normalized numeric identity and raw little-endian bytes.'],['Historical deployment','Public bundle, pair.fits, all six review-packet chunks, assembled ZIP and manifest match the preserved 0.2 snapshot.'],['Reliability record','An earlier temporary IRSA HTTP503 is retained with its later successful exact-hash retry.']],[115,365])
p('Complete source URLs, full hashes, product IDs, timestamps, calibration metadata and per-array checks are in docs/evidence/provenance_audit_0.3.json and the Methodology page. Historical original download timestamps remain unknown where no original timestamp was recorded; audit retrieval times are identified separately. No replacement timestamp is fabricated.')
p('Additional M67 and NGC 188 contexts derive from native archived FITS with verified local sidecars, supported release headers, matching calibration, reproducible bilinear preparation and conservative masks. Their larger contexts remain single-exposure views. Their tested temporal pairs failed the wavelength criterion.')
page()
p('Scientific acceptance boundaries','heading')
p('The active detector calibration spans 2040 x 2040 pixels. Downloaded cutouts, a prepared common grid and browser display sampling describe different things. The M101 temporal grid is deliberately 24 x 24 at 6.15 arcseconds per pixel, covering 2.4 arcminutes. Larger 0.12-degree and 0.06-degree tests failed the unchanged spectral requirement. The selected 0.04-degree crop passes the provisional engineering screen with 94.44% common usable support.')
p('Every common pixel must have wavelength separation no greater than 0.25 of the smaller local bandwidth. The current maximum is 0.24662. This diagnostic does not prove equality of the full spectral response functions.')
p('Independent Gaia-based centroid measurements in the larger native context provide 13 references across four quadrants. Median inter-epoch residual is 0.311739 arcseconds and the 95th percentile is 2.007289 arcseconds. No corrective transform forced agreement. These measured residuals do not establish absolute astrometric precision, a motion-detection threshold or a discovery.')
p('The empirical median profile-width ratio B/A is 0.98262, with about 25% p95 absolute deviation. The estimated background offset is +0.01393 MJy/sr. PSF differences, diffuse emission, blending, interpolation covariance and possible unflagged artifacts limit interpretation. No PSF matching, background subtraction, calibrated significance map, confirmed variability or precision-motion claim is implemented.')
p('A real independent team member must reproduce the packet and document the internal technical review. A suitably qualified astronomical reviewer must assess full spectral compatibility for the intended qualitative comparison, calibration association, PSF/background effects and limits on scientific interpretation. Neither review is simulated or preapproved. Five novice usability sessions also remain open.')
p('The preserved v6 review packet contains originals, calibration, Gaia query and catalog, diagnostics, masks, processing source and dependency lock. It retains failures and rejected wider alternatives. Scientific approval remains PENDING until actual qualified assessment is documented.')
page()
p('Execution, verification and restoration','heading')
table([['Check','Result in this execution'],['Python suite','92 tests passed, including scientific/synthetic controls, provenance fault tests, HTTP hosting tests, context reconstruction and static interface contracts.'],['JavaScript suite','28 tests passed, including evidence tamper controls, display transforms, presentation schema and all curated context hashes.'],['Local HTTP evidence control','Fetched real bundle and FITS from localhost, verified hashes, created a labeled QA note, exported and reopened it with the actual packet parser. This is an automated integration control, not a browser test.'],['Offline numerical reconstruction','Reconstructed all ten arrays with maximum absolute error 0.0 using local original-source cache. One QA annotation and the core viewport verified.'],['Independent browser acceptance','17 local Chromium checks passed at widths 1440, 1024, 390 and 320 pixels. Actual annotation export/reopen, palette/wipe restoration, full-packet hash, reduced-motion behavior and fail-closed integrity controls verified. Screenshots inspected. Broader browser/device certification and novice sessions remain open.']],[115,365])
p('<b>Start:</b> double-click start_skyshift.bat. <b>Address:</b> http://localhost:3000. <b>Stop:</b> Ctrl+C in the server window or stop_skyshift.bat. <b>Restart:</b> run start_skyshift.bat again. The launcher uses the project virtual environment first, then installed Python. Python 3.11+ and a modern browser suffice for prepared-data viewing. Scientific reconstruction uses the pinned Python 3.12 environment.')
p('The standalone local-production snapshot copies the complete static application, production server, launchers, release identity and checksum inventory. Earlier releases are never overwritten. The host binds to loopback, checks Host headers, rejects traversal/hidden paths/uploads and serves local assets under a restrictive content policy. Stop the current server before starting another snapshot on the same port.')
p('Sources: official SPHEREx mission overview at science.nasa.gov/mission/spherex/; IRSA QR2 DOI 10.26131/IRSA652; Gaia DR3 DOI 10.1051/0004-6361/202243940; original archive/calibration URLs and image credits in the supplied audit and assets.json. SKYSHIFT is an independent Project Mercury Team project with no NASA endorsement.','small')
SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=45,bottomMargin=60,title='SKYSHIFT local release 0.3',author='Project Mercury Team').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
