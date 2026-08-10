/**
 * Vote Capsule™ — Admin Portal — Page-level Error Boundary
 *
 * Wraps any page that fetches data. Catches render-time errors
 * (e.g. unexpected backend shapes) and shows a recoverable UI
 * instead of a blank screen.
 *
 * Usage:
 *   export function MyPage() {
 *     return <PageErrorBoundary page="My Page"><MyPageContent /></PageErrorBoundary>;
 *   }
 */

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in all envs; swap for a real reporting endpoint when ready
    console.error(
      `[PageErrorBoundary] "${this.props.page ?? 'Page'}" crashed:`,
      error,
      info.componentStack,
    );
    // TODO: send to CloudWatch / Sentry when monitoring is configured:
    // logErrorToService({ page: this.props.page, error, componentStack: info.componentStack });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4 p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-red-800">
                  {this.props.page ? `"${this.props.page}" failed to render` : 'Page failed to render'}
                </h2>
                <p className="text-sm text-red-700 mt-1">
                  One or more backend services returned unexpected data. Other pages should
                  work normally.
                </p>
                {this.state.error?.message && (
                  <pre className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded overflow-auto max-h-24 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                )}
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    Try again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                  >
                    Reload page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
