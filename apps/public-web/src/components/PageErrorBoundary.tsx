/**
 * Vote Capsule™ — Public Transparency Portal — Page-level Error Boundary
 *
 * Public-facing fallback UI. Uses neutral/brand styling, not internal red.
 * Offers "Try again" + navigation links so the public is never stuck.
 *
 * Usage:
 *   export function MyPage() {
 *     return <PageErrorBoundary page="My Page"><MyPageContent /></PageErrorBoundary>;
 *   }
 */

import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Human-readable page name shown in the fallback UI */
  page?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(
      `[PageErrorBoundary] "${this.props.page ?? 'Page'}" crashed:`,
      error,
      info.componentStack,
    );
    // TODO: logErrorToService({ page: this.props.page, error, componentStack: info.componentStack });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container-narrow py-16 text-center">
          <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">
              {this.props.page
                ? `"${this.props.page}" is temporarily unavailable`
                : 'Page temporarily unavailable'}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              We could not load this data right now. Results and verification features are
              still accessible from the links below.
            </p>
            {this.state.error?.message && (
              <pre className="mt-3 overflow-auto rounded-lg bg-neutral-50 p-3 text-left text-xs text-neutral-400 max-h-20 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition-transform hover:scale-105"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <Link
                to="/results"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
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
