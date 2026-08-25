/**
 * Vote Capsule™ Admin Portal — Campaign Manager Administration
 *
 * Super-admin interface for campaign oversight:
 *   - View all campaigns across all tenants
 *   - Manage material type catalogue (add/edit/deactivate)
 *   - Campaign role definitions reference + access matrix
 *
 * CTO OWNS THIS FILE — do not modify from backend services.
 *
 * API Endpoints (campaign service via API gateway):
 *   GET  /campaign/campaigns               list all campaigns (super admin sees all tenants)
 *   GET  /campaign/materials/categories    material categories
 *   GET  /campaign/materials/types         full catalogue
 *   POST /campaign/materials/types         add new material type
 *   PATCH /campaign/materials/types/:id    update / toggle material type
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Package, Shield, Plus, Search, X,
  CheckCircle, XCircle, Edit, ToggleLeft, ToggleRight,
  ChevronDown, ChevronRight, AlertTriangle, Store,
  Upload, Image, Link, Trash2, Eye, DollarSign,
} from 'lucide-react';
import { campaignClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { CampaignCategoryIcon, CampaignMaterialIcon } from '../components/CampaignMaterialIcon';
import { clsx } from 'clsx';

// ── Types ─────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  status: string;
  tenantId: string;
  candidateId: string;
  constituencyCode?: string;
  countyCode?: string;
  campaignStartDate?: string;
  campaignEndDate?: string;
  createdAt: string;
}

interface MaterialCategory {
  id: string;
  code: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

interface MaterialType {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  minOrderQuantity: number;
  leadTimeDays: number;
  typicalCostMin?: number;
  typicalCostMax?: number;
  isActive: boolean;
}

// Campaign roles reference — mirrors V16 spec + migration 139
const CAMPAIGN_ROLES = [
  { name: 'PARTY_CAMPAIGN_DIRECTOR',     display: 'Campaign Director',        scope: 'All party campaigns',          color: 'bg-violet-100 text-violet-800' },
  { name: 'CANDIDATE_CAMPAIGN_PRINCIPAL',display: 'Campaign Principal',       scope: 'Own campaign + geography',     color: 'bg-blue-100 text-blue-800' },
  { name: 'CAMPAIGN_MANAGER',            display: 'Campaign Manager',         scope: 'Assigned campaign',            color: 'bg-indigo-100 text-indigo-800' },
  { name: 'CONSTITUENCY_COORDINATOR',    display: 'Constituency Coordinator', scope: 'Assigned constituency only',   color: 'bg-cyan-100 text-cyan-800' },
  { name: 'WARD_COORDINATOR',            display: 'Ward Coordinator',         scope: 'Assigned ward only',           color: 'bg-teal-100 text-teal-800' },
  { name: 'LOGISTICS_OFFICER',           display: 'Logistics Officer',        scope: 'Vehicles + equipment only',    color: 'bg-amber-100 text-amber-800' },
  { name: 'FINANCE_OFFICER',             display: 'Finance Officer',          scope: 'Budget + expenses only',       color: 'bg-emerald-100 text-emerald-800' },
  { name: 'COMMUNICATIONS_OFFICER',      display: 'Communications Officer',   scope: 'SMS + messaging only',         color: 'bg-sky-100 text-sky-800' },
  { name: 'BRAND_MANAGER',              display: 'Brand Manager',            scope: 'Designs + brand assets',       color: 'bg-pink-100 text-pink-800' },
  { name: 'CAMPAIGN_VOLUNTEER',          display: 'Campaign Volunteer',       scope: 'Assigned tasks + attendance',  color: 'bg-gray-100 text-gray-700' },
];

// ── Add / Edit Material Modal ──────────────────────────────────

function AddMaterialModal({
  categories,
  editItem,
  onClose,
}: {
  categories: MaterialCategory[];
  editItem?: MaterialType;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    categoryId:       editItem?.categoryId       ?? categories[0]?.id ?? '',
    code:             editItem?.code             ?? '',
    name:             editItem?.name             ?? '',
    description:      editItem?.description      ?? '',
    unit:             editItem?.unit             ?? 'piece',
    minOrderQuantity: editItem?.minOrderQuantity  ?? 1,
    leadTimeDays:     editItem?.leadTimeDays      ?? 7,
    typicalCostMin:   editItem?.typicalCostMin    ?? '',
    typicalCostMax:   editItem?.typicalCostMax    ?? '',
  });

  const createMut = useMutation({
    mutationFn: (data: any) => campaignClient.post('/materials/types', data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-material-types'] }); onClose(); },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => campaignClient.patch(`/materials/types/${editItem?.id}`, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-material-types'] }); onClose(); },
  });

  const mut = editItem ? updateMut : createMut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate({
      ...form,
      typicalCostMin: form.typicalCostMin ? parseFloat(String(form.typicalCostMin)) : undefined,
      typicalCostMax: form.typicalCostMax ? parseFloat(String(form.typicalCostMax)) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">
            {editItem ? 'Edit Material Type' : 'Add Material Type'}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code * (UNIQUE)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0B3C6D] disabled:bg-gray-50"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                placeholder="BASEBALL_CAP"
                disabled={!!editItem}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {['piece','set','roll','pack','pair','box','bundle','sheet','metre'].map((u) =>
                  <option key={u} value={u}>{u}</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Branded Baseball Cap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description for the catalogue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Qty</label>
              <input
                type="number" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.minOrderQuantity}
                onChange={(e) => setForm({ ...form, minOrderQuantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
              <input
                type="number" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 7 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typical Cost Min (KES)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.typicalCostMin}
                onChange={(e) => setForm({ ...form, typicalCostMin: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typical Cost Max (KES)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.typicalCostMax}
                onChange={(e) => setForm({ ...form, typicalCostMax: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to save. Please try again.</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium bg-[#0B3C6D] text-white rounded-lg hover:bg-[#0a3460] disabled:opacity-50"
            >
              {mut.isPending ? 'Saving…' : (editItem ? 'Update' : 'Add to Catalogue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── All Campaigns Tab ─────────────────────────────────────────

function CampaignsTab() {
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn:  () => campaignClient.get('/campaigns').then((r) => r.data?.data ?? r.data ?? []),
  });

  const filtered = campaigns.filter((c: Campaign) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.tenantId?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_COLORS: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700',
    planning:  'bg-blue-100 text-blue-700',
    created:   'bg-gray-100 text-gray-600',
    suspended: 'bg-amber-100 text-amber-700',
    closed:    'bg-red-100 text-red-700',
    audited:   'bg-violet-100 text-violet-700',
    archived:  'bg-gray-50 text-gray-400',
  };

  const counts = {
    all:      campaigns.length,
    active:   campaigns.filter((c: Campaign) => c.status === 'active').length,
    planning: campaigns.filter((c: Campaign) => c.status === 'planning').length,
    closed:   campaigns.filter((c: Campaign) => ['closed', 'audited'].includes(c.status)).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: counts.all,     color: 'text-gray-900' },
          { label: 'Active',          value: counts.active,  color: 'text-emerald-600' },
          { label: 'Planning',        value: counts.planning,color: 'text-blue-600' },
          { label: 'Closed / Audited',value: counts.closed,  color: 'text-gray-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
            placeholder="Search by name or tenant ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {['active','planning','created','suspended','closed','audited','archived'].map((s) =>
            <option key={s} value={s}>{s}</option>
          )}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Campaign</div>
          <div className="col-span-3">Tenant ID</div>
          <div className="col-span-2">Geography</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Created</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No campaigns found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((c: Campaign) => (
              <div key={c.id} className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-gray-50 items-center">
                <div className="col-span-4">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{c.id}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs font-mono text-gray-500 truncate">{c.tenantId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600">{c.constituencyCode ?? c.countyCode ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600')}>
                    {c.status}
                  </span>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Material Catalogue Tab ─────────────────────────────────────

function MaterialCatalogueTab() {
  const qc = useQueryClient();
  const [search, setSearch]        = useState('');
  const [catFilter, setCat]        = useState('all');
  const [showAdd, setShowAdd]      = useState(false);
  const [editItem, setEdit]        = useState<MaterialType | undefined>();
  const [expandedCat, setExpanded] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<MaterialCategory[]>({
    queryKey: ['admin-material-categories'],
    queryFn:  () => campaignClient.get('/materials/categories').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: types = [], isLoading } = useQuery<MaterialType[]>({
    queryKey: ['admin-material-types'],
    queryFn:  () => campaignClient.get('/materials/types').then((r) => r.data?.data ?? r.data ?? []),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      campaignClient.patch(`/materials/types/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-material-types'] }),
  });

  const filtered = types.filter((t) => {
    const q = search.toLowerCase();
    return (
      (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)) &&
      (catFilter === 'all' || t.categoryId === catFilter)
    );
  });

  const grouped = categories.map((cat) => ({
    ...cat,
    items: filtered.filter((t) => t.categoryId === cat.id),
  })).filter((cat) => cat.items.length > 0 || catFilter === 'all');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Material Types</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{types.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Active Types</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{types.filter((t) => t.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-[#0B3C6D] mt-1">{categories.length}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
            placeholder="Search material types…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
          value={catFilter}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0B3C6D] text-white rounded-lg hover:bg-[#0a3460]"
        >
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin" />
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-800">Catalogue is empty</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Material types seed (migration 138) has not been run. Add types manually or ask Sonie to run the seed migration.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0B3C6D] text-white rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add First Type
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpanded(expandedCat === cat.id ? null : cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <CampaignCategoryIcon categoryCode={cat.code} size={36} className="rounded-lg flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#0B3C6D]/10 text-[#0B3C6D] font-medium">
                    {cat.items.length}
                  </span>
                  {!cat.isActive && <span className="text-xs text-red-500">inactive</span>}
                </div>
                {expandedCat === cat.id
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {expandedCat === cat.id && (
                <div className="border-t border-gray-100">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-1">Icon</div>
                    <div className="col-span-2">Code</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-1">MOQ</div>
                    <div className="col-span-2">Cost Range (KES)</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {cat.items.map((item) => (
                      <div key={item.id} className={clsx('grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-gray-50', !item.isActive && 'opacity-50')}>
                        <div className="col-span-1">
                          <CampaignMaterialIcon code={item.code} size={32} className="rounded-lg" />
                        </div>
                        <div className="col-span-2">
                          <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-600 truncate block">{item.code}</code>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-gray-900 truncate">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                        </div>
                        <div className="col-span-1">
                          <span className="text-xs text-gray-600">{item.unit}</span>
                        </div>
                        <div className="col-span-1">
                          <span className="text-xs text-gray-600">{item.minOrderQuantity}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-gray-600">
                            {item.typicalCostMin && item.typicalCostMax
                              ? `${item.typicalCostMin.toLocaleString()} – ${item.typicalCostMax.toLocaleString()}`
                              : '—'}
                          </span>
                        </div>
                        <div className="col-span-1 flex items-center gap-1.5">
                          <button
                            onClick={() => setEdit(item)}
                            className="p-1 text-gray-400 hover:text-[#0B3C6D] rounded"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleMut.mutate({ id: item.id, isActive: !item.isActive })}
                            className={clsx('p-1 rounded', item.isActive ? 'text-emerald-500 hover:text-red-500' : 'text-red-400 hover:text-emerald-500')}
                            title={item.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {item.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(showAdd || editItem) && (
        <AddMaterialModal
          categories={categories}
          editItem={editItem}
          onClose={() => { setShowAdd(false); setEdit(undefined); }}
        />
      )}
    </div>
  );
}

// ── Campaign Roles Reference Tab ───────────────────────────────

function CampaignRolesTab() {
  const MODULE_ACCESS: Record<string, string[]> = {
    Events:     ['PARTY_CAMPAIGN_DIRECTOR','CANDIDATE_CAMPAIGN_PRINCIPAL','CAMPAIGN_MANAGER','CONSTITUENCY_COORDINATOR','WARD_COORDINATOR','LOGISTICS_OFFICER','FINANCE_OFFICER','COMMUNICATIONS_OFFICER','BRAND_MANAGER','CAMPAIGN_VOLUNTEER'],
    Budget:     ['PARTY_CAMPAIGN_DIRECTOR','CANDIDATE_CAMPAIGN_PRINCIPAL','CAMPAIGN_MANAGER','FINANCE_OFFICER'],
    SMS:        ['PARTY_CAMPAIGN_DIRECTOR','CANDIDATE_CAMPAIGN_PRINCIPAL','CAMPAIGN_MANAGER','COMMUNICATIONS_OFFICER'],
    Materials:  ['PARTY_CAMPAIGN_DIRECTOR','CANDIDATE_CAMPAIGN_PRINCIPAL','CAMPAIGN_MANAGER','BRAND_MANAGER'],
    Logistics:  ['PARTY_CAMPAIGN_DIRECTOR','CANDIDATE_CAMPAIGN_PRINCIPAL','CAMPAIGN_MANAGER','LOGISTICS_OFFICER'],
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-emerald-800">
          <p className="font-semibold">Campaign role guard active — migration 139 applied ✅</p>
          <p className="mt-0.5 text-emerald-700">
            All 10 campaign roles are seeded in the DB and the CampaignRoleGuard is registered globally
            on the campaign service. The access matrix below reflects live enforcement.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Campaign Roles — Access Matrix</h3>
            <p className="text-xs text-gray-500 mt-0.5">10 campaign roles defined in VC-SAES-016 Chapter 1.2</p>
          </div>
          <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
            ✅ Seeded — migration 139 applied
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {CAMPAIGN_ROLES.map((role) => (
            <div key={role.name} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', role.color)}>
                      {role.display}
                    </span>
                    <code className="text-xs font-mono text-gray-500">{role.name}</code>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{role.scope}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 flex-shrink-0">
                  <CheckCircle className="w-3 h-3" /> Active
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(MODULE_ACCESS).map(([module, allowed]) => {
                  const hasAccess = allowed.includes(role.name);
                  return (
                    <div
                      key={module}
                      className={clsx(
                        'flex items-center gap-1 text-[10px] px-2 py-1 rounded',
                        hasAccess ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                      )}
                    >
                      {hasAccess ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {module}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Supplier Products Tab ──────────────────────────────────────

interface SupplierProductAdmin {
  id: string;
  supplierId: string;
  supplierName?: string;
  materialTypeId: string;
  materialTypeName?: string;
  supplierProductName: string;
  supplierSku: string;
  unitPrice: number | null;
  bulkPrice: number | null;
  bulkMinQuantity: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
  isAvailable: boolean;
  leadTimeDays: number | null;
}

function AddSupplierProductModal({
  categories,
  types,
  onClose,
  editItem,
}: {
  categories: MaterialCategory[];
  types: MaterialType[];
  onClose: () => void;
  editItem?: SupplierProductAdmin;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    supplierId:          editItem?.supplierId          ?? '',
    materialTypeId:      editItem?.materialTypeId      ?? types[0]?.id ?? '',
    supplierProductName: editItem?.supplierProductName ?? '',
    supplierSku:         editItem?.supplierSku         ?? '',
    unitPrice:           editItem?.unitPrice?.toString() ?? '',
    bulkPrice:           editItem?.bulkPrice?.toString() ?? '',
    bulkMinQuantity:     editItem?.bulkMinQuantity?.toString() ?? '100',
    currency:            editItem?.currency            ?? 'KES',
    imageUrl:            editItem?.imageUrl            ?? '',
    productUrl:          editItem?.productUrl          ?? '',
    leadTimeDays:        editItem?.leadTimeDays?.toString() ?? '7',
    isAvailable:         editItem?.isAvailable         ?? true,
  });
  const [imagePreview, setImagePreview] = useState(!!editItem?.imageUrl);
  const [catFilter, setCatFilter] = useState('all');

  const filteredTypes = catFilter === 'all' ? types : types.filter(t => t.categoryId === catFilter);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: () => campaignClient.get('/suppliers').then(r => r.data?.data ?? r.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => campaignClient.post('/suppliers/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-supplier-products'] }); onClose(); },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => campaignClient.patch(`/suppliers/products/${editItem?.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-supplier-products'] }); onClose(); },
  });

  const mut = editItem ? updateMut : createMut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate({
      ...form,
      unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : null,
      bulkPrice: form.bulkPrice ? parseFloat(form.bulkPrice) : null,
      bulkMinQuantity: form.bulkMinQuantity ? parseInt(form.bulkMinQuantity) : null,
      leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">
            {editItem ? 'Edit Supplier Product' : 'Add Supplier Product'}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Supplier selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
              required
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.location})</option>)}
            </select>
          </div>

          {/* Material type + category filter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Filter</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Type *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                required
                value={form.materialTypeId}
                onChange={(e) => setForm({ ...form, materialTypeId: e.target.value })}
              >
                {filteredTypes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
              </select>
            </div>
          </div>

          {/* Product name + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                required value={form.supplierProductName}
                onChange={(e) => setForm({ ...form, supplierProductName: e.target.value })}
                placeholder="e.g. Premium Branded Baseball Cap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.supplierSku}
                onChange={(e) => setForm({ ...form, supplierSku: e.target.value })}
                placeholder="ME-CAP-001"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (KES)</label>
              <input
                type="number" step="0.01" min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                placeholder="250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Price (KES)</label>
              <input
                type="number" step="0.01" min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.bulkPrice}
                onChange={(e) => setForm({ ...form, bulkPrice: e.target.value })}
                placeholder="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Min Qty</label>
              <input
                type="number" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.bulkMinQuantity}
                onChange={(e) => setForm({ ...form, bulkMinQuantity: e.target.value })}
                placeholder="100"
              />
            </div>
          </div>

          {/* Image URL + preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL <span className="text-gray-400">(S3 or external)</span>
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.imageUrl}
                onChange={(e) => { setForm({ ...form, imageUrl: e.target.value }); setImagePreview(false); }}
                placeholder="https://s3.amazonaws.com/votecapsule-campaign-assets/..."
              />
              <button
                type="button"
                onClick={() => setImagePreview(!imagePreview)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
            {imagePreview && form.imageUrl && (
              <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg mx-auto"
                  onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).alt = 'Image not accessible'; }}
                />
              </div>
            )}
          </div>

          {/* Lead time + availability */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
              <input
                type="number" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
                value={form.productUrl}
                onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
                placeholder="https://meadvertising.co.ke/product/..."
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#0B3C6D] focus:ring-[#0B3C6D]"
                />
                <span className="text-gray-700 font-medium">Available</span>
              </label>
            </div>
          </div>

          {mut.isError && <p className="text-sm text-red-600">Failed to save product. Please try again.</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 px-4 py-2 text-sm font-medium bg-[#0B3C6D] text-white rounded-lg hover:bg-[#0a3460] disabled:opacity-50">
              {mut.isPending ? 'Saving…' : (editItem ? 'Update Product' : 'Add to Catalogue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierProductsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<SupplierProductAdmin | undefined>();

  const { data: categories = [] } = useQuery<MaterialCategory[]>({
    queryKey: ['admin-material-categories'],
    queryFn: () => campaignClient.get('/materials/categories').then(r => r.data?.data ?? r.data ?? []),
  });

  const { data: types = [] } = useQuery<MaterialType[]>({
    queryKey: ['admin-material-types'],
    queryFn: () => campaignClient.get('/materials/types').then(r => r.data?.data ?? r.data ?? []),
  });

  const { data: products = [], isLoading } = useQuery<SupplierProductAdmin[]>({
    queryKey: ['admin-supplier-products'],
    queryFn: () => campaignClient.get('/suppliers/products', { params: { all: true } }).then(r => r.data?.data ?? r.data ?? []),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => campaignClient.delete(`/suppliers/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-supplier-products'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      campaignClient.patch(`/suppliers/products/${id}`, { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-supplier-products'] }),
  });

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return !q || p.supplierProductName.toLowerCase().includes(q) || (p.supplierSku || '').toLowerCase().includes(q);
  });

  const withImage = products.filter(p => p.imageUrl).length;
  const withPrice = products.filter(p => p.unitPrice).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products.length, color: 'text-gray-900' },
          { label: 'With Images', value: withImage, color: 'text-emerald-600' },
          { label: 'With Pricing', value: withPrice, color: 'text-blue-600' },
          { label: 'Missing Images', value: products.length - withImage, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3C6D]"
            placeholder="Search supplier products…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0B3C6D] text-white rounded-lg hover:bg-[#0a3460]">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Product table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-4 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No supplier products found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-1">Image</div>
            <div className="col-span-3">Product</div>
            <div className="col-span-2">Material Type</div>
            <div className="col-span-1">Price</div>
            <div className="col-span-1">Bulk</div>
            <div className="col-span-1">Lead</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Actions</div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {filtered.map((p) => (
              <div key={p.id} className={clsx('grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-gray-50', !p.isAvailable && 'opacity-50')}>
                <div className="col-span-1">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Image className="w-4 h-4 text-gray-300" /></div>
                  )}
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-gray-900 truncate">{p.supplierProductName}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.supplierSku || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600 truncate">{p.materialTypeName || '—'}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs font-medium text-gray-900">{p.unitPrice ? `${p.currency} ${p.unitPrice.toLocaleString()}` : '—'}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-600">{p.bulkPrice ? `${p.bulkPrice.toLocaleString()}` : '—'}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-600">{p.leadTimeDays ? `${p.leadTimeDays}d` : '—'}</p>
                </div>
                <div className="col-span-1">
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', p.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                    {p.isAvailable ? 'Active' : 'Sold Out'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <button onClick={() => setEditItem(p)} className="p-1 text-gray-400 hover:text-[#0B3C6D]" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleMut.mutate({ id: p.id, isAvailable: !p.isAvailable })} className={clsx('p-1', p.isAvailable ? 'text-emerald-500 hover:text-red-500' : 'text-red-400 hover:text-emerald-500')} title="Toggle">
                    {p.isAvailable ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { if (confirm('Delete this product?')) deleteMut.mutate(p.id); }} className="p-1 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(showAdd || editItem) && (
        <AddSupplierProductModal
          categories={categories}
          types={types}
          editItem={editItem}
          onClose={() => { setShowAdd(false); setEditItem(undefined); }}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

function CampaignAdminContent(): React.JSX.Element {
  const [tab, setTab] = useState<'campaigns' | 'catalogue' | 'suppliers' | 'roles'>('campaigns');

  const tabs = [
    { key: 'campaigns', label: 'All Campaigns',      icon: Megaphone },
    { key: 'catalogue', label: 'Material Catalogue', icon: Package },
    { key: 'suppliers', label: 'Supplier Products',  icon: Store },
    { key: 'roles',     label: 'Campaign Roles',     icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Manager</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide campaign oversight, material catalogue management, and role access matrix
        </p>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === key
                ? 'border-[#0B3C6D] text-[#0B3C6D]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'catalogue' && <MaterialCatalogueTab />}
      {tab === 'suppliers' && <SupplierProductsTab />}
      {tab === 'roles'     && <CampaignRolesTab />}
    </div>
  );
}

export function CampaignAdminPage() {
  return (
    <PageErrorBoundary page="Campaign Admin">
      <CampaignAdminContent />
    </PageErrorBoundary>
  );
}
