/**
 * Vote Capsule™ — Party Social Media Links Page
 *
 * Simple form page for managing party social media handles and URLs.
 * Includes URL validation and a preview card showing how links appear
 * on the Public Portal.
 */

import React, { useState, useEffect } from 'react';
import {
  Globe, Twitter, Facebook, Instagram, Youtube, Music2,
  Save, CheckCircle2, AlertCircle, Loader2, X, ExternalLink,
} from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface SocialLinks {
  websiteUrl: string;
  twitterHandle: string;
  facebookUrl: string;
  instagramHandle: string;
  youtubeChannel: string;
  tiktokHandle: string;
}

interface ValidationErrors {
  websiteUrl?: string;
  facebookUrl?: string;
  youtubeChannel?: string;
}

// ── Toast Component ──────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function SocialSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="h-72 bg-gray-100 rounded-xl" />
    </div>
  );
}

// ── URL Validation ───────────────────────────────────────────

function isValidUrl(str: string): boolean {
  if (!str.trim()) return true; // empty is valid (optional)
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function validateLinks(links: SocialLinks): ValidationErrors {
  const errors: ValidationErrors = {};
  if (links.websiteUrl && !isValidUrl(links.websiteUrl)) {
    errors.websiteUrl = 'Please enter a valid URL (e.g. https://example.com)';
  }
  if (links.facebookUrl && !isValidUrl(links.facebookUrl)) {
    errors.facebookUrl = 'Please enter a valid Facebook URL (e.g. https://facebook.com/yourpage)';
  }
  if (links.youtubeChannel && !isValidUrl(links.youtubeChannel)) {
    errors.youtubeChannel = 'Please enter a valid YouTube URL (e.g. https://youtube.com/@channel)';
  }
  return errors;
}

// ── Social Input Field ───────────────────────────────────────

function SocialField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  error,
  prefix,
}: {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </label>
      <div className="flex">
        {prefix && (
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-500">
            {prefix}
          </span>
        )}
        <input
          className={`vc-input flex-1 ${prefix ? 'rounded-l-none' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

// ── Preview Card ─────────────────────────────────────────────

function PreviewCard({ links }: { links: SocialLinks }) {
  const hasAnyLink = Object.values(links).some(v => v.trim());

  const socialItems = [
    { value: links.websiteUrl, icon: Globe, label: 'Website', color: 'text-blue-600 bg-blue-50' },
    { value: links.twitterHandle, icon: Twitter, label: 'X / Twitter', color: 'text-gray-800 bg-gray-100' },
    { value: links.facebookUrl, icon: Facebook, label: 'Facebook', color: 'text-blue-700 bg-blue-50' },
    { value: links.instagramHandle, icon: Instagram, label: 'Instagram', color: 'text-pink-600 bg-pink-50' },
    { value: links.youtubeChannel, icon: Youtube, label: 'YouTube', color: 'text-red-600 bg-red-50' },
    { value: links.tiktokHandle, icon: Music2, label: 'TikTok', color: 'text-gray-900 bg-gray-100' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <ExternalLink className="w-3 h-3" />
        Public Portal Preview
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Connect with Us</p>
        {hasAnyLink ? (
          <div className="space-y-2.5">
            {socialItems
              .filter(item => item.value.trim())
              .map(({ value, icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm text-gray-900 truncate font-medium">
                      {value.startsWith('http') ? value.replace(/^https?:\/\/(www\.)?/, '') : value}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-500 transition-colors" />
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Globe className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No social links added yet</p>
            <p className="text-xs text-gray-300 mt-1">Fill in the form to see the preview</p>
          </div>
        )}
      </div>
      {hasAnyLink && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            This is how your social links appear to the public on the VoteCapsule Public Portal.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Content ─────────────────────────────────────────────

function SocialMediaPageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [links, setLinks] = useState<SocialLinks>({
    websiteUrl: '',
    twitterHandle: '',
    facebookUrl: '',
    instagramHandle: '',
    youtubeChannel: '',
    tiktokHandle: '',
  });

  // Fetch existing social links
  useEffect(() => {
    if (!tenantId) return;
    apiClient.get(`/tenant/${tenantId}/social-media`)
      .then(r => {
        const data = r.data?.data ?? r.data;
        if (data) {
          setLinks({
            websiteUrl: data.websiteUrl ?? '',
            twitterHandle: data.twitterHandle ?? '',
            facebookUrl: data.facebookUrl ?? '',
            instagramHandle: data.instagramHandle ?? '',
            youtubeChannel: data.youtubeChannel ?? '',
            tiktokHandle: data.tiktokHandle ?? '',
          });
        }
      })
      .catch(() => { /* no existing data — use empty defaults */ })
      .finally(() => setLoading(false));
  }, [tenantId]);

  // Update field and validate
  const updateField = (field: keyof SocialLinks, value: string) => {
    const updated = { ...links, [field]: value };
    setLinks(updated);
    // Clear error for this field if it was fixed
    if (errors[field as keyof ValidationErrors]) {
      const newErrors = validateLinks(updated);
      setErrors(newErrors);
    }
  };

  // Save handler
  const handleSave = async () => {
    const validationErrors = validateLinks(links);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await apiClient.patch(`/tenant/${tenantId}/social-media`, links);
      setToast({ message: 'Social media links saved successfully', type: 'success' });
    } catch {
      setToast({ message: 'Failed to save social media links. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SocialSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Social Media Links</h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect your party's social presence to the Public Portal
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="vc-btn-primary gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Links'}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <SocialField
            icon={Globe}
            label="Website URL"
            placeholder="https://yourparty.co.ke"
            value={links.websiteUrl}
            onChange={(v) => updateField('websiteUrl', v)}
            error={errors.websiteUrl}
          />
          <SocialField
            icon={Twitter}
            label="Twitter / X Handle"
            placeholder="yourparty"
            value={links.twitterHandle}
            onChange={(v) => updateField('twitterHandle', v)}
            prefix="@"
          />
          <SocialField
            icon={Facebook}
            label="Facebook Page URL"
            placeholder="https://facebook.com/yourparty"
            value={links.facebookUrl}
            onChange={(v) => updateField('facebookUrl', v)}
            error={errors.facebookUrl}
          />
          <SocialField
            icon={Instagram}
            label="Instagram Handle"
            placeholder="yourparty"
            value={links.instagramHandle}
            onChange={(v) => updateField('instagramHandle', v)}
            prefix="@"
          />
          <SocialField
            icon={Youtube}
            label="YouTube Channel"
            placeholder="https://youtube.com/@yourparty"
            value={links.youtubeChannel}
            onChange={(v) => updateField('youtubeChannel', v)}
            error={errors.youtubeChannel}
          />
          <SocialField
            icon={Music2}
            label="TikTok Handle"
            placeholder="yourparty"
            value={links.tiktokHandle}
            onChange={(v) => updateField('tiktokHandle', v)}
            prefix="@"
          />
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <PreviewCard links={links} />

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="text-sm font-medium text-violet-900 mb-1">Public Visibility</p>
            <p className="text-xs text-violet-700">
              These links are displayed on your party's public profile on the VoteCapsule Public Portal.
              Voters can use them to find and follow your party on social media.
              Only non-empty fields are displayed publicly.
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export function SocialMediaPage() {
  return (
    <PageErrorBoundary page="Social Media">
      <SocialMediaPageContent />
    </PageErrorBoundary>
  );
}
