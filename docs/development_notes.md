# First implementation increment

## Completed work

- Initialized the local Git repository without creating a commit or pushing anything.
- Created a project-local Python environment, package configuration, and exact installed dependency lock.
- Implemented CLI inventory, download, inspect, screen, and schema commands.
- Acquired and hashed seven real SPHEREx cutouts and the full detector-2 spectral calibration.
- Exercised the package's inventory command against live IRSA: 370 returned products.
- Preserved all 21 full-field pair-screen decisions and the smaller-region evaluations.
- Reverified all eight scientific input files against the configured expected hashes.
- Added typed evidence contracts and an initial JSON schema.
- Added 34 focused automated tests. All passed in the development environment.
- Ran dependency consistency checking: no broken requirements found.
- Produced a labeled real-data engineering preview and candidate dossier.

## Decisions

- Keep scientific processing independent of Streamlit.
- Retain SOURCE pixels and conservatively mask other declared flag states in v0.1.
- Require full CWAVE/CBAND for the scientific spectral screen.
- Preserve rejected regions and failed archive queries.
- Never turn a passing engineering screen into scientific approval automatically.
- Hold the public comparison interface until the selected data gate is resolved.

## Next work

Complete reference-source alignment diagnostics and the scientific suitability review. The first candidate has a small inspection region and extended galaxy structure, so it may be less useful than another field for a novice moving-object demonstration. The implementation must remain free to reject it.

Tests establish software behavior in the local environment, not real-data scientific validity or clean-machine/public deployment acceptance. Existing report, slides, video, and plan PDFs have not been modified.
