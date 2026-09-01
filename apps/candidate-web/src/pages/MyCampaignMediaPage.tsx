// ============================================================
// VoteCapsule™ — Campaign Media Library (Candidate Portal)
// Upload and manage: Campaign Photos, Party Logo, Candidate
// Symbol, T-shirt/Cap Designs, Banners, Posters, etc.
// ============================================================
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Image, Search, Download, Trash2, Tag,
  FolderOpen, Plus, X, Eye, Copy, Check,
  Camera, Flag, Shirt, FileImage, Film,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// ── Media Categories ──────────────────────────────────────────
const MEDIA_CATEGORIES = [
  { code: 'all',               label: 'All Media',           icon: FolderOpen,  color: 'text-gray-600',    bg: 'bg-gray-50' },
  { code: 'campaign_photo',    label: 'Campaign Photos',     icon: Camera,      color: 'text-amber-600',   bg: 'bg-amber-50' },
  { code: 'candidate_portrait',label: 'Candidate Portrait',  icon: Image,       color: 'text-blue-600',    bg: 'bg-blue-50' },
  { code: 'party_logo',        label: 'Party Logo',          icon: Flag,        color: 'text-violet-600',  bg: 'bg-violet-50' },
  { code: 'candidate_symbol',  label: 'Candidate Symbol',    icon: Tag,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { code: 'tshirt_design',     label: 'T-shirt Designs',     icon: Shirt,       color: 'text-orange-600',  bg: 'bg-orange-50' },
  { code: 'cap_design',        label: 'Cap Designs',         icon: Image,       color: 'text-pink-600',    bg: 'bg-pink-50' },
  { code: 'banner_design',     label: 'Banner Designs',      icon: FileImage,   color: 'text-sky-600',     bg: 'bg-sky-50' },
  { code: 'poster_design',     label: 'Poster Designs',      icon: FileImage,   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  { code: 'ai_generated',      label: 'AI Generated',        icon: Film,        color: 'text-purple-600',  bg: 'bg-purple-50' },
  { code: 'other',             label: 'Other',               icon: FolderOpen,  color: 'text-gray-500',    bg: 'bg-gray-50' },
];

const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
const MAX_FILE_SIZE_MB = 25;

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

// ── Upload Dropzone ───────────────────────────────────────────
function UploadDropzone({
  campaignId,
  selectedCategory,
  onUploaded,
}: {
  campaignId: string;
  selectedCategory: string;
  onUploaded: () => void;
}) {
  const qc         = useQueryClient();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState<string[]>([]);
  const [error, setError]         = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setError(null);
    const toUpload = Array.from(files).filter((f) => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`${f.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
      return true;
    });
    if (!toUpload.length) return;

    setUploading(true);
    setProgress(toUpload.map((f) => `Uploading ${f.name}…`));

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      try {
        // Step 1: get presigned URL from backend
        const { data: uploadData } = await campaignApi.media.uploadUrl(campaignId, {
          filename:        file.name,
          mime_type:       file.type,
          file_size_bytes: file.size,
          media_type:      selectedCategory !== 'all' ? selectedCategory : 'campaign_photo',
        });

        const presignedUrl = uploadData?.data?.upload_url ?? uploadData?.upload_url;
        const mediaId      = uploadData?.data?.media_id   ?? uploadData?.media_id;

        if (!presignedUrl) throw new Error('No upload URL returned from server');

        // Step 2: upload directly to S3
        setProgress((p) => p.map((v, idx) => idx === i ? `Uploading ${file.name} to S3…` : v));
        await fetch(presignedUrl, {
          method:  'PUT',
          body:    file,
          headers: { 'Content-Type': file.type },
        });

        setProgress((p) => p.map((v, idx) => idx === i ? `✓ ${file.name} uploaded` : v));
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed';
        setProgress((p) => p.map((v, idx) => idx === i ? `✗ ${file.name}: ${msg}` : v));
      }
    }

    setUploading(false);
    qc.invalidateQueries({ queryKey: ['campaign-media'] });
    setTimeout(() => { setProgress([]); onUploaded(); }, 1500);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !uploading && fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT_TYPES}
        className="sr-only"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {uploading ? (
        <div className="space-y-2">
          <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto" />
          {progress.map((p, i) => (
            <p key={i} className="text-sm text-gray-600">{p}</p>
          ))}
        </div>
      ) : (
        <>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Upload className="w-7 h-7 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Drop files here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, SVG · Max {MAX_FILE_SIZE_MB}MB per file · Multiple files supported</p>
          {selectedCategory !== 'all' && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              <Tag className="w-3 h-3" />
              Will tag as: {MEDIA_CATEGORIES.find((c) => c.code === selectedCategory)?.label}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}

// ── Media Card ────────────────────────────────────────────────
function MediaCard({
  item,
  campaignId,
  onDelete,
}: {
  item: any;
  campaignId: string;
  onDelete: () => void;
}) {
  const [copied, setCopied]   = useState(false);
  const [preview, setPreview] = useState(false);
  const [url, setUrl]         = useState<string | null>(item.signedUrl ?? null);

  const getUrl = async () => {
    if (url) return url;
    try {
      const { data } = await campaignApi.media.getUrl(campaignId, item.id);
      const signed = data?.data?.url ?? data?.url;
      setUrl(signed);
      return signed;
    } catch { return null; }
  };

  const handleCopy = async () => {
    const u = await getUrl();
    if (u) { await navigator.clipboard.writeText(u); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleDownload = async () => {
    const u = await getUrl();
    if (u) { const a = document.createElement('a'); a.href = u; a.download = item.fileName ?? 'download'; a.click(); }
  };

  const cat = MEDIA_CATEGORIES.find((c) => c.code === item.mediaType) ?? MEDIA_CATEGORIES[MEDIA_CATEGORIES.length - 1];

  return (
    <>
      <div className="vc-card p-0 overflow-hidden group hover:shadow-md transition-all">
        {/* Thumbnail */}
        <div
          className="relative w-full aspect-square bg-gray-100 cursor-pointer overflow-hidden"
          onClick={() => getUrl().then((u) => { if (u) { setUrl(u); setPreview(true); } })}
        >
          {(item.thumbnailUrl ?? url) ? (
            <img
              src={item.thumbnailUrl ?? url}
              alt={item.fileName ?? item.description ?? 'media'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${cat.bg}`}>
              <cat.icon className={`w-10 h-10 ${cat.color} opacity-60`} />
            </div>
          )}
          {/* Overlay actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button onClick={(e) => { e.stopPropagation(); getUrl().then((u) => { if (u) { setUrl(u); setPreview(true); } }); }}
              className="p-2 bg-white rounded-xl shadow text-gray-700 hover:text-amber-600">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="p-2 bg-white rounded-xl shadow text-gray-700 hover:text-blue-600">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="p-2 bg-white rounded-xl shadow text-gray-700 hover:text-emerald-600">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.fileName ?? item.description ?? 'Untitled'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                  {cat.label}
                </span>
                {item.fileSizeBytes && (
                  <span className="text-[10px] text-gray-400">
                    {(item.fileSizeBytes / 1024 / 1024).toFixed(1)}MB
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {item.createdAt && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              {new Date(item.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Lightbox preview */}
      {preview && url && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={() => setPreview(false)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(false)} className="absolute -top-10 right-0 text-white opacity-70 hover:opacity-100">
              <X className="w-6 h-6" />
            </button>
            <img src={url} alt={item.fileName ?? 'preview'} className="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain bg-gray-900" crossOrigin="anonymous" />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-white/70 text-sm">{item.fileName ?? 'Untitled'}</p>
              <div className="flex gap-2">
                <button onClick={handleDownload} className="flex items-center gap-1.5 text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy URL</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────
function MyCampaignMediaContent(): React.JSX.Element {
  const qc       = useQueryClient();
  const campaign = useMyCampaign();

  const [selectedCat, setCat]   = useState('all');
  const [search, setSearch]     = useState('');
  const [showUpload, setUpload] = useState(false);

  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ['campaign-media', campaign?.id, selectedCat],
    queryFn:  () => campaign
      ? campaignApi.media.listMedia(campaign.id, selectedCat !== 'all' ? { media_type: selectedCat } : undefined)
          .then((r) => r.data?.data ?? r.data ?? [])
      : [],
    enabled: !!campaign?.id,
  });

  const deleteMut = useMutation({
    mutationFn: (mediaId: string) => campaignApi.media.delete(campaign!.id, mediaId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['campaign-media'] }),
  });

  const filtered = mediaItems.filter((m: any) => {
    const q = search.toLowerCase();
    return !q || (m.fileName ?? m.description ?? '').toLowerCase().includes(q);
  });

  const catCounts: Record<string, number> = {};
  mediaItems.forEach((m: any) => { catCounts[m.mediaType] = (catCounts[m.mediaType] ?? 0) + 1; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Media Library</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage your campaign photos, logos, designs, and brand assets
          </p>
        </div>
        <button
          onClick={() => setUpload(!showUpload)}
          disabled={!campaign}
          className={`vc-btn-primary inline-flex items-center gap-2 text-sm ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="w-4 h-4" /> Upload Files
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && campaign && (
        <UploadDropzone
          campaignId={campaign.id}
          selectedCategory={selectedCat}
          onUploaded={() => setUpload(false)}
        />
      )}

      {!campaign && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Create a campaign to upload and organise your media library. <a href="/campaign" className="font-semibold underline hover:text-amber-900">Get started →</a></p>
        </div>
      )}

      {/* Category filter + search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="vc-input pl-9"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {MEDIA_CATEGORIES.map((cat) => {
          const count = cat.code === 'all' ? mediaItems.length : (catCounts[cat.code] ?? 0);
          return (
            <button
              key={cat.code}
              onClick={() => setCat(cat.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCat === cat.code
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-0.5 ${
                  selectedCat === cat.code ? 'bg-amber-400' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Media grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="vc-card p-0 overflow-hidden animate-pulse">
              <div className="w-full aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="vc-card text-center py-16">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          {mediaItems.length === 0 ? (
            <>
              <p className="text-base font-semibold text-gray-700">No media uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                Upload your campaign photos, logos, candidate symbols, T-shirt designs, and other brand assets.
              </p>
              <button
                onClick={() => setUpload(true)}
                className="mt-4 vc-btn-primary inline-flex items-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" /> Upload Your First File
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400">No files match your search or filter.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item: any) => (
            <MediaCard
              key={item.id}
              item={item}
              campaignId={campaign!.id}
              onDelete={() => {
                if (confirm(`Delete "${item.fileName ?? 'this file'}"?`)) {
                  deleteMut.mutate(item.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Media upload live — S3 presigned flow active */}
    </div>
  );
}

export function MyCampaignMediaPage() {
  return (
    <PageErrorBoundary page="Campaign Media Library">
      <MyCampaignMediaContent />
    </PageErrorBoundary>
  );
}
