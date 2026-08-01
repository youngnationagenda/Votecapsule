import { Link, NavLink } from 'react-router-dom';
import { Shield, BarChart3, Users, MapPin, CheckCircle, Activity } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const navLinks = [
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/stations', label: 'Stations', icon: MapPin },
  { to: '/verify', label: 'Verify', icon: CheckCircle },
  { to: '/progress', label: 'Progress', icon: Activity },
];

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
        <div className="container-narrow flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Vote Capsule Home">
            <Shield className="h-8 w-8 text-brand-primary" aria-hidden="true" />
            <span className="text-lg font-bold text-brand-primary">
              Vote Capsule<sup className="text-xs">™</sup>
            </span>
          </Link>

          <nav aria-label="Main navigation">
            <ul className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }: { isActive: boolean }) =>
                      `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Mobile navigation */}
            <ul className="flex items-center gap-1 md:hidden">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }: { isActive: boolean }) =>
                      `flex items-center rounded-lg p-2 transition-colors ${
                        isActive
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`
                    }
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="container-narrow text-center">
          <p className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Vote Capsule™. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Powered by Vote Capsule™ — Election Intelligence Cloud Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
