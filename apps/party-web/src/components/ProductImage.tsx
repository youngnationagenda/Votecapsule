// ============================================================
// VoteCapsule™ — Product Image with Smart Fallback (Party Portal)
// Handles S3 images, loading states, broken links gracefully.
// ============================================================
import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { CampaignMaterialIcon } from './CampaignMaterialIcon';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  code?: string;
  className?: string;
  iconSize?: number;
  showLoading?: boolean;
}

export function ProductImage({ src, alt, code, className = '', iconSize = 48, showLoading = false }: ProductImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  useEffect(() => {
    if (!src) { setStatus('error'); return; }
    setStatus('loading');
    const img = new Image();
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);

  if (status === 'loading' && showLoading) {
    return (<div className={`flex items-center justify-center bg-gray-50 animate-pulse ${className}`}><div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" /></div>);
  }

  if (status === 'error' || !src) {
    return (<div className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>{code ? <CampaignMaterialIcon code={code} size={iconSize} /> : <ImageOff className="w-8 h-8 text-gray-300" />}</div>);
  }

  return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" onError={() => setStatus('error')} />;
}

export function checkImageAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) { resolve(false); return; }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    setTimeout(() => resolve(false), 5000);
  });
}

export function getS3ImageUrl(code: string, format: 'svg' | 'jpg' | 'png' = 'svg'): string {
  return `https://s3.amazonaws.com/votecapsule-campaign-assets/suppliers/me-advertising/images/${code.toUpperCase()}.${format}`;
}
