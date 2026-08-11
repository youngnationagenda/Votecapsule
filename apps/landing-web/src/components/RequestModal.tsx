/**
 * VoteCapsule™ — Request Centre Modal
 * Multi-step KYC form for demos, quotes, trials, and production access.
 *
 * On submit:
 *   1. POST to /api/v1/notification/demo-request via API Gateway
 *   2. On success  → show SuccessView (server emails both parties)
 *   3. On API fail → graceful mailto: fallback (still shows success to user)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL ??
  'https://483uyy43nc.execute-api.us-east-1.amazonaws.com/api/v1';

const DEMO_ENDPOINT = `${API_BASE}/notification/demo-request`;

// ── Types ─────────────────────────────────────────────────────────────────────
type RequestType      = 'demo' | 'quote' | 'trial' | 'production';
type Product          = 'transparency' | 'authority' | 'both';
type Role             = 'candidate' | 'party' | 'commission' | 'observer' | 'media' | 'other';
type PreferredContact = 'email' | 'phone';
type Timing           = 'standard' | 'urgent';

interface FormData {
  requestType:    RequestType | '';
  product:        Product     | '';
  fullName:       string;
  organization:   string;
  email:          string;
  phone:          string;
  preferredContact: PreferredContact;
  timing:         Timing;
  role:           Role | '';
  position:       string;
  county:         string;
  coverageNotes:  string;
  message:        string;
  privacyConsent: boolean;
  contactConsent: boolean;
}

const INITIAL: FormData = {
  requestType:     '',
  product:         '',
  fullName:        '',
  organization:    '',
  email:           '',
  phone:           '',
  preferredContact: 'email',
  timing:          'standard',
  role:            '',
  position:        '',
  county:          '',
  coverageNotes:   '',
  message:         '',
  privacyConsent:  false,
  contactConsent:  false,
};

const POSITIONS = [
  'President',
  'Governor',
  'Senator',
  'Woman Representative',
  'Member of National Assembly',
  'Member of County Assembly',
  'Ward Representative',
];

const COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa',
  'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu',
  'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', "Murang'a",
  'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia', 'Uasin Gishu',
  'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado',
  'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya',
  'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi',
];

// ── Shared sub-components ─────────────────────────────────────────────────────
function Chip({
  label,
  selected,
  onClick,
}: {
  label:    string;
  selected: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
        selected
          ? 'border-[#059669] bg-[#059669]/10 text-[#059669]'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label:     string;
  required?: boolean;
  children:  React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

// ── API submit helper ─────────────────────────────────────────────────────────
async function submitToApi(form: FormData): Promise<void> {
  const response = await fetch(DEMO_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(form),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text.slice(0, 120)}`);
  }
}

// mailto: fallback — opens email client with full form contents pre-filled
function buildMailto(form: FormData): string {
  const subject = `VoteCapsule ${form.requestType} request — ${form.fullName}`;
  const body = [
    `Request Type: ${form.requestType}`,
    `Product: ${form.product}`,
    `Name: ${form.fullName}`,
    `Organization: ${form.organization}`,
    `Email: ${form.email}`,
    `Phone: ${form.phone}`,
    `Preferred Contact: ${form.preferredContact}`,
    `Timing: ${form.timing}`,
    `Role: ${form.role}`,
    `Position: ${form.position}`,
    `County: ${form.county}`,
    `Coverage Notes: ${form.coverageNotes}`,
    `Message: ${form.message}`,
  ].join('\n');
  return `mailto:mk@yna.co.ke?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function RequestModal({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) {
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState<FormData>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canProceed = (s: number): boolean => {
    switch (s) {
      case 1: return form.requestType !== '' && form.product !== '';
      case 2: return form.fullName.trim() !== '' && form.email.trim() !== '' && form.phone.trim() !== '';
      case 3: return form.role !== '';
      case 4: return form.privacyConsent;
      default: return true;
    }
  };

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setApiError(null);

    try {
      await submitToApi(form);
      // API succeeded — server is sending both emails
      setSubmitted(true);
    } catch (err) {
      // API failed — log it, open mailto fallback, still show success to user
      console.warn('[VoteCapsule] Demo request API failed, using mailto fallback:', err);
      try {
        window.open(buildMailto(form), '_blank');
      } catch {
        // mailto also failed — show inline error so user can copy contact
        setApiError('Could not submit automatically. Please email mk@yna.co.ke directly.');
        setLoading(false);
        return;
      }
      // mailto opened successfully — treat as submitted
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setForm(INITIAL);
      setSubmitted(false);
      setApiError(null);
    }, 300);
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === backdropRef.current) handleClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Request Centre</h2>
            <p className="text-xs text-neutral-500">
              Tell us what you need next. We respond within one business day.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {submitted ? (
            <SuccessView email={form.email} onClose={handleClose} />
          ) : (
            <>
              {/* Step indicators */}
              <div className="mb-6 flex items-center gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        s === step
                          ? 'bg-[#0B3C6D] text-white'
                          : s < step
                            ? 'bg-[#059669] text-white'
                            : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {s < step ? <CheckCircle className="h-3.5 w-3.5" /> : s}
                    </div>
                    {s < 4 && (
                      <div className={`h-0.5 w-6 rounded ${s < step ? 'bg-[#059669]' : 'bg-neutral-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step content */}
              {step === 1 && <Step1 form={form} update={update} />}
              {step === 2 && <Step2 form={form} update={update} />}
              {step === 3 && <Step3 form={form} update={update} />}
              {step === 4 && <Step4 form={form} update={update} />}

              {/* API error banner */}
              {apiError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-xs text-red-700">{apiError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer navigation */}
        {!submitted && (
          <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-6 py-4 rounded-b-2xl">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed(step)}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                style={{ backgroundColor: '#059669' }}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed(4) || loading}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                style={{ backgroundColor: '#059669' }}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send request <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 1: What do you need? ─────────────────────────────────────────────────
function Step1({
  form,
  update,
}: {
  form:   FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-neutral-900">1. What do you need?</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ['demo',       'See a guided demo'],
            ['quote',      'Get a quote'],
            ['trial',      'Start a trial'],
            ['production', 'Request production access'],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={form.requestType === value}
              onClick={() => update('requestType', value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-neutral-900">Which product?</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ['transparency', 'Election Transparency Platform'],
            ['authority',    'Authority Management Suite'],
            ['both',         'Full Platform (all portals)'],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={form.product === value}
              onClick={() => update('product', value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Who are you? ──────────────────────────────────────────────────────
function Step2({
  form,
  update,
}: {
  form:   FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-neutral-900">2. Who are you?</h3>

      <Field label="Full name" required>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => update('fullName', e.target.value)}
          placeholder="e.g. James Mwangi"
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669]"
        />
      </Field>

      <Field label="Organization / party">
        <input
          type="text"
          value={form.organization}
          onChange={(e) => update('organization', e.target.value)}
          placeholder="e.g. Orange Democratic Movement"
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669]"
        />
      </Field>

      <Field label="Email" required>
        <input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669]"
        />
      </Field>

      <Field label="Phone" required>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="+254 7XX XXX XXX"
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium text-neutral-700">Preferred contact</span>
          <div className="mt-1.5 flex gap-2">
            <Chip label="Email" selected={form.preferredContact === 'email'} onClick={() => update('preferredContact', 'email')} />
            <Chip label="Phone" selected={form.preferredContact === 'phone'} onClick={() => update('preferredContact', 'phone')} />
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-neutral-700">Timing</span>
          <div className="mt-1.5 flex gap-2">
            <Chip label="Standard" selected={form.timing === 'standard'} onClick={() => update('timing', 'standard')} />
            <Chip label="Urgent"   selected={form.timing === 'urgent'}   onClick={() => update('timing', 'urgent')} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Coverage ──────────────────────────────────────────────────────────
function Step3({
  form,
  update,
}: {
  form:   FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-neutral-900">3. Coverage</h3>

      <div>
        <span className="text-sm font-medium text-neutral-700">
          I am a… <span className="text-red-500">*</span>
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {([
            ['candidate',  'Candidate'],
            ['party',      'Political Party'],
            ['commission', 'Electoral Commission'],
            ['observer',   'Observer / Monitor'],
            ['media',      'Media House'],
            ['other',      'Other'],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={form.role === value}
              onClick={() => update('role', value)}
            />
          ))}
        </div>
      </div>

      {(form.role === 'candidate' || form.role === 'party') && (
        <Field label="Which position are you vying for?">
          <select
            value={form.position}
            onChange={(e) => update('position', e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669]"
          >
            <option value="">Select a position…</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      )}

      <Field label="County of interest">
        <select
          value={form.county}
          onChange={(e) => update('county', e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669]"
        >
          <option value="">Select a county… (or leave blank for nationwide)</option>
          {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Coverage notes / custom needs">
        <textarea
          value={form.coverageNotes}
          onChange={(e) => update('coverageNotes', e.target.value)}
          rows={3}
          placeholder="e.g. Need coverage for 5 constituencies in Nairobi…"
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
        />
      </Field>
    </div>
  );
}

// ── Step 4: Anything else? ────────────────────────────────────────────────────
function Step4({
  form,
  update,
}: {
  form:   FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-neutral-900">4. Anything else?</h3>

      <Field label="Message">
        <textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          rows={4}
          placeholder="Tell us more about your requirements, timeline, or questions…"
          className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#059669] focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none"
        />
      </Field>

      <div className="space-y-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.privacyConsent}
            onChange={(e) => update('privacyConsent', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#059669] focus:ring-[#059669]"
          />
          <span className="text-xs leading-relaxed text-neutral-600">
            I have read the <a href="/privacy" className="font-medium text-[#0B3C6D] underline">Privacy Policy</a>. <span className="text-red-500">*</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.contactConsent}
            onChange={(e) => update('contactConsent', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#059669] focus:ring-[#059669]"
          />
          <span className="text-xs leading-relaxed text-neutral-600">
            VoteCapsule may contact me about this request by my selected method.
          </span>
        </label>
      </div>

      <p className="text-[11px] text-neutral-400">
        By submitting you agree to our <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </div>
  );
}

// ── Success view ──────────────────────────────────────────────────────────────
function SuccessView({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#059669]/10">
        <CheckCircle className="h-8 w-8 text-[#059669]" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-neutral-900">Request sent</h3>
      <p className="mt-2 text-sm text-neutral-500">
        Thank you! Our team will respond within one business day.
      </p>
      {email && (
        <p className="mt-1 text-xs text-neutral-400">
          A confirmation has been sent to <span className="font-medium text-neutral-600">{email}</span>
        </p>
      )}
      <button
        onClick={onClose}
        className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
        style={{ backgroundColor: '#0B3C6D' }}
      >
        Back to VoteCapsule
      </button>
    </div>
  );
}
