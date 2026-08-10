/**
 * Vote Capsule™ Admin Portal — Trust Ledger Monitor Page
 *
 * IMPORTANT:
 * - NEVER say "blockchain", "QLDB", or "Amazon QLDB" in any user-facing text
 * - Always say "Integrity Verified", "Trust Anchor", or "Hybrid Anchor"
 * - The trust layer is Hedera Consensus Service (Testnet) + RFC 3161 (FreeTSA) + SHA-256
 * - User-facing language: "Integrity Verified" — nothing more technical than that
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, CheckCircle2, Search, Shield, Hash, RefreshCw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { trustApi, type VerificationResult, type TrustStats } from '../api/trustApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function TrustLedgerPageContent(): React.JSX.Element {
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | 'not_found' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Anchor stats from Trust Service — returns counts object, NOT an array
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<TrustStats>({
    queryKey: ['trust-stats'],
    queryFn: trustApi.getStats,
    refetchInterval: 30_000,
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

  const totalAnchors = stats?.totalLeaves ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Trust Ledger Monitor</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cryptographic integrity anchoring — Hybrid Anchor (Hedera Consensus + RFC 3161 Timestamp)
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          Integrity Verified
        </span>
      </div>

      {/* Anchor Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Anchor Method</span>
            <Lock className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-sm font-medium text-gray-900">Hybrid Anchor</p>
          <p className="text-xs text-gray-400 mt-0.5">Hedera + RFC 3161</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Batches</span>
            <RefreshCw className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '—' : (stats?.totalBatches ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Merkle tree batches</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Anchored</span>
            <Shield className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '—' : totalAnchors.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Evidence capsules</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Dual-Anchored</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {statsLoading ? '—' : (stats?.dualAnchored ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Hedera + RFC 3161</p>
        </div>
      </div>

      {/* Anchor Stats Detail */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Anchor Infrastructure</h3>
            <button
              onClick={() => void refetchStats()}
              className="text-xs text-[#2563EB] hover:text-[#0B3C6D] flex items-center gap-1 transition-colors"
              disabled={statsLoading}
            >
              <RefreshCw className={clsx('w-3 h-3', statsLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hedera Network</p>
              <p className="font-mono font-medium text-gray-900">{stats.hederaNetwork || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">RFC 3161 TSA</p>
              <p className="font-mono font-medium text-gray-900 truncate text-xs">{stats.tsaUrl || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Pending Queue</p>
              <p className="font-mono font-medium text-gray-900">{stats.pendingQueue}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Partial Anchored</p>
              <p className="font-mono font-medium text-amber-700">{stats.partialAnchored}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Batch Interval</p>
              <p className="font-mono font-medium text-gray-900">60 seconds</p>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Integrity Verification Tool */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Evidence Integrity Verification</h3>
          <p className="text-xs text-gray-500 mt-1">
            Enter a Capsule ID (UUID) or SHA-256 hash to verify its integrity proof.
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
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-800">Integrity Verified</p>
                    <p className="text-xs text-emerald-700">
                      This evidence capsule has been cryptographically verified.
                      SHA-256 hash matches the anchored record.
                    </p>
                    {(verificationResult as VerificationResult).anchoredAt && (
                      <p className="text-xs text-emerald-600 font-mono">
                        Anchored: {new Date((verificationResult as VerificationResult).anchoredAt!).toLocaleString()}
                      </p>
                    )}
                    {(verificationResult as VerificationResult).hedera?.transactionId && (
                      <p className="text-xs text-emerald-600 font-mono">
                        Hedera Tx: {(verificationResult as VerificationResult).hedera!.transactionId}
                      </p>
                    )}
                    {(verificationResult as VerificationResult).rfc3161?.signingTime && (
                      <p className="text-xs text-emerald-600">
                        RFC 3161: {new Date((verificationResult as VerificationResult).rfc3161!.signingTime!).toLocaleString()}
                      </p>
                    )}
                    {(verificationResult as VerificationResult).sha256Hash && (
                      <div className="flex gap-1 items-start text-xs text-emerald-600 mt-1">
                        <Hash className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="font-mono break-all">
                          {(verificationResult as VerificationResult).sha256Hash.slice(0, 32)}…
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Not Found in Trust Record</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      No integrity record found for this Capsule ID or hash.
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

      {/* Anchor Batch Summary */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Anchor Batch Summary</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Each batch anchors multiple capsules via a Merkle tree to Hedera Consensus Service + RFC 3161 TSA.
            Use the verification tool below to inspect individual capsule proofs.
          </p>
        </div>
        {statsLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Total Batches Processed', value: (stats?.totalBatches ?? 0).toLocaleString(), color: 'text-gray-900' },
              { label: 'Dual-Anchored Batches (Hedera + RFC 3161)', value: (stats?.dualAnchored ?? 0).toLocaleString(), color: 'text-emerald-700' },
              { label: 'Partial-Anchored Batches (one method only)', value: (stats?.partialAnchored ?? 0).toLocaleString(), color: 'text-amber-700' },
              { label: 'Total Capsules Anchored (Merkle leaves)', value: (stats?.totalLeaves ?? 0).toLocaleString(), color: 'text-gray-900' },
              { label: 'Capsules Pending in Queue', value: (stats?.pendingQueue ?? 0).toLocaleString(), color: 'text-gray-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={clsx('text-sm font-bold font-mono', color)}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust Architecture Explainer */}
      <div className="bg-[#0B3C6D]/5 border border-[#0B3C6D]/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[#0B3C6D] mb-1">About Integrity Verification</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Vote Capsule™ uses a <strong>Hybrid Anchor</strong> approach: evidence capsules are batched into a Merkle tree
          every 60 seconds. The Merkle root is published to <strong>Hedera Consensus Service</strong> (creating a
          publicly-auditable timestamped record) and signed with an <strong>RFC 3161 timestamp authority</strong>
          (providing a legally-recognised timestamp). Each individual capsule can be verified by its position
          in the Merkle tree — without exposing other capsules' data.
          SHA-256 formula: <code className="font-mono bg-white/50 px-1 rounded">SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)</code>
        </p>
      </div>
    </div>
  );
}

export function TrustLedgerPage() {
  return (
    <PageErrorBoundary page="Trust Ledger">
      <TrustLedgerPageContent />
    </PageErrorBoundary>
  );
}
