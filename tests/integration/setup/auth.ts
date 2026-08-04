// ============================================================
// VoteCapsule Integration Tests — Authentication Helper
// tests/integration/setup/auth.ts
//
// Wraps AWS Cognito InitiateAuth to obtain JWT tokens.
// Caches tokens within a test run to avoid rate-limiting.
// ============================================================
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from './config';

// ── Token cache ────────────────────────────────────────────────

interface CachedToken {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

const tokenCache = new Map<string, CachedToken>();

// ── Cognito client ─────────────────────────────────────────────

const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
});

// ── Internal: authenticate via USER_PASSWORD_AUTH ───────────────

async function authenticate(
  email: string,
  password: string,
  clientId: string,
): Promise<CachedToken> {
  const cacheKey = `${email}:${clientId}`;

  // Return cached token if still valid (with 60s buffer)
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached;
  }

  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult?.IdToken) {
    throw new Error(
      `Cognito authentication failed for ${email}. ` +
      `Challenge: ${response.ChallengeName ?? 'none'}`,
    );
  }

  const result = response.AuthenticationResult;
  const token: CachedToken = {
    idToken: result.IdToken!,
    accessToken: result.AccessToken!,
    refreshToken: result.RefreshToken,
    expiresAt: Date.now() + (result.ExpiresIn ?? 3600) * 1000,
  };

  tokenCache.set(cacheKey, token);
  return token;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get admin JWT token (for authority/admin operations).
 * Uses the admin Cognito client ID and credentials from config.
 */
export async function getAdminToken(): Promise<string> {
  const token = await authenticate(
    config.cognito.adminEmail,
    config.cognito.adminPassword,
    config.cognito.adminClientId,
  );
  return token.idToken;
}

/**
 * Get agent JWT token (for mobile field agent operations).
 * Uses the mobile Cognito client ID.
 */
export async function getAgentToken(email: string, password: string): Promise<string> {
  const token = await authenticate(email, password, config.cognito.mobileClientId);
  return token.idToken;
}

/**
 * Get full authentication result (includes accessToken, refreshToken).
 * Useful for tests that need to verify token structure.
 */
export async function getFullAuthResult(
  email: string,
  password: string,
  clientId?: string,
): Promise<CachedToken> {
  return authenticate(
    email,
    password,
    clientId ?? config.cognito.adminClientId,
  );
}

/**
 * Clear the token cache. Use in afterAll() to avoid stale tokens
 * across test suite boundaries.
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Parse a JWT token payload without verification (test utility).
 * DO NOT use in production — no signature verification.
 */
export function parseJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}
