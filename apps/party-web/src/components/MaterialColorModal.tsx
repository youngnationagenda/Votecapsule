// ============================================================
// VoteCapsule™ — Material Colour Selection Modal (Party Portal)
//
// Pop-up that lets a candidate / party user:
//   1. Preview an SVG material item with real-time colour updates
//   2. Pick primary + secondary brand colours
//   3. Confirm → triggers design request creation
//
// When Sonie uploads real product photos to S3, the <img src={thumbnailUrl} />
// branch renders instead of the SVG preview.
// ============================================================
import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, Palette, AlertCircle, ChevronRight } from 'lucide-react';
import { CampaignColorPicker, type ColorSelection } from './CampaignColorPicker';
import { getCampaignIcon } from '../assets/campaignIcons';

interface MaterialType {
  id:               string;
  code:             string;
  name:             string;
  description?:     string;
  /** Must match MaterialsCataloguePage.MaterialType — required for callback type compatibility */
  categoryId:       string;
  unit:             string;
  minOrderQuantity: number;
  leadTimeDays:     number;
  typicalCostMin?:  number;
  typicalCostMax?:  number;
  thumbnailUrl?:    string; // set once Sonie uploads photos to S3
  /** Must match MaterialsCataloguePage.MaterialType — required for callback type compatibility */
  isActive:         boolean;
  categoryName?:    string;
}

interface Props {
  material:  MaterialType;
  /** Party / candidate brand colours pre-filled from profile */
  defaultColors?: ColorSelection;
  onClose:   () => void;
  /** Called when user confirms → opens full Design Studio */
  onCustomise: (material: MaterialType, colors: ColorSelection) => void;
  /** Called for quick order without full design */
  onQuickOrder?: (material: MaterialType, colors: ColorSelection, quantity: number) => void;
}

// ── Colour-aware SVG renderer ─────────────────────────────────
// Replaces stroke + fill placeholder colours in the SVG with the
// user's chosen primary and secondary colours.
function colourSvg(svgString: string, primary: string, secondary: string): string {
  // The generator writes colours as hex literals on stroke/fill attributes.
  // We replace the dominant "brand" colour (first color found) with primary,
  // and any secondary accent with secondary.
  // Strategy: find the first hex color used (excluding bg rect) and replace all
  // occurrences with primary, then any remaining color occurrences with secondary.

  // Extract all hex colors from the SVG (excluding the bg rect fill which is always light)
  const allHexes = [...new Set(
    [...(svgString.matchAll(/(?:stroke|fill)=['"]?(#[0-9A-Fa-f]{6})['"]?/g))]
      .map(m => m[1])
      .filter(c => c !== '#FFFFFF' && c !== '#ffffff')
  )];

  let result = svgString;
  if (allHexes[0]) result = result.split(allHexes[0]).join(primary);
  if (allHexes[1] && allHexes[1] !== allHexes[0]) {
    result = result.split(allHexes[1]).join(secondary);
  }
  return result;
}

export function MaterialColorModal({
  material,
  defaultColors,
  onClose,
  onCustomise,
  onQuickOrder,
}: Props) {
  const [colors, setColors]     = useState<ColorSelection>(
    defaultColors ?? { primary: '#FF6600', secondary: '#000000' }
  );
  const [quantity, setQty]      = useState(material.minOrderQuantity);
  const [activeSlot, setSlot]   = useState<'primary' | 'secondary'>('primary');
  const [tab, setTab]           = useState<'colour' | 'order'>('colour');

  const rawSvg = getCampaignIcon(material.code);

  // Re-colour the SVG whenever colours change
  const colouredSvg = useMemo(() => {
    if (!rawSvg) return null;
    return colourSvg(rawSvg, colors.primary, colors.secondary);
  }, [rawSvg, colors.primary, colors.secondary]);

  const estCost = material.typicalCostMin && material.typicalCostMax
    ? `KES ${(material.typicalCostMin * quantity).toLocaleString()} – ${(material.typicalCostMax * quantity).toLocaleString()}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{material.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {material.categoryName ?? material.code} · Min order: {material.minOrderQuantity} {material.unit}s
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: preview */}
          <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col items-center justify-center p-6 gap-4">
            {/* Product preview */}
            <div className="relative">
              {material.thumbnailUrl ? (
                // Real photo from S3 (Sonie uploads)
                <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={material.thumbnailUrl}
                    alt={material.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                  {/* Colour overlay using CSS blend mode */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-40 mix-blend-multiply"
                    style={{ backgroundColor: colors.primary }}
                  />
                </div>
              ) : colouredSvg ? (
                // SVG preview with live colour update
                <div
                  className="w-48 h-48 rounded-2xl shadow-lg overflow-hidden transition-all duration-200"
                  dangerouslySetInnerHTML={{ __html: colouredSvg
                    .replace(/width='\d+'/, "width='192'")
                    .replace(/height='\d+'/, "height='192'") }}
                />
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-gray-200 flex items-center justify-center">
                  <Palette className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* Placeholder notice when no real photo */}
              {!material.thumbnailUrl && (
                <div className="absolute -bottom-2 left-0 right-0 flex justify-center">
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Preview only — real photo pending
                  </span>
                </div>
              )}
            </div>

            {/* Colour chips */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-xl border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: colors.primary }}
                  title="Primary colour"
                  onClick={() => setSlot('primary')}
                />
                <span className="text-[9px] text-gray-400">Primary</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-xl border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: colors.secondary }}
                  title="Secondary colour"
                  onClick={() => setSlot('secondary')}
                />
                <span className="text-[9px] text-gray-400">Secondary</span>
              </div>
            </div>

            {/* Lead time */}
            <div className="w-full bg-white rounded-xl border border-gray-100 p-3 text-center mt-2">
              <p className="text-xs text-gray-500">Typical lead time</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{material.leadTimeDays} days</p>
            </div>
          </div>

          {/* Right: tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
              {[
                { key: 'colour', label: '🎨  Choose Colours' },
                { key: 'order',  label: '🛒  Quick Order' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === key
                      ? 'border-violet-500 text-violet-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'colour' && (
                <CampaignColorPicker
                  value={colors}
                  onChange={setColors}
                  activeSlot={activeSlot}
                  onSlotChange={setSlot}
                />
              )}

              {tab === 'order' && (
                <div className="space-y-5">
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Quantity ({material.unit}s)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQty(Math.max(material.minOrderQuantity, quantity - 100))}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 text-lg transition-colors"
                      >−</button>
                      <input
                        type="number"
                        className="vc-input w-28 text-center font-semibold text-lg"
                        min={material.minOrderQuantity}
                        value={quantity}
                        onChange={(e) => setQty(Math.max(material.minOrderQuantity, parseInt(e.target.value) || material.minOrderQuantity))}
                      />
                      <button
                        type="button"
                        onClick={() => setQty(quantity + 100)}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 text-lg transition-colors"
                      >+</button>
                      <span className="text-sm text-gray-500">{material.unit}s</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Minimum order: {material.minOrderQuantity} {material.unit}s
                    </p>
                  </div>

                  {/* Cost estimate */}
                  {estCost && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <p className="text-xs text-emerald-700 font-medium mb-0.5">Estimated Cost</p>
                      <p className="text-lg font-bold text-emerald-900">{estCost}</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Based on KES {material.typicalCostMin?.toLocaleString()}–{material.typicalCostMax?.toLocaleString()} per unit
                      </p>
                    </div>
                  )}

                  {/* Colour summary */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Selected Colours</p>
                    <div className="flex gap-4">
                      {[
                        { label: 'Primary',   color: colors.primary },
                        { label: 'Secondary', color: colors.secondary },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: color }} />
                          <div>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-xs font-mono font-semibold text-gray-900">{color}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notice about design */}
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">
                      Quick order submits the colour selection only. For full branding (candidate photo, name, slogan), use <strong>Customise & Design</strong> instead.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 px-6 py-4 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="vc-btn-secondary flex-1"
              >
                Cancel
              </button>
              {tab === 'colour' ? (
                <button
                  type="button"
                  onClick={() => setTab('order')}
                  className="vc-btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Next: Order Details <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onCustomise(material, colors)}
                    className="flex-1 px-4 py-2 text-sm font-medium border-2 border-violet-500 text-violet-700 rounded-xl hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Palette className="w-4 h-4" /> Customise & Design
                  </button>
                  {onQuickOrder && (
                    <button
                      type="button"
                      onClick={() => onQuickOrder(material, colors, quantity)}
                      className="vc-btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Quick Order
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
