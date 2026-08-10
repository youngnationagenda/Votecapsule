import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Calendar, ChevronRight } from 'lucide-react';
import { getElections } from '../lib/api';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function ResultsPageContent() {
  const { data: elections, isLoading, error } = useQuery({
    queryKey: ['elections'],
    queryFn: getElections,
  });

  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Election Results</h1>
        <p className="mt-2 text-neutral-500">
          Select an election to view published results by position and geography.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load elections. Please try again later.
        </div>
      )}

      {elections && elections.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-neutral-300" aria-hidden="true" />
          <p className="mt-4 text-neutral-500">No elections available yet.</p>
        </div>
      )}

      {elections && elections.length > 0 && (
        <div className="space-y-4">
          {elections.map((election) => (
            <Link
              key={election.id}
              to={`/results/${election.id}`}
              className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-brand-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
                  <BarChart3 className="h-6 w-6 text-brand-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 group-hover:text-brand-primary">
                    {election.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {new Date(election.date).toLocaleDateString('en-KE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600">
                      {election.type}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        election.status === 'published'
                          ? 'bg-semantic-success/10 text-semantic-success-dark'
                          : 'bg-semantic-warning/10 text-semantic-warning-dark'
                      }`}
                    >
                      {election.status}
                    </span>
                  </div>
                  {election.description && (
                    <p className="mt-2 text-sm text-neutral-400">{election.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResultsPage() {
  return (
    <PageErrorBoundary page="Results">
      <ResultsPageContent />
    </PageErrorBoundary>
  );
}
