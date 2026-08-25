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
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('vc_access_token'),
  user: null,
  accessToken: localStorage.getItem('vc_access_token'),
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
      state.isLoading = false;
      state.error = null;
      localStorage.setItem('vc_access_token', action.payload.accessToken);
      // Store user ID so apiClient interceptor can inject x-user-id header
      if (action.payload.user.id) {
        localStorage.setItem('vc_user_id', action.payload.user.id);
      }
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      localStorage.removeItem('vc_access_token');
      localStorage.removeItem('vc_user_id');
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
