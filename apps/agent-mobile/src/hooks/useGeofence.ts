// ============================================================
// VoteCapsule™ — Geo-fence Validation Hook
// apps/agent-mobile/src/hooks/useGeofence.ts
//
// Validates that the agent's GPS position is within acceptable
// distance of the assigned polling station. Prevents:
//   - Capturing evidence from the wrong location
//   - Submitting photos taken at a different station
//   - Agents covering stations they weren't assigned to
//
// Two levels of enforcement:
//   CLIENT: Warning shown to agent if >500m from station (soft)
//   SERVER: Evidence Service rejects if >2km from station (hard)
// ============================================================
import { useMemo } from 'react';
import { GpsCoords, PollingStation } from '../types';
import { StationAssignment, useAssignmentStore } from '../store/assignmentStore';

// ── Configuration ────────────────────────────────────────────

/** Soft warning threshold — agent sees yellow banner */
export const GEOFENCE_WARN_METERS = 500;
/** Hard reject threshold — server will reject submission */
export const GEOFENCE_REJECT_METERS = 2000;
/** Acceptable GPS accuracy — ignore if accuracy is worse than this */
export const MAX_ACCEPTABLE_ACCURACY = 100; // meters

// ── Distance calculation (Haversine formula) ─────────────────

/**
 * Calculate distance between two GPS points in meters.
 * Uses the Haversine formula for great-circle distance.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ── Geofence result ──────────────────────────────────────────

export type GeofenceStatus =
  | 'WITHIN_RANGE'    // Agent is at the station (<500m)
  | 'WARNING'         // Agent is close but drifting (500m-2km)
  | 'OUT_OF_RANGE'    // Agent is too far (>2km) — server will reject
  | 'NO_GPS'          // GPS not available — allow but flag
  | 'NO_STATION_GPS'  // Station has no GPS coordinates — skip check
  | 'UNASSIGNED';     // Agent has no assignment — free mode

export interface GeofenceResult {
  status: GeofenceStatus;
  distanceMeters: number | null;
  stationName: string | null;
  message: string;
  canProceed: boolean;  // Can the agent still capture?
  willServerReject: boolean;  // Will the server reject this upload?
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Validates agent GPS against the target polling station.
 *
 * @param agentGps - Current agent GPS coordinates (from useGps hook)
 * @param targetStationCode - The 15-digit IEBC code the agent selected
 */
export function useGeofence(
  agentGps: GpsCoords | null,
  targetStationCode: string | null,
): GeofenceResult {
  const assignment = useAssignmentStore(s => s.assignment);

  return useMemo((): GeofenceResult => {
    // No assignment = unscoped mode (legacy behavior for General Election agents)
    if (!assignment || assignment.stations.length === 0) {
      return {
        status: 'UNASSIGNED',
        distanceMeters: null,
        stationName: null,
        message: 'Free mode — no assignment restrictions',
        canProceed: true,
        willServerReject: false,
      };
    }

    if (!targetStationCode) {
      return {
        status: 'NO_GPS',
        distanceMeters: null,
        stationName: null,
        message: 'Select a polling station first',
        canProceed: false,
        willServerReject: false,
      };
    }

    // Find the target station in assignment
    const targetStation = assignment.stations.find(s => s.iebcCode === targetStationCode);

    if (!targetStation) {
      // Station not in assignment — block
      return {
        status: 'OUT_OF_RANGE',
        distanceMeters: null,
        stationName: null,
        message: 'This station is NOT in your assignment. You can only capture evidence for your assigned stations.',
        canProceed: false,
        willServerReject: true,
      };
    }

    // Station has no GPS coordinates — allow but skip distance check
    if (targetStation.latitude == null || targetStation.longitude == null) {
      return {
        status: 'NO_STATION_GPS',
        distanceMeters: null,
        stationName: targetStation.name,
        message: `Station GPS not mapped — location check skipped for ${targetStation.name}`,
        canProceed: true,
        willServerReject: false,
      };
    }

    // Agent GPS not available — allow with warning
    if (!agentGps) {
      return {
        status: 'NO_GPS',
        distanceMeters: null,
        stationName: targetStation.name,
        message: 'GPS unavailable — enable location services for geo-verification',
        canProceed: true,
        willServerReject: false,
      };
    }

    // GPS accuracy too poor — allow with note
    if (agentGps.accuracyMeters && agentGps.accuracyMeters > MAX_ACCEPTABLE_ACCURACY) {
      return {
        status: 'WARNING',
        distanceMeters: null,
        stationName: targetStation.name,
        message: `GPS accuracy is poor (±${Math.round(agentGps.accuracyMeters)}m). Move to open area for better signal.`,
        canProceed: true,
        willServerReject: false,
      };
    }

    // Calculate distance
    const distance = calculateDistanceMeters(
      agentGps.latitude,
      agentGps.longitude,
      targetStation.latitude,
      targetStation.longitude,
    );

    const geofenceRadius = assignment.geofenceRadiusMeters || GEOFENCE_WARN_METERS;

    if (distance <= geofenceRadius) {
      return {
        status: 'WITHIN_RANGE',
        distanceMeters: Math.round(distance),
        stationName: targetStation.name,
        message: `You are at ${targetStation.name} (${Math.round(distance)}m away)`,
        canProceed: true,
        willServerReject: false,
      };
    }

    if (distance <= GEOFENCE_REJECT_METERS) {
      return {
        status: 'WARNING',
        distanceMeters: Math.round(distance),
        stationName: targetStation.name,
        message: `You are ${Math.round(distance)}m from ${targetStation.name}. Move closer to the polling station.`,
        canProceed: true, // Allow but warn
        willServerReject: false,
      };
    }

    // Too far — server will reject
    return {
      status: 'OUT_OF_RANGE',
      distanceMeters: Math.round(distance),
      stationName: targetStation.name,
      message: `You are ${(distance / 1000).toFixed(1)}km from ${targetStation.name}. This is too far — evidence will be rejected.`,
      canProceed: false,
      willServerReject: true,
    };
  }, [agentGps, targetStationCode, assignment]);
}

// ── Server-side validation helper (for Evidence Service) ─────

/**
 * Validate GPS coordinates against station location.
 * Used server-side in Evidence Service to hard-reject bad submissions.
 *
 * Returns: { valid, distance, reason }
 */
export function validateGeoServer(
  captureLatitude: number | null,
  captureLongitude: number | null,
  stationLatitude: number | null,
  stationLongitude: number | null,
  maxDistanceMeters: number = GEOFENCE_REJECT_METERS,
): { valid: boolean; distance: number | null; reason: string } {
  // No capture GPS — allow (some devices don't have GPS)
  if (captureLatitude == null || captureLongitude == null) {
    return { valid: true, distance: null, reason: 'No capture GPS — skipped' };
  }

  // No station GPS — allow (station not yet mapped)
  if (stationLatitude == null || stationLongitude == null) {
    return { valid: true, distance: null, reason: 'Station GPS not mapped — skipped' };
  }

  const distance = calculateDistanceMeters(
    captureLatitude,
    captureLongitude,
    stationLatitude,
    stationLongitude,
  );

  if (distance <= maxDistanceMeters) {
    return { valid: true, distance: Math.round(distance), reason: 'Within range' };
  }

  return {
    valid: false,
    distance: Math.round(distance),
    reason: `Capture location is ${(distance / 1000).toFixed(1)}km from station. Maximum allowed: ${(maxDistanceMeters / 1000).toFixed(1)}km.`,
  };
}
