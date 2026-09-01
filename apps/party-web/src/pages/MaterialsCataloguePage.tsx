// ============================================================
// VoteCapsule™ — Campaign Materials Catalogue (Party Portal)
// Phase 14B — Browse material types, select colours, create orders
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Package, ChevronRight, SlidersHorizontal,
  CheckCircle, AlertTriangle, X,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { CampaignMaterialIcon, CampaignCategoryIcon } from '../components/CampaignMaterialIcon';
import { MaterialColorModal } from '../components/MaterialColorModal';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';
import type { ColorSelection } from '../components/CampaignColorPicker';

// ── Types ─────────────────────────────────────────────────────
interface Category { id: string; code: string; name: string; isActive: boolean; sortOrder: number; }
interface MaterialType {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  minOrderQuantity: number;
  leadTimeDays: number;
  typicalCostMin?: number;
  typicalCostMax?: number;
  thumbnailUrl?: string;
  isActive: boolean;
  // categoryName is injected by MaterialColorModal (optional here, required there)
  categoryName?: string;
}

// ── Utility ───────────────────────────────────────────────────
function getCategoryName(cats: Category[], id: string) {
  return cats.find((c) => c.id === id)?.name ?? '';
}

// ── Order Confirm Modal ───────────────────────────────────────
function QuickOrderModal({
  material,
  colors,
  quantity,
  campaignId,
  onClose,
  onSuccess,
}: {
  material: MaterialType;
  colors: ColorSelection;
  quantity: number;
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      campaignApi.materials.createOrder(campaignId, {
        materialTypeId: material.id,
        materialName:   material.name,
        quantity,
        colour:         colors.primary,
        specifications: { primaryColour: colors.primary, secondaryColour: colors.secondary },
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-material-orders'] });
      onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-bold text-gray-900">Confirm Order</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
            <CampaignMaterialIcon code={material.code} size={52} className="rounded-xl flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">{material.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {quantity.toLocaleString()} {material.unit}s
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {[{ label: 'Primary', color: colors.primary }, { label: 'Secondary', color: colors.secondary }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 flex-1 bg-gray-50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs font-mono font-bold text-gray-900">{color}</p>
                </div>
              </div>
            ))}
          </div>
          {material.typicalCostMin && material.typicalCostMax && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-700">Estimated cost</p>
              <p className="font-bold text-emerald-900">
                KES {(material.typicalCostMin * quantity).toLocaleString()} – {(material.typicalCostMax * quantity).toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              className="vc-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements…"
            />
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to create order. Please try again.</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="flex-1 vc-btn-primary"
            >
              {mut.isPending ? 'Placing…' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
function MaterialsCatalogueContent(): React.JSX.Element {
  const user  = useAppSelector((s) => s.auth.user);

  const [search, setSearch]           = useState('');
  const [selectedCat, setCat]         = useState<string>('all');
  const [colorModal, setColorModal]   = useState<MaterialType | null>(null);
  const [orderModal, setOrderModal]   = useState<{
    material: MaterialType; colors: ColorSelection; quantity: number
  } | null>(null);
  const [orderSuccess, setSuccess]    = useState(false);

  // Get active campaign
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn:  () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []),
  });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  // Material categories — backend returns raw array
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['material-categories'],
    queryFn:  () => campaignApi.materials.listCategories().then((r: any) => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    }),
  });

  // Material types — backend returns raw array with thumbnailUrl field
  const { data: types = [], isLoading } = useQuery<MaterialType[]>({
    queryKey: ['material-types', selectedCat],
    queryFn:  () => campaignApi.materials.listTypes(
      selectedCat !== 'all' ? { category: selectedCat } : undefined
    ).then((r: any) => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return types.filter((t) =>
      t.isActive && (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
    );
  }, [types, search]);

  // Default colors from user's party brand
  const defaultColors: ColorSelection = {
    primary:   (user as any)?.partyPrimaryColor   ?? '#FF6600',
    secondary: (user as any)?.partySecondaryColor  ?? '#000000',
  };

  const handleCustomise = (material: MaterialType, colors: ColorSelection) => {
    // Opens full Design Studio — TODO: route to /campaign/design/:materialId
    setColorModal(null);
    alert(`Design Studio for ${material.name} — coming soon once Sonie completes the mockup engine.`);
  };

  const handleQuickOrder = (material: MaterialType, colors: ColorSelection, quantity: number) => {
    setColorModal(null);
    setOrderModal({ material, colors, quantity });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Campaign Materials</h2>
        <p className="text-sm text-gray-500 mt-1">
          Browse, colour-select and order campaign materials for your candidates
        </p>
      </div>

      {/* Order success toast */}
      {orderSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">Order placed successfully! Check Campaign Materials → Orders.</p>
          <button onClick={() => setSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* No campaign banner */}
      {!campaign && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-violet-500 flex-shrink-0" />
          <p className="text-sm text-violet-700">Create a campaign to place material orders for your candidates. <a href="/campaign/create" className="font-semibold underline hover:text-violet-900">Get started →</a></p>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="vc-input pl-9"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCat('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            selectedCat === 'all'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'
          }`}
        >
          <Package className="w-4 h-4" /> All Materials
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCat === 'all' ? 'bg-violet-500' : 'bg-gray-100 text-gray-500'}`}>
            {types.length}
          </span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCat(cat.code)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCat === cat.code
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'
            }`}
          >
            <CampaignCategoryIcon categoryCode={cat.code} size={20} className="flex-shrink-0 rounded-md" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="vc-card h-52 animate-pulse">
              <div className="w-full h-28 bg-gray-100 rounded-xl mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="vc-card text-center py-16">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          {types.length === 0 ? (
            <>
              <p className="text-base font-semibold text-gray-700">Catalogue is empty</p>
              <p className="text-sm text-gray-400 mt-1">
                Waiting for Sonie to run migration 138 (500+ material types seed).
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No materials match your search.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <MaterialCard
              key={item.id}
              item={item}
              categoryName={getCategoryName(categories, item.categoryId)}
              onSelect={() => setColorModal(item)}
            />
          ))}
        </div>
      )}

      {/* Colour selection modal */}
      {colorModal && (
        <MaterialColorModal
          material={{ ...colorModal, categoryName: getCategoryName(categories, colorModal.categoryId) }}
          defaultColors={defaultColors}
          onClose={() => setColorModal(null)}
          onCustomise={handleCustomise}
          onQuickOrder={handleQuickOrder}
        />
      )}

      {/* Order confirmation modal */}
      {orderModal && campaign && (
        <QuickOrderModal
          material={orderModal.material}
          colors={orderModal.colors}
          quantity={orderModal.quantity}
          campaignId={campaign.id}
          onClose={() => setOrderModal(null)}
          onSuccess={() => { setOrderModal(null); setSuccess(true); }}
        />
      )}
    </div>
  );
}

// ── Material Card ─────────────────────────────────────────────
function MaterialCard({
  item,
  categoryName,
  onSelect,
}: {
  item: MaterialType;
  categoryName: string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`vc-card text-left p-3 transition-all group flex flex-col gap-2 ${
        hovered ? 'border-violet-300 shadow-lg -translate-y-0.5' : ''
      }`}
    >
      {/* Icon / thumbnail */}
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center relative">
        {item.thumbnailUrl && !imgError ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
            crossOrigin="anonymous"
          />
        ) : (
          <CampaignMaterialIcon code={item.code} size={72} />
        )}
        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-violet-600/10 rounded-xl flex items-center justify-center transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            Choose Colour <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{categoryName}</p>
      </div>

      {/* Cost + MOQ */}
      <div className="flex items-center justify-between mt-auto">
        {item.typicalCostMin ? (
          <p className="text-xs font-medium text-emerald-700">
            from KES {item.typicalCostMin.toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-gray-400">Price TBC</p>
        )}
        <p className="text-[10px] text-gray-400">Min {item.minOrderQuantity}</p>
      </div>
    </button>
  );
}

export function MaterialsCataloguePage() {
  return (
    <PageErrorBoundary page="Materials Catalogue">
      <MaterialsCatalogueContent />
    </PageErrorBoundary>
  );
}
