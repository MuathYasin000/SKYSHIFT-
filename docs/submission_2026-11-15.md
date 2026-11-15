# SKYSHIFT — Explore real SPHEREx observations over time

## Summary

SKYSHIFT helps anyone explore how the infrared sky looks in real observations taken on different dates. Choose one of five challenge targets or enter sky coordinates to find SPHEREx frames. Browse them in time order, blink through the sequence, or wipe between any two images. Each frame identifies its date, detector, wavelength, and archive source. Mask labels and wavelength warnings help visitors interpret differences. The five challenge fields open with bundled observations, and visitors can request additional observations from NASA’s archive.

## Try it in three steps

1. Open **Observations**, choose a challenge target or enter right ascension and declination, and set the field size.
2. Inspect the dates, wavelengths, detector numbers, and cutout coverage in the results.
3. Open **Compare**. Use **Play** to blink through the sequence and **Wipe** to compare two selected frames.

## Data and credits

SPHEREx Level 2 spectral images from Data Release 1 and Quick Release 3 are served by the NASA/IPAC Infrared Science Archive. SPHEREx is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, funded by NASA. Challenge-target coordinates and proper motions use SIMBAD at CDS. Optional reference overlays use ESA Gaia DR3, processed by DPAC and served by MAST, and NASA’s AllWISE catalog, produced by UCLA and JPL/Caltech and served by CDS VizieR. The optional Digitized Sky Survey background comes from STScI and NASA via MAST, with color tiles and Aladin Lite by CDS. The Barnard’s Star context references NEOSSat catalog metadata from CSA and DRDC via the Canadian Astronomy Data Centre.

## Limitations

The bundled frames cover part of the archive, and additional cutouts depend on live IRSA availability. Detector gaps and flags can leave positions masked or outside an available cutout. Display smoothing and gap estimates change the appearance while the measurements and masks remain available. Changes in wavelength, background, point spread function, and alignment can make two frames look different. Differences seen in the viewer are exploratory and need independent checks.

## Project history

SKYSHIFT’s review workflow and public-release foundation existed before the November 14–15, 2026 event. On November 14 the team saved the pre-cleanup project state. On November 15 the team rebuilt Observations and Compare for the challenge targets, refreshed verified cutouts, and refined the live archive search and comparison tools. The earliest commit is the earliest work this history documents.

Selected lines from `git log --format="%h %ad %s" --date=short`:

```text
560b797 2026-11-15 Page live IRSA discovery and clarify preset cache coverage
76e2220 2026-11-15 Add sharable timelines and sky-aligned comparison tools
fd2284e 2026-11-15 Refresh verified target cutouts and recover interrupted cache files
0470190 2026-11-15 Repair SPHEREx Observations and Compare in place
a38e929 2026-11-14 Preserve complete pre-cleanup project state
ce53450 2026-10-16 Implement traceable SKYSHIFT review workflow and public release
```

## AI assistance

OpenAI Codex assisted with software implementation, archive integration, testing, and documentation. Earlier illustrative assets also received AI assistance. The observation images are measurements from the SPHEREx archive.
