// ============================================================
// VoteCapsule™ — My Campaign Needs (Shopping List)
// Candidate creates a needs list → quantities auto-calculated
// from wards/voters → tracks order status → budget impact
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, X, Trash2, Package, MapPin, Users,
  CheckCircle, Clock, AlertTriangle, Calculator, ArrowRight,
  Edit, Save, Target, TrendingUp,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Recommended quantities calculator ────────────────────────
function calculateRecommended(code: string, wardCount: number, voters: number, stations: number): number {
  const lc = (code || '').toLowerCase();
  // Posters & signage
  if (lc.includes('poster') || lc.includes('banner')) return wardCount * 500;
  if (lc.includes('billboard') || lc.includes('hoarding')) return wardCount * 2;
  if (lc.includes('flag') || lc.includes('bunting')) return wardCount * 100;
  // Branded clothing
  if (lc.includes('t_shirt') || lc.includes('tshirt')) return Math.ceil(voters * 0.05);
  if (lc.includes('cap') || lc.includes('hat')) return Math.ceil(voters * 0.03);
  if (lc.includes('hoodie') || lc.includes('jacket')) return Math.ceil(voters * 0.01);
  if (lc.includes('vest') || lc.includes('bib')) return wardCount * 50;
  // Print materials
  if (lc.includes('flyer') || lc.includes('leaflet') || lc.includes('brochure')) return Math.ceil(voters * 0.3);
  if (lc.includes('business_card') || lc.includes('card')) return Math.ceil(voters * 0.1);
  if (lc.includes('manifesto') || lc.includes('booklet')) return Math.ceil(voters * 0.05);
  // Stickers & wraps
  if (lc.includes('sticker')) return Math.ceil(voters * 0.1);
  if (lc.includes('vehicle_wrap') || lc.includes('car_branding')) return 3;
  // Outdoor
  if (lc.includes('tent') || lc.includes('gazebo')) return wardCount;
  if (lc.includes('stage') || lc.includes('podium')) return 2;
  // Miscellaneous
  if (lc.includes('pen') || lc.includes('pencil')) return Math.ceil(voters * 0.05);
  if (lc.includes('wristband') || lc.includes('bracelet')) return Math.ceil(voters * 0.05);
  if (lc.includes('bag') || lc.includes('tote')) return Math.ceil(voters * 0.02);
  if (lc.includes('umbrella')) return wardCount * 20;
  if (lc.includes('mug') || lc.includes('cup')) return wardCount * 50;
  if (lc.includes('balloon')) return wardCount * 200;
  // Default — small quantity for unknown
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

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then(r => r.data?.data ?? r.data ?? []),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const { data: types = [], isLoading: typesLoading, isError: typesError } = useQuery({
    queryKey: ['material-types'],
    queryFn: () => campaignApi.materials.listTypes().then(r => r.data?.data ?? r.data ?? []),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const filteredTypes = catFilter === 'all' ? types : types.filter((t: any) => t.categoryId === catFilter || t.category?.id === catFilter || t.category?.code === catFilter);

  const handleSelect = (t: any) => {
    setSelected(t);
    const rec = calculateRecommended(t.code, wardCount, voters, stations);
    setQuantity(rec);
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
          {/* Category filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="vc-input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Material type selection */}
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
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-amber-600">(Recommended: {calculateRecommended(selectedType.code, wardCount, voters, stations).toLocaleString()})</span>
                </label>
                <input type="number" min="1" className="vc-input" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
                <p className="text-[10px] text-gray-400 mt-1">Based on {wardCount} wards, {voters.toLocaleString()} voters</p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${
                        priority === p
                          ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                          : p === 'high' ? 'bg-orange-500 text-white border-orange-500'
                          : p === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-500 text-white border-gray-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="vc-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Need party colours, specific text..." />
              </div>

              {/* Cost preview */}
              {selectedType.typicalCostMin && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700">Estimated cost: <span className="font-bold">KES {(selectedType.typicalCostMin * quantity).toLocaleString()}</span></p>
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

// ── Main Page ────────────────────────────────────────────────
function MyCampaignNeedsContent(): React.JSX.Element {
  const user = useAppSelector((s) => s.auth.user) as any;
  const campaign = useMyCampaign();
  const [showAdd, setShowAdd] = useState(false);
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'needed' | 'ordered' | 'delivered'>('all');

  // Geography
  const wardCount = campaign?.wardCount ?? user?.wardCount ?? 5;
  const registeredVoters = campaign?.registeredVoters ?? user?.registeredVoters ?? 45000;
  const pollingStations = Math.ceil(registeredVoters / 700);

  // Load saved needs from orders
  const { data: orders = [] } = useQuery({
    queryKey: ['material-orders', campaign?.id],
    queryFn: () => campaign ? campaignApi.materials.listOrders(campaign.id).then(r => r.data?.data ?? r.data ?? []) : [],
    enabled: !!campaign?.id,
  });

  const handleAdd = (item: Omit<NeedItem, 'id'>) => {
    setNeeds([...needs, { ...item, id: `need-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
  };

  const handleRemove = (id: string) => {
    setNeeds(needs.filter(n => n.id !== id));
  };

  const handleStatusChange = (id: string, status: 'needed' | 'ordered' | 'delivered') => {
    setNeeds(needs.map(n => n.id === id ? { ...n, orderStatus: status } : n));
  };

  // Combine manual needs + existing orders
  const allItems = useMemo(() => {
    const orderItems: NeedItem[] = orders.map((o: any) => ({
      id: o.id,
      materialTypeId: o.materialTypeId ?? '',
      materialTypeName: o.materialName ?? o.materialTypeName ?? 'Item',
      materialTypeCode: o.materialTypeCode ?? '',
      categoryName: o.categoryName ?? '',
      quantity: o.quantity ?? 0,
      recommendedQty: 0,
      unitCost: o.unitCost ?? 0,
      totalCost: o.totalCost ?? (o.unitCost ?? 0) * (o.quantity ?? 0),
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

  const priorityColors = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-gray-100 text-gray-600',
  };
  const statusColors = {
    needed: 'bg-blue-100 text-blue-700',
    ordered: 'bg-amber-100 text-amber-700',
    delivered: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            My Campaign Needs
          </h2>
          <p className="text-sm text-gray-500 mt-1">Plan what you need, track orders, monitor budget impact</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

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

      {/* Status filter */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: `All (${allItems.length})` },
          { key: 'needed', label: `Needed (${neededCount})` },
          { key: 'ordered', label: `Ordered (${orderedCount})` },
          { key: 'delivered', label: `Delivered (${deliveredCount})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${filter === key ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Needs list */}
      {filtered.length === 0 ? (
        <div className="vc-card text-center py-16">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">No items yet</p>
          <p className="text-sm text-gray-400 mt-1">Add items to build your campaign needs list</p>
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
                <select
                  value={item.orderStatus}
                  onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-medium border-0 ${statusColors[item.orderStatus]}`}
                >
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

      {/* Budget impact summary */}
      {allItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-bold text-gray-900">Budget Impact</p>
            </div>
            <p className="text-lg font-bold text-amber-700">KES {totalBudget.toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><p className="text-[10px] text-gray-500">Needed</p><p className="text-sm font-bold text-blue-600">KES {allItems.filter(i => i.orderStatus === 'needed').reduce((s, i) => s + i.totalCost, 0).toLocaleString()}</p></div>
            <div><p className="text-[10px] text-gray-500">Ordered</p><p className="text-sm font-bold text-amber-600">KES {allItems.filter(i => i.orderStatus === 'ordered').reduce((s, i) => s + i.totalCost, 0).toLocaleString()}</p></div>
            <div><p className="text-[10px] text-gray-500">Delivered</p><p className="text-sm font-bold text-emerald-600">KES {allItems.filter(i => i.orderStatus === 'delivered').reduce((s, i) => s + i.totalCost, 0).toLocaleString()}</p></div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddNeedModal
          wardCount={wardCount}
          voters={registeredVoters}
          stations={pollingStations}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
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
