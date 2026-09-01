// ============================================================
// VoteCapsule™ — AI Image Generator Page (Party Portal)
// Powered by Stability AI via Amazon Bedrock
// Generates campaign posters, banners, and branded assets
// ============================================================
import React, { useState, useRef } from 'react';
import { useQuery, useMutation }    from '@tanstack/react-query';
import {
  Sparkles, Download, RefreshCw, AlertTriangle, Image as ImageIcon,
  ChevronDown, Wand2, Upload, ZoomIn, Loader2, Copy, Check,
  CreditCard,
} from 'lucide-react';
import { campaignApi }       from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import { useAppSelector }    from '../store/hooks';

// ── Types ─────────────────────────────────────────────────────
interface GeneratedImage {
  imageUrl:     string;
  s3Key:        string;
  model:        string;
  seed:         number;
  finishReason: string;
  prompt:       string;
  createdAt:    Date;
}

// ── Campaign style presets ─────────────────────────────────────
const STYLE_PRESETS = [
  { value: 'photographic',    label: '📷 Photographic',    desc: 'Realistic photo style' },
  { value: 'digital-art',     label: '🎨 Digital Art',     desc: 'Clean digital illustration' },
  { value: 'cinematic',       label: '🎬 Cinematic',       desc: 'Dramatic movie-poster look' },
  { value: 'comic-book',      label: '💬 Comic Book',      desc: 'Bold outlined style' },
  { value: 'fantasy-art',     label: '✨ Fantasy',         desc: 'Vibrant fantasy colours' },
  { value: 'isometric',       label: '📦 Isometric',       desc: '3D isometric design' },
  { value: 'low-poly',        label: '🔷 Low Poly',        desc: 'Geometric polygon art' },
  { value: 'origami',         label: '🦢 Origami',         desc: 'Paper fold aesthetic' },
  { value: 'line-art',        label: '✏️ Line Art',        desc: 'Clean outline illustration' },
  { value: '3d-model',        label: '🖥️ 3D Model',        desc: 'Three-dimensional render' },
];

const ASPECT_RATIOS = [
  { value: '1:1',   label: '1:1',  desc: 'Square — Social media' },
  { value: '16:9',  label: '16:9', desc: 'Wide — Banner / Billboard' },
  { value: '9:16',  label: '9:16', desc: 'Portrait — Phone wallpaper / Story' },
  { value: '4:3',   label: '4:3',  desc: 'Landscape — Poster / Print' },
  { value: '3:2',   label: '3:2',  desc: 'Photo — Standard print' },
  { value: '2:3',   label: '2:3',  desc: 'Portrait — A4 flyer' },
  { value: '21:9',  label: '21:9', desc: 'Ultra-wide — Billboard' },
];

const CAMPAIGN_PROMPT_TEMPLATES = [
  { label: 'Campaign Poster',        value: 'Professional political campaign poster, candidate portrait, bold typography, patriotic colors, high quality print design' },
  { label: 'Rally Background',       value: 'Energetic political rally background, crowd, stage lights, flags, patriotic atmosphere, vibrant' },
  { label: 'Social Media Banner',    value: 'Clean modern political social media banner, gradient background, minimal design, brand colors' },
  { label: 'T-shirt Design',         value: 'Bold campaign t-shirt graphic design, slogan text, vector style, simple clean illustration' },
  { label: 'Billboard',              value: 'Large format billboard design for political campaign, strong typography, high contrast, easily readable from distance' },
  { label: 'Party Flag',             value: 'Political party flag design, symbolic imagery, bold colors, clean graphic design' },
  { label: 'Branded Cap',            value: 'Campaign branded baseball cap mockup, embroidered logo, promotional merchandise' },
  { label: 'Event Invitation',       value: 'Elegant political event invitation card design, formal typography, party branding, professional' },
];

// ── Payment Warning Banner ─────────────────────────────────────
function PaymentRequiredBanner() {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <CreditCard className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-amber-900 text-sm">Payment Method Required</p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          Stability AI models in Amazon Bedrock require a valid payment method on the AWS account
          before they can generate images. All 13 Stability AI models are enabled and the IAM
          permissions are configured — you just need to add a payment method.
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <a
            href="https://console.aws.amazon.com/billing/home#/paymentmethods"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
          >
            <CreditCard className="w-3 h-3" /> Add Payment Method
          </a>
          <a
            href="https://console.aws.amazon.com/bedrock/home?region=us-east-1#/model-access"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-200 transition-colors"
          >
            View Bedrock Model Access
          </a>
        </div>
        <p className="text-[11px] text-amber-600 mt-2">
          ✅ IAM permissions configured &nbsp;·&nbsp; ✅ All 13 Stability AI models ACTIVE &nbsp;·&nbsp; ⏳ Payment method needed
        </p>
      </div>
    </div>
  );
}

// ── Generated Image Card ───────────────────────────────────────
function GeneratedImageCard({ image }: { image: GeneratedImage }) {
  const [copied, setCopied] = useState(false);

  const handleCopySeed = () => {
    navigator.clipboard.writeText(String(image.seed));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(image.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-ai-${image.seed || Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.imageUrl, '_blank');
    }
  };

  return (
    <div className="vc-card p-0 overflow-hidden group">
      {/* Image */}
      <div className="relative aspect-square w-full bg-gray-100">
        <img
          src={image.imageUrl}
          alt={image.prompt}
          className="w-full h-full object-cover"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <button
            onClick={handleDownload}
            className="bg-white rounded-xl p-2.5 shadow-lg hover:bg-gray-50 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-700" />
          </button>
          <a
            href={image.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl p-2.5 shadow-lg hover:bg-gray-50 transition-colors"
            title="View full size"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </a>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{image.prompt}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {image.createdAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={handleCopySeed}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 transition-colors"
            title="Copy seed for reproducibility"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            seed {image.seed}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
function AIImageGeneratorContent(): React.JSX.Element {
  const [prompt, setPrompt]               = useState('');
  const [negativePrompt, setNegPrompt]    = useState('');
  const [aspectRatio, setAspectRatio]     = useState<string>('1:1');
  const [stylePreset, setStylePreset]     = useState('');
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [seed, setSeed]                   = useState<string>('');
  const [generatedImages, setGenerated]   = useState<GeneratedImage[]>([]);
  const [paymentError, setPaymentError]   = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Get active campaign
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list().then(r => r.data?.data ?? r.data ?? []),
  });
  const campaign = (campaigns as any[]).find((c: any) => c.status === 'active') ?? (campaigns as any[])[0];

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['ai-image-models'],
    queryFn: () => campaignApi.aiImages.listModels().then(r => r.data?.data ?? r.data ?? []),
    staleTime: 10 * 60 * 1000,
  });
  const models: any[] = modelsData ?? [];
  const textToImageModels = models.filter(m => m.capability === 'text-to-image');

  // Generate mutation
  const generateMut = useMutation({
    mutationFn: () => {
      if (!campaign?.id) return Promise.reject(new Error('no-campaign'));
      return campaignApi.aiImages.generate(campaign.id, {
        prompt,
        negativePrompt:  negativePrompt || undefined,
        aspectRatio:     aspectRatio as any,
        stylePreset:     stylePreset  || undefined,
        seed:            seed ? Number(seed) : undefined,
        outputFormat:    'jpeg',
      });
    },
    onSuccess: (res) => {
      const data = res.data?.data ?? res.data;
      setGenerated(prev => [{
        ...data,
        prompt,
        createdAt: new Date(),
      }, ...prev]);
      setPaymentError(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? '';
      if (msg === 'no-campaign') return; // silently ignore — banner already shown
      if (msg.includes('payment') || msg.includes('INVALID_PAYMENT') || msg.includes('ServiceUnavailable')) {
        setPaymentError(true);
      }
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      promptRef.current?.focus();
      return;
    }
    generateMut.mutate();
  };

  const handleTemplate = (template: string) => {
    setPrompt(template);
    promptRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" />
            AI Image Generator
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Generate campaign posters, banners and branded assets with Stability AI
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-xs font-medium text-violet-700">Bedrock · Stability AI</span>
        </div>
      </div>

      {/* Payment error banner */}
      {paymentError && <PaymentRequiredBanner />}

      {/* No campaign banner */}
      {!campaign && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Create a campaign to save generated images to your library. <a href="/campaign" className="font-semibold underline hover:text-amber-900">Get started →</a></p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Controls ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Prompt */}
          <div className="vc-card space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Describe your image *
              </label>
              <textarea
                ref={promptRef}
                rows={4}
                className="vc-input resize-none"
                placeholder="e.g. Professional campaign poster, candidate photo, bold red typography, patriotic theme, high quality print design..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Quick templates */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Quick templates</p>
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN_PROMPT_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => handleTemplate(t.value)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-violet-100 hover:text-violet-700 text-gray-600 rounded-lg transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Aspect ratio */}
          <div className="vc-card">
            <p className="text-sm font-semibold text-gray-800 mb-3">Aspect Ratio</p>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setAspectRatio(r.value)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    aspectRatio === r.value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-bold ${aspectRatio === r.value ? 'text-violet-700' : 'text-gray-700'}`}>
                    {r.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style preset */}
          <div className="vc-card">
            <p className="text-sm font-semibold text-gray-800 mb-3">Style Preset</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStylePreset('')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  !stylePreset ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`text-xs font-semibold ${!stylePreset ? 'text-violet-700' : 'text-gray-700'}`}>🎯 Auto</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Let AI decide</p>
              </button>
              {STYLE_PRESETS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStylePreset(s.value)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    stylePreset === s.value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-semibold ${stylePreset === s.value ? 'text-violet-700' : 'text-gray-700'}`}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced options */}
          <div className="vc-card">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
            >
              Advanced Options
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Negative Prompt <span className="text-gray-400">(what to avoid)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="vc-input resize-none text-xs"
                    placeholder="blurry, low quality, watermark, text, ugly..."
                    value={negativePrompt}
                    onChange={(e) => setNegPrompt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Seed <span className="text-gray-400">(for reproducibility)</span>
                  </label>
                  <input
                    type="number"
                    className="vc-input text-xs"
                    placeholder="Leave blank for random"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMut.isPending || !prompt.trim()}
            className="w-full vc-btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generateMut.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Image
              </>
            )}
          </button>

          {generateMut.isError && !paymentError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                {(generateMut.error as any)?.response?.data?.message ?? 'Image generation failed. Please try again.'}
              </p>
            </div>
          )}

          {/* Available models info */}
          {textToImageModels.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-600">Active Stability AI Models</p>
              {models.slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] text-gray-500">{m.name}</p>
                  <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {m.capability}
                  </span>
                </div>
              ))}
              {models.length > 5 && (
                <p className="text-[10px] text-gray-400">+{models.length - 5} more models</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Generated Images Gallery ──────────────── */}
        <div className="lg:col-span-3">
          {generatedImages.length === 0 && !generateMut.isPending ? (
            <div className="vc-card h-full min-h-[400px] flex flex-col items-center justify-center text-center py-16">
              <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                <ImageIcon className="w-10 h-10 text-violet-300" />
              </div>
              <p className="text-base font-semibold text-gray-700">No images yet</p>
              <p className="text-sm text-gray-400 mt-1.5 max-w-xs">
                Enter a prompt and click <strong>Generate Image</strong> to create
                AI-powered campaign visuals using Stability AI
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 opacity-30 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generating placeholder */}
              {generateMut.isPending && (
                <div className="vc-card aspect-square flex flex-col items-center justify-center gap-4 animate-pulse">
                  <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Generating your image...</p>
                    <p className="text-xs text-gray-400 mt-1">This takes about 5–15 seconds</p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Generated images grid */}
              <div className="grid grid-cols-2 gap-3">
                {generatedImages.map((img, i) => (
                  <GeneratedImageCard key={i} image={img} />
                ))}
              </div>

              {/* Regenerate button */}
              {generatedImages.length > 0 && !generateMut.isPending && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="w-full vc-btn-secondary py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Generate Another Variation
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyAIImageGeneratorPage() {
  return (
    <PageErrorBoundary page="AI Image Generator">
      <AIImageGeneratorContent />
    </PageErrorBoundary>
  );
}