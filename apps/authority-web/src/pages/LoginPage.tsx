import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vote, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { apiClient } from '../api/apiClient';

export function LoginPage(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [session, setSession] = useState('');

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const { data } = await apiClient.post('/identity/auth/login', { email, password });
      const result = data.data ?? data;
      if (result.challengeName === 'SOFTWARE_TOKEN_MFA') {
        setMfaRequired(true);
        setSession(result.session ?? '');
        dispatch(loginFailure(''));
        return;
      }
      const u = result.user ?? {};
      dispatch(loginSuccess({
        user: { id: u.id ?? result.userId ?? '', email: u.email ?? email, roles: Array.isArray(u.roles) ? u.roles : (result.roles ?? ['ELECTION_AUTHORITY']), tenantId: u.tenantId },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      }));
      navigate('/dashboard');
    } catch {
      dispatch(loginFailure('Invalid email or password. Please try again.'));
    }
  }, [email, password, dispatch, navigate]);

  const handleMfa = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const { data } = await apiClient.post('/identity/auth/mfa/verify', { email, mfaCode, session });
      const result = data.data ?? data;
      const u = result.user ?? {};
      dispatch(loginSuccess({
        user: { id: u.id ?? '', email: u.email ?? email, roles: Array.isArray(u.roles) ? u.roles : ['ELECTION_AUTHORITY'], tenantId: u.tenantId },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      }));
      navigate('/dashboard');
    } catch {
      dispatch(loginFailure('Invalid MFA code'));
    }
  }, [email, mfaCode, session, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-xl mb-4 shadow-lg">
            <Vote className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vote Capsule™</h1>
          <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
            Election Authority Portal
          </span>
          <p className="text-sm text-gray-500 mt-2">For Election Commission use only</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {!mfaRequired ? (
            <form onSubmit={handleLogin} noValidate>
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Sign in to your account</h2>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="vc-label">Email address</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="vc-input" placeholder="authority@example.go.ke" required autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="password" className="vc-label">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} className="vc-input pr-10"
                      placeholder="••••••••••••" required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isLoading || !email || !password} className="vc-btn-primary w-full mt-5">
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfa} noValidate>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">MFA Verification</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">Enter the 6-digit code from your authenticator app.</p>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div>
                <label htmlFor="mfaCode" className="vc-label">Authenticator Code</label>
                <input id="mfaCode" type="text" value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="vc-input text-center text-xl font-mono tracking-widest"
                  placeholder="000000" maxLength={6} required autoComplete="one-time-code" />
              </div>
              <button type="submit" disabled={isLoading || mfaCode.length !== 6} className="vc-btn-primary w-full mt-5">
                {isLoading ? 'Verifying…' : 'Verify Code'}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Vote Capsule Technologies — Authorised Personnel Only</p>
      </div>
    </div>
  );
}
