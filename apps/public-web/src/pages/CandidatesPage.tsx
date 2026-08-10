import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, User, ChevronRight } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { getCandidates } from '../lib/api';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function CandidatesPageContent() {
  const [search, setSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ['candidates', search, partyFilter, positionFilter],
    queryFn: () =>
      getCandidates({
        search: search || undefined,
        party: partyFilter || undefined,
        position: positionFilter || undefined,
      }),
  });

  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Candidates</h1>
        <p className="mt-2 text-neutral-500">
          Browse registered candidates. Filter by party, position, or search by name.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SearchInput
          placeholder="Search candidates..."
          onSearch={setSearch}
          ariaLabel="Search candidates by name"
        />
        <input
          type="text"
          placeholder="Filter by party..."
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          aria-label="Filter by political party"
        />
        <input
          type="text"
          placeholder="Filter by position..."
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          aria-label="Filter by position"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load candidates. Please try again later.
        </div>
      )}

      {/* Empty State */}
      {candidates && candidates.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-neutral-300" aria-hidden="true" />
          <p className="mt-4 text-neutral-500">No candidates found matching your criteria.</p>
        </div>
      )}

      {/* Candidate Grid */}
      {candidates && candidates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate) => (
            <Link
              key={candidate.id}
              to={`/candidates/${candidate.id}`}
              className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:border-brand-primary/30 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                {candidate.photoUrl ? (
                  <img
                    src={candidate.photoUrl}
                    alt={candidate.fullName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-brand-primary" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-neutral-900 group-hover:text-brand-primary">
                  {candidate.fullName}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500">{candidate.positionName}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{candidate.geographyName}</p>
                <span className="mt-2 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {candidate.partyAbbreviation}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-brand-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CandidatesPage() {
  return (
    <PageErrorBoundary page="Candidates">
      <CandidatesPageContent />
    </PageErrorBoundary>
  );
}
