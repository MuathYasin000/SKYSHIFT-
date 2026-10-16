# Using SKYSHIFT

Local release 0.3: double-click `start_skyshift.bat` and open http://localhost:3000. Keep its server window open. Stop with Ctrl+C or `stop_skyshift.bat`; restart with the startup script. Prepared viewing needs Python 3.11+ and a modern browser, without external hosting or internet.

Start at **Explore the sky**. Choose M101, M67 outskirts or NGC 188. Larger contexts are individual exposures with exact dates and source facts. M67/NGC 188 have no temporal comparison because tested wider pairs failed the wavelength screen. M101 links to a smaller provisional comparison. **Discover SPHEREx** explains the mission; **Methodology** contains the provenance audit and image credits.

Choose Asinh to reveal faint intensity, Linear for a proportional scale, or Log for normalized display intensity. Ember/Ice are single-band false colors. Smooth interpolation changes display only; prepared pixels expose the actual grid. Both comparison dates share the transform. A wipe overlay and focused-canvas arrow-key pan supplement the original controls.

Single-exposure export produces JSON. Compare exports ZIP with separately hashed visualization settings. Reopen the ZIP in Compare to restore notes, viewport, palette, stretch, sampling and wipe. Export notes before closing a tab. Files under `output/browser-0.3` contain explicitly labeled QA controls, not discoveries.

Check the scientific-review banner first. This release contains real M101 observations and remains PENDING. Visual differences may reflect wavelength, response, background, alignment, blending or artifacts.

Captions show UTC observation dates and local wavelengths/bandwidths. Move over an image to inspect ICRS coordinates and per-pixel spectral context. The blue-gray mask is unsupported data. Both observations share orientation, viewport and intensity scale.

Drag either view to pan, use scroll/buttons to zoom, and Reset to restore the full field. Side-by-side and A/B switching preserve the same geometry. Keys 1/2 select epochs, +/- zoom, R resets, M toggles marking, and Escape stops blinking/marking. Coordinates can always be entered by keyboard. Optional slow blinking starts only on request and is disabled by reduced-motion preference.

Choose Mark a location or Add by coordinates. Record a question without asserting its cause. Edit, delete or locate notes in the notebook. Notes remain in this browser tab; export before closing or moving devices. A separate tab has a separate note session.

Export comparison saves scientific products/references, notes, settings, preview, diagnostics, citations and hashes. Reopen restores a compatible packet after validation. Altered scientific metadata, corrupted files, unsupported data and out-of-support annotations are rejected. Imported notes are not uploaded.

Download the separate complete review packet for original native/calibration bytes. Python reconstruction can use that snapshot without archive access. See reproducibility.md.

If loading/export fails, keep the tab open, inspect the message and retry when network access returns. A failure is never an empty-sky result. If upstream data changed, use the original full packet. JavaScript is required for viewer/file validation.

The Evidence section explains each screen, reference residuals, response restrictions and original sources. Arbitrary-field browser search, quantitative motion, calibrated brightness differences and discoveries are outside this release's validated scope.
