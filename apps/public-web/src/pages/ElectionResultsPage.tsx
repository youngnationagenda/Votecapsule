import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, MapPin } from 'lucide-react';
import { getPublicResults } from '../lib/api';
import { ResultsTable } from '../components/ResultsTable';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

type GeoLevel = 'national' | 'county' | 'constituency' | 'ward';

function ElectionResultsPageContent() {
  const { electionId } = useParams<{ electionId: string }>();
  const [geoLevel, setGeoLevel] = useState<GeoLevel>('national');
  const [selectedGeoCode, setSelectedGeoCode] = useState<string | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; level: GeoLevel; code?: string }[]>([
    { label: 'National', level: 'national' },
  ]);

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', electionId, geoLevel, selectedGeoCode],
    queryFn: () =>
      getPublicResults({
        electionId,
        geographyLevel: geoLevel,
        geographyCode: selectedGeoCode,
      }),
    enabled: !!electionId,
  });

  const handleDrillDown = (code: string, name: string) => {
    const nextLevel: Record<GeoLevel, GeoLevel> = {
      national: 'county',
      county: 'constituency',
      constituency: 'ward',
      ward: 'ward',
    };
    const next = nextLevel[geoLevel];
    if (next === geoLevel && geoLevel === 'ward') return;

    setSelectedGeoCode(code);
    setGeoLevel(next);
    setBreadcrumbs((prev) => [...prev, { label: name, level: next, code }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setGeoLevel(target.level);
    setSelectedGeoCode(target.code);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  return (
    <div className="container-narrow py-8">
      {/* Back link */}
      <Link
        to="/results"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All Elections
      </Link>

      <h1 className="text-3xl font-bold text-neutral-900">Election Results</h1>

      {/* Breadcrumb navigation */}
      <nav aria-label="Geographic breadcrumb" className="mt-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <li key={idx} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`rounded px-2 py-1 transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? 'font-medium text-brand-primary'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                }`}
                aria-current={idx === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {crumb.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Results */}
      <div className="mt-8">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-200" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
            Unable to load results. Please try again later.
          </div>
        )}

        {results && results.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <MapPin className="mx-auto h-12 w-12 text-neutral-300" aria-hidden="true" />
            <p className="mt-4 text-neutral-500">No results published for this area yet.</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-6">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {result.positionName}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {result.geographyName} — {result.stationsReported}/{result.totalStations} stations reported ({result.percentReported.toFixed(1)}%)
                    </p>
                  </div>
                  {geoLevel !== 'ward' && (
                    <button
                      onClick={() => handleDrillDown(result.geographyCode, result.geographyName)}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-primary/30 hover:text-brand-primary"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Drill Down
                    </button>
                  )}
                </div>

                <ResultsTable candidates={result.candidates} totalVotes={result.totalVotes} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ElectionResultsPage() {
  return (
    <PageErrorBoundary page="Election Results">
      <ElectionResultsPageContent />
    </PageErrorBoundary>
  );
}
