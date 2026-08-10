import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  BarChart3,
  CheckCircle,
  MapPin,
  Activity,
  Users,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { getGeographyStats } from '../lib/api';

// ── Error Boundary — prevents blank page on runtime errors ───────────────────
class HomePageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container-narrow py-16 text-center">
          <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">
              Page temporarily unavailable
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              We could not load election data right now. Results and verification features
              are still accessible from the links below.
            </p>
            <pre className="mt-3 overflow-auto rounded-lg bg-neutral-50 p-3 text-left text-xs text-neutral-400 max-h-20">
              {this.state.error?.message}
            </pre>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition-transform hover:scale-105"
              >
                Try again
              </button>
              <Link
                to="/results"
                className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                View Results
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function HomePage() {
  return (
    <HomePageErrorBoundary>
      <HomePageContent />
    </HomePageErrorBoundary>
  );
}

function HomePageContent() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['geography-stats'],
    queryFn: getGeographyStats,
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-brand-primary py-16 sm:py-24">
        <div className="container-narrow text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Shield className="h-10 w-10 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Election Transparency Portal
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Publicly verify election results and evidence integrity. Every capsule is
            cryptographically anchored and independently verifiable.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/results"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-primary shadow-lg transition-transform hover:scale-105"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              View Results
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Verify Evidence
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12" aria-labelledby="stats-heading">
        <div className="container-narrow">
          <h2 id="stats-heading" className="sr-only">
            Election Statistics
          </h2>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                icon={MapPin}
                value={stats.totalStations.toLocaleString()}
                label="Polling Stations"
                description="Across all 47 counties"
              />
              <StatsCard
                icon={Users}
                value={stats.totalRegisteredVoters.toLocaleString()}
                label="Registered Voters"
                description="Eligible to cast ballots"
              />
              <StatsCard
                icon={MapPin}
                value={stats.totalConstituencies.toLocaleString()}
                label="Constituencies"
                description="Electoral areas monitored"
              />
              <StatsCard
                icon={Shield}
                value={stats.totalCounties.toLocaleString()}
                label="Counties"
                description="Devolved governance units"
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="border-t border-neutral-200 bg-white py-16" aria-labelledby="features-heading">
        <div className="container-narrow">
          <h2 id="features-heading" className="text-center text-2xl font-bold text-neutral-900">
            Transparency Features
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-neutral-500">
            Every result published on this portal has been verified through multiple
            layers of cryptographic proof.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              to="/results"
              icon={BarChart3}
              title="Published Results"
              description="View official election results broken down by position, county, constituency, and ward."
            />
            <FeatureCard
              to="/verify"
              icon={CheckCircle}
              title="Verify Integrity"
              description="Enter any capsule ID to independently verify its SHA-256 hash, timestamps, and anchoring proofs."
            />
            <FeatureCard
              to="/progress"
              icon={Activity}
              title="Reporting Progress"
              description="Track real-time election reporting: which stations have submitted, and the percentage complete."
            />
            <FeatureCard
              to="/candidates"
              icon={Users}
              title="Candidate Profiles"
              description="Browse all registered candidates by party, position, and geographic area."
            />
            <FeatureCard
              to="/stations"
              icon={MapPin}
              title="Polling Stations"
              description="Search and view individual polling station data, including submitted results and verification status."
            />
            <FeatureCard
              to="/verify"
              icon={Shield}
              title="Trust Architecture"
              description="Every piece of evidence is anchored with SHA-256 hashes, Hedera timestamps, and RFC 3161 proofs."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-brand-primary/30 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
        <Icon className="h-5 w-5 text-brand-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-neutral-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-primary opacity-0 transition-opacity group-hover:opacity-100">
        Explore <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
