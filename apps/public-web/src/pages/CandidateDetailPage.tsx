import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, MapPin, Award } from 'lucide-react';
import { getCandidateById } from '../lib/api';

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: candidate, isLoading, error } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => getCandidateById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container-narrow py-8">
        <div className="h-64 animate-pulse rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="container-narrow py-8">
        <Link
          to="/candidates"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All Candidates
        </Link>
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load candidate details. The candidate may not exist or the service is unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-8">
      <Link
        to="/candidates"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All Candidates
      </Link>

      <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          {/* Photo / Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.fullName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-brand-primary" aria-hidden="true" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900">{candidate.fullName}</h1>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Award className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                <span className="font-medium">Position:</span>
                <span>{candidate.positionName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                <span className="font-medium">Area:</span>
                <span>{candidate.geographyName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <User className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                <span className="font-medium">Party:</span>
                <span>
                  {candidate.partyName}{' '}
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                    {candidate.partyAbbreviation}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results link */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Election Results</h2>
        <p className="mt-1 text-sm text-neutral-500">
          View published results for this candidate's race.
        </p>
        <Link
          to="/results"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primary-dark"
        >
          View Results
          <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
