// ============================================================
// VoteCapsule™ — Campaign Color Picker
// Reusable color selection for campaign material customisation.
// Includes Kenyan political party color palettes + custom hex.
// ============================================================
import React, { useState } from 'react';
import { Check, Pipette } from 'lucide-react';

// ── Kenyan political party palettes ──────────────────────────
export const PARTY_PALETTES = [
  { party: 'ODM',       colors: ['#FF6600','#000000','#FFFFFF','#FF9933'] },
  { party: 'UDA',       colors: ['#C8102E','#000000','#FFFFFF','#FFD700'] },
  { party: 'Jubilee',   colors: ['#CC0000','#000000','#FFFFFF','#003DA5'] },
  { party: 'Azimio',   colors: ['#0033A0','#CC0000','#007A3D','#FFFFFF'] },
  { party: 'Wiper',     colors: ['#007A3D','#FF6600','#FFFFFF','#000000'] },
  { party: 'ANC',       colors: ['#003DA5','#FFD700','#000000','#FFFFFF'] },
  { party: 'Ford Kenya',colors: ['#007A3D','#FFD700','#FFFFFF','#000000'] },
  { party: 'KANU',      colors: ['#007A3D','#CC0000','#FFFFFF','#000000'] },
];

// ── Standard campaign colors ──────────────────────────────────
export const STANDARD_COLORS = [
  // Reds
  '#C8102E','#E11D48','#DC2626','#B91C1C',
  // Oranges
  '#FF6600','#F97316','#EA580C','#FF9933',
  // Yellows / Golds
  '#FFD700','#F59E0B','#FBBF24','#EAB308',
  // Greens
  '#007A3D','#16A34A','#22C55E','#15803D',
  // Blues
  '#003DA5','#1D4ED8','#2563EB','#0033A0',
  // Navies / Darks
  '#0B3C6D','#1E3A5F','#1E40AF','#0F172A',
  // Purples
  '#7C3AED','#8B5CF6','#9333EA','#6D28D9',
  // Neutrals
  '#FFFFFF','#F3F4F6','#9CA3AF','#6B7280',
  '#374151','#1F2937','#111827','#000000',
];

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: (c: string) => void;
  size?: number;
}

function ColorSwatch({ color, selected, onClick, size = 32 }: ColorSwatchProps) {
  const isLight = isLightColor(color);
  return (
    <button
      type="button"
      onClick={() => onClick(color)}
      className="relative rounded-lg border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-violet-400"
      style={{
        width: size, height: size,
        backgroundColor: color,
        borderColor: selected ? '#7C3AED' : (isLight ? '#D1D5DB' : 'transparent'),
        boxShadow: selected ? '0 0 0 3px rgba(124,58,237,0.3)' : undefined,
      }}
      title={color}
    >
      {selected && (
        <Check
          className="absolute inset-0 m-auto"
          style={{ width: size * 0.45, height: size * 0.45, color: isLight ? '#000' : '#fff' }}
        />
      )}
    </button>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0,2), 16);
  const g = parseInt(c.slice(2,4), 16);
  const b = parseInt(c.slice(4,6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

export interface ColorSelection {
  primary:   string;
  secondary: string;
}

interface Props {
  value: ColorSelection;
  onChange: (v: ColorSelection) => void;
  /** Which slot is currently being edited */
  activeSlot?: 'primary' | 'secondary';
  onSlotChange?: (slot: 'primary' | 'secondary') => void;
  /** Compact mode for small spaces */
  compact?: boolean;
}

export function CampaignColorPicker({
  value,
  onChange,
  activeSlot = 'primary',
  onSlotChange,
  compact = false,
}: Props) {
  const [slot, setSlot]         = useState<'primary' | 'secondary'>(activeSlot);
  const [customHex, setCustom]  = useState('');
  const [activeParty, setParty] = useState<string | null>(null);

  const currentColor = slot === 'primary' ? value.primary : value.secondary;

  const handleSelect = (color: string) => {
    onChange(slot === 'primary'
      ? { ...value, primary: color }
      : { ...value, secondary: color }
    );
  };

  const handlePartyPalette = (palette: typeof PARTY_PALETTES[0]) => {
    setParty(palette.party);
    onChange({ primary: palette.colors[0], secondary: palette.colors[1] });
  };

  const handleCustomHex = () => {
    const hex = customHex.startsWith('#') ? customHex : `#${customHex}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      handleSelect(hex);
      setCustom('');
    }
  };

  const swapSlot = (s: 'primary' | 'secondary') => {
    setSlot(s);
    onSlotChange?.(s);
  };

  return (
    <div className="space-y-4">
      {/* Active slot selector */}
      <div className="flex gap-3">
        {(['primary', 'secondary'] as const).map((s) => {
          const col = s === 'primary' ? value.primary : value.secondary;
          const active = slot === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => swapSlot(s)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all flex-1 ${
                active ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: col }}
              />
              <div className="text-left">
                <p className={`text-xs font-semibold capitalize ${active ? 'text-violet-700' : 'text-gray-700'}`}>
                  {s} Colour
                </p>
                <p className="text-[10px] text-gray-400 font-mono">{col}</p>
              </div>
              {active && <div className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
            </button>
          );
        })}
      </div>

      {/* Party palette quick-select */}
      {!compact && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Party Palettes
          </p>
          <div className="flex flex-wrap gap-2">
            {PARTY_PALETTES.map((p) => (
              <button
                key={p.party}
                type="button"
                onClick={() => handlePartyPalette(p)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  activeParty === p.party
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex gap-0.5">
                  {p.colors.slice(0,3).map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: c }} />
                  ))}
                </div>
                {p.party}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard colour grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Campaign Colours
        </p>
        <div className="grid grid-cols-8 gap-1.5">
          {STANDARD_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              selected={currentColor === color}
              onClick={handleSelect}
              size={compact ? 26 : 32}
            />
          ))}
        </div>
      </div>

      {/* Custom hex */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Custom Hex Colour
        </p>
        <div className="flex gap-2 items-center">
          <div
            className="w-9 h-9 rounded-lg border-2 border-gray-200 flex-shrink-0"
            style={{ backgroundColor: customHex.startsWith('#') && customHex.length >= 7 ? customHex : currentColor }}
          />
          <input
            type="text"
            className="vc-input font-mono text-sm flex-1"
            placeholder="#FF6600"
            maxLength={7}
            value={customHex}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomHex()}
          />
          <button
            type="button"
            onClick={handleCustomHex}
            className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
          >
            Apply
          </button>
          {/* Native color input for OS color picker */}
          <label className="cursor-pointer p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="Open colour picker">
            <Pipette className="w-4 h-4 text-gray-600" />
            <input
              type="color"
              className="sr-only"
              value={currentColor}
              onChange={(e) => handleSelect(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
