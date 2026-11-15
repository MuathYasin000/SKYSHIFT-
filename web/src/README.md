# Frontend repair source

Files adopted here are the authoritative source for the October 18 repair.
Run `python tools/build_frontend.py` from the repository root to incrementally
copy changed application files into `web/dist` and validate the unchanged
scientific assets and complete review archive. The established buildless modules
and vendored assets outside this repair remain in `web/dist`.

`tools/prepare_public_static.py` runs that build before updating the existing
upload stage. Do not use the historical redesign generators to rebuild the
current mission-control UI. No scientific pipeline or data regeneration is part
of this frontend build. `release-integrity.json` records build-time checks,
separately from the immutable October 16 scientific provenance audit and any
actual provider deployment identity.
