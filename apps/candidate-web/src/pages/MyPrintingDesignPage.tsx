// ============================================================
// VoteCapsule™ — Printing & Design Services (Candidate Portal)
// Phase 14B — Design requests, print-ready outputs, and
// material orders filtered to printed materials.
// Accessible from Campaign Manager section.
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, Palette, Image, Package, Clock, CheckCircle,
  Plus, Eye, X, ChevronRight, AlertCircle, Sparkles,
  FileImage, Truck, Star, AlertTriangle,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

// ── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:          'bg-gray-100 text-gray-600',
    pending:        'bg-amber-100 text-amber-700',
    in_progress:    'bg-blue-100 text-blue-700',
    generating:     'bg-purple-100 text-purple-700',
    generated:      'bg-indigo-100 text-indigo-700',
    approved:       'bg-emerald-100 text-emerald-700',
    in_production:  'bg-orange-100 text-orange-700',
    quality_check:  'bg-cyan-100 text-cyan-700',
    dispatched:     'bg-blue-100 text-blue-700',
    delivered:      'bg-green-100 text-green-700',
    rejected:       'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

// ── Create Design Request Modal ──────────────────────────────
function CreateDesignModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    materialTypeCode: '',
    candidateName: '',
    slogan: '',
    primaryColor: '#F59E0B',
    secondaryColor: '#1F2937',
    notes: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then((r) => r.data?.data ?? r.data ?? []),
  });

  // Filter to print-relevant categories
  const printCategories = categories.filter((c: any) =>
    ['printed_materials','banners_signage','branded_merchandise','outdoor_advertising'].includes(c.code)
  );

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.designs.create(campaignId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-designs'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">New Design Request</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
            <select className="vc-input" required value={form.materialTypeCode}
              onChange={(e) => setForm({ ...form, materialTypeCode: e.target.value })}>
              <option value="">Select a category…</option>
              {printCategories.map((c: any) => (
                <option key={c.code ?? c.id} value={c.code}>{c.name}</option>
              ))}
              {printCategories.length === 0 && (
                <>
                  <option value="posters">Posters</option>
                  <option value="flyers">Flyers & Leaflets</option>
                  <option value="banners">Banners & Signage</option>
                  <option value="business_cards">Business Cards</option>
                  <option value="tshirts">T-Shirts</option>
                  <option value="caps">Branded Caps</option>
                  <option value="vehicle_wraps">Vehicle Wraps</option>
                  <option value="billboards">Billboards</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name (as printed) *</label>
            <input className="vc-input" required value={form.candidateName}
              onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
              placeholder="e.g. Hon. Jane Wanjiku" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Slogan</label>
            <input className="vc-input" value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              placeholder="e.g. For the People, By the People" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <input className="vc-input flex-1 text-sm" value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <input className="vc-input flex-1 text-sm" value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea className="vc-input" rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Special instructions for the designer…" />
          </div>

          <div className="bg-purple-50 rounded-lg p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700">
              Our AI mockup engine will generate a preview based on your brand colours and photo.
              You can approve or request variations before sending to print.
            </p>
          </div>

          {mut.isError && <p className="text-sm text-red-600">Failed to create design request.</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Creating…' : 'Submit Design Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Printing & Design Page ──────────────────────────────
function PrintingDesignContent(): React.JSX.Element {
  const campaign = useMyCampaign();
  const [tab, setTab] = useState<'designs' | 'orders' | 'suppliers'>('designs');
  const [showDesignModal, setDesignModal] = useState(false);

  // ── Design requests ─────────────────────────────────────────
  const { data: designs = [] } = useQuery({
    queryKey: ['my-designs', campaign?.id],
    queryFn: () => campaign ? campaignApi.designs.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  // ── Print material orders ───────────────────────────────────
  const { data: orders = [] } = useQuery({
    queryKey: ['my-print-orders', campaign?.id],
    queryFn: () => campaign ? campaignApi.materials.listOrders(campaign.id, { category: 'printed_materials' }).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  // ── Print suppliers ─────────────────────────────────────────
  const { data: suppliers = [] } = useQuery({
    queryKey: ['print-suppliers'],
    queryFn: () => campaignApi.suppliers.list({ capability: 'printing' }).then((r) => r.data?.data ?? r.data ?? []),
  });

  return (
    <div className="space-y-5">
      {!campaign && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Create a campaign to request designs and place print orders. <a href="/campaign" className="font-semibold underline hover:text-amber-900">Get started →</a></p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Printing & Design</h2>
          <p className="text-sm text-gray-500 mt-1">Create designs, order printed materials, and manage suppliers</p>
        </div>
        <button onClick={() => setDesignModal(true)} disabled={!campaign} className={`vc-btn-primary inline-flex items-center gap-2 text-sm ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Plus className="w-4 h-4" /> New Design
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="vc-stat-card">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-500" />
            <p className="text-sm text-gray-500">Design Requests</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{designs.length}</p>
        </div>
        <div className="vc-stat-card">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-gray-500">Print Orders</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="vc-stat-card">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-gray-500">Print Suppliers</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{suppliers.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'designs' as const, label: `Designs (${designs.length})` },
          { key: 'orders' as const, label: `Print Orders (${orders.length})` },
          { key: 'suppliers' as const, label: `Suppliers (${suppliers.length})` },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Designs Tab ───────────────────────────────────────── */}
      {tab === 'designs' && (
        <div className="space-y-3">
          {designs.length === 0 ? (
            <div className="vc-card text-center py-12">
              <Palette className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">No design requests yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                Create a design request to generate AI-powered mockups for your campaign materials —
                posters, flyers, banners, T-shirts, vehicle wraps and more.
              </p>
              <button onClick={() => setDesignModal(true)} className="vc-btn-primary text-sm inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Create First Design
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {designs.map((d: any) => (
                <div key={d.id} className="vc-card p-0 overflow-hidden">
                  {/* Preview area */}
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    {d.previewUrl ? (
                      <img src={d.previewUrl} alt="Preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <FileImage className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {d.materialTypeCode?.replace(/_/g, ' ') ?? 'Design Request'}
                      </p>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{d.candidateName} · {d.slogan ?? 'No slogan'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: d.primaryColor ?? '#F59E0B' }} />
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: d.secondaryColor ?? '#1F2937' }} />
                      <span className="text-[10px] text-gray-400 ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Print Orders Tab ──────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="vc-card text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">No print orders placed yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Once you approve a design, you can place orders with our verified suppliers.
                Go to Campaign Materials to browse and order printed items.
              </p>
            </div>
          ) : (
            <div className="vc-card p-0 overflow-hidden divide-y divide-gray-50">
              {orders.map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{o.orderNumber ?? `Order #${o.id?.slice(0,8)}`}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">Qty: {o.quantity}</span>
                      {o.supplierName && <span className="text-xs text-gray-500">{o.supplierName}</span>}
                      {o.targetDeliveryDate && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {new Date(o.targetDeliveryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={o.productionStatus ?? o.status} />
                </div>
              ))}
            </div>
          )}

          {/* Quick link to materials page */}
          <a href="/campaign/materials" className="vc-card flex items-center gap-3 p-4 hover:bg-amber-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Printer className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Browse Printable Materials</p>
              <p className="text-xs text-gray-500">View the full catalogue of posters, flyers, banners, and more</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </a>
        </div>
      )}

      {/* ── Suppliers Tab ─────────────────────────────────────── */}
      {tab === 'suppliers' && (
        <div className="space-y-3">
          {suppliers.length === 0 ? (
            <div className="vc-card text-center py-12">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">No print suppliers found.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Verified printing suppliers will appear here. Browse the supplier catalogue for all options.
              </p>
            </div>
          ) : (
            <div className="vc-card p-0 overflow-hidden divide-y divide-gray-50">
              {suppliers.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Printer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.companyName ?? s.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {s.county && <span className="text-xs text-gray-500">{s.county}</span>}
                      {s.leadTimeDays && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{s.leadTimeDays} days</span>}
                      {s.qualityRating && (
                        <span className="text-xs text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400" /> {s.qualityRating}
                        </span>
                      )}
                    </div>
                    {s.capabilities && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(Array.isArray(s.capabilities) ? s.capabilities : []).slice(0, 4).map((cap: string) => (
                          <span key={cap} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{cap}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Quick link to full supplier catalogue */}
          <a href="/campaign/suppliers" className="vc-card flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Full Supplier Catalogue</p>
              <p className="text-xs text-gray-500">Browse all verified suppliers and compare prices</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </a>
        </div>
      )}

      {/* Design Modal */}
      {showDesignModal && campaign && <CreateDesignModal campaignId={campaign.id} onClose={() => setDesignModal(false)} />}
    </div>
  );
}

export function MyPrintingDesignPage() {
  return (
    <PageErrorBoundary page="Printing & Design">
      <PrintingDesignContent />
    </PageErrorBoundary>
  );
}
