import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  tenantId?: string;
  partyId?: string;
  firstName?: string;
  lastName?: string;
  wardCode?: string | null;
  constituencyCode?: string | null;
  candidateId?: string | null;
  platformAdmin?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  /** Convenience shortcut — mirrors user.tenantId for selectors */
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

const stored = localStorage.getItem('vc_party_token');
const storedRefresh = localStorage.getItem('vc_party_refresh');
const storedUser = localStorage.getItem('vc_party_user');
const storedExpiry = localStorage.getItem('vc_party_token_exp');
const parsedUser: AuthUser | null = storedUser ? (() => { try { return JSON.parse(storedUser); } catch { return null; } })() : null;

const expiryTime = storedExpiry ? parseInt(storedExpiry, 10) : 0;
const isTokenLikelyValid = stored && expiryTime > Date.now();

// Clear stale token immediately
if (stored && !isTokenLikelyValid) {
  localStorage.removeItem('vc_party_token');
  localStorage.removeItem('vc_party_token_exp');
}

const initialState: AuthState = {
  isAuthenticated: !!isTokenLikelyValid,
  user: isTokenLikelyValid ? parsedUser : null,
  accessToken: isTokenLikelyValid ? stored : null,
  refreshToken: storedRefresh,
  tokenExpiresAt: expiryTime || null,
  tenantId: parsedUser?.tenantId ?? null,
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
      state.tenantId = user.tenantId ?? null;
      state.isLoading = false;
      state.error = null;

      localStorage.setItem('vc_party_token', accessToken);
      localStorage.setItem('vc_party_user', JSON.stringify(user));
      localStorage.setItem('vc_party_token_exp', String(expiresAt));
      if (refreshToken) localStorage.setItem('vc_party_refresh', refreshToken);
    },
    tokenRefreshed(state, action: PayloadAction<{ accessToken: string; expiresIn?: number; refreshToken?: string }>) {
      const { accessToken, expiresIn, refreshToken } = action.payload;
      const expiresAt = Date.now() + ((expiresIn ?? 3600) * 1000);
      state.accessToken = accessToken;
      state.tokenExpiresAt = expiresAt;
      if (refreshToken) state.refreshToken = refreshToken;
      localStorage.setItem('vc_party_token', accessToken);
      localStorage.setItem('vc_party_token_exp', String(expiresAt));
      if (refreshToken) localStorage.setItem('vc_party_refresh', refreshToken);
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
      state.tenantId = null;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem('vc_party_token');
      localStorage.removeItem('vc_party_refresh');
      localStorage.removeItem('vc_party_user');
      localStorage.removeItem('vc_party_token_exp');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, tokenRefreshed } = authSlice.actions;
export default authSlice.reducer;
