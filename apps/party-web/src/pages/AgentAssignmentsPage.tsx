/**
 * VoteCapsule™ — Agent Assignments Page (Party Portal)
 * apps/party-web/src/pages/AgentAssignmentsPage.tsx
 *
 * Party admin assigns agents to specific elections + polling stations.
 * This ensures the mobile app only shows assigned elections/stations
 * and enforces geo-fencing to prevent misuse.
 *
 * Flow:
 *   1. Party admin selects an active nomination election
 *   2. Selects an agent from the tenant's agent list
 *   3. Assigns specific polling stations within the election's area
 *   4. Sets geo-fence radius (default 500m)
 *   5. Agent's mobile app fetches assignment → scoped to this election only
 *
 * NEC Integration:
 *   - Elections are filtered to party's active nominations
 *   - Stations are loaded from NEC database for the election's geographic area
 *   - Geo-fence uses station GPS coordinates from NEC data
 *
 * API Endpoints (Sonie tasks — see party.Sonie.md):
 *   GET  /identity/agents?tenantId=X
 *   GET  /candidate/elections?tenantId=X&type=PARTY_NOMINATION
 *   GET  /geography/stations?constituencyCode=X (or wardCode=X)
 *   POST /identity/assignments
 *   GET  /identity/assignments?tenantId=X
 *   PATCH /identity/assignments/:id  (suspend/complete)
 *   DELETE /identity/assignments/:id
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, User, Radio, Shield, Search, X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { geographyApi } from '../api/geographyApi';
import { useAppSelector } from '../store/hooks';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface Agent {
  id: string;
  fullName: string;
  email: string;
  deviceId: string | null;
  roles: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
}

interface NominationElection {
  id: string;
  name: string;
  positionCode: string;
  positionLabel: string;
  areaName: string;
  countyCode: string | null;
  constituencyCode: string | null;
  wardCode: string | null;
  status: string;
  scheduledDate: string | null;
}

interface StationOption {
  iebcCode: string;
  streamName: string;
  centreName: string;
  registeredVoters: number;
  latitude: number | null;
  longitude: number | null;
  wardName: string;
}

interface AssignmentRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  electionId: string;
  electionName: string;
  positionCode: string;
  areaName: string;
  stationCount: number;
  geofenceRadius: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  assignedAt: string;
}

// ── Main Component ───────────────────────────────────────────

function AgentAssignmentsPageContent(): React.JSX.Element {
  const qc = useQueryClient();
  const tenantId = useAppSelector(s => s.auth.tenantId ?? s.auth.user?.tenantId ?? '');
  const accessToken = useAppSelector(s => s.auth.accessToken);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterElection, setFilterElection] = useState<string>('all');

  // ── Fetch assignments ──────────────────────────────────────
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<AssignmentRecord[]>({
    queryKey: ['party', 'assignments', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/identity/assignments?tenantId=${tenantId}`);
      return data?.data ?? data ?? [];
    },
    enabled: !!tenantId,
  });

  // ── Fetch nomination elections ─────────────────────────────
  const { data: elections = [] } = useQuery<NominationElection[]>({
    queryKey: ['party', 'nomination-elections', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/candidate/elections?tenantId=${tenantId}&type=PARTY_NOMINATION`);
      return data?.data ?? data ?? [];
    },
    enabled: !!tenantId,
  });

  // ── Fetch agents ───────────────────────────────────────────
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['party', 'agents', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/identity/agents?tenantId=${tenantId}`);
      return data?.data ?? data ?? [];
    },
    enabled: !!tenantId,
  });

  // ── Suspend assignment ─────────────────────────────────────
  const suspendMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.patch(`/identity/assignments/${assignmentId}`, { status: 'SUSPENDED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party', 'assignments'] }),
  });

  // ── Delete assignment ──────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.delete(`/identity/assignments/${assignmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['party', 'assignments'] }),
  });

  // ── Filter logic ───────────────────────────────────────────
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a: AssignmentRecord) => {
      const matchSearch = searchTerm === '' ||
        a.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.electionName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchElection = filterElection === 'all' || a.electionId === filterElection;
      return matchSearch && matchElection;
    });
  }, [assignments, searchTerm, filterElection]);

  const stats = useMemo(() => ({
    total: assignments.length,
    active: assignments.filter((a: AssignmentRecord) => a.status === 'ACTIVE').length,
    unassignedAgents: agents.filter((ag: Agent) =>
      !assignments.some((a: AssignmentRecord) => a.agentId === ag.id && a.status === 'ACTIVE')
    ).length,
    totalStations: assignments.reduce((sum: number, a: AssignmentRecord) => sum + a.stationCount, 0),
  }), [assignments, agents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Assignments</h2>
          <p className="text-sm text-gray-500 mt-1">
            Assign agents to specific elections and polling stations. Agents will only see their assigned election in the mobile app.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Assign Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatBox label="Total Assignments" value={stats.total} color="blue" />
        <StatBox label="Active" value={stats.active} color="green" />
        <StatBox label="Unassigned Agents" value={stats.unassignedAgents} color="amber" />
        <StatBox label="Stations Covered" value={stats.totalStations} color="purple" />
      </div>

      {/* Geo-fence explanation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Location Enforcement (Geo-Fence)</h3>
            <p className="text-xs text-amber-700 mt-1">
              Assigned agents can only capture evidence within the geo-fence radius of their polling station.
              Photos taken outside this radius will be flagged and rejected by the server.
              Default radius: 500m. Adjustable per assignment (200m strict → 2km rural).
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents or elections…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterElection}
          onChange={(e) => setFilterElection(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Elections</option>
          {elections.map((e: NominationElection) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Assignments table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Agent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Election</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Stations</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Geo-fence</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assignmentsLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading assignments…</td></tr>
            ) : filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p>No assignments found. Click "Assign Agent" to create one.</p>
                  <p className="text-xs mt-1">Agents without assignments cannot capture evidence.</p>
                </td>
              </tr>
            ) : (
              filteredAssignments.map((a: AssignmentRecord) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{a.agentName}</p>
                        <p className="text-xs text-gray-500">{a.agentEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{a.electionName}</p>
                    <p className="text-xs text-gray-500">{a.areaName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                      {a.positionCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-900">{a.stationCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-gray-600">{a.geofenceRadius}m</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {a.status === 'ACTIVE' && (
                        <button
                          onClick={() => suspendMutation.mutate(a.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Suspend"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Remove assignment for ${a.agentName}?`)) {
                            deleteMutation.mutate(a.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          onClose={() => setShowCreateModal(false)}
          elections={elections}
          agents={agents}
          existingAssignments={assignments}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}

// ── Create Assignment Modal ──────────────────────────────────

function CreateAssignmentModal({ onClose, elections, agents, existingAssignments, tenantId }: {
  onClose: () => void;
  elections: NominationElection[];
  agents: Agent[];
  existingAssignments: AssignmentRecord[];
  tenantId: string;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedElection, setSelectedElection] = useState<NominationElection | null>(null);
  const [selectedStations, setSelectedStations] = useState<StationOption[]>([]);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [stationSearch, setStationSearch] = useState('');

  // ── Load NEC stations when election is selected ────────────
  const { data: stations = [], isLoading: stationsLoading } = useQuery<StationOption[]>({
    queryKey: ['geography', 'stations', selectedElection?.constituencyCode, selectedElection?.wardCode],
    queryFn: async () => {
      // Load stations from NEC geography service based on election scope
      const code = selectedElection!.wardCode ?? selectedElection!.constituencyCode ?? '';
      const endpoint = selectedElection!.wardCode
        ? `/stations?wardCode=${code}`
        : `/stations?constituencyCode=${code}`;
      const { data } = await apiClient.get(`/geography${endpoint}`);
      return (data?.data ?? data ?? []).map((s: any) => ({
        iebcCode: s.iebcCode ?? s.iebc_code,
        streamName: s.streamName ?? s.stream_name ?? s.name,
        centreName: s.centreName ?? s.centre_name ?? '',
        registeredVoters: s.registeredVoters ?? s.registered_voters ?? 0,
        latitude: s.latitude ?? null,
        longitude: s.longitude ?? null,
        wardName: s.wardName ?? s.ward_name ?? '',
      }));
    },
    enabled: !!selectedElection && !!(selectedElection.constituencyCode || selectedElection.wardCode),
  });

  // ── Create assignment mutation ─────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        agentId: selectedAgent!.id,
        tenantId,
        electionId: selectedElection!.id,
        stationCodes: selectedStations.map(s => s.iebcCode),
        geofenceRadiusMeters: geofenceRadius,
      };
      return apiClient.post('/identity/assignments', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party', 'assignments'] });
      onClose();
    },
  });

  const filteredStations = useMemo(() => {
    if (!stationSearch) return stations;
    return stations.filter((s: StationOption) =>
      s.streamName.toLowerCase().includes(stationSearch.toLowerCase()) ||
      s.centreName.toLowerCase().includes(stationSearch.toLowerCase()) ||
      s.wardName.toLowerCase().includes(stationSearch.toLowerCase())
    );
  }, [stations, stationSearch]);

  // Agents not already assigned to the selected election
  const availableAgents = useMemo(() => {
    if (!selectedElection) return agents;
    return agents.filter((ag: Agent) =>
      !existingAssignments.some((a: AssignmentRecord) => a.agentId === ag.id && a.electionId === selectedElection.id && a.status === 'ACTIVE')
    );
  }, [agents, selectedElection, existingAssignments]);

  const toggleStation = (station: StationOption) => {
    setSelectedStations(prev =>
      prev.some(s => s.iebcCode === station.iebcCode)
        ? prev.filter(s => s.iebcCode !== station.iebcCode)
        : [...prev, station]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Agent to Election</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3 — Election → Agent → Stations</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-100 gap-2">
          <StepDot num={1} active={step >= 1} current={step === 1} label="Election" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepDot num={2} active={step >= 2} current={step === 2} label="Agent" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepDot num={3} active={step >= 3} current={step === 3} label="Stations" />
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Election */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Select which nomination election this agent will cover. They will only see this election in their mobile app.
              </p>
              {elections.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No nomination elections found.</p>
                  <p className="text-xs mt-1">Create a nomination first from the Nominations page.</p>
                </div>
              ) : (
                elections.map((election: NominationElection) => (
                  <button
                    key={election.id}
                    onClick={() => { setSelectedElection(election); setStep(2); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedElection?.id === election.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{election.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {election.positionLabel} · {election.areaName} · {election.scheduledDate ?? 'TBD'}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        election.status === 'NOMINATION' ? 'bg-green-100 text-green-700' :
                        election.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {election.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Select Agent */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Select the agent to assign to <strong>{selectedElection?.name}</strong>.
                Only agents not already assigned to this election are shown.
              </p>
              {availableAgents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>All agents are already assigned to this election.</p>
                  <p className="text-xs mt-1">Invite new agents first using the Identity Service.</p>
                </div>
              ) : (
                availableAgents.map((agent: Agent) => (
                  <button
                    key={agent.id}
                    onClick={() => { setSelectedAgent(agent); setStep(3); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedAgent?.id === agent.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{agent.fullName}</p>
                          <p className="text-xs text-gray-500">{agent.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{agent.roles[0] ?? 'CAPSULE_AGENT'}</p>
                        {agent.deviceId ? (
                          <p className="text-xs text-green-600 mt-0.5">Device registered</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-0.5">No device yet</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Select Stations + Geo-fence */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>{selectedAgent?.fullName}</strong> → <strong>{selectedElection?.name}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Select which polling stations this agent should cover. They won't be able to capture at unselected stations.
                </p>
              </div>

              {/* Geo-fence radius setting */}
              <div className="flex items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg">
                <Radio className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Geo-fence Radius</label>
                  <p className="text-xs text-gray-500">Agent must be within this distance of the station to capture</p>
                </div>
                <select
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  <option value={200}>200m (Strict)</option>
                  <option value={500}>500m (Default)</option>
                  <option value={1000}>1km (Lenient)</option>
                  <option value={2000}>2km (Rural)</option>
                </select>
              </div>

              {/* Station search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stations by name, centre, or ward…"
                  value={stationSearch}
                  onChange={(e) => setStationSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Select all / none */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selectedStations.length} of {stations.length} stations selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedStations([...stations])}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedStations([])}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Stations list */}
              {stationsLoading ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading NEC stations for {selectedElection?.areaName}…
                </div>
              ) : stations.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No stations found for this area. Check the election's geographic scope.
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
                  {filteredStations.map((station: StationOption) => {
                    const isSelected = selectedStations.some(s => s.iebcCode === station.iebcCode);
                    return (
                      <button
                        key={station.iebcCode}
                        onClick={() => toggleStation(station)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{station.streamName}</p>
                          <p className="text-xs text-gray-500">{station.centreName} · {station.wardName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-600">{station.registeredVoters.toLocaleString()}</p>
                          {station.latitude ? (
                            <p className="text-xs text-green-600">GPS mapped</p>
                          ) : (
                            <p className="text-xs text-amber-600">No GPS</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Summary warning for stations without GPS */}
              {selectedStations.length > 0 && (
                <div className="text-xs text-gray-500">
                  {selectedStations.filter(s => !s.latitude).length > 0 && (
                    <span className="text-amber-600">
                      ⚠ {selectedStations.filter(s => !s.latitude).length} station(s) lack GPS coordinates — geo-fence will be skipped for those.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={step === 1 ? onClose : () => setStep((step - 1) as 1 | 2 | 3)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 3 ? (
            <button
              onClick={() => createMutation.mutate()}
              disabled={selectedStations.length === 0 || createMutation.isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Assignment ({selectedStations.length} stations)
            </button>
          ) : (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 1 ? !selectedElection : !selectedAgent}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>

        {/* Error display */}
        {createMutation.isError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-700">Failed to create assignment. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] ?? colorMap.blue}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? styles.ACTIVE}`}>
      {status}
    </span>
  );
}

function StepDot({ num, active, current, label }: { num: number; active: boolean; current: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        current ? 'bg-blue-600 text-white' :
        active ? 'bg-blue-100 text-blue-700' :
        'bg-gray-200 text-gray-500'
      }`}>
        {num}
      </div>
      <span className={`text-xs ${current ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

// ── Exported with ErrorBoundary ──────────────────────────────

export function AgentAssignmentsPage() {
  return (
    <PageErrorBoundary page="Agent Assignments">
      <AgentAssignmentsPageContent />
    </PageErrorBoundary>
  );
}
