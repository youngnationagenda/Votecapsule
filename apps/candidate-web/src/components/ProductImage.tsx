// ============================================================
// VoteCapsule™ — Product Image with Smart Fallback
// Handles S3 images, loading states, broken links gracefully.
// Falls back to CampaignMaterialIcon when image is unavailable.
// ============================================================
import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { CampaignMaterialIcon } from './CampaignMaterialIcon';

interface ProductImageProps {
  /** Image source URL (S3 or external) */
  src: string | null | undefined;
  /** Alt text */
  alt: string;
  /** Material type code for icon fallback */
  code?: string;
  /** Tailwind classes for the container */
  className?: string;
  /** Size for the fallback icon */
  iconSize?: number;
  /** Show a shimmer loading state before image loads */
  showLoading?: boolean;
}

/**
 * Renders a product image with intelligent fallback:
 * 1. Attempts to load the src URL
 * 2. If src is null/undefined → shows CampaignMaterialIcon (if code provided) or generic placeholder
 * 3. If image fails to load (404, CORS, etc) → same fallback as above
 * 4. Shows a shimmer/loading state while image is loading (if showLoading=true)
 *
 * S3 image paths like:
 *   https://s3.amazonaws.com/votecapsule-campaign-assets/suppliers/me-advertising/images/BASEBALL_CAP.svg
 * will 404 until Sonie uploads them. This component handles that gracefully.
 */
export function ProductImage({
  src,
  alt,
  code,
  className = '',
  iconSize = 48,
  showLoading = false,
}: ProductImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    src ? 'loading' : 'error'
  );

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    // Pre-check if image is accessible
    const img = new Image();
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // Loading shimmer
  if (status === 'loading' && showLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 animate-pulse ${className}`}>
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
      </div>
    );
  }

  // Error / no src — fallback
  if (status === 'error' || !src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
        {code ? (
          <CampaignMaterialIcon code={code} size={iconSize} />
        ) : (
          <ImageOff className="w-8 h-8 text-gray-300" />
        )}
      </div>
    );
  }

  // Loaded successfully
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={() => setStatus('error')}
    />
  );
}

/**
 * Utility: Check if an image URL is accessible without rendering it.
 * Useful for pre-validating S3 paths in batch.
 */
export function checkImageAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) { resolve(false); return; }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    // Timeout after 5s
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Generate the expected S3 image path for a material code.
 * Used by frontend to construct predictable S3 URLs.
 */
export function getS3ImageUrl(code: string, format: 'svg' | 'jpg' | 'png' = 'svg'): string {
  const bucket = 'votecapsule-campaign-assets';
  const prefix = 'suppliers/me-advertising/images';
  return `https://s3.amazonaws.com/${bucket}/${prefix}/${code.toUpperCase()}.${format}`;
}
