/**
 * VoteCapsule™ — Evidence Service: Server-Side Geo-Fence Validation
 *
 * Task 13 per party.Sonie.md:
 *   1. Extract gps.latitude/longitude from capsule submission payload
 *   2. Look up the agent's active assignment from agent_assignments table
 *   3. Find the submitted iebcStationCode in the assignment's stations JSONB
 *   4. Calculate Haversine distance between capture GPS and station GPS
 *   5. Apply 3-tier rule:
 *      ≤ radius          → PASS
 *      > radius ≤ 4×radius → WARNING (allow, flag geo_warning=true)
 *      > 4×radius         → REJECT with 422
 *   6. Legacy agents (no assignment): skip validation
 *   7. Station without GPS: skip validation, note in metadata
 */

import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { validateGeoFence, GeoValidationResult } from '../utils/haversine.util';

export interface GeoValidationOutcome {
  validated: boolean;       // false = validation was skipped (no assignment or no GPS)
  passed: boolean;          // true = within geofence or skipped
  geoWarning: boolean;      // true = outside soft radius but within hard limit
  metadata: GeoValidationMeta;
}

export interface GeoValidationMeta {
  distanceMeters?: number;
  stationLatitude?: number;
  stationLongitude?: number;
  withinGeofence?: boolean;
  radiusMeters?: number;
  skipReason?: 'NO_ASSIGNMENT' | 'STATION_NOT_IN_ASSIGNMENT' | 'STATION_NO_GPS' | 'CAPTURE_NO_GPS';
  result?: GeoValidationResult;
}

interface AssignedStation {
  iebcCode: string;
  latitude:  number | null;
  longitude: number | null;
  [key: string]: unknown;
}

interface Assignment {
  geofenceRadiusMeters: number;
  stations: AssignedStation[];
}

@Injectable()
export class GeoValidationService {
  private readonly logger = new Logger(GeoValidationService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Main entry point — called during capsule submission.
   *
   * @param agentUserId     The agent submitting the capsule
   * @param tenantId        The agent's tenant
   * @param iebcStationCode The station code in the submission
   * @param captureLatitude GPS latitude from mobile (may be null)
   * @param captureLongitude GPS longitude from mobile (may be null)
   */
  async validateCaptureLocation(
    agentUserId: string,
    tenantId: string,
    iebcStationCode: string,
    captureLatitude: number | null,
    captureLongitude: number | null,
  ): Promise<GeoValidationOutcome> {
    // Rule 5: No capture GPS → skip validation
    if (captureLatitude == null || captureLongitude == null) {
      this.logger.debug(`Capsule has no GPS coords — skipping geo-validation for agent ${agentUserId}`);
      return this.skipped('CAPTURE_NO_GPS');
    }

    // Look up the agent's active assignment
    const assignment = await this.getActiveAssignment(agentUserId, tenantId);

    // Rule 4: Legacy agents with no assignment → skip validation
    if (!assignment) {
      this.logger.debug(`No active assignment for agent ${agentUserId} — skipping geo-validation`);
      return this.skipped('NO_ASSIGNMENT');
    }

    // Find the submitted station in the assignment's stations array
    const assignedStation = assignment.stations.find(
      (s) => s.iebcCode === iebcStationCode,
    );

    if (!assignedStation) {
      // Station not in assignment — this is a soft warning, not a hard reject
      // (The actual station validation is handled by Geography Service)
      this.logger.warn(
        `Station ${iebcStationCode} not in agent ${agentUserId}'s assignment — skipping geo-validation`,
      );
      return this.skipped('STATION_NOT_IN_ASSIGNMENT');
    }

    // Rule 6: Station has no GPS coordinates → skip, add note
    if (assignedStation.latitude == null || assignedStation.longitude == null) {
      this.logger.debug(`Station ${iebcStationCode} has no GPS data — skipping geo-validation`);
      return this.skipped('STATION_NO_GPS');
    }

    // Run Haversine geo-fence validation
    const geoResult = validateGeoFence(
      captureLatitude,
      captureLongitude,
      assignedStation.latitude,
      assignedStation.longitude,
      assignment.geofenceRadiusMeters,
    );

    // Rule 3: Hard limit exceeded → REJECT with 422
    if (geoResult.hardLimitExceeded) {
      const maxAllowedKm = (assignment.geofenceRadiusMeters * 4 / 1000).toFixed(1);
      const actualKm = (geoResult.distanceMeters / 1000).toFixed(1);

      this.logger.warn(
        `GEO_FENCE_VIOLATION: agent=${agentUserId} station=${iebcStationCode} ` +
          `distance=${geoResult.distanceMeters}m hardLimit=${assignment.geofenceRadiusMeters * 4}m`,
      );

      throw new UnprocessableEntityException({
        error: 'GEO_FENCE_VIOLATION',
        message:
          `Capture location is ${actualKm}km from assigned station. ` +
          `Maximum allowed: ${maxAllowedKm}km.`,
        details: {
          captureLatitude,
          captureLongitude,
          stationLatitude:  assignedStation.latitude,
          stationLongitude: assignedStation.longitude,
          distanceMeters:   geoResult.distanceMeters,
          maxDistanceMeters: assignment.geofenceRadiusMeters * 4,
          radiusMeters:     assignment.geofenceRadiusMeters,
        },
      });
    }

    // Rule 2: Warning zone (1× – 4× radius) → flag but allow
    if (geoResult.geoWarning) {
      this.logger.warn(
        `GEO_WARNING: agent=${agentUserId} station=${iebcStationCode} ` +
          `distance=${geoResult.distanceMeters}m (outside soft radius=${assignment.geofenceRadiusMeters}m)`,
      );
    }

    // Rule 1: Within radius → PASS
    return {
      validated:  true,
      passed:     true,
      geoWarning: geoResult.geoWarning,
      metadata: {
        distanceMeters:    geoResult.distanceMeters,
        stationLatitude:   assignedStation.latitude,
        stationLongitude:  assignedStation.longitude,
        withinGeofence:    geoResult.withinGeofence,
        radiusMeters:      geoResult.radiusMeters,
        result:            geoResult,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private async getActiveAssignment(
    agentUserId: string,
    tenantId: string,
  ): Promise<Assignment | null> {
    try {
      const result = await this.dataSource.query(
        `SELECT stations, geofence_radius_meters AS "geofenceRadiusMeters"
         FROM agent_assignments
         WHERE agent_user_id = $1
           AND tenant_id = $2
           AND status = 'ACTIVE'
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY assigned_at DESC
         LIMIT 1`,
        [agentUserId, tenantId],
      );
      return result[0] ?? null;
    } catch (err) {
      // If the table doesn't exist yet (before migration runs), gracefully skip
      this.logger.warn(`Could not query agent_assignments: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  private skipped(reason: GeoValidationMeta['skipReason']): GeoValidationOutcome {
    return {
      validated:  false,
      passed:     true,   // Skipped = no block on submission
      geoWarning: false,
      metadata:   { skipReason: reason },
    };
  }
}
