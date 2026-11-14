// Read-only projection of verified metadata. Never infer missing calibration IDs.
export function evidenceTrail(observations) {
  return observations.map((o) => ({
    id: o.observation_id,
    date: o.time_start_utc,
    references: [
      ["Original archive FITS", o.source],
      ["Spectral calibration", o.spectral_calibration],
    ].map(([label, source]) => ({
      label,
      url: source?.source_url || null,
      sha256: source?.sha256 || null,
    })),
  }));
}
