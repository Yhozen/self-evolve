# Discard Policy

A run should be discarded, deferred, or decomposed when any of the following is true:

- it is not clearly aligned with the current goal
- it depends on missing or contradictory context
- it introduces a large or hard-to-review diff
- it cannot be verified well enough for the repository's current standards
- it requires a human decision that was not obtained
- it would be better expressed as multiple smaller improvements

Discarding a run is acceptable. The point is to prevent low-confidence or low-value work from accumulating.
