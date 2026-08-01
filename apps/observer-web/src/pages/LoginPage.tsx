import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertCircle, Lock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { apiClient } from '../api/apiClient';

export function LoginPage(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [session, setSession] = useState('');

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const { data } = await apiClient.post('/identity/auth/login', { email, password });
      const result = data.data ?? data;
      if (result.challengeName === 'SOFTWARE_TOKEN_MFA') { setMfaRequired(true); setSession(result.session ?? ''); dispatch(loginFailure('')); return; }
      dispatch(loginSuccess({ user: { id: '', email, roles: ['OBSERVER'] }, accessToken: result.accessToken }));
      navigate('/dashboard');
    } catch { dispatch(loginFailure('Invalid credentials')); }
  }, [email, password, dispatch, navigate]);

  const handleMfa = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginStart());
    try {
      const { data } = await apiClient.post('/identity/auth/mfa/verify', { email, mfaCode, session });
      dispatch(loginSuccess({ user: { id: '', email, roles: ['OBSERVER'] }, accessToken: (data.data ?? data).accessToken }));
      navigate('/dashboard');
    } catch { dispatch(loginFailure('Invalid MFA code')); }
  }, [email, mfaCode, session, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-600 rounded-xl mb-4 shadow-lg"><Eye className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Vote Capsule™</h1>
          <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-700">Observer Portal</span>
          <p className="text-sm text-gray-500 mt-2">Independent election monitoring — read-only access</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {!mfaRequired ? (
            <form onSubmit={handleLogin} noValidate>
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Observer Sign In</h2>
              {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
              <div className="space-y-4">
                <div><label className="vc-label">Email</label><input className="vc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
                <div><label className="vc-label">Password</label><input className="vc-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></div>
              </div>
              <button type="submit" disabled={isLoading || !email || !password} className="vc-btn-primary w-full mt-5">{isLoading ? 'Signing in…' : 'Sign in'}</button>
            </form>
          ) : (
            <form onSubmit={handleMfa} noValidate>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-sky-600" />MFA Verification</h2>
              {error && <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}
              <input className="vc-input text-center text-xl font-mono tracking-widest" type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6} />
              <button type="submit" disabled={isLoading || mfaCode.length !== 6} className="vc-btn-primary w-full mt-4">{isLoading ? 'Verifying…' : 'Verify'}</button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Vote Capsule Technologies — Accredited Observers Only</p>
      </div>
    </div>
  );
}
