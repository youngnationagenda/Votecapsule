/**
 * Vote Capsule™ — Party Profile Builder Page
 *
 * Allows political parties to:
 * - View KYC data (pre-filled from ORPP, read-only for cert# and registration date)
 * - Edit mutable fields: slogan, head office address, postal address
 * - Upload logo and header banner with drag-drop + preview
 * - Pick primary and secondary brand colors with live header preview
 * - Save branding and KYC data via PATCH endpoints
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Palette, Save, Building2, Image, CheckCircle2,
  AlertCircle, Loader2, X,
} from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { apiClient } from '../api/apiClient';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Types ────────────────────────────────────────────────────

interface KycData {
  certificateNumber: string;
  registrationDate: string;
  partyName: string;
  abbreviation: string;
  slogan: string;
  headOfficeAddress: string;
  postalAddress: string;
}

interface BrandingData {
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

// ── Toast Component ──────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top ${
      type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ── Drag-Drop Upload Zone ────────────────────────────────────

function UploadZone({
  label,
  accept,
  maxSizeMb,
  currentUrl,
  onFile,
  aspectHint,
}: {
  label: string;
  accept: string;
  maxSizeMb: number;
  currentUrl: string | null;
  onFile: (file: File) => void;
  aspectHint: string;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const handleFile = (file: File) => {
    setError('');
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMb}MB limit`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Only image files are accepted');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    onFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
        }`}
      >
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt={label} className="mx-auto max-h-32 rounded-lg object-contain" />
            <p className="text-xs text-gray-500">Click or drop to replace</p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            <Upload className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500">Drag and drop or click to upload</p>
            <p className="text-xs text-gray-400">Max {maxSizeMb}MB — {aspectHint}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ── Color Picker ─────────────────────────────────────────────

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="vc-input flex-1 font-mono text-sm"
          placeholder="#7c3aed"
        />
      </div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
      <div className="space-y-6">
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Main Content ─────────────────────────────────────────────

function PartyProfilePageContent(): React.JSX.Element {
  const user = useAppSelector((s: any) => s.auth.user);
  const tenantId = user?.tenantId ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // KYC form state
  const [kyc, setKyc] = useState<KycData>({
    certificateNumber: '',
    registrationDate: '',
    partyName: '',
    abbreviation: '',
    slogan: '',
    headOfficeAddress: '',
    postalAddress: '',
  });

  // Branding form state
  const [branding, setBranding] = useState<BrandingData>({
    logoUrl: null,
    bannerUrl: null,
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Fetch existing profile data
  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      apiClient.get(`/tenant/tenants/${tenantId}/kyc`).then(r => r.data?.data ?? r.data).catch(() => null),
      apiClient.get(`/tenant/tenants/${tenantId}/branding`).then(r => r.data?.data ?? r.data).catch(() => null),
    ]).then(([kycData, brandData]) => {
      if (kycData) {
        setKyc({
          certificateNumber: kycData.certificateNumber ?? '',
          registrationDate: kycData.registrationDate ?? '',
          partyName: kycData.partyName ?? '',
          abbreviation: kycData.abbreviation ?? '',
          slogan: kycData.slogan ?? '',
          headOfficeAddress: kycData.headOfficeAddress ?? '',
          postalAddress: kycData.postalAddress ?? '',
        });
      }
      if (brandData) {
        setBranding({
          logoUrl: brandData.logoUrl ?? null,
          bannerUrl: brandData.bannerUrl ?? null,
          primaryColor: brandData.primaryColor ?? '#7c3aed',
          secondaryColor: brandData.secondaryColor ?? '#a78bfa',
        });
      }
    }).finally(() => setLoading(false));
  }, [tenantId]);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload files if selected
      let logoUrl = branding.logoUrl;
      let bannerUrl = branding.bannerUrl;

      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('type', 'logo');
        const res = await apiClient.post(`/tenant/tenants/${tenantId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        logoUrl = res.data?.url ?? res.data?.data?.url ?? logoUrl;
      }

      if (bannerFile) {
        const formData = new FormData();
        formData.append('file', bannerFile);
        formData.append('type', 'banner');
        const res = await apiClient.post(`/tenant/tenants/${tenantId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        bannerUrl = res.data?.url ?? res.data?.data?.url ?? bannerUrl;
      }

      // Save branding
      await apiClient.patch(`/tenant/tenants/${tenantId}/branding`, {
        logoUrl,
        bannerUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      });

      // Save KYC (mutable fields only)
      await apiClient.patch(`/tenant/tenants/${tenantId}/kyc`, {
        slogan: kyc.slogan,
        headOfficeAddress: kyc.headOfficeAddress,
        postalAddress: kyc.postalAddress,
      });

      setToast({ message: 'Profile saved successfully', type: 'success' });
      setLogoFile(null);
      setBannerFile(null);
    } catch {
      setToast({ message: 'Failed to save profile. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Party Profile Builder</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your party's brand identity and KYC information
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="vc-btn-primary gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Live Header Preview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Live Portal Header Preview
        </div>
        <div
          className="h-20 flex items-center px-6 gap-4 transition-colors"
          style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
        >
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/20 p-1" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white/80" />
            </div>
          )}
          <div>
            <p className="text-white font-bold text-lg">{kyc.partyName || 'Your Party Name'}</p>
            <p className="text-white/80 text-sm">{kyc.slogan || 'Your party slogan appears here'}</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Uploads + Colors */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-900">Brand Assets</h3>
            </div>
            <div className="space-y-5">
              <UploadZone
                label="Party Logo"
                accept="image/png,image/jpeg,image/svg+xml"
                maxSizeMb={2}
                currentUrl={branding.logoUrl}
                onFile={setLogoFile}
                aspectHint="Square (1:1), PNG or SVG preferred"
              />
              <UploadZone
                label="Header Banner"
                accept="image/png,image/jpeg"
                maxSizeMb={5}
                currentUrl={branding.bannerUrl}
                onFile={setBannerFile}
                aspectHint="Wide (4:1), 1200x300px recommended"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-900">Brand Colors</h3>
            </div>
            <div className="space-y-4">
              <ColorPicker
                label="Primary Color"
                value={branding.primaryColor}
                onChange={(v) => setBranding({ ...branding, primaryColor: v })}
              />
              <ColorPicker
                label="Secondary Color"
                value={branding.secondaryColor}
                onChange={(v) => setBranding({ ...branding, secondaryColor: v })}
              />
              <p className="text-xs text-gray-400">
                Colors are used in the Public Portal header and party-branded materials.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: KYC fields */}
        <div className="space-y-6">
          {/* Read-only ORPP fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-900">ORPP Registration (Read-only)</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Certificate Number</label>
                <input className="vc-input bg-gray-50 cursor-not-allowed" value={kyc.certificateNumber} readOnly disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Registration Date</label>
                <input className="vc-input bg-gray-50 cursor-not-allowed" value={kyc.registrationDate} readOnly disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Party Name</label>
                <input className="vc-input bg-gray-50 cursor-not-allowed" value={kyc.partyName} readOnly disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Abbreviation</label>
                <input className="vc-input bg-gray-50 cursor-not-allowed" value={kyc.abbreviation} readOnly disabled />
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                These fields are sourced from the Office of the Registrar of Political Parties and cannot be edited.
              </p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Editable Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Party Slogan</label>
                <input
                  className="vc-input"
                  value={kyc.slogan}
                  onChange={(e) => setKyc({ ...kyc, slogan: e.target.value })}
                  placeholder="e.g. Building Kenya Together"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Head Office Address</label>
                <textarea
                  className="vc-input h-20 resize-none"
                  value={kyc.headOfficeAddress}
                  onChange={(e) => setKyc({ ...kyc, headOfficeAddress: e.target.value })}
                  placeholder="Physical address of party headquarters"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Postal Address</label>
                <input
                  className="vc-input"
                  value={kyc.postalAddress}
                  onChange={(e) => setKyc({ ...kyc, postalAddress: e.target.value })}
                  placeholder="P.O. Box 12345-00100, Nairobi"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export function PartyProfilePage() {
  return (
    <PageErrorBoundary page="Profile">
      <PartyProfilePageContent />
    </PageErrorBoundary>
  );
}
