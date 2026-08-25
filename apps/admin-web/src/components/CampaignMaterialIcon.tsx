// ============================================================
// VoteCapsule™ — Campaign Material Icon Component (Party Portal)
// Renders an SVG icon for a material category or product type code.
//
// Usage:
//   <CampaignMaterialIcon code="BASEBALL_CAP" size={64} />
//   <CampaignMaterialIcon code="BRANDED_CLOTHING" size={48} className="rounded-xl" />
//   <CampaignCategoryIcon categoryCode="HEADWEAR" size={80} />
// ============================================================
import React from 'react';
import { getCampaignIcon, CATEGORY_ICONS, PRODUCT_ICONS } from '../assets/campaignIcons';

interface Props {
  /** Material type code (e.g. BASEBALL_CAP) or category code (e.g. BRANDED_CLOTHING) */
  code: string;
  /** Rendered size in px — default 64 */
  size?: number;
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * Renders an SVG icon for any campaign material type or category code.
 * Falls back to a grey placeholder if the code is not in the registry.
 */
export function CampaignMaterialIcon({ code, size = 64, className = '', alt }: Props) {
  const svgString = getCampaignIcon(code?.toUpperCase());

  if (!svgString) {
    // Fallback: grey rounded square
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={alt ?? code}
      >
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt ?? code}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}

// ── Convenience wrappers ─────────────────────────────────────

/** Icon for a material CATEGORY tile (uses category code like HEADWEAR, APPAREL) */
export function CampaignCategoryIcon({
  categoryCode,
  size = 64,
  className = '',
}: {
  categoryCode: string;
  size?: number;
  className?: string;
}) {
  // Map from seed category code to icon registry key
  const MAP: Record<string, string> = {
    PRINTED_MATERIALS:   'PRINTED_MATERIALS',
    BRANDED_CLOTHING:    'BRANDED_CLOTHING',
    OUTDOOR_ADVERTISING: 'OUTDOOR_ADVERTISING',
    DIGITAL_MEDIA:       'DIGITAL_MEDIA',
    VEHICLE_BRANDING:    'VEHICLE_BRANDING',
    EVENT_SUPPLIES:      'EVENT_SUPPLIES',
    PROMOTIONAL_ITEMS:   'PROMOTIONAL_ITEMS',
    AUDIO_EQUIPMENT:     'AUDIO_EQUIPMENT',
    STAGE_EQUIPMENT:     'STAGE_EQUIPMENT',
    FOOD_BEVERAGES:      'FOOD_BEVERAGES',
    SECURITY_ITEMS:      'SECURITY_ITEMS',
    STATIONERY:          'STATIONERY',
    SOCIAL_MEDIA:        'SOCIAL_MEDIA',
    COMMUNICATION_TOOLS: 'COMMUNICATION_TOOLS',
    TRANSPORT_MATERIALS: 'TRANSPORT_MATERIALS',
    MEDIA_PRODUCTION:    'MEDIA_PRODUCTION',
    MISCELLANEOUS:       'MISCELLANEOUS',
  };

  const iconKey  = MAP[categoryCode?.toUpperCase()] ?? categoryCode;
  const svgString = CATEGORY_ICONS[iconKey];

  if (!svgString) {
    return (
      <div
        className={`bg-gray-100 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}

/** Icon grid — shows all registered product icons for a category */
export function CampaignIconGrid({
  codes,
  size = 48,
  onSelect,
}: {
  codes: string[];
  size?: number;
  onSelect?: (code: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {codes.map((code) => (
        <button
          key={code}
          onClick={() => onSelect?.(code)}
          className="rounded-xl border-2 border-transparent hover:border-violet-400 hover:shadow-md transition-all p-1 focus:outline-none focus:border-violet-500"
          title={code.replace(/_/g, ' ')}
          type="button"
        >
          <CampaignMaterialIcon code={code} size={size} />
        </button>
      ))}
    </div>
  );
}
