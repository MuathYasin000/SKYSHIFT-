"""Render an evidence-based release report; original concept documents remain unchanged."""
from pathlib import Path
from xml.sax.saxutils import escape
import json
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Image,Table,TableStyle,PageBreak,KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

root=Path(__file__).resolve().parents[1];out=root/'output/pdf';out.mkdir(parents=True,exist_ok=True)
bundle=root/'data/prepared/m101-review-v6'
m=json.loads((bundle/'manifest.json').read_text(encoding='utf-8'));r=json.loads((bundle/'diagnostics/registration.json').read_text());response=json.loads((bundle/'diagnostics/response.json').read_text())
pdfmetrics.registerFont(TTFont('Sky','C:/Windows/Fonts/segoeui.ttf'));pdfmetrics.registerFont(TTFont('SkyBold','C:/Windows/Fonts/segoeuib.ttf'))
styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='BodySky',fontName='Sky',fontSize=10.3,leading=15,spaceAfter=10,textColor=colors.HexColor('#203643')))
styles.add(ParagraphStyle(name='HeadingSky',fontName='SkyBold',fontSize=19,leading=24,spaceAfter=15,textColor=colors.HexColor('#163E51')))
styles.add(ParagraphStyle(name='SmallSky',parent=styles['BodySky'],fontSize=8.2,leading=11.5,spaceAfter=6))
styles.add(ParagraphStyle(name='TitleSky',fontName='SkyBold',fontSize=35,leading=42,spaceAfter=12,textColor=colors.HexColor('#0D293A')))
styles.add(ParagraphStyle(name='AmberSky',parent=styles['BodySky'],fontName='SkyBold',textColor=colors.HexColor('#8E5E22'),fontSize=12,leading=17))
story=[]
def p(value,kind='BodySky'):story.append(Paragraph(value,styles[kind]))
def heading(value):p(value,'HeadingSky')
def fig(name,width=480):
    from PIL import Image as PILImage
    path=root/name
    with PILImage.open(path) as im:w,h=im.size
    story.append(Image(str(path),width=width,height=width*h/w));story.append(Spacer(1,10))
def table(rows,widths):
    data=[[Paragraph(escape(str(value)),styles['SmallSky']) for value in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E5EFEE')),('LINEBELOW',(0,0),(-1,0),.7,colors.HexColor('#6D9999')),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#D1DFE4'))]));story.append(t);story.append(Spacer(1,12))
def page():story.append(PageBreak())
def footer(canvas,doc):
    canvas.setStrokeColor(colors.HexColor('#B8CDD2'));canvas.line(48,43,A4[0]-48,43)
    canvas.setFont('Sky',8);canvas.setFillColor(colors.HexColor('#5E7783'));canvas.drawString(48,28,'SKYSHIFT 0.2.0 / Project Mercury Team / 16 October 2026')
    canvas.drawRightString(A4[0]-48,28,f'{doc.page}')

p('SKYSHIFT','TitleSky');p('Scientific methods and engineering release report','HeadingSky')
p('Release 0.2.0 | Real SPHEREx data | Independent student project','BodySky')
p('Scientific approval PENDING. Human internal technical review PENDING.','AmberSky')
p('This release provides a working public interface for traceable inspection of two real SPHEREx observations of a restricted M101 field. It preserves source/calibration identities, checks local spectral support, measures catalogue-anchored registration, prepares a reproducible common grid, and exports notes with exact comparison settings. It does not establish motion, brightness variability, a discovery, or final scientific defensibility.')
fig('output/screenshots/skyshift-production-desktop.png',480)
p('Public application: <link href="https://skyshift-project-mercury.surebream11.chatgpt.site">skyshift-project-mercury.surebream11.chatgpt.site</link>','SmallSky')
p('Project Mercury Team: Muath Yasin, Haitham Yasin, Mohammed Darawsheh, Abdallah Amer, Asem Abdallah, and Kareem Malhis. Names follow the original project report and do not constitute reviewer identities, signatures, or approvals.','SmallSky')
page()

heading('1. Scientific inputs and preparation')
p('The comparison contains two distinct QR2 detector-2 exposures, with observation times read from DATE-BEG/DATE-END and checked against MJD and the declared timescale. Processing dates are not substituted for observing dates. Both use the same supported pipeline version. The original cutouts and calibration bytes are embedded in the full review packet.')
rows=[['Property','Observation A','Observation B']]
for label,key in [('Observation ID','observation_id'),('UTC start','time_start_utc'),('Pipeline','pipeline_version'),('Center wavelength (um)','center_wavelength_um'),('Center bandwidth (um)','center_bandwidth_um')]:
    vals=[m['observations'][i][key] for i in (0,1)]
    rows.append([label,*[f'{v:.6f}' if isinstance(v,float) else v for v in vals]])
table(rows,[115,182,182])
p('Full CWAVE/CBAND spectral calibration is sampled in parent detector coordinates using the documented alternate-WCS offsets. The WCS-WAVE visualization lookup alone cannot pass the scientific spectral-calibration requirement. Named quality flags are read from each input. SOURCE alone is retained; every other declared flag is conservatively masked, as are nonfinite intensity/variance and nonpositive variance. Unknown active bits reject a pair.')
p('Bilinear reprojection produces a north-up ICRS TAN grid of 24 x 24 pixels at 6.15 arcsec/pixel. Every contributing interpolation sample must be valid. Common usable support is 94.44%. Unsupported SCI_A/B samples remain NaN, never artificial zeros. Ten arrays and a shared WCS are stored in prepared/pair.fits. Original backgrounds are retained; no PSF matching, deconvolution, calibrated difference map or resampled variance is asserted.')
p('The native variance arrays remain available in the originals. Reprojection induces covariance, so native variance cannot simply be interpreted as independent output-pixel significance. The nominal inspection width is 2.4 arcminutes; exact geometry is defined by WCS and masks.','SmallSky')
page()

heading('2. Independent reference registration')
p('Gaia DR3 positions are propagated to each observation using proper motion. The fixed selection rejects catalogue neighbors within 30 arcsec, proper motions above 100 mas/year and absolute parallax above 5 mas. In each native image, a weighted pixel-integrated axis-aligned Gaussian plus local background plane is fit with robust residuals. Fit support, SNR and profile cuts are explicit. No image-to-image correction is fitted to force alignment.')
table([['Declared registration-v2 criterion','Actual result'],['At least 6 references, at least 3 quadrants','13 references, 4 quadrants'],['Convex-hull fraction at least 0.10',f"{r['convex_hull_fraction']:.6f}"],['Median residual at most 0.25 pixel',f"{r['median_residual_pixels']:.6f} pixel / {r['median_residual_arcsec']:.5f} arcsec"],['p95 residual at most 0.50 pixel',f"{r['p95_residual_pixels']:.6f} pixel / {r['p95_residual_arcsec']:.5f} arcsec"]],[220,259])
fig('docs/evidence/registration_v2.png',480)
p('Scope correction: registration-v1 allowed three references beyond the declared 18-arcminute context because the rotated native cutout footprints extended farther. Registration-v2 explicitly requires membership in the declared context at both epochs. Thresholds are unchanged. Prior 16-reference results and the original failed two-reference result are preserved as superseded evidence. A regression test prevents this coverage inflation.','SmallSky')
p('These are empirical sample residuals, not formal uncertainty, absolute astrometric precision or a detection limit. The references surround a smaller extended-galaxy inspection field. Local distortions, blending, undersampling, source colors and selection bias still require specialist assessment. The retained largest residual is not removed.','SmallSky')
page()

heading('3. Spectral and response suitability')
p('At every common supported pixel, the spectral engineering diagnostic is abs(wavelength_A - wavelength_B) / min(bandwidth_A, bandwidth_B). The fixed threshold is 0.25; the restricted M101 field reaches approximately 0.24662. At least 50% common support is required. The 0.12-degree original field fails. Restricting the declared area does not establish equality of spectral response functions or comparable astrophysical morphology.')
fig('docs/evidence/prepared_pair_v2.png',480)
table([['Diagnostic','Measured value / implication'],['Median fitted profile-width ratio B/A',f"{response['empirical_profile_width_ratio_median_b_over_a']:.6f}"],['p95 absolute deviation from unity',f"{response['empirical_profile_width_ratio_p95_absolute_deviation']:.6f}; response differences remain"],['Local ePSF effective-area ratio B/A',f"{response['local_epsf_effective_area_ratio_b_over_a']:.6f}"],['Estimated native background B - A',f"{response['background_offset_mjy_sr']:+.6f} MJy/sr; diffuse emission may contaminate estimate"]],[205,274])
p('The official IRSA guide recommends newer ePSF models for QR2 as well as QR3. Nearest parent-detector zones provide descriptive diagnostics. Matching spectral-calibration UUIDs occur in both pipeline histories, but the public full calibration does not expose those same UUIDs. Its association remains a review question. Zodiacal models are inspected without subtraction. Quality masks cannot guarantee absence of unflagged artifacts or blending. Brightness variability and calibrated subtraction remain unsupported.','SmallSky')
p('Bounded alternatives: 45 M67-outskirts and 55 NGC188 pairings at width 0.12 degrees all fail the unchanged spectral policy. Acquisition and center-coverage errors are recorded. This does not establish that no suitable pair exists elsewhere in these fields or the archive.','SmallSky')
page()

heading('4. Working software and executed checks')
p('The browser consumes immutable prepared arrays and metadata; scientific processing remains in modular Python. Both views share viewport, orientation and linear/asinh limits. Visitors can pan/zoom, inspect side-by-side, switch A/B, optionally blink slowly, inspect local coordinates/wavelengths, and add/edit/delete/locate ICRS notes. Common-support validation prevents annotations on unsupported pixels. Reduced-motion preference disables blinking. Notes stay in the current tab until exported.')
table([['Executed check','Observed result'],['Python tests','61 passed; JUnit record preserved'],['JavaScript tests','23 passed; JUnit record preserved'],['Fresh Python 3.12 environment','Installed exact lock and packet reproduction source; preparation and Gaia summaries reproduce'],['All ten prepared arrays','Maximum numerical difference 0.0; masks and WCS agree'],['Production annotation reconstruction','One QA note verified inside common support; exact settings restored'],['Production compact export/reopen','Restored note after deletion; all evidence member hashes validated'],['Corrupted production packet','Explicit manifest checksum error; existing state retained'],['Production full review download','Matches original packet SHA-256 exactly'],['Desktop and narrow browser layouts','1265 x 720 and 314 x 655; no horizontal overflow'],['Two production tabs','One note versus zero; tab-local isolation'],['Public HTTP verification','HTML, catalogue, bundle and FITS load without credentials']],[175,304])
p('Synthetic controls cover known subpixel/large shifts, insufficient reference coverage, out-of-context references, masked centers, PSF broadening and background-only changes. Failure tests cover metadata/units/times, calibration, spectral incompatibility, corrupt files, unsafe ZIP names/sizes and forged approval claims. These fixtures are labeled software controls and are not discoveries or synthetic demonstrations presented as real observations.','SmallSky')
p('HTTP bundle transfers in the recorded run were approximately 0.07-0.085 seconds for 125 KB. These are unauthenticated transfer timings, not controlled cold-cache, paint, concurrent-load or user-study benchmarks. Browser network-interception/offline tests, broad device certification and five novice sessions are not claimed.','SmallSky')
page()

heading('5. Evidence, deployment and reconstruction')
p('The full packet contains 43 files: original native FITS, full spectral calibration and ePSF, Gaia query/catalogue, complete registration/response/spectral decisions and masks, original failed and superseded registration records, alternative pair tables, primary documentation snapshot, scientific source/lock, plots, review instructions and blank review record. Initial exact scientific retrieval timestamps were not recorded and remain unknown. Original bytes, URLs and hashes are preserved; filesystem dates are not represented as retrieval times.')
p('The compact comparison packet contains prepared FITS, preview, notes, exact display/viewport settings, diagnostics, citations and original source/calibration references. Missing large inputs may be downloaded from approved archive services or supplied through an extracted full-packet source cache. Changed upstream bytes stop reconstruction. Every archive member is hashed and bounded. Hashes are integrity records, not signatures or scientific endorsements.')
p('<b>Reproduce:</b> install the trusted reproduction package in a fresh environment, then run <font name="SkyBold">skyshift review m101-review-v6.zip --output new-review</font>. For a browser export, run <font name="SkyBold">skyshift reconstruct comparison.zip --source-cache new-review --output new-comparison</font>. Output directories must be new. Reconstruction never executes code supplied by an imported packet.')
table([['Release identity','Value'],['Prepared comparison',m['pair_id']],['Full packet','m101-review-v6.zip / 40,697,263 bytes'],['Packet SHA-256','2187c38e4e97e8c94999e0ac9794a69e9c357f04ead6298e56b877ed64e30d78'],['Published frontend source','6807f11336594c2182f8251246427f48b8c775f8'],['Sites saved version','3; public deployment succeeded'],['Scientific approval','PENDING'],['Human internal technical review','PENDING']],[160,319])
p('Float-array reconstruction tolerance is at most 1e-6 absolute/relative with matching missing-value support. Masks and WCS agree exactly. Registration-summary comparison uses 1e-9 absolute/relative tolerance. Current clean-environment results match. The prepared identity includes original/calibration hashes, region, scientific code and relevant numerical dependency versions. Old comparisons cannot silently load against changed scientific preparation.','SmallSky')
p('The static site needs no developer credentials, database or Python server at runtime. Source and deployment versions are preserved for restoration. Version 1 remains superseded audit history and must not be used as a scientific rollback target. No second production deployment solely for rollback simulation, custom domain or monitoring automation is claimed.','SmallSky')
page()

heading('6. Review handoff and remaining acceptance')
p('The finished software review workflow does not complete the project\'s scientific acceptance. An actual independent team member should reproduce the packet, inspect every reference rejection and retained high residual, exercise annotations/export/reconstruction, and document their engineering findings. Reviewer identity and findings remain blank until supplied. A team member is not assumed to be a qualified astronomer.')
p('A suitably qualified astronomical reviewer must assess: (1) whether the local spectral differences and 0.25 screen permit the restricted extended-galaxy comparison; (2) public calibration-to-pipeline association; (3) whether surrounding native Gaia fits constrain local registration adequately despite undersampling, blending and color effects; (4) whether PSF, backgrounds and artifacts permit the stated qualitative interpretation; and (5) which further data, tests, restrictions or uncertainty model are required. Unsuitable pairs must be rejected.')
p('Five novice usability sessions must still record task completion, assistance, misconceptions and resulting corrections. Broader browser/device checks require explicit evidence. No reviewer signatures, owner sign-offs, usability participants, precision claims or astronomical findings have been fabricated. Internal technical review and external scientific assessment remain separate.')
p('Implemented features are the curated real-data workflow described here. Synthetic scenes are test controls. Automatic discovery, quantitative variability, orbit fitting, arbitrary-field browser search, multi-user moderation and a long-term citizen-science platform are future development, with additional scientific requirements. There is no artificial event deadline in this acceptance process.')
heading('References and acknowledgements')
for line in [
 'SPHEREx QR2 data release. DOI: https://doi.org/10.26131/IRSA652',
 'IRSA, SPHEREx Data Products. https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/ (documentation snapshot preserved in packet).',
 'Gaia DR3 summary. DOI: https://doi.org/10.1051/0004-6361/202243940',
 'Project evidence: manifest.json; diagnostics/registration.json; diagnostics/response.json; diagnostics/screen.json; review.json; exact native files and calibration; clean reconstruction and production records in docs/evidence.']:
 p(escape(line),'SmallSky')
p('This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.','SmallSky')
p('This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC). This is an independent student project, not a NASA publication or endorsement.','SmallSky')

file=out/'SKYSHIFT_Release_Report_0.2_final.pdf'
SimpleDocTemplate(str(file),pagesize=A4,leftMargin=48,rightMargin=48,topMargin=48,bottomMargin=58,title='SKYSHIFT release 0.2 scientific methods and engineering evidence',author='Project Mercury Team').build(story,onFirstPage=footer,onLaterPages=footer)
print(file)
