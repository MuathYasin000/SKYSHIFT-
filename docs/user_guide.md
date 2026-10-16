# Using SKYSHIFT

Local release 0.4: double-click `start_skyshift.bat` and open http://localhost:3000. Keep its server window open. Stop with Ctrl+C or `stop_skyshift.bat`; restart with the startup script. Prepared viewing needs Python 3.11+ and a modern browser, without external hosting or internet.

Start at **Explore**. Choose the Pinwheel Galaxy (M101), the M67 outskirts or the NGC 188 region. Each card says what is available; the image has a short object story and something to look for. All larger views are individual exposures. Choosing another available date still displays one exposure at a time. M67/NGC 188 have no temporal comparison because tested pairs failed the wavelength screen. M101 links to a smaller, limited comparison with scientific approval PENDING. **Discover SPHEREx** explains the mission; **Methodology** contains the provenance audit and image credits.

Use **What am I seeing?**, **Why are there gaps?** or the comparison's contextual questions for short explanations. **Data & original sources** opens the original observation references and a simple processing chain. Exact hashes and technical records are available inside the panel when needed. Close it with its button or Escape.

Begin with the default image. Optional controls sit under **Image appearance**. Asinh reveals faint intensity, Linear uses a proportional scale, and Log shows normalized display intensity. Ember/Ice are single-band false colors. Smooth interpolation changes display only; prepared pixels expose the actual grid. Both comparison dates share the transform. **More ways to compare** contains the wipe overlay and optional blinking.

Single-exposure export produces JSON. Compare's **Save comparison (.zip)** preserves notes and viewing settings. **Open a saved comparison** restores notes, viewport, palette, stretch, sampling and wipe after integrity validation. Download before closing a tab. Files under `output/browser-0.4` and the walkthrough contain explicitly labeled automated examples, not discoveries.

Check the scientific-review banner first. This release contains real M101 observations and remains PENDING. Visual differences may reflect wavelength, response, background, alignment, blending or artifacts.

Captions show UTC observation dates and local wavelengths/bandwidths. Move over an image to inspect ICRS coordinates and per-pixel spectral context. The blue-gray mask is unsupported data. Both observations share orientation, viewport and intensity scale.

Drag either view to pan, use scroll/buttons to zoom, and Reset to restore the full field. Side-by-side and A/B switching preserve the same geometry. Keys 1/2 select epochs, +/- zoom, R resets, M toggles marking, and Escape stops blinking/marking. Coordinates can always be entered by keyboard. Optional slow blinking starts only on request and is disabled by reduced-motion preference.

Choose **Add a note**, then click a usable location in either image. Write a question without asserting its cause; the sky coordinates are attached automatically. Use **Enter a sky position instead** if you already know the coordinates. Edit, delete or locate notes in the notebook. Notes remain in this browser tab; export before closing or moving devices. A separate tab has a separate note session.

Export comparison saves scientific products/references, notes, settings, preview, diagnostics, citations and hashes. Reopen restores a compatible packet after validation. Altered scientific metadata, corrupted files, unsupported data and out-of-support annotations are rejected. Imported notes are not uploaded.

Download the separate complete review packet for original native/calibration bytes. Python reconstruction can use that snapshot without archive access. See reproducibility.md.

If loading/export fails, keep the tab open, inspect the message, verify the local server is running and retry. Internet is not required for curated local viewing or browser exports. A checksum failure indicates damaged or mismatched local files; restore a verified release instead of ignoring it. A failure is never an empty-sky result. If upstream originals changed during scientific reconstruction, use the original full packet. JavaScript is required for viewer/file validation.

The Evidence section explains each screen, reference residuals, response restrictions and original sources. Arbitrary-field browser search, quantitative motion, calibrated brightness differences and discoveries are outside this release's validated scope.
