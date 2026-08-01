import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, ChevronRight, Building2 } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { getStations } from '../lib/api';

export function StationsPage() {
  const [search, setSearch] = useState('');
  const [countyFilter, setCountyFilter] = useState('');

  const { data: stations, isLoading, error } = useQuery({
    queryKey: ['stations', search, countyFilter],
    queryFn: () =>
      getStations({
        search: search || undefined,
        county: countyFilter || undefined,
      }),
  });

  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Polling Stations</h1>
        <p className="mt-2 text-neutral-500">
          Search polling stations by name, code, or county. Click a station to view its results.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SearchInput
          placeholder="Search by station name or code..."
          onSearch={setSearch}
          ariaLabel="Search polling stations"
        />
        <input
          type="text"
          placeholder="Filter by county..."
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          aria-label="Filter by county"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-200" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-semantic-error/30 bg-semantic-error-light p-4 text-sm text-semantic-error-dark">
          Unable to load stations. Please try again later.
        </div>
      )}

      {/* Empty */}
      {stations && stations.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-neutral-300" aria-hidden="true" />
          <p className="mt-4 text-neutral-500">No stations found matching your search.</p>
        </div>
      )}

      {/* Station List */}
      {stations && stations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-700">Station</th>
                <th className="hidden px-4 py-3 font-medium text-neutral-700 sm:table-cell">Code</th>
                <th className="hidden px-4 py-3 font-medium text-neutral-700 md:table-cell">County</th>
                <th className="hidden px-4 py-3 font-medium text-neutral-700 lg:table-cell">Constituency</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-700">Voters</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stations.map((station) => (
                <tr key={station.code} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/stations/${station.code}`}
                      className="flex items-center gap-2 font-medium text-neutral-900 hover:text-brand-primary"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      <span className="truncate">{station.name}</span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-neutral-500 sm:table-cell">
                    {station.code}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">
                    {station.countyName}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-600 lg:table-cell">
                    {station.constituencyName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-600">
                    {station.registeredVoters.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/stations/${station.code}`}
                      className="text-neutral-400 hover:text-brand-primary"
                      aria-label={`View ${station.name}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
