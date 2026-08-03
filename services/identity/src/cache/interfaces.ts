/**
 * Vote Capsule™ Identity Service — Redis Session/Cache Interfaces
 */

export interface SessionMetadata {
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  tenantId: string;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  metadata: SessionMetadata;
  createdAt: string;
  expiresAt: string;
}
