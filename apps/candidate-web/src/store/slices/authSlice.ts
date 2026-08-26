import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  tenantId?: string;
  candidateId?: string;
  position?: string;
  countyCode?: string;
  constituencyCode?: string;
  wardCode?: string | null;
  platformAdmin?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

const stored = localStorage.getItem('vc_candidate_token');
const storedRefresh = localStorage.getItem('vc_candidate_refresh');
const storedUser = localStorage.getItem('vc_candidate_user');
const storedExpiry = localStorage.getItem('vc_candidate_token_exp');

// Check if stored token is likely expired (prevents stale auto-login)
const expiryTime = storedExpiry ? parseInt(storedExpiry, 10) : 0;
const isTokenLikelyValid = stored && expiryTime > Date.now();

const initialState: AuthState = {
  isAuthenticated: !!isTokenLikelyValid,
  user: isTokenLikelyValid && storedUser ? JSON.parse(storedUser) : null,
  accessToken: isTokenLikelyValid ? stored : null,
  refreshToken: storedRefresh,
  tokenExpiresAt: expiryTime || null,
  isLoading: false,
  error: null,
};

// If we have a stored token that expired, clear it immediately
if (stored && !isTokenLikelyValid) {
  localStorage.removeItem('vc_candidate_token');
  localStorage.removeItem('vc_candidate_token_exp');
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },

    loginSuccess(state, action: PayloadAction<{
      user: AuthUser;
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    }>) {
      const { user, accessToken, refreshToken, expiresIn } = action.payload;
      const expiresAt = Date.now() + ((expiresIn ?? 3600) * 1000);

      state.isAuthenticated = true;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken ?? state.refreshToken;
      state.tokenExpiresAt = expiresAt;
      state.isLoading = false;
      state.error = null;

      localStorage.setItem('vc_candidate_token', accessToken);
      localStorage.setItem('vc_candidate_user', JSON.stringify(user));
      localStorage.setItem('vc_candidate_token_exp', String(expiresAt));
      if (refreshToken) {
        localStorage.setItem('vc_candidate_refresh', refreshToken);
      }
    },

    tokenRefreshed(state, action: PayloadAction<{
      accessToken: string;
      expiresIn?: number;
      refreshToken?: string;
    }>) {
      const { accessToken, expiresIn, refreshToken } = action.payload;
      const expiresAt = Date.now() + ((expiresIn ?? 3600) * 1000);

      state.accessToken = accessToken;
      state.tokenExpiresAt = expiresAt;
      if (refreshToken) state.refreshToken = refreshToken;

      localStorage.setItem('vc_candidate_token', accessToken);
      localStorage.setItem('vc_candidate_token_exp', String(expiresAt));
      if (refreshToken) localStorage.setItem('vc_candidate_refresh', refreshToken);
    },

    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },

    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenExpiresAt = null;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem('vc_candidate_token');
      localStorage.removeItem('vc_candidate_refresh');
      localStorage.removeItem('vc_candidate_user');
      localStorage.removeItem('vc_candidate_token_exp');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, tokenRefreshed } = authSlice.actions;
export default authSlice.reducer;
