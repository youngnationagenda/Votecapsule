import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Users, Building2, CheckCircle } from 'lucide-react';
import { getStationByCode, getPublicResults } from '../lib/api';
import { ResultsTable } from '../components/ResultsTable';

export function StationDetailPage() {
  const { code } = useParams<{ code: string }>();

  const { data: station, isLoading: stationLoading, error: stationError } = useQuery({
    queryKey: ['station', code],
    queryFn: () => getStationByCode(code!),
    enabled: !!code,
  });

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['station-results', code],
    queryFn: () =>
      getPublicResults({
        geographyCode: code,
        geographyLevel: 'station',
      }),
    enabled: !!code,
  });

  if (stationLoading) {
    return (
      <div className="container-narrow py-8">
        <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (stationError || !station) {
    return (
      <div className="container-narrow py-8">
        <Link
          to="/stations"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All Stations
        </Link>
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load station details. The station may not exist or the service is unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-8">
      <Link
        to="/stations"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All Stations
      </Link>

      {/* Station Header */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
            <Building2 className="h-7 w-7 text-brand-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{station.name}</h1>
            <p className="mt-1 font-mono text-sm text-neutral-500">Code: {station.code}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                {station.countyName} — {station.constituencyName} — {station.wardName}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                {station.registeredVoters.toLocaleString()} registered voters
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results per position */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">Station Results</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Results for each position at this polling station.
        </p>

        {resultsLoading && (
          <div className="mt-4 space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200" />
            ))}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="mt-3 text-sm text-neutral-500">
              No results published for this station yet.
            </p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="mt-4 space-y-6">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-3 font-semibold text-neutral-900">{result.positionName}</h3>
                <ResultsTable candidates={result.candidates} totalVotes={result.totalVotes} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
