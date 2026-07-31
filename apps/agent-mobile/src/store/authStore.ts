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
import jwtDecode from 'jwt-decode';

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
}

interface CognitoClaims {
  sub:            string;
  email:          string;
  name?:          string;
  'custom:userId'?:   string;
  'custom:tenantId'?: string;
  'custom:roles'?:    string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  tokens:          null,
  isAuthenticated: false,
  isLoading:       false,
  error:           null,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const [tokens, user] = await Promise.all([getAuthTokens(), getAgentUser()]);
      if (tokens && user && tokens.expiresAt > Date.now()) {
        set({ tokens, user, isAuthenticated: true });
      } else {
        // Expired or missing — clear and show login
        await Promise.all([clearAuthTokens(), clearAgentUser()]);
      }
    } catch {
      // Storage error — just show login
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
      const user: AgentUser = {
        cognitoSub: claims.sub,
        userId:     claims['custom:userId'] ?? claims.sub,
        email:      claims.email,
        fullName:   claims.name ?? email,
        tenantId:   claims['custom:tenantId'] ?? '',
        deviceId,
        roles:      claims['custom:roles']
          ? JSON.parse(claims['custom:roles'])
          : [],
      };

      await Promise.all([saveAuthTokens(tokens), saveAgentUser(user)]);
      set({ tokens, user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ error: msg, isLoading: false });
    }
  },

  logout: async () => {
    await Promise.all([clearAuthTokens(), clearAgentUser()]);
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
