import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, MapPin, BarChart3,
  TrendingUp, CreditCard, Mail, FileText, Settings, LogOut,
  Bell, ChevronLeft, Menu, Flag, Trophy, Building2, UserCog,
  Globe, UserPlus, Gavel, Megaphone, Calendar, CheckSquare,
  MessageSquare, DollarSign, UsersRound, Package, Store,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { apiClient } from '../api/apiClient';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
  badge?: string;
}

// ── Role-based nav access ─────────────────────────────────────
// Mirrors campaign-role.guard.ts LIMITED_ROLES mapping
const FULL_ACCESS_ROLES = ['PARTY_ADMIN', 'TENANT_ADMIN', 'PARTY_CAMPAIGN_DIRECTOR', 'PLATFORM_SUPER_ADMIN'];
const CAMPAIGN_NAV_BY_ROLE: Record<string, string[]> = {
  LOGISTICS_OFFICER:      ['/campaign', '/campaign/calendar', '/campaign/tasks', '/campaign/materials', '/campaign/suppliers'],
  FINANCE_OFFICER:        ['/campaign', '/campaign/budget', '/campaign/calendar', '/campaign/tasks'],
  COMMUNICATIONS_OFFICER: ['/campaign', '/campaign/sms', '/campaign/calendar', '/campaign/tasks'],
  BRAND_MANAGER:          ['/campaign', '/campaign/materials', '/campaign/suppliers', '/campaign/tasks'],
  CAMPAIGN_VOLUNTEER:     ['/campaign', '/campaign/calendar', '/campaign/tasks'],
  CAMPAIGN_MANAGER:       [], // full campaign access
  WARD_COORDINATOR:       [], // full campaign access (geo-scoped on backend)
  CONSTITUENCY_COORDINATOR: [], // full campaign access (geo-scoped on backend)
};

const coreNavItems: NavItem[] = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Party Dashboard' },
  // ── Nominations & Compliance ───────────────────────────────
  { to: '/nominations',       icon: Trophy,     label: 'Party Nominations', highlight: true },
  { to: '/party-candidates',  icon: UserPlus,   label: 'Party Candidates' },
  { to: '/disputes',          icon: Gavel,      label: 'Disputes & Compliance' },
  // ── Candidate & Agent ops ──────────────────────────────────
  { to: '/candidates',        icon: Users,      label: 'Candidate Management' },
  { to: '/coordinators',      icon: UserCheck,  label: 'Campaign Coordinators' },
  { to: '/agents',            icon: MapPin,     label: 'Agent Assignments' },
  // ── Results & analytics ────────────────────────────────────
  { to: '/live-results',      icon: BarChart3,  label: 'Live Results' },
  { to: '/analytics',         icon: TrendingUp, label: 'Performance Analytics' },
  // ── Admin ──────────────────────────────────────────────────
  { to: '/invitations',       icon: Mail,       label: 'User Invitations' },
  { to: '/reports',           icon: FileText,   label: 'Reports' },
  { to: '/subscription',      icon: Settings,   label: 'Subscription' },
  { to: '/billing',           icon: CreditCard, label: 'Billing' },
];

const campaignNavItems: NavItem[] = [
  { to: '/campaign',          icon: Megaphone,     label: 'Campaign Overview' },
  { to: '/campaign/calendar', icon: Calendar,      label: 'Campaign Calendar' },
  { to: '/campaign/tasks',    icon: CheckSquare,   label: 'Tasks & Actions' },
  { to: '/campaign/materials', icon: Package,       label: 'Materials Catalogue' },
  { to: '/campaign/suppliers', icon: Store,        label: 'Suppliers' },
  { to: '/campaign/teams',    icon: UsersRound,    label: 'Teams & Volunteers' },
  { to: '/campaign/sms',      icon: MessageSquare, label: 'SMS Messaging' },
  { to: '/campaign/budget',   icon: DollarSign,    label: 'Campaign Budget' },
];

const settingsNavItems: NavItem[] = [
  { to: '/profile',           icon: Building2,  label: 'Profile' },
  { to: '/officials',         icon: UserCog,    label: 'Officials' },
  { to: '/social-media',      icon: Globe,      label: 'Social Media' },
];

function NavSection({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  return (
    <>
      {items.map(({ to, icon: Icon, label, highlight, badge }: NavItem) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/campaign'}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            highlight
              ? `sidebar-item ${isActive ? 'sidebar-item-active' : ''} ${!isActive ? 'bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100' : ''}`
              : `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
          }
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
          {!collapsed && highlight && (
            <span className="ml-auto text-xs bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full font-semibold">★</span>
          )}
          {!collapsed && badge && (
            <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>
          )}
        </NavLink>
      ))}
    </>
  );
}

export function PartyLayout(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector((s) => s.auth.user);
  const handleLogout = async () => {
    try { await apiClient.post('/identity/auth/logout', {}); } catch { /* non-fatal */ }
    dispatch(logout()); navigate('/login');
  };

  const initials = user?.firstName
    ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) ?? ''}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? 'P';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex-shrink-0 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Flag className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Vote Capsule™</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700">
                Party Portal
              </span>
            </div>
          )}
        </div>

        {/* Nav — filtered by user role */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Core navigation — admin items hidden for limited campaign roles */}
          {(() => {
            const primaryRole = user?.roles?.[0] ?? '';
            const isFullAccess = FULL_ACCESS_ROLES.includes(primaryRole) || !primaryRole;
            const adminPaths = ['/invitations', '/subscription', '/billing', '/candidates', '/coordinators', '/agents'];
            const visibleCore = isFullAccess
              ? coreNavItems
              : coreNavItems.filter(item => !adminPaths.includes(item.to));
            return <NavSection items={visibleCore} collapsed={collapsed} />;
          })()}

          {/* Campaign Manager section — filtered by role */}
          <div className={`pt-3 mt-3 border-t border-gray-100 ${collapsed ? '' : ''}`}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-3 h-3" />
                Campaign Manager
              </p>
            )}
            {collapsed && <div className="pb-1" />}
            {(() => {
              const primaryRole = user?.roles?.[0] ?? '';
              const isFullAccess = FULL_ACCESS_ROLES.includes(primaryRole) || !primaryRole;
              const allowedPaths = CAMPAIGN_NAV_BY_ROLE[primaryRole];
              // Full access roles or roles with empty allowedPaths (= full campaign access)
              const visibleCampaign = (isFullAccess || !allowedPaths || allowedPaths.length === 0)
                ? campaignNavItems
                : campaignNavItems.filter(item => allowedPaths.includes(item.to));
              return <NavSection items={visibleCampaign} collapsed={collapsed} />;
            })()}
          </div>

          {/* Party Settings section */}
          <div className={`pt-3 mt-3 border-t border-gray-100`}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Party Settings
              </p>
            )}
            {collapsed && <div className="pb-1" />}
            <NavSection items={settingsNavItems} collapsed={collapsed} />
          </div>
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
        >
          {collapsed
            ? <Menu className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          }
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Political Party Portal</h1>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-violet-700">{initials}</span>
              </div>
              {!collapsed && (
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-gray-900 leading-tight truncate max-w-[120px]">
                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate max-w-[120px]">Party Admin</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
