# SKYSHIFT — Explore real SPHEREx observations over time

[Public submission repository](https://github.com/MuathYasin000/SKYSHIFT_Project_Mercury)

[Paste-ready portal fields](project_page_fields.md) · [Demo and screenshots](demo_final.md) · [Third-party notices](third_party.md)

## Summary

SKYSHIFT lets visitors look up a place in the sky and explore NASA’s infrared observations in date order. Start with one of five challenge targets or enter right ascension and declination. Browse real cutout thumbnails, blink through dates, compare frames side by side or with a wipe, and view a signed difference on mutually usable pixels. Each frame shows its date, detector, wavelength, and archive source. The five targets open from bundled 8′ previews and can request additional observations from NASA/IPAC IRSA. The viewer shows when wavelength, release, or pixel coverage differs between frames.

## Try it in three steps

1. Open **Observations** and enter RA and Dec or choose a challenge target.
2. Read the dates, detectors, and wavelengths. Choose a thumbnail or select **Play** to blink through single frames.
3. Choose Frame A and Frame B in **Compare** and select **Side by side** or **Wipe**. Use **Share view** to copy the selection.

[Open SKYSHIFT](https://skyshift-j22s.onrender.com/) and choose a challenge target to open its bundled 8′ preview.

- [Barnard’s Star](https://skyshift-j22s.onrender.com/compare.html?target=barnards-star)
- [Epsilon Indi B](https://skyshift-j22s.onrender.com/compare.html?target=epsilon-indi-b)
- [WISE 0855-0714](https://skyshift-j22s.onrender.com/compare.html?target=wise-0855)
- [RW Aurigae](https://skyshift-j22s.onrender.com/compare.html?target=rw-aurigae)
- [R Draconis](https://skyshift-j22s.onrender.com/compare.html?target=r-draconis)

## Data and credits

- **SPHEREx DR1 and QR3 Level 2 spectral images** from the NASA/IPAC Infrared Science Archive, operated by Caltech with NASA funding. SPHEREx is a NASA-funded JPL and Caltech project. Cite Bock et al. (2026), *ApJ*, 999, 139, and Akeson et al. (2026), *ApJS*, 285, 67. [SPHEREx mission and citation records](https://irsa.ipac.caltech.edu/Missions/spherex.html) · [Archive release documentation](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-releases/)
- **Astrometry and optional Gaia overlay.** Challenge coordinates and proper motions use SIMBAD at CDS (Wenger et al. 2000, *A&AS*, 143, 9). The optional Gaia DR3 reference uses ESA Gaia data processed by DPAC, with national funding for DPAC, and served by MAST. Cite Gaia Collaboration, Vallenari et al. (2023), *A&A*, 674, A1. [ESA credit and citations](https://gea.esac.esa.int/archive/documentation/GDR3/Miscellaneous/sec_credit_and_citation_instructions/) · [MAST Gaia](https://archive.stsci.edu/missions-and-data/gaia)
- **Optional AllWISE overlay.** Cutri et al. (2013), *AllWISE Data Release*, from the NASA-funded UCLA and JPL/Caltech WISE mission (Wright et al. 2010, *AJ*, 140, 1868), via CDS VizieR catalogue II/328. [AllWISE release](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/index.html)
- **Optional DSS Color.** The Digitized Sky Survey uses original photographic surveys digitized by STScI. The color HiPS tiles are from CDS via the MAST mirror, displayed with CDS Aladin Lite. Cite Boch and Fernique (2014), *ASP Conference Series*, 485, 277. Aladin Lite retains its logo and link. [DSS data use](https://archive.stsci.edu/publishing/data-use) · [Aladin Lite source](https://github.com/cds-astro/aladin-lite)
- **Related archive link.** [Canadian Astronomy Data Centre](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/)

- **Flipbook interaction inspiration.** WiseView from the Backyard Worlds team. [WiseView project and citation](https://github.com/backyardworlds/wiseview)

## Limitations

The viewer claims no detection or measured motion. Different wavelengths, processing, coverage, and masking can change how an object looks. Gap fill is cosmetic and can be toggled off. The bundled cache covers only part of the archive. Live archive search depends on IRSA availability. The bundled previews work independently of the archive.

## Project history

A working SKYSHIFT app and review workflow existed before the event. The owner reports organizer permission to reuse earlier work. Some of that implementation predates the first Git commit, which already contains an application. Git does not show when that earlier work began. The November 14 snapshot preserved the earlier site, and the November 15 commits document the challenge-target Observations and Compare work.

Selected lines from `git log --format="%h %ad %s" --date=short`:

```text
cf51c7e 2026-11-15 Build a shared SPHEREx observation workbench
4bb5ee5 2026-11-15 Restore first-visit arrival and gesture-enabled sound
0880ef4 2026-11-15 Start Blink with single frames and clarify comparison controls
7d75bb9 2026-11-15 Bundle date-spread real eight-arcminute cutouts for all challenge targets
aff0972 2026-11-15 Spread SPHEREx previews across dates and default to usable same-detector pairs
2fbe373 2026-11-15 Make the observation viewer and comparison controls easy to find
560b797 2026-11-15 Page live IRSA discovery and clarify preset cache coverage
0470190 2026-11-15 Repair SPHEREx Observations and Compare in place
a38e929 2026-11-14 Preserve complete pre-cleanup project state
ce53450 2026-10-16 Implement traceable SKYSHIFT review workflow and public release
```

## AI assistance

OpenAI Codex assisted software implementation, archive integration, tests, documentation, illustrative spacecraft geometry and interface cue code. Anthropic Claude assisted project review and written instructions for the coding agent. The observation images are SPHEREx archive measurements. [Complete disclosure](../AI_DISCLOSURE.md).
