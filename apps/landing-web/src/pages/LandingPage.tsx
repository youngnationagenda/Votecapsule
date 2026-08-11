/**
 * Vote Capsule™ — Standalone Landing Page (Sales/Conversion Funnel)
 * No API wiring — static content only. All links go to external VoteCapsule services.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Shield,
  ArrowRight,
  CheckCircle,
  MapPin,
  Users,
  BarChart3,
  Activity,
  Lock,
  Globe,
  Eye,
  Building2,
  FileCheck,
  UserCheck,
  Key,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { RequestModal } from '../components/RequestModal';

// ── Constants ──────────────────────────────────────────────────────────────────
const LINKS = {
  transparency: 'https://transparency.votecapsule.yna.co.ke',
  admin: 'https://admin.votecapsule.yna.co.ke',
  authority: 'https://authority.votecapsule.yna.co.ke',
  party: 'https://party.votecapsule.yna.co.ke',
  candidate: 'https://candidate.votecapsule.yna.co.ke',
  observer: 'https://observer.votecapsule.yna.co.ke',
  stations: 'https://transparency.votecapsule.yna.co.ke/stations',
  verify: 'https://transparency.votecapsule.yna.co.ke/verify',
  results: 'https://transparency.votecapsule.yna.co.ke/results',
  candidates: 'https://transparency.votecapsule.yna.co.ke/candidates',
  progress: 'https://transparency.votecapsule.yna.co.ke/progress',
};

// Landing page is served at https://votecapsule.yna.co.ke
// Super Admin Portal is at https://admin.votecapsule.yna.co.ke

// ── Kenya Map SVG (decorative hero background) ────────────────────────────────
const COUNTY_DOTS: [number, number][] = [
  [248,280],[256,248],[244,220],[232,200],[220,180],[200,155],[185,130],
  [190,100],[205,70],[250,110],[265,85],[270,145],[255,170],[165,145],
  [152,125],[148,160],[160,175],[148,182],[120,120],[105,100],[90,90],
  [80,105],[95,130],[110,150],[120,165],[100,175],[70,185],[60,170],
  [55,155],[65,140],[75,125],[75,200],[62,210],[68,225],[85,215],
  [140,200],[120,210],[155,220],[165,200],[120,60],[145,40],[165,25],
  [190,35],[210,45],[100,75],[60,55],[50,80],
];

function KenyaMapSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 360" className={className} aria-hidden="true" fill="none">
      <path
        d="M 90,8 L 130,5 L 165,10 L 195,22 L 220,40 L 255,68 L 275,100
           L 278,140 L 272,175 L 260,210 L 250,245 L 240,268
           L 222,295 L 200,315 L 165,325 L 130,320 L 95,305
           L 65,285 L 42,260 L 28,230 L 22,195 L 18,160
           L 22,120 L 30,88 L 48,65 L 62,42 L 78,22 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <path
        d="M 90,8 L 100,80 L 165,145 M 130,5 L 148,60 L 165,145
           M 165,10 L 165,145 M 220,40 L 200,155 L 165,145
           M 275,100 L 220,155 L 200,155 M 278,140 L 250,180 L 200,155
           M 22,160 L 100,175 L 165,145 M 28,230 L 100,220 L 160,200 L 165,145
           M 165,325 L 165,200 L 165,145 M 95,305 L 100,220"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.18"
      />
      {COUNTY_DOTS.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2.5"
          fill="currentColor"
          style={{
            animation: `vcDotPulse ${2 + (i % 5) * 0.4}s ease-in-out ${(i * 0.09) % 2}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}

// ── Animated stat counter ────────────────────────────────────────────────────
function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(eased * target));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-center px-4">
      <div className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {value.toLocaleString('en-KE')}
      </div>
      <div className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-white/50">
        {label}
      </div>
    </div>
  );
}

// ── Portal card ──────────────────────────────────────────────────────────────
function PortalCard({
  icon: Icon,
  title,
  who,
  href,
  accentColor,
}: {
  icon: typeof Shield;
  title: string;
  who: string;
  href: string;
  accentColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <div className="h-full rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} aria-hidden="true" />
        </div>
        <h3 className="mt-5 text-sm font-semibold text-neutral-900">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{who}</p>
        <span
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: accentColor }}
        >
          Open portal <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}

// ── Login dropdown ───────────────────────────────────────────────────────────
const LOGIN_PORTALS = [
  { label: 'Super Admin', href: LINKS.admin, color: '#0B3C6D' },
  { label: 'Authority Portal', href: LINKS.authority, color: '#059669' },
  { label: 'Party Portal', href: LINKS.party, color: '#D97706' },
  { label: 'Candidate Portal', href: LINKS.candidate, color: '#7C3AED' },
  { label: 'Observer Portal', href: LINKS.observer, color: '#0891B2' },
  { label: 'Transparency Portal', href: LINKS.transparency, color: '#059669' },
];

function LoginDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
      >
        Login
        <ChevronRight
          className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-neutral-200 bg-white py-2 shadow-lg z-50">
          <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Select portal
          </p>
          {LOGIN_PORTALS.map(({ label, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
export function LandingPage() {
  const [showRequest, setShowRequest] = useState(false);

  return (
    <div className="overflow-x-hidden">
      <RequestModal open={showRequest} onClose={() => setShowRequest(false)} />

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
        <div className="container-narrow flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-[#0B3C6D]" aria-hidden="true" />
            <span className="text-lg font-bold text-[#0B3C6D]">
              VoteCapsule<sup className="text-[10px]">™</sup>
            </span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900">How it works</a>
            <a href="#portals" className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900">Platform</a>
            <a href="#integrity" className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900">Trust</a>
            <a href="#stakeholders" className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900">Who it serves</a>
          </nav>
          <div className="flex items-center gap-3">
            <LoginDropdown />
            <button
              onClick={() => setShowRequest(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: '#059669' }}
            >
              Request Demo
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-16 pb-24"
        style={{ backgroundColor: '#0B3C6D' }}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-0 sm:pr-8">
          <KenyaMapSVG className="h-[90%] max-h-[640px] w-auto text-white opacity-[0.11]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 35% 55%, rgba(5,150,105,0.13) 0%, transparent 70%)',
          }}
        />

        <div className="container-narrow relative z-10">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/75">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#059669' }} />
              Kenya Election Intelligence Platform · 2027
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[3.5rem]">
              Every vote captured.
              <br />
              <span style={{ color: '#34D399' }}>Every result verified.</span>
              <br />
              Every citizen informed.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
              VoteCapsule™ is the end-to-end election integrity platform for Kenya —
              from field agent capture through cryptographic anchoring to live public
              transparency. Purpose-built for 2027 and beyond.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => setShowRequest(true)}
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
                style={{ backgroundColor: '#059669' }}
              >
                Request a Demo <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href={LINKS.transparency}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/20"
              >
                View Live Portal <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

      </section>

      {/* White separator strip */}
      <div className="h-4 bg-white" />

      {/* ── TRUST BAR ─────────────────────────────────────────────────────── */}
      <section className="py-16" style={{ backgroundColor: '#072A4D' }}>
        <div className="container-narrow">
          <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-white/35">
            National Electoral Commission — Kenya 2027 Dataset
          </p>
          <div className="grid grid-cols-2 gap-y-10 sm:grid-cols-4">
            <AnimatedCounter target={47} label="Counties" />
            <AnimatedCounter target={290} label="Constituencies" />
            <AnimatedCounter target={46030} label="Polling Stations" />
            <AnimatedCounter target={22102532} label="Registered Voters" />
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container-narrow">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-400">
            The challenge
          </p>
          <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Kenya's elections deserve better infrastructure
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">
            Manual processes, delayed results, and zero public verifiability erode trust
            in every election cycle. VoteCapsule solves all three.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                dotColor: '#DC2626',
                bgColor: '#FEF2F2',
                title: 'Manual tallying errors',
                body: 'Form 34A tallies are hand-written and prone to transcription errors. A single data entry mistake propagates through every level of collation up to the national tally centre.',
              },
              {
                dotColor: '#D97706',
                bgColor: '#FFFBEB',
                title: 'Delayed results',
                body: "Paper-based transmission from 46,030 stations means results take days to reach IEBC's national tally — a window for dispute, manipulation, and public anxiety.",
              },
              {
                dotColor: '#6366F1',
                bgColor: '#EEF2FF',
                title: 'Zero public verifiability',
                body: 'Citizens have no way to check whether a published result matches the Form 34A from their own station. Trust is demanded rather than earned.',
              },
            ].map(({ dotColor, bgColor, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-100 p-8 shadow-sm"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: bgColor }}
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dotColor }} />
                </div>
                <h3 className="mt-6 text-base font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20" style={{ backgroundColor: '#F5F7FA' }}>
        <div className="container-narrow">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-400">
            The process
          </p>
          <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            From field capture to public record
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                icon: Key,
                title: 'Field Agent captures Form 34A',
                body: 'Presiding officers photograph and upload tallies directly from polling stations using the VoteCapsule mobile app.',
              },
              {
                step: '02',
                icon: Lock,
                title: 'Evidence Capsule anchored',
                body: 'Every submission is hashed with SHA-256, timestamped with Hedera Consensus Service, and sealed with an RFC 3161 proof. Immutable on submission.',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Authority collates Form 34B',
                body: 'Returning Officers use the Authority Portal to review verified capsules and officially publish constituency-level results.',
              },
              {
                step: '04',
                icon: Globe,
                title: 'Citizens verify independently',
                body: 'Any member of the public can enter a capsule ID and verify that the published result matches the original Form 34A — no login required.',
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <div
                key={step}
                className="relative rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <div
                  className="absolute -top-3.5 left-6 rounded-lg px-2.5 py-0.5 text-xs font-black text-white"
                  style={{ backgroundColor: '#0B3C6D' }}
                >
                  {step}
                </div>
                <div
                  className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: '#EBF2FA' }}
                >
                  <Icon className="h-5 w-5" style={{ color: '#0B3C6D' }} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM OVERVIEW ─────────────────────────────────────────────── */}
      <section id="portals" className="py-20 bg-white">
        <div className="container-narrow">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-400">
            Six portals · One platform
          </p>
          <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Every stakeholder covered
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-neutral-500">
            VoteCapsule provides purpose-built interfaces for each role in Kenya's electoral ecosystem — from IEBC officials to ordinary citizens.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <PortalCard
              icon={Shield}
              title="Super Admin Portal"
              who="Platform administrators — tenant management, billing, system health"
              href={LINKS.admin}
              accentColor="#0B3C6D"
            />
            <PortalCard
              icon={Building2}
              title="Authority Portal"
              who="IEBC Returning Officers — result collation, Form 34B official publication"
              href={LINKS.authority}
              accentColor="#059669"
            />
            <PortalCard
              icon={FileCheck}
              title="Party Portal"
              who="Political parties — real-time tallies, agent deployment, dispute management"
              href={LINKS.party}
              accentColor="#D97706"
            />
            <PortalCard
              icon={UserCheck}
              title="Candidate Portal"
              who="Individual candidates — personal results, agent coordination, live monitoring"
              href={LINKS.candidate}
              accentColor="#7C3AED"
            />
            <PortalCard
              icon={Eye}
              title="Observer Portal"
              who="Accredited observers — access-controlled monitoring and structured reporting"
              href={LINKS.observer}
              accentColor="#0891B2"
            />
            <PortalCard
              icon={Globe}
              title="Public Transparency Portal"
              who="Every Kenyan citizen — results, capsule verification, live reporting progress"
              href={LINKS.transparency}
              accentColor="#059669"
            />
          </div>
        </div>
      </section>

      {/* ── INTEGRITY ENGINE ──────────────────────────────────────────────── */}
      <section id="integrity" className="py-24" style={{ backgroundColor: '#0B3C6D' }}>
        <div className="container-narrow">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Trust architecture
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Integrity Verified — not a claim, a proof
            </h2>
            <p className="mt-4 leading-relaxed text-white/60">
              Every evidence capsule carries three independent proofs. Even if VoteCapsule's
              servers were taken offline, the anchoring records remain publicly verifiable forever.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Key,
                badge: 'Layer 1',
                title: 'SHA-256 Content Hash',
                body: 'The image file, sorted metadata, and capture timestamp are hashed together. Any alteration — even a single pixel — produces a completely different hash.',
              },
              {
                icon: Zap,
                badge: 'Layer 2',
                title: 'Hedera Consensus Timestamp',
                body: 'The hash is submitted to Hedera Consensus Service — a globally ordered, tamper-proof distributed ledger — producing a permanent chronological anchor.',
              },
              {
                icon: Lock,
                badge: 'Layer 3',
                title: 'RFC 3161 Time-Stamp Authority',
                body: "An independent TSA issues a cryptographic receipt binding the hash to legal wall-clock time, recognised under Kenya's ICT Act.",
              },
            ].map(({ icon: Icon, badge, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: '#059669' }}
                  >
                    {badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href={LINKS.verify}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              <CheckCircle className="h-4 w-4" />
              Try the capsule verifier
            </a>
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ──────────────────────────────────────────────────── */}
      <section id="stakeholders" className="py-20" style={{ backgroundColor: '#F5F7FA' }}>
        <div className="container-narrow">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-400">
            Stakeholders
          </p>
          <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Built for Kenya's electoral ecosystem
          </h2>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Building2,
                color: '#059669',
                title: 'Electoral Commission',
                body: 'IEBC and county commissions manage the full election lifecycle — from voter registration through official result publication and post-election audit.',
              },
              {
                icon: FileCheck,
                color: '#D97706',
                title: 'Political Parties',
                body: 'Party agents get real-time, station-level tallies — enabling rapid dispute identification and reducing post-election conflict.',
              },
              {
                icon: Eye,
                color: '#0891B2',
                title: 'Observers & Media',
                body: 'Accredited observers and journalists get structured, verified data feeds — replacing the chaos of physically chasing Form 34A copies.',
              },
              {
                icon: Users,
                color: '#7C3AED',
                title: 'Citizens',
                body: "Every Kenyan voter can verify their station's result on the public portal within minutes of submission — no login, no technical knowledge required.",
              },
            ].map(({ icon: Icon, color, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSPARENCY COMMITMENT ───────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container-narrow">
          <div className="overflow-hidden rounded-3xl" style={{ backgroundColor: '#059669' }}>
            <div className="flex flex-col items-start justify-between gap-10 px-10 py-16 sm:flex-row sm:items-center sm:px-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/55">
                  Commitment
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                  Public by design.
                  <br />
                  Private by permission.
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-white/70">
                  Every result published on the transparency portal is a cryptographically verified
                  record, not an IEBC press release. Citizens verify — not trust.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <a
                  href={LINKS.transparency}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ color: '#059669' }}
                >
                  <Globe className="h-4 w-4" />
                  Transparency Portal
                </a>
                <a
                  href={LINKS.stations}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/20"
                >
                  <MapPin className="h-4 w-4" />
                  Explore 46,030 Stations
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA + FOOTER ──────────────────────────────────────────────────── */}
      <section className="py-24" style={{ backgroundColor: '#0B3C6D' }}>
        <div className="container-narrow text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Shield className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to secure Kenya's next election?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/55">
            Contact us for a full platform walkthrough. Deployment is available for IEBC,
            county commissions, and verified international observer missions.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowRequest(true)}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ backgroundColor: '#059669' }}
            >
              Request a Demo <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={LINKS.transparency}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/15"
            >
              <Activity className="h-4 w-4" />
              See it live
            </a>
          </div>

          <nav className="mt-16 flex flex-wrap justify-center gap-6" aria-label="Footer navigation">
            <a href={LINKS.results} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 transition-colors hover:text-white/60">Results</a>
            <a href={LINKS.candidates} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 transition-colors hover:text-white/60">Candidates</a>
            <a href={LINKS.stations} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 transition-colors hover:text-white/60">Stations</a>
            <a href={LINKS.verify} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 transition-colors hover:text-white/60">Verify</a>
            <a href={LINKS.progress} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 transition-colors hover:text-white/60">Progress</a>
            <a href={LINKS.transparency} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 transition-colors hover:text-white/60">Transparency Portal</a>
          </nav>

          <p className="mt-6 text-xs text-white/20">
            © {new Date().getFullYear()} VoteCapsule™ — Election Intelligence Cloud Platform
          </p>
        </div>
      </section>
    </div>
  );
}
