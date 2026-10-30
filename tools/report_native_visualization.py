"""Verify independent pixel references and assemble the milestone evidence."""
from pathlib import Path
import base64
import hashlib
import json
import subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence/scientific-visualization-20261030'
BROWSER=OUT/'verified-browser'

def build():
    if any((OUT/name).exists() for name in ['REPORT.md','reference-results.json','side-by-side.png','preserved-science.json']):
        raise FileExistsError('Historical native evidence already exists. This preserved one-off milestone assembler must not overwrite it; use a fresh verification directory with the current verifiers.')
    measurements=json.loads((OUT/'measurements.json').read_text())
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
    sheet=Image.new('RGB',(1710,1650),'#080b11');draw=ImageDraw.Draw(sheet)
    draw.text((20,15),'SKYSHIFT / EXACT ORIGINALS, INDEPENDENT DISPLAY AND OFFICIAL IRSA VIEWER',font=font,fill='white')
    draw.text((20,47),'Different stretches and masks are explicitly recorded. Optical DSS2 context is excluded from these comparisons.',font=small,fill='#c9d6e8')
    titles=['Original FITS / NumPy asinh (raw values)','SKYSHIFT / actual native rendered pixels','Official IRSA / same exact uploaded FITS']
    for c,title in enumerate(titles):draw.text((20+c*565,80),title,font=small,fill='white')
    results=[]
    for row,m in enumerate(measurements):
        name=m['id'];p=json.loads((ROOT/'web/dist/data/native'/(name+'.json')).read_text());h,w=p['shape']
        rgba=np.frombuffer((BROWSER/(name+'-browser.rgba')).read_bytes(),dtype='u1').reshape(h,w,4)
        expected=np.asarray(Image.open(OUT/(name+'-reference.png')))
        delta=np.abs(rgba[::-1,:,:3].astype(int)-expected.astype(int))
        result=dict(id=name,max_channel_error=int(delta.max()),mismatched_pixels=int(np.any(delta,axis=2).sum()),pixel_count=h*w)
        assert result['max_channel_error']==0,result
        results.append(result)
        a=p['arrays']['SCI'];science=np.frombuffer(base64.b64decode(a['data']),dtype=a['dtype']).reshape(h,w)
        d=p['diagnostics']['display']['percentile'];scaled=np.clip((np.nan_to_num(science.astype(float),nan=d['vmin'])-d['vmin'])/(d['vmax']-d['vmin']),0,1)
        gray=np.floor(255*np.arcsinh(scaled/.1)/np.arcsinh(10)+.5).astype('u1');raw=np.repeat(gray[...,None],3,axis=2);raw[~np.isfinite(science)]=[24,24,24]
        raw_image=Image.fromarray(raw[::-1]);raw_image.save(OUT/(name+'-raw-reference.png'))
        irsa=Image.open(OUT/(name+'-irsa.png')).convert('RGB').crop((0,150,1440,978))
        top=110+row*380
        draw.text((20,top),name+' / SHA-256 '+m['source_sha256'][:16]+'…',font=font,fill='white')
        for col,im in enumerate([raw_image,Image.fromarray(rgba[::-1,:,:3]),irsa]):
            ratio=min(540/im.width,300/im.height)
            im=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.NEAREST)
            sheet.paste(im,(20+col*565+(540-im.width)//2,top+32+(300-im.height)//2))
        draw.text((20,top+338),'Raw flagged values shown for diagnosis only.',font=small,fill='#c6d1e2')
        draw.text((585,top+338),'Purple = excluded; no measurement filled in.',font=small,fill='#c6d1e2')
        draw.text((1150,top+338),'Zscale Asinh preset; Q=0; inverse grayscale.',font=small,fill='#c6d1e2')
    sheet.save(OUT/'side-by-side.png')
    (OUT/'reference-results.json').write_text(json.dumps(results,indent=2)+'\n')
    # Cover all pre-existing science files, excluding only the generated UI receipt.
    immutable=[]
    listing=subprocess.check_output(['git','ls-tree','-r','HEAD','web/dist/data'],cwd=ROOT,text=True)
    for row in listing.splitlines():
        metadata,name=row.split('\t')
        if name=='web/dist/data/release-integrity.json':continue
        actual=subprocess.check_output(['git','hash-object','--no-filters',name],cwd=ROOT,text=True).strip()
        if actual!=metadata.split()[2]:raise ValueError('Pre-existing scientific asset changed: '+name)
        immutable.append(dict(path=name,git_blob=actual,sha256=hashlib.sha256((ROOT/name).read_bytes()).hexdigest()))
    (OUT/'preserved-science.json').write_text(json.dumps(dict(status='pass',count=len(immutable),scope='Every tracked web/dist/data file in HEAD except generated release-integrity.json',files=immutable),indent=2)+'\n')
    rows=[];limits=[];masks=[]
    for m in measurements:
        d=m['native'];h,w=d['shape'];extent=d['coverage']['projected_extent_arcmin'];short=m['id'].replace('m101-','M101 / ').replace('r-draconis-','R Dra / ')
        rows.append(f"| {short} | {w} × {h} | {extent[0]:.3f} × {extent[1]:.3f} | {d['valid_percentage']:.4f}% | {d['valid_science']['variance']:.7g} | {d['native_measurement_variance']['median']:.7g} | {d['background']['value']:.7g} | {m['native_pixel_count_ratio']:.2f}× |")
        l=d['display'];limits.append(f"| {short} | {l['percentile']['vmin']:.7g}, {l['percentile']['vmax']:.7g} | {l['zscale']['vmin']:.7g}, {l['zscale']['vmax']:.7g} |")
        c=d['categories'];f=d['flag_counts'];masks.append(f"| {short} | {c['quality_excluded']} | {c['nonfinite_without_missing_flag']} | {c['missing_data']} | {f['NONFUNC']} | {f['COLD']} | {f['OVERFLOW']} | {f['SUR_ERROR']} |")
    text='''# SKYSHIFT scientific visualization milestone — 30 October 2026

Implemented locally at [Native observation viewer](http://localhost:3000/native.html), linked from the existing observation console as **Native pixels & sky context**. Four exact originals are installed: the two M101 review observations and the two R Draconis temporal observations. Other original hashes are explicitly unavailable; the viewer never substitutes another observation.

The new surface is a read-only native display adapter, independent of the 24 × 24 comparison grid. It does not duplicate or bypass the temporal screening engine. Native IMAGE, FLAGS and VARIANCE match the original FITS arrays exactly. Original files, preparation arrays, masks, wavelength/registration thresholds, rejection evidence and approvals are preserved. Acquisition timestamps are copied from the original preparation receipts; rereading a cache is not reported as a new retrieval.

## Side-by-side evidence

![Original FITS, actual SKYSHIFT native pixels, official IRSA viewer](side-by-side.png)

Left: independent NumPy display of original unresampled IMAGE, including finite flagged values for diagnosis. Center: actual browser pixel output, with conservative exclusions shown in purple. Right: screenshots of the official IRSA Viewer after uploading the same hash-checked FITS files. Panels are sized for the report using nearest sampling; this adds no detail. These panels deliberately record their different stretches and masks; they are not a calibrated brightness or temporal comparison. Full official screenshots and their stretch dialogs are retained beside this report.

## Measured native properties

Dimensions are width × height. Sky extents are detector-axis tangent-plane extents, not a north-up rectangle; exact ICRS corners and pixel scales are in [measurements.json](measurements.json). Variances use population `ddof=0`. IMAGE spatial variance and median native measurement VARIANCE are different quantities, both in (MJy/sr)². Background is the median of all valid native pixels in MJy/sr, including sources and diffuse emission; no fitted sky or background subtraction is claimed.

| Observation | Native dimensions | Sky extent (arcmin) | Valid | Spatial IMAGE variance | Median VARIANCE | Background median | Native pixels / 24² grid |
|---|---:|---:|---:|---:|---:|---:|---:|
'''+ '\n'.join(rows)+'''

All four old comparison frames are 24 × 24, a 2.4′ requested square at 6.15″ per prepared pixel. The new viewer exposes 20,416–30,976 original samples per exposure, versus 576 prepared samples. This is 35.44–53.78 times the sample count and a larger field, **not improved instrumental resolution or a scientific increase in valid coverage**. M101 and R Dra native and prepared valid fractions refer to different footprints and masks and must not be compared as an improvement in data quality.

In the recorded desktop layout, prepared pixels occupied about 23.32 CSS pixels per pixel. Native fit views occupied 3.63–5.50 CSS pixels per original pixel; 1:1 is also available. The screenshots have 1440 × 1080 (before) and 1440 × 1100 (after) viewports, so the fitted CSS values are layout measurements, not an instrument or performance metric.

Native histograms contain 64 equal-width bins, separately computed for all finite IMAGE values and valid IMAGE values. Complete edges and counts, finite count, min/max, mean/median, variance, ZODI statistics, flags and valid percentages are stored in [measurements.json](measurements.json). The viewer plots valid values with log(1 + count) vertical scaling. Source diagnostic histograms are preserved as `*-histogram.png`.

## Apparent dead pixels

| Observation | Quality excluded | Nonfinite IMAGE, without MISSING_DATA | MISSING_DATA | NONFUNC flag | COLD flag | OVERFLOW flag | SUR_ERROR flag |
|---|---:|---:|---:|---:|---:|---:|---:|
'''+ '\n'.join(masks)+'''

The first three columns are disjoint categories; flag columns overlap. The SOURCE bit is retained by the existing policy. Nonfinite VARIANCE, nonpositive VARIANCE, other declared flags and unknown bits remain excluded.

- **Masked data:** purple pixels correspond to actual conservative exclusions. The original IRSA IMAGE view shows raw finite values without SKYSHIFT's mask, which explains why its appearance differs.
- **Detector-quality flags:** some samples genuinely carry NONFUNC or COLD. This supports identifying them as flagged detector-quality problems, but does not establish a new physical detector diagnosis. OUTLIER and TRANSIENT are also frequent; flags are evidence of pipeline classifications, not a new astrophysical detection.
- **R Draconis core:** the separately preserved target assessment finds the propagated catalogue center unusable in both epochs, with OVERFLOW, SUR_ERROR and SOURCE. The nearest native pixels are approximately (87,87) in each original. Neither stretch changes nor interpolation can recover a valid target flux. No calibrated variability or motion is established.
- **Missing coverage:** no MISSING_DATA flags occur inside these four native arrays. Some requested 18′ cutouts are clipped by detector boundaries, giving rectangular arrays. Outside each actual footprint there is no native measurement; the outline in the optical context makes this visible. Such absent coverage is different from a flagged pixel inside an array.
- **Enlargement and reprojection:** the old 24² view greatly magnifies prepared pixels. Bilinear common-grid support also excludes any output sample with an invalid contributor. That conservative support loss is a processing decision, not evidence of additional dead detector elements.
- **Noise and rendering:** isolated finite, unflagged bright/dark samples cannot be classified as noise, source structure or unflagged artifacts from appearance alone. The new display has zero pixel differences against the independent reference, so no discrepancy was found in the tested native rendering path. This does not prove that the input images are artifact-free.

## Display parameters

| Observation | New native percentile limits, 1–99.5% (MJy/sr) | New native zscale limits (MJy/sr) |
|---|---:|---:|
'''+ '\n'.join(limits)+'''

New defaults: `asinh(clip((v−lo)/(hi−lo),0,1)/a) / asinh(1/a)`, a=0.1, contrast=1, grayscale, nearest sampling. Zscale uses Astropy `ZScaleInterval(n_samples=1000, contrast=0.25)` on valid native IMAGE. The contrast control contracts/expands the chosen interval symmetrically about its midpoint. Linear and normalized log(1+100x) alternatives are available. Ember and ice are explicitly false-color single-band mappings. Both purple and neutral mask modes exclude the same pixels. No smoothing, AI upscaling, sharpening, inpainting or synthesized stars are used. Display receipts include source and array hashes, exact effective limits, controls, viewport and diagnostics.

Native autoscaling is **per exposure** and is never evidence of brightness change. The existing comparison retains its common display policy. Original M101 comparison limits were [0.879079712, 8.819869909], asinh a=0.1; R Dra's shared baseline limits are in `measurements.json` and `before.json`.

Official IRSA captures: selected **Z Scale Asinh Stretch**; the actual dialog reports Q=0 (the linear limit of that family), zscale checked, contrast 25%, 600 samples and 120 samples per line, inverse grayscale. IRSA and SKYSHIFT have different sample/mask policies and parameterizations. No identical-display or photometric-equivalence claim is made. [irsa-results.json](irsa-results.json) records dialog values for every exact original; `*-irsa-stretch.png` records the visible controls.

## Wider sky context and provenance

The 1° reference is genuine **DSS2 optical color**, served by IRSA from CDS HiPS; it is not a SPHEREx mosaic. Credit: Digitized Sky Survey, STScI/NASA; colored and HEALPix tiled by CDS (CNRS/Unistra). Survey-wide photographic coverage is 1975–1999; an individual plate date is not inferred. Original properties, full acknowledgement, tile URLs, raw tile hashes, output hash, TAN WCS and processing method are stored under `web/dist/data/native/*-reference.json` and `dss-properties.txt`.

The bounded extraction used 13 M101 and 12 R Dra order-7 tiles, nearest HEALPix sampling to a 720² TAN grid. Visual QA caught a HiPS JPEG coordinate-convention error during implementation; the corrected mapping is row=local HEALPix x, column=local HEALPix y, followed by the TAN image y flip for north up. Final context images show continuous sky structure and correctly centered M101. This reprojection applies only to decorative/context imagery; native scientific arrays remain untouched.

Gold outlines are approximate native cutout footprints; cyan squares are the restricted 2.4′ field. Optical context is labeled separately, cannot enter playback or comparison, and is not described as a later/earlier SPHEREx observation.

## Verification and before/after screenshots

- Python suite: **173 passed, 1 skipped**; [full output](pytest-final.txt). All three new native tests also passed after the final provenance timestamp correction.
- JavaScript suite: **152 passed**; [full output](node-tests.txt). The native invariance test covers 432 display combinations, maintaining excluded pixels and original arrays. Native payloads are rejected as temporal sequences.
- Independent reference: **99,792 native pixels, zero differing RGB channels**, all four observations; [results](reference-results.json). This compares source-sized rendered buffers, independent of browser scaling.
- Browser checks: all four desktop originals, both fields at 390 px, pixel zoom, every control category, display receipt exports, local reference checks, injected archive outage, payload tamper refusal and no horizontal overflow; [final results](verified-browser/browser-results.json). Repeated unchanged canvas screenshots are byte-identical.
- Existing temporal regressions: **3 passed**, including desktop/mobile no-WebGL recovery, real epoch switching, wipe, export/reopen and date/wavelength request propagation; [results](temporal-regression/results.json).
- Official IRSA: **4 exact-original renders captured**, one per observation; [results](irsa-results.json).
- Pre-existing science assets: every tracked data file in HEAD except the generated UI integrity receipt is unchanged; [hash inventory](preserved-science.json). The existing historical 21-file scientific snapshot preservation test also passes.

| Field | Before: restricted comparison | After: independent native viewer |
|---|---|---|
| M101 | [Before screenshot](before-m101.png) | [After screenshot](verified-browser/after-m101-2025W49_2A_0756_3-1440.png) |
| R Draconis | [Before screenshot](before-r-draconis.png) | [After screenshot](verified-browser/after-r-draconis-2025W49_1A_0009_3-1440.png) |
| R Draconis mobile | — | [390 px screenshot](verified-browser/after-r-draconis-2025W49_1A_0009_3-390.png) |

Reproduction: `.venv/Scripts/python tools/build_native_observations.py`, `.venv/Scripts/python tools/build_sky_reference.py`, `.venv/Scripts/python tools/build_frontend.py`; then `node tools/verify_native_display.mjs` (fresh evidence output directory), `node tools/verify_irsa_native.mjs` (network/official service required), and `.venv/Scripts/python tools/report_native_visualization.py` for this recorded milestone directory. The Python/Node tests do not require live archive access. This was a local implementation; no production deployment occurred.

Qualified scientific approval and internal human review remain **PENDING**. Human UX evaluation was not conducted. No physical change, super-resolution or new astronomical detail is claimed.
'''
    (OUT/'REPORT.md').write_text(text,encoding='utf-8')
    print(json.dumps(dict(reference_pixels=sum(x['pixel_count'] for x in results),max_channel_error=0,preserved_files=len(immutable),report=str(OUT/'REPORT.md'))))

if __name__=='__main__':build()
