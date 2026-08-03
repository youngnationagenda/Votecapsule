// ============================================================
// VoteCapsule™ — Auth Store (Zustand)
// apps/agent-mobile/src/store/authStore.ts
// ============================================================
import { create } from 'zustand';
import { AgentUser, AuthTokens } from '../types';
import {
  saveAuthTokens,
  getAuthTokens,
  saveAgentUser,
  getAgentUser,
  clearAuthTokens,
  clearAgentUser,
  getOrCreateDeviceId,
} from '../utils/storage';
import { cognitoLogin } from '../services/api';
// jwt-decode v4 exports a named function, not a default export
import { jwtDecode } from 'jwt-decode';

// Token expiry buffer — consider the token expired 3 minutes early
// to avoid sending requests with tokens that are about to expire.
const EXPIRY_BUFFER_MS = 3 * 60 * 1000;

interface AuthState {
  user: AgentUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
  isTokenValid: () => boolean;
}

interface CognitoClaims {
  sub:            string;
  email:          string;
  name?:          string;
  'custom:userId'?:   string;
  'custom:tenantId'?: string;
  'custom:roles'?:    string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  tokens:          null,
  isAuthenticated: false,
  isLoading:       false,
  error:           null,

  /** Returns true if the stored access token is still valid (with buffer). */
  isTokenValid: () => {
    const { tokens } = get();
    if (!tokens) return false;
    return tokens.expiresAt - EXPIRY_BUFFER_MS > Date.now();
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const [tokens, user] = await Promise.all([getAuthTokens(), getAgentUser()]);
      if (tokens && user && tokens.expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
        set({ tokens, user, isAuthenticated: true });
      } else {
        // Expired or missing — clear stored credentials and show login
        await Promise.all([clearAuthTokens(), clearAgentUser()]);
      }
    } catch {
      // Storage error — just show login screen
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await cognitoLogin(email, password);
      const deviceId = await getOrCreateDeviceId();

      // Decode ID token to extract user claims
      const claims = jwtDecode<CognitoClaims>(tokens.idToken);

      let roles: string[] = [];
      try {
        roles = claims['custom:roles'] ? JSON.parse(claims['custom:roles']) : [];
      } catch {
        roles = [];
      }

      const user: AgentUser = {
        cognitoSub: claims.sub,
        userId:     claims['custom:userId'] ?? claims.sub,
        email:      claims.email,
        fullName:   claims.name ?? email,
        tenantId:   claims['custom:tenantId'] ?? '',
        deviceId,
        roles,
      };

      await Promise.all([saveAuthTokens(tokens), saveAgentUser(user)]);
      set({ tokens, user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      set({ error: msg, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await Promise.all([clearAuthTokens(), clearAgentUser()]);
    } catch {
      // Best-effort clear
    }
    set({ user: null, tokens: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
