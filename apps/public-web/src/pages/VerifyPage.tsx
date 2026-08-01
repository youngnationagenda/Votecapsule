import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Search,
  Clock,
  Hash,
  Link as LinkIcon,
  FileCheck,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { verifyCapsule } from '../lib/api';
import { VerificationBadge } from '../components/VerificationBadge';

export function VerifyPage() {
  const { capsuleId: paramCapsuleId } = useParams<{ capsuleId: string }>();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState(paramCapsuleId ?? '');
  const [submittedId, setSubmittedId] = useState(paramCapsuleId ?? '');

  useEffect(() => {
    if (paramCapsuleId) {
      setInputValue(paramCapsuleId);
      setSubmittedId(paramCapsuleId);
    }
  }, [paramCapsuleId]);

  const { data: proof, isLoading, error, isFetched } = useQuery({
    queryKey: ['verify', submittedId],
    queryFn: () => verifyCapsule(submittedId),
    enabled: !!submittedId && submittedId.length >= 8,
    retry: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setSubmittedId(trimmed);
      navigate(`/verify/${trimmed}`, { replace: true });
    }
  };

  return (
    <div className="container-narrow py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10">
          <Shield className="h-8 w-8 text-brand-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-neutral-900">Verify Evidence Integrity</h1>
        <p className="mx-auto mt-2 max-w-lg text-neutral-500">
          Enter a Capsule ID to independently verify its cryptographic proofs. Each evidence
          capsule is anchored with SHA-256 hashes, Hedera consensus timestamps, and RFC 3161 time-stamping.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-xl">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter Capsule ID (UUID)..."
              className="w-full rounded-lg border border-neutral-300 bg-white py-3 pl-10 pr-4 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              aria-label="Capsule ID for verification"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="shrink-0 rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      </form>

      {/* Loading State */}
      {isLoading && (
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
            <p className="mt-4 text-sm text-neutral-500">Verifying integrity...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && isFetched && (
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="flex flex-col items-center rounded-xl border border-semantic-error/30 bg-semantic-error-light p-8 text-center">
            <AlertCircle className="h-12 w-12 text-semantic-error" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-semantic-error-dark">
              Verification Failed
            </h2>
            <p className="mt-2 text-sm text-semantic-error-dark/80">
              Unable to verify capsule "{submittedId}". The capsule ID may be invalid or the
              evidence has not been published.
            </p>
          </div>
        </div>
      )}

      {/* Success: Verification Proof */}
      {proof && (
        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <VerificationBadge status={proof.status} size="lg" />
          </div>

          {/* Capsule Summary */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Capsule Details</h2>
            <dl className="mt-4 space-y-3">
              <ProofRow
                icon={Hash}
                label="Capsule ID"
                value={proof.capsuleId}
                mono
              />
              <ProofRow
                icon={FileCheck}
                label="SHA-256 Hash"
                value={proof.sha256Hash}
                mono
              />
            </dl>
          </div>

          {/* Anchoring Proofs */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Integrity Anchors</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Independent cryptographic anchors that prove this evidence has not been tampered with.
            </p>
            <dl className="mt-4 space-y-3">
              <ProofRow
                icon={LinkIcon}
                label="Hedera Transaction ID"
                value={proof.hederaTransactionId ?? 'Pending'}
                mono={!!proof.hederaTransactionId}
              />
              <ProofRow
                icon={Clock}
                label="Hedera Consensus Timestamp"
                value={proof.hederaConsensusTimestamp ?? 'Pending'}
                mono={!!proof.hederaConsensusTimestamp}
              />
              <ProofRow
                icon={Clock}
                label="RFC 3161 Timestamp"
                value={proof.rfc3161Timestamp ?? 'Pending'}
                mono={!!proof.rfc3161Timestamp}
              />
              <ProofRow
                icon={Shield}
                label="RFC 3161 TSA"
                value={proof.rfc3161Tsa ?? 'Pending'}
              />
              <ProofRow
                icon={GitBranch}
                label="Merkle Root"
                value={proof.merkleRoot ?? 'Not yet computed'}
                mono={!!proof.merkleRoot}
              />
            </dl>

            {/* Merkle Proof Path */}
            {proof.merkleProofPath && proof.merkleProofPath.length > 0 && (
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <h3 className="text-sm font-medium text-neutral-700">Merkle Proof Path</h3>
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-neutral-50 p-3">
                  {proof.merkleProofPath.map((node, idx) => (
                    <p key={idx} className="font-mono text-xs text-neutral-600">
                      [{idx}] {node}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chain of Custody */}
          {proof.chainOfCustody && proof.chainOfCustody.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">Chain of Custody</h2>
              <p className="mt-1 text-xs text-neutral-400">
                Timeline of actions performed on this evidence capsule.
              </p>
              <div className="mt-4 space-y-0">
                {proof.chainOfCustody.map((event, idx) => (
                  <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Timeline line */}
                    {idx < proof.chainOfCustody.length - 1 && (
                      <div className="absolute left-[11px] top-6 h-full w-0.5 bg-neutral-200" />
                    )}
                    {/* Dot */}
                    <div className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-brand-primary bg-white" />
                    {/* Content */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{event.action}</p>
                      <p className="text-xs text-neutral-500">
                        {event.actor} &mdash;{' '}
                        {new Date(event.timestamp).toLocaleString('en-KE')}
                      </p>
                      {event.details && (
                        <p className="mt-0.5 text-xs text-neutral-400">{event.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified At */}
          {proof.verifiedAt && (
            <p className="text-center text-xs text-neutral-400">
              Verified at: {new Date(proof.verifiedAt).toLocaleString('en-KE')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProofRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-neutral-500">{label}</dt>
        <dd
          className={`mt-0.5 break-all text-sm text-neutral-900 ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
