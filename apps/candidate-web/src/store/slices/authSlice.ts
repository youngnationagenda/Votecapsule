import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export interface AuthUser { id: string; email: string; roles: string[]; candidateId?: string; position?: string; countyCode?: string; constituencyCode?: string; }
export interface AuthState { isAuthenticated: boolean; user: AuthUser | null; accessToken: string | null; isLoading: boolean; error: string | null; }
const stored = localStorage.getItem('vc_candidate_token');
const storedUser = localStorage.getItem('vc_candidate_user');
const initialState: AuthState = { isAuthenticated: !!stored, user: storedUser ? JSON.parse(storedUser) : null, accessToken: stored, isLoading: false, error: null };
const authSlice = createSlice({ name: 'auth', initialState, reducers: {
  loginStart(state) { state.isLoading = true; state.error = null; },
  loginSuccess(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) { state.isAuthenticated = true; state.user = action.payload.user; state.accessToken = action.payload.accessToken; state.isLoading = false; state.error = null; localStorage.setItem('vc_candidate_token', action.payload.accessToken); localStorage.setItem('vc_candidate_user', JSON.stringify(action.payload.user)); },
  loginFailure(state, action: PayloadAction<string>) { state.isLoading = false; state.error = action.payload; state.isAuthenticated = false; },
  logout(state) { state.isAuthenticated = false; state.user = null; state.accessToken = null; state.isLoading = false; state.error = null; localStorage.removeItem('vc_candidate_token'); localStorage.removeItem('vc_candidate_user'); },
}});
export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
