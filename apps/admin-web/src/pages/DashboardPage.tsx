/**
 * Vote Capsule™ Super Admin Portal — Platform Health Dashboard
 *
 * Primary landing page showing real live data from:
 * - Tenant Service: tenant counts by type
 * - Identity Service: total user count
 * - Geography Service (NEC): polling stations, voters, counties
 * - Trust Service: QLDB ledger status + digest
 *
 * Evidence capsule stats remain 0 until Evidence Service is fully operational.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Vote,
  Shield,
  MapPin,
  UserCheck,
  Lock,
  Activity,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { PlatformHealthIndicator } from '../components/dashboard/PlatformHealthIndicator';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { TrustLedgerStatus } from '../components/dashboard/TrustLedgerStatus';
import { tenantApi } from '../api/tenantApi';
import { usersApi } from '../api/usersApi';
import { geographyApi } from '../api/geographyApi';
import { trustApi } from '../api/trustApi';
import { aiApi } from '../api/aiApi';
import { workflowApi } from '../api/workflowApi';

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate();

  // Real data from backend services
  const { data: tenantStats, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: tenantApi.getStats,
    retry: 1,
    staleTime: 60 * 1000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => usersApi.findAll({ page: 1, limit: 1 }),
    retry: 1,
  });

  // Real data from Geography Service (NEC)
  const { data: geoStats, isLoading: geoLoading } = useQuery({
    queryKey: ['geo-stats'],
    queryFn: geographyApi.getStats,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 min — NEC data doesn't change often
  });

  // Trust ledger digest
  const { data: ledgerDigest } = useQuery({
    queryKey: ['trust-digest'],
    queryFn: trustApi.getLedgerDigest,
    retry: 1,
    staleTime: 30 * 1000,
  });

  // AI Service stats — advisory only
  const { data: aiStats } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: () => aiApi.getStats(),
    retry: 1,
    staleTime: 30 * 1000,
  });

  // Workflow Engine stats
  const { data: workflowStats } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: workflowApi.getStats,
    retry: 1,
    staleTime: 30 * 1000,
  });

  const totalTenants = tenantStats
    ? Object.values(tenantStats).reduce((a, b) => a + b, 0)
    : 0;

  const formatNumber = (n: number): string =>
    new Intl.NumberFormat('en-KE').format(n);

  const handleCreateTenant = useCallback(() => navigate('/tenants/new'), [navigate]);
  const handleViewAuditLog = useCallback(() => navigate('/audit'), [navigate]);
  const handleInviteUser = useCallback(() => navigate('/users'), [navigate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Health Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vote Capsule™ — Super Admin Overview
            {geoStats && (
              <span className="ml-2 text-gray-400">
                · Kenya 2027 General Election Platform
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" aria-hidden="true" />
            All Systems Operational
          </span>
        </div>
      </div>

      {/* Platform Health Indicators */}
      <PlatformHealthIndicator />

      {/* KPI Cards — Row 1: Tenants + Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tenants"
          value={tenantsLoading ? '—' : String(totalTenants)}
          subtitle={`${tenantStats?.['election_authority'] ?? 0} Auth · ${tenantStats?.['political_party'] ?? 0} Parties`}
          icon={Building2}
          iconColor="text-[#0B3C6D]"
          iconBg="bg-blue-50"
        />
        <MetricCard
          title="Platform Users"
          value={usersLoading ? '—' : formatNumber(usersData?.meta.total ?? 0)}
          subtitle="Across all tenants"
          icon={Users}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Active Elections"
          value="—"
          subtitle="Election Service: Phase 2"
          icon={Vote}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          stub
        />
        <MetricCard
          title="AI Jobs"
          value={aiStats ? formatNumber(aiStats.total) : '0'}
          subtitle={
            workflowStats && workflowStats.overdue > 0
              ? `${workflowStats.overdue} workflows overdue`
              : aiStats && aiStats.total > 0
                ? `${aiStats.breakdown.filter(b => b.routingDecision === 'ESCALATE').reduce((a, b) => a + parseInt(b.count, 10), 0)} flagged`
                : 'Phase 3'
          }
          icon={Shield}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          stub={!aiStats || aiStats.total === 0}
        />
      </div>

      {/* KPI Cards — Row 2: NEC Geography (REAL DATA from Geography Service) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Polling Stations"
          value={geoLoading ? '—' : formatNumber(geoStats?.pollingStations ?? 0)}
          subtitle={geoStats ? `${formatNumber(geoStats.registrationCentres)} centres · ${geoStats.wards} wards` : 'Loading NEC data…'}
          icon={MapPin}
          iconColor="text-[#0B3C6D]"
          iconBg="bg-sky-50"
        />
        <MetricCard
          title="Registered Voters"
          value={geoLoading ? '—' : formatNumber(geoStats?.totalRegisteredVoters ?? 0)}
          subtitle={geoStats ? `${geoStats.counties} counties · ${geoStats.constituencies} constituencies` : 'Loading NEC data…'}
          icon={UserCheck}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Trust Anchors"
          value="0"
          subtitle={
            ledgerDigest
              ? `Ledger: ${ledgerDigest.ledger} · Active`
              : 'Trust ledger: awaiting capsules'
          }
          icon={Lock}
          iconColor="text-[#0B3C6D]"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity — 2 cols */}
        <div className="lg:col-span-2">
          <RecentActivityFeed />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Trust Ledger Status */}
          <TrustLedgerStatus ledgerDigest={ledgerDigest ?? null} />

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleCreateTenant}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[#0B3C6D] bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Create New Tenant
                <ArrowRight className="w-3 h-3 ml-auto" aria-hidden="true" />
              </button>
              <button
                onClick={handleInviteUser}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <Users className="w-4 h-4 text-gray-500" aria-hidden="true" />
                Invite User
                <ArrowRight className="w-3 h-3 ml-auto text-gray-400" aria-hidden="true" />
              </button>
              <button
                onClick={handleViewAuditLog}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <Activity className="w-4 h-4 text-gray-500" aria-hidden="true" />
                View Audit Log
                <ArrowRight className="w-3 h-3 ml-auto text-gray-400" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Tenant Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Tenant Breakdown</h3>
            <div className="space-y-2">
              {[
                { label: 'Election Authorities', key: 'election_authority', color: 'bg-blue-500' },
                { label: 'Political Parties', key: 'political_party', color: 'bg-violet-500' },
                { label: 'Observer Organizations', key: 'observer', color: 'bg-emerald-500' },
                { label: 'Media Organizations', key: 'media', color: 'bg-amber-500' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} aria-hidden="true" />
                    <span className="text-gray-600">{label}</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {tenantStats?.[key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* NEC Data Summary */}
          {geoStats && (
            <div className="bg-[#0B3C6D]/5 border border-[#0B3C6D]/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#0B3C6D] mb-2">NEC Data ({geoStats.electionYear})</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>Counties</span><span className="font-medium">{geoStats.counties}</span></div>
                <div className="flex justify-between"><span>Constituencies</span><span className="font-medium">{geoStats.constituencies}</span></div>
                <div className="flex justify-between"><span>Wards</span><span className="font-medium">{formatNumber(geoStats.wards)}</span></div>
                <div className="flex justify-between"><span>Registration Centres</span><span className="font-medium">{formatNumber(geoStats.registrationCentres)}</span></div>
                <div className="flex justify-between font-semibold text-[#0B3C6D]"><span>Total Voters</span><span>{formatNumber(geoStats.totalRegisteredVoters)}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
