/** Location / distance tracking (Phase 6 + Phase 7 "KM traveled"). */

export interface LocationPointInput {
  lat: number;
  lng: number;
  recordedAt: string;
  /** Device-stable key so re-syncing never double-counts a point. */
  dedupeKey: string;
}

export interface DistanceSummary {
  from: string;
  to: string;
  /** Total distance over the period, in metres. */
  totalMeters: number;
  /** Convenience: kilometres, rounded to 1 decimal. */
  totalKm: number;
  pointCount: number;
}
