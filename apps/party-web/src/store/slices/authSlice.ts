import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  tenantId?: string;
  partyId?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  /** Convenience shortcut — mirrors user.tenantId for selectors */
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
}

const stored = localStorage.getItem('vc_party_token');
const storedUser = localStorage.getItem('vc_party_user');
const parsedUser: AuthUser | null = storedUser ? (() => { try { return JSON.parse(storedUser); } catch { return null; } })() : null;

const initialState: AuthState = {
  isAuthenticated: !!stored,
  user: parsedUser,
  accessToken: stored,
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
    loginSuccess(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.tenantId = action.payload.user.tenantId ?? null;
      state.isLoading = false;
      state.error = null;
      localStorage.setItem('vc_party_token', action.payload.accessToken);
      localStorage.setItem('vc_party_user', JSON.stringify(action.payload.user));
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
      state.tenantId = null;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem('vc_party_token');
      localStorage.removeItem('vc_party_user');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
