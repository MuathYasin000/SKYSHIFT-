# Registration context boundary correction

The release audit found that registration-v1 required fit support in the native cutouts but did not explicitly require a reference to lie in the declared 0.3-degree tangent-plane context. Rotated native cutout footprints extend beyond that context. Three of the 16 measured references lay outside the declared context and contributed to its coverage/residual summaries.

The earlier 16-reference result remains preserved as superseded evidence. It is not used for the current release. Registration-v2 rejects a reference whose proper-motion-propagated position lies outside the declared context at either epoch. All residual, minimum-reference, quadrant and convex-hull thresholds are unchanged. A synthetic regression test demonstrates that a larger native footprint cannot inflate coverage of a smaller declared context.

The corrected sample has 13 references across four quadrants, convex-hull fraction 0.2713769, median residual 0.0506893 pixel (0.3117395 arcsec), and p95 0.3263884 pixel (2.0072889 arcsec). The numerical gate passes. The retained high-residual source is not removed. The corresponding profile-width ratio median is 0.9826175, with p95 absolute deviation 0.2537896. Original images, masks and spectral thresholds are unchanged.

The 0.04-degree inspection field remains smaller than the registration context. The corrected surrounding-reference result does not prove local distortions are absent in the extended M101 emission. Human technical review and qualified scientific approval both remain PENDING.

The v1-v3 evidence archives and initial production version are retained for audit. The final application and review packet use registration-v2 and a new preparation identity. Old saved comparisons cannot silently reopen against the changed scientific identity.
