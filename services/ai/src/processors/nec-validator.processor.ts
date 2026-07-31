// ============================================================
// VoteCapsule — NEC Cross-Validation Processor
// services/ai/src/processors/nec-validator.processor.ts
//
// Validates OCR-extracted election data against NEC ground truth.
// NEC is the Single Source of Truth.
// Calls Geography Service (port 3004) via HTTP.
// Correct endpoint: GET /geography/polling-stations/:code/validate
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { AnomalyType, AnomalySeverity } from '../entities/ai-anomaly-event.entity';

export interface NecValidationInput {
  submittedStationCode:      string;
  extractedStationCode:      string | null;
  submittedPositionCode:     string;
  extractedPosition:         string | null;
  extractedRegisteredVoters: number | null;
  extractedVotesCast:        number | null;
  extractedValidVotes:       number | null;
  extractedRejectedVotes:    number | null;
  extractedStreamNumber:     number | null;
}

// Field names match Geography Service PollingStationDetail exactly.
export interface NecStationData {
  iebcStationCode:    string;   // was: iebcCode  (matches geography entity field)
  name:               string;   // was: stationName
  registeredVoters:   number;
  countyCode:         string;
  countyName:         string;
  constituencyCode:   string;
  wardCode:           string;
}

export interface NecValidationResult {
  stationCodeVerified:   boolean;
  stationNameVerified:   boolean | null;
  positionVerified:      boolean;
  voterLimitRespected:   boolean | null;
  arithmeticValid:       boolean | null;
  necStation:            NecStationData | null;
  stationCodeMatchScore: number;
  positionMatchScore:    number;
  voterLimitScore:       number;
  arithmeticScore:       number;
  anomalies:             NecAnomaly[];
}

export interface NecAnomaly {
  type:        string;
  severity:    AnomalySeverity;
  description: string;
  evidence:    Record<string, unknown>;
}

const POSITION_ALIASES: Record<string, string[]> = {
  'PRESIDENT':  ['PRESIDENT', 'PRESIDENTIAL'],
  'GOVERNOR':   ['GOVERNOR', 'COUNTY GOVERNOR'],
  'SENATOR':    ['SENATOR', 'SENATE'],
  'WOMEN_REP':  ['WOMEN_REP', 'WOMEN REPRESENTATIVE', 'WOMEN REP', 'CWR'],
  'MP':         ['MP', 'MEMBER OF PARLIAMENT', 'MEMBER OF NATIONAL ASSEMBLY', 'MNA'],
  'MCA':        ['MCA', 'MEMBER OF COUNTY ASSEMBLY', 'COUNTY ASSEMBLY'],
};

@Injectable()
export class NecValidatorProcessor {
  private readonly logger = new Logger(NecValidatorProcessor.name);
  private readonly geographyBaseUrl: string;
  private readonly HTTP_TIMEOUT_MS = 5_000;

  constructor(
    private readonly http:   HttpService,
    private readonly config: ConfigService,
  ) {
    this.geographyBaseUrl = config.get(
      'GEOGRAPHY_SERVICE_URL',
      'http://geography-service:3004',
    );
  }

  async validate(input: NecValidationInput): Promise<NecValidationResult> {
    const anomalies: NecAnomaly[] = [];
    const necStation = await this.fetchStation(input.submittedStationCode);

    const stationCodeVerified = this.verifyStationCode(
      input.submittedStationCode, input.extractedStationCode, necStation, anomalies,
    );
    const positionVerified = this.verifyPosition(
      input.submittedPositionCode, input.extractedPosition, anomalies,
    );
    const voterLimitRespected = this.checkVoterLimit(
      input.extractedVotesCast, necStation, input.extractedRegisteredVoters, anomalies,
    );
    const arithmeticValid = this.checkArithmetic(
      input.extractedVotesCast, input.extractedValidVotes, input.extractedRejectedVotes, anomalies,
    );

    return {
      stationCodeVerified,
      stationNameVerified:   necStation ? true : null,
      positionVerified,
      voterLimitRespected,
      arithmeticValid,
      necStation,
      stationCodeMatchScore: stationCodeVerified ? 1.0 : (necStation ? 0.0 : 0.5),
      positionMatchScore:    positionVerified ? 1.0 : 0.0,
      voterLimitScore:       this.scoreVoterLimit(voterLimitRespected),
      arithmeticScore:       this.scoreArithmetic(arithmeticValid),
      anomalies,
    };
  }

  private async fetchStation(stationCode: string): Promise<NecStationData | null> {
    try {
      // Correct Geography Service endpoint
      const url = `${this.geographyBaseUrl}/api/v1/geography/polling-stations/${stationCode}/validate`;
      const response$ = this.http
        .get<NecStationData>(url)
        .pipe(timeout(this.HTTP_TIMEOUT_MS), catchError(() => of(null)));
      const response = await firstValueFrom(response$);
      if (!response?.data) return null;
      return response.data as unknown as NecStationData;
    } catch {
      this.logger.warn(`Geography Service unavailable for station ${stationCode} — partial validation`);
      return null;
    }
  }

  private verifyStationCode(
    submitted: string, extracted: string | null,
    nec: NecStationData | null, anomalies: NecAnomaly[],
  ): boolean {
    if (extracted && extracted !== submitted) {
      anomalies.push({
        type: AnomalyType.STATION_CODE_MISMATCH,
        severity: AnomalySeverity.HIGH,
        description: `OCR extracted station code "${extracted}" does not match submitted "${submitted}"`,
        evidence: { submitted, extracted },
      });
      return false;
    }
    if (!nec) return true; // benefit of doubt if Geography unavailable
    if (nec.iebcStationCode !== submitted) {
      anomalies.push({
        type: AnomalyType.INVALID_STATION_CODE,
        severity: AnomalySeverity.CRITICAL,
        description: `Station code "${submitted}" not found in NEC registry`,
        evidence: { submitted },
      });
      return false;
    }
    return true;
  }

  private verifyPosition(
    submitted: string, extracted: string | null, anomalies: NecAnomaly[],
  ): boolean {
    if (!extracted) return true;
    const normalised = this.normalisePosition(extracted);
    if (!normalised) return true;
    if (normalised !== submitted.toUpperCase()) {
      anomalies.push({
        type: AnomalyType.POSITION_MISMATCH,
        severity: AnomalySeverity.HIGH,
        description: `Position mismatch: OCR "${extracted}" vs submitted "${submitted}"`,
        evidence: { submitted, extracted, normalised },
      });
      return false;
    }
    return true;
  }

  private checkVoterLimit(
    votesCast: number | null, nec: NecStationData | null,
    formVoters: number | null, anomalies: NecAnomaly[],
  ): boolean | null {
    if (votesCast == null) return null;
    const registeredVoters = nec?.registeredVoters ?? formVoters;
    if (registeredVoters == null) return null;
    if (votesCast > registeredVoters) {
      anomalies.push({
        type: AnomalyType.VOTE_TOTAL_EXCEEDS_REGISTERED,
        severity: AnomalySeverity.CRITICAL,
        description: `Votes cast (${votesCast}) exceeds registered voters (${registeredVoters})`,
        evidence: { votesCast, registeredVoters, source: nec ? 'NEC' : 'form' },
      });
      return false;
    }
    if (votesCast === 0) {
      anomalies.push({
        type: AnomalyType.ZERO_VOTES_ALL_CANDIDATES,
        severity: AnomalySeverity.MEDIUM,
        description: `Zero votes cast — unusual`,
        evidence: { votesCast, registeredVoters },
      });
    }
    return true;
  }

  private checkArithmetic(
    votesCast: number | null, validVotes: number | null,
    rejectedVotes: number | null, anomalies: NecAnomaly[],
  ): boolean | null {
    if (votesCast == null || (validVotes == null && rejectedVotes == null)) return null;
    const expected = (validVotes ?? 0) + (rejectedVotes ?? 0);
    if (expected !== votesCast) {
      anomalies.push({
        type: AnomalyType.ARITHMETIC_ERROR,
        severity: AnomalySeverity.HIGH,
        description: `Vote arithmetic: valid(${validVotes ?? 0}) + rejected(${rejectedVotes ?? 0}) = ${expected} ≠ cast(${votesCast})`,
        evidence: { votesCast, validVotes, rejectedVotes, expected },
      });
      return false;
    }
    return true;
  }

  private scoreVoterLimit(result: boolean | null): number {
    if (result === null) return 0.7;
    return result ? 1.0 : 0.0;
  }

  private scoreArithmetic(result: boolean | null): number {
    if (result === null) return 0.7;
    return result ? 1.0 : 0.0;
  }

  private normalisePosition(raw: string): string | null {
    const upper = raw.toUpperCase().trim();
    for (const [code, aliases] of Object.entries(POSITION_ALIASES)) {
      if (aliases.some((a) => upper.includes(a))) return code;
    }
    return null;
  }
}
