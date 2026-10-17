# Using SKYSHIFT

Local workspace 0.7: double-click `start_skyshift.bat` and open http://localhost:3000. Keep the server window open; run the launcher again after restarting Windows. Stop with Ctrl+C or `stop_skyshift.bat`. Supplied viewing needs Python 3.11+ and a modern browser, without an account or internet.

Start with **Explore & Compare Observations**, or **Compare** in the navigation. Both open the existing restricted M101 comparison directly. **Observations** opens single exposures; use **Sky region** to select another field. Four fields are available, with five single-exposure contexts. Only M101 has an installed restricted two-date comparison. Other fields explain their limitations and omit comparison modes. Scientific approval remains PENDING.

Choose a field and a UTC observation date. Select an unmasked pixel to read its position, brightness, wavelength and bandwidth; blue gaps are excluded measurements. **Add a question** attaches your note to a usable ICRS coordinate. The **Questions** panel supports edit, locate and delete. **Appearance** changes display operations only; **Sources & suitability** explains provenance, masks and scientific restrictions.

The M101 comparison uses a much smaller registered common grid than the single-exposure view. Side-by-side views share coordinates, pan and zoom. **Wipe** supports a draggable divider or the keyboard-accessible **Divider position** slider; **A / B** uses the UTC timeline to switch epochs. Optional **Blink** alternates every 1.5 seconds and is disabled for reduced-motion preferences. Differences do not establish variability or motion. On small screens, **Tools** contains Sources, Appearance and Questions; the pixel inspection also offers **Add a question** directly.

**Save investigation** downloads an exposure JSON or comparison ZIP. **Reopen** validates the identity, settings, notes and hashes before accepting it. The comparison source panel also downloads the original full reproducible review packet. A JSON references the installed verified exposure; it is not a self-contained original FITS archive. A compact comparison ZIP references original FITS/calibrations and contains its prepared FITS and masks.

**Home** returns to the website. **3D Universe** is optional and loads only when selected; **← Website** returns immediately. Reopening **Compare** retains the same live scientific canvas, viewport and questions. No 3D controls are needed for scientific viewing. In **Discover SPHEREx**, **Open interactive model** activates a small illustrative spacecraft viewer with drag, zoom, keyboard controls and component descriptions. The homepage's NASA infrared composite is contextual, with a clickable wavelength legend; it is not the installed comparison.

Questions survive reloads in the same tab through validated session storage, but explicit saves are required for durable work after closing tabs. No private questions enter public localStorage history. **More** provides sources, licensing and direct no-WebGL recovery links. The complete supplied viewing application works offline; external NASA/archive links and new acquisitions need internet. Direct `explore.html` and `compare.html` remain independent recovery/research interfaces.

Published Hubble, Webb and SPHEREx image examples show different targets and epochs. They are not aligned comparisons or live feeds. Conceptual rays and colors are not optical ray tracing, exact pointing, instrument fields of view or measured spectra.

The solar system is schematic, with independently compressed sizes/distances and no live ephemeris. Curated deep-sky markers use ICRS directions on a sphere, without measured depth or a coverage claim. The starfield is decorative. Reusable NASA models are contextual; SPHEREx’s original component model is illustrative. **Assets & credits** links each model to its source/terms. Scientific pixels appear only inside the actual observation workspace, with their original masks and provenance.

Sound is off at each launch. **Sound off** enables original interface cues and gentle synthesized ambience only after your click. Adjust their volumes separately in **Settings**. Scientific inspection is silent; mission/action cues differ and reduced-motion settings suppress animated travel and photons. **Interaction effects & starfield** and a low rendering-quality preference are optional. A quality change applies on reload, after saving scientific work.

## Independent recovery interfaces

The following controls describe the retained `explore.html` and `compare.html` pages. Their labels differ from the primary 0.7 workspace, but they use the same trusted products and compatible export formats.

Choose the Pinwheel Galaxy (M101), the M67 outskirts, the NGC 188 region or the Orion Nebula. Each card says what is available; the image has a short object story and something to look for. All larger views are individual exposures. Choosing another available date still displays one exposure at a time. M67/NGC 188 have no temporal comparison because tested pairs failed the wavelength screen. Orion has one exposure and has not been screened for a time comparison. Its blue central gaps are excluded measurements, not nebular structure. M101 links to a smaller, limited comparison with scientific approval PENDING.

The interactive sky locator shows actual ICRS field centres on a coordinate grid, not a sky photo or measured coverage. Drag or use arrows to rotate, scroll/pinch to zoom, and select a marker or its equivalent field card. **Show all fields** resets the locator and search; **Sky locator** returns from an observation. Search covers only curated fields. Tap an observation or press Enter on its focused image to inspect a pixel; arrows move the view and report its centre, Home resets, and Escape closes the inspection. Two-finger zoom and touch panning have button/keyboard equivalents.

**Resume exploration** restores the last saved exposure and view from this device, including when returning from Compare. It stores public source references and viewing settings locally, without uploading notes or needing an account. JSON exports remain the portable record. If storage is blocked or old settings are incompatible, verified viewing and export still work. **Reload available fields** retries a catalogue failure without reloading the whole page.

To save a question in any Explore field, tap a usable pixel and select **Ask about this pixel**. **Your questions** supports Locate, Edit and Delete. Explore retains these in tab-local session storage across field selection, navigation and reload when storage is allowed. They stay off the server and out of automatic Resume history. Download **Save exposure view (.json)** for durable preservation. If storage is blocked, save before leaving. Reopening a JSON replaces that exposure’s question set after coordinate/mask validation.

Use **What am I seeing?**, **Why are there gaps?** or the comparison's contextual questions for short explanations. **Data & original sources** opens the original observation references and a simple processing chain. Exact hashes and technical records are available inside the panel when needed. Close it with its button or Escape.

Begin with the default image. Optional controls sit under **Image appearance**. Asinh reveals faint intensity, Linear uses a proportional scale, and Log shows normalized display intensity. Ember/Ice are single-band false colors. Smooth interpolation changes display only; prepared pixels expose the actual grid. Both comparison dates share the transform. **More ways to compare** contains the wipe overlay and optional blinking.

Single-exposure export produces JSON. Compare's **Save comparison (.zip)** preserves notes and viewing settings. **Open a saved comparison** restores notes, viewport, palette, stretch, sampling and wipe after integrity validation. Download before closing a tab. Files under `output/browser-0.4` and the walkthrough contain explicitly labeled automated examples, not discoveries.

In Explore, **Save exposure view (.json)** records the selected exposure, position, zoom, appearance and any questions. **Open a saved exposure view** restores it using the matching verified local product; invalid files leave your current view intact. Old 0.4 records work too. Selecting a date also updates the observation in the browser address so reload, bookmarks and Back/Forward return to that date; use the JSON record to preserve the full appearance and viewport.

Check the scientific-review banner first. This release contains real M101 observations and remains PENDING. Visual differences may reflect wavelength, response, background, alignment, blending or artifacts.

Captions show UTC observation dates and local wavelengths/bandwidths. Move over an image to inspect ICRS coordinates and per-pixel spectral context. The blue-gray mask is unsupported data. Both observations share orientation, viewport and intensity scale.

Drag either view to pan, use scroll/buttons to zoom, and Reset to restore the full field. Side-by-side and A/B switching preserve the same geometry. Keys 1/2 select epochs, +/- zoom, R resets, M toggles marking, and Escape stops blinking/marking. Coordinates can always be entered by keyboard. Optional slow blinking starts only on request and is disabled by reduced-motion preference.

Choose **Add a note**, then click a usable location in either image. Write a question without asserting its cause; the sky coordinates are attached automatically. Use **Enter a sky position instead** if you already know the coordinates. Edit, delete or locate notes in the notebook. Notes remain in this browser tab; export before closing or moving devices. A separate tab has a separate note session.

Export comparison saves scientific products/references, notes, settings, preview, diagnostics, citations and hashes. Reopen restores a compatible packet after validation. Altered scientific metadata, corrupted files, unsupported data and out-of-support annotations are rejected. Imported notes are not uploaded.

Download the separate complete review packet for original native/calibration bytes. Python reconstruction can use that snapshot without archive access. See reproducibility.md.

If loading/export fails, keep the tab open, inspect the message, verify the local server is running and retry. Internet is not required for curated local viewing or browser exports. A checksum failure indicates damaged or mismatched local files; restore a verified release instead of ignoring it. A failure is never an empty-sky result. If upstream originals changed during scientific reconstruction, use the original full packet. JavaScript is required for viewer/file validation.

The Evidence section explains each screen, reference residuals, response restrictions and original sources. Arbitrary-field browser search, quantitative motion, calibrated brightness differences and discoveries are outside this release's validated scope.
