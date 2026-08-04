/**
 * Vote Capsule™ — Mock AWS Cognito Identity Provider
 *
 * Provides pre-configured mock Cognito client responses for:
 * - Successful authentication
 * - MFA challenge flows
 * - Error conditions
 */

export function mockCognitoSuccess(accessToken = 'test-access-token', refreshToken = 'test-refresh-token') {
  return {
    send: jest.fn().mockResolvedValue({
      AuthenticationResult: {
        AccessToken: accessToken,
        RefreshToken: refreshToken,
        ExpiresIn: 3600,
        IdToken: 'test-id-token',
      },
    }),
  };
}

export function mockCognitoMfaChallenge() {
  return {
    send: jest.fn().mockResolvedValue({
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      Session: 'test-session-id',
    }),
  };
}

export function mockCognitoError(message = 'NotAuthorizedException') {
  return {
    send: jest.fn().mockRejectedValue(new Error(message)),
  };
}
