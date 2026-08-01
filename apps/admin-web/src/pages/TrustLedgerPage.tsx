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
import { Lock, CheckCircle2, Search, Shield, Hash, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { trustApi, type VerificationResult, type TrustAnchorBatch } from '../api/trustApi';

export function TrustLedgerPage(): React.JSX.Element {
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | 'not_found' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Recent anchor batches from Trust Service
  const { data: batches, isLoading: batchesLoading, refetch: refetchBatches } = useQuery<TrustAnchorBatch[]>({
    queryKey: ['trust-anchor-batches'],
    queryFn: trustApi.getBatches,
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

  const totalAnchors = batches?.reduce((sum, b) => sum + (b.leafCount ?? 0), 0) ?? 0;
  const latestBatch = batches?.[0] ?? null;

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
            <span className="text-sm text-gray-500">Batch Interval</span>
            <RefreshCw className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-sm font-medium text-gray-900">60 seconds</p>
          <p className="text-xs text-gray-400 mt-0.5">Merkle tree batching</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Anchored</span>
            <Shield className="w-4 h-4 text-[#0B3C6D]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalAnchors.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Evidence capsules</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Anchor Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-emerald-700">Active</p>
          {latestBatch?.anchoredAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last: {new Date(latestBatch.anchoredAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Latest Batch Merkle Root */}
      {latestBatch && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Latest Merkle Root</h3>
            <button
              onClick={() => void refetchBatches()}
              className="text-xs text-[#2563EB] hover:text-[#0B3C6D] flex items-center gap-1 transition-colors"
              disabled={batchesLoading}
            >
              <RefreshCw className={clsx('w-3 h-3', batchesLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Every approved capsule is included in a Merkle tree — this root represents all anchored evidence.
            Independently verifiable via Hedera HashScan.
          </p>
          <div className="bg-gray-50 rounded p-3 space-y-2">
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 flex-shrink-0">Merkle Root:</span>
              <code className="font-mono text-gray-700 break-all leading-relaxed">
                {latestBatch.merkleRoot}
              </code>
            </div>
            {latestBatch.hederaTransactionId && (
              <div className="flex gap-2 items-center text-xs">
                <span className="text-gray-500 flex-shrink-0">Hedera Tx:</span>
                <code className="font-mono text-gray-700">{latestBatch.hederaTransactionId}</code>
                {latestBatch.hederaExplorerUrl && (
                  <a
                    href={latestBatch.hederaExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] hover:underline flex items-center gap-0.5 ml-1"
                    aria-label="View on HashScan"
                  >
                    HashScan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
            {latestBatch.rfc3161SigningTime && (
              <div className="flex gap-2 text-xs">
                <span className="text-gray-500 flex-shrink-0">RFC 3161 Timestamp:</span>
                <span className="text-gray-700">{new Date(latestBatch.rfc3161SigningTime).toLocaleString()}</span>
              </div>
            )}
            {latestBatch.anchoredAt && (
              <p className="text-xs text-gray-400">
                Batch anchored {new Date(latestBatch.anchoredAt).toLocaleString()} ·{' '}
                {latestBatch.leafCount} capsule{latestBatch.leafCount !== 1 ? 's' : ''}
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

      {/* Recent Anchor Batches */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Anchor Batches</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Each batch anchors multiple capsules via a Merkle tree to Hedera Consensus Service + RFC 3161 TSA
          </p>
        </div>
        {batchesLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading batches…</div>
        ) : !batches || batches.length === 0 ? (
          <div className="p-8 text-center">
            <Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No anchor batches yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Anchor batches are created every 60 seconds when approved capsules are queued.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {batches.slice(0, 10).map((batch) => (
              <div key={batch.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                      batch.status === 'ANCHORED' ? 'bg-emerald-100 text-emerald-700' :
                      batch.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600',
                    )}>
                      {batch.status === 'ANCHORED' && <CheckCircle2 className="w-3 h-3" />}
                      {batch.status}
                    </span>
                    <span className="text-xs text-gray-500">{batch.leafCount} capsule{batch.leafCount !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="font-mono text-xs text-gray-500 truncate mt-0.5">
                    Root: {batch.merkleRoot.slice(0, 24)}…
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    {batch.anchoredAt
                      ? new Date(batch.anchoredAt).toLocaleString()
                      : new Date(batch.batchedAt).toLocaleString()}
                  </p>
                  {batch.hederaExplorerUrl && (
                    <a
                      href={batch.hederaExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2563EB] hover:underline flex items-center gap-0.5 justify-end mt-0.5"
                    >
                      HashScan <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
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
