import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { CandidateResult } from '../lib/api';

interface ResultsTableProps {
  candidates: CandidateResult[];
  totalVotes: number;
}

type SortField = 'candidateName' | 'partyName' | 'votes' | 'percentage';
type SortDirection = 'asc' | 'desc';

export function ResultsTable({ candidates, totalVotes }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('votes');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sorted = [...candidates].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'candidateName' || sortField === 'partyName') {
      return multiplier * a[sortField].localeCompare(b[sortField]);
    }
    return multiplier * (a[sortField] - b[sortField]);
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-brand-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-brand-primary" />
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            <th className="px-4 py-3 font-medium text-neutral-700">
              <button
                onClick={() => handleSort('candidateName')}
                className="flex items-center gap-1.5 hover:text-brand-primary"
                aria-label="Sort by candidate name"
              >
                Candidate <SortIcon field="candidateName" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium text-neutral-700">
              <button
                onClick={() => handleSort('partyName')}
                className="flex items-center gap-1.5 hover:text-brand-primary"
                aria-label="Sort by party"
              >
                Party <SortIcon field="partyName" />
              </button>
            </th>
            <th className="px-4 py-3 text-right font-medium text-neutral-700">
              <button
                onClick={() => handleSort('votes')}
                className="ml-auto flex items-center gap-1.5 hover:text-brand-primary"
                aria-label="Sort by votes"
              >
                Votes <SortIcon field="votes" />
              </button>
            </th>
            <th className="px-4 py-3 text-right font-medium text-neutral-700">
              <button
                onClick={() => handleSort('percentage')}
                className="ml-auto flex items-center gap-1.5 hover:text-brand-primary"
                aria-label="Sort by percentage"
              >
                % <SortIcon field="percentage" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium text-neutral-700">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {sorted.map((candidate, idx) => (
            <tr
              key={candidate.candidateId}
              className={idx === 0 && sortField === 'votes' && sortDirection === 'desc' ? 'bg-semantic-success/5' : 'hover:bg-neutral-50'}
            >
              <td className="px-4 py-3 font-medium text-neutral-900">
                {candidate.candidateName}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                  {candidate.partyAbbreviation}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-neutral-900">
                {candidate.votes.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900">
                {candidate.percentage.toFixed(1)}%
              </td>
              <td className="px-4 py-3">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-brand-primary transition-all"
                    style={{ width: `${Math.min(candidate.percentage, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={candidate.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${candidate.candidateName}: ${candidate.percentage.toFixed(1)}%`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-neutral-200 bg-neutral-50">
          <tr>
            <td colSpan={2} className="px-4 py-3 font-medium text-neutral-700">
              Total
            </td>
            <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900">
              {totalVotes.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900">
              100%
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
