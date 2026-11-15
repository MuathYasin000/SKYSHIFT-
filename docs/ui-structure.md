# Observations and Compare UI structure

The two routes share the same viewer layout and controls in [Compare](../web/src/compare.html) and [Observations](../web/src/explore.html). Their page stylesheet is [observations-compare.css](../web/src/observations-compare.css).

| Area | Components |
| --- | --- |
| `viewer` | `#viewer-column` holds the target, Frame A/B pickers, Find, and Share. Inside it, `controls` holds modes and zoom, `stage` holds the sky canvases, and `timeline` holds playback, speed, scrubber, and filmstrip. |
| `tools` | `#tools-tabs` stays above `#tools-scroll`. Details opens first. Image contains display and combine controls. Overlays contains catalog toggles and sky context. Spectrum samples the selected point. |
| Below `#workbench` | Search status, reading guide, filtered observation list, frame range, and credits follow in page order. |
| Dialogs | `#search` holds target and coordinate selection. `#frame-picker-dialog` lists thumbnails and exposure labels. `#sky-background` holds the DSS composite, opacity, and credits. Observations keeps its direct link into the Compare DSS view. |

At 1100 px and wider, the centered workbench fills the viewport below the header. The right column scrolls independently. At smaller widths the viewer and tools follow each other in the page. Short desktop windows use compact, horizontal filmstrip tiles to leave room for the image.

**Tokens.** The stylesheet aliases the site’s black, surface, text, hairline, and blue accent tokens. Workbench cards and controls use 12 px and 8 px corners, with 44 px interactive rows. Use Inter for prose and status and IBM Plex Mono for numeric readouts.

**Behavior.** [observations-tools.js](../web/src/observations-tools.js) handles tab focus and selection. [observations-compare.js](../web/src/observations-compare.js) connects the controls to the shared viewer. [observations-sky-background.js](../web/src/observations-sky-background.js) configures Aladin Lite and the modal’s loading states.
