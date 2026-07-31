/**
 * Vote Capsule™ Super Admin Portal — Login Page
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { identityClient } from '../api/apiClient';

export function LoginPage(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [session, setSession] = useState('');

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(loginStart());

      try {
        const { data } = await identityClient.post('/auth/login', { email, password });
        const result = data.data ?? data;

        if (result.challengeName === 'SOFTWARE_TOKEN_MFA') {
          setMfaRequired(true);
          setSession(result.session ?? '');
          dispatch(loginFailure(''));
          return;
        }

        dispatch(loginSuccess({
          user: { id: '', email, roles: ['PLATFORM_SUPER_ADMIN'] },
          accessToken: result.accessToken,
        }));
        navigate('/dashboard');
      } catch {
        dispatch(loginFailure('Invalid email or password'));
      }
    },
    [email, password, dispatch, navigate],
  );

  const handleMfaVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(loginStart());

      try {
        const { data } = await identityClient.post('/auth/mfa/verify', {
          email, mfaCode, session,
        });
        const result = data.data ?? data;

        dispatch(loginSuccess({
          user: { id: '', email, roles: ['PLATFORM_SUPER_ADMIN'] },
          accessToken: result.accessToken,
        }));
        navigate('/dashboard');
      } catch {
        dispatch(loginFailure('Invalid MFA code'));
      }
    },
    [email, mfaCode, session, dispatch, navigate],
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0B3C6D] rounded-xl mb-4">
            <Lock className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vote Capsule™</h1>
          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-xs font-semibold tracking-wide text-white bg-[#0B3C6D]">
            Platform
          </span>
          <p className="text-sm text-gray-500 mt-2">Super Admin Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {!mfaRequired ? (
            <form onSubmit={handleLogin} noValidate>
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Sign in to your account</h2>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="vc-label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="vc-input"
                    placeholder="admin@votecapsule.co.ke"
                    required
                    autoComplete="email"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="vc-label">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="vc-input pr-10"
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="vc-btn-primary w-full mt-5"
                aria-busy={isLoading}
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} noValidate>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">MFA Verification</h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter the 6-digit code from your authenticator app.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="mfaCode" className="vc-label">Authenticator Code</label>
                <input
                  id="mfaCode"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="vc-input text-center text-xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="vc-btn-primary w-full mt-5"
              >
                {isLoading ? 'Verifying…' : 'Verify Code'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vote Capsule Technologies — Confidential Platform
        </p>
      </div>
    </div>
  );
}
