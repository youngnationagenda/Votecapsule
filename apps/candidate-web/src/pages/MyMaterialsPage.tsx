// ============================================================
// VoteCapsule™ — My Campaign Materials (Candidate Portal)
// Candidates browse materials, select items, customise with
// their brand colours, and place orders to suppliers.
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Package, ChevronRight, SlidersHorizontal, X,
  CheckCircle, AlertTriangle, ShoppingCart, Store, Eye,
  Clock, Truck, ImageOff, Star, Plus, Minus, Palette,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { CampaignMaterialIcon, CampaignCategoryIcon } from '../components/CampaignMaterialIcon';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Types ─────────────────────────────────────────────────────
interface Category { id: string; code: string; name: string; isActive: boolean; sortOrder: number; }
interface MaterialType {
  id: string; code: string; name: string; description?: string;
  categoryId: string; unit: string; minOrderQuantity: number;
  leadTimeDays: number; typicalCostMin?: number; typicalCostMax?: number;
  thumbnailUrl?: string; isActive: boolean;
}

// ── Image with Fallback ──────────────────────────────────────
function ProductImage({ src, alt, code, className = '' }: {
  src?: string | null; alt: string; code?: string; className?: string;
}) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
        {code ? <CampaignMaterialIcon code={code} size={56} /> : <ImageOff className="w-10 h-10 text-gray-300" />}
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setError(true)} loading="lazy" />;
}

// ── Quantity Selector ────────────────────────────────────────
function QuantitySelector({ value, min, onChange }: {
  value: number; min: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - Math.max(10, min)))}
        disabled={value <= min}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
      >
        <Minus className="w-3 h-3" />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
        className="w-20 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1.5"
      />
      <button
        onClick={() => onChange(value + Math.max(10, min))}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Item Selection + Order Modal ─────────────────────────────
function ItemOrderModal({
  material,
  campaignId,
  onClose,
  onSuccess,
}: {
  material: MaterialType;
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);

  const [quantity, setQuantity] = useState(material.minOrderQuantity);
  const [primaryColor, setPrimaryColor] = useState((user as any)?.partyPrimaryColor || '#FF6600');
  const [secondaryColor, setSecondaryColor] = useState((user as any)?.partySecondaryColor || '#000000');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'select' | 'customise' | 'confirm'>('select');

  const estimatedCost = material.typicalCostMin
    ? { min: material.typicalCostMin * quantity, max: (material.typicalCostMax || material.typicalCostMin * 1.3) * quantity }
    : null;

  const mut = useMutation({
    mutationFn: () =>
      campaignApi.materials.createOrder(campaignId, {
        materialTypeId: material.id,
        materialName: material.name,
        quantity,
        colour: primaryColor,
        specifications: {
          primaryColour: primaryColor,
          secondaryColour: secondaryColor,
          candidateName: (user as any)?.name || '',
          position: (user as any)?.position || '',
        },
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-material-orders'] });
      onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {step === 'select' && 'Select Item'}
              {step === 'customise' && 'Customise Branding'}
              {step === 'confirm' && 'Confirm Order'}
            </h3>
            <p className="text-sm text-gray-500">{material.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1: Select — show item with image + quantity */}
          {step === 'select' && (
            <>
              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100">
                  <ProductImage
                    src={material.thumbnailUrl}
                    alt={material.name}
                    code={material.code}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-semibold text-gray-900">{material.name}</p>
                  {material.description && (
                    <p className="text-sm text-gray-500">{material.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {material.leadTimeDays} days lead time
                    </span>
                    <span>Min: {material.minOrderQuantity} {material.unit}s</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <QuantitySelector
                  value={quantity}
                  min={material.minOrderQuantity}
                  onChange={setQuantity}
                />
                <p className="text-xs text-gray-400">
                  Minimum order: {material.minOrderQuantity} {material.unit}s
                </p>
              </div>

              {estimatedCost && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 mb-1">Estimated Cost</p>
                  <p className="text-lg font-bold text-emerald-900">
                    KES {estimatedCost.min.toLocaleString()} – {estimatedCost.max.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    ({quantity.toLocaleString()} × KES {material.typicalCostMin?.toLocaleString()} ea.)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Step 2: Customise — colours + branding text */}
          {step === 'customise' && (
            <>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold text-violet-900">Brand Colours</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Primary Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Secondary Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                <div className="aspect-video flex items-center justify-center" style={{ backgroundColor: primaryColor + '22' }}>
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto rounded-xl overflow-hidden border-4" style={{ borderColor: primaryColor }}>
                      <ProductImage src={material.thumbnailUrl} alt={material.name} code={material.code} className="w-full h-full" />
                    </div>
                    <p className="mt-3 font-bold text-gray-900" style={{ color: primaryColor }}>
                      {(user as any)?.name || 'Candidate Name'}
                    </p>
                    <p className="text-xs text-gray-500">{(user as any)?.position || 'Position'}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-medium text-gray-500">
                  Preview
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions (optional)
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g. Include my photo on the front, party logo on the back, slogan under the name..."
                />
              </div>
            </>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImage src={material.thumbnailUrl} alt={material.name} code={material.code} className="w-full h-full" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{material.name}</p>
                    <p className="text-sm text-gray-500">{quantity.toLocaleString()} {material.unit}s</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: primaryColor }} />
                    <span className="text-xs text-gray-500">Primary: {primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: secondaryColor }} />
                    <span className="text-xs text-gray-500">Secondary: {secondaryColor}</span>
                  </div>
                </div>

                {notes && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Notes:</p>
                    <p className="text-sm text-gray-700 mt-0.5">{notes}</p>
                  </div>
                )}
              </div>

              {estimatedCost && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-emerald-800">Estimated Total</p>
                    <p className="text-lg font-bold text-emerald-900">
                      KES {estimatedCost.min.toLocaleString()} – {estimatedCost.max.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> This creates a material request. Your campaign coordinator
                  will assign a supplier and confirm final pricing before production begins.
                </p>
              </div>

              {mut.isError && (
                <p className="text-sm text-red-600">Failed to place order. Please try again.</p>
              )}
            </>
          )}
        </div>

        {/* Footer — navigation buttons */}
        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          {step === 'select' && (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => setStep('customise')}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 flex items-center justify-center gap-2"
              >
                <Palette className="w-4 h-4" /> Customise
              </button>
            </>
          )}
          {step === 'customise' && (
            <>
              <button onClick={() => setStep('select')} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 flex items-center justify-center gap-2"
              >
                Review Order <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('customise')} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {mut.isPending ? 'Placing Order…' : 'Place Order'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Material Card ────────────────────────────────────────────
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

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white border border-gray-200 rounded-2xl text-left p-0 overflow-hidden transition-all flex flex-col shadow-sm ${
        hovered ? 'border-violet-300 shadow-lg -translate-y-1' : 'hover:shadow-md'
      }`}
    >
      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
        <ProductImage
          src={item.thumbnailUrl}
          alt={item.name}
          code={item.code}
          className="w-full h-full"
        />
        {/* Hover CTA */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end justify-center pb-4 transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-lg">
            <ShoppingCart className="w-3.5 h-3.5" /> Select Item
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
        <p className="text-[10px] text-violet-500 font-medium uppercase tracking-wide">{categoryName}</p>

        {/* Price + lead time */}
        <div className="flex items-end justify-between mt-auto pt-2">
          {item.typicalCostMin ? (
            <p className="text-xs font-bold text-emerald-700">
              KES {item.typicalCostMin.toLocaleString()}
              <span className="font-normal text-gray-400"> /unit</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">Quote on request</p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="w-3 h-3" /> {item.leadTimeDays}d
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Page Content ────────────────────────────────────────
function MyMaterialsContent(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCat, setCat] = useState<string>('all');
  const [selectedItem, setSelected] = useState<MaterialType | null>(null);
  const [orderSuccess, setSuccess] = useState(false);

  // Get candidate's active campaign
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list().then((r: any) => r.data?.data ?? r.data ?? []),
  });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  // Material categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then((r: any) => r.data?.data ?? r.data ?? []),
  });

  // Material types
  const { data: types = [], isLoading } = useQuery<MaterialType[]>({
    queryKey: ['material-types', selectedCat],
    queryFn: () => campaignApi.materials.listTypes(
      selectedCat !== 'all' ? { category: selectedCat } : undefined
    ).then((r: any) => r.data?.data ?? r.data ?? []),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return types.filter((t) =>
      t.isActive && (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
    );
  }, [types, search]);

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Campaign Materials
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Select items, customise with your brand, and place orders
          </p>
        </div>
        {campaign && (
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg">
            {(campaign as any).name || 'Active Campaign'}
          </span>
        )}
      </div>

      {/* Success toast */}
      {orderSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            Order placed! Your coordinator will assign a supplier and confirm.
          </p>
          <button onClick={() => setSuccess(false)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* No campaign warning */}
      {!campaign && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            No active campaign found. Ask your party admin to create a campaign for you.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            placeholder="Search — caps, t-shirts, banners, posters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setCat('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            selectedCat === 'all'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
          }`}
        >
          <Package className="w-4 h-4" /> All
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCat === 'all' ? 'bg-amber-400' : 'bg-gray-100 text-gray-500'}`}>
            {types.length}
          </span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCat(cat.code)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCat === cat.code
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            <CampaignCategoryIcon categoryCode={cat.code} size={18} className="flex-shrink-0 rounded-md" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results info */}
      <p className="text-sm text-gray-500">
        Showing <span className="font-semibold text-gray-900">{filtered.length}</span> items
        {search && <> for "<span className="font-medium">{search}</span>"</>}
      </p>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
              <div className="w-full aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-16">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">No materials found</p>
          <p className="text-sm text-gray-400 mt-1">
            {types.length === 0
              ? 'Material catalogue not yet loaded. Contact your campaign coordinator.'
              : 'Try a different search term or category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <MaterialCard
              key={item.id}
              item={item}
              categoryName={getCategoryName(item.categoryId)}
              onSelect={() => setSelected(item)}
            />
          ))}
        </div>
      )}

      {/* Item Order Modal */}
      {selectedItem && campaign && (
        <ItemOrderModal
          material={selectedItem}
          campaignId={(campaign as any).id}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); setSuccess(true); }}
        />
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────
export function MyMaterialsPage() {
  return (
    <PageErrorBoundary page="My Materials">
      <MyMaterialsContent />
    </PageErrorBoundary>
  );
}
