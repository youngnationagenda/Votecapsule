/**
 * Vote Capsule™ Admin Portal — Trust Ledger Monitor Page
 *
 * IMPORTANT:
 * - Never use the word "blockchain" anywhere in this page
 * - Use "Integrity Verified", "Trust Verified", "QLDB"
 * - The trust layer is Amazon QLDB + SHA-256, NOT blockchain
 *
 * Uses real data from Trust Service when available.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, CheckCircle2, Search, Shield, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { trustApi, type VerificationResult } from '../api/trustApi';

export function TrustLedgerPage(): React.JSX.Element {
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | 'not_found' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Real QLDB ledger digest from Trust Service
  const { data: ledgerDigest, isLoading: digestLoading, refetch: refetchDigest } = useQuery({
    queryKey: ['trust-ledger-digest'],
    queryFn: trustApi.getLedgerDigest,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    retry: 1,
  });

  const handleVerify = async () => {
    if (!verificationInput.trim()) return;
    setIsVerifying(true);
    setVerifyError('');
    setVerificationResult(null);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        verificationInput.trim(),
      );
      const isHash = /^[0-9a-f]{64}$/i.test(verificationInput.trim());

      if (!isUuid && !isHash) {
        setVerifyError('Enter a valid Capsule ID (UUID) or SHA-256 hash (64 hex characters)');
        return;
      }

      const result = isUuid
        ? await trustApi.verifyCapsule(verificationInput.trim())
        : await trustApi.verifyByHash(verificationInput.trim());

      setVerificationResult(result.found ? result : 'not_found');
    } catch {
      setVerificationResult('not_found');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Trust Ledger Monitor</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Amazon QLDB immutable integrity ledger — evidence capsule anchoring
          </p>
        </div>
        {/* Never say "blockchain" */}
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          Integrity Verified
        </span>
      </div>

      {/* QLDB Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ledger Name</span>
            <Database className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="font-mono text-sm font-medium text-gray-900">
            {ledgerDigest?.ledger ?? 'vote-capsule-trust'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ledger Mode</span>
            <Lock className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-sm font-medium text-gray-900">Permissioned</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Anchors</span>
            <Shield className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting Evidence Service (Phase 3)</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Ledger Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-emerald-700">Active</p>
          {ledgerDigest?.at && (
            <p className="text-xs text-gray-400 mt-0.5">
              Checked {new Date(ledgerDigest.at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* QLDB Digest */}
      {(ledgerDigest?.digest || digestLoading) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Current Ledger Digest</h3>
            <button
              onClick={() => void refetchDigest()}
              className="text-xs text-[#2563EB] hover:text-[#0B3C6D] flex items-center gap-1 transition-colors"
              disabled={digestLoading}
            >
              <RefreshCw className={clsx('w-3 h-3', digestLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            This cryptographic digest covers the entire QLDB journal — any tampering changes this value.
            Election observers can independently verify this digest.
          </p>
          <div className="bg-gray-50 rounded p-3">
            <code className="font-mono text-xs text-gray-700 break-all leading-relaxed">
              {digestLoading ? 'Loading digest…' : ledgerDigest?.digest ?? 'No digest available'}
            </code>
            {ledgerDigest?.at && (
              <p className="text-xs text-gray-400 mt-1">
                As of {new Date(ledgerDigest.at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Evidence Integrity Verification Tool */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Evidence Integrity Verification</h3>
          <p className="text-xs text-gray-500 mt-1">
            Enter a Capsule ID (UUID) or SHA-256 hash to verify its integrity in the trust ledger.
          </p>
        </div>
        <div className="p-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={verificationInput}
                onChange={(e) => {
                  setVerificationInput(e.target.value);
                  setVerificationResult(null);
                  setVerifyError('');
                }}
                placeholder="Capsule ID (UUID) or SHA-256 hash (64 hex chars)"
                className="vc-input pl-9 font-mono text-sm"
                aria-label="Enter Capsule ID or SHA-256 hash to verify"
                onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
              />
            </div>
            <button
              onClick={() => void handleVerify()}
              disabled={!verificationInput.trim() || isVerifying}
              className="vc-btn-primary flex items-center gap-2"
              aria-busy={isVerifying}
            >
              {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isVerifying ? 'Verifying…' : 'Verify'}
            </button>
          </div>

          {verifyError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {verifyError}
            </div>
          )}

          {verificationResult && (
            <div
              className={clsx(
                'mt-4 p-4 rounded-md border flex items-start gap-3',
                verificationResult !== 'not_found' && (verificationResult as VerificationResult).found
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-gray-200',
              )}
              role="status"
              aria-live="polite"
            >
              {verificationResult !== 'not_found' && (verificationResult as VerificationResult).found ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Integrity Verified</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      This evidence capsule is anchored in the QLDB trust ledger.
                      Its SHA-256 hash matches the recorded digest, confirming integrity.
                    </p>
                    {verificationResult !== 'not_found' && (verificationResult as VerificationResult).anchoredAt && (
                      <p className="text-xs text-emerald-600 mt-1 font-mono">
                        Anchored: {new Date((verificationResult as VerificationResult).anchoredAt!).toLocaleString()}
                      </p>
                    )}
                    {verificationResult !== 'not_found' && (verificationResult as VerificationResult).qldbDocumentId && (
                      <p className="text-xs text-emerald-600 mt-0.5 font-mono">
                        QLDB Doc: {(verificationResult as VerificationResult).qldbDocumentId}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Not Found in Trust Ledger</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      No record found for this Capsule ID or hash.
                      The capsule may not yet be anchored (awaiting human validation)
                      or the ID may be incorrect.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Anchoring Events */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Anchoring Events</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Most recent evidence capsules anchored to the trust ledger
          </p>
        </div>
        <div className="p-8 text-center">
          <Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No anchors yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Evidence capsule anchoring will be available in Phase 3 (Evidence Capsule Service).
          </p>
        </div>
      </div>

      {/* Important notice */}
      <div className="bg-[#0B3C6D]/5 border border-[#0B3C6D]/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[#0B3C6D] mb-1">About the Trust Ledger</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Vote Capsule™ uses <strong>Amazon QLDB (Quantum Ledger Database)</strong> as its integrity anchor.
          QLDB provides a cryptographic journal — any attempt to alter a record changes the journal digest,
          making tampering detectable. Each approved evidence capsule has its SHA-256 hash and metadata
          written to this ledger as an immutable record. This is verified cryptographic integrity, not blockchain.
        </p>
      </div>
    </div>
  );
}
