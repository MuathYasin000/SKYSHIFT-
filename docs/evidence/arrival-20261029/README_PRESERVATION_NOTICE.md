On October 30 (Asia/Hebron), an arrival-verifier run used this historical
directory before its hard-coded path was noticed. Five screenshots were
overwritten. `landed.png` was recovered from an identical SHA-256 copy; the old
`loading.png`, `mobile-landed.png`, `reveal.png` and `settling.png` were not
recoverable. Do not treat those four current images as the preserved original
screenshots. Scientific datasets and rejection records were unaffected.

See `../completion-20261030/evidence-collision.json`. The verifier now selects a
fresh run directory and refuses to overwrite an existing one.
