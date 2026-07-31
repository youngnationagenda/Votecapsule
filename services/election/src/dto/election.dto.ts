// ============================================================
// VoteCapsule™ — Election Service DTOs
// services/election/src/dto/election.dto.ts
//
// Request/response shapes for the Election aggregation API.
// Candidate Service owns the Election/Position/Candidate tables.
// Geography Service owns all NEC polling station / voter data.
// This service is a read-orchestration / proxy layer.
// ============================================================

// ── Query params ────────────────────────────────────────────

export class ListElectionsQuery {
  tenantId?: string;
  status?: string;
}

export class ListPositionsQuery {
  countyCode?: string;
}

export class ListCandidatesQuery {
  positionId?: string;
  partyId?: string;
  countyCode?: string;
  constituencyCode?: string;
  wardCode?: string;
  status?: string;
  tenantId?: string;
}

export class ListPollingStationsQuery {
  countyCode?: string;
  constituencyCode?: string;
  wardCode?: string;
  centreCode?: string;
  stationType?: string;
  activeOnly?: string;
}

export class RegisteredVotersQuery {
  /** 'county' | 'total' — default 'total' */
  breakdown?: string;
}

// ── Create / mutation bodies (proxied to Candidate Service) ──

export class CreateElectionBody {
  name: string;
  electionType?: string;
  electionYear: number;
  electionDate?: string;
  nominationDeadline?: string;
  campaignStartDate?: string;
  campaignEndDate?: string;
  gazetteReference?: string;
  description?: string;
  necElectionYear?: number;
}

export class RegisterCandidateBody {
  electionId: string;
  positionId: string;
  partyId?: string;
  fullName: string;
  shortName?: string;
  nationalId: string;
  dateOfBirth?: string;
  gender?: string;
  isIndependent?: boolean;
  runningMateName?: string;
  runningMateNationalId?: string;
  countyCode?: string;
  constituencyCode?: string;
  wardCode?: string;
  photographUrl?: string;
  symbolUrl?: string;
  nominationCertUrl?: string;
  nominationCertNumber?: string;
}
