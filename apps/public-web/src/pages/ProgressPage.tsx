import { useQuery } from '@tanstack/react-query';
import { Activity, MapPin, CheckCircle, Clock } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { getReportingProgress } from '../lib/api';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function ProgressPageContent() {
  const { data: progress, isLoading, error } = useQuery({
    queryKey: ['reporting-progress'],
    queryFn: getReportingProgress,
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  });

  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Reporting Progress</h1>
        <p className="mt-2 text-neutral-500">
          Real-time view of election reporting progress. Data refreshes automatically every 30 seconds.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-neutral-200" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load reporting progress. Please try again later.
        </div>
      )}

      {progress && (
        <>
          {/* Top-level Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              icon={Activity}
              value={`${progress.percentReported.toFixed(1)}%`}
              label="Stations Reported"
              description="Overall progress"
            />
            <StatsCard
              icon={CheckCircle}
              value={progress.stationsReported.toLocaleString()}
              label="Stations Complete"
              description={`Out of ${progress.totalStations.toLocaleString()}`}
            />
            <StatsCard
              icon={Clock}
              value={(progress.totalStations - progress.stationsReported).toLocaleString()}
              label="Stations Pending"
              description="Still awaiting submission"
            />
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">National Progress</h2>
              <span className="text-2xl font-bold text-brand-primary">
                {progress.percentReported.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-700"
                style={{ width: `${Math.min(progress.percentReported, 100)}%` }}
                role="progressbar"
                aria-valuenow={progress.percentReported}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="National reporting progress"
              />
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {progress.stationsReported.toLocaleString()} of {progress.totalStations.toLocaleString()} stations have submitted results.
            </p>
          </div>

          {/* County Breakdown */}
          {progress.byCounty && progress.byCounty.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-neutral-900">Progress by County</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Breakdown of reporting progress for each county.
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-neutral-700">County</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-700">Reported</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-700">Total</th>
                      <th className="hidden px-4 py-3 font-medium text-neutral-700 sm:table-cell">Progress</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-700">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {progress.byCounty
                      .sort((a, b) => b.percentReported - a.percentReported)
                      .map((county) => (
                        <tr key={county.countyCode} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2 font-medium text-neutral-900">
                              <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                              {county.countyName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-600">
                            {county.stationsReported.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-600">
                            {county.totalStations.toLocaleString()}
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  county.percentReported >= 90
                                    ? 'bg-semantic-success'
                                    : county.percentReported >= 50
                                      ? 'bg-semantic-warning'
                                      : 'bg-brand-primary'
                                }`}
                                style={{ width: `${Math.min(county.percentReported, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                county.percentReported >= 90
                                  ? 'bg-semantic-success/10 text-semantic-success-dark'
                                  : county.percentReported >= 50
                                    ? 'bg-semantic-warning/10 text-semantic-warning-dark'
                                    : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {county.percentReported.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Geographic Heat Map Placeholder */}
          <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-neutral-500">
              Geographic Heat Map
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Interactive map visualization will be rendered here showing reporting density by region.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function ProgressPage() {
  return (
    <PageErrorBoundary page="Progress">
      <ProgressPageContent />
    </PageErrorBoundary>
  );
}
