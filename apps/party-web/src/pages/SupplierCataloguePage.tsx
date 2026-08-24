// ============================================================
// VoteCapsule™ — Supplier Catalogue Page (Party Portal)
// Phase 14B — Browse supplier products with images, prices, details
// Merchandise portal — services provided by Me Advertising
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Store, ChevronRight, ExternalLink, ShoppingCart,
  Filter, Grid, List, Star, MapPin, Clock, Package,
  Truck, Eye, Heart, ChevronDown, X, ImageOff,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { CampaignMaterialIcon, CampaignCategoryIcon } from '../components/CampaignMaterialIcon';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ─────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  website: string;
  location: string;
  rating: number;
  isActive: boolean;
}

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
  thumbnailUrl: string | null;
  description: string;
  specifications: Record<string, any>;
  isAvailable: boolean;
  leadTimeDays: number | null;
  metadata: {
    description?: string;
    allImages?: string[];
  };
  // Joined fields
  materialTypeName?: string;
  materialTypeCode?: string;
  categoryCode?: string;
  categoryName?: string;
}

interface Category {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

// ── Supplier API extension ───────────────────────────────────
const supplierApi = {
  listSuppliers: (params?: any) =>
    campaignApi.materials.listTypes(params).then((r: any) => r.data?.suppliers ?? []),
  listProducts: (params?: any) =>
    campaignApi.materials.listTypes(params).then((r: any) => r.data?.supplierProducts ?? []),
};

// ── Price Display Component ──────────────────────────────────
function PriceTag({ price, currency = 'KES', bulkPrice, bulkMin }: {
  price: number | null;
  currency?: string;
  bulkPrice?: number | null;
  bulkMin?: number | null;
}) {
  if (!price) {
    return <span className="text-xs text-gray-400 italic">Price on request</span>;
  }
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-bold text-gray-900">
        {currency} {price.toLocaleString()}
      </p>
      {bulkPrice && bulkMin && (
        <p className="text-[10px] text-emerald-600 font-medium">
          {currency} {bulkPrice.toLocaleString()} ea. for {bulkMin}+
        </p>
      )}
    </div>
  );
}

// ── Image with Fallback ──────────────────────────────────────
function ProductImage({ src, alt, code, className = '' }: {
  src: string | null;
  alt: string;
  code?: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
        {code ? (
          <CampaignMaterialIcon code={code} size={56} />
        ) : (
          <ImageOff className="w-10 h-10 text-gray-300" />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

// ── Product Card (Grid View) ─────────────────────────────────
function ProductCard({ product, onSelect }: {
  product: SupplierProduct;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`vc-card text-left p-0 overflow-hidden transition-all group flex flex-col ${
        hovered ? 'border-violet-300 shadow-xl -translate-y-1 scale-[1.01]' : 'hover:shadow-md'
      }`}
    >
      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50">
        <ProductImage
          src={product.imageUrl}
          alt={product.supplierProductName}
          code={product.materialTypeCode}
          className="w-full h-full"
        />
        {/* Availability badge */}
        {!product.isAvailable && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Out of Stock
          </div>
        )}
        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end justify-between p-3 transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex gap-1.5">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1.5">
              <Eye className="w-4 h-4 text-gray-700" />
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1.5">
              <ShoppingCart className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <div className="bg-violet-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
            View <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">
            {product.supplierProductName}
          </p>
        </div>

        {product.categoryName && (
          <p className="text-[10px] text-violet-500 font-medium uppercase tracking-wide">
            {product.categoryName}
          </p>
        )}

        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
        )}

        {/* Price + Lead time */}
        <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-100">
          <PriceTag
            price={product.unitPrice}
            currency={product.currency}
            bulkPrice={product.bulkPrice}
            bulkMin={product.bulkMinQuantity}
          />
          {product.leadTimeDays && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />
              {product.leadTimeDays}d
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Product Card (List View) ─────────────────────────────────
function ProductRow({ product, onSelect }: {
  product: SupplierProduct;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="vc-card p-3 flex items-center gap-4 text-left hover:border-violet-300 hover:shadow-md transition-all w-full"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
        <ProductImage
          src={product.imageUrl}
          alt={product.supplierProductName}
          code={product.materialTypeCode}
          className="w-full h-full"
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-gray-900 text-sm truncate">{product.supplierProductName}</p>
        {product.categoryName && (
          <p className="text-[10px] text-violet-500 font-medium uppercase tracking-wide">{product.categoryName}</p>
        )}
        {product.description && (
          <p className="text-xs text-gray-500 truncate">{product.description}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <PriceTag price={product.unitPrice} currency={product.currency} />
        {product.leadTimeDays && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Truck className="w-3 h-3" /> {product.leadTimeDays} days
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </button>
  );
}

// ── Product Detail Modal ─────────────────────────────────────
function ProductDetailModal({ product, onClose }: {
  product: SupplierProduct;
  onClose: () => void;
}) {
  const allImages = product.metadata?.allImages || [];
  const [selectedImage, setSelectedImage] = useState(0);

  const displayImages = [
    product.imageUrl,
    ...allImages.map(img => img.startsWith('http') ? img : `https://votecapsule-campaign-assets.s3.amazonaws.com/suppliers/me-advertising/images/${img}`),
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{product.supplierProductName}</h3>
            {product.categoryName && (
              <p className="text-sm text-violet-500 mt-0.5">{product.categoryName}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image gallery */}
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                <ProductImage
                  src={displayImages[selectedImage] || null}
                  alt={product.supplierProductName}
                  code={product.materialTypeCode}
                  className="w-full h-full"
                />
              </div>
              {displayImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {displayImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                        i === selectedImage ? 'border-violet-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Price block */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                {product.unitPrice ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.currency} {product.unitPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">per unit (excl. VAT)</p>
                    {product.bulkPrice && product.bulkMinQuantity && (
                      <div className="mt-2 pt-2 border-t border-emerald-200">
                        <p className="text-sm font-medium text-emerald-700">
                          Bulk: {product.currency} {product.bulkPrice.toLocaleString()} ea.
                          for {product.bulkMinQuantity}+ units
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-lg font-medium text-gray-600">Price on request</p>
                )}
              </div>

              {/* Specs */}
              <div className="space-y-3">
                {product.leadTimeDays && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Lead Time</p>
                      <p className="text-gray-500 text-xs">{product.leadTimeDays} working days</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Supplier</p>
                    <p className="text-gray-500 text-xs">Me Advertising • Nairobi</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Availability</p>
                    <p className={`text-xs ${product.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                      {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Specifications</p>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-gray-900 font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-3">
                <button className="flex-1 vc-btn-primary flex items-center justify-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Add to Order
                </button>
                {product.productUrl && (
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vc-btn-secondary flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> View on Site
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────
function SupplierCatalogueContent(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCat, setCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [selectedProduct, setSelected] = useState<SupplierProduct | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['material-categories'],
    queryFn: () => campaignApi.materials.listCategories().then((r: any) => r.data?.data ?? r.data ?? []),
  });

  // Fetch supplier products (via material types endpoint with supplier expansion)
  const { data: products = [], isLoading } = useQuery<SupplierProduct[]>({
    queryKey: ['supplier-products', selectedCat],
    queryFn: () => campaignApi.materials.listTypes(
      selectedCat !== 'all' ? { category: selectedCat, includeSupplier: true } : { includeSupplier: true }
    ).then((r: any) => {
      const data = r.data?.supplierProducts ?? r.data?.data ?? r.data ?? [];
      // Transform material types with supplier data into SupplierProduct format
      return data.map((item: any) => ({
        id: item.supplierProductId || item.id,
        supplierId: item.supplierId || '',
        materialTypeId: item.id || item.materialTypeId,
        supplierProductName: item.supplierProductName || item.name,
        supplierSku: item.supplierSku || item.code,
        unitPrice: item.unitPrice ?? item.typicalCostMin ?? null,
        currency: item.currency || 'KES',
        bulkPrice: item.bulkPrice ?? null,
        bulkMinQuantity: item.bulkMinQuantity ?? item.minOrderQuantity ?? null,
        productUrl: item.productUrl || '',
        imageUrl: item.imageUrl || item.thumbnailUrl || null,
        thumbnailUrl: item.thumbnailUrl || null,
        description: item.description || '',
        specifications: item.specifications || {},
        isAvailable: item.isAvailable ?? true,
        leadTimeDays: item.leadTimeDays ?? null,
        metadata: item.metadata || {},
        materialTypeName: item.name || item.materialTypeName,
        materialTypeCode: item.code || item.materialTypeCode,
        categoryCode: item.categoryCode || '',
        categoryName: item.categoryName || '',
      }));
    }),
  });

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...products];
    const q = search.toLowerCase();

    // Search
    if (q) {
      items = items.filter(p =>
        p.supplierProductName.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q) ||
        (p.materialTypeCode || '').toLowerCase().includes(q)
      );
    }

    // Price filter
    items = items.filter(p => {
      if (!p.unitPrice) return true; // Show items without price
      return p.unitPrice >= priceRange[0] && p.unitPrice <= priceRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'price_asc':
        items.sort((a, b) => (a.unitPrice || 99999) - (b.unitPrice || 99999));
        break;
      case 'price_desc':
        items.sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
        break;
      case 'name':
      default:
        items.sort((a, b) => a.supplierProductName.localeCompare(b.supplierProductName));
    }

    return items;
  }, [products, search, selectedCat, sortBy, priceRange]);

  // Stats
  const stats = useMemo(() => ({
    total: products.length,
    withPrice: products.filter(p => p.unitPrice).length,
    withImages: products.filter(p => p.imageUrl).length,
    avgPrice: products.filter(p => p.unitPrice).reduce((s, p) => s + (p.unitPrice || 0), 0) /
              Math.max(1, products.filter(p => p.unitPrice).length),
  }), [products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-violet-500" />
            Supplier Catalogue
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Browse campaign materials from verified suppliers with real pricing
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 rounded-lg">
            <MapPin className="w-3 h-3" />
            Me Advertising • Nairobi
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Products', value: stats.total, color: 'violet' },
          { label: 'With Pricing', value: stats.withPrice, color: 'emerald' },
          { label: 'With Images', value: stats.withImages, color: 'blue' },
          { label: 'Avg Price', value: `KES ${Math.round(stats.avgPrice).toLocaleString()}`, color: 'amber' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
            <p className={`text-lg font-bold text-${color}-700`}>{value}</p>
            <p className={`text-[10px] text-${color}-500 uppercase tracking-wide`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search + controls */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="vc-input pl-9"
            placeholder="Search products — caps, banners, t-shirts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="vc-input w-40 text-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>

        {/* View toggle */}
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 ${viewMode === 'grid' ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 ${viewMode === 'list' ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
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
          <Package className="w-4 h-4" /> All
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCat === 'all' ? 'bg-violet-500' : 'bg-gray-100 text-gray-500'}`}>
            {products.length}
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

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">{filtered.length}</span> products
          {search && <> matching "<span className="font-medium">{search}</span>"</>}
        </p>
      </div>

      {/* Product Grid / List */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="vc-card p-0 overflow-hidden animate-pulse">
              <div className="w-full aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="vc-card text-center py-16">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700">No products found</p>
          <p className="text-sm text-gray-400 mt-1">
            {products.length === 0
              ? 'Contact Me Advertising to enable product listings.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={() => setSelected(product)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onSelect={() => setSelected(product)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────
export function SupplierCataloguePage() {
  return (
    <PageErrorBoundary page="Supplier Catalogue">
      <SupplierCatalogueContent />
    </PageErrorBoundary>
  );
}
