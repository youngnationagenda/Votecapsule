// ============================================================
// VoteCapsule -- Validator Auth Store (Zustand)
// apps/validator-mobile/src/store/authStore.ts
// ============================================================
import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { ValidatorUser, AuthTokens } from '../types';
import { cognitoLogin, getStoredTokens, saveTokens, clearTokens } from '../services/api';

interface AuthState {
  user: ValidatorUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

interface CognitoClaims {
  sub: string;
  email: string;
  name?: string;
  'custom:userId'?: string;
  'custom:tenantId'?: string;
  'custom:roles'?: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const tokens = await getStoredTokens();
      if (tokens && tokens.expiresAt > Date.now()) {
        const claims = jwtDecode<CognitoClaims>(tokens.idToken);
        const roles: string[] = claims['custom:roles']
          ? JSON.parse(claims['custom:roles'])
          : [];

        // Enforce VALIDATOR role access
        const hasAccess =
          roles.includes('VALIDATOR') || roles.includes('PLATFORM_SUPER_ADMIN');

        if (!hasAccess) {
          await clearTokens();
          set({ error: 'Access denied. Validator role required.', isLoading: false });
          return;
        }

        const user: ValidatorUser = {
          cognitoSub: claims.sub,
          userId: claims['custom:userId'] ?? claims.sub,
          email: claims.email,
          fullName: claims.name ?? claims.email,
          tenantId: claims['custom:tenantId'] ?? '',
          roles,
        };
        set({ tokens, user, isAuthenticated: true });
      } else if (tokens) {
        // Token expired -- clear and show login
        await clearTokens();
      }
    } catch {
      // Storage error -- show login
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await cognitoLogin(email, password);
      const claims = jwtDecode<CognitoClaims>(tokens.idToken);
      const roles: string[] = claims['custom:roles']
        ? JSON.parse(claims['custom:roles'])
        : [];

      // Enforce role check
      const hasAccess =
        roles.includes('VALIDATOR') || roles.includes('PLATFORM_SUPER_ADMIN');

      if (!hasAccess) {
        set({
          error: 'Access denied. Your account does not have the Validator role.',
          isLoading: false,
        });
        return;
      }

      const user: ValidatorUser = {
        cognitoSub: claims.sub,
        userId: claims['custom:userId'] ?? claims.sub,
        email: claims.email,
        fullName: claims.name ?? email,
        tenantId: claims['custom:tenantId'] ?? '',
        roles,
      };

      await saveTokens(tokens);
      set({ tokens, user, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ error: msg, isLoading: false });
    }
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
