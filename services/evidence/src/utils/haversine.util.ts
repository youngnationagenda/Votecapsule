/**
 * VoteCapsule™ — Haversine Distance Calculation
 *
 * Calculates the great-circle distance between two GPS coordinates
 * using the Haversine formula. Used for server-side geo-fence validation
 * on evidence capsule submission.
 */

const EARTH_RADIUS_METERS = 6_371_000; // Mean Earth radius in metres

/**
 * Calculates distance in metres between two GPS coordinates.
 * Returns distance as a positive float in metres.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export interface GeoValidationResult {
  /** Whether the capsule is within the configured geofence */
  withinGeofence: boolean;
  /** Whether the capsule exceeds the hard 4x limit and should be rejected */
  hardLimitExceeded: boolean;
  /** Actual distance from the assigned station in metres */
  distanceMeters: number;
  /** The configured geofence radius */
  radiusMeters: number;
  /** Station GPS coordinates used for validation */
  stationLatitude: number;
  stationLongitude: number;
  /** Whether to add a geo_warning flag on the capsule */
  geoWarning: boolean;
}

/**
 * Validates capture GPS coordinates against a station geofence.
 *
 * Rules (per party.Sonie.md Task 13):
 *   - distance ≤ radius             → PASS (withinGeofence = true)
 *   - distance > radius && ≤ 4×radius → WARNING (flag geo_warning, allow)
 *   - distance > 4×radius           → REJECT (hardLimitExceeded = true)
 */
export function validateGeoFence(
  captureLatitude: number,
  captureLongitude: number,
  stationLatitude: number,
  stationLongitude: number,
  radiusMeters: number,
): GeoValidationResult {
  const distanceMeters = haversineDistanceMeters(
    captureLatitude,
    captureLongitude,
    stationLatitude,
    stationLongitude,
  );

  const hardLimit = radiusMeters * 4;

  return {
    distanceMeters:    Math.round(distanceMeters),
    radiusMeters,
    stationLatitude,
    stationLongitude,
    withinGeofence:    distanceMeters <= radiusMeters,
    geoWarning:        distanceMeters > radiusMeters && distanceMeters <= hardLimit,
    hardLimitExceeded: distanceMeters > hardLimit,
  };
}
