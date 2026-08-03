import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, MapPin, BarChart3, TrendingUp, CreditCard, Mail, FileText, Settings, LogOut, Bell, ChevronLeft, Menu, Flag, Vote, Trophy } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Party Dashboard' },
  // ── Nominations (signature VoteCapsule feature for parties) ──
  { to: '/nominations',  icon: Trophy,          label: 'Party Nominations', highlight: true },
  // ── Candidate management ──────────────────────────────────────
  { to: '/candidates',   icon: Users,           label: 'Candidate Management' },
  { to: '/coordinators', icon: UserCheck,       label: 'Campaign Coordinators' },
  { to: '/agents',       icon: MapPin,          label: 'Agent Assignments' },
  // ── Results & analytics ───────────────────────────────────────
  { to: '/live-results', icon: BarChart3,       label: 'Live Results' },
  { to: '/analytics',    icon: TrendingUp,      label: 'Performance Analytics' },
  // ── Admin ─────────────────────────────────────────────────────
  { to: '/invitations',  icon: Mail,            label: 'User Invitations' },
  { to: '/reports',      icon: FileText,        label: 'Reports' },
  { to: '/subscription', icon: Settings,        label: 'Subscription' },
  { to: '/billing',      icon: CreditCard,      label: 'Billing' },
];

export function PartyLayout(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector((s) => s.auth.user);
  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex-shrink-0 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Flag className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Vote Capsule™</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700">Party Portal</span>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, highlight }: { to: string; icon: any; label: string; highlight?: boolean }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                highlight
                  ? `sidebar-item ${isActive ? 'sidebar-item-active' : ''} ${!isActive ? 'bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100' : ''}`
                  : `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && highlight && <span className="ml-auto text-xs bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => dispatch(toggleSidebar())} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm">
          {collapsed ? <Menu className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Political Party Portal</h1>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Bell className="w-5 h-5" /></button>
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-violet-700">{user?.email?.charAt(0).toUpperCase() ?? 'P'}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
