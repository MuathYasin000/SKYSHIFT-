# Left for the team owner

## Submission

- Confirm **Project Mercury Team** and all six members in the portal. Keep the organizer’s response about earlier work and confirm its scope with the Local Lead. Confirm the Local Event assignment for the full roster and the portal’s deadline in that event’s time zone.
- The [public judging demo](demo/SKYSHIFT-Project-Mercury-Team.pdf) includes the six approved names. Use its GitHub URL from the [paste-ready portal fields](project_page_fields.md).
- Review the originality declaration and terms yourself, select **Submit for Judging**, and confirm the saved submission banner.
- Submit the [optional FortiGuard request](project_page_fields.md#fortiguard) if you choose to use it.

## Verification limits

- The final-polish frontend is pushed to the public branch. At 19:30 Asia/Hebron, Render still served the earlier build. The desktop session stopped because it could not verify the active Chrome URL. Trigger **Manual Deploy → Deploy latest commit** in the existing SKYSHIFT service, then check that `/version.json` reports content ID `e47f3ceda36861b51046c99142caf826804f6fc2b40758ce7d3417c482c00a1e`. The polished app’s signed-out retest and live screenshot recapture depend on that deployment.
- The last completed live custom-coordinate check reported incomplete DR1 coverage after IRSA SIA2 and TAP timeouts. Current IRSA availability and the number of matching observations remain unverified. The shipped previews cover a subset of real observations. A wide field or an alternate release may need an archive request. [Archive results](nasa_compliance_report.md#signed-out-deployment-checks)
- A true Render cold start is unmeasured. The slow-API test exercised the banner after HTML loaded. The Free service can delay the initial HTML request as it wakes.
- No usable center was found in the bundled 1′ and 8′ cutouts for Barnard’s Star or R Draconis. WISE 0855 has two qualifying same-band exposures in its default preview. [Group and mask evidence](nasa_compliance_report.md#wavelength-aware-blink)
- Earlier checks could not verify a coordinate-matched CADC footprint. CADC is an external archive link. Some historical asset provenance and third-party permissions remain unverified. [Source access and terms](nasa_rules_digest.md) · [Third-party inventory](third_party.md)
- Qualified scientific and internal review remain undocumented. Independent novice testing has not been conducted.
