import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  tenantId?: string;
  platformAdmin?: boolean;
  wardCode?: string | null;
  constituencyCode?: string | null;
  candidateId?: string | null;
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

const storedToken   = localStorage.getItem('vc_access_token');
const storedRefresh = localStorage.getItem('vc_refresh_token');
const storedExpiry  = localStorage.getItem('vc_token_exp');
const expiryTime    = storedExpiry ? parseInt(storedExpiry, 10) : 0;
const isTokenLikelyValid = storedToken && expiryTime > Date.now();

// Clear stale token immediately to prevent auto-login → 401 → logout loop
if (storedToken && !isTokenLikelyValid) {
  localStorage.removeItem('vc_access_token');
  localStorage.removeItem('vc_token_exp');
}

const initialState: AuthState = {
  isAuthenticated: !!isTokenLikelyValid,
  user: null,
  accessToken:     isTokenLikelyValid ? storedToken  : null,
  refreshToken:    storedRefresh,
  tokenExpiresAt:  expiryTime || null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken?: string; expiresIn?: number }>) {
      const { user, accessToken, refreshToken, expiresIn } = action.payload;
      const expiresAt = Date.now() + ((expiresIn ?? 3600) * 1000);
      state.isAuthenticated = true;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken ?? state.refreshToken;
      state.tokenExpiresAt = expiresAt;
      state.isLoading = false;
      state.error = null;

      localStorage.setItem('vc_access_token', accessToken);
      localStorage.setItem('vc_token_exp', String(Date.now() + ((expiresIn ?? 3600) * 1000)));
      if (refreshToken) localStorage.setItem('vc_refresh_token', refreshToken);
      if (user.id) localStorage.setItem('vc_user_id', user.id);
      if (user.roles?.length) localStorage.setItem('vc_user_role', user.roles[0]);
    },
    tokenRefreshed(state, action: PayloadAction<{ accessToken: string; expiresIn?: number; refreshToken?: string }>) {
      const { accessToken, expiresIn, refreshToken } = action.payload;
      const expiresAt = Date.now() + ((expiresIn ?? 3600) * 1000);
      state.accessToken    = accessToken;
      state.tokenExpiresAt = expiresAt;
      if (refreshToken) state.refreshToken = refreshToken;
      localStorage.setItem('vc_access_token', accessToken);
      localStorage.setItem('vc_token_exp', String(expiresAt));
      if (refreshToken) localStorage.setItem('vc_refresh_token', refreshToken);
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user            = null;
      state.accessToken     = null;
      state.refreshToken    = null;
      state.tokenExpiresAt  = null;
      state.isLoading       = false;
      state.error           = null;
      localStorage.removeItem('vc_access_token');
      localStorage.removeItem('vc_refresh_token');
      localStorage.removeItem('vc_token_exp');
      localStorage.removeItem('vc_user_id');
      localStorage.removeItem('vc_user_role');
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, tokenRefreshed, loginFailure, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
