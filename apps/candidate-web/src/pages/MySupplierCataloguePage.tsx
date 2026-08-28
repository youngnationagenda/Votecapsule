// ============================================================
// VoteCapsule™ — Supplier Catalogue (Candidate Portal)
// UNIFIED page: merged Campaign Materials + Supplier Catalogue.
// Candidates browse ALL items (material types + supplier products),
// select, customise brand, and order. Browsable WITHOUT a campaign.
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Store, ChevronRight, ShoppingCart,
  Grid, List, MapPin, Clock, Package, Truck, Eye, X,
  ImageOff, Plus, Minus, Palette, CheckCircle, AlertTriangle,
  Info,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { CampaignMaterialIcon, CampaignCategoryIcon } from '../components/CampaignMaterialIcon';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Types ─────────────────────────────────────────────────────
interface Category { id: string; code: string; name: string; sortOrder: number; }

interface CatalogueItem {
  id: string;
  name: string;
  code: string;
  description: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  imageUrl: string | null;
  unitPrice: number | null;
  bulkPrice: number | null;
  bulkMinQuantity: number | null;
  currency: string;
  unit: string;
  minOrderQuantity: number;
  leadTimeDays: number | null;
  isAvailable: boolean;
  // Source tracking
  source: 'supplier' | 'catalogue';
  // Supplier product fields
  supplierId?: string;
  supplierSku?: string;
  supplierProductName?: string;
  productUrl?: string;
  specifications?: Record<string, any>;
  metadata?: Record<string, any>;
  // Catalogue (material type) fields
  materialTypeId?: string;
  typicalCostMin?: number;
  typicalCostMax?: number;
}

// ── Image with Fallback ──────────────────────────────────────
function ProductImage({ src, alt, code, className = '' }: {
  src: string | null; alt: string; code?: string; className?: string;
}) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
        {code ? <CampaignMaterialIcon code={code} size={48} /> : <ImageOff className="w-8 h-8 text-gray-300" />}
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setError(true)} loading="lazy" />;
}

// ── Order Modal — candidate selects qty + colours ────────────
function OrderModal({ item, campaignId, onClose, onSuccess }: {
  item: CatalogueItem;
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);

  const minQty = item.minOrderQuantity || 50;
  const [quantity, setQuantity] = useState(minQty);
  const [primaryColor, setPrimaryColor] = useState((user as any)?.partyPrimaryColor || '#FF6600');
  const [secondaryColor, setSecondaryColor] = useState((user as any)?.partySecondaryColor || '#000000');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'select' | 'customise' | 'confirm'>('select');

  const effectivePrice = (item.bulkPrice && item.bulkMinQuantity && quantity >= item.bulkMinQuantity)
    ? item.bulkPrice
    : item.unitPrice;
  const effectiveTotal = effectivePrice ? effectivePrice * quantity : null;
  const bulkApplied = !!(item.bulkPrice && item.bulkMinQuantity && quantity >= item.bulkMinQuantity);

  const mut = useMutation({
    mutationFn: () =>
      campaignApi.materials.createOrder(campaignId, {
        materialTypeId: item.materialTypeId || item.id,
        materialName: item.name,
        quantity,
        colour: primaryColor,
        supplierId: item.supplierId,
        specifications: {
          primaryColour: primaryColor,
          secondaryColour: secondaryColor,
          candidateName: (user as any)?.name || '',
          position: (user as any)?.position || '',
          ...(item.supplierSku ? { supplierSku: item.supplierSku } : {}),
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
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100">
              <ProductImage src={item.imageUrl} alt={item.name} code={item.code} className="w-full h-full" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                {step === 'select' && 'Select & Quantity'}
                {step === 'customise' && 'Customise Branding'}
                {step === 'confirm' && 'Confirm Order'}
              </h3>
              <p className="text-xs text-gray-500">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 'select' && (
            <>
              {/* Price display */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-emerald-600">Unit Price</p>
                    <p className="text-xl font-bold text-emerald-900">
                      {item.currency} {(effectivePrice || 0).toLocaleString()}
                    </p>
                    {bulkApplied && (
                      <p className="text-xs text-emerald-600 mt-0.5">Bulk discount applied ({item.bulkMinQuantity}+ units)</p>
                    )}
                  </div>
                  {effectiveTotal && (
                    <div className="text-right">
                      <p className="text-xs text-emerald-600">Total</p>
                      <p className="text-lg font-bold text-emerald-900">
                        {item.currency} {effectiveTotal.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(minQty, quantity - Math.max(10, Math.floor(minQty / 5))))}
                    disabled={quantity <= minQty}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    min={minQty}
                    onChange={(e) => setQuantity(Math.max(minQty, parseInt(e.target.value) || minQty))}
                    className="w-24 text-center text-base font-semibold border border-gray-200 rounded-lg py-2"
                  />
                  <button
                    onClick={() => setQuantity(quantity + Math.max(10, Math.floor(minQty / 5)))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-400">
                    {item.unit || 'pcs'} (min {minQty})
                  </span>
                </div>
              </div>

              {item.leadTimeDays && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 rounded-xl px-3 py-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  Estimated delivery: {item.leadTimeDays} working days
                </div>
              )}
            </>
          )}

          {step === 'customise' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-violet-500" /> Brand Colours
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
                    <div>
                      <p className="text-[10px] text-gray-500">Primary</p>
                      <p className="text-xs font-mono font-bold text-gray-900">{primaryColor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer" />
                    <div>
                      <p className="text-[10px] text-gray-500">Secondary</p>
                      <p className="text-xs font-mono font-bold text-gray-900">{secondaryColor}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                <div className="aspect-video flex items-center justify-center" style={{ backgroundColor: primaryColor + '22' }}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border-4" style={{ borderColor: primaryColor }}>
                      <ProductImage src={item.imageUrl} alt={item.name} code={item.code} className="w-full h-full" />
                    </div>
                    <p className="mt-2 font-bold text-sm" style={{ color: primaryColor }}>
                      {(user as any)?.name || 'Candidate Name'}
                    </p>
                    <p className="text-xs text-gray-500">{(user as any)?.position || 'Position'}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-medium text-gray-500">Preview</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Special Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                  placeholder="E.g. candidate photo on front, party logo on back..."
                />
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImage src={item.imageUrl} alt={item.name} code={item.code} className="w-full h-full" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{quantity.toLocaleString()} {item.unit || 'pcs'}</p>
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

              {effectiveTotal && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-emerald-800">Estimated Total</p>
                    <p className="text-lg font-bold text-emerald-900">{item.currency} {effectiveTotal.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> This creates a material request. Your campaign coordinator will confirm final pricing before production begins.
                </p>
              </div>

              {mut.isError && <p className="text-sm text-red-600">Failed to place order. Please try again.</p>}
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex gap-3 p-5 border-t">
          {step === 'select' && (
            <>
              <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setStep('customise')} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 flex items-center justify-center gap-2">
                <Palette className="w-4 h-4" /> Customise
              </button>
            </>
          )}
          {step === 'customise' && (
            <>
              <button onClick={() => setStep('select')} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Back</button>
              <button onClick={() => setStep('confirm')} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 flex items-center justify-center gap-2">
                Review <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('customise')} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Back</button>
              <button
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> {mut.isPending ? 'Placing…' : 'Place Order'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────
function ProductCard({ item, onView, onOrder, hasCampaign }: {
  item: CatalogueItem;
  onView: () => void;
  onOrder: () => void;
  hasCampaign: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all flex flex-col shadow-sm ${
        hovered ? 'border-amber-300 shadow-lg -translate-y-0.5' : 'hover:shadow-md'
      }`}
    >
      {/* Image */}
      <button type="button" onClick={onView} className="relative w-full aspect-square overflow-hidden bg-gray-50">
        <ProductImage src={item.imageUrl} alt={item.name} code={item.code} className="w-full h-full" />
        {!item.isAvailable && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sold Out</div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end p-3 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Eye className="w-3 h-3" /> View Details
          </div>
        </div>
      </button>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{item.name}</p>
        {item.categoryName && (
          <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">{item.categoryName}</p>
        )}

        <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-100">
          {item.unitPrice ? (
            <div>
              <p className="text-sm font-bold text-gray-900">{item.currency} {item.unitPrice.toLocaleString()}</p>
              {item.bulkPrice && (
                <p className="text-[10px] text-emerald-600">Bulk: {item.currency} {item.bulkPrice.toLocaleString()}</p>
              )}
            </div>
          ) : item.typicalCostMin ? (
            <div>
              <p className="text-sm font-bold text-gray-900">KES {Number(item.typicalCostMin).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">per {item.unit || 'unit'}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Quote</p>
          )}
          {item.leadTimeDays && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{item.leadTimeDays}d
            </span>
          )}
        </div>

        {/* Order button */}
        <button
          onClick={onOrder}
          disabled={!item.isAvailable}
          className="mt-2 w-full px-3 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> {hasCampaign ? 'Order Item' : 'View & Order'}
        </button>
      </div>
    </div>
  );
}

// ── Product Detail Modal ─────────────────────────────────────
function ProductDetailModal({ item, hasCampaign, onClose, onOrder }: {
  item: CatalogueItem;
  hasCampaign: boolean;
  onClose: () => void;
  onOrder: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[50] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
              <ProductImage src={item.imageUrl} alt={item.name} code={item.code} className="w-full h-full" />
            </div>
            <div className="space-y-4">
              <div>
                {item.categoryName && (
                  <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">{item.categoryName}</p>
                )}
                <h4 className="text-xl font-bold text-gray-900">{item.name}</h4>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                {item.unitPrice ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{item.currency} {item.unitPrice.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">per {item.unit || 'unit'}</p>
                    {item.bulkPrice && item.bulkMinQuantity && (
                      <p className="text-sm text-emerald-700 font-medium mt-2">
                        Bulk: {item.currency} {item.bulkPrice.toLocaleString()} for {item.bulkMinQuantity}+
                      </p>
                    )}
                  </>
                ) : item.typicalCostMin ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">KES {Number(item.typicalCostMin).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">estimated per {item.unit || 'unit'}</p>
                  </>
                ) : (
                  <p className="text-lg text-gray-600">Price on request</p>
                )}
              </div>

              <div className="space-y-2.5">
                {item.leadTimeDays && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">{item.leadTimeDays} working days delivery</span>
                  </div>
                )}
                {item.source === 'supplier' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="w-4 h-4 text-violet-500" />
                    <span className="text-gray-700">Me Advertising • Nairobi</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-green-500" />
                  <span className={item.isAvailable ? 'text-green-700' : 'text-red-600'}>
                    {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {item.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              )}

              <button
                onClick={onOrder}
                disabled={!item.isAvailable}
                className="w-full px-4 py-3 text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {hasCampaign ? 'Select & Order This Item' : 'Create Campaign to Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
function SupplierCatalogueContent(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCat, setCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [detailItem, setDetailItem] = useState<CatalogueItem | null>(null);
  const [orderItem, setOrderItem] = useState<CatalogueItem | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showNoCampaign, setShowNoCampaign] = useState(false);

  // Get candidate's campaign (optional — browsing works without one)
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list().then((r: any) => r.data?.data ?? r.data ?? []),
  });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];
  const campaignId = (campaign as any)?.id || null;

  // Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then((r: any) => r.data?.data ?? r.data ?? []),
  });

  // Material types from catalogue
  const { data: materialTypes = [] } = useQuery({
    queryKey: ['material-types-all'],
    queryFn: () => campaignApi.materials.listTypes().then((r: any) => {
      const d = r.data;
      return Array.isArray(d) ? d : (d?.data ?? []);
    }),
  });

  // Supplier products
  const { data: supplierProducts = [] } = useQuery({
    queryKey: ['supplier-products-all'],
    queryFn: () => campaignApi.suppliers.listAllProducts(),
  });

  // Merge both sources into unified CatalogueItem[]
  const allItems: CatalogueItem[] = useMemo(() => {
    // First, supplier products (higher priority — have real pricing)
    const supplierItems: CatalogueItem[] = (supplierProducts as any[]).map((p: any) => ({
      id: p.id,
      name: p.supplierProductName || p.name,
      code: p.materialTypeCode || '',
      description: p.description || '',
      categoryId: p.categoryId || '',
      categoryCode: p.categoryCode || '',
      categoryName: p.categoryName || '',
      imageUrl: p.imageUrl || null,
      unitPrice: p.unitPrice ? Number(p.unitPrice) : null,
      bulkPrice: p.bulkPrice ? Number(p.bulkPrice) : null,
      bulkMinQuantity: p.bulkMinQuantity ? Number(p.bulkMinQuantity) : null,
      currency: p.currency || 'KES',
      unit: p.unit || 'pcs',
      minOrderQuantity: p.minOrderQuantity || p.bulkMinQuantity || 50,
      leadTimeDays: p.leadTimeDays,
      isAvailable: p.isAvailable !== false,
      source: 'supplier' as const,
      supplierId: p.supplierId,
      supplierSku: p.supplierSku,
      materialTypeId: p.materialTypeId,
      specifications: p.specifications,
    }));

    // Then, catalogue material types that DON'T have a supplier product
    const supplierMaterialTypeIds = new Set(supplierItems.map(s => s.materialTypeId).filter(Boolean));
    const catalogueItems: CatalogueItem[] = (materialTypes as any[])
      .filter((t: any) => t.isActive && !supplierMaterialTypeIds.has(t.id))
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description || '',
        categoryId: t.categoryId || t.category?.id || '',
        categoryCode: t.category?.code || '',
        categoryName: t.category?.name || '',
        imageUrl: t.thumbnailUrl || null,
        unitPrice: t.typicalCostMin ? Number(t.typicalCostMin) : null,
        bulkPrice: null,
        bulkMinQuantity: null,
        currency: 'KES',
        unit: t.unit || 'pcs',
        minOrderQuantity: t.minOrderQuantity || 50,
        leadTimeDays: t.leadTimeDays || null,
        isAvailable: true,
        source: 'catalogue' as const,
        materialTypeId: t.id,
        typicalCostMin: t.typicalCostMin ? Number(t.typicalCostMin) : undefined,
        typicalCostMax: t.typicalCostMax ? Number(t.typicalCostMax) : undefined,
      }));

    return [...supplierItems, ...catalogueItems];
  }, [supplierProducts, materialTypes]);

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...allItems];
    if (selectedCat !== 'all') {
      items = items.filter(p => p.categoryCode === selectedCat || p.categoryId === selectedCat);
    }
    const q = search.toLowerCase();
    if (q) {
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'price_asc': items.sort((a, b) => (a.unitPrice || 99999) - (b.unitPrice || 99999)); break;
      case 'price_desc': items.sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0)); break;
      default: items.sort((a, b) => a.name.localeCompare(b.name));
    }
    return items;
  }, [allItems, selectedCat, search, sortBy]);

  const isLoading = allItems.length === 0 && materialTypes.length === 0;

  const handleOrder = (item: CatalogueItem) => {
    if (!campaignId) {
      setShowNoCampaign(true);
      return;
    }
    setOrderItem(item);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-500" />
            Supplier Catalogue
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Browse all campaign materials — select items, customise branding, and place orders
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg">
          <MapPin className="w-3 h-3" /> Me Advertising • Nairobi
        </div>
      </div>

      {/* Success toast */}
      {orderSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">Order placed! Your coordinator will confirm with the supplier.</p>
          <button onClick={() => setOrderSuccess(false)} className="ml-auto"><X className="w-4 h-4 text-emerald-400" /></button>
        </div>
      )}

      {/* No campaign prompt (shown when trying to order) */}
      {showNoCampaign && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Campaign required to place orders</p>
            <p className="text-xs text-amber-700 mt-0.5">You can browse the catalogue freely, but creating an order requires an active campaign.</p>
            <a href="/campaign" className="inline-block mt-2 text-sm text-amber-600 hover:underline font-medium">Create your campaign →</a>
          </div>
          <button onClick={() => setShowNoCampaign(false)}><X className="w-4 h-4 text-amber-400" /></button>
        </div>
      )}

      {/* Search + sort + view controls */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            placeholder="Search — caps, t-shirts, banners, posters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-40">
          <option value="name">Sort: Name</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={`p-2.5 ${viewMode === 'grid' ? 'bg-amber-50 text-amber-600' : 'text-gray-400'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2.5 ${viewMode === 'list' ? 'bg-amber-50 text-amber-600' : 'text-gray-400'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCat('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            selectedCat === 'all' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
          }`}
        >
          <Package className="w-4 h-4" /> All
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCat === 'all' ? 'bg-amber-400' : 'bg-gray-100 text-gray-500'}`}>
            {allItems.length}
          </span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCat(cat.code)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCat === cat.code ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            <CampaignCategoryIcon categoryCode={cat.code} size={18} className="flex-shrink-0 rounded-md" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        <span className="font-semibold text-gray-900">{filtered.length}</span> items
        {search && <> matching "<span className="font-medium">{search}</span>"</>}
      </p>

      {/* Grid / List */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
              <div className="w-full aspect-square bg-gray-100" />
              <div className="p-3 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4" /><div className="h-3 bg-gray-100 rounded w-1/2" /><div className="h-8 bg-gray-100 rounded w-full mt-2" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-16">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">No products found</p>
          <p className="text-sm text-gray-400 mt-1">
            {allItems.length === 0 ? 'Catalogue is loading — ensure Campaign service is running.' : 'Try a different search or category.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              hasCampaign={!!campaignId}
              onView={() => setDetailItem(item)}
              onOrder={() => handleOrder(item)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-4 text-left hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                <ProductImage src={item.imageUrl} alt={item.name} code={item.code} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                <p className="text-[10px] text-amber-600 uppercase">{item.categoryName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {item.unitPrice ? (
                  <p className="text-sm font-bold text-gray-900">{item.currency} {item.unitPrice.toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-gray-400">Quote</p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleOrder(item); }}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex-shrink-0"
              >
                Order
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          hasCampaign={!!campaignId}
          onClose={() => setDetailItem(null)}
          onOrder={() => { const it = detailItem; setDetailItem(null); handleOrder(it); }}
        />
      )}

      {/* Order modal (only opens when campaign exists) */}
      {orderItem && campaignId && (
        <OrderModal
          item={orderItem}
          campaignId={campaignId}
          onClose={() => setOrderItem(null)}
          onSuccess={() => { setOrderItem(null); setOrderSuccess(true); }}
        />
      )}
    </div>
  );
}

export function MySupplierCataloguePage() {
  return (
    <PageErrorBoundary page="Supplier Catalogue">
      <SupplierCatalogueContent />
    </PageErrorBoundary>
  );
}
