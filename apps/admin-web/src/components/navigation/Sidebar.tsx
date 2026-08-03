/**
 * Vote Capsule™ Admin Portal — Sidebar Navigation
 *
 * Deep Navy (#0B3C6D) background.
 * Shows "Platform" badge to identify this as the Super Admin portal.
 * Stub items show in sidebar but render "Coming Soon" when clicked.
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Vote,
  Users,
  Shield,
  Bot,
  Lock,
  CreditCard,
  AlertCircle,
  FileText,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { useAppDispatch } from '../../store/hooks';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  stub?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',     path: '/dashboard',    icon: LayoutDashboard },
  { label: 'Tenants',       path: '/tenants',      icon: Building2 },
  { label: 'Elections',     path: '/elections',    icon: Vote },
  { label: 'Evidence',      path: '/evidence',     icon: Camera },
  { label: 'Users',         path: '/users',        icon: Users },
  { label: 'Roles',         path: '/roles',        icon: Shield },
  { label: 'AI Operations', path: '/ai-operations', icon: Bot },
  { label: 'Trust Ledger',  path: '/trust-ledger', icon: Lock },
  { label: 'Billing',       path: '/billing',      icon: CreditCard },
  { label: 'Security',      path: '/security',     icon: AlertCircle },
  { label: 'Audit Log',     path: '/audit',        icon: FileText },
  { label: 'Configuration', path: '/configuration', icon: Wrench },
  { label: 'Settings',      path: '/settings',     icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const location = useLocation();

  return (
    <aside
      className={clsx(
        'flex flex-col bg-[#0B3C6D] text-white transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo & Portal Badge */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 h-16">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm leading-tight">Vote Capsule™</span>
            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wider text-[#0B3C6D] bg-white">
              Platform
            </span>
          </div>
        )}
        {collapsed && (
          <span className="text-white font-bold text-lg w-full text-center">VC</span>
        )}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-white/70" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white/70" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1" role="navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 group',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                    item.stub && 'opacity-60',
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.stub && (
                    <span className="text-xs text-white/40 font-normal">Soon</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Version Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10">
          <p className="text-white/30 text-xs">v1.0.0 — Phase 1</p>
        </div>
      )}
    </aside>
  );
}
