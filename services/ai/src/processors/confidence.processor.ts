// ============================================================
// VoteCapsule — Confidence Score Processor
// services/ai/src/processors/confidence.processor.ts
//
// Computes the weighted overall confidence score from all
// sub-component scores and determines the routing decision.
//
// Thresholds (from V6 Ch8, IMMUTABLE):
//   >= 0.80  → APPROVE_FOR_REVIEW
//   0.60–0.79 → MANUAL_REVIEW
//   < 0.60  → ESCALATE
//
// Critical anomaly flags always force ESCALATE, overriding score.
// AI ASSISTS, HUMANS DECIDE. Never a final election decision.
// ============================================================
import { Injectable } from '@nestjs/common';
import { RoutingDecision } from '../entities/ai-verification-job.entity';
import { AnomalySeverity, AnomalyType } from '../entities/ai-anomaly-event.entity';
import type { NecAnomaly } from './nec-validator.processor';

export interface ConfidenceInput {
  ocrConfidence:          number;
  formRecognitionScore:   number;
  stationCodeMatchScore:  number;
  positionMatchScore:     number;
  voteArithmeticScore:    number;
  voterLimitScore:        number;
  anomalies:              NecAnomaly[];
}

export interface ConfidenceResult {
  overallConfidence:   number;
  routingDecision:     RoutingDecision;
  routingReason:       string;
  isFlagged:           boolean;
  flagReasons:         string[];
}

// Component weights must sum to 1.0
const WEIGHTS = {
  ocrConfidence:         0.20,
  formRecognitionScore:  0.15,
  stationCodeMatchScore: 0.25,
  positionMatchScore:    0.15,
  voteArithmeticScore:   0.15,
  voterLimitScore:       0.10,
} as const;

const CRITICAL_ANOMALY_TYPES: AnomalyType[] = [
  AnomalyType.VOTE_TOTAL_EXCEEDS_REGISTERED,
  AnomalyType.IMAGE_MANIPULATION,
  AnomalyType.DUPLICATE_CAPSULE,
  AnomalyType.INVALID_STATION_CODE,
  AnomalyType.STATION_CODE_MISMATCH,
];

@Injectable()
export class ConfidenceProcessor {

  compute(input: ConfidenceInput): ConfidenceResult {
    const overallConfidence = this.computeWeightedScore(input);
    const { isFlagged, flagReasons } = this.detectFlags(input.anomalies);
    const { routingDecision, routingReason } = this.determineRouting(
      overallConfidence,
      isFlagged,
      flagReasons,
      input.anomalies,
    );

    return {
      overallConfidence: this.roundScore(overallConfidence),
      routingDecision,
      routingReason,
      isFlagged,
      flagReasons,
    };
  }

  private computeWeightedScore(input: ConfidenceInput): number {
    return (
      input.ocrConfidence         * WEIGHTS.ocrConfidence         +
      input.formRecognitionScore  * WEIGHTS.formRecognitionScore  +
      input.stationCodeMatchScore * WEIGHTS.stationCodeMatchScore +
      input.positionMatchScore    * WEIGHTS.positionMatchScore    +
      input.voteArithmeticScore   * WEIGHTS.voteArithmeticScore   +
      input.voterLimitScore       * WEIGHTS.voterLimitScore
    );
  }

  private detectFlags(anomalies: NecAnomaly[]): { isFlagged: boolean; flagReasons: string[] } {
    const flagReasons: string[] = [];
    for (const anomaly of anomalies) {
      if (anomaly.severity === AnomalySeverity.HIGH || anomaly.severity === AnomalySeverity.CRITICAL) {
        flagReasons.push(anomaly.type);
      }
    }
    return { isFlagged: flagReasons.length > 0, flagReasons: [...new Set(flagReasons)] };
  }

  private determineRouting(
    score:       number,
    isFlagged:   boolean,
    flagReasons: string[],
    anomalies:   NecAnomaly[],
  ): { routingDecision: RoutingDecision; routingReason: string } {

    const hasCriticalAnomaly = anomalies.some(
      (a) => a.severity === AnomalySeverity.CRITICAL || CRITICAL_ANOMALY_TYPES.includes(a.type as AnomalyType),
    );

    if (hasCriticalAnomaly) {
      const types = anomalies
        .filter((a) => a.severity === AnomalySeverity.CRITICAL || CRITICAL_ANOMALY_TYPES.includes(a.type as AnomalyType))
        .map((a) => a.type)
        .join(', ');
      return { routingDecision: RoutingDecision.ESCALATE, routingReason: `Critical anomaly: ${types}` };
    }

    if (score >= 0.80) {
      return { routingDecision: RoutingDecision.APPROVE_FOR_REVIEW, routingReason: `Confidence ${this.pct(score)} — validator queue` };
    }

    if (score >= 0.60) {
      const reason = isFlagged
        ? `Confidence ${this.pct(score)} with flags [${flagReasons.join(', ')}] — manual review`
        : `Confidence ${this.pct(score)} below 80% — manual review`;
      return { routingDecision: RoutingDecision.MANUAL_REVIEW, routingReason: reason };
    }

    return { routingDecision: RoutingDecision.ESCALATE, routingReason: `Confidence ${this.pct(score)} below 60% — escalate` };
  }

  private roundScore(score: number): number {
    return Math.round(score * 10000) / 10000;
  }

  private pct(score: number): string {
    return `${(score * 100).toFixed(1)}%`;
  }
}
