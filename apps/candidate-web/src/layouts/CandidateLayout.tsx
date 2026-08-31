import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, BarChart3, TrendingUp, Image, Bell,
  Download, Users, CreditCard, LogOut, Menu, ChevronLeft, User,
  Flag, Megaphone, Calendar, CheckSquare, DollarSign,
  MessageSquare, AlertTriangle, Store, ShoppingCart, Package, Printer,
  Sparkles,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { apiClient } from '../api/apiClient';

const electionNavItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'My Dashboard' },
  { to: '/nomination',  icon: Flag,            label: 'Nomination & Party' },
  { to: '/region',      icon: MapPin,          label: 'Assigned Region' },
  { to: '/live-results',icon: BarChart3,       label: 'Live Results' },
  { to: '/stations',    icon: TrendingUp,      label: 'Station Progress' },
  { to: '/evidence',    icon: Image,           label: 'Evidence Capsules' },
  { to: '/analytics',   icon: TrendingUp,      label: 'Analytics' },
];

const campaignNavItems = [
  { to: '/campaign',            icon: Megaphone,      label: 'Campaign Overview' },
  { to: '/campaign/calendar',   icon: Calendar,       label: 'Campaign Calendar' },
  { to: '/campaign/team',       icon: Users,          label: 'My Team & Roles' },
  { to: '/campaign/suppliers',  icon: Store,          label: 'Supplier Catalogue' },
  { to: '/campaign/materials',  icon: Package,        label: 'Campaign Materials' },
  { to: '/campaign/printing',   icon: Printer,        label: 'Printing & Design' },
  { to: '/campaign/needs',      icon: ShoppingCart,   label: 'My Campaign Needs' },
  { to: '/campaign/budget',     icon: DollarSign,     label: 'Campaign Budget' },
  { to: '/campaign/sms',        icon: MessageSquare,  label: 'Campaign SMS' },
  { to: '/campaign/incidents',  icon: AlertTriangle,  label: 'Incidents' },
  { to: '/campaign/media',      icon: Image,          label: 'Media Library' },
  { to: '/campaign/ai-images',  icon: Sparkles,       label: 'AI Image Generator', badge: 'AI' },
];

const systemNavItems = [
  { to: '/notifications', icon: Bell,        label: 'Notifications' },
  { to: '/downloads',     icon: Download,    label: 'Downloads' },
  { to: '/billing',       icon: CreditCard,  label: 'Billing' },
];

interface NavSectionProps { items: { to: string; icon: React.ElementType; label: string }[]; collapsed: boolean; }
function NavSection({ items, collapsed }: NavSectionProps) {
  return (
    <>
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/campaign' || to === '/dashboard'}
          className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
          title={collapsed ? label : undefined}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </>
  );
}

export function CandidateLayout(): React.JSX.Element {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user      = useAppSelector((s) => s.auth.user);
  const handleLogout = async () => {
    try { await apiClient.post('/identity/auth/logout', {}); } catch { /* non-fatal */ }
    dispatch(logout()); navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Vote Capsule™</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">Candidate Portal</span>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Election Operations */}
          <NavSection items={electionNavItems} collapsed={collapsed} />

          {/* Campaign Manager section */}
          {!collapsed && (
            <div className="pt-3 pb-1">
              <p className="px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Campaign Manager</p>
            </div>
          )}
          {collapsed && <div className="my-1 border-t border-gray-100" />}
          <NavSection items={campaignNavItems} collapsed={collapsed} />

          {/* System */}
          {!collapsed && (
            <div className="pt-3 pb-1">
              <p className="px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Account</p>
            </div>
          )}
          {collapsed && <div className="my-1 border-t border-gray-100" />}
          <NavSection items={systemNavItems} collapsed={collapsed} />
        </nav>
        <button onClick={() => dispatch(toggleSidebar())} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-gray-500 hover:bg-gray-50 text-sm">
          {collapsed ? <Menu className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Candidate Portal</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-amber-700">{user?.email?.charAt(0).toUpperCase() ?? 'C'}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><LogOut className="w-4 h-4" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
