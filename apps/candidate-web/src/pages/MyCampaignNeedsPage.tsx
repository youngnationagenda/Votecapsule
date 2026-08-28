// ============================================================
// VoteCapsule™ — My Campaign Needs (Candidate Portal)
// UNIFIED page: merged Needs List + Printing & Design.
// 3 tabs: Plan (budget/recommendations), Design (AI mockups),
// Orders (track fulfilment). Browsable WITHOUT a campaign.
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, X, Trash2, Package, MapPin, Users,
  CheckCircle, Clock, AlertTriangle, Calculator, Target,
  TrendingUp, Palette, Sparkles, FileImage, Truck, Star,
  Printer, Eye, Info,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Recommended quantities calculator ────────────────────────
function calculateRecommended(code: string, wardCount: number, voters: number, _stations: number): number {
  const lc = (code || '').toLowerCase();
  if (lc.includes('poster') || lc.includes('banner')) return wardCount * 500;
  if (lc.includes('billboard') || lc.includes('hoarding')) return wardCount * 2;
  if (lc.includes('flag') || lc.includes('bunting')) return wardCount * 100;
  if (lc.includes('t_shirt') || lc.includes('tshirt')) return Math.ceil(voters * 0.05);
  if (lc.includes('cap') || lc.includes('hat')) return Math.ceil(voters * 0.03);
  if (lc.includes('hoodie') || lc.includes('jacket')) return Math.ceil(voters * 0.01);
  if (lc.includes('vest') || lc.includes('bib')) return wardCount * 50;
  if (lc.includes('flyer') || lc.includes('leaflet') || lc.includes('brochure')) return Math.ceil(voters * 0.3);
  if (lc.includes('business_card') || lc.includes('card')) return Math.ceil(voters * 0.1);
  if (lc.includes('manifesto') || lc.includes('booklet')) return Math.ceil(voters * 0.05);
  if (lc.includes('sticker')) return Math.ceil(voters * 0.1);
  if (lc.includes('vehicle_wrap') || lc.includes('car_branding')) return 3;
  if (lc.includes('tent') || lc.includes('gazebo')) return wardCount;
  if (lc.includes('stage') || lc.includes('podium')) return 2;
  if (lc.includes('pen') || lc.includes('pencil')) return Math.ceil(voters * 0.05);
  if (lc.includes('wristband') || lc.includes('bracelet')) return Math.ceil(voters * 0.05);
  if (lc.includes('bag') || lc.includes('tote')) return Math.ceil(voters * 0.02);
  if (lc.includes('umbrella')) return wardCount * 20;
  if (lc.includes('mug') || lc.includes('cup')) return wardCount * 50;
  if (lc.includes('balloon')) return wardCount * 200;
  return wardCount * 50;
}

interface NeedItem {
  id: string;
  materialTypeId: string;
  materialTypeName: string;
  materialTypeCode: string;
  categoryName: string;
  quantity: number;
  recommendedQty: number;
  unitCost: number;
  totalCost: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  orderStatus: 'needed' | 'ordered' | 'delivered';
  notes: string;
}

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => campaignApi.list({ candidate: true }).then(r => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

// ── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    generating: 'bg-purple-100 text-purple-700',
    generated: 'bg-indigo-100 text-indigo-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_production: 'bg-orange-100 text-orange-700',
    dispatched: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    needed: 'bg-blue-100 text-blue-700',
    ordered: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

// ── Add Need Modal ───────────────────────────────────────────
function AddNeedModal({ wardCount, voters, stations, onAdd, onClose }: {
  wardCount: number; voters: number; stations: number;
  onAdd: (item: Omit<NeedItem, 'id'>) => void;
  onClose: () => void;
}) {
  const [catFilter, setCatFilter] = useState('all');
  const [selectedType, setSelected] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then(r => r.data?.data ?? r.data ?? []),
    retry: 1, staleTime: 5 * 60_000,
  });

  const { data: types = [], isLoading: typesLoading, isError: typesError } = useQuery({
    queryKey: ['material-types'],
    queryFn: () => campaignApi.materials.listTypes().then(r => r.data?.data ?? r.data ?? []),
    retry: 1, staleTime: 5 * 60_000,
  });

  const filteredTypes = catFilter === 'all' ? types : types.filter((t: any) =>
    t.categoryId === catFilter || t.category?.id === catFilter || t.category?.code === catFilter
  );

  const handleSelect = (t: any) => {
    setSelected(t);
    setQuantity(calculateRecommended(t.code, wardCount, voters, stations));
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    const cost = Number(selectedType.typicalCostMin) || 0;
    onAdd({
      materialTypeId: selectedType.id,
      materialTypeName: selectedType.name,
      materialTypeCode: selectedType.code,
      categoryName: selectedType.category?.name ?? selectedType.categoryName ?? '',
      quantity,
      recommendedQty: calculateRecommended(selectedType.code, wardCount, voters, stations),
      unitCost: cost,
      totalCost: cost * quantity,
      priority,
      orderStatus: 'needed',
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><Plus className="w-5 h-5 text-amber-500" /> Add Campaign Need</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="vc-input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type *</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl">
              {filteredTypes.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  {typesLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                      Loading materials…
                    </span>
                  ) : typesError ? (
                    <span className="text-red-500">Failed to load materials. Check that Campaign service is running.</span>
                  ) : types.length === 0 ? (
                    'No materials found — migration may not have run yet.'
                  ) : (
                    'No items in this category'
                  )}
                </div>
              )}
              {filteredTypes.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b border-gray-50 last:border-0 ${
                    selectedType?.id === t.id ? 'bg-amber-50 border-amber-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-400">{t.category?.name ?? t.categoryName ?? t.code}</p>
                  </div>
                  {t.typicalCostMin && <span className="text-xs text-gray-500">~KES {Number(t.typicalCostMin).toLocaleString()}</span>}
                </button>
              ))}
            </div>
          </div>

          {selectedType && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-amber-600">(Recommended: {calculateRecommended(selectedType.code, wardCount, voters, stations).toLocaleString()})</span>
                </label>
                <input type="number" min="1" className="vc-input" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
                <p className="text-[10px] text-gray-400 mt-1">Based on {wardCount} wards, {voters.toLocaleString()} voters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
                    <button key={p} onClick={() => setPriority(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${
                        priority === p
                          ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                          : p === 'high' ? 'bg-orange-500 text-white border-orange-500'
                          : p === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-500 text-white border-gray-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="vc-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Need party colours, specific text..." />
              </div>

              {selectedType.typicalCostMin && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700">Estimated cost: <span className="font-bold">KES {(Number(selectedType.typicalCostMin) * quantity).toLocaleString()}</span></p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={!selectedType || quantity < 1} className="flex-1 vc-btn-primary flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add to List
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Design Request Modal ──────────────────────────────
function CreateDesignModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    materialTypeCode: '', candidateName: '', slogan: '',
    primaryColor: '#F59E0B', secondaryColor: '#1F2937', notes: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then((r) => r.data?.data ?? r.data ?? []),
  });

  const printCategories = categories.filter((c: any) =>
    ['printed_materials', 'banners_signage', 'branded_merchandise', 'outdoor_advertising'].includes(c.code)
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
              {printCategories.map((c: any) => <option key={c.code ?? c.id} value={c.code}>{c.name}</option>)}
              {printCategories.length === 0 && (
                <>
                  <option value="posters">Posters</option>
                  <option value="flyers">Flyers & Leaflets</option>
                  <option value="banners">Banners & Signage</option>
                  <option value="tshirts">T-Shirts</option>
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
                <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <input className="vc-input flex-1 text-sm" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
                <input className="vc-input flex-1 text-sm" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
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

// ── PLAN TAB ─────────────────────────────────────────────────
function PlanTab({ campaign }: { campaign: any }) {
  const user = useAppSelector((s) => s.auth.user) as any;
  const [showAdd, setShowAdd] = useState(false);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'needed' | 'ordered' | 'delivered'>('all');

  const wardCount = campaign?.wardCount ?? user?.wardCount ?? 5;
  const registeredVoters = campaign?.registeredVoters ?? user?.registeredVoters ?? 45000;
  const pollingStations = Math.ceil(registeredVoters / 700);

  const { data: orders = [] } = useQuery({
    queryKey: ['material-orders', campaign?.id],
    queryFn: () => campaign ? campaignApi.materials.listOrders(campaign.id).then(r => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const handleAdd = (item: Omit<NeedItem, 'id'>) => {
    setNeeds([...needs, { ...item, id: `need-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
  };
  const handleRemove = (id: string) => setNeeds(needs.filter(n => n.id !== id));
  const handleStatusChange = (id: string, status: 'needed' | 'ordered' | 'delivered') => {
    setNeeds(needs.map(n => n.id === id ? { ...n, orderStatus: status } : n));
  };

  const allItems = useMemo(() => {
    const orderItems: NeedItem[] = orders.map((o: any) => ({
      id: o.id, materialTypeId: o.materialTypeId ?? '', materialTypeName: o.materialName ?? o.materialTypeName ?? 'Item',
      materialTypeCode: o.materialTypeCode ?? '', categoryName: o.categoryName ?? '', quantity: o.quantity ?? 0,
      recommendedQty: 0, unitCost: o.unitCost ?? 0, totalCost: o.totalCost ?? (o.unitCost ?? 0) * (o.quantity ?? 0),
      priority: 'medium' as const,
      orderStatus: o.status === 'delivered' ? 'delivered' as const : o.status === 'pending' || o.status === 'processing' ? 'ordered' as const : 'needed' as const,
      notes: o.notes ?? '',
    }));
    return [...needs, ...orderItems];
  }, [needs, orders]);

  const filtered = filter === 'all' ? allItems : allItems.filter(i => i.orderStatus === filter);
  const totalBudget = allItems.reduce((s, i) => s + i.totalCost, 0);
  const neededCount = allItems.filter(i => i.orderStatus === 'needed').length;
  const orderedCount = allItems.filter(i => i.orderStatus === 'ordered').length;
  const deliveredCount = allItems.filter(i => i.orderStatus === 'delivered').length;

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600',
  };
  const statusColors: Record<string, string> = {
    needed: 'bg-blue-100 text-blue-700', ordered: 'bg-amber-100 text-amber-700', delivered: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-5">
      {/* Geography context */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Wards', value: wardCount, icon: Target, color: 'text-blue-600 bg-blue-50' },
          { label: 'Voters', value: registeredVoters.toLocaleString(), icon: Users, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Stations', value: pollingStations, icon: MapPin, color: 'text-violet-600 bg-violet-50' },
          { label: 'Est. Budget', value: `KES ${totalBudget >= 1_000_000 ? `${(totalBudget/1_000_000).toFixed(1)}M` : `${(totalBudget/1_000).toFixed(0)}K`}`, icon: Calculator, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase">{label}</p><p className="text-sm font-bold text-gray-900">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Add + filter row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([
            { key: 'all', label: `All (${allItems.length})` },
            { key: 'needed', label: `Needed (${neededCount})` },
            { key: 'ordered', label: `Ordered (${orderedCount})` },
            { key: 'delivered', label: `Delivered (${deliveredCount})` },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${filter === key ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'}`}
            >{label}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Needs list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-16">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">No items yet</p>
          <p className="text-sm text-gray-400 mt-1">Add items to build your campaign needs list with auto-calculated quantities</p>
          <button onClick={() => setShowAdd(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm mt-4">
            <Plus className="w-4 h-4" /> Add First Item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-amber-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.materialTypeName}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[item.priority]}`}>{item.priority}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.categoryName} · {item.quantity.toLocaleString()} units</p>
                {item.notes && <p className="text-[10px] text-gray-400 mt-0.5">{item.notes}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{item.totalCost > 0 ? `KES ${item.totalCost.toLocaleString()}` : '—'}</p>
                {item.recommendedQty > 0 && item.quantity < item.recommendedQty && (
                  <p className="text-[10px] text-amber-600">Rec: {item.recommendedQty.toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select value={item.orderStatus} onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-medium border-0 ${statusColors[item.orderStatus]}`}>
                  <option value="needed">Needed</option>
                  <option value="ordered">Ordered</option>
                  <option value="delivered">Delivered</option>
                </select>
                {needs.some(n => n.id === item.id) && (
                  <button onClick={() => handleRemove(item.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget impact */}
      {allItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-600" /><p className="text-sm font-bold text-gray-900">Budget Impact</p></div>
            <p className="text-lg font-bold text-amber-700">KES {totalBudget.toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><p className="text-[10px] text-gray-500">Needed</p><p className="text-sm font-bold text-blue-600">KES {allItems.filter(i => i.orderStatus === 'needed').reduce((s, i) => s + i.totalCost, 0).toLocaleString()}</p></div>
            <div><p className="text-[10px] text-gray-500">Ordered</p><p className="text-sm font-bold text-amber-600">KES {allItems.filter(i => i.orderStatus === 'ordered').reduce((s, i) => s + i.totalCost, 0).toLocaleString()}</p></div>
            <div><p className="text-[10px] text-gray-500">Delivered</p><p className="text-sm font-bold text-emerald-600">KES {allItems.filter(i => i.orderStatus === 'delivered').reduce((s, i) => s + i.totalCost, 0).toLocaleString()}</p></div>
          </div>
        </div>
      )}

      {showAdd && <AddNeedModal wardCount={wardCount} voters={registeredVoters} stations={pollingStations} onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ── DESIGN TAB ───────────────────────────────────────────────
function DesignTab({ campaign }: { campaign: any }) {
  const [showDesignModal, setDesignModal] = useState(false);

  const { data: designs = [] } = useQuery({
    queryKey: ['my-designs', campaign?.id],
    queryFn: () => campaign ? campaignApi.designs.list(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  if (!campaign) return (
    <div className="bg-white border border-gray-200 rounded-2xl text-center py-16">
      <Palette className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm mb-2">Create a campaign to request AI-generated designs.</p>
      <a href="/campaign" className="inline-block mt-1 text-sm text-amber-600 hover:underline font-medium">Create your campaign →</a>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{designs.length} design request{designs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setDesignModal(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" /> New Design
        </button>
      </div>

      {designs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-12">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {designs.map((d: any) => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-0 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                {d.previewUrl ? (
                  <img src={d.previewUrl} alt="Preview" className="w-full h-full object-cover" />
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

      {showDesignModal && <CreateDesignModal campaignId={campaign.id} onClose={() => setDesignModal(false)} />}
    </div>
  );
}

// ── ORDERS TAB ───────────────────────────────────────────────
function OrdersTab({ campaign }: { campaign: any }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['all-material-orders', campaign?.id],
    queryFn: () => campaign ? campaignApi.materials.listOrders(campaign.id).then((r) => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  if (!campaign) return (
    <div className="bg-white border border-gray-200 rounded-2xl text-center py-16">
      <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Create a campaign to track orders.</p>
      <a href="/campaign" className="inline-block mt-2 text-sm text-amber-600 hover:underline font-medium">Create your campaign →</a>
    </div>
  );

  if (orders.length === 0) return (
    <div className="bg-white border border-gray-200 rounded-2xl text-center py-12">
      <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm mb-2">No orders placed yet.</p>
      <p className="text-xs text-gray-400 max-w-sm mx-auto">
        Orders placed from the Supplier Catalogue or through design approvals will appear here for tracking.
      </p>
      <a href="/campaign/suppliers" className="inline-block mt-3 text-sm text-amber-600 hover:underline font-medium">Browse Supplier Catalogue →</a>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
      {orders.map((o: any) => (
        <div key={o.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{o.materialName ?? o.orderNumber ?? `Order #${o.id?.slice(0,8)}`}</p>
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
          <div className="text-right flex-shrink-0">
            {o.totalCost && <p className="text-sm font-bold text-gray-900">KES {Number(o.totalCost).toLocaleString()}</p>}
          </div>
          <StatusBadge status={o.productionStatus ?? o.status} />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
function MyCampaignNeedsContent(): React.JSX.Element {
  const campaign = useMyCampaign();
  const [tab, setTab] = useState<'plan' | 'design' | 'orders'>('plan');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            My Campaign Needs
          </h2>
          <p className="text-sm text-gray-500 mt-1">Plan materials, request designs, and track all orders</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'plan' as const, label: 'Plan & Budget', icon: Calculator },
          { key: 'design' as const, label: 'Design Requests', icon: Palette },
          { key: 'orders' as const, label: 'Order Tracking', icon: Truck },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'plan' && <PlanTab campaign={campaign} />}
      {tab === 'design' && <DesignTab campaign={campaign} />}
      {tab === 'orders' && <OrdersTab campaign={campaign} />}
    </div>
  );
}

export function MyCampaignNeedsPage() {
  return (
    <PageErrorBoundary page="Campaign Needs">
      <MyCampaignNeedsContent />
    </PageErrorBoundary>
  );
}
