// ============================================================
// VoteCapsule -- Validator Mobile App Types
// apps/validator-mobile/src/types/index.ts
// ============================================================

// -- Capsule for Review (from validation queue) ---------------

export interface CapsuleForReview {
  id: string;
  stationCode: string;
  stationName: string;
  position: string;
  imageUrl: string;
  submittedAt: string;
  agentName: string;
  aiConfidence: number;
  aiRecommendation: 'approve' | 'review' | 'reject';
  ocrData: OcrData;
  signatureStatus: SignatureStatus;
  priority: 'high' | 'medium' | 'low';
}

export interface OcrData {
  extractedText: string;
  votes: Record<string, number>;
  formType: string;
  flaggedIssues: string[];
}

export interface SignatureStatus {
  detected: boolean;
  confidence: number;
  count: number;
}

// -- Decisions ------------------------------------------------

export enum ValidationDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

// -- Validation History & Stats --------------------------------

export interface ValidationHistory {
  id: string;
  capsuleId: string;
  decision: ValidationDecision;
  reason: string;
  decidedAt: string;
}

export interface ValidatorStats {
  totalReviewed: number;
  approved: number;
  rejected: number;
  escalated: number;
  avgReviewTime: number; // seconds
}

// -- Auth -----------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

export interface ValidatorUser {
  cognitoSub: string;
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  roles: string[];
}

// -- Navigation -----------------------------------------------

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  CapsuleReview: { capsuleId: string };
  ImageViewer: { imageUrl: string; title?: string };
};

export type MainTabParamList = {
  Queue: undefined;
  History: undefined;
  Stats: undefined;
  Settings: undefined;
};
