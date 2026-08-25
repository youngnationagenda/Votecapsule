// ============================================================
// VoteCapsule™ — My Supplier Catalogue (Candidate Portal)
// Browse supplier products (Me Advertising), select items,
// view images + prices, and add to campaign material orders.
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Store, ChevronRight, ExternalLink, ShoppingCart,
  Grid, List, MapPin, Clock, Package, Truck, Eye, X,
  ImageOff, Plus, Minus, Palette, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { CampaignMaterialIcon, CampaignCategoryIcon } from '../components/CampaignMaterialIcon';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector } from '../store/hooks';

// ── Types ─────────────────────────────────────────────────────
interface Category { id: string; code: string; name: string; sortOrder: number; }

interface SupplierProduct {
  id: string;
  supplierId: string;
  materialTypeId: string;
  supplierProductName: string;
  supplierSku: string;
  unitPrice: number | null;
  currency: string;
  bulkPrice: number | null;
  bulkMinQuantity: number | null;
  productUrl: string;
  imageUrl: string | null;
  description: string;
  specifications: Record<string, any>;
  isAvailable: boolean;
  leadTimeDays: number | null;
  metadata: Record<string, any>;
  materialTypeName?: string;
  materialTypeCode?: string;
  categoryCode?: string;
  categoryName?: string;
  minOrderQuantity?: number;
  unit?: string;
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
function OrderFromSupplierModal({ product, campaignId, onClose, onSuccess }: {
  product: SupplierProduct;
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);

  const minQty = product.minOrderQuantity || product.bulkMinQuantity || 50;
  const [quantity, setQuantity] = useState(minQty);
  const [primaryColor, setPrimaryColor] = useState((user as any)?.partyPrimaryColor || '#FF6600');
  const [secondaryColor, setSecondaryColor] = useState((user as any)?.partySecondaryColor || '#000000');
  const [notes, setNotes] = useState('');

  const totalCost = product.unitPrice ? product.unitPrice * quantity : null;
  const bulkApplies = product.bulkPrice && product.bulkMinQuantity && quantity >= product.bulkMinQuantity;
  const effectivePrice = bulkApplies ? product.bulkPrice! : product.unitPrice;
  const effectiveTotal = effectivePrice ? effectivePrice * quantity : null;

  const orderMut = useMutation({
    mutationFn: () =>
      campaignApi.materials.createOrder(campaignId, {
        materialTypeId: product.materialTypeId,
        materialName: product.supplierProductName,
        quantity,
        colour: primaryColor,
        supplierId: product.supplierId,
        specifications: {
          primaryColour: primaryColor,
          secondaryColour: secondaryColor,
          candidateName: (user as any)?.name || '',
          position: (user as any)?.position || '',
          supplierProductId: product.id,
          supplierSku: product.supplierSku,
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
              <ProductImage src={product.imageUrl} alt={product.supplierProductName} code={product.materialTypeCode} className="w-full h-full" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 line-clamp-1">{product.supplierProductName}</h3>
              <p className="text-xs text-gray-500">{product.categoryName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Price display */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-emerald-600">Unit Price</p>
                <p className="text-xl font-bold text-emerald-900">
                  {product.currency} {(effectivePrice || 0).toLocaleString()}
                </p>
                {bulkApplies && (
                  <p className="text-xs text-emerald-600 mt-0.5">Bulk discount applied ({product.bulkMinQuantity}+ units)</p>
                )}
              </div>
              {effectiveTotal && (
                <div className="text-right">
                  <p className="text-xs text-emerald-600">Total</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {product.currency} {effectiveTotal.toLocaleString()}
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
                {product.unit || 'pcs'} (min {minQty})
              </span>
            </div>
          </div>

          {/* Colours */}
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

          {/* Notes */}
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

          {/* Delivery info */}
          {product.leadTimeDays && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 rounded-xl px-3 py-2">
              <Truck className="w-4 h-4 text-blue-500" />
              Estimated delivery: {product.leadTimeDays} working days
            </div>
          )}

          {orderMut.isError && (
            <p className="text-sm text-red-600">Failed to place order. Please try again.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => orderMut.mutate()}
            disabled={orderMut.isPending || !product.isAvailable}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {orderMut.isPending ? 'Placing…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Modal ─────────────────────────────────────
function ProductDetailModal({ product, campaignId, onClose, onOrder }: {
  product: SupplierProduct;
  campaignId: string | null;
  onClose: () => void;
  onOrder: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[50] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-900">{product.supplierProductName}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
              <ProductImage src={product.imageUrl} alt={product.supplierProductName} code={product.materialTypeCode} className="w-full h-full" />
            </div>
            {/* Details */}
            <div className="space-y-4">
              <div>
                {product.categoryName && (
                  <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">{product.categoryName}</p>
                )}
                <h4 className="text-xl font-bold text-gray-900">{product.supplierProductName}</h4>
              </div>

              {/* Price */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                {product.unitPrice ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{product.currency} {product.unitPrice.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">per {product.unit || 'unit'}</p>
                    {product.bulkPrice && product.bulkMinQuantity && (
                      <p className="text-sm text-emerald-700 font-medium mt-2">
                        Bulk: {product.currency} {product.bulkPrice.toLocaleString()} for {product.bulkMinQuantity}+
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-lg text-gray-600">Price on request</p>
                )}
              </div>

              {/* Specs */}
              <div className="space-y-2.5">
                {product.leadTimeDays && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">{product.leadTimeDays} working days delivery</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4 text-violet-500" />
                  <span className="text-gray-700">Me Advertising • Nairobi</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-green-500" />
                  <span className={product.isAvailable ? 'text-green-700' : 'text-red-600'}>
                    {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {product.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Action */}
              <button
                onClick={onOrder}
                disabled={!product.isAvailable || !campaignId}
                className="w-full px-4 py-3 text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Select & Order This Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────
function ProductCard({ product, onView, onOrder }: {
  product: SupplierProduct;
  onView: () => void;
  onOrder: () => void;
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
      {/* Image — click to view detail */}
      <button type="button" onClick={onView} className="relative w-full aspect-square overflow-hidden bg-gray-50">
        <ProductImage src={product.imageUrl} alt={product.supplierProductName} code={product.materialTypeCode} className="w-full h-full" />
        {!product.isAvailable && (
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
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{product.supplierProductName}</p>
        {product.categoryName && (
          <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">{product.categoryName}</p>
        )}

        {/* Price + delivery */}
        <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-100">
          {product.unitPrice ? (
            <div>
              <p className="text-sm font-bold text-gray-900">{product.currency} {product.unitPrice.toLocaleString()}</p>
              {product.bulkPrice && (
                <p className="text-[10px] text-emerald-600">Bulk: {product.currency} {product.bulkPrice.toLocaleString()}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Quote</p>
          )}
          {product.leadTimeDays && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{product.leadTimeDays}d
            </span>
          )}
        </div>

        {/* Order button */}
        <button
          onClick={onOrder}
          disabled={!product.isAvailable}
          className="mt-2 w-full px-3 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Select Item
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
function MySupplierCatalogueContent(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCat, setCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [detailProduct, setDetailProduct] = useState<SupplierProduct | null>(null);
  const [orderProduct, setOrderProduct] = useState<SupplierProduct | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Get candidate's campaign
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

  // Supplier products
  const { data: products = [], isLoading } = useQuery<SupplierProduct[]>({
    queryKey: ['supplier-products', selectedCat],
    queryFn: () => {
      const params: any = { includeSupplier: true };
      if (selectedCat !== 'all') params.category = selectedCat;
      return campaignApi.materials.listTypes(params).then((r: any) => {
        const raw = r.data?.supplierProducts ?? r.data?.data ?? r.data ?? [];
        return raw.map((item: any) => ({
          id: item.supplierProductId || item.id,
          supplierId: item.supplierId || '',
          materialTypeId: item.materialTypeId || item.id,
          supplierProductName: item.supplierProductName || item.name,
          supplierSku: item.supplierSku || item.code,
          unitPrice: item.unitPrice ?? item.typicalCostMin ?? null,
          currency: item.currency || 'KES',
          bulkPrice: item.bulkPrice ?? null,
          bulkMinQuantity: item.bulkMinQuantity ?? null,
          productUrl: item.productUrl || '',
          imageUrl: item.imageUrl || item.thumbnailUrl || null,
          description: item.description || '',
          specifications: item.specifications || {},
          isAvailable: item.isAvailable ?? true,
          leadTimeDays: item.leadTimeDays ?? null,
          metadata: item.metadata || {},
          materialTypeName: item.materialTypeName || item.name,
          materialTypeCode: item.materialTypeCode || item.code,
          categoryCode: item.categoryCode || '',
          categoryName: item.categoryName || '',
          minOrderQuantity: item.minOrderQuantity || 50,
          unit: item.unit || 'piece',
        }));
      });
    },
  });

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...products];
    const q = search.toLowerCase();
    if (q) {
      items = items.filter(p =>
        p.supplierProductName.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'price_asc': items.sort((a, b) => (a.unitPrice || 99999) - (b.unitPrice || 99999)); break;
      case 'price_desc': items.sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0)); break;
      default: items.sort((a, b) => a.supplierProductName.localeCompare(b.supplierProductName));
    }
    return items;
  }, [products, search, sortBy]);

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
            Browse items from Me Advertising — select and order for your campaign
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

      {/* No campaign warning */}
      {!campaignId && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">No active campaign. You can browse but ordering requires an active campaign.</p>
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
            {products.length}
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

      {/* Grid */}
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
            {products.length === 0 ? 'Supplier catalogue is loading…' : 'Try a different search or category.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onView={() => setDetailProduct(p)}
              onOrder={() => setOrderProduct(p)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setDetailProduct(p)}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-4 text-left hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                <ProductImage src={p.imageUrl} alt={p.supplierProductName} code={p.materialTypeCode} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{p.supplierProductName}</p>
                <p className="text-[10px] text-amber-600 uppercase">{p.categoryName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {p.unitPrice ? (
                  <p className="text-sm font-bold text-gray-900">{p.currency} {p.unitPrice.toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-gray-400">Quote</p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOrderProduct(p); }}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex-shrink-0"
              >
                Select
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          campaignId={campaignId}
          onClose={() => setDetailProduct(null)}
          onOrder={() => { setDetailProduct(null); setOrderProduct(detailProduct); }}
        />
      )}

      {/* Order modal */}
      {orderProduct && campaignId && (
        <OrderFromSupplierModal
          product={orderProduct}
          campaignId={campaignId}
          onClose={() => setOrderProduct(null)}
          onSuccess={() => { setOrderProduct(null); setOrderSuccess(true); }}
        />
      )}
    </div>
  );
}

export function MySupplierCataloguePage() {
  return (
    <PageErrorBoundary page="Supplier Catalogue">
      <MySupplierCatalogueContent />
    </PageErrorBoundary>
  );
}
